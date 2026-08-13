import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import StaffSidebar from '../../components/StaffSidebar';

export default function InstructorSidebar({ activeTab, onTabChange }) {
  const groups = [
    {
      group: 'Teaching',
      items: [
        { id: 'classes', label: 'My classes', icon: BookOpen },
        { id: 'gradebook', label: 'Class rosters & grades', icon: GraduationCap },
      ],
    },
  ];

  return (
    <StaffSidebar
      title="Instructor portal"
      groups={groups}
      activeTab={activeTab}
      onTabChange={onTabChange}
    />
  );
}
