import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, LogIn, GraduationCap } from 'lucide-react';

export default function Navbar({ onNavigate }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', id: 'home' },
    { label: 'About', id: 'about' },
    { label: 'Programs', id: 'programs' },
    { label: 'Admissions', id: 'admissions' },
    { label: 'Contact', id: 'contact' },
  ];

  const scrollToSection = (id) => {
    setIsMobileMenuOpen(false);
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Navbar height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => scrollToSection('home')}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${isScrolled ? 'bg-slate-100' : 'bg-white/10 backdrop-blur-sm group-hover:bg-white/20'}`}>
              <img src="/logo.png" alt="NCST Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className={`font-heading font-extrabold text-lg tracking-wide leading-tight transition-colors duration-300 ${isScrolled ? 'text-univ-navy' : 'text-white'}`}>
                NCST
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                    isScrolled 
                      ? 'text-slate-600 hover:text-univ-blue hover:bg-blue-50/50' 
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3 pl-6 border-l transition-colors duration-300 border-white/20">
              <button 
                onClick={() => onNavigate('gateway')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                  isScrolled
                    ? 'bg-univ-blue text-white hover:bg-blue-700 shadow-sm hover:shadow'
                    : 'bg-white text-univ-navy hover:bg-slate-50 shadow-lg shadow-black/10'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isScrolled ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={`lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-xl transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-screen border-t' : 'max-h-0 border-transparent opacity-0'
        }`}
      >
        <div className="px-4 py-6 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-600 hover:text-univ-blue hover:bg-blue-50/50 rounded-xl transition-colors cursor-pointer"
            >
              {link.label}
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          ))}
          <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-3">
            <button 
              onClick={() => onNavigate('gateway')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-univ-blue text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Access Portal
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
