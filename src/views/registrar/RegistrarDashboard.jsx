import React, { useMemo, useState } from 'react';
import { Users, Clock, CheckCircle, Search, Download, Filter, CheckSquare, MoreHorizontal } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';

export default function RegistrarDashboard({ students, onNavigate, initialFilter, onViewDetails, showOverview = true }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());

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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(metrics.tableData.map(s => s.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      
      {/* Header Area */}
      {showOverview && (
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Registrar Workspace</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Manage enrollment validations and official student records.</p>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
               <Download className="w-4 h-4" /> Export CSV
             </button>
             {selectedRows.size > 0 && (
               <button className="flex items-center gap-2 px-4 py-2 bg-univ-blue text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm animate-in zoom-in-95 duration-200">
                 <CheckSquare className="w-4 h-4" /> Officially Enroll ({selectedRows.size})
               </button>
             )}
          </div>
        </div>

        {/* Compact Metrics */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Records</p>
              <p className="text-lg font-extrabold text-slate-900 leading-none mt-1">{metrics.totalStudents}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Validation</p>
              <p className="text-lg font-extrabold text-slate-900 leading-none mt-1">{metrics.pending}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Officially Enrolled</p>
              <p className="text-lg font-extrabold text-slate-900 leading-none mt-1">{metrics.enrolled}</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Data Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        
        {/* Toolbar */}
        <div className="shrink-0 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
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
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search by name, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md py-2 pl-9 pr-3 text-sm font-medium focus:outline-none focus:border-univ-blue focus:ring-1 focus:ring-univ-blue shadow-sm transition-all"
              />
            </div>
            <button className="px-3 py-2 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
              <tr className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-univ-blue focus:ring-univ-blue cursor-pointer"
                    checked={metrics.tableData.length > 0 && selectedRows.size === metrics.tableData.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Program</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.tableData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 font-medium">
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
                    className={`transition-colors group ${selectedRows.has(student.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-univ-blue focus:ring-univ-blue cursor-pointer"
                        checked={selectedRows.has(student.id)}
                        onChange={() => handleSelectRow(student.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-500 font-medium">{student.id}</span>
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
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                        {student.enrollmentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
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
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-400 cursor-not-allowed">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}


