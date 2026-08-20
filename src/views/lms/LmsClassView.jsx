import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2, Pin, Search, Trash2, Upload } from 'lucide-react';
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
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [roster, setRoster] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', body: '', isPinned: false });
  const [materialDraft, setMaterialDraft] = useState({ title: '', description: '', file: null });
  const materialFileInputRef = useRef(null);

  const offeringId = initialOffering._id;
  const canManage = Boolean(classData?.canManage);
  const offering = classData?.offering || initialOffering;
  const isEnabled = Boolean(offering?.lmsEnabled);
  const termIsWritable = ['active', 'open'].includes(offering?.status)
    && Boolean(offering?.term?.isActive)
    && (!offering?.term?.lmsClosesAt || Date.now() <= new Date(offering.term.lmsClosesAt).getTime());
  const canWrite = isEnabled && termIsWritable;
  const canEdit = canManage && canWrite;

  const loadClass = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const requests = [
        fetch(`/api/lms/offerings/${offeringId}`, { headers, cache: 'no-store' }),
        fetch(`/api/lms/offerings/${offeringId}/announcements`, { headers, cache: 'no-store' }),
        fetch(`/api/lms/offerings/${offeringId}/materials`, { headers, cache: 'no-store' }),
        fetch(`/api/lms/offerings/${offeringId}/assignments`, { headers, cache: 'no-store' }),
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
      setCourseAssignments(payloads[3].data || []);
      setRoster(payloads[4]?.data || []);
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

  const courseActivity = useMemo(() => [
    ...announcements.map((item) => ({ id: `announcement-${item._id}`, type: 'Announcement', title: item.title, date: item.publishedAt || item.createdAt, tab: 'announcements' })),
    ...materials.map((item) => ({ id: `material-${item._id}`, type: 'Material', title: item.title, date: item.createdAt, tab: 'materials' })),
    ...courseAssignments.map((item) => ({ id: `assignment-${item._id}`, type: 'Assignment', title: item.title, date: item.publishedAt || item.createdAt, tab: 'assignments' })),
  ].sort((left, right) => new Date(right.date) - new Date(left.date)).slice(0, 6), [announcements, courseAssignments, materials]);

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
      setShowAnnouncementForm(false);
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
      setShowMaterialForm(false);
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

  if (isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading class...</div>;
  if (error) return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-univ-blue"><ArrowLeft className="h-4 w-4" /> Back to classes</button>
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
    </div>
  );

  return (
    <>
      <div>
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-univ-blue"><ArrowLeft className="h-4 w-4" /> Back to classes</button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-univ-blue">{offering.subjectCode}</span>
              <span className="rounded-md bg-slate-200/70 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{offering.sectionCode}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{offering.subjectName}</h1>
            <p className="mt-1 text-sm text-slate-600">{offering.instructorName || 'Instructor not assigned'} · {offering.schedule?.day || 'TBA'} {offering.schedule?.time || 'TBA'}</p>
          </div>
          <span className={`w-fit text-xs font-semibold ${canWrite ? 'text-emerald-700' : 'text-amber-700'}`}>{canWrite ? 'Course active' : isEnabled ? 'Read-only' : 'Course disabled'}</span>
        </div>
      </div>

      {!canWrite && canManage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{!isEnabled ? 'Admin must enable this course before instructors can change LMS content.' : 'This academic term is closed. LMS content and grades are read-only.'}</div>
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
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Course details</h2>
            </div>
            <dl className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs text-slate-500">Instructor</dt><dd className="mt-1 text-sm font-medium text-slate-900">{offering.instructorName || 'Not assigned'}</dd></div>
              <div><dt className="text-xs text-slate-500">Schedule</dt><dd className="mt-1 text-sm font-medium text-slate-900">{offering.schedule?.day || 'TBA'} · {offering.schedule?.time || 'TBA'}</dd></div>
              <div><dt className="text-xs text-slate-500">Room</dt><dd className="mt-1 text-sm font-medium text-slate-900">{offering.schedule?.room || 'TBA'}</dd></div>
              <div><dt className="text-xs text-slate-500">Participants</dt><dd className="mt-1 text-sm font-medium text-slate-900">{classData.rosterCount} students</dd></div>
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
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Course activity</h2></div>
            {courseActivity.length === 0 ? <div className="px-5 py-8 text-center text-sm text-slate-500">No course activity yet.</div> : <div className="divide-y divide-slate-100">{courseActivity.map((item) => <button key={item.id} type="button" onClick={() => setActiveTab(item.tab)} className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{item.title}</span><span className="mt-0.5 block text-xs text-slate-500">{item.type}</span></span><span className="shrink-0 text-xs text-slate-400">{formatDate(item.date)}</span></button>)}</div>}
          </section>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-base font-semibold text-slate-900">Announcements</h2><p className="mt-0.5 text-xs text-slate-500">{announcements.length} posted</p></div>
            {canEdit && <button type="button" onClick={() => setShowAnnouncementForm((current) => !current)} className="rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">{showAnnouncementForm ? 'Cancel' : 'New announcement'}</button>}
          </div>
          {canEdit && showAnnouncementForm && (
            <form onSubmit={publishAnnouncement} className="rounded-lg border border-slate-200 bg-white p-5">
              <fieldset disabled={isSaving} className="space-y-3 disabled:opacity-60">
                <label className="block text-xs font-semibold text-slate-600">Title<input value={announcementDraft.title} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label>
                <label className="block text-xs font-semibold text-slate-600">Message<textarea value={announcementDraft.body} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, body: event.target.value }))} required rows="5" className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={announcementDraft.isPinned} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, isPinned: event.target.checked }))} className="rounded border-slate-300 text-univ-blue focus:ring-univ-blue" /> Pin announcement</label><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-univ-blue px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publish</button></div>
              </fieldset>
            </form>
          )}
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {announcements.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No announcements yet.</div> : <div className="divide-y divide-slate-100">{announcements.map((announcement) => (
              <article key={announcement._id} className="px-5 py-5">
                <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2">{announcement.isPinned && <Pin className="h-3.5 w-3.5 text-univ-blue" aria-label="Pinned" />}<h3 className="text-sm font-semibold text-slate-900">{announcement.title}</h3></div><p className="mt-1 text-xs text-slate-500">{displayName(announcement.author)} · {formatDate(announcement.publishedAt || announcement.createdAt)}</p></div>{canEdit && <button type="button" onClick={() => removeAnnouncement(announcement)} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${announcement.title}`}><Trash2 className="h-4 w-4" /></button>}</div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{announcement.body}</p>
              </article>
            ))}</div>}
          </section>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900">Materials</h2><p className="mt-0.5 text-xs text-slate-500">{materials.length} files</p></div>{canEdit && <button type="button" onClick={() => setShowMaterialForm((current) => !current)} className="rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">{showMaterialForm ? 'Cancel' : 'Upload material'}</button>}</div>
          {canEdit && showMaterialForm && (
            <form onSubmit={uploadMaterial} className="rounded-lg border border-slate-200 bg-white p-5">
              <fieldset disabled={isSaving} className="grid gap-3 disabled:opacity-60 lg:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Display title <span className="font-normal text-slate-400">(optional)</span><input value={materialDraft.title} onChange={(event) => setMaterialDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label><label className="block text-xs font-semibold text-slate-600">Description <span className="font-normal text-slate-400">(optional)</span><input value={materialDraft.description} onChange={(event) => setMaterialDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label><label className="block rounded-md border border-dashed border-slate-300 p-3 text-center text-xs font-medium text-slate-600 hover:border-univ-blue"><Upload className="mr-2 inline h-4 w-4 text-slate-400" />{materialDraft.file?.name || 'Choose file up to 20 MB'}<input ref={materialFileInputRef} type="file" required onClick={(event) => { event.currentTarget.value = ''; }} onChange={(event) => setMaterialDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))} className="sr-only" /></label><div className="flex items-center justify-end"><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-univ-blue px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Upload</button></div></fieldset>
            </form>
          )}
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {materials.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No learning materials yet.</div> : <div className="divide-y divide-slate-100">{materials.map((material) => (
              <article key={material._id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{material.title}</p><p className="mt-1 truncate text-xs text-slate-500">{material.originalName} · {formatSize(material.size)} · {formatDate(material.createdAt)}</p>{material.description && <p className="mt-2 text-xs text-slate-600">{material.description}</p>}</div><div className="flex items-center gap-1"><button type="button" onClick={() => downloadMaterial(material)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-univ-blue hover:bg-blue-50"><Download className="h-4 w-4" /> Download</button>{canEdit && <button type="button" onClick={() => removeMaterial(material)} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${material.title}`}><Trash2 className="h-4 w-4" /></button>}</div></article>
            ))}</div>}
          </section>
        </div>
      )}

      {activeTab === 'assignments' && (
        <LmsAssignmentsTab
          offeringId={offeringId}
          canManage={canManage}
          canEdit={canEdit}
          isEnabled={canWrite}
          token={token}
        />
      )}

      {activeTab === 'gradebook' && canManage && (
        <LmsGradebookTab offeringId={offeringId} token={token} canEdit={canEdit} />
      )}

      {activeTab === 'roster' && canManage && (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Official class roster</h2><p className="mt-0.5 text-xs text-slate-500">{roster.length} enrolled or completed students</p></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" /></label></div>
          {filteredRoster.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No students found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Membership</th><th className="px-5 py-3">Grade status</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRoster.map((membership) => <tr key={membership._id} className="text-sm text-slate-700"><td className="px-5 py-3.5"><p className="font-semibold text-slate-900">{membership.student?.lastName}, {membership.student?.firstName}</p><p className="mt-0.5 font-mono text-xs text-slate-500">{membership.student?.studentId}</p></td><td className="px-4 py-3.5 text-xs">{String(membership.student?.programId || '—').toUpperCase()}</td><td className="px-4 py-3.5 text-xs capitalize">{membership.status}</td><td className="px-5 py-3.5 text-xs capitalize">{String(membership.gradeStatus || 'not submitted').replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>}
        </section>
      )}
    </>
  );
}
