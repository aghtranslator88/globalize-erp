/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PlusSquare, Share2, ClipboardList, Clock, CheckCircle2, 
  HelpCircle, MessageSquare, Mail, Footprints, AlertTriangle
} from 'lucide-react';
import { Task, Quotation, Client } from '../types';
import dbInstance from '../db/store';

interface DashboardSalesProps {
  isRtl: boolean;
  onNavigateTab: (tab: string) => void;
  onOpenNewTaskModal: () => void;
  onOpenNewQuoteModal: () => void;
}

export const DashboardSales: React.FC<DashboardSalesProps> = ({
  isRtl,
  onNavigateTab,
  onOpenNewTaskModal,
  onOpenNewQuoteModal
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setTasks(dbInstance.tasks);
    setQuotations(dbInstance.quotations);
    setClients(dbInstance.clients);

    const sub = dbInstance.subscribe(() => {
      setTasks([...dbInstance.tasks]);
      setQuotations([...dbInstance.quotations]);
      setClients([...dbInstance.clients]);
    });
    return sub;
  }, []);

  // Compute intake channels
  const whatsappIntake = tasks.filter(t => t.intakeChannel === 'whatsapp').length;
  const emailIntake = tasks.filter(t => t.intakeChannel === 'email').length;
  const walkInIntake = tasks.filter(t => t.intakeChannel === 'walk_in').length;
  const totalIntake = tasks.length;

  // Unassigned tasks (needs translator)
  const unassignedTasks = tasks.filter(t => t.status === 'pending' || t.status === 'quoted');

  // Quotation counts
  const draftQuotes = quotations.filter(q => q.status === 'created').length;
  const sentQuotes = quotations.filter(q => q.status === 'sent').length;
  const approvedQuotes = quotations.filter(q => q.status === 'confirmed' || q.status === 'converted').length;

  const intakeChannels = [
    { title: 'WhatsApp Leads', value: whatsappIntake, icon: MessageSquare, color: 'text-emerald-500 bg-emerald-50' },
    { title: 'Email Requests', value: emailIntake, icon: Mail, color: 'text-indigo-500 bg-indigo-50' },
    { title: 'Walk-ins (المكتب)', value: walkInIntake, icon: Footprints, color: 'text-amber-500 bg-amber-50' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Sales Hero */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800 shadow-md">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">
            {isRtl ? 'بوابة إدارة المبيعات والتسجيل اليومي' : 'Task Intake & Quotations Dashboard'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-normal">
            {isRtl 
              ? 'تلقي طلبات العملاء عبر قنوات الاتصال بالمكتب، إعداد وثائق عروض الأسعار وقبول التبادل المالي وتجهيز الملفات للتوزيع على اللغويين.'
              : 'Log incoming translation requests, prepare professional quotas, verify word counts on client documents, and track translation delivery statuses.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onOpenNewTaskModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <PlusSquare size={14} />
            <span>{isRtl ? 'تسجيل معاملة ملف جديدة' : 'Register Translation Folder'}</span>
          </button>
          <button
            onClick={onOpenNewQuoteModal}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
          >
            <Share2 size={14} />
            <span>{isRtl ? 'إصدار عرض سعر' : 'Issue Quotation'}</span>
          </button>
        </div>
      </div>

      {/* INTAKE COUNTERS & CHANNEL ANALYSIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {intakeChannels.map((c, i) => (
          <div key={i} className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${c.color}`}>
                <c.icon size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500">{c.title}</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{c.value}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {totalIntake > 0 ? `${Math.round((c.value / totalIntake) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>

      {/* UNASSIGNED FOLDERS AWAITING ACTION & QUOTE SUMMARIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unassigned Task pipeline */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <AlertTriangle className="text-amber-500" size={18} />
            <h3 className="font-bold text-slate-900 text-sm">
              {isRtl ? 'ملفات قيد التسعير وبانتظار التعيين' : 'Unassigned Folders Queue (Needs Translator)'}
            </h3>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {unassignedTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                All folders currently allocated. Excellent team utilization!
              </div>
            ) : (
              unassignedTasks.map(t => (
                <div key={t.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 font-mono text-xs">{t.referenceNo}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold capitalize">{t.serviceType}</span>
                    </div>
                    <p className="font-medium text-slate-700 mt-1 truncate max-w-md">{t.fileName}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                      <span>{t.sourceLanguage} ➔ {t.targetLanguage}</span>
                      <span>•</span>
                      <span>{t.wordCount.toLocaleString()} words</span>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => onNavigateTab('tasks')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {isRtl ? 'قرن بمترجم وتعيين تكلفة' : 'Assign & Cost'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quotes metrics box */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 flex items-center gap-1.5">
            <ClipboardList size={16} className="text-amber-500" />
            {isRtl ? 'حالة عروض الأسعار الصادرة' : 'Quotations Pipeline (العروض)'}
          </h3>

          <div className="space-y-4 mt-4 text-xs font-sans">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Draft Quotas (مسودة)</span>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-bold rounded-md font-mono">{draftQuotes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium font-sans">Sent to Client (أرسل)</span>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md font-mono">{sentQuotes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Approved Quote (مقبول)</span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md font-mono">{approvedQuotes}</span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Success conversion rate</span>
              <span className="font-bold text-slate-800 font-sans">
                {quotations.length > 0 ? `${Math.round((approvedQuotes / quotations.length) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSales;
