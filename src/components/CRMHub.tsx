/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, MoreHorizontal, 
  ChevronRight, Calendar, Mail, Phone, Building2,
  TrendingUp, BarChart3, Target, CheckCircle2, AlertCircle,
  Plus, X, Save, MessageSquare, Clock, Globe2,
  Zap, Settings2, Trash2, ShieldCheck, MailCheck, FileUp, Quote,
  FileText, FileSpreadsheet, Upload, Download
} from 'lucide-react';
import dbInstance from '../db/store';
import { 
  downloadLeadsTemplate, 
  exportLeadsToCSV, 
  parseLeadsCSV 
} from '../utils/excelCSV';
import { useToast } from './Toast';
import { 
  Lead, LeadStage, LeadSource, Profile, 
  ServiceType, LeadActivity
} from '../types';
import { ExportProtectionModal } from './ExportProtectionModal';

interface CRMHubProps {
  isRtl: boolean;
  currentUser: Profile;
}

// Helper to accumulate actual billing and quotes made by this client
export const getClientAmounts = (lead: Lead) => {
  const clientId = lead.convertedToClientId;
  if (!clientId) return { quotesTotal: 0, invoicesTotal: 0, currency: lead.currency || 'USD' };
  
  const clientQuotes = dbInstance.quotations.filter(q => q.clientId === clientId);
  const quotesTotal = clientQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  
  const clientInvoices = dbInstance.invoices.filter(i => i.clientId === clientId);
  const invoicesTotal = clientInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  
  const currency = clientInvoices[0]?.currency || clientQuotes[0]?.currency || lead.currency || 'USD';
  return { quotesTotal, invoicesTotal, currency };
};

const STAGES: { id: LeadStage; labelAr: string; labelEn: string; color: string }[] = [
  { id: 'new', labelAr: 'مؤد جديد', labelEn: 'New Lead', color: 'bg-zinc-100 text-zinc-600' },
  { id: 'contacted', labelAr: 'تم التواصل', labelEn: 'Contacted', color: 'bg-blue-50 text-blue-600' },
  { id: 'qualified', labelAr: 'مؤهل', labelEn: 'Qualified', color: 'bg-indigo-50 text-indigo-600' },
  { id: 'quotation_sent', labelAr: 'أرسل السعر', labelEn: 'Quotation Sent', color: 'bg-amber-50 text-amber-600' },
  { id: 'negotiation', labelAr: 'تفاوض', labelEn: 'Negotiation', color: 'bg-purple-50 text-purple-600' },
  { id: 'won', labelAr: 'فوز', labelEn: 'Won', color: 'bg-green-50 text-green-600' },
  { id: 'lost', labelAr: 'خسر', labelEn: 'Lost', color: 'bg-red-50 text-red-600' },
];

