import React, { useMemo, useState } from 'react';
import { Users, Clock, CheckCircle, Search } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import Badge from '../../components/Badge';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import PortalPageHeader from '../../components/PortalPageHeader';
import SearchInput from '../../components/SearchInput';
import MiniStat from '../../components/MiniStat';

export default function RegistrarDashboard({ students, onNavigate, initialFilter, onViewDetails, showOverview = true }) {
  const [searchQuery, setSearchQuery] = useState('');

  const metrics = useMemo(() => {
    const relevantStudents = students.filter(s => 
      ['payment_confirmed', 'enrolled'].includes(s.status) || s.paymentStatus === 'paid'
    );

    const totalStudents = relevantStudents.length;
    const pending = relevantStudents.filter(s => s.status !== 'enrolled').length;
    const enrolled = relevantStudents.filter(s => s.status === 'enrolled').length;

    const tableData = [...relevantStudents]
      .filter(s => {
        if (initialFilter === 'pending' && s.status === 'enrolled') return false;
        if (initialFilter === 'enrolled' && s.status !== 'enrolled') return false;
        
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.firstName?.toLowerCase().includes(q) || s.lastName?.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      })
      .sort((a, b) => b.id.localeCompare(a.id));

    return { totalStudents, pending, enrolled, tableData };
  }, [students, searchQuery, initialFilter]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      
      {/* Header Area */}
      {showOverview && (
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-5">
        <div className="mb-5">
          <PortalPageHeader
            title="Registrar overview"
            description="Validate enrollments and maintain official student records."
            actions={<PortalRefreshButton />}
          />
        </div>

        {/* Compact Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat title="Total records" value={metrics.totalStudents} icon={<Users className="h-4 w-4" />} />
          <MiniStat title="Pending validation" value={metrics.pending} icon={<Clock className="h-4 w-4" />} colorClass="text-amber-600" onClick={() => onNavigate('pending')} />
          <MiniStat title="Officially enrolled" value={metrics.enrolled} icon={<CheckCircle className="h-4 w-4" />} colorClass="text-emerald-600" onClick={() => onNavigate('enrolled')} />
        </div>
      </div>
      )}

      {/* Main Data Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        
        {/* Toolbar */}
        <div className="shrink-0 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            {!showOverview && <PortalRefreshButton />}
            <div className="flex bg-white rounded-md border border-slate-200 p-1 shadow-sm">
              <button 
                onClick={() => onNavigate('records')}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${initialFilter === 'all' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All Records
              </button>
              <button 
                onClick={() => onNavigate('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${initialFilter === 'pending' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pending Only
              </button>
              <button 
                onClick={() => onNavigate('enrolled')}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${initialFilter === 'enrolled' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Officially Enrolled
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-72"><SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or ID…" /></div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-[52rem] w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
              <tr className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Program</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="sticky right-0 bg-slate-50 px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.tableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="w-8 h-8 text-slate-300 mb-3" />
                      <p>No records found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                metrics.tableData.map(student => (
                  <tr 
                    key={student.id} 
                    className="group transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-500 font-medium">{student.studentId || student.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-600">
                        {PROGRAMS.find(p => p.id === student.programId)?.name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge>{student.enrollmentType}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="sticky right-0 bg-white px-6 py-4 text-right group-hover:bg-slate-50">
                      <button
                        onClick={() => onViewDetails(student.id)} 
                        className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                          student.status === 'enrolled' 
                            ? 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm'
                            : 'text-univ-blue bg-blue-50 hover:bg-univ-blue hover:text-white'
                        }`}
                      >
                        {student.status === 'enrolled' ? 'View Record' : 'Validate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="shrink-0 p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs font-medium text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{metrics.tableData.length}</span> records
          </div>
          <div className="flex gap-2">
            <button type="button" disabled className="cursor-not-allowed rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-400">Previous</button>
            <button type="button" disabled className="cursor-not-allowed rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-400">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}


