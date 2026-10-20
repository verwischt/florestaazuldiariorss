# Teste rápido com o JSON de exemplo

O arquivo `tests/rss.test.js` valida a normalização das observações, a ordenação e a geração de XML.

Execute `npm test` para rodar esses testes, que não precisam acessar o portal.

Antes de publicar o feed, execute `node scripts/update-rss.js --list-controls` para descobrir o rótulo do botão de exportação. Se o portal usar um nome diferente dos padrões, defina `EXPORT_BUTTON_TEXT` no GitHub Actions.
