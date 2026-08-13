import React, { useEffect, useMemo, useState } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { CheckCircle, FileDown, Clock, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ACADEMIC_TERMS, PROGRAMS } from '../../../data/mockData';
import PortalRefreshButton from '../../../components/PortalRefreshButton';
import { authFetch } from '../../../utils/authFetch.js';

// Helper to preload the university logo image
const loadLogo = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

// Helper to draw the unified official NCST header and borders
const drawHeader = (doc, logoImg, titleText) => {
  // Page Border (Sleek Navy and Gold double border)
  doc.setDrawColor(15, 23, 42); // Navy (#0f172a)
  doc.setLineWidth(0.8);
  doc.rect(8, 8, 194, 281); // Border around A4 (210x297)
  
  doc.setDrawColor(217, 119, 6); // Gold (#d97706)
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, 191, 278);

  // Logo
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', 15, 13, 20, 20);
    } catch (e) {
      console.error('Error drawing logo in PDF:', e);
    }
  }

  // School Name and Info
  doc.setTextColor(15, 23, 42); // Navy
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NATIONAL COLLEGE OF SCIENCE AND TECHNOLOGY', 38, 19);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Amafel Bldg., Aguinaldo Highway, Dasmariñas City, Cavite', 38, 23);
  doc.text('Tel No: (046) 416-6278 | Web: www.ncst.edu.ph', 38, 27);
  
  // Divider
  doc.setDrawColor(15, 23, 42); // Navy divider
  doc.setLineWidth(0.5);
  doc.line(12, 36, 198, 36);

  doc.setDrawColor(217, 119, 6); // Gold divider
  doc.setLineWidth(1.5);
  doc.line(12, 38, 198, 38);

  // Document Title Banner
  doc.setFillColor(15, 23, 42); // Navy background for title banner
  doc.rect(12, 43, 186, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(titleText.toUpperCase(), 105, 49.5, { align: 'center' });
};

// Helper to draw the unified page footer
const drawFooter = (doc, pageNum) => {
  // Footer divider
  doc.setDrawColor(226, 232, 240); // light slate border
  doc.setLineWidth(0.5);
  doc.line(12, 275, 198, 275);

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('This is a system-generated official enrollment document.', 15, 281);
  doc.text('NCST Enrollment Management System — Security Verified', 15, 285);
  doc.text(`Page ${pageNum}`, 195, 281, { align: 'right' });
};

function findMatchingSection(subject, selectedSectionId) {
  const sections = subject?.sections || [];
  if (sections.length === 0) return null;

  const target = String(selectedSectionId || '').trim().toLowerCase();
  const match = sections.find((section) => {
    const candidates = [section.id, section._id, section.code, section.sectionCode];
    return candidates.some((candidate) => String(candidate || '').trim().toLowerCase() === target);
  });

  return match || null;
}

function getSectionSchedule(section) {
  if (!section) {
    return { day: '—', time: '—', room: '—' };
  }

  return section.schedule || {
    day: section.days || '—',
    time: section.time || '—',
    room: section.room || '—',
  };
}

function getAcademicTermLabel(academicTerm) {
  const term = ACADEMIC_TERMS.find(
    (item) => item.id === academicTerm || item.label === academicTerm
  );
  return term?.label || academicTerm || '—';
}

function getProgramLabel(programId) {
  return PROGRAMS.find((program) => program.id === programId)?.name
    || String(programId || '—').toUpperCase();
}

