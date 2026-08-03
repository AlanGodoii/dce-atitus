# Modelo da carteirinha — DCE ATITUS

> **Desatualizado.** Descreve a arte verde escuro aprovada em 29/07/2026, que
> foi substituída em 02/08/2026 pela arte clara com faixas verdes e painel
> branco à direita. A fonte da verdade hoje é
> `backend/src/services/carteirinha-template.js`; rode
> `npm run preview:carteirinha` para ver o resultado. O que segue valendo deste
> documento é o formato físico e os campos exigidos por lei — veja também
> [`conformidade-cie.md`](conformidade-cie.md).

Referência aprovada pelo Alan em 29/07/2026. Os dados e a foto do mockup são
**placeholders**: o template do Puppeteer preenche tudo a partir de
`perfis_estudante` + `usuarios`.

## Formato

Proporção de cartão (ISO/IEC 7810 ID-1, 85,6 × 54 mm), cantos arredondados.
Renderizar em 1011 × 638 px (300 dpi) para o PNG/PDF ficar nítido na impressão.

## Paleta

| Token             | Hex       | Uso                                        |
| ----------------- | --------- | ------------------------------------------ |
| `--verde-profundo`| `#0F3B31` | fundo do cartão (topo, rodapé, verso)      |
| `--verde-atitus`  | `#17603A` | verde da marca DCE ATITUS                  |
| `--grafite`       | `#2B2B2B` | faixa central da frente (foto + dados)     |
| `--branco`        | `#FFFFFF` | texto principal, logo                      |
| `--linha`         | `rgba(255,255,255,.35)` | traços geométricos decorativos |

## Frente

- **Topo (faixa verde):** logo `DCE ATITUS` à esquerda, título
  `Carteira de Identificação Estudantil` à direita. Traços geométricos no canto
  superior direito.
- **Faixa central (grafite):**
  - Foto 3×4 à esquerda, borda branca fina e cantos arredondados.
  - Nome completo em caixa alta e negrito.
  - `CPF`, `Data Nasc.`, `Matrícula`, `Curso`, `Nível`, `Instituição`.
  - **QR code** no canto direito. Antes da aprovação do pagamento o espaço fica
    como um placeholder tracejado (é exatamente o que o mockup mostra).
- **Rodapé (faixa verde):** ano de emissão em destaque + `Válida até 31/03/AAAA`.

## Verso

- Título **Base Legal** e o texto da Lei Federal nº 12.933/2013, art. 1º, § 2º
  (meia-entrada em eventos artístico-culturais e esportivos).
- Parágrafo confirmando que o DCE ATITUS atesta a condição de estudante.
- Bloco `EMISSOR` à direita com logo, CNPJ e espaço de assinatura.
- Rodapé com URL de validação, e-mail e telefone do DCE.

## Regra de validade

Lei 12.933/2013 + Decreto 8.537/2015: a CIE vale até **31 de março do ano
seguinte** ao da emissão. `data_validade` é calculada assim na aprovação.

## Dados oficiais do DCE

- WhatsApp: **(54) 99236-8617**
- E-mail: **dce@atitus.edu.br**
- Chave PIX (CNPJ): **09178125000180**

> O CNPJ e o telefone que aparecem no mockup (`12.345.678/0001-90`,
> `(54) 3316-3100`) são fictícios — usar sempre os valores acima, que vêm do
> `.env`.
