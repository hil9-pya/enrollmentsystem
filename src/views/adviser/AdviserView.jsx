import { useState, useMemo } from 'react';
import { GraduationCap, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';
import Modal from '../../components/Modal';
import { SUBJECTS, PROGRAMS } from '../../data/mockData';

export default function AdviserView() {
  const { state, dispatch, getStudentsByStatus, getStudentById } = useEnrollment();

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [flashMessage, setFlashMessage] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [modalSelectedSubjects, setModalSelectedSubjects] = useState([]);

  const queueStudents = getStudentsByStatus('advising_pending');

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return queueStudents;
    const q = searchQuery.toLowerCase();
    return queueStudents.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [queueStudents, searchQuery]);

  const selectedStudent = selectedStudentId ? getStudentById(selectedStudentId) : null;
  const program = selectedStudent
    ? PROGRAMS.find((p) => p.id === selectedStudent.programId)
    : null;

  const programSubjects = useMemo(() => {
    if (!selectedStudent) return [];
    return SUBJECTS.filter((s) => s.programId === selectedStudent.programId);
  }, [selectedStudent]);

  const selectedSubjectDetails = useMemo(() => {
    if (!selectedStudent) return [];
    return selectedStudent.selectedSubjects
      .map((ss) => SUBJECTS.find((s) => s.id === ss.subjectId))
      .filter(Boolean);
  }, [selectedStudent]);

  const totalUnits = useMemo(() => {
    return selectedSubjectDetails.reduce((sum, s) => sum + s.units, 0);
  }, [selectedSubjectDetails]);

  function handleSelectStudent(studentId) {
    setSelectedStudentId(studentId);
    setNotes('');
    setFlashMessage(null);
    dispatch({ type: 'SET_CURRENT_STUDENT', payload: { studentId } });
  }

  function showFlash(message, type) {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  }

  function handleApproveAdvising() {
    if (!selectedStudent) return;
    dispatch({
      type: 'APPROVE_ADVISING',
      payload: { studentId: selectedStudent.id, notes },
    });
    showFlash(`Advising approved for ${selectedStudent.firstName} ${selectedStudent.lastName}`, 'success');
    setSelectedStudentId(null);
    setNotes('');
  }

  function handleOpenSubjectModal() {
    if (!selectedStudent) return;
    setModalSelectedSubjects(
      selectedStudent.selectedSubjects.map((ss) => ss.subjectId)
    );
    setShowSubjectModal(true);
  }

  function handleToggleSubject(subjectId) {
    setModalSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  }

  function handleSaveSubjects() {
    if (!selectedStudent) return;
    dispatch({
      type: 'UPDATE_STUDENT_SUBJECTS',
      payload: {
        studentId: selectedStudent.id,
        subjects: modalSelectedSubjects.map((id) => ({ subjectId: id })),
      },
    });
    setShowSubjectModal(false);
    showFlash('Subject selection updated', 'success');
  }

  function getPrereqStatus(subject) {
    if (subject.prerequisites.length === 0) {
      return { label: 'Eligible', color: 'text-emerald-600' };
    }
    return { label: 'Prereqs Required', color: 'text-amber-500' };
  }

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Queue ─────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-6 pb-4 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Academic Advising Queue</h2>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or ID..."
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6">
              <GraduationCap className="h-10 w-10 mb-3" />
              <p className="text-sm text-center">No students pending advising</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => handleSelectStudent(student.id)}
                className={`w-full text-left p-4 border-b border-slate-100 transition-colors duration-150 cursor-pointer ${
                  selectedStudentId === student.id
                    ? 'bg-slate-50 border-l-2 border-l-indigo-600'
                    : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{student.id}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={student.status} />
                  <span className="text-xs text-slate-500 capitalize">{student.enrollmentType}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Flash message */}
        {flashMessage && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-md text-sm font-medium ${
              flashMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {flashMessage.message}
          </div>
        )}

        {!selectedStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <GraduationCap className="h-12 w-12 mb-4" />
            <p className="text-sm">Select a student for academic advising</p>
          </div>
        ) : (
          <>
            {/* ── Top Half ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto border-b border-slate-200 p-6 space-y-6">
              {/* Student Header */}
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-mono text-slate-500">{selectedStudent.id}</span>
                    <span className="text-sm text-slate-500">{program?.name || '—'}</span>
                    <span className="text-sm text-slate-500 capitalize">{selectedStudent.enrollmentType}</span>
                  </div>
                </div>
              </div>

              {/* Academic Profile */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Academic Profile</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Program</p>
                    <p className="text-sm text-slate-700">{program?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Department</p>
                    <p className="text-sm text-slate-700">{program?.department || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Total Units</p>
                    <p className="text-sm text-slate-700">{totalUnits} units selected</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Academic Term</p>
                    <p className="text-sm text-slate-700">{selectedStudent.academicTerm || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Selected Subjects */}
              {selectedSubjectDetails.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Selected Subjects</h3>
                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Units</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Schedule</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSubjectDetails.map((subject) => (
                          <tr key={subject.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-4 py-3 font-mono text-xs text-slate-700">{subject.code}</td>
                            <td className="px-4 py-3 text-slate-700">{subject.name}</td>
                            <td className="px-4 py-3 text-slate-500">{subject.units}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {subject.schedule.day} {subject.schedule.time}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bottom Half (45%) ─────────────────────────────────── */}
            <div className="h-[45%] overflow-y-auto p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Prerequisite Evaluation</h3>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Prerequisites</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programSubjects.map((subject) => {
                      const prereqStatus = getPrereqStatus(subject);
                      const prereqNames = subject.prerequisites
                        .map((pid) => {
                          const ps = SUBJECTS.find((s) => s.id === pid);
                          return ps ? ps.code : pid;
                        })
                        .join(', ');

                      return (
                        <tr key={subject.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{subject.code}</td>
                          <td className="px-4 py-3 text-slate-700">{subject.name}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{prereqNames || 'None'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${prereqStatus.color}`}>
                              {prereqStatus.label === 'Eligible' ? (
                                <CheckCircle className="h-3.5 w-3.5" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                              {prereqStatus.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Adviser Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add advising notes..."
                rows={2}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-150 resize-none"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApproveAdvising}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors duration-150"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Eligibility
                </button>
                <button
                  onClick={handleOpenSubjectModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors duration-150"
                >
                  <BookOpen className="h-4 w-4" />
                  Modify Subjects
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Subject Selection Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="Modify Subject Selection"
        maxWidth="max-w-xl"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-4">
            Select subjects for {selectedStudent?.firstName} {selectedStudent?.lastName}
          </p>
          {programSubjects.map((subject) => (
            <label
              key={subject.id}
              className="flex items-center gap-3 p-3 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={modalSelectedSubjects.includes(subject.id)}
                onChange={() => handleToggleSubject(subject.id)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">{subject.code}</span>
                  <span className="text-sm text-slate-900">{subject.name}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {subject.units} units · {subject.schedule.day} {subject.schedule.time}
                </p>
              </div>
            </label>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
            <button
              onClick={() => setShowSubjectModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSubjects}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors duration-150"
            >
              Save Selection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
