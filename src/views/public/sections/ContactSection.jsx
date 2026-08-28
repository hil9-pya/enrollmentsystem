import React, { useState } from 'react';
import { MapPin, Phone, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const NCST_PHONE = '+63 (46) 414-0000';
const NCST_PHONE_HREF = 'tel:+6346414000';
const NCST_MOBILE = '+63 917 123 4567';
const NCST_MOBILE_HREF = 'tel:+639171234567';
const NCST_EMAIL = 'info@ncst.edu.ph';

export default function ContactSection() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: 'Admission Inquiry',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!form.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!form.message.trim()) newErrors.message = 'Message is required.';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call — replace with real endpoint when available
      await new Promise((resolve) => setTimeout(resolve, 1200));
      // On success
      setSubmitStatus('success');
      setForm({ firstName: '', lastName: '', email: '', subject: 'Admission Inquiry', message: '' });
      setErrors({});
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-colors outline-none ${
      errors[field] ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
    }`;

  return (
    <section id="contact" className="py-24 bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-extrabold text-univ-blue uppercase tracking-[0.2em] mb-3">Get In Touch</h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy mb-6 tracking-tight">
            We'd Love to Hear From You
          </h3>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Have questions about admissions, programs, or campus life? Our team is ready to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-univ-blue mb-4">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </div>
                <h4 className="font-bold text-univ-navy mb-2">Campus Location</h4>
                <a
                  href="https://maps.google.com/?q=Dasmariñas+Cavite+Philippines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 font-medium hover:text-univ-blue transition-colors"
                >
                  Dasmariñas, Cavite, Philippines
                </a>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-univ-blue mb-4">
                  <Phone className="w-5 h-5" aria-hidden="true" />
                </div>
                <h4 className="font-bold text-univ-navy mb-2">Contact Numbers</h4>
                <div className="space-y-1">
                  <a href={NCST_PHONE_HREF} className="block text-sm text-slate-500 font-medium hover:text-univ-blue transition-colors">
                    {NCST_PHONE}
                  </a>
                  <a href={NCST_MOBILE_HREF} className="block text-sm text-slate-500 font-medium hover:text-univ-blue transition-colors">
                    {NCST_MOBILE}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-univ-blue shrink-0">
                <Mail className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-bold text-univ-navy mb-1">Email Us</h4>
                <a href={`mailto:${NCST_EMAIL}`} className="text-sm font-medium text-univ-blue hover:underline">
                  {NCST_EMAIL}
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-xl shadow-univ-blue/5">
            <h4 className="font-heading text-2xl font-extrabold text-univ-navy mb-6">Send us a Message</h4>

            {/* Success Message */}
            {submitStatus === 'success' && (
              <div role="alert" className="mb-6 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Message sent successfully!</p>
                  <p className="text-xs font-medium text-emerald-700 mt-0.5">We'll get back to you within 1–2 business days.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div role="alert" className="mb-6 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Failed to send message.</p>
                  <p className="text-xs font-medium text-rose-700 mt-0.5">Please try again or email us directly at {NCST_EMAIL}.</p>
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="firstName" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    className={inputClass('firstName')}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="mt-1 text-xs font-medium text-rose-600">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleChange}
                    autoComplete="family-name"
                    className={inputClass('lastName')}
                    aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="mt-1 text-xs font-medium text-rose-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className={inputClass('email')}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-xs font-medium text-rose-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="subject" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-colors outline-none appearance-none"
                >
                  <option value="Admission Inquiry">Admission Inquiry</option>
                  <option value="Scholarship Inquiry">Scholarship Inquiry</option>
                  <option value="Program Information">Program Information</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  value={form.message}
                  onChange={handleChange}
                  className={inputClass('message') + ' resize-none'}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                  aria-invalid={!!errors.message}
                />
                {errors.message && (
                  <p id="message-error" className="mt-1 text-xs font-medium text-rose-600">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-univ-blue hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl transition-all shadow-md shadow-univ-blue/20 hover:shadow-lg hover:shadow-univ-blue/30 hover:-translate-y-0.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
