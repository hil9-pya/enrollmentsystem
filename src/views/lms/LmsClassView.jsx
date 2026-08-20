import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FileText, Loader2, Megaphone, Pin, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmationContext';
import LmsAssignmentsTab from './LmsAssignmentsTab';
import LmsGradebookTab from './LmsGradebookTab';

const tabs = [
  { id: 'overview', label: 'Course home' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'materials', label: 'Materials' },
  { id: 'assignments', label: 'Assignments' },
];

function displayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'NCST staff';
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LmsClassView({ offering: initialOffering, role, token, onBack, initialTab = 'overview' }) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [classData, setClassData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [roster, setRoster] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', body: '', isPinned: false });
  const [materialDraft, setMaterialDraft] = useState({ title: '', description: '', file: null });
  const materialFileInputRef = useRef(null);

  const offeringId = initialOffering._id;
  const canManage = Boolean(classData?.canManage);
  const offering = classData?.offering || initialOffering;
  const isEnabled = Boolean(offering?.lmsEnabled);

  const loadClass = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const requests = [
        fetch(`/api/lms/offerings/${offeringId}`, { headers, cache: 'no-store' }),
        fetch(`/api/lms/offerings/${offeringId}/announcements`, { headers, cache: 'no-store' }),
        fetch(`/api/lms/offerings/${offeringId}/materials`, { headers, cache: 'no-store' }),
      ];
      if (role === 'instructor' || role === 'admin') {
        requests.push(fetch(`/api/academic/offerings/${offeringId}/roster`, { headers, cache: 'no-store' }));
      }
      const responses = await Promise.all(requests);
      const payloads = await Promise.all(responses.map((response) => response.json()));
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) throw new Error(payloads[failedIndex].message || payloads[failedIndex].error || 'Unable to load class.');
      setClassData(payloads[0].data);
      setAnnouncements(payloads[1].data || []);
      setMaterials(payloads[2].data || []);
      setRoster(payloads[3]?.data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [offeringId, role, token]);

  useEffect(() => { loadClass(); }, [loadClass]);

  const visibleTabs = useMemo(() => (
    canManage ? [...tabs, { id: 'gradebook', label: 'Gradebook' }, { id: 'roster', label: 'Roster' }] : tabs
  ), [canManage]);

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter((membership) => {
      const student = membership.student || {};
      return [student.studentId, student.firstName, student.lastName, student.programId]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [roster, search]);

  const publishAnnouncement = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch(`/api/lms/offerings/${offeringId}/announcements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementDraft),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to publish announcement.');
      setAnnouncements((current) => [payload.data, ...current]);
      setAnnouncementDraft({ title: '', body: '', isPinned: false });
      toast.success('Announcement published.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeAnnouncement = async (announcement) => {
    const accepted = await confirm({ title: 'Delete announcement', message: `Delete “${announcement.title}”?`, confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' });
    if (!accepted) return;
    const response = await fetch(`/api/lms/announcements/${announcement._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || payload.error || 'Unable to delete announcement.');
    setAnnouncements((current) => current.filter((item) => item._id !== announcement._id));
    toast.success('Announcement deleted.');
  };

  const uploadMaterial = async (event) => {
    event.preventDefault();
    if (!materialDraft.file) return toast.error('Select a file to upload.');
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', materialDraft.title);
      formData.append('description', materialDraft.description);
      formData.append('file', materialDraft.file);
      const response = await fetch(`/api/lms/offerings/${offeringId}/materials`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to upload material.');
      setMaterials((current) => [payload.data, ...current]);
      setMaterialDraft({ title: '', description: '', file: null });
      if (materialFileInputRef.current) materialFileInputRef.current.value = '';
      toast.success('Learning material uploaded.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadMaterial = async (material) => {
    try {
      const response = await fetch(`/api/lms/materials/${material._id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || payload.error || 'Unable to download file.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = material.originalName || material.title;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  const removeMaterial = async (material) => {
    const accepted = await confirm({ title: 'Delete material', message: `Delete “${material.title}”? The uploaded file will also be removed.`, confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' });
    if (!accepted) return;
    const response = await fetch(`/api/lms/materials/${material._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || payload.error || 'Unable to delete material.');
    setMaterials((current) => current.filter((item) => item._id !== material._id));
    toast.success('Material deleted.');
  };

  if (isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading class...</div>;
  if (error) return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" /> Back to classes</button>
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
    </div>
  );

  return (
    <>
      <div>
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" /> Back to classes</button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700">{offering.subjectCode}</span>
              <span className="rounded-md bg-slate-200/70 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{offering.sectionCode}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{offering.subjectName}</h1>
            <p className="mt-1 text-sm text-slate-600">{offering.instructorName || 'Instructor not assigned'} · {offering.schedule?.day || 'TBA'} {offering.schedule?.time || 'TBA'}</p>
          </div>
          <span className={`w-fit rounded-md border px-2.5 py-1.5 text-xs font-semibold ${isEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{isEnabled ? 'LMS active' : 'LMS disabled'}</span>
        </div>
      </div>

      {!isEnabled && canManage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Admin must enable this course before instructors can publish announcements or upload materials.</div>
      )}

      <div className="border-b border-slate-200">
        <nav className="flex gap-6 overflow-x-auto" aria-label="Class sections">
          {visibleTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold ${active ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Course summary</h2>
              <p className="mt-0.5 text-xs text-slate-500">Current activity and published resources</p>
            </div>
            <dl className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {[
                { label: 'Enrolled students', value: classData.rosterCount },
                { label: 'Announcements', value: classData.announcementCount },
                { label: 'Learning materials', value: classData.materialCount },
                { label: 'Assignments', value: classData.assignmentCount },
              ].map((item) => (
                <div key={item.label} className="px-5 py-4">
                  <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-slate-900">Latest announcement</h2>
                <button type="button" onClick={() => setActiveTab('announcements')} className="text-xs font-semibold text-univ-blue hover:underline">View all</button>
              </div>
              {announcements[0] ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-900">{announcements[0].title}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(announcements[0].publishedAt || announcements[0].createdAt)}</p>
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcements[0].body}</p>
                </div>
              ) : <p className="mt-4 text-sm text-slate-500">No announcements have been posted.</p>}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-slate-900">Newest material</h2>
                <button type="button" onClick={() => setActiveTab('materials')} className="text-xs font-semibold text-univ-blue hover:underline">View all</button>
              </div>
              {materials[0] ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-900">{materials[0].title}</p>
                  <p className="mt-1 text-xs text-slate-500">{materials[0].originalName} · {formatSize(materials[0].size)}</p>
                  {materials[0].description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{materials[0].description}</p>}
                  <button type="button" onClick={() => downloadMaterial(materials[0])} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-univ-blue hover:underline"><Download className="h-3.5 w-3.5" /> Download</button>
                </div>
              ) : <p className="mt-4 text-sm text-slate-500">No learning materials have been uploaded.</p>}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-3">
            {announcements.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm"><Megaphone className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No announcements yet</p></div>
            ) : announcements.map((announcement) => (
              <article key={announcement._id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">{announcement.isPinned && <Pin className="h-3.5 w-3.5 text-indigo-600" />}<h2 className="text-sm font-semibold text-slate-900">{announcement.title}</h2></div>
                    <p className="mt-1 text-xs text-slate-500">{displayName(announcement.author)} · {formatDate(announcement.publishedAt || announcement.createdAt)}</p>
                  </div>
                  {canManage && isEnabled && <button type="button" onClick={() => removeAnnouncement(announcement)} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${announcement.title}`}><Trash2 className="h-4 w-4" /></button>}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{announcement.body}</p>
              </article>
            ))}
          </section>
          {canManage && (
            <form onSubmit={publishAnnouncement} className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">New announcement</h2>
              <fieldset disabled={!isEnabled || isSaving} className="mt-4 space-y-3 disabled:opacity-60">
                <input value={announcementDraft.title} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))} required placeholder="Announcement title" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                <textarea value={announcementDraft.body} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, body: event.target.value }))} required rows="5" placeholder="Write an update for the class" className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={announcementDraft.isPinned} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, isPinned: event.target.checked }))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Pin announcement</label>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publish</button>
              </fieldset>
            </form>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {materials.length === 0 ? (
              <div className="p-10 text-center"><FileText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No learning materials yet</p></div>
            ) : <div className="divide-y divide-slate-100">{materials.map((material) => (
              <article key={material._id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{material.title}</p><p className="mt-1 truncate text-xs text-slate-500">{material.originalName} · {formatSize(material.size)} · {formatDate(material.createdAt)}</p>{material.description && <p className="mt-2 text-xs text-slate-600">{material.description}</p>}</div>
                <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => downloadMaterial(material)} className="rounded-md p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700" aria-label={`Download ${material.title}`}><Download className="h-4 w-4" /></button>{canManage && isEnabled && <button type="button" onClick={() => removeMaterial(material)} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${material.title}`}><Trash2 className="h-4 w-4" /></button>}</div>
              </article>
            ))}</div>}
          </section>
          {canManage && (
            <form onSubmit={uploadMaterial} className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Upload material</h2>
              <fieldset disabled={!isEnabled || isSaving} className="mt-4 space-y-3 disabled:opacity-60">
                <input value={materialDraft.title} onChange={(event) => setMaterialDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Display title (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                <textarea value={materialDraft.description} onChange={(event) => setMaterialDraft((current) => ({ ...current, description: event.target.value }))} rows="3" placeholder="Short description (optional)" className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                <label className="block rounded-md border border-dashed border-slate-300 p-4 text-center text-xs font-medium text-slate-600 hover:border-indigo-400"><Upload className="mx-auto mb-2 h-5 w-5 text-slate-400" />{materialDraft.file?.name || 'Choose a file up to 20 MB'}<input ref={materialFileInputRef} type="file" required onClick={(event) => { event.currentTarget.value = ''; }} onChange={(event) => setMaterialDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))} className="sr-only" /></label>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Upload</button>
              </fieldset>
            </form>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <LmsAssignmentsTab
          offeringId={offeringId}
          canManage={canManage}
          isEnabled={isEnabled}
          token={token}
        />
      )}

      {activeTab === 'gradebook' && canManage && (
        <LmsGradebookTab offeringId={offeringId} token={token} />
      )}

      {activeTab === 'roster' && canManage && (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Official class roster</h2><p className="mt-0.5 text-xs text-slate-500">{roster.length} enrolled or completed students</p></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" /></label></div>
          {filteredRoster.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No students found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Membership</th><th className="px-5 py-3">Grade status</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRoster.map((membership) => <tr key={membership._id} className="text-sm text-slate-700"><td className="px-5 py-3.5"><p className="font-semibold text-slate-900">{membership.student?.lastName}, {membership.student?.firstName}</p><p className="mt-0.5 font-mono text-xs text-slate-500">{membership.student?.studentId}</p></td><td className="px-4 py-3.5 text-xs">{String(membership.student?.programId || '—').toUpperCase()}</td><td className="px-4 py-3.5 text-xs capitalize">{membership.status}</td><td className="px-5 py-3.5 text-xs capitalize">{String(membership.gradeStatus || 'not submitted').replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>}
        </section>
      )}
    </>
  );
}
