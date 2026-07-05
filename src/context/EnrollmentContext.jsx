import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { SUBJECTS, MISC_FEES } from '../data/mockData.js';

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
    } catch (_) {
      // Fallback for non-JSON responses (e.g. 502 HTML pages)
    }
    throw new Error(errorMsg);
  }
  return res.json();
};



export function EnrollmentProvider({ children }) {
  const [currentRole, setRole] = useState('student');
  const [students, setStudents] = useState([]);
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
      try {
        const res = await authFetch('/api/students');
        const data = await safeJson(res);
        setStudents(data);
      } catch (err) {
        console.error('Failed to connect to backend enrollment server:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudents();

    const interval = setInterval(loadStudents, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Custom Dispatch Interceptor to handle async HTTP calls and synchronize state
  const dispatch = useCallback(async (action) => {
    const { type, payload } = action;

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
      setIsLoading(true);
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
        const currentStudent = students.find(s => s.id === activeStudentId);
        let subjectIds = currentStudent?.selectedSubjects?.map(s => s.subjectId) || [];
        
        if (type === 'ADD_SUBJECT') {
          subjectIds = [...subjectIds, payload.subjectId];
        } else {
          subjectIds = subjectIds.filter(id => id !== payload.subjectId);
        }

        const res = await authFetch(`/api/students/${activeStudentId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectIds }),
        });
        updatedStudent = await safeJson(res);
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
        const currentStudent = students.find(s => s.id === activeStudentId);
        const res = await authFetch(`/api/students/${activeStudentId}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: currentStudent?.paymentMethod,
            success: payload.success
          }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'APPROVE_DOCUMENTS') {
        const res = await authFetch(`/api/students/${payload.studentId}/approve-admission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'REJECT_DOCUMENTS') {
        const res = await authFetch(`/api/students/${payload.studentId}/reject-admission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'APPROVE_ADVISING') {
        const res = await authFetch(`/api/students/${payload.studentId}/approve-advising`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload.notes }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'UPDATE_STUDENT_SUBJECTS') {
        const subjectIds = payload.subjects.map(s => s.subjectId);
        const res = await authFetch(`/api/students/${payload.studentId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectIds }),
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'CONFIRM_PAYMENT') {
        const res = await authFetch(`/api/students/${payload.studentId}/confirm-payment`, {
          method: 'POST',
        });
        updatedStudent = await safeJson(res);
      } 
      
      else if (type === 'VALIDATE_ENROLLMENT') {
        const res = await authFetch(`/api/students/${payload.studentId}/validate-enrollment`, {
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
      setIsLoading(false);
    }
  }, [students, activeStudentId]);

  // Expose selectors
  const getStudentsByStatus = useCallback(
    (status) => students.filter((s) => s.status === status),
    [students]
  );

  const getStudentById = useCallback(
    (id) => students.find((s) => s.id === id),
    [students]
  );

  const getActiveStudent = useCallback(
    () => students.find((s) => s.id === activeStudentId),
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
    isLoading
  }), [currentRole, students, currentStudentId, activeStudentId, isLoading]);

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
