-- Campos exigidos pelo Padrao Nacional da CIE (ano base 2026) que faltavam:
-- o documento de identidade na face do cartao (item 1.b) e o codigo de uso
-- unico por carteirinha emitida (item 1.c).

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('rg', 'cnh', 'rne', 'passaporte');

-- AlterTable
-- Nulaveis: os perfis cadastrados antes desta migracao nao tem o dado, e
-- exigir na coluna quebraria a base existente. A obrigatoriedade vive no
-- validador, valendo para quem cadastra ou edita daqui em diante.
ALTER TABLE "perfis_estudante"
  ADD COLUMN "documento_tipo" "TipoDocumento",
  ADD COLUMN "documento_numero" VARCHAR(30),
  ADD COLUMN "documento_emissor" VARCHAR(20);

-- AlterTable
-- Nulavel pelo mesmo motivo do qr_code_uuid: so passa a existir na aprovacao.
ALTER TABLE "carteirinhas" ADD COLUMN "codigo_uso" VARCHAR(12);

-- CreateIndex
-- A unicidade e o que da sentido ao codigo: duas carteirinhas com o mesmo
-- codigo tornariam a conferencia por telefone inutil.
CREATE UNIQUE INDEX "carteirinhas_codigo_uso_key" ON "carteirinhas"("codigo_uso");
