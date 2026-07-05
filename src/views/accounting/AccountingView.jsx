import React, { useState, useMemo } from 'react';
import { DollarSign, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
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
    unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const labels = {
    unpaid: 'Unpaid',
    processing: 'Processing',
    paid: 'Paid',
    failed: 'Failed',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium border rounded-sm ${
        config[status] || config.unpaid
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function AccountingView() {
  const { state, dispatch } = useEnrollment();

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

  function handleConfirmPayment(studentId) {
    dispatch({ type: 'CONFIRM_PAYMENT', payload: { studentId } });
    const student = state.students.find((s) => s.id === studentId);
    showFlash(`Payment confirmed for ${student.firstName} ${student.lastName}`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="p-6 pb-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-slate-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Tuition Assessment &amp; Payment Ledger</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="w-80">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name or ID..."
            />
          </div>
          <div className="flex items-center gap-1.5">
            {PAYMENT_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors duration-150 ${
                  activeFilter === filter.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
        <div className="mx-6 mt-4 px-4 py-3 rounded-md text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          {flashMessage}
        </div>
      )}

      {/* ── Ledger Table ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-8 px-4 py-2.5" />
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Student ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Program</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Total Units</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tuition</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Method</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Receipt className="h-8 w-8 mx-auto mb-3" />
                    <p className="text-sm">No records found</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isExpanded = expandedRows.has(student.id);
                  const totalUnits = getTotalUnits(student);
                  const canConfirm =
                    student.status === 'payment_pending' &&
                    (student.paymentStatus === 'unpaid' || student.paymentStatus === 'paid');

                  return (
                    <React.Fragment key={student.id}>
                      {/* Main Row */}
                      <tr
                        onClick={() => toggleRow(student.id)}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{student.id}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{getProgramName(student.programId)}</td>
                        <td className="px-4 py-3 text-slate-500">{totalUnits}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{formatPeso(student.totalTuition)}</td>
                        <td className="px-4 py-3 text-slate-500 capitalize">{student.paymentMethod || '—'}</td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={student.paymentStatus} />
                        </td>
                        <td className="px-4 py-3">
                          {canConfirm ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmPayment(student.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors duration-150"
                            >
                              Confirm Payment
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Breakdown */}
                      {isExpanded && student.tuitionBreakdown && student.tuitionBreakdown.length > 0 && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50 px-0 py-0">
                            <div className="px-12 py-4">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Tuition Breakdown
                              </p>
                              <table className="w-full text-xs">
                                <tbody>
                                  {student.tuitionBreakdown.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                                      <td className="py-2 text-slate-600">{item.label}</td>
                                      <td className="py-2 text-right text-slate-700 font-medium">
                                        {formatPeso(item.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-slate-300">
                                    <td className="py-2 font-semibold text-slate-900">Total</td>
                                    <td className="py-2 text-right font-semibold text-slate-900">
                                      {formatPeso(student.totalTuition)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
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
