import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Download, FileUp, Loader2, LockKeyhole, LockKeyholeOpen, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmationContext';

function formatDate(value) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function submissionStatus(submission) {
  if (!submission) return { label: 'Not submitted', className: 'border-slate-200 bg-slate-50 text-slate-600' };
  const styles = {
    submitted: ['Submitted', 'border-blue-200 bg-blue-50 text-blue-700'],
    late: ['Submitted late', 'border-amber-200 bg-amber-50 text-amber-700'],
    graded: ['Graded', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
    returned: ['Returned', 'border-rose-200 bg-rose-50 text-rose-700'],
  };
  const [label, className] = styles[submission.status] || [submission.status, 'border-slate-200 bg-slate-50 text-slate-600'];
  return { label, className };
}

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getCurrentLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function splitDateTime(value) {
  const localValue = value || '';
  const [date = '', time = ''] = localValue.split('T');
  return { date, time };
}

function DueDateTimeFields({ value, onChange }) {
  const { date, time } = splitDateTime(value);
  const update = (nextDate, nextTime) => onChange(`${nextDate}T${nextTime}`);

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <label className="block text-xs font-semibold text-slate-600">
        Due date
        <input
          type="date"
          required
          value={date}
          onChange={(event) => update(event.target.value, time)}
          className="mt-1 block w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20"
        />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        Time
        <input
          type="time"
          required
          value={time}
          onChange={(event) => update(date, event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20"
        />
      </label>
    </div>
  );
}

function assignmentTiming(assignment) {
  if (assignment.status === 'closed') return { label: 'Closed', className: 'text-slate-500' };
  if (Date.now() > new Date(assignment.dueAt).getTime()) return { label: 'Overdue', className: 'text-rose-600' };
  return { label: 'Upcoming', className: 'text-emerald-700' };
}

async function downloadProtected(url, token, filename) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.message || payload.error || 'Unable to download file.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function AttemptHistory({ submission, token }) {
  if (!submission?.attempts?.length) return null;
  return (
    <details className="mt-4 border-t border-slate-100 pt-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-600">Attempt history ({submission.attempts.length})</summary>
      <ol className="mt-3 space-y-3">
        {[...submission.attempts].reverse().map((attempt) => (
          <li key={attempt._id} className="border-l-2 border-slate-200 pl-3">
            <p className="text-xs font-semibold text-slate-700">Attempt {attempt.attemptNumber} · {formatDate(attempt.submittedAt)}{attempt.wasLate ? ' · Late' : ''}</p>
            {attempt.text && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{attempt.text}</p>}
            {attempt.storageName && (
              <button
                type="button"
                onClick={() => downloadProtected(`/api/lms/submissions/${submission._id}/attempts/${attempt._id}/download`, token, attempt.originalName).catch((requestError) => toast.error(requestError.message))}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-univ-blue hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> {attempt.originalName}
              </button>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

export default function LmsAssignmentsTab({ offeringId, canManage, canEdit, isEnabled, refreshKey, token }) {
  const { confirm } = useConfirm();
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [assignmentDraft, setAssignmentDraft] = useState(() => ({ title: '', instructions: '', dueAt: getCurrentLocalDateTime(), points: 100, allowLateSubmissions: false }));
  const [submissionDraft, setSubmissionDraft] = useState({ text: '', file: null });
  const [editDraft, setEditDraft] = useState({ title: '', instructions: '', dueAt: '', points: 100, allowLateSubmissions: false });

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadAssignments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
      setError('');
    }
    try {
      const response = await fetch(`/api/lms/offerings/${offeringId}/assignments`, { headers, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load assignments.');
      setAssignments(payload.data || []);
      setSelected((current) => current ? (payload.data || []).find((item) => item._id === current._id) || null : null);
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [headers, offeringId]);

  useEffect(() => { loadAssignments({ silent: refreshKey > 0 }); }, [loadAssignments, refreshKey]);

  const openAssignment = async (assignment) => {
    setSelected(assignment);
    setIsEditing(false);
    setEditDraft({
      title: assignment.title,
      instructions: assignment.instructions || '',
      dueAt: toLocalDateTime(assignment.dueAt),
      points: assignment.points,
      allowLateSubmissions: Boolean(assignment.allowLateSubmissions),
    });
    setSubmissionDraft({ text: assignment.submission?.text || '', file: null });
    if (!canManage) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lms/assignments/${assignment._id}/submissions`, { headers, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load submissions.');
      const rows = payload.data || [];
      setSubmissions(rows);
      setGradeDrafts(Object.fromEntries(rows.map((row) => [row._id, { score: row.score ?? '', feedback: row.feedback || '' }])));
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createAssignment = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch(`/api/lms/offerings/${offeringId}/assignments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assignmentDraft,
          dueAt: new Date(assignmentDraft.dueAt).toISOString(),
          points: Number(assignmentDraft.points),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to create assignment.');
      setAssignments((current) => [...current, payload.data].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)));
      setAssignmentDraft({ title: '', instructions: '', dueAt: getCurrentLocalDateTime(), points: 100, allowLateSubmissions: false });
      setShowCreateForm(false);
      toast.success('Assignment published.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAssignment = async (assignment) => {
    const accepted = await confirm({ title: 'Delete assignment', message: `Delete “${assignment.title}”? If submissions exist, assignment will be archived to preserve records.`, confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' });
    if (!accepted) return;
    const response = await fetch(`/api/lms/assignments/${assignment._id}`, { method: 'DELETE', headers });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || payload.error || 'Unable to delete assignment.');
    setAssignments((current) => current.filter((item) => item._id !== assignment._id));
    setSelected(null);
    toast.success(payload.archived ? 'Assignment archived.' : 'Assignment deleted.');
  };

  const requestAssignmentUpdate = async (changes, confirmPointChange = false) => {
    const response = await fetch(`/api/lms/assignments/${selected._id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...changes, confirmPointChange }),
    });
    const payload = await response.json();
    if (!response.ok) {
      if (payload.code === 'POINT_CHANGE_CONFIRMATION_REQUIRED' && !confirmPointChange) {
        const accepted = await confirm({
          title: 'Change assignment points',
          message: 'This assignment already has graded submissions. Totals and percentages will be recalculated.',
          confirmText: 'Change points',
          cancelText: 'Cancel',
          type: 'warning',
        });
        if (!accepted) return null;
        return requestAssignmentUpdate(changes, true);
      }
      throw new Error(payload.message || payload.error || 'Unable to update assignment.');
    }
    return payload.data;
  };

  const saveAssignment = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const updated = await requestAssignmentUpdate({
        ...editDraft,
        dueAt: new Date(editDraft.dueAt).toISOString(),
        points: Number(editDraft.points),
      });
      if (!updated) return;
      setSelected((current) => ({ ...current, ...updated, submission: current.submission }));
      setAssignments((current) => current.map((item) => item._id === updated._id ? { ...item, ...updated, submission: item.submission } : item));
      setIsEditing(false);
      toast.success('Assignment updated.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAssignmentStatus = async () => {
    setIsSaving(true);
    try {
      const status = selected.status === 'closed' ? 'published' : 'closed';
      const updated = await requestAssignmentUpdate({ status });
      if (!updated) return;
      setSelected((current) => ({ ...current, ...updated, submission: current.submission }));
      setAssignments((current) => current.map((item) => item._id === updated._id ? { ...item, ...updated, submission: item.submission } : item));
      toast.success(status === 'closed' ? 'Assignment closed.' : 'Assignment reopened.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const submitWork = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSaving(true);
    try {
      const body = new FormData();
      body.append('text', submissionDraft.text);
      if (submissionDraft.file) body.append('file', submissionDraft.file);
      const response = await fetch(`/api/lms/assignments/${selected._id}/submissions`, { method: 'POST', headers, body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to submit assignment.');
      const updated = { ...selected, submission: payload.data };
      setSelected(updated);
      setAssignments((current) => current.map((item) => item._id === selected._id ? updated : item));
      setSubmissionDraft((current) => ({ ...current, file: null }));
      form.querySelector('input[type="file"]').value = '';
      toast.success('Assignment submitted.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const gradeSubmission = async (submission) => {
    const draft = gradeDrafts[submission._id] || {};
    setIsSaving(true);
    try {
      const response = await fetch(`/api/lms/submissions/${submission._id}/grade`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(draft.score), feedback: draft.feedback || '' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to save grade.');
      setSubmissions((current) => current.map((item) => item._id === submission._id ? { ...item, ...payload.data, student: item.student } : item));
      toast.success('LMS score saved.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const returnSubmission = async (submission) => {
    const feedback = String(gradeDrafts[submission._id]?.feedback || '').trim();
    if (!feedback) return toast.error('Enter feedback before returning work.');
    const accepted = await confirm({
      title: 'Return submission',
      message: 'Return this work for revision? Existing score will be cleared.',
      confirmText: 'Return for revision',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!accepted) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/lms/submissions/${submission._id}/return`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to return submission.');
      setSubmissions((current) => current.map((item) => item._id === submission._id ? {
        ...item,
        ...payload.data,
        assignment: item.assignment,
        student: item.student,
      } : item));
      setGradeDrafts((current) => ({ ...current, [submission._id]: { score: '', feedback } }));
      toast.success('Submission returned for revision.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && assignments.length === 0) return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading assignments...</div>;
  if (error) return <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>;

  if (selected) {
    const duePassed = Date.now() > new Date(selected.dueAt).getTime();
    const revisionRequested = selected.submission?.status === 'returned';
    const cannotSubmit = selected.status !== 'published'
      || selected.submission?.status === 'graded'
      || (duePassed && !selected.allowLateSubmissions && !revisionRequested);
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-univ-blue"><ArrowLeft className="h-4 w-4" /> All assignments</button>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-900">{selected.title}</h2>{selected.status === 'closed' && <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">Closed</span>}</div><p className="mt-1 text-xs text-slate-500">Due {formatDate(selected.dueAt)} · {selected.points} points{selected.allowLateSubmissions ? ' · Late submissions accepted' : ''}</p></div>
            {canEdit && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setIsEditing((current) => !current)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> {isEditing ? 'Cancel edit' : 'Edit'}</button><button type="button" onClick={toggleAssignmentStatus} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{selected.status === 'closed' ? <LockKeyholeOpen className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}{selected.status === 'closed' ? 'Reopen' : 'Close'}</button><button type="button" onClick={() => deleteAssignment(selected)} className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div>}
          </div>
          {isEditing ? (
            <form onSubmit={saveAssignment} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              <fieldset disabled={isSaving} className="space-y-3 disabled:opacity-60"><label className="block text-xs font-semibold text-slate-600">Title<input required value={editDraft.title} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label><label className="block text-xs font-semibold text-slate-600">Instructions<textarea rows="5" value={editDraft.instructions} onChange={(event) => setEditDraft((current) => ({ ...current, instructions: event.target.value }))} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label><DueDateTimeFields value={editDraft.dueAt} onChange={(dueAt) => setEditDraft((current) => ({ ...current, dueAt }))} /><div><label className="block text-xs font-semibold text-slate-600">Points<input type="number" min="1" max="1000" required value={editDraft.points} onChange={(event) => setEditDraft((current) => ({ ...current, points: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue" /></label></div><label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={editDraft.allowLateSubmissions} onChange={(event) => setEditDraft((current) => ({ ...current, allowLateSubmissions: event.target.checked }))} className="rounded border-slate-300 text-univ-blue focus:ring-univ-blue" /> Accept late submissions</label><button type="submit" className="rounded-md bg-univ-blue px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">Save changes</button></fieldset>
            </form>
          ) : <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.instructions || 'No additional instructions.'}</p>}
        </section>

        {canManage ? (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Student submissions</h2><p className="mt-0.5 text-xs text-slate-500">{submissions.length} submitted · Scores stay inside LMS and do not publish official final grades.</p></div>
            {submissions.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No submissions yet.</div> : <div className="divide-y divide-slate-100">{submissions.map((submission) => {
              const draft = gradeDrafts[submission._id] || { score: '', feedback: '' };
              return (
                <article key={submission._id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{submission.student?.lastName}, {submission.student?.firstName}</p><p className="mt-1 font-mono text-xs text-slate-500">{submission.student?.studentId} · {formatDate(submission.submittedAt)}</p>{submission.text && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{submission.text}</p>}{submission.storageName && <button type="button" onClick={() => downloadProtected(`/api/lms/submissions/${submission._id}/download`, token, submission.originalName).catch((requestError) => toast.error(requestError.message))} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-univ-blue hover:underline"><Download className="h-3.5 w-3.5" /> {submission.originalName}</button>}<AttemptHistory submission={submission} token={token} /></div>
                    <div className="w-full space-y-2 lg:w-72"><label className="block text-xs font-semibold text-slate-600">Score out of {selected.points}<input type="number" min="0" max={selected.points} step="0.01" value={draft.score} disabled={!canEdit || submission.status === 'returned'} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission._id]: { ...draft, score: event.target.value } }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" /></label><label className="block text-xs font-semibold text-slate-600">Feedback<textarea rows="2" value={draft.feedback} disabled={!canEdit} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission._id]: { ...draft, feedback: event.target.value } }))} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" /></label>{submission.status === 'returned' ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">Awaiting revision</p> : canEdit ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => returnSubmission(submission)} disabled={isSaving} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"><RotateCcw className="h-3.5 w-3.5" /> Return</button><button type="button" onClick={() => gradeSubmission(submission)} disabled={isSaving || draft.score === ''} className="rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Save score</button></div> : <p className="text-xs text-slate-500">Read-only</p>}</div>
                  </div>
                </article>
              );
            })}</div>}
          </section>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-900">Your submission</h2><p className="mt-0.5 text-xs text-slate-500">{selected.submission ? `Last submitted ${formatDate(selected.submission.submittedAt)}` : 'No work submitted yet.'}</p></div><span className={`rounded-md border px-2 py-1 text-xs font-semibold ${submissionStatus(selected.submission).className}`}>{submissionStatus(selected.submission).label}</span></div>
            {selected.submission?.status === 'graded' && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-800">Score: {selected.submission.score} / {selected.points}</p>{selected.submission.feedback && <p className="mt-2 text-sm text-emerald-800">{selected.submission.feedback}</p>}<p className="mt-2 text-xs text-emerald-700">LMS score only. Registrar controls official final grades.</p></div>}
            {selected.submission?.status === 'returned' && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-800">Returned for revision</p><p className="mt-2 text-sm text-amber-800">{selected.submission.feedback}</p></div>}
            <form onSubmit={submitWork} className="mt-5 space-y-3"><fieldset disabled={cannotSubmit || isSaving || !isEnabled} className="space-y-3 disabled:opacity-60"><label className="block text-xs font-semibold text-slate-600">Written response<textarea rows="6" value={submissionDraft.text} onChange={(event) => setSubmissionDraft((current) => ({ ...current, text: event.target.value }))} placeholder="Enter your response" className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label><label className="block rounded-md border border-dashed border-slate-300 p-4 text-center text-xs font-medium text-slate-600 hover:border-univ-blue"><FileUp className="mx-auto mb-2 h-5 w-5 text-slate-400" />{submissionDraft.file?.name || selected.submission?.originalName || 'Attach file (optional, max 20 MB)'}<input type="file" onChange={(event) => setSubmissionDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))} className="sr-only" /></label><button type="submit" className="inline-flex items-center gap-2 rounded-md bg-univ-blue px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{selected.submission ? 'Resubmit work' : 'Submit work'}</button></fieldset></form>
            {cannotSubmit && <p className="mt-3 text-xs font-medium text-amber-700">{selected.status === 'closed' ? 'Assignment is closed.' : selected.submission?.status === 'graded' ? 'Graded submissions are locked.' : 'Submission deadline has passed.'}</p>}
            <AttemptHistory submission={selected.submission} token={token} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-base font-semibold text-slate-900">Assignments</h2><p className="mt-0.5 text-xs text-slate-500">{assignments.length} active or closed</p></div>
        {canEdit && <button type="button" onClick={() => setShowCreateForm((current) => !current)} className="rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">{showCreateForm ? 'Cancel' : 'New assignment'}</button>}
      </div>
      {canEdit && showCreateForm && (
        <form onSubmit={createAssignment} className="rounded-lg border border-slate-200 bg-white p-5">
          <fieldset disabled={isSaving} className="space-y-3 disabled:opacity-60"><div className="grid gap-3 lg:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Title<input required value={assignmentDraft.title} onChange={(event) => setAssignmentDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label><label className="block text-xs font-semibold text-slate-600">Points<input type="number" min="1" max="1000" required value={assignmentDraft.points} onChange={(event) => setAssignmentDraft((current) => ({ ...current, points: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue" /></label></div><label className="block text-xs font-semibold text-slate-600">Instructions<textarea rows="4" value={assignmentDraft.instructions} onChange={(event) => setAssignmentDraft((current) => ({ ...current, instructions: event.target.value }))} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label><DueDateTimeFields value={assignmentDraft.dueAt} onChange={(dueAt) => setAssignmentDraft((current) => ({ ...current, dueAt }))} /><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={assignmentDraft.allowLateSubmissions} onChange={(event) => setAssignmentDraft((current) => ({ ...current, allowLateSubmissions: event.target.checked }))} className="rounded border-slate-300 text-univ-blue focus:ring-univ-blue" /> Accept late submissions</label><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-univ-blue px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publish assignment</button></div></fieldset>
        </form>
      )}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {assignments.length === 0 ? <div className="p-10 text-center"><CalendarClock className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No assignments yet</p></div> : <div className="divide-y divide-slate-100">{assignments.map((assignment) => {
          const status = submissionStatus(assignment.submission);
          const timing = assignmentTiming(assignment);
          return <button key={assignment._id} type="button" onClick={() => openAssignment(assignment)} className="flex w-full flex-col gap-3 px-5 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900">{assignment.title}</p><p className="mt-1 text-xs text-slate-500">Due {formatDate(assignment.dueAt)} · {assignment.points} points · <span className={`font-semibold ${timing.className}`}>{timing.label}</span></p></div>{canManage ? <span className="text-xs font-semibold text-univ-blue">View submissions</span> : <span className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>}</button>;
        })}</div>}
      </section>
    </div>
  );
}
