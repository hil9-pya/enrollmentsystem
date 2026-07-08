import React, { useState, useMemo } from 'react';
import { DollarSign, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';
import { SUBJECTS, PROGRAMS } from '../../data/mockData';

const PAYMENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'paid', label: 'Paid' },
];

function formatPeso(amount) {
  if (amount == null) return '₱0';
  return '₱' + amount.toLocaleString('en-PH');
}

function PaymentStatusBadge({ status }) {
  const config = {
    unpaid: 'bg-amber-50 text-amber-700 border-amber-200/50',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200/50',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    failed: 'bg-rose-50 text-rose-700 border-rose-200/50',
  };

  const labels = {
    unpaid: 'Unpaid',
    processing: 'Processing',
    paid: 'Paid',
    failed: 'Failed',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wider ${
        config[status] || config.unpaid
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function AccountingView() {
  const { state, dispatch } = useEnrollment();
  const { confirm } = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [flashMessage, setFlashMessage] = useState(null);

  // All students with selected subjects
  const studentsWithSubjects = useMemo(() => {
    return state.students.filter((s) => s.selectedSubjects && s.selectedSubjects.length > 0);
  }, [state.students]);

  // Apply filters
  const filteredStudents = useMemo(() => {
    let result = studentsWithSubjects;

    // Payment filter
    if (activeFilter === 'unpaid') {
      result = result.filter((s) => s.paymentStatus !== 'paid');
    } else if (activeFilter === 'paid') {
      result = result.filter((s) => s.paymentStatus === 'paid');
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [studentsWithSubjects, activeFilter, searchQuery]);

  function toggleRow(studentId) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  function getTotalUnits(student) {
    return student.selectedSubjects.reduce((sum, ss) => {
      const subject = SUBJECTS.find((s) => s.id === ss.subjectId);
      return sum + (subject ? subject.units : 0);
    }, 0);
  }

  function getProgramName(programId) {
    const program = PROGRAMS.find((p) => p.id === programId);
    return program ? program.name : '—';
  }

  function showFlash(message) {
    setFlashMessage(message);
    setTimeout(() => setFlashMessage(null), 3000);
  }

  async function handleConfirmPayment(studentId) {
    const student = state.students.find((s) => s.id === studentId);
    if (!student) return;
    const isConfirmed = await confirm({
      title: 'Confirm Tuition Payment',
      message: `Are you sure you want to confirm the tuition payment of ${formatPeso(student.totalTuition)} for ${student.firstName} ${student.lastName}? This clears their accounting hold.`,
      confirmText: 'Confirm Payment',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!isConfirmed) return;
    await dispatch({ type: 'CONFIRM_PAYMENT', payload: { studentId } });
    showFlash(`Payment confirmed for ${student.firstName} ${student.lastName}`);
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="p-8 pb-4 space-y-4 bg-white border-b border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-univ-blue/10 flex items-center justify-center text-univ-blue">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-univ-navy">Tuition Assessment &amp; Payment Ledger</h2>
            <p className="text-xs text-slate-400 font-medium">Verify pending student bank receipts and clear their financial holds.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="w-80">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name or ID..."
            />
          </div>
          <div className="flex items-center gap-2">
            {PAYMENT_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border shadow-sm ${
                  activeFilter === filter.id
                    ? 'bg-univ-navy text-white border-univ-navy'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Flash message */}
      {flashMessage && (
        <div className="mx-8 mt-6 px-4 py-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/40 shadow-sm">
          {flashMessage}
        </div>
      )}

      {/* Ledger Table */}
      <div className="flex-1 overflow-y-auto p-8 pt-6">
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-premium bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                <th className="w-10 px-4 py-3.5" />
                <th className="px-4 py-3.5">Student ID</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Program</th>
                <th className="px-4 py-3.5">Total Units</th>
                <th className="px-4 py-3.5">Total Tuition</th>
                <th className="px-4 py-3.5">Payment Method</th>
                <th className="px-4 py-3.5">Payment Status</th>
                <th className="px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Receipt className="h-9 w-9 mx-auto mb-3 opacity-55 text-slate-400" />
                    <p className="text-xs font-bold text-slate-500">No payment records found</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isExpanded = expandedRows.has(student.id);
                  const totalUnits = getTotalUnits(student);
                  const canConfirm =
                    student.status === 'payment_pending' &&
                    (student.paymentStatus === 'unpaid' || student.paymentStatus === 'paid' || student.paymentStatus === 'processing');

                  return (
                    <React.Fragment key={student.id}>
                      {/* Main Row */}
                      <tr
                        onClick={() => toggleRow(student.id)}
                        className="hover:bg-slate-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-4.5 text-slate-400 text-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 inline" />
                          ) : (
                            <ChevronRight className="h-4 w-4 inline" />
                          )}
                        </td>
                        <td className="px-4 py-4.5 font-mono text-xs font-bold text-slate-400">{student.id}</td>
                        <td className="px-4 py-4.5 text-univ-navy font-bold">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-4 py-4.5 text-slate-500 font-semibold truncate max-w-[150px]">{getProgramName(student.programId)}</td>
                        <td className="px-4 py-4.5 text-slate-500 font-bold">{totalUnits}</td>
                        <td className="px-4 py-4.5 text-univ-navy font-extrabold">{formatPeso(student.totalTuition)}</td>
                        <td className="px-4 py-4.5 text-slate-500 font-semibold capitalize">{student.paymentMethod || '—'}</td>
                        <td className="px-4 py-4.5">
                          <PaymentStatusBadge status={student.paymentStatus} />
                        </td>
                        <td className="px-4 py-4.5">
                          {canConfirm ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmPayment(student.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all shadow-sm cursor-pointer"
                            >
                              Confirm Payment
                            </button>
                          ) : (
                            <span className="text-slate-300 font-medium">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Breakdown */}
                      {isExpanded && student.tuitionBreakdown && student.tuitionBreakdown.length > 0 && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50/50 border-y border-slate-150 px-0 py-0">
                            <div className="px-14 py-5 space-y-4">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                Tuition &amp; Fees Breakdown
                              </p>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-w-lg shadow-sm">
                                <table className="w-full text-left text-xs divide-y divide-slate-100">
                                  <tbody className="divide-y divide-slate-100">
                                    {student.tuitionBreakdown.map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="px-4 py-2.5 text-slate-600 font-semibold">{item.label}</td>
                                        <td className="px-4 py-2.5 text-right text-univ-navy font-bold">
                                          {formatPeso(item.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-slate-50/60 font-bold border-t border-slate-200">
                                      <td className="px-4 py-3 text-univ-navy font-extrabold">Total Tuition Due</td>
                                      <td className="px-4 py-3 text-right text-univ-navy font-extrabold">
                                        {formatPeso(student.totalTuition)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
