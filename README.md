# Currículo Mail — V2

Cópia de desenvolvimento baseada no repositório `braininking/aada`. O repositório original foi preservado e não recebe alterações desta V2.

## Estado atual

- Build TypeScript + Vite: validar no GitHub Actions após cada alteração.
- Interface: painel, campanhas, histórico, modelos, configurações e pesquisa de vagas.
- Busca de vagas: backend Express e scrapers migrados.
- Resultados de vagas: ordenação por data de publicação, da mais recente para a mais antiga.
- Cartões de vagas: agrupamento por dia; vagas sem data válida ficam em um grupo separado no final.
- Autenticação: Google OAuth 2.0 via Google Identity Services, sem Firebase Authentication.
- Envio: Gmail API usando token OAuth em memória; o token não é salvo em armazenamento persistente do navegador.
- Endpoint de saúde: `GET /api/health`.
- Limite básico em memória: até 20 requisições por IP a cada 10 minutos no endpoint de vagas.

## Configuração obrigatória do Google OAuth

A aplicação usa um OAuth Client ID público configurado no código. Para que o login funcione no domínio publicado, o responsável pelo projeto Google Cloud precisa:

1. Abrir Google Cloud Console → APIs e serviços → Credenciais.
2. Editar o cliente OAuth 2.0 usado pela aplicação.
3. Adicionar `https://curriculo-mail-v2.onrender.com` em **Origens JavaScript autorizadas**.
4. Confirmar a tela de consentimento OAuth e habilitar a Gmail API.
5. Confirmar que os escopos `gmail.send`, `userinfo.email` e `userinfo.profile` estão permitidos e que o estado de publicação/testadores atende à conta usada.

Esta alteração remove Firebase do código e das dependências, mas não remove as políticas de segurança que o Google aplica à conta ou ao projeto Cloud. Se o Console do Google Cloud também exigir MFA, será necessário um administrador autorizado ou outro projeto OAuth acessível; o código não pode contornar essa exigência. Nunca coloque um OAuth client secret no frontend.

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

O build confirma apenas que o código compila; não substitui testes funcionais. Ainda é necessário validar o OAuth no domínio publicado, buscas reais, envio de e-mails, anexos e retomada de campanhas. Configure também limites de requisição no provedor de hospedagem; o limitador em memória não é compartilhado entre instâncias.

Revise os alertas de vulnerabilidade do npm e atualize dependências com cuidado antes de produção.

## Referência

Repositório original preservado: https://github.com/braininking/aada
