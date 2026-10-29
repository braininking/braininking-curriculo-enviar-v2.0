# Currículo Mail — V2

Cópia de desenvolvimento baseada no repositório `braininking/aada`. O repositório original foi preservado e não recebe alterações desta V2.

## Estado atual

- Interface: painel, campanhas, histórico, modelos, configurações e pesquisa de vagas.
- Busca de vagas: backend Express e scrapers migrados.
- Resultados de vagas: ordenação por data de publicação, da mais recente para a mais antiga.
- Cartões de vagas: agrupamento por dia; vagas sem data válida ficam em um grupo separado no final.
- **OAuth removido:** não há cliente OAuth configurado ou biblioteca de login Google carregada pelo código.
- **Envio de e-mails desativado:** o envio pela Gmail API exige um token OAuth válido; sem autenticação, não é possível enviar mensagens.
- Endpoint de saúde: `GET /api/health`.
- Limite básico em memória: até 20 requisições por IP a cada 10 minutos no endpoint de vagas.

## Autenticação e envio

A integração OAuth foi desativada intencionalmente a pedido do responsável pelo projeto. A interface mantém mensagens compatíveis para informar que a conexão com Gmail e o envio não estão disponíveis. Nenhum OAuth Client ID ou segredo é necessário enquanto essa integração permanecer desativada.

## Regra de datas

A interface prioriza `publishedAt` e `publishedDate` e considera outros campos de data quando existem. Datas ausentes ou inválidas não são inventadas e devem aparecer como desconhecidas. A precisão depende da data que cada site de vagas fornece e que o scraper consegue extrair.

## Desenvolvimento e produção

```bash
npm install
npm run build
NODE_ENV=production npm start
```

O servidor usa a variável `PORT` quando definida. Para servir a interface compilada, execute com `NODE_ENV=production` após gerar `dist`.

## Antes de usar em produção

O build confirma apenas que o código compila; não substitui testes funcionais. Ainda é necessário validar buscas reais, anexos, retomada de campanhas e os demais fluxos da aplicação. Configure também limites de requisição no provedor de hospedagem; o limitador em memória não é compartilhado entre instâncias.

Revise os alertas de vulnerabilidade do npm e atualize dependências com cuidado antes de produção.

## Referência

Repositório original preservado: https://github.com/braininking/aada
