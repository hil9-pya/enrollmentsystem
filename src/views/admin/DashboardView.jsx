import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { PROGRAMS, SUBJECTS } from '../../data/mockData';
import {
  Users, FileCheck, DollarSign, Clock, Search, Trash2, ShieldAlert,
  CheckCircle, Sliders, RotateCcw, BarChart2, Settings, UserPlus,
  Edit3, X, Save, Eye, Download, AlertTriangle, ChevronRight,
  Shield, BookOpen, CreditCard, GraduationCap, TrendingUp, Activity,
  BellRing, Lock, Unlock, Calendar, Bell, Plus, Loader2, FileText,
  UserCog, Building2, RefreshCw, ExternalLink, ArrowRight, LayoutDashboard,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { toast } from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import { useConfirm } from '../../context/ConfirmationContext';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
const ROLE_COLORS = {
  admin: 'bg-rose-100 text-rose-700 border-rose-200',
  admission: 'bg-blue-100 text-blue-700 border-blue-200',
  adviser: 'bg-purple-100 text-purple-700 border-purple-200',
  accounting: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  registrar: 'bg-amber-100 text-amber-700 border-amber-200',
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
    try { const d = await res.json(); errorMsg = d.error || d.message || errorMsg; } catch (_) {}
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard
          title="Total Enrolled" value={metrics.totalEnrolled}
          icon={<GraduationCap className="w-5 h-5" />} gradient="from-indigo-500 to-indigo-600"
          sub={`${metrics.totalEnrolled > 0 ? '+' : ''}${metrics.totalEnrolled} this term`}
          onClick={() => { setActiveTab('directory'); setStatusFilter('enrolled'); setProgramFilter(''); setPaymentFilter(''); }}
        />
        <MetricCard
          title="Pending Validation" value={metrics.pendingValidation}
          icon={<FileCheck className="w-5 h-5" />} gradient="from-amber-400 to-amber-500"
          sub="Awaiting final check"
          onClick={() => { setActiveTab('directory'); setStatusFilter('validation_pending'); setProgramFilter(''); setPaymentFilter(''); }}
        />
        <MetricCard
          title="Active Processing" value={metrics.activeProcessing}
          icon={<Activity className="w-5 h-5" />} gradient="from-blue-500 to-blue-600"
          sub="In pipeline"
          onClick={() => { setActiveTab('directory'); setStatusFilter('processing_all'); setProgramFilter(''); setPaymentFilter(''); }}
        />
        <MetricCard
          title="Total Revenue" value={`₱${metrics.revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          icon={<DollarSign className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600"
          sub="From paid tuitions"
          onClick={() => { setActiveTab('directory'); setStatusFilter(''); setProgramFilter(''); setPaymentFilter('paid'); }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Enrollment by Program */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
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
                <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={(data) => { if (data?.name) { setActiveTab('directory'); setProgramFilter(data.name.toLowerCase()); setStatusFilter('enrolled'); setPaymentFilter(''); }}}>
                  {metrics.programData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pipeline Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Enrollment workflow distribution</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={metrics.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value"
                  onClick={(data) => { if (!data?.name) return; setActiveTab('directory'); setProgramFilter(''); setPaymentFilter(''); if (data.name === 'Enrolled') setStatusFilter('enrolled'); else if (data.name === 'Processing') setStatusFilter('processing_all'); else setStatusFilter('validation_pending'); }}>
                  {metrics.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 border-t border-slate-50 pt-4">
            {metrics.statusData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      {monthlyData.length > 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
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
                <defs>
                  <linearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fill="url(#gradFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Enrollees */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recently Enrolled</h2>
          <button onClick={() => { setActiveTab('directory'); setStatusFilter('enrolled'); }} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 cursor-pointer">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {recentEnrollees.length > 0 ? recentEnrollees.map((s) => (
            <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Student Record</h3>
              <p className="text-[10px] text-slate-400 font-mono">{student.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">First Name</label>
              <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Last Name</label>
              <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Program</label>
              <select value={form.programId} onChange={e => setForm(p => ({ ...p, programId: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="">— Not Selected —</option>
                {PROGRAMS.map(prog => <option key={prog.id} value={prog.id}>{prog.id.toUpperCase()} – {prog.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Home Address</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Enrollment Type</label>
              <select value={form.enrollmentType} onChange={e => setForm(p => ({ ...p, enrollmentType: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="">— None —</option>
                <option value="new">New Student</option>
                <option value="transferee">Transferee</option>
                <option value="returning">Returning</option>
                <option value="cross_enrollee">Cross Enrollee</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Payment Status</label>
              <select value={form.paymentStatus} onChange={e => setForm(p => ({ ...p, paymentStatus: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Enrollment Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
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
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer disabled:opacity-60 shadow-sm shadow-indigo-200">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Directory Tab ─────────────────────────────────────────────────────────────
function DirectoryTab({ visibleStudents, onTrash, onStudentUpdated, dispatch }) {
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
    <div className="space-y-5 animate-in fade-in duration-300">
      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={(updated) => { onStudentUpdated(updated); setEditingStudent(null); }}
        />
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search by name, email or student ID…"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: statusFilter, onChange: setStatusFilter, options: [['', 'All Statuses'], ['processing_all', 'All Processing'], ['registration', 'Registration'], ['documents_submitted', 'Docs Submitted'], ['documents_approved', 'Docs Approved'], ['advising_pending', 'Advising Pending'], ['advising_approved', 'Advising Approved'], ['payment_pending', 'Payment Pending'], ['payment_confirmed', 'Payment Confirmed'], ['validation_pending', 'Validation Pending'], ['enrolled', 'Enrolled']] },
            { value: paymentFilter, onChange: setPaymentFilter, options: [['', 'All Payments'], ['unpaid', 'Unpaid'], ['processing', 'Processing'], ['paid', 'Paid']] },
            { value: programFilter, onChange: setProgramFilter, options: [['', 'All Programs'], ...PROGRAMS.map(p => [p.id, p.id.toUpperCase()])] },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
              className="border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-slate-300 transition-all">
              {sel.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          ))}
          {(statusFilter || programFilter || paymentFilter || searchQuery) && (
            <button onClick={() => { setStatusFilter(''); setProgramFilter(''); setPaymentFilter(''); setSearchQuery(''); }}
              className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
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
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                        {(stud.firstName?.[0] || 'S')}{(stud.lastName?.[0] || 'T')}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{stud.firstName || 'Anonymous'} {stud.lastName || 'Applicant'}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{stud.id}</p>
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
                    <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-bold border rounded-lg uppercase tracking-wider ${
                      stud.paymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : stud.paymentStatus === 'processing' ? 'bg-amber-50 border-amber-100 text-amber-700'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>{stud.paymentStatus || 'unpaid'}</span>
                    {stud.totalTuition > 0 && <p className="text-[10px] text-slate-400 mt-1">₱{stud.totalTuition?.toLocaleString()}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                      {hasActiveHolds && (
                        <ActionBtn color="rose" onClick={() => handleResolveHolds(stud.id, stud)} label="Resolve Holds" />
                      )}
                      {stud.status === 'documents_submitted' && <ActionBtn color="indigo" onClick={() => handleOverrideAdmission(stud.id)} label="Approve Docs" />}
                      {stud.status === 'advising_pending' && <ActionBtn color="purple" onClick={() => handleOverrideAdvising(stud.id, stud)} label="Approve Advising" />}
                      {['payment_pending', 'processing'].includes(stud.status) && <ActionBtn color="emerald" onClick={() => handleOverridePayment(stud.id)} label="Confirm Payment" />}
                      {stud.status === 'validation_pending' && <ActionBtn color="blue" onClick={() => handleOverrideFinalize(stud.id)} label="Finalize Enrollment" />}
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
                    <button onClick={() => setEditingStudent(stud)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer" title="Edit student record">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => onTrash(stud.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer" title="Move to trash">
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
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    rose: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-1 text-[10px] font-bold border rounded-lg transition-all cursor-pointer ${cls[color] || cls.indigo}`}>
      {label}
    </button>
  );
}

