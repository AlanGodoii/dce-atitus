#!/usr/bin/env bash
#
# Backup do sistema da carteirinha. Substitui o backup pago da hospedagem.
#
# Salva duas coisas, que se perdem de formas diferentes e doem de formas
# diferentes:
#
#   banco  — o registro de todas as carteirinhas emitidas, os cadastros e os
#            pagamentos aprovados. As imagens das carteirinhas podem ser
#            REGERADAS a partir daqui.
#   dados  — as fotos e os comprovantes de matrícula enviados pelos alunos.
#            Estes NÃO têm como recuperar: se sumirem, só pedindo de novo,
#            um por um.
#
# Rode a partir da raiz do projeto, ou de qualquer lugar — ele se localiza.
# Para automatizar, veja docs/deploy-vps.md (seção Backup).

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
	echo "erro: .env não encontrado em $(pwd)" >&2
	exit 1
fi

# Só o que este script precisa. Evita despejar todos os segredos no ambiente.
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2-)"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2-)"
DESTINO="$(grep -E '^BACKUP_DIR=' .env | cut -d= -f2-)"
RETENCAO="$(grep -E '^BACKUP_RETENCAO_DIAS=' .env | cut -d= -f2-)"

DESTINO="${DESTINO:-/var/backups/dce}"
RETENCAO="${RETENCAO:-14}"
CARIMBO="$(date +%Y-%m-%d_%H%M)"

mkdir -p "$DESTINO"

# O pg_dump roda DENTRO do contêiner do banco. Assim não é preciso instalar
# cliente Postgres no servidor nem expor a porta 5432 — que é justamente o que
# o docker-compose.yml evita de propósito.
docker compose exec -T db \
	pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
	| gzip >"$DESTINO/banco_$CARIMBO.sql.gz"

# Os arquivos são lidos de dentro do contêiner da API, que já tem o volume
# montado em /app/dados.
docker compose exec -T api \
	tar -cf - -C /app/dados . \
	| gzip >"$DESTINO/dados_$CARIMBO.tar.gz"

# Um backup vazio é pior que nenhum: passa a sensação de estar protegido.
# O set -o pipefail acima já derruba o script se o pg_dump falhar, mas um
# arquivo de tamanho zero também denuncia problema.
for arquivo in "$DESTINO/banco_$CARIMBO.sql.gz" "$DESTINO/dados_$CARIMBO.tar.gz"; do
	if [ ! -s "$arquivo" ]; then
		echo "FALHOU: $arquivo saiu vazio" >&2
		exit 1
	fi
done

find "$DESTINO" -maxdepth 1 -name '*.gz' -mtime "+$RETENCAO" -delete

echo "backup concluído em $DESTINO"
ls -lh "$DESTINO/banco_$CARIMBO.sql.gz" "$DESTINO/dados_$CARIMBO.tar.gz"

# ATENÇÃO: isto grava no PRÓPRIO servidor. Protege contra erro humano e falha
# de aplicação, mas não contra perder o VPS. Copie para fora da máquina —
# veja docs/deploy-vps.md.
