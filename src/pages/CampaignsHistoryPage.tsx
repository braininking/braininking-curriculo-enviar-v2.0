import React, { useState } from 'react';
import {
  Inbox,
  Search,
  Filter,
  Calendar,
  Eye,
  Trash2,
  Paperclip,
  RotateCcw,
  Send,
  Edit3,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Campaign } from '../types';
import { formatFileSize } from '../services/fileService';

interface CampaignsHistoryPageProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (id: string) => void;
  onNewCampaign: () => void;
  onResendCampaign: (campaign: Campaign, mode: 'all' | 'failed_only' | 'edit') => void;
}

export const CampaignsHistoryPage: React.FC<CampaignsHistoryPageProps> = ({
  campaigns,
  onDeleteCampaign,
  onNewCampaign,
  onResendCampaign,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDetails, setSelectedDetails] = useState<Campaign | null>(null);
  const [resendTarget, setResendTarget] = useState<Campaign | null>(null);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.senderEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && c.status === 'completed') ||
      (statusFilter === 'in_progress' && (c.status === 'in_progress' || c.status === 'paused')) ||
      (statusFilter === 'has_errors' && c.failedCount > 0);
    return matchesSearch && matchesStatus;
  });

  const handleExecuteResend = (mode: 'all' | 'failed_only' | 'edit') => {
    if (!resendTarget) return;
    const target = resendTarget;
    setResendTarget(null);
    onResendCampaign(target, mode);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Modal de Reenvio de Campanha */}
      {resendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reenviar Campanha</h3>
                  <p className="text-[11px] text-slate-400">Escolha como deseja reenviar esta mensagem</p>
                </div>
              </div>
              <button
                onClick={() => setResendTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="text-slate-400">
                  Assunto: <strong className="text-white">{resendTarget.subject}</strong>
                </div>
                <div className="text-slate-400 flex items-center gap-2">
                  <span>Total: <strong>{resendTarget.totalRecipients}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-400">Enviados: <strong>{resendTarget.sentCount}</strong></span>
                  <span>•</span>
                  <span className="text-rose-400">Falhas: <strong>{resendTarget.failedCount}</strong></span>
                </div>
              </div>

              {resendTarget.failedCount > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Existem <strong>{resendTarget.failedCount}</strong> e-mails que falharam (por erro de conexão ou credenciais expiradas). Você pode reenviar apenas para eles sem repetir o envio aos que já receberam!
                  </span>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                {/* Opção 1: Apenas os que falharam (se houver falhas) */}
                {resendTarget.failedCount > 0 && (
                  <button
                    onClick={() => handleExecuteResend('failed_only')}
                    className="w-full p-3.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/5 hover:bg-rose-500/10 text-left transition-all flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block group-hover:text-rose-300">
                        Reenviar APENAS para os que falharam ({resendTarget.failedCount} e-mails)
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                        Excelente para recuperar envios com falha de credenciais ou rede, sem incomodar quem já recebeu.
                      </span>
                    </div>
                  </button>
                )}

                {/* Opção 2: Reenviar para todos */}
                <button
                  onClick={() => handleExecuteResend('all')}
                  className="w-full p-3.5 rounded-xl border border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-blue-300">
                      Reenviar para TODOS os destinatários ({resendTarget.totalRecipients} e-mails)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                      Reinicia a fila do zero para todos os contatos da lista original.
                    </span>
                  </div>
                </button>

                {/* Opção 3: Editar antes de reenviar */}
                <button
                  onClick={() => handleExecuteResend('edit')}
                  className="w-full p-3.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-950/80 hover:bg-slate-800 text-left transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-slate-200">
                      Editar antes de reenviar
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                      Carrega o assunto, a mensagem e os contatos na tela "Nova Campanha" para você revisar ou anexar novo currículo.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
              <button
                onClick={() => setResendTarget(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal if viewing single campaign */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">{selectedDetails.subject}</h3>
                <p className="text-xs text-slate-400">
                  Criada em {new Date(selectedDetails.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = selectedDetails;
                    setSelectedDetails(null);
                    setResendTarget(c);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reenviar Campanha
                </button>
                <button
                  onClick={() => setSelectedDetails(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs text-center">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Total</span>
                  <span className="text-lg font-bold text-white">{selectedDetails.totalRecipients}</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-emerald-400 block">Enviados</span>
                  <span className="text-lg font-bold text-emerald-300">{selectedDetails.sentCount}</span>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <span className="text-rose-400 block">Erros</span>
                  <span className="text-lg font-bold text-rose-300">{selectedDetails.failedCount}</span>
                </div>
              </div>

              {/* Message preview */}
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Corpo do E-mail Enviado:
                </span>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-sans whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedDetails.message}
                </div>
              </div>

              {/* Attachments */}
              {selectedDetails.attachments && selectedDetails.attachments.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Anexos enviados ({selectedDetails.attachments.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDetails.attachments.map((att) => (
                      <span
                        key={att.id}
                        className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-blue-400 flex items-center gap-1.5"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        {att.filename} ({formatFileSize(att.size)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Recipients table */}
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Destinatários da Campanha:
                </span>
                <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-60 bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">E-mail</th>
                        <th className="py-2.5 px-3">Empresa</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {selectedDetails.recipients.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 font-mono text-slate-300">{r.email}</td>
                          <td className="py-2 px-3 text-slate-400">{r.company || '-'}</td>
                          <td className="py-2 px-3">
                            {r.status === 'sent' && (
                              <span className="text-emerald-400 font-medium">✓ Enviado</span>
                            )}
                            {r.status === 'failed' && (
                              <span className="text-rose-400 font-medium">✗ Erro</span>
                            )}
                            {r.status === 'pending' && (
                              <span className="text-slate-400 font-medium">Aguardando</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {r.error || (r.sentAt ? new Date(r.sentAt).toLocaleTimeString('pt-BR') : '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Histórico de Campanhas</h2>
          <p className="text-xs text-slate-400">
            Acompanhe o registro de todos os envios de currículo e reenveie campanhas com facilidade.
          </p>
        </div>
        <button
          onClick={onNewCampaign}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 self-start sm:self-auto transition-all cursor-pointer"
        >
          + Nova campanha
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por assunto ou remetente..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="completed">Concluídas</option>
            <option value="in_progress">Em andamento / Pausadas</option>
            <option value="has_errors">Com erros</option>
          </select>
        </div>
      </div>

      {/* List of campaigns */}
      <div className="space-y-3">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">Nenhuma campanha encontrada</p>
            <p className="text-xs text-slate-500 mt-1">
              Inicie uma nova candidatura para criar seu primeiro histórico de envio.
            </p>
          </div>
        ) : (
          filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-5 bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    {camp.subject}
                  </h3>
                  {camp.status === 'completed' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Concluída
                    </span>
                  )}
                  {camp.status === 'in_progress' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                      Em andamento
                    </span>
                  )}
                  {camp.status === 'paused' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Pausada
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(camp.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    Remetente: <strong className="text-slate-300 font-mono">{camp.senderEmail}</strong>
                  </span>
                  {camp.attachments && camp.attachments.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <Paperclip className="w-3.5 h-3.5" />
                        {camp.attachments.length} anexo(s)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    <strong>{camp.totalRecipients}</strong> destinatários
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                    {camp.sentCount} enviados
                  </span>
                  {camp.failedCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                      {camp.failedCount} falharam
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => setResendTarget(camp)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Reenviar esta campanha"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reenviar
                  </button>
                  <button
                    onClick={() => setSelectedDetails(camp)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalhes
                  </button>
                  <button
                    onClick={() => onDeleteCampaign(camp.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Excluir campanha do histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
