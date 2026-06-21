/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, Briefcase, FileText, FileSpreadsheet, PiggyBank, 
  Users, Calendar, Key, Globe, Bell, Plus, ShieldAlert, Sparkles, LogOut, CheckCheck, ShieldCheck, Lock, User, Landmark, Target, Palette, MessageSquare, RotateCw,
  GitBranch, MapPin, AlertCircle
} from 'lucide-react';
import dbInstance from './db/store';
import { UserRole, Profile, Branch } from './types';
import FinancialHub from './components/FinancialHub';
import SalesBillingHub from './components/SalesBillingHub';
import CRMHub from './components/CRMHub';

// Role Dashboards
import DashboardOwner from './components/DashboardOwner';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardSales from './components/DashboardSales';
import DashboardAccountant from './components/DashboardAccountant';
import DashboardTranslator from './components/DashboardTranslator';

// Core Pages
import TasksPage from './components/TasksPage';
import QuotationsPage from './components/QuotationsPage';
import RevenuesPage from './components/RevenuesPage';
import CashBookPage from './components/CashBookPage';
import ClientReceivablesPage from './components/ClientReceivablesPage';
import MonthlyClosingPage from './components/MonthlyClosingPage';
import AttendancePage from './components/AttendancePage';
import AccountsPage from './components/AccountsPage';
import LoginPage from './components/LoginPage';
import CertifiedTranslationComposer from './components/CertifiedTranslationComposer';
import FeedbackPage from './components/FeedbackPage';
import DocumentStudio from './components/DocumentStudio';
import { WhatsAppCRMPage } from './components/WhatsAppCRMPage';
import BranchesPage from './components/BranchesPage';

type ActiveTab = 
  | 'dashboard' 
  | 'crm'
  | 'whatsapp'
  | 'tasks' 
  | 'sales_billing'
  | 'finance_hub' 
  | 'acc_receivables'
  | 'attendance'
  | 'accounts'
  | 'certified'
  | 'feedback'
  | 'document_studio'
  | 'branches';

