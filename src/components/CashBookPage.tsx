/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PiggyBank, ArrowDownLeft, ArrowUpRight, Plus, 
  HelpCircle, ShieldOff, Save, Trash2, Calendar 
} from 'lucide-react';
import { Payment, PaymentMethod, ExpenseCategory } from '../types';
import dbInstance from '../db/store';
import { useToast } from './Toast';

interface CashBookPageProps {
  isRtl: boolean;
  currentRole: string;
}

export const CashBookPage: React.FC<CashBookPageProps> = ({ isRtl, currentRole }) => {
  const { error } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);

  // Form states for manual voucher
  const [vType, setVType] = useState<'income' | 'expense'>('expense');
  const [vDate, setVDate] = useState(new Date().toISOString().split('T')[0]);
  const [vAmountEgp, setVAmountEgp] = useState<number>(0);
  const [vAmountAed, setVAmountAed] = useState<number>(0);
  const [vAmountUsd, setVAmountUsd] = useState<number>(0);
  const [vMethod, setVMethod] = useState<PaymentMethod>('cash');
  const [vCategory, setVCategory] = useState<ExpenseCategory>('utilities');
  const [vPayee, setVPayee] = useState('');
  const [vNotes, setVNotes] = useState('');

  useEffect(() => {
    setPayments(dbInstance.payments);
    const sub = dbInstance.subscribe(() => {
      setPayments([...dbInstance.payments]);
    });
    return sub;
  }, []);

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'owner' && currentRole !== 'accountant') {
      error('Access Denied. Only Owners or Accountants can sign payment vouchers.');
      return;
    }

    dbInstance.addPayment({
      paymentDate: vDate,
      paymentType: vType,
      amountEgp: vAmountEgp,
      amountAed: vAmountAed,
      amountUsd: vAmountUsd,
      paymentMethod: vMethod,
      expenseCategory: vType === 'expense' ? vCategory : undefined,
      payee: vType === 'expense' ? vPayee : 'Office Vault',
      clientName: vType === 'expense' ? 'Office Expense Ledger' : 'Standard Inflow',
      fileName: 'Internal Voucher Account Adjustment',
      notes: vNotes
    });

    // Reset
    setIsVoucherOpen(false);
    setVAmountEgp(0);
    setVAmountAed(0);
    setVAmountUsd(0);
    setVPayee('');
    setVNotes('');
  };

  // Re-calculate running balance on standard chronological sorted payments list
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );

  let runningBalance = 0;
  const ledgerRows = sortedPayments.map(p => {
    const isIncome = p.paymentType === 'income';
    if (isIncome) {
      runningBalance += p.amountEgp;
    } else {
      runningBalance -= p.amountEgp;
    }
    return {
      ...p,
      egpBalanceAfter: runningBalance
    };
  }).reverse(); // Display most recent first!

  // Sum categories
  const sumTotalIncomeEgp = payments.filter(p => p.paymentType === 'income').reduce((s, p) => s + p.amountEgp, 0);
  const sumTotalExpenseEgp = payments.filter(p => p.paymentType === 'expense').reduce((s, p) => s + p.amountEgp, 0);

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* Ledger KPI blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isRtl ? 'إجمالي المقبوضات (Dr)' : 'Total Receipts (Debit Dr)'}</span>
            <h4 className="text-xl font-extrabold text-emerald-600 font-mono">EGP {sumTotalIncomeEgp.toLocaleString()}</h4>
          </div>
          <ArrowDownLeft className="text-emerald-500 bg-emerald-50 p-2.5 rounded-lg shrink-0" size={44} />
        </div>

        {/* Card 2 */}
        <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isRtl ? 'إجمالي المدفوعات (Cr)' : 'Total Disbursements (Credit Cr)'}</span>
            <h4 className="text-xl font-extrabold text-rose-600 font-mono">EGP {sumTotalExpenseEgp.toLocaleString()}</h4>
          </div>
          <ArrowUpRight className="text-rose-500 bg-rose-50 p-2.5 rounded-lg shrink-0" size={44} />
        </div>

        {/* Card 3 */}
        <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isRtl ? 'الرصيد الدفتري الحالي' : 'Target Net Ledger Balance'}</span>
            <h4 className="text-xl font-black text-slate-900 font-mono">EGP {runningBalance.toLocaleString()}</h4>
          </div>
          <PiggyBank className="text-amber-500 bg-amber-50 p-2.5 rounded-lg shrink-0" size={44} />
        </div>
      </div>

      {/* QUICK EXPENSE VOUCHER TRIGGER PANEL */}
      {(currentRole === 'owner' || currentRole === 'accountant') && (
        <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-slate-950 font-bold text-sm">
              {isRtl ? 'إصدار مستند مالي فوري (سند قبض/صرف)' : 'Post General Ledger Journal Voucher'}
            </h3>
            <button
              onClick={() => setIsVoucherOpen(!isVoucherOpen)}
              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer bg-slate-900 hover:bg-slate-800"
            >
              <Plus size={14} />
              <span>{isVoucherOpen ? 'إغلاق النافذة' : 'New Journal Entry'}</span>
            </button>
          </div>

          {isVoucherOpen && (
            <form onSubmit={handleCreateVoucher} className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voucher Entry Type</label>
                <select 
                  value={vType} 
                  onChange={e => setVType(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="expense">Debit Outflow Expense (Cr)</option>
                  <option value="income">Credit Inflow Receipt (Dr)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment Voucher Date</label>
                <input 
                  type="date" 
                  value={vDate} 
                  onChange={e => setVDate(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">EGP Amount</label>
                <input 
                  type="number" 
                  value={vAmountEgp || ''} 
                  onChange={e => setVAmountEgp(parseInt(e.target.value) || 0)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 text-xs font-mono font-bold rounded-xl focus:outline-none"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment Destination Gateway</label>
                <select 
                  value={vMethod} 
                  onChange={e => setVMethod(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="cash">Cash (خزينة)</option>
                  <option value="bank_saib">SAIB Bank Account</option>
                  <option value="nbe">Postal Bank NBE</option>
                  <option value="instapay">Instapay</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              {vType === 'expense' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expense Ledger Category</label>
                  <select 
                    value={vCategory} 
                    onChange={e => setVCategory(e.target.value as any)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="salary">Office Head Salaries</option>
                    <option value="freelancer">Freelancer Payments</option>
                    <option value="rent">Building Rentals</option>
                    <option value="utilities">Office Internet/Power bills</option>
                    <option value="tax">Tax/State Filing rates</option>
                    <option value="other">Other miscellaneous</option>
                  </select>
                </div>
              )}

              <div className={vType === 'income' ? 'md:col-span-2' : ''}>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payee / Account Name</label>
                <input 
                  type="text" 
                  value={vPayee} 
                  onChange={e => setVPayee(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Recipient or Payer name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voucher Audit Description</label>
                <input 
                  type="text" 
                  value={vNotes} 
                  onChange={e => setVNotes(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Purposes of this asset adjustment"
                  required
                />
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{isRtl ? 'قيد المستند للدفاتر' : 'Post Payment Voucher'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* DETAILED DOUBLE-ENTRY DEBIT/CREDIT LEDGER TABLE */}
      <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
        <h3 className="text-slate-905 font-bold text-sm pb-1 border-b border-slate-100">
          {isRtl ? 'سجل التدفقات النقدية والأرصدة المتعاقبة' : 'Double Entry Cashflow Log & Ledger Check'}
        </h3>
        <p className="text-[10px] text-slate-400 mt-1 mb-3">Chronological view displaying cash inflows and expenses.</p>

        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600 font-sans border-collapse">
            <thead className="bg-[#1B4F72] text-white">
              <tr>
                <th className="px-4 py-2 font-bold text-center border-r border-[#153e5a]">{isRtl ? 'تاريخ المعاملة' : 'Date'}</th>
                <th className="px-4 py-2 font-bold text-center border-r border-[#153e5a]">{isRtl ? 'المرجع الفني' : 'Reference'}</th>
                <th className="px-4 py-2 font-bold border-r border-[#153e5a]">{isRtl ? 'المستفيد / الدافع' : 'Parties / Payee'}</th>
                <th className="px-4 py-2 font-bold border-r border-[#153e5a]">{isRtl ? 'حساب المعاملة' : 'Details / Reason'}</th>
                <th className="px-4 py-2 font-bold border-r border-[#153e5a] text-center">{isRtl ? 'بوابة التحويل' : 'Method'}</th>
                <th className="px-3 py-2 text-right border-r border-[#153e5a] font-bold text-emerald-300">Dr (Income)</th>
                <th className="px-3 py-2 text-right border-r border-[#153e5a] font-bold text-rose-300">Cr (Expense)</th>
                <th className="px-4 py-2 text-right font-bold bg-[#143e5a]">EGP Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerRows.map(p => {
                const isIncome = p.paymentType === 'income';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-center border-r border-slate-100">{p.paymentDate}</td>
                    <td className="px-4 py-3 font-semibold font-mono text-center border-r border-slate-100 text-slate-800">
                      {p.referenceNo || 'VOUCHER'}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-slate-900 font-bold">
                      {p.payee || p.clientName}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 max-w-xs truncate" title={p.notes || p.fileName}>
                      {p.notes || p.fileName}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100 shrink-0">
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-[9px] border font-semibold border-slate-200">
                        {p.paymentMethod}
                      </span>
                    </td>
                    {/* Dr */}
                    <td className="px-3 py-3 text-right text-emerald-700 font-mono font-bold bg-emerald-50/10 border-r border-slate-100">
                      {isIncome ? `EGP ${p.amountEgp.toLocaleString()}` : '-'}
                      {isIncome && p.amountAed > 0 && <span className="block text-[10px] text-indigo-500">AED {p.amountAed.toLocaleString()}</span>}
                      {isIncome && p.amountUsd > 0 && <span className="block text-[10px] text-indigo-500">USD {p.amountUsd.toLocaleString()}</span>}
                    </td>
                    {/* Cr */}
                    <td className="px-3 py-3 text-right text-rose-700 font-mono font-bold bg-rose-50/10 border-r border-slate-100">
                      {!isIncome ? `EGP ${p.amountEgp.toLocaleString()}` : '-'}
                      {!isIncome && p.amountAed > 0 && <span className="block text-[11px] text-red-400">AED {p.amountAed.toLocaleString()}</span>}
                    </td>
                    {/* Balance */}
                    <td className="px-4 py-3 text-right font-mono font-black text-slate-850 bg-slate-50/50">
                      EGP {p.egpBalanceAfter.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashBookPage;
