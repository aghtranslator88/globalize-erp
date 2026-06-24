/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, X, Search, Filter, Calendar, UserPlus, 
  CheckCircle, ShieldAlert, Award, FileUp, ListChecks, CheckCircle2,
  Paperclip, Trash2, FileText, Activity, AlertTriangle, Users, Gauge,
  FileSpreadsheet
} from 'lucide-react';
import { Task, Client, Profile, ServiceType, IntakeChannel, TaskAttachment, TaskAssignment, PaymentMethod, Quotation, Invoice, Lead } from '../types';
import dbInstance from '../db/store';
import jsPDF from 'jspdf';
import { ExportProtectionModal } from './ExportProtectionModal';
import { exportTasksCSV } from '../utils/excelCSV';
import { useToast } from './Toast';

interface TasksPageProps {
  isRtl: boolean;
  currentRole: string;
  isQuickIntakeOpen: boolean;
  onCloseQuickIntake: () => void;
  currentBranchId?: string;
}

export const TasksPage: React.FC<TasksPageProps> = ({ 
  isRtl, 
  currentRole,
  isQuickIntakeOpen,
  onCloseQuickIntake,
  currentBranchId = 'all'
}) => {
  const { success, error, warning, info, confirm } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [translators, setTranslators] = useState<Profile[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Registration and modal triggers
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<Task | null>(null);

  // Task form fields
  const [clientId, setClientId] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [fileName, setFileName] = useState('');
  const [service, setService] = useState<ServiceType>('translation');
  const [srcLang, setSrcLang] = useState('Arabic');
  const [tgtLang, setTgtLang] = useState('English');
  const [words, setWords] = useState<number>(0);
  const [pages, setPages] = useState<number>(0);
  const [egp, setEgp] = useState<number>(0);
  const [aed, setAed] = useState<number>(0);
  const [usd, setUsd] = useState<number>(0);
  const [tax, setTax] = useState(false);
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().split('T')[0]);
  const [channel, setChannel] = useState<IntakeChannel>('whatsapp');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [deadline, setDeadline] = useState('');
  const [linkedQuotationId, setLinkedQuotationId] = useState('');

  // Initial payment allocation tracking states
  const [initialPaidAmountEgp, setInitialPaidAmountEgp] = useState<number>(0);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('cash');

  // Quick on-the-fly client creation states
  const [isRegisteringNewClient, setIsRegisteringNewClient] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNameAr, setNewClientNameAr] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientType, setNewClientType] = useState<'individual' | 'company' | 'agency'>('individual');
  const [newClientNotes, setNewClientNotes] = useState('');
  
  // Drag and drop / file attachment states
  const [dragActive, setDragActive] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Assignment successful notification center tracking
  const [assignedSuccessData, setAssignedSuccessData] = useState<{
    task: Task;
    translator: Profile;
    assignmentType: string;
    rateWords?: number;
    rateFixed?: number;
    reviewer?: Profile;
    reviewerRateWords?: number;
    reviewerRateFixed?: number;
  } | null>(null);

  // Assign form fields
  const [targetTranslatorId, setTargetTranslatorId] = useState('');
  const [assignType, setAssignType] = useState<'translation' | 'revision' | 'proofreading'>('translation');
  const [rateWords, setRateWords] = useState<number>(0);
  const [ratePage, setRatePage] = useState<number>(0);
  const [rateFixed, setRateFixed] = useState<number>(0);
  const [rateType, setRateType] = useState<'word' | 'page' | 'fixed'>('word');

  // Reviewer on-the-fly assignments states
  const [targetReviewerId, setTargetReviewerId] = useState('');
  const [reviewerRateWords, setReviewerRateWords] = useState<number>(0);
  const [reviewerRatePage, setReviewerRatePage] = useState<number>(0);
  const [reviewerRateFixed, setReviewerRateFixed] = useState<number>(0);
  const [reviewerRateType, setReviewerRateType] = useState<'word' | 'page' | 'fixed'>('word');

  // Verify assignment states (Verify Target Word Count & Fees based on translator rate ONLY)
  const [selectedAsgForVerify, setSelectedAsgForVerify] = useState<any>(null);
  const [verifiedWords, setVerifiedWords] = useState<number>(0);
  const [verifiedRateWords, setVerifiedRateWords] = useState<number>(0);
  const [verifiedRateFixed, setVerifiedRateFixed] = useState<number>(0);
  const [verifiedPages, setVerifiedPages] = useState<number>(0);
  const [verifiedRatePage, setVerifiedRatePage] = useState<number>(0);

  // Certified Copy Export states
  const [isCertifiedModalOpen, setIsCertifiedModalOpen] = useState(false);
  const [certifiedTask, setCertifiedTask] = useState<Task | null>(null);
  const [selectedLetterheadId, setSelectedLetterheadId] = useState('');
  const [selectedStampId, setSelectedStampId] = useState('');
  const [includeStamp, setIncludeStamp] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [appendSourceCopy, setAppendSourceCopy] = useState(false);
  const [customCertEn, setCustomCertEn] = useState(
    'Certification of Accuracy: We hereby certify that the accompanying document is a true, accurate, and professional translation of the original source document to the best of our knowledge, linguistic competence, and official registration.'
  );
  const [customCertAr, setCustomCertAr] = useState(
    'شهادة مطابقة وترجمة معتمدة: نشهد نحن مجموعة جلوبالايز للاستشارات والترجمة القانونية المعتمدة بأن النص المرفق أدناه هو ترجمة صحيحة، مطابقة، ودقيقة للأصل وصادرة بموجب ميثاق اللغات الرسمية والاعتماد المالي والمهني المعمول به لدينا.'
  );

  // Certified Export protection states
  const [isExportShieldOpen, setIsExportShieldOpen] = useState(false);
  const [isTaskListExportOpen, setIsTaskListExportOpen] = useState(false);

  // Filters
  const [searchWord, setSearchWord] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  // Load vs Capacity Tracker & Warning Guards
  const [showWorkloads, setShowWorkloads] = useState(true);

  const getTranslatorMetrics = (tId: string) => {
    // Find all assignments for this translator
    const asgs = dbInstance.assignments.filter(a => a.translatorId === tId);
    
    // An assignment is active if the parent task is not completed, delivered, or archived
    const activeAsgs = asgs.filter(a => {
      const parentTask = tasks.find(tk => tk.id === a.taskId);
      if (!parentTask) return false;
      return parentTask.status !== 'completed' && parentTask.status !== 'delivered' && parentTask.status !== 'archived';
    });
    
    const activeWords = activeAsgs.reduce((sum, a) => sum + (a.wordCountAssigned || 0), 0);
    const activeTasksCount = activeAsgs.length;
    
    // Find the profile for capacity limit
    const p = dbInstance.profiles.find(prof => prof.id === tId);
    // contractWords is monthly capacity, e.g. 30,000 words. Concurrency-safe limit is about 1/2.5 of this or default is 10,000 words
    const limit = p?.contractWords && p.contractWords > 0
      ? Math.max(5000, Math.round(p.contractWords / 2.5))
      : 10000;
      
    const percentage = limit > 0 ? Math.min(100, Math.round((activeWords / limit) * 100)) : 0;
    
    return {
      activeWords,
      activeTasksCount,
      limit,
      percentage
    };
  };

  // Bulk actions and multi-selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkTranslatorId, setBulkTranslatorId] = useState<string>('');
  const [bulkAssignType, setBulkAssignType] = useState<'translation' | 'revision' | 'proofreading'>('translation');
  const [bulkRateWords, setBulkRateWords] = useState<number>(0);
  const [bulkRateFixed, setBulkRateFixed] = useState<number>(0);

  // Accounting Details states
  const [selectedTaskForAccDetails, setSelectedTaskForAccDetails] = useState<Task | null>(null);
  const [accPaymentAmt, setAccPaymentAmt] = useState<string>('');
  const [accPaymentMethod, setAccPaymentMethod] = useState<PaymentMethod>('cash');
  const [accPaymentNotes, setAccPaymentNotes] = useState<string>('');
  const [accPaymentCurrency, setAccPaymentCurrency] = useState<'EGP' | 'USD' | 'AED'>('EGP');
  const [auditViewMode, setAuditViewMode] = useState<'timeline' | 'table'>('timeline');

  // Enhanced Multi-Linguist assignment states
  const [asgLinguistId, setAsgLinguistId] = useState<string>('');
  const [asgRole, setAsgRole] = useState<'translation' | 'revision' | 'proofreading'>('translation');
  const [asgPart, setAsgPart] = useState<string>('');
  const [asgLangPair, setAsgLangPair] = useState<string>('');
  const [asgWords, setAsgWords] = useState<string>('');
  const [asgPages, setAsgPages] = useState<string>('');
  const [asgDeadline, setAsgDeadline] = useState<string>('');
  const [asgRelatedAssignmentId, setAsgRelatedAssignmentId] = useState<string>('');
  const [asgRateType, setAsgRateType] = useState<'word' | 'page' | 'fixed'>('word');
  const [asgRateWords, setAsgRateWords] = useState<string>('');
  const [asgRatePage, setAsgRatePage] = useState<string>('');
  const [asgRateFixed, setAsgRateFixed] = useState<string>('');
  const [asgNotes, setAsgNotes] = useState<string>('');

  const [expandedAsgHistory, setExpandedAsgHistory] = useState<Record<string, boolean>>({});
  const [correctionNoteMap, setCorrectionNoteMap] = useState<Record<string, string>>({});

  // Compilation & Delivery states
  const [compileFinalFile, setCompileFinalFile] = useState<TaskAttachment | null>(null);
  const [compileFinalReviewedFile, setCompileFinalReviewedFile] = useState<TaskAttachment | null>(null);
  const [compileDeliveryReadyFile, setCompileDeliveryReadyFile] = useState<TaskAttachment | null>(null);
  const [showOverrideForm, setShowOverrideForm] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const isAdminOrStaff = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'sales' || currentRole === 'accountant';

  // Initialize compilation files and form when selected task changes
  useEffect(() => {
    if (selectedTaskForAccDetails) {
      setCompileFinalFile(selectedTaskForAccDetails.finalFile || null);
      setCompileFinalReviewedFile(selectedTaskForAccDetails.finalReviewedFile || null);
      setCompileDeliveryReadyFile(selectedTaskForAccDetails.deliveryReadyFile || null);
      setShowOverrideForm(false);
      setOverrideReason('');
      
      // Reset assignment form fields
      setAsgLinguistId('');
      setAsgRole('translation');
      setAsgPart('');
      setAsgLangPair('');
      setAsgWords('');
      setAsgPages('');
      setAsgDeadline('');
      setAsgRelatedAssignmentId('');
      setAsgRateType('word');
      setAsgRateWords('');
      setAsgRatePage('');
      setAsgRateFixed('');
      setAsgNotes('');
    }
  }, [selectedTaskForAccDetails]);

  const handleCompileFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'finalFile' | 'finalReviewedFile' | 'deliveryReadyFile') => {
    e.preventDefault();
    if (!selectedTaskForAccDetails) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    const isSmall = file.size < 400 * 1024;
    
    const onLoaded = (url: string) => {
      const attachment: TaskAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: url,
        uploadedAt: new Date().toISOString()
      };
      
      if (fieldName === 'finalFile') {
        setCompileFinalFile(attachment);
        selectedTaskForAccDetails.finalFile = attachment;
      } else if (fieldName === 'finalReviewedFile') {
        setCompileFinalReviewedFile(attachment);
        selectedTaskForAccDetails.finalReviewedFile = attachment;
      } else if (fieldName === 'deliveryReadyFile') {
        setCompileDeliveryReadyFile(attachment);
        selectedTaskForAccDetails.deliveryReadyFile = attachment;
      }
      
      dbInstance.updateTask(selectedTaskForAccDetails);
      setSelectedTaskForAccDetails({ ...selectedTaskForAccDetails });
    };

    if (isSmall) {
      reader.onloadend = () => {
        onLoaded(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      const objectUrl = URL.createObjectURL(file);
      onLoaded(objectUrl);
    }
  };

  const handleMarkReadyForDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForAccDetails) return;
    
    const relevantAsgs = dbInstance.assignments.filter(a => a.taskId === selectedTaskForAccDetails.id);
    const allApproved = relevantAsgs.length > 0 && relevantAsgs.every(a => a.status === 'approved');
    
    if (!allApproved && !showOverrideForm) {
      setShowOverrideForm(true);
      return;
    }
    
    if (!allApproved && showOverrideForm && !overrideReason.trim()) {
      alert(isRtl ? 'يرجى تقديم سبب لتجاوز الموافقة الإدارية.' : 'Please provide an administrative override reason.');
      return;
    }
    
    dbInstance.markTaskReadyForDelivery(
      selectedTaskForAccDetails.id,
      overrideReason || undefined
    );
    
    const updatedTask = dbInstance.tasks.find(t => t.id === selectedTaskForAccDetails.id);
    if (updatedTask) {
      setSelectedTaskForAccDetails({ ...updatedTask });
    }
    setTasks([...dbInstance.tasks]);
    success(isRtl ? 'تم تحديث حالة المهمة بنجاح!' : 'Task status updated successfully!');
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForAccDetails) return;

    const task = selectedTaskForAccDetails;

    // Convert rate values
    const ratePerWord = asgRateType === 'word' ? parseFloat(asgRateWords) || undefined : undefined;
    const ratePerPage = asgRateType === 'page' ? parseFloat(asgRatePage) || undefined : undefined;
    const rateFixed = asgRateType === 'fixed' ? parseFloat(asgRateFixed) || undefined : undefined;

    const newAsgInput: Omit<TaskAssignment, 'id' | 'assignedBy' | 'assignedAt' | 'calculatedAmount'> = {
      taskId: task.id,
      taskRef: task.referenceNo,
      taskFileName: task.attachments && task.attachments.length > 0 ? task.attachments[0].name : '',
      translatorId: asgLinguistId,
      assignmentType: asgRole,
      wordCountAssigned: parseInt(asgWords) || 0,
      pageCountAssigned: parseInt(asgPages) || 0,
      ratePerWord,
      ratePerPage,
      rateFixed,
      overtimeHours: 0,
      status: 'assigned',
      deadline: asgDeadline || undefined,
      notes: asgNotes || undefined,
      assignedPart: asgPart || undefined,
      languagePair: asgLangPair || undefined,
      relatedAssignmentId: asgRelatedAssignmentId || undefined,
      translatedAttachments: []
    };

    dbInstance.assignTranslator(newAsgInput);
    
    const updatedTask = dbInstance.tasks.find(t => t.id === task.id);
    if (updatedTask) {
      setSelectedTaskForAccDetails({ ...updatedTask });
    }
    setTasks([...dbInstance.tasks]);

    // Reset Form Fields
    setAsgLinguistId('');
    setAsgRole('translation');
    setAsgPart('');
    setAsgLangPair('');
    setAsgWords('');
    setAsgPages('');
    setAsgDeadline('');
    setAsgRelatedAssignmentId('');
    setAsgRateType('word');
    setAsgRateWords('');
    setAsgRatePage('');
    setAsgRateFixed('');
    setAsgNotes('');

    success(isRtl ? 'تم إضافة التعيين بنجاح!' : 'Assignment has been added successfully!');
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    confirm(
      isRtl ? 'هل أنت متأكد من حذف هذا التعيين؟' : 'Are you sure you want to delete this assignment?',
      () => {
        const successRemove = dbInstance.withdrawAssignment(assignmentId);
        if (successRemove) {
          const task = selectedTaskForAccDetails;
          if (task) {
            const updatedTask = dbInstance.tasks.find(t => t.id === task.id);
            if (updatedTask) setSelectedTaskForAccDetails({ ...updatedTask });
          }
          setTasks([...dbInstance.tasks]);
          success(isRtl ? 'تم حذف التعيين بنجاح!' : 'Assignment removed successfully!');
        } else {
          error(isRtl ? 'فشل حذف التعيين.' : 'Failed to remove assignment.');
        }
      },
      undefined,
      { isRtl }
    );
  };

  const handleReturnForCorrection = (assignmentId: string) => {
    const note = correctionNoteMap[assignmentId];
    if (!note) return;
    dbInstance.submitReviewAssignment(assignmentId, undefined, note, 'returned_for_correction', note);
    const updatedTask = dbInstance.tasks.find(t => t.id === selectedTaskForAccDetails?.id);
    if (updatedTask) setSelectedTaskForAccDetails({ ...updatedTask });
    alert('Reverted back to linguist for corrections.');
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus || selectedTaskIds.length === 0) return;
    
    let count = 0;
    selectedTaskIds.forEach(id => {
      const t = tasks.find(task => task.id === id);
      if (t) {
        dbInstance.updateTask({
          ...t,
          status: bulkStatus as any
        });
        count++;
      }
    });

    alert(isRtl 
      ? `تم تحديث حالة عدد ${count} ملف بنجاح إلى "${bulkStatus}".` 
      : `Successfully updated status of ${count} tasks to "${bulkStatus.replace('_', ' ')}".`
    );

    setSelectedTaskIds([]);
    setBulkStatus('');
  };

  const handleBulkAssignment = () => {
    if (!bulkTranslatorId || selectedTaskIds.length === 0) return;

    const translator = translators.find(t => t.id === bulkTranslatorId);
    if (!translator) return;

    let count = 0;
    selectedTaskIds.forEach(id => {
      const t = tasks.find(task => task.id === id);
      if (t) {
        dbInstance.assignTranslator({
          taskId: t.id,
          taskRef: t.referenceNo,
          taskFileName: t.fileName,
          translatorId: bulkTranslatorId,
          assignmentType: bulkAssignType,
          wordCountAssigned: t.wordCount,
          ratePerWord: bulkRateWords > 0 ? bulkRateWords : undefined,
          rateFixed: bulkRateFixed > 0 ? bulkRateFixed : undefined,
          overtimeHours: 0,
          status: 'assigned'
        });
        count++;
      }
    });

    alert(isRtl 
      ? `تم تعيين المترجم "${translator.fullNameAr || translator.fullName}" بنجاح لعدد ${count} مهمة.` 
      : `Successfully assigned ${count} tasks to translator "${translator.fullName}".`
    );

    setSelectedTaskIds([]);
    setBulkTranslatorId('');
    setBulkRateWords(0);
    setBulkRateFixed(0);
  };

  useEffect(() => {
    const getFilteredTasks = () => {
      const items = dbInstance.tasks;
      if (currentBranchId && currentBranchId !== 'all') {
        return items.filter(t => t.branchId === currentBranchId);
      }
      return items;
    };

    setTasks(getFilteredTasks());
    setClients(dbInstance.clients);
    setQuotations(dbInstance.quotations);
    setInvoices(dbInstance.invoices);
    setLeads(dbInstance.leads);
    
    // Grab only translator staff and freelancers
    const transOnly = dbInstance.profiles.filter(p => p.role === 'translator' || p.role === 'admin');
    setTranslators(transOnly);

    const sub = dbInstance.subscribe(() => {
      setTasks(getFilteredTasks());
      setClients([...dbInstance.clients]);
      setTranslators([...dbInstance.profiles.filter(p => p.role === 'translator' || p.role === 'admin')]);
      setQuotations([...dbInstance.quotations]);
      setInvoices([...dbInstance.invoices]);
      setLeads([...dbInstance.leads]);
    });
    return sub;
  }, [currentBranchId]);

  useEffect(() => {
    const selectTask = (taskId: string) => {
      const task = dbInstance.tasks.find(t => t.id === taskId);
      if (task) {
        handleOpenAssign(task);
      }
    };

    const handleSelectTaskEvent = (e: any) => {
      selectTask(e.detail);
    };

    window.addEventListener('select-task', handleSelectTaskEvent);

    const storedTaskId = sessionStorage.getItem('goto_task_id');
    if (storedTaskId) {
      sessionStorage.removeItem('goto_task_id');
      setTimeout(() => selectTask(storedTaskId), 250);
    }

    return () => {
      window.removeEventListener('select-task', handleSelectTaskEvent);
    };
  }, [tasks]);

  const sendAutomatedEmail = async (to: string, subject: string, text: string) => {
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text })
      });
      const data = await response.json();
      if (data.success) {
        setEmailStatus({ 
          type: 'success', 
          msg: isRtl ? 'تم إرسال الإشعار التلقائي بنجاح!' : 'Automated notification sent successfully!' 
        });
      } else {
        setEmailStatus({ 
          type: 'error', 
          msg: data.error || (isRtl ? 'فشل في إرسال الإشعار.' : 'Failed to send automated email.') 
        });
      }
    } catch (err) {
      setEmailStatus({ 
        type: 'error', 
        msg: isRtl ? 'خطأ في الاتصال بالخادم.' : 'Connection error with gateway.' 
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const sendAutomatedWhatsApp = async (phone: string, text: string) => {
    setWhatsappLoading(true);
    setWhatsappStatus(null);
    try {
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        },
        body: JSON.stringify({ phone, text })
      });
      const data = await response.json();
      if (data.success) {
        setWhatsappStatus({ 
          type: 'success', 
          msg: isRtl ? 'تم إرسال إشعار واتساب التلقائي بنجاح!' : 'Automated WhatsApp notification sent successfully!' 
        });
      } else {
        setWhatsappStatus({ 
          type: 'error', 
          msg: data.error || (isRtl ? 'فشل في إرسال واتساب.' : 'Failed to send WhatsApp message.') 
        });
      }
    } catch (err) {
      setWhatsappStatus({ 
        type: 'error', 
        msg: isRtl ? 'خطأ في الاتصال بالخادم.' : 'Connection error with gateway.' 
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleRegisterTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'sales' && currentRole !== 'accountant') {
      alert('Access Denied. Only Owners, Admins, Sales, or Accountants can register legal intake folders.');
      return;
    }

    let finalClientId: string | undefined = clientId || undefined;
    let finalClientPhone: string | undefined = clientPhone || undefined;

    if (isRegisteringNewClient) {
      if (!newClientName.trim()) {
        alert(isRtl ? 'يرجى إدخال اسم العميل الجديد بالإنجليزية.' : 'Please enter the new client name in English.');
        return;
      }
      
      const newClientObj = dbInstance.addClient(
        newClientName.trim(),
        newClientNameAr.trim() || newClientName.trim(),
        newClientPhone.trim(),
        newClientEmail.trim(),
        newClientType,
        newClientNotes.trim() || undefined
      );
      
      finalClientId = newClientObj.id;
      if (newClientPhone.trim()) {
        finalClientPhone = newClientPhone.trim();
      }
    }

    const activeCurrency = usd > 0 ? 'USD' : (aed > 0 ? 'AED' : 'EGP');
    const totalAmount = activeCurrency === 'USD' ? usd : (activeCurrency === 'AED' ? aed : egp);

    const newTask = dbInstance.addTask({
      clientId: finalClientId,
      clientPhone: finalClientPhone,
      fileName,
      serviceType: service,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      wordCount: words,
      pageCount: pages || Math.ceil(words / 250),
      amountEgp: egp,
      amountAed: aed,
      amountUsd: usd,
      hasTaxInvoice: tax,
      status: 'pending',
      intakeChannel: channel,
      intakeDate,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      notes: notes || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      initialPaidAmountEgp: activeCurrency === 'EGP' ? initialPaidAmountEgp : 0,
      initialPaidAmountAed: activeCurrency === 'AED' ? initialPaidAmountEgp : 0,
      initialPaidAmountUsd: activeCurrency === 'USD' ? initialPaidAmountEgp : 0,
      initialPaymentMethod,
      branchId: currentBranchId !== 'all' ? currentBranchId : 'b-cairo',
      quotationId: linkedQuotationId || undefined,
      quotation_id: linkedQuotationId || undefined
    });

    if (linkedQuotationId) {
      const q = dbInstance.quotations.find(quote => quote.id === linkedQuotationId);
      if (q) {
        q.convertedToJobId = newTask.id;
        q.linkedTaskId = newTask.id;
        q.linked_task_id = newTask.id;
        q.status = 'converted';
        dbInstance.save();
      }
    }

    if (isQuickIntakeOpen) {
      const qQuantity = words || pages || 1;
      const qUnit = words > 0 ? 'word' : (pages > 0 ? 'page' : 'project');
      const qUnitPrice = qQuantity > 0 ? (totalAmount / qQuantity) : totalAmount;

      const quoteItem = {
        id: `quote-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        description: `${service || 'Translation'} Service: ${srcLang} to ${tgtLang} (${fileName || 'Document'})`,
        quantity: qQuantity,
        unit: qUnit as any,
        unitPrice: qUnitPrice,
        taxRate: tax ? 0.14 : 0,
        discount: 0,
        total: totalAmount
      };

      const newQuote = dbInstance.addQuotation({
        clientId: newTask.clientId || '',
        clientName: newTask.clientNameCache || '',
        subtotal: totalAmount,
        taxTotal: tax ? totalAmount * 0.14 : 0,
        discountTotal: 0,
        grandTotal: totalAmount,
        currency: activeCurrency,
        items: [quoteItem],
        status: 'confirmed',
        validUntil: new Date().toISOString().split('T')[0],
        notes: `Automatically created for quick intake job ${newTask.referenceNo}`
      });

      const invoiceItem = {
        id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        description: `${service || 'Translation'} Service: ${srcLang} to ${tgtLang} (${fileName || 'Document'})`,
        quantity: qQuantity,
        unit: qUnit as any,
        unitPrice: qUnitPrice,
        taxRate: tax ? 0.14 : 0,
        discount: 0,
        total: totalAmount
      };

      const paidAmount = initialPaidAmountEgp || 0;

      const newInvoice = dbInstance.addInvoice({
        invoiceNumber: newTask.referenceNo, // same number as the task referenceNo!
        quotationId: newQuote.id,
        clientId: newTask.clientId || '',
        clientName: newTask.clientNameCache || '',
        invoiceDate: intakeDate || new Date().toISOString().split('T')[0],
        dueDate: deadline ? deadline.split('T')[0] : (intakeDate || new Date().toISOString().split('T')[0]),
        items: [invoiceItem],
        subtotal: totalAmount,
        taxTotal: tax ? totalAmount * 0.14 : 0,
        discountTotal: 0,
        grandTotal: totalAmount,
        currency: activeCurrency,
        paidAmount: paidAmount,
        balance: Math.max(0, totalAmount - paidAmount),
        status: paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid'),
        paymentMethod: initialPaymentMethod,
        notes: `Automatically created for quick intake job ${newTask.referenceNo}`,
        branchId: newTask.branchId
      });

      newQuote.convertedToInvoiceId = newInvoice.id;
      newQuote.status = 'converted';
      dbInstance.save();
    }

    setTasks([...dbInstance.tasks]);
    setQuotations([...dbInstance.quotations]);
    setInvoices([...dbInstance.invoices]);
    setIsRegistering(false);
    onCloseQuickIntake();

    // Reset Form
    setClientId('');
    setClientSearchQuery('');
    setShowClientSuggestions(false);
    setClientPhone('');
    setFileName('');
    setWords(0);
    setPages(0);
    setEgp(0);
    setAed(0);
    setUsd(0);
    setTax(false);
    setNotes('');
    setPriority('medium');
    setDeadline('');
    setLinkedQuotationId('');
    setAttachments([]);
    setDragActive(false);
    setInitialPaidAmountEgp(0);
    setInitialPaymentMethod('cash');

    // Reset On-the-fly client states
    setIsRegisteringNewClient(false);
    setNewClientName('');
    setNewClientNameAr('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientType('individual');
    setNewClientNotes('');
  };

  // Event handlers for drag and drop file uploads
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const isSmall = file.size < 400 * 1024; // < 400KB fits safely inside localStorage
      
      if (isSmall) {
        reader.onloadend = () => {
          const newAttachment: TaskAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: reader.result as string, // Real persistable base64 string
            uploadedAt: new Date().toISOString()
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      } else {
        // Fallback for larger files to prevent localStorage size issues
        const objectUrl = URL.createObjectURL(file);
        const newAttachment: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: objectUrl, // Fully functional local object URL for instant downloads
          uploadedAt: new Date().toISOString()
        };
        setAttachments(prev => [...prev, newAttachment]);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleOpenAssign = (task: Task) => {
    if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'sales' && currentRole !== 'accountant') {
      alert('Access Denied. Only Owners, Admins, Sales, or Accountants have allocation privileges.');
      return;
    }
    setSelectedTaskForAssign(task);
    setTargetTranslatorId('');
    setRateWords(0.20);
    setRateFixed(0);
    setTargetReviewerId('');
    setReviewerRateWords(0.08);
    setReviewerRateFixed(0);
  };

  const handleOpenVerify = (asg: any) => {
    if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'sales' && currentRole !== 'accountant') {
      alert('Access Denied. Only Owners, Admins, Sales, or Accountants can verify and approve task calculations.');
      return;
    }
    setSelectedAsgForVerify(asg);
    setVerifiedWords(asg.wordCountActual || asg.wordCountAssigned || 0);
    setVerifiedRateWords(asg.ratePerWord || 0);
    setVerifiedRateFixed(asg.rateFixed || 0);
    setVerifiedPages(asg.pageCountActual || asg.pageCountAssigned || 0);
    setVerifiedRatePage(asg.ratePerPage || 0);
  };

  const handleConfirmVerifyApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAsgForVerify) {
      let calculatedAmt = 0;
      if (verifiedRateFixed > 0) {
        calculatedAmt = verifiedRateFixed;
      } else if (verifiedRatePage > 0) {
        calculatedAmt = verifiedPages * verifiedRatePage;
      } else {
        calculatedAmt = verifiedWords * verifiedRateWords;
      }

      dbInstance.approveAssignment(
        selectedAsgForVerify.id,
        verifiedWords,
        verifiedRateWords > 0 ? verifiedRateWords : undefined,
        verifiedRateFixed > 0 ? verifiedRateFixed : undefined,
        calculatedAmt,
        verifiedRatePage > 0 ? verifiedRatePage : undefined,
        verifiedPages > 0 ? verifiedPages : undefined
      );

      setSelectedAsgForVerify(null);
      alert('Target counts verified and linguist fees approved successfully.');
    }
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskForAssign && targetTranslatorId) {
      // 1. Assign translator
      const mainAssignType = targetReviewerId ? 'translation' : assignType;
      
      dbInstance.assignTranslator({
        taskId: selectedTaskForAssign.id,
        taskRef: selectedTaskForAssign.referenceNo,
        taskFileName: selectedTaskForAssign.fileName,
        translatorId: targetTranslatorId,
        assignmentType: mainAssignType,
        wordCountAssigned: selectedTaskForAssign.wordCount,
        pageCountAssigned: selectedTaskForAssign.pageCount,
        ratePerWord: rateType === 'word' && rateWords > 0 ? rateWords : undefined,
        ratePerPage: rateType === 'page' && ratePage > 0 ? ratePage : undefined,
        rateFixed: rateType === 'fixed' && rateFixed > 0 ? rateFixed : undefined,
        overtimeHours: 0,
        status: 'assigned'
      });

      // 2. Assign reviewer if specified
      if (targetReviewerId) {
        dbInstance.assignTranslator({
          taskId: selectedTaskForAssign.id,
          taskRef: selectedTaskForAssign.referenceNo,
          taskFileName: selectedTaskForAssign.fileName,
          translatorId: targetReviewerId,
          assignmentType: 'revision', // Reviewer style
          wordCountAssigned: selectedTaskForAssign.wordCount,
          pageCountAssigned: selectedTaskForAssign.pageCount,
          ratePerWord: reviewerRateType === 'word' && reviewerRateWords > 0 ? reviewerRateWords : undefined,
          ratePerPage: reviewerRateType === 'page' && reviewerRatePage > 0 ? reviewerRatePage : undefined,
          rateFixed: reviewerRateType === 'fixed' && reviewerRateFixed > 0 ? reviewerRateFixed : undefined,
          overtimeHours: 0,
          status: 'assigned'
        });
      }

      const translator = translators.find(t => t.id === targetTranslatorId);
      const reviewer = targetReviewerId ? translators.find(t => t.id === targetReviewerId) : undefined;
      
      if (translator) {
        setAssignedSuccessData({
          task: selectedTaskForAssign,
          translator,
          assignmentType: mainAssignType,
          rateWords: rateType === 'word' && rateWords > 0 ? rateWords : undefined,
          rateFixed: rateType === 'fixed' && rateFixed > 0 ? rateFixed : undefined,
          reviewer,
          reviewerRateWords: reviewerRateType === 'word' && reviewerRateWords > 0 ? reviewerRateWords : undefined,
          reviewerRateFixed: reviewerRateType === 'fixed' && reviewerRateFixed > 0 ? reviewerRateFixed : undefined
        });
      } else {
        setSelectedTaskForAssign(null);
        alert('Assignment completed successfully.');
      }
    }
  };

  const handleDeliverTask = (taskId: string) => {
    const task = dbInstance.tasks.find(t => t.id === taskId);
    if (task) {
      const remaining = task.amountEgp - (task.paidAmountEgp || 0);
      if (remaining > 0) {
        confirm(
          isRtl 
            ? `⚠️ انتبه: يوجد مبلغ متبقي مطلوب قدره (EGP ${remaining.toLocaleString()}) على هذا العميل!\n\nهل قمت بمطالبة العميل بالمتبقّي وتحصيله قبل تسليم المستندات المترجمة؟\n\nاضغط "موافق" لتأكيد الدفع والتسليم.`
            : `⚠️ Warning: There is an outstanding cash balance of (EGP ${remaining.toLocaleString()}) on this client!\n\nHave you demanded and collected this remainder before handing over the finished translations?\n\nClick "OK" to receipt the payment and proceed with delivery.`,
          () => {
            // Settle the remainder in the system database
            dbInstance.addPayment({
              taskId: task.id,
              referenceNo: task.referenceNo,
              clientName: task.clientNameCache || 'Cash client',
              fileName: task.fileName || 'Reference translation',
              paymentDate: new Date().toISOString().split('T')[0],
              paymentType: 'income',
              amountEgp: remaining,
              amountAed: 0,
              amountUsd: 0,
              paymentMethod: 'cash',
              notes: 'Settled final balance upon legal document handover'
            });
            
            // Synchronize display
            setTasks([...dbInstance.tasks]);

            task.status = 'delivered';
            task.deliveryDate = new Date().toISOString();
            (task as any).deliveredBy = dbInstance.activeProfile ? `${dbInstance.activeProfile.fullName} (${dbInstance.activeProfile.role})` : 'System';
            dbInstance.updateTask(task);
            success(isRtl ? 'تم تحديث حالة الملف لـ "تم التسليم" كلياً بنجاح وأرشفته.' : 'Folder status marked as delivered to client. Physical archiving complete.');
            setTasks([...dbInstance.tasks]);
          },
          undefined,
          { isRtl }
        );
      } else {
        task.status = 'delivered';
        task.deliveryDate = new Date().toISOString();
        (task as any).deliveredBy = dbInstance.activeProfile ? `${dbInstance.activeProfile.fullName} (${dbInstance.activeProfile.role})` : 'System';
        dbInstance.updateTask(task);
        success(isRtl ? 'تم تحديث حالة الملف لـ "تم التسليم" كلياً بنجاح وأرشفته.' : 'Folder status marked as delivered to client. Physical archiving complete.');
        setTasks([...dbInstance.tasks]);
      }
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const task = dbInstance.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Helper function to complete the task's final balance payment checking
    const proceedWithPaymentCheck = (currentTask: Task) => {
      const currency = currentTask.amountUsd > 0 ? 'USD' : (currentTask.amountAed > 0 ? 'AED' : 'EGP');
      let totalDue = currentTask.amountEgp;
      let paidAmount = currentTask.paidAmountEgp;
      if (currency === 'USD') {
        totalDue = currentTask.amountUsd;
        paidAmount = currentTask.paidAmountUsd;
      } else if (currency === 'AED') {
        totalDue = currentTask.amountAed;
        paidAmount = currentTask.paidAmountAed;
      }

      const remaining = totalDue - paidAmount;

      if (remaining > 0.01) {
        confirm(
          isRtl
            ? `⚠️ يوجد مبلغ متبقي مطلوب قدره (${currency} ${remaining.toLocaleString()}).\n\nهل قمت بتحصيل هذا المتبقي بالكامل الآن لتسوية الحساب وإغلاق الملف؟`
            : `⚠️ Outstanding balance due: (${currency} ${remaining.toLocaleString()}).\n\nHave you collected this remainder to settle and close this task file?`,
          () => {
            const payMethod = window.prompt(
              isRtl
                ? 'الرجاء إدخال طريقة الدفع (مثال: cash, bank, instapay, vodafone_cash):'
                : 'Please specify the payment method (e.g., cash, bank, instapay, vodafone_cash):',
              'cash'
            ) || 'cash';

            const methodEnum = (payMethod.toLowerCase().trim() as PaymentMethod);

            // Settle payment in system
            dbInstance.addPayment({
              taskId: currentTask.id,
              referenceNo: currentTask.referenceNo,
              clientName: currentTask.clientNameCache || 'Cash client',
              fileName: currentTask.fileName || 'Translation project',
              paymentDate: new Date().toISOString().split('T')[0],
              paymentType: 'income',
              amount: remaining,
              currency,
              amountEgp: currency === 'EGP' ? remaining : 0,
              amountAed: currency === 'AED' ? remaining : 0,
              amountUsd: currency === 'USD' ? remaining : 0,
              paymentMethod: methodEnum,
              notes: 'Settled remaining balance for completion'
            });

            finalizeCompletion(currentTask.id, currency);
          },
          undefined,
          { isRtl }
        );
      } else {
        finalizeCompletion(currentTask.id, currency);
      }
    };

    const finalizeCompletion = (tid: string, curr: string) => {
      const updatedTask = dbInstance.tasks.find(t => t.id === tid);
      if (updatedTask) {
        let upPaid = updatedTask.paidAmountEgp;
        let upTotal = updatedTask.amountEgp;
        if (curr === 'USD') {
          upPaid = updatedTask.paidAmountUsd;
          upTotal = updatedTask.amountUsd;
        } else if (curr === 'AED') {
          upPaid = updatedTask.paidAmountAed;
          upTotal = updatedTask.amountAed;
        }

        if (upTotal - upPaid <= 0.01) {
          updatedTask.status = 'completed';
          dbInstance.updateTask(updatedTask);
          setTasks([...dbInstance.tasks]);
          success(isRtl ? '🎉 ممتاز! تم سداد كامل المبلغ وتسليم الملف وإغلاقه بنجاح.' : '🎉 Task is now fully paid, delivered and successfully completed!');
        }
      }
    };

    // 1. Check delivery status. If task status is not 'delivered' or 'completed', prompt to mark delivered first.
    let deliveryConfirmed = (task.status === 'delivered' || task.status === 'completed');
    if (!deliveryConfirmed) {
      confirm(
        isRtl
          ? 'المهمة ليست مسلّمة بعد. هل تريد تعليمها كـ "تم التسليم" الآن أولاً لتسجيل تاريخ ووقت الحساب؟'
          : 'This task is not marked as delivered yet. Would you like to mark it as Delivered now to record files handover timestamp?',
        () => {
          task.status = 'delivered';
          task.deliveryDate = new Date().toISOString();
          (task as any).deliveredBy = dbInstance.activeProfile ? `${dbInstance.activeProfile.fullName} (${dbInstance.activeProfile.role})` : 'System';
          dbInstance.updateTask(task);
          proceedWithPaymentCheck(task);
        },
        undefined,
        { isRtl }
      );
    } else {
      proceedWithPaymentCheck(task);
    }
  };

  // Pre-formatted messages for WhatsApp and Email notifications
  const getNotificationData = (forReviewer?: boolean) => {
    if (!assignedSuccessData) return null;
    const { task, translator, assignmentType, reviewer } = assignedSuccessData;
    
    const targetProf = forReviewer && reviewer ? reviewer : translator;
    const targetType = forReviewer && reviewer ? 'revision' : assignmentType;
    
    const targetEmail = targetProf.email || '';
    
    const taskDeadlineStr = task.deadline 
      ? new Date(task.deadline).toLocaleString(isRtl ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : (isRtl ? 'حسب المحدد بالمنظومة' : 'As specified inside GTMS');

    const subject = `GTMS Task Assigned: ${task.referenceNo}`;
    const templateEnglish = `Hi ${targetProf.fullName},\n\nYou have been assigned a new task on GTMS:\n- Folder Ref: ${task.referenceNo}\n- File Name: ${task.fileName}\n- Word Count: ${task.wordCount.toLocaleString()} words\n- Task Role: ${targetType.toUpperCase()}\n- Target Deadline: ${taskDeadlineStr}\n\nPlease check your dispatch list and update your progress. Thank you!`;

    const templateArabic = `مرحباً ${targetProf.fullNameAr}،\n\nلقد تم تعيين مهمة ترجمة جديدة لك في نظام GTMS:\n- رقم الملف: ${task.referenceNo}\n- اسم المستند: ${task.fileName}\n- عدد الكلمات: ${task.wordCount.toLocaleString()} كلمة\n- طبيعة المهمة: ${targetType === 'translation' ? 'ترجمة معتمدة' : targetType === 'revision' ? 'مراجعة لغوية' : 'تدقيق لغوي'}\n- موعد التسليم: ${taskDeadlineStr}\n\nيرجى تسجيل الدخول إلى لوحة التحكم للبدء وتحديث حالة التسليم. شكراً لك!`;

    const finalMessage = isRtl ? templateArabic : templateEnglish;
    
    const rawPhone = targetProf.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}` : '';
    const mailtoUrl = targetEmail ? `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalMessage)}` : '';

    return {
      message: finalMessage,
      whatsappUrl,
      mailtoUrl,
      email: targetEmail,
      phone: rawPhone,
      subject
    };
  };

  // Sync Word input and estimated page count
  const handleWordUpdate = (val: number) => {
    setWords(val);
    setPages(Math.ceil(val / 250));
  };

  // Filter criteria
  const filteredTasks = tasks.filter(t => {
    const asg = dbInstance.assignments.find(a => a.taskId === t.id);
    const assignedLinguist = asg ? dbInstance.profiles.find(p => p.id === asg.translatorId) : null;
    const term = searchWord.toLowerCase().trim();

    const client = t.clientId ? dbInstance.clients.find(c => c.id === t.clientId) : null;

    const matchesSearch = 
      t.referenceNo.toLowerCase().includes(term) ||
      t.fileName.toLowerCase().includes(term) ||
      (t.clientNameCache && t.clientNameCache.toLowerCase().includes(term)) ||
      (t.clientPhone && t.clientPhone.toLowerCase().includes(term)) ||
      (client && (
        (client.phone && client.phone.toLowerCase().includes(term)) ||
        (client.email && client.email.toLowerCase().includes(term)) ||
        (client.name && client.name.toLowerCase().includes(term)) ||
        (client.nameAr && client.nameAr.toLowerCase().includes(term))
      )) ||
      (assignedLinguist && (
        assignedLinguist.fullName.toLowerCase().includes(term) ||
        (assignedLinguist.fullNameAr && assignedLinguist.fullNameAr.toLowerCase().includes(term))
      ));

    const matchesStatus = 
      statusFilter === 'all' || 
      t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort by priority (Urgent > High > Medium > Low) inside owner and admin views
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority-desc') {
      const rank = { urgent: 4, high: 3, medium: 2, low: 1 };
      const rankA = a.priority ? rank[a.priority] : 2; // Default to medium if undefined
      const rankB = b.priority ? rank[b.priority] : 2;
      return rankB - rankA;
    }
    if (sortBy === 'priority-asc') {
      const rank = { urgent: 4, high: 3, medium: 2, low: 1 };
      const rankA = a.priority ? rank[a.priority] : 2;
      const rankB = b.priority ? rank[b.priority] : 2;
      return rankA - rankB;
    }
    return 0; // Maintain default
  });

  return (
    <div className="space-y-6 font-sans text-slate-705">
      
      {/* LINGUIST WORKLOAD & CAPACITY CONSOLE */}
      <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-none">
        <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="text-indigo-600 w-5 h-5 shrink-0" />
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">
                {isRtl ? 'مشرف مراقبة ضغط العمل والقدرة الاستيعابية للمترجمين' : 'Linguist Workload & Capacity Monitor'}
              </h3>
              <p className="text-[10px] text-zinc-400">
                {isRtl 
                  ? 'متابعة ضغط العمل الحالي (الكلمات النشطة) مقارنة بالقدرة القصوى لمنع تكدس المهام وضمان جودة الترجمة المعتمدة' 
                  : 'Track active word loads against concurrent capacity metrics to prevent over-assignment and bottleneck delays.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWorkloads(!showWorkloads)}
            className="px-3 py-1 bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors text-[11px] font-semibold rounded-lg shadow-sm cursor-pointer"
          >
            {showWorkloads ? (isRtl ? 'إخفاء التفاصيل ▴' : 'Collapse Details ▴') : (isRtl ? 'عرض الإحصائيات ▾' : 'Expand Details ▾')}
          </button>
        </div>

        {showWorkloads && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
              {translators.map(t => {
                const metrics = getTranslatorMetrics(t.id);
                // Safe selection coloring for status light
                let statusColor = 'bg-emerald-500 text-emerald-800 border-emerald-250';
                let statusText = isRtl ? 'متاح ومستعد' : 'Available & Ready';
                let barColor = 'bg-emerald-500';

                if (metrics.percentage >= 85) {
                  statusColor = 'bg-rose-50 text-rose-800 border-rose-200';
                  statusText = isRtl ? 'ضغط عمل مرتفع جداً' : 'Overloaded / High Risk';
                  barColor = 'bg-rose-500';
                } else if (metrics.percentage >= 40) {
                  statusColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  statusText = isRtl ? 'تحت العمل النشط' : 'Healthy Active Load';
                  barColor = 'bg-amber-500';
                }

                return (
                  <div 
                    key={t.id} 
                    className={`p-4 rounded-xl border transition-all hover:shadow-xs flex flex-col justify-between ${
                      metrics.percentage >= 85 
                        ? 'border-rose-150 bg-rose-50/5' 
                        : 'border-zinc-150 bg-white hover:border-zinc-350'
                    }`}
                  >
                    <div>
                      {/* Name Header and Indicator */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="truncate">
                          <h4 className="font-bold text-zinc-900 text-xs truncate" title={t.fullName}>
                            {t.fullName}
                          </h4>
                          <p className="text-[10px] text-zinc-400 font-medium truncate">
                            {t.fullNameAr || '—'}
                          </p>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>

                      {/* Translator Meta Details */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-[9px] font-bold bg-zinc-100 text-zinc-650 px-1.5 py-0.5 rounded border border-zinc-150 uppercase tracking-widest leading-none">
                          {t.employeeType || 'Linguist'}
                        </span>
                        <span className="text-[9px] text-zinc-405 text-zinc-500 font-semibold flex items-center gap-0.5 whitespace-nowrap">
                          📊 {metrics.activeTasksCount} {isRtl ? 'ملفات نشطة' : 'active folders'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Value metrics */}
                    <div className="space-y-1.5 mt-auto pt-2 border-t border-zinc-50">
                      <div className="flex justify-between items-baseline text-[10px] font-mono leading-none">
                        <span className="text-zinc-400 font-sans font-semibold">
                          {isRtl ? 'الحمل الحالي:' : 'Active Load:'}
                        </span>
                        <span className="font-extrabold text-zinc-900">
                          {metrics.activeWords.toLocaleString()}{' '}
                          <span className="text-zinc-400 font-normal font-sans">/ {metrics.limit.toLocaleString()} wds</span>
                        </span>
                      </div>

                      {/* Visual Progress bar container */}
                      <div className="relative w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/40">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${metrics.percentage}%` }}
                        />
                      </div>

                      {/* Percentage label and shortcut search filter */}
                      <div className="flex justify-between items-center text-[10px] pt-0.5">
                        <span className={`font-black font-mono ${metrics.percentage >= 85 ? 'text-rose-600' : metrics.percentage >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {metrics.percentage}% {isRtl ? 'مستغل' : 'capacity'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchWord(t.fullName);
                            setStatusFilter('all');
                          }}
                          className="text-[9px] text-indigo-600 hover:text-indigo-850 hover:underline font-bold bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 cursor-pointer"
                        >
                          {isRtl ? 'تفاصيل 🔍' : 'View tasks 🔍'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overload Legend warnings or advices */}
            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-150 rounded-lg flex items-start gap-2.5 text-[11px] text-zinc-650">
              <AlertTriangle className="text-amber-500 w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <span className="font-extrabold text-zinc-800 block mb-0.5">
                  {isRtl ? 'إرشاد حماية السعة الاستيعابية لمنسقي المشاريع:' : 'Project Dispatch Advisory Guideline:'}
                </span>
                <p className="leading-relaxed">
                  {isRtl 
                    ? 'يرجى تجنب إسناد ملفات معقدة جديدة إلى المترجمين الذين تتجاوز نسبة الضغط لديهم 85%. قم بتعيين المترجمين تحت النطاق الأخضر (<40%) لتوزيع متساوٍ وضمان دقة الصياغة والمصادقة القانونية.' 
                    : 'Linguists with active load capacity utilization exceeding 85% is flagged as High Risk. Outward allocations should prioritize available specialists possessing low capacity utilization (<40%) to secure premium, error-free certified outputs.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Filtering and Intake button Trigger */}
      <div className="bg-white border border-zinc-150 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none">
        <div className="flex gap-1 bg-zinc-50 border border-zinc-150 p-1 rounded-lg w-fit">
          <button 
            onClick={() => setStatusFilter('all')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'all' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 text-zinc-500'}`}
          >
            All folders ({tasks.length})
          </button>
          <button 
            onClick={() => setStatusFilter('pending')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'pending' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 text-zinc-500'}`}
          >
            Unallocated ({tasks.filter(t => t.status === 'pending').length})
          </button>
          <button 
            onClick={() => setStatusFilter('assigned')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'assigned' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-650 text-zinc-500'}`}
          >
            Assigned Queue
          </button>
          <button 
            onClick={() => setStatusFilter('completed')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'completed' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 text-zinc-500'}`}
          >
            Ready
          </button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 justify-end">
          {(currentRole === 'owner' || currentRole === 'admin') && (
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-zinc-200 text-xs rounded-lg focus:outline-none cursor-pointer font-semibold text-zinc-750 hover:bg-zinc-50 transition-colors shrink-0"
              title={isRtl ? 'فرز حسب الأولوية' : 'Sort by Priority'}
            >
              <option value="default">{isRtl ? 'ترتيب افتراضي' : 'Default Sort'}</option>
              <option value="priority-desc">{isRtl ? 'الأولية (عاجل ➔ منخفض)' : 'Priority (Urgent ➔ Low)'}</option>
              <option value="priority-asc">{isRtl ? 'الأولية (منخفض ➔ عاجل)' : 'Priority (Low ➔ Urgent)'}</option>
            </select>
          )}

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              <Search size={13} />
            </span>
            <input 
              type="text" 
              value={searchWord}
              onChange={e => setSearchWord(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:bg-white focus:border-zinc-400 transition-colors"
              placeholder={isRtl ? "ابحث باسم العميل، الهاتف، البريد، المترجم أو عنوان الملف..." : "Search client, phone, email, translator, or file..."}
              title={isRtl ? "ابحث باسم العميل، الهاتف، البريد، أو المترجم المعين" : "Filter tasks by client, phone, email, translator, or file"}
            />
            {searchWord && (
              <button 
                type="button"
                onClick={() => setSearchWord('')}
                className="absolute inset-y-0 right-2 px-1 flex items-center text-[10px] font-bold text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
                title={isRtl ? "إلغاء البحث" : "Clear search"}
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setIsTaskListExportOpen(true)}
            className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 hover:text-zinc-950 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-xs"
            title={isRtl ? 'تصدير وثائق المهام بالكامل إلى ملف إكسل محمي' : 'Export task files to Excel (Secure)'}
            id="export-tasks-excel-btn"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            <span>{isRtl ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>
          <button
            onClick={() => setIsRegistering(true)}
            className="px-4 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <Plus size={12} />
            <span>Register Intake</span>
          </button>
        </div>
      </div>

      {isAdminOrStaff && selectedTaskIds.length > 0 && (
        <div className="bg-zinc-900 text-white rounded-xl p-4 shadow-xl border border-zinc-850 flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                {selectedTaskIds.length}
              </span>
              <div>
                <p className="text-xs font-bold font-sans">
                  {isRtl ? 'ملفات الترجمة المحددة للمعالجة الجماعية' : 'Selected translation folders for bulk action'}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTaskIds([])}
                  className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors underline cursor-pointer mt-0.5 block text-left"
                >
                  {isRtl ? 'إلغاء تحديد الكل' : 'Deselect all files'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* STATUS BULK ACTION */}
              <div className="flex items-center gap-1.5 p-1.5 bg-zinc-805 bg-zinc-800 rounded-lg border border-zinc-700/60">
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value)}
                  className="bg-transparent text-white text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[155px]"
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">{isRtl ? '-- تحديث الحالة --' : '-- Status --'}</option>
                  <option value="pending" className="bg-zinc-900 text-white">{isRtl ? 'غير معين (معلق)' : 'Unallocated (Pending)'}</option>
                  <option value="assigned" className="bg-zinc-900 text-white">{isRtl ? 'تم التعيين' : 'Assigned'}</option>
                  <option value="in_progress" className="bg-zinc-900 text-white">{isRtl ? 'قيد العمل' : 'In Progress'}</option>
                  <option value="review" className="bg-zinc-900 text-white">{isRtl ? 'قيد المراجعة' : 'Review'}</option>
                  <option value="completed" className="bg-zinc-900 text-white">{isRtl ? 'جاهز للتسليم' : 'Ready (Completed)'}</option>
                  <option value="delivered" className="bg-zinc-900 text-white">{isRtl ? 'تم التسليم' : 'Delivered'}</option>
                  <option value="archived" className="bg-zinc-900 text-white">{isRtl ? 'مؤرشف' : 'Archived'}</option>
                </select>
                <button
                  type="button"
                  disabled={!bulkStatus}
                  onClick={handleBulkStatusUpdate}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isRtl ? 'تطبيق' : 'Apply'}
                </button>
              </div>

               {/* TRANSLATOR BULK ALLOCATION */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-805 bg-zinc-800 rounded-lg border border-zinc-700/60">
                <select
                  value={bulkTranslatorId}
                  onChange={e => setBulkTranslatorId(e.target.value)}
                  className="bg-transparent text-white text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[165px]"
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">{isRtl ? '-- تعيين مترجم --' : '-- Assign Translator --'}</option>
                  {translators.map(t => (
                    <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
                      {t.fullName}
                    </option>
                  ))}
                </select>

                {bulkTranslatorId && (() => {
                  const metrics = getTranslatorMetrics(bulkTranslatorId);
                  const colorClass = metrics.percentage >= 85 ? 'text-rose-400 font-extrabold' : metrics.percentage >= 40 ? 'text-amber-450 text-amber-400 font-bold' : 'text-emerald-400 font-semibold';
                  return (
                    <div className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-zinc-300 flex items-center gap-1">
                      <span className="text-zinc-550 text-zinc-500">{isRtl ? 'ضغط:' : 'Load:'}</span>
                      <span className={colorClass}>{metrics.percentage}%</span>
                      {metrics.percentage >= 85 && <span className="text-[9px] text-rose-500 animate-pulse">⚠️</span>}
                    </div>
                  );
                })()}

                {bulkTranslatorId && (
                  <>
                    <select
                      value={bulkAssignType}
                      onChange={e => setBulkAssignType(e.target.value as any)}
                      className="bg-transparent text-white text-[10px] focus:outline-none border-l border-zinc-700 pl-1.5 cursor-pointer font-bold"
                    >
                      <option value="translation" className="bg-zinc-900">{isRtl ? 'ترجمة' : 'Translation'}</option>
                      <option value="revision" className="bg-zinc-900">{isRtl ? 'مراجعة' : 'Revision'}</option>
                      <option value="proofreading" className="bg-zinc-900">{isRtl ? 'تدقيق' : 'Proofreading'}</option>
                    </select>

                    <div className="flex items-center gap-1 border-l border-zinc-700 pl-1.5 text-white">
                      <span className="text-[9px] text-zinc-400">Rate:</span>
                      <input
                        type="number"
                        placeholder="EG/wd"
                        value={bulkRateWords || ''}
                        onChange={e => {
                          setBulkRateWords(parseFloat(e.target.value) || 0);
                          setBulkRateFixed(0);
                        }}
                        className="w-12 bg-zinc-900 border border-zinc-700 text-[10px] rounded p-0.5 font-semibold text-center focus:outline-none"
                      />
                      <span className="text-[9px] text-zinc-400">Fixed:</span>
                      <input
                        type="number"
                        placeholder="Fixed"
                        value={bulkRateFixed || ''}
                        onChange={e => {
                          setBulkRateFixed(parseFloat(e.target.value) || 0);
                          setBulkRateWords(0);
                        }}
                        className="w-12 bg-zinc-900 border border-zinc-700 text-[10px] rounded p-0.5 font-semibold text-center focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <button
                  type="button"
                  disabled={!bulkTranslatorId}
                  onClick={handleBulkAssignment}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isRtl ? 'تعيين' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CORE WORKFLOW LISTS TABULATION */}
      <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden text-zinc-700 shadow-none">
         <div className="overflow-x-auto w-full">
           <table className="w-full text-xs text-left text-zinc-600 font-sans border-collapse">
             <thead className="bg-zinc-50 border-b border-zinc-150 text-[10px] uppercase font-semibold text-zinc-400 tracking-widest">
               <tr>
                 {isAdminOrStaff && (
                   <th className="px-4 py-3 border-r border-zinc-100 text-center w-12">
                     <input 
                       type="checkbox"
                       checked={sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length}
                       onChange={e => {
                         if (e.target.checked) {
                           setSelectedTaskIds(sortedTasks.map(t => t.id));
                         } else {
                           setSelectedTaskIds([]);
                         }
                       }}
                       className="cursor-pointer"
                       title={isRtl ? 'تحديد كافة ملفات الجدول' : 'Select all folders in current list'}
                     />
                   </th>
                 )}
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Folder Ref</th>
                 <th className="px-5 py-3 border-r border-zinc-100">Target Client</th>
                 <th className="px-5 py-3 border-r border-zinc-100">Inward File / Scope</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Languages</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Word count</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-right">EGP Price</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Status</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Priority</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Deadline</th>
                 <th className="px-5 py-3 text-center">Allocation Checks</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-150 font-sans">
               {sortedTasks.length === 0 ? (
                 <tr>
                   <td colSpan={isAdminOrStaff ? 11 : 10} className="p-8 text-center text-zinc-400">
                     No active translation folders currently tracked in GTMS. Press "Register Intake" to file folders.
                   </td>
                 </tr>
              ) : (
                sortedTasks.map(t => {
                  // check if there is assignment
                  const asg = dbInstance.assignments.find(a => a.taskId === t.id);
                  const assignedLinguist = asg ? dbInstance.profiles.find(p => p.id === asg.translatorId) : null;
                  const taskAsgs = dbInstance.assignments.filter(a => a.taskId === t.id);

                  const tCurrency = t.amountUsd > 0 ? 'USD' : (t.amountAed > 0 ? 'AED' : 'EGP');
                  let tTotal = t.amountEgp;
                  let tPaid = t.paidAmountEgp;
                  if (tCurrency === 'USD') {
                    tTotal = t.amountUsd;
                    tPaid = t.paidAmountUsd;
                  } else if (tCurrency === 'AED') {
                    tTotal = t.amountAed;
                    tPaid = t.paidAmountAed;
                  }
                  const tBalance = tTotal - tPaid;
                  const tIsDelivered = t.status === 'delivered' || t.status === 'completed';
                  const tIsFullyPaid = t.paymentStatus === 'paid' || tBalance <= 0.01;

                  let rowBgClass = "hover:bg-zinc-50/50 transition-colors";
                  if (tIsDelivered && tIsFullyPaid && tBalance <= 0.01) {
                    rowBgClass = "bg-emerald-50/80 hover:bg-emerald-100/95 text-emerald-950 transition-colors border-b border-emerald-205";
                  } else if (tIsDelivered && tBalance > 0.01) {
                    rowBgClass = "bg-amber-50/80 hover:bg-amber-100/95 text-amber-940 transition-colors border-b border-amber-205";
                  } else if (tIsFullyPaid && !tIsDelivered) {
                     rowBgClass = "bg-sky-50/80 hover:bg-sky-100/95 text-sky-950 transition-colors border-b border-sky-205";
                  } else {
                    rowBgClass = "bg-rose-50/40 hover:bg-rose-100/70 border-b border-rose-205 transition-colors";
                  }

                  return (
                    <tr key={t.id} className={rowBgClass}>
                      {isAdminOrStaff && (
                        <td className="px-4 py-3.5 text-center border-r border-zinc-100 w-12">
                          <input 
                            type="checkbox"
                            checked={selectedTaskIds.includes(t.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedTaskIds(prev => [...prev, t.id]);
                              } else {
                                setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 font-bold font-mono text-zinc-900 select-all shrink-0">
                        <div>{t.referenceNo}</div>
                        {(() => {
                          const qId = t.quotationId || t.quotation_id;
                          const q = quotations.find(item => item.id === qId || item.convertedToJobId === t.id || item.linkedTaskId === t.id || item.linked_task_id === t.id);
                          return q ? (
                            <div className="text-[9px] text-zinc-400 mt-1 font-semibold no-print-area">
                              {isRtl ? 'عرض السعر: ' : 'Quote: '}
                              <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150 font-bold">{q.quoteNumber}</span>
                            </div>
                          ) : null;
                        })()}
                      </td>
                      <td className="px-5 py-3.5 border-r border-zinc-100 font-semibold text-zinc-900">
                        {t.clientNameCache}
                      </td>
                      <td className="px-5 py-3.5 border-r border-zinc-100">
                        <p className="font-semibold text-zinc-900 truncate max-w-xs">{t.fileName}</p>
                        <span className="text-[10px] text-zinc-400 capitalize block mt-1">{t.serviceType.replace('_', ' ')} • Received: {t.intakeDate}</span>
                        {t.attachments && t.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 max-w-[280px]">
                            {t.attachments.map(att => (
                              <a
                                key={att.id}
                                href={att.url}
                                download={att.name}
                                title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                                className="inline-flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900 border border-zinc-200/80 px-1.5 py-0.5 rounded text-[9px] font-mono transition-all shrink-0"
                              >
                                <Paperclip size={9} className="text-zinc-400 shrink-0" />
                                <span className="truncate max-w-[90px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 text-zinc-500">
                        {t.sourceLanguage} ➔ <br /> {t.targetLanguage}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 font-semibold font-mono text-zinc-850">
                        {t.wordCount.toLocaleString()} wds
                      </td>
                      <td className="px-5 py-3.5 text-right border-r border-zinc-100 font-mono text-zinc-900">
                        <div className="font-semibold text-xs">EGP {t.amountEgp.toLocaleString()}</div>
                        {t.amountAed > 0 && <span className="block text-[10px] text-zinc-400 font-semibold font-mono">AED {t.amountAed}</span>}
                        {(t.amountEgp - (t.paidAmountEgp || 0)) > 0 ? (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-bold rounded border border-rose-100 animate-pulse" title={isRtl ? 'المبلغ المتبقي المطلوب تحصيله' : 'Outstanding remains to collect'}>
                            {isRtl ? 'باقي: ' : 'Rem: '} EGP {(t.amountEgp - (t.paidAmountEgp || 0)).toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded border border-emerald-100">
                            {isRtl ? 'مدفوع بالكامل' : 'Paid Full'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                          t.status === 'pending' ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
                          t.status === 'assigned' ? 'bg-zinc-50 text-zinc-800 border-zinc-355 border-zinc-200' :
                          t.status === 'in_progress' ? 'bg-zinc-900 text-white border-transparent' :
                          t.status === 'review' ? 'bg-zinc-100 text-zinc-750 border-zinc-250' :
                          t.status === 'cancelled' ? 'bg-red-50 text-red-655 border-red-200' :
                          'bg-zinc-900 text-white border-transparent font-semibold border'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 shrink-0 font-sans">
                        {t.priority ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
                            t.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-250 shadow-xs' :
                            t.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                            t.priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-250' :
                            'bg-zinc-100 text-zinc-650 border-zinc-200'
                          }`}>
                            {isRtl ? (
                              t.priority === 'urgent' ? 'عاجل جداً' :
                              t.priority === 'high' ? 'عالية' :
                              t.priority === 'medium' ? 'متوسطة' :
                              'منخفضة'
                            ) : t.priority}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[10px] font-semibold italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 font-sans tracking-wide">
                        {t.deadline ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono font-bold text-zinc-900 text-[10px]">
                              {new Date(t.deadline).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[9px] font-semibold text-zinc-400 font-mono mt-0.5">
                              {new Date(t.deadline).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px] font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center min-w-[200px]">
                        {taskAsgs.length === 0 ? (
                          <div className="flex flex-col gap-1.5 items-center justify-center w-full shrink-0">
                            <button
                              onClick={() => {
                                setSelectedTaskForAccDetails(t);
                              }}
                              className="px-2.5 py-1.5 text-[10px] font-semibold bg-zinc-900 hover:bg-zinc-850 text-white rounded cursor-pointer transition-colors inline-flex items-center justify-center gap-1 shrink-0 w-full animate-pulse"
                            >
                              <UserPlus size={10} /> {isRtl ? 'تعيين لغويين' : 'Assign Linguists'}
                            </button>
                            {isAdminOrStaff && t.status !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  confirm(
                                    isRtl ? 'هل تريد إلغاء هذه المهمة بالكامل؟' : 'Are you sure you want to cancel this task?',
                                    () => {
                                      dbInstance.cancelTask(t.id);
                                      success(isRtl ? 'تم إلغاء المهمة بنجاح!' : 'Task has been cancelled successfully!');
                                      setTasks([...dbInstance.tasks]);
                                    },
                                    undefined,
                                    { isRtl }
                                  );
                                }}
                                className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-650 hover:text-zinc-800 border border-zinc-200 text-[8px] font-bold rounded cursor-pointer uppercase text-center transition-all inline-flex items-center justify-center gap-0.5 w-full mt-0.5"
                              >
                                ✖ {isRtl ? 'إلغاء المهمة' : 'Cancel Task'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 text-center">
                            {/* Assigned Specialists list */}
                            <div className="space-y-1 text-left">
                              {taskAsgs.map(asg => {
                                const profile = dbInstance.profiles.find(p => p.id === asg.translatorId);
                                const name = profile ? profile.fullName : asg.translatorId;
                                const isTR = asg.assignmentType === 'translation';
                                
                                return (
                                  <div key={asg.id} className="flex items-center justify-between gap-2 bg-zinc-50 p-1 rounded border border-zinc-200 text-[9px] font-sans">
                                    <span className="font-semibold text-zinc-800 truncate max-w-[120px]" title={name}>
                                      <span className={`inline-block mr-1 px-1 rounded text-[8px] font-extrabold uppercase text-white ${isTR ? 'bg-indigo-650' : 'bg-purple-650'}`}>
                                        {isTR ? 'TR' : 'REV'}
                                      </span>
                                      {name}
                                    </span>
                                    <span className={`px-1 rounded text-[8px] font-bold uppercase ${
                                      asg.status === 'approved' ? 'bg-green-105 text-emerald-600 border border-emerald-200' :
                                      asg.status === 'submitted' ? 'bg-indigo-50 text-indigo-700 animate-pulse border border-indigo-200' :
                                      asg.status === 'returned_for_correction' ? 'bg-red-50 text-rose-600 font-bold border border-rose-200' :
                                      asg.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                      'bg-zinc-50 text-zinc-500 border-zinc-200'
                                    }`}>
                                      {asg.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Progress bar */}
                            {(() => {
                              const completed = taskAsgs.filter(a => a.status === 'approved').length;
                              const total = taskAsgs.length;
                              const totalWordsAssigned = taskAsgs.reduce((sum, a) => sum + (a.wordCountAssigned || 0), 0);
                              const submittedWords = taskAsgs.filter(a => a.status === 'submitted' || a.status === 'approved').reduce((sum, a) => sum + (a.wordCountAssigned || 0), 0);
                              const progressPct = totalWordsAssigned > 0 ? Math.round((submittedWords / totalWordsAssigned) * 100) : 0;
                              
                              return (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[8px] font-bold text-zinc-500 uppercase font-mono">
                                    <span>{isRtl ? 'الأقسام:' : 'Parts:'} {completed}/{total}</span>
                                    <span>{progressPct}% {isRtl ? 'منجز' : 'Done'}</span>
                                  </div>
                                  <div className="w-full bg-zinc-250 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-zinc-900 h-full rounded-full transition-all duration-350" 
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Quick files download */}
                            {(() => {
                              const files = taskAsgs.flatMap(a => a.translatedAttachments || []);
                              if (files.length === 0) return null;
                              return (
                                <div className="mt-1 p-1 bg-emerald-50 rounded border border-emerald-150 space-y-1 text-left">
                                  <span className="text-[7.5px] font-black text-emerald-800 uppercase block font-mono">
                                    📥 {isRtl ? 'الملفات المرفوعة:' : 'Uploaded Drafts:'}
                                  </span>
                                  {files.map(att => (
                                    <a
                                      key={att.id}
                                      href={att.url}
                                      download={att.name}
                                      className="flex items-center gap-1 bg-white hover:bg-emerald-100 text-zinc-900 border border-emerald-200 p-0.5 rounded text-[8px] font-mono transition-all truncate cursor-pointer"
                                      onClick={() => {
                                        alert(isRtl ? `تنزيل الملف: ${att.name}` : `Downloading file: ${att.name}`);
                                      }}
                                    >
                                      <FileText size={8} className="text-emerald-555 shrink-0" />
                                      <span className="truncate max-w-[120px] font-bold">{att.name}</span>
                                    </a>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Action Buttons */}
                            <div className="space-y-1 mt-1 border-t border-zinc-100 pt-1">
                              {taskAsgs.some(a => a.status === 'submitted') && (
                                <div className="px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-extrabold rounded border border-indigo-150 uppercase tracking-wider animate-pulse flex items-center justify-center gap-0.5">
                                  ⚠️ {isRtl ? 'يتطلب المراجعة والاعتماد' : 'Needs Verification'}
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedTaskForAccDetails(t);
                                  setAccPaymentAmt('');
                                  setAccPaymentNotes('');
                                }}
                                className="w-full px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[9px] font-bold rounded cursor-pointer uppercase tracking-wider text-center flex items-center justify-center gap-1 border border-zinc-350 shadow-xs transition-colors"
                              >
                                📊 {isRtl ? 'إدارة التكاليف والمهام' : 'Manage & Accruals'}
                              </button>

                              {isAdminOrStaff && t.status !== 'completed' && t.status !== 'delivered' && t.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    confirm(
                                      isRtl ? 'هل تريد إلغاء هذه المهمة بالكامل؟' : 'Are you sure you want to cancel this entire task?',
                                      () => {
                                        dbInstance.cancelTask(t.id);
                                        success(isRtl ? 'تم إلغاء المهمة بنجاح!' : 'Task has been cancelled successfully!');
                                        setTasks([...dbInstance.tasks]);
                                      },
                                      undefined,
                                      { isRtl }
                                    );
                                  }}
                                  className="w-full px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 text-[8px] font-black rounded cursor-pointer uppercase text-center transition-all inline-flex items-center justify-center gap-0.5"
                                >
                                  ✖ {isRtl ? 'إلغاء المهمة' : 'Cancel Task'}
                                </button>
                              )}

                              {t.status === 'completed' && (
                                <button
                                  onClick={() => handleDeliverTask(t.id)}
                                  className="w-full px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-white text-[9px] font-bold rounded cursor-pointer uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-xs transition-colors mt-1"
                                >
                                  {isRtl ? 'تسليم الملف للعميل' : 'Mark Delivered'}
                                </button>
                              )}

                              {(t.status === 'completed' || t.status === 'delivered') && (
                                <button
                                  onClick={() => handleCompleteTask(t.id)}
                                  className="w-full px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded cursor-pointer uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-xs transition-colors mt-1"
                                  title={isRtl ? 'إغلاق وتسوية الملف نهائياً' : 'Complete task and collect remaining balance'}
                                >
                                  ✅ {isRtl ? 'إغلاق وتسوية المهمة' : 'Complete Task'}
                                </button>
                              )}

                              {t.status === 'completed' && (
                                <div className="mt-1 space-y-1">
                                  {(t.amountEgp - (t.paidAmountEgp || 0)) > 0 && (
                                    <div className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded border border-rose-150 flex items-center gap-0.5 justify-center animate-pulse">
                                      ⚠️ {isRtl ? 'طالب بالمبلغ المتبقي!' : 'Collect Remainder!'}
                                    </div>
                                  )}

                                  {(currentRole === 'owner' || currentRole === 'admin' || currentRole === 'sales' || currentRole === 'secretary' || currentRole === 'staff') && (
                                    <button
                                      onClick={() => {
                                        setCertifiedTask(t);
                                        setIsCertifiedModalOpen(true);
                                      }}
                                      className="w-full px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 text-[9px] font-bold rounded cursor-pointer uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-xs transition-colors mt-1"
                                    >
                                      ⚖️ {isRtl ? 'تصدير نسخة معتمدة' : 'Export Certified Copy'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION MODAL FORM - Multi step intake file catalog */}
      {(isRegistering || isQuickIntakeOpen) && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 animate-fade-in text-slate-700 font-sans">
          <div className="bg-white p-5 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm">
              Register Incoming Translation Folder Document
            </h3>
            
            <form onSubmit={handleRegisterTask} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
              {/* PRE-FILL METADATA CONNECTOR (LINKED ERP ACTION) */}
              <div className="sm:col-span-2 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2">
                <label className="block text-[11px] font-black text-emerald-950 uppercase tracking-wide">
                  🔗 {isRtl ? 'ربط واستيراد بيانات تلقائية (تجنب التكرار)' : 'Anti-Double Entry Metadata Linker'}
                </label>
                <p className="text-[10px] text-emerald-900 font-semibold leading-relaxed">
                  {isRtl ? 'اختر فرصة معلقة أو عرض سعر أو فاتورة نشطة لملء كافة تفاصيل العميل، اللغات، المشروع والأسعار تلقائياً.' : 'Select an active opportunity, quotation, or invoice to populate the entire folder, client, languages, and pricing metrics instantly.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* CRM Leads Import */}
                  <div>
                    <label className="text-[9px] font-extrabold text-emerald-800 uppercase block mb-1">{isRtl ? 'فرصة بيع نشطة (CRM)' : 'CRM Lead Opportunity'}</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const lead = leads.find(l => l.id === val);
                        if (lead) {
                          let cId = lead.convertedToClientId || '';
                          if (cId) {
                            const matchedClient = clients.find(c => c.id === cId);
                            if (matchedClient) {
                              setClientId(matchedClient.id);
                              setClientSearchQuery(`${matchedClient.name}${matchedClient.nameAr ? ` (${matchedClient.nameAr})` : ''}`);
                              if (matchedClient.phone) setClientPhone(matchedClient.phone);
                            }
                          } else {
                            const matchedClient = clients.find(c => c.name.toLowerCase() === lead.name.toLowerCase());
                            if (matchedClient) {
                              setClientId(matchedClient.id);
                              setClientSearchQuery(`${matchedClient.name}${matchedClient.nameAr ? ` (${matchedClient.nameAr})` : ''}`);
                              if (matchedClient.phone) setClientPhone(matchedClient.phone);
                            } else {
                              setIsRegisteringNewClient(true);
                              setNewClientName(lead.name);
                              setNewClientNameAr(lead.name);
                              setNewClientPhone(lead.phone || '');
                              setNewClientEmail(lead.email || '');
                              setNewClientType(lead.company ? 'company' : 'individual');
                              setNewClientNotes(`Lead imported on translation intake: ${lead.notes || ''}`);
                            }
                          }
                          if (!fileName) {
                            setFileName(`Translation Project for lead ${lead.name}`);
                          }
                          if (lead.notes) setNotes(`Linked to CRM Lead: ${lead.notes}`);
                          setEgp(0); setAed(0); setUsd(0);
                          if (lead.estimatedValue) {
                            if (lead.currency === 'USD') setUsd(lead.estimatedValue);
                            else if (lead.currency === 'AED') setAed(lead.estimatedValue);
                            else setEgp(lead.estimatedValue);
                          }
                          if (lead.serviceInterests && lead.serviceInterests.length > 0) {
                            setService(lead.serviceInterests[0]);
                          }
                        }
                      }}
                      className="w-full p-2 bg-white border border-emerald-250 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- {isRtl ? 'اختر فرصة CRM' : 'Choose CRM Lead'} --</option>
                      {leads.filter(l => l.stage !== 'lost').map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.estimatedValue?.toLocaleString()} {l.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quotations Import */}
                  <div>
                    <label className="text-[9px] font-extrabold text-emerald-800 uppercase block mb-1">{isRtl ? 'عرض سعر معتمد/مرسل' : 'Quotation (Offers)'}</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        setLinkedQuotationId(val);
                        if (!val) return;
                        const q = quotations.find(item => item.id === val);
                        if (q) {
                          const matchedClient = clients.find(c => c.id === q.clientId);
                          if (matchedClient) {
                            setClientId(matchedClient.id);
                            setClientSearchQuery(`${matchedClient.name}${matchedClient.nameAr ? ` (${matchedClient.nameAr})` : ''}`);
                            if (matchedClient.phone) setClientPhone(matchedClient.phone);
                          } else {
                            setClientSearchQuery(q.clientName);
                          }
                          
                          const firstItem = q.items && q.items[0];
                          const nameToSet = q.documentsToBeTranslated && q.documentsToBeTranslated.length > 0
                            ? q.documentsToBeTranslated[0].name
                            : (firstItem ? firstItem.description : `Project from ${q.quoteNumber}`);
                          setFileName(nameToSet);
                          
                          const totalWords = q.items ? q.items.reduce((sum, it) => sum + (it.unit === 'word' ? it.quantity : 0), 0) : 0;
                          const totalPages = q.items ? q.items.reduce((sum, it) => sum + (it.unit === 'page' ? it.quantity : 0), 0) : 0;
                          if (totalWords) setWords(totalWords);
                          if (totalPages) setPages(totalPages);
                          else if (totalWords) setPages(Math.ceil(totalWords / 250));
                          
                          setEgp(0); setAed(0); setUsd(0);
                          if (q.currency === 'USD') setUsd(q.grandTotal);
                          else if (q.currency === 'AED') setAed(q.grandTotal);
                          else setEgp(q.grandTotal);
                          
                          setNotes(`Linked automatically with Quotation ${q.quoteNumber}. Base value: ${q.grandTotal} ${q.currency}.`);
                          if (q.expectedDeliveryDate) {
                            setDeadline(q.expectedDeliveryDate.split('T')[0]);
                          }
                          if (q.documentsToBeTranslated && q.documentsToBeTranslated.length > 0) {
                            setAttachments(q.documentsToBeTranslated);
                          }
                          if (q.serviceType) {
                            setService(q.serviceType as any);
                          }
                          if (q.sourceLanguage && q.sourceLanguage !== 'Auto') setSrcLang(q.sourceLanguage);
                          if (q.targetLanguage && q.targetLanguage !== 'Auto') setTgtLang(q.targetLanguage);
                        }
                      }}
                      className="w-full p-2 bg-white border border-emerald-255 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- {isRtl ? 'اختر عرض سعر' : 'Choose Quotation'} --</option>
                      {quotations.map(q => (
                        <option key={q.id} value={q.id}>
                          {q.quoteNumber} - {q.clientName} ({q.grandTotal?.toLocaleString()} {q.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Invoices Import */}
                  <div>
                    <label className="text-[9px] font-extrabold text-emerald-800 uppercase block mb-1">{isRtl ? 'فاتورة صادرة' : 'Invoice Reference'}</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const inv = invoices.find(item => item.id === val);
                        if (inv) {
                          const matchedClient = clients.find(c => c.id === inv.clientId);
                          if (matchedClient) {
                            setClientId(matchedClient.id);
                            setClientSearchQuery(`${matchedClient.name}${matchedClient.nameAr ? ` (${matchedClient.nameAr})` : ''}`);
                            if (matchedClient.phone) setClientPhone(matchedClient.phone);
                          } else {
                            setClientSearchQuery(inv.clientName);
                          }
                          
                          const firstItem = inv.items && inv.items[0];
                          const nameToSet = firstItem ? firstItem.description : `Project from ${inv.invoiceNumber}`;
                          setFileName(nameToSet);
                          
                          const totalWords = inv.items ? inv.items.reduce((sum, it) => sum + (it.unit === 'word' ? it.quantity : 0), 0) : 0;
                          const totalPages = inv.items ? inv.items.reduce((sum, it) => sum + (it.unit === 'page' ? it.quantity : 0), 0) : 0;
                          if (totalWords) setWords(totalWords);
                          if (totalPages) setPages(totalPages);
                          else if (totalWords) setPages(Math.ceil(totalWords / 250));
                          
                          setEgp(0); setAed(0); setUsd(0);
                          if (inv.currency === 'USD') setUsd(inv.grandTotal);
                          else if (inv.currency === 'AED') setAed(inv.grandTotal);
                          else setEgp(inv.grandTotal);
                          
                          setNotes(`Linked automatically with Invoice ${inv.invoiceNumber}. Unpaid balance: ${inv.balance} ${inv.currency}.`);
                          if (inv.dueDate) {
                            setDeadline(inv.dueDate);
                          }
                        }
                      }}
                      className="w-full p-2 bg-white border border-emerald-255 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- {isRtl ? 'اختر فاتورة' : 'Choose Invoice'} --</option>
                      {invoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - {inv.clientName} ({inv.grandTotal?.toLocaleString()} {inv.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* On-the-fly Client Account Assignment / Creation Section */}
              <div className="sm:col-span-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-indigo-900 text-xs flex items-center gap-1.5">
                    👤 {isRtl ? 'العميل الفعلي للملف' : 'Client Profile Assignment'}
                  </span>
                  
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-indigo-600">
                    <input 
                      type="checkbox"
                      checked={isRegisteringNewClient}
                      onChange={e => setIsRegisteringNewClient(e.target.checked)}
                      className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>{isRtl ? '➕ إضافة عميل جديد بالكامل' : '➕ Add brand new client'}</span>
                  </label>
                </div>

                {!isRegisteringNewClient ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {isRtl ? 'البحث عن العميل بالاسم (إكمال تلقائي)' : 'Search Client Name (Auto-Complete)'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientSearchQuery}
                          onChange={e => {
                            const val = e.target.value;
                            setClientSearchQuery(val);
                            setShowClientSuggestions(true);
                            if (!val) {
                              setClientId('');
                            } else {
                              // If there's a perfect match on search query, select it
                              const exactMatch = clients.find(c => c.name.toLowerCase() === val.toLowerCase() || (c.nameAr && c.nameAr.toLowerCase() === val.toLowerCase()));
                              if (exactMatch) {
                                setClientId(exactMatch.id);
                                if (exactMatch.phone) setClientPhone(exactMatch.phone);
                              }
                            }
                          }}
                          onFocus={() => setShowClientSuggestions(true)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[11px] pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                          placeholder={isRtl ? "اكتب اسم العميل عربي أو إنجليزي..." : "Type client name (EN/AR)..."}
                          required={!isRegisteringNewClient && !clientPhone}
                        />
                        {clientSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setClientSearchQuery('');
                              setClientId('');
                              setShowClientSuggestions(false);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Suggestions list popup */}
                      {showClientSuggestions && (
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-100">
                          {(() => {
                            const query = clientSearchQuery.toLowerCase().trim();
                            const matches = clients.filter(c => {
                              if (!query) return true; // Show all option if empty query
                              return (
                               c.name.toLowerCase().includes(query) ||
                                (c.nameAr && c.nameAr.toLowerCase().includes(query)) ||
                                (c.company && c.company.toLowerCase().includes(query)) ||
                                (c.phone && c.phone.includes(query)) ||
                                (c.email && c.email.toLowerCase().includes(query))
                              );
                            });

                            if (matches.length === 0) {
                              return (
                                <div className="p-3 text-slate-400 text-[11px] italic text-center">
                                  {isRtl ? 'لا توجد نتائج مطابقة' : 'No matching clients found'}
                                </div>
                              );
                            }

                            return matches.map(c => {
                              const isSelected = clientId === c.id;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    setClientId(c.id);
                                    setClientSearchQuery(`${c.name}${c.nameAr ? ` (${c.nameAr})` : ''}`);
                                    if (c.phone) {
                                      setClientPhone(c.phone);
                                    }
                                    setShowClientSuggestions(false);
                                  }}
                                  className={`p-2.5 text-[11px] font-semibold text-left cursor-pointer transition-colors flex items-center justify-between ${
                                    isSelected 
                                      ? 'bg-indigo-50 text-indigo-900 font-bold hover:bg-indigo-100' 
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div>
                                    <p className="text-slate-800 font-bold">{c.name} {c.nameAr ? `(${c.nameAr})` : ''}</p>
                                    <p className="text-[9px] text-slate-450 text-slate-500 font-medium mt-0.5">
                                      {c.company ? `${c.company} • ` : ''}{c.phone || 'No phone'}
                                    </p>
                                  </div>
                                  {isSelected && <span className="text-indigo-650 text-[11px] font-extrabold text-indigo-600">✓</span>}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {/* Click outside listener - light dismissal overlay */}
                      {showClientSuggestions && (
                        <div 
                          className="fixed inset-0 z-40 cursor-default bg-transparent" 
                          onClick={() => setShowClientSuggestions(false)} 
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{isRtl ? 'هاتف التواصل السريع' : 'Phone / Call ID'}</label>
                      <input 
                        type="text" 
                        value={clientPhone} 
                        onChange={e => setClientPhone(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-850"
                        placeholder={isRtl ? "أدخل رقم الهاتف أو معرف الاتصال" : "e.g.+2010..."}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-lg border border-indigo-150 space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      {isRtl ? '✨ استمارة تسجيل العميل الجديد' : '✨ New Client Account Form'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'اسم العميل بالإنجليزية' : 'Client Name (EN) *'}</label>
                        <input 
                          type="text"
                          value={newClientName}
                          onChange={e => setNewClientName(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. Al-Futtaim Egypt"
                          required={isRegisteringNewClient}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'اسم العميل بالعربية' : 'Client Name (AR)'}</label>
                        <input 
                          type="text"
                          value={newClientNameAr}
                          onChange={e => setNewClientNameAr(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="مثال: الفطيم مصر"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'الهاتف' : 'Phone Number *'}</label>
                        <input 
                          type="text"
                          value={newClientPhone}
                          onChange={e => setNewClientPhone(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. +2010..."
                          required={isRegisteringNewClient}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
                        <input 
                          type="email"
                          value={newClientEmail}
                          onChange={e => setNewClientEmail(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. client@example.com"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'نوع العميل' : 'Client Type'}</label>
                        <select
                          value={newClientType}
                          onChange={e => setNewClientType(e.target.value as any)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-855 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                        >
                          <option value="individual">{isRtl ? 'فرد (Individual)' : 'Individual'}</option>
                          <option value="company">{isRtl ? 'شركة (Company)' : 'Company'}</option>
                          <option value="agency">{isRtl ? 'مكتب / وكالة (Agency)' : 'Agency'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'ملاحظات عن العميل' : 'Client Notes (Optional)'}</label>
                        <input 
                          type="text"
                          value={newClientNotes}
                          onChange={e => setNewClientNotes(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Subject Legal Document Title</label>
                <input 
                  type="text" 
                  value={fileName} 
                  onChange={e => setFileName(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="E.g. Safety_Regulations_Charter_2026.pdf"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Service Specialization Class</label>
                <select 
                  value={service} 
                  onChange={e => setService(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="translation">Translation (ترجمة)</option>
                  <option value="certified_translation">certified (معتمدة)</option>
                  <option value="proofreading">Linguistic proofreading</option>
                  <option value="interpretation">Interpretation (ترجمة فورية)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Source Language</label>
                  <input type="text" value={srcLang} onChange={e => setSrcLang(e.target.value)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Language</label>
                  <input type="text" value={tgtLang} onChange={e => setTgtLang(e.target.value)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl" required />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Precise Word Count</label>
                <input 
                  type="number" 
                  value={words || ''} 
                  onChange={e => handleWordUpdate(parseInt(e.target.value) || 0)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-505 uppercase">Summed Page Count</label>
                <input 
                  type="number" 
                  value={pages || ''} 
                  onChange={e => setPages(parseInt(e.target.value) || 0)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                  placeholder="Pages"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Price EGP</label>
                  <input type="number" value={egp || ''} onChange={e => setEgp(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-mono font-bold text-zinc-900" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Price AED (Optional)</label>
                  <input type="number" value={aed || ''} onChange={e => setAed(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-mono font-semibold text-zinc-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Price USD (Optional)</label>
                  <input type="number" value={usd || ''} onChange={e => setUsd(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-mono font-semibold text-zinc-900" />
                </div>
              </div>

              {/* Financial Deposit Allocation & Accounting Section */}
              {(() => {
                const currentActiveCurrency = usd > 0 ? 'USD' : (aed > 0 ? 'AED' : 'EGP');
                const currentActivePrice = currentActiveCurrency === 'USD' ? usd : (currentActiveCurrency === 'AED' ? aed : egp);
                return (
                  <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <span>💵 {isRtl ? 'الحسابات والمدفوعات النقدية (الإيداع الأولي)' : 'Deposit Allocation & Initial Accounting'}</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block uppercase">
                          {isRtl ? `المبلغ المدفوع بقيمة (${currentActiveCurrency})` : `Initial Deposit (${currentActiveCurrency})`}
                        </label>
                        <input 
                          type="number" 
                          value={initialPaidAmountEgp || ''} 
                          onChange={e => setInitialPaidAmountEgp(Math.max(0, parseInt(e.target.value) || 0))} 
                          className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-indigo-700 text-xs focus:ring-1 focus:ring-indigo-600 focus:outline-none" 
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block uppercase">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <select 
                          value={initialPaymentMethod} 
                          onChange={e => setInitialPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full mt-1.5 p-2 bg-white border border-slate-205 rounded-lg text-xs font-semibold text-slate-850 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                        >
                          <option value="cash">{isRtl ? 'كاش (نقدي)' : 'Cash'}</option>
                          <option value="instapay">InstaPay</option>
                          <option value="vodafone_cash">Vodafone Cash</option>
                          <option value="bank_saib">{isRtl ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-center items-center bg-white border border-slate-150 rounded-lg p-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">{isRtl ? 'المبلغ المتبقي المطلوب' : 'Outstanding Balance'}</span>
                        <span className="text-xs font-black font-mono text-rose-600 mt-1">
                          {currentActiveCurrency} {(currentActivePrice - initialPaidAmountEgp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Intake date</label>
                  <input type="date" value={intakeDate} onChange={e => setIntakeDate(e.target.value)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Intake Lead Gateway</label>
                  <select value={channel} onChange={e => setChannel(e.target.value as any)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900" >
                    <option value="whatsapp">WhatsApp chat</option>
                    <option value="email">Corporate email</option>
                    <option value="walk_in">Walk-in client</option>
                    <option value="phone">Outbound call</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Priority Rating</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-semibold" >
                    <option value="low">Low {isRtl ? '(منخفضة)' : ''}</option>
                    <option value="medium">Medium {isRtl ? '(متوسطة)' : ''}</option>
                    <option value="high">High {isRtl ? '(عالية)' : ''}</option>
                    <option value="urgent">Urgent {isRtl ? '(عاجل جداً)' : ''}</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Target Delivery Deadline</label>
                <input 
                  type="datetime-local" 
                  value={deadline} 
                  onChange={e => setDeadline(e.target.value)} 
                  className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono font-bold" 
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 py-2.5 bg-zinc-50 rounded-lg px-3 border border-zinc-200/80">
                <input 
                  type="checkbox" 
                  id="taxCheck" 
                  checked={tax} 
                  onChange={e => setTax(e.target.checked)} 
                  className="w-4 h-4 text-zinc-950 accent-zinc-950 focus:ring-zinc-950"
                />
                <label htmlFor="taxCheck" className="text-[10px] font-semibold text-zinc-650 block uppercase cursor-pointer">Tax invoice required ✓</label>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Document Filing Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900" placeholder="Remarks regarding formatting guidelines..." />
              </div>

              <div className="sm:col-span-2 space-y-2 border-t border-zinc-100 pt-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">
                  {isRtl ? 'ملفات ومستندات المشروع' : 'Project Documents / Reference Materials'}
                </label>
                
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/10' 
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
                  }`}
                >
                  <input 
                    type="file" 
                    id="file-attachment-input" 
                    multiple 
                    onChange={handleChangeFile} 
                    className="hidden" 
                  />
                  <label 
                    htmlFor="file-attachment-input" 
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1"
                  >
                    <FileUp size={20} className="text-zinc-400" />
                    <span className="text-[11px] font-semibold text-zinc-700">
                      {isRtl 
                        ? 'اسحب الملفات هنا أو انقر للتصفح' 
                        : 'Drag & drop task reference materials here, or click to browse'}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {isRtl ? 'يدعم مستندات وورد، بي دي إف والملفات القانونية' : 'Supports Docx, PDF, Images (Max 400KB for offline storage, auto-links large documents)'}
                    </span>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pt-1">
                    {attachments.map(att => (
                      <div 
                        key={att.id} 
                        className="flex items-center justify-between p-2 bg-zinc-50 border border-zinc-150 rounded-lg text-[10px]"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[85%] font-sans">
                          <Paperclip size={11} className="text-zinc-400 shrink-0" />
                          <div className="truncate font-medium text-zinc-800">
                            <span className="font-semibold block truncate text-zinc-900">{att.name}</span>
                            <span className="text-[8px] text-zinc-400 font-mono">{(att.size / 1024).toFixed(1)} KB • {att.type || 'Document'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
                          title={isRtl ? 'إزالة الملف' : 'Remove document'}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); onCloseQuickIntake(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  Confirm Legal intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGNMENT MODAL POPUP DIALOG */}
      {selectedTaskForAssign && (
        <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 p-4 animate-fade-in text-zinc-700 font-sans backdrop-blur-xs">
          <div className="bg-white p-6 rounded-xl w-full max-w-md border border-zinc-200 shadow-none">
            {assignedSuccessData ? (
              // NOTIFICATION & DISPATCH SUCCESS SCREEN
              <div className="space-y-4 relative">
                {/* Close Button Header */}
                <div className="absolute -top-3 -right-3 z-20">
                  <button
                    onClick={() => {
                      setAssignedSuccessData(null);
                      setSelectedTaskForAssign(null);
                      setEmailStatus(null);
                      setWhatsappStatus(null);
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-zinc-200 rounded-full text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 shadow-lg transition-all active:scale-90 cursor-pointer"
                    title={isRtl ? 'إغلاق' : 'Close'}
                  >
                    <X className="w-6 h-6 stroke-[2.5px]" />
                  </button>
                </div>

                <div className="text-center py-2">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-bold text-zinc-900 text-sm">
                    {isRtl ? 'تم تخصيص المجلد بنجاح!' : 'Allocation Finalized!'}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {isRtl 
                      ? `تم تعيين الملف للمترجم: ${assignedSuccessData.translator.fullName}`
                      : `Inward folder assigned to ${assignedSuccessData.translator.fullName} successfully.`}
                  </p>
                </div>

                <div className="bg-zinc-50 border border-zinc-200/60 rounded-lg p-3 text-[11px] space-y-1.5 text-zinc-650">
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'رقم المجلد:' : 'Folder Ref:'}</span>
                    <strong className="text-zinc-900 font-mono font-bold">{assignedSuccessData.task.referenceNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'اسم المستند:' : 'Document:'}</span>
                    <strong className="text-zinc-950 font-semibold truncate max-w-[200px]" title={assignedSuccessData.task.fileName}>
                      {assignedSuccessData.task.fileName}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'مجموع الكلمات:' : 'Word Count:'}</span>
                    <strong className="text-zinc-900 font-mono font-bold">{assignedSuccessData.task.wordCount.toLocaleString()} words</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'موعد التسليم المرصود:' : 'Task Deadline:'}</span>
                    <strong className="text-zinc-900 font-semibold">
                      {assignedSuccessData.task.deadline
                        ? new Date(assignedSuccessData.task.deadline).toLocaleString(isRtl ? 'ar-EG' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : (isRtl ? 'بدون موعد محدد' : 'No Deadline Assigned')}
                    </strong>
                  </div>
                </div>

                {/* Secure Gateways notification triggers */}
                <div className="space-y-4">
                  {/* Translator Notifications */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                      {isRtl ? '📬 إرسال إشعار للمترجم' : '📬 Dispatch Translator Notifications'}
                    </div>
                    {(() => {
                      const notify = getNotificationData(false);
                      if (!notify) return null;
                      return (
                        <div className="space-y-2">
                          {/* WhatsApp dispatch option */}
                          <div className="border border-zinc-200/60 p-2 rounded-lg flex flex-col gap-1.5 bg-emerald-50/20">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-emerald-700 font-bold">💬 WhatsApp: {assignedSuccessData.translator.fullName}</span>
                              <span className="text-zinc-400">{notify.phone}</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => sendAutomatedWhatsApp(notify.phone, notify.message)}
                                disabled={whatsappLoading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white font-bold py-1.5 px-2 rounded text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                {whatsappLoading ? (
                                  <span className="animate-pulse">...</span>
                                ) : (
                                  <span>{isRtl ? 'إرسال تلقائي' : 'Auto Send'}</span>
                                )}
                              </button>
                              <a
                                href={notify.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold py-1.5 px-2 rounded text-center text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span>{isRtl ? 'يدوي' : 'Manual'}</span>
                              </a>
                            </div>
                          </div>

                          {/* Email Dispatch Option */}
                          <div className="border border-zinc-200/60 p-2 rounded-lg flex flex-col gap-1.5 bg-blue-50/20">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-blue-700 font-bold">✉ Email: {assignedSuccessData.translator.fullName}</span>
                              <span className="text-zinc-400 truncate max-w-[150px]">{notify.email}</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => sendAutomatedEmail(notify.email, notify.subject, notify.message)}
                                disabled={emailLoading}
                                className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-bold py-1.5 px-2 rounded text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                {emailLoading ? (
                                  <span className="animate-pulse">...</span>
                                ) : (
                                  <span>{isRtl ? 'إرسال تلقائي' : 'Auto Send'}</span>
                                )}
                              </button>
                              <a
                                href={notify.mailtoUrl}
                                className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold py-1.5 px-2 rounded text-center text-[10px] transition-colors cursor-pointer"
                              >
                                <span>{isRtl ? 'يدوي' : 'Manual'}</span>
                              </a>
                            </div>
                          </div>

                          {/* Payload preview */}
                          <div className="text-[8px] text-zinc-400 border border-dashed border-zinc-200 p-2 rounded bg-zinc-50/50">
                            <strong className="block mb-0.5 font-semibold text-zinc-500">{isRtl ? 'نص إشعار المترجم مسبق الصنع:' : 'Translator payload preview:'}</strong>
                            <p className="whitespace-pre-line text-zinc-500 font-mono leading-normal">{notify.message}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Reviewer Notifications if selected */}
                  {assignedSuccessData.reviewer && (
                    <div className="space-y-2.5 pt-2 border-t border-zinc-150">
                      <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                        {isRtl ? '🔍 إرسال إشعار للمراجع' : '🔍 Dispatch Reviewer Notifications'}
                      </div>
                      {(() => {
                        const notify = getNotificationData(true);
                        if (!notify) return null;
                        return (
                          <div className="space-y-2">
                            {/* WhatsApp dispatch option */}
                            <div className="border border-zinc-200/60 p-2 rounded-lg flex flex-col gap-1.5 bg-emerald-50/10">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-emerald-700 font-bold">💬 WhatsApp: {assignedSuccessData.reviewer!.fullName}</span>
                                <span className="text-zinc-400">{notify.phone}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => sendAutomatedWhatsApp(notify.phone, notify.message)}
                                  disabled={whatsappLoading}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white font-bold py-1.5 px-2 rounded text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  {whatsappLoading ? (
                                    <span className="animate-pulse">...</span>
                                  ) : (
                                    <span>{isRtl ? 'إرسال تلقائي' : 'Auto Send'}</span>
                                  )}
                                </button>
                                <a
                                  href={notify.whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold py-1.5 px-2 rounded text-center text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <span>{isRtl ? 'يدوي' : 'Manual'}</span>
                                </a>
                              </div>
                            </div>

                            {/* Email Dispatch Option */}
                            <div className="border border-zinc-200/60 p-2 rounded-lg flex flex-col gap-1.5 bg-blue-50/10">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-blue-700 font-bold">✉ Email: {assignedSuccessData.reviewer!.fullName}</span>
                                <span className="text-zinc-400 truncate max-w-[150px]">{notify.email}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => sendAutomatedEmail(notify.email, notify.subject, notify.message)}
                                  disabled={emailLoading}
                                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-bold py-1.5 px-2 rounded text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  {emailLoading ? (
                                    <span className="animate-pulse">...</span>
                                  ) : (
                                    <span>{isRtl ? 'إرسال تلقائي' : 'Auto Send'}</span>
                                  )}
                                </button>
                                <a
                                  href={notify.mailtoUrl}
                                  className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold py-1.5 px-2 rounded text-center text-[10px] transition-colors cursor-pointer"
                                >
                                  <span>{isRtl ? 'يدوي' : 'Manual'}</span>
                                </a>
                              </div>
                            </div>

                            {/* Payload preview */}
                            <div className="text-[8px] text-zinc-400 border border-dashed border-zinc-200 p-2 rounded bg-zinc-50/50">
                              <strong className="block mb-0.5 font-semibold text-zinc-500">{isRtl ? 'نص إشعار المراجع مسبق الصنع:' : 'Reviewer payload preview:'}</strong>
                              <p className="whitespace-pre-line text-zinc-500 font-mono leading-normal">{notify.message}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Status and instruction */}
                  {emailStatus && (
                    <div className={`text-[9px] font-bold px-2 py-1 rounded ${emailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {emailStatus.msg}
                      {emailStatus.type === 'error' && (
                        <p className="font-normal mt-0.5 opacity-80">
                          {isRtl ? 'تأكد من إعداد بيانات SMTP في الإعدادات.' : 'Ensure SMTP_HOST/PASS are set in app settings.'}
                        </p>
                      )}
                    </div>
                  )}

                  {whatsappStatus && (
                    <div className={`text-[9px] font-bold px-2 py-1 rounded ${whatsappStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {whatsappStatus.msg}
                      {whatsappStatus.type === 'error' && (
                        <p className="font-normal mt-0.5 opacity-80">
                          {isRtl ? 'تأكد من تهيئة WHATSAPP_ACCESS_TOKEN في الخادم.' : 'Ensure WHATSAPP_ACCESS_TOKEN is configured in server env.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-150 pt-3.5 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setAssignedSuccessData(null);
                      setSelectedTaskForAssign(null);
                      setEmailStatus(null);
                    }}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-2.5 px-4 rounded-lg text-center text-xs transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {isRtl ? 'تم، إغلاق هذه النافذة' : 'Complete Allocation & Close'}
                  </button>
                  <p className="text-[9px] text-center text-zinc-400">
                    {isRtl ? 'سيتم تحويل الملف إلى مرحلة التنفيذ والمتابعة.' : 'Folder moved to production pipeline for follow-up.'}
                  </p>
                </div>
              </div>
            ) : (
              // STANDARD FORM VIEW
              <>
                <h4 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2.5 flex items-center gap-1.5">
                  <UserPlus size={16} className="text-zinc-900" />
                  {isRtl ? 'تفاصيل المهمة وتعيين اللغوي' : 'Task Details & Allocation'}
                </h4>
                <div className="bg-zinc-50 border border-zinc-200/60 rounded-lg p-3 text-[11px] space-y-1.5 text-zinc-650 mt-2.5 no-print-area">
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'رقم المهمة:' : 'Task Number:'}</span>
                    <strong className="text-zinc-900 font-mono font-bold">{selectedTaskForAssign.referenceNo}</strong>
                  </div>
                  {(() => {
                    const qId = selectedTaskForAssign.quotationId || selectedTaskForAssign.quotation_id;
                    const q = quotations.find(item => item.id === qId || item.convertedToJobId === selectedTaskForAssign.id || item.linkedTaskId === selectedTaskForAssign.id || item.linked_task_id === selectedTaskForAssign.id);
                    if (q) {
                      return (
                        <div className="flex justify-between items-center border-t border-zinc-150 pt-1.5 mt-1.5">
                          <div>
                            <span className="font-medium text-zinc-400 block">{isRtl ? 'عرض السعر المربوط:' : 'Linked Quotation:'}</span>
                            <strong className="text-indigo-800 font-mono font-bold">{q.quoteNumber}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskForAssign(null);
                              window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'sales_billing', quoteId: q.id } }));
                            }}
                            className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded text-[9px] cursor-pointer transition-colors"
                          >
                            {isRtl ? 'فتح عرض السعر' : 'Open Linked Quote'}
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal mt-2.5">
                  Select accredited translation specialist. This assigns their word balance queues, and increments translation task costing.
                </p>

                <form onSubmit={handleConfirmAssignment} className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Accredited Translation Linguist</label>
                    <select
                      value={targetTranslatorId}
                      onChange={e => {
                        const val = e.target.value;
                        setTargetTranslatorId(val);
                        if (val) {
                          const trans = translators.find(t => t.id === val);
                          if (trans) {
                            setRateWords(trans.perWordRate || 0.20);
                            setRatePage(trans.perPageRate || 25.0);
                          }
                        }
                      }}
                      className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg cursor-pointer focus:outline-none text-zinc-900"
                      required
                    >
                      <option value="">-- Choose specialist --</option>
                      {translators.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName} ({t.fullNameAr})</option>
                      ))}
                    </select>

                    {targetTranslatorId && (() => {
                      const metrics = getTranslatorMetrics(targetTranslatorId);
                      let barColor = 'bg-emerald-500';
                      let loadMessageEn = 'Specialist is available with healthy capacity.';
                      let loadMessageAr = 'المترجم متاح ولديه قدرة استيعابية ممتازة.';
                      
                      if (metrics.percentage >= 85) {
                        barColor = 'bg-rose-500';
                        loadMessageEn = '⚠️ Warning: Overloaded. High bottleneck risk!';
                        loadMessageAr = '⚠️ تنبيه: تخطى الحد الأقصى للاستيعاب! خطر التأخير مرتفع.';
                      } else if (metrics.percentage >= 40) {
                        barColor = 'bg-amber-500';
                        loadMessageEn = 'Moderate workload assigned.';
                        loadMessageAr = 'ضغط العمل معتدل ونشط.';
                      }

                      return (
                        <div className="mt-2.5 p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5 animate-fade-in text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-zinc-500">{isRtl ? 'القدرة الحالية للهدف:' : 'Current Utilized Capacity:'}</span>
                            <strong className={`font-mono font-bold ${metrics.percentage >= 85 ? 'text-rose-600' : metrics.percentage >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {metrics.activeWords.toLocaleString()} / {metrics.limit.toLocaleString()} words ({metrics.percentage}%)
                            </strong>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                              style={{ width: `${metrics.percentage}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center gap-1">
                            <span className={`font-medium ${metrics.percentage >= 85 ? 'text-rose-600 font-bold' : 'text-zinc-550'}`}>
                              {isRtl ? loadMessageAr : loadMessageEn}
                            </span>
                            <span className="text-[9px] text-zinc-400 shrink-0">
                              💼 {metrics.activeTasksCount} {isRtl ? 'ملفات نشطة' : 'active folders'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Assignment Class</label>
                      <select
                        value={assignType}
                        onChange={e => setAssignType(e.target.value as any)}
                        disabled={!!targetReviewerId}
                        className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg cursor-pointer focus:outline-none text-zinc-900 disabled:opacity-60"
                      >
                        <option value="translation">Translation Lead (ترجمة)</option>
                        <option value="revision">Linguistic QA Revision (مراجعة)</option>
                        <option value="proofreading">Accredited signoff Proofreading (تدقيق)</option>
                      </select>
                      {targetReviewerId && (
                        <p className="text-[9px] text-indigo-600 mt-1 font-semibold">
                          {isRtl ? 'ثنائي: تم قفل المترجم لـ "ترجمة"' : 'Locked to "translation" due to dual assignment.'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Accredited QA Reviewer (Optional)</label>
                      <select
                        value={targetReviewerId}
                        onChange={e => {
                          const val = e.target.value;
                          setTargetReviewerId(val);
                          if (val) {
                            const rev = translators.find(t => t.id === val);
                            if (rev) {
                              setReviewerRateWords(rev.perWordRate || 0.08);
                              setReviewerRatePage(rev.perPageRate || 10.0);
                            }
                          }
                        }}
                        className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg cursor-pointer focus:outline-none text-zinc-900"
                      >
                        <option value="">-- No Reviewer (None) / بدون مراجع --</option>
                        {translators.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.fullName} ({t.fullNameAr}){t.id === targetTranslatorId ? ` [${isRtl ? 'نفس الشخص' : 'Same Person'}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {targetReviewerId && (() => {
                    const metrics = getTranslatorMetrics(targetReviewerId);
                    let barColor = 'bg-emerald-500';
                    let loadMessageEn = 'Reviewer is available with healthy capacity.';
                    let loadMessageAr = 'المراجع متاح ولديه قدرة استيعابية ممتازة.';
                    
                    if (metrics.percentage >= 85) {
                      barColor = 'bg-rose-500';
                      loadMessageEn = '⚠️ Warning: Overloaded!';
                      loadMessageAr = '⚠️ تنبيه: تخطى الحد الأقصى للمراجع!';
                    } else if (metrics.percentage >= 40) {
                      barColor = 'bg-amber-500';
                      loadMessageEn = 'Moderate workload.';
                      loadMessageAr = 'ضغط عمل معتدل.';
                    }

                    return (
                      <div className="p-2.5 bg-amber-50/20 border border-amber-200 rounded-lg space-y-1.5 animate-fade-in text-[10px]">
                        <div className="flex justify-between items-center text-zinc-650">
                          <span className="font-semibold text-zinc-500">{isRtl ? 'القدرة الحالية للمراجع والمدقق:' : 'Reviewer Current Capacity:'}</span>
                          <strong className={`font-mono font-bold ${metrics.percentage >= 85 ? 'text-rose-600' : metrics.percentage >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {metrics.activeWords.toLocaleString()} / {metrics.limit.toLocaleString()} words ({metrics.percentage}%)
                          </strong>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                            style={{ width: `${metrics.percentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-600 font-medium">
                            {isRtl ? loadMessageAr : loadMessageEn}
                          </span>
                          <span className="text-[9px] text-zinc-400">
                            💼 {metrics.activeTasksCount} {isRtl ? 'ملفات نشطة' : 'active folders'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Translator Billing Controls */}
                  <div className="space-y-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Translator Billing Method</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRateType('word')}
                        className={`py-1 px-2.5 text-[10px] font-semibold border rounded-lg transition-colors cursor-pointer text-center ${
                          rateType === 'word' ? 'bg-zinc-950 border-zinc-950 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Per Word
                      </button>
                      <button
                        type="button"
                        onClick={() => setRateType('page')}
                        className={`py-1 px-2.5 text-[10px] font-semibold border rounded-lg transition-colors cursor-pointer text-center ${
                          rateType === 'page' ? 'bg-zinc-950 border-zinc-950 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Per Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setRateType('fixed')}
                        className={`py-1 px-2.5 text-[10px] font-semibold border rounded-lg transition-colors cursor-pointer text-center ${
                          rateType === 'fixed' ? 'bg-zinc-950 border-zinc-950 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Fixed Fee
                      </button>
                    </div>

                    <div className="pt-1.5">
                      {rateType === 'word' && (
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Unit Word Rate (EGP/Word)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={rateWords || ''} 
                            onChange={e => setRateWords(parseFloat(e.target.value) || 0)}
                            className="w-full mt-1 p-1.5 bg-white border border-zinc-200 rounded-md font-mono text-center font-bold text-zinc-900 focus:outline-none" 
                          />
                        </div>
                      )}
                      {rateType === 'page' && (
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Unit Page Rate (EGP/Page)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={ratePage || ''} 
                            onChange={e => setRatePage(parseFloat(e.target.value) || 0)}
                            className="w-full mt-1 p-1.5 bg-white border border-zinc-200 rounded-md font-mono text-center font-bold text-zinc-900 focus:outline-none" 
                          />
                        </div>
                      )}
                      {rateType === 'fixed' && (
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Total Fixed Assignment Fee (EGP)</label>
                          <input 
                            type="number" 
                            value={rateFixed || ''} 
                            onChange={e => setRateFixed(parseInt(e.target.value) || 0)}
                            className="w-full mt-1 p-1.5 bg-white border border-zinc-200 rounded-md font-mono text-center font-bold text-zinc-900 focus:outline-none" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reviewer Billing Controls (Rendered if Reviewer is Selected) */}
                  {targetReviewerId && (
                    <div className="space-y-2 p-3 bg-indigo-50/50 border border-indigo-150 rounded-lg">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Reviewer Billing Method</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewerRateType('word')}
                          className={`py-1 px-1.5 text-[9px] font-semibold border rounded-lg transition-colors cursor-pointer text-center ${
                            reviewerRateType === 'word' ? 'bg-indigo-950 border-indigo-950 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          Per Word
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewerRateType('page')}
                          className={`py-1 px-1.5 text-[9px] font-semibold border rounded-lg transition-colors cursor-pointer text-center ${
                            reviewerRateType === 'page' ? 'bg-indigo-950 border-indigo-950 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          Per Page
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewerRateType('fixed')}
                          className={`py-1 px-1.5 text-[9px] font-semibold border rounded-lg transition-colors cursor-pointer text-center ${
                            reviewerRateType === 'fixed' ? 'bg-indigo-950 border-indigo-950 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          Fixed Fee
                        </button>
                      </div>

                      <div className="pt-1.5">
                        {reviewerRateType === 'word' && (
                          <div>
                            <label className="text-[9px] font-bold text-indigo-500 uppercase">Reviewer Word Rate (EGP/Word)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={reviewerRateWords || ''} 
                              onChange={e => setReviewerRateWords(parseFloat(e.target.value) || 0)}
                              className="w-full mt-1 p-1.5 bg-white border border-indigo-200 rounded-md font-mono text-center font-bold text-zinc-900 focus:outline-none focus:border-indigo-400" 
                            />
                          </div>
                        )}
                        {reviewerRateType === 'page' && (
                          <div>
                            <label className="text-[9px] font-bold text-indigo-500 uppercase">Reviewer Page Rate (EGP/Page)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={reviewerRatePage || ''} 
                              onChange={e => setReviewerRatePage(parseFloat(e.target.value) || 0)}
                              className="w-full mt-1 p-1.5 bg-white border border-indigo-200 rounded-md font-mono text-center font-bold text-zinc-900 focus:outline-none focus:border-indigo-400" 
                            />
                          </div>
                        )}
                        {reviewerRateType === 'fixed' && (
                          <div>
                            <label className="text-[9px] font-bold text-indigo-500 uppercase">Reviewer Fixed Fee (EGP)</label>
                            <input 
                              type="number" 
                              value={reviewerRateFixed || ''} 
                              onChange={e => setReviewerRateFixed(parseInt(e.target.value) || 0)}
                              className="w-full mt-1 p-1.5 bg-white border border-indigo-200 rounded-md font-mono text-center font-bold text-zinc-900 focus:outline-none focus:border-indigo-400" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTaskForAssign.attachments && selectedTaskForAssign.attachments.length > 0 && (
                    <div className="space-y-1.5 p-2.5 rounded-lg border border-zinc-150 bg-zinc-50/50 text-[10px]">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">
                        {isRtl ? 'وثائق ومستندات المشروع المرفقة:' : 'Associated Project Documents:'}
                      </span>
                      <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                        {selectedTaskForAssign.attachments.map(att => (
                          <a
                            key={att.id}
                            href={att.url}
                            download={att.name}
                            className="flex items-center gap-1.5 p-1 hover:bg-zinc-100 rounded text-zinc-700 hover:text-zinc-950 transition-colors font-sans truncate cursor-pointer"
                            title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                          >
                            <Paperclip size={10} className="text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[220px] font-medium block">{att.name}</span>
                            <span className="text-[8px] text-zinc-400 font-mono ml-auto">({(att.size / 1024).toFixed(0)} KB)</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskForAssign(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200/60 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
                    >
                      Finalize allocation
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* VERIFY AND APPROVE MODAL DIALOG */}
      {selectedAsgForVerify && (
        <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 p-4 animate-fade-in text-zinc-700 font-sans backdrop-blur-xs">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm border border-zinc-200 shadow-none">
            <h4 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2.5 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Verify & Approve Calculations
            </h4>
            
            <p className="text-[10px] text-zinc-400 leading-normal mt-2.5 font-sans">
              Verify the target wordcount completed by the translator and approve their calculated fees. All figures apply to translator costs only.
            </p>

            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200/60 rounded-lg text-[11px] space-y-1 text-zinc-500 font-sans">
              <div className="flex justify-between">
                <span>Task Reference:</span>
                <strong className="text-zinc-800 font-semibold">{selectedAsgForVerify.taskRef}</strong>
              </div>
              <div className="flex justify-between">
                <span>Subject Doc:</span>
                <strong className="text-zinc-800 font-semibold truncate max-w-[180px]" title={selectedAsgForVerify.taskFileName}>
                  {selectedAsgForVerify.taskFileName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Assigned Wordcount:</span>
                <strong className="text-zinc-800 font-semibold font-mono">{selectedAsgForVerify.wordCountAssigned?.toLocaleString()} words</strong>
              </div>
              
              {selectedAsgForVerify.translatedAttachments && selectedAsgForVerify.translatedAttachments.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-200 text-[11px]">
                  <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wide block mb-1">
                    📥 {isRtl ? 'ملفات الترجمة النهائية المستلمة:' : 'Final Submitted Translation Files:'}
                  </span>
                  <div className="flex flex-col gap-1 w-full text-left">
                    {selectedAsgForVerify.translatedAttachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.url}
                        download={att.name}
                        title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                        className="flex items-center justify-between p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded text-[10px] font-mono transition-all font-bold cursor-pointer"
                        onClick={() => {
                          alert(isRtl ? `بدء تنزيل مستند الترجمة: ${att.name}` : `Downloading translation file: ${att.name}`);
                        }}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                          <FileText size={10} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </div>
                        <span className="text-[8px] text-zinc-400 font-normal shrink-0">({(att.size / 1024).toFixed(0)} KB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmVerifyApproval} className="mt-4 space-y-4 text-xs font-sans">
              {selectedAsgForVerify.ratePerPage !== undefined ? (
                <>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Actual Completed Page Count</label>
                    <input 
                      type="number"
                      value={verifiedPages || 0}
                      onChange={e => setVerifiedPages(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Page Rate (EGP/Page)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={verifiedRatePage || 0}
                      onChange={e => setVerifiedRatePage(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                      required
                    />
                  </div>
                </>
              ) : selectedAsgForVerify.rateFixed !== undefined ? (
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Actual Fixed Fee (EGP)</label>
                  <input 
                    type="number"
                    value={verifiedRateFixed || 0}
                    onChange={e => setVerifiedRateFixed(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Actual Completed Word Count</label>
                    <input 
                      type="number"
                      value={verifiedWords || 0}
                      onChange={e => setVerifiedWords(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Unit Word Rate (EGP/Word)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={verifiedRateWords || 0}
                      onChange={e => setVerifiedRateWords(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                      required
                    />
                  </div>
                </>
              )}

              {/* Verified calculation readout */}
              <div className="p-3 bg-zinc-50 border border-dashed border-zinc-200 rounded-lg flex justify-between items-center font-sans">
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wide">Approved Fee Calculation:</span>
                <span className="font-mono text-sm font-black text-emerald-600">
                  EGP {(verifiedRateFixed > 0 ? verifiedRateFixed : (verifiedRatePage > 0 ? verifiedPages * verifiedRatePage : verifiedWords * verifiedRateWords)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedAsgForVerify(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Verify & Approve Cost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CERTIFIED COPY EXPORT STUDIO MODAL */}
      {isCertifiedModalOpen && certifiedTask && (() => {
        const sourceFile = certifiedTask.attachments?.find(att => !att.name.includes('[TR]'));
        const targetFile = certifiedTask.attachments?.find(att => att.name.includes('[TR]'));
        const areFilesReady = !!sourceFile && !!targetFile;

        const handleRunCertifiedExport = (approverName: string) => {
          try {
            const doc = new jsPDF({
              orientation: 'p',
              unit: 'mm',
              format: 'a4'
            });

            const lhObj = dbInstance.letterheads.find(lh => lh.id === selectedLetterheadId) || dbInstance.letterheads[0];
            const stampObj = dbInstance.stamps.find(st => st.id === selectedStampId) || dbInstance.stamps[0];

            // Draw Header Banner
            doc.setFillColor(30, 41, 59); // Slate-800
            doc.rect(0, 0, 210, 15, 'F');
            doc.setFillColor(245, 158, 11); // Amber accent
            doc.rect(0, 15, 210, 2, 'F');

            // Draw clean page border frame
            doc.setDrawColor(228, 228, 231); // zinc-200 border
            doc.setLineWidth(0.5);
            doc.rect(8, 24, 194, 252);

            // Title
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('OFFICIAL CERTIFIED TRANSLATION', 105, 36, { align: 'center' });
            
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(115, 115, 115);
            doc.text(dbInstance.brandConfig?.companyName || '', 105, 42, { align: 'center' });

            // Accent Divider Line
            doc.setDrawColor(245, 158, 11);
            doc.setLineWidth(1.2);
            doc.line(70, 46, 140, 46);

            // Metadata Card
            doc.setFillColor(250, 250, 250);
            doc.rect(12, 50, 186, 32, 'F');
            doc.setDrawColor(212, 212, 216);
            doc.setLineWidth(0.3);
            doc.rect(12, 50, 186, 32);

            doc.setTextColor(63, 63, 70);
            doc.setFontSize(9);
            
            doc.setFont('helvetica', 'bold');
            doc.text('FOLDER REFERENCE:', 16, 56);
            doc.setFont('helvetica', 'normal');
            doc.text(certifiedTask.referenceNo, 60, 56);

            doc.setFont('helvetica', 'bold');
            doc.text('CLIENT ACCOLADE:', 16, 62);
            doc.setFont('helvetica', 'normal');
            doc.text(certifiedTask.clientNameCache || 'N/A', 60, 62);

            doc.setFont('helvetica', 'bold');
            doc.text('LANGUAGE DIRECTION:', 16, 68);
            doc.setFont('helvetica', 'normal');
            doc.text(`${certifiedTask.sourceLanguage} to ${certifiedTask.targetLanguage}`, 60, 68);

            doc.setFont('helvetica', 'bold');
            doc.text('DATE OF ATTESTATION:', 16, 74);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date().toLocaleDateString(), 60, 74);

            // Top-right safe original sticker
            doc.setFillColor(30, 41, 59);
            doc.rect(142, 54, 50, 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('ATTESTED ORIGINAL', 167, 60, { align: 'center' });

            // Certification block Header
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('LEGAL NOTARIZATION & OATH STATEMENT', 15, 91);

            // Left side margin highlight bar
            doc.setDrawColor(245, 158, 11);
            doc.setLineWidth(1.5);
            doc.line(12, 95, 12, 160);

            // Text container
            doc.setLineWidth(0.2);
            doc.setDrawColor(228, 228, 231);
            doc.setFillColor(253, 253, 253);
            doc.rect(13, 95, 184, 65, 'F');

            // English segment
            doc.setTextColor(63, 63, 70);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            const splitEn = doc.splitTextToSize(customCertEn, 172);
            doc.text(splitEn, 18, 102);

            // Separator
            doc.setDrawColor(240, 240, 240);
            doc.setLineWidth(0.5);
            doc.line(18, 126, 192, 126);

            // Arabic segment
            doc.setFont('courier', 'bold'); // safe RTL display font
            const splitAr = doc.splitTextToSize(customCertAr, 172);
            doc.text(splitAr, 18, 133);

            // Document Attestation references
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(11);
            doc.text('OFFICIALLY ATTACHED FILE REGISTER', 15, 171);

            doc.setDrawColor(228, 228, 231);
            doc.setLineWidth(0.3);
            doc.rect(12, 176, 186, 28);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            doc.text('ROLE / TYPE', 15, 181);
            doc.text('REGISTERED FILENAME', 55, 181);
            doc.text('FILE SIZE', 135, 181);
            doc.text('VERIFICATION STATUS', 165, 181);

            doc.setDrawColor(228, 228, 231);
            doc.line(12, 184, 198, 184);

            doc.setFont('helvetica', 'normal');
            
            // Source row
            doc.text('Source Client Document', 15, 189);
            doc.text(sourceFile ? sourceFile.name : 'source_regulatory_data.docx', 55, 189);
            doc.text(sourceFile ? `${(sourceFile.size / 1024).toFixed(0)} KB` : '420 KB', 135, 189);
            doc.setTextColor(16, 185, 129);
            doc.text('VERIFIED MATCH', 165, 189);

            // Target row
            doc.setTextColor(63, 63, 70);
            doc.text('Certified Legal Translation', 15, 195);
            doc.text(targetFile ? targetFile.name : 'translated_attested_manifest.pdf', 55, 195);
            doc.text(targetFile ? `${(targetFile.size / 1024).toFixed(0)} KB` : '290 KB', 135, 195);
            doc.setTextColor(16, 185, 129);
            doc.text('CERTIFIED PASS', 165, 195);

            // Bottom signature line drawing
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('CHIEF LEGAL TRANSLATOR & NOTARY:', 15, 218);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text('Bureau Principal Translator Team', 15, 224);
            doc.setTextColor(115, 115, 115);
            doc.text(dbInstance.brandConfig?.companyName || '', 15, 228);
            doc.text(`Security approval signoff witness: ${approverName}`, 15, 232);

            doc.setDrawColor(30, 41, 59);
            doc.setLineWidth(0.4);
            doc.line(15, 238, 75, 238);

            // Render Stamp
            if (includeStamp && stampObj && stampObj.imageUrl) {
              try {
                doc.addImage(stampObj.imageUrl, 'JPEG', 135, 208, 45, 45);
              } catch (stampImgErr) {
                // Fallback elegant certified stamp box representation
                doc.setDrawColor(220, 38, 38);
                doc.setLineWidth(1.5);
                doc.circle(150, 228, 16);
                doc.setFontSize(7);
                doc.setTextColor(220, 38, 38);
                doc.text('OFFICIALLY', 150, 225, { align: 'center' });
                doc.text('CERTIFIED COPY', 150, 229, { align: 'center' });
                doc.text('GLOBAIZE BUREAU', 150, 233, { align: 'center' });
              }
            }

            // Legal disclaimer
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(163, 163, 163);
            doc.text('NOTICE: This legal attestation copy is electronically bound under secure key verification. Unauthorized edits void stamp and warranty.', 12, 268);
            doc.text('Authenticity tracked immutable inside corporate security logs.', 12, 272);

            // Dark Footer Frame
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 282, 210, 15, 'F');
            doc.setFillColor(245, 158, 11);
            doc.rect(0, 280, 210, 2, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text('GTMS Certified Production System • Page 1 of 1', 105, 290, { align: 'center' });

            const outFileName = `Certified_${certifiedTask.referenceNo}_Original.pdf`;
            doc.save(outFileName);

            // Add immutable database pdf log
            dbInstance.addPdfLog({
              userId: dbInstance.activeProfile.id,
              userName: dbInstance.activeProfile.fullName,
              clientName: certifiedTask.clientNameCache || 'Walk-in Client',
              referenceNo: certifiedTask.referenceNo,
              letterheadName: lhObj?.name || 'Standard',
              stampName: stampObj?.name || 'Standard Stamp',
              fileName: outFileName,
              status: 'success'
            });

            dbInstance.logSecurityEvent(
              'certified_copy_export',
              `Successfully generated and exported certified COPY PDF for folder [${certifiedTask.referenceNo}] to ${outFileName}.`,
              'success'
            );

            alert(isRtl ? '🎉 تم تصدير وتحميل النسخة المعتمدة بنجاح!' : '🎉 Certified translation copy PDF successfully generated and downloaded!');
            setIsCertifiedModalOpen(false);
            setCertifiedTask(null);
          } catch (pdfErr: any) {
            console.error(pdfErr);
            alert(`Could not compile certified PDF: ${pdfErr?.message || pdfErr}`);
          }
        };

        return (
          <div className="fixed inset-0 bg-zinc-950/70 flex items-center justify-center z-50 p-4 animate-fade-in text-zinc-700 font-sans backdrop-blur-xs">
            <div className="bg-white rounded-2xl w-full max-w-2xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-zinc-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wide text-amber-400">
                      GTMS Certified Copy Export Studio
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                      Compile & attest output document with company letterheads and notary stamps
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCertifiedModalOpen(false);
                    setCertifiedTask(null);
                  }}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                
                {/* File readiness verification badges */}
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-zinc-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <ListChecks size={14} className="text-zinc-500" />
                    Source and Target Documents Verification
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Source file */}
                    <div className="p-3 bg-white border border-zinc-150 rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase text-zinc-400">Source Client File</span>
                        <p className="font-bold text-zinc-800 truncate mt-1">
                          {sourceFile ? sourceFile.name : 'Missing'}
                        </p>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between">
                        {sourceFile ? (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 rounded-sm">
                            ✓ Found
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase text-rose-700 bg-rose-50 rounded-sm">
                            ⚠ Empty
                          </span>
                        )}

                        <input
                          type="file"
                          id="source-inline-upload"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const newAtt = {
                                  id: `att-${Date.now()}`,
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                  url: reader.result as string,
                                  uploadedAt: new Date().toISOString()
                                };
                                if (!certifiedTask.attachments) certifiedTask.attachments = [];
                                certifiedTask.attachments.push(newAtt);
                                dbInstance.updateTask(certifiedTask);
                                dbInstance.save();
                                setCertifiedTask({...certifiedTask});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label
                          htmlFor="source-inline-upload"
                          className="px-2.5 py-1 text-[9px] font-bold text-zinc-600 border border-zinc-200 rounded hover:bg-zinc-100 cursor-pointer text-center"
                        >
                          Upload Source
                        </label>
                      </div>
                    </div>

                    {/* Target file */}
                    <div className="p-3 bg-white border border-zinc-150 rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase text-zinc-400">Target Translated File</span>
                        <p className="font-bold text-zinc-800 truncate mt-1">
                          {targetFile ? targetFile.name : 'Missing'}
                        </p>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between">
                        {targetFile ? (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 rounded-sm">
                            ✓ Found
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase text-rose-700 bg-rose-50 rounded-sm">
                            ⚠ Empty
                          </span>
                        )}

                        <input
                          type="file"
                          id="target-inline-upload"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const newAtt = {
                                  id: `att-${Date.now()}`,
                                  name: `[TR] ${file.name}`,
                                  size: file.size,
                                  type: file.type,
                                  url: reader.result as string,
                                  uploadedAt: new Date().toISOString()
                                };
                                if (!certifiedTask.attachments) certifiedTask.attachments = [];
                                certifiedTask.attachments.push(newAtt);
                                dbInstance.updateTask(certifiedTask);
                                dbInstance.save();
                                setCertifiedTask({...certifiedTask});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label
                          htmlFor="target-inline-upload"
                          className="px-2.5 py-1 text-[9px] font-bold text-zinc-600 border border-zinc-200 rounded hover:bg-zinc-100 cursor-pointer text-center"
                        >
                          Upload Target
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Letterhead selection */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Select Letterhead Template <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedLetterheadId}
                      onChange={e => setSelectedLetterheadId(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg font-semibold"
                    >
                      {dbInstance.letterheads.map(lh => (
                        <option key={lh.id} value={lh.id}>
                          {lh.name} ({lh.placement})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stamp asset selection */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Choose Notary Seal Stamp Asset <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedStampId}
                      onChange={e => setSelectedStampId(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg font-semibold"
                    >
                      {dbInstance.stamps.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.type.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/65 font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeStamp}
                      onChange={e => setIncludeStamp(e.target.checked)}
                      className="rounded text-zinc-900 border-zinc-300 w-4 h-4 cursor-pointer focus:ring-0"
                    />
                    <span>Include Official Stamp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSignature}
                      onChange={e => setIncludeSignature(e.target.checked)}
                      className="rounded text-zinc-900 border-zinc-300 w-4 h-4 cursor-pointer focus:ring-0"
                    />
                    <span>Authorized Signature</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appendSourceCopy}
                      onChange={e => setAppendSourceCopy(e.target.checked)}
                      className="rounded text-zinc-900 border-zinc-300 w-4 h-4 cursor-pointer focus:ring-0"
                    />
                    <span>Append Source Copy</span>
                  </label>
                </div>

                {/* Attestation Translation Statments */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Attestation Statement (English version)
                    </label>
                    <textarea
                      rows={2.5}
                      value={customCertEn}
                      onChange={e => setCustomCertEn(e.target.value)}
                      className="w-full p-2 bg-zinc-50 border border-zinc-250 focus:ring-1 focus:ring-zinc-900 focus:outline-none rounded-lg text-zinc-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Attestation Statement (Arabic version)
                    </label>
                    <textarea
                      rows={2.5}
                      value={customCertAr}
                      onChange={e => setCustomCertAr(e.target.value)}
                      className="w-full p-2 bg-zinc-50 border border-zinc-250 focus:ring-1 focus:ring-zinc-900 focus:outline-none rounded-lg text-zinc-800 font-medium text-right"
                    />
                  </div>
                </div>

              </div>

              {/* Footer Panel */}
              <div className="bg-zinc-50 border-t border-zinc-150 p-4 flex gap-3 justify-end items-center">
                {!areFilesReady && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg mr-auto italic flex items-center gap-1">
                    ⚠ Source/Target documents must exist to export certified copy.
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setIsCertifiedModalOpen(false);
                    setCertifiedTask(null);
                  }}
                  className="px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg text-zinc-650 font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!areFilesReady}
                  onClick={() => setIsExportShieldOpen(true)}
                  className={`px-5 py-2 font-bold text-white rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow ${
                    areFilesReady ? 'bg-amber-500 hover:bg-zinc-900 text-slate-900 font-extrabold' : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Award size={14} />
                  Authorize & Download Certified PDF
                </button>
              </div>

              {/* Secure Export Protection gates */}
              <ExportProtectionModal
                isOpen={isExportShieldOpen}
                onClose={() => setIsExportShieldOpen(false)}
                dataType="certified_copy_export"
                dataLabelEn="Certified Notary Copy"
                dataLabelAr="نسخة قضائية مترجمة معتمدة"
                isRtl={isRtl}
                onExportApproved={(approverName) => {
                  handleRunCertifiedExport(approverName);
                }}
              />

            </div>
          </div>
        );
      })()}

      {/* DETAILED INTERACTIVE TASK ACCOUNTING & AUDITING LEDGER MODAL */}
      {selectedTaskForAccDetails && (() => {
        const task = selectedTaskForAccDetails;
        const accRecord = dbInstance.taskAccountingRecords.find(r => r.taskId === task.id);
        const payments = dbInstance.payments.filter(p => p.taskId === task.id);
        const audits = dbInstance.taskPaymentAuditLogs.filter(l => l.taskId === task.id);

        const currency = task.amountUsd > 0 ? 'USD' : (task.amountAed > 0 ? 'AED' : 'EGP');

        const remaining = accRecord 
          ? accRecord.remainingBalance 
          : (task.amountUsd > 0 ? task.amountUsd - task.paidAmountUsd : (task.amountAed > 0 ? task.amountAed - task.paidAmountAed : task.amountEgp - task.paidAmountEgp));

        // Let's resolve assigned linguist context inside modal too
        const asg = dbInstance.assignments.find(a => a.taskId === task.id);
        const assignedLinguist = asg ? dbInstance.profiles.find(p => p.id === asg.translatorId) : null;

        // Compile comprehensive chronological lifecycle events for Task Activity Log
        const timelineEvents: Array<{
          id: string;
          timestamp: string;
          type: string;
          titleEn: string;
          titleAr: string;
          icon: string;
          colorClass: string;
          details: string;
          operator: string;
        }> = [];

        // 1. Creation / Origin details
        const creatorProf = dbInstance.profiles.find(p => p.id === task.createdBy);
        const creatorName = creatorProf ? `${creatorProf.fullName} (${creatorProf.role})` : task.createdBy || 'System / Operator';
        timelineEvents.push({
          id: `origin-${task.id}`,
          timestamp: task.createdAt || new Date().toISOString(),
          type: 'creation',
          titleEn: 'Task Contract Registered',
          titleAr: 'تم تسجيل العقد والملف المرجعي',
          icon: '📁',
          colorClass: 'text-blue-600 bg-blue-50 border border-blue-200',
          details: `Service details: ${(task.serviceType || '').toUpperCase()}. Referral Intake: ${(task.intakeChannel || 'Walk-in').toUpperCase()}. File: "${task.fileName || 'General Certified Translation'}". Total amount agreed: ${currency} ${(task.amountEgp || task.amountUsd || task.amountAed || 0).toLocaleString()}.`,
          operator: creatorName
        });

        // 2. Freelance / Staff Assignments
        const taskAssignments = dbInstance.assignments.filter(a => a.taskId === task.id);
        taskAssignments.forEach(a => {
          const asgLinguist = dbInstance.profiles.find(prof => prof.id === a.translatorId);
          const asgLinguistName = asgLinguist ? `${asgLinguist.fullName} (${asgLinguist.role})` : `Linguist #${a.translatorId}`;
          const assignorProf = dbInstance.profiles.find(p => p.id === a.assignedBy);
          const assignorName = assignorProf ? `${assignorProf.fullName} (${assignorProf.role})` : a.assignedBy || 'System';

          timelineEvents.push({
            id: `asg-${a.id}`,
            timestamp: a.assignedAt || task.createdAt,
            type: 'assignment',
            titleEn: `Specialist Appointed (${a.assignmentType.toUpperCase()})`,
            titleAr: `تم إسناد وتكليف عمل لغوي (${a.assignmentType === 'translation' ? 'ترجمة معتمدة' : 'مراجعة'})`,
            icon: '👤',
            colorClass: 'text-purple-600 bg-purple-50 border border-purple-100',
            details: `Linguist assigned: "${asgLinguistName}". Status of unit deliverables: "${a.status.toUpperCase()}". Estimated accrued unit cost: EGP ${(a.calculatedAmount || 0).toLocaleString()}.`,
            operator: assignorName
          });

          if (a.submittedAt) {
            timelineEvents.push({
              id: `submit-${a.id}`,
              timestamp: a.submittedAt,
              type: 'submission',
              titleEn: 'Specialist Work Submitted',
              titleAr: 'تم تسليم المسودة المترجمة',
              icon: '📤',
              colorClass: 'text-amber-600 bg-amber-50 border border-amber-200',
              details: `Translator/Reviewer "${asgLinguistName}" completed and uploaded files for verification. Actual wordcount verified: ${a.wordCountActual || 0} words.`,
              operator: asgLinguistName
            });
          }
        });

        // 3. Payments Handled & Received
        payments.forEach(p => {
          const payeeProf = dbInstance.profiles.find(prof => prof.id === p.recordedBy);
          const payeeName = payeeProf ? `${payeeProf.fullName} (${payeeProf.role})` : p.recordedBy || 'System Cashier';

          timelineEvents.push({
            id: `pay-${p.id}`,
            timestamp: p.createdAt || p.date || task.createdAt,
            type: 'payment',
            titleEn: 'Installment Payment Received',
            titleAr: 'تم تحصيل دفعة وتحديث الرصيد',
            icon: '💵',
            colorClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
            details: `Received amount of ${p.currency || 'EGP'} ${(p.amount || 0).toLocaleString()} via gateway/method ${p.method.toUpperCase()}. Paid balance updated in ledger. Notes: ${p.notes || 'No description provided.'}`,
            operator: payeeName
          });
        });

        // 4. General Audit Log occurrences
        audits.forEach(aud => {
          if (aud.actionType === 'Create Task' || aud.actionType === 'Record Payment') {
            return; // prevent redundant events since we construct nicer ones
          }

          let icon = '⚙️';
          let color = 'text-zinc-650 bg-zinc-50 border border-zinc-200';
          let titleEn = aud.actionType;
          let titleAr = aud.actionType;

          if (aud.actionType === 'Update Status') {
            icon = '🔄';
            color = 'text-indigo-600 bg-indigo-50 border border-indigo-200';
            titleEn = 'Workflow Status Transition';
            titleAr = 'تطوير وتحديث حالة المعاملة';
          } else if (aud.actionType === 'Update Amount' || aud.actionType === 'Update Paid Amount') {
            icon = '📈';
            color = 'text-rose-600 bg-rose-50 border border-rose-150';
            titleEn = 'Contract Financial Adjustment';
            titleAr = 'تعديل مالي على المستحقات';
          } else if (aud.actionType === 'Delete Payment') {
            icon = '❌';
            color = 'text-red-700 bg-red-50 border border-red-200';
            titleEn = 'Recorded Payment Reversed';
            titleAr = 'عكس وإلغاء دفعة مسجلة';
          }

          timelineEvents.push({
            id: `audit-${aud.id}`,
            timestamp: aud.timestamp,
            type: 'audit',
            titleEn,
            titleAr,
            icon,
            colorClass: color,
            details: `Audit details: Changed from "${aud.oldValue}" to "${aud.newValue}".`,
            operator: aud.performedBy
          });
        });

        // 5. Verification / Delivery handovers
        if (task.status === 'delivered' || task.status === 'completed' || task.deliveryDate) {
          const delivererName = (task as any).deliveredBy || 'System Operator';
          timelineEvents.push({
            id: `delivery-${task.id}`,
            timestamp: task.deliveryDate || task.updatedAt || new Date().toISOString(),
            type: 'delivery',
            titleEn: 'Task Delivered to Client',
            titleAr: 'تم إتمام التسليم القانوني للعميل',
            icon: '✅',
            colorClass: 'text-emerald-800 bg-emerald-100 border border-emerald-300 font-extrabold',
            details: `Handover complete. Files and certified translations finalized and routed to client. Marked as Delivered.`,
            operator: delivererName
          });
        }

        // Sort descending: newest actions first
        timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const handleAddModalPayment = (e: React.FormEvent) => {
          e.preventDefault();
          const amt = parseFloat(accPaymentAmt);
          if (isNaN(amt) || amt <= 0) {
            warning(isRtl ? 'الرجاء إدخال مبلغ صحيح!' : 'Please enter a valid positive payment amount!');
            return;
          }

          if (amt > remaining + 0.01) {
            error(isRtl ? 'عذراً، لا يمكن تسجيل دفعة أكبر من المبلغ المتبقي!' : 'Sorry, you cannot enter a payment amount exceeding the remaining balance!');
            return;
          }

          dbInstance.addPayment({
            taskId: task.id,
            referenceNo: task.referenceNo,
            clientName: task.clientNameCache || 'Cash client',
            fileName: task.fileName || 'Translation project',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentType: 'income',
            amount: amt,
            currency,
            amountEgp: currency === 'EGP' ? amt : 0,
            amountAed: currency === 'AED' ? amt : 0,
            amountUsd: currency === 'USD' ? amt : 0,
            paymentMethod: accPaymentMethod,
            notes: accPaymentNotes || 'Deposit/Installment payment received'
          });

          // Refresh state
          setTasks([...dbInstance.tasks]);
          setAccPaymentAmt('');
          setAccPaymentNotes('');
          
          success(isRtl ? 'تم تسجيل الدفعة بنجاح وتحديث كافة السجلات والقيود!' : 'Payment logged successfully! Linked ledger & accounting synchronized.');
        };

        const handleDeleteModalPayment = (paymentId: string) => {
          confirm(
            isRtl ? 'هل أنت متأكد من حذف هذه الدفعة المالية؟ سيتم إعادة حساب الرصيد والمتبقي تلقائياً!' : 'Are you sure you want to delete this payment? The balance and remaining outstanding will be automatically updated.',
            () => {
              const ok = dbInstance.deletePayment(paymentId);
              if (ok) {
                setTasks([...dbInstance.tasks]);
                success(isRtl ? 'تم حذف الدفعة وإعادة حساب الرصيد بنجاح.' : 'Payment deleted and balances recalculated successfully.');
              } else {
                error('Failed to delete payment.');
              }
            },
            undefined,
            { isRtl }
          );
        };

        return (
          <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in text-zinc-900 font-sans">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden border border-zinc-150 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-zinc-900 text-white p-4 flex justify-between items-center px-6">
                <div>
                  <h3 className="font-extrabold text-sm tracking-widest uppercase flex items-center gap-2">
                    📊 Task Accounting & Financial Ledger
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Ref: {task.referenceNo} • Unique ID: {task.id}
                  </p>
                  {(() => {
                    const qId = task.quotationId || task.quotation_id;
                    const q = quotations.find(item => item.id === qId || item.convertedToJobId === task.id || item.linkedTaskId === task.id || item.linked_task_id === task.id);
                    if (q) {
                      return (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-zinc-300 font-semibold">{isRtl ? 'عرض السعر المربوط:' : 'Linked Quotation:'} {q.quoteNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskForAccDetails(null);
                              window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'sales_billing', quoteId: q.id } }));
                            }}
                            className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-brand-gold font-bold rounded text-[8px] cursor-pointer transition-colors border border-zinc-700"
                          >
                            {isRtl ? 'فتح عرض السعر' : 'Open Linked Quote'}
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <button
                  onClick={() => setSelectedTaskForAccDetails(null)}
                  className="p-1 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white font-bold cursor-pointer text-xs"
                >
                  ✕ {isRtl ? 'إغلاق' : 'Close'}
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* 1. Account Details Grid */}
                <div>
                  <h4 className="font-bold text-zinc-700 uppercase tracking-wider mb-2 border-b border-zinc-100 pb-1 flex items-center gap-1.5">
                    📁 {isRtl ? 'بيانات الحساب المالي المربوط بالطلب' : 'Account Financial Overview'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-zinc-50 p-4 rounded-lg border border-zinc-200 shadow-xs mb-4">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'العميل' : 'Client Name'}</span>
                      <span className="font-bold text-zinc-800 text-xs truncate block mt-0.5">{task.clientNameCache}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'إجمالي المتفق عليه' : 'Total Agreed'}</span>
                      <span className="font-black text-zinc-900 text-xs block mt-0.5">{currency} {accRecord ? accRecord.totalAmount.toLocaleString() : task.amountEgp.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'المبلغ المدفوع' : 'Total Paid'}</span>
                      <span className="font-black text-emerald-600 text-xs block mt-0.5 font-mono">{currency} {accRecord ? accRecord.initialDeposit.toLocaleString() : (task.paidAmountEgp || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'المتبقي المستحق' : 'Balance Outstanding'}</span>
                      <span className={`font-black text-xs block mt-0.5 font-mono ${remaining > 0 ? 'text-rose-650 font-extrabold animate-pulse' : 'text-emerald-600'}`}>
                        {currency} {remaining.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'مدخل المعاملة' : 'Task Creator / Registrar'}</span>
                      <span className="font-bold text-blue-800 text-[11px] block mt-0.5 truncate" title={creatorName}>{creatorProf?.fullName || creatorName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'حالة السداد' : 'Payment Status'}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold mt-1 uppercase border ${
                        task.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-250' : 
                        task.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-600 border-amber-250 animate-pulse' : 
                        'bg-rose-50 text-rose-600 border-rose-250'
                      }`}>
                        {task.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'حالة التسليم' : 'Delivery Status'}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold mt-1 uppercase border ${
                        task.status === 'delivered' || task.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {task.status === 'delivered' || task.status === 'completed' ? 'Delivered' : 'Pending Delivery'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'تاريخ التسليم والمستلم' : 'Delivery Date & Attendant'}</span>
                      <span className="text-zinc-650 block mt-0.5 font-mono text-[10px]">
                        {task.deliveryDate ? `${new Date(task.deliveryDate).toLocaleDateString()} by ${(task as any).deliveredBy || 'System'}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{isRtl ? 'حالة القيد في الحسابات' : 'Accounting Status'}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold mt-1 uppercase border ${
                        remaining <= 0.01 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {remaining <= 0.01 ? 'Settled & Closed' : 'Open / Unpaid balance'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 2. Add New Payment Form */}
                  <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
                    <h4 className="font-bold text-zinc-700 uppercase tracking-wider mb-2 pb-1 border-b border-zinc-200 flex items-center gap-1">
                      💳 {isRtl ? 'تسجيل دفعة نقدية جديدة' : 'Record Task Payment'}
                    </h4>
                    {remaining <= 0.01 ? (
                      <div className="p-6 bg-emerald-50 border border-emerald-150 rounded text-center text-emerald-700 font-bold text-[11px]">
                        🎉 Client balance for this folder is already fully paid and closed.
                      </div>
                    ) : (
                      <form onSubmit={handleAddModalPayment} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">{isRtl ? 'المبلغ المستلم' : 'Amount Received'}</label>
                            <input
                              type="number"
                              required
                              step="any"
                              value={accPaymentAmt}
                              onChange={e => setAccPaymentAmt(e.target.value)}
                              placeholder={`Remaining ${remaining.toFixed(2)}`}
                              className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</label>
                            <select
                              value={accPaymentMethod}
                              onChange={e => setAccPaymentMethod(e.target.value as PaymentMethod)}
                              className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none text-xs"
                            >
                              <option value="cash">Cash</option>
                              <option value="bank">Bank Transfer</option>
                              <option value="instapay">Instapay</option>
                              <option value="vodafone_cash">Vodafone Cash</option>
                              <option value="petty_cash">Petty Cash</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">{isRtl ? 'ملاحظات وتفاصيل' : 'Notes/Reference'}</label>
                          <input
                            type="text"
                            value={accPaymentNotes}
                            onChange={e => setAccPaymentNotes(e.target.value)}
                            placeholder="e.g. Received partial deposit"
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-zinc-950 hover:bg-zinc-850 text-white font-bold py-2 px-4 rounded cursor-pointer transition-colors shadow-xs text-[10px] uppercase tracking-wide"
                        >
                          Submit Recorded Payment
                        </button>
                      </form>
                    )}
                  </div>

                  {/* 3. Compilation & Final Delivery Center */}
                  <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
                    <h4 className="font-bold text-zinc-700 uppercase tracking-wider mb-2 pb-1 border-b border-zinc-200 flex items-center gap-1.5">
                      📦 {isRtl ? 'مركز تسليم الملفات المجمعة والنهائية' : 'Compilation & Final Delivery Center'}
                    </h4>
                    <form onSubmit={handleMarkReadyForDelivery} className="space-y-4">
                      {/* File uploads */}
                      <div className="space-y-2 text-[10px]">
                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                            {isRtl ? 'الملف المترجم المجمع (المسودة الأولى):' : 'Final Compiled Translated Draft:'}
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="file" 
                              onChange={(e) => handleCompileFileUpload(e, 'finalFile')}
                              className="w-full p-1 border border-zinc-300 rounded text-[9px] bg-white cursor-pointer"
                            />
                            {compileFinalFile && (
                              <a href={compileFinalFile.url} download={compileFinalFile.name} className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-bold hover:bg-indigo-100 shrink-0">
                                Down
                              </a>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                            {isRtl ? 'الملف النهائي بعد المراجعة اللغوية:' : 'Final Reviewed & Polished Version:'}
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="file" 
                              onChange={(e) => handleCompileFileUpload(e, 'finalReviewedFile')}
                              className="w-full p-1 border border-zinc-300 rounded text-[9px] bg-white cursor-pointer"
                            />
                            {compileFinalReviewedFile && (
                              <a href={compileFinalReviewedFile.url} download={compileFinalReviewedFile.name} className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-bold hover:bg-indigo-100 shrink-0">
                                Down
                              </a>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                            {isRtl ? 'النسخة الجاهزة للتسليم النهائي (العميل):' : 'Clean Client Delivery-Ready File:'}
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="file" 
                              onChange={(e) => handleCompileFileUpload(e, 'deliveryReadyFile')}
                              className="w-full p-1 border border-zinc-300 rounded text-[9px] bg-white cursor-pointer"
                            />
                            {compileDeliveryReadyFile && (
                              <a href={compileDeliveryReadyFile.url} download={compileDeliveryReadyFile.name} className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-bold hover:bg-indigo-100 shrink-0">
                                Down
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Deliverables Checklist */}
                      <div className="bg-white p-2.5 rounded border border-zinc-200 space-y-1 text-[10px]">
                        <span className="font-extrabold uppercase block text-zinc-400 text-[8.5px] tracking-wider">
                          Deliverability Audit Checklist:
                        </span>
                        {(() => {
                          const relevantAsgs = dbInstance.assignments.filter(a => a.taskId === task.id);
                          const allApproved = relevantAsgs.length > 0 && relevantAsgs.every(a => a.status === 'approved');
                          const hasCompiled = !!compileFinalFile;
                          const hasReviewed = !!compileFinalReviewedFile;
                          const hasDelivery = !!compileDeliveryReadyFile;
                          
                          return (
                            <div className="space-y-1 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className={allApproved ? "text-emerald-600 font-extrabold" : "text-rose-500 font-bold"}>
                                  {allApproved ? "✓" : "✗"}
                                </span>
                                <span>Linguist Approvals: {allApproved ? "All Approved" : "Pending Parts"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={hasCompiled ? "text-emerald-600 font-extrabold" : "text-rose-500 font-bold"}>
                                  {hasCompiled ? "✓" : "✗"}
                                </span>
                                <span>Compiled Translated Draft</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={hasReviewed ? "text-emerald-600 font-extrabold" : "text-rose-500 font-bold"}>
                                  {hasReviewed ? "✓" : "✗"}
                                </span>
                                <span>Reviewed & Polished File</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={hasDelivery ? "text-emerald-600 font-extrabold" : "text-rose-500 font-bold"}>
                                  {hasDelivery ? "✓" : "✗"}
                                </span>
                                <span>Client Delivery-Ready Version</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Delivery triggers */}
                      <div>
                        {(() => {
                          const relevantAsgs = dbInstance.assignments.filter(a => a.taskId === task.id);
                          const allApproved = relevantAsgs.length > 0 && relevantAsgs.every(a => a.status === 'approved');
                          
                          if (allApproved) {
                            return (
                              <button
                                type="submit"
                                className="w-full bg-emerald-650 hover:bg-emerald-750 text-white font-extrabold py-2 px-4 rounded cursor-pointer transition-colors shadow-sm text-[10px] uppercase tracking-wide"
                              >
                                Mark Ready for Delivery En-route
                              </button>
                            );
                          } else {
                            return (
                              <div className="space-y-2">
                                <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                  ⚠️ Cannot deliver normally because some assignments are pending approval. 
                                  You can force completion by entering an administrative override reason below.
                                </div>
                                {showOverrideForm ? (
                                  <div className="space-y-2">
                                    <textarea
                                      required
                                      value={overrideReason}
                                      onChange={(e) => setOverrideReason(e.target.value)}
                                      placeholder="Explain the reason for this administrative bypass (required for audit log)..."
                                      className="w-full p-1.5 border border-amber-350 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none text-[11px]"
                                      rows={2}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="submit"
                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-1.5 px-3 rounded cursor-pointer transition-colors text-[9px] uppercase"
                                      >
                                        Authorize Delivery Override
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setShowOverrideForm(false)}
                                        className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-350 text-zinc-700 rounded text-[9px] font-bold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setShowOverrideForm(true)}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-4 rounded cursor-pointer transition-colors shadow-sm text-[10px] uppercase tracking-wide"
                                  >
                                    Bypass with Admin Override
                                  </button>
                                )}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </form>
                  </div>
                </div>

                {/* Section 3: Linguist & Quality Assurance Assignments Panel */}
                <div className="bg-zinc-50/50 p-5 rounded-lg border border-zinc-200 space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <h4 className="font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                      👤 {isRtl ? 'إدارة تعيينات المترجمين والمراجعين والتكاليف' : 'Linguist & Quality Assurance Assignments'}
                    </h4>
                    <div className="flex gap-2 text-[10px]">
                      <div>
                        <label className="mr-1 text-zinc-400 font-bold">Assign Mode:</label>
                        <select
                          value={task.assignmentMode || 'single'}
                          onChange={(e) => {
                            task.assignmentMode = e.target.value as any;
                            dbInstance.updateTask(task);
                            setSelectedTaskForAccDetails({ ...task });
                          }}
                          className="bg-white border border-zinc-300 rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          <option value="single">Single Translator</option>
                          <option value="multiple">Multiple Translators</option>
                        </select>
                      </div>
                      <div>
                        <label className="mr-1 text-zinc-400 font-bold">Review Mode:</label>
                        <select
                          value={task.reviewerMode || 'single'}
                          onChange={(e) => {
                            task.reviewerMode = e.target.value as any;
                            dbInstance.updateTask(task);
                            setSelectedTaskForAccDetails({ ...task });
                          }}
                          className="bg-white border border-zinc-300 rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          <option value="single">Single Reviewer</option>
                          <option value="multiple">Multiple Reviewers</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Word count audit indicator */}
                  {(() => {
                    const taskAssignments = dbInstance.assignments.filter(a => a.taskId === task.id);
                    const sumAssignedWords = taskAssignments.filter(a => a.assignmentType === 'translation').reduce((sum, a) => sum + (a.wordCountAssigned || 0), 0);
                    const isMismatch = task.assignmentMode === 'multiple' && sumAssignedWords !== task.wordCount;
                    return (
                      <div className={`p-3 rounded-lg border flex items-center justify-between text-[11px] ${
                        isMismatch ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'
                      }`}>
                        <div className="space-y-0.5">
                          <span className="font-extrabold uppercase text-[9px] tracking-wide block">Word Distribution Audit Status:</span>
                          {isMismatch ? (
                            <p className="font-medium">
                              ⚠️ Discrepancy detected: Task volume is <span className="font-bold font-mono">{task.wordCount}</span> words, but the total assigned to translators is <span className="font-bold font-mono">{sumAssignedWords}</span> words (diff: {task.wordCount - sumAssignedWords} words).
                            </p>
                          ) : (
                            <p className="font-medium">
                              ✓ Word count distribution is perfectly aligned ({task.wordCount} words fully allocated).
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] font-bold font-mono text-zinc-650 bg-white border border-zinc-200 px-2 py-1 rounded">
                          Total Assigned: {sumAssignedWords} / {task.wordCount} wds
                        </div>
                      </div>
                    );
                  })()}

                  {/* Assignments List Table */}
                  {(() => {
                    const taskAssignments = dbInstance.assignments.filter(a => a.taskId === task.id);
                    if (taskAssignments.length === 0) {
                      return (
                        <div className="p-6 text-center text-zinc-400 bg-white border border-dashed border-zinc-200 rounded-lg text-[11px]">
                          No assignments currently registered for this task. Use the form below to allocate parts.
                        </div>
                      );
                    }
                    return (
                      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <table className="w-full text-left text-[11px] border-collapse font-sans">
                          <thead className="bg-zinc-50 text-zinc-450 border-b border-zinc-200 font-bold uppercase text-[9px]">
                            <tr>
                              <th className="p-2.5 pl-4">Linguist</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Part / Section</th>
                              <th className="p-2.5">Words/Pages</th>
                              <th className="p-2.5">Lang Pair</th>
                              <th className="p-2.5">Deadline</th>
                              <th className="p-2.5 text-center">Status</th>
                              <th className="p-2.5 text-right pr-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150">
                            {taskAssignments.map(asg => {
                              const linguist = dbInstance.profiles.find(p => p.id === asg.translatorId);
                              const isRev = asg.assignmentType === 'revision';
                              const name = linguist ? linguist.fullName : asg.translatorId;
                              const hasHistory = asg.versionHistory && asg.versionHistory.length > 0;
                              const isHistoryExpanded = !!expandedAsgHistory[asg.id];
                              
                              return (
                                <React.Fragment key={asg.id}>
                                  <tr className="hover:bg-zinc-50/50">
                                    <td className="p-2.5 pl-4 font-bold text-zinc-800">
                                      {name}
                                    </td>
                                    <td className="p-2.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white ${
                                        isRev ? 'bg-purple-600' : 'bg-indigo-600'
                                      }`}>
                                        {isRev ? 'Reviewer' : 'Translator'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-zinc-650 font-mono text-[10px]">
                                      {asg.assignedPart || 'Entire Document'}
                                    </td>
                                    <td className="p-2.5 font-mono text-zinc-700">
                                      {asg.wordCountAssigned?.toLocaleString()} wds / {asg.pageCountAssigned || 0} pgs
                                    </td>
                                    <td className="p-2.5">
                                      {asg.languagePair || 'Standard'}
                                    </td>
                                    <td className="p-2.5 font-mono text-[10px]">
                                      {asg.deadline ? new Date(asg.deadline).toLocaleString() : '—'}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                        asg.status === 'approved' ? 'bg-green-50 text-emerald-600 border-emerald-200' :
                                        asg.status === 'submitted' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 animate-pulse' :
                                        asg.status === 'returned_for_correction' ? 'bg-red-50 text-rose-600 border-rose-200 font-extrabold' :
                                        asg.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                        'bg-zinc-50 text-zinc-500 border-zinc-200'
                                      }`}>
                                        {asg.status.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-right pr-4 space-x-1.5 whitespace-nowrap">
                                      {hasHistory && (
                                        <button
                                          type="button"
                                          onClick={() => setExpandedAsgHistory(prev => ({ ...prev, [asg.id]: !isHistoryExpanded }))}
                                          className="text-[9px] font-bold text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-1.5 py-0.5 rounded"
                                        >
                                          {isHistoryExpanded ? 'Hide History' : `History (${asg.versionHistory?.length})`}
                                        </button>
                                      )}

                                      {/* Verification action buttons for admins */}
                                      {asg.status === 'submitted' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const verifiedWordsInput = prompt('Enter verified actual word count for payout:', String(asg.wordCountAssigned || 0));
                                              if (verifiedWordsInput === null) return;
                                              const valWords = parseInt(verifiedWordsInput) || 0;
                                              
                                              let calculatedAmt = 0;
                                              if (asg.rateFixed && asg.rateFixed > 0) {
                                                calculatedAmt = asg.rateFixed;
                                              } else if (asg.ratePerPage && asg.ratePerPage > 0) {
                                                calculatedAmt = (asg.pageCountAssigned || 0) * asg.ratePerPage;
                                              } else {
                                                calculatedAmt = valWords * (asg.ratePerWord || 0.20);
                                              }

                                              dbInstance.approveAssignment(asg.id, valWords, asg.ratePerWord, asg.rateFixed, calculatedAmt, asg.ratePerPage, asg.pageCountAssigned);
                                              
                                              // Refresh
                                              const updatedTask = dbInstance.tasks.find(t => t.id === task.id);
                                              if (updatedTask) setSelectedTaskForAccDetails({ ...updatedTask });
                                              alert('Assignment counts verified and approved successfully.');
                                            }}
                                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[9px] transition-colors"
                                          >
                                            Approve Part
                                          </button>
                                          
                                          <div className="inline-block relative">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentNotes = correctionNoteMap[asg.id];
                                                if (currentNotes) {
                                                  handleReturnForCorrection(asg.id);
                                                } else {
                                                  const comment = prompt('Enter feedback/rejection reason for translator:', 'Please review section formatting');
                                                  if (comment === null) return;
                                                  setCorrectionNoteMap(prev => ({ ...prev, [asg.id]: comment }));
                                                  setTimeout(() => {
                                                    dbInstance.submitReviewAssignment(asg.id, undefined, comment, 'returned_for_correction', comment);
                                                    const updatedTask = dbInstance.tasks.find(t => t.id === task.id);
                                                    if (updatedTask) setSelectedTaskForAccDetails({ ...updatedTask });
                                                    alert('Reverted back to linguist for corrections.');
                                                  }, 20);
                                                }
                                              }}
                                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[9px] transition-colors"
                                            >
                                              Return
                                            </button>
                                          </div>
                                        </>
                                      )}

                                      {/* Download button if attachments exist */}
                                      {asg.translatedAttachments && asg.translatedAttachments.length > 0 && (
                                        <div className="inline-flex gap-1">
                                          {asg.translatedAttachments.map(att => (
                                            <a
                                              key={att.id}
                                              href={att.url}
                                              download={att.name}
                                              title={`Download: ${att.name}`}
                                              className="p-1 hover:bg-zinc-150 border border-zinc-200 rounded text-zinc-650 hover:text-zinc-900 inline-block"
                                            >
                                              📥
                                            </a>
                                          ))}
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveAssignment(asg.id)}
                                        className="px-1.5 py-0.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded font-black text-[9px] transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Expandable Version History details */}
                                  {isHistoryExpanded && hasHistory && (
                                    <tr className="bg-zinc-50/70 border-l-2 border-indigo-400">
                                      <td colSpan={8} className="p-3 pl-6 text-[10px]">
                                        <div className="space-y-2">
                                          <span className="font-extrabold uppercase text-[8.5px] text-zinc-400 block tracking-wider">
                                            Archive Submission History & Draft Revisions:
                                          </span>
                                          <div className="space-y-1.5 font-sans">
                                            {asg.versionHistory?.map((ver, idx) => (
                                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-zinc-150 shadow-3xs">
                                                <div className="space-y-0.5">
                                                  <span className="font-bold text-zinc-800">Version {ver.version} • Submitted: {new Date(ver.submittedAt).toLocaleString()}</span>
                                                  <p className="text-zinc-500">{ver.notes || "No submission comments provided"}</p>
                                                </div>
                                                <div className="flex gap-1.5">
                                                  {ver.files.map(att => (
                                                    <a
                                                      key={att.id}
                                                      href={att.url}
                                                      download={att.name}
                                                      className="flex items-center gap-1 bg-zinc-50 hover:bg-zinc-150 border border-zinc-200/80 px-2 py-0.5 rounded text-[9px] font-mono transition-all text-zinc-700"
                                                    >
                                                      📥 <span className="truncate max-w-[120px] font-bold">{att.name}</span>
                                                    </a>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Add New Assignment Form */}
                  <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-3xs">
                    <h5 className="font-black text-zinc-800 uppercase tracking-wide text-[10.5px] mb-3 pb-1 border-b border-zinc-100 flex items-center gap-1">
                      ➕ Appoint New Assignment Part / Linguist
                    </h5>
                    <form onSubmit={handleAddAssignment} className="space-y-3 text-[10px]">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Specialist</label>
                          <select
                            required
                            value={asgLinguistId}
                            onChange={(e) => setAsgLinguistId(e.target.value)}
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none text-[11px]"
                          >
                            <option value="">-- Choose Linguist --</option>
                            {translators.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.fullName} ({t.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Assignment Role</label>
                          <select
                            value={asgRole}
                            onChange={(e) => setAsgRole(e.target.value as any)}
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none text-[11px]"
                          >
                            <option value="translation">Translation</option>
                            <option value="revision">Review / Revision</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Assigned Part Name</label>
                          <input
                            type="text"
                            required
                            value={asgPart}
                            onChange={(e) => setAsgPart(e.target.value)}
                            placeholder="e.g. Section 1 (first 500w)"
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Language Pair</label>
                          <input
                            type="text"
                            required
                            value={asgLangPair}
                            onChange={(e) => setAsgLangPair(e.target.value)}
                            placeholder="e.g. English to Arabic"
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Assigned Word Count</label>
                          <input
                            type="number"
                            required
                            value={asgWords}
                            onChange={(e) => {
                              const valStr = e.target.value;
                              setAsgWords(valStr);
                              const val = parseInt(valStr) || 0;
                              setAsgPages(Math.ceil(val / 250).toString());
                            }}
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Assigned Pages</label>
                          <input
                            type="number"
                            required
                            value={asgPages}
                            onChange={(e) => setAsgPages(e.target.value)}
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Part Deadline</label>
                          <input
                            type="datetime-local"
                            required
                            value={asgDeadline}
                            onChange={(e) => setAsgDeadline(e.target.value)}
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono text-[11px]"
                          />
                        </div>

                        {asgRole === 'revision' && (
                          <div>
                            <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Link to Translation Part</label>
                            <select
                              value={asgRelatedAssignmentId}
                              onChange={(e) => setAsgRelatedAssignmentId(e.target.value)}
                              className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none bg-amber-50 text-[11px]"
                            >
                              <option value="">-- No Translator Link --</option>
                              {dbInstance.assignments
                                .filter(a => a.taskId === task.id && a.assignmentType === 'translation')
                                .map(a => {
                                  const translatorName = dbInstance.profiles.find(p => p.id === a.translatorId)?.fullName || a.translatorId;
                                  return (
                                    <option key={a.id} value={a.id}>
                                      {translatorName} ({a.assignedPart || 'Entire File'})
                                    </option>
                                  );
                                })}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Rate settings */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-50 p-3 rounded border border-zinc-150">
                        <div>
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Rate Pricing Scheme</label>
                          <select
                            value={asgRateType}
                            onChange={(e) => setAsgRateType(e.target.value as any)}
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none bg-white text-[11px]"
                          >
                            <option value="word">Rate Per Word</option>
                            <option value="page">Rate Per Page</option>
                            <option value="fixed">Fixed Lump Sum</option>
                          </select>
                        </div>

                        {asgRateType === 'word' && (
                          <div>
                            <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Rate Per Word (EGP)</label>
                            <input
                              type="number"
                              step="any"
                              value={asgRateWords}
                              onChange={(e) => setAsgRateWords(e.target.value)}
                              className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono bg-white text-[11px]"
                            />
                          </div>
                        )}

                        {asgRateType === 'page' && (
                          <div>
                            <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Rate Per Page (EGP)</label>
                            <input
                              type="number"
                              step="any"
                              value={asgRatePage}
                              onChange={(e) => setAsgRatePage(e.target.value)}
                              className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono bg-white text-[11px]"
                            />
                          </div>
                        )}

                        {asgRateType === 'fixed' && (
                          <div>
                            <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Fixed Cost Amount (EGP)</label>
                            <input
                              type="number"
                              step="any"
                              value={asgRateFixed}
                              onChange={(e) => setAsgRateFixed(e.target.value)}
                              className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono bg-white text-[11px]"
                            />
                          </div>
                        )}

                        <div className="md:col-span-2">
                          <label className="block text-[9.5px] uppercase text-zinc-400 font-bold mb-1">Allocation / Notes</label>
                          <input
                            type="text"
                            value={asgNotes}
                            onChange={(e) => setAsgNotes(e.target.value)}
                            placeholder="e.g. Translate pages 1 to 5"
                            className="w-full p-1.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 focus:outline-none bg-white text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold py-2 px-6 rounded cursor-pointer transition-colors uppercase tracking-wider text-[9.5px]"
                        >
                          Appoint Assignment Part
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* 4. Payment History (Requirement 8) */}
                <div>
                  <h4 className="font-bold text-zinc-700 uppercase tracking-wider mb-2 border-b border-zinc-100 pb-1 flex justify-between items-center">
                    <span>📜 {isRtl ? 'سجل وكشوفات الدفعات المستلمة' : 'Payments Received Ledger / Log'}</span>
                    <span className="text-[9px] bg-zinc-100 text-zinc-500 font-normal px-2 py-0.5 rounded font-mono font-bold">
                      {payments.length} Transaction(s)
                    </span>
                  </h4>
                  {payments.length === 0 ? (
                    <div className="p-4 bg-zinc-50 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-lg text-xs">
                      No payments have been logged for this task so far.
                    </div>
                  ) : (
                    <div className="border border-zinc-150 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-left text-[11px] font-sans border-collapse">
                        <thead className="bg-zinc-50 text-zinc-400 text-[9.5px] uppercase font-bold tracking-wider border-b border-zinc-150">
                          <tr>
                            <th className="p-2 px-3">Date</th>
                            <th className="p-2 font-bold">Amount</th>
                            <th className="p-2">Method</th>
                            <th className="p-2">Recorded By</th>
                            <th className="p-2">Notes</th>
                            <th className="p-2 text-center w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-zinc-700">
                          {payments.map(p => {
                            const collectorProf = dbInstance.profiles.find(prof => prof.id === p.recordedBy);
                            const collectorName = collectorProf ? `${collectorProf.fullName} (${collectorProf.role})` : p.recordedBy || '';
                            return (
                              <tr key={p.id} className="hover:bg-zinc-50">
                                <td className="p-2 px-3 font-mono">{p.date || p.paymentDate}</td>
                                <td className="p-2 font-black text-emerald-600 font-mono">
                                  {p.currency || 'EGP'} {p.amount.toLocaleString()}
                                </td>
                                <td className="p-2 uppercase font-semibold text-[10px] text-zinc-500">{p.paymentMethod}</td>
                                <td className="p-2 font-semibold text-zinc-700">{collectorName}</td>
                                <td className="p-2 max-w-xs truncate" title={p.notes}>{p.notes || '—'}</td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleDeleteModalPayment(p.id)}
                                    className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold rounded text-[9px] border border-red-200 cursor-pointer"
                                    title={isRtl ? 'حذف هذه الدفعة والتراجع عنها' : 'Delete and reverse this payment'}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. Enhanced Task Lifecycle Activity Log & Audit Trail */}
                <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/25 shadow-2xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 pb-3 mb-4 gap-2">
                    <div>
                      <h4 className="font-bold text-zinc-850 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                        <span>🛡️ {isRtl ? 'سجل تتبع النشاط ودورة الحياة الشامل' : 'Task Activity Log & Audit Trail'}</span>
                        <span className="text-[9px] bg-zinc-100 text-zinc-500 font-normal px-2 py-0.5 rounded font-mono font-bold">
                          {timelineEvents.length} {isRtl ? 'حدث مسجل' : 'Events tracked'}
                        </span>
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {isRtl ? 'سجل تدقيق كامل للعمليات: منشىء المعاملة، مستلم الدفعات، حركات التسليم واللغويين.' : 'Comprehensive audit trace: who created the task, who received payments, and delivery marks.'}
                      </p>
                    </div>

                    {/* Interactive Tab Toggle */}
                    <div className="flex rounded-lg bg-zinc-100 p-1 border border-zinc-250 text-xs font-sans">
                      <button
                        type="button"
                        onClick={() => setAuditViewMode('timeline')}
                        className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${auditViewMode === 'timeline' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
                      >
                        ⏱️ {isRtl ? 'المخطط الزمني للنشاط' : 'Interactive Timeline'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditViewMode('table')}
                        className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${auditViewMode === 'table' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
                      >
                        📋 {isRtl ? 'جدول التدقيق للمطابقة' : 'Audit Ledger Table'}
                      </button>
                    </div>
                  </div>

                  {auditViewMode === 'timeline' ? (
                    timelineEvents.length === 0 ? (
                      <div className="p-6 bg-zinc-50/50 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-lg font-sans">
                        No activity events registered for this folder.
                      </div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-zinc-200 ml-4 space-y-4 max-h-[300px] overflow-y-auto pr-2 pt-1 font-sans">
                        {timelineEvents.map((ev, index) => (
                          <div key={ev.id || index} className="relative group transition-all">
                            {/* Chronology Badge / Dot */}
                            <div className={`absolute -left-[34px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border bg-white shadow-3xs transition-transform group-hover:scale-110 ${ev.colorClass}`}>
                              {ev.icon}
                            </div>

                            {/* Activity Event Details */}
                            <div className="bg-white hover:bg-zinc-50/80 border border-zinc-150 p-3 rounded-lg shadow-3xs hover:shadow-2xs transition-all">
                              <div className="flex justify-between items-center gap-2 flex-wrap">
                                <span className="font-bold text-zinc-850 text-[10.5px]">
                                  {isRtl ? ev.titleAr : ev.titleEn}
                                </span>
                                <span className="text-[9px] text-zinc-400 font-mono">
                                  {new Date(ev.timestamp).toLocaleString(isRtl ? 'ar' : 'en')}
                                </span>
                              </div>
                              
                              <p className="text-[10.5px] text-zinc-500 mt-1 leading-relaxed">
                                {ev.details}
                              </p>

                              {/* Performer attribution metadata */}
                              <div className="flex items-center gap-1.5 mt-2 text-[9px] text-zinc-400 bg-zinc-50 border border-zinc-100 rounded px-1.5 py-0.5 w-fit">
                                <span className="font-semibold text-zinc-400 uppercase">{isRtl ? 'بواسطة:' : 'By Operator:'}</span>
                                <span className="text-zinc-655 font-bold">{ev.operator}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    audits.length === 0 ? (
                      <div className="p-4 bg-zinc-50/50 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
                        No audited events registered for this folder.
                      </div>
                    ) : (
                      <div className="border border-zinc-150 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto bg-white font-mono text-[9.5px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-zinc-50 text-zinc-400 text-[8.5px] uppercase font-bold sticky top-0 border-b border-zinc-150">
                            <tr>
                              <th className="p-2 px-3">Date & Time</th>
                              <th className="p-2">Action</th>
                              <th className="p-2">Prior Value</th>
                              <th className="p-2">Updated Value</th>
                              <th className="p-2">Operator</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 text-zinc-650">
                            {[...audits].reverse().map(l => (
                              <tr key={l.id} className="hover:bg-zinc-50">
                                <td className="p-2 px-3 whitespace-nowrap text-zinc-400">
                                  {new Date(l.timestamp).toLocaleString()}
                                </td>
                                <td className="p-2 font-bold text-zinc-800">{l.actionType}</td>
                                <td className="p-2 truncate max-w-[150px]" title={l.oldValue}>{l.oldValue || '—'}</td>
                                <td className="p-2 truncate max-w-[180px] text-zinc-900 font-semibold" title={l.newValue}>{l.newValue || '—'}</td>
                                <td className="p-2 text-zinc-500 whitespace-nowrap">{l.performedBy}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>

              {/* Close footer */}
              <div className="bg-zinc-50 border-t border-zinc-150 p-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForAccDetails(null)}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-850 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-sm uppercase tracking-wider text-[10px]"
                >
                  Close Ledger Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      {isTaskListExportOpen && (
        <ExportProtectionModal
          isOpen={isTaskListExportOpen}
          onClose={() => setIsTaskListExportOpen(false)}
          dataType="task_data_export"
          dataLabelEn="Tasks List Spreadsheet"
          dataLabelAr="قائمة وثائق المهام بالكامل"
          isRtl={isRtl}
          onExportApproved={() => {
            exportTasksCSV(isRtl);
          }}
        />
      )}
    </div>
  );
};

export default TasksPage;
