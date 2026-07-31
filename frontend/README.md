# Frontend — Carteirinha Estudantil Digital DCE ATITUS

SPA em React + Vite, consumindo a API REST do backend.

## Rodando localmente

```bash
npm install
cp .env.example .env   # VITE_API_URL apontando para a API
npm run dev
```

Sobe em `http://localhost:5173`. O backend precisa estar rodando.

## Telas

| Rota                    | Acesso     | O que faz                                        |
| ----------------------- | ---------- | ------------------------------------------------ |
| `/`                     | público    | landing com benefícios e como funciona            |
| `/login`                | público    | login com e-mail/senha ou Google                  |
| `/cadastro`             | público    | criação de conta                                  |
| `/auth/callback`        | público    | recebe o token do OAuth e limpa a URL             |
| `/validar`              | público    | formulário para colar o código de validação       |
| `/validar/:qrCodeUuid`  | público    | resultado da validação (destino do QR Code)       |
| `/carteirinha`          | estudante  | status, prévia/documento, PIX, reenvio por e-mail |
| `/perfil`               | estudante  | dados da carteirinha e upload da foto             |
| `/admin/pagamentos`     | admin      | fila de conferência, aprovar e rejeitar           |
| `/admin/estudantes`     | admin      | todos os cadastros, com busca e filtro            |

## Identidade visual

Tudo em custom properties no topo de `src/styles/global.css` — trocar a paleta é
mexer num lugar só. Os tons principais:

| Token          | Hex       | Uso                                   |
| -------------- | --------- | ------------------------------------- |
| `--verde-800`  | `#0F3B31` | fundos escuros, hero, carteirinha     |
| `--verde-700`  | `#17603A` | verde da marca DCE ATITUS             |
| `--verde-600`  | `#1B7F4B` | botões primários                      |
| `--ambar`      | `#F2B705` | destaque pontual (título do hero)     |

O logo é reproduzido em CSS no componente `LogoDce` — escala sem perder nitidez e
não depende de arquivo de imagem. Se o DCE tiver a arte oficial em SVG/PNG, dá
para trocar o conteúdo do componente sem mexer em mais nada.

## Detalhes que valem saber

- **`CarteirinhaVisual`** é a prévia em tela e usa unidades `cqw` (container
  query), então escala com a largura do contêiner sem media query. Os valores são
  os mesmos px do template do Puppeteer divididos por 10,11.
- **Depois de aprovada, a tela mostra o PNG gerado pelo backend**, não o
  componente React — o que o aluno vê é exatamente o documento oficial emitido.
- **O interceptor do axios** (`services/api.js`) derruba a sessão só em 401. Um
  403 é falta de permissão, não sessão inválida, e não deve deslogar ninguém.
- **Fontes auto-hospedadas** em `src/assets/fonts/` — nenhuma chamada ao Google
  Fonts em runtime, e são as mesmas famílias que o backend embute na carteirinha.
