import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isRunningCompiledBundle = import.meta.url.endsWith('/dist/server.js') || import.meta.url.endsWith('\\dist\\server.js') || path.basename(__dirname) === 'dist';
const compiledServerFile = isRunningCompiledBundle ? __filename : path.resolve(__dirname, 'dist', 'server.js');

// 1. If running raw `node server.ts` and precompiled production bundle exists, delegate to it directly
if (!isRunningCompiledBundle && fs.existsSync(compiledServerFile) && !process.env.__TSX_BOOTSTRAPPED__ && !process.execArgv.some(a => a.includes('tsx'))) {
  await import(pathToFileURL(compiledServerFile).href);
} else {
  // 2. If running raw Node without tsx loader and no bundle exists, bootstrap with tsx
  const isTsxActive = Boolean(
    isRunningCompiledBundle ||
    process.env.__TSX_BOOTSTRAPPED__ ||
    process.execArgv.some(a => a.includes('tsx'))
  );

  if (!isTsxActive) {
    const { spawn } = await import('child_process');
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', __filename, ...process.argv.slice(2)],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          __TSX_BOOTSTRAPPED__: '1',
        },
      }
    );

    child.on('exit', (code, signal) => {
      if (signal) process.kill(process.pid, signal);
      else process.exit(code ?? 0);
    });

    child.on('error', (err) => {
      console.error('[Server Bootstrap] Failed to spawn tsx process:', err);
      process.exit(1);
    });

    // Hold parent process until child terminates
    await new Promise(() => {});
  } else {
    // 3. Normal server execution (under tsx or precompiled bundle)
    dotenv.config();

    const http = await import('http');
    const { app } = await import('./src/serverApp');
    const { attachClinicWebSocketServer } = await import('./src/server/services/realtimePushService');

    // Parse CLI arguments (e.g., --port 3000) or respect Cloud Run PORT environment variable
    const args = process.argv.slice(2);
    const portIndex = args.indexOf('--port');
    const cliPort = portIndex !== -1 && args[portIndex + 1] ? Number(args[portIndex + 1]) : null;
    const PORT = cliPort || Number(process.env.PORT) || 3000;

    async function startServer() {
      const distPath = isRunningCompiledBundle ? __dirname : path.resolve(__dirname, 'dist');
      const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
      const isProd = process.env.NODE_ENV === 'production' || (!process.env.NODE_ENV && hasDist && process.env.npm_lifecycle_event === 'start');

      if (!isProd) {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: {
            middlewareMode: true,
            hmr: false,
          },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } else {
        app.use(express.static(distPath));
        app.get('*', (req: Request, res: Response) => {
          if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'Endpoint not found' });
          }
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      }

      const httpServer = http.createServer(app);
      attachClinicWebSocketServer(httpServer);

      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Smart Clinic Server + Real-Time WS running on port ${PORT} (0.0.0.0) [${isProd ? 'production' : 'development'}]`);
      });
    }

    startServer().catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
  }
}

