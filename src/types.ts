/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'sales' | 'accountant' | 'translator' | 'admin';
export type EmployeeType = 'staff' | 'freelance';
export type ServiceType = 
  | 'translation' 
  | 'proofreading' 
  | 'certified_translation' 
  | 'revision' 
  | 'review_and_approval' 
  | 'interpretation' 
  | 'transcription' 
  | 'localization' 
  | 'other';

export type TaskStatus = 
  | 'pending' 
  | 'quoted' 
  | 'approved' 
  | 'assigned' 
  | 'in_progress' 
  | 'review' 
  | 'completed' 
  | 'delivered' 
  | 'archived'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'bank_saib' | 'nbe' | 'instapay' | 'vodafone_cash' | 'credit' | 'paypal' | 'pending';
export type IntakeChannel = 'whatsapp' | 'walk_in' | 'email' | 'phone' | 'other';
export type ExpenseCategory = 'salary' | 'freelancer' | 'rent' | 'utilities' | 'equipment' | 'marketing' | 'tax' | 'other';
export type LiabilityType = 'salary_arrear' | 'profit_share' | 'advance' | 'deduction' | 'other';
export type AttendanceSession = 'morning' | 'evening' | 'full_day';

export interface Branch {
  id: string;
  name: string;
  nameAr: string;
  location: string;
  locationAr?: string;
  phone: string;
  email: string;
  isActive: boolean;
  currency: 'EGP' | 'AED' | 'USD';
  taxId?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  fullNameAr: string;
  role: UserRole;
  employeeType?: EmployeeType;
  languages?: string[];
  specializations?: string[];
  dailyRate?: number;
  perWordRate?: number;
  perPageRate?: number;
  workingHours?: number;
  workingShift?: 'day' | 'night';
  monthlySalary?: number;
  isActive: boolean;
  avatarUrl?: string;
  phone?: string;
  email?: string; // Change to official email if needed, but keeping it for compatibility
  personalEmail?: string;
  contractWords?: number; // contracted monthly word limit for staff translators
  password?: string;
  createdAt: string;
  motherTongue?: string;
  sourceLanguages?: string[];
  targetLanguages?: string[];
  branchId?: string; // Multi-office branch assignment
}

export interface Client {
  id: string;
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  company?: string;
  nationality?: string;
  clientType: 'individual' | 'company' | 'agency';
  notes?: string;
  totalReceivablesEgp: number;
  totalReceivablesAed: number;
  totalReceivablesUsd: number;
  createdAt: string;
  createdBy: string;
}

export interface Task {
  id: string;
  referenceNo: string;
  clientId?: string;
  clientPhone?: string;
  clientNameCache?: string; // Cache for easy offline loading
  fileName: string;
  serviceType: ServiceType;
  sourceLanguage: string;
  targetLanguage: string;
  wordCount: number;
  pageCount: number;
  
  // Pricing
  amountEgp: number;
  amountAed: number;
  amountUsd: number;
  hasTaxInvoice: boolean;
  
  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAmountEgp: number;
  paidAmountAed: number;
  paidAmountUsd: number;
  
  // Status and Workflow
  status: TaskStatus;
  intakeChannel: IntakeChannel;
  intakeDate: string; // ISO date YYYY-MM-DD
  deadline?: string; // ISO timestamp
  deliveryDate?: string; // ISO timestamp
  
  // Cost Tracking
  translationCost: number;
  revisionCost: number;
  overtimeCost: number;
  totalCost: number;
  netRevenue: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: TaskAttachment[];
  
  // Certified Copy and File fields
  selectedLetterheadId?: string;
  selectedStampId?: string;
  sourceFileUrl?: string; // current active source file
  sourceFileName?: string;
  targetFileUrl?: string; // current active target file
  targetFileName?: string;
  certificationStatement?: string;
  sourceFileVersions?: { version: number; url: string; name: string; uploadedBy: string; uploadedAt: string }[];
  targetFileVersions?: { version: number; url: string; name: string; uploadedBy: string; uploadedAt: string }[];
  
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  branchId?: string; // Multi-office branch assignment
  quotationId?: string;
  quotation_id?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string;
  url: string; // download / preview URL
  uploadedAt: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  taskRef?: string;
  taskFileName?: string;
  translatorId: string;
  assignmentType: 'translation' | 'revision' | 'proofreading';
  wordCountAssigned: number;
  wordCountActual?: number;
  pageCountAssigned?: number;
  ratePerWord?: number;
  ratePerPage?: number;
  rateDaily?: number;
  rateFixed?: number;
  overtimeHours: number;
  overtimeRate?: number;
  calculatedAmount: number;
  deadline?: string;
  submittedAt?: string;
  translatedAttachments?: TaskAttachment[];
  status: 'assigned' | 'in_progress' | 'submitted' | 'approved';
  notes?: string;
  assignedBy: string;
  assignedAt: string;
}

