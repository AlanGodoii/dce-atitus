# Paleta ATITUS — plano de conversão do front

Cores extraídas do CSS de `atitus.edu.br` em 30/07/2026.

## Paleta oficial

| Cor          | Hex       | Uso no site da ATITUS            |
| ------------ | --------- | -------------------------------- |
| Teal escuro  | `#045B59` | Cor principal da marca           |
| Teal médio   | `#00746B` | Fundos de seção                  |
| Turquesa     | `#00C6B7` | Destaques, ícones, chamadas      |
| Grafite      | `#262626` | Header, textos                   |
| Preto        | `#151515` | Fundos escuros                   |
| Cinza claro  | `#E5E5E5` | Divisórias                       |
| Cinza fundo  | `#F0F1F3` | Fundo de páginas                 |

O tom deles é **verde-petróleo (teal)**. A paleta atual do projeto é verde-floresta,
tirada da logo do DCE — é essa a diferença que salta aos olhos.

## Conversão proposta

Tudo vive em custom properties no topo de `frontend/src/styles/global.css`, então a
troca é num arquivo só.

| Token          | Hoje      | Proposto  | Observação                          |
| -------------- | --------- | --------- | ----------------------------------- |
| `--verde-900`  | `#0A2A23` | `#023F3E` | Teal quase preto, fundos profundos  |
| `--verde-800`  | `#0F3B31` | `#045B59` | Principal: hero, carteirinha, sidebar |
| `--verde-700`  | `#17603A` | `#00746B` | Títulos, links                      |
| `--verde-600`  | `#1B7F4B` | `#008F84` | Botões primários                    |
| `--verde-500`  | `#22A05E` | `#00C6B7` | Hover e destaques                   |
| `--mint-300`   | `#6FD39A` | `#5FE8DC` | Detalhes sobre fundo escuro         |
| `--grafite`    | `#2B2B2B` | `#262626` | Faixa central da carteirinha        |

## Decisões em aberto

**A palavra "Digital" no hero** é âmbar (`#F2B705`) hoje. Duas saídas: trocar pelo
turquesa `#00C6B7`, que é o destaque da marca e fica coerente; ou manter o âmbar,
que contrasta mais e chama atenção. O site da ATITUS usa laranja e rosa como
acentos, então um tom quente não é estranho à marca.

**A carteirinha** usa a mesma paleta. Trocar muda o documento emitido daqui pra
frente — as já emitidas continuam no verde antigo. Vale decidir antes de emitir
para alunos de verdade.

**Contraste**: o turquesa `#00C6B7` sobre branco tem contraste baixo (≈2.3:1) e
reprova em acessibilidade para texto pequeno. Usar só como fundo, borda ou sobre
superfície escura — nunca como cor de texto em fundo claro.
