import React from 'react';
import { UserPlus, FileText, UploadCloud, ClipboardCheck, CheckCircle, CreditCard, GraduationCap } from 'lucide-react';

export default function AdmissionTimeline() {
  const steps = [
    {
      icon: UserPlus,
      title: 'Register Account',
      description: 'Create your applicant account using a valid email address to access the portal.'
    },
    {
      icon: FileText,
      title: 'Complete Form',
      description: 'Fill out your personal, educational, and family background information accurately.'
    },
    {
      icon: UploadCloud,
      title: 'Submit Requirements',
      description: 'Upload digital copies of your academic records, ID, and other necessary documents.'
    },
    {
      icon: ClipboardCheck,
      title: 'Evaluation',
      description: 'Wait for the admissions office to review your application and documents.'
    },
    {
      icon: CheckCircle,
      title: 'Approval',
      description: 'Receive your acceptance notification and proceed to advising for subject selection.'
    },
    {
      icon: CreditCard,
      title: 'Enrollment & Payment',
      description: 'Pay your assessed tuition fees to the accounting office to secure your slot.'
    },
    {
      icon: GraduationCap,
      title: 'Student Portal Access',
      description: 'Get your official registration form and access your new student portal.'
    }
  ];

  return (
    <section id="admissions" className="py-24 bg-univ-navy text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-univ-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-univ-gold/10 rounded-full blur-3xl"></div>

        <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
          <h2 className="text-sm font-extrabold text-univ-gold uppercase tracking-[0.2em] mb-3">Admission Process</h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-6 tracking-tight">
            Your Journey Starts Here
          </h3>
          <p className="text-lg text-slate-300 font-medium leading-relaxed">
            We've streamlined our enrollment process to make it as easy and transparent as possible. Follow these simple steps to become an official NCST student.
          </p>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Vertical Line for Mobile/Tablet */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-white/10 md:-translate-x-1/2"></div>

          <div className="space-y-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div key={index} className="relative flex flex-col md:flex-row items-center group">
                  {/* Content Left (Empty on odd for desktop) */}
                  <div className={`w-full md:w-1/2 pl-20 md:pl-0 ${isEven ? 'md:pr-16 md:text-right' : 'md:order-3 md:pl-16 md:text-left'}`}>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors duration-300">
                      <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-3 md:block">
                        <span className="md:hidden text-univ-gold text-sm font-extrabold">Step {index + 1}</span>
                        {step.title}
                      </h4>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Center Node */}
                  <div className={`absolute left-0 md:left-1/2 w-16 h-16 flex items-center justify-center md:-translate-x-1/2 ${isEven ? 'md:order-2' : 'md:order-2'}`}>
                    <div className="w-12 h-12 rounded-full bg-univ-navy border-4 border-univ-navy z-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-univ-gold to-yellow-600"></div>
                      <Icon className="w-5 h-5 text-univ-navy relative z-10" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  {/* Empty space for alternating layout */}
                  <div className={`hidden md:block w-1/2 ${isEven ? 'order-3' : 'order-1'}`}></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
