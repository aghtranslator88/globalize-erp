/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, Globe, Search, ShieldCheck, ChevronDown, Check, UserPlus } from 'lucide-react';
import { UserRole, Notification } from '../types';
import dbInstance from '../db/store';

interface HeaderProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  isRtl: boolean;
  onToggleRtl: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onChangeRole,
  isRtl,
  onToggleRtl,
  activeTab
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  useEffect(() => {
    setNotifications(dbInstance.notifications);
    const sub = dbInstance.subscribe(() => {
      setNotifications([...dbInstance.notifications]);
    });
    return sub;
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    dbInstance.markAllNotificationsRead();
    setIsNotifOpen(false);
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard': return isRtl ? 'لوحة القيادة والمؤشرات' : 'Dashboard Overview';
      case 'tasks': return isRtl ? 'سجل الملفات التقني والمالي' : 'Registration & Folders';
      case 'quotations': return isRtl ? 'عروض الأسعار والفواتير' : 'Client Quotations';
      case 'clients': return isRtl ? 'إدارة علاقات العملاء' : 'Client Directories';
      case 'acc-revenues': return isRtl ? 'الإيرادات اليومية والشهرية' : 'Revenues Ledger';
      case 'acc-costs': return isRtl ? 'تكلفة الترجمة والمراجعة' : 'Task costing sheet';
      case 'acc-cashbook': return isRtl ? 'دفتر الخزينة والسيولة' : 'Main Cash Book (الخزينة)';
      case 'acc-receivables': return isRtl ? 'مديونيات العملاء الآجلة' : 'Client Receivables Logs';
      case 'acc-liabilities': return isRtl ? 'مستحقات على المكتب' : 'Staff Liabilities & Payouts';
      case 'acc-closings': return isRtl ? 'الإغلاق والحسابات الختامية' : 'Monthly Closings & Dividends';
      case 'translators': return isRtl ? 'سجلات وإنتاجية المترجمين' : 'Translator Word Logs';
      case 'attendance': return isRtl ? 'دفتر حضور وغياب الموظفين' : 'Staff Attendance & Wages';
      case 'settings': return isRtl ? 'التحكم والمستخدمين والنموذج' : 'System Administration';
      default: return dbInstance.brandConfig?.companyName || '';
    }
  };

  const rolesList: { value: UserRole; labelEn: string; labelAr: string; desc: string }[] = [
    { value: 'owner', labelEn: 'Owner', labelAr: 'المالك', desc: 'Full business stats, partner splits, capital allocations.' },
    { value: 'admin', labelEn: 'Admin Manager', labelAr: 'المدير المسؤول', desc: 'Registers tasks, assigns translators, validates filings.' },
    { value: 'sales', labelEn: 'Sales Executive', labelAr: 'مسؤول المبيعات', desc: 'Prepares quotations, intake checks, updates task pipelines.' },
    { value: 'accountant', labelEn: 'Accountant', labelAr: 'المحاسب المالي', desc: 'Controls Cashbook, processes income, reconciles receivables.' },
    { value: 'translator', labelEn: 'Translator', labelAr: 'المترجم اللغوي', desc: 'Views assigned word queue, submits translations.' }
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white shadow-sm font-sans">
      {/* Search / Breadcrumb */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            {getBreadcrumbTitle()}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium font-sans">
            <span className="font-extrabold text-indigo-600">{dbInstance.brandConfig?.companyName || ''}</span>
            <span>/</span>
            <span className="capitalize">{activeTab.replace('acc-', 'accounting / ')}</span>
          </div>
        </div>
      </div>

      {/* Quick Settings & Role Switcher */}
      <div className="flex items-center gap-3">
        {/* RTL Switcher */}
        <button
          onClick={onToggleRtl}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Toggle Arabic / English Layout"
        >
          <Globe size={14} className="text-indigo-600 animate-spin-slow" />
          <span>{isRtl ? 'English layout' : 'العربية (RTL)'}</span>
        </button>

        {/* Roles Swapper Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-800 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/20 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0"
          >
            <ShieldCheck size={14} className="text-amber-600" />
            <span className="hidden sm:inline capitalize font-mono">Role: {currentRole}</span>
            <ChevronDown size={12} className="text-amber-800" />
          </button>

          {isRoleMenuOpen && (
            <div className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-700 font-sans ${isRtl ? 'left-0 right-auto' : 'right-0'}`}>
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {isRtl ? 'تغيير صلاحيات الحساب (محاكاة)' : 'Hot Swap Role Context (Simulator)'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Change roles instantly to preview specific dashboard workflows.
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {rolesList.map(item => (
                  <button
                    key={item.value}
                    onClick={() => {
                      onChangeRole(item.value);
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors text-xs cursor-pointer border-b border-slate-50 last:border-0 ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {currentRole === item.value ? (
                        <div className="p-1 bg-green-500 text-white rounded">
                          <Check size={10} />
                        </div>
                      ) : (
                        <div className="p-1 bg-slate-100 text-slate-400 rounded">
                          <UserPlus size={10} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{isRtl ? item.labelAr : item.labelEn}</p>
                      <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 relative cursor-pointer active:scale-95 transition-transform"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            )}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white text-[8px] flex items-center justify-center font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-700 font-sans ${isRtl ? 'left-0 right-auto' : 'right-0'}`}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-bold text-slate-800">
                  {isRtl ? 'مركز التنبيهات الفورية' : 'Live Notifications'}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {isRtl ? 'تحديد الكل كمقروء' : 'Mark all read'}
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-slate-400">
                    No active notifications available.
                  </div>
                ) : (
                  notifications.map((notif, index) => (
                    <div
                      key={notif.id || index}
                      className={`px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-2.5 items-start last:border-b-0 ${
                        !notif.isRead ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-1">
                        <span className={`w-2 h-2 rounded-full block ${
                          notif.type === 'success' ? 'bg-green-500' :
                          notif.type === 'danger' ? 'bg-red-500' :
                          notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {isRtl ? notif.titleAr || notif.title : notif.title}
                        </p>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                          {isRtl ? notif.messageAr || notif.message : notif.message}
                        </p>
                        <span className="text-[8px] text-slate-400 font-mono block mt-1.5">
                          {new Date(notif.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current Active User Profile Snapshot */}
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-inner">
            {dbInstance.activeProfile.fullName.charAt(0)}
          </div>
          <div className="text-left font-sans">
            <h4 className="text-xs font-bold text-slate-800 leading-none">
              {isRtl ? dbInstance.activeProfile.fullNameAr : dbInstance.activeProfile.fullName}
            </h4>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold block mt-1">
              {dbInstance.activeProfile.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
