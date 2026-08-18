import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import SearchInput from '../../components/SearchInput';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

const SEVERITY_STYLES = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-slate-200 bg-slate-50 text-slate-600',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function readableType(type) {
  return String(type || '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function recordSummary(records = {}) {
  return Object.entries(records)
    .filter(([, value]) => value !== '' && value != null)
    .map(([key, value]) => `${readableType(key)}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' · ');
}

export default function IntegrityAuditTab() {
  const { token: contextToken, logout } = useAuth();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('actionable');
  const [typeFilter, setTypeFilter] = useState('');
  const [instructors, setInstructors] = useState([]);
  const [assignmentIssue, setAssignmentIssue] = useState(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const token = contextToken || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [response, usersResponse] = await Promise.all([
        fetch('/api/academic/integrity-audit', { headers }),
        fetch('/api/admin/users', { headers }),
      ]);
      const [payload, usersPayload] = await Promise.all([response.json(), usersResponse.json()]);
      if (response.status === 401 || usersResponse.status === 401) {
        logout();
        throw new Error('Session expired. Please sign in again.');
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to run integrity audit.');
      if (!usersResponse.ok) throw new Error(usersPayload.message || 'Unable to load instructor accounts.');
      setAudit(payload.data);
      setInstructors((Array.isArray(usersPayload) ? usersPayload : []).filter((user) => user.role === 'instructor'));
    } catch (error) {
      toast.error(error.message || 'Unable to run integrity audit.');
    } finally {
      setLoading(false);
    }
  }, [contextToken, logout]);

  const assignInstructor = async (event) => {
    event.preventDefault();
    if (!assignmentIssue?.records?.offeringId || !selectedInstructorId) return;
    setSavingAssignment(true);
    try {
      const token = contextToken || localStorage.getItem('token');
      const response = await fetch(`/api/academic/offerings/${assignmentIssue.records.offeringId}/instructor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instructorId: selectedInstructorId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to assign instructor.');
      toast.success('Instructor account linked.');
      setAssignmentIssue(null);
      setSelectedInstructorId('');
      await loadAudit();
    } catch (error) {
      toast.error(error.message || 'Unable to assign instructor.');
    } finally {
      setSavingAssignment(false);
    }
  };

  useEffect(() => { loadAudit(); }, [loadAudit]);

  const typeOptions = useMemo(() => [...new Set((audit?.issues || []).map((issue) => issue.type))].sort(), [audit]);
  const filteredIssues = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (audit?.issues || []).filter((issue) => {
      const searchable = [
        issue.title,
        issue.description,
        issue.recommendedAction,
        issue.type,
        recordSummary(issue.records),
      ].join(' ').toLowerCase();
      const matchesSeverity = !severityFilter
        || (severityFilter === 'actionable' ? issue.severity !== 'info' : issue.severity === severityFilter);
      return (!query || searchable.includes(query))
        && matchesSeverity
        && (!typeFilter || issue.type === typeFilter);
    });
  }, [audit, searchQuery, severityFilter, typeFilter]);

  if (loading && !audit) {
    return <div className="flex h-full items-center justify-center gap-2 bg-slate-50 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Running read-only audit…</div>;
  }

  const summary = audit?.summary || {};

  return (
    <div className="h-full space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <PortalPageHeader
        title="Academic data integrity"
        description="Read-only checks for duplicate offerings, invalid memberships, term mismatches, roster counts, and incomplete schedule records."
        actions={<PortalRefreshButton onRefresh={loadAudit} />}
      />

      <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Read-only audit</p>
          <p className="mt-0.5 text-xs leading-5 text-emerald-700">Audit scan never changes records. Instructor assignment changes only selected offering and records an academic audit log.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border border-slate-200 bg-white sm:grid-cols-3 sm:divide-y-0 xl:grid-cols-6">
        {[
          ['Total issues', summary.totalIssues || 0, 'text-slate-900'],
          ['Critical', summary.critical || 0, 'text-rose-700'],
          ['Warnings', summary.warning || 0, 'text-amber-700'],
          ['Offerings scanned', summary.offeringsScanned || 0, 'text-slate-900'],
          ['Memberships scanned', summary.membershipsScanned || 0, 'text-slate-900'],
          ['Sections scanned', summary.sectionsScanned || 0, 'text-slate-900'],
        ].map(([label, value, color]) => (
          <div key={label} className="px-4 py-3">
            <p className={`text-lg font-semibold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(280px,1fr)_180px_260px]">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search issues or record IDs…" />
        <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="actionable">Action required</option>
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Information</option>
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All issue types</option>
          {typeOptions.map((type) => <option key={type} value={type}>{readableType(type)}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{filteredIssues.length} of {audit?.issues?.length || 0} issues</span>
        <span>Generated {audit?.generatedAt ? new Date(audit.generatedAt).toLocaleString() : '—'}</span>
      </div>

      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="w-28 px-4 py-3">Severity</th>
              <th className="w-[28%] px-4 py-3">Issue</th>
              <th className="w-[32%] px-4 py-3">Records</th>
              <th className="px-4 py-3">Recommended review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500">
                  {audit?.issues?.length ? 'No issues match selected filters.' : 'No integrity issues detected.'}
                </td>
              </tr>
            ) : filteredIssues.map((issue) => {
              const SeverityIcon = SEVERITY_ICONS[issue.severity] || Info;
              return (
                <tr key={issue.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold capitalize ${SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info}`}>
                      <SeverityIcon className="h-3.5 w-3.5" /> {issue.severity}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{issue.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{issue.description}</p>
                    <p className="mt-1.5 text-[11px] font-medium text-slate-400">{readableType(issue.type)}</p>
                  </td>
                  <td className="px-4 py-4 font-mono text-[11px] leading-5 text-slate-600 break-words">{recordSummary(issue.records)}</td>
                  <td className="px-4 py-4 text-xs leading-5 text-slate-700">
                    <p>{issue.recommendedAction}</p>
                    {['unlinked_instructor', 'missing_instructor_account'].includes(issue.type) && issue.records?.offeringId && (
                      <button
                        type="button"
                        onClick={() => { setAssignmentIssue(issue); setSelectedInstructorId(''); }}
                        className="mt-3 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        Assign instructor
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={Boolean(assignmentIssue)}
        onClose={() => { if (!savingAssignment) { setAssignmentIssue(null); setSelectedInstructorId(''); } }}
        title="Assign instructor account"
        maxWidth="max-w-md"
      >
        <form onSubmit={assignInstructor} className="space-y-4">
          <div className="border-b border-slate-100 pb-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{assignmentIssue?.description}</p>
            <p className="mt-1 text-xs text-slate-500">Offering ID: {assignmentIssue?.records?.offeringId}</p>
          </div>
          <div>
            <label htmlFor="integrity-instructor" className="mb-1.5 block text-xs font-semibold text-slate-700">Instructor account</label>
            <select
              id="integrity-instructor"
              value={selectedInstructorId}
              onChange={(event) => setSelectedInstructorId(event.target.value)}
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select instructor…</option>
              {instructors.map((instructor) => (
                <option key={instructor._id} value={instructor._id}>
                  {[instructor.firstName, instructor.lastName].filter(Boolean).join(' ') || instructor.username} ({instructor.email})
                </option>
              ))}
            </select>
            {instructors.length === 0 && <p className="mt-1.5 text-xs text-amber-700">Create an instructor account in Staff Management first.</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => { setAssignmentIssue(null); setSelectedInstructorId(''); }} disabled={savingAssignment} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={savingAssignment || !selectedInstructorId} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              {savingAssignment && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {savingAssignment ? 'Saving…' : 'Assign instructor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
