import React from 'react';
import { MapPin, Phone, Mail, ArrowRight, MessageCircle, Share2, Globe, Video } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-univ-navy text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
                <img src="/logo.png" alt="NCST Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xl text-white tracking-wide leading-tight">NCST</h3>
                <p className="text-[9px] font-bold text-univ-gold uppercase tracking-widest">Gateway to Success</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              National College of Science and Technology. Empowering students with quality education, innovative skills, and ethical values for global competitiveness.
            </p>
            <div className="flex items-center gap-4 pt-2">
              {[MessageCircle, Share2, Globe, Video].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-univ-blue hover:text-white transition-all duration-300 border border-white/10 hover:border-univ-blue">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-univ-gold"></span>
              Quick Links
            </h4>
            <ul className="space-y-3.5">
              {['About NCST', 'Academic Programs', 'Admissions', 'Student Life', 'Career Opportunities'].map((link, i) => (
                <li key={i}>
                  <a href="#" className="text-sm font-medium hover:text-univ-gold transition-colors inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    {link}
                  </a>
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
                <a href="#" className="text-sm font-medium hover:text-univ-blue transition-colors inline-flex items-center gap-2 group">
                  <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  Alumni Network
                </a>
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
                <MapPin className="w-5 h-5 text-univ-gold shrink-0 mt-0.5" />
                <span>NCST Campus, Amaia Scapes Ave, General Trias, Cavite, Philippines</span>
              </li>
              <li className="flex items-center gap-3 text-sm font-medium">
                <Phone className="w-5 h-5 text-univ-gold shrink-0" />
                <span>+63 (46) 414-0000</span>
              </li>
              <li className="flex items-center gap-3 text-sm font-medium">
                <Mail className="w-5 h-5 text-univ-gold shrink-0" />
                <a href="mailto:info@ncst.edu.ph" className="hover:text-white transition-colors">info@ncst.edu.ph</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-medium text-slate-500">
            &copy; {new Date().getFullYear()} National College of Science and Technology. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs font-medium text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
