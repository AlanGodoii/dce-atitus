-- O aluno passa a escolher se quer tambem a via fisica, retirada no DCE.
-- Ate aqui ela era automatica para todo mundo, o que fazia o DCE imprimir
-- cartao que ninguem buscava.
--
-- DEFAULT true de proposito: as linhas que ja existem foram cadastradas quando
-- a fisica vinha inclusa sem perguntar. Marcar false nelas seria decidir pelo
-- aluno algo que ele nao escolheu.
ALTER TABLE "perfis_estudante"
  ADD COLUMN "quer_fisica" BOOLEAN NOT NULL DEFAULT true;