// ─── Trash Tab ─────────────────────────────────────────────────────────────────
function TrashTab({ token }) {
  const { confirm } = useConfirm();
  const [trashedStudents, setTrashedStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrashed = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/students/deleted');
      const data = await safeJson(res);
      setTrashedStudents(data);
    } catch (err) {
      toast.error('Failed to load trash');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTrashed(); }, [loadTrashed]);

  const handleRestore = async (id) => {
    try {
      await authFetch(`/api/admin/students/${id}/restore`, { method: 'POST' });
      toast.success('Student restored');
      loadTrashed();
    } catch { toast.error('Failed to restore'); }
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
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">Trash Bin</p>
          <p className="text-xs text-amber-700 mt-0.5">Deleted students are stored here. You can restore them or permanently delete them from the database.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Program</th>
                <th className="px-5 py-3.5">Last Status</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5 text-center">Restore</th>
                <th className="px-5 py-3.5 text-center">Delete Permanently</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {trashedStudents.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-400">Trash bin is empty.</td></tr>
              ) : trashedStudents.map((stud) => {
                const prog = PROGRAMS.find(p => p.id === stud.programId);
                return (
                  <tr key={stud.id} className="hover:bg-slate-50/40 transition-colors opacity-75">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
                          {(stud.firstName?.[0] || 'S')}{(stud.lastName?.[0] || 'T')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-600">{stud.firstName || 'Anonymous'} {stud.lastName || 'Applicant'}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{stud.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-medium">{stud.programId?.toUpperCase() || '—'}</td>
                    <td className="px-5 py-4"><StatusBadge status={stud.status} /></td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg uppercase">{stud.paymentStatus || 'unpaid'}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handleRestore(stud.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer">
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handlePermanentDelete(stud.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                      </button>
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
    } catch (err) { toast.error('Failed to load staff'); }
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

  const roleIcons = { admin: Shield, admission: BookOpen, adviser: GraduationCap, accounting: CreditCard, registrar: FileText };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Staff Accounts</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage all system users and their department access levels.</p>
        </div>
        <button onClick={() => { setEditingUser(null); setForm({ username: '', email: '', firstName: '', lastName: '', role: 'admission', password: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-200">
          <Plus className="w-4 h-4" /> Add Staff Account
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 animate-in slide-in-from-top-2 duration-200">
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
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role / Department *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                <option value="admin">Admin (Superuser)</option>
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-slate-100">
            <button onClick={() => { setShowForm(false); setEditingUser(null); }} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer transition-all disabled:opacity-60 shadow-sm shadow-indigo-200">
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
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
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
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
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold border rounded-lg uppercase tracking-wider ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        <RoleIcon className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{user.email}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer" title="Edit account">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer" title="Delete account">
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

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-slate-900">System Configuration</h2>
        <p className="text-xs text-slate-400 mt-0.5">Configure global enrollment settings and system parameters.</p>
      </div>

      {/* Term Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Academic Term</h3>
            <p className="text-xs text-slate-400">Configure the current enrollment term</p>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Active Academic Term</label>
          <input value={settings.activeTerm} onChange={e => setSettings(p => ({ ...p, activeTerm: e.target.value }))}
            placeholder="e.g. 1st Semester 2026-2027"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all" />
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
            <Sliders className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">System Toggles</h3>
            <p className="text-xs text-slate-400">Enable or disable key system features</p>
          </div>
        </div>
        {[
          { key: 'enrollmentOpen', label: 'Enrollment Open', desc: 'Allow new applicants to begin the enrollment process', color: 'indigo', icon: Unlock },
          { key: 'systemMaintenance', label: 'Maintenance Mode', desc: 'Show a maintenance message to all users', color: 'amber', icon: AlertTriangle },
        ].map(toggle => {
          const Icon = toggle.icon;
          return (
            <div key={toggle.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${toggle.color}-50`}>
                  <Icon className={`w-3.5 h-3.5 text-${toggle.color}-600`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{toggle.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{toggle.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setSettings(p => ({ ...p, [toggle.key]: !p[toggle.key] }))}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${settings[toggle.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${settings[toggle.key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Announcement */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center">
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
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all resize-none" />
          <p className="text-[10px] text-slate-400 mt-1">Leave blank to hide announcement banner.</p>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60 shadow-sm shadow-indigo-200">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
      </button>
    </div>
  );
}

// ─── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ title, value, icon, gradient, sub, onClick }) {
  return (
    <div onClick={onClick}
      className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 group overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{title}</p>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{value}</p>
      <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </div>
  );
}

// ─── Navigation items ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'analytics', label: 'Analytics', icon: LayoutDashboard, desc: 'Overview & metrics' },
  { id: 'directory', label: 'Student Directory', icon: Users, desc: 'Manage applicants' },
  { id: 'trash', label: 'Trash Bin', icon: Trash2, desc: 'Deleted records' },
  { id: 'staff', label: 'Staff Management', icon: UserCog, desc: 'System users' },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'System configuration' },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DashboardView() {
  const { state, dispatch } = useEnrollment();
  const { confirm } = useConfirm();
  const { students } = state;
  const [activeTab, setActiveTab] = useState('analytics');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const visibleStudents = useMemo(() => students.filter(s => !s.isDeleted), [students]);

  const metrics = useMemo(() => {
    const totalEnrolled = visibleStudents.filter(s => s.status === 'enrolled').length;
    const pendingValidation = visibleStudents.filter(s => s.status === 'validation_pending').length;
    const activeProcessing = visibleStudents.filter(s => s.status !== 'registration' && s.status !== 'enrolled').length;
    const revenue = visibleStudents.filter(s => s.paymentStatus === 'paid').reduce((sum, s) => sum + (s.totalTuition || 0), 0);
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

  const handleStudentUpdated = (updated) => {
    // The context's polling will re-fetch automatically, but we can trigger local update
  };

  const activeNav = NAV_ITEMS.find(n => n.id === activeTab);

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
        {/* Portal header */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">Admin Portal</p>
              <p className="text-[10px] text-slate-400">NCST Enrollment System</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                  isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : ''}`}>{item.label}</p>
                  <p className={`text-[9px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>{item.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick stats footer */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enrolled</span>
              <span className="text-xs font-extrabold text-indigo-600">{metrics.totalEnrolled}</span>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
              <span className="text-xs font-extrabold text-amber-600">{metrics.pendingValidation}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processing</span>
              <span className="text-xs font-extrabold text-blue-600">{metrics.activeProcessing}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mb-1">
              <span>Admin Portal</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-indigo-600 font-semibold">{activeNav?.label}</span>
            </div>
            <h1 className="text-base font-extrabold text-slate-900">{activeNav?.label}</h1>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium">{visibleStudents.length} active students</span>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-8">
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
          {activeTab === 'directory' && (
            <DirectoryTab
              visibleStudents={visibleStudents}
              onTrash={handleTrashStudent}
              onStudentUpdated={handleStudentUpdated}
              dispatch={dispatch}
            />
          )}
          {activeTab === 'trash' && <TrashTab />}
          {activeTab === 'staff' && <StaffTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
