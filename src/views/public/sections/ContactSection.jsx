import React from 'react';
import { MapPin, Phone, Mail, Send } from 'lucide-react';

export default function ContactSection() {
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
          {/* Contact Info & Map */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-univ-blue mb-4">
                  <MapPin className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-univ-navy mb-2">Campus Location</h4>
                <p className="text-sm text-slate-500 font-medium">Amaia Scapes Ave, General Trias, Cavite, Philippines</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-univ-blue mb-4">
                  <Phone className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-univ-navy mb-2">Contact Numbers</h4>
                <p className="text-sm text-slate-500 font-medium">+63 (46) 414-0000<br/>+63 917 123 4567</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-univ-blue shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-univ-navy mb-1">Email Us</h4>
                <a href="mailto:info@ncst.edu.ph" className="text-sm font-medium text-univ-blue hover:underline">info@ncst.edu.ph</a>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="h-64 bg-slate-200 rounded-3xl overflow-hidden relative border border-slate-200">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                <MapPin className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-bold uppercase tracking-widest opacity-50">Interactive Map</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-xl shadow-univ-blue/5">
            <h4 className="font-heading text-2xl font-extrabold text-univ-navy mb-6">Send us a Message</h4>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">First Name</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-colors outline-none" placeholder="Juan" />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">Last Name</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-colors outline-none" placeholder="Dela Cruz" />
                </div>
              </div>

              <div className="relative">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address</label>
                <input type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-colors outline-none" placeholder="juan@example.com" />
              </div>

              <div className="relative">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">Subject</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-colors outline-none appearance-none">
                  <option>Admission Inquiry</option>
                  <option>Scholarship Inquiry</option>
                  <option>Program Information</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="relative">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">Message</label>
                <textarea rows="4" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-colors outline-none resize-none" placeholder="How can we help you?"></textarea>
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-univ-blue hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-univ-blue/20 hover:shadow-lg hover:shadow-univ-blue/30 hover:-translate-y-0.5 cursor-pointer">
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
