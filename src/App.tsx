import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { NewCampaignPage } from './pages/NewCampaignPage';
import { CampaignsHistoryPage } from './pages/CampaignsHistoryPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { VagasSearchPage } from './pages/VagasSearchPage';
import { SendingQueueView } from './components/SendingQueueView';
import {
  Campaign,
  EmailTemplate,
  Recipient,
  AttachmentFile,
  UserProfile,
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  isGoogleAuthError,
  clearAccessToken,
} from './services/authService';
import {
  getCampaigns,
  saveCampaign,
  deleteCampaign,
  getInterruptedCampaign,
  saveInterruptedCampaign,
  clearInterruptedCampaign,
} from './services/campaignService';
import { getTemplates } from './services/templateService';
import {
  createMimeMessage,
  sendGmailMessage,
  personalizeText,
} from './services/gmailService';
import { RotateCcw, LayoutDashboard, MailPlus, Inbox, FileText, Search, Settings, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Active Sending Campaign state
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [interruptedCampaign, setInterruptedCampaign] = useState<Campaign | null>(null);
  const [initialNewCampaignTemplate, setInitialNewCampaignTemplate] = useState<EmailTemplate | null>(null);
  const [initialNewCampaignData, setInitialNewCampaignData] = useState<{
    subject?: string;
    message?: string;
    recipientsText?: string;
    attachments?: AttachmentFile[];
  } | null>(null);
  const [importedEmailsFromVagas, setImportedEmailsFromVagas] = useState<string[]>([]);

  // Queue runner refs to allow Pause/Resume/Cancel
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Initialize auth & local data
  useEffect(() => {
    // Load initial campaigns & templates
    const storedCampaigns = getCampaigns();
    setCampaigns(storedCampaigns);

    const storedTemplates = getTemplates();
    setTemplates(storedTemplates);

    // Check for interrupted campaign from earlier session
    const interr = getInterruptedCampaign();
    if (interr && interr.status === 'in_progress') {
      setInterruptedCampaign(interr);
    }

    // Init Firebase Auth
    const unsubscribe = initAuth(
      (firebaseUser) => {
        setUser({
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          picture: firebaseUser.photoURL || undefined,
        });
      },
      () => {
        // Not authenticated
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleConnectGmail = async () => {
    try {
      setAuthError(null);
      setIsConnecting(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.profile);
      }
    } catch (err: any) {
      console.error('Falha na conexão:', err);
      setAuthError(err.message || 'Não foi possível conectar ao Gmail.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    await logout();
    setUser(null);
  };

  // Start Campaign Execution with queue & anti-spam delay
  const handleStartCampaign = async ({
    senderEmail,
    subject,
    message,
    recipients,
    attachments,
  }: {
    senderEmail: string;
    subject: string;
    message: string;
    recipients: Recipient[];
    attachments: AttachmentFile[];
  }) => {
    const newCamp: Campaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderEmail,
      subject,
      message,
      status: 'in_progress',
      recipients: recipients.map((r) => ({ ...r, status: 'pending' })),
      attachments,
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
      pendingCount: recipients.length,
      createdAt: new Date().toISOString(),
      lastActiveIndex: 0,
    };

    setActiveCampaign(newCamp);
    saveInterruptedCampaign(newCamp);

    // Run sending process
    runQueueExecution(newCamp, 0);
  };

  // Core Queue Processing Logic
  const runQueueExecution = async (campaignData: Campaign, startIndex = 0) => {
    isPausedRef.current = false;
    isCancelledRef.current = false;
    let current = { ...campaignData };
    const recipientsList = [...current.recipients];

    // Ensure valid OAuth token before looping
    let token = await getAccessToken();
    if (!token && user) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setUser(res.profile);
        }
      } catch (err: any) {
        console.warn('Aguardando autorização do usuário:', err);
      }
    }

    for (let i = startIndex; i < recipientsList.length; i++) {
      // Check for pause
      if (isPausedRef.current) {
        current = {
          ...current,
          status: 'paused',
          lastActiveIndex: i,
        };
        setActiveCampaign(current);
        saveInterruptedCampaign(current);
        saveCampaign(current);
        return;
      }

      // Check for cancel
      if (isCancelledRef.current) {
        // Mark remaining as cancelled
        for (let j = i; j < recipientsList.length; j++) {
          if (recipientsList[j].status === 'pending') {
            recipientsList[j] = { ...recipientsList[j], status: 'cancelled' };
          }
        }
        current = {
          ...current,
          status: 'cancelled',
          recipients: recipientsList,
          completedAt: new Date().toISOString(),
        };
        setActiveCampaign(current);
        clearInterruptedCampaign();
        saveCampaign(current);
        setCampaigns(getCampaigns());
        return;
      }

      // Mark current as sending
      recipientsList[i] = { ...recipientsList[i], status: 'sending' };
      current = { ...current, recipients: recipientsList };
      setActiveCampaign({ ...current });

      const target = recipientsList[i];
      const personalizedSubj = personalizeText(current.subject, target);
      const personalizedBody = personalizeText(current.message, target);

      try {
        const activeToken = (await getAccessToken()) || token;
        if (!activeToken) {
          throw new Error('Request had invalid authentication credentials. Expected OAuth 2 access token.');
        }

        // Real Gmail API call
        const rawBase64Url = createMimeMessage({
          to: target.email,
          from: current.senderEmail,
          subject: personalizedSubj,
          bodyPlain: personalizedBody,
          attachments: current.attachments,
        });
        await sendGmailMessage({ accessToken: activeToken, rawBase64Url });

        // Mark as success
        recipientsList[i] = {
          ...recipientsList[i],
          status: 'sent',
          error: undefined,
          sentAt: new Date().toISOString(),
        };
        current.sentCount = (current.sentCount || 0) + 1;
        current.pendingCount = Math.max(0, (current.pendingCount || 1) - 1);
      } catch (err: any) {
        console.error(`Erro ao enviar para ${target.email}:`, err);
        const errMsg = err.message || '';
        const isAuthErr = isGoogleAuthError(errMsg);

        if (isAuthErr) {
          // Token is invalid/expired - clear token, keep recipient pending, and pause queue
          clearAccessToken();
          recipientsList[i] = {
            ...recipientsList[i],
            status: 'pending',
            error: 'Credenciais expiradas. Reautorize o Gmail para continuar.',
          };
          current = {
            ...current,
            status: 'paused',
            recipients: [...recipientsList],
            lastActiveIndex: i,
          };
          setActiveCampaign(current);
          saveInterruptedCampaign(current);
          saveCampaign(current);
          return;
        }

        const userFriendlyError = errMsg.includes('insufficient authentication scopes')
          ? 'Permissão de envio não concedida no Google. Clique em "Reautorizar Gmail" e marque a caixa de envio.'
          : (errMsg || 'Erro ao comunicar com a Gmail API');

        recipientsList[i] = {
          ...recipientsList[i],
          status: 'failed',
          error: userFriendlyError,
          sentAt: new Date().toISOString(),
        };
        current.failedCount = (current.failedCount || 0) + 1;
        current.pendingCount = Math.max(0, (current.pendingCount || 1) - 1);
      }

      current = {
        ...current,
        recipients: [...recipientsList],
        lastActiveIndex: i + 1,
      };
      setActiveCampaign({ ...current });
      saveInterruptedCampaign(current);

      // Controlled interval between messages (1000ms) to respect Gmail rate limits
      if (i < recipientsList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Completed whole queue
    current = {
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    setActiveCampaign(current);
    clearInterruptedCampaign();
    saveCampaign(current);
    setCampaigns(getCampaigns());
  };

  const handlePauseQueue = () => {
    isPausedRef.current = true;
    if (activeCampaign) {
      const updated: Campaign = { ...activeCampaign, status: 'paused' };
      setActiveCampaign(updated);
      saveCampaign(updated);
      saveInterruptedCampaign(updated);
    }
  };

  const handleResumeQueue = async () => {
    if (!activeCampaign) return;
    const startIndex = activeCampaign.lastActiveIndex || 0;
    const updated: Campaign = { ...activeCampaign, status: 'in_progress' };
    setActiveCampaign(updated);
    runQueueExecution(updated, startIndex);
  };

  const handleCancelQueue = () => {
    isCancelledRef.current = true;
  };

  const handleFinishViewQueue = () => {
    setActiveCampaign(null);
    setCurrentTab('campaigns');
    setCampaigns(getCampaigns());
  };

  // Interrupted campaign recovery
  const handleResumeInterrupted = () => {
    if (!interruptedCampaign) return;
    const campToResume = { ...interruptedCampaign };
    setInterruptedCampaign(null);
    setActiveCampaign(campToResume);
    const startIdx = campToResume.lastActiveIndex || 0;
    runQueueExecution(campToResume, startIdx);
  };

  const handleDiscardInterrupted = () => {
    clearInterruptedCampaign();
    setInterruptedCampaign(null);
  };

  const handleDeleteCampaign = (id: string) => {
    deleteCampaign(id);
    setCampaigns(getCampaigns());
  };

  const handleUseTemplate = (tpl: EmailTemplate) => {
    setInitialNewCampaignTemplate(tpl);
    setInitialNewCampaignData(null);
    setCurrentTab('new_campaign');
  };

  const handleTransferVagasEmailsToCampaign = (emails: string[]) => {
    setImportedEmailsFromVagas(emails);
    setInitialNewCampaignData(null);
    setCurrentTab('new_campaign');
  };

  // Reenviar campanha do histórico
  const handleResendCampaign = async (campaign: Campaign, mode: 'all' | 'failed_only' | 'edit') => {
    let targetRecipients: Recipient[] = [];
    if (mode === 'failed_only') {
      targetRecipients = campaign.recipients.filter((r) => r.status === 'failed');
      if (targetRecipients.length === 0) {
        targetRecipients = campaign.recipients;
      }
    } else {
      targetRecipients = campaign.recipients;
    }

    if (mode === 'edit') {
      setInitialNewCampaignData({
        subject: campaign.subject,
        message: campaign.message,
        recipientsText: targetRecipients.map((r) => r.email).join('\n'),
        attachments: campaign.attachments || [],
      });
      setInitialNewCampaignTemplate(null);
      setCurrentTab('new_campaign');
      return;
    }

    // Direct resend: reset statuses to pending
    const resetRecipients: Recipient[] = targetRecipients.map((r) => ({
      ...r,
      status: 'pending',
      error: undefined,
      sentAt: undefined,
    }));

    // Verify valid Google OAuth token before launching
    let token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setUser(res.profile);
        } else {
          return;
        }
      } catch (err: any) {
        setAuthError(err.message || 'Falha ao autenticar com o Gmail');
        return;
      }
    }

    // Start sending
    handleStartCampaign({
      senderEmail: user?.email || campaign.senderEmail,
      subject: campaign.subject,
      message: campaign.message,
      recipients: resetRecipients,
      attachments: campaign.attachments || [],
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        user={user}
        onConnect={handleConnectGmail}
        onDisconnect={handleDisconnectGmail}
        isConnecting={isConnecting}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onChangeTab={(tab) => {
            setActiveCampaign(null);
            setCurrentTab(tab);
          }}
          campaignsCount={campaigns.length}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Auth Connection Error Banner */}
          {authError && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-300 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <strong className="block text-white font-semibold">Falha ao conectar conta Gmail:</strong>
                  <span>{authError}</span>
                </div>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Recovery Notification if interrupted campaign found */}
          {interruptedCampaign && !activeCampaign && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Campanha interrompida encontrada
                  </h4>
                  <p className="text-xs text-amber-200/80">
                    O envio de "{interruptedCampaign.subject}" ({interruptedCampaign.sentCount}/
                    {interruptedCampaign.totalRecipients}) foi pausado. Deseja continuar de onde parou?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResumeInterrupted}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md cursor-pointer"
                >
                  Continuar
                </button>
                <button
                  onClick={handleDiscardInterrupted}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Active Sending Queue takes over current screen */}
          {activeCampaign ? (
            <SendingQueueView
              campaign={activeCampaign}
              onPause={handlePauseQueue}
              onResume={handleResumeQueue}
              onCancel={handleCancelQueue}
              onFinish={handleFinishViewQueue}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardPage
                  onNewCampaign={() => {
                    setInitialNewCampaignData(null);
                    setInitialNewCampaignTemplate(null);
                    setCurrentTab('new_campaign');
                  }}
                  onViewCampaign={() => {
                    setCurrentTab('campaigns');
                  }}
                  onGoToCampaigns={() => setCurrentTab('campaigns')}
                />
              )}

              {currentTab === 'new_campaign' && (
                <NewCampaignPage
                  user={user}
                  onConnectGmail={handleConnectGmail}
                  onStartCampaign={handleStartCampaign}
                  initialTemplate={initialNewCampaignTemplate}
                  initialCampaignData={initialNewCampaignData}
                  importedEmailsFromVagas={importedEmailsFromVagas}
                />
              )}

              {currentTab === 'campaigns' && (
                <CampaignsHistoryPage
                  campaigns={campaigns}
                  onSelectCampaign={() => {}}
                  onDeleteCampaign={handleDeleteCampaign}
                  onNewCampaign={() => {
                    setInitialNewCampaignData(null);
                    setInitialNewCampaignTemplate(null);
                    setCurrentTab('new_campaign');
                  }}
                  onResendCampaign={handleResendCampaign}
                />
              )}

              {currentTab === 'templates' && (
                <TemplatesPage
                  templates={templates}
                  onTemplatesUpdated={setTemplates}
                  onUseTemplate={handleUseTemplate}
                />
              )}

              {currentTab === 'vagas_finder' && (
                <VagasSearchPage
                  onSendToCampaign={handleTransferVagasEmailsToCampaign}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsPage
                  user={user}
                  onConnectGmail={handleConnectGmail}
                  onDisconnectGmail={handleDisconnectGmail}
                />
              )}

              {currentTab === 'privacy' && (
                <PrivacyPage
                  onDataCleared={() => {
                    setCampaigns([]);
                    setTemplates(getTemplates());
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur px-2 py-2 flex items-center justify-around z-30">
        <button
          onClick={() => {
            setActiveCampaign(null);
            setCurrentTab('dashboard');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] cursor-pointer ${
            currentTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Início</span>
        </button>
        <button
          onClick={() => {
            setActiveCampaign(null);
            setInitialNewCampaignData(null);
            setInitialNewCampaignTemplate(null);
            setCurrentTab('new_campaign');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] cursor-pointer ${
            currentTab === 'new_campaign' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <MailPlus className="w-4 h-4" />
          <span>Nova</span>
        </button>
        <button
          onClick={() => {
            setActiveCampaign(null);
            setCurrentTab('vagas_finder');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] cursor-pointer ${
            currentTab === 'vagas_finder' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Vagas</span>
        </button>
        <button
          onClick={() => {
            setActiveCampaign(null);
            setCurrentTab('campaigns');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] cursor-pointer ${
            currentTab === 'campaigns' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Campanhas</span>
        </button>
        <button
          onClick={() => {
            setActiveCampaign(null);
            setCurrentTab('templates');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] cursor-pointer ${
            currentTab === 'templates' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Modelos</span>
        </button>
        <button
          onClick={() => {
            setActiveCampaign(null);
            setCurrentTab('settings');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] cursor-pointer ${
            currentTab === 'settings' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
