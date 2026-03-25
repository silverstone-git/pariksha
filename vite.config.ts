import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'serve-question-bank',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/generate' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
              try {
                const { topic, count, difficulty } = JSON.parse(body);
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Transfer-Encoding', 'chunked');
                
                const pyPath = path.resolve(__dirname, 'cli', 'generate_question_bank.py');
                const cwdPath = path.resolve(__dirname, 'cli');
                
                const py = spawn('python3', [pyPath, '--topic', topic, '--count', String(count), '--difficulty', difficulty], { cwd: cwdPath });
                
                py.stdout.on('data', data => {
                  res.write(data.toString());
                });
                
                py.stderr.on('data', data => {
                  res.write(`[ERROR] ${data.toString()}`);
                });
                
                py.on('close', code => {
                  res.write(`\n--- Process finished with exit code ${code} ---\n`);
                  res.end();
                });
                
                req.on('close', () => {
                  if (!py.killed) py.kill();
                });
              } catch (e: any) {
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
            const fileName = req.url.replace('/question_bank/', '');
            const filePath = path.resolve(__dirname, 'cli', 'question_bank', fileName);
            
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(filePath));
              return;
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
        target: 'https://outsie.aryan.cfd',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
