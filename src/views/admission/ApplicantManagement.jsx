import React, { useMemo, useState } from 'react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';
import { ExternalLink } from 'lucide-react';

export default function ApplicantManagement({ students, initialFilter, onViewDetails, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const statusFilter = initialFilter || '';

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q === '' || 
        s.id.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'pending') {
        matchesStatus = s.status === 'registration';
      } else if (statusFilter === 'approved') {
        matchesStatus = s.status === 'documents_approved' || s.status === 'enrolled';
      } else if (statusFilter === 'rejected') {
        matchesStatus = s.status === 'documents_rejected'; // meaning incomplete/resubmission
      } else if (statusFilter !== '') {
        matchesStatus = s.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 p-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-univ-navy">Applicant Management</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">View and manage all student applications.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 shrink-0">
        <div className="relative flex-1 w-full">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, email or ID..."
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onNavigate('management');
              } else if (val === 'documents_submitted') {
                onNavigate('verification');
              } else {
                onNavigate(val);
              }
            }}
            className="flex-1 md:flex-none border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-univ-indigo cursor-pointer"
          >
            <option value="">All Applicants</option>
            <option value="pending">Pending Applications</option>
            <option value="documents_submitted">Documents Submitted</option>
            <option value="approved">Approved Applications</option>
            <option value="rejected">Incomplete / Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto flex-1">
        <table className="w-full text-left text-xs min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Course Program</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-medium">
                  No matching applicants found.
                </td>
              </tr>
            ) : (
              filteredStudents.map((stud) => {
                const progName = PROGRAMS.find(p => p.id === stud.programId)?.name || 'Not Selected';
                return (
                  <tr key={stud.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-univ-indigo/10 text-univ-indigo flex items-center justify-center font-bold text-xs uppercase">
                          {stud.firstName ? stud.firstName[0] : 'A'}{stud.lastName ? stud.lastName[0] : ''}
                        </div>
                        <div>
                          <p className="font-bold text-univ-navy text-xs">{stud.firstName || 'Anonymous'} {stud.lastName || 'Applicant'}</p>
                          <p className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">{stud.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-semibold text-slate-700">{stud.programId ? stud.programId.toUpperCase() : '—'}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[150px]" title={progName}>{progName}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-bold text-slate-500 capitalize">{stud.enrollmentType || '—'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={stud.status} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onViewDetails(stud.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-univ-indigo bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Details
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
  );
}
