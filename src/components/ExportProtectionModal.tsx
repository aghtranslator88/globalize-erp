/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, Lock, UserCheck, X, Key, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { dbInstance } from '../db/store';
import { UserRole } from '../types';

interface ExportProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: string; // e.g. "financial_reports", "client_list", "translator_log", "task_data", "invoices", "payment_records"
  dataLabelEn: string;
  dataLabelAr: string;
  onExportApproved: (approverName: string) => void;
  isRtl?: boolean;
}

export const ExportProtectionModal: React.FC<ExportProtectionModalProps> = ({
  isOpen,
  onClose,
  dataType,
  dataLabelEn,
  dataLabelAr,
  onExportApproved,
  isRtl = false
}) => {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState<'verify' | 'request_pending'>('verify');
  
  // Delegated approval mode
  const [useApproverOverride, setUseApproverOverride] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [approverPassword, setApproverPassword] = useState('');

  if (!isOpen) return null;

  const activeUser = dbInstance.activeProfile;
  if (!activeUser) {
    return null;
  }

  const isOwnerOrAccountant = activeUser.role === 'owner' || activeUser.role === 'accountant';
  const approversList = dbInstance.profiles.filter(p => p.role === 'owner' || p.role === 'accountant');

  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password) {
      setErrorMsg(isRtl ? 'يجب إدخال كلمة المرور الخاصة بك للتحقق' : 'Password is required for identity verification.');
      dbInstance.logSecurityEvent('export_attempt', `Failed export attempt of ${dataType} by ${activeUser.fullName}: password empty.`, 'failed');
      return;
    }

    if (!reason || reason.trim().length < 4) {
      setErrorMsg(isRtl ? 'يرجى تقديم سبب واضح وصالح للتصدير (4 أحرف على الأقل)' : 'Please state a clear, valid reason for exporting (minimum 4 characters).');
      return;
    }

    const isPasswordValid = await dbInstance.verifyPassword(password, activeUser.id);
    if (!isPasswordValid) {
      setErrorMsg(isRtl ? 'كلمة المرور غير صحيحة!' : 'Incorrect password! Export attempt blocked.');
      dbInstance.logSecurityEvent('export_attempt', `Failed export attempt of ${dataType} by ${activeUser.fullName}: incorrect password entered.`, 'failed');
      return;
    }

    // If active user is Owner or Accountant, they are authorized to self-approve
    if (isOwnerOrAccountant) {
      // Create and self-approve the request
      const req = dbInstance.addExportRequest(dataType, reason, 'approved', activeUser.fullName, new Date().toISOString());
      
      dbInstance.logSecurityEvent(
        'export_attempt', 
        `Successful export of ${dataType} (${dataLabelEn}) by ${activeUser.role} ${activeUser.fullName}. Verified via security password. Reason: ${reason}`, 
        'success',
        req?.id
      );

      setSuccessMsg(isRtl ? 'تم التحقق والتحميل بنجاح!' : 'Export verified and authorized successfully!');
      setTimeout(() => {
        onExportApproved(activeUser.fullName);
        setPassword('');
        setReason('');
        onClose();
      }, 1000);
    } else {
      // Creating a pending request for other roles (Sales, Admin/Secretary, Translator)
      const req = dbInstance.addExportRequest(dataType, reason, 'pending');
      
      dbInstance.logSecurityEvent(
        'export_attempt', 
        `Export request of ${dataType} requested by ${activeUser.fullName} (Pending Owner/Accountant approval). Reason: ${reason}`, 
        'success',
        req?.id
      );

      // Inform them that it needs approval or they can supply immediate approver credentials
      setErrorMsg('');
      setMode('request_pending');
    }
  };

  const handleApproverOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedApproverId) {
      setErrorMsg(isRtl ? 'يرجى اختيار مراجع مالي معتمد' : 'Please select an authorized financial approver.');
      return;
    }

    if (!approverPassword) {
      setErrorMsg(isRtl ? 'يرجى إدخال كلمة مرور المراجع' : 'Please enter the approver password.');
      return;
    }

    const approver = dbInstance.profiles.find(p => p.id === selectedApproverId);
    if (!approver) {
      setErrorMsg('Approver profile not found.');
      return;
    }

    const isPassValid = await dbInstance.verifyPassword(approverPassword, approver.id);
    if (!isPassValid) {
      setErrorMsg(isRtl ? 'كلمة مرور المراجع غير صحيحة!' : 'Incorrect approver password!');
      dbInstance.logSecurityEvent('export_attempt', `Export override failed for ${activeUser.fullName}: invalid password for approver ${approver.fullName}.`, 'failed');
      return;
    }

    // Success! Create approved export log and run export.
    const req = dbInstance.addExportRequest(dataType, reason || 'On-Demand Approver Sign off', 'approved', approver.fullName, new Date().toISOString());
    dbInstance.logSecurityEvent(
      'export_attempt',
      `Successful export of ${dataType} (${dataLabelEn}) by ${activeUser.fullName} approved on-the-spot by ${approver.fullName}. Reason: ${reason || 'Approved in-person'}`,
      'success',
      req?.id
    );

    setSuccessMsg(isRtl ? `تمت الموافقة الفورية والترخيص بواسطة ${approver.fullName}` : `Successfully authorized by ${approver.fullName}!`);
    setTimeout(() => {
      onExportApproved(approver.fullName);
      setPassword('');
      setReason('');
      setApproverPassword('');
      setSelectedApproverId('');
      setUseApproverOverride(false);
      setMode('verify');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative" id="export-security-gate">
        
        {/* Top Header */}
        <div className="bg-zinc-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider text-orange-400">
                {isRtl ? 'بوابة التصدير الأمنية' : 'Data Export Shield'}
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                {isRtl ? `تصدير أمن لـ ${dataLabelAr}` : `Strict control over: ${dataLabelEn}`}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-1 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 font-sans">
          
          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex gap-2 items-center">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs flex gap-2 items-center font-bold">
              <CheckCircle size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'verify' && !useApproverOverride && (
            <form onSubmit={handleVerifyAndSubmit} className="space-y-4">
              <div className="text-xs text-zinc-500 leading-relaxed">
                {isRtl ? (
                  <p>تخضع جميع عمليات تصدير البيانات لبوابة حماية متعددة المستويات. يرجى إدخال كلمة المرور لتأكيد هويتك مع توضيح غرض التصدير. سيتم تسجيل هذه المحاولة بالكامل في سجل فحص الأمان.</p>
                ) : (
                  <p>All system exports require zero-trust passcode confirmation. Please verify your password and state the logical business reason for this export.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                  {isRtl ? 'غرض التصدير / المبرر العملي' : 'Reason for Export'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={isRtl ? 'مثال: إرسال تقرير المبيعات للمالك للمراجعة الضريبية...' : 'e.g., Sending task history to the master auditor...'}
                  className="w-full bg-zinc-55 border border-zinc-250 focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 rounded-lg text-xs text-zinc-900 p-2"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                  <span>{isRtl ? 'أدخل كلمة مرورك الحالية' : 'Your Personal Password'} <span className="text-red-500">*</span></span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-50 border border-zinc-250 focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 rounded-lg text-xs text-zinc-900 p-2.5 pl-8"
                  />
                  <Key size={12} className="absolute left-2.5 top-3.5 text-zinc-400" />
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg"
                >
                  <Lock size={12} />
                  {isOwnerOrAccountant
                    ? (isRtl ? 'تأكيد وتحميل' : 'Authorize & Export')
                    : (isRtl ? 'طلب ترخيص تصدير' : 'Submit Export Request')
                  }
                </button>
              </div>

              {!isOwnerOrAccountant && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setUseApproverOverride(true)}
                    className="text-[10px] text-zinc-550 hover:text-zinc-900 font-bold underline"
                  >
                    {isRtl ? '??? ?????? ????? ?? ????? ?????' : 'Request authorized approver sign-off'}
                  </button>
                </div>
              )}
            </form>
          )}

          {mode === 'verify' && useApproverOverride && (
            <form onSubmit={handleApproverOverride} className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-250 p-3 rounded-lg text-[11px] text-yellow-800 leading-normal flex gap-1.5">
                <Lock size={14} className="shrink-0 mt-0.5 text-yellow-600" />
                <div>
                  <p className="font-bold">Approver In-Person Override</p>
                  <p>An authorized owner or accountant can approve this export by entering their credentials below:</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                  {isRtl ? 'موافقة وتصريح من' : 'Authorized Approver'} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedApproverId}
                  onChange={(e) => setSelectedApproverId(e.target.value)}
                  className="w-full bg-zinc-55 border border-zinc-250 focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 rounded-lg text-xs text-zinc-900 p-2"
                >
                  <option value="">-- Choose Approver --</option>
                  {approversList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                  <span>{isRtl ? 'كلمة مرور المراجع المعتمد' : 'Approver Passcode'} <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="password"
                  required
                  value={approverPassword}
                  onChange={(e) => setApproverPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 border border-zinc-250 focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 rounded-lg text-xs text-zinc-900 p-2.5"
                />
              </div>

              <div className="border-t border-zinc-100 pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setUseApproverOverride(false)}
                  className="flex-1 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  {isRtl ? 'رجوع للتصدير العادي' : 'Back to normal request'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-750 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg"
                >
                  <UserCheck size={12} />
                  {isRtl ? 'ترخيص فوري' : 'Authorize Instantly'}
                </button>
              </div>
            </form>
          )}

          {mode === 'request_pending' && (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <ShieldAlert size={24} />
              </div>

              <div>
                <h4 className="font-bold text-sm text-zinc-900">
                  {isRtl ? 'طلب التصدير معلق حالياً' : 'Export Request Pending'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  {isRtl ? (
                    'لقد تم تسجيل طلب التصدير بنجاح، ولكنه غير مفعل حالياً نظراً لأن حسابك غير معتمد. يرجى توجيه مالك النظام أو المحاسب المعين لمراجعة حساب التصدير والموافقة عليه.'
                  ) : (
                    'Your export request has been issued successfully. Since you do not hold authorization, this export remains pending until Owner or Accountant approves it.'
                  )}
                </p>
              </div>

              <div className="bg-zinc-50 p-3 rounded-lg text-[10px] text-zinc-500 text-left font-mono space-y-1">
                <p><strong>Job Reference:</strong> EXPR-{Date.now().toString().slice(-4)}</p>
                <p><strong>Target Data:</strong> {dataType}</p>
                <p><strong>Requested By:</strong> {activeUser.fullName}</p>
                <p><strong>Status:</strong> PENDING APPROVAL</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseApproverOverride(true);
                    setMode('verify');
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-900 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  {isRtl ? 'محاكاة موافقة فورية' : 'Request Approver Sign-off'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('verify');
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  {isRtl ? 'إغلاق النافذة' : 'Close Screen'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
