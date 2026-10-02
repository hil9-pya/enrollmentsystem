import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../../src/context/AuthContext';
import { ConfirmationProvider } from '../../src/context/ConfirmationContext';
import { EnrollmentProvider } from '../../src/context/EnrollmentContext';
import SubjectEnrollmentStep from '../../src/views/student/steps/SubjectEnrollmentStep';
import '../../src/tailwind.css';

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <ConfirmationProvider>
      <EnrollmentProvider>
        <SubjectEnrollmentStep onNext={() => {}} onBack={() => {}} />
      </EnrollmentProvider>
    </ConfirmationProvider>
  </AuthProvider>,
);