export default function CRMHub({ isRtl, currentUser }: CRMHubProps) {
  const { success, error, confirm } = useToast();
  const [view, setView] = useState<'funnel' | 'list' | 'automation'>('funnel');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Security Export protection states
  const [isExportShieldOpen, setIsExportShieldOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Lead, 'id' | 'createdAt' | 'createdBy'>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    source: 'website',
    stage: 'new',
    priority: 'medium',
    estimatedValue: 0,
    currency: 'USD',
    serviceInterests: ['translation'],
    notes: '',
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newActivity, setNewActivity] = useState({ type: 'note' as any, description: '' });
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    const sub = dbInstance.subscribe(() => {
      setTick(t => t + 1);
    });
    return sub;
  }, []);

  const leads = useMemo(() => dbInstance.leads, [tick]);

  const leadActivities = useMemo(() => {
    if (!selectedLead) return [];
    return dbInstance.leadActivities.filter(a => a.leadId === selectedLead.id);
  }, [selectedLead, tick]);

  const handleUpdateStage = (leadId: string, stage: LeadStage) => {
    dbInstance.updateLeadStage(leadId, stage);
  };

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const onDrop = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId') || draggedLeadId;
    if (leadId) {
      handleUpdateStage(leadId, stage);
    }
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLead && newActivity.description) {
      dbInstance.addLeadActivity(selectedLead.id, newActivity.type, newActivity.description);
      setNewActivity({ type: 'note', description: '' });
    }
  };

  const handleConvertToClient = () => {
    if (selectedLead) {
      confirm(
        isRtl ? 'هل تريد بالتأكيد تحويل هذا العميل المحتمل إلى عميل فعلي؟' : 'Are you sure you want to convert this lead to a permanent client?',
        () => {
          dbInstance.convertLeadToClient(selectedLead.id);
          setSelectedLead(null);
        },
        undefined,
        { isRtl }
      );
    }
  };

  const triggerImportFileSelector = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string;
          const parsed = parseLeadsCSV(csvText);
          if (parsed.length === 0) {
            error(isRtl ? 'لم يتم العثور على أي بيانات صالحة للاستيراد في ملف CSV.' : 'No valid leads records found in the uploaded CSV template.');
            return;
          }
          parsed.forEach(parsedLead => {
            dbInstance.addLead(parsedLead);
          });
          // Dispatch a save/emit update
          dbInstance.save();
          // Force tick update
          setTick(t => t + 1);
          success(isRtl 
            ? `تم استيراد عدد ${parsed.length} عميل محتمل بنجاح إلى داخل إدارة علاقات العملاء!` 
            : `Successfully imported ${parsed.length} new CRM leads from CSV file!`);
        } catch (err: any) {
          error(isRtl 
            ? 'حدث خطأ أثناء معالجة ملف CSV. تحقق من تشكيل الأعمدة.' 
            : `Failed parsing Leads CSV file. Details: ${err.message || err}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => l.stage === 'won').length;
    const value = leads.reduce((sum, l) => sum + (l.stage !== 'lost' ? l.estimatedValue : 0), 0);
    return {
      total,
      won,
      conversionRate: total > 0 ? (won / total * 100).toFixed(1) : '0',
      pipelineValue: value.toLocaleString()
    };
  }, [leads]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dbInstance.addLead(formData);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      source: 'website',
      stage: 'new',
      priority: 'medium',
      estimatedValue: 0,
      currency: 'USD',
      serviceInterests: ['translation'],
      notes: '',
    });
  };

  return (
    <div className={`flex flex-col gap-6 ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}>
      {/* CRM Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-brand-navy">
          <Target size={80} />
        </div>
        
        <div className="space-y-1 relative">
          <h2 className="text-2xl font-black text-brand-navy tracking-tight">
            {isRtl ? 'إدارة علاقات العملاء' : 'CRM & Pipeline Hub'}
          </h2>
          <p className="text-sm text-brand-text-muted font-medium">
            {isRtl ? 'إدارة العملاء المحتملين وقمع المبيعات الخاص بالترجمة' : 'Tailored sales pipeline for the translation industry.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-brand-navy-light/10 p-1 rounded-xl relative">
          <button
            onClick={() => setView('funnel')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              view === 'funnel' ? 'bg-brand-navy text-white shadow-md' : 'text-brand-navy/60 hover:text-brand-navy'
            }`}
          >
            <BarChart3 size={14} /> {isRtl ? 'مسار المبيعات' : 'Sales Funnel'}
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              view === 'list' ? 'bg-brand-navy text-white shadow-md' : 'text-brand-navy/60 hover:text-brand-navy'
            }`}
          >
            <Users size={14} /> {isRtl ? 'قائمة العملاء' : 'Lead List'}
          </button>
          <button
            onClick={() => setView('automation')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              view === 'automation' ? 'bg-brand-navy text-white shadow-md' : 'text-brand-navy/60 hover:text-brand-navy'
            }`}
          >
            <Zap size={14} /> {isRtl ? 'الأتمتة' : 'Automation'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<TrendingUp size={18} className="text-blue-500"/>}
          label={isRtl ? 'إجمالي المحتملين' : 'Total Leads'}
          value={stats.total}
          trend="+8%"
        />
        <StatCard 
          icon={<CheckCircle2 size={18} className="text-green-500"/>}
          label={isRtl ? 'نسبة التحويل' : 'Conversion Rate'}
          value={`${stats.conversionRate}%`}
          trend="+2.4%"
        />
        <StatCard 
          icon={<Target size={18} className="text-amber-500"/>}
          label={isRtl ? 'قيمة المسار' : 'Pipeline Value'}
          value={`$${stats.pipelineValue}`}
          trend="USD"
        />
         <StatCard 
          icon={<Clock size={18} className="text-indigo-500"/>}
          label={isRtl ? 'تنبيهات المتابعة' : 'Upcoming Follow-ups'}
          value={3}
          trend={isRtl ? 'نشط' : 'Active'}
        />
      </div>

      {/* Main Area */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Controls */}
        <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
             <input 
               type="text"
               placeholder={isRtl ? 'بحث بواسطة الاسم أو الشركة...' : 'Search by name or company...'}
               className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           
           <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
             <button 
               onClick={() => downloadLeadsTemplate(isRtl)}
               className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
               title={isRtl ? 'تحميل نموذج الخلايا المدخلة للإكسل' : 'Download standard Excel / CSV templates'}
             >
               <FileSpreadsheet size={13} className="text-emerald-600" />
               <span>{isRtl ? 'تحميل النموذج' : 'Template'}</span>
             </button>

             <button 
               onClick={triggerImportFileSelector}
               className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-805 border border-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
               title={isRtl ? 'استيراد عملاء من ملف إكسل CSV' : 'Bulk import CRM leads log'}
             >
               <Upload size={13} />
               <span>{isRtl ? 'استيراد إكسل' : 'Import'}</span>
             </button>

             <button 
               onClick={() => setIsExportShieldOpen(true)}
               className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
               title={isRtl ? 'تصدير هذه القائمة للإكسل' : 'Download master copy of active leads'}
             >
               <Download size={13} />
               <span>{isRtl ? 'تصدير' : 'Export'}</span>
             </button>

             <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-105 transition-all text-zinc-600">
                <Filter size={14} /> {isRtl ? 'تصفية' : 'Filters'}
             </button>
             <button 
               onClick={() => setIsModalOpen(true)}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-brand-gold text-brand-navy rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 active:scale-95 transition-all"
             >
               <UserPlus size={14} /> {isRtl ? 'إضافة عميل محتمل' : 'Capture New Lead'}
             </button>
           </div>
        </div>

        {view === 'funnel' ? (
          /* Kanban Board */
          <div className="flex-1 overflow-x-auto p-6 flex gap-6 bg-zinc-50/50">
            {STAGES.map((stage) => (
              <div 
                key={stage.id} 
                className={`min-w-[280px] w-72 flex flex-col gap-4 rounded-3xl p-2 transition-all ${
                  dragOverStage === stage.id ? 'bg-zinc-200/50 ring-2 ring-zinc-300 ring-dashed' : ''
                }`}
                onDragOver={(e) => onDragOver(e, stage.id)}
                onDrop={(e) => onDrop(e, stage.id)}
                onDragLeave={() => setDragOverStage(null)}
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.color.split(' ')[0].replace('bg-', 'bg-').replace('text-', 'bg-')}`}></span>
                    <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                      {isRtl ? stage.labelAr : stage.labelEn}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 bg-white px-2 py-0.5 rounded-full border border-zinc-100">
                    {filteredLeads.filter(l => l.stage === stage.id).length}
                  </span>
                </div>
                
                <div className="flex flex-col gap-3 min-h-[400px]">
                  {filteredLeads.filter(l => l.stage === stage.id).map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      draggable
                      onDragStart={(e) => onDragStart(e, lead.id)}
                      className={draggedLeadId === lead.id ? 'opacity-40 animate-pulse' : ''}
                    >
                      <LeadCard lead={lead} isRtl={isRtl} />
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                        setFormData({...formData, stage: stage.id});
                        setIsModalOpen(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : view === 'list' ? (
          /* List View */
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                   <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] text-zinc-400 uppercase font-black tracking-widest">
                     <th className="px-8 py-5">{isRtl ? 'الاسم والشركة' : 'Lead & Company'}</th>
                     <th className="px-8 py-5">{isRtl ? 'المرحلة' : 'Funnel Stage'}</th>
                     <th className="px-8 py-5">{isRtl ? 'القيمة المتوقعة' : 'Opportunity Value'}</th>
                     <th className="px-8 py-5">{isRtl ? 'المبيعات الفعلية' : 'Actual Sales Invoiced'}</th>
                     <th className="px-8 py-5">{isRtl ? 'تاريخ التسجيل' : 'Record Date'}</th>
                     <th className="px-8 py-5"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredLeads.map(l => {
                    const { invoicesTotal, currency } = getClientAmounts(l);
                    return (
                      <tr key={l.id} className="group hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedLead(l)}>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-black text-xs">
                                 {l.name.charAt(0)}
                              </div>
                              <div>
                                 <p className="font-bold text-zinc-900">{l.name}</p>
                                 <p className="text-[10px] text-zinc-400 font-medium">{l.company || 'Private Individual'}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <StatusBadge stage={l.stage} isRtl={isRtl} />
                        </td>
                        <td className="px-8 py-5">
                           <p className="font-black text-zinc-900">{l.estimatedValue.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal">{l.currency}</span></p>
                        </td>
                        <td className="px-8 py-5 font-bold font-mono">
                           {invoicesTotal > 0 ? (
                             <p className="text-emerald-700 font-black">
                                {invoicesTotal.toLocaleString()} <span className="text-[10px] text-emerald-600 font-normal">{currency}</span>
                             </p>
                           ) : (
                             <p className="text-zinc-400 font-normal text-xs">-</p>
                           )}
                        </td>
                        <td className="px-8 py-5 text-zinc-500 font-medium font-mono">
                           {new Date(l.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                           <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-all"><MoreHorizontal size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        ) : (
          /* Automation Rules View */
          <div className="flex-1 p-8 bg-zinc-50/30">
            <AutomationSettings isRtl={isRtl} tick={tick} />
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-zinc-900 tracking-tight">{isRtl ? 'تسجيل عميل محتمل جديد' : 'Capture Potential Client'}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Globalize Sales Accelerator</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-zinc-400 hover:text-zinc-900">
                  <X size={20} />
                </button>
             </div>

             <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'اسم التواصل' : 'Contact Name'}</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'الشركة' : 'Business / Organization'}</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'البريد الإلكتروني' : 'Official Email'}</label>
                      <input 
                        type="email" 
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'رقم الهاتف' : 'Contact Mobile'}</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'المصدر' : 'Lead Source'}</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        value={formData.source}
                        onChange={(e) => setFormData({...formData, source: e.target.value as LeadSource})}
                      >
                         <option value="website">Website Inquiry</option>
                         <option value="social_media">Social Media (LinkedIn/Meta)</option>
                         <option value="referral">Professional Referral</option>
                         <option value="walk_in">Walk-in Visit</option>
                         <option value="email">Direct Email Outbound</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'القيمة المتوقعة' : 'Opportunity Size'}</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                          value={formData.estimatedValue}
                          onChange={(e) => setFormData({...formData, estimatedValue: parseFloat(e.target.value) || 0})}
                        />
                        <select 
                          className="w-24 px-2 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none"
                          value={formData.currency}
                          onChange={(e) => setFormData({...formData, currency: e.target.value as any})}
                        >
                          <option value="USD">USD</option>
                          <option value="AED">AED</option>
                          <option value="EGP">EGP</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'ملاحظات وتفاصيل' : 'Strategic Context & Notes'}</label>
                   <textarea 
                     rows={3}
                     className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                     placeholder="Client expressed deep interest in legal translation for GCC expansion..."
                     value={formData.notes}
                     onChange={(e) => setFormData({...formData, notes: e.target.value})}
                   />
                </div>

                <div className="pt-6 border-t border-zinc-100 flex items-center justify-end gap-3">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 transition-all">{isRtl ? 'إلغاء' : 'Discard'}</button>
                   <button type="submit" className="px-8 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-black shadow-xl shadow-zinc-100 active:scale-95 transition-all flex items-center gap-2">
                     <Save size={16} /> {isRtl ? 'حفظ البيانات' : 'Commit Lead'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]">
             {/* Left Panel: Info */}
             <div className="w-full md:w-1/3 bg-zinc-50/50 p-8 border-r border-zinc-100 overflow-y-auto">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-white text-2xl font-black">
                       {selectedLead.name.charAt(0)}
                    </div>
                    <h3 className="text-xl font-black text-zinc-900">{selectedLead.name}</h3>
                    <StatusBadge stage={selectedLead.stage} isRtl={isRtl} />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-100">
                    <InfoItem icon={<Building2 size={14}/>} label={isRtl ? 'الشركة' : 'Organization'} value={selectedLead.company || 'Private Individual'} />
                    <InfoItem icon={<Mail size={14}/>} label={isRtl ? 'البريد' : 'Email'} value={selectedLead.email || 'N/A'} />
                    <InfoItem icon={<Phone size={14}/>} label={isRtl ? 'الهاتف' : 'Contact'} value={selectedLead.phone || 'N/A'} />
                    <InfoItem icon={<Target size={14}/>} label={isRtl ? 'القيمة' : 'Exp. Value'} value={`${selectedLead.estimatedValue.toLocaleString()} ${selectedLead.currency}`} />
                  </div>

                  {/* Realized CRM Financials */}
                  <div className="pt-4 border-t border-zinc-100 space-y-3">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'المبيعات والتعاقدات الفعلية' : 'Realized CRM Financials'}</h4>
                    <InfoItem 
                      icon={<FileText size={14} className="text-emerald-600"/>} 
                      label={isRtl ? 'إجمالي المبيعات (الفواتير)' : 'Total Invoiced Sales'} 
                      value={`${getClientAmounts(selectedLead).invoicesTotal.toLocaleString()} ${getClientAmounts(selectedLead).currency}`} 
                    />
                    <InfoItem 
                      icon={<Quote size={14} className="text-blue-600"/>} 
                      label={isRtl ? 'إجمالي العروض المالية' : 'Total Quote Value'} 
                      value={`${getClientAmounts(selectedLead).quotesTotal.toLocaleString()} ${getClientAmounts(selectedLead).currency}`} 
                    />
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={handleConvertToClient}
                      className="w-full py-3 bg-zinc-900 text-white rounded-xl text-xs font-black shadow-lg shadow-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       <UserPlus size={14}/> {isRtl ? 'تحويل لعميل دائم' : 'Convert to Client'}
                    </button>
                  </div>
                </div>
             </div>

             {/* Right Panel: Activities */}
             <div className="flex-1 p-8 flex flex-col min-h-0 bg-white">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">{isRtl ? 'سجل النشاطات' : 'Activity & Timeline'}</h4>
                   <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all text-zinc-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                   {leadActivities.length === 0 ? (
                      <div className="py-12 text-center opacity-20">
                         <MessageSquare size={48} className="mx-auto" />
                         <p className="font-bold">{isRtl ? 'لا توجد نشاطات مسجلة' : 'No recorded interactions'}</p>
                      </div>
                   ) : (
                      leadActivities.map(act => (
                         <div key={act.id} className="flex gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-zinc-400">
                               <Clock size={14} />
                            </div>
                            <div className="space-y-1">
                               <p className="text-sm font-bold text-zinc-800">{act.description}</p>
                               <p className="text-[10px] text-zinc-400 font-medium">{new Date(act.createdAt).toLocaleString()}</p>
                            </div>
                         </div>
                      ))
                   )}
                </div>

                <form onSubmit={handleAddActivity} className="space-y-4">
                   <div className="flex gap-2">
                      <select 
                        className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                        value={newActivity.type}
                        onChange={(e) => setNewActivity({...newActivity, type: e.target.value as any})}
                      >
                         <option value="note">Note</option>
                         <option value="call">Call</option>
                         <option value="email">Email</option>
                         <option value="meeting">Meeting</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder={isRtl ? 'أدخل تفاصيل النشاط...' : 'Record activity details...'}
                        className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium outline-none"
                        value={newActivity.description}
                        onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                      />
                      <button type="submit" className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-black shadow-lg">
                        <Plus size={16} />
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-4 gap-2 pt-4 border-t border-zinc-100">
                      {STAGES.map(s => (
                         <button
                           key={s.id}
                           type="button"
                           onClick={() => handleUpdateStage(selectedLead!.id, s.id)}
                           className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${
                             selectedLead!.stage === s.id ? s.color + ' ring-2 ring-zinc-200' : 'bg-transparent text-zinc-400 hover:bg-zinc-50'
                           }`}
                         >
                            {isRtl ? s.labelAr : s.labelEn}
                         </button>
                      ))}
                   </div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => {
          resetForm();
          setIsModalOpen(true);
        }}
        className={`fixed bottom-8 ${isRtl ? 'left-8' : 'right-8'} w-14 h-14 bg-brand-gold text-brand-navy rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white`}
        title={isRtl ? 'إضافة عميل محتمل سريع' : 'Quick Add Lead'}
      >
        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Security Gate component */}
      <ExportProtectionModal
        isOpen={isExportShieldOpen}
        onClose={() => setIsExportShieldOpen(false)}
        dataType="client_lists"
        dataLabelEn="CRM Active Leads Directory"
        dataLabelAr="قائمة دليل العملاء المحتملين والراغبين بالتعاقد"
        onExportApproved={() => exportLeadsToCSV(leads, isRtl)}
        isRtl={isRtl}
      />
    </div>
  );
}

