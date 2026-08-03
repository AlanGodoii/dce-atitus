import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from './config/passport.js';
import { env } from './config/env.js';
import { CAMINHOS, garantirPastas } from './config/storage.js';
import rotas from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

export function criarApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      // As imagens das carteirinhas sao servidas por /uploads e consumidas pela
      // SPA em outra origem; a policy padrao do helmet bloquearia isso.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      // Em produção, só as origens declaradas. Aceita lista separada por
      // vírgula porque o site responde com e sem "www", e as duas variantes
      // precisam estar liberadas — senão uma delas quebra em silêncio.
      origin: env.isProd ? env.origensPermitidas : true,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(passport.initialize());

  garantirPastas();
  app.use(
    '/uploads',
    express.static(CAMINHOS.uploads, {
      maxAge: '7d',
      index: false,
      // Nunca deixar o Express adivinhar e executar nada servido daqui.
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.use(rotas);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
