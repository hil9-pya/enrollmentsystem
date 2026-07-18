import React, { useMemo, useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { PROGRAMS, SUBJECTS } from '../../data/mockData';
import { Users, FileCheck, DollarSign, Clock, ArrowUpRight, Search, Trash2, ShieldAlert, RefreshCw, CheckCircle, Sliders, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e'];

export default function DashboardView() {
  const { state, dispatch } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'directory' | 'deleted'
  const [searchQuery, setSearchQuery] = useState('');
  const [deletedStudentIds, setDeletedStudentIds] = useState(new Set());
  const [permanentlyDeletedStudentIds, setPermanentlyDeletedStudentIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Filter students based on deleted/permanently deleted IDs state
  const visibleStudents = useMemo(() => {
    return students.filter(s => !deletedStudentIds.has(s.id) && !permanentlyDeletedStudentIds.has(s.id));
  }, [students, deletedStudentIds, permanentlyDeletedStudentIds]);

  // List of recently deleted students (in trash, not permanently deleted)
  const recentlyDeletedStudents = useMemo(() => {
    return students.filter(s => deletedStudentIds.has(s.id) && !permanentlyDeletedStudentIds.has(s.id));
  }, [students, deletedStudentIds, permanentlyDeletedStudentIds]);

  // Compute metrics based on visible students only
  const metrics = useMemo(() => {
    const totalEnrolled = visibleStudents.filter(s => s.status === 'enrolled').length;
    const pendingValidation = visibleStudents.filter(s => s.status === 'validation_pending').length;
    const activeProcessing = visibleStudents.filter(s => s.status !== 'registration' && s.status !== 'enrolled').length;
    
    const revenue = visibleStudents
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + (s.totalTuition || 0), 0);

    // Group by program for enrolled students
    const programData = PROGRAMS.map(prog => {
      const count = visibleStudents.filter(s => s.programId === prog.id && s.status === 'enrolled').length;
      return { name: prog.id.toUpperCase(), count };
    });

    const statusData = [
      { name: 'Enrolled', value: totalEnrolled },
      { name: 'Processing', value: activeProcessing },
      { name: 'Pending Admin', value: pendingValidation }
    ];

    return { totalEnrolled, pendingValidation, activeProcessing, revenue, programData, statusData };
  }, [visibleStudents]);

  const recentEnrollees = useMemo(() => {
    return visibleStudents
      .filter(s => s.status === 'enrolled')
      .slice(-5);
  }, [visibleStudents]);

  // Directory listing with search and filters
  const filteredStudents = useMemo(() => {
    return visibleStudents.filter(s => {
      // Search term check
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q === '' || 
        s.id.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q));

      // Status check
      const matchesStatus = statusFilter === '' 
        ? true 
        : statusFilter === 'processing_all'
        ? s.status !== 'registration' && s.status !== 'enrolled'
        : s.status === statusFilter;

      // Program check
      const matchesProgram = programFilter === '' || s.programId === programFilter;

      // Payment status check
      const matchesPayment = paymentFilter === '' || s.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesProgram && matchesPayment;
    });
  }, [visibleStudents, searchQuery, statusFilter, programFilter, paymentFilter]);

  // Student deletion (moved to trash bin)
  const handleDeleteFrontend = (studentId) => {
    setDeletedStudentIds(prev => {
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });
    toast.success(`Student ${studentId} moved to Recently Deleted`);
  };

  // Restore student from trash bin
  const handleRestoreStudent = (studentId) => {
    setDeletedStudentIds(prev => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
    toast.success(`Student ${studentId} restored successfully`);
  };

  // Permanent student deletion (removed from all UI states)
  const handlePermanentDeleteFrontend = (studentId) => {
    setPermanentlyDeletedStudentIds(prev => {
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });
    toast.success(`Student ${studentId} permanently deleted from view`);
  };

  // Status modification database dispatcher
  const handleUpdateStatus = async (studentId, newStatus) => {
    try {
      await dispatch({
        type: 'UPDATE_STUDENT_BY_ID',
        payload: { studentId, updates: { status: newStatus } }
      });
      toast.success(`Updated status to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update student status');
    }
  };

  // Payment status modification database dispatcher
  const handleUpdatePaymentStatus = async (studentId, newPaymentStatus) => {
    try {
      await dispatch({
        type: 'UPDATE_STUDENT_BY_ID',
        payload: { studentId, updates: { paymentStatus: newPaymentStatus } }
      });
      toast.success(`Updated payment to ${newPaymentStatus}`);
    } catch (err) {
      toast.error('Failed to update payment status');
    }
  };

  // Administrative Overrides database dispatchers
  const handleOverrideAdmission = async (studentId) => {
    try {
      await dispatch({
        type: 'APPROVE_DOCUMENTS',
        payload: { studentId, notes: 'Supervised bypass by System Admin' }
      });
      toast.success(`Documents approved (Bypassed Admission)`);
    } catch (err) {
      toast.error('Failed to override admission clearance');
    }
  };

  const handleOverrideAdvising = async (studentId) => {
    try {
      const stud = visibleStudents.find(s => s.id === studentId);
      if (!stud?.selectedSubjects || stud.selectedSubjects.length === 0) {
        // Pre-select fallback subject matching program to make advising clearance valid
        const progId = stud?.programId || 'bscs';
        const fallbackSub = SUBJECTS.find(sub => sub.programId === progId);
        if (fallbackSub) {
          await dispatch({
            type: 'UPDATE_STUDENT_SUBJECTS',
            payload: { studentId, subjects: [{ subjectId: fallbackSub.id }] }
          });
        }
      }
      await dispatch({
        type: 'APPROVE_ADVISING',
        payload: { studentId, notes: 'Supervised bypass by System Admin' }
      });
      toast.success(`Advising clearance approved (Bypassed Advising)`);
    } catch (err) {
      toast.error('Failed to override advising clearance');
    }
  };

  const handleOverridePayment = async (studentId) => {
    try {
      await dispatch({
        type: 'CONFIRM_PAYMENT',
        payload: { studentId }
      });
      toast.success(`Payment clearance confirmed (Bypassed Accounting)`);
    } catch (err) {
      toast.error('Failed to override accounting clearance');
    }
  };

  const handleOverrideFinalize = async (studentId) => {
    try {
      await dispatch({
        type: 'VALIDATE_ENROLLMENT',
        payload: { studentId }
      });
      toast.success(`Enrollment finalized (Bypassed Registrar)`);
    } catch (err) {
      toast.error('Failed to override final certification');
    }
  };

  const handleResolveHold = async (studentId, type) => {
    try {
      await dispatch({
        type: 'RESOLVE_HOLD',
        payload: { studentId, holdType: type }
      });
      toast.success(`${type} hold resolved`);
    } catch (err) {
      toast.error('Failed to resolve hold');
    }
  };

  const handleSetReturning = async (studentId) => {
    try {
      await dispatch({
        type: 'SET_RETURNING',
        payload: { studentId }
      });
      toast.success(`Student flagged as AWOL/Returning`);
    } catch (err) {
      toast.error('Failed to flag student');
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-univ-navy">System Analytics &amp; Administration</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Supervisor console to oversee metrics, modify student lifecycles, and bypass workflow locks.</p>
        </div>
        <button 
          type="button"
          onClick={() => toast.success('Report download initiated')}
          className="w-fit flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
        >
          Download System Report <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-slate-200 mb-6 bg-slate-150 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-white text-univ-indigo shadow-sm'
              : 'text-slate-500 hover:text-slate-750'
          }`}
        >
          Analytics Dashboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`px-5 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'directory'
              ? 'bg-white text-univ-indigo shadow-sm'
              : 'text-slate-500 hover:text-slate-755'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          Student Directory &amp; Overrides
        </button>
        {recentlyDeletedStudents.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('deleted')}
            className={`px-5 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deleted'
                ? 'bg-white text-univ-indigo shadow-sm'
                : 'text-slate-500 hover:text-slate-755'
            }`}
          >
            Recently Deleted
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-rose-100 text-rose-700 rounded-full font-extrabold animate-pulse">
              {recentlyDeletedStudents.length}
            </span>
          </button>
        )}
      </div>

      {/* Restoration Alert */}
      {recentlyDeletedStudents.length > 0 && activeTab !== 'deleted' && (
        <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-xs font-medium text-amber-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span>You have hidden {recentlyDeletedStudents.length} student record{recentlyDeletedStudents.length > 1 ? 's' : ''} in this view.</span>
          </div>
          <button 
            type="button"
            onClick={() => setActiveTab('deleted')} 
            className="w-fit px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all cursor-pointer shadow-sm"
          >
            Show Recently Deleted Records
          </button>
        </div>
      )}

      {/* Tab Contents: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Total Enrolled" 
              value={metrics.totalEnrolled} 
              icon={<Users className="w-5 h-5" />} 
              color="bg-indigo-50/70 text-univ-indigo border border-indigo-100" 
              onClick={() => {
                setActiveTab('directory');
                setStatusFilter('enrolled');
                setProgramFilter('');
                setPaymentFilter('');
              }}
            />
            <MetricCard 
              title="Pending Validation" 
              value={metrics.pendingValidation} 
              icon={<FileCheck className="w-5 h-5" />} 
              color="bg-amber-50/70 text-univ-gold border border-amber-100" 
              onClick={() => {
                setActiveTab('directory');
                setStatusFilter('validation_pending');
                setProgramFilter('');
                setPaymentFilter('');
              }}
            />
            <MetricCard 
              title="Active Processing" 
              value={metrics.activeProcessing} 
              icon={<Clock className="w-5 h-5" />} 
              color="bg-blue-50/70 text-univ-blue border border-blue-100" 
              onClick={() => {
                setActiveTab('directory');
                setStatusFilter('processing_all');
                setProgramFilter('');
                setPaymentFilter('');
              }}
            />
            <MetricCard 
              title="Total Revenue" 
              value={`₱${metrics.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
              icon={<DollarSign className="w-5 h-5" />} 
              color="bg-emerald-50/70 text-emerald-600 border border-emerald-100" 
              onClick={() => {
                setActiveTab('directory');
                setStatusFilter('');
                setProgramFilter('');
                setPaymentFilter('paid');
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-premium">
              <h2 className="text-xs font-bold text-univ-navy mb-6 uppercase tracking-wider">Enrollment by Course Program</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.programData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }} />
                    <Bar 
                      dataKey="count" 
                      fill="#1e3a8a" 
                      radius={[6, 6, 0, 0]} 
                      style={{ cursor: 'pointer' }}
                      onClick={(data) => {
                        if (data && data.name) {
                          setActiveTab('directory');
                          setProgramFilter(data.name.toLowerCase());
                          setStatusFilter('enrolled');
                          setPaymentFilter('');
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-bold text-univ-navy mb-6 uppercase tracking-wider">Pipeline Status</h2>
                <div className="h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        style={{ cursor: 'pointer' }}
                        onClick={(data) => {
                          if (data && data.name) {
                            setActiveTab('directory');
                            setProgramFilter('');
                            setPaymentFilter('');
                            if (data.name === 'Enrolled') {
                              setStatusFilter('enrolled');
                            } else if (data.name === 'Processing') {
                              setStatusFilter('processing_all');
                            } else if (data.name === 'Pending Admin') {
                              setStatusFilter('validation_pending');
                            }
                          }
                        }}
                      >
                        {metrics.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex justify-center gap-5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-univ-indigo"></div>Enrolled</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Processing</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-univ-gold"></div>Pending</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-premium overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Recent Registrations Validated</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentEnrollees.length > 0 ? recentEnrollees.map((student) => (
                <div key={student.id} className="p-5 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-univ-blue/10 flex items-center justify-center text-univ-blue font-bold text-sm">
                      {student.firstName ? student.firstName[0] : 'S'}{student.lastName ? student.lastName[0] : 'T'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-univ-navy">{student.firstName || 'Anonymous'} {student.lastName || 'Applicant'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.email || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-univ-navy uppercase tracking-wider">{student.programId || '—'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{student.enrollmentType || '—'}</p>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-xs text-slate-400 font-medium">No recent registrations have been validated.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters controls card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-premium flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, email or STU ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 md:flex-none border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-univ-indigo cursor-pointer"
              >
                <option value="">All Flow Statuses</option>
                <option value="processing_all">Active Processing (All)</option>
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

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="flex-1 md:flex-none border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-univ-indigo cursor-pointer"
              >
                <option value="">All Payment Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
              </select>

              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="flex-1 md:flex-none border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-univ-indigo cursor-pointer"
              >
                <option value="">All Programs</option>
                {PROGRAMS.map(prog => (
                  <option key={prog.id} value={prog.id}>{prog.id.toUpperCase()} - {prog.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  <th className="px-5 py-4">Student Details</th>
                  <th className="px-5 py-4">Course Program</th>
                  <th className="px-5 py-4">Current Status</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Supervisor Overrides</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">
                      No matching student records found in memory.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stud) => {
                    const progName = PROGRAMS.find(p => p.id === stud.programId)?.name || 'Not Chosen';
                    return (
                      <tr key={stud.id} className="hover:bg-slate-50/20">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-univ-indigo/10 text-univ-indigo flex items-center justify-center font-bold text-xs">
                              {stud.firstName ? stud.firstName[0] : 'S'}{stud.lastName ? stud.lastName[0] : 'T'}
                            </div>
                            <div>
                              <p className="font-bold text-univ-navy text-xs">{stud.firstName || 'Anonymous'} {stud.lastName || 'Applicant'}</p>
                              <p className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">{stud.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-700">{stud.programId ? stud.programId.toUpperCase() : '—'}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[150px]" title={progName}>{progName}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <StatusBadge status={stud.status} />
                            <select
                              value={stud.status}
                              onChange={(e) => handleUpdateStatus(stud.id, e.target.value)}
                              className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-univ-indigo cursor-pointer w-32"
                            >
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
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`px-2 py-0.5 text-[9px] font-bold border rounded uppercase tracking-wider w-fit ${
                              stud.paymentStatus === 'paid'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : stud.paymentStatus === 'processing'
                                ? 'bg-amber-50 border-amber-100 text-amber-600'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              {stud.paymentStatus}
                            </span>
                            <select
                              value={stud.paymentStatus || 'unpaid'}
                              onChange={(e) => handleUpdatePaymentStatus(stud.id, e.target.value)}
                              className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-univ-indigo cursor-pointer w-28"
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="paid">Paid</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {/* Bypass Admission */}
                            {['documents_submitted'].includes(stud.status) && (
                              <button
                                type="button"
                                onClick={() => handleOverrideAdmission(stud.id)}
                                className="px-2 py-1 text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 text-univ-indigo border border-indigo-200 rounded-lg transition-all cursor-pointer"
                                title="Bypass Admissions Desk and approve documents directly"
                              >
                                Bypass Admission
                              </button>
                            )}
                            
                            {/* Bypass Advising */}
                            {['advising_pending'].includes(stud.status) && (
                              <button
                                type="button"
                                onClick={() => handleOverrideAdvising(stud.id)}
                                className="px-2 py-1 text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-univ-gold border border-amber-200 rounded-lg transition-all cursor-pointer"
                                title="Bypass Adviser and clear subject matrix selection"
                              >
                                Bypass Advising
                              </button>
                            )}
                            
                            {/* Bypass Accounting */}
                            {['payment_pending', 'processing'].includes(stud.status) && (
                              <button
                                type="button"
                                onClick={() => handleOverridePayment(stud.id)}
                                className="px-2 py-1 text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-250 rounded-lg transition-all cursor-pointer"
                                title="Bypass Accounting ledger audit and clear tuition payment"
                              >
                                Bypass Accounting
                              </button>
                            )}

                            {/* Bypass Registrar */}
                            {['validation_pending'].includes(stud.status) && (
                              <button
                                type="button"
                                onClick={() => handleOverrideFinalize(stud.id)}
                                className="px-2 py-1 text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-univ-blue border border-blue-200 rounded-lg transition-all cursor-pointer"
                                title="Bypass Registrar final checklist and certify official enrollment"
                              >
                                Bypass Registrar
                              </button>
                            )}

                            {/* Resolve Holds */}
                            {stud.holds?.some(h => h.status === 'active') && (
                              <button
                                type="button"
                                onClick={() => {
                                  const activeHolds = stud.holds.filter(h => h.status === 'active');
                                  activeHolds.forEach(h => handleResolveHold(stud.id, h.type));
                                }}
                                className="px-2 py-1 text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-all cursor-pointer"
                                title="Resolve all active holds"
                              >
                                Resolve Holds
                              </button>
                            )}

                            {/* Fully complete check */}
                            {stud.status === 'enrolled' && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-650 font-bold">
                                <CheckCircle className="w-3.5 h-3.5" /> All Checks Passed
                              </span>
                            )}

                            {/* Simulate AWOL / Return option for any student without active holds */}
                            {!stud.holds?.some(h => h.status === 'active') && stud.status !== 'registration' && (
                              <button
                                type="button"
                                onClick={() => handleSetReturning(stud.id)}
                                className="w-fit px-2 py-1 text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-lg transition-all cursor-pointer"
                                title="Simulate student going AWOL and returning later"
                              >
                                Simulate AWOL/Return
                              </button>
                            )}

                            {/* Fallback state message */}
                            {!['documents_submitted', 'advising_pending', 'payment_pending', 'processing', 'validation_pending', 'enrolled'].includes(stud.status) && (
                              <span className="text-[10px] text-slate-400 font-medium">Awaiting student progress</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteFrontend(stud.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Delete Student record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Contents: Recently Deleted Bin */}
      {activeTab === 'deleted' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium">
            <h2 className="text-base font-extrabold text-univ-navy">Recently Deleted Student Directory</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              These student records have been soft-deleted from this browser session. You can restore them to the main directory or permanently delete them from the UI.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  <th className="px-5 py-4">Student Details</th>
                  <th className="px-5 py-4">Course Program</th>
                  <th className="px-5 py-4">Last Status</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4 text-center">Restore</th>
                  <th className="px-5 py-4 text-center">Permanent Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentlyDeletedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">
                      No deleted records in the trash bin.
                    </td>
                  </tr>
                ) : (
                  recentlyDeletedStudents.map((stud) => {
                    const progName = PROGRAMS.find(p => p.id === stud.programId)?.name || 'Not Chosen';
                    return (
                      <tr key={stud.id} className="hover:bg-slate-50/20">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                              {stud.firstName ? stud.firstName[0] : 'S'}{stud.lastName ? stud.lastName[0] : 'T'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-650 text-xs">{stud.firstName || 'Anonymous'} {stud.lastName || 'Applicant'}</p>
                              <p className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">{stud.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-600">{stud.programId ? stud.programId.toUpperCase() : '—'}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[150px]">{progName}</p>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={stud.status} />
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded uppercase tracking-wider w-fit ${
                            stud.paymentStatus === 'paid'
                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            {stud.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRestoreStudent(stud.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                            title="Restore student record back to active lists"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteFrontend(stud.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                            title="Permanently remove from this dashboard session view"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between min-h-[120px] cursor-pointer hover:shadow-premium-lg hover:border-univ-indigo/40 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-extrabold text-univ-navy mt-3 tracking-tight">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