function AutomationSettings({ isRtl, tick }: { isRtl: boolean, tick: number }) {
  const rules = useMemo(() => dbInstance.automationRules, [tick]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState({
    nameEn: '',
    nameAr: '',
    trigger: 'quotation_sent' as any,
    action: 'move_stage' as any,
    targetStage: 'quotation_sent' as any,
    isActive: true
  });

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    dbInstance.addAutomationRule(newRule);
    setIsAdding(false);
    setNewRule({
      nameEn: '',
      nameAr: '',
      trigger: 'quotation_sent',
      action: 'move_stage',
      targetStage: 'quotation_sent',
      isActive: true
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-zinc-900 tracking-tight">
            {isRtl ? 'قواعد الأتمتة الذكية' : 'Smart Automation Engine'}
          </h3>
          <p className="text-xs text-zinc-500 font-medium">
            {isRtl ? 'قم بتعريف القواعد لنقل المحتملين تلقائياً بين المراحل' : 'Define logic to automatically transition leads based on system events.'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-black shadow-lg shadow-zinc-100 active:scale-95 transition-all"
        >
          <Zap size={14} /> {isRtl ? 'إنشاء قاعدة جديدة' : 'Build New Rule'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <h4 className="font-black text-zinc-900 text-sm uppercase tracking-widest">{isRtl ? 'بناء قاعدة جديدة' : 'New Automation Sequence'}</h4>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400"><X size={18} /></button>
          </div>

          <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'اسم القاعدة (EN)' : 'Rule Name (English)'}</label>
                <input 
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none border-l-4 border-l-zinc-900"
                  value={newRule.nameEn}
                  onChange={(e) => setNewRule({...newRule, nameEn: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'اسم القاعدة (AR)' : 'Rule Name (Arabic)'}</label>
                <input 
                  required
                  type="text"
                  dir="rtl"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none border-r-4 border-r-zinc-900"
                  value={newRule.nameAr}
                  onChange={(e) => setNewRule({...newRule, nameAr: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'المحفز (Trigger)' : 'System Event'}</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold font-mono outline-none"
                    value={newRule.trigger}
                    onChange={(e) => setNewRule({...newRule, trigger: e.target.value as any})}
                  >
                    <option value="quotation_sent">Quotation Sent</option>
                    <option value="quotation_approved">Quotation Approved</option>
                    <option value="quotation_rejected">Quotation Rejected</option>
                    <option value="invoice_paid">Invoice Paid Full</option>
                    <option value="document_uploaded">Document Uploaded</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'المرحلة الهدف' : 'Target Stage'}</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                    value={newRule.targetStage}
                    onChange={(e) => setNewRule({...newRule, targetStage: e.target.value as any})}
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{isRtl ? s.labelAr : s.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-8 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-zinc-500 font-bold text-xs">{isRtl ? 'إلغاء' : 'Discard'}</button>
                 <button type="submit" className="px-8 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-black shadow-xl shadow-zinc-100 flex items-center gap-2">
                   <ShieldCheck size={14} /> {isRtl ? 'تفعيل القاعدة' : 'Deploy Rule'}
                 </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rules.map((rule: any) => (
          <RuleCard key={rule.id} rule={rule} isRtl={isRtl} />
        ))}
      </div>
    </div>
  );
}

function RuleCard({ rule, isRtl }: { rule: any, isRtl: boolean }) {
  const triggerIcon = () => {
    switch(rule.trigger) {
      case 'quotation_sent': return <Quote size={18} className="text-zinc-600"/>;
      case 'invoice_paid': return <ShieldCheck size={18} className="text-green-600"/>;
      case 'document_uploaded': return <FileUp size={18} className="text-blue-600"/>;
      case 'quotation_approved': return <MailCheck size={18} className="text-zinc-900"/>;
      default: return <Zap size={18} className="text-zinc-400"/>;
    }
  };

  const targetStageLabel = STAGES.find(s => s.id === rule.targetStage);

  return (
    <div className={`bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden group transition-all hover:shadow-md ${!rule.isActive ? 'opacity-50 grayscale' : ''}`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Settings2 size={64} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className={`w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100`}>
          {triggerIcon()}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => dbInstance.toggleAutomationRule(rule.id)}
            className={`w-10 h-5 rounded-full relative transition-all ${rule.isActive ? 'bg-zinc-900' : 'bg-zinc-200'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isRtl ? (rule.isActive ? 'left-1' : 'right-1') : (rule.isActive ? 'right-1' : 'left-1')}`}></div>
          </button>
          <button 
            onClick={() => dbInstance.deleteAutomationRule(rule.id)}
            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-1 mb-6">
        <h4 className="text-sm font-black text-zinc-900 tracking-tight">{isRtl ? rule.nameAr : rule.nameEn}</h4>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{rule.trigger.replace(/_/g, ' ')}</p>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-zinc-50">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">{isRtl ? 'الإجراء' : 'ACTION'}</span>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-900">
             <ChevronRight size={10} className={isRtl ? 'rotate-180' : ''}/> {isRtl ? 'نقل إلى:' : 'Move to:'} {isRtl ? targetStageLabel?.labelAr : targetStageLabel?.labelEn}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
       <div className="mt-0.5 text-zinc-300">{icon}</div>
       <div className="space-y-0.5">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">{label}</p>
          <p className="text-xs font-bold text-zinc-900 leading-tight">{value}</p>
       </div>
    </div>
  );
}

function LeadCard({ lead, isRtl }: { lead: Lead; isRtl: boolean }) {
  const { quotesTotal, invoicesTotal, currency } = getClientAmounts(lead);

  return (
    <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing border-l-4 border-l-brand-navy">
       <div className="flex items-start justify-between mb-3">
          <div className="space-y-0.5">
             <h4 className="text-xs font-black text-brand-navy tracking-tight group-hover:text-brand-navy-hover transition-colors">{lead.name}</h4>
             <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">{lead.company || 'Individual'}</p>
          </div>
          <div className={`w-2 h-2 rounded-full ${lead.priority === 'high' ? 'bg-red-500' : lead.priority === 'medium' ? 'bg-brand-gold' : 'bg-emerald-500'}`}></div>
       </div>

       <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
             <div className="flex items-center gap-2">
                <Globe2 size={12} className="text-zinc-300" />
                <span>{lead.source}</span>
             </div>
             {invoicesTotal > 0 && (
               <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase tracking-wider">
                 {isRtl ? 'نشط' : 'Active'}
               </span>
             )}
          </div>

          <div className="pt-3 border-t border-zinc-50 space-y-1">
             <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-400 font-medium">{isRtl ? 'المتوقع:' : 'Expected value:'}</span>
                <p className="font-extrabold text-zinc-700">{lead.estimatedValue.toLocaleString()} {lead.currency}</p>
             </div>
             
             {(invoicesTotal > 0 || quotesTotal > 0) && (
                <div className="flex justify-between items-center text-[10px] pt-1 border-t border-zinc-50/50">
                   <span className="text-emerald-600 font-bold">{isRtl ? 'المبيعات:' : 'Invoiced:'}</span>
                   <p className="font-black text-emerald-700">{invoicesTotal.toLocaleString()} {currency}</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: any, label: string, value: any, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">{icon}</div>
        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{trend}</span>
      </div>
      <div className="space-y-0.5">
        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</h4>
        <p className="text-2xl font-black text-zinc-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ stage, isRtl }: { stage: LeadStage; isRtl: boolean }) {
  const stageInfo = STAGES.find(s => s.id === stage) || STAGES[0];
  return (
    <span className={`px-2.5 py-1 rounded-lg uppercase font-black text-[9px] tracking-tighter ${stageInfo.color}`}>
      {isRtl ? stageInfo.labelAr : stageInfo.labelEn}
    </span>
  );
}
