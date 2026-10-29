import { Router, type Request, type Response } from 'express';
import * as cheerio from 'cheerio';

export const nationalSearchRouter = Router();

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
};

type NationalResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  emails: string[];
  sourceDomain: string;
};

const EMAIL_RE = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

function safePublicUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_RE) || [];
  return [...new Set(matches
    .map((email) => email.replace(/[.,;:)}\]>]+$/, '').toLowerCase())
    .filter((email) =>
      email.length <= 254 &&
      !/\.(png|jpe?g|gif|webp|svg|css|js)$/i.test(email) &&
      !/^(example|nome|email)@/i.test(email)
    ))].slice(0, 12);
}

function queryFor(term: string, city: string, state: string): string {
  const location = [city, state, 'Brasil'].filter(Boolean).join(' ');
  return `("${term}" OR vaga OR emprego OR contratação) ${location} (vaga OR emprego OR trabalhe conosco OR carreira OR recrutamento)`;
}

nationalSearchRouter.post('/', async (req: Request, res: Response) => {
  const term = typeof req.body?.term === 'string' ? req.body.term.trim().slice(0, 100) : '';
  const city = typeof req.body?.city === 'string' ? req.body.city.trim().slice(0, 80) : '';
  const state = typeof req.body?.state === 'string' ? req.body.state.trim().slice(0, 40) : '';
  const period = ['week', 'month', 'three_months', 'any'].includes(req.body?.period)
    ? req.body.period as string
    : 'month';

  if (!term || (!city && !state)) {
    res.status(400).json({ error: 'Informe o cargo e pelo menos a cidade ou o estado.' });
    return;
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'A busca nacional ainda não está ativada. Configure BRAVE_SEARCH_API_KEY nas variáveis de ambiente do serviço no Render.',
      setupRequired: true,
    });
    return;
  }

  const freshness: Record<string, string | undefined> = {
    week: 'pw',
    month: 'pm',
    three_months: 'py',
    any: undefined,
  };

  try {
    const q = queryFor(term, city, state);
    const params = new URLSearchParams({
      q,
      count: '10',
      country: 'BR',
      search_lang: 'pt-br',
      safesearch: 'moderate',
    });
    if (freshness[period]) params.set('freshness', freshness[period]!);

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      const details = response.status === 401 || response.status === 403
        ? 'A chave da Brave Search API foi recusada. Confira a chave e o plano no provedor.'
        : response.status === 429
          ? 'O limite da API de pesquisa foi atingido. Tente novamente mais tarde.'
          : `O provedor de pesquisa retornou HTTP ${response.status}.`;
      res.status(response.status === 429 ? 429 : 502).json({ error: details });
      return;
    }

    const data = await response.json() as { web?: { results?: BraveWebResult[] } };
    const rawResults = (data.web?.results || []).filter((item) => item.url && item.title);
    const seen = new Set<string>();
    const results: NationalResult[] = [];

    for (const item of rawResults.slice(0, 10)) {
      const url = safePublicUrl(item.url!);
      if (!url || seen.has(url.href)) continue;
      seen.add(url.href);

      let emails = extractEmails(`${item.title || ''} ${item.description || ''}`);
      // Read a small number of public result pages to find contact addresses.
      // The search result itself remains useful if a site blocks automated access.
      if (results.length < 8) {
        try {
          const pageResponse = await fetch(url.href, {
            headers: {
              'User-Agent': 'CurriculoMailJobSearch/1.0 (+public job listing research)',
              Accept: 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(4500),
          });
          const contentType = pageResponse.headers.get('content-type') || '';
          if (pageResponse.ok && contentType.includes('text/html')) {
            const html = (await pageResponse.text()).slice(0, 700_000);
            const $ = cheerio.load(html);
            const mailto = $('a[href^="mailto:"]').map((_, el) =>
              ($(el).attr('href') || '').replace(/^mailto:/i, '').split('?')[0]
            ).get().join(' ');
            const pageText = $('body').text().slice(0, 180_000);
            emails = [...new Set([...emails, ...extractEmails(`${mailto} ${pageText}`)])].slice(0, 12);
          }
        } catch {
          // Search snippets are still returned when a site is unavailable.
        }
      }

      results.push({
        id: url.href,
        title: item.title!.slice(0, 240),
        url: url.href,
        snippet: (item.description || '').slice(0, 1000),
        publishedAt: item.page_age || item.age,
        emails,
        sourceDomain: url.hostname.replace(/^www\./, ''),
      });
    }

    res.json({
      query: q,
      results,
      stats: {
        resultsFound: results.length,
        resultsWithEmail: results.filter((item) => item.emails.length > 0).length,
        uniqueEmails: [...new Set(results.flatMap((item) => item.emails))].length,
      },
      source: 'Brave Search API',
      note: 'Resultados públicos encontrados na web. A data pode não estar disponível para todas as páginas e os e-mails devem ser conferidos antes do envio.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.name === 'TimeoutError' ? 'A pesquisa demorou demais. Tente novamente.' : 'Não foi possível concluir a busca nacional neste momento.' });
  }
});
