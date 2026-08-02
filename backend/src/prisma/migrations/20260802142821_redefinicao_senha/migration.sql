-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('confirmacao_email', 'redefinicao_senha');

-- DropIndex
DROP INDEX "tokens_verificacao_email_usuario_id_idx";

-- AlterTable
ALTER TABLE "tokens_verificacao_email" ADD COLUMN     "tipo" "TipoToken" NOT NULL DEFAULT 'confirmacao_email';

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "senha_alterada_em" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "tokens_verificacao_email_usuario_id_tipo_idx" ON "tokens_verificacao_email"("usuario_id", "tipo");
