import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, CheckCircle2, Clock, 
  AlertCircle, Building2, Users, CreditCard, 
  Calendar, Calculator, Landmark, X, ArrowUpRight, 
  ArrowDownLeft, FileText, Check, MoreHorizontal, Wallet
} from 'lucide-react';
import { dbInstance } from '../db/store';
import { 
  OperatingExpense, CostCenter, ExpenseCategoryItem, 
  FreelancerCost, PayrollExpense, AccountingEntry, PaymentMethod, Account
} from '../types';

export default function ExpenseTabs({ isRtl, data }: { isRtl: boolean; data: any }) {
  const [subTab, setSubTab] = useState<'expenses' | 'freelancer' | 'payroll' | 'costcenters' | 'categories' | 'journal'>('expenses');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isPayExpenseOpen, setIsPayExpenseOpen] = useState(false);
  const [selectedExpenseForPay, setSelectedExpenseForPay] = useState<OperatingExpense | null>(null);

  const [isAddFreelancerCostOpen, setIsAddFreelancerCostOpen] = useState(false);
  const [isPayFreelancerCostOpen, setIsPayFreelancerCostOpen] = useState(false);
  const [selectedFreelancerCostForPay, setSelectedFreelancerCostForPay] = useState<FreelancerCost | null>(null);

  const [isAddPayrollOpen, setIsAddPayrollOpen] = useState(false);
  const [isPayPayrollOpen, setIsPayPayrollOpen] = useState(false);
  const [selectedPayrollForPay, setSelectedPayrollForPay] = useState<PayrollExpense | null>(null);

  const [isAddCostCenterOpen, setIsAddCostCenterOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Form States (Operating Expense)
  const [vendor, setVendor] = useState('');
  const [expenseCat, setExpenseCat] = useState('cat-rent');
  const [expenseCc, setExpenseCc] = useState('cc-ops');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'EGP' | 'USD' | 'AED'>('EGP');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseStatus, setExpenseStatus] = useState<'pending' | 'paid'>('pending');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('cash');

  // Form States (Freelancer Cost)
  const [freelancerId, setFreelancerId] = useState('');
  const [flServiceType, setFlServiceType] = useState('Translation');
  const [flCostAmount, setFlCostAmount] = useState('');
  const [flCurrency, setFlCurrency] = useState<'EGP' | 'USD' | 'AED'>('EGP');
  const [flTaskId, setFlTaskId] = useState('');
  const [flProjectId, setFlProjectId] = useState('');
  const [flClientId, setFlClientId] = useState('');
  const [flDueDate, setFlDueDate] = useState('');
  const [flNotes, setFlNotes] = useState('');

  // Form States (Payroll Expense)
  const [employeeId, setEmployeeId] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState(new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  const [basicSalary, setBasicSalary] = useState('');
  const [overtime, setOvertime] = useState('');
  const [bonus, setBonus] = useState('');
  const [commission, setCommission] = useState('');
  const [allowances, setAllowances] = useState('');
  const [deductions, setDeductions] = useState('');
  const [advances, setAdvances] = useState('');
  const [payrollCc, setPayrollCc] = useState('cc-ops');
  const [payrollDept, setPayrollDept] = useState('Operations');

  // Form States (Cost Center / Category)
  const [ccId, setCcId] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccType, setCcType] = useState('departmental');
  const [ccDesc, setCcDesc] = useState('');
  const [ccStatus, setCcStatus] = useState<'active' | 'inactive'>('active');

  const [catName, setCatName] = useState('');
  const [catAccountCode, setCatAccountCode] = useState('5100');
  const [catIsDirectCost, setCatIsDirectCost] = useState(false);
  const [catIsRecurring, setCatIsRecurring] = useState(false);
  const [catStatus, setCatStatus] = useState<'active' | 'inactive'>('active');

  // Disbursement Form states
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const activeUserId = dbInstance.activeProfile?.fullName || 'system';

  // Computed Totals
  const totals = useMemo(() => {
    const outstandingExp = data.expenses
      .filter((e: OperatingExpense) => e.status !== 'paid' && e.status !== 'cancelled')
      .reduce((s: number, e: OperatingExpense) => s + e.amount, 0);

    const outstandingFreelancer = data.freelancerCosts
      .filter((fc: FreelancerCost) => fc.paymentStatus !== 'paid' && fc.paymentStatus !== 'cancelled')
      .reduce((s: number, fc: FreelancerCost) => s + fc.costAmount, 0);

    const outstandingPayroll = data.payrollExpenses
      .filter((p: PayrollExpense) => p.paymentStatus !== 'paid' && p.paymentStatus !== 'cancelled')
      .reduce((s: number, p: PayrollExpense) => s + p.netSalary, 0);

    return {
      outstandingExp,
      outstandingFreelancer,
      outstandingPayroll,
      totalOutstanding: outstandingExp + outstandingFreelancer + outstandingPayroll
    };
  }, [data.expenses, data.freelancerCosts, data.payrollExpenses]);

  // Submit Handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !amount) return;

    // Resolve category name/ID Safely
    const chosenCat = data.expenseCategories.find((c: any) => c.id === expenseCat)?.name || 'Other';

    dbInstance.addExpense({
      vendor,
      category: expenseCat,
      description: description || `${chosenCat} of ${vendor}`,
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

    // Also link costCenterId to the newly added expense manually since dbInstance.addExpense preserves fields
    const latest = dbInstance.expenses[0];
    if (latest) {
      latest.costCenterId = expenseCc;
      latest.cost_center_id = expenseCc;
      dbInstance.save();
    }

    // Reset
    setVendor('');
    setAmount('');
    setDescription('');
    setNotes('');
    setDepartment('');
    setIsAddExpenseOpen(false);
  };

  const handleApproveExpense = (id: string) => {
    dbInstance.approveExpense(id, activeUserId);
  };

  const handlePayExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseForPay) return;
    dbInstance.payExpenseDetailed(selectedExpenseForPay.id, activeUserId, payMethod, payDate);
    setIsPayExpenseOpen(false);
    setSelectedExpenseForPay(null);
  };

  const handleAddFreelancerCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freelancerId || !flCostAmount) return;

    const chosenProfile = data.profiles.find((p: any) => p.id === freelancerId);
    const flName = chosenProfile ? chosenProfile.fullName : freelancerId;

    const newCost: FreelancerCost = {
      id: 'fc-' + Math.random().toString(36).substr(2, 9),
      freelancerId: flName,
      serviceType: flServiceType,
      costAmount: parseFloat(flCostAmount) || 0,
      currency: flCurrency,
      taskId: flTaskId || undefined,
      projectId: flProjectId || undefined,
      clientId: flClientId || undefined,
      paymentStatus: 'pending',
      approvalStatus: 'pending_approval',
      dueDate: flDueDate || undefined,
      notes: flNotes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbInstance.freelancerCosts.unshift(newCost);
    dbInstance.save();

    // Reset
    setFreelancerId('');
    setFlCostAmount('');
    setFlNotes('');
    setFlTaskId('');
    setFlProjectId('');
    setFlClientId('');
    setIsAddFreelancerCostOpen(false);
  };

  const handleApproveFreelancerCost = (id: string) => {
    dbInstance.approveFreelancerCost(id, activeUserId);
  };

  const handlePayFreelancerCostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFreelancerCostForPay) return;
    dbInstance.payFreelancerCost(selectedFreelancerCostForPay.id, payMethod, payDate);
    setIsPayFreelancerCostOpen(false);
    setSelectedFreelancerCostForPay(null);
  };

  const handleAddPayrollLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !basicSalary) return;

    const basic = parseFloat(basicSalary) || 0;
    const ov = parseFloat(overtime) || 0;
    const bon = parseFloat(bonus) || 0;
    const comm = parseFloat(commission) || 0;
    const allow = parseFloat(allowances) || 0;
    const ded = parseFloat(deductions) || 0;
    const adv = parseFloat(advances) || 0;
    const net = (basic + ov + bon + comm + allow) - (ded + adv);

    const chosenEmp = data.profiles.find((p: any) => p.id === employeeId);
    const empName = chosenEmp ? chosenEmp.fullName : employeeId;

    const newPayroll: PayrollExpense = {
      id: 'pr-' + Math.random().toString(36).substr(2, 9),
      employeeId: empName,
      payrollBatchId: 'batch-' + salaryPeriod.toLowerCase().replace(/\s+/g, '-'),
      departmentId: payrollDept,
      costCenterId: payrollCc,
      salaryPeriod,
      basicSalary: basic,
      overtime: ov,
      bonus: bon,
      commission: comm,
      allowances: allow,
      deductions: ded,
      advances: adv,
      netSalary: net,
      paymentStatus: 'draft',
      approvalStatus: 'pending_approval',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbInstance.payrollExpenses.unshift(newPayroll);
    dbInstance.save();

    // Reset
    setEmployeeId('');
    setBasicSalary('');
    setOvertime('');
    setBonus('');
    setCommission('');
    setAllowances('');
    setDeductions('');
    setAdvances('');
    setIsAddPayrollOpen(false);
  };

  const handleApprovePayroll = (id: string) => {
    dbInstance.approvePayrollExpense(id);
  };

  const handlePayPayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollForPay) return;
    dbInstance.payPayrollExpense(selectedPayrollForPay.id, payMethod, payDate);
    setIsPayPayrollOpen(false);
    setSelectedPayrollForPay(null);
  };

  const handleAddCostCenterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccId || !ccName) return;

    const newCc: CostCenter = {
      id: ccId.startsWith('cc-') ? ccId : 'cc-' + ccId,
      name: ccName,
      type: ccType,
      description: ccDesc || undefined,
      status: ccStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbInstance.costCenters.push(newCc);
    dbInstance.save();

    // Reset
    setCcId('');
    setCcName('');
    setCcDesc('');
    setIsAddCostCenterOpen(false);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catAccountCode) return;

    const generatedId = 'cat-' + catName.toLowerCase().replace(/\s+/g, '-');
    const newCat: ExpenseCategoryItem = {
      id: generatedId,
      name: catName,
      accountCode: catAccountCode,
      type: 'expense',
      isDirectCost: catIsDirectCost,
      isRecurring: catIsRecurring,
      status: catStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbInstance.expenseCategories.push(newCat);
    dbInstance.save();

    // Reset
    setCatName('');
    setIsAddCategoryOpen(false);
  };

  // Safe checks for cancellations
  const handleCancelExpense = (id: string) => {
    const exp = dbInstance.expenses.find(e => e.id === id);
    if (exp) {
      exp.status = 'cancelled';
      dbInstance.save();
    }
  };

  const filterList = (list: any[], searchFields: string[]) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item => 
      searchFields.some(field => {
        const val = item[field];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  };

  // Cost Center Budget Spent Aggregator
  const costCenterSpentMap = useMemo(() => {
    const map: any = {};
    // Seed
    data.costCenters.forEach((cc: CostCenter) => {
      map[cc.id] = { opex: 0, fl: 0, payroll: 0, total: 0 };
    });

    // Loop opex
    data.expenses.forEach((e: OperatingExpense) => {
      const ccId = e.costCenterId || e.cost_center_id || 'cc-admin';
      if (!map[ccId]) map[ccId] = { opex: 0, fl: 0, payroll: 0, total: 0 };
      if (e.status === 'paid' || e.status === 'approved') {
        map[ccId].opex += e.amount;
        map[ccId].total += e.amount;
      }
    });

    // Loop freelancer
    data.freelancerCosts.forEach((fc: FreelancerCost) => {
      // Freelancers belong to Operations/Production cc-ops generally
      const ccId = 'cc-ops';
      if (!map[ccId]) map[ccId] = { opex: 0, fl: 0, payroll: 0, total: 0 };
      if (fc.paymentStatus === 'paid' || fc.paymentStatus === 'payable') {
        map[ccId].fl += fc.costAmount;
        map[ccId].total += fc.costAmount;
      }
    });

    // Loop payroll
    data.payrollExpenses.forEach((p: PayrollExpense) => {
      const ccId = p.costCenterId || 'cc-ops';
      if (!map[ccId]) map[ccId] = { opex: 0, fl: 0, payroll: 0, total: 0 };
      if (p.paymentStatus === 'paid' || p.paymentStatus === 'payable') {
        map[ccId].payroll += p.netSalary;
        map[ccId].total += p.netSalary;
      }
    });

    return map;
  }, [data.expenses, data.freelancerCosts, data.payrollExpenses, data.costCenters]);

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            {isRtl ? 'المطلوبات المعلقة' : 'Total Accounts Payable (A/P)'}
          </p>
          <p className="text-2xl font-black text-zinc-900 mt-2 tracking-tight">
            {totals.totalOutstanding.toLocaleString()} <span className="text-xs text-zinc-450 font-medium">EGP Equiv</span>
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            {isRtl ? 'إجمالي الدائنية المستحقة للموردين والموظفين والمترجمين' : 'Sovereign balance of all accrued unpaid liabilities'}
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            {isRtl ? 'أجور المترجمين المستحقة' : 'Freelancer Payables'}
          </p>
          <p className="text-2xl font-black text-rose-650 mt-2 tracking-tight">
            {totals.outstandingFreelancer.toLocaleString()} <span className="text-xs text-rose-950 font-bold">EGP</span>
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            {isRtl ? 'أتعاب المترجمين المعتمدة بانتظار الصرف' : 'Approved translator bills awaiting cash dispersal'}
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            {isRtl ? 'مستحقات كشف الرواتب' : 'Staff Salary Accruals'}
          </p>
          <p className="text-2xl font-black text-indigo-600 mt-2 tracking-tight">
            {totals.outstandingPayroll.toLocaleString()} <span className="text-xs text-indigo-950 font-bold">EGP</span>
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            {isRtl ? 'رواتب الموظفين المعتمدة بانتظار الدفع' : 'Approved employee payroll batch ready for disbursement'}
          </p>
        </div>

        <div className="bg-zinc-950 text-white rounded-3xl p-5 shadow-lg shadow-zinc-100">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            {isRtl ? 'إجمالي قيود اليومية' : 'Accounting Entries Count'}
          </p>
          <p className="text-2xl font-black mt-2 tracking-tight">
            {data.accountingEntries?.length || 0}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            {isRtl ? 'جميع القيود المرحلة تلقائياً لدفتر الأستاذ المزدوج' : 'Double-entry audit logs synchronized to the core GL'}
          </p>
        </div>
      </div>

      {/* Internal Ribbon Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => { setSubTab('expenses'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'expenses' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50'
          }`}
        >
          <Wallet size={14} />
          {isRtl ? 'المصروفات التشغيلية' : 'Operating Expenses'}
        </button>

        <button
          onClick={() => { setSubTab('freelancer'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'freelancer' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50'
          }`}
        >
          <CreditCard size={14} />
          {isRtl ? 'أتعاب المترجمين الخارجيين' : 'Freelancer Costs'}
        </button>

        <button
          onClick={() => { setSubTab('payroll'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'payroll' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50'
          }`}
        >
          <Users size={14} />
          {isRtl ? 'رواتب الموظفين' : 'Staff Payroll'}
        </button>

        <button
          onClick={() => { setSubTab('costcenters'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'costcenters' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50'
          }`}
        >
          <Building2 size={14} />
          {isRtl ? 'مراكز التكلفة' : 'Cost Centers'}
        </button>

        <button
          onClick={() => { setSubTab('categories'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'categories' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50'
          }`}
        >
          <Calculator size={14} />
          {isRtl ? 'تصنيفات الحسابات' : 'Expense Categories'}
        </button>

        <button
          onClick={() => { setSubTab('journal'); setSearchQuery(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'journal' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50'
          }`}
        >
          <Landmark size={14} />
          {isRtl ? 'دفتر اليومية المزدوج' : 'General Journal (G/L)'}
        </button>
      </div>

      {/* Subtab Search Filter Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <input
            type="text"
            placeholder={
              subTab === 'expenses' ? (isRtl ? 'البحث في المصروفات بالوصف أو المورد...' : 'Search expenses by vendor or details...') :
              subTab === 'freelancer' ? (isRtl ? 'البحث عن مترجم أو أتعاب...' : 'Search freelancers by name or task...') :
              subTab === 'payroll' ? (isRtl ? 'البحث في مرتبات الموظفين...' : 'Search payroll by employee name...') :
              subTab === 'costcenters' ? (isRtl ? 'البحث في مراكز التكلفة...' : 'Search cost centers by name or code...') :
              subTab === 'categories' ? (isRtl ? 'البحث في تصنيفات الدائنة...' : 'Search categories by name or code...') :
              (isRtl ? 'البحث في قيود دفتر اليومية بالمذكرات...' : 'Search journal entries by description...')
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'expenses' && (
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus size={14} /> {isRtl ? 'تسجيل قيد مصروف' : 'Log New Expense'}
            </button>
          )}
          {subTab === 'freelancer' && (
            <button
              onClick={() => setIsAddFreelancerCostOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus size={14} /> {isRtl ? 'أتعاب مترجم جديدة' : 'Log Translator Cost'}
            </button>
          )}
          {subTab === 'payroll' && (
            <button
              onClick={() => setIsAddPayrollOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus size={14} /> {isRtl ? 'إدراج خط رواتب' : 'Add Payroll Record'}
            </button>
          )}
          {subTab === 'costcenters' && (
            <button
              onClick={() => setIsAddCostCenterOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus size={14} /> {isRtl ? 'مركز تكلفة جديد' : 'Create Cost Center'}
            </button>
          )}
          {subTab === 'categories' && (
            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus size={14} /> {isRtl ? 'تصنيف مصروف جديد' : 'Create Category'}
            </button>
          )}
        </div>
      </div>

      {/* Main Responsive Tables View */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
        
        {/* SUBTAB 1: OPERATING EXPENSES */}
        {subTab === 'expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead className="bg-zinc-50 text-[10px] text-zinc-400 font-bold uppercase tracking-widest border-b border-zinc-150">
                <tr>
                  <th className="px-6 py-4">{isRtl ? 'المورد والمستحق' : 'Voucher & Payee'}</th>
                  <th className="px-6 py-4">{isRtl ? 'فئة الحساب' : 'COA Category'}</th>
                  <th className="px-6 py-4">{isRtl ? 'مركز التكلفة' : 'Cost Center'}</th>
                  <th className="px-6 py-4">{isRtl ? 'المبلغ الإجمالي' : 'Gross Amount'}</th>
                  <th className="px-6 py-4">{isRtl ? 'الحالة المحاسبية' : 'Book Status'}</th>
                  <th className="px-6 py-4 text-right">{isRtl ? 'إجراءات السداد' : 'Audit Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filterList(data.expenses, ['vendor', 'description', 'category']).map((exp: OperatingExpense) => {
                  const refNo = exp.expenseNumber || ('EXP-' + exp.id.substr(5, 5).toUpperCase());
                  const ccNameMatched = data.costCenters.find((c: any) => c.id === (exp.costCenterId || exp.cost_center_id))?.name || 'Overhead General';
                  const catNameMatched = data.expenseCategories.find((ca: any) => ca.id === exp.category)?.name || exp.category;
                  
                  return (
                    <tr key={exp.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono tracking-tight font-black bg-zinc-100 text-zinc-650 px-1.5 py-0.5 rounded">
                            {refNo}
                          </span>
                          {exp.isRecurring && (
                            <span className="text-[9px] font-semibold bg-blue-50 text-blue-700 px-1.5 rounded">
                              {exp.frequency || 'monthly'}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-zinc-900 text-sm mt-1">{exp.vendor}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{exp.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-[9px] bg-zinc-100/80 text-zinc-700 px-2 py-0.5 rounded uppercase">
                          {catNameMatched}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">
                        {ccNameMatched}
                      </td>
                      <td className="px-6 py-4 font-black text-sm text-zinc-900">
                        {exp.amount.toLocaleString()} <span className="text-[10px] font-bold text-zinc-400">{exp.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          exp.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          exp.status === 'approved' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                          exp.status === 'cancelled' ? 'bg-zinc-150 text-zinc-500' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {exp.status === 'pending' && (
                            <button
                              onClick={() => handleApproveExpense(exp.id)}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              {isRtl ? 'اعتماد الدفع' : 'Approve A/P'}
                            </button>
                          )}
                          {exp.status === 'approved' && (
                            <button
                              onClick={() => {
                                setSelectedExpenseForPay(exp);
                                setIsPayExpenseOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-sm transition-colors cursor-pointer"
                            >
                              {isRtl ? 'صرف مالي' : 'Disburse Outflow'}
                            </button>
                          )}
                          {exp.status !== 'paid' && exp.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelExpense(exp.id)}
                              className="px-2 py-1 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                            >
                              {isRtl ? 'إلغاء' : 'Cancel'}
                            </button>
                          )}
                          {exp.status === 'paid' && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                              <CheckCircle2 size={12} /> {isRtl ? 'تم الصرف بالتاريخ' : 'Settled Ledger'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-400">
                      {isRtl ? 'لا توجد مصروفات مدرجة حاليا' : 'No expenses recorded.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 2: FREELANCER COSTS */}
        {subTab === 'freelancer' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead className="bg-zinc-50 text-[10px] text-zinc-400 font-bold uppercase tracking-widest border-b border-zinc-150">
                <tr>
                  <th className="px-6 py-4">{isRtl ? 'المترجم والمشروع' : 'Freelancer & Project'}</th>
                  <th className="px-6 py-4">{isRtl ? 'نوع الخدمة' : 'Service Narrative'}</th>
                  <th className="px-6 py-4">{isRtl ? 'تاريخ الاستحقاق' : 'Contract Due'}</th>
                  <th className="px-6 py-4">{isRtl ? 'الأتعاب المستحقة' : 'Agreed Cost'}</th>
                  <th className="px-6 py-4">{isRtl ? 'حالة الاعتماد' : 'Approval / Pay'}</th>
                  <th className="px-6 py-4 text-right">{isRtl ? 'إجراء وتدقيق' : 'Verify & Disburse'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filterList(data.freelancerCosts, ['freelancerId', 'serviceType', 'dueDate']).map((fc: FreelancerCost) => (
                  <tr key={fc.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900 text-sm">{fc.freelancerId}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {fc.taskId && (
                          <span className="text-[9px] bg-zinc-100 font-semibold px-1 rounded">Task {fc.taskId}</span>
                        )}
                        {fc.projectId && (
                          <span className="text-[9px] bg-blue-50 text-blue-700 font-semibold px-1 rounded">Proj {fc.projectId}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-500">
                      {fc.serviceType}
                      {fc.notes && <p className="text-[9px] text-zinc-400 font-normal">{fc.notes}</p>}
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-450 text-[11px]">
                      {fc.dueDate || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-black text-sm text-zinc-900">
                      {fc.costAmount.toLocaleString()} <span className="text-[10px] font-bold text-zinc-400">{fc.currency}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                          fc.approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          fc.approvalStatus === 'rejected' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          Appr: {fc.approvalStatus}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                          fc.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          fc.paymentStatus === 'payable' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                          'bg-red-50 text-red-700'
                        }`}>
                          Pay: {fc.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1.5 justify-end">
                        {fc.approvalStatus === 'pending_approval' && (
                          <button
                            onClick={() => handleApproveFreelancerCost(fc.id)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            {isRtl ? 'اعتماد الأتعاب' : 'Approve Bill'}
                          </button>
                        )}
                        {fc.approvalStatus === 'approved' && fc.paymentStatus !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedFreelancerCostForPay(fc);
                              setIsPayFreelancerCostOpen(true);
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-sm transition-colors cursor-pointer"
                          >
                            {isRtl ? 'صرف نقدية' : 'Pay Freelancer'}
                          </button>
                        )}
                        {fc.paymentStatus === 'paid' && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                            <CheckCircle2 size={12} /> {isRtl ? 'تمت التسوية' : 'Settled'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.freelancerCosts?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-400">
                      {isRtl ? 'لا توجد أتعاب مسجلة للمترجمين' : 'No freelancer costs recorded.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 3: EMPLOYEE PAYROLL */}
        {subTab === 'payroll' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead className="bg-zinc-50 text-[10px] text-zinc-400 font-bold uppercase tracking-widest border-b border-zinc-150">
                <tr>
                  <th className="px-6 py-4">{isRtl ? 'الموظف والوظيفة' : 'Employee & Center'}</th>
                  <th className="px-6 py-4">{isRtl ? 'الدورة المالية' : 'Salary Period'}</th>
                  <th className="px-6 py-4">{isRtl ? 'الراتب الأساسي' : 'Breakdown (EGP)'}</th>
                  <th className="px-6 py-4">{isRtl ? 'الصافي المقبوض' : 'Net Salary'}</th>
                  <th className="px-6 py-4">{isRtl ? 'مؤشر الحالة' : 'Status Tags'}</th>
                  <th className="px-6 py-4 text-right">{isRtl ? 'الإجراءات' : 'Audit Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filterList(data.payrollExpenses, ['employeeId', 'salaryPeriod', 'departmentId']).map((p: PayrollExpense) => {
                  const ccMatched = data.costCenters.find((c: any) => c.id === p.costCenterId)?.name || p.costCenterId;
                  
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 text-sm">{p.employeeId}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{p.departmentId} / {ccMatched}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-650">
                        {p.salaryPeriod}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono leading-tight">
                        <div>{isRtl ? 'أساسي:' : 'Base:'} <span className="font-bold text-zinc-805">{p.basicSalary.toLocaleString()}</span></div>
                        <div className="text-[9px]">
                          + {isRtl ? 'إضافي/حوافر:' : 'OT/Bonus:'} {(p.overtime + p.bonus + p.commission).toLocaleString()} | - {isRtl ? 'خصم/سلفة:' : 'Ded/Adv:'} {(p.deductions + p.advances).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-sm text-indigo-700">
                        {p.netSalary.toLocaleString()} <span className="text-[9px] font-bold text-zinc-400">EGP</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                            p.approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            Appr: {p.approvalStatus}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                            p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            p.paymentStatus === 'payable' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                            'bg-red-50 text-red-700'
                          }`}>
                            Pay: {p.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {p.approvalStatus !== 'approved' && (
                            <button
                              onClick={() => handleApprovePayroll(p.id)}
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              {isRtl ? 'اعتماد الراتب' : 'Approve Payroll'}
                            </button>
                          )}
                          {p.approvalStatus === 'approved' && p.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedPayrollForPay(p);
                                setIsPayPayrollOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-sm transition-colors cursor-pointer"
                            >
                              {isRtl ? 'صرف المرتب' : 'Disburse Salary'}
                            </button>
                          )}
                          {p.paymentStatus === 'paid' && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                              <CheckCircle2 size={12} /> {isRtl ? 'مدفوع وموقع دفترياً' : 'Disbursed Logged'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.payrollExpenses?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-400">
                      {isRtl ? 'لا توجد رواتب مسجلة في الدورة الجارية' : 'No payroll registers created.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 4: COST CENTERS */}
        {subTab === 'costcenters' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead className="bg-zinc-50 text-[10px] text-zinc-400 font-bold uppercase tracking-widest border-b border-zinc-150">
                <tr>
                  <th className="px-6 py-4">{isRtl ? 'رمز مركز التكلفة' : 'Cost Center Name & ID'}</th>
                  <th className="px-6 py-4">{isRtl ? 'نوع التصنيف' : 'Classification Type'}</th>
                  <th className="px-6 py-4">{isRtl ? 'البيان الوصفي' : 'Operational Scope'}</th>
                  <th className="px-6 py-4">{isRtl ? 'الحالة التشغيلية' : 'Status'}</th>
                  <th className="px-6 py-4 text-right">{isRtl ? 'المصروفات المركبة الفاعلة' : 'Aggregated Spent (EGP equiv)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filterList(data.costCenters, ['id', 'name', 'type', 'description']).map((cc: CostCenter) => {
                  const spent = costCenterSpentMap[cc.id] || { opex: 0, fl: 0, payroll: 0, total: 0 };
                  
                  return (
                    <tr key={cc.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-mono tracking-tight font-black bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded">
                          {cc.id}
                        </span>
                        <p className="font-extrabold text-zinc-900 text-sm mt-1">{cc.name}</p>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-bold capitalize">
                        {cc.type}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {cc.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          cc.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-450'
                        }`}>
                          {cc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className="font-black text-sm text-zinc-900 block">{spent.total.toLocaleString()} EGP</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Opex: {spent.opex.toLocaleString()} | Trans: {spent.fl.toLocaleString()} | Payroll: {spent.payroll.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 5: EXPENSE CATEGORIES */}
        {subTab === 'categories' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead className="bg-zinc-50 text-[10px] text-zinc-400 font-bold uppercase tracking-widest border-b border-zinc-150">
                <tr>
                  <th className="px-6 py-4">{isRtl ? 'معرف التصنيف' : 'Category Key'}</th>
                  <th className="px-6 py-4">{isRtl ? 'اسم التصنيف وعنوانه' : 'Category Label'}</th>
                  <th className="px-6 py-4">{isRtl ? 'رمز شجرة الحسابات (COA Code)' : 'Target G/L Account Code'}</th>
                  <th className="px-6 py-4">{isRtl ? 'تكلفة مباشرة' : 'Direct Cost Designation'}</th>
                  <th className="px-6 py-4">{isRtl ? 'دورية تكرار' : 'Recurring Billing'}</th>
                  <th className="px-6 py-4 text-right">{isRtl ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filterList(data.expenseCategories, ['id', 'name', 'accountCode']).map((cat: ExpenseCategoryItem) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono tracking-tight font-black bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded">
                        {cat.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-900">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                      Code {cat.accountCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        cat.isDirectCost ? 'bg-orange-50 text-orange-700' : 'bg-zinc-50 text-zinc-400'
                      }`}>
                        {cat.isDirectCost ? (isRtl ? 'تكاليف مباشرة' : 'Direct Cost') : (isRtl ? 'مصرف عمومي' : 'Indirect / Overhead')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-500">
                      {cat.isRecurring ? (isRtl ? 'نعم (دوري)' : 'Yes') : (isRtl ? 'لا (طارئ)' : 'No')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        cat.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
                      }`}>
                        {cat.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 6: JOURNAL JOURNAL LEDGER */}
        {subTab === 'journal' && (
          <div className="overflow-x-auto font-sans text-left">
            <table className="w-full text-xs table-auto">
              <thead className="bg-zinc-950 text-white text-[10px] uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-center">DR / CR Match</th>
                  <th className="px-6 py-4">{isRtl ? 'تاريخ القيد' : 'Post Date'}</th>
                  <th className="px-6 py-4">{isRtl ? 'معرف القيد' : 'Entry Reference'}</th>
                  <th className="px-6 py-4">{isRtl ? 'البيان وشرح القيد' : 'Narrative & Accounts Ledger'}</th>
                  <th className="px-6 py-4 text-right">{isRtl ? 'حركات المدين (Debit)' : 'Debits Dr.'}</th>
                  <th className="px-6 py-4 text-right">{isRtl ? 'حركات الدائن (Credit)' : 'Credits Cr.'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-[11px]">
                {filterList(data.accountingEntries, ['id', 'description', 'date', 'relatedEntityType']).map((entry: AccountingEntry) => {
                  const debitsTotal = entry.debits.reduce((s, d) => s + d.amount, 0);
                  const creditsTotal = entry.credits.reduce((s, c) => s + c.amount, 0);
                  const isBalanced = Math.abs(debitsTotal - creditsTotal) < 0.01;

                  return (
                    <tr key={entry.id} className="hover:bg-zinc-50/35 transition-colors font-mono">
                      <td className="px-6 py-4 text-center">
                        <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[9px] ${
                          isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isBalanced ? '✓' : '!'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-650 font-semibold whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900">{entry.id}</span>
                          <span className="text-[9px] text-zinc-400 uppercase font-black tracking-tight">{entry.relatedEntityType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-xs text-zinc-900 mb-2 font-sans">{entry.description}</p>
                        
                        <div className="space-y-1.5 pl-2 border-l-2 border-zinc-200">
                          {entry.debits.map((d, idx) => {
                            const acc = data.accounts.find((a: any) => a.id === d.accountId || a.code === d.accountId);
                            const accName = acc ? (isRtl ? acc.nameAr : acc.name) : d.accountId;
                            return (
                              <div key={'db-' + idx} className="text-zinc-600 flex items-center justify-between">
                                <span>Dr. <strong className="text-zinc-900 font-bold">{accName}</strong> ({acc?.code || d.accountId})</span>
                                <span className="font-bold font-mono text-zinc-900">{d.amount.toLocaleString()} {d.currency}</span>
                              </div>
                            );
                          })}
                          {entry.credits.map((c, idx) => {
                            const acc = data.accounts.find((a: any) => a.id === c.accountId || a.code === c.accountId);
                            const accName = acc ? (isRtl ? acc.nameAr : acc.name) : c.accountId;
                            return (
                              <div key={'cr-' + idx} className="text-zinc-500 pl-4 flex items-center justify-between">
                                <span>Cr. <span className="text-zinc-800">{accName}</span> ({acc?.code || c.accountId})</span>
                                <span className="font-bold font-mono text-zinc-700">{c.amount.toLocaleString()} {c.currency}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-zinc-900 whitespace-nowrap">
                        {debitsTotal.toLocaleString()} <span className="text-[8px] font-bold text-zinc-400">EGP</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-zinc-550 whitespace-nowrap">
                        {creditsTotal.toLocaleString()} <span className="text-[8px] font-bold text-zinc-400">EGP</span>
                      </td>
                    </tr>
                  );
                })}
                {data.accountingEntries?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-400">
                      {isRtl ? 'لا توجد قيود أستاذ مرحلة بعد' : 'No general double-entry logs committed yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD OPERATING EXPENSE */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden border border-zinc-100 shadow-2xl">
            <div className="bg-zinc-950 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'تسجيل مصروف مالي تشغيلي جديد' : 'Log New Operating Expense'}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{isRtl ? 'تسجيل فاتورة أو التزام دين مالي دفتري ثنائي القيد' : 'Creates dual accounting entries for ledger matching'}</p>
              </div>
              <button onClick={() => setIsAddExpenseOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'المجهر / الدائن' : 'Vendor / Payee'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adobe Creative Cloud, Egypt State Power"
                    value={vendor}
                    onChange={e => setVendor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'المبلغ الإجمالي' : 'Gross Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'العملة المعتمدة' : 'Currency'}</label>
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

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'فئة مصروفات التشغيل' : 'Operational Category'}</label>
                  <select
                    value={expenseCat}
                    onChange={e => setExpenseCat(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                  >
                    {data.expenseCategories.map((cat: ExpenseCategoryItem) => (
                      <option key={cat.id} value={cat.id}>{cat.name} ({cat.accountCode})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'مركز التكلفة التابع' : 'Cost Center'}</label>
                  <select
                    value={expenseCc}
                    onChange={e => setExpenseCc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                  >
                    {data.costCenters.map((cc: CostCenter) => (
                      <option key={cc.id} value={cc.id}>{cc.name} ({cc.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'تاريخ الاستحقاق' : 'Payment Due Date'}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'حالة السداد الأولية' : 'Initial Book Status'}</label>
                  <select
                    value={expenseStatus}
                    onChange={e => setExpenseStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold"
                  >
                    <option value="pending">{isRtl ? 'أجل (قيد دائنية معلق)' : 'Liability / Pending Accrual'}</option>
                    <option value="paid">{isRtl ? 'فوري (مسدد خزينة)' : 'Settled immediately (Asset Outflow)'}</option>
                  </select>
                </div>

                {expenseStatus === 'paid' && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'خزينة الصرف الفوري' : 'Disbursement Vault'}</label>
                    <select
                      value={expensePaymentMethod}
                      onChange={e => setExpensePaymentMethod(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden font-bold bg-emerald-50/20"
                    >
                      <option value="cash">{isRtl ? 'الخزينة النقدية الرئيسية' : 'Main Cash Vault'}</option>
                      <option value="bank_saib">{isRtl ? 'حساب SAIB Bank الجاري' : 'SAIB corporate cash account'}</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الوصف وشرح القيد' : 'Voucher Journal Description'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly cloud server renewal invoice"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="expIsRecurring"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                    className="rounded border-zinc-200 text-zinc-950 h-4 w-4"
                  />
                  <label htmlFor="expIsRecurring" className="text-xs font-bold text-zinc-700 cursor-pointer">
                    {isRtl ? 'تكرار دوري مجدول تلقائيا' : 'Maturity is recurring on intervals'}
                  </label>
                </div>

                {isRecurring && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'دورة التكرار الممنهج' : 'Recurrence Frequency'}</label>
                    <select
                      value={frequency}
                      onChange={e => setFrequency(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                    >
                      <option value="monthly">{isRtl ? 'كل شهر' : 'Monthly interval'}</option>
                      <option value="yearly">{isRtl ? 'كل سنة' : 'Yearly recurrence'}</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'قسم العمليات المتداخلة' : 'Sub department (Optional)'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Technology Production, Staff Office"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'ملاحظات وتوجيهات' : 'Internal Voucher Annotations'}</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Approved under marketing campaigns..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'ترحيل المصروف' : 'Commit Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE OUTFLOW PAYMENT FOR ACCRUED OPEX */}
      {isPayExpenseOpen && selectedExpenseForPay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-205 shadow-2xl">
            <div className="bg-emerald-950 text-white p-6">
              <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'سداد مستند المصرف المعلق' : 'Disburse Opex Outflow'}</h3>
              <p className="text-[10px] text-emerald-300 mt-1">{isRtl ? 'تسوية دين المورد وتحويله لتدفق مالي نقدي خارج' : 'Clears Accounts Payable liability via ledger voucher'}</p>
            </div>

            <form onSubmit={handlePayExpenseSubmit} className="p-6 space-y-4 text-left font-sans">
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 text-xs space-y-2">
                <p className="text-zinc-500">{isRtl ? 'المورد / الدائن:' : 'Payee:'} <span className="font-black text-zinc-900">{selectedExpenseForPay.vendor}</span></p>
                <p className="text-zinc-500">{isRtl ? 'شرح المعاملة:' : 'Voucher details:'} <span className="text-zinc-700">{selectedExpenseForPay.description}</span></p>
                <div className="border-t border-emerald-100/50 pt-2 font-black text-emerald-800 text-sm">
                  {isRtl ? 'المبلغ المستحق الدفع:' : 'Outstanding Payable:'} {selectedExpenseForPay.amount.toLocaleString()} {selectedExpenseForPay.currency}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'خزينة الخروج المالي' : 'Select Bank / Treasury Account'}</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 font-bold"
                >
                  <option value="cash">{isRtl ? 'الخزينة النقدية الرئيسية' : 'Main Cash Treasury'}</option>
                  <option value="bank_saib">{isRtl ? 'حساب SAIB Bank الجاري' : 'SAIB corporate cash account'}</option>
                  <option value="fawry">{isRtl ? 'حساب شبكة فوري (Fawry)' : 'Fawry merchant wallet'}</option>
                  <option value="vodafone_cash">{isRtl ? 'فودافون كاش (Vodafone Cash)' : 'Vodafone cash business line'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'تاريخ الصرف المحاسبي' : 'Action value date'}</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsPayExpenseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'تراجع' : 'Close'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer animate-pulse"
                >
                  {isRtl ? 'إجازة الصرف والشيك' : 'Settle Liability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD FREELANCER AGREEMENT COST */}
      {isAddFreelancerCostOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-zinc-100 shadow-2xl">
            <div className="bg-zinc-950 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'تسجيل أتعاب مترجم خارجي جديدة' : 'Add Freelancer Contract / Task Cost'}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{isRtl ? 'تقييد عقد واجب الدفع في حسابات المترجمين المستحقة' : 'Registers task cost to Translator Cost ledger and payable accounts'}</p>
              </div>
              <button onClick={() => setIsAddFreelancerCostOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFreelancerCost} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'أختر المترجم المعني' : 'Translator Profile'}</label>
                  <select
                    required
                    value={freelancerId}
                    onChange={e => setFreelancerId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 font-bold focus:ring-zinc-950"
                  >
                    <option value="">-- {isRtl ? 'أختر مترجم' : 'Select Translator'} --</option>
                    {data.profiles.filter((p: any) => p.role === 'translator' || p.employeeType === 'freelance').map((p: any) => (
                      <option key={p.id} value={p.id}>{p.fullName} ({p.fullNameAr || p.email})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'شريان الأتعاب المتعاقد عليها' : 'Cost Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1500"
                    value={flCostAmount}
                    onChange={e => setFlCostAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'العملة التعاقدية' : 'Currency'}</label>
                  <select
                    value={flCurrency}
                    onChange={e => setFlCurrency(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 font-bold"
                  >
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="AED">AED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'نوع الخدمة التقنية' : 'Service Type'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. English certified translation of agreement"
                    value={flServiceType}
                    onChange={e => setFlServiceType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'تاريخ الاستحقاق المتعاقد' : 'Contract Due Date'}</label>
                  <input
                    type="date"
                    required
                    value={flDueDate}
                    onChange={e => setFlDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'كود مهمة العمل (Task ID)' : 'Linked Task ID'}</label>
                  <input
                    type="text"
                    placeholder="e.g. task-1002"
                    value={flTaskId}
                    onChange={e => setFlTaskId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'كود المشروع (Project ID)' : 'Project Refer'}</label>
                  <input
                    type="text"
                    placeholder="e.g. proj-124"
                    value={flProjectId}
                    onChange={e => setFlProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'العميل المستفيد (Client)' : 'Beneficiary Client'}</label>
                  <select
                    value={flClientId}
                    onChange={e => setFlClientId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 bg-white"
                  >
                    <option value="">-- {isRtl ? 'أختر العميل' : 'Select Client'} --</option>
                    {data.clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'شروحات وتحفظات' : 'Contract specific notes'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Based on word count rate multiplier..."
                    value={flNotes}
                    onChange={e => setFlNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setIsAddFreelancerCostOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'تسجيل العقد' : 'Commit Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE FREELANCER COST */}
      {isPayFreelancerCostOpen && selectedFreelancerCostForPay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-100 shadow-2xl">
            <div className="bg-emerald-950 text-white p-6">
              <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'صرف أتعاب المترجم' : 'Pay Freelancer Bill'}</h3>
              <p className="text-[10px] text-emerald-300 mt-1">{isRtl ? 'صرف مستحقات وتأكيد خروج الخيار المالي للمترجم' : 'Triggers Accounts Payable debiting & cash/bank crediting'}</p>
            </div>

            <form onSubmit={handlePayFreelancerCostSubmit} className="p-6 space-y-4 text-left">
              <div className="bg-emerald-50/45 border border-emerald-100 rounded-2xl p-4 text-xs space-y-2">
                <p className="text-zinc-500">{isRtl ? 'المترجم الدائن:' : 'Translator:'} <span className="font-extrabold text-zinc-950">{selectedFreelancerCostForPay.freelancerId}</span></p>
                <p className="text-zinc-500">{isRtl ? 'الخدمة اللصيقة:' : 'Job details:'} <span className="text-zinc-700">{selectedFreelancerCostForPay.serviceType}</span></p>
                <div className="border-t border-emerald-110/30 pt-2 font-black text-emerald-800 text-sm">
                  {isRtl ? 'أجمالي الأتعاب المستحقة:' : 'Outstanding Payable:'} {selectedFreelancerCostForPay.costAmount.toLocaleString()} {selectedFreelancerCostForPay.currency}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'حساب الصرف المصرفي' : 'Disbursement Route'}</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 font-bold"
                >
                  <option value="cash">{isRtl ? 'الخزينة النقدية الرئيسية' : 'Main Cash Treasury'}</option>
                  <option value="bank_saib">{isRtl ? 'حساب SAIB Bank الجاري' : 'SAIB corporate cash account'}</option>
                  <option value="vodafone_cash">{isRtl ? 'محفظة فودافون كاش' : 'Vodafone cash business wallet'}</option>
                  <option value="fawry">{isRtl ? 'منافذ دفع فوري' : 'Fawry merchant payout'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'تاريخ الصرف والتحويل المعماري' : 'Value date'}</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsPayFreelancerCostOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'تراجع' : 'Close'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إتمام التحويل الفوري' : 'Disburse Capital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PAYROLL LINE RECORD */}
      {isAddPayrollOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-zinc-105 shadow-2xl animate-in">
            <div className="bg-zinc-950 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'إدراج خط رواتب موظف في كشف الأجور' : 'Add Employee Salary Record'}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{isRtl ? 'إدراج خط رواتب رسمي دوري لحساب الأستاذ المالي للرواتب' : 'Creates payroll expense line mapped to Salaries core index'}</p>
              </div>
              <button onClick={() => setIsAddPayrollOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPayrollLaunch} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الموظف المستفيد' : 'Employee'}</label>
                  <select
                    required
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 font-bold focus:ring-zinc-950"
                  >
                    <option value="">-- {isRtl ? 'أختر موظف' : 'Select Staff'} --</option>
                    {data.profiles.filter((p: any) => p.employeeType === 'staff' || p.role === 'admin' || p.role === 'owner').map((p: any) => (
                      <option key={p.id} value={p.id}>{p.fullName} ({p.fullNameAr || p.email})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الدورة/الفترة المالية للراتب' : 'Salary Period'}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 font-bold"
                    value={salaryPeriod}
                    onChange={e => setSalaryPeriod(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الراتب الأساسي (EGP)' : 'Basic Base Salary'}</label>
                  <input
                    type="number"
                    required
                    placeholder="8500"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                    value={basicSalary}
                    onChange={e => setBasicSalary(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الساعات الإضافية (Overtime)' : 'Overtime'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs"
                    value={overtime}
                    onChange={e => setOvertime(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'المكافآت (Bonus)' : 'Bonuses'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs"
                    value={bonus}
                    onChange={e => setBonus(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'العمولات الحافزة (Commission)' : 'Commissions'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs"
                    value={commission}
                    onChange={e => setCommission(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'البدلات (Allowances)' : 'Allowances'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs"
                    value={allowances}
                    onChange={e => setAllowances(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الخصومات الدورية (Deductions)' : 'Deductions'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs"
                    value={deductions}
                    onChange={e => setDeductions(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'السلف المقدمة (Advances)' : 'Advances'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs"
                    value={advances}
                    onChange={e => setAdvances(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'مركز التكلفة التابع' : 'Cost Center'}</label>
                  <select
                    value={payrollCc}
                    onChange={e => setPayrollCc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 font-bold"
                  >
                    {data.costCenters.map((cc: CostCenter) => (
                      <option key={cc.id} value={cc.id}>{cc.name} ({cc.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الإدارة / القسم' : 'Corporate Department'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Operations, Legal Translation"
                    value={payrollDept}
                    onChange={e => setPayrollDept(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setIsAddPayrollOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إدراج دفتري' : 'Commit Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE PAYROLL SALARIES */}
      {isPayPayrollOpen && selectedPayrollForPay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-100 shadow-2xl">
            <div className="bg-emerald-950 text-white p-6">
              <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'صرف وتدفق الراتب' : 'Disburse Staff Salary'}</h3>
              <p className="text-[10px] text-emerald-300 mt-1">{isRtl ? 'تحويل المعاش المالي لرواتب الموظفين مع تأكيد قيد الخزينة' : 'Posts Dr. Accounts Payable, Cr. Cash & settles ledger'}</p>
            </div>

            <form onSubmit={handlePayPayrollSubmit} className="p-6 space-y-4 text-left font-sans">
              <div className="bg-emerald-50/45 border border-emerald-100 rounded-2xl p-4 text-xs space-y-2">
                <p className="text-zinc-500">{isRtl ? 'الموظف المقبوض الدائن:' : 'Employee Beneficiary:'} <span className="font-extrabold text-zinc-950">{selectedPayrollForPay.employeeId}</span></p>
                <p className="text-zinc-500">{isRtl ? 'الدورة المالية للعمليات:' : 'Settlement cycle:'} <span className="text-zinc-700">{selectedPayrollForPay.salaryPeriod}</span></p>
                <div className="border-t border-emerald-110/30 pt-2 font-black text-emerald-800 text-sm">
                  {isRtl ? 'صافي الراتب المقبوض:' : 'Net Salary Disbursal:'} {selectedPayrollForPay.netSalary.toLocaleString()} EGP
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'قناة الدفع والتمويل' : 'Disbursement Vault'}</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold focus:ring-2 bg-white"
                >
                  <option value="cash">{isRtl ? 'الخزينة النقدية الرئيسية' : 'Main Cash Treasury'}</option>
                  <option value="bank_saib">{isRtl ? 'حساب SAIB Bank الجاري' : 'SAIB corporate cash account'}</option>
                  <option value="vodafone_cash">{isRtl ? 'فودافون كاش (Vodafone Cash)' : 'Vodafone cash business pipeline'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'تاريخ صرف المرتبات المالي' : 'Date of payout'}</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsPayPayrollOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'تراجع' : 'Close'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إخلاء القيمة والصرف' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE COST CENTER */}
      {isAddCostCenterOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-100 shadow-2xl">
            <div className="bg-zinc-950 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'إنشاء مركز تكلفة مالي جديد' : 'Create New Cost Center'}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{isRtl ? 'تقسيم هيكلي مالي للمشروعات والإدارات والعمومية' : 'Allows allocation of expenses to specific operational units'}</p>
              </div>
              <button onClick={() => setIsAddCostCenterOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCostCenterSubmit} className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'الرمز التعريفي (ID)' : 'Unique Cost Center ID'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cc-marketing"
                  value={ccId}
                  onChange={e => setCcId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'اسم مركز التكلفة' : 'Cost Center Label'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Local Marketing Campaigns"
                  value={ccName}
                  onChange={e => setCcName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'نوع التصنيف التشغيلي' : 'Accounting Classification'}</label>
                <select
                  value={ccType}
                  onChange={e => setCcType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 font-bold"
                >
                  <option value="departmental">{isRtl ? 'قسم تشغيلي داخلي' : 'Internal Departmental'}</option>
                  <option value="project">{isRtl ? 'مشاريع متعاقدة محددة' : 'Project-specific allocation'}</option>
                  <option value="overhead">{isRtl ? 'مصاريف عمومية وإدارية' : 'General & Admin Overhead'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'البيان وشرح الغرض' : 'Operational Description'}</label>
                <input
                  type="text"
                  placeholder="e.g. Mapped to marketing events spent..."
                  value={ccDesc}
                  onChange={e => setCcDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'حالة التفعيل والنشاط' : 'Initial Status'}</label>
                <select
                  value={ccStatus}
                  onChange={e => setCcStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold"
                >
                  <option value="active">{isRtl ? 'نشط وفاعل (Active)' : 'Active / Accepting Entries'}</option>
                  <option value="inactive">{isRtl ? 'خامل ومعطل (Inactive)' : 'Inactive / Paused'}</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddCostCenterOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إنشاء مركز التكلفة' : 'Instantiate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE EXPENSE CATEGORY */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-100 shadow-2xl">
            <div className="bg-zinc-950 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">{isRtl ? 'مستند تصنيف حسابات مالي' : 'Log Expense Category'}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{isRtl ? 'إدراج فئة دائنة ومصروفات لربطها بشجرة الحسابات' : 'Creates an expense account mapping class'}</p>
              </div>
              <button onClick={() => setIsAddCategoryOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'اسم فئة المصروف المالي' : 'Category Name / Label'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Stamps & Seals"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'رمز شجرة الحسابات (COA G/L Accounts)' : 'COA Account Mapped'}</label>
                <select
                  value={catAccountCode}
                  onChange={e => setCatAccountCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold"
                >
                  {data.accounts.map((a: Account) => (
                    <option key={a.id} value={a.code}>{a.code} - {isRtl ? a.nameAr : a.name} ({a.type})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="catIsDirectCost"
                  checked={catIsDirectCost}
                  onChange={e => setCatIsDirectCost(e.target.checked)}
                  className="rounded border-zinc-205 text-zinc-950 h-4 w-4"
                />
                <label htmlFor="catIsDirectCost" className="text-xs font-bold text-zinc-705 cursor-pointer">
                  {isRtl ? 'دقيق كتكلفة إنتاجية مباشرة (Direct Cost)' : 'This is a Direct Production Cost (e.g. translator)'}
                </label>
              </div>

              <div className="flex items-center gap-2 py-1 font-sans">
                <input
                  type="checkbox"
                  id="catIsRecur"
                  checked={catIsRecurring}
                  onChange={e => setCatIsRecurring(e.target.checked)}
                  className="rounded border-zinc-205 text-zinc-950 h-4 w-4"
                />
                <label htmlFor="catIsRecur" className="text-xs font-bold text-zinc-705 cursor-pointer">
                  {isRtl ? 'فاتورة بدورية تكرار منتظمة' : 'Invoices in this category are regularly recurring'}
                </label>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">{isRtl ? 'حالة الاعتماد والفاعلية' : 'State'}</label>
                <select
                  value={catStatus}
                  onChange={e => setCatStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold focus:ring-2"
                >
                  <option value="active">{isRtl ? 'نشط ويعتمد قيود (Active)' : 'Active'}</option>
                  <option value="inactive">{isRtl ? 'معطل ومؤرشف (Inactive)' : 'Inactive / Archive'}</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'حفظ التصنيف' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