function getEnrollmentDate(student) {
  const value = student?.enrolledAt || student?.updatedAt;
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function getPaymentDate(student) {
  const value = student?.paymentDetails?.paidAt;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Not recorded';
}

function getPaidAmount(student) {
  const recorded = Number(student?.amountPaid ?? student?.paymentDetails?.amount);
  if (Number.isFinite(recorded) && recorded > 0) return recorded;
  return student?.paymentStatus === 'paid' ? Number(student?.totalTuition) || 0 : 0;
}

function getReceiptNumber(student) {
  if (student?.receiptNumber) return student.receiptNumber;
  const sourceId = String(student?.id || '').toUpperCase();
  const applicationMatch = sourceId.match(/^APP-(\d{4})-(\d+)$/);
  return applicationMatch
    ? `OR-${applicationMatch[1]}-${applicationMatch[2].padStart(4, '0')}`
    : 'Not recorded';
}

function truncatePdfText(value, maxLength = 24) {
  const text = String(value || '—');
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export default function FulfillmentStep({ onReturnToGateway, onRefresh }) {
  const { getActiveStudent, getSubjectById } = useEnrollment();
  const student = getActiveStudent();
  const [logoImg, setLogoImg] = useState(null);
  const [scheduleSubjects, setScheduleSubjects] = useState([]);
  const [enrolledSchedule, setEnrolledSchedule] = useState([]);

  useEffect(() => {
    let active = true;

    loadLogo().then((img) => {
      if (active) setLogoImg(img);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!student?.id) {
      setScheduleSubjects([]);
      setEnrolledSchedule([]);
      return;
    }

    let active = true;

    const loadScheduleSubjects = async () => {
      try {
        const [subjectsRes, enrolledRes] = await Promise.all([
          authFetch(`/api/scheduler/${student.id}/subjects`),
          authFetch(`/api/scheduler/${student.id}/enrolled`),
        ]);
        const [subjectsData, enrolledData] = await Promise.all([
          subjectsRes.json(),
          enrolledRes.json(),
        ]);
        if (active) {
          setScheduleSubjects(subjectsData?.success ? subjectsData.data || [] : []);
          setEnrolledSchedule(enrolledData?.success ? enrolledData.data || [] : []);
        }
      } catch {
        if (active) {
          setScheduleSubjects([]);
          setEnrolledSchedule([]);
        }
      }
    };

    loadScheduleSubjects();

    return () => {
      active = false;
    };
  }, [student?.id, student?.programId, student?.yearLevel, student?.academicTerm]);

  const isEnrolled = student?.status === 'enrolled';
  const scheduleSubjectIndex = useMemo(
    () => new Map(scheduleSubjects.map((subject) => [subject.id, subject])),
    [scheduleSubjects]
  );

  const resolveSubject = (subjectId) => {
    return scheduleSubjectIndex.get(subjectId) || getSubjectById(subjectId);
  };

  const localScheduleRows = useMemo(
    () => (student?.selectedSubjects || []).map((selection) => {
      const subject = scheduleSubjectIndex.get(selection.subjectId)
        || getSubjectById(selection.subjectId);
      const section = findMatchingSection(subject, selection.sectionId);
      if (!subject || !section) return null;

      return {
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        units: subject.units,
        sectionId: selection.sectionId,
        sectionCode: section.code || section.sectionCode,
        schedule: getSectionSchedule(section),
        instructor: section.instructor || subject.instructor || '—',
      };
    }).filter(Boolean),
    [student?.selectedSubjects, scheduleSubjectIndex, getSubjectById]
  );

  const getDownloadSchedule = async () => {
    try {
      const res = await authFetch(`/api/scheduler/${student.id}/enrolled`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.success && Array.isArray(data.data)) {
        setEnrolledSchedule(data.data);
        return data.data;
      }
    } catch {
      // Use already loaded exact rows if the network request fails.
    }
    return enrolledSchedule.length > 0 ? enrolledSchedule : localScheduleRows;
  };


  // --- SENIOR UI/UX PDF GENERATION ---
  
  // Modern sleek font setup (we rely on default Helvetica for speed/compatibility)
  // but we use subtle colors (slate-500, slate-900) instead of pure black.

  const drawCard = (doc, title, x, y, width, height) => {
    // Elegant soft shadow / border for card
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, width, height, 3, 3, 'FD');
    
    // Header background
    if (title) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(x, y, width, 8, 3, 3, 'F');
      // square off bottom corners of header
      doc.rect(x, y + 5, width, 3, 'F');
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(x, y + 8, x + width, y + 8);
      
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(title.toUpperCase(), x + 4, y + 5.5);
    }
  };

  const drawLabelValue = (doc, label, value, x, y, valueX) => {
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, x, y);
    
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.text(String(value), valueX, y);
  };

  const drawSeal = (doc, x, y, text1, text2) => {
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setFillColor(240, 253, 250); // emerald-50
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, 65, 20, 2, 2, 'FD');
    
    doc.setTextColor(6, 78, 59); // emerald-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('OFFICIAL SYSTEM VALIDATION', x + 32.5, y + 6, { align: 'center' });
    
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.setFontSize(9);
    doc.text(text1, x + 32.5, y + 12, { align: 'center' });
    
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(text2, x + 32.5, y + 17, { align: 'center' });
  };

  const formatCurrency = (val) => `Php ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const partitionFees = (tuitionBreakdown) => {
    const tuition = [];
    const misc = [];
    (tuitionBreakdown || []).forEach(item => {
      const lower = item.label.toLowerCase();
      if (lower.includes('fee') || lower.includes('id') || lower.includes('library') || lower.includes('laboratory')) {
        misc.push(item);
      } else {
        tuition.push(item);
      }
    });
    return { tuition, misc };
  };

  const handleDownloadSchedule = async () => {
    if (!student?.studentId) return;
    const scheduleRows = await getDownloadSchedule();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    drawHeader(doc, logoImg, 'Official Class Schedule');
    drawFooter(doc, 1);

    // Student Info Card
    drawCard(doc, 'Student Information', 15, 60, 180, 22);
    drawLabelValue(doc, 'Student ID:', student.studentId, 20, 73, 40);
    drawLabelValue(doc, 'Name:', `${student.lastName}, ${student.firstName}`, 20, 78, 40);
    drawLabelValue(doc, 'Program:', getProgramLabel(student.programId), 105, 73, 125);
    drawLabelValue(doc, 'Status:', student.status.toUpperCase(), 105, 78, 125);

    // Schedule Card
    const schedY = 88;
    drawCard(doc, 'Enrolled Subjects & Schedule', 15, schedY, 180, 10 + (scheduleRows.length * 8) + 5);
    
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, schedY + 8, 180, 7, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CODE', 20, schedY + 12.5);
    doc.text('DESCRIPTION', 45, schedY + 12.5);
    doc.text('UNITS', 120, schedY + 12.5, { align: 'center' });
    doc.text('DAY', 135, schedY + 12.5);
    doc.text('TIME', 155, schedY + 12.5);
    doc.text('ROOM', 185, schedY + 12.5);

    let rowY = schedY + 20;
    scheduleRows.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, rowY - 5, 180, 7, 'F');
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      
      const desc = doc.splitTextToSize(row.subjectName || '', 65);
      doc.text(row.subjectCode || '', 20, rowY);
      doc.text(desc[0], 45, rowY);
      doc.text(String(row.units), 120, rowY, { align: 'center' });
      doc.text(row.schedule?.day || 'TBA', 135, rowY);
      doc.text(row.schedule?.time || 'TBA', 155, rowY);
      doc.text(row.schedule?.room || 'TBA', 185, rowY);
      rowY += 8;
    });

    drawSeal(doc, 15, rowY + 5, 'SCHEDULE VERIFIED', `DATE: ${new Date().toLocaleDateString()}`);
    doc.save(`Class_Schedule_${student.studentId}.pdf`);
  };

  const handleDownloadRegForm = async () => {
    if (!student?.studentId) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    drawHeader(doc, logoImg, 'Certificate of Registration');
    drawFooter(doc, 1);

    // Profile Card
    drawCard(doc, 'Student Profile', 15, 60, 180, 27);
    drawLabelValue(doc, 'Student ID:', student.studentId, 20, 73, 40);
    drawLabelValue(doc, 'Name:', `${student.lastName}, ${student.firstName}`, 20, 79, 40);
    drawLabelValue(doc, 'Program:', getProgramLabel(student.programId), 105, 73, 130);
    drawLabelValue(doc, 'Date Issued:', new Date().toLocaleDateString(), 105, 79, 130);

    // Subjects Card
    const selectedSubjects = await getDownloadSchedule();
    const subjY = 92;
    drawCard(doc, 'Registered Subjects', 15, subjY, 180, 10 + (selectedSubjects.length * 8) + 12);
    
    doc.setFillColor(241, 245, 249);
    doc.rect(15, subjY + 8, 180, 7, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CODE', 20, subjY + 12.5);
    doc.text('DESCRIPTION', 50, subjY + 12.5);
    doc.text('UNITS', 160, subjY + 12.5, { align: 'center' });
    doc.text('SECTION', 180, subjY + 12.5, { align: 'center' });

    let rowY = subjY + 20;
    let totalUnits = 0;
    selectedSubjects.forEach((sub, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, rowY - 5, 180, 7, 'F');
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      
      const desc = doc.splitTextToSize(sub.subjectName || '', 100);
      doc.text(sub.subjectCode || '', 20, rowY);
      doc.text(desc[0], 50, rowY);
      doc.text(String(sub.units || 0), 160, rowY, { align: 'center' });
      doc.text(String(sub.sectionCode || 'TBA'), 180, rowY, { align: 'center' });
      totalUnits += Number(sub.units || 0);
      rowY += 8;
    });

    // Total Units line
    doc.setDrawColor(226, 232, 240);
    doc.line(15, rowY - 2, 195, rowY - 2);
    doc.setFont('Helvetica', 'bold');
    doc.text('TOTAL UNITS:', 130, rowY + 4);
    doc.text(String(totalUnits), 160, rowY + 4, { align: 'center' });

    // Assessment Card
    let feesY = rowY + 10;
    const { tuition, misc } = partitionFees(student.tuitionBreakdown);
    const cardHeight = 10 + (tuition.length * 6.5) + 10 + (misc.length * 6.5) + 12;
    
    if (feesY + cardHeight > 250) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Certificate of Registration');
      drawFooter(doc, 2);
      feesY = 60;
    }

    drawCard(doc, 'Assessment Summary', 15, feesY, 180, cardHeight);
    
    let fy = feesY + 13;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('TUITION & SUBJECT FEES', 20, fy);
    fy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    tuition.forEach(t => {
      doc.text(t.label, 25, fy);
      doc.text(formatCurrency(t.amount), 185, fy, { align: 'right' });
      fy += 6.5;
    });

    fy += 3.5;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('MISCELLANEOUS FEES', 20, fy);
    fy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    misc.forEach(m => {
      doc.text(m.label, 25, fy);
      doc.text(formatCurrency(m.amount), 185, fy, { align: 'right' });
      fy += 6.5;
    });

    fy += 1.5;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, fy, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAL ASSESSMENT', 20, fy + 5.5);
    doc.text(formatCurrency(student.totalTuition), 185, fy + 5.5, { align: 'right' });

    // Signatures
    let sigY = fy + 20;
    if (sigY > 260) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Certificate of Registration');
      drawFooter(doc, 3);
      sigY = 60;
    }

    drawSeal(doc, 15, sigY, 'OFFICIAL REGISTRATION', 'NCST REGISTRAR');
    doc.setDrawColor(15, 23, 42);
    doc.line(130, sigY + 12, 185, sigY + 12);
    doc.setTextColor(15, 23, 42);
    doc.text('UNIVERSITY REGISTRAR', 157.5, sigY + 16, { align: 'center' });

    doc.save(`COR_${student.studentId}.pdf`);
  };

  const handleDownloadReceipt = async () => {
    if (!student?.studentId) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    drawHeader(doc, logoImg, 'Official Payment Receipt');
    drawFooter(doc, 1);

    // Transaction Card
    drawCard(doc, 'Payment & Transaction Info', 15, 60, 180, 22);
    drawLabelValue(doc, 'Receipt No:', getReceiptNumber(student), 20, 73, 45);
    drawLabelValue(doc, 'Student ID:', student.studentId, 20, 78, 45);
    drawLabelValue(doc, 'Payment Date:', getPaymentDate(student), 105, 73, 135);
    drawLabelValue(doc, 'Method:', (student.paymentMethod || 'N/A').toUpperCase(), 105, 78, 135);

    // Badge
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.roundedRect(165, 63, 25, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('Helvetica', 'bold');
    doc.text(student.paymentStatus === 'paid' ? 'PAID IN FULL' : 'PAYMENT RECEIVED', 177.5, 67, { align: 'center' });

    // Breakdown Card
    const { tuition, misc } = partitionFees(student.tuitionBreakdown);
    const cardHeight = 10 + (tuition.length * 6.5) + 10 + (misc.length * 6.5) + 12;
    drawCard(doc, 'Itemized Assessment Breakdown', 15, 88, 180, cardHeight);
    
    let fy = 101;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('TUITION & SUBJECT FEES', 20, fy);
    fy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    tuition.forEach(t => {
      doc.text(t.label, 25, fy);
      doc.text(formatCurrency(t.amount), 185, fy, { align: 'right' });
      fy += 6.5;
    });

    fy += 3.5;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('MISCELLANEOUS FEES', 20, fy);
    fy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    misc.forEach(m => {
      doc.text(m.label, 25, fy);
      doc.text(formatCurrency(m.amount), 185, fy, { align: 'right' });
      fy += 6.5;
    });

    fy += 1.5;
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.rect(15, fy, 180, 10, 'F');
    doc.setDrawColor(16, 185, 129);
    doc.line(15, fy, 195, fy);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 78, 59); // emerald-900
    doc.text('AMOUNT RECEIVED', 20, fy + 6);
    doc.text(formatCurrency(getPaidAmount(student)), 185, fy + 6, { align: 'right' });

    fy += 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, fy, 180, 14, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.text('TOTAL ASSESSMENT', 20, fy + 5);
    doc.text(formatCurrency(student.totalTuition), 185, fy + 5, { align: 'right' });
    doc.text('REMAINING BALANCE', 20, fy + 10.5);
    doc.text(formatCurrency(student.remainingBalance || 0), 185, fy + 10.5, { align: 'right' });
    if (student.paymentReference) {
      doc.text(`REFERENCE: ${student.paymentReference}`, 20, fy + 18);
      fy += 7;
    }

    // Sig
    let sigY = fy + 22;
    if (sigY > 260) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Official Payment Receipt');
      drawFooter(doc, 2);
      sigY = 60;
    }

    drawSeal(doc, 15, sigY, 'PAYMENT VERIFIED', 'NCST ACCOUNTING OFFICE');
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.line(130, sigY + 12, 185, sigY + 12);
    doc.text('MS. CORAZON DELA CRUZ', 157.5, sigY + 16, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Chief Cashier, NCST Finance', 157.5, sigY + 19, { align: 'center' });

    doc.save(`Official_Receipt_${student.studentId}.pdf`);
  };

  const handleDownloadAllCombined = async () => {
    // Generate them sequentially to avoid a massive blob, but for this requested feature,
    // we'll combine them all using the updated styles.
    if (!student?.studentId) return;
    const scheduleRows = await getDownloadSchedule();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let pageNum = 1;

    // --- COR PAGE ---
    drawHeader(doc, logoImg, 'Certificate of Registration');
    drawFooter(doc, pageNum++);
    
    // Copy COR generation code exactly
    drawCard(doc, 'Student Profile', 15, 60, 180, 27);
    drawLabelValue(doc, 'Student ID:', student.studentId, 20, 73, 40);
    drawLabelValue(doc, 'Name:', `${student.lastName}, ${student.firstName}`, 20, 79, 40);
    drawLabelValue(doc, 'Program:', getProgramLabel(student.programId), 105, 73, 130);
    drawLabelValue(doc, 'Date Issued:', new Date().toLocaleDateString(), 105, 79, 130);

    const selectedSubjects = await getDownloadSchedule();
    let subjY = 92;
    drawCard(doc, 'Registered Subjects', 15, subjY, 180, 10 + (selectedSubjects.length * 8) + 12);
    
    doc.setFillColor(241, 245, 249);
    doc.rect(15, subjY + 8, 180, 7, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CODE', 20, subjY + 12.5);
    doc.text('DESCRIPTION', 50, subjY + 12.5);
    doc.text('UNITS', 160, subjY + 12.5, { align: 'center' });
    doc.text('SECTION', 180, subjY + 12.5, { align: 'center' });

    let rowY = subjY + 20;
    let totalUnits = 0;
    selectedSubjects.forEach((sub, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, rowY - 5, 180, 7, 'F');
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      
      const desc = doc.splitTextToSize(sub.subjectName || '', 100);
      doc.text(sub.subjectCode || '', 20, rowY);
      doc.text(desc[0], 50, rowY);
      doc.text(String(sub.units || 0), 160, rowY, { align: 'center' });
      doc.text(String(sub.sectionCode || 'TBA'), 180, rowY, { align: 'center' });
      totalUnits += Number(sub.units || 0);
      rowY += 8;
    });

    doc.setDrawColor(226, 232, 240);
    doc.line(15, rowY - 2, 195, rowY - 2);
    doc.setFont('Helvetica', 'bold');
    doc.text('TOTAL UNITS:', 130, rowY + 4);
    doc.text(String(totalUnits), 160, rowY + 4, { align: 'center' });

    let corFeesY = rowY + 10;
    const { tuition: corTuition, misc: corMisc } = partitionFees(student.tuitionBreakdown);
    const corCardHeight = 10 + (corTuition.length * 6.5) + 10 + (corMisc.length * 6.5) + 12;
    if (corFeesY + corCardHeight > 250) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Certificate of Registration');
      drawFooter(doc, pageNum++);
      corFeesY = 60;
    }

    drawCard(doc, 'Assessment Summary', 15, corFeesY, 180, corCardHeight);
    let corFy = corFeesY + 13;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('TUITION & SUBJECT FEES', 20, corFy);
    corFy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    corTuition.forEach(item => {
      doc.text(item.label, 25, corFy);
      doc.text(formatCurrency(item.amount), 185, corFy, { align: 'right' });
      corFy += 6.5;
    });

    corFy += 3.5;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('MISCELLANEOUS FEES', 20, corFy);
    corFy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    corMisc.forEach(item => {
      doc.text(item.label, 25, corFy);
      doc.text(formatCurrency(item.amount), 185, corFy, { align: 'right' });
      corFy += 6.5;
    });

    corFy += 1.5;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, corFy, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAL ASSESSMENT', 20, corFy + 5.5);
    doc.text(formatCurrency(student.totalTuition), 185, corFy + 5.5, { align: 'right' });

    let sigY = corFy + 20;
    if (sigY > 260) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Certificate of Registration');
      drawFooter(doc, pageNum++);
      sigY = 60;
    }

    drawSeal(doc, 15, sigY, 'OFFICIAL REGISTRATION', 'NCST REGISTRAR');
    doc.line(130, sigY + 12, 185, sigY + 12);
    doc.text('UNIVERSITY REGISTRAR', 157.5, sigY + 16, { align: 'center' });

    // --- RECEIPT PAGE ---
    doc.addPage();
    drawHeader(doc, logoImg, 'Official Payment Receipt');
    drawFooter(doc, pageNum++);

    drawCard(doc, 'Payment & Transaction Info', 15, 60, 180, 22);
    drawLabelValue(doc, 'Receipt No:', getReceiptNumber(student), 20, 73, 45);
    drawLabelValue(doc, 'Student ID:', student.studentId, 20, 78, 45);
    drawLabelValue(doc, 'Payment Date:', getPaymentDate(student), 105, 73, 135);
    drawLabelValue(doc, 'Method:', (student.paymentMethod || 'N/A').toUpperCase(), 105, 78, 135);

    doc.setFillColor(16, 185, 129);
    doc.roundedRect(165, 63, 25, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('Helvetica', 'bold');
    doc.text(student.paymentStatus === 'paid' ? 'PAID IN FULL' : 'PAYMENT RECEIVED', 177.5, 67, { align: 'center' });

    const { tuition, misc } = partitionFees(student.tuitionBreakdown);
    const cardHeight = 10 + (tuition.length * 6.5) + 10 + (misc.length * 6.5) + 12;
    drawCard(doc, 'Itemized Assessment Breakdown', 15, 88, 180, cardHeight);
    
    let fy = 101;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('TUITION & SUBJECT FEES', 20, fy);
    fy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    tuition.forEach(t => {
      doc.text(t.label, 25, fy);
      doc.text(formatCurrency(t.amount), 185, fy, { align: 'right' });
      fy += 6.5;
    });

    fy += 3.5;
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('MISCELLANEOUS FEES', 20, fy);
    fy += 5.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    misc.forEach(m => {
      doc.text(m.label, 25, fy);
      doc.text(formatCurrency(m.amount), 185, fy, { align: 'right' });
      fy += 6.5;
    });

    fy += 1.5;
    doc.setFillColor(236, 253, 245);
    doc.rect(15, fy, 180, 10, 'F');
    doc.setDrawColor(16, 185, 129);
    doc.line(15, fy, 195, fy);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 78, 59);
    doc.text('AMOUNT RECEIVED', 20, fy + 6);
    doc.text(formatCurrency(getPaidAmount(student)), 185, fy + 6, { align: 'right' });

    fy += 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, fy, 180, 14, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.text('TOTAL ASSESSMENT', 20, fy + 5);
    doc.text(formatCurrency(student.totalTuition), 185, fy + 5, { align: 'right' });
    doc.text('REMAINING BALANCE', 20, fy + 10.5);
    doc.text(formatCurrency(student.remainingBalance || 0), 185, fy + 10.5, { align: 'right' });
    if (student.paymentReference) {
      doc.text(`REFERENCE: ${student.paymentReference}`, 20, fy + 18);
      fy += 7;
    }

    sigY = fy + 22;
    if (sigY > 260) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Official Payment Receipt');
      drawFooter(doc, pageNum++);
      sigY = 60;
    }

    drawSeal(doc, 15, sigY, 'PAYMENT VERIFIED', 'NCST ACCOUNTING OFFICE');
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.line(130, sigY + 12, 185, sigY + 12);
    doc.text('MS. CORAZON DELA CRUZ', 157.5, sigY + 16, { align: 'center' });

    // --- SCHEDULE PAGE ---
    doc.addPage();
    drawHeader(doc, logoImg, 'Official Class Schedule');
    drawFooter(doc, pageNum++);

    drawCard(doc, 'Student Information', 15, 60, 180, 22);
    drawLabelValue(doc, 'Student ID:', student.studentId, 20, 73, 40);
    drawLabelValue(doc, 'Name:', `${student.lastName}, ${student.firstName}`, 20, 78, 40);
    drawLabelValue(doc, 'Program:', getProgramLabel(student.programId), 105, 73, 125);
    drawLabelValue(doc, 'Status:', student.status.toUpperCase(), 105, 78, 125);

    const schedY = 88;
    drawCard(doc, 'Enrolled Subjects & Schedule', 15, schedY, 180, 10 + (scheduleRows.length * 8) + 5);
    
    doc.setFillColor(241, 245, 249);
    doc.rect(15, schedY + 8, 180, 7, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CODE', 20, schedY + 12.5);
    doc.text('DESCRIPTION', 45, schedY + 12.5);
    doc.text('UNITS', 120, schedY + 12.5, { align: 'center' });
    doc.text('DAY', 135, schedY + 12.5);
    doc.text('TIME', 155, schedY + 12.5);
    doc.text('ROOM', 185, schedY + 12.5);

    let sRowY = schedY + 20;
    scheduleRows.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, sRowY - 5, 180, 7, 'F');
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      
      const desc = doc.splitTextToSize(row.subjectName || '', 65);
      doc.text(row.subjectCode || '', 20, sRowY);
      doc.text(desc[0], 45, sRowY);
      doc.text(String(row.units), 120, sRowY, { align: 'center' });
      doc.text(row.schedule?.day || 'TBA', 135, sRowY);
      doc.text(row.schedule?.time || 'TBA', 155, sRowY);
      doc.text(row.schedule?.room || 'TBA', 185, sRowY);
      sRowY += 8;
    });

    drawSeal(doc, 15, sRowY + 5, 'SCHEDULE VERIFIED', `DATE: ${new Date().toLocaleDateString()}`);

    doc.save(`Enrollment_Documents_${student.studentId}.pdf`);
  };

  return (
    <div className={`space-y-6 ${!isEnrolled ? 'w-full max-w-2xl' : ''}`}>
      {!isEnrolled ? (
        <div className="w-full rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-univ-navy">
                {student?.status === 'payment_pending' ? 'Awaiting accounting verification' : 'Awaiting registrar confirmation'}
              </h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                {student?.status === 'payment_pending'
                  ? 'Accounting is reviewing your payment. This page will update when verification is complete.'
                  : 'Payment is verified. The Registrar is reviewing your enrollment. This page will update when validation is complete.'}
              </p>
              <p className="mt-4 text-xs font-medium text-slate-500">
                {student?.status === 'payment_pending'
                  ? 'Next: Accounting verifies your payment, then the Registrar validates your enrollment.'
                  : 'Next: The Registrar validates your enrollment and releases your registration documents.'}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-400">Status updates automatically.</span>
            <PortalRefreshButton variant="text" onRefresh={onRefresh} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-sm font-semibold text-univ-navy">Enrollment complete</h2>
              <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-600">
                Your registration records were verified by the Registrar. You are officially enrolled for the upcoming semester.
              </p>
            </div>
          </div>

          {/* Individual Document Downloads */}
          <div>
            <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Download Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Card 1 */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between h-56 shadow-sm hover:border-slate-200 hover:shadow-premium-lg transition-all duration-300">
                <div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-univ-indigo inline-block mb-3.5 shadow-sm">
                    <FileDown className="h-6 w-6 stroke-[2]" />
                  </div>
                  <h4 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Class Schedule</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                    Your generated lecture schedule containing room details, schedules, and instructor assignments.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSchedule}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Download Schedule
                </button>
              </div>
 
              {/* Card 2 */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between h-56 shadow-sm hover:border-slate-200 hover:shadow-premium-lg transition-all duration-300">
                <div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-univ-indigo inline-block mb-3.5 shadow-sm">
                    <FileDown className="h-6 w-6 stroke-[2]" />
                  </div>
                  <h4 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Certificate of Registration</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                    Official registration document verifying enrollment type, personal records, and program details.
                  </p>
                </div>
                <button
                  onClick={handleDownloadRegForm}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Download COA Form
                </button>
              </div>
 
              {/* Card 3 */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between h-56 shadow-sm hover:border-slate-200 hover:shadow-premium-lg transition-all duration-300">
                <div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-univ-indigo inline-block mb-3.5 shadow-sm">
                    <FileDown className="h-6 w-6 stroke-[2]" />
                  </div>
                  <h4 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Official Payment Receipt</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                    Receipt from finance ledger verifying payment clearance and itemized fees.
                  </p>
                </div>
                <button
                  onClick={handleDownloadReceipt}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Download Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Return to Gateway Button */}
          <div className="text-center pt-2">
            <button
              onClick={onReturnToGateway}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-univ-navy cursor-pointer"
            >
              Return to login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

