import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { CheckCircle, FileDown, Clock, ShieldCheck, Printer } from 'lucide-react';

export default function FulfillmentStep() {
  const { getActiveStudent, getSubjectById } = useEnrollment();
  const student = getActiveStudent();

  const isEnrolled = student?.status === 'enrolled';

  const downloadTextFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSchedule = () => {
    if (!student) return;
    let text = `====================================================\n`;
    text += `             OFFICIAL CLASS SCHEDULE\n`;
    text += `====================================================\n`;
    text += `Student ID:   ${student.id}\n`;
    text += `Student Name: ${student.lastName}, ${student.firstName}\n`;
    text += `Academic Term: 1st Semester 2026-2027\n`;
    text += `Status:       ENROLLED (Registrar Validated)\n`;
    text += `----------------------------------------------------\n\n`;
    text += `Subject Code | Description | Schedule | Room | Instructor\n`;
    text += `----------------------------------------------------\n`;

    student.selectedSubjects.forEach((s) => {
      const sub = getSubjectById(s.subjectId);
      if (sub) {
        text += `${sub.code.padEnd(12)} | ${sub.name.padEnd(25)} | ${sub.schedule.day} ${sub.schedule.time.padEnd(20)} | ${sub.schedule.room.padEnd(8)} | ${sub.instructor}\n`;
      }
    });
    text += `\n====================================================\n`;
    text += `Generated on: ${new Date().toLocaleString()}\n`;
    text += `Office of the Registrar — Enrollment System Prototype\n`;

    downloadTextFile(`Class_Schedule_${student.id}.txt`, text);
  };

  const handleDownloadRegForm = () => {
    if (!student) return;
    let text = `====================================================\n`;
    text += `        STUDENT CERTIFICATE OF REGISTRATION\n`;
    text += `====================================================\n`;
    text += `Student ID:   ${student.id}\n`;
    text += `Full Name:    ${student.lastName}, ${student.firstName}\n`;
    text += `Email:        ${student.email}\n`;
    text += `Phone:        ${student.phone}\n`;
    text += `Birth Date:   ${student.birthDate}\n`;
    text += `Address:      ${student.address}\n`;
    text += `----------------------------------------------------\n`;
    text += `Enrollment Type: ${student.enrollmentType.toUpperCase()}\n`;
    text += `Program ID:      ${student.programId.toUpperCase()}\n`;
    text += `Term:            1st Semester 2026-2027\n`;
    text += `----------------------------------------------------\n`;
    text += `Validated by Registrar: YES\n`;
    text += `====================================================\n`;
    text += `Generated on: ${new Date().toLocaleString()}\n`;

    downloadTextFile(`Registration_Form_${student.id}.txt`, text);
  };

  const handleDownloadReceipt = () => {
    if (!student) return;
    let text = `====================================================\n`;
    text += `              OFFICIAL PAYMENT RECEIPT\n`;
    text += `====================================================\n`;
    text += `Receipt No:   OR-${Math.floor(100000 + Math.random() * 900000)}\n`;
    text += `Student ID:   ${student.id}\n`;
    text += `Student Name: ${student.lastName}, ${student.firstName}\n`;
    text += `Date Paid:    ${new Date().toLocaleDateString()}\n`;
    text += `Payment Method: ${student.paymentMethod ? student.paymentMethod.toUpperCase() : 'N/A'}\n`;
    text += `----------------------------------------------------\n\n`;
    text += `Itemized Charges Assessment:\n`;
    
    student.tuitionBreakdown.forEach((item) => {
      text += `  - ${item.label.padEnd(40)} : Php ${item.amount.toFixed(2).padStart(10)}\n`;
    });

    text += `\n----------------------------------------------------\n`;
    text += `TOTAL PAID: Php ${student.totalTuition.toFixed(2)}\n`;
    text += `====================================================\n`;
    text += `Accounting Office — Official System Receipt\n`;

    downloadTextFile(`Official_Receipt_${student.id}.txt`, text);
  };

  return (
    <div className="space-y-6">
      {!isEnrolled ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center space-y-4">
          <Clock className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
          <h2 className="text-lg font-semibold text-slate-900">Awaiting Registrar Validation</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your simulated payment clearance is complete. Your files have been routed to the <span className="font-semibold text-slate-800">Registrar's Queue</span> for final validation and enrollment confirmation.
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono p-3 rounded max-w-sm mx-auto">
            CURRENT PIPELINE STATE: VALIDATION_PENDING
          </div>
          <p className="text-xs text-slate-400">
            Please select the "Registrar" role in the top header bar to approve this student's records, then switch back to view generated fulfillment packages.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-md p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Enrollment Complete!</h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Congratulations! Your official registration records have been generated. You are now officially enrolled in the system.
            </p>

            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2 rounded-full font-mono">
              <ShieldCheck className="h-4 w-4" /> STUDENT STATUS: ENROLLED
            </div>
          </div>

          {/* Fulfillment Documents list */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Official Generated Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-between h-48">
                <div>
                  <FileDown className="h-6 w-6 text-indigo-600 mb-3" />
                  <h4 className="text-sm font-semibold text-slate-900">Class Schedule</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Your generated lecture schedule containing room details, schedules, and instructor assignments.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSchedule}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Download Schedule
                </button>
              </div>

              {/* Card 2 */}
              <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-between h-48">
                <div>
                  <FileDown className="h-6 w-6 text-indigo-600 mb-3" />
                  <h4 className="text-sm font-semibold text-slate-900">Certificate of Registration</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Official registration document verifying enrollment type, personal records, and program details.
                  </p>
                </div>
                <button
                  onClick={handleDownloadRegForm}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Download COA Form
                </button>
              </div>

              {/* Card 3 */}
              <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-between h-48">
                <div>
                  <FileDown className="h-6 w-6 text-indigo-600 mb-3" />
                  <h4 className="text-sm font-semibold text-slate-900">Official Payment Receipt</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Receipt from finance ledger verifying payment clearance and itemized fees.
                  </p>
                </div>
                <button
                  onClick={handleDownloadReceipt}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all cursor-pointer"
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
