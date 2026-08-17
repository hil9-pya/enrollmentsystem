import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { PROGRAMS, SUBJECTS } from '../../data/mockData';
import {
  Users, FileCheck, DollarSign, Trash2,
  CheckCircle, Sliders, RotateCcw, BarChart2,
  Edit3, X, Save, Download, AlertTriangle,
  BookOpen, CreditCard, GraduationCap, TrendingUp, Activity,
  Unlock, Calendar, Bell, Plus, Loader2, FileText,
  Building2, ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { toast } from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import Badge from '../../components/Badge';
import { useConfirm } from '../../context/ConfirmationContext';
import CourseManagementTab from './CourseManagementTab';
import AdminSidebar from './AdminSidebar';
import PortalShell from '../../components/PortalShell';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import PortalPageHeader from '../../components/PortalPageHeader';
import Modal from '../../components/Modal';
import SearchInput from '../../components/SearchInput';
import MiniStat from '../../components/MiniStat';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
const ROLE_TONES = {
  admin: 'neutral',
  instructor: 'info',
  admission: 'info',
  adviser: 'info',
  accounting: 'success',
  registrar: 'warning',
};

const authFetch = (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};
const safeJson = async (res) => {
  if (!res.ok) {
    let errorMsg = `Server error (Status ${res.status})`;
    try { const d = await res.json(); errorMsg = d.error || d.message || errorMsg; } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
};

// ─── Sub-views ────────────────────────────────────────────────────────────────

function AnalyticsTab({ metrics, visibleStudents, setActiveTab, setStatusFilter, setProgramFilter, setPaymentFilter }) {
  const recentEnrollees = useMemo(() =>
    visibleStudents.filter(s => s.status === 'enrolled').slice(-5)
  , [visibleStudents]);

  const monthlyData = useMemo(() => {
    const counts = {};
    visibleStudents.forEach(s => {
      const d = new Date(s.createdAt || Date.now());
      const key = `${d.toLocaleString('default', { month: 'short' })}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).slice(-6).map(([name, count]) => ({ name, count }));
  }, [visibleStudents]);

  return (
    <div className="h-full w-full space-y-6 overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <PortalPageHeader
        title="Administration overview"
        description="Monitor enrollment operations, student activity, and system status."
        actions={<PortalRefreshButton />}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat
          title="Total Enrolled" value={metrics.totalEnrolled}
          icon={<GraduationCap className="w-4 h-4" />} colorClass="text-univ-blue"
          onClick={() => { setActiveTab('students'); setStatusFilter('enrolled'); setProgramFilter(''); setPaymentFilter(''); }}
        />
        <MiniStat
          title="Pending Validation" value={metrics.pendingValidation}
          icon={<FileCheck className="w-4 h-4" />} colorClass="text-amber-600"
          onClick={() => { setActiveTab('applicants'); setStatusFilter('validation_pending'); setProgramFilter(''); setPaymentFilter(''); }}
        />
        <MiniStat
          title="Active Processing" value={metrics.activeProcessing}
          icon={<Activity className="w-4 h-4" />} colorClass="text-univ-blue"
          onClick={() => { setActiveTab('applicants'); setStatusFilter('processing_all'); setProgramFilter(''); setPaymentFilter(''); }}
        />
        <MiniStat
          title="Total Revenue" value={`₱${metrics.revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          icon={<DollarSign className="w-4 h-4" />} colorClass="text-emerald-600"
          onClick={() => { setActiveTab('students'); setStatusFilter(''); setProgramFilter(''); setPaymentFilter('paid'); }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Enrollment by Program */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Enrollments by Program</h2>
              <p className="text-xs text-slate-400 mt-0.5">Currently enrolled students per course</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-300" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.programData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={(data) => { if (data?.name) { setActiveTab('students'); setProgramFilter(data.name.toLowerCase()); setStatusFilter('enrolled'); setPaymentFilter(''); }}}>
                  {metrics.programData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pipeline Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Enrollment workflow distribution</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 border-t border-slate-200">
            {metrics.statusData.map((item, i) => (
              <button key={i} type="button" onClick={() => { setActiveTab(item.name === 'Enrolled' ? 'students' : 'applicants'); setProgramFilter(''); setPaymentFilter(''); setStatusFilter(item.name === 'Enrolled' ? 'enrolled' : item.name === 'Processing' ? 'processing_all' : 'validation_pending'); }} className="flex w-full items-center justify-between px-1 py-4 text-sm transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      {monthlyData.length > 1 && (
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registration Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly applicant registrations</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-300" />
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#27469b" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Enrollees */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recently Enrolled</h2>
          <button onClick={() => { setActiveTab('students'); setStatusFilter('enrolled'); }} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 cursor-pointer">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {recentEnrollees.length > 0 ? recentEnrollees.map((s) => (
            <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {(s.firstName?.[0] || 'S')}{(s.lastName?.[0] || 'T')}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{s.firstName || 'Anonymous'} {s.lastName || 'Applicant'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{s.email || '—'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">{s.programId?.toUpperCase() || '—'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.enrollmentType || '—'}</p>
              </div>
            </div>
          )) : (
            <div className="px-6 py-12 text-center text-sm text-slate-400">No enrolled students yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Student Edit Modal ────────────────────────────────────────────────────────
function StudentEditModal({ student, onClose, onSave }) {
  const [form, setForm] = useState({
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    email: student.email || '',
    phone: student.phone || '',
    address: student.address || '',
    programId: student.programId || '',
    enrollmentType: student.enrollmentType || '',
    status: student.status || 'registration',
    paymentStatus: student.paymentStatus || 'unpaid',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/students/${student.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const updated = await safeJson(res);
      toast.success('Student record updated');
      onSave(updated);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update student');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit student record — ${student.id}`} maxWidth="max-w-2xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">First Name</label>
              <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Last Name</label>
              <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Program</label>
              <select value={form.programId} onChange={e => setForm(p => ({ ...p, programId: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="">— Not Selected —</option>
                {PROGRAMS.map(prog => <option key={prog.id} value={prog.id}>{prog.id.toUpperCase()} – {prog.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Home Address</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Enrollment Type</label>
              <select value={form.enrollmentType} onChange={e => setForm(p => ({ ...p, enrollmentType: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="">— None —</option>
                <option value="new">New Student</option>
                <option value="transferee">Transferee</option>
                <option value="returning">Returning</option>
                <option value="cross_enrollee">Cross Enrollee</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Payment Status</label>
              <select value={form.paymentStatus} onChange={e => setForm(p => ({ ...p, paymentStatus: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Enrollment Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
              <option value="registration">Registration</option>
              <option value="documents_submitted">Documents Submitted</option>
              <option value="documents_approved">Documents Approved</option>
              <option value="advising_pending">Advising Pending</option>
              <option value="advising_approved">Advising Approved</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="payment_confirmed">Payment Confirmed</option>
              <option value="validation_pending">Validation Pending</option>
              <option value="enrolled">Enrolled</option>
            </select>
          </div>

          {/* Documents Section */}
          {student.documents && student.documents.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Submitted Documents</label>
              <div className="space-y-2">
                {student.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{doc.typeId || doc.type || 'Document'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{doc.fileName || 'Uploaded file'}</p>
                      </div>
                    </div>
                    {doc.filePath && (
                      <a href={`/${doc.filePath}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer">
                        <Download className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer disabled:opacity-60 shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
    </Modal>
  );
}

// ─── Directory Tab ─────────────────────────────────────────────────────────────
function DirectoryTab({ title, description, visibleStudents, onTrash, onStudentUpdated, dispatch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);

  const filteredStudents = useMemo(() => {
    return visibleStudents.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q === '' ||
        s.id?.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === '' ? true
        : statusFilter === 'processing_all' ? (s.status !== 'registration' && s.status !== 'enrolled')
        : s.status === statusFilter;
      const matchesProgram = programFilter === '' || s.programId === programFilter;
      const matchesPayment = paymentFilter === '' || s.paymentStatus === paymentFilter;
      return matchesSearch && matchesStatus && matchesProgram && matchesPayment;
    });
  }, [visibleStudents, searchQuery, statusFilter, programFilter, paymentFilter]);

  const handleOverrideAdmission = async (id) => {
    try { await dispatch({ type: 'APPROVE_DOCUMENTS', payload: { studentId: id, notes: 'Admin override' } }); toast.success('Documents approved'); } catch { toast.error('Failed'); }
  };
  const handleOverrideAdvising = async (id, stud) => {
    try {
      if (!stud?.selectedSubjects?.length) {
        const fallback = SUBJECTS.find(s => s.programId === (stud?.programId || 'bscs'));
        if (fallback) await dispatch({ type: 'UPDATE_STUDENT_SUBJECTS', payload: { studentId: id, subjects: [{ subjectId: fallback.id }] } });
      }
      await dispatch({ type: 'APPROVE_ADVISING', payload: { studentId: id, notes: 'Admin override' } });
      toast.success('Advising approved');
    } catch { toast.error('Failed'); }
  };
  const handleOverridePayment = async (id) => {
    try { await dispatch({ type: 'CONFIRM_PAYMENT', payload: { studentId: id } }); toast.success('Payment confirmed'); } catch { toast.error('Failed'); }
  };
  const handleOverrideFinalize = async (id) => {
    try { await dispatch({ type: 'VALIDATE_ENROLLMENT', payload: { studentId: id } }); toast.success('Enrollment finalized'); } catch { toast.error('Failed'); }
  };
  const handleResolveHolds = async (id, stud) => {
    const active = stud.holds?.filter(h => h.status === 'active') || [];
    for (const h of active) { await dispatch({ type: 'RESOLVE_HOLD', payload: { studentId: id, holdType: h.type } }); }
    if (active.length) toast.success('All holds resolved');
  };

  return (
    <div className="h-full w-full space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={(updated) => { onStudentUpdated(updated); setEditingStudent(null); }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{description}</p>
        </div>
        <PortalRefreshButton />
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(18rem,2fr)_minmax(30rem,3fr)]">
        <div className="w-full">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, email or student ID…" />
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { value: statusFilter, onChange: setStatusFilter, options: [['', 'All Statuses'], ['processing_all', 'All Processing'], ['registration', 'Registration'], ['documents_submitted', 'Docs Submitted'], ['documents_approved', 'Docs Approved'], ['advising_pending', 'Advising Pending'], ['advising_approved', 'Advising Approved'], ['payment_pending', 'Payment Pending'], ['payment_confirmed', 'Payment Confirmed'], ['validation_pending', 'Validation Pending'], ['enrolled', 'Enrolled']] },
            { value: paymentFilter, onChange: setPaymentFilter, options: [['', 'All Payments'], ['unpaid', 'Unpaid'], ['processing', 'Processing'], ['paid', 'Paid']] },
            { value: programFilter, onChange: setProgramFilter, options: [['', 'All Programs'], ...PROGRAMS.map(p => [p.id, p.id.toUpperCase()])] },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
              className="w-full min-w-0 border border-slate-200 text-xs font-semibold rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-slate-300 transition-colors">
              {sel.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          ))}
          {(statusFilter || programFilter || paymentFilter || searchQuery) && (
            <button onClick={() => { setStatusFilter(''); setProgramFilter(''); setPaymentFilter(''); setSearchQuery(''); }}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer sm:col-span-3">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary counts */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span className="font-bold text-slate-900">{filteredStudents.length}</span> students found
        {statusFilter && <span>· filtered by <span className="font-semibold text-indigo-600">{statusFilter}</span></span>}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[960px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">Program</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Payment</th>
              <th className="px-5 py-3.5">Admin Actions</th>
              <th className="px-5 py-3.5 text-center">Edit</th>
              <th className="px-5 py-3.5 text-center">Trash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredStudents.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-slate-400 text-sm">No matching student records found.</td></tr>
            ) : filteredStudents.map((stud) => {
              const progName = PROGRAMS.find(p => p.id === stud.programId)?.name || 'Not Chosen';
              const hasActiveHolds = stud.holds?.some(h => h.status === 'active');
              return (
                <tr key={stud.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {(stud.firstName?.[0] || 'S')}{(stud.lastName?.[0] || 'T')}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{stud.firstName || 'Anonymous'} {stud.lastName || 'Applicant'}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{stud.studentId || stud.id}</p>
                        {stud.email && <p className="text-[10px] text-slate-400">{stud.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {stud.programId ? (
                      <>
                        <p className="font-bold text-slate-800">{stud.programId.toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[140px] truncate">{progName}</p>
                      </>
                    ) : <span className="text-slate-400 italic">Not chosen</span>}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={stud.status} />
                    {hasActiveHolds && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-500">{stud.holds.filter(h => h.status === 'active').length} hold(s)</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={['paid', 'partial'].includes(stud.paymentStatus) ? 'success' : stud.paymentStatus === 'processing' ? 'warning' : 'neutral'}>
                      {stud.paymentStatus === 'partial' ? 'Downpayment Confirmed' : stud.paymentStatus === 'paid' ? 'Fully Paid' : stud.paymentStatus || 'Unpaid'}
                    </Badge>
                    {stud.totalTuition > 0 && <p className="text-[10px] text-slate-400 mt-1">₱{stud.totalTuition?.toLocaleString()}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                      {hasActiveHolds && (
                        <ActionBtn color="rose" onClick={() => handleResolveHolds(stud.id, stud)} label="Resolve Holds" />
                      )}
                      {stud.status === 'documents_submitted' && <ActionBtn color="indigo" onClick={() => handleOverrideAdmission(stud.id)} label="Approve documents" />}
                      {stud.status === 'advising_pending' && <ActionBtn color="purple" onClick={() => handleOverrideAdvising(stud.id, stud)} label="Approve advising" />}
                      {['payment_pending', 'processing'].includes(stud.status) && <ActionBtn color="emerald" onClick={() => handleOverridePayment(stud.id)} label="Confirm payment" />}
                      {stud.status === 'validation_pending' && <ActionBtn color="blue" onClick={() => handleOverrideFinalize(stud.id)} label="Finalize enrollment" />}
                      {stud.status === 'enrolled' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> Enrolled
                        </span>
                      )}
                      {!['documents_submitted', 'advising_pending', 'payment_pending', 'processing', 'validation_pending', 'enrolled'].includes(stud.status) && !hasActiveHolds && (
                        <span className="text-[10px] text-slate-400">Awaiting progress</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button type="button" onClick={() => setEditingStudent(stud)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer" title="Edit student record" aria-label={`Edit ${stud.firstName} ${stud.lastName}`}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button type="button" onClick={() => onTrash(stud.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer" title="Move to trash" aria-label={`Move ${stud.firstName} ${stud.lastName} to trash`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBtn({ color, onClick, label }) {
  const cls = {
    indigo: 'bg-white hover:bg-blue-50 text-univ-blue border-blue-200',
    purple: 'bg-white hover:bg-blue-50 text-univ-blue border-blue-200',
    emerald: 'bg-white hover:bg-blue-50 text-univ-blue border-blue-200',
    blue: 'bg-white hover:bg-blue-50 text-univ-blue border-blue-200',
    rose: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${cls[color] || cls.indigo}`}>
      {label}
    </button>
  );
}

// ─── Trash Tab ─────────────────────────────────────────────────────────────────
function TrashTab() {
  const { confirm } = useConfirm();
  const [trashedStudents, setTrashedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const loadTrashed = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/students/deleted');
      const data = await safeJson(res);
      setTrashedStudents(data);
    } catch {
      toast.error('Failed to load trash');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTrashed(); }, [loadTrashed]);

  const archiveReason = useCallback((student) => {
    if (student.archivedReason) return student.archivedReason;
    const auditEntry = [...(student.auditLogs || [])]
      .reverse()
      .find((entry) => /archiv|trash|delete/i.test(entry.action || ''));
    return auditEntry?.action || 'Reason not recorded';
  }, []);

  const archiveDate = useCallback((student) => student.archivedAt || student.updatedAt || student.createdAt, []);

  const termOptions = useMemo(() => [...new Set(
    trashedStudents.map((student) => student.lastEnrolledTerm || student.academicTerm).filter(Boolean)
  )].sort().reverse(), [trashedStudents]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return trashedStudents
      .filter((student) => {
        const term = student.lastEnrolledTerm || student.academicTerm || '';
        const reason = archiveReason(student);
        const reasonKind = /inactive|missing|consecutive semester/i.test(reason)
          ? 'inactive'
          : /manual|administrator|trash/i.test(reason)
            ? 'manual'
            : 'legacy';
        const searchable = [
          student.id,
          student.studentId,
          student.firstName,
          student.lastName,
          student.email,
          student.schoolEmail,
        ].filter(Boolean).join(' ').toLowerCase();

        return (!query || searchable.includes(query))
          && (!programFilter || student.programId === programFilter)
          && (!termFilter || term === termFilter)
          && (!reasonFilter || reasonKind === reasonFilter);
      })
      .sort((a, b) => {
        if (sortOrder === 'oldest') return new Date(archiveDate(a) || 0) - new Date(archiveDate(b) || 0);
        if (sortOrder === 'name') {
          return `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(`${b.lastName || ''} ${b.firstName || ''}`);
        }
        if (sortOrder === 'studentId') return String(a.studentId || a.id || '').localeCompare(String(b.studentId || b.id || ''));
        return new Date(archiveDate(b) || 0) - new Date(archiveDate(a) || 0);
      });
  }, [archiveDate, archiveReason, programFilter, reasonFilter, searchQuery, sortOrder, termFilter, trashedStudents]);

  const handleRestore = async (student) => {
    const name = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.studentId || student.id;
    const ok = await confirm({
      title: 'Restore Student',
      message: `Restore ${name}? Their account and student record will become active again. Class membership is not changed automatically.`,
      confirmText: 'Restore Student',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!ok) return;
    try {
      const res = await authFetch(`/api/admin/students/${student.id}/restore`, { method: 'POST' });
      await safeJson(res);
      toast.success('Student restored');
      loadTrashed();
    } catch (error) { toast.error(error.message || 'Failed to restore'); }
  };
  const handlePermanentDelete = async (id) => {
    const ok = await confirm({
      title: 'Permanently Delete Student',
      message: 'This student record will be completely erased from the database and cannot be recovered. Are you sure?',
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await authFetch(`/api/admin/students/${id}/permanent`, { method: 'DELETE' });
      toast.success('Permanently deleted');
      loadTrashed();
    } catch { toast.error('Failed to delete permanently'); }
  };

  return (
    <div className="h-full w-full space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Archived students</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Search, review, restore, or permanently remove archived records.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">Archived student records</p>
          <p className="text-xs text-amber-700 mt-0.5">Restoring reactivates the record only. Permanent deletion cannot be undone.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_220px_180px_190px]">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search name, email, or student ID…"
            />
            <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All programs</option>
              {PROGRAMS.map((program) => <option key={program.id} value={program.id}>{program.id.toUpperCase()}</option>)}
            </select>
            <select value={termFilter} onChange={(event) => setTermFilter(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All last enrolled terms</option>
              {termOptions.map((term) => <option key={term} value={term}>{term}</option>)}
            </select>
            <select value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All archive reasons</option>
              <option value="inactive">Inactive students</option>
              <option value="manual">Manually archived</option>
              <option value="legacy">Reason not recorded</option>
            </select>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="newest">Newest archived first</option>
              <option value="oldest">Oldest archived first</option>
              <option value="name">Name A–Z</option>
              <option value="studentId">Student ID A–Z</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{filteredStudents.length} of {trashedStudents.length} archived students</span>
            {(searchQuery || programFilter || termFilter || reasonFilter) && (
              <button type="button" onClick={() => { setSearchQuery(''); setProgramFilter(''); setTermFilter(''); setReasonFilter(''); }} className="font-semibold text-indigo-600 hover:text-indigo-700">
                Clear filters
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Program</th>
                <th className="px-5 py-3.5">Last enrolled term</th>
                <th className="px-5 py-3.5">Archived</th>
                <th className="px-5 py-3.5">Last status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-400">{trashedStudents.length ? 'No archived students match these filters.' : 'No archived students.'}</td></tr>
              ) : filteredStudents.map((stud) => {
                const archivedOn = archiveDate(stud);
                return (
                  <tr key={stud.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
                          {(stud.firstName?.[0] || 'S')}{(stud.lastName?.[0] || 'T')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-600">{stud.firstName || 'Anonymous'} {stud.lastName || 'Applicant'}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{stud.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-medium">{stud.programId?.toUpperCase() || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{stud.lastEnrolledTerm || stud.academicTerm || 'Not recorded'}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{archivedOn ? new Date(archivedOn).toLocaleDateString() : 'Date not recorded'}</p>
                      <p className="mt-1 max-w-[240px] text-[10px] leading-4 text-slate-500">{archiveReason(stud)}</p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={stud.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleRestore(stud)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-bold transition-colors cursor-pointer">
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                      <button onClick={() => handlePermanentDelete(stud.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-bold transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Staff Management Tab ───────────────────────────────────────────────────────
function StaffTab() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', firstName: '', lastName: '', role: 'admission', password: '' });
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/users');
      const data = await safeJson(res);
      setUsers(data);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSubmit = async () => {
    if (!form.email || !form.username || !form.role) { toast.error('Please fill in all required fields'); return; }
    if (!editingUser && !form.password) { toast.error('Password is required for new staff accounts'); return; }
    setSaving(true);
    try {
      if (editingUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await authFetch(`/api/admin/users/${editingUser._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        toast.success('Staff account updated');
      } else {
        await authFetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        toast.success('Staff account created');
      }
      setShowForm(false); setEditingUser(null);
      setForm({ username: '', email: '', firstName: '', lastName: '', role: 'admission', password: '' });
      loadUsers();
    } catch (err) { toast.error(err.message || 'Failed to save staff'); }
    finally { setSaving(false); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({ username: user.username, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '', role: user.role, password: '' });
    setShowForm(true);
  };

  const handleDelete = async (id, user) => {
    const ok = await confirm({
      title: 'Remove Staff Account',
      message: `Are you sure you want to delete the account for "${user?.firstName || user?.username}"? This action cannot be undone.`,
      confirmText: 'Delete Account',
      cancelText: 'Keep Account',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      toast.success('Staff account removed');
      loadUsers();
    } catch (err) { toast.error(err.message || 'Failed to delete'); }
  };

  const roleIcons = { admin: Building2, instructor: GraduationCap, admission: BookOpen, adviser: GraduationCap, accounting: CreditCard, registrar: FileText };

  return (
    <div className="h-full w-full space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff accounts</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage all system users and their department access levels.</p>
        </div>
        <button onClick={() => { setEditingUser(null); setForm({ username: '', email: '', firstName: '', lastName: '', role: 'admission', password: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md transition-colors cursor-pointer shadow-sm">
          <Plus className="w-4 h-4" /> Add Staff Account
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900">{editingUser ? 'Edit Staff Account' : 'Create New Staff Account'}</h3>
            <button onClick={() => { setShowForm(false); setEditingUser(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'First Name', key: 'firstName', placeholder: 'Juan' },
              { label: 'Last Name', key: 'lastName', placeholder: 'Dela Cruz' },
              { label: 'Username *', key: 'username', placeholder: 'jdelacruz' },
              { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'juan@ncst.edu.ph' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role / Department *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="admin">Admin (Superuser)</option>
                <option value="instructor">Instructor</option>
                <option value="admission">Admission Office</option>
                <option value="adviser">Academic Adviser</option>
                <option value="accounting">Accounting Office</option>
                <option value="registrar">Registrar Office</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Password {editingUser ? '(leave blank to keep)' : '*'}
              </label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={editingUser ? '••••••••' : 'Min. 6 characters'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-slate-100">
            <button onClick={() => { setShowForm(false); setEditingUser(null); }} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md cursor-pointer transition-colors disabled:opacity-60 shadow-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editingUser ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Username</th>
                <th className="px-5 py-3.5">Department / Role</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-slate-400">No staff accounts found.</td></tr>
              ) : users.map(user => {
                const RoleIcon = roleIcons[user.role] || Users;
                return (
                  <tr key={user._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{user.firstName || ''} {user.lastName || ''}</p>
                          {!user.firstName && <p className="text-slate-400 italic text-[10px]">No name set</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600 text-xs">@{user.username}</td>
                    <td className="px-5 py-4">
                      <Badge tone={ROLE_TONES[user.role] || 'neutral'}>
                        <RoleIcon className="w-3 h-3" />
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{user.email}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer" title="Edit account" aria-label={`Edit ${user.username} account`}>
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(user._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer" title="Delete account" aria-label={`Delete ${user.username} account`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────────────────────────
function SettingsTab() {
  const { confirm } = useConfirm();
  const [settings, setSettings] = useState({ activeTerm: '', enrollmentOpen: true, systemMaintenance: false, announcement: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/settings');
        const data = await safeJson(res);
        setSettings(data);
      } catch { toast.error('Failed to load settings'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const updated = await safeJson(res);
      setSettings(updated);
      toast.success('Settings saved successfully');
    } catch (err) { toast.error(err.message || 'Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleAdvanceSemester = async () => {
    const isConfirmed = await confirm({
      title: 'Advance academic term?',
      message: 'This changes the active term and archives students who have not enrolled for two consecutive semesters. Review the active term before continuing.',
      confirmText: 'Advance Term',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    
    setSaving(true);
    try {
      const res = await authFetch('/api/settings/advance-semester', { method: 'POST' });
      const data = await safeJson(res);
      setSettings(data.settings);
      toast.success(`System advanced to ${data.newTerm}`);
      // Refresh the page to ensure all components have the newest settings
      window.location.reload();
    } catch (err) { toast.error(err.message || 'Failed to advance semester'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="h-full w-full space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <PortalPageHeader
        title="System configuration"
        description="Configure the active term, enrollment access, maintenance state, and applicant announcements."
      />

      <div className="max-w-3xl space-y-5">
      {/* Term Settings */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center">
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Academic Term</h3>
            <p className="text-xs text-slate-400">Configure the current enrollment term</p>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Active Academic Term</label>
          <input
            value={settings.activeTerm}
            onChange={e => setSettings(p => ({ ...p, activeTerm: e.target.value }))}
            placeholder="1st Semester 2026-2027"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
          />
          <p className="text-[10px] text-slate-500 mt-2">Use format: 1st Semester 2026-2027. Saving activates matching academic-term record.</p>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-xs font-semibold text-amber-900">Term advancement changes student records</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">Inactive students may be archived. This action requires confirmation.</p>
              </div>
            </div>
            <button
              onClick={handleAdvanceSemester}
              disabled={saving}
              className="mt-3 rounded-md border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 shadow-sm transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Advance Academic Term & Archive Inactive Students
            </button>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-amber-100 rounded-md flex items-center justify-center">
            <Sliders className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">System Toggles</h3>
            <p className="text-xs text-slate-400">Enable or disable key system features</p>
          </div>
        </div>
        {[
          { key: 'enrollmentOpen', label: 'Enrollment Open', desc: 'Allow new applicants to begin the enrollment process', iconClass: 'bg-indigo-50 text-indigo-600', icon: Unlock },
          { key: 'systemMaintenance', label: 'Maintenance Mode', desc: 'Show a maintenance message to all users', iconClass: 'bg-amber-50 text-amber-600', icon: AlertTriangle },
        ].map(toggle => {
          const Icon = toggle.icon;
          return (
            <div key={toggle.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${toggle.iconClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{toggle.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{toggle.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(p => ({ ...p, [toggle.key]: !p[toggle.key] }))}
                role="switch"
                aria-checked={settings[toggle.key]}
                aria-label={toggle.label}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${settings[toggle.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${settings[toggle.key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Announcement */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-rose-100 rounded-md flex items-center justify-center">
            <Bell className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">System Announcement</h3>
            <p className="text-xs text-slate-400">Displayed prominently across the applicant portal</p>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Announcement Message</label>
          <textarea value={settings.announcement} onChange={e => setSettings(p => ({ ...p, announcement: e.target.value }))}
            rows={4} placeholder="Enter an important system-wide notice here…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all resize-none" />
          <p className="text-[10px] text-slate-400 mt-1">Leave blank to hide announcement banner.</p>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-md transition-colors cursor-pointer disabled:opacity-60 shadow-sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
      </button>
      </div>
    </div>
  );
}

// ─── Navigation items ──────────────────────────────────────────────────────────
// ─── Main Component ────────────────────────────────────────────────────────────
export default function DashboardView() {
  const { state, dispatch } = useEnrollment();
  const { confirm } = useConfirm();
  const { students } = state;
  const [activeTab, setActiveTab] = useState('analytics');
  const [, setStatusFilter] = useState('');
  const [, setProgramFilter] = useState('');
  const [, setPaymentFilter] = useState('');

  const visibleStudents = useMemo(() => students.filter(s => !s.isDeleted && (s.firstName?.trim() || s.lastName?.trim())), [students]);

  const metrics = useMemo(() => {
    const totalEnrolled = visibleStudents.filter(s => s.status === 'enrolled').length;
    const pendingValidation = visibleStudents.filter(s => s.status === 'validation_pending').length;
    const activeProcessing = visibleStudents.filter(s => s.status !== 'registration' && s.status !== 'enrolled').length;
    const revenue = visibleStudents.filter(s => ['paid', 'partial'].includes(s.paymentStatus)).reduce(
      (sum, s) => sum + (s.amountPaid || (s.paymentStatus === 'paid' ? s.totalTuition || 0 : 0)),
      0
    );
    const programData = PROGRAMS.map(prog => ({
      name: prog.id.toUpperCase(),
      count: visibleStudents.filter(s => s.programId === prog.id && s.status === 'enrolled').length,
    }));
    const statusData = [
      { name: 'Enrolled', value: totalEnrolled },
      { name: 'Processing', value: activeProcessing },
      { name: 'Pending Admin', value: pendingValidation },
    ];
    return { totalEnrolled, pendingValidation, activeProcessing, revenue, programData, statusData };
  }, [visibleStudents]);

  const handleTrashStudent = async (studentId, studentName) => {
    const ok = await confirm({
      title: 'Move to Trash',
      message: `Move "${studentName || studentId}" to the trash bin? You can restore them later from the Trash tab.`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await authFetch(`/api/admin/students/${studentId}`, { method: 'DELETE' });
      toast.success('Student moved to trash');
    } catch (err) {
      toast.error(err.message || 'Failed to trash student');
    }
  };

  const handleStudentUpdated = () => {
    // The context's polling will re-fetch automatically, but we can trigger local update
  };

  const sidebar = <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />;

  return (
    <PortalShell sidebar={sidebar} portalTitle="Admin Portal">
      <main className="h-full min-w-0 overflow-hidden flex flex-col">
          {activeTab === 'analytics' && (
            <AnalyticsTab
              metrics={metrics}
              visibleStudents={visibleStudents}
              setActiveTab={setActiveTab}
              setStatusFilter={setStatusFilter}
              setProgramFilter={setProgramFilter}
              setPaymentFilter={setPaymentFilter}
            />
          )}
          {activeTab === 'applicants' && (
            <DirectoryTab
              title="Applicant Directory"
              description="Review applicant records and manage enrollment progress."
              visibleStudents={visibleStudents.filter(s => !s.studentId && s.id?.startsWith('APP-'))}
              onTrash={handleTrashStudent}
              onStudentUpdated={handleStudentUpdated}
              dispatch={dispatch}
            />
          )}
          {activeTab === 'students' && (
            <DirectoryTab
              title="Student Database"
              description="Manage official student records, statuses, and account details."
              visibleStudents={visibleStudents.filter(s => s.studentId || s.id?.startsWith('STU-'))}
              onTrash={handleTrashStudent}
              onStudentUpdated={handleStudentUpdated}
              dispatch={dispatch}
            />
          )}
          {activeTab === 'trash' && <TrashTab />}
          {activeTab === 'staff' && <StaffTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'courses' && <CourseManagementTab />}
      </main>
    </PortalShell>
  );
}
