import React from 'react';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';

const NCST_PHONE = '+63 (46) 414-0000';
const NCST_PHONE_HREF = 'tel:+6346414000';
const NCST_EMAIL = 'info@ncst.edu.ph';

export default function Footer({ onNavigate }) {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'About NCST', section: 'about' },
    { label: 'Academic Programs', section: 'programs' },
    { label: 'Admissions', section: 'admissions' },
    { label: 'Contact Us', section: 'contact' },
  ];

  const scrollToSection = (section) => {
    // If we're not on landing, navigate there first then scroll
    const element = document.getElementById(section);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
    } else {
      // Navigate to landing page — section will be visible there
      onNavigate('landing');
    }
  };

  return (
    <footer className="bg-univ-navy text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3 group cursor-pointer"
              aria-label="Go to NCST homepage"
            >
              <div className="p-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                <img src="/logo.png" alt="NCST Logo" className="w-10 h-10 object-contain" loading="lazy" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xl text-white tracking-wide leading-tight">NCST</h3>
              </div>
            </button>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              National College of Science and Technology. Empowering students with quality education, innovative skills, and ethical values for global competitiveness.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-univ-gold"></span>
              Quick Links
            </h4>
            <ul className="space-y-3.5">
              {quickLinks.map((link) => (
                <li key={link.section}>
                  <button
                    onClick={() => scrollToSection(link.section)}
                    className="text-sm font-medium hover:text-univ-gold transition-colors inline-flex items-center gap-2 group cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Access Portals */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-univ-blue"></span>
              Access Portals
            </h4>
            <ul className="space-y-3.5">
              <li>
                <button onClick={() => onNavigate('gateway')} className="text-sm font-medium hover:text-univ-blue transition-colors inline-flex items-center gap-2 group cursor-pointer">
                  <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  Applicant Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('gateway')} className="text-sm font-medium hover:text-univ-blue transition-colors inline-flex items-center gap-2 group cursor-pointer">
                  <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  Student Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('gateway')} className="text-sm font-medium hover:text-univ-blue transition-colors inline-flex items-center gap-2 group cursor-pointer">
                  <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  Staff Intranet
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('lms')} className="text-sm font-medium hover:text-univ-blue transition-colors inline-flex items-center gap-2 group cursor-pointer">
                  <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  Learning Management System
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Contact Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm font-medium">
                <MapPin className="w-5 h-5 text-univ-gold shrink-0 mt-0.5" aria-hidden="true" />
                <a
                  href="https://maps.google.com/?q=Dasmariñas+Cavite+Philippines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Dasmariñas, Cavite, Philippines
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm font-medium">
                <Phone className="w-5 h-5 text-univ-gold shrink-0" aria-hidden="true" />
                <a href={NCST_PHONE_HREF} className="hover:text-white transition-colors">
                  {NCST_PHONE}
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm font-medium">
                <Mail className="w-5 h-5 text-univ-gold shrink-0" aria-hidden="true" />
                <a href={`mailto:${NCST_EMAIL}`} className="hover:text-white transition-colors">
                  {NCST_EMAIL}
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-medium text-slate-500">
            &copy; {currentYear} National College of Science and Technology. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs font-medium text-slate-500">
            <span className="text-slate-600">Privacy Policy</span>
            <span className="text-slate-600">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
