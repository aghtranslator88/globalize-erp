/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Star, Send, ClipboardCheck, Layout, Users, FileText, 
  Settings, ShieldCheck, PieChart, MessageSquare, PlusCircle, 
  MinusCircle, Edit3, Trash2, History, CheckCircle2, ChevronRight, ChevronLeft
} from 'lucide-react';
import dbInstance from '../db/store';
import { FeedbackEntry, ModuleFeedback, UserRole, Profile } from '../types';
import { ExportProtectionModal } from './ExportProtectionModal';

interface FeedbackPageProps {
  isRtl: boolean;
  currentUser: Profile;
}

const INITIAL_MODULE_FEEDBACK: ModuleFeedback = {
  rating: 5,
  suggestions: { add: '', remove: '', modify: '' },
  comments: ''
};

export default function FeedbackPage({ isRtl, currentUser }: FeedbackPageProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'admin'>('form');
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isExportShieldOpen, setIsExportShieldOpen] = useState(false);

  const exportToExcel = () => {
    const data = dbInstance.feedback.map(fb => {
      const flattened: any = {
        'Timestamp': new Date(fb.timestamp).toLocaleString(),
        'User': fb.userName,
        'Role': fb.userRole,
        'Overall Rating': fb.overallRating,
        'General Comment': fb.generalComment,
        'New Features': fb.newFeatureSuggestions,
        'Technical Issues': fb.technicalIssues,
      };

      // Add flattened module feedback
      Object.entries(fb.modules).forEach(([key, mod]) => {
        const m = mod as ModuleFeedback;
        flattened[`${key} - Rating`] = m.rating;
        flattened[`${key} - Additions`] = m.suggestions.add;
        flattened[`${key} - Removals`] = m.suggestions.remove;
        flattened[`${key} - Modifications`] = m.suggestions.modify;
        flattened[`${key} - Comments`] = m.comments;
      });

      return flattened;
    });

    const headers = Array.from(new Set(data.flatMap(row => Object.keys(row))));
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const clean = String(row[header] ?? '').replace(/"/g, '""');
        return clean.includes(',') || clean.includes('\n') || clean.includes('"') ? `"${clean}"` : clean;
      }).join(','))
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GTMS_Feedback_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Form State
  const [overallRating, setOverallRating] = useState(5);
  const [generalComment, setGeneralComment] = useState('');
  const [modules, setModules] = useState<FeedbackEntry['modules']>({
    dashboard: { ...INITIAL_MODULE_FEEDBACK },
    tasks: { ...INITIAL_MODULE_FEEDBACK },
    certifiedComposer: { ...INITIAL_MODULE_FEEDBACK },
    finance: { ...INITIAL_MODULE_FEEDBACK },
    hrAttendance: { ...INITIAL_MODULE_FEEDBACK },
    accounts: { ...INITIAL_MODULE_FEEDBACK }
  });
  const [technicalIssues, setTechnicalIssues] = useState('');
  const [newFeatureSuggestions, setNewFeatureSuggestions] = useState('');

  const handleModuleChange = (module: keyof FeedbackEntry['modules'], field: keyof ModuleFeedback | 'add' | 'remove' | 'modify', value: any) => {
    setModules(prev => {
      const newModules = { ...prev };
      if (field === 'add' || field === 'remove' || field === 'modify') {
        newModules[module].suggestions[field] = value;
      } else {
        (newModules[module] as any)[field] = value;
      }
      return newModules;
    });
  };

  const handleSubmit = () => {
    dbInstance.addFeedback({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      overallRating,
      generalComment,
      modules,
      technicalIssues,
      newFeatureSuggestions
    });
    setSubmitted(true);
  };

  const totalSteps = 8;

  const renderRating = (val: number, setVal: (v: number) => void) => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => setVal(star)}
          className={`p-2 rounded-lg transition-all ${val >= star ? 'text-yellow-400 bg-yellow-50' : 'text-zinc-200 hover:text-zinc-300'}`}
        >
          <Star size={24} fill={val >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );

  const renderModuleSection = (moduleKey: keyof FeedbackEntry['modules'], title: string, titleAr: string, icon: React.ReactNode) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-900">{isRtl ? titleAr : title}</h3>
          <p className="text-xs text-zinc-500">{isRtl ? 'قيم التجربة واقترح تعديلات' : 'Rate your experience and suggest changes'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'التقييم العام للقسم' : 'Module Rating'}</label>
          {renderRating(modules[moduleKey].rating, (v) => handleModuleChange(moduleKey, 'rating', v))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1.5">
              <PlusCircle size={12} /> {isRtl ? 'إضافات مقترحة' : 'Suggested Additions'}
            </label>
            <textarea
              className="w-full p-3 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none h-24 resize-none"
              placeholder={isRtl ? 'مثلاً: زر جديد، تقرير إضافي...' : 'e.g. New button, extra report...'}
              value={modules[moduleKey].suggestions.add}
              onChange={e => handleModuleChange(moduleKey, 'add', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1.5">
              <MinusCircle size={12} /> {isRtl ? 'عناصر للحذف' : 'Elements to Remove'}
            </label>
            <textarea
              className="w-full p-3 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none h-24 resize-none"
              placeholder={isRtl ? 'عناصر غير ضرورية أو تسبب تشتت...' : 'Unnecessary or distracting items...'}
              value={modules[moduleKey].suggestions.remove}
              onChange={e => handleModuleChange(moduleKey, 'remove', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1.5">
              <Edit3 size={12} /> {isRtl ? 'تعديلات مقترحة' : 'Suggested Modifications'}
            </label>
            <textarea
              className="w-full p-3 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none h-24 resize-none"
              placeholder={isRtl ? 'تعديل مكان، لون، أو وظيفة قائمة...' : 'Modify position, color, or existing function...'}
              value={modules[moduleKey].suggestions.modify}
              onChange={e => handleModuleChange(moduleKey, 'modify', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'ملاحظات إضافية' : 'General Comments'}</label>
          <textarea
            className="w-full p-3 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none h-20"
            placeholder={isRtl ? 'أي انطباع آخر عن هذا القسم...' : 'Any other thoughts on this module...'}
            value={modules[moduleKey].comments}
            onChange={e => handleModuleChange(moduleKey, 'comments', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <MessageSquare size={120} />
        </div>
        <div className="space-y-2 relative">
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            {isRtl ? 'استبيان تقييم النظام وتطويره' : 'GTMS Feedback & Enhancement Form'}
          </h2>
          <p className="text-zinc-500 font-medium">
            {isRtl ? 'رأيك يهمنا لبناء نظام ترجمة متكامل يلبي احتياجاتك' : 'Your input is critical to building a perfect translation workspace.'}
          </p>
        </div>
        {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
           <div className="flex bg-zinc-100 p-1 rounded-xl">
             <button 
               onClick={() => setActiveTab('form')}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'form' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
             >
               {isRtl ? 'الاستبيان' : 'Form'}
             </button>
             <button 
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'admin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
             >
                {isRtl ? 'لوحة المراجعة' : 'Results Panel'}
             </button>
           </div>
        )}
      </div>

      {activeTab === 'form' ? (
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
          {submitted ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900">{isRtl ? 'شكراً لمساهمتك!' : 'Thank You!'}</h3>
              <p className="text-zinc-500 max-w-sm">
                {isRtl ? 'تم استقبال ملاحظاتك بنجاح وسنقوم بمراجعتها وتدقيقها في التحديث القادم.' : 'We have received your feedback. It will be reviewed as part of our next update cycle.'}
              </p>
              <button 
                onClick={() => { setSubmitted(false); setStep(1); }}
                className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold mt-4"
              >
                {isRtl ? 'إرسال رد آخر' : 'Send Another Response'}
              </button>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-zinc-100">
                <div 
                  className="h-full bg-zinc-900 transition-all duration-500 ease-out" 
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>

              <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                {step === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-zinc-900">{isRtl ? 'انطباع عام' : 'General Impression'}</h3>
                      <p className="text-zinc-500">{isRtl ? 'كيف ترى تجربة استخدام النظام بشكل عام حتى الآن؟' : 'How is your overall experience with the system so far?'}</p>
                      <div className="pt-4">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'التقييم العام' : 'Overall Rating'}</label>
                        <div className="mt-2">
                          {renderRating(overallRating, setOverallRating)}
                        </div>
                      </div>
                      <div className="space-y-2 pt-4">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'تعليق عام' : 'General Comment'}</label>
                        <textarea
                          className="w-full p-4 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none h-40"
                          placeholder={isRtl ? 'اكتب انطباعك الأول هنا...' : 'Write your initial impression here...'}
                          value={generalComment}
                          onChange={e => setGeneralComment(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && renderModuleSection('dashboard', 'Analytics Dashboard', 'رئيسية التحليلات والنتائج', <PieChart size={24} />)}
                {step === 3 && renderModuleSection('tasks', 'File & Task Management', 'إدارة الملفات والمهام', <FileText size={24} />)}
                {step === 4 && renderModuleSection('certifiedComposer', 'Certified PDF Composer', 'محرر الترجمة المعتمدة', <ShieldCheck size={24} />)}
                {step === 5 && renderModuleSection('finance', 'Accounting & Invoicing', 'الحسابات والفواتير', <ClipboardCheck size={24} />)}
                {step === 6 && renderModuleSection('hrAttendance', 'HR & Attendance', 'الموارد البشرية والحضور', <Users size={24} />)}
                {step === 7 && renderModuleSection('accounts', 'Accounts & Permissions', 'إدارة الحسابات والصلاحيات', <Settings size={24} />)}

                {step === 8 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-2xl font-bold text-zinc-900">{isRtl ? 'ملاحظات نهائية واقتراحات' : 'Final Notes & Suggestions'}</h3>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'اقتراح ميزات جديدة كلياً' : 'New Feature Suggestions'}</label>
                        <textarea
                          className="w-full p-4 text-sm bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none h-32"
                          placeholder={isRtl ? 'ما الذي تفتقده في هذا النظام؟' : 'What is missing in this system?'}
                          value={newFeatureSuggestions}
                          onChange={e => setNewFeatureSuggestions(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'مشاكل تقنية أو أخطاء برمجية' : 'Technical Issues or Bugs'}</label>
                        <textarea
                          className="w-full p-4 text-sm bg-red-50/30 border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-400 outline-none h-32"
                          placeholder={isRtl ? 'هل واجهت أي بطء أو أخطاء أثناء الاستخدام؟' : 'Did you encounter any slowness or errors?'}
                          value={technicalIssues}
                          onChange={e => setTechnicalIssues(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(s => Math.max(1, s - 1))}
                  disabled={step === 1}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${step === 1 ? 'text-zinc-300 pointer-events-none' : 'text-zinc-600 hover:bg-white border border-zinc-200 hover:shadow-sm'}`}
                >
                  <ChevronLeft size={16} /> {isRtl ? 'السابق' : 'Previous'}
                </button>

                <div className="hidden md:flex gap-1">
                   {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                     <div key={i} className={`w-2 h-2 rounded-full ${step === i ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
                   ))}
                </div>

                {step === totalSteps ? (
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-8 py-2 bg-zinc-950 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                  >
                    {isRtl ? 'إرسال التقييم' : 'Submit Feedback'} <Send size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
                    className="flex items-center gap-2 px-8 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg"
                  >
                    {isRtl ? 'التالي' : 'Next'} <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-700">
           {/* Admin Results Header */}
           <div className="flex items-center justify-between border-b border-zinc-100 pb-6">
             <div className="space-y-1">
               <h4 className="text-xl font-bold text-zinc-900">{isRtl ? 'تحليل نتائج استبيان التطوير' : 'Feedback Results Analysis'}</h4>
               <p className="text-xs text-zinc-500 font-medium">Review and analyze system improvement suggestions across all modules.</p>
             </div>
             <div className="flex items-center gap-3">
                <button className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 transition-colors group relative">
                   <History size={18}/>
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">View History</div>
                </button>
                <button 
                  onClick={() => setIsExportShieldOpen(true)}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-100 active:scale-95"
                >
                   <FileText size={16} /> {isRtl ? 'تصدير إلى Excel' : 'Export to Excel'}
                </button>
             </div>
           </div>

           {/* Admin Results Viewer */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {dbInstance.feedback.map(fb => (
               <div key={fb.id} className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-900 border border-zinc-200 uppercase tracking-tighter">
                        {fb.userName.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{fb.userName}</p>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase px-1.5 py-0.5 bg-zinc-50 rounded border border-zinc-100 leading-none">{fb.userRole}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-yellow-400">
                      {[...Array(fb.overallRating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-50 rounded-xl">
                    <p className="text-xs text-zinc-600 line-clamp-3 italic leading-relaxed">
                      "{fb.generalComment}"
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase flex justify-between">
                      <span>Module Ratings</span>
                      <span className="text-zinc-900">Avg: {((Object.values(fb.modules) as ModuleFeedback[]).reduce((s, m) => s + m.rating, 0) / 6).toFixed(1)}</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                       {Object.keys(fb.modules).map(mKey => (
                         <div key={mKey} className="px-2 py-0.5 bg-white border border-zinc-150 rounded-full text-[9px] font-bold text-zinc-500">
                           {mKey}: {fb.modules[mKey as keyof FeedbackEntry['modules']].rating}
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                     <span className="text-[10px] text-zinc-400 font-mono">{new Date(fb.timestamp).toLocaleDateString()}</span>
                     <button className="text-[10px] font-bold text-zinc-900 hover:underline">View Full Analysis</button>
                  </div>
               </div>
             ))}

             {dbInstance.feedback.length === 0 && (
               <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white border border-zinc-200 border-dashed rounded-3xl text-zinc-300">
                 <History size={48} className="opacity-20" />
                 <p className="mt-4 font-bold text-lg">{isRtl ? 'لا توجد ردود بعد' : 'No feedback responses yet'}</p>
                 <p className="text-sm opacity-60">Results will appear here as users submit the form.</p>
               </div>
             )}
           </div>

           {/* Summary Stats Placeholder for Admin */}
           <div className="bg-zinc-900 rounded-3xl p-8 text-white grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px] font-bold uppercase">Average System Rating</span>
                <p className="text-4xl font-black">
                  {dbInstance.feedback.length > 0 ? (dbInstance.feedback.reduce((s, f) => s + f.overallRating, 0) / dbInstance.feedback.length).toFixed(1) : '–'}
                </p>
                <div className="flex text-yellow-400"><Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /></div>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px] font-bold uppercase">Total Responses</span>
                <p className="text-4xl font-black">{dbInstance.feedback.length}</p>
                <p className="text-[10px] text-zinc-500">Across all user roles</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px] font-bold uppercase">Feature Requests</span>
                <p className="text-4xl font-black text-green-400">
                   {dbInstance.feedback.filter(f => f.newFeatureSuggestions.length > 0).length}
                </p>
                <p className="text-[10px] text-zinc-500">Pending review</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px] font-bold uppercase">Reported Bugs</span>
                <p className="text-4xl font-black text-red-500">
                   {dbInstance.feedback.filter(f => f.technicalIssues.length > 0).length}
                </p>
                <p className="text-[10px] text-zinc-500">High priority</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
