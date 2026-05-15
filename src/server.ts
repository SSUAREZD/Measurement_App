import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';

import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import https from 'node:https';
import fs from 'node:fs';


const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();

const angularApp = new AngularNodeAppEngine();

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'measurement-app',
    timestamp: new Date().toISOString(),
  });
});

app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }),
);

app.use(
  '**',
  createNodeRequestHandler(async (req, res, next) => {
    try {
      const response = await angularApp.handle(req);

      if (response) {
        await writeResponseToNodeResponse(response, res);
      } else {
        next();
      }
   } catch (err) {
      next(err);
    }
  }),
);


if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4202;

  const options = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.crt'),
  };

  https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS server listening on https://0.0.0.0:${port}`);
  });
}

export default app;
