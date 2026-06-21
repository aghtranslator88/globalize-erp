/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, Calendar, DollarSign, Wallet, Percent, Lock, 
  CheckCircle, ArrowRightLeft, ShieldAlert, Plus, Save 
} from 'lucide-react';
import { MonthlyClosing, Profile, StaffLiability, UserRole } from '../types';
import dbInstance from '../db/store';
import { useToast } from './Toast';

interface MonthlyClosingPageProps {
  isRtl: boolean;
  currentRole: string;
}

export const MonthlyClosingPage: React.FC<MonthlyClosingPageProps> = ({ isRtl, currentRole }) => {
  const { success, error } = useToast();
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [liabilities, setLiabilities] = useState<StaffLiability[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Calculation parameters
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rateAed, setRateAed] = useState<number>(0);
  const [rateUsd, setRateUsd] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');

  // Settle liabilities state
  const [settlingLiabId, setSettlingLiabId] = useState<string | null>(null);
  const [settlePayValue, setSettlePayValue] = useState<number>(0);

  useEffect(() => {
    setClosings(dbInstance.closings);
    setLiabilities(dbInstance.liabilities);
    setProfiles(dbInstance.profiles);

    const sub = dbInstance.subscribe(() => {
      setClosings([...dbInstance.closings]);
      setLiabilities([...dbInstance.liabilities]);
      setProfiles([...dbInstance.profiles]);
    });
    return sub;
  }, []);

  // Calculate live preview metrics for selected parameters
  const metrics = dbInstance.calculateClosingMetrics(targetMonth);
  const totalSalaries = Object.values(metrics.salaryBreakdown).reduce((s, b) => s + b.amount, 0);
  const combinedExpensesEgp = metrics.totalExpensesEgp + totalSalaries;

  // Convert revenue to EGP
  const combinedRevenuesEgp = 
    metrics.totalRevenueEgp + 
    (metrics.totalRevenueAed * rateAed) + 
    (metrics.totalRevenueUsd * rateUsd);

  const netCombinedProfitEgp = combinedRevenuesEgp - combinedExpensesEgp;
  const splitPartnerShare = Math.max(0, netCombinedProfitEgp / 2);

  const handlePerformClosing = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'owner') {
      error('Access Denied. Only Owners can lock and authorize monthly closes.');
      return;
    }

    try {
      dbInstance.closeMonthPeriod(targetMonth, rateAed, rateUsd, closingNotes);
      setClosingNotes('');
      success(`Period ${targetMonth} closed and locked successfully.`);
    } catch (err: any) {
      error(err.message || 'Error occurred during closing.');
    }
  };

  const handleSettleLiab = (liabId: string, fullRemaining: number) => {
    if (currentRole !== 'owner' && currentRole !== 'accountant') {
      error('Access Denied. Only Owners or Accountants can sign payout vouchers.');
      return;
    }
    setSettlingLiabId(liabId);
    setSettlePayValue(fullRemaining);
  };

  const handleConfirmSettleLiab = (e: React.FormEvent) => {
    e.preventDefault();
    if (settlingLiabId) {
      dbInstance.payLiability(settlingLiabId, settlePayValue);
      setSettlingLiabId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* SECTION 1: CLOSING STATEMENTS CONTROL */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm pb-1 border-b border-slate-100">
          {isRtl ? 'حسابات الإغلاق المالي وتوزيع أرباح الشركاء 50%' : 'Monthly Closings & Partner Dividend Authorizer'}
        </h3>
        <p className="text-[10px] text-slate-400 mt-1 mb-4 leading-normal">
          Select the active calendar period below, parameter conversion ratios, and lock books. Locking triggers automatic translation-team payroll releases and posts owner split invoices.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Closing Setup Form */}
          <form onSubmit={handlePerformClosing} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Target Period</label>
              <input 
                type="month" 
                value={targetMonth} 
                onChange={e => setTargetMonth(e.target.value)}
                className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">AED to EGP Rate</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={rateAed || ''} 
                  onChange={e => setRateAed(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">USD to EGP Rate</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={rateUsd || ''} 
                  onChange={e => setRateUsd(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Closing Audit Notes</label>
              <textarea 
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                rows={2}
                className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                placeholder="Remarks checking balance books..."
              />
            </div>

            {currentRole === 'owner' ? (
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-[#C0392B] hover:bg-[#a93226] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-red-700/20 active:scale-95 transition-transform"
              >
                <Lock size={14} />
                <span>Confirm Lock & Lock Period {targetMonth}</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-250 border-slate-200 rounded-xl text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-slate-400" />
                <span>Only an authorized owner can lock this period.</span>
              </div>
            )}
          </form>

          {/* CLOSING METRICS PREVIEW SHEET */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 lg:col-span-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <Calendar size={14} className="text-[#1B4F72] animate-bounce" />
                Live closing preview: {targetMonth} Period 
              </h4>
              <p className="text-[10px] text-slate-450 text-slate-400 mt-1 leading-normal">
                Real time parameters computation compiling received income sheets against operating costs.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 py-4 text-xs font-sans">
              <div>
                <span className="text-slate-405 text-slate-400 block font-medium">Revenues (Direct EGP)</span>
                <span className="font-extrabold text-slate-900 font-mono">EGP {metrics.totalRevenueEgp.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-405 text-slate-400 block font-medium">Dubai (AED In)</span>
                <span className="font-extrabold text-slate-900 font-mono">AED {metrics.totalRevenueAed.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-405 text-slate-400 block font-medium">Global (USD In)</span>
                <span className="font-extrabold text-[#1B4F72] font-mono">USD {metrics.totalRevenueUsd.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-100 pt-2.5">
                <span className="text-slate-405 text-slate-400 block font-medium">Operating expenses</span>
                <span className="font-extrabold text-slate-900 font-mono">EGP {metrics.totalExpensesEgp.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-100 pt-2.5">
                <span className="text-slate-405 text-slate-400 block font-medium">Translators Staff Wages</span>
                <span className="font-semibold text-slate-900 font-mono">EGP {totalSalaries.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-100 pt-2.5">
                <span className="text-slate-405 text-slate-400 block font-medium">EGP Combined Revenues</span>
                <span className="font-black text-slate-900 font-mono text-xs">EGP {combinedRevenuesEgp.toLocaleString()}</span>
              </div>
            </div>

            {/* Profits splits divider */}
            <div className="p-3.5 bg-emerald-50 text-emerald-950 border border-emerald-100/30 rounded-xl leading-snug">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="flex items-center gap-1"><Percent size={14} /> Owner Net Profit</span>
                <span className="font-mono text-sm pl-4">EGP {netCombinedProfitEgp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] mt-1.5 pt-1.5 border-t border-emerald-100/20 text-slate-500">
                <span>Partner 1 (50% dividend payout ratio):</span>
                <span className="font-bold text-slate-800 font-mono">EGP {splitPartnerShare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>Partner 2 (50% dividend payout ratio):</span>
                <span className="font-bold text-slate-800 font-mono">EGP {splitPartnerShare.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIC CLOSINGS LISTING TABLE */}
      <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
        <h3 className="font-bold text-slate-950 text-sm pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
          <Lock size={14} className="text-rose-600" />
          {isRtl ? 'أرشيف الإغلاقات المالية المقفلة وسنوي الأرباح' : 'Locked History Registers Closings'}
        </h3>
        <p className="text-[10px] text-slate-400 mt-1 mb-3">Locked chronological bookkeeping sheets, stored securely for partner reference audits.</p>
        
        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600 font-sans border-collapse">
            <thead className="bg-[#1B4F72] text-white">
              <tr>
                <th className="px-4 py-2 font-bold text-center border-r border-[#153e5a]">{isRtl ? 'الدورة المالية' : 'Period'}</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a]">Total Revenue EGP-converted</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a]">Total Combined Expense</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a] text-yellow-300">AED Rate</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a] text-amber-300 font-black">Net Profit EGP</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a]">Partner Share</th>
                <th className="px-4 py-2 font-bold border-r border-[#153e5a]">Lock Signoff By</th>
                <th className="px-4 py-2 font-bold text-center">Security Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {closings.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-950 text-center border-r border-slate-100 text-xs shrink-0">{c.period}</td>
                  <td className="px-4 py-3 text-right text-slate-700 border-r border-slate-100">{(c.totalRevenueEgp + (c.totalRevenueAed * c.rateAedToEgp) + (c.totalRevenueUsd * c.rateUsdToEgp)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-650 border-r border-slate-100">{c.totalExpensesEgp.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-500 border-r border-slate-100">{c.rateAedToEgp} / {c.rateUsdToEgp}</td>
                  <td className="px-4 py-3 text-right text-[#1E8449] font-black border-r border-slate-100">{c.totalProfitEgp.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700 border-r border-slate-100">{c.partner1Share.toLocaleString()}</td>
                  <td className="px-4 py-3 font-sans border-r border-slate-100 font-semibold">{profiles.find(p => p.id === c.closedBy)?.fullName || c.closedBy}</td>
                  <td className="px-4 py-3 text-center font-sans">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-bold rounded-full">
                      Closed LCK ✓
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STAFF LIABILITIES LEDGER SECTION */}
      <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm pb-1 border-b border-slate-100">
          {isRtl ? 'مديونيات والتزامات قائمة على المكتب للموظفين والشركاء' : 'Bureau Staff Liabilities & Partner Aging Share Allocations'}
        </h3>
        <p className="text-[10px] text-slate-400 mt-1 mb-4">Outstanding office balances owed as salary adjustments, freelancer wages, or partner split payables.</p>

        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600 font-sans border-collapse">
            <thead className="bg-[#1B4F72] text-white animate-pulse">
              <tr>
                <th className="px-4 py-2 font-bold border-r border-[#153e5a]">Owed Member</th>
                <th className="px-4 py-2 font-bold border-r border-[#153e5a]">Liability Class</th>
                <th className="px-4 py-2 font-bold border-r border-[#153e5a]">{isRtl ? 'الشرح والمستند' : 'Description'}</th>
                <th className="px-4 py-2 font-bold text-center border-r border-[#153e5a]">Filing Cycle</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a]">Owed Value</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a]">Paid To Date</th>
                <th className="px-4 py-2 font-bold text-right border-r border-[#153e5a] text-amber-300">Remaining Balance</th>
                <th className="px-4 py-2 font-bold text-center">Disbursement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liabilities.map(l => {
                const remaining = Math.max(0, l.amount - l.paidAmount);

                return (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{l.profileName}</td>
                    <td className="px-4 py-3 border-r border-slate-100 capitalize">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-full ${
                        l.liabilityType === 'profit_share' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        l.liabilityType === 'salary_arrear' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {l.liabilityType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 truncate max-w-xs">{l.description}</td>
                    <td className="px-4 py-3 font-mono text-center border-r border-slate-100 font-bold text-slate-500">{l.period || 'General'}</td>
                    <td className="px-4 py-3 text-right border-r border-slate-100 font-mono text-slate-700">{l.currency} {l.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right border-r border-slate-100 font-mono text-emerald-800 bg-emerald-50/10">{l.currency} {l.paidAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right border-r border-slate-100 font-mono font-black text-[#C0392B] bg-red-50/10">
                      {l.currency} {remaining.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {remaining > 0.1 ? (
                        <button
                          onClick={() => handleSettleLiab(l.id, remaining)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-[#1B4F72] hover:bg-slate-900 text-white rounded cursor-pointer transition-all active:scale-95 shrink-0"
                        >
                          Disburse pay
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 flex justify-center items-center gap-1 shrink-0">
                          <CheckCircle size={12} /> Disbursed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISBURSE LIABILITY DIALOG */}
      {settlingLiabId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-105 border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-150 border-slate-100 pb-2 flex items-center gap-1.5">
              <Building size={16} className="text-[#1B4F72]" />
              Record Bureau Disbursement voucher
            </h4>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Confirm cash payout for this staff liability. This deducts as accounting expense (Cr) inside cash book ledger registries now.
            </p>

            <form onSubmit={handleConfirmSettleLiab} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Payout amount</label>
                <input 
                  type="number" 
                  value={settlePayValue} 
                  onChange={e => setSettlePayValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 text-xs text-center font-black font-mono focus:outline-none focus:ring-1 focus:ring-teal-600"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingLiabId(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#1B4F72] rounded-lg cursor-pointer"
                >
                  Confirm Payout Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyClosingPage;
