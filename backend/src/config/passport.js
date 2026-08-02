import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './prisma.js';
import { VERSAO_TERMOS } from './termos.js';
import { env } from './env.js';
import { normalizarEmail } from '../utils/email.js';

if (env.google.habilitado) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const emailPrincipal = profile.emails?.[0];
          if (!emailPrincipal?.value) {
            return done(null, false, { message: 'Conta Google sem e-mail acessível.' });
          }

          const email = normalizarEmail(emailPrincipal.value);
          const nome = profile.displayName?.trim() || email.split('@')[0];

          const porGoogleId = await prisma.usuario.findUnique({
            where: { googleId: profile.id },
          });
          if (porGoogleId) return done(null, porGoogleId);

          const porEmail = await prisma.usuario.findUnique({ where: { email } });
          if (porEmail) {
            // So vincula automaticamente se o Google confirma que o e-mail e
            // verificado; senao alguem poderia sequestrar uma conta existente.
            if (emailPrincipal.verified === false) {
              return done(null, false, {
                message: 'E-mail do Google não verificado. Entre com e-mail e senha.',
              });
            }
            const vinculado = await prisma.usuario.update({
              where: { id: porEmail.id },
              data: {
                googleId: profile.id,
                // O Google ja provou que a caixa e dele; nao faz sentido pedir
                // de novo a mesma confirmacao.
                emailVerificadoEm: porEmail.emailVerificadoEm ?? new Date(),
              },
            });
            return done(null, vinculado);
          }

          const novo = await prisma.usuario.create({
            data: {
              nome,
              email,
              googleId: profile.id,
              role: 'estudante',
              emailVerificadoEm: new Date(),
              // Quem entra pelo Google nao passa pelo formulario com a caixa de
              // aceite, entao o aviso fica ao lado do botao ("ao continuar,
              // voce aceita..."). Sem IP porque a estrategia nao recebe o req.
              aceiteTermosVersao: VERSAO_TERMOS,
              aceiteTermosEm: new Date(),
            },
          });
          return done(null, novo);
        } catch (erro) {
          return done(erro);
        }
      },
    ),
  );
}

export default passport;
