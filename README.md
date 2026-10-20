# Diário Oficial de Floresta Azul — RSS

Projeto Node.js que abre o portal com Playwright, aciona a exportação JSON baseada em Blob, mantém os identificadores de publicação e gera um feed RSS 2.0 para publicar pelo GitHub Pages.

## Como publicar

1. Crie um repositório público no GitHub, por exemplo `diario-floresta-azul`.
2. Envie todos os arquivos deste projeto para a branch padrão (`main`).
3. No repositório, entre em **Settings → Pages** e selecione **GitHub Actions** como fonte de publicação.
4. Entre em **Settings → Secrets and variables → Actions → Variables** e, se necessário, crie `EXPORT_BUTTON_TEXT` com o texto visível no botão que exporta o JSON. Se for mais fácil selecionar por CSS, crie `EXPORT_BUTTON_SELECTOR` com um seletor CSS único. Quando `EXPORT_BUTTON_SELECTOR` estiver definido, ele tem prioridade.
5. Abra **Actions → Atualizar RSS do Diário Oficial → Run workflow** para executar o primeiro teste.
6. Inspecione os logs se o botão não for localizado. A mensagem de erro lista botões e links visíveis; use esse texto para definir a variável `EXPORT_BUTTON_TEXT` ou `EXPORT_BUTTON_SELECTOR`.
7. Quando o workflow publicar com sucesso, o feed estará em `https://SEU_USUARIO.github.io/diario-floresta-azul/feed.xml` (ajuste usuário e repositório conforme os nomes reais).

## Execução local

Requer Node.js 20 ou 22.

```bash
npm install
npx playwright install chromium
npm test
npm run update
```

Para listar os botões e links visíveis no portal:

```bash
node scripts/update-rss.js --list-controls
```

Para capturar e mostrar o primeiro registro após atualizar:

```bash
node scripts/update-rss.js --debug
```

Se executar localmente, o programa também gera `data/state.json` e `site/feed.xml`.

## Como funciona

- Captura Blobs JSON criados por `URL.createObjectURL()` no contexto principal da página.
- Tenta localizar um botão por `EXPORT_BUTTON_TEXT` ou pelos termos `json`, `exportar`, `baixar` e `download`.
- Usa `documento` como identificador; mantém até 100 itens no RSS e até 10 mil identificadores conhecidos no estado.
- Preserva publicações previamente encontradas mesmo quando deixam de aparecer na lista atual do portal.
- Em caso de publicação nova ou alteração nos dados monitorados, atualiza o estado e publica um novo `feed.xml`.
- O RSS aponta cada item para a página oficial do Diário; o formato observado não fornece um URL de PDF confirmado. O código não inventa um caminho para o arquivo.

## Limitações conhecidas

- A captura do Blob ainda precisa ser validada contra a interface ao vivo do portal. Se o site mudar o texto do botão ou deixar de usar `URL.createObjectURL()`, ajuste o seletor ou a captura.
- O agendamento do GitHub Actions pode sofrer atrasos. Os horários do cron estão em UTC; executar nos minutos 17 e 47 reduz a chance de atraso associada a horários cheios.
- No GitHub Free, o Pages requer que o repositório seja público. Os executores padrão do Actions são gratuitos para repositórios públicos. Consulte a documentação oficial antes de alterar a visibilidade:
  - https://docs.github.com/pt/pages/getting-started-with-github-pages/creating-a-github-pages-site
  - https://docs.github.com/pt/actions/reference/workflows-and-actions/workflow-syntax
  - https://docs.github.com/pt/actions/concepts/billing-and-usage

O feed é um serviço independente, não oficial da Prefeitura de Floresta Azul.
