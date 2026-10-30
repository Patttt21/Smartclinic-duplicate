import { app } from '../src/serverApp';

// Vercel serverless entry point exporting the Express application
export default function handler(req: any, res: any) {
  // Recover original URL when Vercel serverless rewrites /api/(.*) to /api
  const original =
    req.originalUrl ||
    req.headers?.['x-matched-path'] ||
    req.headers?.['x-forwarded-uri'] ||
    req.headers?.['x-vercel-matched-path'];

  if (typeof original === 'string') {
    const cleanOriginal = original.split('?')[0];
    const query = original.includes('?') ? original.slice(original.indexOf('?')) : '';
    if (
      cleanOriginal.startsWith('/api/') &&
      (!req.url || req.url === '/api' || req.url === '/api/' || req.url === '/api/index')
    ) {
      req.url = `${cleanOriginal}${query}`;
    } else if (!req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
  }

  return app(req, res);
}

