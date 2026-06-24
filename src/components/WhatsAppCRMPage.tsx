import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, CheckCheck, RefreshCw, Bot, Shield, 
  Terminal, Smartphone, Sliders, AlertCircle, FileText, FileSpreadsheet, 
  HelpCircle, Settings, CheckCircle2, ListFilter, Clipboard, Info, Mail, Phone, ExternalLink 
} from 'lucide-react';
import dbInstance from '../db/store';
import { useToast } from './Toast';

interface Message {
  id: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
  status?: string;
  isAi?: boolean;
  error?: string;
}

interface ChatSession {
  phone: string;
  name: string;
  messages: Message[];
}

interface WhatsAppCRMPageProps {
  isRtl: boolean;
}

export const WhatsAppCRMPage: React.FC<WhatsAppCRMPageProps> = ({ isRtl }) => {
  const { success, error, warning, info, confirm } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'templates' | 'settings'>('console');
  
  // Settings State matching store
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Local sync tick
  const [tick, setTick] = useState(0);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);

  // Webhook test controls
  const [webhookTestText, setWebhookTestText] = useState('');
  const [webhookTestPhone, setWebhookTestPhone] = useState('');
  const [webhookTestName, setWebhookTestName] = useState('');
  const [manualReplyText, setManualReplyText] = useState('');
  const [isWebhookNoticePending, setIsWebhookNoticePending] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Status updates
  const [recentWebhookLogs, setRecentWebhookLogs] = useState<string[]>([]);
  const userRole = dbInstance.currentRole;

  // Enforce settings role check
  useEffect(() => {
    if (userRole === 'sales' && activeSubTab === 'settings') {
      setActiveSubTab('console');
    }
  }, [activeSubTab, userRole]);

  // Load configuration and credentials status from API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/whatsapp/config', {
          headers: {
            'Authorization': `Bearer ${dbInstance.getAuthToken()}`
          }
        });
        const json = await response.json();
        if (json.success && json.config) {
          setAccessToken(json.config.isConfigured ? '••••••••••••••••' : '');
          setPhoneNumberId(json.config.phoneNumberId || '');
          setWabaId(json.config.wabaId || '');
          setVerifyToken(json.config.verifyToken || '');
          setIsAiEnabled(json.config.isAiEnabled);
          setAiPrompt(json.config.aiPrompt);
          setWebhookUrl(json.config.webhookUrl);
        }
      } catch (err) {
        console.error('Failed to load WhatsApp configuration:', err);
      }
    };
    if (userRole !== 'sales') {
      fetchConfig();
    }
  }, [tick, userRole]);

  // Load Chats and Templates
  const fetchChatsFromApi = async () => {
    try {
      const response = await fetch('/api/whatsapp/chats', {
        headers: {
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        }
      });
      const json = await response.json();
      if (json.success && json.chats) {
        setChats(json.chats);
        
        // Update selected chat references if active
        if (json.chats.length > 0) {
          if (!selectedChat) {
            setSelectedChat(json.chats[0]);
          } else {
            const updated = json.chats.find((c: any) => c.phone === selectedChat.phone);
            if (updated) setSelectedChat(updated);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp chats:', err);
    }
  };

  const fetchMessagesForSelectedChat = async (phone: string) => {
    try {
      const response = await fetch(`/api/whatsapp/chats/${encodeURIComponent(phone)}/messages`, {
        headers: {
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        }
      });
      const json = await response.json();
      if (json.success && json.messages) {
        setSelectedChat(prev => {
          if (prev && prev.phone === phone) {
            return { ...prev, messages: json.messages };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchLogsFromApi = async () => {
    try {
      const response = await fetch('/api/whatsapp/logs', {
        headers: {
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        }
      });
      const json = await response.json();
      if (json.success && json.logs) {
        const formattedLogs = json.logs.map((log: any) => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          if (log.type === 'incoming') {
            return `[${time}] INBOUND MSG from ${log.phone}: "${log.payload?.text?.body || ''}"`;
          } else if (log.type === 'outgoing') {
            return `[${time}] OUTBOUND DISPATCH to ${log.phone}: "${log.payload?.text?.body || (log.payload?.template ? `Template: ${log.payload.template.name}` : '')}"`;
          } else if (log.type === 'simulated_incoming') {
            return `[${time}] SIMULATED INBOUND from ${log.phone}: "${log.payload?.text?.body || ''}"`;
          } else if (log.type === 'simulated_outgoing') {
            return `[${time}] SIMULATED OUTBOUND to ${log.phone}: "${log.payload?.text || ''}"`;
          } else if (log.type === 'status_update') {
            return `[${time}] STATUS UPDATE: "${log.payload?.status}" for msg ${log.payload?.id}`;
          } else if (log.type === 'error') {
            return `[${time}] ERROR for ${log.phone || 'system'}: ${log.error || ''}`;
          }
          return `[${time}] ${log.type.toUpperCase()}: ${JSON.stringify(log.payload)}`;
        });
        setRecentWebhookLogs(formattedLogs);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp logs:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      const response = await fetch('/api/whatsapp/logs/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        }
      });
      const json = await response.json();
      if (json.success) {
        success(isRtl ? 'تم مسح سجلات المراقبة بنجاح!' : 'Triage log history cleared successfully!');
        setRecentWebhookLogs([]);
      } else {
        error(json.error || 'Failed to clear logs.');
      }
    } catch (err: any) {
      error(err.message || 'Connection failed.');
    }
  };

  const handleSyncTemplates = async () => {
    try {
      const response = await fetch('/api/whatsapp/sync-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        }
      });
      const json = await response.json();
      if (json.success) {
        success(isRtl 
          ? `تمت مزامنة عدد ${json.count} قالب بنجاح من ميتا!` 
          : `Synchronized ${json.count} message templates successfully from Meta WABA!`
        );
        await dbInstance.fetchFromServer();
        setTemplates(dbInstance.whatsappTemplates || []);
      } else {
        error(json.error || 'Failed to sync templates.');
      }
    } catch (err: any) {
      error(err.message || 'Connection failed.');
    }
  };

  // Background Polling for live conversations and statuses
  useEffect(() => {
    fetchChatsFromApi();
    fetchLogsFromApi();
    setTemplates(dbInstance.whatsappTemplates || []);
    
    const interval = setInterval(() => {
      fetchChatsFromApi();
      fetchLogsFromApi();
      if (selectedChat) {
        fetchMessagesForSelectedChat(selectedChat.phone);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedChat?.phone, tick]);

  const saveWhatsappSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    
    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        },
        body: JSON.stringify({
          isAiEnabled,
          aiPrompt
        })
      });
      const json = await response.json();
      if (json.success) {
        dbInstance.whatsappSettings = {
          ...dbInstance.whatsappSettings,
          isAiEnabled,
          aiPrompt
        };
        dbInstance.saveToLocalOnly();
        success(isRtl ? 'تم حفظ إعدادات الـ AI والوكيل بنجاح!' : 'WhatsApp AI agent configuration updated and saved!');
      } else {
        error(json.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      error(err.message || 'Connection failed.');
    } finally {
      setSaveLoading(false);
    }
  };

  const submitWebhookTestNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = webhookTestText.trim();
    if (!userText) return;
    if (!webhookTestPhone) {
      warning(isRtl ? 'يرجى اختيار هاتف العميل أولاً!' : 'Please select a customer phone first.');
      return;
    }
    
    setIsWebhookNoticePending(true);
    try {
      const response = await fetch('/api/whatsapp/simulate-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        },
        body: JSON.stringify({
          phone: webhookTestPhone,
          text: userText,
          name: webhookTestName || undefined
        })
      });
      const json = await response.json();
      if (json.success) {
        success(isRtl ? 'تم إرسال رسالة المحاكاة بنجاح!' : 'Simulated webhook processed successfully!');
        setWebhookTestText('');
        await fetchChatsFromApi();
        await fetchMessagesForSelectedChat(webhookTestPhone);
        await fetchLogsFromApi();
      } else {
        error(json.error || 'Webhook simulation failed.');
      }
    } catch (err: any) {
      error(err.message || 'Connection failed.');
    } finally {
      setIsWebhookNoticePending(false);
    }
  };

  const executeManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !manualReplyText.trim()) return;

    const textToDeliver = manualReplyText.trim();
    setManualReplyText('');

    setRecentWebhookLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Send message to [${selectedChat.phone}]...`,
      ...prev
    ]);

    try {
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        },
        body: JSON.stringify({
          phone: selectedChat.phone,
          text: textToDeliver
        })
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        error(json.error || 'Failed to dispatch message.');
        setRecentWebhookLogs(prev => [
          `[${new Date().toLocaleTimeString()}] ERROR: ${json.error || 'Meta API rejection'}`,
          ...prev
        ]);
      } else {
        success(isRtl ? 'تم إرسال الرسالة بنجاح!' : 'Message sent successfully!');
        setRecentWebhookLogs(prev => [
          `[${new Date().toLocaleTimeString()}] SUCCESS: Delivered with MessageID ${json.metaResponse?.messages?.[0]?.id || 'unavailable'}`,
          ...prev
        ]);
        
        await fetchChatsFromApi();
        await fetchMessagesForSelectedChat(selectedChat.phone);
      }
    } catch (err: any) {
      error(err.message || 'Connection failed.');
    }
  };

  const triggerApprovedTemplate = async (templateName: string, recipientChat: ChatSession) => {
    let variables: string[] = [];
    const clientName = recipientChat.name.split(' ')[0];

    if (templateName === "invoice_payment_reminder") {
      const matchedClient = dbInstance.clients.find((c: any) => c.phone === recipientChat.phone);
      const dbInvoices = dbInstance.invoices.filter((i: any) => i.clientId === matchedClient?.id);
      const unpaidRef = dbInvoices[0]?.invoiceNumber || "";
      const grandTotal = dbInvoices[0]?.grandTotal || "";
      const currency = dbInvoices[0]?.currency || "";
      variables = [clientName, unpaidRef, `${grandTotal} ${currency}`];
    } else if (templateName === "quotation_ready") {
      const matchedClient = dbInstance.clients.find((c: any) => c.phone === recipientChat.phone);
      const quote = dbInstance.quotations.find((q: any) => q.clientId === matchedClient?.id);
      variables = [clientName, quote?.quoteNumber || "", quote ? `${quote.grandTotal} ${quote.currency}` : ""];
    } else {
      variables = [clientName];
    }

    confirm(
      isRtl 
        ? `هل تريد إرسال القالب الرسمي المعتمد (${templateName}) لهذا الرقم؟` 
        : `Are you sure you want to broadcast the official corporate Meta Template [${templateName}] to +${recipientChat.phone.replace('+', '')}?`,
      async () => {
        setRecentWebhookLogs(prev => [
          `[${new Date().toLocaleTimeString()}] INITIATE METATEMPLATED BROADCAST [${templateName}] to [${recipientChat.phone}]`,
          ...prev
        ]);

        try {
          const res = await fetch('/api/whatsapp/send-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${dbInstance.getAuthToken()}`
            },
            body: JSON.stringify({
              phone: recipientChat.phone,
              templateName,
              variables
            })
          });

          const resJson = await res.json();
          if (!res.ok || !resJson.success) {
            error(resJson.error || 'Failed to send template.');
            setRecentWebhookLogs(prev => [
              `[${new Date().toLocaleTimeString()}] TEMPLATE ERROR: ${resJson.error || 'Meta API rejection'}`,
              ...prev
            ]);
          } else {
            success(isRtl ? 'تم إرسال القالب بنجاح!' : 'Meta Template sent successfully!');
            setRecentWebhookLogs(prev => [
              `[${new Date().toLocaleTimeString()}] TEMPLATE SENT SUCCESS: MessageID: ${resJson.metaResponse?.messages?.[0]?.id || "unavailable"}`,
              ...prev
            ]);
          }

          await fetchChatsFromApi();
          if (selectedChat) {
            await fetchMessagesForSelectedChat(selectedChat.phone);
          }
        } catch (err: any) {
          error(err.message || 'Connection failed.');
        }
      },
      undefined,
      { isRtl }
    );
  };

  const copyVerifyToken = () => {
    navigator.clipboard.writeText(verifyToken);
    success(isRtl ? 'تم نسخ رمز التحقق!' : 'Verification token copied to clipboard!');
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    success(isRtl ? 'تم نسخ رابط الويب-هوك!' : 'Webhook URL copied to clipboard!');
  };

  // Helper stats
  const totalIncoming = chats.reduce((acc, c) => acc + c.messages.filter(m => m.direction === 'incoming').length, 0);
  const totalOutgoing = chats.reduce((acc, c) => acc + c.messages.filter(m => m.direction === 'outgoing').length, 0);

  return (
    <div className="space-y-6">
      
      {/* 1. TOP STATS AND SUMMARY ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'حالة الويب هوك' : 'Webhook Status'}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-sm font-bold text-slate-800 font-mono">LIVE & ACTIVE</p>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">/api/whatsapp/webhook</p>
          </div>
          <div className="p-2.5 bg-green-50 rounded-lg text-green-600">
            <Shield size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'الوكيل الذكي AI' : 'AI Communications Agent'}</span>
            <p className="text-base font-bold text-slate-800 mt-1">{isAiEnabled ? (isRtl ? 'مُفعّل (نشط)' : 'ENABLED (Active)') : (isRtl ? 'مغلق' : 'DISABLED')}</p>
            <p className="text-[9px] text-indigo-500 font-semibold mt-0.5 font-mono">Model: gemini-3.5-flash</p>
          </div>
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
            <Bot size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'محادثات العملاء' : 'Active Client Chats'}</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{chats.length}</p>
            <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Incoming: {totalIncoming} | Outgoing: {totalOutgoing}</p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600">
            <MessageSquare size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'القوالب المعتمدة Meta' : 'Approved WABA Templates'}</span>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{templates.filter(t => t.status === 'approved').length} Approved</p>
            <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Approved by Meta Sandbox</p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* 2. SUB NAVIGATION BAR */}
      <div className="flex border-b border-slate-150">
        <button 
          onClick={() => setActiveSubTab('console')} 
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'console' 
              ? 'border-brand-gold text-brand-navy font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Smartphone size={14} />
          <span>{isRtl ? 'لوحة المحادثات والمحاكي' : 'CRM Chat Hub'}</span>
        </button>

        <button 
          onClick={() => setActiveSubTab('templates')} 
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'templates' 
              ? 'border-brand-gold text-brand-navy font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText size={14} />
          <span>{isRtl ? 'مدير قوالب الرسائل' : 'Template & Broadcast Manager'}</span>
        </button>

        {userRole !== 'sales' && (
          <button 
            onClick={() => setActiveSubTab('settings')} 
            className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'settings' 
                ? 'border-brand-gold text-brand-navy font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings size={14} />
            <span>{isRtl ? 'رابط ميتا وإعدادات الـ AI' : 'Meta API Setup & AI Prompt'}</span>
          </button>
        )}
      </div>

      {/* 3. WORKING CANVAS GRID */}
      {activeSubTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* CHAT THREADS ROSTER (4 cols) */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col h-[520px] overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">{isRtl ? 'المحادثات النشطة' : 'WhatsApp Contacts'}</span>
              <button 
                onClick={() => setTick(t => t + 1)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                title="Refresh logs"
              >
                <RefreshCw size={11} className="animate-hover" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 font-sans">
              {chats.length === 0 ? (
                <div className="text-center py-10 text-slate-450 text-xs italic">
                  No chat instances configured.
                </div>
              ) : chats.map(c => {
                const isActive = selectedChat?.phone === c.phone;
                const lastMsg = c.messages[c.messages.length - 1];
                return (
                  <div 
                    key={c.phone} 
                    onClick={() => setSelectedChat(c)}
                    className={`p-3.5 cursor-pointer transition-colors text-left ${
                      isActive ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-700 text-xs truncate max-w-[130px]">{c.name}</h4>
                      <span className="text-[8px] font-mono text-slate-400">
                        {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{c.phone}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-1.5 flex items-center gap-1 font-sans">
                      {lastMsg?.direction === 'outgoing' ? <CheckCheck size={11} className="text-indigo-500 block shrink-0" /> : null}
                      {lastMsg?.isAi ? (
                        <span className="text-[8px] uppercase font-bold text-indigo-500 bg-indigo-50 border border-indigo-100/50 px-1 rounded block shrink-0 font-mono">AI</span>
                      ) : null}
                      <span className="truncate">{lastMsg?.text || 'Empty conversation log'}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE CHAT HISTORY CONSOLE (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col h-[520px] overflow-hidden">
            {selectedChat ? (
              <>
                <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800 text-xs">{selectedChat.name}</h3>
                    <p className="text-[9px] text-slate-450 font-mono">{selectedChat.phone}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] uppercase font-bold text-slate-500 bg-slate-100 rounded border border-slate-200 font-mono">
                    Live Channel
                  </span>
                </div>

                {/* MESSAGES FLOWSTREAM */}
                <div className="flex-1 p-4 overflow-y-auto bg-slate-50/30 space-y-3.5">
                  {selectedChat.messages.map((m) => {
                    const isIncoming = m.direction === 'incoming';
                    return (
                      <div 
                        key={m.id} 
                        className={`flex flex-col ${isIncoming ? 'items-start' : 'items-end'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs text-left leading-relaxed ${
                          isIncoming 
                            ? 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm' 
                            : 'bg-indigo-600 text-white rounded-tr-none shadow shadow-indigo-150'
                        }`}>
                          <p className="whitespace-pre-line font-medium font-sans">{m.text}</p>
                          
                          <div className={`flex items-center gap-1 mt-1.5 justify-end text-[8px] font-mono ${
                            isIncoming ? 'text-slate-400' : 'text-indigo-200'
                          }`}>
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {m.isAi && (
                              <span className="bg-white/10 px-1 py-0.2 rounded font-bold text-[7px] uppercase tracking-wider">AI ASSISTANT</span>
                            )}
                            {!isIncoming && (
                              <span className="flex items-center gap-0.5" title={m.status === 'failed' ? (m.error || 'Meta dispatch error') : m.status === 'read' ? 'Read' : m.status === 'delivered' ? 'Delivered' : 'Sent'}>
                                {m.status === 'failed' ? (
                                  <span className="text-red-400 font-bold">⚠️ FAILED</span>
                                ) : m.status === 'read' ? (
                                  <CheckCheck size={10} className="text-sky-300" />
                                ) : m.status === 'delivered' ? (
                                  <CheckCheck size={10} className="text-indigo-200" />
                                ) : (
                                  <CheckCheck size={10} className="text-indigo-200/50" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* REPLY INPUT AREA */}
                <form onSubmit={executeManualDispatch} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    value={manualReplyText}
                    onChange={e => setManualReplyText(e.target.value)}
                    placeholder={isRtl ? "اكتب رداً يدوياً رسمياً..." : "Type manual support response..."}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold font-semibold text-slate-700 bg-white"
                  />
                  <button 
                    type="submit"
                    className="px-3 py-1.5 bg-brand-navy hover:bg-brand-navy-dark text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-md text-xs font-bold shrink-0"
                  >
                    <Send size={12} className="mr-1" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 italic">
                <MessageSquare size={36} className="text-slate-200 mb-2 stroke-[1.5]" />
                <p className="text-xs">No active WhatsApp subscriber session opened.</p>
              </div>
            )}
          </div>

          {/* INTERACTIVE CLIENT INTAKE SIMULATOR (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* INCOMING SIMULATION COMPONENT */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-3.5 bg-indigo-900 border-b border-indigo-950 text-white flex items-center gap-2">
                <Smartphone size={13} className="text-brand-gold" />
                <h3 className="text-xs font-bold uppercase tracking-wider">{isRtl ? 'محاكي العميل الذكي' : 'Webhook Test Guidance'}</h3>
              </div>
              
              <div className="p-4 space-y-4 text-left">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {isRtl 
                    ? 'أرسل رسالة محاكاة كعميل لتختبر ردود الوكيل الاصطناعي الذكي، وإنشائه الفوري لطلبات عروض الأسعار ومسودات الفواتير مباشرة في نظام الـ CRM.' 
                    : 'Simulate key incoming WhatsApp messages from custom clients. Watch how our Gemini Agent reads the database context and automatically drafts quotes or reminders in the ERP ledger!'}
                </p>

                <form onSubmit={submitWebhookTestNotice} className="space-y-3 font-sans">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block pb-1">{isRtl ? 'رقم هاتف العميل' : 'Sender Phone'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        value={webhookTestPhone}
                        onChange={e => {
                          setWebhookTestPhone(e.target.value);
                          const chat = chats.find(c => c.phone === e.target.value);
                          setWebhookTestName(chat?.name || '');
                        }}
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                      >
                        <option value=""></option>
                        {chats.map(chat => (
                          <option key={chat.phone} value={chat.phone}>{chat.name || chat.phone}</option>
                        ))}
                      </select>
                      
                      <input 
                        type="text" 
                        value={webhookTestName} 
                        readOnly 
                        className="w-full border border-slate-100 bg-slate-50 rounded-lg p-1.5 text-xs text-slate-450 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block pb-1">{isRtl ? 'نص الرسالة الواردة' : 'Incoming Message Prompt'}</label>
                    <textarea 
                      rows={2}
                      value={webhookTestText}
                      onChange={e => setWebhookTestText(e.target.value)}
                      placeholder={isRtl ? "مثال: أريد عرض سعر لترجمة مستند 500 كلمة للإنجليزية" : "e.g. Can I get a quote to translate a 400-word corporate card to English?"}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold font-semibold text-slate-700 bg-white"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isWebhookNoticePending}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer font-bold text-xs shadow-md flex items-center justify-center gap-1"
                  >
                    {isWebhookNoticePending ? (
                      <>
                        <RefreshCw size={12} className="animate-spin text-white" />
                        <span>AI Generating Smart Turn...</span>
                      </>
                    ) : (
                      <>
                        <Bot size={13} className="text-brand-gold" />
                        <span>{isRtl ? 'إرسال رسالة محاكاة' : 'Simulate Webhook Message'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* LIVE WEBHOOK EVENT LOGS */}
            <div className="bg-slate-900 border border-slate-950 rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col min-h-[160px]">
              <div className="p-3.5 bg-slate-950 text-slate-300 flex items-center justify-between border-b border-slate-900 shrink-0">
                <span className="text-[10px] font-mono font-bold text-brand-gold tracking-widest uppercase flex items-center gap-1.5">
                  <Terminal size={12} />
                  <span>Webhook Event Server Triage</span>
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleClearLogs}
                    className="px-2 py-0.5 text-[8px] font-mono uppercase bg-red-950 text-red-400 border border-red-900/50 hover:bg-red-900/20 rounded cursor-pointer transition-colors"
                  >
                    Clear Logs
                  </button>
                  <span className="px-1.5 py-0.1 text-[8px] font-mono uppercase bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                    PORT: 3000
                  </span>
                </div>
              </div>
              
              <div className="p-3 font-mono text-[9px] text-zinc-300 overflow-y-auto space-y-1.5 text-left flex-1 max-h-[160px] select-all">
                {recentWebhookLogs.length === 0 ? (
                  <p className="text-zinc-500 italic">No triage events logged on server.</p>
                ) : recentWebhookLogs.map((log, index) => (
                  <p key={index} className="leading-relaxed truncate border-l border-zinc-700/50 pl-2">
                    {log}
                  </p>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {activeSubTab === 'templates' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden text-left">
          <div className="p-4 border-b border-slate-150 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{isRtl ? 'مدير قوالب بث واتساب وميتا المعتمدة' : 'Meta Approved WABA Templates Console'}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRtl 
                  ? 'بث رسائل المبادرة من الشركة يتطلب موافقة ميتا المسبقة على القوالب لضمان الامتثال مع معايير واتساب الرسمية.' 
                  : 'WhatsApp requires pre-authorized message templates for business-initiated broadcasts. Use these approved presets to trigger automated follow-ups.'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSyncTemplates}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw size={13} />
                <span>{isRtl ? 'مزامنة القوالب من ميتا' : 'Sync Templates from Meta'}</span>
              </button>
              <button 
                onClick={() => {
                  info(isRtl 
                    ? 'إنشاء قوالب مخصصة يتطلب ربط Meta Business API حقيقي معتمد. القوالب الافتراضية نشطة بالكامل للمحاكاة.' 
                    : 'Custom templates must be created and approved in Meta Business Manager before use.'
                  );
                }}
                className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold-hover text-brand-navy font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Info size={13} />
                <span>Submit Meta Template Request</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {templates.map((tpl: any) => (
                <div key={tpl.id} className="border border-slate-200 rounded-xl bg-slate-50/40 p-4 relative flex flex-col justify-between h-56">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-bold rounded-md border border-indigo-100 uppercase tracking-widest font-mono">
                        {tpl.category}
                      </span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[8px] font-bold rounded-md border border-green-150 font-mono flex items-center gap-0.5">
                        <CheckCircle2 size={9} />
                        <span>META APPROVED</span>
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-700 text-xs mt-3.5 font-mono">
                      {tpl.name} ({tpl.language})
                    </h4>

                    {/* Template content design */}
                    <div className="bg-white border text-left border-slate-150 rounded-lg p-2.5 mt-2.5 text-[10.5px] italic text-slate-500 font-sans leading-relaxed min-h-[80px]">
                      {tpl.body}
                    </div>
                  </div>

                  {/* Trigger broadcast actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-[8px] font-mono text-slate-400">
                      Vars: {tpl.variables?.map((v: string) => `{{${v}}}`).join(', ') || 'none'}
                    </span>
                    
                    <button 
                      onClick={() => {
                        if (!selectedChat) {
                          warning(isRtl ? 'يرجى اختيار العميل من لوحة المراقبة أولاً!' : 'Please select a contact from the CRM Chat Hub first.');
                          setActiveSubTab('console');
                          return;
                        }
                        triggerApprovedTemplate(tpl.name, selectedChat);
                      }}
                      className="px-2.5 py-1 bg-brand-navy hover:bg-indigo-700 text-white font-bold rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Send size={9} />
                      <span>{isRtl ? 'إرسال الآن' : 'Trigger Broadcast'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden text-left max-w-3xl mx-auto animate-fade-in">
          <div className="p-4 bg-slate-50 border-b border-slate-150">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">{isRtl ? 'إعدادات ربط Meta APIs والوكيل الاصطناعي' : 'Meta Business Cloud API & AI System Settings'}</h3>
            <p className="text-[10px] text-slate-450 mt-0.5">
              {isRtl 
                ? 'قم بتهيئة رمز التحقق وبيانات الاعتماد الرسمية من مطوري ميتا لدمج النظام مع رقم واتساب الحقيقي.' 
                : 'Configure credentials provided from the Meta Developer Dashboard to synchronize this CRM to your real corporate WhatsApp Business profile.'}
            </p>
          </div>

          <form onSubmit={saveWhatsappSettings} className="p-6 space-y-5 font-sans">
            
            {/* Meta Official Credentials block */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                <Shield size={13} />
                <span>Meta Business Credentials Configuration</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block pb-1">{isRtl ? 'معرّف هاتف ميتا (Phone ID)' : 'Meta Phone Number ID'}</label>
                  <input 
                    type="text"
                    readOnly
                    value={phoneNumberId || 'Not configured in env'}
                    className="w-full border border-slate-100 bg-slate-50 rounded-lg p-2 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[8.5px] text-slate-400 mt-1">Configured securely via server environment: WHATSAPP_PHONE_NUMBER_ID</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block pb-1">{isRtl ? 'معرّف حساب الأعمال (WABA ID)' : 'WhatsApp Business Account ID'}</label>
                  <input 
                    type="text"
                    readOnly
                    value={wabaId || 'Not configured in env'}
                    className="w-full border border-slate-100 bg-slate-50 rounded-lg p-2 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[8.5px] text-slate-400 mt-1">Configured securely via server environment: WHATSAPP_BUSINESS_ACCOUNT_ID</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block pb-1">{isRtl ? 'رمز النظام المبرمج الدائم (Permanent Access Token)' : 'Permanent System Token'}</label>
                <input 
                  type="text"
                  readOnly
                  value={accessToken || 'Not configured in env'}
                  className="w-full border border-slate-100 bg-slate-50 rounded-lg p-2 text-xs font-mono text-slate-500 cursor-not-allowed"
                />
                <p className="text-[8.5px] text-slate-400 mt-1">Configured securely via server environment: WHATSAPP_ACCESS_TOKEN</p>
              </div>
            </div>

            {/* Webhook Configuration fields */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                <Terminal size={13} />
                <span>Standard Webhook Protocols Setup</span>
              </h4>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-left space-y-2 mb-3">
                <p className="text-[10px] leading-relaxed text-slate-600 font-sans">
                  Configure this endpoint URL inside your WhatsApp product callbacks on the <strong>Meta Developers Dashboard</strong>. Use webhooks to capture notifications in real-time under Meta regulations.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-450 uppercase block">Webhook Callback URL</span>
                    <div className="flex gap-1.5 mt-0.5">
                      <input 
                        type="text" 
                        readOnly 
                        value={webhookUrl}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[9.5px] font-mono select-all text-slate-600 outline-none cursor-not-allowed"
                      />
                      <button 
                        type="button" 
                        onClick={copyWebhookUrl} 
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-semibold text-slate-450 uppercase block">Webhook Verification Token</span>
                    <div className="flex gap-1.5 mt-0.5">
                      <input 
                        type="text" 
                        readOnly
                        value={verifyToken || 'Not configured in env'}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[9.5px] font-mono text-slate-500 outline-none cursor-not-allowed"
                      />
                      <button 
                        type="button" 
                        onClick={copyVerifyToken} 
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Assistant parameters */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                <Bot size={13} />
                <span>AI Intelligent Agent System Prompt</span>
              </h4>

              <div className="flex items-center justify-between pb-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{isRtl ? 'تفعيل وكيل الرد التلقائي الذكي' : 'Automated WhatsApp AI Agent'}</span>
                  <p className="text-[8.5px] text-slate-400">If checked, our Gemini-API models react dynamically to inbound client inquiries.</p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAiEnabled} 
                    onChange={e => setIsAiEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block pb-1">{isRtl ? 'تعليمات الوكيل الذكي (Prompt Instructions)' : 'AI System Guidelines & Prompt'}</label>
                <textarea 
                  rows={4}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold font-semibold text-slate-700 bg-white leading-relaxed"
                />
                <p className="text-[8.5px] text-indigo-400 mt-1">Leverages server-side Gemini 3.5 Flash capabilities with zero exposure of API keys to the browser.</p>
              </div>
            </div>

            <button 
              type="submit"
              disabled={saveLoading}
              className="w-full py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-brand-navy font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-md mt-4 flex items-center justify-center gap-1.5 active:scale-95"
            >
              {saveLoading ? (
                <>
                  <RefreshCw size={12} className="animate-spin text-brand-navy" />
                  <span>Syncing database configuration...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Save Configuration & Bind Webhooks</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