export type QuotationStatus = 'created' | 'sent' | 'viewed' | 'confirmed' | 'cancelled' | 'expired' | 'converted';
export type InvoiceStatus = 'draft' | 'sent' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded' | 'written_off';
export type POStatus = 'pending' | 'received' | 'approved' | 'used' | 'closed';
export type BankAccountType = 'cash' | 'checking' | 'savings' | 'credit_card' | 'digital_wallet';

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: 'page' | 'word' | 'hour' | 'project' | 'day';
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string; // QT-YYYYMMDD-SEQ
  clientId: string;
  clientName: string;
  contactPerson?: string;
  opportunityId?: string; // CRM link
  
  items: QuotationLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: 'EGP' | 'AED' | 'USD';
  
  validUntil: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  termsConditions?: string;
  
  status: QuotationStatus;
  cancellationReason?: string;
  
  documentsToBeTranslated: TaskAttachment[];
  referenceDocuments: TaskAttachment[];
  
  depositAmount: number;
  depositCurrency?: 'EGP' | 'AED' | 'USD';
  depositDate?: string;
  depositBalance?: number; // total - deposit
  depositMethod?: PaymentMethod;
  depositProofUrl?: string;
  depositProofName?: string;
  
  convertedToInvoiceId?: string;
  convertedToJobId?: string;
  linkedTaskId?: string;
  linked_task_id?: string;
  
  createdBy: string;
  createdAt: string;
  branchId?: string; // Multi-office branch assignment

  // Backward compatibility fields
  fileName?: string;
  serviceType?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  wordCount?: number;
  amountEgp?: number;
  amountAed?: number;
  amountUsd?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-YYYYMMDD-SEQ
  quotationId?: string;
  purchaseOrderId?: string;
  clientId: string;
  clientName: string;
  invoiceDate: string;
  dueDate: string;
  
  items: QuotationLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  extraFees?: { name: string; amount: number }[]; // certification, courier, etc
  grandTotal: number;
  currency: 'EGP' | 'AED' | 'USD';
  
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  
  notes?: string;
  attachments?: TaskAttachment[];
  
  createdBy: string;
  createdAt: string;
  branchId?: string; // Multi-office branch assignment
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  clientId: string;
  description: string;
  amount: number;
  currency: 'EGP' | 'AED' | 'USD';
  issueDate: string;
  attachmentUrl?: string;
  status: POStatus;
  balance: number; // remaining funds
  linkedInvoices: string[]; // invoice IDs
  createdAt: string;
}

