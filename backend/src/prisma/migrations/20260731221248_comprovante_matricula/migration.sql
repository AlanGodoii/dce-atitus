-- AlterTable
ALTER TABLE "perfis_estudante" ADD COLUMN     "comprovante_arquivo" VARCHAR(255),
ADD COLUMN     "comprovante_em" TIMESTAMPTZ(6),
ADD COLUMN     "comprovante_tipo" VARCHAR(60);
