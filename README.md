# Diário Oficial de Floresta Azul — Feed RSS com IA 🗞️

[![Atualizar RSS do Diário Oficial](https://github.com/verwischt/florestaazuldiariorss/actions/workflows/atualizar-rss.yml/badge.svg)](https://github.com/verwischt/florestaazuldiariorss/actions/workflows/atualizar-rss.yml)
[![Feed RSS](https://img.shields.io/badge/RSS-feed.xml-orange?logo=rss)](https://verwischt.github.io/florestaazuldiariorss/feed.xml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Online-brightgreen)](https://verwischt.github.io/florestaazuldiariorss/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-blue?logo=node.js)](package.json)

Feed RSS automatizado e independente das publicações do **Diário Oficial do Município de Floresta Azul (Bahia)**.

O projeto monitora o portal oficial, extrai novas edições, disponibiliza **links diretos para download do PDF** e gera **resumos inteligentes com Inteligência Artificial (Google Gemini)** direto no seu leitor de RSS favorito — tudo 100% gratuito rodando no GitHub Actions e GitHub Pages.

---

## 📡 Como Assinar o Feed

Adicione o link abaixo ao seu leitor de RSS preferido (NetNewsWire, Feedly, Inoreader, Telegram bot, etc.):

```text
https://verwischt.github.io/florestaazuldiariorss/feed.xml
```

Você também pode acessar a página inicial do projeto:
👉 [https://verwischt.github.io/florestaazuldiariorss/](https://verwischt.github.io/florestaazuldiariorss/)

---

## ✨ Recursos

- **🔗 Links funcionais de PDF:** Cada item do feed possui link direto e tag `<enclosure>` para download ou abertura imediata do arquivo PDF.
- **🤖 Resumos automáticos com IA:** Leitura e sumarização das edições usando o modelo **Gemini 1.5 Flash** (destaca decretos, licitações, contratos com valores, nomeações e portarias).
- **⏱️ Monitoramento automático:** Execução periódica a cada 30 minutos via **GitHub Actions** (sem custos de servidor).
- **💾 Cache persistente:** Histórico mantido em `data/state.json`, garantindo que edições antigas não se percam e nenhum PDF seja resumido mais de uma vez.
- **🌐 Publicação automática:** Publicado diretamente no **GitHub Pages** sempre que houver novidades.

---

## 🤖 Como ativar os Resumos com IA (100% Gratuito)

O resumo automático dos PDFs é opcional e utiliza a cota gratuita do **Google Gemini** (sem necessidade de cadastrar cartão de crédito).

### Passo a passo para configurar:

1. **Obtenha a chave gratuita:**
   - Acesse o [Google AI Studio](https://aistudio.google.com/).
   - Faça login com sua conta Google e clique em **Get API key**.
   - Crie uma chave e copie o código gerado.

2. **Adicione o Secret no GitHub:**
   - No repositório, vá em **Settings** → **Secrets and variables** → **Actions**.
   - Na aba **Secrets**, clique em **New repository secret**.
   - **Name:** `GEMINI_API_KEY`
   - **Secret:** *(cole a chave obtida no passo 1)*
   - Clique em **Add secret**.

3. **Pronto!**
   - A cada nova edição capturada, a IA lerá o PDF e incluirá um bloco `📝 Resumo da Edição (IA)` diretamente na descrição da publicação no feed.
   - O resumo é armazenado em cache no `data/state.json`, consumindo cota apenas uma vez por documento.
   - *Se a chave não estiver configurada, o feed continuará funcionando normalmente com as informações padrão do portal.*

---

## 💻 Execução e Desenvolvimento Local

Requer **Node.js 20, 22 ou superior**.

### 1. Instalar dependências e navegadores do Playwright:

```bash
npm install
npx playwright install chromium
```

### 2. Rodar os testes:

```bash
npm test
```

### 3. Reconstruir o feed local a partir do estado atual:

```bash
npm run build
```

### 4. Executar a captura completa no portal oficial:

```bash
npm run update
```

### Comandos úteis de depuração:

- Listar controles e botões visíveis no portal:
  ```bash
  node scripts/update-rss.js --list-controls
  ```
- Executar e exibir o primeiro registro capturado:
  ```bash
  node scripts/update-rss.js --debug
  ```

---

## 📂 Estrutura do Projeto

```text
├── .github/workflows/
│   └── atualizar-rss.yml  # Automação do GitHub Actions (cron a cada 30 min)
├── data/
│   └── state.json         # Histórico de IDs conhecidos e publicações (com cache de IA)
├── lib/
│   ├── rss.js             # Lógica de formatação do feed RSS 2.0 e links de PDF
│   └── summarizer.js      # Integração com a API do Google Gemini para leitura de PDFs
├── scripts/
│   └── update-rss.js      # Script de scraping (Playwright), extração de Blob e atualização
├── site/
│   ├── feed.xml           # Arquivo do feed RSS gerado e publicado
│   └── index.html         # Página estática informativa para o GitHub Pages
└── tests/
    ├── rss.test.js        # Testes de geração e escape de XML
    └── summarizer.test.js # Testes do módulo de IA
```

---

## ⚠️ Isenção de Responsabilidade

Este projeto é uma iniciativa comunitária independente e de código aberto, sem vínculo oficial com a Prefeitura Municipal de Floresta Azul.

Para efeitos legais e consultas oficiais, consulte sempre o portal oficial do município:  
🔗 [https://diario.florestaazul.ba.gov.br/edicoes-anteriores](https://diario.florestaazul.ba.gov.br/edicoes-anteriores)
