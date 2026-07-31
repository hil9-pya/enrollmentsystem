import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { SUBJECTS } from '../data/mockData.js';
import { useAuth } from './AuthContext';

const EnrollmentContext = createContext(null);
const authFetch = (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

const safeJson = async (res) => {
  if (!res.ok) {
    let errorMsg = `Server error (Status ${res.status})`;
    try {
      const data = await res.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      // Fallback for non-JSON responses (e.g. 502 HTML pages)
    }
    throw new Error(errorMsg);
  }
  return res.json();
};



export function EnrollmentProvider({ children }) {
  const { token, user } = useAuth();
  const [currentRole, setRole] = useState('student');
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStudentId, setActiveStudentId] = useState(() => {
    return localStorage.getItem('student_active_id') || 'STU-2026-0006';
  });

  const setActiveStudent = (id) => {
    setActiveStudentId(id);
    if (id) {
      localStorage.setItem('student_active_id', id);
    } else {
      localStorage.removeItem('student_active_id');
    }
  };

  // 1. Fetch initial students array from backend SQLite on mount and poll periodically
  useEffect(() => {
    async function loadStudents() {
      // Fetch global settings (public) with cache-busting
      try {
        const settingsRes = await fetch('/api/settings', { cache: 'no-store' });
        const settingsData = await safeJson(settingsRes);
        setSettings(settingsData);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }

      if (!token || user?.role === 'student') {
        setStudents((prev) => prev.filter(s => s.id === activeStudentId));
        setIsLoading(false);
        return;
      }
      try {
        const res = await authFetch('/api/admin/students');
        if (res.status === 401 || res.status === 403) {
          setIsLoading(false);
          return;
        }
        const data = await safeJson(res);
        setStudents((prev) => {
          const active = prev.find((s) => s.id === activeStudentId);
          if (active && !data.some((s) => s.id === activeStudentId)) {
            return [...data, active];
          }
          return data;
        });
      } catch (err) {
        console.error('Failed to connect to backend enrollment server:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudents();

    const interval = setInterval(loadStudents, 15000);
    return () => clearInterval(interval);
  }, [activeStudentId, token, user?.role]);

  // 1b. Fetch active student profile from backend when activeStudentId changes and poll periodically
  useEffect(() => {
    async function loadActiveStudent() {
      // Staff data comes only from the protected staff list. Do not re-add an
      // applicant draft retained in browser storage after staff sign-in.
      if (!activeStudentId || (token && user?.role !== 'student')) return;
      try {
        const res = await fetch(`/api/students/${activeStudentId}`);
        const data = await safeJson(res);
        if (data && data.id) {
          setStudents((prev) => {
            const exists = prev.some((s) => s.id === data.id);
            if (exists) {
              return prev.map((s) => (s.id === data.id ? data : s));
            } else {
              return [...prev, data];
            }
          });
        }
      } catch (err) {
        console.error('Failed to load active student:', err.message || err);
      }
    }
    loadActiveStudent();

    const interval = setInterval(loadActiveStudent, 10000);
    return () => clearInterval(interval);
  }, [activeStudentId, token, user?.role]);

  // 2. Custom Dispatch Interceptor to handle async HTTP calls and synchronize state
  const dispatch = useCallback(async (action) => {
    const { type, payload } = action;
    const isSilentUpdate = type === 'UPDATE_ACTIVE_STUDENT';

    // A. Handle Synchronous UI actions locally
    if (type === 'SET_ROLE') {
      setRole(payload.role);
      return;
    }
    if (type === 'SET_CURRENT_STUDENT') {
      setCurrentStudentId(payload.studentId);
      return;
    }

    // B. Handle Database mutations over REST API
    try {
      if (!isSilentUpdate) {
        setIsLoading(true);
      }
      let updatedStudent = null;

      if (type === 'SET_ENROLLMENT_TYPE') {
        const res = await authFetch(`/api/students/${activeStudentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentType: payload.enrollmentType }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'UPDATE_ACTIVE_STUDENT') {
        const res = await authFetch(`/api/students/${activeStudentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'UPDATE_STUDENT_BY_ID') {
        const res = await authFetch(`/api/students/${payload.studentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload.updates),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'SUBMIT_DOCUMENTS') {
        const res = await authFetch(`/api/students/${activeStudentId}/submit-documents`, {
          method: 'POST',
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'UPLOAD_DOCUMENT') {
        // Upload the real file selected by the user via the file picker
        const formData = new FormData();
        formData.append('typeId', payload.typeId);
        formData.append('file', payload.file); // Real File object from <input type="file">

        const res = await authFetch(`/api/students/${activeStudentId}/documents`, {
          method: 'POST',
          body: formData,
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'REMOVE_DOCUMENT') {
        const res = await authFetch(`/api/students/${activeStudentId}/documents/${payload.typeId}`, {
          method: 'DELETE',
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'SELECT_PROGRAM') {
        const res = await authFetch(`/api/students/${activeStudentId}/select-program`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: payload.programId, academicTerm: payload.academicTerm }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'ADD_SUBJECT' || type === 'REMOVE_SUBJECT') {
        const currentStudent = students.find(s => s.id === activeStudentId || s.studentId === activeStudentId);
        let selectedSubjects = currentStudent?.selectedSubjects || [];
        
        if (type === 'ADD_SUBJECT') {
          // Remove previous section of the same subject if it exists (student changed section)
          selectedSubjects = selectedSubjects.filter(s => s.subjectId !== payload.subjectId);
          selectedSubjects = [...selectedSubjects, { subjectId: payload.subjectId, sectionId: payload.sectionId }];
        } else {
          selectedSubjects = selectedSubjects.filter(s => s.subjectId !== payload.subjectId);
        }

        const res = await authFetch(`/api/students/${activeStudentId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjects: selectedSubjects }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'SET_SELECTED_SUBJECTS') {
        // Used by the scheduler: the server already validated and persisted the
        // new selectedSubjects array and refreshed tuition fields.
        const currentStudent = students.find(s => s.id === activeStudentId || s.studentId === activeStudentId);
        if (currentStudent) {
          const selectedSubjects = Array.isArray(payload)
            ? payload
            : (payload?.selectedSubjects || currentStudent.selectedSubjects || []);
          updatedStudent = {
            ...currentStudent,
            selectedSubjects,
            tuitionBreakdown: payload?.tuitionBreakdown ?? currentStudent.tuitionBreakdown,
            totalTuition: payload?.totalTuition ?? currentStudent.totalTuition,
          };
        }
      } 
      
      else if (type === 'SET_PAYMENT_METHOD') {
        const res = await authFetch(`/api/students/${activeStudentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod: payload.method }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'PROCESS_PAYMENT') {
        const currentStudent = students.find(s => s.id === activeStudentId || s.studentId === activeStudentId);
        const res = await authFetch(`/api/students/${activeStudentId}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: payload.paymentMethod || currentStudent?.paymentMethod,
            paymentDetails: payload.paymentDetails,
            paymentReference: payload.paymentReference,
            paymentPlan: payload.paymentPlan,
            success: payload.success
          }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'VERIFY_PAYMONGO_PAYMENT') {
        const res = await authFetch(`/api/students/${activeStudentId}/verify-paymongo-payment?session_id=${payload.sessionId}`, {
          method: 'GET',
        });
        updatedStudent = await safeJson(res);
      }
      
      else if (type === 'APPROVE_DOCUMENTS') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/approve-admission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'REJECT_DOCUMENTS') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/reject-admission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'APPROVE_ADVISING') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/approve-advising`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'APPROVE_ADMISSION') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/approve-admission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'RESOLVE_HOLD') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/resolve-hold`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: payload.holdType }),
        });
        updatedStudent = await safeJson(res);
      }

      else if (type === 'SET_RETURNING') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/set-returning`, {
          method: 'POST',
        });
        updatedStudent = await safeJson(res);
      }
      
      else if (type === 'REJECT_ADVISING') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/reject-advising`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'UPDATE_STUDENT_SUBJECTS') {
        // Adviser assigns subjects only. Student selects concrete sections
        // later in the scheduler.
        const subjects = payload.subjects.map(s => ({
          subjectId: s.subjectId,
          ...(s.sectionId ? { sectionId: s.sectionId } : {}),
        }));
        const res = await authFetch(`/api/admin/students/${payload.studentId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            subjects,
            academicRecord: payload.academicRecord,
            yearLevel: payload.yearLevel
          }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'CONFIRM_PAYMENT') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/confirm-payment`, {
          method: 'POST',
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'VALIDATE_ENROLLMENT') {
        const res = await authFetch(`/api/admin/students/${payload.studentId}/validate-enrollment`, {
          method: 'POST',
        });
        updatedStudent = await safeJson(res);
      }

      else if (type === 'ROLLOVER_STUDENT') {
        const res = await authFetch(`/api/students/${payload.studentId}/rollover`, {
          method: 'POST',
        });
        updatedStudent = await safeJson(res);
      }

      else if (type === 'PROCEED_TO_PAYMENT') {
        const res = await authFetch(`/api/students/${activeStudentId}/proceed-to-payment`, {
          method: 'POST',
        });
        updatedStudent = await safeJson(res);
      }

      if (updatedStudent && updatedStudent.error) {
        toast.error(`Database Action Blocked: ${updatedStudent.error}`);
        return;
      }
      if (updatedStudent) {
        setStudents((prev) =>
          prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
        );
      }
    } catch (err) {
      console.error('Failed to sync action with backend database:', err);
      toast.error(err.message || 'Network Error: Could not connect to enrollment server.');
    } finally {
      if (!isSilentUpdate) {
        setIsLoading(false);
      }
    }
  }, [students, activeStudentId]);

  // Expose selectors
  const getStudentsByStatus = useCallback(
    (status) => students.filter((s) => s.status === status && (s.firstName?.trim() || s.lastName?.trim())),
    [students]
  );

  const getStudentById = useCallback(
    (id) => students.find((s) => s.id === id || s.studentId === id),
    [students]
  );

  const getActiveStudent = useCallback(
    () => students.find((s) => s.id === activeStudentId || s.studentId === activeStudentId),
    [students, activeStudentId]
  );

  const getSubjectById = useCallback(
    (id) => SUBJECTS.find((s) => s.id === id),
    []
  );

  // Group state object for compatibility
  const state = useMemo(() => ({
    currentRole,
    students,
    currentStudentId,
    activeStudentId,
    isLoading,
    settings
  }), [currentRole, students, currentStudentId, activeStudentId, isLoading, settings]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      getStudentsByStatus,
      getStudentById,
      getActiveStudent,
      getSubjectById,
      setActiveStudent,
    }),
    [state, dispatch, getStudentsByStatus, getStudentById, getActiveStudent, getSubjectById]
  );

  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  );
}

export function useEnrollment() {
  const context = useContext(EnrollmentContext);
  if (!context) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  return context;
}