export interface VendorPayable {
  id: string;
  vendorId: string; // translator profile ID
  vendorName: string;
  taskId: string;
  taskRef: string;
  amount: number;
  currency: 'EGP'; // Internally usually EGP
  dueDate: string;
  status: 'pending' | 'approved' | 'paid' | 'on_hold' | 'cancelled';
  paymentReference?: string;
  vendorInvoiceNo?: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface OperatingExpense {
  id: string;
  expenseNumber?: string;
  expenseType?: 'manual' | 'freelancer' | 'payroll' | 'bill';
  category: ExpenseCategory | string;
  vendor: string;
  employeeId?: string;
  freelancerId?: string;
  clientId?: string;
  projectId?: string;
  taskId?: string;
  department?: string;
  costCenterId?: string;
  description: string;
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
  currency: 'EGP' | 'USD' | 'AED';
  paymentDate?: string;
  dueDate?: string;
  expenseDate?: string;
  isRecurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  status: 'pending' | 'approved' | 'payable' | 'paid' | 'overdue' | 'cancelled' | 'rejected';
  paymentMethod?: PaymentMethod;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  branchId?: string;
  expense_number?: string;
  expense_type?: string;
  vendor_id?: string;
  department_id?: string;
  cost_center_id?: string;
  tax_amount?: number;
  total_amount?: number;
  payment_method?: string;
  payment_status?: string;
  approval_status?: string;
  expense_date?: string;
  payment_date?: string;
  attachment_url?: string;
  accounting_entry_id?: string;
  created_by?: string;
  approved_by?: string;
  approvedBy?: string;
  paidBy?: string;
  accountingEntryId?: string;
  approvalStatus?: string;
  paid_by?: string;
  updated_at?: string;
}

export interface CostCenter {
  id: string;
  name: string;
  type: 'departmental' | 'project' | 'overhead' | string;
  departmentId?: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  parentCategoryId?: string;
  accountCode: string;
  type: 'expense' | 'asset' | 'liability';
  isDirectCost: boolean;
  isRecurring: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpense {
  id: string;
  expenseCategoryId: string;
  vendorId?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  paymentMethod: PaymentMethod;
  costCenterId: string;
  departmentId: string;
  notes?: string;
  status: 'active' | 'paused' | 'completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FreelancerCost {
  id: string;
  freelancerId: string;
  taskId?: string;
  projectId?: string;
  clientId?: string;
  serviceType: string;
  costAmount: number;
  currency: 'EGP' | 'AED' | 'USD';
  paymentStatus: 'pending' | 'payable' | 'paid' | 'cancelled';
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  dueDate?: string;
  paymentDate?: string;
  accountingEntryId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollExpense {
  id: string;
  employeeId: string;
  payrollBatchId: string;
  departmentId: string;
  costCenterId: string;
  salaryPeriod: string;
  basicSalary: number;
  overtime: number;
  bonus: number;
  commission: number;
  allowances: number;
  deductions: number;
  advances: number;
  netSalary: number;
  paymentStatus: 'draft' | 'approved' | 'payable' | 'paid' | 'cancelled';
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  paymentDate?: string;
  accountingEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingEntry {
  id: string;
  date: string;
  description: string;
  debits: { accountId: string; amount: number; currency: string }[];
  credits: { accountId: string; amount: number; currency: string }[];
  relatedEntityId?: string;
  relatedEntityType?: 'invoice' | 'expense' | 'payment' | 'salary' | 'freelancer_cost' | 'internal_transfer';
  expense_id?: string;
  payroll_expense_id?: string;
  freelancer_cost_id?: string;
  project_id?: string;
  task_id?: string;
  client_id?: string;
  vendor_id?: string;
  employee_id?: string;
  freelancer_id?: string;
  cost_center_id?: string;
  createdAt: string;
}


export interface Account {
  id: string;
  code: string; // 1000, 2000, 4000 etc
  name: string;
  nameAr: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  currency: 'EGP' | 'AED' | 'USD';
}

export interface FinancialTransaction {
  id: string;
  accountId: string;
  type: 'debit' | 'credit';
  amount: number;
  currency: 'EGP' | 'AED' | 'USD';
  description: string;
  relatedEntityId?: string; // link to Invoice, Expense, or Payment
  relatedEntityType?: 'invoice' | 'expense' | 'payment' | 'salary' | 'internal_transfer';
  date: string;
  createdBy: string;
  createdAt: string;
  branchId?: string; // Multi-office branch assignment
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  currency: 'EGP' | 'AED' | 'USD';
  method: PaymentMethod;
  type: 'income' | 'expense' | 'transfer';
  
  // Linkages
  clientId?: string;
  vendorId?: string;
  invoiceId?: string;
  expenseId?: string;
  payableId?: string;
  
  referenceNo?: string;
  receiverAccount?: string; // bank or cash account ID
  recordedBy: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;

  // Backward compatibility fields
  taskId?: string;
  paymentDate?: string;
  paymentType?: 'income' | 'expense';
  paymentMethod?: PaymentMethod;
  amountEgp?: number;
  amountAed?: number;
  amountUsd?: number;
  createdBy?: string;
  clientName?: string;
  fileName?: string;
  expenseCategory?: ExpenseCategory;
  payee?: string;
  branchId?: string; // Multi-office branch assignment
}

export type LeadSource = 'social_media' | 'referral' | 'website' | 'walk_in' | 'email' | 'event' | 'other';
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'quotation_sent' | 'negotiation' | 'won' | 'lost';

export interface Lead {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  stage: LeadStage;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  notes?: string;
  estimatedValue: number;
  currency: 'EGP' | 'AED' | 'USD';
  serviceInterests: ServiceType[];
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  convertedToClientId?: string;
  createdAt: string;
  createdBy: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  description: string;
  performedBy: string;
  createdAt: string;
}

export interface TranslatorMonthlySummary {
  id: string;
  translatorId: string;
  month: string; // YYYY-MM
  totalWords: number;
  totalTasks: number;
  translationEarnings: number;
  revisionEarnings: number;
  overtimeEarnings: number;
  totalEarnings: number;
  baseSalary: number;
  actualSalary: number;
  salaryPaid: number;
  salaryRemaining: number;
  vacationDays: number;
  workingDays: number;
  dailySessions: number;
  contractWords: number;
  contractRate?: number;
}

export interface ClientReceivableRecord {
  id: string;
  clientId: string;
  clientName: string;
  period: string; // YYYY-MM
  currency: 'EGP' | 'AED' | 'USD';
  amount: number;
  paidAmount: number;
  remaining: number;
  notes?: string;
}

export interface StaffLiability {
  id: string;
  profileId: string;
  profileName: string;
  liabilityType: LiabilityType;
  description: string;
  period?: string; // YYYY-MM
  currency: 'EGP' | 'AED' | 'USD';
  amount: number;
  paidAmount: number;
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

export interface MonthlyClosing {
  id: string;
  period: string; // YYYY-MM (e.g., "2026-05")
  totalRevenueEgp: number;
  totalRevenueAed: number;
  totalRevenueUsd: number;
  totalExpensesEgp: number;
  totalExpensesAed: number;
  salaryBreakdown: Record<string, { name: string; words: number; amount: number }>;
  rateAedToEgp: number;
  rateUsdToEgp: number;
  netProfitEgp: number;
  netProfitAed: number;
  netProfitUsd: number;
  totalProfitEgp: number;
  partner1Share: number;
  partner2Share: number;
  cashEgp: number;
  cashAed: number;
  cashUsd: number;
  bankSaibEgp: number;
  totalReceivablesEgp: number;
  totalReceivablesAed: number;
  status: 'draft' | 'closed';
  closedBy?: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SalaryAttendance {
  id: string;
  translatorId: string;
  workDate: string; // YYYY-MM-DD
  session: AttendanceSession;
  isVacation: boolean;
  vacationType?: 'annual' | 'sick' | 'unpaid';
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'danger';
  createdAt: string;
}

export interface LetterheadTemplate {
  id: string;
  name: string;
  nameAr?: string;
  imageUrl: string; // DataURL or storage path
  isDefault: boolean;
  placement: 'background' | 'header' | 'footer' | 'header_footer';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  opacity: number;
  createdAt: string;
}

export type StampType = 'certified_stamp_signature' | 'certified_stamp_only' | 'company_stamp' | 'signature_only' | 'custom';

export interface StampAsset {
  id: string;
  name: string;
  type: StampType;
  imageUrl: string;
  defaultSize: number;
  defaultOpacity: number;
  defaultRotation: number;
  originalPdfData?: string;
  createdAt: string;
}

export interface LayoutPreset {
  id: string;
  name: string;
  nameAr?: string;
  pageSize: 'A4';
  margins: { top: number; bottom: number; left: number; right: number };
  letterheadId?: string;
  stampId?: string;
  stampPosition: { x: number; y: number; page: 'first' | 'last' | 'every' | 'translation_only' };
  includeOriginal: boolean;
  originalPosition: 'before' | 'after';
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  showPageNumbers: boolean;
  createdAt: string;
}

export interface PdfExportLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  clientName: string;
  referenceNo: string;
  letterheadName?: string;
  stampName?: string;
  presetName?: string;
  fileName: string;
  status: 'success' | 'failed';
}

export interface FeedbackEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  
  // Overall
  overallRating: number; // 1-5
  generalComment: string;
  
  // Specific Modules (Add/Remove/Modify)
  modules: {
    dashboard: ModuleFeedback;
    tasks: ModuleFeedback;
    certifiedComposer: ModuleFeedback;
    finance: ModuleFeedback;
    hrAttendance: ModuleFeedback;
    accounts: ModuleFeedback;
  };
  
  technicalIssues: string;
  newFeatureSuggestions: string;
}

export type AutomationTrigger = 'email_received' | 'document_uploaded' | 'quotation_approved' | 'quotation_rejected' | 'invoice_paid';

export interface AutomationRule {
  id: string;
  nameEn: string;
  nameAr: string;
  trigger: AutomationTrigger;
  action: 'move_stage';
  targetStage: LeadStage;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ModuleFeedback {
  rating: number; // 1-5
  suggestions: {
    add: string;
    remove: string;
    modify: string;
  };
  comments: string;
}

export interface ExportApprovalRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  dataType: string; // e.g. "accounting_reports", "client_list", "translator_list"
  exportReason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string; // name
  approvedAt?: string;
  rejectionReason?: string;
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'file_upload_source' | 'file_upload_target' | 'certified_copy_export' | 'accounting_access' | 'unauthorized_access' | 'export_attempt' | 'other';
  details: string;
  timestamp: string;
  ipAddress?: string;
  status: 'success' | 'failed' | 'denied';
  refId?: string; // e.g., task ID or request ID
}

export interface TaskAccountingRecord {
  id: string;
  taskId: string;
  clientName: string;
  serviceType: string;
  totalAmount: number;
  currency: 'EGP' | 'AED' | 'USD';
  initialDeposit: number;
  remainingBalance: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  deliveryStatus: 'Pending' | 'Delivered';
  deliveryDate?: string;
  deliveredBy?: string;
  invoiceOrQuoteRef?: string;
  paymentMethod?: string;
  paymentDates: string[];
  assignedStaff?: string;
  updatedAt: string;
}

export interface TaskPaymentAuditLog {
  id: string;
  taskId: string;
  taskRef: string;
  actionType: string;
  oldValue: string;
  newValue: string;
  performedBy: string;
  performedById: string;
  timestamp: string;
}
