import React, { useState, useMemo } from 'react';
import { Search, Filter, Receipt, ArrowRight } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';

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

export default function PaymentLedger({ students, initialFilter, onViewDetails }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter || 'all');

  const studentsWithSubjects = useMemo(() => {
    return students.filter((s) => s.selectedSubjects && s.selectedSubjects.length > 0);
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = studentsWithSubjects;

    if (filter === 'pending') {
      result = result.filter(s => s.paymentStatus !== 'paid');
    } else if (filter === 'paid') {
      result = result.filter(s => s.paymentStatus === 'paid');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [studentsWithSubjects, filter, searchQuery]);

  function getProgramName(id) {
    const p = PROGRAMS.find(prog => prog.id === id);
    return p ? p.name : '—';
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-8 pb-4 space-y-4 bg-white border-b border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-univ-navy">Payment Ledger</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Verify pending student bank receipts and clear their financial holds.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="relative w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 mr-1" />
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'paid', label: 'Paid' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-[10px] font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-univ-navy text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-univ-navy'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-6">
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-premium bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Program</th>
                <th className="px-5 py-3.5">Total Tuition</th>
                <th className="px-5 py-3.5">Payment Mode</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Receipt className="h-8 w-8 mx-auto mb-3 opacity-20 text-slate-500" />
                    <p className="text-xs font-bold text-slate-500">No payment records found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-700 font-bold text-sm">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-univ-navy">{student.firstName} {student.lastName}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{student.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-600 truncate max-w-[200px]">{getProgramName(student.programId)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-univ-navy">{formatPeso(student.totalTuition)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-500 capitalize">{student.paymentMethod || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <PaymentStatusBadge status={student.paymentStatus} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => onViewDetails(student.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      >
                        Verify
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
