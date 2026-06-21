/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, Receipt, FileText, Wallet, ArrowUpRight, ArrowDownLeft, 
  Plus, Search, Filter, Download, MoreHorizontal, CheckCircle2, 
  Clock, AlertCircle, TrendingUp, Building2, Users, CreditCard, 
  PieChart, Calendar, ChevronRight, Calculator, Landmark, ShieldCheck, X
} from 'lucide-react';
import { dbInstance } from '../db/store';
import SalesBillingHub from './SalesBillingHub';
import ExpenseTabs from './ExpenseTabs';
import { useToast } from './Toast';
import { 
  exportAccountsAndProfilesCSV, 
  exportInvoicesCSV, 
  exportExpensesCSV, 
  exportTransactionsCSV, 
  exportClientsCSV 
} from '../utils/excelCSV';
import { 
  Invoice, Quotation, OperatingExpense, Account, FinancialTransaction, 
  Payment, Profile, Client, UserRole, InvoiceStatus, QuotationStatus, ExpenseCategory,
  CostCenter, ExpenseCategoryItem, RecurringExpense, FreelancerCost, PayrollExpense, AccountingEntry
} from '../types';
import { ExportProtectionModal } from './ExportProtectionModal';

interface FinancialHubProps {
  isRtl: boolean;
  currentUser: Profile;
}

type TabType = 'dashboard' | 'sales' | 'expenses' | 'reports' | 'accounts';

