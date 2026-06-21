/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead, Profile, Invoice, OperatingExpense, Client, FinancialTransaction, Task } from '../types';
import { dbInstance } from '../db/store';

// Helper to add UTF-8 Byte Order Mark (BOM) to support Arabic in Excel
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const clean = (val || '').replace(/"/g, '""'); // Escape double quotes
        return clean.includes(',') || clean.includes('\n') || clean.includes('"') 
          ? `"${clean}"` 
          : clean;
      }).join(',')
    )
  ].join('\n');

  // Prefix with BOM
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 1. Download Lead CSV spreadsheet Template
 */
export function downloadLeadsTemplate(isRtl: boolean) {
  const filename = isRtl ? 'نموذج_استيراد_العملاء.csv' : 'gtms_leads_import_template.csv';
  const headers = [
    'Name',
    'Company',
    'Email',
    'Phone',
    'Source',
    'Priority',
    'Estimated Value',
    'Currency',
    'Service Interests (comma separated)',
    'Notes'
  ];
  
  const rows: string[][] = [];
  
  downloadCSV(filename, headers, rows);
}

/**
 * 2. Export Leads to CSV
 */
export function exportLeadsToCSV(leads: Lead[], isRtl: boolean) {
  const filename = isRtl ? 'العملاء_المحتملين_المصدرين.csv' : 'gtms_exported_leads.csv';
  const headers = [
    'Lead ID',
    'Name',
    'Company',
    'Email',
    'Phone',
    'Source',
    'Stage',
    'Priority',
    'Estimated Value',
    'Currency',
    'Service Interests',
    'Notes',
    'Created At'
  ];

  const rows = leads.map(l => [
    l.id,
    l.name,
    l.company || '',
    l.email || '',
    l.phone || '',
    l.source,
    l.stage,
    l.priority,
    l.estimatedValue.toString(),
    l.currency,
    (l.serviceInterests || []).join('; '),
    l.notes || '',
    l.createdAt
  ]);

  downloadCSV(filename, headers, rows);
}

/**
 * 3. Parser for Leads CSV
 * Supported format headers: Name, Company, Email, Phone, Source, Priority, Estimated Value, Currency, Service Interests, Notes
 */
export function parseLeadsCSV(csvText: string): Omit<Lead, 'id' | 'createdAt' | 'createdBy'>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Very simple CSV parser to handle quotes and commas
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let insideQuote = false;
    let entry = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (insideQuote && text[i + 1] === '"') {
          entry += '"'; // Doubled quote inside quote
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const parsedLeads: Omit<Lead, 'id' | 'createdAt' | 'createdBy'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || !values[0]) continue; // Skip empty rows

    // Map headers dynamically
    const nameIndex = headers.findIndex(h => h.includes('name'));
    const companyIndex = headers.findIndex(h => h.includes('company'));
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const phoneIndex = headers.findIndex(h => h.includes('phone'));
    const sourceIndex = headers.findIndex(h => h.includes('source'));
    const priorityIndex = headers.findIndex(h => h.includes('priority'));
    const estValIndex = headers.findIndex(h => h.includes('estimatedvalue') || h.includes('value'));
    const currencyIndex = headers.findIndex(h => h.includes('currency'));
    const interestsIndex = headers.findIndex(h => h.includes('interest') || h.includes('service'));
    const notesIndex = headers.findIndex(h => h.includes('note'));

    const name = nameIndex !== -1 ? values[nameIndex] : '';
    if (!name) continue; // Name is required

    const company = companyIndex !== -1 ? values[companyIndex] : '';
    const email = emailIndex !== -1 ? values[emailIndex] : '';
    const phone = phoneIndex !== -1 ? values[phoneIndex] : '';
    
    // Fallback safe values
    let source = 'website' as any;
    if (sourceIndex !== -1 && values[sourceIndex]) {
      const srcVal = values[sourceIndex].toLowerCase().replace(/\s+/g, '_');
      if (['social_media', 'referral', 'website', 'walk_in', 'email', 'event', 'other'].includes(srcVal)) {
        source = srcVal;
      }
    }

    let priority = 'medium' as any;
    if (priorityIndex !== -1 && values[priorityIndex]) {
      const pVal = values[priorityIndex].toLowerCase();
      if (['low', 'medium', 'high'].includes(pVal)) {
        priority = pVal;
      }
    }

    const estimatedValue = estValIndex !== -1 ? (parseFloat(values[estValIndex]) || 0) : 0;
    
    let currency = 'EGP' as any;
    if (currencyIndex !== -1 && values[currencyIndex]) {
      const curVal = values[currencyIndex].toUpperCase();
      if (['EGP', 'AED', 'USD'].includes(curVal)) {
        currency = curVal;
      }
    }

    let serviceInterests: any[] = [];
    if (interestsIndex !== -1 && values[interestsIndex]) {
      // split by either comma or semicolon
      serviceInterests = values[interestsIndex]
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(Boolean);
    }
    if (serviceInterests.length === 0) {
      serviceInterests = ['Certified Translation'];
    }

    const notes = notesIndex !== -1 ? values[notesIndex] : '';

    parsedLeads.push({
      name,
      company: company || undefined,
      email: email || undefined,
      phone: phone || undefined,
      source,
      stage: 'new', // Import standard default starting stage
      priority,
      estimatedValue,
      currency,
      serviceInterests,
      notes: notes || undefined
    });
  }

  return parsedLeads;
}

