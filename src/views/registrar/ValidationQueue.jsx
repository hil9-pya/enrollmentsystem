import React, { useState, useMemo } from 'react';
import { Search, Filter, ShieldCheck, ArrowRight, FileText } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { PROGRAMS } from '../../data/mockData';

export default function ValidationQueue({ students, initialFilter, onViewDetails }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter || 'all');

  const relevantStudents = useMemo(() => {
    return students.filter(s => 
      ['payment_confirmed', 'enrolled'].includes(s.status) || s.paymentStatus === 'paid'
    );
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = relevantStudents;

    if (filter === 'pending') {
      result = result.filter(s => s.status !== 'enrolled');
    } else if (filter === 'enrolled') {
      result = result.filter(s => s.status === 'enrolled');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [relevantStudents, filter, searchQuery]);

  function getProgramName(id) {
    const p = PROGRAMS.find(prog => prog.id === id);
    return p ? p.name : '—';
  }

  function handleExportCSV() {
    const csvData = [
      ['Student ID', 'First Name', 'Last Name', 'Email', 'Program', 'Status'],
      ...filteredStudents.map(s => [s.id, s.firstName, s.lastName, s.email, s.programId, s.status])
    ].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrar_students_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-8 pb-4 space-y-4 bg-white border-b border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-univ-navy">Registrar Validation</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Verify completion and finalize enrollment.</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="relative w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-univ-blue focus:border-transparent shadow-sm transition-all"
            />
          </div>

          <div className="flex items-center rounded-md border border-slate-200 overflow-hidden shadow-sm bg-white">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending Validation' },
              { id: 'enrolled', label: 'Officially Enrolled' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-xs font-semibold px-3 py-1.5 transition-colors cursor-pointer border-r last:border-r-0 border-slate-200 ${
                  filter === f.id
                    ? 'bg-slate-100 text-slate-900 shadow-inner'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-6">
        <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-3 opacity-20 text-slate-500" />
                    <p className="text-xs font-bold text-slate-500">No student records found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-univ-blue/10 flex items-center justify-center flex-shrink-0 text-univ-blue font-bold text-sm">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-univ-navy">{student.firstName} {student.lastName}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{student.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-600 truncate max-w-[200px]">{getProgramName(student.programId)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-slate-500">{student.academicTerm || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => onViewDetails(student.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-univ-blue bg-blue-50 hover:bg-univ-blue hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      >
                        {student.status === 'enrolled' ? 'View Record' : 'Validate'}
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
