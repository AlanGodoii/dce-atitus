-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "email_verificado_em" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "tokens_verificacao_email" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "codigo" CHAR(6) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_verificacao_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_verificacao_email_token_hash_key" ON "tokens_verificacao_email"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_verificacao_email_usuario_id_idx" ON "tokens_verificacao_email"("usuario_id");

-- AddForeignKey
ALTER TABLE "tokens_verificacao_email" ADD CONSTRAINT "tokens_verificacao_email_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
