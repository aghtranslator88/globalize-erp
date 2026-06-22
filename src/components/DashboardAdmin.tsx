/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Users, AlertCircle, Search, Filter, Activity, 
  ChevronDown, ChevronUp, CheckCircle2, BookOpen, Clock, FileText, CheckCircle
} from 'lucide-react';
import { Task, TaskAssignment, Profile } from '../types';
import dbInstance from '../db/store';

interface DashboardAdminProps {
  isRtl: boolean;
  onNavigateTab: (tab: string) => void;
}

export const DashboardAdmin: React.FC<DashboardAdminProps> = ({ isRtl, onNavigateTab }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Search filter states
  const [searchTranslator, setSearchTranslator] = useState('');
  const [taskStatusOpFilter, setTaskStatusOpFilter] = useState<string>('all');
  const [expandedTranslatorId, setExpandedTranslatorId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(dbInstance.tasks);
    setAssignments(dbInstance.assignments);
    setProfiles(dbInstance.profiles);

    const sub = dbInstance.subscribe(() => {
      setTasks([...dbInstance.tasks]);
      setAssignments([...dbInstance.assignments]);
      setProfiles([...dbInstance.profiles]);
    });
    return sub;
  }, []);

  // Compute status metrics for workflow tracking
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;

  // Compute translators' workloads and completed metrics over the last 30 days
  const translatorsPerformance = profiles
    .filter(p => p.role === 'translator' || p.role === 'admin' || p.role === 'owner')
    .map(p => {
      const translatorAsgs = assignments.filter(a => a.translatorId === p.id);
      
      // Completed metrics (either approved or completed successfully)
      const completedAsgs = translatorAsgs.filter(a => a.status === 'approved');
      const completedCount = completedAsgs.length;
      const completedWords = completedAsgs.reduce((sum, a) => sum + (a.wordCountActual || a.wordCountAssigned || 0), 0);

      // Active assignments
      const activeAsgs = translatorAsgs.filter(a => a.status !== 'approved');
      const activeCount = activeAsgs.length;
      const activeWords = activeAsgs.reduce((sum, a) => sum + (a.wordCountAssigned || 0), 0);

      return {
        profile: p,
        completedCount,
        completedWords,
        activeCount,
        activeWords,
        allAsgs: translatorAsgs
      };
    })
    .filter(tp => tp.profile.role === 'translator' || tp.allAsgs.length > 0);

  const maxCompletedCount = Math.max(...translatorsPerformance.map(t => t.completedCount), 1);

  // Filters
  const filteredTranslatorsPerformance = translatorsPerformance.filter(tp => {
    const term = searchTranslator.trim().toLowerCase();
    if (!term) return true;
    return tp.profile.fullName.toLowerCase().includes(term) || 
           (tp.profile.fullNameAr && tp.profile.fullNameAr.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Welcome banner custom for Administrator role (Nada) */}
      <div className="p-8 bg-zinc-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-zinc-800 shadow-xl leading-tight relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-700/10 blur-3xl -mr-16 -mt-16 rounded-full" />
        <div className="relative z-10 text-left">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
            {isRtl ? 'لوحة تحكم المسؤول عن النظام والعمليات مخصصة للعمل الصامت والآمن' : 'Operations and Logistics Control environment'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white capitalize">
            {isRtl 
              ? `أهلاً بك ${dbInstance.activeProfile?.fullNameAr || ''} (المدير المسؤول) • مكتب الترجمة المعتمد` 
              : `Welcome back, ${dbInstance.activeProfile?.fullName || 'Admin'} (Admin Manager)`}
          </h1>
          <p className="text-xs text-zinc-400 mt-2 max-w-xl leading-relaxed">
            {isRtl 
              ? 'تتيح لك هذه الواجهة مراقبة إنتاجية المترجمين، وإسناد المهام المعلقة، ومتابعة حالات المراجعة الفنية وتدقيق الملفات لضمان جودة الأداء.'
              : 'Monitor active translator assignments, manage pending files, and supervise technical review streams to maintain top quality output standard.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 relative z-10">
          <button 
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="px-4 py-2 bg-white text-zinc-900 rounded-lg text-xs font-bold hover:bg-zinc-100 transition-all border shadow-sm"
          >
            {isRtl ? 'إدارة المهام والملفات' : 'Manage Tasks'}
          </button>
        </div>
      </div>

      {/* WORKFLOW QUEUE SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pending Card */}
        <div className="bg-white p-5 rounded-xl border border-zinc-150 flex items-start gap-4">
          <div className="p-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg shrink-0">
            <Clock size={18} />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
              {isRtl ? 'ملفات معلقة (انتظار)' : 'Pending Tasks'}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2 font-mono">
              {pendingCount}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-1">{isRtl ? 'بانتظار الإسناد للمترجم' : 'Awaiting Translator Assignment'}</p>
          </div>
        </div>

        {/* Translation Active Card */}
        <div className="bg-white p-5 rounded-xl border border-zinc-150 flex items-start gap-4">
          <div className="p-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg shrink-0">
            <Briefcase size={18} />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
              {isRtl ? 'قيد الترجمة والعمل' : 'In Progress'}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2 font-mono">
              {inProgressCount}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-1">{isRtl ? 'يجري العمل عليها وتحديثاتها' : 'Currently with Linguists'}</p>
          </div>
        </div>

        {/* Technical Revision Card */}
        <div className="bg-white p-5 rounded-xl border border-zinc-150 flex items-start gap-4">
          <div className="p-2.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg shrink-0">
            <Activity size={18} />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
              {isRtl ? 'قيد التدقيق والمراجعة' : 'Under Review'}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2 font-mono">
              {reviewCount}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-1">{isRtl ? 'بانتظار التدقيق والاعتماد' : 'Waiting Admin Verification'}</p>
          </div>
        </div>

        {/* Delivered / Completed Card */}
        <div className="bg-white p-5 rounded-xl border border-zinc-150 flex items-start gap-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest leading-none">
              {isRtl ? 'ملفات مكتملة ومسلمة' : 'Completed Files'}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2 font-mono">
              {completedCount}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-1">{isRtl ? 'تم تسليمها بنجاح للعملاء' : 'Successfully Delivered to Clients'}</p>
          </div>
        </div>

      </div>

      {/* TRANSLATOR EFFICIENCY CHART WORKLOADS */}
      <div className="bg-white p-6 rounded-xl border border-zinc-150">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-zinc-150 gap-2">
          <div className="text-left">
            <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-1.5">
              <Activity size={16} className="text-zinc-500" />
              {isRtl ? 'إنتاجية المترجمين الفعلية (الملفات المعتمدة)' : 'Translator Performance Indices (Completed Assignments)'}
            </h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {isRtl ? 'مؤشر نسبي لمعدل تقدم المترجمين بناءً على كميات الكلمات والملفات المنجزة.' : 'Relative calculation based on task count and actual words verified.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {translatorsPerformance.map((tp) => {
            const percentage = (tp.completedCount / maxCompletedCount) * 100;
            return (
              <div key={tp.profile.id} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50/20 hover:bg-zinc-50/60 transition-colors flex flex-col justify-between text-left">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[8px] uppercase font-black text-zinc-400 tracking-wider">
                      {tp.profile.employeeType === 'staff' ? (isRtl ? 'موظف دائم' : 'Staff') : (isRtl ? 'فريلانس مستشار' : 'Freelance')}
                    </span>
                    <h5 className="font-bold text-zinc-900 text-xs mt-1">
                      {isRtl ? tp.profile.fullNameAr : tp.profile.fullName}
                    </h5>
                  </div>
                  <span className="font-mono text-sm font-bold text-zinc-805 bg-zinc-100 border px-2 py-0.5 rounded shrink-0">
                    {tp.completedCount} {isRtl ? 'ملف' : 'tasks'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[8px] text-zinc-450 mb-1 font-mono">
                    <span>{isRtl ? 'مستوى الفاعلية' : 'Efficiency level'}</span>
                    <span>{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-zinc-800 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(6, percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-zinc-400 mt-3 pt-2.5 border-t border-zinc-100 font-mono">
                  <div>
                    <span>{isRtl ? 'مجموع الكلمات:' : 'Words Done:'}</span>
                    <p className="font-bold text-zinc-700 text-[10px] font-sans">{tp.completedWords.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span>{isRtl ? 'المهام المعلقة:' : 'Ongoing workload:'}</span>
                    <p className="font-bold text-zinc-650 text-[10px] font-sans">{tp.activeCount} ({tp.activeWords.toLocaleString()} w)</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED WORKLOAD EXPANDABLE LOGS SHEET */}
      <div className="bg-white rounded-xl border border-zinc-150 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-zinc-100 gap-4">
          <div className="text-left">
            <h3 className="text-zinc-900 font-semibold text-sm">
              {isRtl ? 'سجلات المترجمين ومهام العمل المعينة' : 'Linguist Assignment Log & Supervisor Journal'}
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {isRtl ? 'انقر فوق أي مترجم لعرض تفاصيل مهام الترجمة الفعالة والكلمات والملفات المترجمة.' : 'Review ongoing tasks assigned to each linguist. Expand details block by clicking on translator records.'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
              <input 
                type="text"
                value={searchTranslator}
                onChange={e => setSearchTranslator(e.target.value)}
                placeholder={isRtl ? 'بحث باسم المترجم...' : 'Filter translators...'}
                className="pl-8 pr-3 py-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg w-full md:w-48 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredTranslatorsPerformance.length === 0 ? (
            <p className="text-xs text-zinc-400 italic text-center p-6 bg-zinc-50/50 rounded-lg">
              {isRtl ? 'لا يوجد مترجمون لمطابقة هذا البحث.' : 'No active translators matched your query.'}
            </p>
          ) : (
            filteredTranslatorsPerformance.map(tp => {
              const isExpanded = expandedTranslatorId === tp.profile.id;
              return (
                <div key={tp.profile.id} className="border border-zinc-150 rounded-xl overflow-hidden bg-white hover:border-zinc-300 transition-all text-left">
                  
                  {/* Performance head bar */}
                  <div 
                    onClick={() => setExpandedTranslatorId(isExpanded ? null : tp.profile.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-zinc-50/30 hover:bg-zinc-50/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-extrabold text-zinc-700 text-xs shadow-sm capitalize shrink-0">
                        {tp.profile.fullName.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-zinc-900 text-sm">
                            {isRtl ? tp.profile.fullNameAr || tp.profile.fullName : tp.profile.fullName}
                          </h4>
                          <span className="px-2 py-0.5 text-[8px] font-bold rounded uppercase bg-zinc-100 border text-zinc-600">
                            {tp.profile.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium mt-1 leading-none">
                          {isRtl ? tp.profile.email : tp.profile.email} • {tp.profile.phone || 'No Phone'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500">
                      <div className="text-right">
                        <span className="text-[9px] text-zinc-450 uppercase block font-medium">{isRtl ? 'نشط / مكتمل' : 'Active / Finished'}</span>
                        <p className="font-bold text-zinc-900 font-mono mt-0.5">
                          {tp.activeCount} active • <span className="text-emerald-700">{tp.completedCount} done</span>
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded block listing tasks assignments without financials! */}
                  {isExpanded && (
                    <div className="border-t border-zinc-150 bg-zinc-50/15 p-4 sm:p-5">
                      <h5 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3">
                        {isRtl ? 'تفاصيل المهام المعينة للغوي حالياً ومسار مراجعتها' : 'Supervised Translation Assignment Registry'}
                      </h5>
                      {tp.allAsgs.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-4">
                          {isRtl ? 'لم يتم إسناد أي مهام ترجمة لهذا الحساب بعد.' : 'No translation or legal review subtasks have been mapped to this user.'}
                        </p>
                      ) : (
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-xs text-left text-zinc-650 font-sans">
                            <thead className="text-[8px] text-zinc-400 bg-zinc-50 uppercase tracking-wider border-b border-zinc-100">
                              <tr>
                                <th className="px-3 py-2 font-semibold">Assignment Id</th>
                                <th className="px-3 py-2 font-semibold">Task Reference</th>
                                <th className="px-3 py-2 font-semibold">Document File</th>
                                <th className="px-3 py-2 font-semibold">Words Count</th>
                                <th className="px-3 py-2 font-semibold">Workload Status</th>
                                <th className="px-3 py-2 font-semibold">Assigned On</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 bg-white">
                              {tp.allAsgs.map((asg) => (
                                <tr key={asg.id} className="hover:bg-zinc-50/50 transition-colors">
                                  <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-zinc-800">{asg.id}</td>
                                  <td className="px-3 py-2.5 font-semibold text-zinc-900">
                                    {asg.taskRef || 'Task'}
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-zinc-650 truncate max-w-[180px]" title={asg.taskFileName}>
                                    {asg.taskFileName || 'Untitled Document'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono font-bold text-zinc-700">
                                    {(asg.wordCountActual || asg.wordCountAssigned || 0).toLocaleString()} w
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                      asg.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                      asg.status === 'submitted' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                                      asg.status === 'in_progress' ? 'bg-blue-100 text-blue-850' : 'bg-zinc-100 text-zinc-600'
                                    }`}>
                                      {asg.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-zinc-400 text-[10px] font-mono">
                                    {asg.assignedAt ? new Date(asg.assignedAt).toLocaleDateString() : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default DashboardAdmin;
