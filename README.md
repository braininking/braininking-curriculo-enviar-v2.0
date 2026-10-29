# Currículo Mail — V2

Cópia de desenvolvimento baseada no repositório `braininking/aada`. O repositório original foi preservado e não recebe alterações desta V2.

## Estado atual

- Build TypeScript + Vite: **aprovado no GitHub Actions**.
- Interface original recuperada: painel, campanhas, histórico, modelos, configurações e pesquisa de vagas.
- Busca de vagas: backend Express e scrapers migrados.
- Resultados de vagas: ordenação por data de publicação, da mais recente para a mais antiga.
- Cartões de vagas: agrupamento por dia; vagas sem data válida ficam em um grupo separado no final.
- Endpoint de saúde: `GET /api/health`.
- Limite básico em memória: até 20 requisições por IP a cada 10 minutos no endpoint de vagas.

## Regra de datas

A interface prioriza `publishedAt` e `publishedDate` e considera outros campos de data quando existem. Datas ausentes ou inválidas não são inventadas e devem aparecer como desconhecidas. A precisão depende da data que cada site de vagas fornece e que o scraper consegue extrair.

## Desenvolvimento e produção

```bash
npm install
npm run build
npm start
```

O servidor usa a variável `PORT` quando definida. Para servir a interface compilada, execute com `NODE_ENV=production` após gerar `dist`.

## Antes de usar em produção

O build aprovado confirma que o TypeScript e o bundle frontend compilam, mas não substitui testes funcionais. Ainda é necessário validar buscas reais, configuração de autenticação Firebase/Gmail, envio e retomada de campanhas e variáveis de ambiente. Configure também limites de requisição no provedor de hospedagem; o limitador em memória não é compartilhado entre instâncias.

O npm reportou 5 vulnerabilidades de severidade alta durante a instalação. Revise `npm audit` e atualize dependências com cuidado antes de publicar.

## Referência

Repositório original: https://github.com/braininking/aada
