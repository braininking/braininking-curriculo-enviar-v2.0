import React, { useMemo, useState } from 'react';
import { Search, Globe2, ExternalLink, Mail, MapPin, CalendarClock, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';

type NationalResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  emails: string[];
  sourceDomain: string;
};

type Props = {
  onSendToCampaign: (emails: string[]) => void;
};

const STATES = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'],
  ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'],
  ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'],
  ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
  ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'],
  ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins'],
];

export const NationalJobSearchPage: React.FC<Props> = ({ onSendToCampaign }) => {
  const [term, setTerm] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [period, setPeriod] = useState('month');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [results, setResults] = useState<NationalResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  const allEmails = useMemo(() => [...new Set(results.flatMap((item) => item.emails))], [results]);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!term.trim() || (!city.trim() && !state)) {
      setError('Informe o cargo e a cidade ou o estado.');
      return;
    }
    setIsSearching(true);
    setError('');
    setNotice('');
    setResults([]);
    setSelectedEmails([]);
    setSearched(true);
    try {
      const response = await fetch('/api/national-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: term.trim(), city: city.trim(), state, period }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na pesquisa nacional.');
      setResults(data.results || []);
      setNotice(data.note || '');
    } catch (err: any) {
      setError(err.message || 'Não foi possível pesquisar agora.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((current) => current.includes(email)
      ? current.filter((item) => item !== email)
      : [...current, email]);
  };

  const toggleAll = () => {
    setSelectedEmails((current) => current.length === allEmails.length ? [] : allEmails);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-blue-950/70 via-cyan-950/40 to-slate-900 p-6 sm:p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          <Globe2 className="h-4 w-4" /> NOVO MÓDULO · BRASIL INTEIRO
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Busca Nacional de Vagas</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Pesquise páginas públicas de vagas, carreiras e recrutamento por cargo e localidade. O Temos Vagas continua separado e inalterado.
        </p>
      </section>

      <form onSubmit={search} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs font-semibold text-slate-300">
            Cargo ou palavra-chave
            <input value={term} onChange={(e) => setTerm(e.target.value)} maxLength={100} placeholder="Ex.: Consultor de Vendas" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" required />
          </label>
          <label className="space-y-2 text-xs font-semibold text-slate-300">
            Cidade (opcional)
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Ex.: Porto Alegre" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" />
          </label>
          <label className="space-y-2 text-xs font-semibold text-slate-300">
            Estado
            <select value={state} onChange={(e) => setState(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
              {STATES.map(([uf, name]) => <option key={uf} value={uf}>{name} ({uf})</option>)}
            </select>
          </label>
          <label className="space-y-2 text-xs font-semibold text-slate-300">
            Período da pesquisa
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="three_months">Últimos 3 meses</option>
              <option value="any">Sem limite de período</option>
            </select>
          </label>
        </div>
        <button type="submit" disabled={isSearching} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {isSearching ? 'Pesquisando na web…' : 'Pesquisar no Brasil inteiro'}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div><strong className="block">Atenção</strong>{error}
            {error.includes('BRAVE_SEARCH_API_KEY') && <p className="mt-2 text-xs text-amber-200">No Render: abra o serviço curriculo-mail-v2 → Environment → Add Environment Variable. Nome: BRAVE_SEARCH_API_KEY. Valor: sua chave privada da Brave Search API. Depois salve para implantar novamente.</p>}
          </div>
        </div>
      )}

      {notice && <p className="text-xs leading-relaxed text-slate-400">{notice}</p>}

      {searched && !isSearching && !error && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-white">{results.length} página(s) encontrada(s)</h3>
              <p className="mt-1 text-xs text-slate-400">{allEmails.length} e-mail(s) públicos extraídos de resultados e páginas acessíveis.</p>
            </div>
            {allEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={toggleAll} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                  {selectedEmails.length === allEmails.length ? 'Desmarcar e-mails' : 'Selecionar todos'}
                </button>
                <button type="button" disabled={!selectedEmails.length} onClick={() => onSendToCampaign(selectedEmails)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                  Usar na campanha <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">Nenhum resultado retornado. Tente outro cargo, cidade ou período.</div>
          ) : results.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-white">{item.title}</h4>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" />{item.sourceDomain}</span>
                    {item.publishedAt && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{item.publishedAt}</span>}
                  </div>
                  {item.snippet && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">{item.snippet}</p>}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                    Abrir publicação <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-300"><MapPin className="h-3.5 w-3.5" />Busca nacional</div>
              </div>
              {item.emails.length > 0 && (
                <div className="mt-4 border-t border-slate-800 pt-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-300"><Mail className="h-4 w-4" />E-mails públicos encontrados</div>
                  <div className="flex flex-wrap gap-2">
                    {item.emails.map((email) => (
                      <label key={email} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                        <input type="checkbox" checked={selectedEmails.includes(email)} onChange={() => toggleEmail(email)} />
                        {email}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500">
        Os resultados dependem da cobertura do provedor e do acesso permitido por cada site. A data de publicação pode estar ausente ou ser aproximada. Confira a vaga e o destinatário antes de enviar seu currículo; não use os contatos para mensagens em massa não solicitadas.
      </p>
    </div>
  );
};
