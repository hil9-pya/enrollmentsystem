import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmationProvider } from '../../src/context/ConfirmationContext';
import LmsClassView from '../../src/views/lms/LmsClassView';
import '../../src/tailwind.css';

const offering = {
  _id: 'offering-1',
  subjectCode: 'CS 101',
  sectionCode: 'CS-11M1',
  subjectName: 'Intro to Computing',
  instructorName: 'Adrian Cruz',
  lmsEnabled: true,
  status: 'active',
  term: { isActive: true },
  schedule: { day: 'MWF', time: '8:00 AM - 9:00 AM', room: '1102' },
};

createRoot(document.getElementById('root')).render(
  <ConfirmationProvider>
    <LmsClassView offering={offering} role="instructor" token="test-token" onBack={() => {}} />
  </ConfirmationProvider>,
);