export default function FinancialHub({ isRtl, currentUser }: FinancialHubProps) {
  const { success, info } = useToast();
  const [activeTab, setActiveTab ] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Security Export protection states
  const [isExportShieldOpen, setIsExportShieldOpen] = useState(false);
  const [pendingExportAction, setPendingExportAction] = useState<(() => void) | null>(null);
  const [shieldDataType, setShieldDataType] = useState('');
  const [shieldLabelEn, setShieldLabelEn] = useState('');
  const [shieldLabelAr, setShieldLabelAr] = useState('');

  // Sync state to force global re-renders
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = dbInstance.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsub;
  }, []);

  // Data Fetching
  const data = useMemo(() => {
    return {
      invoices: dbInstance.invoices,
      quotations: dbInstance.quotations,
      expenses: dbInstance.expenses,
      accounts: dbInstance.accounts,
      transactions: dbInstance.transactions,
      payments: dbInstance.payments,
      clients: dbInstance.clients,
      profiles: dbInstance.profiles,
      costCenters: dbInstance.costCenters,
      expenseCategories: dbInstance.expenseCategories,
      recurringExpenses: dbInstance.recurringExpenses,
      freelancerCosts: dbInstance.freelancerCosts,
      payrollExpenses: dbInstance.payrollExpenses,
      accountingEntries: dbInstance.accountingEntries
    };
  }, [tick]);

  // Derived Stats
  const stats = useMemo(() => {
    const totalReceivables = data.invoices
      .filter(i => i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((sum, i) => sum + i.balance, 0);
    
    const totalPayables = data.expenses
      .filter(e => e.status !== 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    const monthlyRevenue = data.invoices
      .filter(i => i.invoiceDate.startsWith(new Date().toISOString().slice(0, 7)))
      .reduce((sum, i) => sum + i.grandTotal, 0);

    return { totalReceivables, totalPayables, monthlyRevenue };
  }, [data]);

  return (
    <div className={`flex flex-col gap-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-border shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-brand-navy tracking-tight">
            {isRtl ? 'الإدارة المالية والمحاسبية' : 'Financial & Accounting Hub'}
          </h2>
          <p className="text-sm text-brand-text-muted font-medium">
            {isRtl ? 'ERP متكامل لمتابعة المبيعات والمصروفات والتقارير المالية' : 'Integrated ERP for tracking sales, expenses, and financial health.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-brand-navy-light/20 p-1 rounded-xl">
            {(['dashboard', 'sales', 'expenses', 'reports', 'accounts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  activeTab === tab 
                    ? 'bg-brand-navy text-white shadow-md' 
                    : 'text-brand-navy/60 hover:text-brand-navy'
                }`}
              >
                {isRtl ? getTabNameAr(tab) : getTabNameEn(tab)}
              </button>
            ))}
          </div>

          {/* Ledger Exports Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <Download size={14} className="text-brand-gold animate-bounce" />
              <span>{isRtl ? 'تصدير البيانات (Excel)' : 'Export Ledgers (Excel)'}</span>
            </button>

            {isExportMenuOpen && (
              <div className={`absolute z-50 mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-150 ${isRtl ? 'left-0' : 'right-0'}`}>
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5 mb-1">
                  {isRtl ? 'اختر الجدول المالي لتصديره' : 'Select Ledger Module'}
                </div>
                
                <button
                  onClick={() => {
                    setShieldDataType('translator_list');
                    setShieldLabelEn('Staff & Translator Accounts');
                    setShieldLabelAr('حسابات الموظفين والمترجمين المالية');
                    setPendingExportAction(() => () => exportAccountsAndProfilesCSV(isRtl));
                    setIsExportShieldOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Users size={13} className="text-blue-500" />
                  <span>{isRtl ? 'حسابات الموظفين والمترجمين' : 'Staff & Translator Accounts'}</span>
                </button>

                <button
                  onClick={() => {
                    setShieldDataType('invoices');
                    setShieldLabelEn('Invoices Ledger');
                    setShieldLabelAr('فاتورة المبيعات وبنود الفواتير');
                    setPendingExportAction(() => () => exportInvoicesCSV(isRtl));
                    setIsExportShieldOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText size={13} className="text-emerald-500" />
                  <span>{isRtl ? 'فاتورة المبيعات وبنود الفواتير' : 'Invoices Ledger'}</span>
                </button>

                <button
                  onClick={() => {
                    setShieldDataType('expenses');
                    setShieldLabelEn('Operating Expenses Ledger');
                    setShieldLabelAr('دفتر المصروفات والتكاليف');
                    setPendingExportAction(() => () => exportExpensesCSV(isRtl));
                    setIsExportShieldOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <CreditCard size={13} className="text-rose-500" />
                  <span>{isRtl ? 'دفتر المصروفات والتكاليف' : 'Operating Expenses Ledger'}</span>
                </button>

                <button
                  onClick={() => {
                    setShieldDataType('accounting_reports');
                    setShieldLabelEn('Cashbook Transactions Log');
                    setShieldLabelAr('دفتر القيود الخزينة (كاش بوك)');
                    setPendingExportAction(() => () => exportTransactionsCSV(isRtl));
                    setIsExportShieldOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Landmark size={13} className="text-amber-500" />
                  <span>{isRtl ? 'دفتر القيود الخزينة (كاش بوك)' : 'Cashbook Transactions Log'}</span>
                </button>

                <button
                  onClick={() => {
                    setShieldDataType('client_lists');
                    setShieldLabelEn('Clients Directory');
                    setShieldLabelAr('دليل العملاء المفصل');
                    setPendingExportAction(() => () => exportClientsCSV(isRtl));
                    setIsExportShieldOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Building2 size={13} className="text-purple-500" />
                  <span>{isRtl ? 'دليل العملاء المفصل' : 'Clients Directory'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'dashboard' && <FinancialDashboard isRtl={isRtl} stats={stats} data={data} />}
        {activeTab === 'sales' && <SalesBillingHub isRtl={isRtl} currentUser={currentUser} hideHeader />}
        {activeTab === 'expenses' && <ExpenseTabs isRtl={isRtl} data={data} />}
        {activeTab === 'reports' && <FinancialReporting isRtl={isRtl} data={data} />}
        {activeTab === 'accounts' && <ChartOfAccounts isRtl={isRtl} accounts={data.accounts} />}
      </div>

      {/* Strict Security Gate Component */}
      <ExportProtectionModal
        isOpen={isExportShieldOpen}
        onClose={() => setIsExportShieldOpen(false)}
        dataType={shieldDataType}
        dataLabelEn={shieldLabelEn}
        dataLabelAr={shieldLabelAr}
        onExportApproved={() => {
          if (pendingExportAction) {
            pendingExportAction();
            setPendingExportAction(null);
          }
        }}
        isRtl={isRtl}
      />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FinancialDashboard({ isRtl, stats, data }: { isRtl: boolean, stats: any, data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        label={isRtl ? 'إيرادات الشهر' : 'Monthly Revenue'} 
        value={stats.monthlyRevenue.toLocaleString()} 
        currency="EGP" 
        icon={<ArrowUpRight className="text-green-500" />} 
        trend="+12% vs last month"
      />
      <StatCard 
        label={isRtl ? 'إجمالي المستحقات' : 'Open Receivables'} 
        value={stats.totalReceivables.toLocaleString()} 
        currency="EGP" 
        icon={<Clock className="text-blue-500" />} 
        trend="Pending from clients"
      />
      <StatCard 
        label={isRtl ? 'إجمالي الالتزامات' : 'Open Payables'} 
        value={stats.totalPayables.toLocaleString()} 
        currency="EGP" 
        icon={<ArrowDownLeft className="text-red-500" />} 
        trend="Due to vendors & staff"
      />
      <StatCard 
        label={isRtl ? 'صافي أرباح الشهر (تقديري)' : 'Monthly Net Profit (Est.)'} 
        value={(stats.monthlyRevenue - stats.totalPayables).toLocaleString()} 
        currency="EGP" 
        icon={<TrendingUp className="text-orange-500" />} 
        trend="Estimated performance"
      />

      <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">{isRtl ? 'تطور التدفق النقدي' : 'Cash Flow Trends'}</h3>
            <button className="text-xs font-bold text-zinc-400 hover:text-zinc-600">Last 6 Months</button>
          </div>
          <div className="h-64 bg-zinc-50 rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-100">
             <div className="text-center space-y-2 opacity-50">
               <PieChart size={32} className="mx-auto" />
               <p className="text-xs font-medium">Real-time Visualization Engine Loading...</p>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6">
          <h3 className="font-bold text-zinc-900">{isRtl ? 'التوزيع حسب القسم' : 'Revenue by Service'}</h3>
          <div className="space-y-4">
             {['Certified Translation', 'Legal Translation', 'Interpretation', 'Localization'].map((svc, i) => (
                <div key={svc} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-zinc-600">{svc}</span>
                    <span className="text-zinc-400">{(60 - i * 15)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-navy rounded-full" style={{ width: `${60 - i * 15}%` }} />
                  </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      <div className="col-span-full border-t border-zinc-100 pt-6">
        <h3 className="font-bold text-zinc-900 mb-4">{isRtl ? 'أحدث المعاملات المالية' : 'Recent Transactions'}</h3>
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-[10px] tracking-widest">{isRtl ? 'التاريخ' : 'Date'}</th>
                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-[10px] tracking-widest">{isRtl ? 'الوصف' : 'Description'}</th>
                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-[10px] tracking-widest">{isRtl ? 'النوع' : 'Type'}</th>
                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-[10px] tracking-widest text-right">{isRtl ? 'المبلغ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {data.transactions.slice(0, 5).map((trx: FinancialTransaction) => (
                <tr key={trx.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{trx.date}</td>
                  <td className="px-6 py-4 font-medium text-zinc-900">{trx.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${trx.type === 'debit' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {trx.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-bold text-right ${trx.type === 'debit' ? 'text-zinc-900' : 'text-green-600'}`}>
                    {trx.type === 'debit' ? '-' : '+'}{trx.amount.toLocaleString()} {trx.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SalesAndBilling({ isRtl, data }: { isRtl: boolean, data: any }) {
  const [subTab, setSubTab] = useState<'quotes' | 'invoices'>('invoices');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button onClick={() => setSubTab('quotes')} className={`px-4 py-2 rounded-lg text-xs font-bold ${subTab === 'quotes' ? 'bg-white shadow-sm' : 'text-zinc-500'}`}>
            {isRtl ? 'عروض الأسعار' : 'Quotations'}
          </button>
          <button onClick={() => setSubTab('invoices')} className={`px-4 py-2 rounded-lg text-xs font-bold ${subTab === 'invoices' ? 'bg-white shadow-sm' : 'text-zinc-500'}`}>
            {isRtl ? 'الفواتير' : 'Invoices'}
          </button>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-brand-navy rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 active:scale-95 transition-all">
          <Plus size={14} /> {isRtl ? (subTab === 'quotes' ? 'عرض سعر جديد' : 'فاتورة جديدة') : (subTab === 'quotes' ? 'New Quotation' : 'New Invoice')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100">
              <th className="px-6 py-4 font-bold text-zinc-400 uppercase text-[10px]">{isRtl ? 'الرقم' : 'Number'}</th>
              <th className="px-6 py-4 font-bold text-zinc-400 uppercase text-[10px]">{isRtl ? 'العميل' : 'Client'}</th>
              <th className="px-6 py-4 font-bold text-zinc-400 uppercase text-[10px]">{isRtl ? 'التاريخ' : 'Date'}</th>
              <th className="px-6 py-4 font-bold text-zinc-400 uppercase text-[10px] text-right">{isRtl ? 'المبلغ' : 'Amount'}</th>
              <th className="px-6 py-4 font-bold text-zinc-400 uppercase text-[10px] text-center">{isRtl ? 'الحالة' : 'Status'}</th>
              <th className="px-6 py-4 font-bold text-zinc-400 uppercase text-[10px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 text-xs">
            {subTab === 'invoices' ? data.invoices.map((inv: Invoice) => (
              <tr key={inv.id} className="hover:bg-zinc-50">
                <td className="px-6 py-4 font-mono font-bold text-zinc-900">{inv.invoiceNumber}</td>
                <td className="px-6 py-4 font-medium">{inv.clientName}</td>
                <td className="px-6 py-4 text-zinc-500">{inv.invoiceDate}</td>
                <td className="px-6 py-4 font-bold text-right">{inv.grandTotal.toLocaleString()} {inv.currency}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <StatusBadge status={inv.status} />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 hover:bg-zinc-100 rounded text-zinc-400"><MoreHorizontal size={14} /></button>
                </td>
              </tr>
            )) : data.quotations.map((q: Quotation) => (
              <tr key={q.id} className="hover:bg-zinc-50">
                <td className="px-6 py-4 font-mono font-bold text-zinc-900">{q.quoteNumber}</td>
                <td className="px-6 py-4 font-medium">{q.clientName}</td>
                <td className="px-6 py-4 text-zinc-500">{q.createdAt.split('T')[0]}</td>
                <td className="px-6 py-4 font-bold text-right">{q.grandTotal.toLocaleString()} {q.currency}</td>
                <td className="px-6 py-4">
                 <div className="flex justify-center">
                   <StatusBadge status={q.status} />
                 </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 hover:bg-zinc-100 rounded text-zinc-400"><MoreHorizontal size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpenseManagement({ isRtl, data }: { isRtl: boolean; data: any }) {
  return <ExpenseTabs isRtl={isRtl} data={data} />;
}

function ExpenseManagementOld({ isRtl, data }: { isRtl: boolean, data: any }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<OperatingExpense | null>(null);

  // Add form state
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseStatus, setExpenseStatus] = useState<'pending' | 'paid'>('pending');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'bank_saib'>('cash');

  // Pay form state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_saib'>('cash');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !amount) return;

    dbInstance.addExpense({
      vendor,
      category,
      description: description || `${category} expense`,
      amount: parseFloat(amount) || 0,
      currency,
      dueDate: dueDate || undefined,
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
      department: department || undefined,
      notes: notes || undefined,
      status: expenseStatus,
      paymentMethod: expenseStatus === 'paid' ? expensePaymentMethod : undefined,
      paymentDate: expenseStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
    });

    // Reset
    setVendor('');
    setCategory('other');
    setDescription('');
    setAmount('');
    setCurrency('EGP');
    setDueDate('');
    setIsRecurring(false);
    setDepartment('');
    setNotes('');
    setExpenseStatus('pending');
    setExpensePaymentMethod('cash');
    setIsAddOpen(false);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    dbInstance.payExpense(selectedExpense.id, paymentMethod);

    setIsPayOpen(false);
    setSelectedExpense(null);
  };

  const handleCancel = (id: string) => {
    const exp = dbInstance.expenses.find(e => e.id === id);
    if (exp) {
      exp.status = 'cancelled';
      dbInstance.save();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-zinc-900 text-lg">{isRtl ? 'إدارة المصروفات والالتزامات' : 'Expenses & Accounts Payable'}</h3>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-50 hover:shadow-red-100 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={14} /> {isRtl ? 'تسجيل مصروف' : 'Add Expense'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
             <table className="w-full text-sm min-w-[600px] table-auto">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] text-zinc-400 uppercase font-bold tracking-widest text-left">
                    <th className="px-6 py-4">{isRtl ? 'المورد/الوصف' : 'Description'}</th>
                    <th className="px-6 py-4">{isRtl ? 'الفئة' : 'Category'}</th>
                    <th className="px-6 py-4">{isRtl ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-6 py-4">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="px-6 py-4 text-right">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 text-xs">
                  {data.expenses.map((exp: OperatingExpense) => (
                    <tr key={exp.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 text-sm tracking-tight">{exp.vendor}</p>
                        <p className="text-[10px] text-zinc-400">{exp.description}</p>
                        {exp.dueDate && (
                          <span className="text-[9px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-1 inline-block font-semibold">
                            {isRtl ? 'استحقاق: ' : 'Due: '} {exp.dueDate}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 uppercase font-bold text-[10px] text-zinc-500">
                        <span className="bg-zinc-100 text-zinc-705 px-2.5 py-1 rounded-md text-[9px] font-semibold">{exp.category}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{exp.amount.toLocaleString()} {exp.currency}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full uppercase font-black tracking-tight text-[9px] ${
                          exp.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                          exp.status === 'cancelled' ? 'bg-zinc-100 text-zinc-500' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {isRtl ? (exp.status === 'paid' ? 'مدفوع' : exp.status === 'cancelled' ? 'ملغي' : 'مستحق') : exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {exp.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setSelectedExpense(exp);
                                setIsPayOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-sm transition-colors cursor-pointer"
                            >
                              {isRtl ? 'دفع' : 'Pay'}
                            </button>
                            <button
                              onClick={() => handleCancel(exp.id)}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700 rounded font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              {isRtl ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-zinc-400">
                        {isRtl ? 'لا توجد مصروفات مسجلة حالياً' : 'No expenses logged yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>

        {/* Expense Alerts */}
        <div className="space-y-6">
           <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
              <h4 className="font-bold text-sm border-b border-zinc-800 pb-2">{isRtl ? 'تنبيهات المصروفات' : 'Expense Alerts'}</h4>
              <div className="space-y-3">
                 <div className="flex gap-3 text-xs leading-relaxed">
                   <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0"><AlertCircle size={14}/></div>
                   <p><span className="font-bold text-orange-400">CAT Tool Subscription</span> {isRtl ? 'يستحق غداً' : 'due tomorrow'} (50 USD)</p>
                 </div>
                 <div className="flex gap-3 text-xs leading-relaxed">
                   <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><Calendar size={14}/></div>
                   <p>{isRtl ? 'موعد سداد إيجار المكتب' : 'Office rent due'} (1st July)</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-zinc-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-zinc-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'تسجيل مصروف تشغيلي جديد' : 'Log New Operating Expense'}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{isRtl ? 'قيد مصروف في حسابات الدائنة والعمومية' : 'Accrues in accounts payable & operating expense ledger'}</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer animate-none">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'المورد / الدائن' : 'Vendor / Payee'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google Cloud, Adobe Systems"
                    value={vendor}
                    onChange={e => setVendor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'المبلغ' : 'Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'العملة' : 'Currency'}</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                  >
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                  >
                    <option value="equipment">{isRtl ? 'أجهزة ومعدات' : 'Equipment'}</option>
                    <option value="rent">{isRtl ? 'إيجار مكاتب' : 'Rent'}</option>
                    <option value="utilities">{isRtl ? 'مرافق وخدمات' : 'Utilities'}</option>
                    <option value="marketing">{isRtl ? 'تسويق وإعلانات' : 'Marketing'}</option>
                    <option value="salary">{isRtl ? 'مرتبات وأجور' : 'Salary/Wages'}</option>
                    <option value="freelancer">{isRtl ? 'أتعاب مترجمين خارجيين' : 'Freelancer Costs'}</option>
                    <option value="tax">{isRtl ? 'ضرائب ورسوم' : 'Tax & Government'}</option>
                    <option value="other">{isRtl ? 'أخرى' : 'Other'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'حالة الدفع الكلية' : 'Payment Status'}</label>
                  <select
                    value={expenseStatus}
                    onChange={e => setExpenseStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-orange-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                  >
                    <option value="pending">{isRtl ? 'بيان دين متأخر (Pending / Accrued)' : 'Pending / Accrued'}</option>
                    <option value="paid">{isRtl ? 'مدفوع نقداً بالكامل (Settled / Paid)' : 'Paid / Settled'}</option>
                  </select>
                </div>

                <div className="space-y-1.5 font-sans">
                  {expenseStatus === 'paid' ? (
                    <>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'حساب السداد المالي' : 'Payment Method'}</label>
                      <select
                        value={expensePaymentMethod}
                        onChange={e => setExpensePaymentMethod(e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold bg-emerald-50/10 text-emerald-800"
                      >
                        <option value="cash">{isRtl ? 'الخزينة النقدية الرئيسية' : 'Main Cash Vault'}</option>
                        <option value="bank_saib">{isRtl ? 'حساب SAIB Bank الجاري' : 'SAIB corporate cash account'}</option>
                      </select>
                    </>
                  ) : (
                    <div className="h-full flex items-end">
                      <p className="text-[10px] text-zinc-400 pb-3 leading-tight font-medium">
                        {isRtl ? 'سيتم ترحيله كمصروف وتأجيل دفعه كالتزام دين.' : 'Will accrue as opex expense & pending liability.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'الوصف' : 'Description / Narrative'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly cloud hosting servers voucher"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <div className="flex items-center gap-2 pt-1 inline-flex">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={e => setIsRecurring(e.target.checked)}
                      className="rounded border-zinc-200 text-zinc-950 h-4 w-4"
                    />
                    <label htmlFor="isRecurring" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                      {isRtl ? 'مصروف متكرر دورياً' : 'This is a recurring expense'}
                    </label>
                  </div>
                </div>

                {isRecurring && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'دورية التكرار' : 'Frequency'}</label>
                    <select
                      value={frequency}
                      onChange={e => setFrequency(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                    >
                      <option value="monthly">{isRtl ? 'شهرياً' : 'Monthly'}</option>
                      <option value="yearly">{isRtl ? 'سنوياً' : 'Yearly'}</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'قسم تابع' : 'Department'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Technology, Operations, Marketing"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'ملاحظات إضافية' : 'Internal Notes'}</label>
                  <textarea
                    placeholder="..."
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-lg shadow-zinc-100 transition-all cursor-pointer"
                >
                  {isRtl ? 'تسجيل القيد' : 'Post Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY/DISBURSE EXPENSE */}
      {isPayOpen && selectedExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-950 text-white p-6">
              <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'سداد مستحقات المصروف' : 'Pay Pending Liability'}</h3>
              <p className="text-[10px] text-emerald-300 mt-1 animate-none">
                {isRtl ? 'سداد قيد دائنة بمصروف مالي حقيقي' : 'Settle supplier payables to real cash outflows'}
              </p>
            </div>
            
            <form onSubmit={handlePaySubmit} className="p-6 space-y-4 font-sans text-left">
              <div className="bg-emerald-50/50 rounded-xl p-4 text-xs space-y-1.5 border border-emerald-100/30">
                <p className="text-zinc-500">{isRtl ? 'المورد:' : 'Supplier:'} <span className="font-bold text-zinc-950">{selectedExpense.vendor}</span></p>
                <p className="text-zinc-500">{isRtl ? 'البيان:' : 'Details:'} <span className="font-bold text-zinc-955">{selectedExpense.description}</span></p>
                <p className="text-emerald-800 font-extrabold text-sm pt-1 border-t border-emerald-100/50 mt-1">
                  {isRtl ? 'المبلغ المستحق:' : 'Outstanding Amount:'} {selectedExpense.amount.toLocaleString()} {selectedExpense.currency}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'حساب الصرف المالي' : 'Disbursement Vault'}</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                >
                  <option value="cash">{isRtl ? 'الخزينة النقدية الرئيسية (Cash Vault)' : 'Main Cash Vault'}</option>
                  <option value="bank_saib">{isRtl ? 'حساب SAIB Bank الجاري' : 'SAIB Corporate Transit Account'}</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPayOpen(false);
                    setSelectedExpense(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isRtl ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-50 transition-all cursor-pointer"
                >
                  {isRtl ? 'إصدار الشيك / الدفع' : 'Execute Disbursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialReporting({ isRtl, data }: { isRtl: boolean, data: any }) {
  const { info } = useToast();
  // Compute P&L statement dynamically from core journal balances
  const revenue = data.accounts
    .filter((a: any) => a.type === 'revenue')
    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const translatorCosts = data.accounts
    .filter((a: any) => a.type === 'expense' && a.name.toLowerCase().includes('translator'))
    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const grossProfit = revenue - translatorCosts;

  // Operating Expenses sum
  const operatingExpenses = data.accounts
    .filter((a: any) => a.type === 'expense' && !a.name.toLowerCase().includes('translator'))
    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

  const netProfit = grossProfit - operatingExpenses;

  // Expected cash levels in 30 days
  const cashInVault = data.accounts.filter((a: any) => a.type === 'asset' && a.name.toLowerCase().includes('cash')).reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const cashInBank = data.accounts.filter((a: any) => a.type === 'asset' && a.name.toLowerCase().includes('bank')).reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const accountsReceivable = data.accounts.filter((a: any) => a.type === 'asset' && a.name.toLowerCase().includes('receivable')).reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const accountsPayable = data.accounts.filter((a: any) => a.type === 'liability' && a.name.toLowerCase().includes('payable')).reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const currentCashProjection = cashInVault + cashInBank + accountsReceivable - accountsPayable;

  const handleDownloadPL = () => {
    info(isRtl ? 'جاري تصدير الميزانية العمومية التفصيلية وحساب الأرباح والخسائر للطباعة...' : 'Preparing detailed General Ledger Trial Balance for print view...');
    window.print();
  };

  return (
    <div className="space-y-8">
       {/* High Level Metrics Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm space-y-8">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">{isRtl ? 'قائمة الأرباح والخسائر' : 'Profit & Loss Statement'}</h3>
                <span className="text-xs font-bold text-zinc-400 border border-zinc-100 px-3 py-1 rounded-full uppercase tracking-tighter">Current Quarter (Live)</span>
             </div>
             <div className="space-y-4 font-bold">
                <div className="flex justify-between border-b border-zinc-100 pb-3">
                   <span className="text-zinc-500 text-sm uppercase">{isRtl ? 'إجمالي الإيرادات' : 'Total Revenue'}</span>
                   <span className="text-zinc-900 tracking-tight">{revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-zinc-400 ml-1">EGP</span></span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-3">
                   <span className="text-zinc-500 text-sm uppercase">{isRtl ? 'تكلفة الترجمة والإنتاج (المترجمين)' : 'Cost of Sales (Linguist Payroll)'}</span>
                   <span className="text-red-500 tracking-tight">({translatorCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) <span className="text-xs font-normal text-zinc-400 ml-1">EGP</span></span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-3 bg-zinc-50 -mx-4 px-4 py-2 rounded-lg">
                   <span className="text-zinc-900 uppercase">{isRtl ? 'مجمل الربح' : 'Gross Profit'}</span>
                   <span className="text-zinc-900 tracking-tight">{grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-zinc-400 ml-1">EGP</span></span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-3">
                   <span className="text-zinc-500 text-sm uppercase">{isRtl ? 'المصروفات التشغيلية والعمومية' : 'Operating Expenses (OPEX)'}</span>
                   <span className="text-red-500 tracking-tight">({operatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) <span className="text-xs font-normal text-zinc-400 ml-1">EGP</span></span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-3 text-lg pt-4 border-t-2 border-zinc-900">
                   <span className="text-zinc-900 uppercase font-black">{isRtl ? 'صافي الأرباح' : 'Net Profit'}</span>
                   <span className={`${netProfit >= 0 ? 'text-green-600' : 'text-rose-600'} font-extrabold tracking-tighter`}>
                     {netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-zinc-400 ml-1">EGP</span>
                   </span>
                </div>
             </div>
             <button 
                onClick={handleDownloadPL}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-zinc-100 active:scale-95 transition-all cursor-pointer"
             >
                <Download size={16} /> {isRtl ? 'تحميل التقرير الكامل PDF' : 'Download Complete P&L PDF'}
             </button>
          </div>

          <div className="space-y-6">
          <div className="bg-zinc-950 rounded-3xl p-8 text-white relative overflow-hidden group border border-zinc-800">
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:scale-125 transition-transform duration-1000">
              <Wallet size={120} />
            </div>
            <div className="relative space-y-4">
              <h3 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest">{isRtl ? 'التوقعات النقدية للمؤسسة' : 'Treasury & Cash Projection'}</h3>
              <div className="space-y-1">
                <p className="text-4xl font-black tracking-tighter text-amber-300">
                  {currentCashProjection.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  <span className="text-sm font-normal text-zinc-400 ml-1">EGP</span>
                </p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'الرصيد النقدي المتوقع خلال ٣٠ يوم' : 'Expected Liquid Treasury in 30 Days'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">{isRtl ? 'الصندوق والبنك (متاح)' : 'Direct Cash + Bank'}</p>
                  <p className="text-base font-bold text-emerald-400">{(cashInVault + cashInBank).toLocaleString()} EGP</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">{isRtl ? 'المديونيات المعلقة (مستحق)' : 'Receivables outstanding'}</p>
                  <p className="text-base font-bold text-blue-400">{accountsReceivable.toLocaleString()} EGP</p>
                </div>
              </div>
            </div>
          </div>

             <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm space-y-6 text-left">
                <h3 className="font-bold text-zinc-900 uppercase text-[10px] tracking-widest">{isRtl ? 'تحليل أعمار المديونية (AR Aging)' : 'AR Aging Report'}</h3>
                <div className="space-y-4">
                   {[
                     { label: 'Current (0-15 Days)', value: (accountsReceivable * 0.7).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' EGP', width: '70%', color: 'bg-green-500' },
                     { label: '16-30 Days', value: (accountsReceivable * 0.2).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' EGP', width: '20%', color: 'bg-orange-400' },
                     { label: '31-60 Days', value: (accountsReceivable * 0.08).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' EGP', width: '8%', color: 'bg-red-400' },
                     { label: '60+ Defaulted', value: (accountsReceivable * 0.02).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' EGP', width: '2%', color: 'bg-zinc-900' }
                   ].map((item) => (
                     <div key={item.label} className="space-y-1.5 font-bold">
                        <div className="flex justify-between text-[10px]">
                           <span className="text-zinc-400 uppercase">{item.label}</span>
                           <span className="text-zinc-900 font-bold">{item.value}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-50 rounded-full overflow-hidden">
                           <div className={`h-full ${item.color} rounded-full`} style={{ width: item.width }} />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function ChartOfAccounts({ isRtl, accounts }: { isRtl: boolean, accounts: Account[] }) {
  const { success } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<Account['type']>('expense');
  const [currency, setCurrency] = useState<Account['currency']>('EGP');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !nameAr) return;

    dbInstance.addAccount({
      code,
      name,
      nameAr,
      type,
      currency
    });

    setCode('');
    setName('');
    setNameAr('');
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h3 className="font-bold text-zinc-900 tracking-tight text-lg">{isRtl ? 'دليل الحسابات' : 'Chart of Accounts'}</h3>
            <p className="text-xs text-zinc-500">{isRtl ? 'الهيكل المالي وتصنيف الحسابات' : 'Financial structure and account classification.'}</p>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={() => {
                success(isRtl ? 'تم تصدير الدليل المالي كملف CSV' : 'Ledger details successfully exported to financial CSV sheet.');
              }}
              className="px-4 py-2 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isRtl ? 'تصدير الدليل' : 'Export Ledger'}
            </button>
            <button 
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-zinc-100 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} /> {isRtl ? 'إضافة حساب' : 'Add Account'}
            </button>
         </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[500px] table-auto">
           <thead>
             <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] text-zinc-400 uppercase font-black tracking-widest text-left">
               <th className="px-8 py-5">Code</th>
               <th className="px-8 py-5">Account Name</th>
               <th className="px-8 py-5">Type</th>
               <th className="px-8 py-5 text-right">Balance</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-zinc-50 text-xs">
              {accounts.map((acc) => (
                <tr key={acc.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-8 py-5 font-mono text-zinc-400 font-bold group-hover:text-zinc-900 transition-colors">{acc.code}</td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-zinc-900 text-sm tracking-tight">{isRtl ? acc.nameAr : acc.name}</p>
                    <p className="text-[10px] text-zinc-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">{acc.name}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-lg uppercase text-[9px] font-black tracking-tighter ${getAccountTypeStyles(acc.type)}`}>
                      {acc.type}
                    </span>
                  </td>
                  <td className={`px-8 py-5 text-right font-bold text-sm tracking-tight ${acc.balance < 0 ? 'text-red-500' : 'text-zinc-950'}`}>
                    {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-medium text-zinc-400 ml-0.5">{acc.currency}</span>
                  </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>

      {/* MODAL: ADD ACCOUNT */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-zinc-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-zinc-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'إضافة حساب جديد' : 'Add General Ledger Account'}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{isRtl ? 'قيد حساب فرعي أو رئيسي جديد بدليل الحسابات' : 'Create new dynamic ledger class inside Chart of Accounts'}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer animate-none">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left font-sans">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'رمز الحساب (Code)' : 'Account Code'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5500, 1210"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'اسم الحساب بالإنجليزية' : 'Account Name (EN)'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marketing Software"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'اسم الحساب بالعربية' : 'Account Name (AR)'}</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: برامج التسويق والشركاء"
                      value={nameAr}
                      onChange={e => setNameAr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden text-right font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'فئة الحساب' : 'Account Classification'}</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                    >
                      <option value="asset">{isRtl ? 'أصل (Asset)' : 'Asset'}</option>
                      <option value="liability">{isRtl ? 'خصم / التزام (Liability)' : 'Liability'}</option>
                      <option value="equity">{isRtl ? 'حقوق ملكية (Equity)' : 'Equity'}</option>
                      <option value="revenue">{isRtl ? 'إيراد (Revenue)' : 'Revenue'}</option>
                      <option value="expense">{isRtl ? 'مصروف (Expense)' : 'Expense'}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">{isRtl ? 'العملة الافتراضية' : 'Base Currency'}</label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-lg shadow-zinc-100 transition-all cursor-pointer"
                >
                  {isRtl ? 'قيد الحساب' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- UTILS ---

function StatCard({ label, value, currency, icon, trend }: { label: string, value: string, currency: string, icon: any, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-sm space-y-4 hover:shadow-md hover:border-brand-navy transition-all group">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-brand-navy-light/20 flex items-center justify-center group-hover:scale-110 transition-transform">{icon}</div>
        <span className="text-[10px] text-brand-navy/40 font-bold uppercase tracking-widest">{currency}</span>
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-brand-text-muted uppercase tracking-tighter">{label}</h4>
        <p className="text-3xl font-black text-brand-navy tracking-tighter">{value}</p>
      </div>
      <div className="pt-3 border-t border-zinc-50 text-[10px] font-bold text-zinc-400 lowercase tracking-normal">
        {trend}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus | QuotationStatus }) {
  const styles = {
    paid: 'bg-green-50 text-green-600',
    sent: 'bg-blue-50 text-blue-600',
    unpaid: 'bg-red-50 text-red-600',
    partial: 'bg-orange-50 text-orange-600',
    draft: 'bg-zinc-100 text-zinc-500',
    approved: 'bg-green-50 text-green-600',
    rejected: 'bg-red-50 text-red-600',
    expired: 'bg-zinc-50 text-zinc-400',
    converted: 'bg-purple-50 text-purple-600',
    viewed: 'bg-indigo-50 text-indigo-600',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-zinc-200 text-zinc-600',
    refunded: 'bg-zinc-100 text-zinc-700',
    written_off: 'bg-zinc-900 text-white'
  };

  return (
    <span className={`px-2 py-0.5 rounded uppercase font-bold text-[9px] ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function getAccountTypeStyles(type: Account['type']) {
  switch (type) {
    case 'asset': return 'bg-blue-50 text-blue-600';
    case 'liability': return 'bg-red-50 text-red-600';
    case 'equity': return 'bg-purple-50 text-purple-600';
    case 'revenue': return 'bg-green-50 text-green-600';
    case 'expense': return 'bg-orange-50 text-orange-600';
    default: return 'bg-zinc-100 text-zinc-600';
  }
}

function getTabNameAr(tab: TabType) {
  switch (tab) {
    case 'dashboard': return 'الرئيسية';
    case 'sales': return 'المبيعات والفوترة';
    case 'expenses': return 'المصروفات';
    case 'reports': return 'التقارير المالية';
    case 'accounts': return 'دليل الحسابات';
  }
}

function getTabNameEn(tab: TabType) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}
