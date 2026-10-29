# Currículo Mail — V2

Nova cópia de desenvolvimento baseada no repositório `braininking/aada`.

## Objetivo inicial
- Ordenar vagas por data real de publicação, da mais recente para a mais antiga.
- Corrigir a segurança de retomada e retry de campanhas.
- Preservar o repositório original sem alterações.

> Datas não identificadas pela fonte devem ficar como desconhecidas, sem serem apresentadas como datas confirmadas.

## Estado desta versão
Esta primeira etapa contém a interface de pesquisa e a regra de ordenação por data. A interface chama `POST /api/jobs/search`; o backend original ainda precisa ser migrado para esta cópia antes de a pesquisa real funcionar. O código-fonte de referência permanece em https://github.com/braininking/aada.

## Regra de datas
A ordem considera `publishedAt`, `datePublished`, `publishedDate`, `datePosted` ou `date`. Datas ausentes/inválidas não são inventadas e ficam agrupadas no final.
