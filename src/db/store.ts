/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Profile, Client, Task, TaskAssignment, Quotation, Payment, 
  TranslatorMonthlySummary, ClientReceivableRecord, StaffLiability, 
  MonthlyClosing, SalaryAttendance, Notification, UserRole, PaymentMethod, TaskAttachment,
  LetterheadTemplate, StampAsset, LayoutPreset, PdfExportLog, FeedbackEntry,
  Invoice, PurchaseOrder, VendorPayable, OperatingExpense, Account, FinancialTransaction, IntakeChannel,
  Lead, LeadActivity, LeadStage, QuotationStatus, ExportApprovalRequest, SecurityAuditLog,
  TaskAccountingRecord, TaskPaymentAuditLog, Branch,
  CostCenter, ExpenseCategoryItem, RecurringExpense, FreelancerCost, PayrollExpense, AccountingEntry
} from '../types';
const AUTH_TOKEN_KEY = 'gtms_auth_token';

export class GTMSDatabase {
  profiles: Profile[] = [];
  branches: Branch[] = [];
  clients: Client[] = [];
  tasks: Task[] = [];
  assignments: TaskAssignment[] = [];
  quotations: Quotation[] = [];
  invoices: Invoice[] = [];
  purchaseOrders: PurchaseOrder[] = [];
  payments: Payment[] = [];
  vendorPayables: VendorPayable[] = [];
  expenses: OperatingExpense[] = [];
  costCenters: CostCenter[] = [];
  expenseCategories: ExpenseCategoryItem[] = [];
  recurringExpenses: RecurringExpense[] = [];
  freelancerCosts: FreelancerCost[] = [];
  payrollExpenses: PayrollExpense[] = [];
  accountingEntries: AccountingEntry[] = [];
  accounts: Account[] = [];
  transactions: FinancialTransaction[] = [];
  receivables: ClientReceivableRecord[] = [];
  liabilities: StaffLiability[] = [];
  closings: MonthlyClosing[] = [];
  attendance: SalaryAttendance[] = [];
  notifications: Notification[] = [];
  letterheads: LetterheadTemplate[] = [];
  stamps: StampAsset[] = [];
  presets: LayoutPreset[] = [];
  pdfLogs: PdfExportLog[] = [];
  feedback: FeedbackEntry[] = [];
  leads: Lead[] = [];
  leadActivities: LeadActivity[] = [];
  automationRules: any[] = []; // Using any for now to avoid import issues if not synced
  hrLeaves: any[] = [];
  hrCandidates: any[] = [];
  hrOvertimes: any[] = [];
  hrDisciplinary: any[] = [];
  hrPolicies: any[] = [];
  hrDocuments: any[] = [];
  currentRole: UserRole = 'owner';
  activeProfile: Profile | null = null;
  brandConfig: any = null;
  exportRequests: ExportApprovalRequest[] = [];
  securityLogs: SecurityAuditLog[] = [];
  taskAccountingRecords: TaskAccountingRecord[] = [];
  taskPaymentAuditLogs: TaskPaymentAuditLog[] = [];
  whatsappSettings: any = null;
  whatsappChats: any[] = [];
  whatsappTemplates: any[] = [];

  private listeners: (() => void)[] = [];
  private authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  constructor() {
    this.initializeEmptyState();
    if (this.authToken) {
      this.fetchFromServer();
    }
  }

  private isPushing = false;
  private hasPendingPush = false;

  private initializeEmptyState() {
    this.profiles = [];
    this.branches = this.getInitialBranches();
    this.clients = [];
    this.hrLeaves = [];
    this.hrCandidates = this.getInitialHrCandidates();
    this.hrOvertimes = [];
    this.hrDisciplinary = [];
    this.hrPolicies = this.getInitialHrPolicies();
    this.hrDocuments = this.getInitialHrDocuments();
    this.tasks = [];
    this.assignments = [];
    this.quotations = [];
    this.invoices = [];
    this.purchaseOrders = [];
    this.payments = [];
    this.vendorPayables = [];
    this.expenses = [];
    this.costCenters = [];
    this.expenseCategories = [];
    this.recurringExpenses = [];
    this.freelancerCosts = [];
    this.payrollExpenses = [];
    this.accountingEntries = [];
    this.accounts = [];
    this.transactions = [];
    this.receivables = [];
    this.liabilities = [];
    this.closings = [];
    this.attendance = [];
    this.notifications = [];
    this.letterheads = [];
    this.stamps = [];
    this.presets = [];
    this.pdfLogs = [];
    this.feedback = [];
    this.leads = [];
    this.leadActivities = [];
    this.automationRules = [];
    this.brandConfig = null;
    this.exportRequests = [];
    this.securityLogs = [];
    this.taskAccountingRecords = [];
    this.taskPaymentAuditLogs = [];
    this.whatsappSettings = null;
    this.whatsappChats = [];
    this.whatsappTemplates = [];
    this.currentRole = 'owner';
    this.activeProfile = null;
  }

