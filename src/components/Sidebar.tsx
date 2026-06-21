/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Briefcase, FileText, Users, DollarSign, Calendar, Settings, 
  ChevronDown, ChevronRight, Menu, X, BookOpen, AlertCircle, TrendingUp
} from 'lucide-react';
import { UserRole } from '../types';
import { GlobalizeLogo } from './GlobalizeLogo';

interface SidebarProps {
  currentRole: UserRole;
  currentTab: string;
  onChangeTab: (tab: string) => void;
  isRtl: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  currentTab,
  onChangeTab,
  isRtl
}) => {
  const [isAccountingOpen, setIsAccountingOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const mainNavs = [
    { id: 'dashboard', labelEn: 'Dashboard', labelAr: 'لوحة التحكم', icon: TrendingUp, roles: ['owner', 'sales', 'accountant', 'translator', 'admin'] },
    { id: 'tasks', labelEn: 'Tasks & Folders', labelAr: 'الملفات والمهام', icon: Briefcase, roles: ['owner', 'sales', 'accountant', 'translator', 'admin'] },
    { id: 'quotations', labelEn: 'Quotations', labelAr: 'عروض الأسعار', icon: FileText, roles: ['owner', 'sales', 'admin'] },
    { id: 'clients', labelEn: 'Clients CRM', labelAr: 'قاعدة العملاء', icon: Users, roles: ['owner', 'sales', 'admin'] },
  ];

  const accountingNavs = [
    { id: 'acc-revenues', labelEn: 'Revenues', labelAr: 'دفتر الإيرادات', icon: DollarSign },
    { id: 'acc-costs', labelEn: 'Task Costs', labelAr: 'تكلفة الملفات', icon: BookOpen },
    { id: 'acc-cashbook', labelEn: 'Cash Book (Khazina)', labelAr: 'دفتر الخزينة', icon: Briefcase },
    { id: 'acc-receivables', labelEn: 'Receivables CRM', labelAr: 'مديونيات العملاء', icon: AlertCircle },
    { id: 'acc-liabilities', labelEn: 'Staff Liabilities', labelAr: 'مديونيات للمكتب', icon: Settings },
    { id: 'acc-closings', labelEn: 'Monthly Closings', labelAr: 'الإغلاق الشهري', icon: Calendar },
  ];

  const adminNavs = [
    { id: 'translators', labelEn: 'Translators Log', labelAr: 'سجلات المترجمين', icon: Users, roles: ['owner', 'admin', 'accountant'] },
    { id: 'attendance', labelEn: 'Payroll Attendance', labelAr: 'حضور ومرتبات', icon: Calendar, roles: ['owner', 'admin', 'accountant'] },
    { id: 'settings', labelEn: 'System Settings', labelAr: 'إعدادات النظام', icon: Settings, roles: ['owner', 'admin'] },
  ];

  const hasAccess = (roles?: string[]) => {
    return !roles || roles.includes(currentRole);
  };

  const navItemClass = (id: string) => `
    flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
    ${currentTab === id 
      ? 'bg-slate-800 text-amber-400' 
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
  `;

  return (
    <>
      <div className="md:hidden fixed top-4 z-50 left-4">
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white shadow-lg focus:outline-none"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 z-40 flex flex-col w-64 bg-slate-950 text-white border-r border-slate-800 transition-transform duration-300 md:translate-x-0
        ${isMobileOpen 
          ? 'translate-x-0' 
          : 'translate-x-[-100%] md:translate-x-0'}
        ${isRtl ? 'right-0 border-l border-r-0' : 'left-0 border-r'}
      `}>
        {/* Profile Card Header */}
        <div className="p-6 border-b border-slate-900 bg-slate-950 flex justify-center">
          <GlobalizeLogo size={36} isRtl={isRtl} />
        </div>

        {/* Navigation Menus */}
        <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
          {/* Main workflows */}
          <div className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {isRtl ? 'المهام والـ CRM' : 'Workflows & CRM'}
            </div>
            {mainNavs.filter(nav => hasAccess(nav.roles)).map(nav => (
              <div 
                key={nav.id} 
                onClick={() => { onChangeTab(nav.id); setIsMobileOpen(false); }}
                className={navItemClass(nav.id)}
              >
                <nav.icon size={18} className="shrink-0" />
                <span>{isRtl ? nav.labelAr : nav.labelEn}</span>
              </div>
            ))}
          </div>

          {/* Collapsible Accounting section */}
          {hasAccess(['owner', 'accountant']) && (
            <div className="space-y-1">
              <div 
                onClick={() => setIsAccountingOpen(!isAccountingOpen)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300"
              >
                <span>{isRtl ? 'القسم المالي' : 'Accounting Ledger'}</span>
                {isAccountingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              
              {isAccountingOpen && (
                <div className="pl-3 pr-1 space-y-1 border-l border-slate-900 ml-3">
                  {accountingNavs.map(nav => (
                    <div 
                      key={nav.id} 
                      onClick={() => { onChangeTab(nav.id); setIsMobileOpen(false); }}
                      className={navItemClass(nav.id)}
                    >
                      <nav.icon size={16} className="shrink-0" />
                      <span className="text-xs">{isRtl ? nav.labelAr : nav.labelEn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin, settings & Attendance Portal */}
          <div className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {isRtl ? 'الإدارة والتقارير' : 'Roster & Controls'}
            </div>
            {adminNavs.filter(nav => hasAccess(nav.roles)).map(nav => (
              <div 
                key={nav.id} 
                onClick={() => { onChangeTab(nav.id); setIsMobileOpen(false); }}
                className={navItemClass(nav.id)}
              >
                <nav.icon size={18} className="shrink-0" />
                <span>{isRtl ? nav.labelAr : nav.labelEn}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Role Banner */}
        <div className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col gap-1 items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-slate-400 capitalize">{currentRole} portal active</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">UTC: 2026-06-09</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
