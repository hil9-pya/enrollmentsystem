import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { CheckCircle, FileDown, Clock, ShieldCheck, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';

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

export default function FulfillmentStep() {
  const { getActiveStudent, getSubjectById } = useEnrollment();
  const student = getActiveStudent();

  const isEnrolled = student?.status === 'enrolled';

  const handleDownloadSchedule = async () => {
    if (!student) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoImg = await loadLogo();
    
    drawHeader(doc, logoImg, 'Official Class Schedule');
    drawFooter(doc, 1);

    // Student details block
    doc.setTextColor(15, 23, 42); // Navy
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('STUDENT INFORMATION', 15, 59);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(250, 250, 250);
    doc.rect(12, 62, 186, 22, 'FD'); // Box for student info

    doc.setFont('Helvetica', 'bold');
    doc.text('Student ID:', 16, 68);
    doc.text('Name:', 16, 74);
    doc.text('Program:', 16, 80);

    doc.setFont('Helvetica', 'normal');
    doc.text(student.id, 40, 68);
    doc.text(`${student.lastName}, ${student.firstName}`, 40, 74);
    doc.text(student.programId.toUpperCase(), 40, 80);

    doc.setFont('Helvetica', 'bold');
    doc.text('Term:', 115, 68);
    doc.text('Status:', 115, 74);
    doc.text('Date Enrolled:', 115, 80);

    doc.setFont('Helvetica', 'normal');
    doc.text('1st Semester 2026-2027', 140, 68);
    doc.setTextColor(16, 185, 129); // green
    doc.setFont('Helvetica', 'bold');
    doc.text('ENROLLED (OFFICIAL)', 140, 74);
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(), 140, 80);

    // Schedule Table Header
    let tableY = 92;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('ACADEMIC CLASS SCHEDULE', 15, tableY - 3);

    // Header row background
    doc.setFillColor(15, 23, 42); // navy header row
    doc.rect(12, tableY, 186, 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('CODE', 15, tableY + 5);
    doc.text('DESCRIPTION', 38, tableY + 5);
    doc.text('SCHEDULE', 92, tableY + 5);
    doc.text('ROOM', 145, tableY + 5);
    doc.text('INSTRUCTOR', 165, tableY + 5);

    // Table rows
    let currentY = tableY + 7;
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFont('Helvetica', 'normal');

    student.selectedSubjects.forEach((s, index) => {
      const sub = getSubjectById(s.subjectId);
      if (sub) {
        // Alternating rows background
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(12, currentY, 186, 8, 'F');
        }
        
        // Draw horizontal separator line
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.3);
        doc.line(12, currentY + 8, 198, currentY + 8);

        doc.setTextColor(15, 23, 42); // Code in navy bold
        doc.setFont('Helvetica', 'bold');
        doc.text(sub.code, 15, currentY + 5.5);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont('Helvetica', 'normal');
        
        // Truncate subject description if too long
        const nameText = sub.name.length > 32 ? sub.name.substring(0, 30) + '...' : sub.name;
        doc.text(nameText, 38, currentY + 5.5);
        doc.text(`${sub.schedule.day} ${sub.schedule.time}`, 92, currentY + 5.5);
        doc.text(sub.schedule.room, 145, currentY + 5.5);
        doc.text(sub.instructor, 165, currentY + 5.5);
        
        currentY += 8;
      }
    });

    // Final outer border line for table
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(12, tableY, 12, currentY);
    doc.line(198, tableY, 198, currentY);
    doc.line(12, currentY, 198, currentY);

    // Signatures block
    let sigY = currentY + 15;
    if (sigY > 235) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Official Class Schedule');
      drawFooter(doc, 2);
      sigY = 60;
    }

    // Registrar validation box/seal
    doc.setDrawColor(16, 185, 129); // green validation stamp
    doc.setLineWidth(0.6);
    doc.rect(15, sigY, 65, 25);
    doc.setTextColor(16, 185, 129);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('OFFICIAL VALIDATION SEAL', 20, sigY + 5);
    doc.setFontSize(10);
    doc.text('STATUS: ENROLLED', 20, sigY + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`DATE: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, sigY + 18);
    doc.text('NCST REGISTRAR OFFICE', 20, sigY + 22);

    // Registrar signature line
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.line(130, sigY + 15, 185, sigY + 15);
    doc.text('MR. FLORENCIO FLORES JR.', 130, sigY + 20);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('University Registrar, NCST', 130, sigY + 24);

    // Simulated registrar signature drawing (squiggly loops)
    doc.setDrawColor(30, 58, 138); // blue ink signature
    doc.setLineWidth(0.5);
    doc.line(135, sigY + 12, 140, sigY + 6);
    doc.line(140, sigY + 6, 148, sigY + 14);
    doc.line(148, sigY + 14, 155, sigY + 4);
    doc.line(155, sigY + 4, 162, sigY + 16);
    doc.line(162, sigY + 16, 175, sigY + 10);

    doc.save(`Class_Schedule_${student.id}.pdf`);
  };

  const handleDownloadRegForm = async () => {
    if (!student) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoImg = await loadLogo();
    
    drawHeader(doc, logoImg, 'Student Certificate of Registration');
    drawFooter(doc, 1);

    // Student Information Grid (2 column layout)
    doc.setTextColor(15, 23, 42); // Navy
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('REGISTRANT IDENTIFICATION', 15, 59);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(250, 250, 250);
    doc.rect(12, 62, 186, 42, 'FD'); // Box for student info

    const rowHeight = 7;
    let labelX = 16;
    let valueX = 45;
    let labelX2 = 110;
    let valueX2 = 138;

    let currentInfoY = 68;

    // Row 1
    doc.setFont('Helvetica', 'bold');
    doc.text('Student ID:', labelX, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.id, valueX, currentInfoY);

    doc.setFont('Helvetica', 'bold');
    doc.text('Enrollment Type:', labelX2, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.enrollmentType.toUpperCase(), valueX2, currentInfoY);

    currentInfoY += rowHeight;

    // Row 2
    doc.setFont('Helvetica', 'bold');
    doc.text('Full Name:', labelX, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${student.lastName}, ${student.firstName}`, valueX, currentInfoY);

    doc.setFont('Helvetica', 'bold');
    doc.text('Program/Course:', labelX2, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.programId.toUpperCase(), valueX2, currentInfoY);

    currentInfoY += rowHeight;

    // Row 3
    doc.setFont('Helvetica', 'bold');
    doc.text('Email Address:', labelX, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.email, valueX, currentInfoY);

    doc.setFont('Helvetica', 'bold');
    doc.text('Academic Term:', labelX2, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text('1st Semester 2026-2027', valueX2, currentInfoY);

    currentInfoY += rowHeight;

    // Row 4
    doc.setFont('Helvetica', 'bold');
    doc.text('Contact Phone:', labelX, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.phone, valueX, currentInfoY);

    doc.setFont('Helvetica', 'bold');
    doc.text('Registration Status:', labelX2, currentInfoY);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Green
    doc.text('VALIDATED & ENROLLED', valueX2, currentInfoY);
    doc.setTextColor(15, 23, 42); // Reset

    currentInfoY += rowHeight;

    // Row 5
    doc.setFont('Helvetica', 'bold');
    doc.text('Birth Date:', labelX, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.birthDate, valueX, currentInfoY);

    doc.setFont('Helvetica', 'bold');
    doc.text('Permanent Address:', labelX2, currentInfoY);
    doc.setFont('Helvetica', 'normal');
    const addr = student.address.length > 30 ? student.address.substring(0, 28) + '...' : student.address;
    doc.text(addr, valueX2, currentInfoY);

    // Central Certification Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(217, 119, 6); // Gold border
    doc.setLineWidth(0.4);
    doc.rect(12, 112, 186, 36, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('ACADEMIC CERTIFICATION STATEMENT', 105, 119, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const certText1 = `This certifies that the individual named herein is officially enrolled and registered as a student of the`;
    const certText2 = `National College of Science and Technology for the specified academic term. The student has submitted`;
    const certText3 = `the required academic admission credentials and cleared the financial payment obligations.`;
    const certText4 = `Any alterations to this document render it null and void. Verification can be performed at the Registrar's Office.`;

    doc.text(certText1, 105, 126, { align: 'center' });
    doc.text(certText2, 105, 131, { align: 'center' });
    doc.text(certText3, 105, 136, { align: 'center' });
    doc.setFont('Helvetica', 'oblique');
    doc.setFontSize(7.5);
    doc.text(certText4, 105, 143, { align: 'center' });

    // Subject list inside COR
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('APPROVED SUBJECT DETAILS', 15, 156);

    // Header row
    doc.setFillColor(15, 23, 42);
    doc.rect(12, 159, 186, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('SUBJECT CODE', 15, 164);
    doc.text('DESCRIPTION / TITLE', 50, 164);
    doc.text('UNITS', 145, 164);
    doc.text('INSTRUCTOR', 160, 164);

    let corY = 166;
    doc.setTextColor(51, 65, 85);
    doc.setFont('Helvetica', 'normal');

    student.selectedSubjects.forEach((s, idx) => {
      const sub = getSubjectById(s.subjectId);
      if (sub) {
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(12, corY, 186, 6.5, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(12, corY + 6.5, 198, corY + 6.5);

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.text(sub.code, 15, corY + 4.5);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont('Helvetica', 'normal');
        
        const nameText = sub.name.length > 40 ? sub.name.substring(0, 38) + '...' : sub.name;
        doc.text(nameText, 50, corY + 4.5);
        doc.text('3.0', 145, corY + 4.5);
        doc.text(sub.instructor, 160, corY + 4.5);
        corY += 6.5;
      }
    });

    // Final outer border line for table
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(12, 159, 12, corY);
    doc.line(198, 159, 198, corY);
    doc.line(12, corY, 198, corY);

    // Signatures block
    let corSigY = corY + 12;
    if (corSigY > 235) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Student Certificate of Registration');
      drawFooter(doc, 2);
      corSigY = 60;
    }

    // Green Validation seal
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.6);
    doc.rect(15, corSigY, 65, 25);
    doc.setTextColor(16, 185, 129);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('OFFICIAL REGISTRATION SEAL', 20, corSigY + 5);
    doc.setFontSize(10);
    doc.text('STATUS: VALIDATED', 20, corSigY + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, 20, corSigY + 18);
    doc.text('OFFICE OF THE REGISTRAR', 20, corSigY + 22);

    // Registrar Signature
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.line(130, corSigY + 15, 185, corSigY + 15);
    doc.text('MR. FLORENCIO FLORES JR.', 130, corSigY + 20);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('University Registrar, NCST', 130, corSigY + 24);

    // Registrar signature scribble
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(135, corSigY + 12, 140, corSigY + 6);
    doc.line(140, corSigY + 6, 148, corSigY + 14);
    doc.line(148, corSigY + 14, 155, corSigY + 4);
    doc.line(155, corSigY + 4, 162, corSigY + 16);
    doc.line(162, corSigY + 16, 175, corSigY + 10);

    doc.save(`Registration_Form_${student.id}.pdf`);
  };

  const handleDownloadReceipt = async () => {
    if (!student) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoImg = await loadLogo();
    
    drawHeader(doc, logoImg, 'Official Payment Receipt');
    drawFooter(doc, 1);

    // Receipt Information Block (2 columns)
    doc.setTextColor(15, 23, 42); // Navy
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAYMENT & TRANSACTION INFORMATION', 15, 59);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(250, 250, 250);
    doc.rect(12, 62, 186, 32, 'FD'); // Box for transaction info

    let orY = 68;
    // Column 1
    doc.setFont('Helvetica', 'bold');
    doc.text('Receipt Number:', 16, orY);
    doc.setFont('Helvetica', 'normal');
    doc.text(`OR-${Math.floor(100000 + Math.random() * 900000)}`, 45, orY);

    doc.setFont('Helvetica', 'bold');
    doc.text('Student ID:', 16, orY + 6);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.id, 45, orY + 6);

    doc.setFont('Helvetica', 'bold');
    doc.text('Student Name:', 16, orY + 12);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${student.lastName}, ${student.firstName}`, 45, orY + 12);

    // Column 2
    doc.setFont('Helvetica', 'bold');
    doc.text('Transaction Date:', 115, orY);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(), 145, orY);

    doc.setFont('Helvetica', 'bold');
    doc.text('Payment Method:', 115, orY + 6);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.paymentMethod ? student.paymentMethod.toUpperCase() : 'N/A', 145, orY + 6);

    doc.setFont('Helvetica', 'bold');
    doc.text('Payment Status:', 115, orY + 12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // green
    doc.text('PAID / CLEARED', 145, orY + 12);
    doc.setTextColor(15, 23, 42); // reset

    // Tuition Breakdown Table
    let feeTableY = 105;
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ITEMIZED ASSESSMENT BREAKDOWN', 15, feeTableY - 3);

    // Table Header Row
    doc.setFillColor(15, 23, 42);
    doc.rect(12, feeTableY, 186, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('DESCRIPTION OF ASSESSMENT', 15, feeTableY + 5);
    doc.text('AMOUNT (PHP)', 190, feeTableY + 5, { align: 'right' });

    let currentFeeY = feeTableY + 7;
    doc.setTextColor(51, 65, 85);
    doc.setFont('Helvetica', 'normal');

    student.tuitionBreakdown.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(12, currentFeeY, 186, 7, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(12, currentFeeY + 7, 198, currentFeeY + 7);

      doc.text(item.label, 15, currentFeeY + 4.8);
      doc.text(`Php ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, currentFeeY + 4.8, { align: 'right' });
      currentFeeY += 7;
    });

    // Total line
    doc.setFillColor(240, 253, 250); // very light mint green for total
    doc.rect(12, currentFeeY, 186, 9, 'F');
    doc.setDrawColor(16, 185, 129); // green line above total
    doc.setLineWidth(0.5);
    doc.line(12, currentFeeY, 198, currentFeeY);
    doc.line(12, currentFeeY + 9, 198, currentFeeY + 9);

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('TOTAL AMOUNT PAID:', 15, currentFeeY + 6);
    doc.text(`Php ${student.totalTuition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, currentFeeY + 6, { align: 'right' });

    // Border lines
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(12, feeTableY, 12, currentFeeY + 9);
    doc.line(198, feeTableY, 198, currentFeeY + 9);

    // Signatures block
    let feeSigY = currentFeeY + 15;
    if (feeSigY > 235) {
      doc.addPage();
      drawHeader(doc, logoImg, 'Official Payment Receipt');
      drawFooter(doc, 2);
      feeSigY = 60;
    }

    // Green/Blue Cashier Seal
    doc.setDrawColor(30, 58, 138); // blue
    doc.setLineWidth(0.6);
    doc.rect(15, feeSigY, 65, 25);
    doc.setTextColor(30, 58, 138);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('FINANCE CLEARANCE SEAL', 20, feeSigY + 5);
    doc.setFontSize(10);
    doc.text('STATUS: FULLY PAID', 20, feeSigY + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`TRANSACTION DATE: ${new Date().toLocaleDateString()}`, 20, feeSigY + 18);
    doc.text('NCST ACCOUNTING OFFICE', 20, feeSigY + 22);

    // Cashier Signature
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.line(130, feeSigY + 15, 185, feeSigY + 15);
    doc.text('MS. CORAZON DELA CRUZ', 130, feeSigY + 20);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Chief Cashier, NCST Finance', 130, feeSigY + 24);

    // Cashier scribble
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(132, feeSigY + 14, 138, feeSigY + 7);
    doc.line(138, feeSigY + 7, 142, feeSigY + 15);
    doc.line(142, feeSigY + 15, 150, feeSigY + 5);
    doc.line(150, feeSigY + 5, 155, feeSigY + 13);
    doc.line(155, feeSigY + 13, 170, feeSigY + 8);

    doc.save(`Official_Receipt_${student.id}.pdf`);
  };  return (
    <div className="space-y-6">
      {!isEnrolled ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-6 shadow-premium">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto shadow-sm animate-pulse border border-univ-gold/10">
            <Clock className="h-8 w-8 text-univ-gold" />
          </div>
          
          {student?.status === 'payment_pending' ? (
            <>
              <h2 className="text-xl font-extrabold text-univ-navy">Awaiting Accounting Verification</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                Your payment details have been submitted to the Accounting department. We are currently verifying your transaction. Once cleared, your application will proceed to the Office of the Registrar.
              </p>
              <div className="bg-amber-50 border border-univ-gold/20 text-univ-gold text-[10px] font-bold px-5 py-2.5 rounded-xl max-w-sm mx-auto shadow-sm uppercase tracking-wider">
                Status: Payment Clearance Pending
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold text-univ-navy">Awaiting Registrar Confirmation</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                Your payment is verified. Your registration details and documents are now under review by the Office of the Registrar for final validation and enrollment confirmation.
              </p>
              <div className="bg-amber-50 border border-univ-gold/20 text-univ-gold text-[10px] font-bold px-5 py-2.5 rounded-xl max-w-sm mx-auto shadow-sm uppercase tracking-wider">
                Status: Registrar Approval Pending
              </div>
            </>
          )}

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl max-w-md mx-auto text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Office Action Required</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Our administrative staff is reviewing your application. You will be notified automatically on this page as soon as your enrollment is officially confirmed.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-6 shadow-premium">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-100/50">
              <CheckCircle className="h-10 w-10 text-emerald-500 stroke-[2]" />
            </div>
            <h2 className="text-2xl font-extrabold text-univ-navy">Enrollment Complete!</h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">
              Congratulations! Your official registration records have been verified by the Registrar. You are now officially enrolled for the upcoming academic semester at NCST.
            </p>
 
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/40 text-emerald-700 text-xs font-bold px-5 py-2.5 rounded-full font-mono shadow-sm tracking-wide">
              <ShieldCheck className="h-4 w-4" /> STUDENT STATUS: ENROLLED
            </div>
          </div>
 
          {/* Fulfillment Documents list */}
          <div>
            <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Official Generated Documents</h3>
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
        </div>
      )}
    </div>
  );
}
