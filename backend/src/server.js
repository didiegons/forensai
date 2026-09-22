import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import analyzeRouter from './routes/analyze.js';
import reportRouter from './routes/report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/analyze', analyzeRouter);
app.use('/api/report', reportRouter);

// Serve the built React app (frontend/dist) when it exists — i.e. after
// `npm run build` has run, as it does in the App Runner build step. Local
// `npm run dev` in each folder is unaffected: frontend/dist simply doesn't
// exist yet, so this block is skipped entirely.
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

// index.html must never be cached: after a new deploy, a browser tab left
// open on a stale cached index.html would still reference the *previous*
// build's hashed /assets/ filenames, which no longer exist on the new
// deployment — that's what produces the blank-page-until-hard-refresh bug.
// Hashed assets are the opposite: their filename changes on every build
// (Vite content-hashes them), so once served they can be cached forever.
const NO_CACHE_HEADER = 'no-cache, no-store, must-revalidate';
const IMMUTABLE_ASSET_HEADER = 'public, max-age=31536000, immutable';

function sendIndexHtml(res) {
  res.set('Cache-Control', NO_CACHE_HEADER);
  res.sendFile(path.join(frontendDistPath, 'index.html'));
}

if (fs.existsSync(frontendDistPath)) {
  app.use(
    express.static(frontendDistPath, {
      // Disable automatic "/" -> index.html serving so every request for
      // index.html goes through sendIndexHtml() below and always gets the
      // no-cache header — one single code path controls it, never static's
      // own default headers.
      index: false,
      setHeaders: (res, filePath) => {
        const relative = path.relative(frontendDistPath, filePath).split(path.sep).join('/');
        if (relative === 'index.html') {
          res.setHeader('Cache-Control', NO_CACHE_HEADER);
        } else if (relative.startsWith('assets/')) {
          res.setHeader('Cache-Control', IMMUTABLE_ASSET_HEADER);
        }
      },
    })
  );

  // SPA fallback: any non-API GET route serves index.html so client-side
  // routing (and plain page refreshes/deep links) resolve correctly. The
  // negative lookahead keeps this from ever shadowing /api/* — unmatched
  // API routes still fall through to the JSON 404 handler below.
  app.get(/^(?!\/api\/).*/, (req, res) => {
    sendIndexHtml(res);
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Final error handler — never leak stack traces or internals to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`ForensAI backend listening on http://localhost:${PORT}`);
});
