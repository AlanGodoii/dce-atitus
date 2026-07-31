-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'estudante');

-- CreateEnum
CREATE TYPE "StatusCarteirinha" AS ENUM ('aguardando_pagamento', 'pagamento_em_analise', 'aprovada', 'rejeitada');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('pendente', 'confirmado', 'rejeitado');

-- CreateEnum
CREATE TYPE "NivelEnsino" AS ENUM ('graduacao', 'pos_graduacao', 'mestrado', 'doutorado', 'tecnico');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "senha_hash" VARCHAR(255),
    "google_id" VARCHAR(64),
    "role" "Role" NOT NULL DEFAULT 'estudante',
    "whatsapp" VARCHAR(20),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis_estudante" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "foto_url" VARCHAR(500),
    "cpf" CHAR(11) NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "matricula" VARCHAR(30) NOT NULL,
    "curso" VARCHAR(120) NOT NULL,
    "nivel" "NivelEnsino" NOT NULL DEFAULT 'graduacao',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "perfis_estudante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carteirinhas" (
    "id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "status" "StatusCarteirinha" NOT NULL DEFAULT 'aguardando_pagamento',
    "qr_code_uuid" UUID,
    "arquivo_url" VARCHAR(500),
    "arquivo_verso_url" VARCHAR(500),
    "data_emissao" TIMESTAMPTZ(6),
    "data_validade" DATE,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carteirinhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL,
    "carteirinha_id" UUID NOT NULL,
    "comprovante_info" TEXT,
    "status" "StatusPagamento" NOT NULL DEFAULT 'pendente',
    "confirmado_por" UUID,
    "confirmado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_google_id_key" ON "usuarios"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_estudante_usuario_id_key" ON "perfis_estudante"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_estudante_cpf_key" ON "perfis_estudante"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "carteirinhas_qr_code_uuid_key" ON "carteirinhas"("qr_code_uuid");

-- CreateIndex
CREATE INDEX "carteirinhas_perfil_id_idx" ON "carteirinhas"("perfil_id");

-- CreateIndex
CREATE INDEX "carteirinhas_status_idx" ON "carteirinhas"("status");

-- CreateIndex
CREATE INDEX "pagamentos_carteirinha_id_idx" ON "pagamentos"("carteirinha_id");

-- CreateIndex
CREATE INDEX "pagamentos_status_idx" ON "pagamentos"("status");

-- AddForeignKey
ALTER TABLE "perfis_estudante" ADD CONSTRAINT "perfis_estudante_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carteirinhas" ADD CONSTRAINT "carteirinhas_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis_estudante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_carteirinha_id_fkey" FOREIGN KEY ("carteirinha_id") REFERENCES "carteirinhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
