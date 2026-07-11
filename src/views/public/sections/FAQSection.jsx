import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQSection() {
  const faqs = [
    {
      question: 'How do I apply for admission?',
      answer: 'To apply, simply click the "Apply Now" button on the top of this page or navigate to the Applicant Portal. You will need to create an account, fill out the application form, and upload your requirements.'
    },
    {
      question: 'What are the admission requirements?',
      answer: 'Requirements vary depending on your student type (Freshman, Transferee, or Returnee). Generally, you will need your High School Card (Form 138), Certificate of Good Moral Character, PSA Birth Certificate, and recent 2x2 pictures.'
    },
    {
      question: 'Is there an entrance exam?',
      answer: 'Currently, the entrance examination requirement is waived. Admissions are based on the evaluation of your submitted academic records and credentials.'
    },
    {
      question: 'How long is the approval process?',
      answer: 'Once all requirements are submitted, the evaluation process typically takes 1 to 3 working days. You will be notified via email and through your applicant portal once your application is approved.'
    },
    {
      question: 'Are there scholarship programs available?',
      answer: 'Yes, NCST offers various scholarship programs including Academic Scholarships, Athletic Grants, and Financial Assistance for deserving students. You may inquire at the Scholarship Office upon enrollment.'
    }
  ];

  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-sm font-extrabold text-univ-blue uppercase tracking-[0.2em] mb-3">Frequently Asked Questions</h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy mb-6 tracking-tight">
            Got Questions? We Have Answers
          </h3>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = index === openIndex;
            return (
              <div 
                key={index} 
                className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                  isOpen ? 'border-univ-blue shadow-md shadow-univ-blue/10 bg-white' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <span className={`font-bold text-base transition-colors ${isOpen ? 'text-univ-navy' : 'text-slate-700'}`}>
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                    isOpen ? 'bg-blue-50 text-univ-blue rotate-180' : 'bg-white text-slate-400 border border-slate-200'
                  }`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-sm text-slate-500 font-medium leading-relaxed border-t border-slate-100 pt-4">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
