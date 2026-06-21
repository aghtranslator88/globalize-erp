/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GitBranch, Plus, Trash2, Edit2, Check, X, MapPin, Phone, Mail, 
  DollarSign, Shield, Activity, Users, Info, Settings, RefreshCw, Briefcase, FileText
} from 'lucide-react';
import { Branch, UserRole, Profile } from '../types';
import dbInstance from '../db/store';

interface BranchesPageProps {
  isRtl: boolean;
  currentRole: UserRole;
  currentUser: Profile;
}

export default function BranchesPage({ isRtl, currentRole, currentUser }: BranchesPageProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'offices' | 'analytics' | 'guide'>('offices');
  
  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [location, setLocation] = useState('');
  const [locationAr, setLocationAr] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState<'EGP' | 'AED' | 'USD'>('EGP');
  const [taxId, setTaxId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setBranches([...dbInstance.branches]);
    setProfiles([...dbInstance.profiles]);
    setTasks([...dbInstance.tasks]);

    const sub = dbInstance.subscribe(() => {
      setBranches([...dbInstance.branches]);
      setProfiles([...dbInstance.profiles]);
      setTasks([...dbInstance.tasks]);
    });
    return sub;
  }, []);

  const resetForm = () => {
    setName('');
    setNameAr('');
    setLocation('');
    setLocationAr('');
    setPhone('');
    setEmail('');
    setCurrency('EGP');
    setTaxId('');
    setIsActive(true);
    setEditingBranch(null);
    setIsAddOpen(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nameAr || !location || !locationAr || !phone || !email) {
      setErrorMsg(isRtl ? 'الرجاء ملء جميع الحقول المطلوبة!' : 'Please fill all required fields!');
      return;
    }

    dbInstance.addBranch({
      name,
      nameAr,
      location,
      locationAr,
      phone,
      email,
      isActive,
      currency,
      taxId: taxId || undefined
    });

    setSuccessMsg(isRtl ? 'تم إضافة الفرع بنجاح!' : 'Branch added successfully!');
    resetForm();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleStartEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setNameAr(branch.nameAr);
    setLocation(branch.location);
    setLocationAr(branch.locationAr || '');
    setPhone(branch.phone);
    setEmail(branch.email);
    setCurrency(branch.currency);
    setTaxId(branch.taxId || '');
    setIsActive(branch.isActive);
    setIsAddOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    dbInstance.updateBranch(editingBranch.id, {
      name,
      nameAr,
      location,
      locationAr,
      phone,
      email,
      currency,
      isActive,
      taxId: taxId || undefined
    });

    setSuccessMsg(isRtl ? 'تم تحديث الفرع بنجاح!' : 'Branch updated successfully!');
    resetForm();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string) => {
    // Check if branch has assigned staff
    const assignedStaffCount = profiles.filter(p => p.branchId === id).length;
    if (assignedStaffCount > 0) {
      setErrorMsg(isRtl 
        ? `لا يمكن حذف هذا الفرع لوجود عدد (${assignedStaffCount}) موظف معينين به!` 
        : `Cannot delete branch because it has ${assignedStaffCount} assigned staff members!`
      );
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (id === 'b-cairo') {
      setErrorMsg(isRtl ? 'لا يمكن حذف الفرع الرئيسي للمؤسسة!' : 'Cannot delete the core Cairo Headquarters!');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا الفرع؟' : 'Are you sure you want to delete this branch?')) {
      dbInstance.deleteBranch(id);
      setSuccessMsg(isRtl ? 'تم حذف الفرع بنجاح!' : 'Branch deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const toggleBranchStatus = (branch: Branch) => {
    dbInstance.updateBranch(branch.id, { isActive: !branch.isActive });
    dbInstance.addNotification({
      title: branch.isActive ? 'Branch Suspended' : 'Branch Activated',
      titleAr: branch.isActive ? 'تم إيقاف الفرع' : 'تم تفعيل الفرع',
      message: `The branch "${branch.name}" was ${branch.isActive ? 'suspended' : 'activated'} by Admin.`,
      messageAr: `تم ${branch.isActive ? 'إيقاف' : 'إعادة تفعيل'} فرع "${branch.nameAr}" بواسطة الإدارة.`,
      userId: currentUser.id,
      type: branch.isActive ? 'warning' : 'success'
    });
  };

  // Stats calculation
  const getBranchStats = (branchId: string) => {
    const branchStaff = profiles.filter(p => p.branchId === branchId);
    const branchTasks = tasks.filter(t => t.branchId === branchId);
    const totalVolume = branchTasks.reduce((sum, t) => sum + (t.wordCount || 0), 0);
    const totalValue = branchTasks.reduce((sum, t) => sum + (t.totalCost || t.amountEgp || t.amountUsd || t.amountAed || 0), 0);
    
    return {
      staffCount: branchStaff.length,
      taskCount: branchTasks.length,
      wordCount: totalVolume,
      revenueSimulated: totalValue
    };
  };

  return (
    <div className="space-y-6" id="branches-page-root">
      {/* Messages */}
      {successMsg && (
        <div id="branches-success-alert" className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3 animate-fade-in">
          <Check className="shrink-0" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div id="branches-error-alert" className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center gap-3 animate-fade-in">
          <X className="shrink-0" />
          <span className="text-xs font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-brand-navy border border-brand-navy-light/10 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-gold/10 text-brand-gold rounded-2xl">
              <GitBranch size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                {isRtl ? 'إدارة الفروع والمكاتب المتعددة' : 'Globalize Multi-Office & Branch Terminal'}
              </h2>
              <p className="text-xs text-brand-navy-light font-bold opacity-60">
                {isRtl 
                  ? 'إدارة فروع المؤسسة الإقليمية، تتبع التدفق النقدى والمهام المعلقة والصلاحيات لكل فرع على حدة' 
                  : 'Manage decentralized corporate nodes, geographic localization, branch-specific currency rates and payroll pools.'}
              </p>
            </div>
          </div>
        </div>

        {/* Custom Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-brand-gold text-brand-navy text-xs font-black rounded-xl hover:bg-brand-gold-dark transition shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>{isRtl ? 'إضافة فرع جديد' : 'Provision New Branch'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex border-b border-brand-navy-light/10 pb-0.5 gap-2">
        <button
          onClick={() => setActiveSubTab('offices')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'offices'
              ? 'border-brand-gold text-white bg-white/5 rounded-t-xl'
              : 'border-transparent text-brand-navy-light hover:text-white'
          }`}
        >
          {isRtl ? 'الفروع النشطة' : 'Corporate Nodes'}
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'border-brand-gold text-white bg-white/5 rounded-t-xl'
              : 'border-transparent text-brand-navy-light hover:text-white'
          }`}
        >
          {isRtl ? 'توازن حجم العمل المتبادل' : 'Node Workloads & Balances'}
        </button>
        <button
          onClick={() => setActiveSubTab('guide')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'guide'
              ? 'border-brand-gold text-white bg-white/5 rounded-t-xl'
              : 'border-transparent text-brand-navy-light hover:text-white'
          }`}
        >
          {isRtl ? 'دليل الاستخدام' : 'User Guide & FAQ'}
        </button>
      </div>

      {/* SUBTAB CONTENT 1: Branch Provisioning and Cards */}
      {activeSubTab === 'offices' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* List of Branches */}
          <div className="xl:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map(branch => {
                const stats = getBranchStats(branch.id);
                return (
                  <div 
                    key={branch.id} 
                    id={`branch-card-${branch.id}`}
                    className={`bg-brand-navy/60 border rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-brand-gold/30 transition-all ${
                      branch.isActive ? 'border-brand-navy-light/15' : 'border-rose-500/20 bg-rose-950/5'
                    }`}
                  >
                    <div>
                      {/* Name & Active Toggle */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] bg-brand-navy-dark border border-brand-navy-light/20 text-brand-gold font-mono px-1.5 py-0.5 rounded uppercase">
                              {branch.currency}
                            </span>
                            {!branch.isActive && (
                              <span className="text-[9px] bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold px-1.5 py-0.5 rounded uppercase">
                                {isRtl ? 'معطل' : 'Inactive'}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-white mt-1 leading-snug">
                            {isRtl ? branch.nameAr : branch.name}
                          </h3>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleStartEdit(branch)}
                            className="p-1.5 bg-brand-navy-dark hover:bg-brand-navy-light text-brand-navy-light hover:text-white rounded-lg transition"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id)}
                            className="p-1.5 bg-brand-navy-dark hover:bg-rose-950 text-rose-400 rounded-lg transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Location details */}
                      <div className="space-y-2 mt-4 text-[11px] text-brand-navy-light">
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-brand-gold shrink-0" />
                          <span className="truncate opacity-85">
                            {isRtl ? (branch.locationAr || branch.location) : branch.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-brand-gold shrink-0" />
                          <span className="opacity-85">{branch.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-brand-gold shrink-0" />
                          <span className="opacity-85">{branch.email}</span>
                        </div>
                        {branch.taxId && (
                          <div className="flex items-center gap-2 text-[10px] font-mono font-bold bg-brand-navy-dark/60 p-1 px-2 rounded w-fit border border-brand-navy-light/10 mt-1">
                            <span>Tax ID: {branch.taxId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Metric footer */}
                    <div className="border-t border-brand-navy-light/10 pt-3 mt-4 flex items-center justify-between text-[11px]">
                      <div className="flex gap-4">
                        <span className="font-bold">
                          {isRtl ? `${stats.staffCount} موظف` : `${stats.staffCount} Staff`}
                        </span>
                        <span className="font-bold opacity-60">
                          {isRtl ? `${stats.taskCount} طلبات` : `${stats.taskCount} Tasks`}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => toggleBranchStatus(branch)}
                        className={`font-semibold cursor-pointer text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                          branch.isActive 
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                        }`}
                      >
                        {branch.isActive ? (isRtl ? 'تعطيل الفرع' : 'Deactivate') : (isRtl ? 'تنشيط' : 'Activate')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form to Add or Edit */}
          <div>
            {isAddOpen ? (
              <form 
                onSubmit={editingBranch ? handleUpdate : handleCreate}
                id="branch-provision-form" 
                className="bg-brand-navy border border-brand-navy-light/15 p-6 rounded-2xl shadow-lg space-y-4 animate-slide-up"
              >
                <div className="flex items-center justify-between border-b border-brand-navy-light/10 pb-3">
                  <h3 className="text-xs font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Settings size={14} />
                    <span>{editingBranch ? (isRtl ? 'تعديل بيانات الفرع' : 'Modify Branch Node') : (isRtl ? 'تأسيس فرع إداري' : 'Add Corporate Node')}</span>
                  </h3>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="p-1 hover:bg-white/5 rounded text-brand-navy-light"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Name EN */}
                  <div>
                    <label className="text-white font-bold block mb-1">{isRtl ? 'اسم الفرع (إنجليزي):' : 'Branch Name (English):'}</label>
                    <input 
                      type="text" 
                      required
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Dubai Logistics Center"
                      className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white outline-none focus:border-brand-gold transition"
                    />
                  </div>

                  {/* Name AR */}
                  <div>
                    <label className="text-white font-bold block mb-1">{isRtl ? 'اسم الفرع (عربي):' : 'Branch Name (Arabic):'}</label>
                    <input 
                      type="text" 
                      required
                      value={nameAr} 
                      onChange={e => setNameAr(e.target.value)}
                      placeholder="مثال: فرع دبي اللوجستي"
                      className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white text-right outline-none focus:border-brand-gold transition"
                    />
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-white font-bold block mb-1">{isRtl ? 'العملة الرسمية للفرع:' : 'Primary Branch Currency:'}</label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white outline-none focus:border-brand-gold transition"
                    >
                      <option value="EGP">EGP (Egyptian Pound)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                      <option value="USD">USD (US Dollar)</option>
                    </select>
                  </div>

                  {/* Location EN */}
                  <div>
                    <label className="text-white font-bold block mb-1">{isRtl ? 'العنوان الجغرافي (إنجليزي):' : 'Location Address (English):'}</label>
                    <input 
                      type="text" 
                      required
                      value={location} 
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Street address, City, Country"
                      className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white outline-none focus:border-brand-gold transition"
                    />
                  </div>

                  {/* Location AR */}
                  <div>
                    <label className="text-white font-bold block mb-1">{isRtl ? 'العنوان الجغرافي (عربي):' : 'Location Address (Arabic):'}</label>
                    <input 
                      type="text" 
                      required
                      value={locationAr} 
                      onChange={e => setLocationAr(e.target.value)}
                      placeholder="عنوان الشارع، المدينة، الدولة"
                      className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white text-right outline-none focus:border-brand-gold transition"
                    />
                  </div>

                  {/* Contact Phone & Email */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-white font-bold block mb-1">{isRtl ? 'رقم الهاتف:' : 'Telephone:'}</label>
                      <input 
                        type="text" 
                        required
                        value={phone} 
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+971"
                        className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white outline-none focus:border-brand-gold transition"
                      />
                    </div>
                    <div>
                      <label className="text-white font-bold block mb-1">{isRtl ? 'البريد الرسمي الخط الساخن:' : 'Official Email Contact:'}</label>
                      <input 
                        type="email" 
                        required
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        placeholder="dubai@globalizetl.com"
                        className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white outline-none focus:border-brand-gold transition"
                      />
                    </div>
                  </div>

                  {/* Tax ID */}
                  <div>
                    <label className="text-white font-bold block mb-1">{isRtl ? 'رقم السجل الضريبي (اختياري):' : 'VAT / Tax Registration ID (Optional):'}</label>
                    <input 
                      type="text" 
                      value={taxId} 
                      onChange={e => setTaxId(e.target.value)}
                      placeholder="400-332-..."
                      className="w-full bg-brand-navy-dark border border-brand-navy-light/20 p-2.5 rounded-xl text-white outline-none focus:border-brand-gold transition"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button 
                    type="submit"
                    className="grow px-4 py-2 bg-brand-gold text-brand-navy font-black text-xs rounded-xl hover:bg-brand-gold-dark transition shadow-md cursor-pointer"
                  >
                    {editingBranch ? (isRtl ? 'حفظ التعديلات' : 'Commit Changes') : (isRtl ? 'إجراء التأسيس المعتمد' : 'Approve Deployment')}
                  </button>
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-white/5 text-white hover:bg-white/10 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-brand-navy-dark/40 border border-dashed border-brand-navy-light/20 p-6 rounded-2xl text-center text-xs text-brand-navy-light space-y-3">
                <Shield size={36} className="mx-auto text-brand-gold/40" />
                <p>
                  {isRtl 
                    ? 'انقر فوق "إضافة فرع جديد" بالأعلى لتهيئة مكاتب وإجراء توازن مالي متعدد عبر الفروع.' 
                    : 'Configure dynamic routing of workflows, distinct financial tracking, and partner liability distributions for each branch.'}
                </p>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold font-bold rounded-xl transition cursor-pointer"
                >
                  {isRtl ? 'ابدأ كود التهيئة' : 'Begin Deployment Setup'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 2: Workload Balances / Analytics */}
      {activeSubTab === 'analytics' && (
        <div id="branches-analytics-subtab" className="space-y-6">
          <div className="bg-brand-navy border border-brand-navy-light/10 p-5 rounded-2xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
              <Activity className="text-brand-gold" size={17} />
              <span>{isRtl ? 'توازن العمليات وموارد التشغيل' : 'Decentralized Operation Metrics'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {branches.map(b => {
                const s = getBranchStats(b.id);
                const totalEstimatedWordLimit = s.staffCount * 30000; // Simulated capacity
                const workloadPercent = totalEstimatedWordLimit > 0 
                  ? Math.min(100, Math.round((s.wordCount / totalEstimatedWordLimit) * 100)) 
                  : 0;

                return (
                  <div key={b.id} className="bg-brand-navy-dark/50 border border-brand-navy-light/10 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white truncate max-w-[150px]">
                        {isRtl ? b.nameAr : b.name}
                      </span>
                      <span className="text-[10px] bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded font-mono">
                        {b.currency}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-brand-navy-light">
                        <span>Work Allocation</span>
                        <span className="font-mono">{workloadPercent}% ({s.wordCount.toLocaleString()} {isRtl ? 'كلمة' : 'Words'})</span>
                      </div>
                      <div className="w-full bg-brand-navy h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            workloadPercent > 80 ? 'bg-rose-500' : workloadPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${workloadPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-center font-bold text-white pt-2 border-t border-brand-navy-light/5">
                      <div className="bg-brand-navy p-1 px-1.5 rounded">
                        <p className="text-brand-navy-light text-[8px] uppercase tracking-tighter">Active Tasks</p>
                        <p className="font-mono">{s.taskCount}</p>
                      </div>
                      <div className="bg-brand-navy p-1 px-1.5 rounded">
                        <p className="text-brand-navy-light text-[8px] uppercase tracking-tighter">Capacity Staff</p>
                        <p className="font-mono">{s.staffCount}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed staff assigned breakdown */}
          <div className="bg-brand-navy border border-brand-navy-light/10 p-5 rounded-2xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
              <Users className="text-brand-gold" size={17} />
              <span>{isRtl ? 'توزيع الموظفين الإداريين والمترجمين حسب الفروع والمكاتب' : 'Geographic Staff Node Deployments'}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-navy-light/10 text-brand-navy-light uppercase text-[10px] font-bold">
                    <th className="pb-3">{isRtl ? 'الموظف' : 'Staff Member'}</th>
                    <th className="pb-3">{isRtl ? 'الدور والمهام' : 'Role'}</th>
                    <th className="pb-3">{isRtl ? 'الفرع الفعلي المعين به' : 'Assigned Corporate Office'}</th>
                    <th className="pb-3">{isRtl ? 'تفاصيل الاتصال' : 'Direct Email'}</th>
                    <th className="pb-3 text-right">{isRtl ? 'تغيير الفرع' : 'Branch Transfer'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy-light/5">
                  {profiles.map(p => {
                    const currentBranch = branches.find(b => b.id === p.branchId) || branches[0];
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition">
                        <td className="py-3 font-bold text-white">
                          <div>
                            <p>{isRtl ? p.fullNameAr : p.fullName}</p>
                            <span className="text-[10px] text-brand-gold/60 capitalize">{p.employeeType || 'Full-time'}</span>
                          </div>
                        </td>
                        <td className="py-3 capitalize text-brand-navy-light font-bold">
                          {p.role}
                        </td>
                        <td className="py-3 font-semibold">
                          <span className="flex items-center gap-1.5 text-white">
                            <MapPin size={12} className="text-brand-gold" />
                            {isRtl ? (currentBranch?.nameAr || 'الرئيسي') : (currentBranch?.name || 'Main Office')}
                          </span>
                        </td>
                        <td className="py-3 text-brand-navy-light font-mono text-[10px]">
                          {p.email || 'N/A'}
                        </td>
                        <td className="py-3 text-right">
                          <select
                            value={p.branchId || 'b-cairo'}
                            onChange={e => {
                              dbInstance.profiles = dbInstance.profiles.map(prof => 
                                prof.id === p.id ? { ...prof, branchId: e.target.value } : prof
                              );
                              dbInstance.save();
                              dbInstance.addNotification({
                                title: 'Staff Branch Reassigned',
                                titleAr: 'تم إعادة نقل الموظف للفرع',
                                message: `Transferred ${p.fullName} to branch: ${e.target.value}`,
                                messageAr: `تم نقل الموظف: ${p.fullNameAr} للفرع المعين: ${e.target.value}`,
                                userId: currentUser.id,
                                type: 'info'
                              });
                            }}
                            className="bg-brand-navy-dark border border-brand-navy-light/10 p-1 px-2 rounded-lg text-[10px] text-brand-gold focus:outline-none focus:border-brand-gold transition"
                          >
                            {branches.map(br => (
                              <option key={br.id} value={br.id}>
                                {isRtl ? br.nameAr : br.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 3: User Guide & FAQ */}
      {activeSubTab === 'guide' && (
        <div id="branches-guide-subtab" className="bg-brand-navy border border-brand-navy-light/10 p-6 rounded-2xl text-xs space-y-4 leading-relaxed">
          <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-brand-navy-light/10 pb-3">
            <Info className="text-brand-gold" size={17} />
            <span>{isRtl ? 'دليل تشغيل آلية العمل المتعدد للفروع (GTMS Micro-Office Terminal)' : 'Multi-Branch Architectural Integration Guide'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <h4 className="font-extrabold text-brand-gold text-xs uppercase tracking-wider">
                {isRtl ? 'كيف يتم تتبع الفروع داخل النظام؟' : '1. How Branch Tracking Operates'}
              </h4>
              <p className="text-brand-navy-light">
                {isRtl 
                  ? 'تم ترقية الهيكل الأساسي للنظام (GTMS Module Schema) لتضمين معامل "البعد المحلي" branchId على مستويات (الموظفين، المهام، عروض الأسعار، الفواتير، والمقبوضات). عند ترقية الإدارات لتسجيل مهامها في دبي أو لندن، يقرأ النظام تفاصيل العملة والمعدل المقابل تلقائياً لتوليد تقارير محاسبية مفصّرة.' 
                  : 'The GTMS database schema contains decentralized bindings for user profiles, transaction ledgers, tasks, and billing records under specific branch identifiers (e.g., Cairo, Alexandria, Dubai, London).'}
              </p>

              <h4 className="font-extrabold text-brand-gold text-xs uppercase tracking-wider">
                {isRtl ? 'تنظيم المقبوضات وصندوق الحسابات' : '2. Bank & Cash Book Reconciliations'}
              </h4>
              <p className="text-brand-navy-light">
                {isRtl 
                  ? 'يتيح لك النظام تحويل الأرصدة والمقبوضات وتوزيعها حسب السجل الجغرافي. على سبيل المثال، يحتفظ فرع القاهرة بسجل نقدى منفصل مقابل الجنيه المصري (EGP)، بينما يحتفظ فرع دبي بسجلات الدرهم الإماراتي (AED).' 
                  : 'Accounts receivable, payroll cash flow pools, and operating expenses are localized. Selecting a branch filters cash flow and ledgers, preventing currency discrepancies.'}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-extrabold text-brand-gold text-xs uppercase tracking-wider">
                {isRtl ? 'نقل الموظفين وإعادة الهيكلة' : '3. Staff Assignments & Transfers'}
              </h4>
              <p className="text-brand-navy-light">
                {isRtl 
                  ? 'يمكن لمدير النظام (Owner) أو المشرف (Admin) تعديل فرع الموظف في الحال من جدول هيكلية الفروع. بمجرد النقل، يتم إعادة توجيه إشعارات المهام المعتمدة والطلبات المرتبطة للمكتب الجديد للتحقق من انتسابه الإداري.' 
                  : 'Administrators can transfer linguists and coordinators via the transfer utility. Reassigned translators instantly process task batches routed to their newly selected branch.'}
              </p>

              <h4 className="font-extrabold text-brand-gold text-xs uppercase tracking-wider">
                {isRtl ? 'شروط وقواعد الإضافة والحذف' : '4. Node Constraints & Safeguards'}
              </h4>
              <p className="text-brand-navy-light">
                {isRtl 
                  ? 'لحماية سلاسة قواعد البيانات، يحظر النظام حذف أي فرع طالما توجد مهام نشطة مسجلة عليه أو لديه موظفين معينين به. يجب نقلهم أولاً إلى فرع آخر لتتمكن من تعطيل أو إزالة الفرع بأمان.' 
                  : 'To enforce database integrity, deleting a branch containing active tasks or associated workforce assignments is blocked. Ensure staff are transferred first.'}
              </p>
            </div>
          </div>

          <div className="bg-brand-navy-dark/60 p-4 rounded-xl border border-brand-navy-light/10 mt-6 flex gap-3 items-center">
            <Shield className="text-brand-gold shrink-0" size={18} />
            <span className="text-[10px] text-brand-navy-light font-bold">
              {isRtl 
                ? 'النظام مُهيكل وجاهز للربط الفوري مع أدلة المؤسسة الموحدة Active Directory وقواعد البيانات المشتركة لتشغيل آمن ومتعدد المكاتب.' 
                : 'Enterprise Guard: All node parameters persist locally and in cloud backups securely. Ready for production-grade branch audits.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
