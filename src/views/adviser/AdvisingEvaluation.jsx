import React, { useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
import Modal from '../../components/Modal';
import { SUBJECTS, PROGRAMS } from '../../data/mockData';

export default function AdvisingEvaluation({ studentId, onBack }) {
  const { dispatch, getStudentById } = useEnrollment();
  const { confirm } = useConfirm();

  const [notes, setNotes] = useState('');
  const [flashMessage, setFlashMessage] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [modalSelectedSubjects, setModalSelectedSubjects] = useState([]);

  const selectedStudent = getStudentById(studentId);
  const program = selectedStudent ? PROGRAMS.find(p => p.id === selectedStudent.programId) : null;

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

  if (!selectedStudent) return null;

  function showFlash(message, type) {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  }

  async function handleApproveAdvising() {
    const isConfirmed = await confirm({
      title: 'Approve Advising',
      message: `Are you sure you want to approve advising eligibility for ${selectedStudent.firstName} ${selectedStudent.lastName}? This allows them to proceed to payment.`,
      confirmText: 'Approve Advising',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!isConfirmed) return;

    await dispatch({
      type: 'APPROVE_ADVISING',
      payload: { studentId: selectedStudent.id, notes },
    });
    
    showFlash(`Advising approved for ${selectedStudent.firstName} ${selectedStudent.lastName}`, 'success');
    setTimeout(() => onBack(), 1500);
  }

  async function handleRejectAdvising() {
    if (!notes.trim()) {
      showFlash('Please provide evaluation comments/reasons for rejection.', 'error');
      return;
    }
    const isConfirmed = await confirm({
      title: 'Reject Advising',
      message: `Are you sure you want to reject the advising evaluation for ${selectedStudent.firstName} ${selectedStudent.lastName}? This will push them back and require them to fix their schedule based on your notes.`,
      confirmText: 'Reject Advising',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!isConfirmed) return;

    await dispatch({
      type: 'REJECT_ADVISING',
      payload: { studentId: selectedStudent.id, notes },
    });

    showFlash(`Advising rejected for ${selectedStudent.firstName} ${selectedStudent.lastName}`, 'success');
    setTimeout(() => onBack(), 1500);
  }

  function handleOpenSubjectModal() {
    setModalSelectedSubjects(selectedStudent.selectedSubjects.map((ss) => ss.subjectId));
    setShowSubjectModal(true);
  }

  function handleToggleSubject(subjectId) {
    setModalSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  }

  async function handleSaveSubjects() {
    const isConfirmed = await confirm({
      title: 'Save Subject Override',
      message: `Are you sure you want to update the course schedule and save the modified subjects for ${selectedStudent.firstName} ${selectedStudent.lastName}?`,
      confirmText: 'Save Selection',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!isConfirmed) return;

    await dispatch({
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
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 bg-white border-b border-slate-200/80 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-univ-navy hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-univ-navy">
              {selectedStudent.firstName} {selectedStudent.lastName}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="font-mono text-slate-400">{selectedStudent.id}</span>
              <span>&bull;</span>
              <span>{program?.name || 'No program selected'}</span>
              <span>&bull;</span>
              <span className="text-univ-gold">{selectedStudent.enrollmentType}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Flash message */}
        {flashMessage && (
          <div
            className={`mx-8 mt-6 px-4 py-3 rounded-xl text-xs font-bold shadow-sm ${
              flashMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40'
                : 'bg-rose-50 text-rose-700 border border-rose-200/40'
            }`}
          >
            {flashMessage.message}
          </div>
        )}

        <div className="p-8 space-y-6">
          {/* Student Change Request Alert */}
          {selectedStudent.subjectChangeRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-2 text-left">
              <div className="flex items-center gap-2 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 animate-pulse" />
                <span>Enrolled Course Modification Request</span>
              </div>
              <p className="text-xs text-amber-900 font-mono italic leading-relaxed bg-white/60 p-3 rounded-xl border border-amber-100/60 shadow-inner">
                "{selectedStudent.subjectChangeRequest}"
              </p>
              <p className="text-[10px] text-amber-750 font-medium">
                Please use the <strong>Modify Subjects Selection</strong> override button at the bottom of the page to apply these changes.
              </p>
            </div>
          )}

          {/* Academic Profile */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
            <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Academic Course Profile</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Program</p>
                <p className="text-xs font-bold text-univ-navy mt-1 truncate">{program?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department</p>
                <p className="text-xs font-bold text-univ-navy mt-1">{program?.department || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credits Selection</p>
                <p className="text-xs font-bold text-univ-navy mt-1">{totalUnits} Units Selected</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enrollment Term</p>
                <p className="text-xs font-bold text-univ-navy mt-1">{selectedStudent.academicTerm || '—'}</p>
              </div>
            </div>
          </div>

          {/* Selected Subjects */}
          {selectedSubjectDetails.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
              <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Selected Subjects for Term</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                      <th className="px-4 py-3.5">Code</th>
                      <th className="px-4 py-3.5">Subject Description</th>
                      <th className="px-4 py-3.5">Units</th>
                      <th className="px-4 py-3.5">Time Schedule & Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedSubjectDetails.map((subject) => (
                      <tr key={subject.id} className="hover:bg-slate-50/30">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-univ-navy">{subject.code}</td>
                        <td className="px-4 py-3.5 text-slate-700 font-semibold">{subject.name}</td>
                        <td className="px-4 py-3.5 text-slate-500 font-bold">{subject.units}</td>
                        <td className="px-4 py-3.5 text-slate-500 font-semibold">
                          {subject.schedule.day} &bull; {subject.schedule.time} ({subject.schedule.room})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Curriculum Evaluation & Action Section */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
            <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Curriculum Prerequisite Evaluation</h3>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-3.5">Code</th>
                    <th className="px-4 py-3.5">Subject Description</th>
                    <th className="px-4 py-3.5">Required Prerequisites</th>
                    <th className="px-4 py-3.5">Advising Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {programSubjects.map((subject) => {
                    const prereqStatus = getPrereqStatus(subject);
                    const prereqNames = subject.prerequisites
                      .map((pid) => {
                        const ps = SUBJECTS.find((s) => s.id === pid);
                        return ps ? ps.code : pid;
                      })
                      .join(', ');

                    return (
                      <tr key={subject.id} className="hover:bg-slate-50/30">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-univ-navy">{subject.code}</td>
                        <td className="px-4 py-3.5 text-slate-700 font-semibold">{subject.name}</td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">{prereqNames || 'None'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${prereqStatus.color}`}>
                            {prereqStatus.label === 'Eligible' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
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
            <div className="space-y-2 mb-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluation Comments</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write enrollment advisory instructions or credit remarks here..."
                rows={3}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
              <button
                onClick={handleApproveAdvising}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all shadow-sm cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Eligibility
              </button>
              <button
                onClick={handleRejectAdvising}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4" />
                Reject &amp; Return
              </button>
              <div className="flex-1"></div>
              <button
                onClick={handleOpenSubjectModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                Modify Subjects Selection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Selection Modal */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="Modify Subject Selection"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 mb-4 font-semibold uppercase tracking-wider">
            Select curriculum subjects for {selectedStudent?.firstName} {selectedStudent?.lastName}
          </p>
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {programSubjects.map((subject) => (
              <label
                key={subject.id}
                className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer bg-white"
              >
                <input
                  type="checkbox"
                  checked={modalSelectedSubjects.includes(subject.id)}
                  onChange={() => handleToggleSubject(subject.id)}
                  className="h-4 w-4 rounded border-slate-300 text-univ-indigo focus:ring-univ-indigo cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded">{subject.code}</span>
                    <span className="text-xs font-bold text-univ-navy">{subject.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    {subject.units} units &bull; {subject.schedule.day} {subject.schedule.time} ({subject.schedule.room})
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => setShowSubjectModal(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSubjects}
              className="px-5 py-2.5 text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all cursor-pointer shadow-sm"
            >
              Save Selection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
