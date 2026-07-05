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
  };  return (
    <div className="space-y-6">
      {!isEnrolled ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-6 shadow-premium">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto shadow-sm animate-pulse border border-univ-gold/10">
            <Clock className="h-8 w-8 text-univ-gold" />
          </div>
          <h2 className="text-xl font-extrabold text-univ-navy">Awaiting Registrar Validation</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
            Your simulated tuition payment is complete. Your files have been routed to the <span className="font-bold text-univ-navy">Registrar's Queue</span> for final validation and enrollment confirmation.
          </p>
          <div className="bg-amber-50 border border-univ-gold/20 text-univ-gold text-[10px] font-bold font-mono px-4.5 py-2.5 rounded-xl max-w-sm mx-auto shadow-sm tracking-widest">
            CURRENT PIPELINE STATE: VALIDATION_PENDING
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl max-w-md mx-auto text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Administrative Simulation Action Required</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Please click the <span className="font-bold text-univ-navy">"Staff Portal"</span> from the main page, sign in as a <span className="font-bold">Registrar</span>, approve this student record, then return here to retrieve your documents.
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
