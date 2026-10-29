import { FormEvent, useMemo, useState } from "react";
import { Search, CalendarDays, MapPin, BriefcaseBusiness, AlertCircle, LoaderCircle } from "lucide-react";

type Job = {
  id?: string; title?: string; company?: string; location?: string; url?: string;
  publishedAt?: string; datePublished?: string; datePosted?: string; publishedDate?: string; date?: string;
  description?: string; emails?: string[];
};
type SearchResult = { jobs?: Job[]; error?: string; message?: string; stats?: Record<string, unknown> };

function publishedDate(job: Job): Date | null {
  const raw = job.publishedAt ?? job.datePublished ?? job.publishedDate ?? job.datePosted ?? job.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function sortByPublicationDate(jobs: Job[]): Job[] {
  return [...jobs].sort((a,b) => {
    const da = publishedDate(a)?.getTime() ?? -Infinity;
    const db = publishedDate(b)?.getTime() ?? -Infinity;
    return db - da;
  });
}
function dayLabel(date: Date | null) {
  if (!date) return "Data de publicação não informada";
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }).format(date);
}
export default function App() {
  const [term, setTerm] = useState("");
  const [location, setLocation] = useState("Todas");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Pesquise vagas para visualizar os resultados agrupados por data de publicação.");
  const sorted = useMemo(() => sortByPublicationDate(jobs), [jobs]);
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; jobs: Job[] }>();
    for (const job of sorted) {
      const date = publishedDate(job);
      const key = date ? date.toISOString().slice(0,10) : "unknown";
      if (!map.has(key)) map.set(key, { label: dayLabel(date), jobs: [] });
      map.get(key)!.jobs.push(job);
    }
    return [...map.entries()].sort(([a],[b]) => a === "unknown" ? 1 : b === "unknown" ? -1 : b.localeCompare(a)).map(([,v])=>v);
  }, [sorted]);
  async function search(e: FormEvent) {
    e.preventDefault();
    if (!term.trim()) { setError("Informe o cargo ou termo que deseja pesquisar."); return; }
    setBusy(true); setError(""); setJobs([]); setMessage("Consultando o serviço de vagas…");
    try {
      const response = await fetch("/api/jobs/search", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({term:term.trim(), location, maxPages:10}) });
      const data = await response.json() as SearchResult;
      if (!response.ok) throw new Error(data.error || "Não foi possível pesquisar vagas.");
      const found = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(sortByPublicationDate(found));
      setMessage(found.length ? `${found.length} vaga(s) recebida(s). As datas desconhecidas ficam no final.` : "A pesquisa terminou sem vagas retornadas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao consultar o serviço.");
      setMessage("O serviço de pesquisa ainda precisa estar ativo no servidor.");
    } finally { setBusy(false); }
  }
  return <main className="shell">
    <header className="top"><div className="brand"><span className="brand-icon"><BriefcaseBusiness size={22}/></span><div><h1>Currículo Mail <span>V2</span></h1><p>Pesquisa de vagas por data de publicação</p></div></div><span className="status"><i/> Nova versão</span></header>
    <section className="hero"><p className="eyebrow">PESQUISA ORGANIZADA</p><h2>Encontre oportunidades<br/><em>da mais recente à mais antiga.</em></h2><p className="sub">As vagas são ordenadas pela data de publicação informada pela fonte. Quando a fonte não fornece uma data válida, a vaga aparece em uma seção separada no final.</p>
    <form onSubmit={search} className="search-form"><label> Cargo, função ou palavra-chave <div className="field"><Search size={18}/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Ex.: vendedor, motorista, auxiliar administrativo"/></div></label><label> Localização <div className="field"><MapPin size={18}/><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Todas as cidades"/></div></label><button disabled={busy}>{busy?<LoaderCircle className="spin" size={18}/>:<Search size={18}/>} {busy?"Pesquisando…":"Pesquisar vagas"}</button></form>
    </section>
    <section className="results"><div className="results-head"><div><h3>Resultados da pesquisa</h3><p>{message}</p></div><span className="count">{jobs.length} vagas</span></div>
      {error && <div className="notice"><AlertCircle size={18}/><span>{error}</span></div>}
      {!jobs.length && !error && <div className="empty"><CalendarDays size={30}/><strong>As vagas aparecerão aqui</strong><p>O agrupamento por data só usa datas reais retornadas pelo serviço; não inventamos datas para anúncios sem informação.</p></div>}
      {groups.map(group=><section className="day-group" key={group.label}><h4><CalendarDays size={17}/>{group.label}<span>{group.jobs.length}</span></h4><div className="job-list">{group.jobs.map((job,i)=><article className="job" key={job.id || job.url || `${job.title}-${i}`}><div className="job-main"><h5>{job.title || "Vaga sem título informado"}</h5><p>{job.company || "Empresa não informada"}{job.location ? ` · ${job.location}` : ""}</p>{job.description && <p className="desc">{job.description.slice(0,220)}{job.description.length>220?"…":""}</p>}</div>{job.url && <a href={job.url} target="_blank" rel="noreferrer">Ver vaga ↗</a>}</article>)}</div></section>)}
    </section><footer>Currículo Mail V2 · O repositório original não foi alterado.</footer>
  </main>;
}