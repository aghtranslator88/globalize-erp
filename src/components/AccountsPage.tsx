/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, ShieldCheck, Search, Lock, Check, 
  UserCheck, UserX, Fingerprint, RefreshCw, Key, ChevronDown, CheckCircle, Info, Hash,
  Eye, EyeOff
} from 'lucide-react';
import { Profile, UserRole, EmployeeType, Branch } from '../types';
import dbInstance from '../db/store';
import { WORLD_LANGUAGES } from '../lib/languages';

interface AccountsPageProps {
  isRtl: boolean;
  currentRole: UserRole;
  currentUser: Profile;
}

export default function AccountsPage({ isRtl, currentRole, currentUser }: AccountsPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'directory' | 'matrix' | 'audits' | 'smtp'>('directory');
  
  // Notification logs
  const [notifLogs, setNotifLogs] = useState<any[]>([]);

  // Form states for creating new user
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newFullNameAr, setNewFullNameAr] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('translator');
  const [newEmpType, setNewEmpType] = useState<EmployeeType>('freelance');
  const [newPhone, setNewPhone] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPersonalEmail, setNewPersonalEmail] = useState('');
  const [newRate, setNewRate] = useState(''); // rate per word
  const [newPageRate, setNewPageRate] = useState(''); // rate per page
  const [newWorkingHours, setNewWorkingHours] = useState(''); // working hours
  const [newWorkingShift, setNewWorkingShift] = useState<'day' | 'night'>('day'); // working shift
  const [newPassword, setNewPassword] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranchId, setNewBranchId] = useState('');
  const [languages, setLanguages] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [selectedSourceLangs, setSelectedSourceLangs] = useState<string[]>([]);
  const [selectedTargetLangs, setSelectedTargetLangs] = useState<string[]>([]);
  const [srcLangSearch, setSrcLangSearch] = useState('');
  const [trgLangSearch, setTrgLangSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const generateStrongPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`\\|}{[]:;?><,./-=';
    let generated = '';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    generated += lowercase[Math.floor(Math.random() * lowercase.length)];
    generated += uppercase[Math.floor(Math.random() * uppercase.length)];
    generated += numbers[Math.floor(Math.random() * numbers.length)];
    generated += symbols[Math.floor(Math.random() * symbols.length)];
    
    for (let i = 4; i < 16; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    const shuffled = generated.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(shuffled);
  };

  // SMTP form states
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

  const sendWelcomeEmail = async (email: string, fullName: string, password: string) => {
    setEmailLoading(true);
    try {
      const subject = `Welcome to GTMS - Your Official Translation Terminal`;
      const text = `Hi ${fullName},\n\nYour official translation terminal account has been successfully provisioned on Globalize Translation Management System (GTMS).\n\nYou can now log in using your registered official email address (${email}) and the initial password provided below:\n\nPassword: ${password}\n\nPlease ensure you update your password after your first login.\n\nBest Regards,\nGTMS Administration`;
      
      const config = dbInstance.brandConfig?.smtpConfig;
      if (!config) return;
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: email, 
          subject, 
          text,
          smtpConfig: config
        })
      });
      const data = await response.json();
      console.log('Welcome email status:', data);
    } catch (err) {
      console.error('Failed to send welcome email:', err);
    } finally {
      setEmailLoading(false);
    }
  };

  // Password reset state
  const [selectedProfileForReset, setSelectedProfileForReset] = useState<Profile | null>(null);
  const [customNewPass, setCustomNewPass] = useState('');

  useEffect(() => {
    // Initial fetch of profiles
    setProfiles([...dbInstance.profiles]);
    setNotifLogs([...dbInstance.notifications]);
    const brs = [...dbInstance.branches];
    setBranches(brs);
    if (brs.length > 0) {
      setNewBranchId(brs[0].id);
    }

    const config = dbInstance.brandConfig?.smtpConfig || {
      host: '',
      port: '587',
      user: '',
      pass: '',
      from: ''
    };
    setSmtpHost(config.host || '');
    setSmtpPort(config.port || '587');
    setSmtpUser(config.user || '');
    setSmtpPass(config.pass || '');
    setSmtpFrom(config.from || '');

    const sub = dbInstance.subscribe(() => {
      setProfiles([...dbInstance.profiles]);
      setNotifLogs([...dbInstance.notifications]);
      const updatedBrs = [...dbInstance.branches];
      setBranches(updatedBrs);
      if (updatedBrs.length > 0) {
        setNewBranchId(prev => prev || updatedBrs[0].id);
      }
    });
    return sub;
  }, []);

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbInstance.brandConfig) {
      dbInstance.brandConfig = dbInstance.getEmptyBrandConfig();
    }
    dbInstance.brandConfig.smtpConfig = {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom
    };
    dbInstance.save();
    setSuccessMsg(isRtl ? 'تم حفظ إعدادات البريد الإلكتروني بنجاح!' : 'Official Company email and SMTP settings saved successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleToggleActive = (id: string) => {
    // Avoid deactivating oneself
    if (id === currentUser.id) {
      alert(isRtl ? 'لا يمكنك إلغاء تفعيل حسابك الحالي!' : "You cannot deactivate your own active session account!");
      return;
    }

    dbInstance.profiles = dbInstance.profiles.map(p => {
      if (p.id === id) {
        const nextState = !p.isActive;
        
        // Audit log
        dbInstance.addNotification({
          title: `Account ${nextState ? 'Activated' : 'Suspended'}`,
          titleAr: `تم ${nextState ? 'تنشيط' : 'تعطيل'} حساب`,
          message: `Profile state of ${p.fullName} altered to ${nextState ? 'ACTIVE' : 'SUSPENDED'} by ${currentUser.fullName}.`,
          messageAr: `تم تغيير حالة حساب الموظف ${p.fullNameAr} إلى ${nextState ? 'نشط' : 'معطل'} بواسطة ${currentUser.fullNameAr}.`,
          userId: p.id,
          type: nextState ? 'success' : 'warning'
        });

        return { ...p, isActive: nextState };
      }
      return p;
    });

    dbInstance.save();
    setSuccessMsg(isRtl ? 'تم تحديث حالة الحساب بنجاح.' : 'Account state updated successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRoleChange = (id: string, role: UserRole) => {
    if (id === currentUser.id && role !== 'owner') {
      alert(isRtl ? 'لا يمكنك سحب صلاحيات المالك من نفسك!' : "You cannot downgrade your own Owner privileges!");
      return;
    }

    dbInstance.profiles = dbInstance.profiles.map(p => {
      if (p.id === id) {
        // Audit log
        dbInstance.addNotification({
          title: `Role Promoted/Changed`,
          titleAr: `تم تعديل صلاحيات الموظف`,
          message: `Role of ${p.fullName} changed from ${p.role.toUpperCase()} to ${role.toUpperCase()} by ${currentUser.fullName}.`,
          messageAr: `تم تغيير مسمى وصلاحيات ${p.fullNameAr} من ${p.role} إلى ${role} بواسطة ${currentUser.fullNameAr}.`,
          userId: p.id,
          type: 'info'
        });

        return { ...p, role };
      }
      return p;
    });

    dbInstance.save();
    setSuccessMsg(isRtl ? 'تم تحديث الصلاحيات والوظيفة بنجاح.' : 'Account role profile upgraded successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newFullName || !newFullNameAr || !newEmail) {
      setErrorMsg(isRtl ? 'يرجى مراجعة وتعبئة الاسم الكامل البريدي اللاتيني والعربي والبريد الإلكتروني للعمل!' : 'Please fill out full English/Arabic names and official corporate email!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setErrorMsg(isRtl ? 'يرجى إدخال بريد إلكتروني صالح!' : 'Please enter a valid official email address!');
      return;
    }

    if (!newPassword || newPassword.length < 12) {
      setErrorMsg(isRtl ? 'يجب إدخال كلمة مرور قوية لا تقل عن 12 حرفا.' : 'Please enter an initial password with at least 12 characters.');
      return;
    }

    // Check pre-existing email/name
    const exists = dbInstance.profiles.some(p => 
      (p.email && p.email.toLowerCase() === newEmail.trim().toLowerCase()) || 
      (p.fullName && p.fullName.toLowerCase() === newFullName.toLowerCase())
    );
    if (exists) {
      setErrorMsg(isRtl ? 'هذا البريد الإلكتروني أو الاسم مدرج بالفعل في دليل موظفي الشبكة!' : 'This official corporate email or full staff name is already registered inside our database!');
      return;
    }

    const cleanLangs = languages.split(',').map(l => l.trim()).filter(Boolean);

    const newProfile: Profile = {
      id: `p-user-${Date.now()}`,
      fullName: newFullName,
      fullNameAr: newFullNameAr,
      role: newRole,
      branchId: newBranchId,
      employeeType: newEmpType,
      languages: cleanLangs,
      monthlySalary: newRole === 'translator' || newRole === 'admin' ? Number(newSalary) || undefined : undefined,
      perWordRate: newRole === 'translator' ? Number(newRate) || undefined : undefined,
      perPageRate: newRole === 'translator' ? Number(newPageRate) || undefined : undefined,
      workingHours: Number(newWorkingHours) || undefined,
      workingShift: newWorkingShift,
      phone: newPhone.trim() || undefined,
      email: newEmail.trim(),
      personalEmail: newPersonalEmail.trim() || undefined,
      isActive: true,
      password: newPassword,
      createdAt: new Date().toISOString(),
      motherTongue: newRole === 'translator' ? motherTongue : undefined,
      sourceLanguages: newRole === 'translator' ? selectedSourceLangs : undefined,
      targetLanguages: newRole === 'translator' ? selectedTargetLangs : undefined,
    };

    dbInstance.profiles.push(newProfile);
    dbInstance.save();

    // Trigger welcome email if email is provided
    if (newProfile.email) {
      sendWelcomeEmail(newProfile.email, newProfile.fullName, newProfile.password);
    }

    // Audit notification
    dbInstance.addNotification({
      title: `New Profile Spawned`,
      titleAr: `تم إنشاء حساب موظف جديد`,
      message: `New translation staff account "${newFullName}" authorized with role "${newRole.toUpperCase()}".`,
      messageAr: `تم إنشاء حساب موظف جديد "${newFullNameAr}" بصلاحيات "${newRole}" بنجاح.`,
      userId: newProfile.id,
      type: 'success'
    });

    setSuccessMsg(isRtl ? `تم إضافة الحساب الجديد (${newFullName}) بنجاح!` : `New systems account "${newFullName}" created and authorized!`);
    setIsCreateOpen(false);
    
    // Clear form
    setNewFullName('');
    setNewFullNameAr('');
    setNewEmail('');
    setNewPersonalEmail('');
    setNewPhone('');
    setNewSalary('');
    setNewRate('');
    setNewPageRate('');
    setNewWorkingHours('8');
    setNewWorkingShift('day');
    setNewPassword('');
    setMotherTongue('Arabic');
    setSelectedSourceLangs(['English']);
    setSelectedTargetLangs(['Arabic']);
    
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileForReset || !customNewPass) return;
    if (customNewPass.length < 12) {
      setErrorMsg(isRtl ? 'يجب ألا تقل كلمة المرور الجديدة عن 12 حرفا.' : 'New password must be at least 12 characters.');
      return;
    }

    dbInstance.profiles = dbInstance.profiles.map(p => {
      if (p.id === selectedProfileForReset.id) {
        return { ...p, password: customNewPass };
      }
      return p;
    });
    dbInstance.save();

    dbInstance.addNotification({
      title: 'Credential Security Reset',
      titleAr: 'تحديث كلمة المرور للموظف',
      message: `System password for ${selectedProfileForReset.fullName} updated securely by Owner.`,
      messageAr: `تم إعادة تعيين كلمة مرور الموظف ${selectedProfileForReset.fullNameAr} بنجاح.`,
      userId: selectedProfileForReset.id,
      type: 'warning'
    });

    setSuccessMsg(isRtl ? `تمت إعادة تعيين كلمة المرور بنجاح للموظف ${selectedProfileForReset.fullNameAr}` : `Security credential successfully reset for ${selectedProfileForReset.fullName}!`);
    setSelectedProfileForReset(null);
    setCustomNewPass('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredProfiles = profiles.filter(p => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (p.fullName?.toLowerCase().includes(term) || 
            p.fullNameAr?.toLowerCase().includes(term) || 
            (p.phone && p.phone.includes(term)) ||
            p.role.toLowerCase().includes(term));
  });

  // Authorization Matrix Definition
  const matrixActions = [
    { key: 'intake', labelEn: 'Intake / Register Legal Folders', labelAr: 'تسجيل وقبول ملفات الترجمة', owner: 'write', admin: 'write', sales: 'write', accountant: 'read', translator: 'none' },
    { key: 'assign', labelEn: 'Assign Translators & Define Costs', labelAr: 'تعيين المترجمين وتحديد الأسعار والتكلفة', owner: 'write', admin: 'write', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'approve_translation', labelEn: 'Verify & Approve Translations', labelAr: 'اعتماد ودقيق الملفات المترجمة مالياً', owner: 'write', admin: 'write', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'quotations', labelEn: 'Generate Price Quotations & Invoices', labelAr: 'إصدار عروض الأسعار وفواتير العملاء', owner: 'write', admin: 'write', sales: 'write', accountant: 'read', translator: 'none' },
    { key: 'revenues', labelEn: 'Access Revenues & Cost Ledger', labelAr: 'دفتر القيود المالية للإيرادات والمصروفات', owner: 'write', admin: 'none', sales: 'none', accountant: 'write', translator: 'none' },
    { key: 'cashbook', labelEn: 'Vault Cashbook & Reconcile (الخزينة)', labelAr: 'صندوق الخزينة ومطابقة الأرصدة المصرفية', owner: 'write', admin: 'read', sales: 'none', accountant: 'write', translator: 'none' },
    { key: 'closing', labelEn: 'Monthly Financial Closing & Dividend Split', labelAr: 'الحسابات الختامية وتوزيع الأرباح والشركاء', owner: 'write', admin: 'none', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'timesheets', labelEn: 'Linguist Salaries & Payroll attendance', labelAr: 'مرتبات وحضور وتوقيتات اللغويين', owner: 'write', admin: 'write', sales: 'none', accountant: 'write', translator: 'none' },
    { key: 'accounts', labelEn: 'Manage User Profiles & Powers Configuration', labelAr: 'إدارة حسابات الموظفين والصلاحيات والأمان', owner: 'write', admin: 'read', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'jobs_queue', labelEn: 'Access Translator Assignment Work Queue', labelAr: 'استلام ومعاينة وتسليم حزم المهام الشخصية', owner: 'read', admin: 'read', sales: 'none', accountant: 'none', translator: 'write' },
  ];

  const getPowerColor = (power: string) => {
    if (power === 'write') return 'bg-zinc-950 text-white font-bold border-zinc-900';
    if (power === 'read') return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    return 'bg-zinc-50 text-zinc-300 border-zinc-100 strike-through opacity-30';
  };

  const getPowerLabel = (power: string) => {
    if (power === 'write') return isRtl ? 'صلاحية كاملة (كتابة)' : 'Full (Write)';
    if (power === 'read') return isRtl ? 'قراءة فقط' : 'Read Only';
    return isRtl ? 'محجوب / مغلق' : 'Restricted';
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* SUCCESS & ERROR TOAST NOTIFICATIONS */}
      {(successMsg || errorMsg) && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full animate-slide-in">
          {successMsg && (
            <div className="p-4 bg-zinc-900 text-white border-l-4 border-emerald-500 rounded-xl flex items-center gap-2.5 text-xs shadow-xl">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-red-950 text-red-200 border-l-4 border-red-500 rounded-xl flex items-center gap-2.5 text-xs shadow-xl">
              <Info size={16} className="text-red-400 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* HEADER TABS TRIGGER */}
      <div className="flex border-b border-zinc-200 gap-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
            activeTab === 'directory'
              ? 'border-zinc-950 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          {isRtl ? 'دليل حسابات الموظفين' : 'Staff Accounts Directory'}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-zinc-950 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          {isRtl ? 'مصفوفة الصلاحيات والحماية' : 'Authorization & Permissions Matrix'}
        </button>

        <button
          onClick={() => setActiveTab('audits')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
            activeTab === 'audits'
              ? 'border-zinc-950 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          {isRtl ? 'سجل عمليات الأمان والمصادقة' : 'Access & Auth Audit Logging'}
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
            activeTab === 'smtp'
              ? 'border-zinc-950 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          {isRtl ? 'إعدادات البريد الرسمي للشركة' : 'Company Email Setup'}
        </button>
      </div>

      {/* VIEW 1: DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* CONTROL BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-zinc-150">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث باسم المستخدم، رقم الهاتف أو الصلاحية...' : 'Search system accounts...'}
                className="pl-9 pr-4 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-zinc-450 focus:bg-white"
              />
            </div>

            {currentRole === 'owner' && (
              <button
                onClick={() => setIsCreateOpen(!isCreateOpen)}
                className="px-4 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <UserPlus size={14} />
                <span>{isRtl ? 'إضافة حساب لغوي / محاسب جديد' : 'Provision New System User'}</span>
              </button>
            )}
          </div>

          {/* CREATE USER FORMS DRAWER */}
          {isCreateOpen && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm animate-slide-in">
              <div className="pb-3 border-b border-zinc-100 flex items-center gap-2 mb-4">
                <Fingerprint size={16} className="text-zinc-900" />
                <h4 className="font-semibold text-zinc-900 text-sm">{isRtl ? 'تجهيز وحجز ملف مستخدم نظام جديد' : 'Authorize New Translators & Staff Terminals'}</h4>
              </div>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الاسم الثنائي الكامل اللاتيني' : 'Full English Name *'}</label>
                  <input 
                    type="text" 
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    required
                    placeholder="e.g. Heba Salem"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الاسم الثنائي الكامل العربي *' : 'Full Arabic Name *'}</label>
                  <input 
                    type="text" 
                    value={newFullNameAr}
                    onChange={e => setNewFullNameAr(e.target.value)}
                    required
                    placeholder="مثل: هبة سالم"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'البريد الإلكتروني الرسمي للعمل *' : 'Official Corporate Email *'}</label>
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                    placeholder="e.g. name@globalizetl.com"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'تعيين الصلاحيات والمستوى *' : 'System Authorization Level *'}</label>
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="translator">{isRtl ? 'مترجم لغوي (Translator)' : 'Linguist / Translator'}</option>
                    <option value="sales">{isRtl ? 'مبيعات وتسليم (Sales Executive)' : 'Sales & Client Manager'}</option>
                    <option value="accountant">{isRtl ? 'محاسب الخزينة (Accountant)' : 'Bureau Accountant'}</option>
                    <option value="admin">{isRtl ? 'مدير مكتب (Admin Manager)' : 'Bureau Admin Deputy'}</option>
                    <option value="owner">{isRtl ? 'مالك مكتب (Owner)' : 'Legal Bureau Partner Owner'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'فئة التعيين المكتبي' : 'Office Service Category'}</label>
                  <select 
                    value={newEmpType}
                    onChange={e => setNewEmpType(e.target.value as EmployeeType)}
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="freelance">{isRtl ? 'مستشار فريلانس (Freelance)' : 'Independent Freelancer'}</option>
                    <option value="staff">{isRtl ? 'موظف مثبت (Direct Staff)' : 'Direct Salaried Staff'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الفرع المعين به الموظف *' : 'Assigned Corporate Branch *'}</label>
                  <select 
                    value={newBranchId}
                    onChange={e => setNewBranchId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    {branches.map(br => (
                      <option key={br.id} value={br.id}>
                        {isRtl ? br.nameAr : br.name} ({br.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'رقم الهاتف للتواصل' : 'Phone Number (Contact)'}</label>
                  <input 
                    type="text" 
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="e.g. +201011119999"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'البريد الإلكتروني الشخصي (اختياري)' : 'Personal Email (Optional)'}
                  </label>
                  <input 
                    type="email" 
                    value={newPersonalEmail}
                    onChange={e => setNewPersonalEmail(e.target.value)}
                    placeholder="e.g. personal@gmail.com"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'كلمة المرور الأولية *' : 'Initial Password *'}
                  </label>
                  <div className="relative flex items-center">
                    <Lock size={14} className="absolute left-3 text-zinc-400" />
                    <input 
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder={isRtl ? 'كلمة المرور (12 حرفًا على الأقل)' : 'Password (min 12 chars)'}
                      className="w-full pl-9 pr-24 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="text-zinc-400 hover:text-zinc-650 p-1 cursor-pointer"
                        title={showPass ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={generateStrongPassword}
                        className="text-[10px] bg-zinc-950 hover:bg-zinc-800 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-all border border-zinc-900"
                        title={isRtl ? 'توليد كلمة مرور عشوائية' : 'Generate strong random password'}
                      >
                        {isRtl ? 'توليد' : 'Gen'}
                      </button>
                    </div>
                  </div>
                </div>

                    {newRole === 'translator' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'سعر الكلمة للاستحقاق (ج.م / كلمة)' : 'Rate per Word (EGP/Word)'}</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={newRate}
                        onChange={e => setNewRate(e.target.value)}
                        placeholder="0.22"
                        className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'سعر الصفحة للاستحقاق (ج.م / صفحة)' : 'Rate per Page (EGP/Page)'}</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newPageRate}
                        onChange={e => setNewPageRate(e.target.value)}
                        placeholder="25.0"
                        className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'ساعات العمل اليومية' : 'Working Hours / Day'}</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="24"
                        value={newWorkingHours}
                        onChange={e => setNewWorkingHours(e.target.value)}
                        placeholder="8"
                        className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الوردية / الفترة الزمنية للعمل' : 'Shift Period'}</label>
                      <select 
                        value={newWorkingShift}
                        onChange={e => setNewWorkingShift(e.target.value as 'day' | 'night')}
                        className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                      >
                        <option value="day">{isRtl ? 'نهاري / صباحي (Day Shift)' : 'Day Shift'}</option>
                        <option value="night">{isRtl ? 'ليلي / مسائي (Night Shift)' : 'Night Shift'}</option>
                      </select>
                    </div>

                    {/* Native Mother Tongue Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                        {isRtl ? 'اللغة الأم / اللغة الرئيسية' : 'Mother Tongue / Native Language'}
                      </label>
                      <select
                        value={motherTongue}
                        onChange={e => setMotherTongue(e.target.value)}
                        className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                      >
                        {WORLD_LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>

                    {/* Source Languages (Translate From) Searchable Multi-Checklist */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                        {isRtl ? 'الترجمة من لغات المصدر (من)' : 'Mastered Source Languages (Translate FROM)'}
                      </label>
                      <div className="border border-zinc-200 rounded-lg p-2 bg-zinc-50/30 space-y-2">
                        <input
                          type="text"
                          placeholder={isRtl ? 'ابحث لتصفية لغات المصدر...' : 'Type to search source languages...'}
                          value={srcLangSearch}
                          onChange={e => setSrcLangSearch(e.target.value)}
                          className="w-full px-2.5 py-1 text-[11px] bg-white border border-zinc-200 rounded focus:outline-none placeholder-zinc-300 font-medium"
                        />
                        <div className="max-h-24 overflow-y-auto divide-y divide-zinc-100 flex flex-col">
                          {WORLD_LANGUAGES.filter(lang => 
                            lang.toLowerCase().includes(srcLangSearch.toLowerCase())
                          ).map(lang => {
                            const isChecked = selectedSourceLangs.includes(lang);
                            return (
                              <label key={lang} className="flex items-center gap-2 py-1 px-1 text-xs cursor-pointer hover:bg-zinc-100/50 select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedSourceLangs(prev => 
                                      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
                                    );
                                  }}
                                  className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
                                />
                                <span className={isChecked ? 'font-bold text-zinc-950' : 'text-zinc-650'}>
                                  {lang}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {selectedSourceLangs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed border-zinc-200">
                            {selectedSourceLangs.map(lang => (
                              <span key={lang} className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-805 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {lang}
                                <button
                                  type="button"
                                  onClick={() => setSelectedSourceLangs(prev => prev.filter(l => l !== lang))}
                                  className="text-indigo-400 hover:text-indigo-705 text-[10px] font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target Languages (Translate To) Searchable Multi-Checklist */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                        {isRtl ? 'الترجمة إلى لغات الهدف (إلى)' : 'Mastered Target Languages (Translate TO)'}
                      </label>
                      <div className="border border-zinc-200 rounded-lg p-2 bg-zinc-50/30 space-y-2">
                        <input
                          type="text"
                          placeholder={isRtl ? 'ابحث لتصفية لغات الهدف...' : 'Type to search target languages...'}
                          value={trgLangSearch}
                          onChange={e => setTrgLangSearch(e.target.value)}
                          className="w-full px-2.5 py-1 text-[11px] bg-white border border-zinc-200 rounded focus:outline-none placeholder-zinc-300 font-medium"
                        />
                        <div className="max-h-24 overflow-y-auto divide-y divide-zinc-100 flex flex-col font-sans">
                          {WORLD_LANGUAGES.filter(lang => 
                            lang.toLowerCase().includes(trgLangSearch.toLowerCase())
                          ).map(lang => {
                            const isChecked = selectedTargetLangs.includes(lang);
                            return (
                              <label key={lang} className="flex items-center gap-2 py-1 px-1 text-xs cursor-pointer hover:bg-zinc-100/50 select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedTargetLangs(prev => 
                                      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
                                    );
                                  }}
                                  className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
                                />
                                <span className={isChecked ? 'font-bold text-zinc-950' : 'text-zinc-650'}>
                                  {lang}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {selectedTargetLangs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed border-zinc-200">
                            {selectedTargetLangs.map(lang => (
                              <span key={lang} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-805 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {lang}
                                <button
                                  type="button"
                                  onClick={() => setSelectedTargetLangs(prev => prev.filter(l => l !== lang))}
                                  className="text-emerald-400 hover:text-emerald-705 text-[10px] font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {(newEmpType === 'staff' || newRole === 'admin') && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الراتب المقطوع الشهري الثابت (ج.م)' : 'Direct Fixed Monthly Salary (EGP)'}</label>
                    <input 
                      type="number" 
                      value={newSalary}
                      onChange={e => setNewSalary(e.target.value)}
                      placeholder="e.g. 8500"
                      className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </div>
                )}

                <div className="md:col-span-3 pt-3 flex justify-end gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-500 font-semibold cursor-pointer"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-zinc-950 hover:bg-zinc-850 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                  >
                    {isRtl ? 'اعتماد وحفظ الحقل' : 'Authorize & Provision Account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PASSWORD RESET DIALOG MODAL CONTROLLER */}
          {selectedProfileForReset && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl border border-zinc-200 shadow-xl max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 border-b border-zinc-100 pb-3">
                  <Lock size={16} />
                  <h4 className="font-bold text-xs uppercase tracking-wider">{isRtl ? 'تجاوز وإعادة تعيين كلمة المرور' : 'Override Staff Credentials'}</h4>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-zinc-500">{isRtl ? 'سيتم مسح كلمة المرور القديمة للموظف وكتابة الكلمة الجديدة الآمنة للولوج:' : 'This replaces active database authentication passwords for staff member:'}</p>
                  <p className="font-bold text-zinc-850 bg-zinc-50 p-2 border border-zinc-150 rounded mt-1">{isRtl ? selectedProfileForReset.fullNameAr : selectedProfileForReset.fullName} ({selectedProfileForReset.role})</p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{isRtl ? 'الحاشية السرية لكلمة المرور الجديدة' : 'New Security Phrase'}</label>
                    <input 
                      type="password" 
                      value={customNewPass}
                      onChange={e => setCustomNewPass(e.target.value)}
                      required
                      placeholder="Enter new phrase..."
                      className="w-full px-3 py-1.5 border border-zinc-200 text-xs font-semibold rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 text-xs pt-2">
                    <button 
                      type="button" 
                      onClick={() => setSelectedProfileForReset(null)}
                      className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-400 font-medium cursor-pointer"
                    >
                      {isRtl ? 'تراجع' : 'Cancel'}
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-1.5 bg-zinc-950 text-white rounded-lg font-bold cursor-pointer"
                    >
                      {isRtl ? 'إعادة التعيين الآن' : 'Commit New Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ACCOUNTS LIST DIRECTORY TABLE */}
          <div className="bg-white rounded-xl border border-zinc-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-600 font-sans">
                <thead className="bg-zinc-50 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-3">{isRtl ? 'الموظف والجنسية' : 'User profile name'}</th>
                    <th className="px-6 py-3">{isRtl ? 'البريد الإلكتروني للولوج' : 'Official Login Email'}</th>
                    <th className="px-6 py-3">{isRtl ? 'رتبة ومستوى الصلاحيات' : 'Role level'}</th>
                    <th className="px-6 py-3">{isRtl ? 'نوع التعيين' : 'Deployment'}</th>
                    <th className="px-6 py-3">{isRtl ? 'سعر الكلمة / الراتب الثابت' : 'Compensation rates'}</th>
                    <th className="px-6 py-3">{isRtl ? 'ترخيص الحساب' : 'Security Access'}</th>
                    <th className="px-6 py-3 text-right">{isRtl ? 'إجراءات الأمان' : 'System Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProfiles.map(p => {
                    const isCurrentUser = p.id === currentUser.id;
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-90 w-8 h-8 rounded-full bg-zinc-950 text-white font-mono text-xs font-bold flex items-center justify-center shadow-inner">
                              {p.fullName.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-900">{isRtl ? p.fullNameAr : p.fullName}</p>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {p.phone && (
                                  <p className="text-[9px] text-zinc-500 font-mono">
                                    <span className="text-zinc-400 mr-1 italic">Tel:</span> {p.phone}
                                  </p>
                                )}
                                {p.personalEmail && (
                                  <p className="text-[9px] text-zinc-400 font-mono">
                                    <span className="text-zinc-400 mr-1 italic">Pers:</span> {p.personalEmail}
                                  </p>
                                )}
                                {p.role === 'translator' && (
                                  <div className="mt-1 space-y-1">
                                    {p.motherTongue && (
                                      <div className="text-[9px] font-sans text-slate-500 bg-slate-50 border border-slate-200/50 rounded px-1.5 py-0.5 inline-block">
                                        <span className="font-semibold text-slate-700">{isRtl ? 'الأم: ' : 'Native: '}</span>
                                        {p.motherTongue}
                                      </div>
                                    )}
                                    {((p.sourceLanguages && p.sourceLanguages.length > 0) || (p.targetLanguages && p.targetLanguages.length > 0)) && (
                                      <div className="text-[9px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 flex flex-wrap items-center gap-1 mt-0.5">
                                        <span className="font-semibold text-[8px] uppercase">{isRtl ? 'مسار: ' : 'Route: '}</span>
                                        <span>{(p.sourceLanguages || []).join(', ')}</span>
                                        <span className="text-indigo-400 font-bold">➔</span>
                                        <span>{(p.targetLanguages || []).join(', ')}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono font-semibold text-zinc-800">
                          {p.email || 'N/A'}
                        </td>

                        <td className="px-6 py-4">
                          {currentRole === 'owner' ? (
                            <select 
                              value={p.role}
                              onChange={e => handleRoleChange(p.id, e.target.value as UserRole)}
                              disabled={isCurrentUser}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md border border-zinc-150 focus:outline-none cursor-pointer ${
                                isCurrentUser ? 'opacity-70 cursor-not-allowed bg-zinc-50' : 'bg-white'
                              }`}
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="accountant">Accountant</option>
                              <option value="sales">Sales</option>
                              <option value="translator">Translator</option>
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 font-bold uppercase text-[9px] bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-md">
                              {p.role}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-[10px] uppercase font-semibold text-zinc-500">
                            {p.employeeType === 'staff' ? (isRtl ? 'مرتب مباشر' : 'Salaried staff') : (isRtl ? 'فريلانس مستقل' : 'Freelance')}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs font-mono text-zinc-900">
                          {p.role === 'translator' ? (
                            <div className="space-y-1 text-left">
                              {p.perWordRate !== undefined && (
                                <p className="font-semibold text-zinc-800">
                                  {isRtl ? 'كلمة: ' : 'Word: '}EGP {p.perWordRate.toFixed(2)}
                                </p>
                              )}
                              {p.perPageRate !== undefined && (
                                <p className="text-[10px] text-zinc-650">
                                  {isRtl ? 'صفحة: ' : 'Page: '}EGP {p.perPageRate.toFixed(2)}
                                </p>
                              )}
                              {p.workingHours !== undefined && (
                                <p className="text-[9px] text-zinc-500 font-sans">
                                  ⏳ {p.workingHours} hrs ({p.workingShift === 'night' ? (isRtl ? 'وردية ليلية' : 'Night Shift') : (isRtl ? 'وردية نهارية' : 'Day Shift')})
                                </p>
                              )}
                              {p.perWordRate === undefined && p.perPageRate === undefined && (
                                <span className="text-zinc-350">—</span>
                              )}
                            </div>
                          ) : p.monthlySalary ? (
                            <span>EGP {p.monthlySalary.toLocaleString()}/mo</span>
                          ) : (
                            <span className="text-zinc-350">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(p.id)}
                            disabled={isCurrentUser}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all ${
                              isCurrentUser ? 'opacity-50 cursor-not-allowed bg-zinc-50 text-zinc-400 border-zinc-100' :
                              p.isActive 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-red-50 text-red-750 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {p.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                            <span>{p.isActive ? (isRtl ? 'نشط / مصرح' : 'Active / Allowed') : (isRtl ? 'معطل / معلق' : 'Suspended')}</span>
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedProfileForReset(p)}
                            className="p-1 px-2.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200 rounded text-[10px] font-bold text-zinc-500 transition-colors cursor-pointer"
                            title="Reset passwords"
                          >
                            {isRtl ? 'إعادة ضبط الرقم السري' : 'Override Key'}
                          </button>
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

      {/* VIEW 2:permissions MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-zinc-150 space-y-2">
            <h4 className="font-semibold text-zinc-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={15} />
              {isRtl ? 'مرجع التحكم بالنظام وصلاحية الأدوار الفنية' : 'System Administration Authorization Blueprint'}
            </h4>
            <p className="text-xs text-zinc-450 text-zinc-400 leading-relaxed">
              {isRtl 
                ? 'يوضح هذا المرجع المستويات الهيكلية للمصادقة المبرمجة بالشيفرة البرمجية للمكتب القانوني. يتم فلترة وتطويق لوحة التحكم، المقاصات، الدفاتر المحوسبة والسيولة النقدية تلقائياً بناء على فئة ولوج المستخدم.'
                : 'The system programmatically secures and intercepts modules based on these authorization flags. Below is a grid tracing active permission vectors across all modules inside the accrediting translation office.'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-150 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-700">
                <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-3.5 w-64">{isRtl ? 'المهام وصلاحيات الموديول' : 'Workspace / Module'}</th>
                    <th className="px-4 py-3.5 text-center font-bold">Owner</th>
                    <th className="px-4 py-3.5 text-center font-bold">Admin</th>
                    <th className="px-4 py-3.5 text-center font-bold">Accountant</th>
                    <th className="px-4 py-3.5 text-center font-bold">Sales</th>
                    <th className="px-4 py-3.5 text-center font-bold">Translator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {matrixActions.map(action => (
                    <tr key={action.key} className="hover:bg-zinc-50/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-zinc-900">
                        <p>{isRtl ? action.labelAr : action.labelEn}</p>
                        <span className="text-[9px] text-zinc-400 mt-0.5 block font-mono">module_acl::{action.key}</span>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.owner)}`}>
                          {getPowerLabel(action.owner)}
                        </span>
                      </td>

                      {/* Admin */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.admin)}`}>
                          {getPowerLabel(action.admin)}
                        </span>
                      </td>

                      {/* Accountant */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.accountant)}`}>
                          {getPowerLabel(action.accountant)}
                        </span>
                      </td>

                      {/* Sales */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.sales)}`}>
                          {getPowerLabel(action.sales)}
                        </span>
                      </td>

                      {/* Translator */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.translator)}`}>
                          {getPowerLabel(action.translator)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: AUDITS LOGGING */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-150">
            <div>
              <h4 className="font-semibold text-zinc-900 text-xs uppercase tracking-wider">{isRtl ? 'سجلات الأنشطة الفورية وعمليات الدخول' : 'Security Log Auditing System'}</h4>
              <p className="text-[10px] text-zinc-400 mt-0.5">{isRtl ? 'سجل تتبع لحظي لتدقيق صلاحيات وتحركات المستخدمين داخل النظام.' : 'Chronological stream of cryptographic token sessions, view transitions, and transactional edits.'}</p>
            </div>
            <button 
              onClick={() => {
                setNotifLogs([...dbInstance.notifications]);
                setSuccessMsg(isRtl ? 'تم تحديث السجلات بنجاح.' : 'Audit list re-synchronized.');
                setTimeout(() => setSuccessMsg(''), 2000);
              }}
              className="p-1 px-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-650 rounded border border-zinc-200 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
            >
              <RefreshCw size={11} />
              <span>{isRtl ? 'تحديث فوري' : 'Sync Logs'}</span>
            </button>
          </div>

          <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'سجل الأحداث الـ 50 الأخيرة' : 'Latest 50 security transactions'}</span>
              <span className="text-[10px] text-zinc-500 font-mono font-bold">SHA256::LOGS_ENABLED</span>
            </div>

            <div className="divide-y divide-zinc-100 font-mono text-[11px] leading-snug p-2 max-h-[500px] overflow-y-auto">
              {notifLogs.length === 0 ? (
                <div className="p-10 text-center text-zinc-400 italic">
                  {isRtl ? 'لا توجد سجلات أمنية مسجلة بعد.' : 'No audit transactions currently recorded inside the repository.'}
                </div>
              ) : (
                notifLogs.map((log, index) => {
                  const typeColors = 
                    log.type === 'success' ? 'text-emerald-600 bg-emerald-50' : 
                    log.type === 'warning' ? 'text-amber-600 bg-amber-50' : 
                    'text-zinc-600 bg-zinc-50';

                  return (
                    <div key={log.id || index} className="p-3.5 hover:bg-zinc-50/60 transition-colors flex items-start gap-4">
                      <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded shrink-0 border border-zinc-200/50 ${typeColors}`}>
                        {log.type || 'info'}
                      </span>
                      
                      <div className="flex-1 space-y-1 font-sans">
                        <p className="font-bold text-zinc-900 text-xs">
                          {isRtl ? log.titleAr || log.title : log.title}
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {isRtl ? log.messageAr || log.message : log.message}
                        </p>
                        <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-mono pt-1">
                          <span>PID: {log.userId || 'system'}</span>
                          <span>•</span>
                          <span>Timestamp: {new Date(log.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>Sign: Hash#{log.id?.slice(-6) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: SMTP SETTINGS */}
      {activeTab === 'smtp' && (
        <div className="space-y-6 animate-fade-in" id="smtp_settings_section">
          <div className="bg-white p-6 rounded-2xl border border-zinc-150 shadow-sm max-w-4xl">
            <div className="flex items-center gap-4 border-b border-zinc-100 pb-5 mb-6" id="smtp_title_card">
              <div className="w-12 h-12 bg-zinc-950 text-white rounded-xl flex items-center justify-center font-bold shadow-md" id="smtp_icon_box">
                <Shield size={22} className="text-brand-gold shrink-0 stroke-[2.2]" id="smtp_shield_icon" />
              </div>
              <div id="smtp_info_header">
                <h4 className="font-extrabold text-zinc-900 text-sm tracking-wide uppercase" id="smtp_main_heading">
                  {isRtl ? 'إعدادات البريد الرسمي للشركة ومحرك الإشعارات (SMTP)' : 'Corporate Official Email & SMTP Gateway'}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1" id="smtp_sub_heading">
                  {isRtl 
                    ? 'قم بإعداد بيانات خادم البريد الرسمي للشركة ليقوم النظام تلقائياً وبشكل فوري بإرسال تنبيهات التعديل والتكليف للموظفين بالبريد الإلكتروني.' 
                    : 'Configure the corporate SMTP server profile to dispatch automated task assignments, hand-offs, and critical modifications.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSmtp} className="space-y-6" id="smtp_form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-zinc-700" id="smtp_fields_grid">
                
                {/* SMTP Host */}
                <div className="space-y-1.5 col-span-2 md:col-span-1" id="host_field_group">
                  <label className="font-bold text-zinc-700 block" id="host_label">
                    {isRtl ? 'خادم SMTP (Host)' : 'SMTP Host Address'}
                  </label>
                  <input
                    type="text"
                    required
                    id="smtp_host_input"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                    placeholder="smtp.example.com"
                  />
                  <span className="text-[9px] text-zinc-400 block mt-1" id="host_desc">
                    {isRtl ? 'المضيف أو خادم الاستقبال المعتمد لبريد الشركة الخاص بك.' : 'The domain name of your outgoing email server provider.'}
                  </span>
                </div>

                {/* SMTP Port */}
                <div className="space-y-1.5 col-span-2 md:col-span-1" id="port_field_group">
                  <label className="font-bold text-zinc-700 block" id="port_label">
                    {isRtl ? 'منفذ الخادم (Port)' : 'Server Port'}
                  </label>
                  <select
                    id="smtp_port_select"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all font-mono cursor-pointer"
                  >
                    <option value="587">587 (TLS Recommended / الافتراضي المقترح)</option>
                    <option value="465">465 (SSL - Secured Encryption / بروتوكول آمن)</option>
                    <option value="25">25 (Legacy Unencrypted / غير مشفر قديم)</option>
                    <option value="2525">2525 (Alternative Mailtrap Relay / خادم بديل للتجربة)</option>
                  </select>
                  <span className="text-[9px] text-zinc-400 block mt-1" id="port_desc">
                    {isRtl ? 'يوصى باستخدام المنفذ 587 للاتصالات اللحظية المشفرة.' : 'Port 587 is standard for TLS; use 465 for legacy secure sockets.'}
                  </span>
                </div>

                {/* SMTP User */}
                <div className="space-y-1.5 col-span-2 md:col-span-1" id="user_field_group">
                  <label className="font-bold text-zinc-700 block" id="user_label">
                    {isRtl ? 'اسم مستخدم SMTP / البريد المرسِل' : 'SMTP Username / Dispatcher Email'}
                  </label>
                  <input
                    type="text"
                    required
                    id="smtp_user_input"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                    placeholder="official@globalizetl.com"
                  />
                  <span className="text-[9px] text-zinc-400 block mt-1" id="user_desc">
                    {isRtl ? 'البريد الإلكتروني الرسمي لشركة غلوبالايز الذي سيرسل النظام منه.' : 'The authenticated official email address registered for the company.'}
                  </span>
                </div>

                {/* SMTP Pass */}
                <div className="space-y-1.5 col-span-2 md:col-span-1" id="pass_field_group">
                  <label className="font-bold text-zinc-700 block" id="pass_label">
                    {isRtl ? 'كلمة المرور أو الرمز السري (Password / App Token)' : 'SMTP Password or Secure App Token'}
                  </label>
                  <input
                    type="password"
                    required
                    id="smtp_pass_input"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                    placeholder="••••••••••••••"
                  />
                  <span className="text-[9px] text-zinc-400 block mt-1" id="pass_desc">
                    {isRtl ? 'أدخل كلمة مرور الحساب أو رمز كلمة مرور التطبيق (App Password) المصدرة.' : 'Your SMTP account secret key or generated secondary apps token.'}
                  </span>
                </div>

                {/* SMTP From Header Display */}
                <div className="space-y-1.5 col-span-2" id="from_field_group">
                  <label className="font-bold text-zinc-700 block" id="from_label">
                    {isRtl ? 'صيغة ترويسة المرسل (From Header Sender Display)' : 'Sender Name Display (From header)'}
                  </label>
                  <input
                    type="text"
                    required
                    id="smtp_from_input"
                    value={smtpFrom}
                    onChange={e => setSmtpFrom(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                    placeholder="Globalize Notifications <official@globalizetl.com>"
                  />
                  <span className="text-[9px] text-zinc-400 block mt-1" id="from_desc">
                    {isRtl ? 'طريقة ظهور معلومات مرسل البريد الإلكتروني (مثال: "نظام إشعارات غلوبالايز <official@globalizetl.com>").' : 'Custom sender display identity. Formatting: "Sender Name <email@example.com>".'}
                  </span>
                </div>

              </div>

              {/* ACTION FOOTER BAR */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-5 border-t border-zinc-100 gap-4" id="smtp_form_actions">
                <button
                  type="submit"
                  id="smtp_save_btn"
                  className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={14} className="text-brand-gold stroke-[2.5]" id="smtp_check_icon" />
                  <span>{isRtl ? 'حفظ إعدادات البريد الرسمية' : 'Save Email Server Settings'}</span>
                </button>

                {/* Direct Mail Connector Test */}
                <div className="flex items-center gap-3" id="smtp_diagnostic_panel">
                  <input 
                    type="email"
                    id="test_target_email_box"
                    placeholder={isRtl ? 'أدخل بريد لتجربة الاستقبال...' : 'Enter test email here...'}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-950 w-48 sm:w-56"
                  />
                  <button
                    type="button"
                    id="smtp_send_test_btn"
                    onClick={async () => {
                      const tgt = (document.getElementById('test_target_email_box') as HTMLInputElement)?.value;
                      if (!tgt) {
                        alert(isRtl ? 'يرجى إدخال بريد إلكتروني صالح لإطلاق الإشارة التجريبية!' : 'Please insert a valid receiver email first!');
                        return;
                      }
                      setSuccessMsg(isRtl ? 'جاري إرسال إشارة الاتصال بالبريد الإلكتروني...' : 'Tunneling test metrics to SMTP gateway...');
                      try {
                        const res = await fetch('/api/send-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: tgt,
                            subject: 'SMTP Integration Test',
                            text: 'SMTP diagnostic message delivered successfully.',
                            smtpConfig: {
                              host: smtpHost,
                              port: smtpPort,
                              user: smtpUser,
                              pass: smtpPass,
                              from: smtpFrom
                            }
                          })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setSuccessMsg(isRtl ? `تهانينا! تم إرسال بريد الاختبار بنجاح لمعرف: ${data.messageId}` : `Excellent! Test email transmitted successfully. ID: ${data.messageId}`);
                          setTimeout(() => setSuccessMsg(''), 5000);
                        } else {
                          setErrorMsg(isRtl ? `فشل إرسال بريد الاختبار: ${data.error}` : `Relay reported failure: ${data.error}`);
                          setTimeout(() => setErrorMsg(''), 6000);
                        }
                      } catch (err: any) {
                        setErrorMsg(isRtl ? `خطأ في محرك الاتصال: ${err.message}` : `Fatal client socket error: ${err.message}`);
                        setTimeout(() => setErrorMsg(''), 6000);
                      }
                    }}
                    className="p-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all border border-zinc-200 cursor-pointer text-center"
                  >
                    {isRtl ? 'إرسال اختبار' : 'Send Test E-mail'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
