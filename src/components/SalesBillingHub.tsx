/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Receipt, Plus, Search, Filter, Download, 
  MoreHorizontal, ChevronRight, FileCheck, Send, 
  RefreshCw, Clock, CheckCircle2, AlertCircle, ShoppingBag,
  X, Save, Landmark, Building2, Users, FileStack, FileSpreadsheet, CheckCircle,
  MessageCircle, Mail, Ban, Check, Upload, Paperclip,
  Printer, Edit, Trash2, Copy, Percent, Globe, AlertTriangle
} from 'lucide-react';
import dbInstance from '../db/store';
import { useToast } from './Toast';
import { 
  Invoice, Quotation, PurchaseOrder, Profile, 
  QuotationStatus, InvoiceStatus, Client, ServiceType,
  PaymentMethod
} from '../types';
import { generateQuotationPDF, downloadQuotation } from '../utils/pdfGenerator';

interface SalesBillingHubProps {
  isRtl: boolean;
  currentUser: Profile;
  hideHeader?: boolean;
}

export default function SalesBillingHub({ isRtl, currentUser, hideHeader = false }: SalesBillingHubProps) {
  const { success, error, warning, info } = useToast();

  const alert = (msg: string) => {
    if (msg.toLowerCase().includes('successfully') || msg.toLowerCase().includes('success') || msg.includes('تم') || msg.includes('تمت') || msg.includes('بنجاح') || msg.includes('🎉')) {
      success(msg);
    } else if (msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('required') || msg.toLowerCase().includes('error') || msg.includes('مغلق') || msg.includes('مطلوب') || msg.includes('يجب') || msg.toLowerCase().includes('must') || msg.toLowerCase().includes('please')) {
      warning(msg);
    } else {
      info(msg);
    }
  };

  const brand = dbInstance.brandConfig || dbInstance.getEmptyBrandConfig();
  const [activeTab, setActiveTab] = useState<'quotes' | 'invoices' | 'pos'>('quotes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    nameAr: '',
    phone: '',
    email: '',
    clientType: 'individual' as 'individual' | 'company' | 'agency'
  });

  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // New Quote Workshop full detail state
  const [quoteForm, setQuoteForm] = useState<{
    clientId: string;
    clientName: string;
    clientType: 'individual' | 'company';
    companyName: string;
    contactPerson: string;
    clientPhone: string;
    clientWhatsapp: string;
    clientEmail: string;
    billingAddress: string;
    clientTaxNumber: string;
    clientSource: string;
    
    items: Array<{
      id: string;
      description: string;
      sourceLanguage: string;
      targetLanguage: string;
      unit: 'word' | 'page' | 'hour' | 'project' | 'certificate' | 'other';
      unitPrice: number;
      wordCountAvailable: boolean;
      wordCount: number;
      manualPages: number;
      isEstimatedPages: boolean;
      estimateReason: string;
      quantity: number;
      discountType: 'none' | 'fixed' | 'percentage';
      discountValue: number;
      total: number;
    }>;
    
    currency: 'EGP' | 'AED' | 'USD';
    discountType: 'none' | 'fixed' | 'percentage';
    discountValue: number;
    discountReason: string;
    taxEnabled: boolean;
    taxRate: number;
    
    shipmentRequired: boolean;
    deliveryMethod: string;
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;
    city: string;
    country: string;
    deliveryNotes: string;
    deliveryFee: number;
    
    deadline: string;
    estimatedCompletion: string;
    turnaroundTime: string;
    urgencyStatus: 'normal' | 'urgent' | 'same_day' | 'express';
    urgencySurcharge: number;
    
    internalNotes: string;
    clientNotes: string;
    validUntil: string;
    clientReferenceNo: string;
    salespersonId: string;
    salespersonName: string;
    
    documentsToBeTranslated: any[];
    referenceDocuments: any[];
  }>({
    clientId: '',
    clientName: '',
    clientType: 'individual',
    companyName: '',
    contactPerson: '',
    clientPhone: '',
    clientWhatsapp: '',
    clientEmail: '',
    billingAddress: '',
    clientTaxNumber: '',
    clientSource: 'whatsapp',
    items: [],
    currency: 'EGP',
    discountType: 'none',
    discountValue: 0,
    discountReason: '',
    taxEnabled: false,
    taxRate: 14,
    shipmentRequired: false,
    deliveryMethod: 'courier',
    recipientName: '',
    recipientPhone: '',
    deliveryAddress: '',
    city: '',
    country: '',
    deliveryNotes: '',
    deliveryFee: 0,
    deadline: '',
    estimatedCompletion: '',
    turnaroundTime: '',
    urgencyStatus: 'normal',
    urgencySurcharge: 0,
    internalNotes: '',
    clientNotes: `This quotation is valid for 15 days from issue date.
Services start only after written approval and downpayment confirmation.
Any official certifications, stamps, or physical dispatch fees are billed separately.`,
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientReferenceNo: '',
    salespersonId: currentUser.id,
    salespersonName: currentUser.fullName,
    documentsToBeTranslated: [],
    referenceDocuments: [],
  });

  // Backward compatibility legacy form
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    fileName: '',
    serviceType: 'translation' as ServiceType,
    sourceLanguage: 'English',
    targetLanguage: 'Arabic',
    wordCount: 0,
    amountEgp: 0,
    amountAed: 0,
    amountUsd: 0,
    notes: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    documentsToBeTranslated: [] as any[],
    referenceDocuments: [] as any[],
  });

  // Live itemized mathematical calculators
  const computedTotals = useMemo(() => {
    let subtotal = 0;
    const itemTotals = (quoteForm.items || []).map(item => {
      let qty = Number(item.quantity) || 1;
      if (item.unit === 'word') {
        qty = Number(item.wordCount) || 0;
      } else if (item.unit === 'page') {
        qty = item.wordCountAvailable ? Math.ceil((Number(item.wordCount) || 0) / 250) : (Number(item.manualPages) || 0);
      }
      
      const rawSub = qty * (Number(item.unitPrice) || 0);
      let disc = 0;
      if (item.discountType === 'percentage') {
        disc = (rawSub * (Number(item.discountValue) || 0)) / 100;
      } else if (item.discountType === 'fixed') {
        disc = (Number(item.discountValue) || 0);
      }
      
      const total = Math.max(0, rawSub - disc);
      subtotal += total;
      
      const unitVal: 'page' | 'word' | 'hour' | 'project' | 'day' = 
        (item.unit === 'page' || item.unit === 'word' || item.unit === 'hour' || item.unit === 'project')
          ? item.unit 
          : 'project';

      return {
        id: item.id,
        description: item.description,
        quantity: qty,
        unit: unitVal,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: 0,
        discount: item.discountType === 'fixed' ? Number(item.discountValue) || 0 : 0,
        total,
        // Carry forward the additional fields for previewer rendering + full QuotationLineItem compliance
        wordCount: Number(item.wordCount) || 0,
        wordCountAvailable: !!item.wordCountAvailable,
        manualPages: Number(item.manualPages) || 0,
        sourceLanguage: item.sourceLanguage || '',
        targetLanguage: item.targetLanguage || '',
        isEstimatedPages: !!item.isEstimatedPages,
        estimateReason: item.estimateReason || '',
      };
    });

    let discountTotal = 0;
    if (quoteForm.discountType === 'percentage') {
      discountTotal = (subtotal * (Number(quoteForm.discountValue) || 0)) / 100;
    } else if (quoteForm.discountType === 'fixed') {
      discountTotal = (Number(quoteForm.discountValue) || 0);
    }

    const urgency = Number(quoteForm.urgencySurcharge) || 0;
    const taxBasis = Math.max(0, subtotal - discountTotal + urgency);
    const taxTotal = quoteForm.taxEnabled ? (taxBasis * (Number(quoteForm.taxRate) || 0)) / 100 : 0;
    const shipping = quoteForm.shipmentRequired ? (Number(quoteForm.deliveryFee) || 0) : 0;
    const grandTotal = taxBasis + taxTotal + shipping;

    return {
      subtotal,
      discountTotal,
      taxTotal,
      urgencySurcharge: urgency,
      shippingFee: shipping,
      grandTotal,
      itemTotals
    };
  }, [quoteForm]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<'docs' | 'ref' | null>(null);

  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; quoteId: string; reason: string }>({
    isOpen: false,
    quoteId: '',
    reason: ''
  });

  const [depositModal, setDepositModal] = useState<{ isOpen: boolean; quoteId: string; amount: number; method: string }>({
    isOpen: false,
    quoteId: '',
    amount: 0,
    method: 'cash'
  });

  const [approveConfirmModal, setApproveConfirmModal] = useState<{
    isOpen: boolean;
    quoteId: string;
    hasPaidDeposit: 'yes' | 'no' | 'full_on_delivery';
    depositAmount: number;
    paymentMethod: 'cash' | 'bank_saib' | 'instapay' | 'vodafone_cash';
  }>({
    isOpen: false,
    quoteId: '',
    hasPaidDeposit: 'no',
    depositAmount: 0,
    paymentMethod: 'bank_saib',
  });

  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    quote: Quotation | null;
    to: string;
    subject: string;
    body: string;
    sending: boolean;
  }>({
    isOpen: false,
    quote: null,
    to: '',
    subject: '',
    body: '',
    sending: false
  });

  const [depositProof, setDepositProof] = useState<{ url: string; name: string } | null>(null);

  const [proofPreview, setProofPreview] = useState<{
    isOpen: boolean;
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const sub = dbInstance.subscribe(() => {
      setTick(t => t + 1);
    });
    return sub;
  }, []);

  useEffect(() => {
    const selectQuote = (quoteId: string) => {
      const q = dbInstance.quotations.find(quote => quote.id === quoteId);
      if (q) {
        setSelectedQuoteId(q.id);
      }
    };

    const handleSelectQuoteEvent = (e: any) => {
      selectQuote(e.detail);
    };

    window.addEventListener('select-quote', handleSelectQuoteEvent);

    const storedQuoteId = sessionStorage.getItem('goto_quote_id');
    if (storedQuoteId) {
      sessionStorage.removeItem('goto_quote_id');
      setTimeout(() => selectQuote(storedQuoteId), 250);
    }

    return () => {
      window.removeEventListener('select-quote', handleSelectQuoteEvent);
    };
  }, [tick]);

  const data = useMemo(() => {
    return {
      invoices: dbInstance.invoices,
      quotations: dbInstance.quotations,
      purchaseOrders: dbInstance.purchaseOrders,
      clients: dbInstance.clients
    };
  }, [tick]);

  const clients = data.clients;

  const filteredQuotes = data.quotations.filter(q => 
    (q.quoteNumber?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
     q.clientName?.toLowerCase().includes(searchQuery?.toLowerCase() || ''))
  );

  const filteredInvoices = data.invoices.filter(i => 
    (i.invoiceNumber?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
     i.clientName?.toLowerCase().includes(searchQuery?.toLowerCase() || ''))
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetClientId = formData.clientId;
    let targetClientName = '';

    if (isAddingNewClient) {
      if (!newClientData.name) {
        alert(isRtl ? 'اسم العميل مطلوب' : 'Client name is required');
        return;
      }
      const newClient = dbInstance.addClient(
        newClientData.name,
        newClientData.nameAr || newClientData.name,
        newClientData.phone,
        newClientData.email,
        newClientData.clientType
      );
      targetClientId = newClient.id;
      targetClientName = newClient.name;
    } else {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (!selectedClient) {
        alert(isRtl ? 'يرجى اختيار عميل' : 'Please select a client');
        return;
      }
      targetClientId = selectedClient.id;
      targetClientName = selectedClient.name;
    }

    if (activeTab === 'quotes') {
      const newQuote = dbInstance.addQuotation({
        clientId: targetClientId,
        clientName: targetClientName,
        fileName: formData.fileName,
        serviceType: formData.serviceType,
        sourceLanguage: formData.sourceLanguage,
        targetLanguage: formData.targetLanguage,
        wordCount: formData.wordCount,
        amountEgp: formData.amountEgp,
        amountAed: formData.amountAed,
        amountUsd: formData.amountUsd,
        notes: formData.notes,
        documentsToBeTranslated: formData.documentsToBeTranslated,
        referenceDocuments: formData.referenceDocuments,
        status: 'created',
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      
      // Trigger CRM Automation
      dbInstance.checkAutomationTriggers('quotation_sent', { clientId: targetClientId });
      
      console.log('Quote Created:', newQuote);
    } else if (activeTab === 'invoices') {
      dbInstance.addInvoice({
        clientId: targetClientId,
        clientName: targetClientName,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        currency: formData.amountUsd > 0 ? 'USD' : (formData.amountAed > 0 ? 'AED' : 'EGP'),
        subtotal: formData.amountEgp || formData.amountAed || formData.amountUsd,
        grandTotal: formData.amountEgp || formData.amountAed || formData.amountUsd,
        balance: formData.amountEgp || formData.amountAed || formData.amountUsd,
        status: 'unpaid',
        items: [{
          id: `item-${Date.now()}`,
          description: formData.fileName || 'General Service',
          quantity: formData.wordCount || 1,
          unitPrice: (formData.amountEgp || formData.amountAed || formData.amountUsd) / (formData.wordCount || 1),
          total: formData.amountEgp || formData.amountAed || formData.amountUsd
        }]
      });
    }

    setIsCreateModalOpen(false);
    setIsAddingNewClient(false);
    resetForm();
    alert(isRtl ? 'تمت العملية بنجاح' : 'Record created successfully');
  };

  const resetQuoteWorkshopForm = () => {
    setQuoteForm({
      clientId: '',
      clientName: '',
      clientType: 'individual',
      companyName: '',
      contactPerson: '',
      clientPhone: '',
      clientWhatsapp: '',
      clientEmail: '',
      billingAddress: '',
      clientTaxNumber: '',
      clientSource: 'whatsapp',
      items: [{
        id: `draft-item-${Date.now()}`,
        description: '',
        sourceLanguage: 'English',
        targetLanguage: 'Arabic',
        unit: 'word',
        unitPrice: 0.25,
        wordCountAvailable: true,
        wordCount: 1000,
        manualPages: 4,
        isEstimatedPages: false,
        estimateReason: '',
        quantity: 1,
        discountType: 'none',
        discountValue: 0,
        total: 250
      }],
      currency: 'EGP',
      discountType: 'none',
      discountValue: 0,
      discountReason: '',
      taxEnabled: false,
      taxRate: 14,
      shipmentRequired: false,
      deliveryMethod: 'courier',
      recipientName: '',
      recipientPhone: '',
      deliveryAddress: '',
      city: '',
      country: '',
      deliveryNotes: '',
      deliveryFee: 0,
      deadline: '',
      estimatedCompletion: '',
      turnaroundTime: '',
      urgencyStatus: 'normal',
      urgencySurcharge: 0,
      internalNotes: '',
      clientNotes: `This quotation is valid for 15 days from issue date.
Services start only after written approval and downpayment confirmation.
Any official certifications, stamps, or physical dispatch fees are billed separately.`,
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientReferenceNo: '',
      salespersonId: currentUser.id,
      salespersonName: currentUser.fullName,
      documentsToBeTranslated: [],
      referenceDocuments: [],
    });
  };

  const handleEditClick = (quote: Quotation) => {
    if ((quote.status === 'confirmed' || quote.status === 'converted') && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      alert(isRtl ? 'عرض السعر مغلق وملتزم بمشروع؛ يرجى الرجوع لمدير النظام' : 'This quotation is locked as confirmed/converted. Please consult an admin.');
      return;
    }
    
    setEditingQuoteId(quote.id);
    setQuoteForm({
      clientId: quote.clientId || '',
      clientName: quote.clientName || '',
      clientType: (quote as any).clientType || 'individual',
      companyName: (quote as any).companyName || '',
      contactPerson: quote.contactPerson || '',
      clientPhone: (quote as any).clientPhone || '',
      clientWhatsapp: (quote as any).clientWhatsapp || '',
      clientEmail: (quote as any).clientEmail || '',
      billingAddress: quote.paymentTerms || (quote as any).billingAddress || '',
      clientTaxNumber: (quote as any).clientTaxNumber || '',
      clientSource: (quote as any).clientSource || 'whatsapp',
      items: quote.items && quote.items.length > 0 ? quote.items.map((i, idx) => ({
        id: i.id || `item-${Date.now()}-${idx}`,
        description: i.description || '',
        sourceLanguage: (i as any).sourceLanguage || 'English',
        targetLanguage: (i as any).targetLanguage || 'Arabic',
        unit: (i.unit === 'day' ? 'project' : i.unit) as any,
        unitPrice: i.unitPrice || 0,
        wordCountAvailable: (i as any).wordCountAvailable !== undefined ? (i as any).wordCountAvailable : true,
        wordCount: (i as any).wordCount || i.quantity || 0,
        manualPages: (i as any).manualPages || i.quantity || 0,
        isEstimatedPages: (i as any).isEstimatedPages || false,
        estimateReason: (i as any).estimateReason || '',
        quantity: i.quantity || 1,
        discountType: (i as any).discountType || 'none',
        discountValue: (i as any).discountValue || 0,
        total: i.total || 0,
      })) : [{
        id: `draft-item-${Date.now()}`,
        description: quote.fileName || 'Certified translation assignment',
        sourceLanguage: quote.sourceLanguage || 'English',
        targetLanguage: quote.targetLanguage || 'Arabic',
        unit: 'word',
        unitPrice: quote.currency === 'USD' ? 0.08 : (quote.currency === 'AED' ? 0.35 : 0.8),
        wordCountAvailable: quote.wordCount > 0,
        wordCount: quote.wordCount || 1000,
        manualPages: Math.ceil(quote.wordCount / 255) || 4,
        isEstimatedPages: false,
        estimateReason: '',
        quantity: 1,
        discountType: 'none',
        discountValue: 0,
        total: quote.grandTotal || 0,
      }],
      currency: quote.currency || 'EGP',
      discountType: (quote as any).discountType || 'none',
      discountValue: (quote as any).discountValue || 0,
      discountReason: (quote as any).discountReason || '',
      taxEnabled: (quote as any).taxEnabled || quote.taxTotal > 0 || false,
      taxRate: (quote as any).taxRate || 14,
      shipmentRequired: (quote as any).shipmentRequired || false,
      deliveryMethod: (quote as any).deliveryMethod || 'courier',
      recipientName: (quote as any).recipientName || '',
      recipientPhone: (quote as any).recipientPhone || '',
      deliveryAddress: (quote as any).deliveryAddress || '',
      city: (quote as any).city || '',
      country: (quote as any).country || '',
      deliveryNotes: (quote as any).deliveryNotes || '',
      deliveryFee: (quote as any).deliveryFee || 0,
      deadline: quote.expectedDeliveryDate || quote.validUntil || '',
      estimatedCompletion: (quote as any).estimatedCompletion || '',
      turnaroundTime: (quote as any).turnaroundTime || '',
      urgencyStatus: (quote as any).urgencyStatus || 'normal',
      urgencySurcharge: (quote as any).urgencySurcharge || 0,
      internalNotes: (quote as any).internalNotes || '',
      clientNotes: quote.notes || '',
      validUntil: quote.validUntil || '',
      clientReferenceNo: (quote as any).clientReferenceNo || '',
      salespersonId: (quote as any).salespersonId || currentUser.id,
      salespersonName: (quote as any).salespersonName || currentUser.fullName,
      documentsToBeTranslated: quote.documentsToBeTranslated || [],
      referenceDocuments: quote.referenceDocuments || [],
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmitQuote = (statusOverride?: QuotationStatus) => {
    let targetClientId = quoteForm.clientId;
    let targetClientName = quoteForm.clientName;

    if (isAddingNewClient) {
      if (!newClientData.name) {
        alert(isRtl ? 'اسم العميل مطلوب' : 'Client name is required');
        return;
      }
      const newClient = dbInstance.addClient(
        newClientData.name,
        newClientData.nameAr || newClientData.name,
        newClientData.phone,
        newClientData.email,
        newClientData.clientType
      );
      targetClientId = newClient.id;
      targetClientName = newClient.name;
    } else {
      const selectedClient = clients.find(c => c.id === quoteForm.clientId);
      if (!selectedClient) {
        alert(isRtl ? 'يرجى اختيار عميل من القائمة أو إضافة عميل جديد' : 'Please select a client or add a new one');
        return;
      }
      targetClientId = selectedClient.id;
      targetClientName = selectedClient.name;
    }

    if (!quoteForm.items || quoteForm.items.length === 0) {
      alert(isRtl ? 'يجب إدخال بند واحد على الأقل في عرض السعر' : 'At least one line item is required');
      return;
    }

    for (const item of quoteForm.items) {
      if (!item.description) {
        alert(isRtl ? 'برجاء إدخال وصف الخدمة لجميع البنود' : 'Please fill service description for all items');
        return;
      }
      if (item.unitPrice < 0) {
        alert(isRtl ? 'سعر البند يجب أن يكون صفر أو أكثر' : 'Unit price must be zero or positive');
        return;
      }
    }

    const payload = {
      clientId: targetClientId,
      clientName: targetClientName,
      clientType: quoteForm.clientType,
      companyName: quoteForm.clientType === 'company' ? quoteForm.companyName : '',
      contactPerson: quoteForm.contactPerson,
      clientPhone: quoteForm.clientPhone,
      clientWhatsapp: quoteForm.clientWhatsapp,
      clientEmail: quoteForm.clientEmail,
      billingAddress: quoteForm.billingAddress,
      clientTaxNumber: quoteForm.clientTaxNumber,
      clientSource: quoteForm.clientSource,
      
      items: computedTotals.itemTotals,
      subtotal: computedTotals.subtotal,
      taxTotal: computedTotals.taxTotal,
      discountTotal: computedTotals.discountTotal,
      grandTotal: computedTotals.grandTotal,
      currency: quoteForm.currency,
      
      validUntil: quoteForm.validUntil,
      notes: quoteForm.clientNotes,
      internalNotes: quoteForm.internalNotes,
      clientReferenceNo: quoteForm.clientReferenceNo,
      salespersonId: quoteForm.salespersonId,
      salespersonName: quoteForm.salespersonName,
      
      shipmentRequired: quoteForm.shipmentRequired,
      deliveryMethod: quoteForm.deliveryMethod,
      recipientName: quoteForm.recipientName,
      recipientPhone: quoteForm.recipientPhone,
      deliveryAddress: quoteForm.deliveryAddress,
      city: quoteForm.city,
      country: quoteForm.country,
      deliveryNotes: quoteForm.deliveryNotes,
      deliveryFee: Number(quoteForm.deliveryFee) || 0,
      
      deadline: quoteForm.deadline,
      estimatedCompletion: quoteForm.estimatedCompletion,
      turnaroundTime: quoteForm.turnaroundTime,
      urgencyStatus: quoteForm.urgencyStatus,
      urgencySurcharge: Number(quoteForm.urgencySurcharge) || 0,
      
      documentsToBeTranslated: quoteForm.documentsToBeTranslated,
      referenceDocuments: quoteForm.referenceDocuments,
      status: statusOverride || (quoteForm as any).status || 'created',
      
      fileName: quoteForm.items[0]?.description || 'Translation Services',
      serviceType: (quoteForm.items[0] as any)?.serviceType || 'translation',
      sourceLanguage: quoteForm.items[0]?.sourceLanguage || 'English',
      targetLanguage: quoteForm.items[0]?.targetLanguage || 'Arabic',
      wordCount: quoteForm.items.reduce((sum, item) => sum + (Number(item.wordCount) || 0), 0),
      amountEgp: quoteForm.currency === 'EGP' ? computedTotals.grandTotal : 0,
      amountAed: quoteForm.currency === 'AED' ? computedTotals.grandTotal : 0,
      amountUsd: quoteForm.currency === 'USD' ? computedTotals.grandTotal : 0,
    };

    if (editingQuoteId) {
      const existingIdx = dbInstance.quotations.findIndex(q => q.id === editingQuoteId);
      if (existingIdx !== -1) {
        dbInstance.quotations[existingIdx] = {
          ...dbInstance.quotations[existingIdx],
          ...payload,
        } as any;
        dbInstance.save();
        alert(isRtl ? 'تم تحديث عرض السعر بنجاح' : 'Quotation updated successfully');
      }
    } else {
      const newQuote = dbInstance.addQuotation(payload);
      dbInstance.checkAutomationTriggers('quotation_sent', { clientId: targetClientId });
      alert(isRtl ? 'تم إنشاء وحفظ عرض السعر بنجاح' : 'Quotation created successfully');
      handleSavePDF(newQuote);
    }

    setIsCreateModalOpen(false);
    setEditingQuoteId(null);
    resetQuoteWorkshopForm();
  };

  const handleRecordPayment = (invoice: Invoice) => {
    dbInstance.updateInvoiceStatus(invoice.id, 'paid');
    dbInstance.checkAutomationTriggers('invoice_paid', { clientId: invoice.clientId });
    alert(isRtl ? 'تم تسجيل الدفع وتحديث المرحلة تلقائياً' : 'Payment recorded and stage updated automatically');
  };

  const handleAddFileTrigger = (type: 'docs' | 'ref') => {
    setActiveUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeUploadType) return;

    const file = files[0];
    const newFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.name.split('.').pop() || 'pdf',
      url: URL.createObjectURL(file), // Real local URL for preview
      uploadedAt: new Date().toISOString()
    };

    if (activeUploadType === 'docs') {
      if (activeTab === 'quotes') {
        setQuoteForm(prev => ({ ...prev, documentsToBeTranslated: [...prev.documentsToBeTranslated, newFile] }));
      } else {
        setFormData(prev => ({ ...prev, documentsToBeTranslated: [...prev.documentsToBeTranslated, newFile] }));
      }
    } else {
      if (activeTab === 'quotes') {
        setQuoteForm(prev => ({ ...prev, referenceDocuments: [...prev.referenceDocuments, newFile] }));
      } else {
        setFormData(prev => ({ ...prev, referenceDocuments: [...prev.referenceDocuments, newFile] }));
      }
    }

    e.target.value = '';
    setActiveUploadType(null);
  };

  const handleModalProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setDepositProof({
          url: reader.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendWhatsApp = async (quote: Quotation) => {
    const client = clients.find(c => c.id === quote.clientId);
    const phone = client?.phone || (quote as any).clientWhatsapp || (quote as any).clientPhone || '';
    const text = `Hi ${quote.clientName}, please find our quotation ${quote.quoteNumber} for ${quote.grandTotal} ${quote.currency}.`;
    
    if (!phone) {
      alert(isRtl ? 'لم يتم العثور على رقم هاتف مسجل لهذا العميل.' : 'No registered phone number found for this client.');
      return;
    }

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
        dbInstance.updateQuotationStatus(quote.id, 'sent');
        alert(isRtl ? 'تم إرسال عرض السعر عبر واتساب بنجاح!' : 'Quotation alert sent successfully via WhatsApp!');
      } else {
        console.warn('WhatsApp API dispatch failed, falling back to manual link:', data.error);
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        dbInstance.updateQuotationStatus(quote.id, 'sent');
      }
    } catch (err) {
      console.error('WhatsApp API gateway down, falling back to manual link:', err);
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      dbInstance.updateQuotationStatus(quote.id, 'sent');
    }
  };

  const handleSendEmail = (quote: Quotation) => {
    const client = clients.find(c => c.id === quote.clientId);
    const emailTo = client?.email || (quote as any).clientEmail || '';
    const subject = `Pricing Proposal & Sizing Audit Quote: ${quote.quoteNumber}`;
    const body = `Dear ${quote.clientName},\n\nPlease find attached our official certified translation quotation ${quote.quoteNumber}.\n\nGrand Total: ${quote.grandTotal} ${quote.currency}\n\nWe look forward to collaborating with you.\n\nBest regards,\nQA Logistics Operations Team\n${dbInstance.brandConfig?.companyName || 'Globalize Translation'}`;
    
    setEmailModal({
      isOpen: true,
      quote,
      to: emailTo,
      subject,
      body,
      sending: false
    });
  };

  const handlePrint = (quote: Quotation) => {
    alert(isRtl ? `جاري تجهيز ${quote.quoteNumber} للطباعة...` : `Preparing ${quote.quoteNumber} for printing...`);
    window.print();
  };

  const handleSavePDF = async (quote: Quotation) => {
    const brand = dbInstance.brandConfig || dbInstance.getEmptyBrandConfig();
    try {
      await downloadQuotation(quote, brand, isRtl);
    } catch (err) {
      console.error(err);
      alert(isRtl ? 'حدث خطأ أثناء تحميل الملف' : 'An error occurred while exporting the PDF.');
    }
  };

  const submitSendEmail = async () => {
    if (!emailModal.quote) return;
    if (!emailModal.to || !emailModal.to.includes('@')) {
      alert(isRtl ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid recipient email address.');
      return;
    }

    setEmailModal(prev => ({ ...prev, sending: true }));
    try {
      const brand = dbInstance.brandConfig || dbInstance.getEmptyBrandConfig();
      const pdfBlob = await generateQuotationPDF(emailModal.quote, brand, isRtl);
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      const clientNameClean = (emailModal.quote.clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Quotation-${emailModal.quote.quoteNumber}-${clientNameClean}.pdf`;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dbInstance.getAuthToken()}`
        },
        body: JSON.stringify({
          to: emailModal.to,
          subject: emailModal.subject,
          text: emailModal.body,
          html: `<div style="font-family: sans-serif; font-size: 14px; color: #374151; line-height: 1.6;">
            <p>${emailModal.body.replace(/\n/g, '<br>')}</p>
          </div>`,
          attachments: [
            {
              filename,
              content: pdfBase64,
              contentType: 'application/pdf'
            }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send email.');
      }

      dbInstance.updateQuotationStatus(emailModal.quote.id, 'sent');
      alert(isRtl ? 'تم إرسال عرض السعر المعتمد بنجاح مع الملف المرفق!' : 'Official quotation proposal sent successfully with attached PDF document!');
      setEmailModal(prev => ({ ...prev, isOpen: false, quote: null }));
    } catch (err: any) {
      console.error(err);
      alert(isRtl ? `فشل إرسال البريد: ${err.message}` : `SMTP Delivery failed: ${err.message}`);
    } finally {
      setEmailModal(prev => ({ ...prev, sending: false }));
    }
  };

  const resetForm = () => {
    setIsAddingNewClient(false);
    setNewClientData({
        name: '',
        nameAr: '',
        phone: '',
        email: '',
        clientType: 'individual'
    });
    setFormData({
      clientId: '',
      clientName: '',
      fileName: '',
      serviceType: 'translation',
      sourceLanguage: 'English',
      targetLanguage: 'Arabic',
      wordCount: 0,
      amountEgp: 0,
      amountAed: 0,
      amountUsd: 0,
      notes: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      documentsToBeTranslated: [],
      referenceDocuments: [],
    });
  };

  return (
    <div className={`flex flex-col gap-6 ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}>
      {/* Header Area */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <ShoppingBag size={80} />
          </div>
          <div className="space-y-1 relative">
            <h2 className="text-2xl font-black text-brand-navy tracking-tight">
              {isRtl ? 'مركز المبيعات والفوترة' : 'Sales & Billing Hub'}
            </h2>
            <p className="text-sm text-brand-text-muted font-medium">
              {isRtl ? 'إدارة عروض الأسعار، الفواتير، وطلبات الشراء' : 'Professional management of quotations, invoices, and purchase orders.'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-brand-navy-light p-1 rounded-xl relative">
            <button
              onClick={() => setActiveTab('quotes')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'quotes' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy opacity-60 hover:opacity-100'
              }`}
            >
              <FileText size={14} /> {isRtl ? 'عروض الأسعار' : 'Quotations'}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'invoices' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy opacity-60 hover:opacity-100'
              }`}
            >
              <Receipt size={14} /> {isRtl ? 'الفواتير' : 'Invoices'}
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'pos' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy opacity-60 hover:opacity-100'
              }`}
            >
              <FileCheck size={14} /> {isRtl ? 'طلبات الشراء' : 'Purchase Orders'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Controls */}
        <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy-dark opacity-40" size={16} />
             <input 
               type="text"
               placeholder={isRtl ? 'بحث في السجلات...' : 'Search records...'}
               className="w-full pl-10 pr-4 py-2 bg-brand-bg border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy transition-all"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto">
             <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-brand-bg border border-zinc-200 rounded-xl text-xs font-bold hover:bg-brand-navy-light transition-all text-brand-navy">
                <Filter size={14} /> {isRtl ? 'تصفية' : 'Filters'}
             </button>
             <button 
                onClick={() => {
                  if (activeTab === 'quotes') {
                    resetQuoteWorkshopForm();
                    setEditingQuoteId(null);
                  }
                  setIsCreateModalOpen(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-brand-navy text-white rounded-xl text-xs font-black shadow-lg shadow-brand-navy-dark/10 active:scale-95 transition-all hover:bg-brand-navy-hover"
             >
               <Plus size={14} /> {isRtl ? 'إضافة جديد' : 'Create New'}
             </button>
           </div>
        </div>

        {/* Dynamic Table Content */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] text-zinc-400 uppercase font-black tracking-widest">
                <th className="px-8 py-5">{isRtl ? 'الرقم' : 'Reference'}</th>
                <th className="px-8 py-5">{isRtl ? 'العميل' : 'Client'}</th>
                <th className="px-8 py-5">{isRtl ? 'التاريخ' : 'Date'}</th>
                <th className="px-8 py-5 text-right">{isRtl ? 'المبلغ الإجمالي' : 'Total Amount'}</th>
                <th className="px-8 py-5 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {activeTab === 'quotes' && filteredQuotes.map((q) => (
                <tr key={q.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-8 py-5 font-mono font-bold text-zinc-900">{q.quoteNumber}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-zinc-900">{q.clientName}</p>
                      {(q.documentsToBeTranslated?.length > 0 || q.referenceDocuments?.length > 0) && (
                        <div className="flex items-center gap-1 text-[9px] bg-brand-navy-light px-1.5 py-0.5 rounded text-brand-navy font-bold">
                          <Paperclip size={10} />
                          {(q.documentsToBeTranslated?.length || 0) + (q.referenceDocuments?.length || 0)}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Valid until: {q.validUntil}
                      {q.status === 'cancelled' && q.cancellationReason && (
                        <span className="text-red-500 italic block mt-0.5">Cancel Reason: {q.cancellationReason}</span>
                      )}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-zinc-500 font-medium">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="px-8 py-5 text-right font-black text-zinc-900">
                    <div>
                      {Number(q.grandTotal || (q.amountEgp || q.amountAed || q.amountUsd) || 0).toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal ml-0.5">{q.currency || 'EGP'}</span>
                    </div>
                    {q.depositAmount > 0 && (
                      <div className="text-[10px] text-zinc-400 mt-1">
                        <span className="text-emerald-600 font-bold">-{Number(q.depositAmount).toLocaleString()}</span>
                        <span className="mx-1">/</span>
                        <span className="text-red-600 font-black">Bal: {Number(q.depositBalance).toLocaleString()}</span>
                        {q.depositProofUrl && (
                          <div className="mt-1 flex justify-end">
                            <button
                              onClick={() => setProofPreview({ isOpen: true, url: q.depositProofUrl!, name: q.depositProofName || 'payment_proof' })}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[8px] font-extrabold transition-all border border-indigo-150 cursor-pointer"
                              title={isRtl ? 'عرض وتحميل إثبات الدفع' : 'View & Download payment proof'}
                            >
                              <Receipt size={9} className="text-indigo-600 animate-pulse shrink-0" />
                              <span>{isRtl ? 'إثبات الدفع' : 'Proof'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center flex-col items-center gap-1">
                      <StatusBadge status={q.status} />
                      {(q.status === 'confirmed' || q.status === 'converted') && q.depositBalance > 0 && (
                        <button 
                          onClick={() => {
                            setDepositProof(null);
                            setDepositModal({ isOpen: true, quoteId: q.id, amount: 0, method: 'cash' });
                          }}
                          className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                        >
                          + {isRtl ? 'إيداع' : 'Deposit'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {activeTab === 'quotes' && (
                         <>
                           <button 
                             onClick={() => setSelectedQuoteId(q.id)}
                             className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-900 font-bold text-[10px] uppercase tracking-tighter flex items-center gap-1 transition-all"
                             title={isRtl ? 'معاينة الخطاب المعتمد' : 'Official Letterhead'}
                           >
                             <FileStack size={14} />
                           </button>
                           
                           <button 
                             onClick={() => handleEditClick(q)}
                             className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-all"
                             title={isRtl ? 'تعديل العرض بالتفصيل' : 'Edit Detailed Workshop'}
                           >
                             <Edit size={14} />
                           </button>

                           <button 
                             onClick={() => {
                               const { id, quoteNumber, createdAt, status, depositAmount, depositBalance, ...payload } = q;
                               const duplicated = dbInstance.addQuotation({
                                 ...payload,
                                 status: 'created',
                                 depositAmount: 0,
                                 depositBalance: 0,
                               });
                               alert(isRtl ? `تم استنساخ العرض بنجاح برقم: ${duplicated.quoteNumber}` : `Quotation duplicated successfully as ${duplicated.quoteNumber}`);
                             }}
                             className="p-2 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-all"
                             title={isRtl ? 'تكرار واستنساخ' : 'Duplicate Draft'}
                           >
                             <Copy size={14} />
                           </button>

                           {q.status !== 'confirmed' && q.status !== 'cancelled' && q.status !== 'converted' && (
                             <>
                               <button 
                                 onClick={() => {
                                   setDepositProof(null);
                                   setApproveConfirmModal({
                                     isOpen: true,
                                     quoteId: q.id,
                                     hasPaidDeposit: 'no',
                                     depositAmount: 0,
                                     paymentMethod: 'cash',
                                   });
                                 }}
                                 className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all"
                                 title={isRtl ? 'موافقة العميل' : 'Mark as Approved'}
                               >
                                 <Check size={16} />
                               </button>
                               <button 
                                 onClick={() => setCancelModal({ isOpen: true, quoteId: q.id, reason: '' })}
                                 className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                 title={isRtl ? 'إلغاء العرض والصفقة' : 'Cancel/Reject'}
                               >
                                 <Ban size={16} />
                               </button>
                             </>
                           )}

                           {(q.status === 'confirmed' || q.status === 'sent') && !q.convertedToInvoiceId && (
                             <button 
                               onClick={() => {
                                 const inv = dbInstance.convertQuotationToInvoice(q.id);
                                 alert(isRtl ? `تم إصدار الفاتورة المعتمدة رقم: ${inv.invoiceNumber}` : `Invoice ${inv.invoiceNumber} created and linked.`);
                               }}
                               className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all animate-pulse"
                               title={isRtl ? 'تحويل إلى فاتورة' : 'Convert directly to Invoice'}
                             >
                               <Receipt size={14} />
                             </button>
                           )}

                           <button 
                             onClick={() => handleSendWhatsApp(q)}
                             className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-all"
                             title={isRtl ? 'مشاركة عبر واتساب' : 'Share WhatsApp'}
                           >
                             <MessageCircle size={14} />
                           </button>
                           
                           <button 
                             onClick={() => handleSendEmail(q)}
                             className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                             title={isRtl ? 'إرسال بريد رسمي' : 'Send Official Email'}
                           >
                             <Mail size={14} />
                           </button>
                           
                           <button 
                             onClick={() => handlePrint(q)}
                             className="p-2 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-all"
                             title={isRtl ? 'طباعة سريعة' : 'Print View'}
                           >
                             <Printer size={14} />
                           </button>
                         </>
                       )}
                       <button onClick={() => activeTab === 'quotes' ? handleSavePDF(q) : null} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all"><Download size={14} /></button>
                       <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all"><MoreHorizontal size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}

              {activeTab === 'invoices' && filteredInvoices.map((i) => (
                <tr key={i.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-8 py-5 font-mono font-bold text-zinc-900">{i.invoiceNumber}</td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-zinc-900">{i.clientName}</p>
                    <p className="text-[10px] text-zinc-400 font-medium">Due: {i.dueDate}</p>
                  </td>
                  <td className="px-8 py-5 text-zinc-500 font-medium">{i.invoiceDate}</td>
                  <td className="px-8 py-5 text-right font-black text-zinc-900">
                    {i.grandTotal.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal ml-0.5">{i.currency}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center">
                      <StatusBadge status={i.status} />
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                         onClick={() => handleRecordPayment(i)}
                         className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-[10px] font-bold hover:bg-zinc-800 transition-all cursor-pointer"
                       >
                         {isRtl ? 'تسجيل الدفع' : 'Record Payment'}
                       </button>
                       <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-all"><MoreHorizontal size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal / Quotation Workshop */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-4">
          {activeTab === 'invoices' ? (
            /* Traditional Invoice Container style */
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-brand-bg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center text-white">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-navy tracking-tight">
                      {isRtl ? 'إنشاء فاتورة جديدة' : 'Create New Invoice'}
                    </h3>
                    <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Globalize ERP System</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-brand-text-muted hover:text-brand-navy"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-4 bg-brand-bg p-4 rounded-2xl border border-zinc-100">
                    <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black text-brand-navy opacity-50 uppercase tracking-widest">{isRtl ? 'العميل' : 'Client Account'}</label>
                         <button 
                            type="button"
                            onClick={() => setIsAddingNewClient(!isAddingNewClient)}
                            className="text-[10px] font-black text-brand-navy hover:underline"
                         >
                            {isAddingNewClient ? (isRtl ? 'اختر من القائمة' : 'Select existing') : (isRtl ? '+ إضافة عميل جديد' : '+ Create new client')}
                         </button>
                    </div>

                    {!isAddingNewClient ? (
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <select 
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900 transition-all appearance-none"
                                value={formData.clientId}
                                onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                            >
                                <option value="">{isRtl ? 'اختر العميل...' : 'Select Client...'}</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                             <div className="grid grid-cols-2 gap-4">
                                <input 
                                    required
                                    type="text"
                                    placeholder={isRtl ? 'اسم العميل...' : 'Client Name...'}
                                    className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none"
                                    value={newClientData.name}
                                    onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                                />
                                <input 
                                    type="text"
                                    placeholder={isRtl ? 'رقم الهاتف...' : 'Phone Number...'}
                                    className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none"
                                    value={newClientData.phone}
                                    onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                                />
                             </div>
                        </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'اسم الملف / المشروع' : 'Project / File Name'}</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none"
                      placeholder="Legal_Draft_01.pdf"
                      value={formData.fileName}
                      onChange={(e) => setFormData({...formData, fileName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total EGP Amount</label>
                    <input 
                      type="number"
                      required
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono font-bold outline-none"
                      value={formData.amountEgp || ''}
                      onChange={(e) => setFormData({...formData, amountEgp: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-brand-text-muted hover:bg-brand-bg"
                  >
                    {isRtl ? 'إلغاء' : 'Discard'}
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-brand-navy text-white rounded-xl text-sm font-black shadow-xl"
                  >
                    <Save size={16} /> {isRtl ? 'تأكيد الحفظ' : 'Finalize Record'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* MAJESTIC PORTABLE DUAL-PANEL TRANSLATION QUOTATION WORKSHOP */
            <div className="bg-zinc-50 w-full h-full md:h-[95vh] md:max-w-[95%] rounded-none md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-zinc-200/50">
              
              {/* Workshop Title Bar Toolbar */}
              <div className="p-4 bg-brand-navy text-white border-b border-brand-navy-dark flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                    <Globe size={22} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                      {isRtl ? 'ورشة إعداد عروض الأسعار المعتمدة' : 'Official Translation Quotation Workshop'}
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {editingQuoteId ? `${isRtl ? 'تعديل مسودة' : 'Editing Mode'} (${editingQuoteId})` : (isRtl ? 'مسودة جديدة' : 'New Design Draft')}
                      </span>
                    </h2>
                    <p className="text-[10px] text-zinc-300 font-medium">{brand.companyName || ''}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSubmitQuote('created')}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all border border-zinc-700/50"
                  >
                    <Save size={14} /> {isRtl ? 'حفظ كمسودة مؤقتة' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => handleSubmitQuote('sent')}
                    className="flex items-center gap-2 px-5 py-2 bg-brand-gold text-brand-navy text-xs font-black rounded-xl hover:bg-brand-gold-hover transition-all shadow-lg shadow-brand-gold/10"
                  >
                    <Send size={14} /> {isRtl ? 'اعتماد وإرسال للعميل' : 'Issue & Send'}
                  </button>
                  <button 
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingQuoteId(null);
                      resetQuoteWorkshopForm();
                    }}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all text-zinc-300 hover:text-white"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              {/* Main Workspace Body Screen */}
              <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 overflow-hidden bg-zinc-100">
                
                {/* 1. Left Configurator Form Panel */}
                <div className="xl:col-span-7 h-full overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
                  
                  {/* GROUP A: CLIENT INFORMATION */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-2 text-brand-navy">
                        <Users size={16} />
                        <h4 className="font-extrabold text-xs uppercase tracking-wide">{isRtl ? 'علاقات عملاء الأنشطة والاتصال' : 'Client Relations & Referral'}</h4>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsAddingNewClient(!isAddingNewClient)}
                        className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {isAddingNewClient ? `← ${isRtl ? 'اختيار عميل مسجل' : 'Select Registered'}` : `+ ${isRtl ? 'عميل جديد تماماً' : 'Add Brand New Client'}`}
                      </button>
                    </div>

                    {!isAddingNewClient ? (
                      <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1.5">{isRtl ? 'العميل المسجل' : 'Select Existing CRM Client'}</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-navy appearance-none cursor-pointer"
                          value={quoteForm.clientId}
                          onChange={(e) => {
                            const found = clients.find(c => c.id === e.target.value);
                            if (found) {
                              setQuoteForm(prev => ({
                                ...prev,
                                clientId: found.id,
                                clientName: found.name,
                                clientEmail: found.email || '',
                                clientPhone: found.phone || '',
                                clientWhatsapp: found.phone || '',
                                companyName: found.clientType === 'company' ? found.name : '',
                                clientType: found.clientType === 'company' ? 'company' : 'individual',
                                billingAddress: (found as any).address || '',
                              }));
                            }
                          }}
                        >
                          <option value="">{isRtl ? 'اختر العميل من السجلات الذكية...' : 'Choose from intelligent client records...'}</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.nameAr ? `(${c.nameAr})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 bg-amber-50/20 border border-amber-200/50 rounded-xl animate-in slide-in-from-top-1 text-xs">
                        <p className="font-bold text-amber-800 mb-1">{isRtl ? 'تسجيل عميل جديد على CRM:' : 'Create details for a new CRM Account:'}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">{isRtl ? 'الاسم الثنائي/الثلاثي' : 'Full Name'}</label>
                            <input 
                              type="text"
                              value={newClientData.name}
                              onChange={e => {
                                setNewClientData(p => ({ ...p, name: e.target.value }));
                                setQuoteForm(p => ({ ...p, clientName: e.target.value }));
                              }}
                              className="w-full mt-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg"
                              placeholder="e.g. Arab Contractors Egypt"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">{isRtl ? 'الاسم باللغة العربية' : 'Arabic Translation Name'}</label>
                            <input 
                              type="text"
                              value={newClientData.nameAr}
                              onChange={e => setNewClientData(p => ({ ...p, nameAr: e.target.value }))}
                              className="w-full mt-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg"
                              placeholder="e.g. المقاولون العرب بمصر"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">{isRtl ? 'الهاتف المحمول' : 'Phone'}</label>
                            <input 
                              type="text"
                              value={newClientData.phone}
                              onChange={e => {
                                setNewClientData(p => ({ ...p, phone: e.target.value }));
                                setQuoteForm(p => ({ ...p, clientPhone: e.target.value, clientWhatsapp: e.target.value }));
                              }}
                              className="w-full mt-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">Email</label>
                            <input 
                              type="email"
                              value={newClientData.email}
                              onChange={e => {
                                setNewClientData(p => ({ ...p, email: e.target.value }));
                                setQuoteForm(p => ({ ...p, clientEmail: e.target.value }));
                              }}
                              className="w-full mt-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase">Account Category</label>
                            <select
                              value={newClientData.clientType}
                              onChange={e => {
                                const val = e.target.value as any;
                                setNewClientData(p => ({ ...p, clientType: val }));
                                setQuoteForm(p => ({ ...p, clientType: val === 'company' ? 'company' : 'individual' }));
                              }}
                              className="w-full mt-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg"
                            >
                              <option value="individual">Individual</option>
                              <option value="company">Corporate Entity</option>
                              <option value="agency">Agency / Courier</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detailed Metadata fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">{isRtl ? 'الفئة القانونية للعميل' : 'Client Classification'}</label>
                        <select 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                          value={quoteForm.clientType}
                          onChange={e => setQuoteForm(prev => ({ ...prev, clientType: e.target.value as any }))}
                        >
                          <option value="individual">Individual / Regular Person</option>
                          <option value="company">Company / Legal Institution</option>
                        </select>
                      </div>

                      {quoteForm.clientType === 'company' && (
                        <div>
                          <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">{isRtl ? 'اسم الشركة / الهيئة الرسمية' : 'Tax Registered Company Name'}</label>
                          <input 
                            type="text"
                            value={quoteForm.companyName}
                            onChange={e => setQuoteForm(prev => ({ ...prev, companyName: e.target.value }))}
                            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                            placeholder="e.g. Cairo Petroleum Inc"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">{isRtl ? 'قناة التواصل / المصدر' : 'Lead Intake Channel'}</label>
                        <select 
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                          value={quoteForm.clientSource}
                          onChange={e => setQuoteForm(prev => ({ ...prev, clientSource: e.target.value }))}
                        >
                          <option value="whatsapp">WhatsApp Business</option>
                          <option value="email">Direct Official Email</option>
                          <option value="phone">Direct Phone Intake</option>
                          <option value="website">Online Web Portal</option>
                          <option value="walk_in">Walk-In Office Visit</option>
                          <option value="referral">Affiliate Referral</option>
                          <option value="google_ads">Google AdWords Lead</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">{isRtl ? 'الرقم الضريبي الموحد للهيئات' : 'Corporate Tax / VAT Registration'}</label>
                        <input 
                          type="text"
                          value={quoteForm.clientTaxNumber}
                          onChange={e => setQuoteForm(prev => ({ ...prev, clientTaxNumber: e.target.value }))}
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                          placeholder="e.g. 441-209-110"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">{isRtl ? 'البريد الإلكتروني للإرسال' : 'Delivery Email'}</label>
                        <input 
                          type="email"
                          value={quoteForm.clientEmail}
                          onChange={e => setQuoteForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">{isRtl ? 'رقم هاتف الاتصال' : 'Client Phone'}</label>
                        <input 
                          type="text"
                          value={quoteForm.clientPhone}
                          onChange={e => setQuoteForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">{isRtl ? 'رقم الواتساب المتزامن' : 'Client WhatsApp Link'}</label>
                        <input 
                          type="text"
                          value={quoteForm.clientWhatsapp}
                          onChange={e => setQuoteForm(prev => ({ ...prev, clientWhatsapp: e.target.value }))}
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GROUP B: ITEMIZED TRANSLATION ITEMS & PRICING ENGINE */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-2 text-brand-navy">
                        <FileText size={16} />
                        <h4 className="font-extrabold text-xs uppercase tracking-wide">{isRtl ? 'تفاصيل السعر والترجمة المعتمدة' : 'Line Items & Translation Sizing Engine'}</h4>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newItem = {
                            id: `draft-item-${Date.now()}`,
                            description: '',
                            sourceLanguage: 'English',
                            targetLanguage: 'Arabic',
                            unit: 'word' as any,
                            unitPrice: 0.25,
                            wordCountAvailable: true,
                            wordCount: 1000,
                            manualPages: 4,
                            isEstimatedPages: false,
                            estimateReason: '',
                            quantity: 1,
                            discountType: 'none' as any,
                            discountValue: 0,
                            total: 250
                          };
                          setQuoteForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
                        }}
                        className="text-[10px] font-black text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-xl transition-all border border-emerald-100 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> {isRtl ? 'إضافة ملف/بند ترجمة آخر' : 'Add Translation File Item'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {quoteForm.items.map((item, index) => {
                        return (
                          <div key={item.id} className="p-4 bg-zinc-55 bg-zinc-50/50 rounded-2xl border border-zinc-200 relative space-y-4 shadow-sm hover:border-zinc-300 transition-colors">
                            
                            {/* Delete line action */}
                            <button 
                              type="button" 
                              onClick={() => {
                                setQuoteForm(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }));
                              }}
                              className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title={isRtl ? 'حذف البند' : 'Remove Line Item'}
                            >
                              <Trash2 size={14} />
                            </button>

                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold text-xs">
                                {index + 1}
                              </span>
                              <p className="text-[11px] font-black text-brand-navy tracking-tight">{isRtl ? `ملف أو مستند رقم ${index+1}` : `Translation Sizing Record #${index + 1}`}</p>
                            </div>

                            {/* Row Input Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              <div className="md:col-span-6 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">{isRtl ? 'اسم المستند أو وصف البند' : 'File Name or Service Statement'}</label>
                                <input 
                                  type="text" 
                                  value={item.description || ''}
                                  onChange={e => {
                                    const updated = [...quoteForm.items];
                                    updated[index].description = e.target.value;
                                    setQuoteForm(prev => ({ ...prev, items: updated }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                                  placeholder="e.g. Birth-Certificate-Ministry-Stamp.docx"
                                  required
                                />
                              </div>

                              <div className="md:col-span-3 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">{isRtl ? 'من لغة' : 'Source Language'}</label>
                                <input 
                                  type="text" 
                                  value={item.sourceLanguage || ''}
                                  onChange={e => {
                                    const updated = [...quoteForm.items];
                                    updated[index].sourceLanguage = e.target.value;
                                    setQuoteForm(prev => ({ ...prev, items: updated }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                                  placeholder="English"
                                />
                              </div>

                              <div className="md:col-span-3 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">{isRtl ? 'إلى لغة' : 'Target Language'}</label>
                                <input 
                                  type="text" 
                                  value={item.targetLanguage || ''}
                                  onChange={e => {
                                    const updated = [...quoteForm.items];
                                    updated[index].targetLanguage = e.target.value;
                                    setQuoteForm(prev => ({ ...prev, items: updated }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                                  placeholder="Arabic"
                                />
                              </div>
                            </div>

                            {/* SCENARIO A vs SCENARIO B CHOICE METRIC: SCENARIO SELECTION */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1 items-center">
                              
                              {/* Scenario Toggle */}
                              <div className="md:col-span-4 flex items-center gap-2">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block">{isRtl ? 'حالة عد الكلمات' : 'Size Metric:'}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...quoteForm.items];
                                    updated[index].wordCountAvailable = !updated[index].wordCountAvailable;
                                    updated[index].unit = updated[index].wordCountAvailable ? 'word' : 'page';
                                    setQuoteForm(prev => ({ ...prev, items: updated }));
                                  }}
                                  className={`px-2 py-1 text-[9px] font-black rounded-lg transition-all border ${
                                    item.wordCountAvailable 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200/50'
                                  }`}
                                >
                                  {item.wordCountAvailable 
                                    ? (isRtl ? 'السيناريو أ: العداد متاح' : 'Scenario A: Word Count') 
                                    : (isRtl ? 'السيناريو ب: تقدير ورقي' : 'Scenario B: Scanned/No Word Count')
                                  }
                                </button>
                              </div>

                              {/* Pricing Metrics Input fields mapping per scenario */}
                              {item.wordCountAvailable ? (
                                /* Scenario A: Word Count */
                                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1">
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase block">{isRtl ? 'عدد الكلمات' : 'Word Count'}</label>
                                    <input 
                                      type="number" 
                                      value={item.wordCount || ''}
                                      onChange={e => {
                                        const updated = [...quoteForm.items];
                                        updated[index].wordCount = parseInt(e.target.value) || 0;
                                        setQuoteForm(prev => ({ ...prev, items: updated }));
                                      }}
                                      className="w-full mt-0.5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs text-mono font-bold"
                                      placeholder="e.g. 1500"
                                    />
                                    <span className="text-[8px] text-zinc-400 font-bold tracking-tight">
                                      = {Math.ceil((item.wordCount || 0) / 250)} {isRtl ? 'صفحات تقديرية' : 'calculated pages'}
                                    </span>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase block">Billing Unit Type</label>
                                    <select
                                      value={item.unit}
                                      onChange={e => {
                                        const updated = [...quoteForm.items];
                                        updated[index].unit = e.target.value as any;
                                        setQuoteForm(prev => ({ ...prev, items: updated }));
                                      }}
                                      className="w-full mt-0.5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
                                    >
                                      <option value="word">Per Word (0.25 standard)</option>
                                      <option value="page">Per Page (calculated)</option>
                                      <option value="project">Flat Case Bill</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase block">Unit Price ({quoteForm.currency})</label>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={item.unitPrice || ''}
                                      onChange={e => {
                                        const updated = [...quoteForm.items];
                                        updated[index].unitPrice = parseFloat(e.target.value) || 0;
                                        setQuoteForm(prev => ({ ...prev, items: updated }));
                                      }}
                                      className="w-full mt-0.5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs text-mono font-bold"
                                      placeholder="0.25"
                                    />
                                  </div>
                                </div>
                              ) : (
                                /* Scenario B: Manual Page Sizing (Scanned Image/Unreadable PDF) */
                                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1 text-xs">
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase block">{isRtl ? 'عدد الصفحات التقديري' : 'Estimated Pages'}</label>
                                    <input 
                                      type="number" 
                                      value={item.manualPages || ''}
                                      onChange={e => {
                                        const updated = [...quoteForm.items];
                                        updated[index].manualPages = parseInt(e.target.value) || 0;
                                        updated[index].isEstimatedPages = true;
                                        setQuoteForm(prev => ({ ...prev, items: updated }));
                                      }}
                                      className="w-full mt-0.5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
                                      placeholder="e.g. 5"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase block">Unit Selector</label>
                                    <select
                                      value={item.unit}
                                      onChange={e => {
                                        const updated = [...quoteForm.items];
                                        updated[index].unit = e.target.value as any;
                                        setQuoteForm(prev => ({ ...prev, items: updated }));
                                      }}
                                      className="w-full mt-0.5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
                                    >
                                      <option value="page">Per Page (Manual)</option>
                                      <option value="project">Per Project</option>
                                      <option value="certificate">Per Legal Certificate</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase block">{isRtl ? 'سعر الوحدة' : 'Price per Unit'}</label>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={item.unitPrice || ''}
                                      onChange={e => {
                                        const updated = [...quoteForm.items];
                                        updated[index].unitPrice = parseFloat(e.target.value) || 0;
                                        setQuoteForm(prev => ({ ...prev, items: updated }));
                                      }}
                                      className="w-full mt-0.5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs text-mono font-bold"
                                      placeholder="150"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Additional Reason required for Scenario B */}
                            {!item.wordCountAvailable && (
                              <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-xs text-amber-900 animate-in slide-in-from-top-1">
                                <label className="text-[8px] font-black text-amber-800 uppercase block mb-1">Mandatory Estimate Reason Note (Invisible to Client):</label>
                                <input 
                                  type="text"
                                  value={item.estimateReason || ''}
                                  onChange={e => {
                                    const updated = [...quoteForm.items];
                                    updated[index].estimateReason = e.target.value;
                                    setQuoteForm(prev => ({ ...prev, items: updated }));
                                   }}
                                  className="w-full px-3 py-1 bg-white border border-amber-100 rounded-lg text-xs"
                                  placeholder="e.g. Low-res camera PDF scans, stamped seals, and handwriting"
                                  required
                                />
                              </div>
                            )}

                          </div>
                        );
                      })}

                      {quoteForm.items.length === 0 && (
                        <div className="p-8 text-center bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                          <AlertTriangle className="mx-auto text-zinc-300 mb-2" size={32} />
                          <p className="text-xs font-bold font-sans">{isRtl ? 'لا يوجد بنود تسعير حالياً. أضف بنداً للمتابعة.' : 'No line items configured. Please insert a line item to build the quote.'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GROUP C: DISCOUNT, TAX/VAT & PRICING POLISHES */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-brand-navy border-b border-zinc-100 pb-2">
                      <Percent size={16} />
                      <h4 className="font-extrabold text-xs uppercase tracking-wide">{isRtl ? 'الخصومات وضريبة القيمة المضافة والشحنات ' : 'Global Discounts, TAX/VAT & Urgency Options'}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-600 font-medium">
                      
                      {/* Sub-group 1: Discount Options */}
                      <div className="bg-zinc-50 p-4 rounded-2xl space-y-3 border border-zinc-100">
                        <p className="font-extrabold text-brand-navy italic mb-1">{isRtl ? 'الخصومات والعروض الترويجية' : 'Promo / Discount Strategy'}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 block mb-1">Discount Type</label>
                            <select 
                              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs"
                              value={quoteForm.discountType}
                              onChange={e => setQuoteForm(prev => ({ ...prev, discountType: e.target.value as any }))}
                            >
                              <option value="none">No Discount</option>
                              <option value="fixed">Fixed Cash Amount</option>
                              <option value="percentage">Percentage %</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 block mb-1">Discount Value</label>
                            <input 
                              type="number"
                              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs"
                              value={quoteForm.discountValue || ''}
                              onChange={e => setQuoteForm(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                              disabled={quoteForm.discountType === 'none'}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        {quoteForm.discountType !== 'none' && (
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 block mb-1">Reason for Discount:</label>
                            <input 
                              type="text"
                              className="w-full p-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                              value={quoteForm.discountReason}
                              onChange={e => setQuoteForm(prev => ({ ...prev, discountReason: e.target.value }))}
                              placeholder="e.g. Loyal Client, Winter Campaign"
                            />
                          </div>
                        )}
                      </div>

                      {/* Sub-group 2: VAT Tax Option */}
                      <div className="bg-zinc-50 p-4 rounded-2xl space-y-3 border border-zinc-100">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-brand-navy italic">{isRtl ? 'ضريبة القيمة المضافة أو الضرائب الرسمية' : 'Official VAT & Surcharges'}</p>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={quoteForm.taxEnabled}
                              onChange={e => setQuoteForm(prev => ({ ...prev, taxEnabled: e.target.checked }))}
                              className="rounded border-zinc-300 text-brand-navy focus:ring-brand-navy w-4 h-4"
                            />
                            <span className="text-[10px] font-bold">{isRtl ? 'تمكين القيمة المضافة' : 'Apply VAT (14%)'}</span>
                          </label>
                        </div>
                        
                        {quoteForm.taxEnabled && (
                          <div className="grid grid-cols-2 gap-2 animate-in zoom-in-95">
                            <div>
                              <label className="text-[9px] font-bold text-zinc-400 block mb-1">VAT Percentage</label>
                              <input 
                                type="number" 
                                className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs"
                                value={quoteForm.taxRate}
                                onChange={e => setQuoteForm(prev => ({ ...prev, taxRate: parseInt(e.target.value) || 0 }))}
                              />
                            </div>
                            <div className="flex flex-col justify-end">
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                {isRtl ? 'ضريبة معتمدة لمصر:' : 'Tax compliant (14%)'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/50">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 block mb-1">Urgency Priority</label>
                            <select 
                              className="w-full p-1.5 bg-white border border-zinc-200 rounded-lg text-[10px]"
                              value={quoteForm.urgencyStatus}
                              onChange={e => setQuoteForm(prev => ({ ...prev, urgencyStatus: e.target.value as any }))}
                            >
                              <option value="normal">Normal Turnaround</option>
                              <option value="urgent">Urgent Priority</option>
                              <option value="same_day">Same-Day Rush Loop</option>
                              <option value="express">Express Overnight Dispatch</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 block mb-1">Urgency Surcharge ({quoteForm.currency})</label>
                            <input 
                              type="number"
                              className="w-full p-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                              value={quoteForm.urgencySurcharge || ''}
                              onChange={e => setQuoteForm(prev => ({ ...prev, urgencySurcharge: parseFloat(e.target.value) || 0 }))}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* GROUP D: COURIER SHIPMENTS & COURIER DISPATCH */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div className="flex items-center gap-2 text-brand-navy">
                        <Landmark size={16} />
                        <h4 className="font-extrabold text-xs uppercase tracking-wide">{isRtl ? 'الشحن والتسجيل والترويس الكبائن' : 'Courier Dispatch & Physical Stamped Copy Routing'}</h4>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={quoteForm.shipmentRequired}
                          onChange={e => setQuoteForm(prev => ({ ...prev, shipmentRequired: e.target.checked }))}
                          className="rounded border-zinc-300 text-brand-navy focus:ring-brand-navy w-4 h-4"
                        />
                        <span className="text-[10px] font-bold text-indigo-600">{isRtl ? 'يتطلب شحن فيديكس/أرامكس' : 'Shipment / Courier Delivery Needed'}</span>
                      </label>
                    </div>

                    {quoteForm.shipmentRequired && (
                      <div className="space-y-3 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl animate-in fade-in slide-in-from-top-1 text-xs font-semibold">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-zinc-400 uppercase">Courier Dispatch Method</label>
                            <select 
                              className="w-full mt-1 p-2 bg-white border border-zinc-200 rounded-lg"
                              value={quoteForm.deliveryMethod}
                              onChange={e => setQuoteForm(prev => ({ ...prev, deliveryMethod: e.target.value }))}
                            >
                              <option value="courier">Aramex/FedEx Corporate Contract</option>
                              <option value="office_pickup">Direct Client Cairo Office Pickup</option>
                              <option value="representative">Agency Special Courier Link</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-zinc-400 uppercase">Physical Courier shipping fee ({quoteForm.currency})</label>
                            <input 
                              type="number" 
                              className="w-full mt-1 p-2 bg-white border border-zinc-200 rounded-lg"
                              value={quoteForm.deliveryFee || ''}
                              onChange={e => setQuoteForm(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-zinc-400 uppercase">Recipient Person Name</label>
                            <input 
                              type="text" 
                              className="w-full mt-1 p-2 bg-white border border-zinc-200 rounded-lg"
                              value={quoteForm.recipientName}
                              onChange={e => setQuoteForm(prev => ({ ...prev, recipientName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-zinc-400 uppercase">Recipient Phone Number / Mobile</label>
                            <input 
                              type="text" 
                              className="w-full mt-1 p-2 bg-white border border-zinc-200 rounded-lg text-mono"
                              value={quoteForm.recipientPhone}
                              onChange={e => setQuoteForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="text-[9px] text-zinc-400 uppercase">Complete Address</label>
                            <input 
                              type="text" 
                              className="w-full mt-1 p-2 bg-white border border-zinc-200 rounded-lg"
                              value={quoteForm.deliveryAddress}
                              onChange={e => setQuoteForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                              placeholder="Bldg 12, Floor 4, Sq, Street"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-zinc-400 uppercase">City & Country</label>
                            <input 
                              type="text" 
                              className="w-full mt-1 p-2 bg-white border border-zinc-200 rounded-lg"
                              value={quoteForm.city}
                              onChange={e => setQuoteForm(prev => ({ ...prev, city: e.target.value, country: 'Egypt' }))}
                              placeholder="Cairo"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GROUP E: CALENDARS, TURNAOUND TIMES & INTERNAL NOTES */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-brand-navy border-b border-zinc-100 pb-2">
                      <Clock size={16} />
                      <h4 className="font-extrabold text-xs uppercase tracking-wide">{isRtl ? 'الأوقات والملاحظات وأمانات الأوراق' : 'Timelines & Internal Auditing Notes'}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-zinc-650">
                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 block mb-1">Target Client Deadline</label>
                        <input 
                          type="date"
                          className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                          value={quoteForm.deadline}
                          onChange={e => setQuoteForm(prev => ({ ...prev, deadline: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 block mb-1">Turnaround Estimate (e.g. 3 Days)</label>
                        <input 
                          type="text"
                          className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                          value={quoteForm.turnaroundTime}
                          onChange={e => setQuoteForm(prev => ({ ...prev, turnaroundTime: e.target.value }))}
                          placeholder="Immediate turnaround"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 block mb-1">Quote Validity Date (Expiry)</label>
                        <input 
                          type="date"
                          className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-mono"
                          value={quoteForm.validUntil}
                          onChange={e => setQuoteForm(prev => ({ ...prev, validUntil: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 block mb-1">{isRtl ? 'ملاحظات المعاينة الداخلية (غير مرئية للعميل)' : 'Auditor Internal Notes (Invisible to Client)'}</label>
                        <textarea 
                          value={quoteForm.internalNotes}
                          onChange={e => setQuoteForm(prev => ({ ...prev, internalNotes: e.target.value }))}
                          className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs h-20 outline-none"
                          placeholder="Describe internal status (e.g. Translation assigned to certified translator Dr. Ahmed)"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 block mb-1">{isRtl ? 'الملاحظات والشروط المبينة للعميل' : 'Quotation Terms & Disclaimers (Visible on PDF)'}</label>
                        <textarea 
                          value={quoteForm.clientNotes}
                          onChange={e => setQuoteForm(prev => ({ ...prev, clientNotes: e.target.value }))}
                          className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs h-20 outline-none"
                          placeholder="This quotation is valid..."
                        />
                      </div>
                    </div>

                    {/* FILE ATTACHMENTS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-emerald-50/10 border border-emerald-100 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[9px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                            <Upload size={10} /> {isRtl ? 'الملفات المرفوعة للترجمة' : 'Docs to Translate'}
                          </label>
                          <button type="button" onClick={() => handleAddFileTrigger('docs')} className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600">
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {quoteForm.documentsToBeTranslated.map((f: any) => (
                            <div key={f.id} className="flex items-center justify-between p-1.5 bg-white rounded-lg border text-[10px] font-semibold text-zinc-650">
                              <span className="truncate max-w-[80%] flex items-center gap-1"><Paperclip size={10} /> {f.name}</span>
                              <button type="button" onClick={() => setQuoteForm(prev => ({ ...prev, documentsToBeTranslated: prev.documentsToBeTranslated.filter((x: any) => x.id !== f.id) }))} className="text-red-500 hover:bg-red-50 p-0.5 rounded">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          {quoteForm.documentsToBeTranslated.length === 0 && <p className="text-[9px] text-zinc-400 italic">No files upload</p>}
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50/10 border border-blue-100 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[9px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1">
                            <Paperclip size={10} /> Reference Manuals
                          </label>
                          <button type="button" onClick={() => handleAddFileTrigger('ref')} className="p-1 hover:bg-blue-100 rounded-lg text-blue-600">
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {quoteForm.referenceDocuments.map((f: any) => (
                            <div key={f.id} className="flex items-center justify-between p-1.5 bg-white rounded-lg border text-[10px] font-semibold text-zinc-650 font-sans">
                              <span className="truncate max-w-[80%] flex items-center gap-1"><Paperclip size={10} /> {f.name}</span>
                              <button type="button" onClick={() => setQuoteForm(prev => ({ ...prev, referenceDocuments: prev.referenceDocuments.filter((x: any) => x.id !== f.id) }))} className="text-red-500 hover:bg-red-50 p-0.5 rounded">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          {quoteForm.referenceDocuments.length === 0 && <p className="text-[9px] text-zinc-400 italic">No references attached</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 2. Right Live Corporate PDF Letterhead Preview Panel */}
                <div className="xl:col-span-5 h-full bg-zinc-800 flex flex-col min-h-0 relative">
                  
                  {/* Style helper block to support print layout cleanly on print button execution */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #printable-quote-area, #printable-quote-area * {
                        visibility: visible !important;
                      }
                      #printable-quote-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        color: black !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 2.5cm !important;
                        margin: 0 !important;
                      }
                      .no-print-area {
                        display: none !important;
                      }
                    }
                  `}} />
                  
                  <div className="p-4 bg-zinc-900 border-b border-zinc-700/50 flex items-center justify-between text-zinc-300 no-print-area select-none">
                    <span className="text-xs font-bold font-mono tracking-wide uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Real-Time PDF Letterhead Preview
                    </span>
                    <button 
                      onClick={() => {
                        window.print();
                      }}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-black tracking-tight uppercase flex items-center gap-1"
                    >
                      <Printer size={12} /> {isRtl ? 'معاينة الطباعة والمستند' : 'Print PDF letter'}
                    </button>
                  </div>

                  {/* Letterhead Container */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-700 font-sans">
                    <div 
                      id="printable-quote-area"
                      className="bg-white text-zinc-850 p-8 rounded-xl shadow-2xl max-w-2xl mx-auto space-y-6 relative border-t-[8px] min-h-[29.7cm] flex flex-col justify-between text-left"
                      style={{ pageBreakAfter: 'always', borderColor: brand.accentColor, fontFamily: brand.fontFamily }}
                    >
                      
                      <div>
                        {/* Dynamic Branded corporate header relative to layout theme */}
                        {brand.layoutTheme === 'centered_classic' ? (
                          <div className="text-center pb-5 border-b border-zinc-200">
                            {brand.showLogo && (brand.logoBase64 || brand.logoUrl) && (
                              <div className="flex justify-center mb-3">
                                <img 
                                  src={brand.logoBase64 || brand.logoUrl} 
                                  alt="Logo preview" 
                                  className="h-12 object-contain max-w-[150px]"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            <h2 className="text-base font-black tracking-tight text-zinc-900 leading-tight uppercase">
                              {isRtl ? brand.companyNameAr : brand.companyName}
                            </h2>
                            <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mt-1">
                              {isRtl ? brand.sloganAr : brand.slogan}
                            </p>
                            <p className="text-[7.5px] text-zinc-400 mt-2 font-medium">
                              {isRtl ? brand.addressAr : brand.address} • {brand.email} • {brand.phone1} • {brand.website}
                            </p>
                          </div>
                        ) : brand.layoutTheme === 'hybrid_editorial' ? (
                          <div className="pb-5 border-b border-zinc-200">
                            <div className="grid grid-cols-3 gap-4 items-end">
                              <div className="col-span-2">
                                <h2 className="text-lg font-serif text-zinc-900 leading-tight">
                                  {isRtl ? brand.companyNameAr : brand.companyName}
                                </h2>
                                <p className="text-[8px] text-zinc-500 mt-1 font-serif italic">
                                  {isRtl ? brand.sloganAr : brand.slogan}
                                </p>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                {brand.showLogo && (brand.logoBase64 || brand.logoUrl) && (
                                  <img 
                                    src={brand.logoBase64 || brand.logoUrl} 
                                    alt="Logo preview" 
                                    className="h-10 object-contain max-w-[120px] mb-2"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <span className="text-[7.5px] text-zinc-400 font-mono tracking-wide leading-none">{brand.website}</span>
                              </div>
                            </div>
                            <div className="w-full h-[1px] bg-zinc-200 mt-4"></div>
                            <div className="grid grid-cols-2 pt-2 text-[7.5px] text-zinc-400">
                              <div>Address: {isRtl ? brand.addressAr : brand.address}</div>
                              <div className="text-right">Tel: {brand.phone1} | Email: {brand.email}</div>
                            </div>
                          </div>
                        ) : brand.layoutTheme === 'clean_compact' ? (
                          <div className="pb-4 border-b border-zinc-200 flex justify-between items-center text-left text-zinc-800">
                            <div>
                              <h2 className="text-base font-black tracking-tighter text-zinc-900 uppercase">
                                {isRtl ? brand.companyNameAr : brand.companyName}
                              </h2>
                              <p className="text-[7.5px] text-zinc-500 font-medium">
                                {brand.phone1} | {brand.email} | CR: {brand.commercialRegistry}
                              </p>
                            </div>
                            {brand.showLogo && (brand.logoBase64 || brand.logoUrl) && (
                              <img 
                                src={brand.logoBase64 || brand.logoUrl} 
                                alt="Logo preview" 
                                className="h-8 object-contain max-w-[100px]"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        ) : (
                          /* Modern Asymmetric default */
                          <div className="flex justify-between border-b border-zinc-200 pb-5 text-left">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {brand.showLogo && (brand.logoBase64 || brand.logoUrl) ? (
                                  <img 
                                    src={brand.logoBase64 || brand.logoUrl} 
                                    alt="Logo preview" 
                                    className="h-10 object-contain max-w-[120px] mr-1"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-white text-base font-black">GB</span>
                                )}
                                <span className="font-extrabold uppercase text-sm tracking-widest text-[#1B4F72] font-sans" style={{ color: brand.accentColor }}>
                                  {isRtl ? brand.companyNameAr : brand.companyName}
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
                                {isRtl ? brand.sloganAr : brand.slogan}
                              </p>
                              <p className="text-[8px] text-zinc-500 mt-2 font-medium">
                                {isRtl ? brand.addressAr : brand.address} • TAX ID: {brand.taxNumber}
                              </p>
                              <p className="text-[8px] text-zinc-500 leading-none">
                                Tel: {brand.phone1} • WhatsApp: {brand.phone2} • Email: {brand.email}
                              </p>
                            </div>
                            
                            <div className="text-right flex flex-col items-end">
                              <h2 className="text-lg font-black tracking-tight uppercase leading-none" style={{ color: brand.accentColor }}>Official Pricing Quote</h2>
                              <p className="text-[9px] text-zinc-400 font-mono mt-1 font-bold">DATE: {new Date().toLocaleDateString()}</p>
                              <p className="text-[8px] text-zinc-400 font-mono tracking-wider font-bold">VALID UNTIL: {quoteForm.validUntil || '15 Days Expiry'}</p>
                              <span className="mt-1 px-2.5 py-0.5 bg-zinc-100 border text-brand-navy font-mono text-[9px] font-extrabold rounded" style={{ color: brand.accentColor, borderColor: `${brand.accentColor}30` }}>
                                STATUS: {(quoteForm as any).status?.toUpperCase() || 'DRAFT'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Dear Recipient Greetings */}
                        <div className="grid grid-cols-2 gap-4 text-[10px] pt-4 font-semibold text-zinc-600 border-b border-zinc-100 pb-4">
                          <div>
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Prepared For (Client Account):</span>
                            <p className="text-zinc-900 font-black text-[11px]">{quoteForm.clientName || 'Valued Corporate Partner'}</p>
                            {quoteForm.clientType === 'company' && quoteForm.companyName && (
                              <p className="text-zinc-500 uppercase text-[9px]">{quoteForm.companyName}</p>
                            )}
                            {quoteForm.clientEmail && <p className="text-zinc-500 font-mono font-normal">{quoteForm.clientEmail}</p>}
                            {quoteForm.clientPhone && <p className="text-zinc-500 font-mono font-normal">{quoteForm.clientPhone}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Sales Specialist Reference:</span>
                            <p className="text-zinc-900 font-bold">{quoteForm.salespersonName || currentUser.fullName}</p>
                            <p className="text-zinc-400 font-normal leading-none mt-1">Lead channel: <span className="capitalize">{quoteForm.clientSource}</span></p>
                            {quoteForm.clientTaxNumber && (
                              <p className="text-zinc-400 mt-1">Tax Ref No: <span className="font-mono">{quoteForm.clientTaxNumber}</span></p>
                            )}
                          </div>
                        </div>

                        {/* Statement Body greeting */}
                        <div className="py-2 text-[10px] text-zinc-550 leading-relaxed text-left text-zinc-600">
                          <p>
                            We respectfully submit our competitive commercial pricing statement for professional certified translations. All translations undergo a rigorous legal QA stamp audit by our state-accredited review committee prior to signature dispatch.
                          </p>
                        </div>

                        {/* Items Loop Grid */}
                        <div className="mt-4 border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-left text-[10px] py-1 border-collapse">
                            <thead>
                              <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[8px] font-black">
                                <th className="px-3 py-2">Document File / Service description</th>
                                <th className="px-3 py-2 text-center">Unit</th>
                                <th className="px-3 py-2 text-right">Words/Pages/Qty</th>
                                <th className="px-3 py-2 text-right">Unit Price</th>
                                <th className="px-3 py-2 text-right">Row Net Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {computedTotals.itemTotals.map((item, idx) => {
                                let sizingLabel = '';
                                if (item.unit === 'word') {
                                  sizingLabel = `${item.wordCount.toLocaleString()} words`;
                                } else if (item.unit === 'page') {
                                  sizingLabel = item.wordCountAvailable 
                                    ? `${Math.ceil(item.wordCount / 250)} pages (Scenario A = ${item.wordCount} words)`
                                    : `${item.manualPages} pages (Scenario B - Estimated)`;
                                } else {
                                  sizingLabel = `${item.quantity} units`;
                                }

                                return (
                                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                                    <td className="px-3 py-2.5 font-bold text-zinc-900">
                                      <p className="m-0 leading-tight">{item.description || `Certified Service Item #${idx + 1}`}</p>
                                      <span className="text-[8px] font-normal text-zinc-400 font-sans tracking-wide block">
                                        Accredited Language Pair: {item.sourceLanguage} ➔ {item.targetLanguage}
                                      </span>
                                      {item.isEstimatedPages && item.estimateReason && (
                                        <span className="text-[7.5px] italic text-amber-600 block leading-none mt-1">
                                          Sizing Audit: {item.estimateReason}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-bold font-mono text-zinc-500 uppercase text-[8px]">{item.unit}</td>
                                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-zinc-700">{sizingLabel}</td>
                                    <td className="px-3 py-2.5 text-right font-mono font-extrabold text-zinc-800">{Number(item.unitPrice).toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right font-mono font-black" style={{ color: brand.accentColor }}>{Number(item.total).toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                              {computedTotals.itemTotals.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-400 italic font-medium">No items populated in pricing grid</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Shipment physical dispatch copy block if needed */}
                        {quoteForm.shipmentRequired && quoteForm.recipientName && (
                          <div className="mt-4 p-3 bg-indigo-50/40 border border-dashed border-zinc-200 rounded-xl grid grid-cols-2 gap-4 text-left text-[9px] font-medium leading-tight">
                            <div>
                              <span className="text-[8px] uppercase tracking-wide font-black block mb-1" style={{ color: brand.accentColor }}>Accredited Shipping Dispatch:</span>
                              <p className="text-zinc-800 font-bold">Recipient: {quoteForm.recipientName} ({quoteForm.recipientPhone})</p>
                              <p className="text-zinc-500 font-normal">Method: {quoteForm.deliveryMethod === 'courier' ? 'FedEx/Aramex Courier Ribbon' : 'Cairo Representative delivery'}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] uppercase tracking-wide font-black text-zinc-400 block mb-1">Courier Target Address:</span>
                              <p className="text-zinc-800">{quoteForm.deliveryAddress}</p>
                              <p className="text-zinc-500 font-normal">{quoteForm.city}, Egypt</p>
                            </div>
                          </div>
                        )}

                        {/* Important Terms and Notes */}
                        <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left text-[8px] text-zinc-550 font-medium leading-relaxed">
                          <span className="font-extrabold uppercase text-zinc-700 block tracking-wide border-b border-zinc-200/50 pb-1 mb-1">Important Service notes & Terms:</span>
                          <div className="whitespace-pre-line font-mono text-[7.5px]">
                            {quoteForm.clientNotes || (isRtl ? brand.termsAr : brand.termsEn)}
                          </div>
                        </div>

                        {/* Bank Details on Invoice */}
                        {brand.showBankDetails && (
                          <div className="mt-3 p-3 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl grid grid-cols-2 gap-4 text-[7.5px] text-zinc-500 text-left">
                            <div>
                              <span className="text-[7px] font-black uppercase tracking-wider block mb-0.5 text-zinc-400">Electronic Bank Routing:</span>
                              <p className="font-bold text-zinc-850 leading-none">{isRtl ? brand.bankNameAr : brand.bankName}</p>
                              <p className="text-zinc-500 leading-tight mt-1">BENEFICIARY: {isRtl ? brand.bankAccountNameAr : brand.bankAccountName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-zinc-800 leading-none">SWIFT CODE: {brand.bankSwift}</p>
                              <p className="font-semibold text-zinc-650 font-mono tracking-tighter mt-1">IBAN: {brand.bankIban}</p>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Summary Block calculations and certification stamp */}
                      <div className="pt-6 border-t border-zinc-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                          
                          {/* Authentication Stamps */}
                          <div className="text-left flex items-center gap-3">
                            {brand.showStamp ? (
                              <div className="w-16 h-16 border-4 border-double border-red-700/80 rounded-full flex flex-col justify-center items-center opacity-75 transform rotate-6 border-dashed p-1 shrink-0 select-none">
                                <span className="text-[5px] uppercase font-black text-red-700 text-center leading-none tracking-tight">APPROVED STAMP</span>
                                <span className="text-[4.5px] font-mono font-bold uppercase leading-none mt-1">GLOBAL BILLING</span>
                                <span className="text-[4px] text-zinc-400 leading-none mt-1">Certified Official</span>
                              </div>
                            ) : (
                              <div className="w-16 h-16 border border-dashed border-zinc-200 flex items-center justify-center text-zinc-300 text-[8px] select-none text-center">No Stamp</div>
                            )}

                            {brand.showSignatureBlock && (
                              <div className="leading-tight">
                                <p className="font-extrabold text-[9px] uppercase tracking-wider" style={{ color: brand.accentColor }}>Accredited Bureau QA Auditor</p>
                                <p className="text-[8px] text-zinc-400 font-semibold font-sans mt-0.5">Cairo HQ Certified Legal QA Wing</p>
                                <div className="w-24 h-6 border-b border-zinc-300 mt-2 border-dashed"></div>
                              </div>
                            )}
                          </div>

                          {/* Arithmetic Calculations list */}
                          <div className="space-y-1.5 text-right font-medium text-[10px]">
                            <div className="flex justify-between border-b border-zinc-150 pb-1 text-zinc-500">
                              <span>Service Items Subtotal</span>
                              <span className="font-mono text-zinc-850 font-bold">{Number(computedTotals.subtotal).toLocaleString()} {quoteForm.currency}</span>
                            </div>

                            {computedTotals.discountTotal > 0 && (
                              <div className="flex justify-between text-emerald-600 font-bold pb-1 text-[9px]">
                                <span>Promo Discount ({quoteForm.discountReason || 'Discount Code'})</span>
                                <span className="font-mono">-{Number(computedTotals.discountTotal).toLocaleString()} {quoteForm.currency}</span>
                              </div>
                            )}

                            {quoteForm.urgencySurcharge > 0 && (
                              <div className="flex justify-between text-amber-600 font-bold pb-1 text-[9px]">
                                <span>Urgency priority Surcharge</span>
                                <span className="font-mono">+{Number(quoteForm.urgencySurcharge).toLocaleString()} {quoteForm.currency}</span>
                              </div>
                            )}

                            {quoteForm.taxEnabled && (
                              <div className="flex justify-between text-zinc-500 pb-1 text-[9px]">
                                <span>Tax/VAT ({quoteForm.taxRate}%)</span>
                                <span className="font-mono">+{Number(computedTotals.taxTotal).toLocaleString()} {quoteForm.currency}</span>
                              </div>
                            )}

                            {quoteForm.shipmentRequired && quoteForm.deliveryFee > 0 && (
                              <div className="flex justify-between text-zinc-500 pb-1 text-[9px]">
                                <span>Courier physical delivery fee</span>
                                <span className="font-mono">+{Number(quoteForm.deliveryFee).toLocaleString()} {quoteForm.currency}</span>
                              </div>
                            )}

                            <div 
                              className="flex justify-between items-center p-2 rounded-lg border text-xs font-black font-mono shrink-0 font-sans"
                              style={{ color: brand.accentColor, backgroundColor: `${brand.accentColor}0a`, borderColor: `${brand.accentColor}20` }}
                            >
                              <span>Grand Total Balance Due</span>
                              <span>{Number(computedTotals.grandTotal).toLocaleString()} {quoteForm.currency}</span>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Actions buttons inside Preview */}
                  <div className="p-4 bg-zinc-900 border-t border-zinc-700/50 flex flex-col md:flex-row gap-3 no-print-area select-none">
                    <button
                      onClick={() => handleSendWhatsApp({
                        ...quoteForm,
                        id: editingQuoteId || 'draft',
                        quoteNumber: editingQuoteId ? 'QT-EDITED' : 'QT-DRAFT',
                        grandTotal: computedTotals.grandTotal,
                        currency: quoteForm.currency,
                        clientName: quoteForm.clientName,
                        fileName: quoteForm.items[0]?.description || 'Project Files',
                      } as any)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black"
                    >
                      <MessageCircle size={14} /> Send WhatsApp Alert
                    </button>
                    <button
                      onClick={() => handleSendEmail({
                        ...quoteForm,
                        id: editingQuoteId || 'draft',
                        quoteNumber: editingQuoteId ? 'QT-EDITED' : 'QT-DRAFT',
                        grandTotal: computedTotals.grandTotal,
                        currency: quoteForm.currency,
                        clientName: quoteForm.clientName,
                        fileName: quoteForm.items[0]?.description || 'Project Files',
                      } as any)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black"
                    >
                      <Mail size={14} /> Send Official Email
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* Read-Only Corporate Letterhead Preview Modal Overlay */}
      {selectedQuoteId && (
        (() => {
          const q = data.quotations.find(quote => quote.id === selectedQuoteId);
          if (!q) return null;
          return (
            <div className="fixed inset-0 bg-zinc-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[90vh]">
                
                {/* Style helper block to support print layout cleanly on print button execution */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #printable-quote-area-view, #printable-quote-area-view * {
                      visibility: visible !important;
                    }
                    #printable-quote-area-view {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      background: white !important;
                      color: black !important;
                      box-shadow: none !important;
                      border: none !important;
                    }
                  }
                `}} />

                <div className="p-4 bg-brand-navy text-white flex items-center justify-between shadow-md shrink-0">
                  <div className="flex items-center gap-2">
                    <FileStack size={18} className="text-brand-gold" />
                    <div>
                      <h3 className="font-extrabold text-sm">{isRtl ? 'عرض الخطاب الرسمي المعتمد لـ:' : 'Official Certified Letterhead Reader'} {q.quoteNumber}</h3>
                      <p className="text-[10px] text-zinc-300">ISO 9001 Sizing Auditor Verification Mode</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedQuoteId(null)}
                    className="p-1 px-3 hover:bg-white/10 rounded-xl transition-all font-bold text-xs"
                  >
                    {isRtl ? 'إغلاق المعاينة' : 'Close View'}
                  </button>
                </div>

                {/* Linked Task reference bar (not printable) */}
                {(() => {
                  const linkedTask = data.invoices && dbInstance.tasks?.find(t => t.quotationId === q.id || t.quotation_id === q.id || q.convertedToJobId === t.id || q.linkedTaskId === t.id || q.linked_task_id === t.id);
                  if (linkedTask) {
                    return (
                      <div className="bg-emerald-50 border-b border-emerald-250 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 shrink-0 font-sans no-print-area select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{isRtl ? 'المهمة المربوطة والمفتوحة في النظام:' : 'Linked active task:'}</span>
                          <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded font-black border border-emerald-200">{linkedTask.referenceNo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuoteId(null);
                            window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'tasks', taskId: linkedTask.id } }));
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          {isRtl ? 'فتح المهمة المربوطة' : 'Open Linked Task'}
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Print area */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-200">
                  <div 
                    id="printable-quote-area-view"
                    className="bg-white text-zinc-850 p-8 rounded-xl shadow-lg relative border-t-[8px] border-[#1B4F72] min-h-[29.7cm] flex flex-col justify-between"
                  >
                    <div>
                      {/* Branded Corporate Header */}
                      <div className="flex justify-between border-b border-zinc-200 pb-5 text-left">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-extrabold uppercase text-sm tracking-widest text-brand-navy font-sans">{brand.companyName || ''}</span>
                          </div>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-none">{brand.slogan || ''}</p>
                          <p className="text-[8px] text-zinc-500 mt-2 font-medium">{brand.address || ''}{brand.taxNumber ? ` • tax: ${brand.taxNumber}` : ''}</p>
                        </div>
                        
                        <div className="text-right flex flex-col items-end">
                          <h2 className="text-lg font-black tracking-tight text-brand-navy uppercase leading-none">Official Pricing Quote</h2>
                          <p className="text-[9px] text-zinc-400 font-mono mt-1 font-bold">DATE: {new Date(q.createdAt).toLocaleDateString()}</p>
                          <p className="text-[8px] text-zinc-400 font-mono tracking-wider font-bold">VALID UNTIL: {q.validUntil}</p>
                        </div>
                      </div>

                      {/* Recipient details */}
                      <div className="grid grid-cols-2 gap-4 text-[10px] pt-4 font-semibold text-zinc-600 border-b border-zinc-100 pb-4 text-left">
                        <div>
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Client Account:</span>
                          <p className="text-zinc-900 font-black text-[11px]">{q.clientName}</p>
                          {(q as any).companyName && <p className="text-zinc-500 uppercase text-[9px]">{(q as any).companyName}</p>}
                          {(q as any).clientEmail && <p className="text-zinc-500 font-mono font-normal">{(q as any).clientEmail}</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Audit Reference:</span>
                          <p className="text-zinc-900 font-bold">{q.quoteNumber}</p>
                          <p className="text-zinc-400 font-normal mt-1 text-[8px]">Compiled by: {q.createdBy}</p>
                        </div>
                      </div>

                      {/* Letter statement */}
                      <div className="py-2 text-[10px] text-zinc-600 leading-relaxed text-left">
                        <p>
                          We present the definitive financial pricing review for certified translation services. All translated documentation matches accredited translation patterns compliant with ISO and ministerial certifications.
                        </p>
                      </div>

                      {/* Items table */}
                      <div className="mt-4 border border-zinc-250 border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[8px] font-black">
                              <th className="px-3 py-2">Document Sizing record / Service Description</th>
                              <th className="px-3 py-2 text-center">Unit</th>
                              <th className="px-3 py-2 text-right">Words/Pages/Qty</th>
                              <th className="px-3 py-2 text-right">Unit Price</th>
                              <th className="px-3 py-2 text-right">Row Net Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-sans">
                            {q.items && q.items.length > 0 ? (
                              q.items.map((item: any, idx: number) => (
                                <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                                  <td className="px-3 py-2 font-bold text-zinc-900">
                                    <p className="m-0 leading-tight">{item.description || q.fileName}</p>
                                    <span className="text-[8px] font-normal text-zinc-400 font-sans block">
                                      Accredited Path: {item.sourceLanguage || q.sourceLanguage} ➔ {item.targetLanguage || q.targetLanguage}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold font-mono text-zinc-500 uppercase text-[8px]">{item.unit || q.serviceType}</td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-zinc-700">
                                    {item.unit === 'word' ? `${item.wordCount || q.wordCount} words` : `${item.manualPages || Math.ceil(q.wordCount / 250)} pages`}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-extrabold text-zinc-800">{Number(item.unitPrice || 0.25).toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-mono font-black text-brand-navy">{Number(item.total || q.grandTotal).toLocaleString()}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="px-3 py-4 font-bold text-zinc-900">
                                  <p className="m-0 leading-tight">{q.fileName || 'Certified Translation Services'}</p>
                                  <span className="text-[8px] font-normal text-zinc-400 block">Accredited Translation Range: {q.sourceLanguage} ➔ {q.targetLanguage}</span>
                                </td>
                                <td className="px-3 py-4 text-center font-mono font-bold uppercase text-[8px]">{q.serviceType}</td>
                                <td className="px-3 py-4 text-right font-mono text-zinc-700">{q.wordCount ? `${q.wordCount} words` : '1 project'}</td>
                                <td className="px-3 py-4 text-right font-mono text-zinc-700">-</td>
                                <td className="px-3 py-4 text-right font-mono font-black text-brand-navy">{Number(q.grandTotal).toLocaleString()}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Shipment layout if physical courier is enabled */}
                      {(q as any).shipmentRequired && (q as any).recipientName && (
                        <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl grid grid-cols-2 gap-4 text-left text-[9px] font-medium leading-tight">
                          <div>
                            <span className="text-[8px] uppercase tracking-wide font-black text-brand-navy block mb-1">Accredited Shipping Dispatch:</span>
                            <p className="text-zinc-800 font-bold">Recipient: {(q as any).recipientName} ({(q as any).recipientPhone})</p>
                            <p className="text-zinc-500 font-normal">Method: {(q as any).deliveryMethod === 'courier' ? 'Aramex Courier Package' : 'Cairo Representative'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] uppercase tracking-wide font-black text-zinc-400 block mb-1">Destination Address:</span>
                            <p className="text-zinc-800">{(q as any).deliveryAddress}</p>
                            <p className="text-zinc-500 font-normal">{(q as any).city}, Egypt</p>
                          </div>
                        </div>
                      )}

                      {/* Important Terms and Notes */}
                      {q.notes && (
                        <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left text-[8px] text-zinc-500 font-medium leading-relaxed whitespace-pre-line">
                          <span className="font-extrabold uppercase text-zinc-700 block tracking-wide border-b border-zinc-200/50 pb-1 mb-1">Important Service notes & Terms:</span>
                          {q.notes}
                        </div>
                      )}
                    </div>

                    {/* Footer Stamps & Calculations */}
                    <div className="pt-6 border-t border-zinc-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        
                        {/* Approval Seals */}
                        <div className="text-left flex items-center gap-3 select-none">
                          <div className="w-16 h-16 border-4 border-double border-indigo-950/70 rounded-full flex flex-col justify-center items-center opacity-70 transform rotate-6 border-dashed p-1">
                            <span className="text-[5px] uppercase font-black text-indigo-900 leading-none">APPROVED BUREAU</span>
                            <span className="text-[5px] font-mono leading-none mt-1">Egypt HQ</span>
                          </div>
                          <div>
                            <p className="font-extrabold text-[#1B4F72] text-[9.5px] uppercase">Accredited Bureau Representative</p>
                            <p className="text-[8px] text-zinc-400 font-semibold font-sans mt-0.5">Corporate Legal QA Team Cairo</p>
                          </div>
                        </div>

                        {/* Math breakdown */}
                        <div className="space-y-1 text-right font-medium text-[10px]">
                          <div className="flex justify-between border-b pb-1 text-zinc-500">
                            <span>Service Items Subtotal</span>
                            <span className="font-mono text-zinc-800 font-bold">{Number((q as any).subtotal || q.grandTotal).toLocaleString()} {q.currency || 'EGP'}</span>
                          </div>

                          {(q as any).discountTotal > 0 && (
                            <div className="flex justify-between text-emerald-600 font-bold pb-1 text-[9px]">
                              <span>Discount</span>
                              <span className="font-mono">-{Number((q as any).discountTotal).toLocaleString()} {q.currency || 'EGP'}</span>
                            </div>
                          )}

                          {(q as any).urgencySurcharge > 0 && (
                            <div className="flex justify-between text-amber-600 font-bold pb-1 text-[9px]">
                              <span>Urgency priority surcharge</span>
                              <span className="font-mono">+{Number((q as any).urgencySurcharge).toLocaleString()} {q.currency || 'EGP'}</span>
                            </div>
                          )}

                          {q.taxTotal > 0 && (
                            <div className="flex justify-between text-zinc-500 pb-1 text-[9px]">
                              <span>VAT Tax</span>
                              <span className="font-mono">+{Number(q.taxTotal).toLocaleString()} {q.currency || 'EGP'}</span>
                            </div>
                          )}

                          {(q as any).deliveryFee > 0 && (
                            <div className="flex justify-between text-zinc-500 pb-1 text-[9px]">
                              <span>Courier Dispatch</span>
                              <span className="font-mono">+{Number((q as any).deliveryFee).toLocaleString()} {q.currency || 'EGP'}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-brand-navy p-2 bg-zinc-50 rounded-lg text-xs font-black font-mono">
                            <span>Grand Total Amount</span>
                            <span>{Number(q.grandTotal).toLocaleString()} {q.currency || 'EGP'}</span>
                          </div>

                          {q.depositAmount > 0 && (
                            <div className="p-2 bg-emerald-50 rounded-lg text-[9px] font-bold text-emerald-800 space-y-1">
                              <div className="flex justify-between leading-none">
                                <span>- Paid Deposit Amount</span>
                                <span className="font-mono">-{Number(q.depositAmount).toLocaleString()} {q.currency || 'EGP'}</span>
                              </div>
                              <div className="flex justify-between leading-none text-red-600 text-[10px] font-black border-t border-emerald-250 pt-1">
                                <span>Outstanding Balance Due</span>
                                <span className="font-mono font-black">{Number(q.depositBalance).toLocaleString()} {q.currency || 'EGP'}</span>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

                {/* Reader controller buttons */}
                <div className="p-4 bg-zinc-50 border-t border-zinc-150 shrink-0 flex items-center justify-end gap-3 no-print-area">
                  <button 
                    onClick={() => handleSavePDF(q)}
                    className="px-6 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-brand-navy text-white text-xs font-black rounded-xl hover:bg-brand-navy-hover transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={14} /> Print Document
                  </button>
                  <button 
                    onClick={() => setSelectedQuoteId(null)}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-xs font-bold text-zinc-700 transition-all font-sans cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          );
        })()
      )}
      
      {/* Cancellation Modal */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        multiple={false}
      />
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
             <div className="flex items-center gap-3 text-red-600">
                <Ban size={24} />
                <h3 className="font-black tracking-tight">{isRtl ? 'إلغاء عرض السعر' : 'Cancel Quotation'}</h3>
             </div>
             <p className="text-xs text-zinc-500 font-medium">{isRtl ? 'يرجى ذكر سبب الإلغاء للأرشيف:' : 'Please provide a reason for cancelling this quote for internal records:'}</p>
             <textarea 
                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold outline-none h-24"
                placeholder="..."
                value={cancelModal.reason}
                onChange={(e) => setCancelModal({...cancelModal, reason: e.target.value})}
             />
             <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setCancelModal({ isOpen: false, quoteId: '', reason: '' })} className="px-4 py-2 text-xs font-bold text-zinc-500">Discard</button>
                <button 
                  onClick={() => {
                    if (!cancelModal.reason) return alert('Reason required');
                    dbInstance.updateQuotationStatus(cancelModal.quoteId, 'cancelled', cancelModal.reason);
                    setCancelModal({ isOpen: false, quoteId: '', reason: '' });
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-100"
                >
                  Confirm Cancellation
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {depositModal.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
             <div className="flex items-center gap-3 text-emerald-600">
                <Landmark size={24} />
                <h3 className="font-black tracking-tight text-xl">{isRtl ? 'تسجيل دفعة مقدمة' : 'Record Deposit'}</h3>
             </div>
             
             {(() => {
               const q = data.quotations.find(quote => quote.id === depositModal.quoteId);
               if (!q) return null;
               return (
                 <div className="space-y-4">
                   <div className="bg-zinc-50 p-4 rounded-2xl space-y-2 border border-zinc-100">
                     <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                       <span>{isRtl ? 'الإجمالي' : 'Total'}</span>
                       <span>{isRtl ? 'المطلوب' : 'Balance'}</span>
                     </div>
                     <div className="flex justify-between items-end">
                       <span className="text-zinc-900 font-bold">{q.grandTotal.toLocaleString()} {q.currency}</span>
                       <span className="text-red-600 font-black text-lg">{q.depositBalance.toLocaleString()} {q.currency}</span>
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'مبلغ الدفعة' : 'Deposit Amount'}</label>
                     <input 
                        type="number"
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500"
                        value={depositModal.amount || ''}
                        onChange={(e) => setDepositModal({...depositModal, amount: Number(e.target.value)})}
                        placeholder="0.00"
                     />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</label>
                     <select 
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none"
                        value={depositModal.method}
                        onChange={(e) => setDepositModal({...depositModal, method: e.target.value})}
                     >
                       <option value="cash">Cash</option>
                       <option value="bank_saib">Bank Transfer (SAIB)</option>
                       <option value="instapay">InstaPay</option>
                       <option value="vodafone_cash">Vodafone Cash</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'إرفاق إثبات الدفع' : 'Proof of Payment'}</label>
                      <div className="p-4 border-2 border-dashed border-zinc-200 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all bg-zinc-50 hover:bg-indigo-50/25 relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleModalProofUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <FileSpreadsheet size={20} className="text-zinc-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                        <span className="text-[11px] font-bold text-zinc-650 group-hover:text-indigo-600 transition-colors text-center w-full truncate pointer-events-none text-center block">
                          {depositProof ? depositProof.name : (isRtl ? 'اسحب أو حدد صورة الإيصال' : 'Drag or click to choose proof')}
                        </span>
                        {!depositProof && <span className="text-[9px] text-zinc-400 pointer-events-none text-center block">PDF, JPG, PNG</span>}
                      </div>
                    </div>

                    <div style={{display: 'none'}}>
                      <select style={{display: 'none'}} defaultValue="cash">
                        <option value="cash"></option>
                     </select>
                   </div>

                   <div className="flex justify-end gap-3 pt-4">
                      <button onClick={() => setDepositModal({ isOpen: false, quoteId: '', amount: 0, method: 'cash' })} className="px-5 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all">Cancel</button>
                      <button 
                        onClick={() => {
                          if (depositModal.amount <= 0) return alert('Amount must be positive');
                          dbInstance.recordQuotationDeposit(depositModal.quoteId, depositModal.amount, depositModal.method as any, depositProof?.url, depositProof?.name);
                          const updatedQ = dbInstance.quotations.find(quote => quote.id === depositModal.quoteId);
                          if (updatedQ) {
                            alert(isRtl 
                              ? `تم تسجيل الدفعة. الرصيد المتبقي: ${updatedQ.depositBalance} ${updatedQ.currency}` 
                              : `Deposit recorded. Remaining balance: ${updatedQ.depositBalance} ${updatedQ.currency}`
                            );
                          }
                          setDepositModal({ isOpen: false, quoteId: '', amount: 0, method: 'cash' });
                        }}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                      >
                        Record Payment
                      </button>
                   </div>
                 </div>
               );
             })()}
          </div>
        </div>
      )}
      
      {/* Quotation Approval & Deposit Confirmation Overlay Modal */}
      {approveConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 text-xs text-zinc-700 font-sans">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 text-zinc-800 border border-zinc-150">
            <div className="flex items-center gap-3 text-indigo-600">
              <CheckCircle size={28} className="text-emerald-500 shrink-0" />
              <div>
                <h3 className="font-extrabold tracking-tight text-xl text-zinc-900">{isRtl ? 'تأكيد تفعيل وتعميد عرض السعر' : 'Approve & Confirm Quotation'}</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{isRtl ? 'تسجيل إيداع الدفعة المقدمة وقنوات التحصيل' : 'Select Deposit Collection & Verification'}</p>
              </div>
            </div>

            {(() => {
              const q = data.quotations.find(quote => quote.id === approveConfirmModal.quoteId);
              if (!q) return null;

              return (
                <div className="space-y-5">
                  <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black text-zinc-400 block uppercase">{isRtl ? 'عرض سعر رقم' : 'Quote ref'}</span>
                      <span className="text-zinc-900 font-extrabold text-sm">{q.quoteNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-zinc-400 block uppercase">{isRtl ? 'الإجمالي الكلي' : 'Grand Total'}</span>
                      <span className="text-emerald-600 font-black text-base">{q.grandTotal.toLocaleString()} {q.currency}</span>
                    </div>
                  </div>

                  {/* Radios for selection of deposit type */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'حالة تحصيل الدفعة المقدمة' : 'Deposit Status'}</label>
                    <div className="grid grid-cols-1 gap-2">
                      <label className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${
                        approveConfirmModal.hasPaidDeposit === 'yes' 
                          ? 'bg-indigo-50/50 border-indigo-400 text-indigo-950 font-extrabold' 
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                      }`}>
                        <input
                          type="radio"
                          name="depositType"
                          value="yes"
                          checked={approveConfirmModal.hasPaidDeposit === 'yes'}
                          onChange={() => setApproveConfirmModal({ ...approveConfirmModal, hasPaidDeposit: 'yes' })}
                          className="w-4 h-4 text-indigo-650 border-zinc-300 focus:ring-indigo-500 shrink-0"
                        />
                        <div>
                          <p className="text-xs font-black">{isRtl ? 'قدّم العميل دفعة مقدمة الآن' : 'Client paid a deposit amount now'}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">{isRtl ? 'سيتم تسجيل الدفعة وإرفاق صورة الإيصال' : 'Record deposit and upload proof of payment'}</p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${
                        approveConfirmModal.hasPaidDeposit === 'full_on_delivery' 
                          ? 'bg-indigo-50/50 border-indigo-400 text-indigo-950 font-extrabold' 
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-650'
                      }`}>
                        <input
                          type="radio"
                          name="depositType"
                          value="full_on_delivery"
                          checked={approveConfirmModal.hasPaidDeposit === 'full_on_delivery'}
                          onChange={() => setApproveConfirmModal({ ...approveConfirmModal, hasPaidDeposit: 'full_on_delivery' })}
                          className="w-4 h-4 text-indigo-650 border-zinc-300 focus:ring-indigo-500 shrink-0"
                        />
                        <div>
                          <p className="text-xs font-black">{isRtl ? 'الدفع كامل بعد التسليم' : 'He will pay full amount after delivery'}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">{isRtl ? 'لا توجد دفعة مقدمة مطلوبة حالياً' : 'No advance payment structure required'}</p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${
                        approveConfirmModal.hasPaidDeposit === 'no' 
                          ? 'bg-indigo-50/50 border-indigo-400 text-indigo-950 font-extrabold' 
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-650'
                      }`}>
                        <input
                          type="radio"
                          name="depositType"
                          value="no"
                          checked={approveConfirmModal.hasPaidDeposit === 'no'}
                          onChange={() => setApproveConfirmModal({ ...approveConfirmModal, hasPaidDeposit: 'no' })}
                          className="w-4 h-4 text-indigo-650 border-zinc-300 focus:ring-indigo-500 shrink-0"
                        />
                        <div>
                          <p className="text-xs font-black">{isRtl ? 'لم يتم الدفع بعد / لاحقاً' : 'No deposit paid yet'}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">{isRtl ? 'تفعيل ملف العقد مع بقاء الرصيد مستحق بالكامل' : 'Activate quote status with full balance unpaid'}</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Conditionally show deposit fields if "yes" */}
                  {approveConfirmModal.hasPaidDeposit === 'yes' && (
                    <div className="space-y-3.5 p-4 bg-zinc-50 border border-zinc-150 rounded-2xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'مبلغ العربون / الدفعة' : 'Deposit Amount'}</label>
                          <input
                            type="number"
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-extrabold outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Amount"
                            value={approveConfirmModal.depositAmount || ''}
                            onChange={(e) => setApproveConfirmModal({ ...approveConfirmModal, depositAmount: Number(e.target.value) })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'طريقة دفع العربون' : 'Payment Method'}</label>
                          <select
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                            value={approveConfirmModal.paymentMethod}
                            onChange={(e) => setApproveConfirmModal({ ...approveConfirmModal, paymentMethod: e.target.value as any })}
                          >
                            <option value="bank_saib">Bank Transfer (SAIB)</option>
                            <option value="instapay">InstaPay</option>
                            <option value="vodafone_cash">Vodafone Cash</option>
                            <option value="cash">Cash</option>
                          </select>
                        </div>
                      </div>

                      {/* File Upload Section for Payment Proof */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isRtl ? 'صورة إيصال التحصيل / إثبات الدفع' : 'Proof of payment collection'}</label>
                        <div className="p-4 border-2 border-dashed border-zinc-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all bg-white hover:bg-indigo-50/25 relative cursor-pointer group">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleModalProofUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <FileSpreadsheet size={18} className="text-zinc-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                          <span className="text-[10px] font-bold text-zinc-650 group-hover:text-indigo-600 transition-colors text-center w-full truncate pointer-events-none block">
                            {depositProof ? depositProof.name : (isRtl ? 'اسحب أو حدد ملف الإثبات' : 'Click/Drag receipt image file')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setDepositProof(null);
                        setApproveConfirmModal({ ...approveConfirmModal, isOpen: false });
                      }}
                      className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => {
                        if (approveConfirmModal.hasPaidDeposit === 'yes' && approveConfirmModal.depositAmount <= 0) {
                          return alert(isRtl ? 'يرجى إدخال مبلغ العربون للمتابعة' : 'Please specify deposit amount');
                        }

                        // Update Status
                        dbInstance.updateQuotationStatus(approveConfirmModal.quoteId, 'confirmed');

                        // Record Deposit
                        if (approveConfirmModal.hasPaidDeposit === 'yes') {
                          dbInstance.recordQuotationDeposit(
                            approveConfirmModal.quoteId,
                            approveConfirmModal.depositAmount,
                            approveConfirmModal.paymentMethod,
                            depositProof?.url,
                            depositProof?.name
                          );
                        }

                        alert(isRtl ? 'تم تفعيل الملف وإمضاء العقد بنجاح!' : 'Quotation approved and contract activated successfully!');
                        setDepositProof(null);
                        setApproveConfirmModal({ ...approveConfirmModal, isOpen: false });
                      }}
                      className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
                    >
                      {isRtl ? 'تأكيد واعتماد العقد' : 'Confirm & Activate Project'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Proof of Payment Preview Overlay Lightbox */}
      {proofPreview?.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[130] flex flex-col items-center justify-center p-4 animate-in fade-in">
          <div className="absolute top-4 right-4 flex gap-4">
            <a
              href={proofPreview.url}
              download={proofPreview.name}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-850 text-xs font-black rounded-xl tracking-tight shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              {isRtl ? 'تحميل الملف' : 'Download File'}
            </a>
            <button
              onClick={() => setProofPreview(null)}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-805 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-900 max-w-2xl w-full max-h-[80vh] flex flex-col justify-center items-center gap-4 animate-in zoom-in-95 mt-10">
            <div className="flex items-center gap-1.5 text-zinc-400 border-b border-zinc-900 pb-2 w-full">
              <Receipt size={14} className="text-zinc-500" />
              <span className="text-[10px] font-bold font-mono tracking-tight text-zinc-400 truncate">{proofPreview.name}</span>
            </div>
            
            {proofPreview.url.startsWith('data:image/') || proofPreview.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img
                src={proofPreview.url}
                alt={proofPreview.name}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-zinc-905"
              />
            ) : (
              <div className="h-60 flex flex-col items-center justify-center gap-3">
                <FileStack size={42} className="text-zinc-750 animate-pulse" />
                <p className="text-xs text-zinc-500 font-bold">{isRtl ? 'المعاينة غير متاحة لملفات PDF - يمكنك التحميل مباشرة' : 'Preview not available for PDF. Please download to view.'}</p>
                <a
                  href={proofPreview.url}
                  download={proofPreview.name}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition-all"
                >
                  {isRtl ? 'تحميل الملف الآن' : 'Download Document Now'}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Summary Cards for Module */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <SummaryCard 
           icon={<RefreshCw size={18} className="text-blue-500"/>}
           label={isRtl ? 'عروض قيد الانتظار' : 'Pending Quotations'}
           value={data.quotations.filter(q => q.status === 'sent').length}
           subtext={isRtl ? 'تحتاج لمتابعة مع العملاء' : 'Active folllow-ups required'}
         />
         <SummaryCard 
           icon={<Clock size={18} className="text-red-500"/>}
           label={isRtl ? 'فواتير غير مدفوعة' : 'Unpaid Invoices'}
           value={data.invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').length}
           subtext={isRtl ? 'تنتظر التحصيل المالي' : 'Awaiting payment confirmation'}
         />
         <SummaryCard 
           icon={<CheckCircle2 size={18} className="text-green-500"/>}
           label={isRtl ? 'مبيعات الشهر' : 'Month Conversions'}
           value={data.quotations.filter(q => q.status === 'converted').length}
           subtext={isRtl ? 'عروض تحولت لمشاريع' : 'Successfully closed deals'}
         />
      </div>

      {/* Email Send Modal Overlay */}
      {emailModal.isOpen && emailModal.quote && (
        <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-[120] p-4 animate-fade-in font-sans backdrop-blur-xs">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg border border-zinc-200 shadow-xl flex flex-col text-xs text-zinc-700">
            <h3 className="font-extrabold tracking-tight text-base text-zinc-900 mb-2 pb-2 border-b border-zinc-150 flex items-center gap-1.5">
              <Mail size={16} />
              {isRtl ? 'إرسال عرض السعر بالبريد الإلكتروني' : 'Send Official Quotation via Email'}
            </h3>
            
            <div className="space-y-4 my-2 flex-1">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Recipient Email</label>
                <input 
                  type="email" 
                  value={emailModal.to} 
                  onChange={e => setEmailModal({ ...emailModal, to: e.target.value })}
                  className="w-full p-2 bg-white border border-zinc-250 rounded-lg font-mono text-[11px] font-semibold text-zinc-800 focus:outline-none focus:border-zinc-400"
                  placeholder="client@example.com"
                  disabled={emailModal.sending}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Subject</label>
                <input 
                  type="text" 
                  value={emailModal.subject} 
                  onChange={e => setEmailModal({ ...emailModal, subject: e.target.value })}
                  className="w-full p-2 bg-white border border-zinc-250 rounded-lg text-[11px] font-semibold text-zinc-800 focus:outline-none focus:border-zinc-400"
                  disabled={emailModal.sending}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Email Body Text</label>
                <textarea 
                  value={emailModal.body} 
                  onChange={e => setEmailModal({ ...emailModal, body: e.target.value })}
                  rows={6}
                  className="w-full p-2 bg-white border border-zinc-250 rounded-lg text-[11px] font-medium text-zinc-800 focus:outline-none focus:border-zinc-400 whitespace-pre-line leading-relaxed"
                  disabled={emailModal.sending}
                />
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-2">
                <Paperclip size={14} className="text-zinc-400" />
                <div>
                  <span className="font-semibold text-zinc-800 block text-[10px]">Attached Document:</span>
                  <span className="font-mono text-zinc-500 text-[9px]">Quotation-${emailModal.quote.quoteNumber}.pdf (Automatically generated A4 proposal)</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-zinc-150 mt-4 font-sans">
              <button
                type="button"
                onClick={() => setEmailModal({ ...emailModal, isOpen: false, quote: null })}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200/60 cursor-pointer"
                disabled={emailModal.sending}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={submitSendEmail}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                disabled={emailModal.sending}
              >
                {emailModal.sending ? (
                  <>
                    <RefreshCw className="animate-spin" size={12} />
                    {isRtl ? 'جاري الإرسال والتحميل...' : 'Generating & Sending...'}
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    {isRtl ? 'إرسال البريد المرفق' : 'Send Proposal PDF'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: QuotationStatus | InvoiceStatus }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-50 text-green-600',
    sent: 'bg-blue-50 text-blue-600',
    unpaid: 'bg-red-50 text-red-600',
    partial: 'bg-amber-50 text-amber-600',
    draft: 'bg-zinc-100 text-zinc-500',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-zinc-200 text-zinc-500',
    converted: 'bg-indigo-50 text-indigo-600',
    viewed: 'bg-sky-50 text-sky-600',
    overdue: 'bg-red-600 text-white shadow-sm',
    cancelled: 'bg-zinc-300 text-zinc-700'
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg uppercase font-black text-[9px] tracking-tighter shadow-sm ${styles[status] || styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function SummaryCard({ icon, label, value, subtext }: { icon: any, label: string, value: number, subtext: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">{icon}</div>
      <div className="space-y-0.5">
        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</h4>
        <p className="text-2xl font-black text-zinc-900 tracking-tighter">{value}</p>
        <p className="text-[10px] text-zinc-400 font-medium">{subtext}</p>
      </div>
    </div>
  );
}