/**
 * 4. Export Accounts (User Profiles) & entire Accounting Module
 */
export function exportAccountsAndProfilesCSV(isRtl: boolean) {
  const filename = isRtl ? 'حسابات_وموظفي_الشركة.csv' : 'gtms_corporate_staff_accounts.csv';
  const headers = [
    'Profile ID',
    'Full Name',
    'Full Name Arabic',
    'Security Role',
    'Employee Type',
    'Languages',
    'Native Tongue',
    'Translate FROM',
    'Translate TO',
    'Per Word Rate (EGP)',
    'Per Page Rate (EGP)',
    'Daily Rate (EGP)',
    'Salary Rate (EGP)',
    'Working Hours',
    'Shift',
    'Official Email',
    'Personal Email',
    'Phone',
    'Active Status',
    'Created At'
  ];

  const rows = dbInstance.profiles.map(p => [
    p.id,
    p.fullName,
    p.fullNameAr || '',
    p.role,
    p.employeeType || '',
    (p.languages || []).join('; '),
    p.motherTongue || '',
    (p.sourceLanguages || []).join('; '),
    (p.targetLanguages || []).join('; '),
    p.perWordRate ? p.perWordRate.toString() : '',
    p.perPageRate ? p.perPageRate.toString() : '',
    p.dailyRate ? p.dailyRate.toString() : '',
    p.monthlySalary ? p.monthlySalary.toString() : '',
    p.workingHours ? p.workingHours.toString() : '',
    p.workingShift || '',
    p.email || '',
    p.personalEmail || '',
    p.phone || '',
    p.isActive ? 'Active' : 'Suspended',
    p.createdAt || ''
  ]);

  downloadCSV(filename, headers, rows);
}

export function exportInvoicesCSV(isRtl: boolean) {
  const filename = isRtl ? 'فواتير_المبيعات_المسجلة.csv' : 'gtms_invoices_registry.csv';
  const headers = [
    'Invoice Number',
    'Quotation Ref',
    'Client ID',
    'Client Legal Name',
    'Invoice Date',
    'Due Date',
    'Subtotal (EGP)',
    'Tax (EGP)',
    'Discount (EGP)',
    'Grand Total (EGP)',
    'Paid Amount (EGP)',
    'Balance (EGP)',
    'Status',
    'Payment Notes'
  ];

  const rows = dbInstance.invoices.map(i => {
    const clientName = dbInstance.clients.find(c => c.id === i.clientId)?.name || 'Direct Client';
    return [
      i.invoiceNumber,
      i.quotationId || '',
      i.clientId,
      clientName,
      i.invoiceDate,
      i.dueDate,
      i.subtotal.toString(),
      i.taxTotal.toString(),
      i.discountTotal.toString(),
      i.grandTotal.toString(),
      i.paidAmount.toString(),
      i.balance.toString(),
      i.status,
      i.paymentReference || ''
    ];
  });

  downloadCSV(filename, headers, rows);
}