  private authHeaders() {
    return this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('gtms_logged_in_id');
      this.initializeEmptyState();
      this.listeners.forEach(listen => listen());
    }
  }

  getAuthToken() {
    return this.authToken;
  }

  async login(identifier: string, password: string): Promise<Profile> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Authentication failed.');
    }

    this.setAuthToken(data.token);
    this.activeProfile = data.user;
    this.currentRole = data.user.role;
    await this.fetchFromServer();
    return data.user;
  }

  async verifyPassword(password: string, userId?: string): Promise<boolean> {
    const response = await fetch('/api/auth/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ password, userId })
    });
    const data = await response.json();
    return response.ok && !!data.success;
  }

  serialize() {
    return {
      profiles: this.profiles,
      clients: this.clients,
      tasks: this.tasks,
      assignments: this.assignments,
      quotations: this.quotations,
      invoices: this.invoices,
      purchaseOrders: this.purchaseOrders,
      payments: this.payments,
      vendorPayables: this.vendorPayables,
      expenses: this.expenses,
      costCenters: this.costCenters,
      expenseCategories: this.expenseCategories,
      recurringExpenses: this.recurringExpenses,
      freelancerCosts: this.freelancerCosts,
      payrollExpenses: this.payrollExpenses,
      accountingEntries: this.accountingEntries,
      accounts: this.accounts,
      transactions: this.transactions,
      receivables: this.receivables,
      liabilities: this.liabilities,
      closings: this.closings,
      attendance: this.attendance,
      notifications: this.notifications,
      letterheads: this.letterheads,
      stamps: this.stamps,
      presets: this.presets,
      pdfLogs: this.pdfLogs,
      feedback: this.feedback,
      leads: this.leads,
      leadActivities: this.leadActivities,
      automationRules: this.automationRules,
      brandConfig: this.brandConfig,
      exportRequests: this.exportRequests,
      securityLogs: this.securityLogs,
      taskAccountingRecords: this.taskAccountingRecords,
      taskPaymentAuditLogs: this.taskPaymentAuditLogs,
      whatsappSettings: this.whatsappSettings,
      whatsappChats: this.whatsappChats,
      whatsappTemplates: this.whatsappTemplates,
      branches: this.branches,
      hrLeaves: this.hrLeaves,
      hrCandidates: this.hrCandidates,
      hrOvertimes: this.hrOvertimes,
      hrDisciplinary: this.hrDisciplinary,
      hrPolicies: this.hrPolicies,
      hrDocuments: this.hrDocuments
    };
  }

  deserialize(data: any) {
    if (!data) return;
    if (data.profiles && Array.isArray(data.profiles)) this.profiles = data.profiles;
    if (data.clients && Array.isArray(data.clients)) this.clients = data.clients;
    if (data.tasks && Array.isArray(data.tasks)) this.tasks = data.tasks;
    if (data.assignments && Array.isArray(data.assignments)) this.assignments = data.assignments;
    if (data.quotations && Array.isArray(data.quotations)) this.quotations = data.quotations;
    if (data.invoices && Array.isArray(data.invoices)) this.invoices = data.invoices;
    if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) this.purchaseOrders = data.purchaseOrders;
    if (data.payments && Array.isArray(data.payments)) this.payments = data.payments;
    if (data.vendorPayables && Array.isArray(data.vendorPayables)) this.vendorPayables = data.vendorPayables;
    if (data.expenses && Array.isArray(data.expenses)) this.expenses = data.expenses;
    if (data.costCenters && Array.isArray(data.costCenters)) this.costCenters = data.costCenters;
    if (data.expenseCategories && Array.isArray(data.expenseCategories)) this.expenseCategories = data.expenseCategories;
    if (data.recurringExpenses && Array.isArray(data.recurringExpenses)) this.recurringExpenses = data.recurringExpenses;
    if (data.freelancerCosts && Array.isArray(data.freelancerCosts)) this.freelancerCosts = data.freelancerCosts;
    if (data.payrollExpenses && Array.isArray(data.payrollExpenses)) this.payrollExpenses = data.payrollExpenses;
    if (data.accountingEntries && Array.isArray(data.accountingEntries)) this.accountingEntries = data.accountingEntries;
    if (data.accounts && Array.isArray(data.accounts)) this.accounts = data.accounts;
    if (data.transactions && Array.isArray(data.transactions)) this.transactions = data.transactions;
    if (data.receivables && Array.isArray(data.receivables)) this.receivables = data.receivables;
    if (data.liabilities && Array.isArray(data.liabilities)) this.liabilities = data.liabilities;
    if (data.closings && Array.isArray(data.closings)) this.closings = data.closings;
    if (data.attendance && Array.isArray(data.attendance)) this.attendance = data.attendance;
    if (data.notifications && Array.isArray(data.notifications)) this.notifications = data.notifications;
    if (data.letterheads && Array.isArray(data.letterheads)) this.letterheads = data.letterheads;
    if (data.stamps && Array.isArray(data.stamps)) this.stamps = data.stamps;
    if (data.presets && Array.isArray(data.presets)) this.presets = data.presets;
    if (data.pdfLogs && Array.isArray(data.pdfLogs)) this.pdfLogs = data.pdfLogs;
    if (data.feedback && Array.isArray(data.feedback)) this.feedback = data.feedback;
    if (data.leads && Array.isArray(data.leads)) this.leads = data.leads;
    if (data.leadActivities && Array.isArray(data.leadActivities)) this.leadActivities = data.leadActivities;
    if (data.automationRules && Array.isArray(data.automationRules)) this.automationRules = data.automationRules;
    if (data.brandConfig) this.brandConfig = data.brandConfig;
    if (data.exportRequests && Array.isArray(data.exportRequests)) this.exportRequests = data.exportRequests;
    if (data.securityLogs && Array.isArray(data.securityLogs)) this.securityLogs = data.securityLogs;
    if (data.taskAccountingRecords && Array.isArray(data.taskAccountingRecords)) this.taskAccountingRecords = data.taskAccountingRecords;
    if (data.taskPaymentAuditLogs && Array.isArray(data.taskPaymentAuditLogs)) this.taskPaymentAuditLogs = data.taskPaymentAuditLogs;
    if (data.whatsappSettings) this.whatsappSettings = data.whatsappSettings;
    if (data.whatsappChats && Array.isArray(data.whatsappChats)) this.whatsappChats = data.whatsappChats;
    if (data.whatsappTemplates && Array.isArray(data.whatsappTemplates)) this.whatsappTemplates = data.whatsappTemplates;
    if (data.branches && Array.isArray(data.branches)) {
      this.branches = data.branches;
    }
    if (this.branches.length === 0) {
      this.branches = this.getInitialBranches();
    }
    if (data.hrLeaves && Array.isArray(data.hrLeaves)) this.hrLeaves = data.hrLeaves;
    if (data.hrCandidates && Array.isArray(data.hrCandidates)) {
      this.hrCandidates = data.hrCandidates;
    } else if (this.hrCandidates.length === 0) {
      this.hrCandidates = this.getInitialHrCandidates();
    }
    if (data.hrOvertimes && Array.isArray(data.hrOvertimes)) this.hrOvertimes = data.hrOvertimes;
    if (data.hrDisciplinary && Array.isArray(data.hrDisciplinary)) this.hrDisciplinary = data.hrDisciplinary;
    if (data.hrPolicies && Array.isArray(data.hrPolicies)) {
      this.hrPolicies = data.hrPolicies;
    } else if (this.hrPolicies.length === 0) {
      this.hrPolicies = this.getInitialHrPolicies();
    }
    if (data.hrDocuments && Array.isArray(data.hrDocuments)) {
      this.hrDocuments = data.hrDocuments;
    } else if (this.hrDocuments.length === 0) {
      this.hrDocuments = this.getInitialHrDocuments();
    }
    
    // Recalculate GL balances automatically on load or restore
    this.recalculateAccountBalances();
  }

  async fetchFromServer() {
    if (!this.authToken) return;
    try {
      const res = await fetch('/api/load-db', {
        headers: this.authHeaders()
      });
      if (res.status === 401) {
        this.setAuthToken(null);
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        const savedProfile = this.activeProfile;
        const savedRole = this.currentRole;
        this.initializeEmptyState();
        this.deserialize(data.data);
        this.activeProfile = savedProfile;
        this.currentRole = savedRole;
        if (this.activeProfile) {
          const refreshedProfile = this.profiles.find(p => p.id === this.activeProfile?.id);
          if (refreshedProfile) {
            this.activeProfile = refreshedProfile;
            this.currentRole = refreshedProfile.role;
          }
        }
        this.listeners.forEach(listen => listen());
      }
    } catch (err) {
      console.error('Failed to load database from backend server:', err);
    }
  }

  pushToServer() {
    if (!this.authToken) return;
    if (this.isPushing) {
      this.hasPendingPush = true;
      return;
    }
    this.isPushing = true;
    const payload = this.serialize();
    fetch('/api/save-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ payload })
    })
    .then(res => res.json())
    .then(data => {
      this.isPushing = false;
      if (this.hasPendingPush) {
        this.hasPendingPush = false;
        this.pushToServer();
      }
    })
    .catch(err => {
      console.error('Failed to save database to backend server:', err);
      this.isPushing = false;
    });
  }

  saveToLocalOnly() {
    this.listeners.forEach(listen => listen());
  }

  // Empty initial structures
  private getInitialAssignments(): TaskAssignment[] {
    return [];
  }

  private getInitialClosings(): MonthlyClosing[] {
    return [];
  }

  private getInitialAttendance(): SalaryAttendance[] {
    return [];
  }

  private getInitialNotifications(): Notification[] {
    return [];
  }

  getInitialWhatsappSettings() {
    return {
      accessToken: "",
      phoneNumberId: "",
      wabaId: "",
      verifyToken: "",
      isAiEnabled: false,
      aiPrompt: "",
      webhookUrl: ""
    };
  }

  getInitialWhatsappChats() {
    return [];
  }

  getInitialWhatsappTemplates() {
    return [];
  }

  getEmptyBrandConfig() {
    return {
      companyName: "",
      companyNameAr: "",
      slogan: "",
      sloganAr: "",
      logoUrl: "",
      logoBase64: "",
      address: "",
      addressAr: "",
      phone1: "",
      phone2: "",
      email: "",
      website: "",
      taxNumber: "",
      commercialRegistry: "",
      bankName: "",
      bankNameAr: "",
      bankAccountName: "",
      bankAccountNameAr: "",
      bankIban: "",
      bankSwift: "",
      termsEn: "",
      termsAr: "",
      accentColor: "#1f2937",
      secondaryColor: "#d97706",
      layoutTheme: "modern_asymmetric",
      fontFamily: "Inter",
      showLogo: true,
      showSignatureBlock: true,
      showStamp: true,
      showBankDetails: true,
      taxRate: 0,
      currency: "EGP",
      invoiceWatermark: "",
      quoteWatermark: "",
      smtpConfig: { host: "", port: "587", user: "", pass: "", from: "" }
    };
  }

  private getInitialPresets(): LayoutPreset[] {
    return [];
  }

  private getInitialAutomationRules(): any[] {
    return [];
  }

  getInitialBranches(): Branch[] {
    return [
      {
        id: 'b-cairo',
        name: 'Cairo Headquarters',
        nameAr: 'الفرع الرئيسي بالقاهرة',
        location: '12 El-Tahrir Sq, Downtown Cairo, Egypt',
        locationAr: '١٢ ميدان التحرير، وسط البلد، القاهرة، مصر',
        phone: '+20225789000',
        email: 'cairo@globalizetl.com',
        isActive: true,
        currency: 'EGP',
        createdAt: new Date().toISOString()
      }
    ];
  }

  getInitialHrCandidates(): any[] {
    return [
      {
        id: "cand-1",
        fullName: "Fatma Nour",
        fullNameAr: "فاطمة نور",
        email: "fatma.nour@example.com",
        phone: "+201023456789",
        sourceLang: "English",
        targetLang: "Arabic",
        specialization: "Legal & Contracts",
        monthlySalary: 7500,
        targetRate: 0.18,
        perPageRate: 20,
        status: "applied",
        score: 85,
        reviewerComments: "Excellent legal terminology accuracy.",
        createdAt: new Date().toISOString()
      },
      {
        id: "cand-2",
        fullName: "Michael Smith",
        fullNameAr: "مايكل سميث",
        email: "michael.smith@example.com",
        phone: "+447123456789",
        sourceLang: "Arabic",
        targetLang: "English",
        specialization: "Financial & Corporate",
        monthlySalary: 9000,
        targetRate: 0.25,
        perPageRate: 30,
        status: "test_submitted",
        score: 92,
        reviewerComments: "Very strong native translation quality.",
        createdAt: new Date().toISOString()
      }
    ];
  }

  getInitialHrPolicies(): any[] {
    return [
      {
        id: "pol-1",
        title: "Translation Metrics & Accuracy SLA",
        titleAr: "معايير دقة وجودة الترجمة المعتمدة",
        content: "All certified translations must maintain a minimum 98% accuracy score and adhere to Globalize style guide parameters.",
        contentAr: "يجب ألا تقل نسبة دقة الترجمة المعتمدة عن 98% مع الالتزام الكامل بدليل الصياغة والأسلوب المعتمد.",
        readBy: []
      },
      {
        id: "pol-2",
        title: "Data Confidentiality & GDPR Policy",
        titleAr: "سياسة سرية البيانات وحماية الخصوصية",
        content: "Customer source documents, identity papers, and legal transcripts are strictly confidential and must never be stored on personal devices.",
        contentAr: "تعتبر جميع مستندات العملاء، والأوراق الثبوتية، والوثائق القانونية سرية للغاية ولا يجوز حفظها على الأجهزة الشخصية.",
        readBy: []
      }
    ];
  }

  getInitialHrDocuments(): any[] {
    return [
      {
        id: "doc-1",
        employeeId: "p-user-1",
        employeeName: "System Owner",
        docType: "NDA Agreement",
        expiryDate: "2028-12-31",
        trackingStatus: "signed",
        file: "nda_owner.pdf"
      }
    ];
  }

  addBranch(branch: Omit<Branch, 'id' | 'createdAt'>) {
    const id = `b-${Date.now()}`;
    const newBranch: Branch = {
      ...branch,
      id,
      createdAt: new Date().toISOString()
    };
    this.branches.push(newBranch);
    this.save();
    return newBranch;
  }

  updateBranch(id: string, updated: Partial<Branch>) {
    this.branches = this.branches.map(b => b.id === id ? { ...b, ...updated } : b);
    this.save();
  }

  deleteBranch(id: string) {
    this.branches = this.branches.filter(b => b.id !== id);
    this.save();
  }

  // Save changes through the authenticated backend persistence API.
  save() {
    this.listeners.forEach(listen => listen());
    this.pushToServer();
  }

  private getInitialAccounts(): Account[] {
    return [];
  }

  private getInitialCostCenters(): CostCenter[] {
    return [];
  }

  private getInitialExpenseCategories(): ExpenseCategoryItem[] {
    return [];
  }

  postAccountingEntry(params: {
    description: string,
    debits: { accountId: string, amount: number, currency: string }[],
    credits: { accountId: string, amount: number, currency: string }[],
    relatedId?: string,
    relatedType?: any,
    extraLinks?: Partial<AccountingEntry>
  }) {
    const entry: AccountingEntry = {
      id: 'ent-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      description: params.description,
      debits: params.debits,
      credits: params.credits,
      relatedEntityId: params.relatedId,
      relatedEntityType: params.relatedType,
      createdAt: new Date().toISOString(),
      ...params.extraLinks
    };
    if (!this.accountingEntries) this.accountingEntries = [];
    this.accountingEntries.push(entry);
    
    // Also post to financial transactions so that it propagates to default Ledger
    params.debits.forEach(d => {
      this.transactions.push({
        id: 'tx-db-' + Math.random().toString(36).substr(2, 9),
        accountId: d.accountId,
        type: 'debit',
        amount: d.amount,
        currency: d.currency as any,
        description: params.description,
        relatedEntityId: params.relatedId,
        relatedEntityType: params.relatedType,
        date: entry.date,
        createdBy: this.activeProfile?.fullName || 'System',
        createdAt: new Date().toISOString()
      });
    });
    
    params.credits.forEach(c => {
      this.transactions.push({
        id: 'tx-cr-' + Math.random().toString(36).substr(2, 9),
        accountId: c.accountId,
        type: 'credit',
        amount: c.amount,
        currency: c.currency as any,
        description: params.description,
        relatedEntityId: params.relatedId,
        relatedEntityType: params.relatedType,
        date: entry.date,
        createdBy: this.activeProfile?.fullName || 'System',
        createdAt: new Date().toISOString()
      });
    });

    this.recalculateAccountBalances();
    this.save();
    return entry.id;
  }

  addFinanceAuditLog(action: string, details: string, refId?: string) {
    const log: SecurityAuditLog = {
      id: 'sec-' + Math.random().toString(36).substr(2, 9),
      userId: this.activeProfile?.id || 'system',
      userName: this.activeProfile?.fullName || 'System',
      userRole: this.activeProfile?.role || 'admin',
      action: 'accounting_access',
      details: `${action}: ${details}`,
      timestamp: new Date().toISOString(),
      status: 'success',
      refId: refId
    };
    this.securityLogs.push(log);
    this.save();
  }

  approveExpense(expenseId: string, approvedBy: string) {
    const exp = this.expenses.find(e => e.id === expenseId);
    if (!exp) return false;
    exp.status = 'approved';
    exp.approvedBy = approvedBy;

    const matchCat = exp.category
      ? this.expenseCategories.find(c => c.id === exp.category || c.name.toLowerCase() === (exp.category as string).toLowerCase())
      : undefined;
    const expenseAccId = matchCat
      ? this.accounts.find(a => a.code === matchCat.accountCode)?.id
      : undefined;
    const payableAccId = this.accounts.find(a => a.code === '2000' || a.name.toLowerCase().includes('payable'))?.id;

    if (expenseAccId && payableAccId) {
      const entryId = this.postAccountingEntry({
        description: `Approved Expense #${exp.expenseNumber || exp.id}: ${exp.description}`,
        debits: [{ accountId: expenseAccId, amount: exp.amount, currency: exp.currency }],
        credits: [{ accountId: payableAccId, amount: exp.amount, currency: exp.currency }],
        relatedId: exp.id,
        relatedType: 'expense',
        extraLinks: {
          expense_id: exp.id,
          cost_center_id: exp.costCenterId || exp.cost_center_id,
          project_id: exp.projectId,
          task_id: exp.taskId,
          client_id: exp.clientId
        }
      });
      exp.accountingEntryId = entryId;
    }
    this.addFinanceAuditLog('Expense Approved', `Approved expense #${exp.expenseNumber || exp.id} of amount ${exp.amount} ${exp.currency}`, exp.id);
    this.save();
    return true;
  }

  payExpenseDetailed(expenseId: string, paidBy: string, paymentMethod: PaymentMethod, paymentDate: string) {
    const exp = this.expenses.find(e => e.id === expenseId);
    if (!exp) return false;
    exp.status = 'paid';
    exp.paidBy = paidBy;
    exp.paymentMethod = paymentMethod;
    exp.paymentDate = paymentDate;

    const payableAccId = this.accounts.find(a => a.code === '2000' || a.name.toLowerCase().includes('payable'))?.id;
    const cashBankAccId = this.accounts.find(a => {
      const name = a.name.toLowerCase();
      return paymentMethod.includes('bank') || paymentMethod.includes('nbe') || paymentMethod.includes('saib')
        ? a.type === 'asset' && name.includes('bank')
        : a.type === 'asset' && (name.includes('cash') || name.includes('khazina'));
    })?.id;

    if (payableAccId && cashBankAccId) {
      this.postAccountingEntry({
        description: `Paid Expense #${exp.expenseNumber || exp.id}: ${exp.description} via ${paymentMethod}`,
        debits: [{ accountId: payableAccId, amount: exp.amount, currency: exp.currency }],
        credits: [{ accountId: cashBankAccId, amount: exp.amount, currency: exp.currency }],
        relatedId: exp.id,
        relatedType: 'expense',
        extraLinks: {
          expense_id: exp.id,
          cost_center_id: exp.costCenterId || exp.cost_center_id,
          project_id: exp.projectId,
          task_id: exp.taskId,
          client_id: exp.clientId
        }
      });
    }

    this.addFinanceAuditLog('Expense Paid', `Paid expense #${exp.expenseNumber || exp.id} of amount ${exp.amount} ${exp.currency}`, exp.id);
    this.save();
    return true;
  }

  approveFreelancerCost(costId: string, approvedBy: string) {
    const cost = this.freelancerCosts.find(c => c.id === costId);
    if (!cost) return false;
    cost.approvalStatus = 'approved';
    cost.paymentStatus = 'payable';

    // Trigger Section 8 Double Entry post:
    // Debit: Translator Costs, Credit: Accounts Payable
    const entryId = this.postAccountingEntry({
      description: `Approved Freelancer Cost for task ${cost.taskId || 'N/A'}: freelancer ${cost.freelancerId}`,
      debits: [{ accountId: 'acc-5000', amount: cost.costAmount, currency: cost.currency }],
      credits: [{ accountId: 'acc-2000', amount: cost.costAmount, currency: cost.currency }],
      relatedId: cost.id,
      relatedType: 'freelancer_cost',
      extraLinks: {
        freelancer_cost_id: cost.id,
        task_id: cost.taskId,
        project_id: cost.projectId,
        client_id: cost.clientId,
        freelancer_id: cost.freelancerId
      }
    });

    cost.accountingEntryId = entryId;

    // Check if this cost is linked to a transaction/operating expense so that it aligns
    const unifiedExpenseId = 'exp-fl-' + cost.id;
    if (!this.expenses.some(e => e.id === unifiedExpenseId)) {
      this.expenses.push({
        id: unifiedExpenseId,
        expenseNumber: 'EXP-FL-' + cost.id.substr(0, 5).toUpperCase(),
        expenseType: 'freelancer',
        category: 'freelancer',
        vendor: cost.freelancerId,
        freelancerId: cost.freelancerId,
        projectId: cost.projectId,
        taskId: cost.taskId,
        clientId: cost.clientId,
        description: `Freelancer Cost: ${cost.serviceType} task #${cost.taskId || ''}`,
        amount: cost.costAmount,
        totalAmount: cost.costAmount,
        currency: cost.currency,
        status: 'approved',
        approvalStatus: 'approved',
        accountingEntryId: entryId,
        isRecurring: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addFinanceAuditLog('Freelancer Cost Approved', `Freelancer Cost approved for ${cost.freelancerId} amount: ${cost.costAmount}`, cost.id);
    this.save();
    return true;
  }

  payFreelancerCost(costId: string, paymentMethod: PaymentMethod, paymentDate: string) {
    const cost = this.freelancerCosts.find(c => c.id === costId);
    if (!cost) return false;
    cost.paymentStatus = 'paid';
    cost.paymentDate = paymentDate;

    // Trigger Section 8 Double Entry post:
    // Debit: Accounts Payable, Credit: Cash / Bank
    let cashBankAccId = paymentMethod.includes('bank') || paymentMethod.includes('nbe') || paymentMethod.includes('saib') ? 'acc-1001' : 'acc-1000';

    this.postAccountingEntry({
      description: `Paid Freelancer Cost and cleared payload for freelancer ${cost.freelancerId}`,
      debits: [{ accountId: 'acc-2000', amount: cost.costAmount, currency: cost.currency }],
      credits: [{ accountId: cashBankAccId, amount: cost.costAmount, currency: cost.currency }],
      relatedId: cost.id,
      relatedType: 'freelancer_cost',
      extraLinks: {
        freelancer_cost_id: cost.id,
        task_id: cost.taskId,
        project_id: cost.projectId,
        client_id: cost.clientId,
        freelancer_id: cost.freelancerId
      }
    });

    const unifiedExpenseId = 'exp-fl-' + cost.id;
    const exp = this.expenses.find(e => e.id === unifiedExpenseId);
    if (exp) {
      exp.status = 'paid';
      exp.paymentMethod = paymentMethod;
      exp.paymentDate = paymentDate;
    }

    this.addFinanceAuditLog('Freelancer Cost Paid', `Paid freelancer cost for ${cost.freelancerId} amount: ${cost.costAmount}`, cost.id);
    this.save();
    return true;
  }

  approvePayrollExpense(payrollId: string) {
    const pr = this.payrollExpenses.find(p => p.id === payrollId);
    if (!pr) return false;
    pr.approvalStatus = 'approved';
    pr.paymentStatus = 'payable';

    // Trigger Section 8 Double Entry post:
    // Debit: Salaries & Payroll Expense, Credit: Accounts Payable
    const entryId = this.postAccountingEntry({
      description: `Approved Payroll for ${pr.employeeId} - Period ${pr.salaryPeriod}`,
      debits: [{ accountId: 'acc-5400', amount: pr.netSalary, currency: 'EGP' }],
      credits: [{ accountId: 'acc-2000', amount: pr.netSalary, currency: 'EGP' }],
      relatedId: pr.id,
      relatedType: 'salary',
      extraLinks: {
        payroll_expense_id: pr.id,
        employee_id: pr.employeeId,
        cost_center_id: pr.costCenterId
      }
    });

    pr.accountingEntryId = entryId;

    // Check if this payroll is linked to a transaction/operating expense so that it aligns
    const unifiedExpenseId = 'exp-pr-' + pr.id;
    if (!this.expenses.some(e => e.id === unifiedExpenseId)) {
      this.expenses.push({
        id: unifiedExpenseId,
        expenseNumber: 'EXP-PAY-' + pr.id.substr(0, 5).toUpperCase(),
        expenseType: 'payroll',
        category: 'salary',
        vendor: pr.employeeId,
        employeeId: pr.employeeId,
        costCenterId: pr.costCenterId,
        description: `Employee Payroll: Period ${pr.salaryPeriod} (Net Salary)`,
        amount: pr.netSalary,
        totalAmount: pr.netSalary,
        currency: 'EGP',
        status: 'approved',
        approvalStatus: 'approved',
        accountingEntryId: entryId,
        isRecurring: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addFinanceAuditLog('Payroll Approved', `Approved payroll for ${pr.employeeId} amount: ${pr.netSalary}`, pr.id);
    this.save();
    return true;
  }

  payPayrollExpense(payrollId: string, paymentMethod: PaymentMethod, paymentDate: string) {
    const pr = this.payrollExpenses.find(p => p.id === payrollId);
    if (!pr) return false;
    pr.paymentStatus = 'paid';
    pr.paymentDate = paymentDate;

    // Trigger Section 8 Double Entry post:
    // Debit: Accounts Payable, Credit: Cash / Bank
    let cashBankAccId = paymentMethod.includes('bank') || paymentMethod.includes('nbe') || paymentMethod.includes('saib') ? 'acc-1001' : 'acc-1000';

    this.postAccountingEntry({
      description: `Paid Payroll of ${pr.employeeId} - Period ${pr.salaryPeriod} via ${paymentMethod}`,
      debits: [{ accountId: 'acc-2000', amount: pr.netSalary, currency: 'EGP' }],
      credits: [{ accountId: cashBankAccId, amount: pr.netSalary, currency: 'EGP' }],
      relatedId: pr.id,
      relatedType: 'salary',
      extraLinks: {
        payroll_expense_id: pr.id,
        employee_id: pr.employeeId,
        cost_center_id: pr.costCenterId
      }
    });

    const unifiedExpenseId = 'exp-pr-' + pr.id;
    const exp = this.expenses.find(e => e.id === unifiedExpenseId);
    if (exp) {
      exp.status = 'paid';
      exp.paymentMethod = paymentMethod;
      exp.paymentDate = paymentDate;
    }

    this.addFinanceAuditLog('Payroll Paid', `Paid Employee payroll for ${pr.employeeId} amount: ${pr.netSalary}`, pr.id);
    this.save();
    return true;
  }

  private getInitialFreelancerCosts(): FreelancerCost[] {
    return [];
  }

  private getInitialPayrollExpenses(): PayrollExpense[] {
    return [];
  }

  resetToSeeds() {
    this.initializeEmptyState();
    this.save();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Role management
  setRole(role: UserRole) {
    if (this.activeProfile && this.activeProfile.role !== role) {
      this.logSecurityEvent('unauthorized_access', `Blocked client-side role change request from ${this.activeProfile.role} to ${role}.`, 'denied');
      return;
    }
    this.currentRole = role;
    this.save();
  }

  private getInitialLeads(): Lead[] {
    return [];
  }

  // --- CRM METHODS ---
  addLead(leadInput: Omit<Lead, 'id' | 'createdAt' | 'createdBy'>): Lead {
    const id = `lead-${Date.now()}`;
    
    // Check if client with this name, email, or phone already exists
    let client = this.clients.find(c => 
      c.name.toLowerCase() === leadInput.name.toLowerCase() || 
      (leadInput.email && c.email?.toLowerCase() === leadInput.email.toLowerCase()) ||
      (leadInput.phone && c.phone === leadInput.phone)
    );

    if (!client) {
      // If doesn't exist, auto-create a matching Client so they are immediately listed in the Customer List
      client = this.addClient(
        leadInput.name,
        leadInput.name, // Arabic name defaulted to name
        leadInput.phone || '',
        leadInput.email || '',
        leadInput.company ? 'company' : 'individual',
        `Auto-created from CRM Lead. Notes: ${leadInput.notes || ''}`
      );
    }

    const newLead: Lead = {
      ...leadInput,
      id,
      convertedToClientId: client.id, // associate with the client immediately!
      createdAt: new Date().toISOString(),
      createdBy: this.activeProfile?.id || 'system'
    };
    this.leads.unshift(newLead);
    this.save();
    return newLead;
  }

  updateLead(lead: Lead) {
    this.leads = this.leads.map(l => l.id === lead.id ? lead : l);
    this.save();
  }

  updateLeadStage(leadId: string, stage: LeadStage) {
    const lead = this.leads.find(l => l.id === leadId);
    if (lead) {
      lead.stage = stage;
      this.addLeadActivity(leadId, 'note', `Stage moved to: ${stage}`);
      this.save();
    }
  }

  addLeadActivity(leadId: string, type: LeadActivity['type'], description: string): LeadActivity {
    const id = `act-${Date.now()}`;
    const activity: LeadActivity = {
      id,
      leadId,
      type,
      description,
      performedBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString()
    };
    this.leadActivities.unshift(activity);
    this.save();
    return activity;
  }

  convertLeadToClient(leadId: string): Client {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    let client = lead.convertedToClientId ? this.clients.find(c => c.id === lead.convertedToClientId) : null;
    
    if (!client) {
      // Find by matching detail fallback
      client = this.clients.find(c => 
        c.name.toLowerCase() === lead.name.toLowerCase() ||
        (lead.email && c.email?.toLowerCase() === lead.email.toLowerCase())
      );
    }

    if (!client) {
      client = this.addClient(
        lead.name,
        lead.name, // Arabic name defaulted
        lead.phone || '',
        lead.email || '',
        lead.company ? 'company' : 'individual',
        `Converted from Lead. Original Notes: ${lead.notes || ''}`
      );
    }

    lead.stage = 'won';
    lead.convertedToClientId = client.id;
    this.save();
    return client;
  }

  // --- CRUD OPERATORS ---

  addTaskAccountingAudit(taskId: string, actionType: string, oldValue: string, newValue: string) {
    const task = this.tasks.find(t => t.id === taskId);
    const taskRef = task ? task.referenceNo : taskId;
    const logId = `ala-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLog: TaskPaymentAuditLog = {
      id: logId,
      taskId,
      taskRef,
      actionType,
      oldValue,
      newValue,
      performedBy: this.activeProfile ? `${this.activeProfile.fullName} (${this.activeProfile.role})` : 'System',
      performedById: this.activeProfile ? this.activeProfile.id : 'system',
      timestamp: new Date().toISOString()
    };
    this.taskPaymentAuditLogs.push(newLog);
    this.save();
    return newLog;
  }

  syncTaskAccountingRecord(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Sum all payments for this task
    const taskPayments = this.payments.filter(p => p.taskId === taskId || p.referenceNo === task.referenceNo);
    
    // Determine currency
    const currency = task.amountUsd > 0 ? 'USD' : (task.amountAed > 0 ? 'AED' : 'EGP');
    
    // Get total agreed and paid amount based on currency
    let totalAgreed = task.amountEgp;
    let paidAmount = task.paidAmountEgp;
    let initialPaid = 0;
    
    if (currency === 'USD') {
      totalAgreed = task.amountUsd;
      paidAmount = task.paidAmountUsd;
    } else if (currency === 'AED') {
      totalAgreed = task.amountAed;
      paidAmount = task.paidAmountAed;
    }

    // Get the oldest payment as initial billing / deposit
    if (taskPayments.length > 0) {
      const sorted = [...taskPayments].sort((a, b) => new Date(a.date || a.paymentDate).getTime() - new Date(b.date || b.paymentDate).getTime());
      initialPaid = sorted[0].amount;
    }

    // Remaining balance
    const remainingBalance = Math.max(0, totalAgreed - paidAmount);

    // Synchronize the task's payment status as well, making sure it stays perfectly synced!
    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (remainingBalance <= 0.01) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }
    
    if (task.paymentStatus !== paymentStatus) {
      task.paymentStatus = paymentStatus;
    }

    // Capture delivery status from task
    let deliveryStatus: 'Pending' | 'Delivered' = 'Pending';
    if (task.status === 'delivered') {
      deliveryStatus = 'Delivered';
    }

    // Get assigned staff
    const staffNames = this.assignments
      .filter(asg => asg.taskId === taskId)
      .map(asg => {
        const prof = this.profiles.find(p => p.id === asg.translatorId);
        return prof ? `${prof.fullName} (${asg.assignmentType})` : `Translator-${asg.translatorId}`;
      });
    const assignedStaff = staffNames.length > 0 ? staffNames.join(', ') : undefined;

    // Payment dates
    const paymentDates = taskPayments.map(p => p.date || p.paymentDate || new Date().toISOString().split('T')[0]);
    
    // Search parent or related quotations or invoices to bind invoiceOrQuoteRef
    const linkedInvoice = this.invoices.find(inv => inv.clientId === task.clientId && inv.items?.some(it => it.description && (it.description.includes(task.referenceNo) || it.description.includes(task.fileName))));
    const linkedQuotation = this.quotations.find(q => q.convertedToJobId === task.id || q.documentsToBeTranslated?.some(doc => doc.name === task.fileName));
    const invoiceOrQuoteRef = linkedInvoice ? linkedInvoice.invoiceNumber : (linkedQuotation ? linkedQuotation.quoteNumber : undefined);

    let rec = this.taskAccountingRecords.find(r => r.taskId === taskId);
    if (rec) {
      rec.clientName = task.clientNameCache || 'Walk-in Client';
      rec.serviceType = task.serviceType;
      rec.totalAmount = totalAgreed;
      rec.currency = currency;
      rec.initialDeposit = initialPaid;
      rec.remainingBalance = remainingBalance;
      rec.paymentStatus = paymentStatus;
      rec.deliveryStatus = deliveryStatus;
      rec.deliveryDate = task.deliveryDate;
      rec.deliveredBy = (task as any).deliveredBy || rec.deliveredBy;
      rec.invoiceOrQuoteRef = invoiceOrQuoteRef || rec.invoiceOrQuoteRef;
      rec.paymentMethod = task.paymentMethod || (taskPayments.length > 0 ? taskPayments[0].method : undefined);
      rec.paymentDates = paymentDates;
      rec.assignedStaff = assignedStaff;
      rec.updatedAt = new Date().toISOString();
    } else {
      rec = {
        id: `acc-rec-${Date.now()}`,
        taskId,
        clientName: task.clientNameCache || 'Walk-in Client',
        serviceType: task.serviceType,
        totalAmount: totalAgreed,
        currency,
        initialDeposit: initialPaid,
        remainingBalance,
        paymentStatus,
        deliveryStatus,
        deliveryDate: task.deliveryDate,
        deliveredBy: (task as any).deliveredBy,
        invoiceOrQuoteRef,
        paymentMethod: task.paymentMethod || (taskPayments.length > 0 ? taskPayments[0].method : undefined),
        paymentDates,
        assignedStaff,
        updatedAt: new Date().toISOString()
      };
      this.taskAccountingRecords.unshift(rec);
    }
    this.save();
  }

  // Ref generation replicates exact DB trigger!
  generateRefNo(dateStr: string): string {
    const selectedDate = new Date(dateStr);
    const YY = selectedDate.getFullYear().toString().slice(-2);
    const MM = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const DD = String(selectedDate.getDate()).padStart(2, '0');
    const datePrefix = `${YY}.${MM}.${DD}`;
    
    const count = this.tasks.filter(t => t.intakeDate === dateStr).length;
    return `${datePrefix}.${count + 1}`;
  }

  addTask(taskInput: Omit<Task, 'id' | 'referenceNo' | 'createdAt' | 'updatedAt' | 'createdBy' | 'paymentStatus' | 'paidAmountEgp' | 'paidAmountAed' | 'paidAmountUsd' | 'translationCost' | 'revisionCost' | 'overtimeCost' | 'totalCost' | 'netRevenue'> & { initialPaidAmountEgp?: number; initialPaidAmountAed?: number; initialPaidAmountUsd?: number; initialPaymentMethod?: PaymentMethod }): Task {
    const id = `t-${Date.now()}`;
    const referenceNo = this.generateRefNo(taskInput.intakeDate);
    const client = this.clients.find(c => c.id === taskInput.clientId);
    
    // Determine active currency
    const currency = taskInput.amountUsd > 0 ? 'USD' : (taskInput.amountAed > 0 ? 'AED' : 'EGP');

    const initialPaidEgp = taskInput.initialPaidAmountEgp || 0;
    const initialPaidAed = taskInput.initialPaidAmountAed || 0;
    const initialPaidUsd = taskInput.initialPaidAmountUsd || 0;
    
    const initialPaid = currency === 'USD' ? initialPaidUsd : (currency === 'AED' ? initialPaidAed : initialPaidEgp);
    const initialMethod = taskInput.initialPaymentMethod || 'cash';
    
    const totalAmount = currency === 'USD' ? taskInput.amountUsd : (currency === 'AED' ? taskInput.amountAed : taskInput.amountEgp);
    const payStatus = initialPaid <= 0 ? 'unpaid' : (initialPaid >= totalAmount ? 'paid' : 'partial');

    // Remove the custom fields from taskInput so they don't leak into the Task type spread
    const { initialPaidAmountEgp, initialPaidAmountAed, initialPaidAmountUsd, initialPaymentMethod, ...taskData } = taskInput;

    const newTask: Task = {
      ...taskData,
      id,
      referenceNo,
      clientNameCache: client ? client.name : (taskData.clientPhone || 'Walk-in Client'),
      paymentStatus: payStatus,
      paymentMethod: initialPaid > 0 ? initialMethod : undefined,
      paidAmountEgp: initialPaidEgp,
      paidAmountAed: initialPaidAed,
      paidAmountUsd: initialPaidUsd,
      translationCost: 0,
      revisionCost: 0,
      overtimeCost: 0,
      totalCost: 0,
      netRevenue: totalAmount, // Initially net revenue equals total price (minus costs later)
      createdBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks.unshift(newTask);

    // If there is outstanding receivables, register them in clients record too
    if (client && (taskData.amountEgp > 0 || taskData.amountAed > 0 || taskData.amountUsd > 0)) {
      client.totalReceivablesEgp += Math.max(0, taskData.amountEgp - initialPaidEgp);
      client.totalReceivablesAed += Math.max(0, taskData.amountAed - initialPaidAed);
      client.totalReceivablesUsd += Math.max(0, taskData.amountUsd - initialPaidUsd);
      
      const period = taskData.intakeDate.slice(0, 7); // format YYYY-MM
      this.ensureClientReceivableRecord(
        client.id, 
        client.name, 
        period, 
        Math.max(0, taskData.amountEgp - initialPaidEgp), 
        Math.max(0, taskData.amountAed - initialPaidAed), 
        Math.max(0, taskData.amountUsd - initialPaidUsd)
      );
    }

    // Direct general ledger posting for task folder contract
    if (totalAmount > 0) {
      this.postTransaction('acc-1100', 'debit', totalAmount, currency, `Accrued contract for task: ${referenceNo} (${newTask.fileName})`, id, 'invoice');
      this.postTransaction('acc-4000', 'credit', totalAmount, currency, `Accrued revenue for task: ${referenceNo}`, id, 'invoice');
    }

    // Add cash payment record if initial paid amount is positive
    if (initialPaid > 0) {
      const paymentId = `pay-${id}-init`;
      this.payments.unshift({
        id: paymentId,
        date: taskData.intakeDate,
        amount: initialPaid,
        currency: currency,
        method: initialMethod,
        type: 'income',
        taskId: id,
        clientId: taskData.clientId,
        referenceNo,
        clientName: newTask.clientNameCache,
        fileName: newTask.fileName,
        paymentDate: taskData.intakeDate,
        paymentType: 'income',
        amountEgp: initialPaidEgp,
        amountAed: initialPaidAed,
        amountUsd: initialPaidUsd,
        paymentMethod: initialMethod,
        recordedBy: this.activeProfile?.id || 'system',
        createdAt: new Date().toISOString()
      });

      // Debit Cash/Bank, Credit Accounts Receivable
      const accountId = (initialMethod === 'bank_saib' || initialMethod === 'nbe') ? 'acc-1001' : 'acc-1000';
      this.postTransaction(accountId, 'debit', initialPaid, currency, `Initial deposit received for task: ${referenceNo}`, paymentId, 'payment');
      this.postTransaction('acc-1100', 'credit', initialPaid, currency, `Initial deposit applied to task: ${referenceNo}`, paymentId, 'payment');
    }

    this.save();

    // Sync task with the accounting record
    this.syncTaskAccountingRecord(id);

    // Add audit log
    this.addTaskAccountingAudit(
      id,
      'Create Task',
      'None',
      `Task created. Total: ${totalAmount} ${currency}. Deposit: ${initialPaid} ${currency}. Status: ${newTask.status}.`
    );

    this.addNotification({
      title: 'New Task Registered',
      titleAr: 'تم تسجيل ملف جديد',
      message: `Task ref ${referenceNo} registered successfully for "${newTask.clientNameCache}".`,
      messageAr: `تم تسجيل الملف ذو المرجع رقم ${referenceNo} بنجاح لصالح "${client?.nameAr || newTask.clientNameCache}".`,
      userId: this.activeProfile?.id || '',
      type: 'success'
    });

    return newTask;
  }

  ensureClientReceivableRecord(clientId: string, clientName: string, period: string, egp: number, aed: number, usd: number) {
    if (egp > 0) {
      let rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'EGP');
      if (rec) {
        rec.amount += egp;
        rec.remaining = rec.amount - rec.paidAmount;
      } else {
        this.receivables.push({
          id: `rec-${Date.now()}-egp`,
          clientId,
          clientName,
          period,
          currency: 'EGP',
          amount: egp,
          paidAmount: 0,
          remaining: egp
        });
      }
    }
    if (aed > 0) {
      let rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'AED');
      if (rec) {
        rec.amount += aed;
        rec.remaining = rec.amount - rec.paidAmount;
      } else {
        this.receivables.push({
          id: `rec-${Date.now()}-aed`,
          clientId,
          clientName,
          period,
          currency: 'AED',
          amount: aed,
          paidAmount: 0,
          remaining: aed
        });
      }
    }
    if (usd > 0) {
      let rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'USD');
      if (rec) {
        rec.amount += usd;
        rec.remaining = rec.amount - rec.paidAmount;
      } else {
        this.receivables.push({
          id: `rec-${Date.now()}-usd`,
          clientId,
          clientName,
          period,
          currency: 'USD',
          amount: usd,
          paidAmount: 0,
          remaining: usd
        });
      }
    }
  }

  updateTask(updatedTask: Task) {
    const oldTask = this.tasks.find(t => t.id === updatedTask.id);
    const hasStatusChanged = oldTask ? oldTask.status !== updatedTask.status : true;
    const hasFileNameChanged = oldTask ? oldTask.fileName !== updatedTask.fileName : true;
    const hasWordCountChanged = oldTask ? oldTask.wordCount !== updatedTask.wordCount : true;

    this.tasks = this.tasks.map(t => {
      if (t.id === updatedTask.id) {
        return {
          ...updatedTask,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    if (oldTask) {
      if (oldTask.status !== updatedTask.status) {
        this.addTaskAccountingAudit(
          updatedTask.id,
          'Update Status',
          oldTask.status,
          updatedTask.status
        );
      }
      const oldAmount = oldTask.amountEgp || oldTask.amountAed || oldTask.amountUsd;
      const newAmount = updatedTask.amountEgp || updatedTask.amountAed || updatedTask.amountUsd;
      if (oldAmount !== newAmount) {
        this.addTaskAccountingAudit(
          updatedTask.id,
          'Update Amount',
          String(oldAmount),
          String(newAmount)
        );
      }
      const oldPaid = oldTask.paidAmountEgp + oldTask.paidAmountAed + oldTask.paidAmountUsd;
      const newPaid = updatedTask.paidAmountEgp + updatedTask.paidAmountAed + updatedTask.paidAmountUsd;
      if (oldPaid !== newPaid) {
        this.addTaskAccountingAudit(
          updatedTask.id,
          'Update Paid Amount',
          String(oldPaid),
          String(newPaid)
        );
      }
    }

    this.syncTaskAccountingRecord(updatedTask.id);
    this.save();

    // Trigger email and inside-system alerts for stakeholders (assigned translators/linguists)
    if (oldTask && (hasStatusChanged || hasFileNameChanged || hasWordCountChanged)) {
      // Find all translators/linguists assigned to this task
      const assignedTransactions = this.assignments.filter(asg => asg.taskId === updatedTask.id);
      const processedUserIds = new Set<string>();

      assignedTransactions.forEach(asg => {
        if (!asg.translatorId || processedUserIds.has(asg.translatorId)) return;
        processedUserIds.add(asg.translatorId);

        const translator = this.profiles.find(p => p.id === asg.translatorId);
        if (translator && translator.email) {
          const subject = `GTMS Alert: Task "${updatedTask.referenceNo}" Updated / تحديث مهمة`;
          
          const bodyAr = `مرحباً ${translator.fullNameAr || translator.fullName}،\n\nنود إعلامك بأنه تم تحديث بيانات المهمة المسندة إليك برقم مرجعي: "${updatedTask.referenceNo}".\n\nتفاصيل التعديل:\n- اسم الملف الحالي: ${updatedTask.fileName}\n- حالة المهمة الجديدة: ${updatedTask.status.replace('_', ' ').toUpperCase()}\n- عدد الكلمات / الصفحات: ${updatedTask.wordCount} كلمة / ${updatedTask.pageCount} صفحة\n\nيرجى الدخول إلى لوحة التحكم الخاصة بك للتحقق من المهام وجهوزيتها للعمل.\n\nمع أطيب التحيات،\nنظام الإشعارات الآلي لشركة غلوبالايز`;
          
          const bodyEn = `Dear ${translator.fullName},\n\nThe task assigned to you with reference number "${updatedTask.referenceNo}" has been modified.\n\nUpdated Details:\n- File Name: ${updatedTask.fileName}\n- New Status: ${updatedTask.status.replace('_', ' ').toUpperCase()}\n- Word/Page count: ${updatedTask.wordCount} words / ${updatedTask.pageCount} pages`;
          
          const fullBody = `${bodyAr}\n\n=========================================\n\n${bodyEn}`;

          this.triggerEmailNotification(translator.email, subject, fullBody);

          this.addNotification({
            title: `Task Updated: ${updatedTask.referenceNo}`,
            titleAr: `تم تحديث مهمة: ${updatedTask.referenceNo}`,
            message: `Task "${updatedTask.referenceNo}" (${updatedTask.fileName}) has been modified to status: ${updatedTask.status.replace('_', ' ').toUpperCase()}`,
            messageAr: `تم تحديث ملف المهمة "${updatedTask.referenceNo}" (${updatedTask.fileName}) إلى الحالة: ${updatedTask.status}`,
            userId: translator.id,
            type: 'info'
          });
        }
      });
    }
  }

  assignTranslator(asgInput: Omit<TaskAssignment, 'id' | 'assignedBy' | 'assignedAt' | 'calculatedAmount'>): TaskAssignment {
    const id = `asg-${Date.now()}`;
    const translator = this.profiles.find(p => p.id === asgInput.translatorId)!;
    
    // Calculate amount based on rate type
    let calculatedAmount = 0;
    if (asgInput.ratePerPage) {
      const pageCount = asgInput.pageCountAssigned || 1;
      calculatedAmount = pageCount * asgInput.ratePerPage;
    } else if (asgInput.ratePerWord) {
      calculatedAmount = asgInput.wordCountAssigned * asgInput.ratePerWord;
    } else if (asgInput.rateDaily) {
      calculatedAmount = asgInput.rateDaily;
    } else if (asgInput.rateFixed) {
      calculatedAmount = asgInput.rateFixed;
    }

    if (asgInput.overtimeHours && asgInput.overtimeRate) {
      calculatedAmount += asgInput.overtimeHours * asgInput.overtimeRate;
    }

    const newAsg: TaskAssignment = {
      ...asgInput,
      id,
      calculatedAmount,
      assignedBy: this.activeProfile?.id || 'system',
      assignedAt: new Date().toISOString()
    };

    this.assignments.push(newAsg);

    // Update the task costs
    const task = this.tasks.find(t => t.id === asgInput.taskId);
    if (task) {
      if (asgInput.assignmentType === 'translation') {
        task.translationCost += calculatedAmount;
      } else if (asgInput.assignmentType === 'revision') {
        task.revisionCost += calculatedAmount;
      } else {
        task.overtimeCost += calculatedAmount;
      }
      task.totalCost = task.translationCost + task.revisionCost + task.overtimeCost;
      task.netRevenue = task.amountEgp - task.totalCost;
      task.status = 'assigned';
      this.updateTask(task);
    }

    this.save();

    // Create custom notifications depending on assignment role
    let title = 'Task Assigned';
    let titleAr = 'تم تعيين مهمة ترجمة';
    let msg = `Assigned folder "${newAsg.taskFileName || 'File'}" to translator "${translator.fullName}".`;
    let msgAr = `تم تعيين الملف "${newAsg.taskFileName || 'الملف'}" للمترجم "${translator.fullNameAr}".`;

    if (asgInput.assignmentType === 'revision') {
      title = 'QA Revision Assigned';
      titleAr = 'تم تعيين مهمة مراجعة لغوية';
      msg = `Assigned folder "${newAsg.taskFileName || 'File'}" to reviewer "${translator.fullName}" for QA revision.`;
      msgAr = `تم تعيين الملف "${newAsg.taskFileName || 'الملف'}" للمراجع "${translator.fullNameAr}" للمراجعة والتدقيق اللغوي.`;
    } else if (asgInput.assignmentType === 'proofreading') {
      title = 'Linguistic Proofreading Assigned';
      titleAr = 'تم تعيين مهمة تدقيق واعتماد';
      msg = `Assigned folder "${newAsg.taskFileName || 'File'}" to reviewer "${translator.fullName}" for final credentialed proofreading.`;
      msgAr = `تم تعيين الملف "${newAsg.taskFileName || 'الملف'}" للمدقق "${translator.fullNameAr}" للمراجعة والتدقيق والاعتماد السريع.`;
    }

    this.addNotification({
      title,
      titleAr,
      message: msg,
      messageAr: msgAr,
      userId: asgInput.translatorId,
      type: 'info'
    });

    if (translator && translator.email) {
      const emailSubject = `GTMS Assignment: Job Assigned / تم إสนاد عمل جديد - ${task?.referenceNo || 'GTMS'}`;
      
      const emailBodyAr = `مرحباً ${translator.fullNameAr || translator.fullName}،\n\nلقد تم إسناد عملاً جديداً إليك في نظام غلوبالايز للترجمة.\n\nتفاصيل العمل:\n- المعاملة المرجعية: ${task?.referenceNo || 'N/A'}\n- اسم الملف المختص: ${newAsg.taskFileName || 'Legal Document'}\n- تصنيف العمل: ${asgInput.assignmentType.toUpperCase()}\n- حجم العمل: ${asgInput.wordCountAssigned || 0} كلمة / ${asgInput.pageCountAssigned || 0} صفحة\n- تاريخ التسليم المحدد: ${asgInput.deadline || 'N/A'}\n\nيرجى فتح لوحة التحكم الخاصة بك للبدء والمباشرة الفورية بالعمل.\n\nمع كامل تقديرنا،\nغلوبالايز لإدارة الترجمة`;
      
      const emailBodyEn = `Dear ${translator.fullName},\n\nYou have been assigned a new workflow.\n\nDetails:\n- Job Reference: ${task?.referenceNo || ''}\n- File Name: ${newAsg.taskFileName || ''}\n- Category: ${asgInput.assignmentType.toUpperCase()}\n- Workflow Scope: ${asgInput.wordCountAssigned || 0} words / ${asgInput.pageCountAssigned || 0} pages\n- Target Due Date: ${asgInput.deadline || ''}`;

      const combinedBody = `${emailBodyAr}\n\n=========================================\n\n${emailBodyEn}`;
      this.triggerEmailNotification(translator.email, emailSubject, combinedBody);
    }

    return newAsg;
  }

  submitAssignment(assignmentId: string, wordCountActual?: number, translatedAttachments?: TaskAttachment[], notes?: string) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (asg) {
      // 1. Maintain version history
      if (!asg.versionHistory) {
        asg.versionHistory = [];
      }
      if (asg.submittedAt && asg.translatedAttachments && asg.translatedAttachments.length > 0) {
        asg.versionHistory.push({
          version: asg.versionHistory.length + 1,
          files: asg.translatedAttachments,
          submittedAt: asg.submittedAt,
          notes: asg.notes || ''
        });
      }

      asg.status = 'submitted';
      asg.submittedAt = new Date().toISOString();
      if (notes !== undefined) {
        asg.notes = notes;
      }
      if (translatedAttachments) {
        asg.translatedAttachments = translatedAttachments;
      }
      if (wordCountActual) {
        asg.wordCountActual = wordCountActual;
        if (asg.ratePerWord) {
          asg.calculatedAmount = wordCountActual * asg.ratePerWord;
        }
      }
      
      // Update task status to Review
      const task = this.tasks.find(t => t.id === asg.taskId);
      if (task) {
        task.status = 'review';
        // Also copy translated documents to task.attachments so staff can easily download them
        if (translatedAttachments && translatedAttachments.length > 0) {
          if (!task.attachments) {
            task.attachments = [];
          }
          translatedAttachments.forEach(att => {
            const alreadyExists = task.attachments?.some(existing => existing.id === att.id || existing.name === att.name);
            if (!alreadyExists) {
              task.attachments?.push({
                ...att,
                name: `[TR] ${att.name}` // clearly mark as translated file
              });
            }
          });
        }
        this.updateTask(task);
      }

      this.save();

      // Notify managers / Admins
      const adminsAndOwners = this.profiles.filter(p => p.role === 'admin' || p.role === 'owner');
      adminsAndOwners.forEach(p => {
        this.addNotification({
          title: 'Task File Submitted',
          titleAr: 'تم تسليم ملف مترجم',
          message: `Translator submitted translation for file: ${asg.taskFileName || 'File'}. Ready for revision!`,
          messageAr: `قام المترجم بتسليم الملف المترجم: ${asg.taskFileName || 'ملف'}. جاهز للمراجعة!`,
          userId: p.id,
          type: 'warning'
        });
      });

      // Hand-off notification directly to any linked reviewer!
      const revAsgs = this.assignments.filter(a => a.taskId === asg.taskId && (a.assignmentType === 'revision' || a.assignmentType === 'proofreading'));
      const relevantReviewers = revAsgs.filter(a => a.relatedAssignmentId === asg.id || !a.relatedAssignmentId);
      relevantReviewers.forEach(revAsg => {
        this.addNotification({
          title: 'Translation Ready for Revision',
          titleAr: 'الترجمة جاهزة للمراجعة اللغوية',
          message: `The translation draft for "${asg.taskFileName || 'File'}" is completed. You can start revision now!`,
          messageAr: `تم تسليم مسودة الترجمة لـ "${asg.taskFileName || 'ملف'}". يرجى بدء المراجعة والتدقيق حالاً!`,
          userId: revAsg.translatorId,
          type: 'info'
        });
      });
    }
  }

  submitReviewAssignment(
    assignmentId: string,
    reviewedFiles?: TaskAttachment[],
    comments?: string,
    status?: 'submitted' | 'returned_for_correction' | 'approved',
    correctionNotes?: string
  ) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (!asg) return;

    // Maintain version history
    if (!asg.versionHistory) {
      asg.versionHistory = [];
    }
    if (asg.submittedAt && asg.translatedAttachments && asg.translatedAttachments.length > 0) {
      asg.versionHistory.push({
        version: asg.versionHistory.length + 1,
        files: asg.translatedAttachments,
        submittedAt: asg.submittedAt,
        notes: asg.reviewerComments || ''
      });
    }

    if (status) asg.status = status;
    asg.submittedAt = new Date().toISOString();
    if (comments) asg.reviewerComments = comments;
    if (correctionNotes) asg.correctionNotes = correctionNotes;
    if (reviewedFiles) asg.translatedAttachments = reviewedFiles;

    const task = this.tasks.find(t => t.id === asg.taskId);

    if (status === 'returned_for_correction') {
      // Find related translator assignment and set its status to returned_for_correction
      if (asg.relatedAssignmentId) {
        const transAsg = this.assignments.find(a => a.id === asg.relatedAssignmentId);
        if (transAsg) {
          transAsg.status = 'returned_for_correction';
          transAsg.correctionNotes = correctionNotes;
          transAsg.reviewerComments = comments;

          // Notify translator
          this.addNotification({
            title: 'Translation Returned for Correction',
            titleAr: 'إعادة ملف الترجمة للتصحيح',
            message: `Your translation part for task ${asg.taskRef || ''} has been returned for correction. Notes: ${correctionNotes || ''}`,
            messageAr: `تم إعادة قسم الترجمة الخاص بك للمهمة ${asg.taskRef || ''} للتصحيح والتعديل. الملاحظات: ${correctionNotes || ''}`,
            userId: transAsg.translatorId,
            type: 'danger'
          });
        }
      }

      // Notify managers
      const adminsAndOwners = this.profiles.filter(p => p.role === 'admin' || p.role === 'owner');
      adminsAndOwners.forEach(p => {
        this.addNotification({
          title: 'Review Returned for Correction',
          titleAr: 'تم إرجاع ملف للمراجعة والتصحيح',
          message: `Reviewer returned part of task ${asg.taskRef || ''} for correction.`,
          messageAr: `قام المراجع بإرجاع جزء من المهمة ${asg.taskRef || ''} للتصحيح.`,
          userId: p.id,
          type: 'warning'
        });
      });
    } else if (status === 'approved') {
      // Approve this reviewer assignment
      this.approveAssignment(asg.id);

      // If there is a linked translator assignment, approve it too
      if (asg.relatedAssignmentId) {
        this.approveAssignment(asg.relatedAssignmentId);
      }
    } else {
      // General submission
      if (task) {
        task.status = 'review';
        if (reviewedFiles && reviewedFiles.length > 0) {
          if (!task.attachments) task.attachments = [];
          reviewedFiles.forEach(att => {
            const alreadyExists = task.attachments?.some(existing => existing.id === att.id || existing.name === att.name);
            if (!alreadyExists) {
              task.attachments?.push({
                ...att,
                name: `[REV] ${att.name}`
              });
            }
          });
        }
        this.updateTask(task);
      }

      // Notify managers
      const adminsAndOwners = this.profiles.filter(p => p.role === 'admin' || p.role === 'owner');
      adminsAndOwners.forEach(p => {
        this.addNotification({
          title: 'Review File Submitted',
          titleAr: 'تم تسليم ملف مراجعة',
          message: `Reviewer submitted review for file: ${asg.taskFileName || 'File'}.`,
          messageAr: `قام المراجع بتسليم ملف مراجعة للمستند: ${asg.taskFileName || 'ملف'}.`,
          userId: p.id,
          type: 'info'
        });
      });
    }

    this.save();
  }

  approveAssignment(assignmentId: string, verifiedWordCount?: number, verifiedRatePerWord?: number, verifiedRateFixed?: number, verifiedCalculatedAmount?: number, verifiedRatePerPage?: number, verifiedPageCount?: number) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (asg) {
      asg.status = 'approved';
      if (verifiedWordCount !== undefined) {
        asg.wordCountActual = verifiedWordCount;
      }
      if (verifiedPageCount !== undefined) {
        asg.pageCountAssigned = verifiedPageCount;
      }
      if (verifiedRatePerWord !== undefined) {
        asg.ratePerWord = verifiedRatePerWord;
      }
      if (verifiedRatePerPage !== undefined) {
        asg.ratePerPage = verifiedRatePerPage;
      }
      if (verifiedRateFixed !== undefined) {
        asg.rateFixed = verifiedRateFixed;
      }
      if (verifiedCalculatedAmount !== undefined) {
        asg.calculatedAmount = verifiedCalculatedAmount;
      } else {
        if (asg.ratePerPage !== undefined) {
          asg.calculatedAmount = (asg.pageCountAssigned ?? 1) * asg.ratePerPage;
        } else if (asg.ratePerWord !== undefined) {
          asg.calculatedAmount = (asg.wordCountActual ?? asg.wordCountAssigned) * asg.ratePerWord;
        } else if (asg.rateFixed !== undefined) {
          asg.calculatedAmount = asg.rateFixed;
        }
      }
      
      const task = this.tasks.find(t => t.id === asg.taskId);
      if (task) {
        const relevantAsgs = this.assignments.filter(a => a.taskId === task.id);
        const transAsgs = relevantAsgs.filter(a => a.assignmentType === 'translation');
        const revAndPfAsgs = relevantAsgs.filter(a => a.assignmentType === 'revision' || a.assignmentType === 'proofreading');

        task.translationCost = transAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.revisionCost = revAndPfAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.totalCost = task.translationCost + task.revisionCost + task.overtimeCost;
        task.netRevenue = task.amountEgp - task.totalCost;

        const allApproved = relevantAsgs.every(a => a.status === 'approved');
        if (allApproved) {
          task.status = 'completed';
        }
        this.updateTask(task);

        // Check if all translation parts are approved
        const allTransApproved = transAsgs.length > 0 && transAsgs.every(a => a.status === 'approved');
        if (allTransApproved) {
          this.addNotification({
            title: 'All Translation Parts Completed',
            titleAr: 'اكتملت جميع أقسام الترجمة',
            message: `All translation parts for task ${task.referenceNo} have been completed and approved.`,
            messageAr: `تم إكمال واعتماد جميع أقسام الترجمة للمهمة ${task.referenceNo}.`,
            userId: 'system',
            type: 'success'
          });
        }

        // Check if all reviewer parts are approved
        const allRevApproved = revAndPfAsgs.length > 0 && revAndPfAsgs.every(a => a.status === 'approved');
        if (allRevApproved) {
          this.addNotification({
            title: 'All Reviewer Parts Completed',
            titleAr: 'اكتملت جميع عمليات المراجعة والتدقيق',
            message: `All revision parts for task ${task.referenceNo} have been completed and approved.`,
            messageAr: `تم إكمال واعتماد جميع عمليات المراجعة للمهمة ${task.referenceNo}.`,
            userId: 'system',
            type: 'success'
          });
        }

        if (allApproved) {
          this.addNotification({
            title: 'Task Ready for Final Delivery',
            titleAr: 'المهمة جاهزة للتسليم النهائي',
            message: `All assignments for task ${task.referenceNo} are completed. Ready for final delivery!`,
            messageAr: `تم إنجاز كافة المهام للملف المرجعي ${task.referenceNo}. جاهز للتسليم النهائي!`,
            userId: 'system',
            type: 'success'
          });
        }
      }

      // Financial Accrual: Create a pending freelancer operating expense and perform double ledger entries automatically
      if (asg.calculatedAmount && asg.calculatedAmount > 0) {
        const translator = this.profiles.find(p => p.id === asg.translatorId);
        const translatorName = translator ? translator.fullName : `Translator-${asg.translatorId}`;
        
        this.addExpense({
          vendor: translatorName,
          category: 'freelancer',
          description: `${asg.assignmentType === 'translation' ? 'Translator' : 'Reviewer'} cost for assignment ${asg.id} (Task: ${task?.referenceNo || asg.taskId})`,
          amount: asg.calculatedAmount,
          currency: 'EGP',
          dueDate: asg.deadline || undefined,
          isRecurring: false,
          notes: `Automatically generated upon assignment approval. File: ${asg.taskFileName || 'N/A'}`
        });
      }

      this.save();
    }
  }

  updateAssignmentDeadline(assignmentId: string, newDeadline: string) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (asg) {
      const oldDeadline = asg.deadline;
      asg.deadline = newDeadline;
      this.save();

      // Notify translator of deadline update
      this.addNotification({
        title: 'Assignment Deadline Updated',
        titleAr: 'تحديث الموعد النهائي للمهمة',
        message: `Your assignment deadline for task ${asg.taskRef || ''} has been updated from ${oldDeadline || 'N/A'} to ${newDeadline}`,
        messageAr: `تم تحديث الموعد النهائي للمهمة ${asg.taskRef || ''} من ${oldDeadline || 'لا يوجد'} إلى ${newDeadline}`,
        userId: asg.translatorId,
        type: 'warning'
      });
    }
  }

  markTaskReadyForDelivery(
    taskId: string,
    overrideReason?: string,
    compileAttachments?: { finalFile?: TaskAttachment, finalReviewedFile?: TaskAttachment, deliveryReadyFile?: TaskAttachment }
  ): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const relevantAsgs = this.assignments.filter(a => a.taskId === taskId);
    const allApproved = relevantAsgs.length > 0 && relevantAsgs.every(a => a.status === 'approved');

    if (!allApproved && !overrideReason) {
      return false;
    }

    if (overrideReason) {
      task.adminOverrideReadyForDelivery = true;
      task.adminOverrideReason = overrideReason;
    }

    if (compileAttachments) {
      if (compileAttachments.finalFile) task.finalFile = compileAttachments.finalFile;
      if (compileAttachments.finalReviewedFile) task.finalReviewedFile = compileAttachments.finalReviewedFile;
      if (compileAttachments.deliveryReadyFile) task.deliveryReadyFile = compileAttachments.deliveryReadyFile;
    }

    task.status = 'completed';
    this.updateTask(task);

    // Notify admins
    const adminsAndOwners = this.profiles.filter(p => p.role === 'admin' || p.role === 'owner');
    adminsAndOwners.forEach(p => {
      this.addNotification({
        title: 'Task Marked Ready for Delivery',
        titleAr: 'تم تعيين المهمة كجاهزة للتسليم',
        message: `Task ${task.referenceNo} has been marked ready for delivery.${overrideReason ? ' (Bypassed with override)' : ''}`,
        messageAr: `تم تعيين المهمة ${task.referenceNo} كجاهزة للتسليم.${overrideReason ? ' (تم التجاوز والاعتماد اليدوي)' : ''}`,
        userId: p.id,
        type: 'success'
      });
    });

    this.save();
    return true;
  }

  declineAssignment(assignmentId: string, declineNotes?: string) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (asg) {
      const taskId = asg.taskId;
      
      // Remove the declined assignment
      this.assignments = this.assignments.filter(a => a.id !== assignmentId);
      
      // Update task costs and status
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        const remainingAsgs = this.assignments.filter(a => a.taskId === task.id);
        const transAsgs = remainingAsgs.filter(a => a.assignmentType === 'translation');
        const revAndPfAsgs = remainingAsgs.filter(a => a.assignmentType === 'revision' || a.assignmentType === 'proofreading');

        task.translationCost = transAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.revisionCost = revAndPfAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.totalCost = task.translationCost + task.revisionCost + task.overtimeCost;
        task.netRevenue = task.amountEgp - task.totalCost;
        
        if (remainingAsgs.length === 0) {
          task.status = 'pending';
        } else {
          task.status = 'assigned';
        }
        this.updateTask(task);
      }
      
      this.save();
      
      const adminsAndOwners = this.profiles.filter(p => p.role === 'admin' || p.role === 'owner');
      if (adminsAndOwners.length > 0) {
        adminsAndOwners.forEach(p => {
          this.addNotification({
            title: 'Task Assignment Declined',
            titleAr: 'تم رفض مهمة ترجمة',
            message: `Linguist declined assignment for "${asg.taskFileName || 'File'}". Reason: ${declineNotes || 'Not specified'}.`,
            messageAr: `اعتذر المترجم عن المهمة للملف "${asg.taskFileName || 'الملف'}". السبب: ${declineNotes || 'غير محدد'}.`,
            userId: p.id,
            type: 'warning'
          });
        });
      } else {
        this.addNotification({
          title: 'Task Assignment Declined',
          titleAr: 'تم رفض مهمة ترجمة',
          message: `Linguist declined assignment for "${asg.taskFileName || 'File'}". Reason: ${declineNotes || 'Not specified'}.`,
          messageAr: `اعتذر المترجم عن المهمة للملف "${asg.taskFileName || 'الملف'}". السبب: ${declineNotes || 'غير محدد'}.`,
          userId: 'system',
          type: 'warning'
        });
      }
    }
  }

  withdrawAssignment(assignmentId: string): boolean {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (!asg) return false;

    const taskId = asg.taskId;

    // Remove the assignment completely so translator loses all access
    this.assignments = this.assignments.filter(a => a.id !== assignmentId);

    // Update task costs and status
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      const remainingAsgs = this.assignments.filter(a => a.taskId === task.id);
      const transAsgs = remainingAsgs.filter(a => a.assignmentType === 'translation');
      const revAndPfAsgs = remainingAsgs.filter(a => a.assignmentType === 'revision' || a.assignmentType === 'proofreading');

      task.translationCost = transAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
      task.revisionCost = revAndPfAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
      task.totalCost = task.translationCost + task.revisionCost + task.overtimeCost;
      task.netRevenue = task.amountEgp - task.totalCost;

      if (remainingAsgs.length === 0) {
        task.status = 'approved'; // reset back to approved instead of keeping as assigned
      } else {
        const anyInProgress = remainingAsgs.some(a => a.status === 'in_progress');
        task.status = anyInProgress ? 'in_progress' : 'assigned';
      }
      this.updateTask(task);
    }

    this.save();
    return true;
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    // Cancel all current assignments for the task so translators cannot see it
    this.assignments = this.assignments.filter(a => a.taskId !== taskId);

    task.status = 'cancelled';
    this.updateTask(task);

    // Filter out transactions linked to this task and recalculate account balances
    this.transactions = this.transactions.filter(t => t.relatedEntityId !== taskId);
    this.recalculateAccountBalances();

    this.save();
    return true;
  }

  addClient(name: string, nameAr: string, phone: string, email: string, clientType: 'individual' | 'company' | 'agency', notes?: string): Client {
    const id = `c-${Date.now()}`;
    const newClient: Client = {
      id,
      name,
      nameAr,
      phone,
      email,
      clientType,
      notes,
      totalReceivablesEgp: 0,
      totalReceivablesAed: 0,
      totalReceivablesUsd: 0,
      createdAt: new Date().toISOString(),
      createdBy: this.activeProfile?.id || 'system'
    };
    this.clients.unshift(newClient);
    this.save();
    return newClient;
  }

  addPayment(paymentInput: any): Payment {
    const id = `pay-${Date.now()}`;
    
    // Normalize to new structure
    const date = paymentInput.date || paymentInput.paymentDate || new Date().toISOString().split('T')[0];
    const amount = paymentInput.amount || paymentInput.amountEgp || 0;
    const currency = paymentInput.currency || 'EGP';
    const method = paymentInput.method || paymentInput.paymentMethod || 'cash';
    const type = paymentInput.type || (paymentInput.paymentType as any) || 'income';

    const newPayment: Payment = {
      recordedBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString(),
      ...paymentInput,
      id,
      date,
      amount,
      currency,
      method,
      type,
    };

    this.payments.unshift(newPayment);

    // If it links to a Task, decrement receivables and modify Task payment details!
    const taskId = paymentInput.taskId;
    if (taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        let pEgp = paymentInput.amountEgp || (currency === 'EGP' ? amount : 0);
        let pAed = paymentInput.amountAed || (currency === 'AED' ? amount : 0);
        let pUsd = paymentInput.amountUsd || (currency === 'USD' ? amount : 0);

        // Pre-validation to enforce that the paid amount cannot exceed total agreed amount
        // Clamping to guarantee a non-negative balance
        if (pEgp > 0) {
          const remaining = Math.max(0, task.amountEgp - task.paidAmountEgp);
          if (pEgp > remaining) {
            pEgp = remaining;
          }
        }
        if (pAed > 0) {
          const remaining = Math.max(0, task.amountAed - task.paidAmountAed);
          if (pAed > remaining) {
            pAed = remaining;
          }
        }
        if (pUsd > 0) {
          const remaining = Math.max(0, task.amountUsd - task.paidAmountUsd);
          if (pUsd > remaining) {
            pUsd = remaining;
          }
        }

        // Apply normalized and validated amounts back to the payment record
        newPayment.amount = pEgp || pAed || pUsd || amount;
        newPayment.amountEgp = pEgp;
        newPayment.amountAed = pAed;
        newPayment.amountUsd = pUsd;

        const oldPaidEgp = task.paidAmountEgp;
        task.paidAmountEgp += pEgp;
        task.paidAmountAed += pAed;
        task.paidAmountUsd += pUsd;

        const totalDueEgp = task.amountEgp;
        const totalDueAed = task.amountAed;
        const totalDueUsd = task.amountUsd;

        const hasStillRemaining = 
          (totalDueEgp - task.paidAmountEgp > 0.01) || 
          (totalDueAed - task.paidAmountAed > 0.01) ||
          (totalDueUsd - task.paidAmountUsd > 0.01);

        const hasPaidSomething = 
          task.paidAmountEgp > 0 || task.paidAmountAed > 0 || task.paidAmountUsd > 0;

        if (!hasStillRemaining) {
          task.paymentStatus = 'paid';
        } else if (hasPaidSomething) {
          task.paymentStatus = 'partial';
        } else {
          task.paymentStatus = 'unpaid';
        }

        task.paymentMethod = method;
        this.updateTask(task);

        // General Ledger double entry bookkeeping postings
        const accountId = (method === 'bank_saib' || method === 'nbe') ? 'acc-1001' : 'acc-1000';
        const finalAmount = pEgp || pAed || pUsd || amount;
        this.postTransaction(accountId, 'debit', finalAmount, currency, `Payment received for task: ${task.referenceNo}`, id, 'payment');
        this.postTransaction('acc-1100', 'credit', finalAmount, currency, `Payment applied to task: ${task.referenceNo}`, id, 'payment');

        // Sync with accounting record list
        this.syncTaskAccountingRecord(taskId);
        this.addTaskAccountingAudit(
          taskId,
          'Record Payment',
          `Prior Paid: ${oldPaidEgp} EGP`,
          `New Paid: ${task.paidAmountEgp} EGP (Received: ${pEgp} EGP via ${method}).`
        );

        // Deduct from client receivables totals
        if (task.clientId) {
          const client = this.clients.find(c => c.id === task.clientId);
          if (client) {
            client.totalReceivablesEgp = Math.max(0, client.totalReceivablesEgp - pEgp);
            client.totalReceivablesAed = Math.max(0, client.totalReceivablesAed - pAed);
            client.totalReceivablesUsd = Math.max(0, client.totalReceivablesUsd - pUsd);
          }

          // Deduct from Monthly client receivables sheets too!
          const period = date.slice(0, 7); 
          this.reconcileMonthlyReceivablePayment(task.clientId, period, pEgp, pAed, pUsd);
        }
      }
    } else {
      // General non-task payments ledger double entries
      const finalAmount = amount || (currency === 'EGP' ? paymentInput.amountEgp : (currency === 'USD' ? paymentInput.amountUsd : 0)) || 0;
      if (finalAmount > 0) {
        const isExpense = type === 'expense' || paymentInput.paymentType === 'expense';
        const accountId = this.accounts.find(a => {
          const name = a.name.toLowerCase();
          return method === 'bank_saib' || method === 'nbe'
            ? a.type === 'asset' && name.includes('bank')
            : a.type === 'asset' && (name.includes('cash') || name.includes('khazina'));
        })?.id;
        
        if (isExpense && accountId) {
          this.postTransaction(accountId, 'credit', finalAmount, currency, paymentInput.notes || `General expense paid: ${paymentInput.payee || 'Vendor'}`, id, 'expense');
          
          const cat = (paymentInput.expenseCategory || paymentInput.category || '').toLowerCase();
          const expenseAccount = this.expenseCategories.find(c => c.name.toLowerCase() === cat || c.id === cat);
          const expenseAccCode = expenseAccount
            ? this.accounts.find(a => a.code === expenseAccount.accountCode)?.id
            : this.accounts.find(a => a.type === 'expense' && a.name.toLowerCase() === cat)?.id;
          
          if (expenseAccCode) {
            this.postTransaction(expenseAccCode, 'debit', finalAmount, currency, paymentInput.notes || `Disbursement for ${paymentInput.payee || 'Vendor'}`, id, 'expense');
          }
        } else if (accountId) {
          this.postTransaction(accountId, 'debit', finalAmount, currency, paymentInput.notes || `General income received`, id, 'payment');
          
          const revenueAccount = this.accounts.find(a => a.type === 'revenue');
          if (revenueAccount) {
            this.postTransaction(revenueAccount.id, 'credit', finalAmount, currency, paymentInput.notes || `General revenue inflow`, id, 'payment');
          }
        }
      }
    }

    this.save();

    this.addNotification({
      title: type === 'income' ? 'Cash Received Recorded' : 'Expense Registered',
      titleAr: type === 'income' ? 'تم تسجيل متحصلات مالية' : 'تم قيد مصروف خارجي',
      message: `${type === 'income' ? 'Income' : 'Expense'} of ${currency} ${amount.toLocaleString()} via ${method}.`,
      messageAr: `تم تسجيل ${type === 'income' ? 'إيراد' : 'مصروف'} بمبلغ ${amount.toLocaleString()} ${currency} عبر ${method}.`,
      userId: this.activeProfile?.id || '',
      type: type === 'income' ? 'success' : 'danger'
    });

    return newPayment;
  }

  deletePayment(paymentId: string) {
    const payment = this.payments.find(p => p.id === paymentId);
    if (!payment) return false;

    // Filter payments
    this.payments = this.payments.filter(p => p.id !== paymentId);

    // If it was linked to a task, subtract from the task's paidAmount
    if (payment.taskId) {
      const task = this.tasks.find(t => t.id === payment.taskId);
      if (task) {
        const pEgp = payment.amountEgp || (payment.currency === 'EGP' ? payment.amount : 0);
        const pAed = payment.amountAed || (payment.currency === 'AED' ? payment.amount : 0);
        const pUsd = payment.amountUsd || (payment.currency === 'USD' ? payment.amount : 0);

        const oldPaid = task.paidAmountEgp + task.paidAmountAed + task.paidAmountUsd;

        task.paidAmountEgp = Math.max(0, task.paidAmountEgp - pEgp);
        task.paidAmountAed = Math.max(0, task.paidAmountAed - pAed);
        task.paidAmountUsd = Math.max(0, task.paidAmountUsd - pUsd);

        // Recalculate status
        const totalDueEgp = task.amountEgp;
        const totalDueAed = task.amountAed;
        const totalDueUsd = task.amountUsd;

        const hasStillRemaining = 
          (totalDueEgp - task.paidAmountEgp > 0.01) || 
          (totalDueAed - task.paidAmountAed > 0.01) ||
          (totalDueUsd - task.paidAmountUsd > 0.01);

        const hasPaidSomething = 
          task.paidAmountEgp > 0 || task.paidAmountAed > 0 || task.paidAmountUsd > 0;

        if (!hasStillRemaining) {
          task.paymentStatus = 'paid';
        } else if (hasPaidSomething) {
          task.paymentStatus = 'partial';
        } else {
          task.paymentStatus = 'unpaid';
        }

        this.updateTask(task);

        // Re-add to client receivables because payment is deleted!
        if (task.clientId) {
          const client = this.clients.find(c => c.id === task.clientId);
          if (client) {
            client.totalReceivablesEgp += pEgp;
            client.totalReceivablesAed += pAed;
            client.totalReceivablesUsd += pUsd;
          }
          const period = (payment.date || new Date().toISOString().split('T')[0]).slice(0, 7);
          this.reconcileMonthlyReceivablePayment(task.clientId, period, -pEgp, -pAed, -pUsd);
        }

        // Sync accounting and audit log
        this.syncTaskAccountingRecord(payment.taskId);
        const newPaid = task.paidAmountEgp + task.paidAmountAed + task.paidAmountUsd;
        this.addTaskAccountingAudit(
          payment.taskId,
          'Delete Payment',
          `Paid before delete: ${oldPaid}`,
          `Paid after delete: ${newPaid} (Deleted payment ID: ${paymentId})`
        );
      }
    }

    // Filter out transactions linked to this payment and recalculate account balances
    this.transactions = this.transactions.filter(t => !(t.relatedEntityId === paymentId && t.relatedEntityType === 'payment'));
    this.recalculateAccountBalances();

    this.save();
    return true;
  }

  private reconcileMonthlyReceivablePayment(clientId: string, period: string, egp: number, aed: number, usd: number) {
    if (egp > 0) {
      const rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'EGP');
      if (rec) {
        rec.paidAmount += egp;
        rec.remaining = Math.max(0, rec.amount - rec.paidAmount);
      }
    }
    if (aed > 0) {
      const rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'AED');
      if (rec) {
        rec.paidAmount += aed;
        rec.remaining = Math.max(0, rec.amount - rec.paidAmount);
      }
    }
    if (usd > 0) {
      const rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'USD');
      if (rec) {
        rec.paidAmount += usd;
        rec.remaining = Math.max(0, rec.amount - rec.paidAmount);
      }
    }
  }

  addLiability(liab: Omit<StaffLiability, 'id' | 'createdAt' | 'paidAmount'>): StaffLiability {
    const id = `liab-${Date.now()}`;
    const newLiab: StaffLiability = {
      ...liab,
      id,
      paidAmount: 0,
      createdAt: new Date().toISOString()
    };
    this.liabilities.push(newLiab);
    this.save();
    return newLiab;
  }

  payLiability(id: string, payAmount: number) {
    const liab = this.liabilities.find(l => l.id === id);
    if (liab) {
      liab.paidAmount += payAmount;
      if (liab.paidAmount >= liab.amount) {
        liab.paidDate = new Date().toISOString().split('T')[0];
      }
      this.save();
    }
  }

  checkAutomationTriggers(trigger: any, context: { leadId?: string; clientId?: string }) {
    const rules = this.automationRules.filter(r => r.isActive && r.trigger === trigger);
    if (rules.length === 0) return;

    // Find applicable leads
    let targetLeads = [];
    if (context.leadId) {
      targetLeads = this.leads.filter(l => l.id === context.leadId);
    } else if (context.clientId) {
      targetLeads = this.leads.filter(l => l.convertedToClientId === context.clientId);
    }

    targetLeads.forEach(lead => {
      rules.forEach(rule => {
        if (rule.action === 'move_stage') {
          this.updateLeadStage(lead.id, rule.targetStage);
          this.addLeadActivity(lead.id, 'note', `Automation applied: ${rule.nameEn}`);
        }
      });
    });
  }

  addAutomationRule(rule: any) {
    const newRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: this.activeProfile?.id || 'system'
    };
    this.automationRules.push(newRule);
    this.save();
    return newRule;
  }

  toggleAutomationRule(id: string) {
    const rule = this.automationRules.find(r => r.id === id);
    if (rule) {
      rule.isActive = !rule.isActive;
      this.save();
    }
  }

  deleteAutomationRule(id: string) {
    this.automationRules = this.automationRules.filter(r => r.id !== id);
    this.save();
  }

  addQuotation(quoteInput: any): Quotation {
    const id = `quote-${Date.now()}`;
    const seq = this.quotations.length + 1;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const quoteNumber = `QT-${dateStr}-${seq}`;

    // Calculate totals if missing
    const grandTotal = quoteInput.grandTotal || quoteInput.amountEgp || quoteInput.amountAed || quoteInput.amountUsd || 0;
    const currency = quoteInput.currency || (quoteInput.amountUsd > 0 ? 'USD' : (quoteInput.amountAed > 0 ? 'AED' : 'EGP'));

    const newQuote: Quotation = {
      items: [],
      subtotal: grandTotal,
      taxTotal: 0,
      discountTotal: 0,
      grandTotal: grandTotal,
      currency: currency,
      clientId: '',
      clientName: '',
      validUntil: now.toISOString().split('T')[0],
      documentsToBeTranslated: [],
      referenceDocuments: [],
      depositAmount: 0,
      depositBalance: 0,
      ...quoteInput,
      id,
      quoteNumber,
      status: quoteInput.status || 'created',
      createdBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString()
    };
    this.quotations.unshift(newQuote);
    this.save();
    return newQuote;
  }

  addInvoice(invoiceInput: any): Invoice {
    const id = `inv-${Date.now()}`;
    const seq = this.invoices.length + 1;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${seq}`;

    const newInvoice: Invoice = {
      items: [],
      subtotal: 0,
      taxTotal: 0,
      discountTotal: 0,
      grandTotal: 0,
      currency: 'EGP',
      balance: 0,
      clientId: '',
      clientName: '',
      invoiceDate: now.toISOString().split('T')[0],
      dueDate: now.toISOString().split('T')[0],
      ...invoiceInput,
      id,
      invoiceNumber: invoiceInput.invoiceNumber || invoiceNumber,
      status: invoiceInput.status || 'unpaid',
      createdAt: new Date().toISOString()
    };

    this.invoices.unshift(newInvoice);
    this.save();
    return newInvoice;
  }

  updateQuotationStatus(id: string, status: QuotationStatus, cancellationReason?: string) {
    const q = this.quotations.find(quote => quote.id === id);
    if (q) {
      q.status = status;
      if (cancellationReason) {
        q.cancellationReason = cancellationReason;
      }
      
      if (status === 'confirmed') {
        const intakeChannel = (q as any).intakeChannel || 'email';
        this.convertQuotationToJob(id, intakeChannel);
      }

      if (status === 'confirmed' || status === 'converted') {
        this.convertLeadForQuotationToWon(q);
      }
      
      this.save();
    }
  }

  convertLeadForQuotationToWon(quote: any) {
    if (!quote) return;
    const lead = this.leads.find(l => 
      (quote.opportunityId && l.id === quote.opportunityId) ||
      (quote.clientId && l.convertedToClientId === quote.clientId)
    );
    if (lead && lead.stage !== 'won') {
      lead.stage = 'won';
      this.addLeadActivity(
        lead.id,
        'note',
        `Lead automatically marked Won because the associated quotation (${quote.quoteNumber}) was confirmed/converted.`
      );
    }
  }

  recordQuotationDeposit(id: string, amount: number, method: PaymentMethod, proofUrl?: string, proofName?: string) {
    const q = this.quotations.find(quote => quote.id === id);
    if (q) {
      q.depositAmount = (q.depositAmount || 0) + amount;
      q.depositCurrency = q.currency;
      q.depositDate = new Date().toISOString();
      q.depositBalance = q.grandTotal - q.depositAmount;
      q.depositMethod = method;
      if (proofUrl) {
        q.depositProofUrl = proofUrl;
        q.depositProofName = proofName || 'deposit_proof';
      }
      
      // Also update the task if it exists
      if (q.convertedToJobId) {
        const task = this.tasks.find(t => t.id === q.convertedToJobId);
        if (task) {
          if (q.currency === 'EGP') task.paidAmountEgp += amount;
          else if (q.currency === 'AED') task.paidAmountAed += amount;
          else if (q.currency === 'USD') task.paidAmountUsd += amount;
          
          if ((task.paidAmountEgp + task.paidAmountAed + task.paidAmountUsd) >= (task.amountEgp + task.amountAed + task.amountUsd)) {
             task.paymentStatus = 'paid';
          } else if ((task.paidAmountEgp + task.paidAmountAed + task.paidAmountUsd) > 0) {
             task.paymentStatus = 'partial';
          }
        }
      }
      
      this.save();
    }
  }

  updateInvoiceStatus(id: string, status: any) {
    const i = this.invoices.find(inv => inv.id === id);
    if (i) {
      i.status = status;
      this.save();
    }
  }

  convertQuotationToInvoice(quoteId: string): Invoice {
    const quote = this.quotations.find(q => q.id === quoteId);
    if (!quote) throw new Error('Quotation not found');

    const id = `inv-${Date.now()}`;
    const seq = this.invoices.length + 1;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${seq}`;

    const newInvoice: Invoice = {
      id,
      invoiceNumber,
      quotationId: quote.id,
      clientId: quote.clientId,
      clientName: quote.clientName,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days due by default
      items: quote.items,
      subtotal: quote.subtotal,
      taxTotal: quote.taxTotal,
      discountTotal: quote.discountTotal,
      grandTotal: quote.grandTotal,
      currency: quote.currency,
      paidAmount: 0,
      balance: quote.grandTotal,
      status: 'unpaid',
      createdBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString()
    };

    this.invoices.unshift(newInvoice);
    quote.status = 'converted';
    quote.convertedToInvoiceId = id;
    this.convertLeadForQuotationToWon(quote);

    // Financial Posting: Debit Accounts Receivable, Credit Revenue
    this.postTransaction('acc-1100', 'debit', newInvoice.grandTotal, newInvoice.currency, `Invoice issued: ${invoiceNumber}`, id, 'invoice');
    this.postTransaction('acc-4000', 'credit', newInvoice.grandTotal, newInvoice.currency, `Revenue from invoice: ${invoiceNumber}`, id, 'invoice');

    this.save();
    return newInvoice;
  }

  convertQuotationToJob(quoteId: string, intakeChannel: IntakeChannel): Task {
    const quote = this.quotations.find(q => q.id === quoteId);
    if (!quote) throw new Error('Quotation not found');

    // Single-task constraint check (service level guard)
    const existingTaskId = quote.convertedToJobId || quote.linkedTaskId || quote.linked_task_id;
    if (existingTaskId) {
      const existingTask = this.tasks.find(t => t.id === existingTaskId);
      if (existingTask) {
        return existingTask;
      }
    }
    const duplicateTask = this.tasks.find(t => t.quotationId === quoteId || t.quotation_id === quoteId);
    if (duplicateTask) {
      quote.convertedToJobId = duplicateTask.id;
      quote.linkedTaskId = duplicateTask.id;
      quote.linked_task_id = duplicateTask.id;
      this.save();
      return duplicateTask;
    }

    const id = `t-${Date.now()}`;
    const intakeDate = new Date().toISOString().split('T')[0];
    const referenceNo = this.generateRefNo(intakeDate);
    
    // Create first item as the main task file for simple conversion
    const mainItem = quote.items[0];

    const newTask: Task = {
      id,
      referenceNo,
      clientId: quote.clientId,
      clientNameCache: quote.clientName,
      fileName: quote.documentsToBeTranslated.length > 0 
        ? quote.documentsToBeTranslated[0].name 
        : (mainItem ? mainItem.description : ''),
      serviceType: (quote as any).serviceType || (mainItem as any)?.serviceType || '',
      sourceLanguage: quote.sourceLanguage || '',
      targetLanguage: quote.targetLanguage || '',
      wordCount: mainItem ? mainItem.quantity : 0,
      pageCount: 1,
      amountEgp: quote.currency === 'EGP' ? quote.grandTotal : 0,
      amountAed: quote.currency === 'AED' ? quote.grandTotal : 0,
      amountUsd: quote.currency === 'USD' ? quote.grandTotal : 0,
      hasTaxInvoice: quote.taxTotal > 0,
      paymentStatus: 'unpaid',
      paidAmountEgp: 0,
      paidAmountAed: 0,
      paidAmountUsd: 0,
      status: 'pending',
      intakeChannel,
      intakeDate,
      translationCost: 0,
      revisionCost: 0,
      overtimeCost: 0,
      totalCost: 0,
      netRevenue: quote.grandTotal,
      attachments: [
        ...(quote.documentsToBeTranslated || []),
        ...(quote.referenceDocuments || [])
      ],
      createdBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quotationId: quote.id,
      quotation_id: quote.id
    };

    this.tasks.unshift(newTask);
    quote.status = 'converted';
    quote.convertedToJobId = id;
    quote.linkedTaskId = id;
    quote.linked_task_id = id;
    this.convertLeadForQuotationToWon(quote);

    this.save();

    this.addNotification({
      title: 'Quotation Converted to Task',
      titleAr: 'تم تحويل عرض السعر إلى مهمة',
      message: `Quotation ${quote.quoteNumber} has been confirmed and converted to Task ${referenceNo}.`,
      messageAr: `تمت الموافقة على عرض السعر ${quote.quoteNumber} وتحويله إلى الملف رقم ${referenceNo}.`,
      userId: this.activeProfile?.id || 'system',
      type: 'success'
    });

    return newTask;
  }

  recordInvoicePayment(invoiceId: string, amount: number, method: PaymentMethod, date: string, reference?: string): Payment {
    const inv = this.invoices.find(i => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const id = `pay-${Date.now()}`;
    const newPayment: Payment = {
      id,
      date,
      amount,
      currency: inv.currency,
      method,
      type: 'income',
      clientId: inv.clientId,
      invoiceId: inv.id,
      referenceNo: reference,
      recordedBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString()
    };

    inv.paidAmount += amount;
    inv.balance = inv.grandTotal - inv.paidAmount;
    if (inv.balance <= 0) inv.status = 'paid';
    else inv.status = 'partial';

    this.payments.unshift(newPayment);

    // Financial Posting: 
    // 1. Debit Cash/Bank
    const accountId = (method === 'bank_saib') ? 'acc-1001' : 'acc-1000';
    this.postTransaction(accountId, 'debit', amount, inv.currency, `Payment received for ${inv.invoiceNumber}`, id, 'payment');
    // 2. Credit Accounts Receivable
    this.postTransaction('acc-1100', 'credit', amount, inv.currency, `Payment applied to ${inv.invoiceNumber}`, id, 'payment');

    this.save();
    return newPayment;
  }

  addExpense(expense: Omit<OperatingExpense, 'id' | 'createdAt' | 'status'> & { status?: 'pending' | 'paid'; paymentMethod?: PaymentMethod; paymentDate?: string }): OperatingExpense {
    const id = `exp-${Date.now()}`;
    const status = expense.status || 'pending';
    const newExpense: OperatingExpense = {
      ...expense,
      id,
      status,
      createdAt: new Date().toISOString()
    };
    
    this.expenses.unshift(newExpense);
    
    const category = this.expenseCategories.find(c => c.id === expense.category || c.name.toLowerCase() === String(expense.category).toLowerCase());
    const expenseAccountId = category
      ? this.accounts.find(a => a.code === category.accountCode)?.id
      : this.accounts.find(a => a.type === 'expense' && a.name.toLowerCase() === String(expense.category).toLowerCase())?.id;
    const payableAccountId = this.accounts.find(a => a.code === '2000' || a.name.toLowerCase().includes('payable'))?.id;
    
    if (expenseAccountId && payableAccountId) {
      this.postTransaction(expenseAccountId, 'debit', expense.amount, expense.currency, `Expense logged: ${expense.description}`, id, 'expense');
      this.postTransaction(payableAccountId, 'credit', expense.amount, expense.currency, `Accounts payable for: ${expense.description}`, id, 'expense');
    }

    if (status === 'paid') {
      const method = expense.paymentMethod || 'cash';
      const assetAccountId = this.accounts.find(a => {
        const name = a.name.toLowerCase();
        return method === 'bank_saib'
          ? a.type === 'asset' && name.includes('bank')
          : a.type === 'asset' && (name.includes('cash') || name.includes('khazina'));
      })?.id;
      if (payableAccountId && assetAccountId) {
        this.postTransaction(payableAccountId, 'debit', expense.amount, expense.currency, `Paid expense: ${expense.description}`, id, 'expense');
        this.postTransaction(assetAccountId, 'credit', expense.amount, expense.currency, `Disbursement for expense: ${expense.description}`, id, 'expense');
      }

      // Add to Cashbook payments
      this.payments.unshift({
        id: `pay-${Date.now()}`,
        recordedBy: this.activeProfile?.id || '',
        createdAt: new Date().toISOString(),
        date: expense.paymentDate || new Date().toISOString().split('T')[0],
        amount: expense.amount,
        amountEgp: expense.currency === 'EGP' ? expense.amount : 0,
        amountAed: 0,
        amountUsd: expense.currency === 'USD' ? expense.amount : 0,
        currency: expense.currency as any,
        method: method,
        type: 'expense',
        expenseCategory: expense.category as any,
        payee: expense.vendor,
        clientName: '',
        fileName: '',
        notes: expense.notes || `Settled expense: ${expense.description}`
      });
    }

    this.save();
    return newExpense;
  }

  payExpense(expenseId: string, paymentMethod: 'cash' | 'bank_saib'): OperatingExpense | null {
    const expense = this.expenses.find(e => e.id === expenseId);
    if (!expense || expense.status === 'paid') return null;

    expense.status = 'paid';

    // 1. Debit Accounts Payable (acc-2000) - reducing our liability
    this.postTransaction('acc-2000', 'debit', expense.amount, expense.currency, `Paid expense: ${expense.description}`, expenseId, 'expense');

    // 2. Credit Asset Account (Cash acc-1000 or Bank acc-1001) - outgoing cash
    const accountId = (paymentMethod === 'bank_saib') ? 'acc-1001' : 'acc-1000';
    this.postTransaction(accountId, 'credit', expense.amount, expense.currency, `Disbursement for expense: ${expense.description}`, expenseId, 'expense');

    // Also register this in Cashbook payments as an expense payment
    this.payments.unshift({
      id: `pay-${Date.now()}`,
      recordedBy: this.activeProfile?.id || 'admin',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      amount: expense.amount,
      amountEgp: expense.currency === 'EGP' ? expense.amount : 0,
      amountAed: 0,
      amountUsd: expense.currency === 'USD' ? expense.amount : 0,
      currency: expense.currency as any,
      method: paymentMethod,
      type: 'expense',
      expenseCategory: expense.category as any,
      payee: expense.vendor,
      clientName: 'Office Expense Ledger',
      fileName: 'Settled Voucher Invoice',
      notes: `Settled voucher for: ${expense.description}`
    });

    this.save();
    return expense;
  }

  addAccount(account: Omit<Account, 'id' | 'balance'>): Account {
    const id = `acc-custom-${Date.now()}`;
    const newAccount: Account = {
      ...account,
      id,
      balance: 0
    };
    this.accounts.push(newAccount);
    this.save();
    return newAccount;
  }

  private postTransaction(accountId: string, type: 'debit' | 'credit', amount: number, currency: string, description: string, entityId?: string, entityType?: FinancialTransaction['relatedEntityType']) {
    const transaction: FinancialTransaction = {
      id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      accountId,
      type,
      amount,
      currency: currency as any,
      description,
      relatedEntityId: entityId,
      relatedEntityType: entityType,
      date: new Date().toISOString().split('T')[0],
      createdBy: this.activeProfile?.id || 'system',
      createdAt: new Date().toISOString()
    };

    this.transactions.push(transaction);
    
    // Update account balance
    const acc = this.accounts.find(a => a.id === accountId);
    if (acc) {
      if (acc.type === 'asset' || acc.type === 'expense') {
        if (type === 'debit') acc.balance += amount;
        else acc.balance -= amount;
      } else { // liability, equity, revenue
        if (type === 'credit') acc.balance += amount;
        else acc.balance -= amount;
      }
    }
  }

  recalculateAccountBalances() {
    this.accounts.forEach(a => {
      a.balance = 0;
    });

    this.transactions.forEach(t => {
      const acc = this.accounts.find(a => a.id === t.accountId);
      if (acc) {
        if (acc.type === 'asset' || acc.type === 'expense') {
          if (t.type === 'debit') acc.balance += t.amount;
          else acc.balance -= t.amount;
        } else { // liability, equity, revenue
          if (t.type === 'credit') acc.balance += t.amount;
          else acc.balance -= t.amount;
        }
      }
    });
  }

  saveAttendance(list: Omit<SalaryAttendance, 'id'>[]) {
    // Delete existing attendance for the days and translators represented to overwrite cleanly
    list.forEach(item => {
      this.attendance = this.attendance.filter(
        a => !(a.translatorId === item.translatorId && a.workDate === item.workDate && a.session === item.session)
      );
      this.attendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ...item
      });
    });
    this.save();
  }

  // --- MONTHLY CLOSING ---
  calculateClosingMetrics(period: string) {
    // Collect all completed transactions / payments received in that period
    const paymentsInMonth = this.payments.filter(p => p.paymentDate.startsWith(period));
    const incomePayments = paymentsInMonth.filter(p => p.paymentType === 'income');
    const expensePayments = paymentsInMonth.filter(p => p.paymentType === 'expense');

    const totalRevenueEgp = incomePayments.reduce((s, p) => s + p.amountEgp, 0);
    const totalRevenueAed = incomePayments.reduce((s, p) => s + p.amountAed, 0);
    const totalRevenueUsd = incomePayments.reduce((s, p) => s + p.amountUsd, 0);

    const totalExpensesEgp = expensePayments.reduce((s, p) => s + p.amountEgp, 0);
    const totalExpensesAed = expensePayments.reduce((s, p) => s + p.amountAed, 0);

    // Salaried monthly translator staff tracking
    const salaryBreakdown: Record<string, { name: string; words: number; amount: number }> = {};
    const translators = this.profiles.filter(p => p.role === 'translator' || p.role === 'admin');
    
    translators.forEach(t => {
      // count words completed by him in assignments that belong to this month
      const assignedTaskIdsInPeriod = this.tasks
        .filter(task => task.intakeDate.startsWith(period))
        .map(task => task.id);
        
      const taskAssignments = this.assignments.filter(
        asg => asg.translatorId === t.id && assignedTaskIdsInPeriod.includes(asg.taskId)
      );

      const words = taskAssignments.reduce((s, a) => s + (a.wordCountActual || a.wordCountAssigned), 0);
      
      let amount = t.monthlySalary || 0;
      if (t.employeeType === 'freelance') {
        amount = taskAssignments.reduce((s, a) => s + a.calculatedAmount, 0);
      } else {
        // Staff translator overages
        const contractWords = t.contractWords || 0;
        if (contractWords > 0 && words > contractWords) {
          const rateOver = t.perWordRate || 0.15;
          amount += (words - contractWords) * rateOver;
        }
      }

      salaryBreakdown[t.id] = {
        name: t.fullName,
        words,
        amount
      };
    });

    return {
      totalRevenueEgp,
      totalRevenueAed,
      totalRevenueUsd,
      totalExpensesEgp,
      totalExpensesAed,
      salaryBreakdown
    };
  }

  closeMonthPeriod(period: string, rateAed: number, rateUsd: number, notes?: string): MonthlyClosing {
    const existing = this.closings.find(c => c.period === period);
    if (existing && existing.status === 'closed') {
      throw new Error(`Period ${period} is already closed and locked!`);
    }

    const {
      totalRevenueEgp,
      totalRevenueAed,
      totalRevenueUsd,
      totalExpensesEgp,
      totalExpensesAed,
      salaryBreakdown
    } = this.calculateClosingMetrics(period);

    // Sum all translator salaries as expenses
    const translatorSalaryTotals = Object.values(salaryBreakdown).reduce((s, breakdown) => s + breakdown.amount, 0);
    const totalExpensesCombinedEgp = totalExpensesEgp + translatorSalaryTotals;

    // Currency conversions to EGP
    const netRevenueCombinedEgp = totalRevenueEgp + (totalRevenueAed * rateAed) + (totalRevenueUsd * rateUsd);
    const netProfitEgp = netRevenueCombinedEgp - totalExpensesCombinedEgp;

    // Partner division
    const partnerShare = netProfitEgp / 2;

    const newClosing: MonthlyClosing = {
      id: `cls-${Date.now()}`,
      period,
      totalRevenueEgp,
      totalRevenueAed,
      totalRevenueUsd,
      totalExpensesEgp: totalExpensesCombinedEgp, // Includes staff wages
      totalExpensesAed,
      salaryBreakdown,
      rateAedToEgp: rateAed,
      rateUsdToEgp: rateUsd,
      netProfitEgp: totalRevenueEgp - totalExpensesCombinedEgp,
      netProfitAed: totalRevenueAed - totalExpensesAed,
      netProfitUsd: totalRevenueUsd,
      totalProfitEgp: netProfitEgp,
      partner1Share: partnerShare,
      partner2Share: partnerShare,
      
      // Balances
      cashEgp: this.accounts.filter(a => a.type === 'asset' && a.currency === 'EGP' && a.name.toLowerCase().includes('cash')).reduce((s, a) => s + Number(a.balance || 0), 0),
      cashAed: totalRevenueAed - totalExpensesAed,
      cashUsd: totalRevenueUsd,
      bankSaibEgp: this.accounts.filter(a => a.type === 'asset' && a.currency === 'EGP' && a.name.toLowerCase().includes('bank')).reduce((s, a) => s + Number(a.balance || 0), 0),
      
      totalReceivablesEgp: this.receivables.filter(r => r.currency === 'EGP').reduce((s, r) => s + r.remaining, 0),
      totalReceivablesAed: this.receivables.filter(r => r.currency === 'AED').reduce((s, r) => s + r.remaining, 0),
      status: 'closed',
      closedBy: this.activeProfile?.id || 'system',
      closedAt: new Date().toISOString(),
      notes,
      createdAt: new Date().toISOString()
    };

    this.closings = this.closings.filter(c => c.period !== period);
    this.closings.push(newClosing);

    // Pay translators' and employees' salaries automatically and register as real operating expenses
    Object.entries(salaryBreakdown).forEach(([tid, details]) => {
      this.addExpense({
        vendor: details.name,
        category: 'salary',
        description: `Salary disbursement for closed month ${period}`,
        amount: details.amount,
        currency: 'EGP',
        dueDate: `${period}-28`,
        paymentDate: `${period}-28`,
        isRecurring: false,
        status: 'paid',
        paymentMethod: 'cash',
        notes: `Salary disbursement for closed month ${period}`
      });
    });

    this.save();

    this.addNotification({
      title: `Monthly Closed Completed`,
      titleAr: `تم إغلاق الشهر المالي`,
      message: `Locked calendar period ${period}. Partner dividend shares calculated from database transactions.`,
      messageAr: `تم إغلاق الشهر ${period}. نصيب الشركاء (أحمد وأبو الفتوح): ${partnerShare.toLocaleString()} ج.م لكل منهما.`,
      userId: this.activeProfile?.id || '',
      type: 'success'
    });

    return newClosing;
  }

  addPdfLog(log: Omit<PdfExportLog, 'id' | 'timestamp'>) {
    this.pdfLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...log
    });
    this.save();
  }

  addLetterhead(lh: Omit<LetterheadTemplate, 'id' | 'createdAt'>) {
    const id = `lh-${Date.now()}`;
    const newLh = { ...lh, id, createdAt: new Date().toISOString() };
    if (lh.isDefault) {
      this.letterheads.forEach(l => l.isDefault = false);
    }
    this.letterheads.push(newLh);
    this.save();
    return newLh;
  }

  addStamp(stamp: Omit<StampAsset, 'id' | 'createdAt'>) {
    const id = `st-${Date.now()}`;
    const newStamp = { ...stamp, id, createdAt: new Date().toISOString() };
    this.stamps.push(newStamp);
    this.save();
    return newStamp;
  }

  addPreset(preset: Omit<LayoutPreset, 'id' | 'createdAt'>) {
    const id = `pr-${Date.now()}`;
    const newPreset = { ...preset, id, createdAt: new Date().toISOString() };
    this.presets.push(newPreset);
    this.save();
    return newPreset;
  }

  addFeedback(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>) {
    const newEntry = {
      ...entry,
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    this.feedback.unshift(newEntry);
    this.save();
    return newEntry;
  }

  addNotification(n: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) {
    this.notifications.unshift({
      id: `n-${Date.now()}`,
      isActive: true,
      isRead: false,
      createdAt: new Date().toISOString(),
      ...n
    } as any);
    this.save();
  }

  async triggerEmailNotification(toEmail: string, subject: string, bodyText: string) {
    if (!toEmail) return;
    try {
      const smtp = this.brandConfig?.smtpConfig;
      if (!smtp) return;
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: toEmail, 
          subject, 
          text: bodyText,
          smtpConfig: smtp
        })
      });
      const data = await response.json();
      console.log('Automated Email sent to', toEmail, data);
    } catch (err) {
      console.error('Failed to trigger email notification:', err);
    }
  }

  markAllNotificationsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.save();
  }

  // --- STRICT ENTERPRISE SECURITY AND ACCESS CONTROL LOGGING ---
  logSecurityEvent(action: SecurityAuditLog['action'], details: string, status: SecurityAuditLog['status'], refId?: string) {
    const profile = this.activeProfile || { id: 'anonymous', fullName: 'Anonymous Guest', role: 'translator' };
    const log: SecurityAuditLog = {
      id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: profile.id,
      userName: profile.fullName,
      userRole: profile.role as any,
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: undefined,
      status,
      refId
    };
    this.securityLogs.unshift(log);
    this.save();
    return log;
  }

  addExportRequest(dataType: string, exportReason: string, status: 'pending' | 'approved' | 'rejected' = 'pending', approvedBy?: string, approvedAt?: string) {
    if (!this.activeProfile) return null;
    const req: ExportApprovalRequest = {
      id: `expr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: this.activeProfile.id,
      userName: this.activeProfile.fullName,
      userRole: this.activeProfile.role,
      dataType,
      exportReason,
      requestedAt: new Date().toISOString(),
      status,
      approvedBy,
      approvedAt
    };
    this.exportRequests.unshift(req);
    this.save();
    return req;
  }

  approveExportRequest(requestId: string, approverName: string) {
    const req = this.exportRequests.find(r => r.id === requestId);
    if (req) {
      req.status = 'approved';
      req.approvedBy = approverName;
      req.approvedAt = new Date().toISOString();
      this.save();
      
      this.logSecurityEvent('export_attempt', `Export Request ID: ${requestId} approved for ${req.userName} to download ${req.dataType}. Reason: ${req.exportReason}`, 'success', req.id);
      return true;
    }
    return false;
  }

  rejectExportRequest(requestId: string, rejectReason: string) {
    const req = this.exportRequests.find(r => r.id === requestId);
    if (req) {
      req.status = 'rejected';
      req.rejectionReason = rejectReason;
      this.save();
      
      this.logSecurityEvent('export_attempt', `Export Request ID: ${requestId} REJECTED for ${req.userName}. Reason: ${rejectReason}`, 'denied', req.id);
      return true;
    }
    return false;
  }

  // --- SOURCE AND TARGET FILE WORKFLOW WITH VERSION HISTORY ---
  uploadSourceFile(taskId: string, fileName: string, fileUrl: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    // Check Allowed Roles: Owner, Secretary (admin), Account Manager (sales), Project Manager (admin)
    const allowed = ['owner', 'admin', 'sales'].includes(this.activeProfile?.role || '');
    if (!allowed) {
      this.logSecurityEvent('unauthorized_access', `Unauthorized attempt to upload source file ${fileName} to task ${task.referenceNo}.`, 'denied', taskId);
      return false;
    }

    // Initialize version history
    if (!task.sourceFileVersions) {
      task.sourceFileVersions = [];
    }

    const nextVer = task.sourceFileVersions.length + 1;
    task.sourceFileVersions.push({
      version: nextVer,
      url: fileUrl,
      name: fileName,
      uploadedBy: this.activeProfile?.fullName || 'Unknown',
      uploadedAt: new Date().toISOString()
    });

    task.sourceFileName = fileName;
    task.sourceFileUrl = fileUrl;
    
    // Status Flow update: New Task (pending) -> Source Uploaded
    if (task.status === 'pending' || !task.status) {
      task.status = 'approved'; // Let's keep cohesive with existing systems but transition appropriately
    }

    this.updateTask(task);
    this.logSecurityEvent('file_upload_source', `Uploaded source file ${fileName} (v${nextVer}) for task ${task.referenceNo}.`, 'success', taskId);

    return true;
  }

  uploadAndSubmitTargetTranslation(taskId: string, fileName: string, fileUrl: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    // Allowed Users: Translator, Proofreader (translator), Project Manager (admin), Owner
    const allowed = ['translator', 'admin', 'owner'].includes(this.activeProfile?.role || '');
    if (!allowed) {
      this.logSecurityEvent('unauthorized_access', `Unauthorized attempt to upload target translation ${fileName} for task ${task.referenceNo}.`, 'denied', taskId);
      return false;
    }

    // Initialize version history
    if (!task.targetFileVersions) {
      task.targetFileVersions = [];
    }

    const nextVer = task.targetFileVersions.length + 1;
    task.targetFileVersions.push({
      version: nextVer,
      url: fileUrl,
      name: fileName,
      uploadedBy: this.activeProfile?.fullName || 'Unknown',
      uploadedAt: new Date().toISOString()
    });

    task.targetFileName = fileName;
    task.targetFileUrl = fileUrl;
    
    // Auto-update status to "Translation Submitted"
    task.status = 'review'; // corresponds to Translation Submitted / Under Review in standard list
    
    this.updateTask(task);

    // Notify coordinators/owners
    this.addNotification({
      title: 'Translation Submitted',
      titleAr: 'تم تقديم الترجمة',
      message: `Task ${task.referenceNo} completion uploaded by linguist ${this.activeProfile?.fullName}. Target file active: v${nextVer}.`,
      messageAr: `تم تقديم الترجمة للمهمة ${task.referenceNo} بواسطة ${this.activeProfile?.fullName}. الإصدار الحالي: v${nextVer}.`,
      type: 'success',
      isRead: false
    } as any);

    this.logSecurityEvent('file_upload_target', `Submitted target translation ${fileName} (v${nextVer}) for task ${task.referenceNo}.`, 'success', taskId);
    return true;
  }

  reopenTask(taskId: string): boolean {
    const task = this.tasks.find( t => t.id === taskId);
    if (!task) return false;

    const allowed = ['owner', 'admin', 'sales'].includes(this.activeProfile?.role || '');
    if (!allowed) {
      this.logSecurityEvent('unauthorized_access', `Unauthorized attempt to reopen task ${task.referenceNo}.`, 'denied', taskId);
      return false;
    }

    // Change status back to "in_progress" (In Translation)
    task.status = 'in_progress';
    this.updateTask(task);

    this.addNotification({
      title: 'Task Reopened',
      titleAr: 'إعادة فتح المهمة',
      message: `Task ${task.referenceNo} has been reopened. Reupload translation as needed.`,
      messageAr: `تمت إعادة فتح المهمة ${task.referenceNo} للتعديل.`,
      type: 'warning',
      isRead: false
    } as any);

    this.logSecurityEvent('other', `Reopened task ${task.referenceNo} for corrections.`, 'success', taskId);
    return true;
  }

  selectCertifiedCopySettings(taskId: string, letterheadId: string, stampId: string, certificationStatement?: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const allowed = ['owner', 'admin', 'sales'].includes(this.activeProfile?.role || '');
    if (!allowed) return false;

    task.selectedLetterheadId = letterheadId;
    task.selectedStampId = stampId;
    if (certificationStatement !== undefined) {
      task.certificationStatement = certificationStatement;
    }
    
    this.updateTask(task);
    return true;
  }

  generateCertifiedCopy(taskId: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const allowed = ['owner', 'admin', 'sales'].includes(this.activeProfile?.role || '');
    if (!allowed) {
      this.logSecurityEvent('unauthorized_access', `Unauthorized attempt to generate certified copy for task ${task.referenceNo}.`, 'denied', taskId);
      return false;
    }

    // Set task state or log certified copy generated flag if status is not already delivered
    if (task.status !== 'delivered' && task.status !== 'completed') {
      task.status = 'completed'; // Certified copy generated
    }
    this.updateTask(task);

    this.logSecurityEvent('certified_copy_export', `Generated certified translation copy for task ${task.referenceNo}.`, 'success', taskId);
    return true;
  }
}

export const dbInstance = new GTMSDatabase();
export default dbInstance;
