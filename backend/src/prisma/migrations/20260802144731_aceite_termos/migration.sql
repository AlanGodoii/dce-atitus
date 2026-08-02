-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "aceite_termos_em" TIMESTAMPTZ(6),
ADD COLUMN     "aceite_termos_ip" VARCHAR(64),
ADD COLUMN     "aceite_termos_versao" VARCHAR(20);
