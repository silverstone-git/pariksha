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
            // 1. Question Generation
            if (req.url === '/api/generate' && req.method === 'POST') {
              console.log(`[GENERATOR] Received request: ${req.url}`);
              let body = '';
              req.on('data', chunk => body += chunk.toString());
              req.on('end', () => {
                try {
                  const { topic, count, difficulty, group = "pg_physics" } = JSON.parse(body);
                  console.log(`[GENERATOR] Starting generation for ${topic} (${count} qs, ${difficulty}, group: ${group})`);
                  
                  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                  res.setHeader('Transfer-Encoding', 'chunked');
                  res.setHeader('Cache-Control', 'no-cache');
                  res.setHeader('Connection', 'keep-alive');
                  
                  const pyPath = path.resolve(__dirname, 'cli', 'generate_question_bank.py');
                  const cwdPath = path.resolve(__dirname, 'cli');
                  
                  const venvPython = path.resolve(__dirname, 'cli', 'venv_pariksha', 'bin', 'python3');
                  const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
                  
                  console.log(`[GENERATOR] Spawning process: ${pythonCmd} ${pyPath}`);
                  
                  const pyArgs = [pyPath, '--count', String(count), '--difficulty', difficulty, '--group', group];
                  if (topic === '__all__') {
                    pyArgs.push('--all');
                  } else {
                    pyArgs.push('--topic', topic);
                  }

                  const py = spawn(pythonCmd, pyArgs, { 
                    cwd: cwdPath,
                    env: { ...process.env, PYTHONUNBUFFERED: "1" }
                  });

                  res.write("Starting generation engine...\n");

                  py.on('error', err => {
                    console.error(`[GENERATOR] Failed to start process: ${err.message}`);
                    res.write(`[FATAL ERROR] Failed to start process: ${err.message}\n`);
                    res.end();
                  });

                  py.stdout.on('data', data => {
                    const str = data.toString();
                    process.stdout.write(`[PY STDOUT] ${str}`);
                    try { res.write(str); } catch (e) {}
                  });                  
                  
                  py.stderr.on('data', data => {
                    const str = data.toString();
                    process.stderr.write(`[PY STDERR] ${str}`);
                    try {
                      const isActualError = /error|exception|critical/i.test(str);
                      res.write(isActualError ? `[ERROR] ${str}` : str);
                    } catch (e) {}
                  });
                  
                  py.on('close', code => {
                    console.log(`[GENERATOR] Process closed with code ${code}`);
                    if (!res.writableEnded) {
                      res.write(`\n--- Process finished with exit code ${code} ---\n`);
                      res.end();
                    }
                  });
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(e.message);
                }
              });
              return;
            }

            // 2. Upload and Initialize New Topic Group
            if (req.url === '/api/upload_topic_group' && req.method === 'POST') {
              console.log(`[ADMIN] Received new topic group upload`);
              let body = '';
              // For large payloads, consider increasing limit or using streams, but JSON string concat works for typical sizes
              req.on('data', chunk => body += chunk.toString());
              req.on('end', () => {
                try {
                  const { groupName, topicsContent, knowledgeFiles } = JSON.parse(body);
                  const groupSlug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                  console.log(`[ADMIN] Initializing group: ${groupSlug}`);

                  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                  res.setHeader('Transfer-Encoding', 'chunked');
                  res.setHeader('Cache-Control', 'no-cache');

                  // Save topics file
                  const topicsFilePath = path.resolve(__dirname, `${groupSlug}_question_bank_topics.txt`);
                  fs.writeFileSync(topicsFilePath, topicsContent, 'utf-8');
                  res.write(`Saved topics list: ${groupSlug}_question_bank_topics.txt\n`);

                  // Create KB dir and save files
                  const kbDir = path.resolve(__dirname, 'cli', `${groupSlug}_knowledge_base`);
                  if (!fs.existsSync(kbDir)) fs.mkdirSync(kbDir, { recursive: true });
                  
                  for (const file of knowledgeFiles) {
                    const filePath = path.join(kbDir, file.name);
                    // Decode base64 if it's not a text file, else save text
                    if (file.contentBase64) {
                       const buffer = Buffer.from(file.contentBase64, 'base64');
                       fs.writeFileSync(filePath, buffer);
                    } else if (file.content) {
                       fs.writeFileSync(filePath, file.content, 'utf-8');
                    }
                  }
                  res.write(`Saved ${knowledgeFiles.length} knowledge base files to cli/${groupSlug}_knowledge_base/\n`);

                  // Trigger indexing
                  const cwdPath = path.resolve(__dirname, 'cli');
                  const venvPython = path.resolve(__dirname, 'cli', 'venv_pariksha', 'bin', 'python3');
                  const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';

                  res.write(`Starting ChromaDB indexing for ${groupSlug}...\n`);
                  const indexPy = spawn(pythonCmd, ['index_knowledge.py', '--group', groupSlug], { cwd: cwdPath, env: { ...process.env, PYTHONUNBUFFERED: "1" } });
                  
                  indexPy.stdout.on('data', d => res.write(`[INDEX] ${d.toString()}`));
                  indexPy.stderr.on('data', d => res.write(`[INDEX ERR] ${d.toString()}`));

                  indexPy.on('close', code => {
                    res.write(`\nIndexing finished with code ${code}.\nStarting initial generation (5 questions per topic)...\n`);
                    
                    const genPy = spawn(pythonCmd, ['generate_question_bank.py', '--group', groupSlug, '--all', '--count', '5'], { cwd: cwdPath, env: { ...process.env, PYTHONUNBUFFERED: "1" } });
                    
                    genPy.stdout.on('data', d => res.write(`[GEN] ${d.toString()}`));
                    genPy.stderr.on('data', d => res.write(`[GEN ERR] ${d.toString()}`));

                    genPy.on('close', genCode => {
                       res.write(`\n--- Initialization complete with code ${genCode} ---\n`);
                       res.end();
                    });
                  });

                } catch (e: any) {
                  console.error(e);
                  res.statusCode = 500;
                  res.end(e.message);
                }
              });
              return;
            }

            // 3. Serve Dynamic Topics File
            if (req.url?.startsWith('/api/topics')) {
              const url = new URL(req.url, 'http://localhost');
              const group = url.searchParams.get('group') || 'pg_physics';
              const filePath = path.resolve(__dirname, `${group}_question_bank_topics.txt`);
              if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'text/plain');
                res.end(fs.readFileSync(filePath));
                return;
              } else {
                res.statusCode = 404;
                res.end('Topics not found');
                return;
              }
            }

            // 4. Serve Dynamic Question Bank JSONs
            // Expected format: /api/local_bank/:group/:filename
            if (req.url?.startsWith('/api/local_bank/')) {
              const urlPath = new URL(req.url, 'http://localhost').pathname;
              const parts = urlPath.split('/').filter(Boolean);
              if (parts.length >= 4) { // ['api', 'local_bank', 'pg_physics', 'topic.json']
                const group = parts[2];
                const fileName = decodeURIComponent(parts[3]);
                const filePath = path.resolve(__dirname, 'cli', `${group}_question_bank`, fileName);
                
                if (fs.existsSync(filePath)) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(fs.readFileSync(filePath));
                  return;
                } else {
                  res.statusCode = 404;
                  res.end('[]');
                  return;
                }
              }
            }

            // 5. Serve available groups list for the frontend
            if (req.url === '/api/groups' && req.method === 'GET') {
              // Read root dir to find *_question_bank_topics.txt
              try {
                const files = fs.readdirSync(__dirname);
                const groups = files
                  .filter(f => f.endsWith('_question_bank_topics.txt'))
                  .map(f => f.replace('_question_bank_topics.txt', ''));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(groups.length > 0 ? groups : ['pg_physics']));
              } catch (e) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(['pg_physics']));
              }
              return;
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
        }
      }
    }
  };
});

