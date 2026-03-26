import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'serve-question-bank',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/generate' && req.method === 'POST') {
              console.log(`[GENERATOR] Received request: ${req.url}`);
              let body = '';
              req.on('data', chunk => body += chunk.toString());
              req.on('end', () => {
                try {
                  const { topic, count, difficulty } = JSON.parse(body);
                  console.log(`[GENERATOR] Starting generation for ${topic} (${count} questions, ${difficulty})`);
                  
                  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                  res.setHeader('Transfer-Encoding', 'chunked');
                  res.setHeader('Cache-Control', 'no-cache');
                  res.setHeader('Connection', 'keep-alive');
                  
                  const pyPath = path.resolve(__dirname, 'cli', 'generate_question_bank.py');
                  const cwdPath = path.resolve(__dirname, 'cli');
                  
                  const venvPython = path.resolve(__dirname, 'cli', 'venv_pariksha', 'bin', 'python3');
                  const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
                  
                  console.log(`[GENERATOR] Spawning process: ${pythonCmd} ${pyPath}`);
                  const py = spawn(pythonCmd, [pyPath, '--topic', topic, '--count', String(count), '--difficulty', difficulty], { 
                    cwd: cwdPath,
                    env: { ...process.env, PYTHONUNBUFFERED: "1" } // Ensure real-time output
                  });

                  // Flush headers immediately by writing a small chunk
                  res.write("Starting generation engine...\n");

                  py.on('error', err => {
                    console.error(`[GENERATOR] Failed to start process: ${err.message}`);
                    res.write(`[FATAL ERROR] Failed to start process: ${err.message}\n`);
                    if (err.stack) res.write(`${err.stack}\n`);
                    res.end();
                  });

                  py.stdout.on('data', data => {
                    const str = data.toString();
                    process.stdout.write(`[PY STDOUT] ${str}`);
                    try {
                      res.write(str);
                    } catch (e) {
                      console.log("[GENERATOR] Client disconnected, suppressing stdout write");
                    }
                  });                  
                  
                  py.stderr.on('data', data => {
                    const str = data.toString();
                    process.stderr.write(`[PY STDERR] ${str}`);
                    try {
                      // Only prefix with [ERROR] if it looks like an actual error
                      const isActualError = /error|exception|critical/i.test(str);
                      res.write(isActualError ? `[ERROR] ${str}` : str);
                    } catch (e) {
                      console.log("[GENERATOR] Client disconnected, suppressing stderr write");
                    }
                  });
                  
                  py.on('exit', (code, signal) => {
                    console.log(`[GENERATOR] Process exited with code ${code} and signal ${signal}`);
                  });

                  py.on('close', code => {
                    console.log(`[GENERATOR] Process closed with code ${code}`);
                    if (!res.writableEnded) {
                      res.write(`\n--- Process finished with exit code ${code} ---\n`);
                      res.end();
                    }
                  });
                  
                  req.on('close', () => {
                    console.log(`[GENERATOR] Request connection closed by client. (Not killing process to allow background completion)`);
                    /* 
                    if (!py.killed) {
                      console.log(`[GENERATOR] Request closed by client, killing process...`);
                      py.kill();
                    }
                    */
                  });
                } catch (e: any) {
                  console.error(`[GENERATOR] Error parsing request body: ${e.message}`);
                  res.statusCode = 500;
                  res.end(e.message);
                }
              });
              return;
            }

            if (req.url === '/physics_question_bank_plan.txt') {
              const filePath = path.resolve(__dirname, 'physics_question_bank_plan.txt');
              if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'text/plain');
                res.end(fs.readFileSync(filePath));
                return;
              }
            }
            if (req.url?.startsWith('/question_bank/')) {
              const urlPath = new URL(req.url, 'http://localhost').pathname;
              const fileName = decodeURIComponent(urlPath.replace('/question_bank/', ''));
              const filePath = path.resolve(__dirname, 'cli', 'question_bank', fileName);
              
              console.log(`[MIDDLEWARE] Serving bank file: ${fileName} -> ${filePath}`);
              
              if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'application/json');
                res.end(fs.readFileSync(filePath));
                return;
              } else {
                console.warn(`[MIDDLEWARE] File not found: ${filePath}`);
              }
            }
            next();
          });
        }
      }
    ],
    server: {
      fs: {
        allow: ['..']
      },
      proxy: {
        '/pariksha': {
          target: env.VITE_API_BASE_URL || 'http://127.0.0.1:8671',
          changeOrigin: true,
          secure: false,
        },
        '/api/question_bank': {
          target: env.VITE_API_BASE_URL || 'http://127.0.0.1:8671',
          changeOrigin: true,
          secure: false,
        },
        '/api/generate': {
          target: 'http://localhost:5173',
          timeout: 300000,
          proxyTimeout: 300000,
        }
      }
    }
  };
});