export function exportExpensesCSV(isRtl: boolean) {
  const filename = isRtl ? 'دفتر_المصروفات_والتكاليف.csv' : 'gtms_operating_expenses.csv';
  const headers = [
    'Expense ID',
    'Expense Date',
    'Reference Title',
    'Category',
    'Amount (EGP)',
    'Payment Method',
    'Payee / Vendor',
    'Payment Status',
    'Recurring'
  ];

  const rows = dbInstance.expenses.map(e => [
    e.id,
    e.paymentDate || '',
    e.description,
    e.category,
    e.amount.toString(),
    e.paymentMethod || 'cash',
    e.vendor || 'N/A',
    e.status,
    e.isRecurring ? 'Yes' : 'No'
  ]);

  downloadCSV(filename, headers, rows);
}

export function exportTransactionsCSV(isRtl: boolean) {
  const filename = isRtl ? 'سجل_القيود_الفردية_الخزينة.csv' : 'gtms_cashbook_transactions.csv';
  const headers = [
    'Transaction Index',
    'Posting Date',
    'Amount (EGP)',
    'Flow Type',
    'Posting Account Code',
    'Reference / Notes',
    'Responsible User',
    'Timestamp'
  ];

  const rows = dbInstance.transactions.map(t => [
    t.id,
    t.date,
    t.amount.toString(),
    t.type, // debit / credit
    t.accountId,
    t.description,
    t.createdBy || '',
    t.createdAt || ''
  ]);

  downloadCSV(filename, headers, rows);
}

export function exportClientsCSV(isRtl: boolean) {
  const filename = isRtl ? 'دليل_العملاء.csv' : 'gtms_clients_directory.csv';
  const headers = [
    'Client ID',
    'Client Name',
    'Arabic Name',
    'Phone',
    'Email Address',
    'Company',
    'Nationality',
    'Client Type',
    'Internal Notes'
  ];

  const rows = dbInstance.clients.map(c => [
    c.id,
    c.name,
    c.nameAr || '',
    c.phone || '',
    c.email || '',
    c.company || '',
    c.nationality || '',
    c.clientType,
    c.notes || ''
  ]);

  downloadCSV(filename, headers, rows);
}

export function exportTasksCSV(isRtl: boolean) {
  const filename = isRtl ? 'قائمة_المهام.csv' : 'gtms_translation_tasks.csv';
  const headers = [
    'Task ID',
    'Reference No',
    'Client ID',
    'Client Name',
    'Client Phone',
    'File Name',
    'Service Type',
    'Source Language',
    'Target Language',
    'Word Count',
    'Page Count',
    'Amount EGP',
    'Amount AED',
    'Amount USD',
    'Has Tax Invoice',
    'Payment Status',
    'Payment Method',
    'Paid EGP',
    'Paid AED',
    'Paid USD',
    'Status',
    'Intake Channel',
    'Intake Date',
    'Deadline',
    'Delivery Date',
    'Priority',
    'Total Cost',
    'Net Revenue'
  ];

  const rows = dbInstance.tasks.map(t => [
    t.id,
    t.referenceNo,
    t.clientId || '',
    t.clientNameCache || '',
    t.clientPhone || '',
    t.fileName,
    t.serviceType,
    t.sourceLanguage,
    t.targetLanguage,
    t.wordCount?.toString() || '0',
    t.pageCount?.toString() || '0',
    t.amountEgp?.toString() || '0',
    t.amountAed?.toString() || '0',
    t.amountUsd?.toString() || '0',
    t.hasTaxInvoice ? 'Yes' : 'No',
    t.paymentStatus,
    t.paymentMethod || '',
    t.paidAmountEgp?.toString() || '0',
    t.paidAmountAed?.toString() || '0',
    t.paidAmountUsd?.toString() || '0',
    t.status,
    t.intakeChannel,
    t.intakeDate,
    t.deadline || '',
    t.deliveryDate || '',
    t.priority || 'medium',
    t.totalCost?.toString() || '0',
    t.netRevenue?.toString() || '0'
  ]);

  downloadCSV(filename, headers, rows);
}
