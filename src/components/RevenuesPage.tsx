/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Search, Filter, ArrowRightLeft, DollarSign, 
  Settings, Check, X, ShieldAlert, BadgeAlert 
} from 'lucide-react';
import { Task, PaymentMethod } from '../types';
import dbInstance from '../db/store';
import { ExportProtectionModal } from './ExportProtectionModal';

interface RevenuesPageProps {
  isRtl: boolean;
  currentRole: string;
}

export const RevenuesPage: React.FC<RevenuesPageProps> = ({ isRtl, currentRole }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'revenues' | 'costs'>('revenues');
  const [isExportShieldOpen, setIsExportShieldOpen] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterTax, setFilterTax] = useState<string>('all');

  // Inline editing states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editEgp, setEditEgp] = useState<number>(0);
  const [editAed, setEditAed] = useState<number>(0);
  const [editUsd, setEditUsd] = useState<number>(0);

  useEffect(() => {
    setTasks(dbInstance.tasks);
    const sub = dbInstance.subscribe(() => {
      setTasks([...dbInstance.tasks]);
    });
    return sub;
  }, []);

  const handleStartEdit = (task: Task) => {
    if (currentRole !== 'owner' && currentRole !== 'accountant') return; // Gate edit authorization
    setEditingTaskId(task.id);
    setEditEgp(task.amountEgp);
    setEditAed(task.amountAed);
    setEditUsd(task.amountUsd);
  };

  const handleSaveEdit = (taskId: string) => {
    const task = dbInstance.tasks.find(t => t.id === taskId);
    if (task) {
      task.amountEgp = editEgp;
      task.amountAed = editAed;
      task.amountUsd = editUsd;
      task.netRevenue = editEgp - task.totalCost; // re-evaluate net
      dbInstance.updateTask(task);
      setEditingTaskId(null);
    }
  };

  // Filter processes
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.clientNameCache && t.clientNameCache.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = 
      filterMethod === 'all' || 
      t.paymentMethod === filterMethod;

    const matchesTax = 
      filterTax === 'all' || 
      (filterTax === 'tax' && t.hasTaxInvoice) ||
      (filterTax === 'nontax' && !t.hasTaxInvoice);

    return matchesSearch && matchesMethod && matchesTax;
  });

  // Calculate sum rows
  const sumEgp = filteredTasks.reduce((s, t) => s + t.amountEgp, 0);
  const sumAed = filteredTasks.reduce((s, t) => s + t.amountAed, 0);
  const sumUsd = filteredTasks.reduce((s, t) => s + t.amountUsd, 0);

  const sumPaidEgp = filteredTasks.reduce((s, t) => s + t.paidAmountEgp, 0);

  // Cost items sum (costs page only)
  const sumTranslation = filteredTasks.reduce((s, t) => s + t.translationCost, 0);
  const sumRevision = filteredTasks.reduce((s, t) => s + t.revisionCost, 0);
  const sumTotalCost = filteredTasks.reduce((s, t) => s + t.totalCost, 0);
  const sumNetRevenue = filteredTasks.reduce((s, t) => s + t.netRevenue, 0);

  const exportCSV = () => {
    const headers = [
      'Reference No', 'Date', 'Client', 'File Name', 'Service Type', 
      'Source-Target', 'EGP Price', 'AED Price', 'USD Price', 'Tax Invoice', 'Status', 'Payment Method'
    ].join(',');
    const rows = filteredTasks.map(t => [
      t.referenceNo, t.intakeDate, t.clientNameCache || 'Cash Walk-in',
      `"${t.fileName.replace(/"/g, '""')}"`, t.serviceType, 
      `${t.sourceLanguage}-${t.targetLanguage}`, t.amountEgp, t.amountAed, t.amountUsd,
      t.hasTaxInvoice ? 'Tax ✓' : 'Non', t.status, t.paymentMethod || 'pending'
    ].join(','));
    
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `globalize_${activeSubTab}_export_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 font-sans text-slate-700">
      
      {/* Sub tabs selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl shrink-0">
          <button
            onClick={() => setActiveSubTab('revenues')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'revenues' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isRtl ? 'دفتر الإيرادات (الايرادات)' : 'Revenues Registry Matrix'}
          </button>
          <button
            onClick={() => setActiveSubTab('costs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'costs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isRtl ? 'تكلفة وهوامش الملفات' : 'Translation Costs Breakdown'}
          </button>
        </div>

        {/* Action icons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsExportShieldOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold hover:bg-emerald-100 hover:text-emerald-800 transition-colors text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>{isRtl ? 'تصدير كملف Excel' : 'Export Sheet (XLSX/CSV)'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs rounded-xl font-bold border border-slate-200 cursor-pointer"
          >
            {isRtl ? 'طباعة الكشف الحالي' : 'Print Grid'}
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-1 focus:ring-indigo-600 focus:outline-none"
            placeholder={isRtl ? 'ابحث بالرقم المرجعي، اسم العميل...' : 'Search ref no, file name, customer...'}
          />
        </div>

        {/* Filter payment method */}
        <div className="relative">
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-1 focus:ring-indigo-600 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">{isRtl ? 'كل طرق الدفع' : 'Payment Method: All'}</option>
            <option value="cash">Cash (خزينة)</option>
            <option value="bank_saib">SAIB Bank Wire</option>
            <option value="nbe">NBE Postal Post</option>
            <option value="instapay">Instapay</option>
            <option value="vodafone_cash">Vodafone Cash</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>

        {/* Filter Tax */}
        <div>
          <select
            value={filterTax}
            onChange={e => setFilterTax(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-1 focus:ring-indigo-600 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">{isRtl ? 'فواتير ضريبية وغير ضريبية' : 'Billing Type: All'}</option>
            <option value="tax">{isRtl ? 'فواتير ضريبية ✓' : 'Tax Invoice ONLY'}</option>
            <option value="nontax">{isRtl ? 'غير ضريبية' : 'Non-tax Invoice'}</option>
          </select>
        </div>
      </div>

      {/* CORE MATRIX TABLES SHEETS */}
      <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
        <table className="w-full text-xs text-left text-slate-600 font-sans border-collapse">
          <thead className="bg-[#1B4F72] text-white">
            <tr>
              <th className="px-3 py-2 text-center border-r border-[#153e5a] w-12 font-bold select-none text-[10px]">#</th>
              <th className="px-4 py-2 font-bold text-center border-r border-[#153e5a]">{isRtl ? 'رقم المعاملة' : 'Reference'}</th>
              <th className="px-4 py-2 font-bold text-center border-r border-[#153e5a]">{isRtl ? 'تاريخ الدخول' : 'Intake'}</th>
              <th className="px-4 py-2 font-bold border-r border-[#153e5a]">{isRtl ? 'العميل' : 'Customer name'}</th>
              <th className="px-4 py-2 font-bold border-r border-[#153e5a]">{isRtl ? 'اسم المستند' : 'File Name / Subject'}</th>
              <th className="px-4 py-2 font-bold border-r border-[#153e5a]">{isRtl ? 'نوع الخدمة' : 'Service'}</th>
              
              {/* Conditional columns */}
              {activeSubTab === 'revenues' ? (
                <>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-black">EGP Total</th>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-black">AED Dubai</th>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-black">USD Global</th>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-mono">Tax</th>
                  <th className="px-4 py-2 font-bold text-center">{isRtl ? 'القيد المالي' : 'Method'}</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-black bg-emerald-950">EGP Value</th>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-black">Translation Cost</th>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-black">Proofread Cost</th>
                  <th className="px-3 py-2 text-center border-r border-[#153e5a] font-bold">Total Cost</th>
                  <th className="px-3 py-2 text-center font-black bg-indigo-950">Net Margin</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-sans">
            {filteredTasks.map((t, index) => {
              const isEditing = editingTaskId === t.id;

              return (
                <tr 
                  key={t.id} 
                  className={`hover:bg-slate-50 transition-colors ${index % 2 === 1 ? 'bg-slate-50/20' : ''}`}
                >
                  <td className="px-3 py-2.5 text-center font-semibold text-slate-400 border-r border-slate-100 font-mono">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2.5 font-black text-slate-900 font-mono border-r border-slate-100 text-center select-all">
                    {t.referenceNo}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 font-mono border-r border-slate-100 text-center">
                    {t.intakeDate}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-slate-800 border-r border-slate-100 truncate max-w-[120px]" title={t.clientNameCache}>
                    {t.clientNameCache}
                  </td>
                  <td className="px-4 py-2.5 font-medium border-r border-slate-100 truncate max-w-[180px]" title={t.fileName}>
                    {t.fileName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 border-r border-slate-100 capitalize">
                    {t.serviceType.replace('_', ' ')}
                  </td>

                  {/* Pricing dynamic outputs */}
                  {activeSubTab === 'revenues' ? (
                    <>
                      {/* EGP */}
                      <td className="px-3 py-2 text-right border-r border-slate-100 font-mono font-bold w-24">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editEgp} 
                            onChange={e => setEditEgp(parseInt(e.target.value) || 0)} 
                            className="w-full text-right bg-slate-100 font-mono font-bold rounded px-1 py-0.5 border border-slate-200"
                          />
                        ) : (
                          <span
                            onClick={() => handleStartEdit(t)}
                            className="hover:underline hover:text-indigo-600 block cursor-text decoration-dotted"
                          >
                            {t.amountEgp.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* AED */}
                      <td className="px-3 py-2 text-right border-r border-slate-100 font-mono font-bold w-24">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editAed} 
                            onChange={e => setEditAed(parseInt(e.target.value) || 0)} 
                            className="w-full text-right bg-slate-100 font-mono font-bold rounded px-1 py-0.5 border border-slate-200"
                          />
                        ) : (
                          <span onClick={() => handleStartEdit(t)} className="hover:underline hover:text-indigo-600 block cursor-text">
                            {t.amountAed > 0 ? t.amountAed.toLocaleString() : '-'}
                          </span>
                        )}
                      </td>

                      {/* USD */}
                      <td className="px-3 py-2 text-right border-r border-slate-100 font-mono font-bold w-24">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editUsd} 
                            onChange={e => setEditUsd(parseInt(e.target.value) || 0)} 
                            className="w-full text-right bg-slate-100 font-mono font-bold rounded px-1 py-0.5 border border-slate-200"
                          />
                        ) : (
                          <span onClick={() => handleStartEdit(t)} className="hover:underline hover:text-indigo-600 block cursor-text">
                            {t.amountUsd > 0 ? t.amountUsd.toLocaleString() : '-'}
                          </span>
                        )}
                      </td>

                      {/* Tax code inline */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100 text-xs font-bold leading-none w-14">
                        {t.hasTaxInvoice ? (
                          <span className="text-emerald-600 bg-emerald-100 px-1 py-0.5 rounded text-[9px]">Tax ✓</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No</span>
                        )}
                      </td>

                      {/* Method */}
                      <td className="px-4 py-2.5 text-center font-semibold capitalize font-sans">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handleSaveEdit(t.id)} className="p-0.5 bg-green-500 text-white rounded cursor-pointer">
                              <Check size={12} />
                            </button>
                            <button onClick={() => setEditingTaskId(null)} className="p-0.5 bg-red-500 text-white rounded cursor-pointer">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 border border-slate-200 rounded">
                            {t.paymentMethod || 'pending'}
                          </span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      {/* COSTS SPECIFICS */}
                      <td className="px-3 py-2.5 text-right border-r border-slate-100 font-mono font-bold font-sans">
                        EGP {t.amountEgp ? t.amountEgp.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right border-r border-slate-100 font-mono text-slate-600 font-medium">
                        EGP {t.translationCost ? t.translationCost.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right border-r border-slate-100 font-mono text-slate-600 font-medium">
                        EGP {t.revisionCost ? t.revisionCost.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right border-r border-slate-100 font-mono font-bold text-slate-850">
                        EGP {t.totalCost ? t.totalCost.toLocaleString() : '-'}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono font-black ${
                        t.netRevenue >= 0 ? 'text-emerald-700 bg-emerald-50/10' : 'text-red-700 bg-red-50/10'
                      }`}>
                        EGP {t.netRevenue ? t.netRevenue.toLocaleString() : '-'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {/* pinned summation totals row! Matching standard worksheets */}
            <tr className="bg-slate-100 font-mono text-[11px] font-black tracking-wide border-t-2 border-slate-200">
              <td colSpan={6} className="px-4 py-3 text-right text-slate-900 uppercase font-sans font-bold">
                {isRtl ? 'إجمالي القيم الفرعية :' : 'Pinned Summary Totals :'}
              </td>

              {activeSubTab === 'revenues' ? (
                <>
                  <td className="px-3 py-3 text-right text-[#1B4F72] font-black border-r border-slate-200">
                    EGP {sumEgp.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-indigo-850 font-black border-r border-slate-200">
                    AED {sumAed.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-cyan-850 font-black border-r border-slate-200">
                    USD {sumUsd.toLocaleString()}
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-center text-[10px] text-slate-400 font-sans font-medium">
                    {filteredTasks.length} matched files
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-3 text-right text-slate-900 border-r border-slate-200">
                    EGP {sumEgp.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-605 border-r border-slate-200">
                    EGP {sumTranslation.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-605 border-r border-slate-200">
                    EGP {sumRevision.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700 font-bold border-r border-slate-200">
                    EGP {sumTotalCost.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-[#1E8449] font-black bg-emerald-50/40">
                    EGP {sumNetRevenue.toLocaleString()}
                  </td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER AUDITING */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-900 text-[10px] font-medium border border-amber-100 font-sans">
        <ShieldAlert size={14} className="shrink-0 text-amber-600" />
        <span>
          {isRtl 
            ? 'معدلات تعديل الأسعار مقيدة فقط بامتلاك صلاحيات "المالك" أو "المحاسب". قم بالنقر نقراً مزدوجاً لفتح نافذة التعديل الفوري للعمود.'
            : 'Pricing adjustments are permitted ONLY under Owner or Accountant access. Click directly on EGP amount figures to trigger inline modifications.'}
        </span>
      </div>

      <ExportProtectionModal
        isOpen={isExportShieldOpen}
        onClose={() => setIsExportShieldOpen(false)}
        dataType="accounting_reports"
        dataLabelEn="Revenues & Cost Breakdown Reports"
        dataLabelAr="كشف الإيرادات والتحليلات الضريبية"
        isRtl={isRtl}
        onExportApproved={() => exportCSV()}
      />
    </div>
  );
};

export default RevenuesPage;