import { ToastProvider, useToast } from './components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const { error } = useToast();
  const [isRtl, setIsRtl] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Notification States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Intake Modal Shortcut
  const [isQuickIntakeOpen, setIsQuickIntakeOpen] = useState(false);

  // Database synchronizer loader state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleForceRefresh = () => {
    setIsRefreshing(true);
    dbInstance.fetchFromServer();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 850);
  };

  // Sync database subscriber to force global re-renders
  const [tick, setTick] = useState(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    return localStorage.getItem('gtms_selected_branch_id') || 'all';
  });

  useEffect(() => {
    setBranches([...dbInstance.branches]);
    const unsub = dbInstance.subscribe(() => {
      setTick(prev => prev + 1);
      setBranches([...dbInstance.branches]);
      setNotifications([...dbInstance.notifications]);
    });
    return unsub;
  }, []);

  // Track session authentication user
  const [sessionUser, setSessionUser] = useState<Profile | null>(null);

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return sessionUser ? sessionUser.role : 'owner';
  });

  useEffect(() => {
    const token = dbInstance.getAuthToken();
    if (!token) return;

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Session expired')))
      .then(async data => {
        if (data.success && data.user) {
          setSessionUser(data.user);
          setCurrentRole(data.user.role);
          dbInstance.activeProfile = data.user;
          dbInstance.currentRole = data.user.role;
          await dbInstance.fetchFromServer();
        }
      })
      .catch(() => {
        dbInstance.setAuthToken(null);
        setSessionUser(null);
      });
  }, []);

  // Intercept de-activation or role changes in real-time
  useEffect(() => {
    if (sessionUser) {
      const dbProfile = dbInstance.profiles.find(p => p.id === sessionUser.id);
      if (!dbProfile || !dbProfile.isActive) {
        setSessionUser(null);
        dbInstance.setAuthToken(null);
      } else {
        dbInstance.activeProfile = dbProfile;
        dbInstance.currentRole = dbProfile.role;
        if (dbProfile.role !== currentRole) {
          setCurrentRole(dbProfile.role);
        }
        setSessionUser(dbProfile);
      }
    }
  }, [tick, sessionUser?.id, currentRole]);

  // Strict, Real-time Role-Based Tab/View Access Control Gating
  useEffect(() => {
    if (!sessionUser) return;
    
    const isAccountingTab = activeTab === 'finance_hub' || activeTab === 'accounts' || activeTab === 'acc_receivables';
    const hasAccountingAccess = ['owner', 'accountant'].includes(currentRole);
    
    const isCrmTab = activeTab === 'crm' || activeTab === 'whatsapp';
    const hasCrmAccess = currentRole !== 'translator';
    
    if (isAccountingTab && !hasAccountingAccess) {
      dbInstance.logSecurityEvent(
        'unauthorized_access', 
        `Access denied: Opened active view: "${activeTab}" for unauthorized role: "${currentRole}" (${sessionUser.fullName})`, 
        'denied'
      );
      setActiveTab('dashboard');
    } else if (isCrmTab && !hasCrmAccess) {
      dbInstance.logSecurityEvent(
        'unauthorized_access', 
        `Access denied: CRM pages are restricted for Translator role: "${currentRole}" (${sessionUser.fullName})`, 
        'denied'
      );
      setActiveTab('dashboard');
    }
  }, [activeTab, currentRole, sessionUser]);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setActiveTab('dashboard'); // Default root tab upon credential alterations
  };

  const markAllNotificationsRead = () => {
    dbInstance.markAllNotificationsRead();
    setNotifications([...dbInstance.notifications]);
  };

  const activeNotificationCount = notifications.filter(n => !n.isRead).length;

  if (!sessionUser) {
    return (
      <LoginPage 
        isRtl={isRtl} 
        onToggleRtl={() => setIsRtl(!isRtl)} 
        onSuccessLogin={(user) => {
          setSessionUser(user);
          setCurrentRole(user.role);
          dbInstance.currentRole = user.role;
          dbInstance.activeProfile = user;
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-brand-bg flex flex-col font-sans transition-all duration-300 text-brand-text ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* 1. TOP GLOBAL EXECUTIVE HEADER BAR */}
      <header className="bg-brand-navy border-b border-brand-navy-dark px-8 py-3 flex items-center justify-between sticky top-0 z-40 shrink-0 text-white shadow-lg">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-brand-navy shadow-sm">
            <Building2 size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-[15px] text-white">GLOBAL SERVICE</span>
              <span className="text-[9px] uppercase font-semibold px-2 py-0.5 bg-brand-navy-dark text-brand-gold-light rounded border border-brand-navy-dark font-mono">ERP v3.0</span>
            </div>
            <p className="text-[10px] text-brand-navy-light font-medium opacity-80">Globalize Translation & Legal Bureau System</p>
          </div>
        </div>

        {/* Global utility triggers */}
        <div className="flex items-center gap-4 text-xs font-sans">
          
          {/* Branch Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-brand-navy-dark px-2.5 py-1 rounded-lg border border-brand-navy-dark shadow-inner">
            <GitBranch size={12} className="text-brand-gold shrink-0" />
            <select
              value={currentBranchId}
              onChange={e => {
                const val = e.target.value;
                setCurrentBranchId(val);
                localStorage.setItem('gtms_selected_branch_id', val);
              }}
              className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer pr-1 border-none focus:ring-0"
            >
              <option value="all" className="bg-brand-navy text-white text-xs">{isRtl ? 'جميع الفروع' : 'All Branches'}</option>
              {branches.map(br => (
                <option key={br.id} value={br.id} className="bg-brand-navy text-white text-xs">
                  {isRtl ? br.nameAr : br.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Intake Shortcut */}
          <button
            onClick={() => setIsQuickIntakeOpen(true)}
            className="px-4 py-1.5 bg-brand-gold hover:bg-brand-gold-hover text-brand-navy font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Plus size={14} />
            <span>{isRtl ? 'تسجيل ملف سريع' : 'Quick Intake'}</span>
          </button>

          {/* RTL toggle */}
          <button
            onClick={() => setIsRtl(!isRtl)}
            className="px-3 py-1.5 bg-brand-navy-hover hover:bg-brand-navy-dark text-white transition-colors rounded-lg flex items-center gap-1.5 border border-brand-navy-dark cursor-pointer font-medium"
          >
            <Globe size={13} />
            <span>{isRtl ? 'English Layout' : 'عربي RTL'}</span>
          </button>

          {/* Global Refresh Sync */}
          <button
            id="global-sync-btn"
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className={`px-3 py-1.5 bg-brand-navy-hover hover:bg-brand-navy-dark text-white transition-all rounded-lg flex items-center gap-1.5 border border-brand-navy-dark cursor-pointer font-semibold active:scale-95 disabled:opacity-50`}
            title={isRtl ? 'مزامنة وتنشيط البيانات' : 'Force system-wide database sync'}
          >
            <RotateCw size={13} className={isRefreshing ? 'animate-spin text-brand-gold' : 'text-brand-gold-light'} />
            <span>{isRefreshing ? (isRtl ? 'جاري المزامنة...' : 'Syncing...') : (isRtl ? 'مزامنة البيانات' : 'Sync Data')}</span>
          </button>

          {/* Notifications panel dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 bg-brand-navy-hover hover:bg-brand-navy-dark border border-brand-navy-dark rounded-lg text-white relative cursor-pointer transition-colors"
            >
              <Bell size={14} />
              {activeNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-gold text-brand-navy rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-brand-navy">
                  {activeNotificationCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className={`absolute mt-2.5 w-64 bg-white rounded-xl shadow-lg border border-zinc-200/60 py-2.5 z-50 text-zinc-700 ${isRtl ? 'left-0' : 'right-0'}`}>
                <div className="flex items-center justify-between px-4 pb-2 border-b border-zinc-100">
                  <span className="font-medium text-[10px] text-zinc-400 uppercase tracking-widest">Notifications</span>
                  {activeNotificationCount > 0 && (
                    <button onClick={markAllNotificationsRead} className="text-[10px] text-zinc-950 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer">
                      <CheckCheck size={12} /> Clear All
                    </button>
                  )}
                </div>
                <div className="divide-y divide-zinc-50 max-h-48 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 text-[10px] leading-snug transition-colors ${n.isRead ? 'text-zinc-400 bg-white' : 'text-zinc-800 bg-zinc-50/50 font-medium'}`}>
                      <p>{isRtl ? (n.messageAr || n.titleAr || n.message || n.title) : (n.message || n.title)}</p>
                      <span className="text-[8px] text-zinc-400 font-mono block mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Logged-in User Profile & Role Switcher */}
          <div className="flex items-center gap-3 border-l border-brand-navy-dark pl-4 bg-brand-navy-dark/40 px-3.5 py-1.5 rounded-xl border border-brand-navy-dark">
            <div className="leading-tight shrink-0">
              <span className="text-[8px] font-bold text-brand-navy-light block uppercase tracking-wider opacity-60">
                {isRtl ? 'المستخدم الحالي' : 'Logged Employee'}
              </span>
              <span className="font-bold text-white text-[11px] block">
                {isRtl ? sessionUser.fullNameAr : sessionUser.fullName}
              </span>
            </div>
            
            <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-brand-gold text-brand-navy rounded border border-transparent font-mono">
              {currentRole}
            </span>

            {/* Logout Trigger */}
            <button
              onClick={() => {
                dbInstance.setAuthToken(null);
                setSessionUser(null);
              }}
              className="p-1 text-brand-navy-light hover:text-white hover:bg-brand-navy-hover border border-brand-navy-dark rounded-lg cursor-pointer transition-all"
              title={isRtl ? 'تسجيل الخروج الآمن' : 'Log Out Secured Session'}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY FRAME: SIDEBAR + MAIN SHEET CANVAS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR PANEL */}
        <aside className="w-64 bg-brand-navy flex flex-col justify-between shrink-0 font-sans shadow-2xl z-30">
          
          <div className="py-6 px-4 space-y-6">
            {/* Quick Profile */}
            <div className="p-4 bg-brand-navy-dark/50 rounded-2xl flex items-center gap-3 border border-brand-navy-dark shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-brand-gold flex items-center justify-center text-brand-navy text-xs font-black shadow-lg">
                {currentRole[0].toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-black text-white uppercase tracking-tighter capitalize">{currentRole}</p>
                <p className="text-[9px] text-brand-navy-light font-bold opacity-60">Verified Session</p>
              </div>
            </div>

            {/* Navigation buttons */}
            <nav className="space-y-1.5 text-xs">
              <span className="text-[10px] font-black text-brand-navy-light/40 uppercase tracking-widest block pb-2 px-3">Workspaces</span>
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                  activeTab === 'dashboard' 
                    ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                    : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 size={16} className={activeTab === 'dashboard' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                <span>{isRtl ? 'لوحة المراقبة العامة' : 'Core Dashboard'}</span>
              </button>

              {currentRole !== 'translator' && (
                <>
                  <button
                    onClick={() => setActiveTab('crm')}
                    className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                      activeTab === 'crm' 
                        ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                        : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Target size={16} className={activeTab === 'crm' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                    <span>{isRtl ? 'إدارة العملاء CRM' : 'Sales CRM'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                      activeTab === 'whatsapp' 
                        ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                        : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <MessageSquare size={16} className={activeTab === 'whatsapp' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                    <span>{isRtl ? 'ميتا وواتساب CRM' : 'WhatsApp CRM'}</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  if (currentRole === 'translator') return error('Access Denied. Linguists use translation assignment queues.');
                  setActiveTab('tasks');
                }}
                className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                  currentRole === 'translator' ? 'opacity-30 cursor-not-allowed' : ''
                } ${activeTab === 'tasks' 
                  ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                  : 'text-brand-navy-light hover:text-white hover:bg-white/5'}`}
              >
                <Briefcase size={16} className={activeTab === 'tasks' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                <span>{isRtl ? 'تسجيل المعاملات والملفات' : 'Legal Intake Jobs'}</span>
              </button>

              <button
                onClick={() => {
                  if (currentRole === 'translator') return;
                  setActiveTab('sales_billing');
                }}
                className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                  currentRole === 'translator' ? 'opacity-30 cursor-not-allowed' : ''
                } ${activeTab === 'sales_billing' 
                  ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                  : 'text-brand-navy-light hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={16} className={activeTab === 'sales_billing' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                <span>{isRtl ? 'المبيعات والفوترة' : 'Sales & Billing'}</span>
              </button>

              <span className="text-[10px] font-black text-brand-navy-light/40 uppercase tracking-widest block pt-4 pb-2 px-3">Accounting & ERP</span>
              
              <button
                onClick={() => {
                  if (currentRole === 'translator') return;
                  setActiveTab('finance_hub');
                }}
                className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                  currentRole === 'translator' ? 'opacity-30 cursor-not-allowed' : ''
                } ${activeTab === 'finance_hub' 
                  ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                  : 'text-brand-navy-light hover:text-white hover:bg-white/5'}`}
              >
                <Landmark size={16} className={activeTab === 'finance_hub' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                <span>{isRtl ? 'المركز المالي والمحاسبي' : 'Financial & ERP Hub'}</span>
              </button>

              {(currentRole === 'owner' || currentRole === 'accountant') && (
                <button
                  onClick={() => setActiveTab('acc_receivables')}
                  className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                    activeTab === 'acc_receivables' 
                      ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                      : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                  }`}
                >
                  <AlertCircle size={16} className={activeTab === 'acc_receivables' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                  <span>{isRtl ? 'مديونيات العملاء' : 'Receivables CRM'}</span>
                </button>
              )}

              <span className="text-[10px] font-black text-brand-navy-light/40 uppercase tracking-widest block pt-4 pb-2 px-3">Team Office</span>

              <button
                onClick={() => {
                  if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'accountant') return;
                  setActiveTab('attendance');
                }}
                className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                  (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'accountant') ? 'opacity-30 cursor-not-allowed' : ''
                } ${activeTab === 'attendance' 
                  ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                  : 'text-brand-navy-light hover:text-white hover:bg-white/5'}`}
              >
                <Calendar size={16} className={activeTab === 'attendance' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                <span>{isRtl ? 'مرتبات وحضور اللغويين' : 'Prd/Salary Timesheet'}</span>
              </button>

              {/* Privileged User Powers and Accounts tab */}
              {(currentRole === 'owner' || currentRole === 'admin') && (
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                    activeTab === 'accounts' 
                      ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                      : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck size={16} className={activeTab === 'accounts' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                  <span>{isRtl ? 'حسابات الموظفين والصلاحيات' : 'Accounts & Powers'}</span>
                </button>
              )}

              {/* Office & Branches Tab */}
              {(currentRole === 'owner' || currentRole === 'admin') && (
                <button
                  onClick={() => setActiveTab('branches')}
                  className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                    activeTab === 'branches' 
                      ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                      : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                  }`}
                >
                  <GitBranch size={16} className={activeTab === 'branches' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                  <span>{isRtl ? 'إدارة الفروع والمكاتب' : 'Offices & Branches'}</span>
                </button>
              )}

              {/* Certification */}
              {(currentRole === 'owner' || currentRole === 'admin') && (
                <button
                  onClick={() => setActiveTab('certified')}
                  className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                    activeTab === 'certified' 
                      ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                      : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sparkles size={16} className={activeTab === 'certified' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                  <span>{isRtl ? 'محرر الترجمة المعتمدة' : 'Certified Composer'}</span>
                </button>
              )}

              {/* Document Design Studio */}
              {(currentRole === 'owner' || currentRole === 'admin' || currentRole === 'accountant' || currentRole === 'sales') && (
                <button
                  onClick={() => setActiveTab('document_studio')}
                  className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                    activeTab === 'document_studio' 
                      ? 'bg-brand-navy-light text-brand-navy border-l-4 border-brand-gold shadow-md' 
                      : 'text-brand-navy-light hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Palette size={16} className={activeTab === 'document_studio' ? 'text-brand-navy' : 'text-brand-gold opacity-50 group-hover:opacity-100'} />
                  <span>{isRtl ? 'استوديو تصميم المستندات' : 'Doc Design Studio'}</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('feedback')}
                className={`w-full px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-3 cursor-pointer mt-4 ${
                  activeTab === 'feedback' 
                    ? 'bg-brand-gold text-brand-navy shadow-lg' 
                    : 'bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20'
                }`}
              >
                <CheckCheck size={16} />
                <span>{isRtl ? 'تقييم تجربة الاستخدام' : 'System Feedback'}</span>
              </button>
            </nav>
          </div>

          {/* Secure vault notification */}
          <div className="p-5 border-t border-brand-navy-dark text-[9px] leading-snug bg-brand-navy-dark/30">
            <span className="font-black uppercase text-brand-gold block pb-1 tracking-widest">System Audit active</span>
            <p className="text-brand-navy-light opacity-50">Globalize Group Digital Infrastructure. All operations are logged.</p>
          </div>
        </aside>

        {/* 3. CORE MAIN LAYOUT PORT CANVAS */}
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-70px)]">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Context Header */}
            <div className="border-b border-zinc-150/70 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.2em] block">
                  {isRtl ? 'بيئة المعالجة والتوثيق' : 'GTMS Workspace Environment'}
                </span>
                <h2 className="text-2xl font-light tracking-tight text-zinc-900 capitalize mt-1.5 focus:outline-none">
                  {isRtl ? `${activeTab === 'dashboard' ? 'لوحة المراقبة' : activeTab} Workspace` : `${activeTab.replace('_', ' ')} Workspace`}
                </h2>
              </div>
              
              <button
                id="workspace-refresher-btn"
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
                  isRefreshing
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-white hover:bg-brand-navy hover:text-white border-zinc-200 text-slate-700 shadow-sm hover:border-brand-navy'
                }`}
                title={isRtl ? 'تحديث ومزامنة البيانات اللحظية' : 'Reload database store and repaint dashboard widgets'}
              >
                <RotateCw size={13} className={isRefreshing ? 'animate-spin text-brand-gold' : 'text-indigo-600'} />
                <span>{isRefreshing ? (isRtl ? 'جاري التحديث...' : 'Reloading...') : (isRtl ? 'تحديث البيانات' : 'Refresh Workspace')}</span>
              </button>
            </div>

            {/* TAB ROUTING STATE LOGICS */}
            {activeTab === 'dashboard' && (
              <>
                {currentRole === 'owner' && <DashboardOwner isRtl={isRtl} onNavigateTab={(t: any) => setActiveTab(t)} />}
                {currentRole === 'sales' && (
                  <DashboardSales 
                    isRtl={isRtl} 
                    onNavigateTab={(t: any) => setActiveTab(t as any)} 
                    onOpenNewTaskModal={() => setIsQuickIntakeOpen(true)}
                    onOpenNewQuoteModal={() => setActiveTab('sales_billing')}
                  />
                )}
                {currentRole === 'accountant' && (
                  <DashboardAccountant 
                    isRtl={isRtl} 
                    onNavigateTab={(t: any) => setActiveTab(t as any)} 
                    onOpenNewPaymentModal={() => setActiveTab('finance_hub')}
                  />
                )}
                {currentRole === 'translator' && <DashboardTranslator isRtl={isRtl} />}
                {currentRole === 'admin' && <DashboardAdmin isRtl={isRtl} onNavigateTab={(t: any) => setActiveTab(t)} />}
              </>
            )}

            {activeTab === 'crm' && (
              <CRMHub isRtl={isRtl} currentUser={sessionUser!} />
            )}

            {activeTab === 'whatsapp' && (
              <WhatsAppCRMPage isRtl={isRtl} />
            )}

            {activeTab === 'tasks' && (
              <TasksPage 
                isRtl={isRtl} 
                currentRole={currentRole}
                isQuickIntakeOpen={isQuickIntakeOpen}
                onCloseQuickIntake={() => setIsQuickIntakeOpen(false)}
                currentBranchId={currentBranchId}
              />
            )}

            {activeTab === 'sales_billing' && (
              <SalesBillingHub isRtl={isRtl} currentUser={sessionUser!} />
            )}

            {activeTab === 'finance_hub' && (
              <FinancialHub isRtl={isRtl} currentUser={sessionUser!} />
            )}

            {activeTab === 'acc_receivables' && (
              <ClientReceivablesPage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'attendance' && (
              <AttendancePage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'accounts' && (
              <AccountsPage 
                isRtl={isRtl} 
                currentRole={currentRole} 
                currentUser={sessionUser}
              />
            )}
            
            {activeTab === 'branches' && (
              <BranchesPage 
                isRtl={isRtl} 
                currentRole={currentRole} 
                currentUser={sessionUser!}
              />
            )}
            {activeTab === 'certified' && (
              <CertifiedTranslationComposer
                isRtl={isRtl}
                currentRole={currentRole}
                currentUser={sessionUser!}
              />
            )}
            {activeTab === 'feedback' && (
              <FeedbackPage
                isRtl={isRtl}
                currentUser={sessionUser!}
              />
            )}
            {activeTab === 'document_studio' && (
              <DocumentStudio
                isRtl={isRtl}
                currentUser={sessionUser!}
              />
            )}
          </div>
        </main>
      </div>

      {/* QUICK WORKSPACE POPUPS CONTROL */}
      {isQuickIntakeOpen && activeTab !== 'tasks' && (
        <TasksPage 
          isRtl={isRtl} 
          currentRole={currentRole}
          isQuickIntakeOpen={isQuickIntakeOpen}
          onCloseQuickIntake={() => setIsQuickIntakeOpen(false)}
        />
      )}
    </div>
  );
}
