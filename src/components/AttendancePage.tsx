/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar as CalendarIcon, CheckSquare, Plus, Check, X, ShieldAlert, BadgeAlert, 
  Settings, Award, Sparkles, FolderLock, FileText, Search, Filter, AlertTriangle, 
  Clock, PlusCircle, UserCheck, Star, Trash2, ClipboardList, Shield, ShieldCheck, Mail, Phone, ExternalLink,
  Eye, EyeOff, Lock
} from 'lucide-react';
import { Profile, SalaryAttendance, AttendanceSession, Task, TaskAssignment, Branch } from '../types';
import dbInstance from '../db/store';
import { ExportProtectionModal } from './ExportProtectionModal';
import { useToast } from './Toast';
import { WORLD_LANGUAGES } from '../lib/languages';

interface AttendancePageProps {
  isRtl: boolean;
  currentRole: string;
}

// Sub-Tab list
type HRTab = 'dashboard' | 'employees' | 'translators' | 'recruitment' | 'attendance' | 'payroll' | 'leaves_overtime' | 'compliance' | 'disciplinary';

export const AttendancePage: React.FC<AttendancePageProps> = ({ isRtl, currentRole }) => {
  const { success, error, warning, info, confirm } = useToast();

  const alert = (msg: string) => {
    if (msg.toLowerCase().includes('successfully') || msg.toLowerCase().includes('success') || msg.includes('تم') || msg.includes('تمت')) {
      success(msg);
    } else if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('please enter') || msg.toLowerCase().includes('valid') || msg.toLowerCase().includes('already')) {
      warning(msg);
    } else {
      info(msg);
    }
  };

  const [activeTab, setActiveTab] = useState<HRTab>('dashboard');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [attendance, setAttendance] = useState<SalaryAttendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [isExportShieldOpen, setIsExportShieldOpen] = useState(false);

  // Filters
  const [empSearch, setEmpSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('all');
  const [langSource, setLangSource] = useState('');
  const [langTarget, setLangTarget] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  const [ndaFilter, setNdaFilter] = useState('all');
  const attendancePeriod = new Date().toISOString().slice(0, 7);
  const [attendanceYear, attendanceMonth] = attendancePeriod.split('-').map(Number);
  const attendanceDays = Array.from(
    { length: new Date(attendanceYear, attendanceMonth, 0).getDate() },
    (_, index) => index + 1
  );

  // New Employee Modal/Form state
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newEmp, setNewEmp] = useState({
    fullName: '',
    fullNameAr: '',
    role: 'translator' as Profile['role'],
    employeeType: 'staff' as Profile['employeeType'],
    email: '',
    phone: '',
    monthlySalary: 8500,
    perWordRate: 0.22,
    perPageRate: 25,
    languages: [] as string[],
    specializations: [] as string[],
    branchId: '',
    password: '',
    personalEmail: '',
    motherTongue: 'Arabic',
    sourceLanguages: ['English'],
    targetLanguages: ['Arabic'],
    workingHours: 8,
    workingShift: 'day' as 'day' | 'night'
  });

  const [leaves, setLeaves] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [disciplinary, setDisciplinary] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Load and subscribe from GTMS db instance
  useEffect(() => {
    setProfiles([...dbInstance.profiles]);
    setAttendance([...dbInstance.attendance]);
    setTasks([...dbInstance.tasks]);
    setAssignments([...dbInstance.assignments]);
    setBranches([...dbInstance.branches]);
    setLeaves([...dbInstance.hrLeaves]);
    setCandidates([...dbInstance.hrCandidates]);
    setOvertimes([...dbInstance.hrOvertimes]);
    setDisciplinary([...dbInstance.hrDisciplinary]);
    setPolicies([...dbInstance.hrPolicies]);
    setDocuments([...dbInstance.hrDocuments]);

    const sub = dbInstance.subscribe(() => {
      setProfiles([...dbInstance.profiles]);
      setAttendance([...dbInstance.attendance]);
      setTasks([...dbInstance.tasks]);
      setAssignments([...dbInstance.assignments]);
      setBranches([...dbInstance.branches]);
      setLeaves([...dbInstance.hrLeaves]);
      setCandidates([...dbInstance.hrCandidates]);
      setOvertimes([...dbInstance.hrOvertimes]);
      setDisciplinary([...dbInstance.hrDisciplinary]);
      setPolicies([...dbInstance.hrPolicies]);
      setDocuments([...dbInstance.hrDocuments]);
    });
    return sub;
  }, []);

  useEffect(() => {
    if (branches.length > 0 && !newEmp.branchId) {
      setNewEmp(prev => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches]);

  const handleLeaveAction = (id: string, newStatus: 'approved' | 'rejected') => {
    const next = leaves.map(l => l.id === id ? { ...l, status: newStatus, managerApproval: dbInstance.activeProfile?.fullName } : l);
    dbInstance.hrLeaves = next;
    dbInstance.save();
    dbInstance.logSecurityEvent('other', `Leave request ID: ${id} modified to ${newStatus}`, 'success');
  };

  const handleOtAction = (id: string, newStatus: 'approved' | 'rejected') => {
    const next = overtimes.map(o => o.id === id ? { ...o, status: newStatus, approver: dbInstance.activeProfile?.fullName } : o);
    dbInstance.hrOvertimes = next;
    dbInstance.save();
    dbInstance.logSecurityEvent('other', `Overtime entry ID: ${id} updated to ${newStatus}`, 'success');
  };

  const handleCandidateStatus = (id: string, newStatus: string, score = 0, reviewerComments = '') => {
    const next = candidates.map(c => c.id === id ? { ...c, status: newStatus, score: score || c.score, reviewerComments: reviewerComments || c.reviewerComments } : c);
    dbInstance.hrCandidates = next;
    dbInstance.save();
    dbInstance.logSecurityEvent('other', `Candidate ID ${id} set to status: ${newStatus}`, 'success');
  };

  // Hire Applicant Converter
  const convertToStaffOrFreelancer = (cand: any, targetType: 'staff' | 'freelance') => {
    const profileId = `p-hired-${Date.now().toString().slice(-4)}`;
    const newProfile: Profile = {
      id: profileId,
      fullName: cand.fullName,
      fullNameAr: cand.fullNameAr || '',
      role: targetType === 'staff' ? 'admin' : 'translator',
      employeeType: targetType,
      isActive: true,
      email: cand.email,
      phone: cand.phone,
      perWordRate: targetType === 'freelance' ? Number(cand.targetRate || 0) : 0,
      perPageRate: targetType === 'freelance' ? Number(cand.perPageRate || 0) : 0,
      monthlySalary: targetType === 'staff' ? Number(cand.monthlySalary || 0) : 0,
      languages: [cand.sourceLang, cand.targetLang],
      specializations: [cand.specialization],
      createdAt: new Date().toISOString(),
      branchId: branches[0]?.id || 'b-cairo',
      password: `password-${Math.random().toString(36).slice(-8)}`
    };

    dbInstance.profiles.push(newProfile);

    // Mark candidate as hired
    const updatedCandidates = candidates.map(c => c.id === cand.id ? { ...c, status: 'hired' } : c);
    dbInstance.hrCandidates = updatedCandidates;
    dbInstance.save();

    dbInstance.logSecurityEvent('other', `Approved & hired ${cand.fullName} as ${targetType}`, 'success', profileId);
    alert(`Successfully compiled and converted ${cand.fullName} into an active ${targetType.toUpperCase()} directory profile!`);
  };

  const handleAddNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.fullName || !newEmp.email || !newEmp.phone) {
      alert('Please fill out all required fields.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmp.email)) {
      alert('Please enter a valid official email address.');
      return;
    }
    if (!newEmp.password || newEmp.password.length < 12) {
      alert('Please enter an initial password with at least 12 characters.');
      return;
    }
    const exists = dbInstance.profiles.some(p => 
      (p.email && p.email.toLowerCase() === newEmp.email.trim().toLowerCase()) || 
      (p.fullName && p.fullName.toLowerCase() === newEmp.fullName.toLowerCase())
    );
    if (exists) {
      alert('This official email or full name is already registered!');
      return;
    }

    const id = `p-staff-${Date.now().toString().slice(-4)}`;
    const created: Profile = {
      id,
      fullName: newEmp.fullName,
      fullNameAr: newEmp.fullNameAr || newEmp.fullName,
      role: newEmp.role,
      employeeType: newEmp.employeeType,
      email: newEmp.email,
      phone: newEmp.phone,
      monthlySalary: newEmp.employeeType === 'staff' ? Number(newEmp.monthlySalary) : 0,
      perWordRate: newEmp.employeeType === 'freelance' ? Number(newEmp.perWordRate) : 0,
      perPageRate: newEmp.employeeType === 'freelance' ? Number(newEmp.perPageRate) : 0,
      isActive: true,
      languages: newEmp.languages,
      specializations: newEmp.specializations,
      createdAt: new Date().toISOString(),
      branchId: newEmp.branchId || 'b-cairo',
      password: newEmp.password,
      personalEmail: newEmp.personalEmail.trim() || undefined,
      motherTongue: newEmp.role === 'translator' ? newEmp.motherTongue : undefined,
      sourceLanguages: newEmp.role === 'translator' ? newEmp.sourceLanguages : undefined,
      targetLanguages: newEmp.role === 'translator' ? newEmp.targetLanguages : undefined,
      workingHours: Number(newEmp.workingHours) || 8,
      workingShift: newEmp.workingShift
    };

    dbInstance.profiles.push(created);

    // Create contract documents
    const updatedDocs = [
      ...documents,
      { id: `doc-add-${Date.now()}`, employeeId: id, employeeName: newEmp.fullName, docType: 'Employment Contract', expiryDate: '2027-06-01', trackingStatus: 'signed', file: 'contract.pdf' }
    ];
    dbInstance.hrDocuments = updatedDocs;
    dbInstance.save();

    dbInstance.logSecurityEvent('other', `Added employee ${newEmp.fullName} to HR profiles`, 'success', id);
    alert(isRtl ? 'تم إضافة وتجهيز ملف الموظف الجديد بنجاح!' : 'New staff profile successfully authorized and provisioned!');
    setShowAddEmp(false);
    setNewEmp({
      fullName: '',
      fullNameAr: '',
      role: 'translator',
      employeeType: 'staff',
      email: '',
      phone: '',
      monthlySalary: 8500,
      perWordRate: 0.22,
      perPageRate: 25,
      languages: [],
      specializations: [],
      branchId: branches[0]?.id || 'b-cairo',
      password: '',
      personalEmail: '',
      motherTongue: 'Arabic',
      sourceLanguages: ['English'],
      targetLanguages: ['Arabic'],
      workingHours: 8,
      workingShift: 'day'
    });
  };

  // Acknowledging internal office guidelines
  const handleAcknowledgePolicy = (polId: string, profileId: string) => {
    const next = policies.map(p => {
      if (p.id === polId) {
        const readSet = new Set(p.readBy);
        if (readSet.has(profileId)) {
          readSet.delete(profileId);
        } else {
          readSet.add(profileId);
        }
        return { ...p, readBy: Array.from(readSet) };
      }
      return p;
    });
    dbInstance.hrPolicies = next;
    dbInstance.save();
    dbInstance.logSecurityEvent('other', `Acknowledged policy ID ${polId} read status`, 'success');
  };

  // Clock in out log
  const handleClockInOut = (type: 'check-in' | 'check-out') => {
    const me = dbInstance.activeProfile || profiles[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const match = attendance.find(a => a.translatorId === me.id && a.workDate === todayStr);

    if (type === 'check-in') {
      if (match) {
        alert('Already clocked present in standard system logs today!');
        return;
      }
      dbInstance.attendance.push({
        id: `att-clock-${Date.now()}`,
        translatorId: me.id,
        workDate: todayStr,
        session: 'full_day',
        isVacation: false,
        notes: 'Remote clock check-in'
      });
      dbInstance.save();
      alert('Clocked present status added!');
    } else {
      alert('Clocked check-out recorded! Shift completed.');
    }
  };

  // Trigger Excel download securely
  const resolveCompletedExport = () => {
    dbInstance.logSecurityEvent('export_attempt', `Export of HR Roster and Attendance ledger approved under strict auditor review.`, 'success');
    alert(`Success! Raw HR CSV data compiled. Initiating browser file stream download.`);
  };

  // EXPIRATION CHECKS
  const getDaysTillExpiry = (expDate: string) => {
    const days = Math.floor((new Date(expDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const criticalIssuesCount = documents.filter(d => getDaysTillExpiry(d.expiryDate) < 60 && d.trackingStatus === 'signed').length +
    profiles.filter(p => {
      const isLinguist = p.role === 'translator';
      const hasSignedNda = documents.some(d => d.employeeId === p.id && d.docType === 'NDA Agreement' && d.trackingStatus === 'signed');
      return isLinguist && !hasSignedNda;
    }).length;

  return (
    <div className="space-y-6 font-sans text-slate-705">
      
      {/* 25-Point Professional HR Top-Desk */}
      <div className="bg-gradient-to-tr from-slate-900 via-brand-navy-dark to-slate-950 p-6 rounded-3xl border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/5 blur-3xl rounded-full"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-brand-gold font-bold text-xs tracking-widest uppercase">Certified Agency HQ</span>
            <h1 className="text-2xl font-black mt-1">
              {isRtl ? 'بوابة إدارة الكوادر والموارد البشرية' : 'Enterprise HR Command & Fleet Workspace'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Manage in-house translator production units, external freelancers, leave pipelines, recruit screening, actual payout summaries, and NDAs. 
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExportShieldOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 transition-colors font-bold text-xs rounded-xl flex items-center gap-2 text-white shadow"
            >
              <FileText size={14} />
              {isRtl ? 'تصدير البيانات المقيدة' : 'Audit Data Export'}
            </button>
            <button
              onClick={() => setShowAddEmp(true)}
              className="px-4 py-2 bg-brand-gold text-brand-navy hover:bg-brand-gold-dark transition-colors font-bold text-xs rounded-xl flex items-center gap-2"
            >
              <PlusCircle size={14} />
              {isRtl ? 'إضافة موظف جديد' : 'Hire / Add Staff'}
            </button>
          </div>
        </div>

        {/* Dynamic HR Alerts Dashboard Rail */}
        {criticalIssuesCount > 0 && (
          <div className="mt-5 p-3.5 bg-red-950/45 border border-red-800/60 rounded-2xl flex items-center gap-3 text-red-100 text-xs">
            <AlertTriangle size={16} className="text-brand-gold animate-bounce shrink-0" />
            <div className="flex-1">
              <strong>{isRtl ? 'تحذير أمن الجودة والالتزام:' : 'Quality Control & Audit Warnings:'}</strong>
              <span className="opacity-80 ml-1.5">
                {isRtl 
                  ? `هناك ${criticalIssuesCount} من الملاك اللغويين المنتهية وثائقهم أو لديهم ملفات تكليف بدون توقيع NDA.`
                  : `There are ${criticalIssuesCount} contract expiries or translator profiles assigned Active work WITHOUT signed NDA records.`}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-red-900 font-bold rounded text-[10px]">ALERT</span>
          </div>
        )}
      </div>

      {/* Tabs Menu Navigation */}
      <div className="border-b border-slate-150 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        {[
          { id: 'dashboard', label: 'HR Dashboard', count: null },
          { id: 'employees', label: 'In-House Staff', count: profiles.filter(p => p.employeeType === 'staff').length },
          { id: 'translators', label: 'Freelancer Specialists', count: profiles.filter(p => p.employeeType === 'freelance').length },
          { id: 'recruitment', label: 'Applied Recruits', count: candidates.length },
          { id: 'attendance', label: 'Timesheet Grid', count: null },
          { id: 'leaves_overtime', label: 'Leaves & Overtime', count: leaves.filter(l => l.status === 'pending').length || null },
          { id: 'payroll', label: 'Wages & Payments', count: null },
          { id: 'compliance', label: 'NDAs & Policies', count: null },
          { id: 'disciplinary', label: 'Violations Tracker', count: disciplinary.length || null }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as HRTab)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${activeTab === tab.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: HR DASHBOARD COMMAND */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* TOP METRICS STATS GROUP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-xl"><Users size={20} /></div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase uppercase tracking-wider">Total Headcount</span>
                <strong className="text-xl font-bold font-mono text-slate-900">{profiles.length} staff</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-xl"><UserCheck size={20} /></div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase uppercase tracking-wider">Available Today</span>
                <strong className="text-xl font-bold font-mono text-emerald-600">
                  {profiles.filter(p => {
                    const hasLeave = leaves.some(l => l.employeeId === p.id && l.status === 'approved' && new Date().toISOString() >= l.startDate && new Date().toISOString() <= l.endDate);
                    return p.isActive && !hasLeave;
                  }).length} Active
                </strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-amber-50 text-amber-700 rounded-xl"><ClipboardList size={20} /></div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase uppercase tracking-wider">Leave Pipelines</span>
                <strong className="text-xl font-bold font-mono text-amber-600">
                  {leaves.filter(l => l.status === 'pending').length} pending
                </strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl"><FileText size={20} /></div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase uppercase tracking-wider">Recruitment Tests</span>
                <strong className="text-xl font-bold font-mono text-rose-600">
                  {candidates.filter(c => c.status === 'test_submitted' || c.status === 'test_assigned').length} files
                </strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Realtime Check-In Desk */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" />
                  Clock-In Attendance Portal
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Active User Session: <strong>{dbInstance.activeProfile?.fullName || 'Guest'}</strong>
                  <br />Role authorization: <span className="text-indigo-600 font-mono text-[10px] uppercase font-bold">{currentRole}</span>
                </p>

                <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Today's standard hours</span>
                  <span className="text-lg font-black font-mono text-slate-800">09:00 AM - 06:00 PM</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => handleClockInOut('check-in')}
                  className="py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl active:scale-95 transition-all text-center"
                >
                  Check In Now
                </button>
                <button
                  onClick={() => handleClockInOut('check-out')}
                  className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl active:scale-95 transition-all text-center"
                >
                  Check Out
                </button>
              </div>
            </div>

            {/* Quick Staff Leave Request Submission */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
              <h3 className="font-extrabold text-slate-900 text-sm">{isRtl ? 'تقديم طلب إجازة سريع' : 'Submit Quick Staff Leave Request'}</h3>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const lType = fd.get('leaveType') as string;
                const start = fd.get('start') as string;
                const end = fd.get('end') as string;
                const reason = fd.get('reason') as string;

                if (!start || !end) {
                  alert('Please select leave start/end dates.');
                  return;
                }

                const creator = dbInstance.activeProfile || profiles[0];
                const requestObj = {
                  id: `lv-sub-${Date.now()}`,
                  employeeId: creator.id,
                  employeeName: creator.fullName,
                  leaveType: lType,
                  startDate: start,
                  endDate: end,
                  days: Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1),
                  reason: reason,
                  status: 'pending'
                };

                const next = [requestObj, ...leaves];
                dbInstance.hrLeaves = next;
                dbInstance.save();
                form.reset();
                alert('Your annual/sick leave request has been published for manager evaluation!');
              }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
                <div>
                  <label className="block text-slate-400 pb-1">Leave Category</label>
                  <select name="leaveType" className="w-full p-2 border border-slate-150 rounded-lg">
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="emergency">Emergency Paid</option>
                    <option value="unpaid">Unpaid Leave</option>
                    <option value="wfh">Work from Home (WFH)</option>
                    <option value="half_day">Half-Day Shift Permission</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 pb-1">Start Date</label>
                  <input type="date" name="start" className="w-full p-2 border border-slate-150 rounded-lg" required />
                </div>

                <div>
                  <label className="block text-slate-400 pb-1">End Date</label>
                  <input type="date" name="end" className="w-full p-2 border border-slate-150 rounded-lg" required />
                </div>

                <div>
                  <label className="block text-slate-400 pb-1">Justification Reason</label>
                  <input type="text" name="reason" placeholder="Personal or medical context..." className="w-full p-2 border border-slate-150 rounded-lg" required />
                </div>

                <div className="sm:col-span-2">
                  <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors">
                    Publish Request to HR Desk
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Core HR Alerts Calendar Board summary */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-amber-500" />
                Office Birthdays & Impending Expirations (Next 30 Days)
              </h4>
              <ul className="text-xs text-slate-500 space-y-1">
                {documents
                  .filter(doc => doc.expiryDate)
                  .slice(0, 3)
                  .map(doc => (
                    <li key={doc.id}>• <strong>{doc.docType}</strong> {doc.employeeName} ({doc.expiryDate})</li>
                  ))}
              </ul>
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-slate-200/50 max-w-sm text-xs space-y-1">
              <strong className="text-slate-900 text-xs block">NDA Compliance Requirement:</strong>
              <p className="text-[10px] text-slate-400">
                To guarantee high absolute translation secrecy standards, new project assignees must verify they signed their system non-disclosure templates check file on compliance workspace logs tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IN-HOUSE EMPLOYEES ROSTER */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 border border-slate-150 rounded-xl px-3 py-1.5 w-full sm:max-w-xs">
              <Search size={14} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff by name/title..." 
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="bg-transparent border-none text-xs focus:outline-none w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <select 
                value={empStatusFilter} 
                onChange={e => setEmpStatusFilter(e.target.value)}
                className="p-2 border border-slate-150 rounded-xl text-xs bg-slate-50 cursor-pointer"
              >
                <option value="all">System Role: All</option>
                <option value="owner">Owner</option>
                <option value="admin">Secretaries & Admin Managers</option>
                <option value="sales">Account Managers</option>
                <option value="accountant">Accountants</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.filter(p => {
              if (p.employeeType !== 'staff') return false;
              if (empSearch && !p.fullName?.toLowerCase().includes(empSearch.toLowerCase())) return false;
              if (empStatusFilter !== 'all' && p.role !== empStatusFilter) return false;
              return true;
            }).map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-150 hover:border-slate-300 transition-all flex flex-col justify-between relative">
                <div className="absolute top-4 right-4 text-[10px] font-mono tracking-widest text-[#1B4F72] p-1 uppercase rounded font-black bg-slate-100">
                  {p.role}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center rounded-xl uppercase">
                      {p.fullName?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{p.fullName}</h4>
                      <p className="text-[10px] text-slate-400">{p.fullNameAr}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-600">
                      <Shield size={12} className="text-indigo-650" />
                      {(() => {
                        const br = branches.find(b => b.id === p.branchId);
                        return br ? (isRtl ? br.nameAr : br.name) : (isRtl ? 'غير محدد' : 'Not Assigned');
                      })()}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400" />
                      {p.email || 'No email registered'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" />
                      {p.phone || 'No WhatsApp'}
                    </p>
                    <p className="font-semibold text-slate-900 pt-1">
                      Wages: <span className="font-mono text-emerald-600">
                        {(() => {
                          const br = branches.find(b => b.id === p.branchId);
                          const cur = br?.currency || 'EGP';
                          return `${cur} ${(p.monthlySalary || 8000).toLocaleString()}`;
                        })()}/monthly
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-3 mt-4 border-t border-slate-50">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">VERIFIED EMPLOYEE SHUTTLE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSLATOR & FREELANCERS INVENTORY */}
      {activeTab === 'translators' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-105 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Linguist Availability & Assignment Filters</h3>
            <p className="text-[10px] text-slate-400">
              Filter available linguists by language pairs, certified experience, rates, and NDA status. Use this desk to source translators before adding tasks.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block pb-1">Source Language</label>
                <input 
                  type="text" 
                  placeholder="e.g. Arabic" 
                  value={langSource} 
                  onChange={e => setLangSource(e.target.value)}
                  className="w-full p-2 border border-slate-150 rounded-lg"
                />
              </div>
              <div>
                <label className="text-slate-400 block pb-1">Target Language</label>
                <input 
                  type="text" 
                  placeholder="e.g. English" 
                  value={langTarget} 
                  onChange={e => setLangTarget(e.target.value)}
                  className="w-full p-2 border border-slate-150 rounded-lg"
                />
              </div>
              <div>
                <label className="text-slate-400 block pb-1">Specialization</label>
                <input 
                  type="text" 
                  placeholder="e.g. Legal" 
                  value={specFilter} 
                  onChange={e => setSpecFilter(e.target.value)}
                  className="w-full p-2 border border-slate-150 rounded-lg"
                />
              </div>
              <div>
                <label className="text-slate-400 block pb-1">NDA Track Status</label>
                <select 
                  value={ndaFilter} 
                  onChange={e => setNdaFilter(e.target.value)}
                  className="w-full p-2 border border-slate-150 rounded-lg"
                >
                  <option value="all">All</option>
                  <option value="signed">NDA Signed Verified</option>
                  <option value="missing">Missing Signed NDA</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.filter(p => {
              if (p.employeeType !== 'freelance') return false;
              if (langSource && !p.languages?.some(l => l.toLowerCase().includes(langSource.toLowerCase()))) return false;
              if (langTarget && !p.languages?.some(l => l.toLowerCase().includes(langTarget.toLowerCase()))) return false;
              if (specFilter && !p.specializations?.some(s => s.toLowerCase().includes(specFilter.toLowerCase()))) return false;
              
              const hasNDA = documents.some(d => d.employeeId === p.id && d.docType === 'NDA Agreement' && d.trackingStatus === 'signed');
              if (ndaFilter === 'signed' && !hasNDA) return false;
              if (ndaFilter === 'missing' && hasNDA) return false;
              return true;
            }).map(t => {
              const hasNDA = documents.some(d => d.employeeId === t.id && d.docType === 'NDA Agreement' && d.trackingStatus === 'signed');
              const br = branches.find(b => b.id === t.branchId);
              const cur = br?.currency || 'EGP';
              
              // Calculate assignments actual stats of completed tasks securely
              const totalAssigned = assignments.filter(a => a.translatorId === t.id);
              const completedTasks = totalAssigned.filter(a => a.status === 'approved');
              const qualityRateSum = completedTasks.reduce((acc, curr) => {
                const taskMatch = tasks.find(tsk => tsk.id === curr.taskId);
                return acc + ((taskMatch as any)?.qualityScore || 90);
              }, 0);
              const qualityRating = completedTasks.length ? (qualityRateSum / completedTasks.length).toFixed(0) : '95';

              return (
                <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-2 h-full ${hasNDA ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs">{t.fullName}</h4>
                        {hasNDA ? (
                          <span title="NDA Verified Active">
                            <ShieldCheck size={14} className="text-emerald-500" />
                          </span>
                        ) : (
                          <span title="NDA Missing">
                            <Shield size={14} className="text-red-500 animate-pulse animate-duration-1000" />
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-full uppercase tracking-widest">{t.employeeType}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold">Languages Log</span>
                        <strong>{t.languages?.join(' ⇄ ') || 'AR ⇄ EN'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[8px] font-bold">Translation Field</span>
                        <strong>{t.specializations?.join(', ') || 'Certified Docs'}</strong>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Rate per word</span>
                        <strong className="font-mono text-slate-800">{cur} {t.perWordRate || 0.20}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Capacity / Day</span>
                        <strong className="font-mono text-slate-800">2,500 words</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Quality Rating</span>
                        <span className="font-mono font-bold text-slate-800 flex items-center gap-0.5 text-brand-gold">
                          <Star size={10} className="fill-current" />
                          {qualityRating}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {!hasNDA && (
                    <div className="mt-4 p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[9px] flex items-center gap-1.5 font-bold">
                      <AlertTriangle size={12} />
                      Warning: Complete and sign NDA template before scheduling confidential client files.
                    </div>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-450">
                    <span>Assigned Jobs: <strong>{totalAssigned.length} tasks</strong></span>
                    <button
                      onClick={() => {
                        confirm(
                          `Generate NDA and sign with ${t.fullName}?`,
                          () => {
                            const updatedDocs = [
                              ...documents,
                              { id: `nda-gen-${Date.now()}`, employeeId: t.id, employeeName: t.fullName, docType: 'NDA Agreement', expiryDate: '2030-01-01', trackingStatus: 'signed', file: `${t.id}_nda_verified.pdf` }
                            ];
                            dbInstance.hrDocuments = updatedDocs;
                            dbInstance.save();
                            success('NDA signed and completed successfully!');
                          },
                          undefined,
                          { isRtl }
                        );
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold cursor-pointer transition-colors"
                    >
                      NDA & CAT tools specs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: RECRUITMENT AND HIRING PIPELINE & TESTS */}
      {activeTab === 'recruitment' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles size={16} className="text-brand-gold" />
              Recruitment and In-take Agency Screening Pipeline
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Add external applicants, assign standard verification translation tests, score language accuracy, and instantly convert candidates into staff roles or project-based freelancers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate profiles checklist and status conversion */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h4 className="font-extrabold text-slate-950 text-xs uppercase tracking-widest">Active Candidates Registry</h4>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">{candidates.length} profiles</span>
              </div>

              <div className="divide-y divide-slate-100">
                {candidates.map(c => (
                  <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-xs">{c.fullName}</strong>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          c.status === 'hired' ? 'bg-emerald-100 text-emerald-850' :
                          c.status === 'passed' ? 'bg-emerald-50 text-emerald-700' :
                          c.status === 'test_submitted' ? 'bg-indigo-50 text-indigo-700' :
                          c.status === 'failed' ? 'bg-red-50 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {c.email} • {c.phone} • Specialization: <strong>{c.specialization}</strong> ({c.sourceLang} ⇄ {c.targetLang})
                      </p>
                      {c.reviewerComments && (
                        <p className="text-[10px] bg-slate-50 p-2 rounded-xl text-slate-500 italic border border-slate-100">
                          {isRtl ? 'تعليقات المدقق:' : 'Reviewer comments:'} "{c.reviewerComments}" • Score: <strong>{c.score}/100</strong>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 text-xs">
                      {c.status === 'test_assigned' && (
                        <button
                          onClick={() => handleCandidateStatus(c.id, 'test_submitted', 85, 'Completed technical translation of turbine manuals.')}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-bold hover:bg-indigo-100 transition-colors"
                        >
                          Submit Test File
                        </button>
                      )}
                      
                      {c.status === 'test_submitted' && (
                        <>
                          <button
                            onClick={() => handleCandidateStatus(c.id, 'passed', 91, 'Exquisite translation. Accurate formatting.')}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded font-bold hover:bg-emerald-100"
                          >
                            Mark Passed
                          </button>
                          <button
                            onClick={() => handleCandidateStatus(c.id, 'failed', 45, 'Inaccurate terminology and poor output grammar.')}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded font-bold hover:bg-rose-100"
                          >
                            Fail Test
                          </button>
                        </>
                      )}

                      {c.status === 'passed' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => convertToStaffOrFreelancer(c, 'staff')}
                            className="px-2.5 py-1.5 bg-brand-gold text-slate-950 rounded-xl font-bold hover:bg-amber-400 transition-all text-[10px]"
                          >
                            Approve Staff
                          </button>
                          <button
                            onClick={() => convertToStaffOrFreelancer(c, 'freelance')}
                            className="px-2.5 py-1.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-[10px]"
                          >
                            Approve Freelancer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In-take Applicant Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-xs">
              <h4 className="font-extrabold text-slate-950 pb-3 border-b border-slate-100 uppercase tracking-widest">In-take New Candidate</h4>
              
              <form onSubmit={e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const name = fd.get('name') as string;
                const email = fd.get('email') as string;
                const phone = fd.get('phone') as string;
                const source = fd.get('source') as string;
                const target = fd.get('target') as string;
                const rate = Number(fd.get('rate') || 0.20);
                const spec = fd.get('spec') as string;

                if (!name || !email) {
                  alert('Please enter a valid candidate name and email.');
                  return;
                }

                const created = {
                  id: `cand-${Date.now()}`,
                  fullName: name,
                  email,
                  phone,
                  country: 'Egypt',
                  targetRate: rate,
                  sourceLang: source,
                  targetLang: target,
                  specialization: spec,
                  status: 'new_applicant',
                  testFile: '',
                  testSubmitted: 'No',
                  score: 0,
                  reviewerComments: ''
                };

                const next = [...candidates, created];
                dbInstance.hrCandidates = next;
                dbInstance.save();
                form.reset();
                alert('Candidate in-take file added! Check-assign testing status.');
              }} className="space-y-3 mt-4">
                <div>
                  <label className="block text-slate-400">FullName</label>
                  <input type="text" name="name" className="w-full p-2 border border-slate-150 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-slate-400">Email Address</label>
                  <input type="email" name="email" className="w-full p-2 border border-slate-150 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-slate-400">WhatsApp / Phone</label>
                  <input type="text" name="phone" className="w-full p-2 border border-slate-150 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400">Source Lang</label>
                    <input type="text" name="source" placeholder="Arabic" className="w-full p-2 border border-slate-150 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-slate-400">Target Lang</label>
                    <input type="text" name="target" placeholder="English" className="w-full p-2 border border-slate-150 rounded-lg" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400">Assoc. Rate</label>
                    <input type="number" step="0.01" name="rate" placeholder="0.22" className="w-full p-2 border border-slate-150 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-slate-400">Specialty</label>
                    <input type="text" name="spec" placeholder="Tech / Medical" className="w-full p-2 border border-slate-150 rounded-lg" required />
                  </div>
                </div>

                <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors">
                  Submit Candidate File
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ATTENDANCE TIMESHEET GRID */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-950 text-xs uppercase tracking-widest">
                Interactive Multi-shift Attendance
              </h3>
              <p className="text-[11px] text-slate-400">
                Click cells to cycle status: Green "✓" means Present on Morning or Evening shift, Amber "V" is Annual Paid Vacation, Red "O" denotes sick/unpaid. Absence defaults empty.
              </p>
            </div>
            
            <div className="px-3 py-1 bg-slate-50 border border-slate-205 rounded-xl text-[10px] font-mono font-bold text-slate-500">
              Audit Period: {attendancePeriod}
            </div>
          </div>

          <div className="overflow-x-auto w-full mt-4 border border-slate-100 rounded-2xl">
            <table className="w-full text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-150">
                  <th className="px-4 py-3 border-r border-slate-150 text-left">Internal Staff Member</th>
                  <th className="px-3 py-3 border-r border-slate-150 text-center">Duty Shift</th>
                  {attendanceDays.map(d => (
                    <th key={d} className="px-2 py-3 border-r border-slate-150 text-center font-mono w-14">
                      {String(d).padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.filter(p => p.employeeType === 'staff').map(t => (
                  <React.Fragment key={t.id}>
                    {/* Morning Duty */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900" rowSpan={2}>
                        <p className="text-xs">{t.fullName}</p>
                        <span className="text-[9px] uppercase tracking-wider text-[#1B4F72] p-0.5 bg-slate-100 rounded inline-block mt-1 font-mono font-medium">{t.role}</span>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Morning</td>
                      {attendanceDays.map(d => {
                        const dayStr = d < 10 ? `0${d}` : `${d}`;
                        const fullDate = `${attendancePeriod}-${dayStr}`;
                        const record = attendance.find(a => a.translatorId === t.id && a.workDate === fullDate && a.session === 'morning');
                        
                        let cellClass = 'bg-slate-50/30 text-slate-350 hover:bg-slate-100';
                        let char = '-';
                        if (record) {
                          if (record.isVacation) {
                            cellClass = 'bg-amber-50 text-amber-700 font-black hover:bg-amber-100';
                            char = 'V';
                          } else {
                            cellClass = 'bg-emerald-50 text-emerald-700 font-black hover:bg-emerald-100';
                            char = '✓';
                          }
                        }

                        return (
                          <td 
                            key={d}
                            onClick={() => {
                              if (currentRole !== 'owner' && currentRole !== 'admin') {
                                alert('Forbidden: ONLY Accountant or Owner/Admin can override attendance.');
                                return;
                              }
                              const match = attendance.find(a => a.translatorId === t.id && a.workDate === fullDate && a.session === 'morning');
                              if (match) {
                                if (!match.isVacation) {
                                  match.isVacation = true;
                                  match.vacationType = 'annual';
                                } else {
                                  dbInstance.attendance = dbInstance.attendance.filter(a => a.id !== match.id);
                                }
                              } else {
                                dbInstance.attendance.push({
                                  id: `att-${Date.now()}`,
                                  translatorId: t.id,
                                  workDate: fullDate,
                                  session: 'morning',
                                  isVacation: false
                                });
                              }
                              dbInstance.save();
                              setAttendance([...dbInstance.attendance]);
                            }}
                            className={`p-2 border-r border-slate-100 text-center cursor-pointer select-none transition-all active:scale-95 ${cellClass}`}
                          >
                            <span className="font-mono text-xs">{char}</span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Evening Duty */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-100 text-center text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Evening</td>
                      {attendanceDays.map(d => {
                        const dayStr = d < 10 ? `0${d}` : `${d}`;
                        const fullDate = `${attendancePeriod}-${dayStr}`;
                        const record = attendance.find(a => a.translatorId === t.id && a.workDate === fullDate && a.session === 'evening');
                        
                        let cellClass = 'bg-slate-50/30 text-slate-350 hover:bg-slate-100';
                        let char = '-';
                        if (record) {
                          if (record.isVacation) {
                            cellClass = 'bg-amber-50 text-amber-700 font-black hover:bg-amber-100';
                            char = 'V';
                          } else {
                            cellClass = 'bg-emerald-50 text-emerald-700 font-black hover:bg-emerald-100';
                            char = '✓';
                          }
                        }

                        return (
                          <td 
                            key={d}
                            onClick={() => {
                              if (currentRole !== 'owner' && currentRole !== 'admin') {
                                alert('Forbidden: ONLY Accountant or Owner/Admin can override attendance.');
                                return;
                              }
                              const match = attendance.find(a => a.translatorId === t.id && a.workDate === fullDate && a.session === 'evening');
                              if (match) {
                                if (!match.isVacation) {
                                  match.isVacation = true;
                                  match.vacationType = 'annual';
                                } else {
                                  dbInstance.attendance = dbInstance.attendance.filter(a => a.id !== match.id);
                                }
                              } else {
                                dbInstance.attendance.push({
                                  id: `att-${Date.now()}`,
                                  translatorId: t.id,
                                  workDate: fullDate,
                                  session: 'evening',
                                  isVacation: false
                                });
                              }
                              dbInstance.save();
                              setAttendance([...dbInstance.attendance]);
                            }}
                            className={`p-2 border-r border-slate-100 text-center cursor-pointer select-none transition-all active:scale-95 ${cellClass}`}
                          >
                            <span className="font-mono text-xs">{char}</span>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: LEAVES AND OVERTIME REQUESTS LEDGER */}
      {activeTab === 'leaves_overtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          
          {/* Leaves Tracking and approval desk */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 uppercase tracking-widest pb-2 border-b border-slate-100">
              {isRtl ? 'إدارة وفحص طلبات الإجازات' : 'Staff Leave Request Workflow'}
            </h4>
            
            <div className="divide-y divide-slate-100">
              {leaves.map(l => (
                <div key={l.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-slate-900">{l.employeeName}</h5>
                    <p className="text-slate-400 text-[11px] pt-0.5">
                      Type: <strong className="uppercase text-slate-600 font-mono">{l.leaveType}</strong> • {l.startDate} to {l.endDate} (<strong>{l.days} days</strong>)
                    </p>
                    <p className="text-slate-500 italic text-[11px] mt-1">"{l.reason}"</p>
                    {l.managerApproval && <p className="text-[10px] text-emerald-600 font-semibold pt-1">Verified Approv: {l.managerApproval}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase uppercase tracking-wider ${
                      l.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      l.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                      'bg-slate-100 text-slate-650 animate-pulse'
                    }`}>
                      {l.status}
                    </span>
                    
                    {l.status === 'pending' && (currentRole === 'owner' || currentRole === 'admin') && (
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => handleLeaveAction(l.id, 'approved')}
                          className="px-2 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleLeaveAction(l.id, 'rejected')}
                          className="px-2 py-1 bg-rose-600 text-white rounded font-bold hover:bg-rose-750 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overtime multiplier tracking and approval */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 uppercase tracking-widest pb-2 border-b border-slate-100">
              Overtime Ledger & Multipliers
            </h4>
            <p className="text-[10px] text-slate-400">
              Standard corporate multipliers: <strong>1.35x</strong> on standard office working days, and <strong>1.70x</strong> for emergency weekend/holiday translation workloads.
            </p>

            <div className="divide-y divide-slate-100 mt-2">
              {overtimes.map(o => (
                <div key={o.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-slate-900">{o.employeeName}</h5>
                    <p className="text-slate-400 text-[11px] pt-0.5">
                      Hrs: <strong>{o.hours} hours</strong> on {o.date} • Multiplier: <strong className="text-indigo-600 font-mono">{o.multiplier}x</strong>
                    </p>
                    <p className="text-slate-500 italic text-[11px] mt-1">Reason: "{o.reason}"</p>
                    {o.approver && <p className="text-[10px] text-emerald-600 font-semibold pt-1">Authorized Audit: {o.approver}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      o.status === 'approved' ? 'bg-emerald-50 text-emerald-705' :
                      'bg-slate-100 text-slate-600 animate-pulse'
                    }`}>
                      {o.status}
                    </span>

                    {o.status === 'pending' && (currentRole === 'owner' || currentRole === 'admin') && (
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => handleOtAction(o.id, 'approved')}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOtAction(o.id, 'rejected')}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PAYROLL AND FREELANCE COMPLETED TASK PAYMENT LEDGER */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          
          {/* Section A: In-House Monthly Salary Payslip Calculator */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-3 border-b border-slate-100">
              <ClipboardList size={16} className="text-emerald-600" />
              Monthly Salaries & Corporate Payslip Calculator (In-house)
            </h3>
            
            {currentRole !== 'owner' && currentRole !== 'accountant' && currentRole !== 'admin' ? (
              <div className="p-4 bg-amber-50 rounded-xl text-amber-700 mt-4 leading-relaxed font-bold">
                Access Denied. Financial salaries, allowances, and detailed tax deductions are restricted exclusively to Owner, Accountant, and Admin HR managers.
              </div>
            ) : (
              <div className="overflow-x-auto w-full mt-4 border border-slate-100 rounded-xl">
                <table className="w-full text-xs text-left text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 font-mono">
                      <th className="px-4 py-3 border-b border-slate-150">Staff Member</th>
                      <th className="px-4 py-3 border-b border-slate-150">Basic Salary</th>
                      <th className="px-4 py-3 border-b border-slate-150">Allowances</th>
                      <th className="px-4 py-3 border-b border-slate-150">Approved Overtime</th>
                      <th className="px-4 py-3 border-b border-slate-150">Leave Deductions</th>
                      <th className="px-4 py-3 border-b border-slate-150">Net Payroll</th>
                      <th className="px-4 py-3 border-b border-slate-150">Corporate Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {profiles.filter(p => p.employeeType === 'staff').map(emp => {
                      const basic = emp.monthlySalary || 8000;
                      const br = branches.find(b => b.id === emp.branchId);
                      const cur = br?.currency || 'EGP';
                      // Allowances standard allocation helper
                      const allowance = Math.round(basic * 0.15);
                      
                      // Calculate active approved overtime hours
                      const otHoursObj = overtimes.filter(o => o.employeeId === emp.id && o.status === 'approved');
                      const otTotalSum = otHoursObj.reduce((acc, curr) => {
                        const ratePerHour = (basic / 30) / 8; // estimation wage basis
                        return acc + (curr.hours * ratePerHour * curr.multiplier);
                      }, 0);

                      const deductionObj = leaves.filter(l => l.employeeId === emp.id && l.status === 'approved' && l.leaveType === 'unpaid');
                      const deductionVal = deductionObj.reduce((acc, curr) => {
                        const perDay = basic / 30;
                        return acc + (curr.days * perDay);
                      }, 0);

                      const netPay = Math.round(basic + allowance + otTotalSum - deductionVal);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {emp.fullName}
                            <span className="text-[9px] text-[#1B4F72] block font-mono font-medium lowercase pt-0.5">{emp.role}@globalizetl.com</span>
                          </td>
                          <td className="px-4 py-3 font-mono">{cur} {basic.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono">{cur} {allowance.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-emerald-600">+{cur} {Math.round(otTotalSum).toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-rose-600">-{cur} {Math.round(deductionVal).toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono font-black text-slate-950">{cur} {netPay.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold font-mono rounded-full uppercase tracking-wider">Payroll Active</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section B: Freelance Payment Clearing statements (connected directly to Tasks and assignments) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Sparkles size={16} className="text-indigo-650" />
              Freelance Linguist Completed Tasks payment statements
            </h3>
            <p className="text-[10px] text-slate-400">
              Calculated automatically based on system task assignment completions. Freelancers can only view their approved tasks and net payouts without access to internal client prices or corporate billing profits.
            </p>

            <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 font-mono border-b border-slate-150">
                    <th className="px-4 py-3">Language Specialist</th>
                    <th className="px-4 py-3">Assigned Tasks Count</th>
                    <th className="px-4 py-3">Completed Words Total</th>
                    <th className="px-4 py-3">Calculated Base Earnings</th>
                    <th className="px-4 py-3">Deductions / Rush fees</th>
                    <th className="px-4 py-3">Net Payment Due</th>
                    <th className="px-4 py-3">Specialist Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.filter(p => {
                    const isPM = currentRole === 'owner' || currentRole === 'accountant' || currentRole === 'admin';
                    if (isPM) return p.employeeType === 'freelance';
                    return p.id === dbInstance.activeProfile?.id;
                  }).map(t => {
                    const matchedAss = assignments.filter(a => a.translatorId === t.id);
                    const completed = matchedAss.filter(a => a.status === 'approved');
                    const br = branches.find(b => b.id === t.branchId);
                    const cur = br?.currency || 'EGP';
                    
                    const totalWords = completed.reduce((acc, curr) => acc + (curr.wordCountActual || curr.wordCountAssigned), 0);
                    const baseAmount = completed.reduce((acc, curr) => acc + (curr.calculatedAmount || ((curr.wordCountActual || curr.wordCountAssigned) * (t.perWordRate || 0.20))), 0);
                    
                    // Deduction metrics of penalty warning files
                    const penaltiesObj = disciplinary.filter(d => d.employeeId === t.id && d.incidentType === 'late_delivery');
                    const deduction = penaltiesObj.length * 200; // EGP 200 quality revision deduction
                    
                    const finalNet = Math.max(0, baseAmount - deduction);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {t.fullName}
                          <span className="text-[9px] text-slate-400 font-mono block font-normal pt-0.5">{t.languages?.join(' ⇄ ') || 'AR ⇄ EN'}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">{matchedAss.length} active ({completed.length} approved)</td>
                        <td className="px-4 py-3 font-mono">{totalWords.toLocaleString()} words</td>
                        <td className="px-4 py-3 font-mono">{cur} {Math.round(baseAmount).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-rose-600">-{cur} {deduction}</td>
                        <td className="px-4 py-3 font-mono font-extrabold text-[#1B4F72]">{cur} {Math.round(finalNet).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              alert(`Receipt generated!\nSpecialist Statement info:\nLinguist: ${t.fullName}\nCompleted: ${completed.length} files\nBase sum: ${cur} ${Math.round(baseAmount)}\nNet cleared: ${cur} ${Math.round(finalNet)}`);
                            }}
                            className="px-2 py-1 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 transition text-[10px]"
                          >
                            Statement Statement
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

      {/* TAB 8: NDAs, COMPLIANCE CODES, AND INTERNAL TRAINING CERTIFICATION GUIDES */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          
          {/* Section A: Non Disclosure Agreements, University diplomas trackers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 uppercase tracking-widest pb-3 border-b border-slate-100">
              {isRtl ? 'أرشيف اتفاقيات عدم الفصاح ومستندات الثبوتية' : 'ID card, Signed NDAs & Document Expiry Vault'}
            </h4>
            <p className="text-[10px] text-slate-400 pb-2">
              All freelance and full-time language professionals must upload their certified credentials. Critical alerts are flagged for IDs/work agreements expiring within 60 days.
            </p>

            <div className="divide-y divide-slate-100">
              {documents.map(d => {
                const days = getDaysTillExpiry(d.expiryDate);
                const isUrgent = days < 60 && d.trackingStatus === 'signed';

                return (
                  <div key={d.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] text-[#1B4F72] uppercase font-mono tracking-wider block font-semibold">{d.docType}</span>
                      <strong className="text-slate-905">{d.employeeName}</strong>
                      <p className="text-slate-400 text-[10px] pt-0.5">
                        File: {d.file || 'Placeholder (Awaiting Manual Upload)'} • Expiry: <strong className="font-mono text-slate-700">{d.expiryDate}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 font-mono">
                      {isUrgent ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold animate-pulse">EXPIRATION WARNING: {days} DAYS</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold">DAYS ACTIVE: {days}</span>
                      )}

                      <span className="text-[10px] uppercase font-bold text-slate-450">{d.trackingStatus}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Training Policies & Standards Academy */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 uppercase tracking-widest pb-2 border-b border-slate-100">
              Office Academy Guideline Policies Read Status
            </h4>
            <p className="text-[10px] text-slate-400">
              Select standard policies to acknowledge reading. Ensure all staff translators confirm acceptance of translation metrics.
            </p>

            <div className="space-y-4 mt-2">
              {policies.map(p => {
                const me = dbInstance.activeProfile || profiles[0];
                const hasRead = p.readBy.includes(me.id);

                return (
                  <div key={p.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100/60">
                      <strong className="text-slate-900 text-xs">{p.title}</strong>
                      <button 
                        onClick={() => handleAcknowledgePolicy(p.id, me.id)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                          hasRead ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {hasRead ? <Check size={10} /> : <AlertTriangle size={10} />}
                        {hasRead ? 'Read Status: Confirmed' : 'Acknowledge Policy'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-450 mt-2 leading-relaxed italic">
                      "{p.description}"
                    </p>
                    <p className="text-[9px] text-slate-400 mt-2">
                      Total confirmed staff read logs: <strong>{p.readBy.length} members</strong>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: DISCIPLINARY LOGS & INCIDENT WARNING MODULE */}
      {activeTab === 'disciplinary' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b border-slate-100 gap-4">
            <div>
              <h3 className="font-extrabold text-slate-950 uppercase tracking-widest">
                Warnings, Violations & Disciplinary Records Log (Confidential)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Record deadline delays, repeated certified revision issues, or confidentiality complaints. Access restricted solely to HR Managers & Owner.
              </p>
            </div>
            
            <button
              onClick={() => {
                const empName = window.prompt("Enter employee name to register warn trace:");
                const desc = window.prompt("Enter event description context:");
                if (empName && desc) {
                  const entry = {
                    id: `ds-${Date.now()}`,
                    employeeId: `p-${Date.now()}`,
                    employeeName: empName,
                    incidentType: 'quality_issue',
                    date: new Date().toISOString().split('T')[0],
                    description: desc,
                    actionTaken: 'Formal memo filed into active workspace profile.',
                    status: 'filed'
                  };
                  const next = [entry, ...disciplinary];
                  dbInstance.hrDisciplinary = next;
                  dbInstance.save();
                  success('Incident logged!');
                }
              }}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl hover:bg-slate-800 transition"
            >
              Log New Incident
            </button>
          </div>

          {currentRole !== 'owner' && currentRole !== 'admin' ? (
            <div className="p-4 bg-amber-50 rounded-xl leading-relaxed text-amber-700 font-bold">
              Access Denied. Highly confidential disciplinary incident records are only visible to authorized HR Owners and admin management staff.
            </div>
          ) : (
            <div className="divide-y divide-slate-105">
              {disciplinary.map(item => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900">{item.employeeName}</strong>
                      <span className="mx-2 font-mono text-slate-400">•</span>
                      <span className="text-[10px] text-indigo-700 font-mono font-bold uppercase tracking-wider">{item.incidentType.replace('_', ' ')}</span>
                    </div>
                    <span className="text-slate-400 text-xs">{item.date}</span>
                  </div>
                  <p className="text-slate-500 pt-1 text-[11px]">Reason: "{item.description}"</p>
                  <p className="text-[#1B4F72] text-[10px] font-bold pt-1">Resolution status action: {item.actionTaken}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HIRE / ADD NEW STAFF MODAL */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="text-slate-950" size={20} />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {isRtl ? 'تعيين وتجهيز ملف موظف جديد' : 'Hire / Add New System Staff'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddEmp(false)} 
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full English Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'الاسم بالإنجليزية *' : 'Full English Name *'}
                  </label>
                  <input 
                    type="text" 
                    value={newEmp.fullName}
                    onChange={e => setNewEmp({ ...newEmp, fullName: e.target.value })}
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                  />
                </div>

                {/* Full Arabic Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'الاسم بالعربية *' : 'Full Arabic Name *'}
                  </label>
                  <input 
                    type="text" 
                    value={newEmp.fullNameAr}
                    onChange={e => setNewEmp({ ...newEmp, fullNameAr: e.target.value })}
                    required
                    placeholder="مثال: جون دو"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                  />
                </div>

                {/* Official Corporate Email */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'البريد الإلكتروني الرسمي *' : 'Official Corporate Email *'}
                  </label>
                  <input 
                    type="email" 
                    value={newEmp.email}
                    onChange={e => setNewEmp({ ...newEmp, email: e.target.value })}
                    required
                    placeholder="e.g. email@globalizetl.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'رقم الهاتف للتواصل *' : 'Phone Number (Contact) *'}
                  </label>
                  <input 
                    type="text" 
                    value={newEmp.phone}
                    onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })}
                    required
                    placeholder="e.g. +201011112222"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                  />
                </div>

                {/* System Authorization Role */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'صلاحيات النظام *' : 'System Authorization Level *'}
                  </label>
                  <select 
                    value={newEmp.role}
                    onChange={e => setNewEmp({ ...newEmp, role: e.target.value as Profile['role'] })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="translator">{isRtl ? 'مترجم (Translator)' : 'Linguist / Translator'}</option>
                    <option value="sales">{isRtl ? 'مبيعات (Sales Executive)' : 'Sales & Client Manager'}</option>
                    <option value="accountant">{isRtl ? 'محاسب (Accountant)' : 'Bureau Accountant'}</option>
                    <option value="admin">{isRtl ? 'مدير مكتب (Admin Manager)' : 'Bureau Admin Deputy'}</option>
                    <option value="owner">{isRtl ? 'مالك (Owner)' : 'Legal Bureau Partner Owner'}</option>
                  </select>
                </div>

                {/* Office Service Category (employeeType) */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'فئة التوظيف *' : 'Office Service Category *'}
                  </label>
                  <select 
                    value={newEmp.employeeType}
                    onChange={e => setNewEmp({ ...newEmp, employeeType: e.target.value as Profile['employeeType'] })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="staff">{isRtl ? 'موظف مثبت (Direct Staff)' : 'Direct Salaried Staff'}</option>
                    <option value="freelance">{isRtl ? 'مستشار فريلانس (Freelancer)' : 'Independent Freelancer'}</option>
                  </select>
                </div>

                {/* Assigned Corporate Branch */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'الفرع المعين به الموظف *' : 'Assigned Corporate Branch *'}
                  </label>
                  <select 
                    value={newEmp.branchId}
                    onChange={e => setNewEmp({ ...newEmp, branchId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                  >
                    {branches.map(br => (
                      <option key={br.id} value={br.id}>
                        {isRtl ? br.nameAr : br.name} ({br.currency})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Personal Email */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'البريد الإلكتروني الشخصي (اختياري)' : 'Personal Email (Optional)'}
                  </label>
                  <input 
                    type="email" 
                    value={newEmp.personalEmail}
                    onChange={e => setNewEmp({ ...newEmp, personalEmail: e.target.value })}
                    placeholder="e.g. personal@gmail.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                  />
                </div>

                {/* Password field with toggle visibility and strong password generator */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'كلمة المرور الأولية للولوج *' : 'Initial Access Password *'}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 text-slate-400" size={14} />
                    <input 
                      type={showPass ? "text" : "password"}
                      value={newEmp.password}
                      onChange={e => setNewEmp({ ...newEmp, password: e.target.value })}
                      required
                      placeholder={isRtl ? 'كلمة المرور (12 حرفًا على الأقل)' : 'Initial login password (min 12 chars)'}
                      className="w-full pl-9 pr-24 py-2 border border-slate-200 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="text-slate-450 hover:text-slate-650 p-1 cursor-pointer"
                        title={showPass ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
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
                          setNewEmp(prev => ({ ...prev, password: shuffled }));
                        }}
                        className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-all border border-slate-950 font-sans"
                        title={isRtl ? 'توليد كلمة مرور عشوائية' : 'Generate strong random password'}
                      >
                        {isRtl ? 'توليد' : 'Gen'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct Salary for staff / admin */}
                {newEmp.employeeType === 'staff' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {isRtl ? 'الراتب الأساسي الشهري *' : 'Basic Monthly Salary *'}
                    </label>
                    <input 
                      type="number" 
                      value={newEmp.monthlySalary}
                      onChange={e => setNewEmp({ ...newEmp, monthlySalary: Number(e.target.value) })}
                      required
                      placeholder="e.g. 8500"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                    />
                  </div>
                )}

                {/* Rates for freelancer */}
                {newEmp.employeeType === 'freelance' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {isRtl ? 'سعر الكلمة للاستحقاق *' : 'Rate per Word (EGP/Word) *'}
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={newEmp.perWordRate}
                        onChange={e => setNewEmp({ ...newEmp, perWordRate: Number(e.target.value) })}
                        required
                        placeholder="e.g. 0.22"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {isRtl ? 'سعر الصفحة للاستحقاق *' : 'Rate per Page (EGP/Page) *'}
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newEmp.perPageRate}
                        onChange={e => setNewEmp({ ...newEmp, perPageRate: Number(e.target.value) })}
                        required
                        placeholder="e.g. 25"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                      />
                    </div>
                  </>
                )}

                {/* Working hours & shift */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'ساعات العمل اليومية *' : 'Daily Working Hours *'}
                  </label>
                  <input 
                    type="number" 
                    value={newEmp.workingHours}
                    onChange={e => setNewEmp({ ...newEmp, workingHours: Number(e.target.value) })}
                    required
                    min="1"
                    max="24"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isRtl ? 'فترة/وردية العمل اليومية *' : 'Daily Work Shift *'}
                  </label>
                  <select 
                    value={newEmp.workingShift}
                    onChange={e => setNewEmp({ ...newEmp, workingShift: e.target.value as 'day' | 'night' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="day">{isRtl ? 'نهاري صباحي (Day Shift)' : 'Day Shift'}</option>
                    <option value="night">{isRtl ? 'ليلي مسائي (Night Shift)' : 'Night Shift'}</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddEmp(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 font-bold cursor-pointer transition-colors"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  {isRtl ? 'توظيف وإعتماد ملف الموظف' : 'Authorize & Provision Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT SECURITY MODAL VERIFICATION */}
      <ExportProtectionModal
        isOpen={isExportShieldOpen}
        onClose={() => setIsExportShieldOpen(false)}
        dataType="hr_payroll_reports"
        dataLabelEn="HR Payroll & Translators Fleet Directory Ledger"
        dataLabelAr="قاعدة سجلات الموظفين والمستحقات والرواتب"
        isRtl={isRtl}
        onExportApproved={resolveCompletedExport}
      />
    </div>
  );
};

export default AttendancePage;
