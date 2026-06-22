/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, Users, AlertCircle, 
  Briefcase, Percent, CheckCircle, FileSpreadsheet, Hourglass,
  Search, Filter, Activity, ChevronDown, ChevronUp, CheckCircle2,
  BookOpen, Coins, FileText, ArrowUpDown
} from 'lucide-react';
import { Task, Payment, Client, Profile, MonthlyClosing, TaskAssignment, Account } from '../types';
import dbInstance from '../db/store';

interface DashboardOwnerProps {
  isRtl: boolean;
  onNavigateTab: (tab: string) => void;
}

export const DashboardOwner: React.FC<DashboardOwnerProps> = ({ isRtl, onNavigateTab }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Tab switcher
  const [activeTab, setActiveTab] = useState<'financial' | 'operations'>('financial');

  // Operations tab state
  const [searchTranslator, setSearchTranslator] = useState('');
  const [searchTaskOp, setSearchTaskOp] = useState('');
  const [expandedTranslatorId, setExpandedTranslatorId] = useState<string | null>(null);
  const [taskStatusOpFilter, setTaskStatusOpFilter] = useState<string>('all');

  useEffect(() => {
    setTasks(dbInstance.tasks);
    setPayments(dbInstance.payments);
    setClients(dbInstance.clients);
    setClosings(dbInstance.closings);
    setProfiles(dbInstance.profiles);
    setAssignments(dbInstance.assignments);
    setAccounts(dbInstance.accounts);

    const sub = dbInstance.subscribe(() => {
      setTasks([...dbInstance.tasks]);
      setPayments([...dbInstance.payments]);
      setClients([...dbInstance.clients]);
      setClosings([...dbInstance.closings]);
      setProfiles([...dbInstance.profiles]);
      setAssignments([...dbInstance.assignments]);
      setAccounts([...dbInstance.accounts]);
    });
    return sub;
  }, []);

  // Compute active totals
  const totalAmountEgp = tasks.reduce((s, t) => s + t.amountEgp, 0);
  const totalAmountAed = tasks.reduce((s, t) => s + t.amountAed, 0);
  const totalAmountUsd = tasks.reduce((s, t) => s + t.amountUsd, 0);

  const totalPaidEgp = tasks.reduce((s, t) => s + t.paidAmountEgp, 0);
  const totalPaidAed = tasks.reduce((s, t) => s + t.paidAmountAed, 0);
  const totalPaidUsd = tasks.reduce((s, t) => s + t.paidAmountUsd, 0);

  const totalUnpaidEgp = Math.max(0, totalAmountEgp - totalPaidEgp);
  const totalUnpaidAed = Math.max(0, totalAmountAed - totalPaidAed);
  const totalUnpaidUsd = Math.max(0, totalAmountUsd - totalPaidUsd);

  // Status metrics
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;

  // Partner splits computation for last closed month
  const lastClosing = closings[closings.length - 1];
  const partnerOneShare = lastClosing ? lastClosing.partner1Share : 0;
  const partnerTwoShare = lastClosing ? lastClosing.partner2Share : 0;
  const latestClosedPeriod = lastClosing ? lastClosing.period : 'None';

  const bankPositions = accounts
    .filter(account => account.type === 'asset')
    .map(account => ({
      title: isRtl ? (account.nameAr || account.name) : account.name,
      value: `${account.currency} ${Number(account.balance || 0).toLocaleString()}`
    }));

  const translatorsPerformance = profiles
    .filter(p => p.role === 'translator' || p.role === 'admin' || p.role === 'owner')
    .map(p => {
      const translatorAsgs = assignments.filter(a => a.translatorId === p.id);
      
      // Completed over last 30 days (approved or delivered)
      const completedLast30Days = translatorAsgs.filter(a => {
        if (a.status !== 'approved') return false;
        if (!a.assignedAt) return false;
        const d = new Date(a.assignedAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      });

      const completedCount = completedLast30Days.length;
      const completedWords = completedLast30Days.reduce((sum, a) => sum + (a.wordCountActual || a.wordCountAssigned || 0), 0);

      // Active workloads (assigned, in_progress, submitted)
      const activeAsgs = translatorAsgs.filter(a => a.status !== 'approved');
      const activeCount = activeAsgs.length;
      const activeWords = activeAsgs.reduce((sum, a) => sum + (a.wordCountAssigned || 0), 0);

      return {
        profile: p,
        completedCount,
        completedWords,
        activeCount,
        activeWords,
        allAsgs: translatorAsgs
      };
    })
    // Filter to show active performers or those listed with translator roles
    .filter(tp => tp.profile.role === 'translator' || tp.allAsgs.length > 0);

  const maxCompletedCount = Math.max(...translatorsPerformance.map(t => t.completedCount), 1);

  // Filters for Operations
  const filteredTranslatorsPerformance = translatorsPerformance.filter(tp => {
    const term = searchTranslator.trim().toLowerCase();
    if (!term) return true;
    return tp.profile.fullName.toLowerCase().includes(term) || 
           (tp.profile.fullNameAr && tp.profile.fullNameAr.toLowerCase().includes(term));
  });

  const filteredTasksByStatus = tasks.filter(t => {
    if (taskStatusOpFilter !== 'all' && t.status !== taskStatusOpFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Arabic welcome prompt */}
      <div className="p-8 bg-brand-navy-dark text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-navy-dark shadow-xl leading-tight relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 blur-3xl -mr-16 -mt-16 rounded-full" />
        <div className="relative z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold block mb-1">System Status • Intelligence Core</span>
          <h2 className="text-2xl font-light tracking-tight">
            {isRtl 
              ? `أهلاً بك ${dbInstance.activeProfile?.fullNameAr || ''}` 
              : `Welcome, ${dbInstance.activeProfile?.fullName || 'Owner'}`}
          </h2>
          <p className="text-xs text-brand-navy-light mt-2 max-w-2xl leading-relaxed">
            {isRtl 
              ? 'مراجعة الموقف المالي للمكتب، الحسابات الختامية للإغلاق الشهري، دفتر السيولة، وتوزيع نصيب الأرباح 50% بالتساوي بين الشريكين أحمد عبد الغفار وأبو الفتوح.'
              : 'Audit active cash book balances, monthly historical closings, translation costings, and partner dividend allocation.'}
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0 relative z-10">
          <button 
            onClick={() => onNavigateTab('acc-closings')}
            className="px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-brand-navy text-xs font-black rounded-lg transition-all cursor-pointer font-sans shadow-md"
          >
            {isRtl ? 'إجراء إغلاق مالي شهري' : 'Close Active Month'}
          </button>
          <button 
            onClick={() => onNavigateTab('tasks')}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy-hover text-white text-xs font-bold rounded-lg transition-all border border-brand-navy-dark cursor-pointer shadow-md"
          >
            {isRtl ? 'عرض ملفات الترجمة' : 'View Work folders'}
          </button>
        </div>
      </div>

      {/* Navigation segments */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('financial')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider transition-all border-b-2 uppercase cursor-pointer ${
            activeTab === 'financial'
              ? 'border-brand-navy text-brand-navy font-black'
              : 'border-transparent text-brand-text-muted hover:text-brand-navy'
          }`}
        >
          {isRtl ? 'الرصيد والقوائم المالية' : 'Financial Statement View'}
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider transition-all border-b-2 uppercase cursor-pointer ${
            activeTab === 'operations'
              ? 'border-brand-navy text-brand-navy font-black'
              : 'border-transparent text-brand-text-muted hover:text-brand-navy'
          }`}
        >
          {isRtl ? 'تقارير المترجمين وتفاصيل المهام' : 'Translators Workload & Task Details'}
        </button>
      </div>

      {activeTab === 'financial' ? (
        <>
          {/* CORE FINANCIAL KPIS SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 - Total Revenue in EGP */}
            <div className="bg-white p-6 rounded-xl border border-zinc-150 flex items-start gap-4">
              <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 text-zinc-900 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
                  {isRtl ? 'إجمالي تعاقدات المكتب (EGP)' : 'Total Folders (EGP)'}
                </p>
                <h3 className="text-2xl font-light tracking-tight text-zinc-900 mt-2">
                  EGP {totalAmountEgp.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 font-medium">
                  <span className="text-zinc-900 font-semibold">✓ EGP {totalPaidEgp.toLocaleString()}</span>
                  <span>{isRtl ? 'محصل' : 'paid'}</span>
                </div>
              </div>
            </div>

            {/* KPI 2 - UAE Dirham Contract Volume */}
            <div className="bg-white p-6 rounded-xl border border-zinc-150 flex items-start gap-4">
              <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 text-zinc-900 rounded-lg">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
                  {isRtl ? 'تعاقدات درهم إماراتي (AED)' : 'Dubai Contracts (AED)'}
                </p>
                <h3 className="text-2xl font-light tracking-tight text-zinc-900 mt-2">
                  AED {totalAmountAed.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 font-medium">
                  <span className="text-zinc-900 font-semibold">✓ AED {totalPaidAed.toLocaleString()}</span>
                  <span>{isRtl ? 'محصل' : 'paid'}</span>
                </div>
              </div>
            </div>

            {/* KPI 3 - US Dollar Contracts */}
            <div className="bg-white p-6 rounded-xl border border-zinc-150 flex items-start gap-4">
              <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 text-zinc-900 rounded-lg">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
                  {isRtl ? 'تعاقدات دولار أمريكي (USD)' : 'Global Intake (USD)'}
                </p>
                <h3 className="text-2xl font-light tracking-tight text-zinc-900 mt-2">
                  USD {totalAmountUsd.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 font-medium">
                  <span className="text-zinc-900 font-semibold">✓ USD {totalPaidUsd.toLocaleString()}</span>
                  <span>{isRtl ? 'محصل' : 'paid'}</span>
                </div>
              </div>
            </div>

            {/* KPI 4 - Total Active Receivables Outstanding */}
            <div className="bg-white p-6 rounded-xl border border-brand-border flex items-start gap-4 shadow-sm hover:border-brand-navy transition-colors">
              <div className="p-2.5 bg-brand-navy text-white rounded-lg">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
                  {isRtl ? 'المديونيات الآجلة للعملاء' : 'Due Receivables (EGP)'}
                </p>
                <h3 className="text-2xl font-light tracking-tight text-zinc-905 text-zinc-950 mt-2">
                  EGP {totalUnpaidEgp.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 font-medium">
                  <span className="text-zinc-900 font-semibold">USD {totalUnpaidUsd.toLocaleString()}</span>
                  <span>{isRtl ? 'آجل' : 'unpaid'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PARTNER NET DIVIDEND SHARING SHEET */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-150 lg:col-span-2">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Percent className="text-zinc-900" size={16} />
                  <h3 className="font-semibold text-zinc-900 text-sm">
                    {isRtl ? 'تسوية الأرباح وتوزيع الشركاء (50% / 50%)' : 'Partner Equity Profit Sharing (50/50)'}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-650 font-mono text-[9px] font-semibold rounded border border-zinc-200/60 uppercase">
                  {isRtl ? `آخر إغلاق: ${latestClosedPeriod}` : `Last Closed: ${latestClosedPeriod}`}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mt-3">
                {isRtl 
                  ? 'تقسم التدفقات النقدية الصافية للشركة بالتساوي بعد خصم مصاريف تشغيل المكتب كاملة وتكلفة اللغويين المترجمين ورواتب الموظفين الشهرية.'
                  : 'Upon finalizing standard monthly closings, all operational costs and staff/freelance wages are deducted. Net profit is allocated according to the configured partner split.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="p-5 border border-brand-border bg-brand-navy-light/10 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-navy"></div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{isRtl ? 'الشريك الأول (50%)' : 'Partner 1 (50%)'}</p>
                  <h4 className="text-2xl font-light tracking-tight text-zinc-900 mt-2.5">
                    EGP {partnerOneShare.toLocaleString()}
                  </h4>
                  <p className="text-[10px] text-zinc-450 text-zinc-400 mt-1">{isRtl ? 'صافي مستحق رصيد الدفعة المغلقة' : 'Net dividend allocation for latest closed cycle.'}</p>
                </div>

                <div className="p-5 border border-zinc-150 bg-zinc-50/55 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-zinc-400"></div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{isRtl ? 'الشريك الثاني (50%)' : 'Partner 2 (50%)'}</p>
                  <h4 className="text-2xl font-light tracking-tight text-zinc-900 mt-2.5">
                    EGP {partnerTwoShare.toLocaleString()}
                  </h4>
                  <p className="text-[10px] text-zinc-450 text-zinc-400 mt-1">{isRtl ? 'صافي مستحق رصيد الدفعة المغلقة' : 'Net dividend allocation for latest closed cycle.'}</p>
                </div>
              </div>
            </div>

            {/* WORK PIPELINE INDICATORS */}
            <div className="bg-white p-6 rounded-xl border border-zinc-150">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">Status Overview</span>
              <h3 className="text-zinc-900 font-semibold text-sm pb-3 border-b border-zinc-100">
                {isRtl ? 'حالة سير المعاملات حالياً' : 'Operational Workflow Queue'}
              </h3>

              <div className="space-y-3.5 mt-4">
                {/* Pending folders */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                    {isRtl ? 'ملفات قيد المراجعة الفنية' : 'Received (Waiting Quote)'}
                  </span>
                  <span className="font-semibold font-mono text-zinc-900 bg-zinc-50 px-2.5 py-1 rounded border border-zinc-150">
                    {pendingCount}
                  </span>
                </div>

                {/* In Progress */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                    {isRtl ? 'ملفات معينة وقيد الترجمة' : 'Assigned (Translating)'}
                  </span>
                  <span className="font-semibold font-mono text-zinc-900 bg-zinc-50 px-2.5 py-1 rounded border border-zinc-150">
                    {inProgressCount}
                  </span>
                </div>

                {/* In Review */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                    {isRtl ? 'ملفات قيد التدقيق اللغوي' : 'Under Review / Revision'}
                  </span>
                  <span className="font-semibold font-mono text-zinc-900 bg-zinc-50 px-2.5 py-1 rounded border border-zinc-150">
                    {reviewCount}
                  </span>
                </div>

                {/* Completed */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>
                    {isRtl ? 'معاملات جاهزة ومسلمة للعميل' : 'Completed & Delivered'}
                  </span>
                  <span className="font-semibold font-mono text-brand-navy bg-brand-gold px-2.5 py-1 rounded shadow-sm">
                    {completedCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LIQUIDITY POSITION CARD - CASH BOX & BANKS & INSTAPAY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-150">
              <div className="pb-3 border-b border-zinc-100 flex items-center gap-2">
                <Wallet size={16} className="text-zinc-800" />
                <h3 className="text-zinc-900 font-semibold text-sm">
                  {isRtl ? 'أرصدة السيولة النقدية والمصرفية للمكتب' : 'Bureau Liquidity & Capital Assets (السيولة)'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {bankPositions.length === 0 && (
                  <div className="sm:col-span-2 p-4 border border-dashed border-zinc-200 bg-zinc-50/50 rounded-xl text-xs text-zinc-400 font-medium">
                    {isRtl ? 'لا توجد حسابات أصول مسجلة بعد.' : 'No asset accounts have been configured yet.'}
                  </div>
                )}
                {bankPositions.map((p, idx) => (
                  <div key={idx} className="p-4 border border-zinc-100 bg-zinc-50/50 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">{p.title}</span>
                    <span className="text-base font-bold text-zinc-900 mt-2 font-mono">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CUSTOM SVG CHARTS - VISUAL HISTORICAL STATUS */}
            <div className="bg-white p-6 rounded-xl border border-zinc-150">
              <h3 className="text-zinc-900 font-semibold text-sm pb-1.5 border-b border-zinc-100">
                {isRtl ? 'نمو الإيرادات لعام 2026 (ج.م)' : '2026 Monthly Cash Revenues Volume Chart (EGP)'}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-1 mb-3">Estimated based on closed periods, expressed in thousands EGP.</p>
              
              <div className="h-44 w-full flex items-end justify-between px-2 pt-4 relative">
                {/* Guide Gridlines */}
                <div className="absolute left-0 right-0 top-1/4 border-b border-dashed border-zinc-50"></div>
                <div className="absolute left-0 right-0 top-2/4 border-b border-dashed border-zinc-50"></div>
                <div className="absolute left-0 right-0 top-3/4 border-b border-dashed border-zinc-50"></div>

                {/* Bar 1: Jan */}
                <div className="flex flex-col items-center flex-1 group">
                  <span className="text-[9px] font-semibold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0">94K</span>
                  <div className="w-8 bg-zinc-100 hover:bg-zinc-200 transition-colors rounded-t h-12"></div>
                  <span className="text-[10px] text-zinc-400 mt-1.5 font-medium">Jan</span>
                </div>

                {/* Bar 2: Feb */}
                <div className="flex flex-col items-center flex-1 group">
                  <span className="text-[9px] font-semibold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0 font-mono">112K</span>
                  <div className="w-8 bg-zinc-100 hover:bg-zinc-200 transition-colors rounded-t h-16"></div>
                  <span className="text-[10px] text-zinc-400 mt-1.5 font-medium">Feb</span>
                </div>

                {/* Bar 3: Mar */}
                <div className="flex flex-col items-center flex-1 group">
                  <span className="text-[9px] font-semibold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0 font-mono">148K</span>
                  <div className="w-8 bg-zinc-100 hover:bg-zinc-200 transition-colors rounded-t h-24"></div>
                  <span className="text-[10px] text-zinc-400 mt-1.5 font-medium">Mar</span>
                </div>

                {/* Bar 4: Apr */}
                <div className="flex flex-col items-center flex-1 group">
                  <span className="text-[9px] font-semibold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0 font-mono">165K</span>
                  <div className="w-8 bg-zinc-300 hover:bg-zinc-400 transition-colors rounded-t h-28"></div>
                  <span className="text-[10px] text-zinc-500 mt-1.5 font-medium">Apr</span>
                </div>

                {/* Bar 5: May */}
                <div className="flex flex-col items-center flex-1 group">
                  <span className="text-[9px] font-semibold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0 font-mono">210K</span>
                  <div className="w-8 bg-zinc-400 hover:bg-zinc-500 transition-colors rounded-t h-36"></div>
                  <span className="text-[10px] text-zinc-500 mt-1.5 font-medium">May</span>
                </div>

                {/* Bar 6: Jun */}
                <div className="flex flex-col items-center flex-1 group">
                  <span className="text-[9px] font-semibold text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono font-bold">Active</span>
                  <div className="w-8 bg-brand-navy rounded-t h-14 relative group-hover:bg-brand-navy-hover transition-colors">
                    <div className="absolute inset-0 bg-brand-gold/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] text-zinc-900 mt-1.5 font-semibold">Jun</span>
                </div>
              </div>
            </div>
          </div>

          {/* TOP DELEGATE CLIENTS CRM WARNINGS */}
          <div className="bg-white p-6 rounded-xl border border-zinc-150">
            <h3 className="text-zinc-900 font-semibold text-sm pb-3 border-b border-zinc-100">
              {isRtl ? 'قائمة العملاء الكبار ومستحقاتهم الآجلة' : 'Top VIP Clients Financial Standings'}
            </h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left text-zinc-600 mt-3 font-sans">
                <thead className="text-[10px] text-zinc-400 bg-zinc-50 uppercase tracking-widest border-b border-zinc-100">
                  <tr>
                    <th className={`px-4 py-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'العميل' : 'Client Name'}</th>
                    <th className={`px-4 py-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الجنسية / الفئة' : 'Category / Origin'}</th>
                    <th className={`px-4 py-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'مديونية بالجنيه' : 'EGP Balance'}</th>
                    <th className={`px-4 py-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'مديونية بالدرهم' : 'AED Balance'}</th>
                    <th className={`px-4 py-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'مديونية بالدولار' : 'USD Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {clients.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        <p>{isRtl ? c.nameAr || c.name : c.name}</p>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0 block mt-0.5">{c.phone}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {c.clientType} / {c.nationality || 'Local'}
                      </td>
                      <td className="px-4 py-3 text-zinc-800 font-mono font-semibold">
                        EGP {c.totalReceivablesEgp.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-800 font-mono font-semibold">
                        AED {c.totalReceivablesAed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-800 font-mono font-semibold">
                        USD {c.totalReceivablesUsd.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-fade-in font-sans">
          
          {/* THE CHART: COMPLETED TASKS PER TRANSLATOR OVER THE LAST 30 DAYS */}
          <div className="bg-white p-6 rounded-xl border border-zinc-150">
            <h4 className="font-semibold text-zinc-900 text-sm pb-1.5 border-b border-zinc-150 flex items-center gap-1.5">
              <Activity size={16} className="text-zinc-600" />
              {isRtl ? 'المهام والملفات المكتملة لكل مترجم (آخر 30 يوماً)' : 'Tasks Completed per Translator (Last 30 Days)'}
            </h4>
            <p className="text-[10px] text-zinc-400 mt-1 mb-6">
              {isRtl ? 'رسم بياني يوضح إنتاجية المترجمين الفعلية المعتمدة والمدفوعة خلال آخر 30 يوماً.' : 'Dynamic visual representation of translation assignments verified and completed inside the last 30-day period.'}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {translatorsPerformance.map((tp) => {
                const percentage = (tp.completedCount / maxCompletedCount) * 100;
                return (
                  <div key={tp.profile.id} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50/30 hover:bg-zinc-50/70 transition-colors flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                          {tp.profile.employeeType === 'staff' ? (isRtl ? 'موظف دائم' : 'Staff Linguist') : (isRtl ? 'فريلانس مستشار' : 'Freelance')}
                        </span>
                        <h5 className="font-semibold text-zinc-900 text-xs mt-0.5">{isRtl ? tp.profile.fullNameAr : tp.profile.fullName}</h5>
                      </div>
                      <span className="font-mono text-lg font-bold text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded leading-none shrink-0" title={`${tp.completedCount} assignments`}>
                        {tp.completedCount}
                      </span>
                    </div>
                    
                    {/* Visual Bar representation */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[9px] text-zinc-400 mb-1 font-mono">
                        <span>{isRtl ? 'مستويات الإنتاجية' : 'Efficiency level'}</span>
                        <span>{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200/50">
                        <div 
                          className="bg-zinc-900 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(6, percentage)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-3 pt-2.5 border-t border-zinc-100 font-mono">
                      <div>
                        <span>{isRtl ? 'كلمات مكتملة:' : 'Words Done:'}</span>
                        <p className="font-bold text-zinc-700 text-[11px] font-sans">{tp.completedWords.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span>{isRtl ? 'جار العمل:' : 'On Queue:'}</span>
                        <p className="font-bold text-zinc-650 text-[11px] font-sans">{tp.activeCount} ({tp.activeWords.toLocaleString()}w)</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DETAILED WORKLOADS TABLE */}
          <div className="bg-white rounded-xl border border-zinc-150 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-zinc-100 gap-4">
              <div>
                <h3 className="text-zinc-900 font-semibold text-sm">
                  {isRtl ? 'قائمة وتفاصيل لجان عمل المترجمين' : 'Linguist Assignments & Activity Journal'}
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {isRtl ? 'اضغط على أي مترجم لمشاهدة تفاصيل جميع مهام ترجمة العقود، المراجع، ونسب التكاليف.' : 'Click on any translator profile to expand full lists of assigned folders, units, rates, and active states.'}
                </p>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
                  <input 
                    type="text"
                    value={searchTranslator}
                    onChange={e => setSearchTranslator(e.target.value)}
                    placeholder={isRtl ? 'بحث باسم المترجم...' : 'Filter translators...'}
                    className="pl-8 pr-3 py-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg w-full md:w-48 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredTranslatorsPerformance.length === 0 ? (
                <p className="text-xs text-zinc-400 italic text-center p-6 bg-zinc-50/50 rounded-lg">
                  {isRtl ? 'لا يوجد مترجمون مطابقون للبحث.' : 'No active translators matched your query.'}
                </p>
              ) : (
                filteredTranslatorsPerformance.map(tp => {
                  const isExpanded = expandedTranslatorId === tp.profile.id;
                  return (
                    <div key={tp.profile.id} className="border border-zinc-150 rounded-xl overflow-hidden bg-white hover:border-zinc-300 transition-all">
                      {/* Translator Row Toggle */}
                      <div 
                        onClick={() => setExpandedTranslatorId(isExpanded ? null : tp.profile.id)}
                        className="p-4 bg-zinc-50/30 hover:bg-zinc-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-90 w-9 h-9 rounded-full bg-zinc-950 text-white flex items-center justify-center text-xs font-bold font-mono shadow-sm">
                            {tp.profile.fullName.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-zinc-900 text-xs flex items-center gap-2">
                              {isRtl ? tp.profile.fullNameAr : tp.profile.fullName}
                              <span className="px-1.5 py-0.5 text-[8px] uppercase font-bold text-zinc-500 bg-zinc-100 border border-zinc-150 rounded font-mono">
                                {tp.profile.employeeType === 'staff' ? (isRtl ? 'موظف' : 'Staff') : (isRtl ? 'فريلانسر' : 'Freelance')}
                              </span>
                            </h4>
                            <p className="text-[9px] text-zinc-400 mt-0.5 leading-none">
                              {tp.profile.phone || 'No phone'} • {(tp.profile.languages || ['English', 'Arabic']).join(' ➔ ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
                          <div className="font-mono">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest block leading-none">{isRtl ? 'المهام قيد العمل' : 'ACTIVE JOBS'}</span>
                            <strong className="text-zinc-800 text-xs font-semibold">{tp.activeCount} ({tp.activeWords.toLocaleString()} w)</strong>
                          </div>
                          <div className="font-mono">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest block leading-none">{isRtl ? 'صافي الأتعاب المعتمدة' : 'APPROVED FEE'}</span>
                            <strong className="text-emerald-600 text-xs font-bold">EGP {tp.allAsgs.filter(a=>a.status === 'approved').reduce((s, a)=>s+a.calculatedAmount, 0).toLocaleString()}</strong>
                          </div>
                          <div className="p-1 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-550 transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section Details */}
                      {isExpanded && (
                        <div className="p-4 border-t border-zinc-100 bg-white">
                          <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <FileText size={12} className="text-zinc-400" />
                            {isRtl ? 'بيان بجميع المهام المسندة والتكاليف:' : 'Detailed Task Assignments Ledger'}
                          </h5>
                          
                          {tp.allAsgs.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic p-4 text-center bg-zinc-50 rounded-lg">
                              {isRtl ? 'لا توجد أي مهام مسندة لهذا المترجم حالياً.' : 'No assignments are currently linked to this linguist.'}
                            </p>
                          ) : (
                            <div className="overflow-x-auto border border-zinc-150 rounded-lg">
                              <table className="w-full text-[11px] text-left text-zinc-650 font-sans">
                                <thead className="bg-zinc-50/80 border-b border-zinc-150 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                                  <tr>
                                    <th className="px-3 py-2.5">{isRtl ? 'المرجع والملف' : 'Task Reference & File'}</th>
                                    <th className="px-3 py-2.5">{isRtl ? 'النوع' : 'Role'}</th>
                                    <th className="px-3 py-2.5 font-mono">{isRtl ? 'الكلمات المسندة' : 'Assigned Words'}</th>
                                    <th className="px-3 py-2.5">{isRtl ? 'سعر الوحدة' : 'Rate / Fee'}</th>
                                    <th className="px-3 py-2.5">{isRtl ? 'إجمالي الأتعاب' : 'Total Amount'}</th>
                                    <th className="px-3 py-2.5">{isRtl ? 'ميعاد التسليم' : 'Deadline'}</th>
                                    <th className="px-3 py-2.5 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                  {tp.allAsgs.map(asg => {
                                    return (
                                      <tr key={asg.id} className="hover:bg-zinc-50/30">
                                        <td className="px-3 py-2.5">
                                          <div className="font-semibold text-zinc-900">{asg.taskRef || 'Task'}</div>
                                          <div className="text-[10px] text-zinc-400 truncate max-w-[200px]" title={asg.taskFileName}>
                                            {asg.taskFileName || 'Untitled Document'}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase bg-zinc-100 text-zinc-700">
                                            {asg.assignmentType}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-zinc-900">
                                          {asg.wordCountAssigned?.toLocaleString()} words
                                          {asg.wordCountActual !== undefined && (
                                            <div className="text-[9px] text-emerald-600 font-bold">Actual: {asg.wordCountActual?.toLocaleString()}</div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-zinc-550">
                                          {asg.rateFixed && asg.rateFixed > 0 ? (
                                            <span>Fixed EGP {asg.rateFixed.toLocaleString()}</span>
                                          ) : (
                                            <span>EGP {asg.ratePerWord || 0} /w</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 text-zinc-900 font-bold font-mono">
                                          EGP {asg.calculatedAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-2.5 text-zinc-400 font-mono">
                                          {asg.deadline ? asg.deadline.slice(0, 10) : 'None'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                          <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded font-mono border ${
                                            asg.status === 'assigned' ? 'bg-zinc-50 text-zinc-500 border-zinc-200' :
                                            asg.status === 'in_progress' ? 'bg-amber-50 text-amber-500 border-amber-200' :
                                            asg.status === 'submitted' ? 'bg-indigo-50 text-indigo-500 border-indigo-200' :
                                            'bg-green-50 text-emerald-500 border-emerald-250 font-bold'
                                          }`}>
                                            {asg.status.replace('_', ' ')}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ALL TASK DETAILS AND PROFITABILITY JOURNAL */}
          <div className="bg-white rounded-xl border border-zinc-150 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-zinc-100 gap-4">
              <div>
                <h3 className="text-zinc-900 font-semibold text-sm">
                  {isRtl ? 'بيان تفاصيلي لجميع ملفات الترجمة والربحية للمكتب' : 'Global Folders Pricing & Operations Profitability Journal'}
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {isRtl ? 'عرض شامل لمبيعات الملفات مخصوماً منها تكاليف اللغويين الفعلية لتحديد الهامش الربحي الصافي للفروع.' : 'Examine total folder sales contract volumes minus translation costs to determine standard gross profit margins.'}
                </p>
              </div>
              
              <div>
                <select
                  value={taskStatusOpFilter}
                  onChange={e => setTaskStatusOpFilter(e.target.value)}
                  className="p-1.5 text-xs bg-zinc-50 border border-zinc-205 border-zinc-300 rounded-lg focus:outline-none"
                >
                  <option value="all">{isRtl ? 'جميع الحالات' : 'All Tasks'}</option>
                  <option value="pending">{isRtl ? 'تحت التسعير / مراجعة فنية' : 'Pending Intake'}</option>
                  <option value="in_progress">{isRtl ? 'قيد الترجمة والعمل' : 'In Progress'}</option>
                  <option value="review">{isRtl ? 'تحت التدقيق اللغوي' : 'In Review'}</option>
                  <option value="completed">{isRtl ? 'مكتمل ومعتمد محاسبياً' : 'Completed'}</option>
                  <option value="delivered">{isRtl ? 'تم تسليمه للعميل مالي' : 'Delivered'}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full mt-4 border border-zinc-150 rounded-lg">
              <table className="w-full text-xs text-left text-zinc-650 font-sans">
                <thead className="text-[9px] text-zinc-400 uppercase tracking-widest bg-zinc-50 border-b border-zinc-150">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{isRtl ? 'رقم الملف / العميل' : 'Folder Reference & Client'}</th>
                    <th className="px-4 py-3 font-semibold">{isRtl ? 'حجم الملف' : 'Volume'}</th>
                    <th className="px-4 py-3 font-semibold">{isRtl ? 'سعر البيع (ج.م)' : 'Contract Sale'}</th>
                    <th className="px-4 py-3 font-semibold">{isRtl ? 'تكلفة المترجمين والمدققين' : 'Linguist Cost'}</th>
                    <th className="px-4 py-3 font-semibold">{isRtl ? 'هامش الربح الإجمالي' : 'Bureau Net Margin'}</th>
                    <th className="px-4 py-3 font-semibold text-center">{isRtl ? 'حالة التشغيل' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredTasksByStatus.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-6 text-zinc-400 italic">
                        {isRtl ? 'لا توجد ملفات متوافقة مع الحصيلة الحالية.' : 'No translation folders matched safety categories.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTasksByStatus.map(t => {
                      const totalCst = t.totalCost || 0;
                      const netRev = t.amountEgp - totalCst;
                      const marginPercent = t.amountEgp > 0 ? (netRev / t.amountEgp) * 100 : 100;
                      return (
                        <tr key={t.id} className="hover:bg-zinc-50/40">
                          <td className="px-4 py-3.5 font-semibold text-zinc-900">
                            <div>{t.referenceNo}</div>
                            <div className="text-[10px] text-zinc-400 truncate max-w-[200px]" title={t.fileName}>
                              {t.fileName}
                            </div>
                            <span className="text-[10px] text-zinc-550 font-normal block mt-0.5">
                              {t.clientNameCache || 'Direct Walk-in'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono">
                            <div>{t.wordCount?.toLocaleString()} words</div>
                            <div className="text-[10px] text-zinc-400">{t.pageCount} {isRtl ? 'صفحة' : 'pages'}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-zinc-900">
                            EGP {t.amountEgp?.toLocaleString()}
                            {t.amountUsd > 0 && <span className="block text-[9px] font-normal text-zinc-40s text-zinc-400">USD {t.amountUsd?.toLocaleString()}</span>}
                            {t.amountAed > 0 && <span className="block text-[9px] font-normal text-zinc-40s text-zinc-400">AED {t.amountAed?.toLocaleString()}</span>}
                          </td>
                          <td className="px-4 py-3.5 font-mono">
                            <span className="font-semibold text-rose-600">EGP {totalCst?.toLocaleString()}</span>
                            <div className="text-[8px] text-zinc-400 tracking-tight">
                              Trans: EGP {t.translationCost || 0} | Rev: EGP {t.revisionCost || 0}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono">
                            <span className={`font-bold ${netRev >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              EGP {netRev?.toLocaleString()}
                            </span>
                            <span className={`block text-[9px] font-semibold ${marginPercent >= 50 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                              Margin: {marginPercent.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2 py-0.5 text-[8px] font-bold rounded font-mono uppercase ${
                              t.status === 'completed' || t.status === 'delivered' ? 'bg-zinc-900 text-zinc-100 border border-zinc-900' :
                              t.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              t.status === 'pending' ? 'bg-zinc-100 text-zinc-500 border border-zinc-200' :
                              'bg-zinc-500 text-zinc-100 border border-zinc-400'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOwner;
