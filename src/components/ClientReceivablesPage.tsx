/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, AlertCircle, CheckCircle, Plus, Calendar, DollarSign, 
  Search, ShieldAlert, HeartHandshake, CreditCard, Filter, FileText, Printer, Download
} from 'lucide-react';
import { Client, ClientReceivableRecord, PaymentMethod, Task } from '../types';
import dbInstance from '../db/store';
import { jsPDF } from 'jspdf';
import { useToast } from './Toast';

interface ClientReceivablesPageProps {
  isRtl: boolean;
  currentRole: string;
}

export const ClientReceivablesPage: React.FC<ClientReceivablesPageProps> = ({ isRtl, currentRole }) => {
  const { warning, error } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [receivables, setReceivables] = useState<ClientReceivableRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'crm' | 'matrix'>('matrix');

  // Client registration states
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [cName, setCName] = useState('');
  const [cNameAr, setCNameAr] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cType, setCType] = useState<'individual' | 'company' | 'agency'>('individual');
  const [cNotes, setCNotes] = useState('');

  // Settlement states
  const [settlingRecordId, setSettlingRecordId] = useState<string | null>(null);
  const [settlingMethod, setSettlingMethod] = useState<PaymentMethod>('cash');
  const [settlingAmount, setSettlingAmount] = useState<number>(0);

  // New Invoice Desk Generation States & Functions
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const getCompletedUnpaidTasksForClient = (client: Client) => {
    return dbInstance.tasks.filter(t => {
      const matchesId = t.clientId && t.clientId === client.id;
      const matchesPhone = t.clientPhone && client.phone && t.clientPhone === client.phone;
      const isCompleted = t.status === 'completed' || t.status === 'delivered' || t.status === 'archived';
      const isUnpaid = t.paymentStatus === 'unpaid' || t.paymentStatus === 'partial';
      return (matchesId || matchesPhone) && isCompleted && isUnpaid;
    });
  };

  const handleGenerateInvoice = (client: Client) => {
    const clientTasks = getCompletedUnpaidTasksForClient(client);

    if (clientTasks.length === 0) {
      warning(isRtl 
        ? `لا توجد أي مهام مكتملة غير مدفوعة للعميل: ${client.name} لإنشاء فاتورة لها!` 
        : `No completed, unpaid tasks found for client: ${client.name} to compile into an invoice.`
      );
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Top primary Accent bar (navy block)
    doc.setFillColor(27, 79, 114);
    doc.rect(0, 0, pageWidth, 10, 'F');

    let y = 22;

    // Company Letterhead - Clean corporate look
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(27, 79, 114);
    doc.text('GLOBALIZE SYSTEM', 14, y);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 110, 120);
    doc.text('Premium Dual-Language Certified Translation & Localization Services', 14, y + 4.5);
    doc.text('12 El-Khalifa El-Maamoun St, Heliopolis, Cairo, Egypt', 14, y + 8.5);
    doc.text('Support: billing@globalizesystem.com | Tel: +20224156000', 14, y + 12.5);

    // Divider Line
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.line(14, y + 17, pageWidth - 14, y + 17);

    y += 24;

    // Invoice Title & Info Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(33, 47, 61);
    doc.text('OFFICIAL STATEMENT OF OUTSTANDING DUES', 14, y);

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(110, 120, 130);
    doc.text(`Invoice Ref: INV-${new Date().getFullYear()}-${client.id.replace('c-', '').toUpperCase()}`, 135, y - 1);
    doc.text(`Compile Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 135, y + 3.5);
    doc.text(`Term: Immediate bank wire transfer requested`, 135, y + 8);

    y += 16;

    // Client details info container box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, pageWidth - 28, 24, 'DF');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(27, 79, 114);
    doc.text('DEBTOR / CLIENT INFORMATION:', 18, y + 5);

    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text(client.name, 18, y + 10.5);
    if (client.nameAr) {
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 120);
      doc.text(`Reference: ${client.nameAr}`, 18, y + 15);
    }

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(33, 47, 61);
    doc.text(`Class Tier: ${client.clientType?.toUpperCase() || 'INDIVIDUAL'}`, 125, y + 5);
    doc.text(`Phone: ${client.phone || 'N/A'}`, 125, y + 10.5);
    doc.text(`Email: ${client.email || 'N/A'}`, 125, y + 15);

    y += 30;

    // Document compilation table header
    doc.setFillColor(27, 79, 114);
    doc.rect(14, y, pageWidth - 28, 7.5, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Ref No', 16, y + 5);
    doc.text('Document Name', 38, y + 5);
    doc.text('Task Type', 94, y + 5);
    doc.text('Langs', 125, y + 5);
    doc.text('Wordcount', 144, y + 5);
    doc.text('Original Fee', 164, y + 5);
    doc.text('Net Pending', 184, y + 5);

    y += 7.5;

    // Print rows
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    let sumEgpDue = 0;
    let sumAedDue = 0;
    let sumUsdDue = 0;

    clientTasks.forEach((t, i) => {
      // Row zebra background
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
      }

      // Border bottom line
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 7, pageWidth - 14, y + 7);

      doc.setFont('Helvetica', 'bold');
      doc.text(t.referenceNo || `T-${t.id}`, 16, y + 4.5);

      doc.setFont('Helvetica', 'normal');
      // Truncate document name
      let docName = t.fileName || 'Untargeted File';
      if (docName.length > 28) docName = docName.substring(0, 25) + '...';
      doc.text(docName, 38, y + 4.5);

      const sType = t.serviceType ? t.serviceType.replace('_', ' ').toUpperCase() : 'TRANSLATION';
      doc.text(sType, 94, y + 4.5);

      const langs = `${t.sourceLanguage.slice(0, 3)} to ${t.targetLanguage.slice(0, 3)}`;
      doc.text(langs.toUpperCase(), 125, y + 4.5);

      doc.text((t.wordCount || 0).toLocaleString(), 144, y + 4.5);

      // Currencies amounts
      let origStr = '';
      let pendingStr = '';

      if (t.amountUsd > 0) {
        origStr = `$ ${t.amountUsd.toLocaleString()}`;
        const pend = Math.max(0, t.amountUsd - (t.paidAmountUsd || 0));
        pendingStr = `$ ${pend.toLocaleString()}`;
        sumUsdDue += pend;
      } else if (t.amountAed > 0) {
        origStr = `${t.amountAed.toLocaleString()} AED`;
        const pend = Math.max(0, t.amountAed - (t.paidAmountAed || 0));
        pendingStr = `${pend.toLocaleString()} AED`;
        sumAedDue += pend;
      } else {
        origStr = `${t.amountEgp.toLocaleString()} EGP`;
        const pend = Math.max(0, t.amountEgp - (t.paidAmountEgp || 0));
        pendingStr = `${pend.toLocaleString()} EGP`;
        sumEgpDue += pend;
      }

      doc.text(origStr, 164, y + 4.5);

      // Red bold highlight for the pending balance
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text(pendingStr, 184, y + 4.5);
      
      // Reset color text
      doc.setTextColor(51, 65, 85);
      doc.setFont('Helvetica', 'normal');

      y += 7;
    });

    y += 5;

    // Total calculations box
    doc.setFillColor(248, 250, 252);
    doc.rect(110, y, pageWidth - 124, 22, 'F');
    doc.setDrawColor(27, 79, 114);
    doc.line(110, y, pageWidth - 14, y);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(27, 79, 114);
    doc.text('ACCUMULATED BALANCE DUE:', 114, y + 5.5);

    doc.setFontSize(10);
    doc.setTextColor(220, 53, 69);
    
    const dueStrings: string[] = [];
    if (sumEgpDue > 0) dueStrings.push(`${sumEgpDue.toLocaleString()} EGP`);
    if (sumAedDue > 0) dueStrings.push(`${sumAedDue.toLocaleString()} AED`);
    if (sumUsdDue > 0) dueStrings.push(`${sumUsdDue.toLocaleString()} USD`);

    if (dueStrings.length === 0) {
      doc.setTextColor(40, 167, 69); // Green if fully paid
      doc.text('0.00 (Outstanding Balance Settled)', 114, y + 12);
    } else {
      doc.text(dueStrings.join('   |   '), 114, y + 12);
    }

    y += 28;

    // Wire instructions notice
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(33, 47, 61);
    doc.text('BANK WIRE TRANSFER & ROUTING DETAILS:', 14, y);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 120);
    doc.text('- EGP National Bank of Egypt (NBE) Router ID: EGP_NBE_HELIO_993510', 14, y + 4);
    doc.text('- USD / AED Multi-Asset Central Clearing: SAIB Bank Heliopolis Branch Account #: 4220-33501', 14, y + 8);
    doc.text('- InstaPay instant routing handle: gold.translations@instapay (EGP transfers only)', 14, y + 12);

    y += 22;

    // Signatures
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(14, y, 64, y);
    doc.line(140, y, 190, y);

    doc.setFontSize(7);
    doc.text(`Authorized Audit Signature: ${dbInstance.activeProfile?.fullName || 'Financial Accountant'}`, 14, y + 4);
    doc.text('Debtor Client Approver / Delegate', 140, y + 4);

    // Footer copyright bar
    doc.setFillColor(27, 79, 114);
    doc.rect(0, pageHeight - 9, pageWidth, 9, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('GLOBALIZE SYSTEM  •  CONFIDENTIAL INTENDED RECIPIENT ONLY', pageWidth / 2, pageHeight - 3.5, { align: 'center' });

    doc.save(`Invoice_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  useEffect(() => {
    setClients(dbInstance.clients);
    setReceivables(dbInstance.receivables);

    const sub = dbInstance.subscribe(() => {
      setClients([...dbInstance.clients]);
      setReceivables([...dbInstance.receivables]);
    });
    return sub;
  }, []);

  const filteredClients = clients.filter(c => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.nameAr && c.nameAr.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.nationality && c.nationality.toLowerCase().includes(q)) ||
      (c.clientType && c.clientType.toLowerCase().includes(q))
    );
  });

  const handleRegisterClient = (e: React.FormEvent) => {
    e.preventDefault();
    dbInstance.addClient(cName, cNameAr, cPhone, cEmail, cType, cNotes);
    setIsAddingClient(false);
    setCName('');
    setCNameAr('');
    setCPhone('');
    setCEmail('');
    setCType('individual');
    setCNotes('');
  };

  const handleOpenSettle = (rec: ClientReceivableRecord) => {
    if (currentRole !== 'owner' && currentRole !== 'accountant') {
      error('Access Denied. Only Owners or Accountants can close client receivable sheets.');
      return;
    }
    setSettlingRecordId(rec.id);
    setSettlingAmount(rec.remaining);
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (settlingRecordId) {
      const rec = dbInstance.receivables.find(r => r.id === settlingRecordId);
      if (rec) {
        // Trigger payment registration
        dbInstance.addPayment({
          paymentDate: new Date().toISOString().split('T')[0],
          paymentType: 'income',
          amountEgp: rec.currency === 'EGP' ? settlingAmount : 0,
          amountAed: rec.currency === 'AED' ? settlingAmount : 0,
          amountUsd: rec.currency === 'USD' ? settlingAmount : 0,
          paymentMethod: settlingMethod,
          clientName: rec.clientName,
          fileName: `Manual Settle Invoice Balance for closing month: ${rec.period}`,
          notes: `Reconciled past outstanding accounts receivable ledger sheet (${rec.currency})`
        });

        // Mutate the target monthly record
        rec.paidAmount += settlingAmount;
        rec.remaining = Math.max(0, rec.amount - rec.paidAmount);
        
        // Subtract client total ledger values
        const targetClient = dbInstance.clients.find(c => c.id === rec.clientId);
        if (targetClient) {
          if (rec.currency === 'EGP') targetClient.totalReceivablesEgp = Math.max(0, targetClient.totalReceivablesEgp - settlingAmount);
          if (rec.currency === 'AED') targetClient.totalReceivablesAed = Math.max(0, targetClient.totalReceivablesAed - settlingAmount);
          if (rec.currency === 'USD') targetClient.totalReceivablesUsd = Math.max(0, targetClient.totalReceivablesUsd - settlingAmount);
        }

        dbInstance.save();
        setSettlingRecordId(null);
      }
    }
  };

  // Organize receivables columns chronologically (historically)
  const billingMonths = Array.from(new Set(receivables.map(r => r.period))).sort().reverse();
  
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const pendingTasksForSelected = selectedClient ? getCompletedUnpaidTasksForClient(selectedClient) : [];

  const handleExportCSV = () => {
    let csvContent = "\ufeff"; // BOM for Excel UTF-8 support
    let fileName = "";

    if (activeTab === "crm") {
      const headers = ["Origin", "Client Name (EN)", "Client Name (AR)", "Phone ID", "Billing Tier", "Receivables EGP", "Receivables AED", "Receivables USD", "Registration Date"];
      const rows = clients.map((c) => [
        `"${c.nationality || "Egypt"}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${(c.nameAr || "").replace(/"/g, '""')}"`,
        `"${c.phone || ""}"`,
        `"${c.clientType}"`,
        c.totalReceivablesEgp,
        c.totalReceivablesAed,
        c.totalReceivablesUsd,
        `"${c.createdAt?.split('T')[0] || ''}"`
      ]);
      csvContent += [headers, ...rows].map((e) => e.join(",")).join("\n");
      fileName = `CRM_Client_Directory_${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      const headers = ["Client Account", "Billing Period", "Currency", "Debit Amount", "Settled Amount", "Remaining Balance", "Account Notes"];
      const rows = receivables.map((r) => [
        `"${r.clientName.replace(/"/g, '""')}"`,
        `"${r.period}"`,
        `"${r.currency}"`,
        r.amount,
        r.paidAmount,
        r.remaining,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ]);
      csvContent += [headers, ...rows].map((e) => e.join(",")).join("\n");
      fileName = `Financial_Receivables_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* Header bar controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 bg-white p-5 rounded-2xl shadow-sm border border-slate-50">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isRtl ? 'دفتر مديونيات العملاء الشهرية' : 'Monthly Receivables Matrix Ledger'}
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'crm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isRtl ? 'شجرة وملفات العملاء' : 'Active Client Directories (CRM)'}
          </button>
        </div>

        {/* Action triggers */}
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
            title="Download CSV report"
          >
            <Download size={14} />
            <span>{isRtl ? 'تصدير البيانات CSV' : 'Export Reports CSV'}</span>
          </button>

          {activeTab === 'crm' && (
            <button
              onClick={() => setIsAddingClient(!isAddingClient)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-slate-800"
            >
              <Plus size={14} />
              <span>{isRtl ? 'تسجيل عميل جديد' : 'Add New Client CRM'}</span>
            </button>
          )}
        </div>
      </div>

      {/* PERSISTENT BILLING DESK & PDF COMPILER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="text-indigo-605 text-indigo-600 w-5 h-5 shrink-0" />
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {isRtl ? 'بوابة إصدار فواتير المطالبات المالية (PDF)' : 'Corporate Invoice Desk & Claim Compiler'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {isRtl ? 'تجميع كافة الملفات المترجمة المعتمدة غير المدفوعة للعميل وإصدار فاتورة PDF موحدة' : 'Compile all completed & delivered unpaid translation tasks for a selected client into a downloadable statement invoice.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
              {isRtl ? 'اختر حساب العميل المستهدف:' : '1. Select Debtor Client Account'}
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            >
              <option value="">-- {isRtl ? 'اختر عميل من الدليل' : 'Select client from CRM'} --</option>
              {clients.map(c => {
                const count = getCompletedUnpaidTasksForClient(c).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nameAr ? `(${c.nameAr})` : ''} — {count} {isRtl ? 'مهام جاهزة' : 'unpaid tasks'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="md:col-span-2 bg-slate-50/50 rounded-xl p-4 border border-slate-100 min-h-[64px] flex flex-col justify-center">
            {selectedClient ? (
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="text-xs">
                  <p className="font-bold text-slate-800">
                    {isRtl ? 'كشف الحساب الرقمي للعميل:' : 'Debtor Details Summary:'}{' '}
                    <span className="text-indigo-600 font-extrabold">{selectedClient.name}</span>
                  </p>
                  {pendingTasksForSelected.length > 0 ? (
                    <div className="space-y-1 mt-1 font-medium text-slate-600">
                      <p>
                        🔍 Status:{' '}
                        <span className="text-slate-905 font-mono font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-100 text-[10px]">
                          {pendingTasksForSelected.length} {isRtl ? 'مستندات مكتملة غير مسددة' : 'completed, unpaid records'}
                        </span>
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 mt-1 flex gap-4 flex-wrap">
                        {pendingTasksForSelected.reduce((sum, t) => sum + Math.max(0, t.amountEgp - (t.paidAmountEgp || 0)), 0) > 0 && (
                          <span>EGP: <strong className="text-rose-700 font-extrabold">{pendingTasksForSelected.reduce((sum, t) => sum + Math.max(0, t.amountEgp - (t.paidAmountEgp || 0)), 0).toLocaleString()}</strong></span>
                        )}
                        {pendingTasksForSelected.reduce((sum, t) => sum + Math.max(0, t.amountAed - (t.paidAmountAed || 0)), 0) > 0 && (
                          <span>AED: <strong className="text-indigo-750 font-extrabold text-indigo-700">{pendingTasksForSelected.reduce((sum, t) => sum + Math.max(0, t.amountAed - (t.paidAmountAed || 0)), 0).toLocaleString()}</strong></span>
                        )}
                        {pendingTasksForSelected.reduce((sum, t) => sum + Math.max(0, t.amountUsd - (t.paidAmountUsd || 0)), 0) > 0 && (
                          <span>USD: <strong className="text-emerald-700 font-extrabold">{pendingTasksForSelected.reduce((sum, t) => sum + Math.max(0, t.amountUsd - (t.paidAmountUsd || 0)), 0).toLocaleString()}</strong></span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1">
                      <CheckCircle size={12} className="text-emerald-500" /> {isRtl ? 'الحساب مسوى تماماً ولا يوجد أي مستحقات مالية مكتملة غير مدفوعة!' : 'All completed tasks are fully paid. The core account ledger is clean & settled!'}
                    </p>
                  )}
                </div>

                {pendingTasksForSelected.length > 0 && (
                  <button
                    onClick={() => handleGenerateInvoice(selectedClient)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer select-none active:scale-95 text-center"
                    id="gen-invoice-desk-btn"
                  >
                    <Download size={13} className="shrink-0" />
                    <span>{isRtl ? 'تحميل الفاتورة المطالبة PDF' : 'Generate Claims Invoice'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center md:text-left text-slate-400 text-xs py-1 italic">
                {isRtl ? 'الرجاء اختيار عميل من القائمة المنسدلة للبدء في تجميع ملفات المطالبة واصدار الفواتير' : 'Please select an active client from CRM checklist to inspect outstanding items.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENDER VIEW 1: CRM DIRECTORY */}
      {activeTab === 'crm' && (
        <div className="space-y-6">
          {/* Client add form */}
          {isAddingClient && (
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                Register New Client Account
              </h3>
              <form onSubmit={handleRegisterClient} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">English Full Name</label>
                  <input 
                    type="text" 
                    value={cName} 
                    onChange={e => setCName(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600 focus:outline-none focus:bg-white"
                    placeholder="E.g. Aramco"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Arabic Name (الاسم العربي)</label>
                  <input 
                    type="text" 
                    value={cNameAr} 
                    onChange={e => setCNameAr(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                    placeholder="شركة أرامكو السعودية"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phone / Whatsapp (Identifier)</label>
                  <input 
                    type="text" 
                    value={cPhone} 
                    onChange={e => setCPhone(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                    placeholder="+2010..."
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    value={cEmail} 
                    onChange={e => setCEmail(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    placeholder="billing@aramco.com"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Business Tier Class</label>
                  <select 
                    value={cType} 
                    onChange={e => setCType(e.target.value as any)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="company">Corporate Brand Level (Company)</option>
                    <option value="agency">Consulates/Sub-Agencies (Agency)</option>
                    <option value="individual">Walk-In Citizen (Individual)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Account Notes</label>
                  <input 
                    type="text" 
                    value={cNotes} 
                    onChange={e => setCNotes(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    placeholder="Specific payment cycles, reference clauses..."
                  />
                </div>

                <div className="md:col-span-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingClient(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-550 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Confirm Register client
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Client Directory roster */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in" id="crm-client-accounts-tree">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {isRtl ? 'شجرة حسابات العملاء النشطة' : 'Active CRM Client Accounts Tree'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isRtl ? 'ابحث باسم العميل أو الشركة أو الهاتف أو البريد الإلكتروني' : 'Unified directory searchable by client name, company, email, phone or type'}
                </p>
              </div>

              {/* Client Search Bar */}
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Search size={13} />
                </span>
                <input 
                  type="text" 
                  value={clientSearchQuery}
                  onChange={e => setClientSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 bg-white border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 transition-colors"
                  placeholder={isRtl ? "ابحث بالاسم، الهاتف، البريد أو الشركة..." : "Search name, phone, email..."}
                />
                {clientSearchQuery && (
                  <button 
                    type="button"
                    onClick={() => setClientSearchQuery('')}
                    className="absolute inset-y-0 right-2 px-1 flex items-center text-[10px] font-bold text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left text-slate-600 font-sans">
                <thead className="bg-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-2 font-bold select-none text-center">Origin</th>
                    <th className="px-5 py-3 font-bold">Client Name (AR/EN)</th>
                    <th className="px-5 py-3 font-bold">Primary Phone ID</th>
                    <th className="px-5 py-3 font-bold">Billing tier</th>
                    <th className="px-5 py-3 text-right font-black text-rose-700">Owed EGP Balance</th>
                    <th className="px-5 py-3 text-right font-black text-indigo-700">Owed AED Balance</th>
                    <th className="px-5 py-3 text-right font-black text-cyan-750">Owed USD Balance</th>
                    <th className="px-5 py-3 text-center font-bold">{isRtl ? 'فاتورة المطالبة' : 'Compiled PDF Invoice'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                        {isRtl ? 'لا توجد نتائج مطابقة لمصطلح البحث' : 'No clients matching your search query.'}
                      </td>
                    </tr>
                  ) : filteredClients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="px-5 py-3 text-center text-[9px] font-bold text-slate-400 capitalize">
                        {c.nationality || 'Egypt'}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-extrabold text-slate-900 leading-none">{c.name}</p>
                        <p className="text-[10px] text-slate-405 text-slate-500 font-medium leading-none mt-1.5">{c.nameAr}</p>
                      </td>
                      <td className="px-5 py-3 font-mono font-medium text-slate-705">{c.phone}</td>
                      <td className="px-5 py-3 capitalize prose-sm text-slate-600 font-medium">{c.clientType}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                        EGP {c.totalReceivablesEgp.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/10">
                        AED {c.totalReceivablesAed.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-cyan-750">
                        USD {c.totalReceivablesUsd.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {(() => {
                          const list = getCompletedUnpaidTasksForClient(c);
                          if (list.length > 0) {
                            return (
                              <div className="flex flex-col items-center gap-1.5 justify-center">
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-black font-mono border border-amber-200 px-1.5 py-0.5 rounded leading-none shrink-0 inline-block">
                                  {list.length} {isRtl ? 'غير مفوتر' : 'unpaid'}
                                </span>
                                <button
                                  onClick={() => handleGenerateInvoice(c)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded cursor-pointer transition-all select-none leading-none shrink-0"
                                  title={isRtl ? 'تحميل فاتورة المطالبات المالية PDF' : 'Download compiled statement claim PDF'}
                                  id={`crm-invoice-btn-${c.id}`}
                                >
                                  <Download size={10} />
                                  <span>{isRtl ? 'الفاتورة' : 'Invoice'}</span>
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <span className="text-emerald-700 font-bold text-[9.5px] bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded inline-block shrink-0 leading-none">
                                {isRtl ? 'أرصدة مسواة' : 'Settled'}
                              </span>
                            );
                          }
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW 2: RECEIVALBES BILLING MONTHS GRID MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm pb-1 border-b border-slate-100">
              {isRtl ? 'بيان مديونيات العملاء الآجلة المفصلة حسب شهر المعاملة' : 'Bureau Unpaid Installments Ledger (Back to 2023)'}
            </h3>
            <p className="text-[10px] text-slate-450 text-slate-400 leading-normal mt-1.5 mb-3">
              Tracks outstanding customer account totals separated strictly by historical monthly invoice batches. 
            </p>

            <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600 font-sans border-collapse">
                <thead className="bg-[#1B4F72] text-white">
                  <tr>
                    <th className="px-4 py-3 border-r border-[#153e5a] font-bold">Client Account / Company</th>
                    <th className="px-4 py-3 border-r border-[#153e5a] font-bold text-center">Batch Period</th>
                    <th className="px-4 py-3 border-r border-[#153e5a] font-bold text-center">Currency Unit</th>
                    <th className="px-4 py-3 border-r border-[#153e5a] text-right font-bold">Amount Owed</th>
                    <th className="px-4 py-3 border-r border-[#153e5a] text-right font-bold text-emerald-300">Amount Paid</th>
                    <th className="px-4 py-3 border-r border-[#153e5a] text-right font-black text-rose-300">Remaining Balance</th>
                    <th className="px-4 py-3 border-r border-[#153e5a] font-bold">Account Remarks</th>
                    <th className="px-4 py-3 text-center font-bold">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {receivables.map(rec => (
                    <tr key={rec.id} className={`hover:bg-slate-50 transition-all ${rec.remaining <= 0.01 ? 'bg-emerald-50/10' : ''}`}>
                      <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{rec.clientName}</td>
                      <td className="px-4 py-3 font-mono text-center border-r border-slate-100 font-bold shrink-0">{rec.period}</td>
                      <td className="px-4 py-3 font-bold text-center border-r border-slate-100 font-mono text-slate-500">{rec.currency}</td>
                      <td className="px-4 py-3 text-right border-r border-slate-100 font-mono font-bold">{rec.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right border-r border-slate-100 font-mono text-emerald-700 bg-emerald-50/10">{rec.paidAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right border-r border-slate-100 font-mono font-black text-rose-700 bg-rose-50/15">{rec.remaining.toLocaleString()}</td>
                      <td className="px-4 py-3 border-r border-slate-100 italic text-slate-400 max-w-xs truncate" title={rec.notes}>{rec.notes || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {rec.remaining > 0.01 ? (
                          <button
                            onClick={() => handleOpenSettle(rec)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer transition-all active:scale-95 shrink-0"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 flex justify-center items-center gap-1 shrink-0">
                            <CheckCircle size={12} /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILE POPUP FOR DIRECT RECEIVABLES MARKING */}
      {settlingRecordId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <CreditCard size={16} className="text-rose-600" />
              Settle Due Receivables Month
            </h4>
            <p className="text-[10px] text-slate-405 text-slate-400 leading-normal mt-2">
              Executing this will register a Debit (Inflow) payment in the daily Cash Book, subtract from this aging month balance, and reduce total customer accounts receivables.
            </p>

            <form onSubmit={handleConfirmSettle} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Settlement Payee method</label>
                <select 
                  value={settlingMethod} 
                  onChange={e => setSettlingMethod(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer focus:outline-none"
                >
                  <option value="cash">Cash (خزينة)</option>
                  <option value="bank_saib">SAIB Bank Account</option>
                  <option value="nbe">NBE Postal wire</option>
                  <option value="instapay">Instapay</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Paying Amount ({dbInstance.receivables.find(r => r.id === settlingRecordId)?.currency})</label>
                <input 
                  type="number" 
                  value={settlingAmount || ''} 
                  onChange={e => setSettlingAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 text-xs font-mono font-black rounded-xl focus:outline-none text-center text-rose-700"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingRecordId(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                >
                  Post Settle Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReceivablesPage;
