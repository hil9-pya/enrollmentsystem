import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, LogIn } from 'lucide-react';

export default function Navbar({ onNavigate }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLightSection, setIsLightSection] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      const scrolled = scrollY > 30;
      setIsScrolled(scrolled);

      if (!scrolled) {
        setIsLightSection(false);
        return;
      }

      // Check viewport coordinates of all sections on the page
      // 45px is the vertical center of the fixed navbar
      const navY = 45;
      const lightSectionIds = ['about', 'why-choose', 'programs', 'faq', 'contact'];
      let detectedLight = false;

      // 1. Check sections by ID
      for (const id of lightSectionIds) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= navY && rect.bottom >= navY) {
            detectedLight = true;
            break;
          }
        }
      }

      // 2. Fallback scan all main sections
      if (!detectedLight) {
        const sections = document.querySelectorAll('main section');
        sections.forEach((sec) => {
          const rect = sec.getBoundingClientRect();
          if (rect.top <= navY && rect.bottom >= navY) {
            const id = sec.id;
            const isDark = id === 'home' || id === 'admissions' || sec.classList.contains('bg-univ-navy');
            if (!isDark) {
              detectedLight = true;
            }
          }
        });
      }

      setIsLightSection(detectedLight);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleScroll, { capture: true, passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll, { capture: true });
    };
  }, []);

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
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
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const offsetPosition = elementRect - bodyRect - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Theme styling rules based on section color detection
  const navContainerStyle = !isScrolled
    ? 'bg-transparent py-5'
    : isLightSection
    ? 'bg-white/95 backdrop-blur-md shadow-md shadow-slate-900/10 border-b border-slate-200/90 py-3.5'
    : 'bg-univ-navy/95 backdrop-blur-md shadow-xl shadow-univ-navy/30 border-b border-white/10 py-3.5';

  const logoTitleStyle = isLightSection && isScrolled
    ? 'text-univ-blue group-hover:text-blue-800 font-extrabold'
    : 'text-white group-hover:text-univ-gold font-extrabold';

  const logoBadgeBg = isLightSection && isScrolled
    ? 'bg-blue-50 border border-blue-100 group-hover:bg-blue-100'
    : 'bg-white/10 backdrop-blur-sm group-hover:bg-white/20';

  const navLinkStyle = isLightSection && isScrolled
    ? 'text-univ-blue font-extrabold hover:text-blue-900 hover:bg-blue-50'
    : 'text-slate-100 font-extrabold hover:text-univ-gold hover:bg-white/10';

  const lmsBtnStyle = isLightSection && isScrolled
    ? 'border-2 border-univ-blue text-univ-blue font-extrabold hover:bg-univ-blue hover:text-white'
    : 'border border-white/30 text-white font-bold hover:bg-white/15 hover:border-white';

  const loginBtnStyle = isLightSection && isScrolled
    ? 'bg-univ-blue text-white hover:bg-blue-800 font-extrabold shadow-md shadow-univ-blue/20'
    : 'bg-univ-gold text-univ-navy hover:bg-yellow-400 font-extrabold shadow-md shadow-univ-gold/20';

  const mobileBtnStyle = isLightSection && isScrolled
    ? 'text-univ-blue hover:bg-blue-50'
    : 'text-white hover:bg-white/10';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navContainerStyle}`}
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo — clickable, scrolls to top */}
            <button
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => scrollToSection('home')}
              aria-label="NCST — Go to top"
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${logoBadgeBg}`}>
                <img src="/logo.png" alt="NCST Logo" className="w-8 h-8 object-contain" />
              </div>
              <div className="text-left">
                <span className={`font-heading font-extrabold text-lg tracking-wide leading-tight transition-colors ${logoTitleStyle}`}>
                  NCST
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className={`px-4 py-2 text-sm rounded-xl transition-all duration-200 cursor-pointer ${navLinkStyle}`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
              
              <div className={`flex items-center gap-3 pl-6 border-l transition-colors ${isLightSection && isScrolled ? 'border-blue-100' : 'border-white/20'}`}>
                <button
                  type="button"
                  onClick={() => onNavigate('lms')}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer ${lmsBtnStyle}`}
                >
                  LMS
                </button>
                <button
                  onClick={() => onNavigate('gateway')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm transition-all cursor-pointer hover:-translate-y-0.5 ${loginBtnStyle}`}
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  Login
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${mobileBtnStyle}`}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 z-50 h-full w-[min(85vw,20rem)] bg-univ-navy text-white shadow-2xl border-l border-white/10 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NCST" className="w-7 h-7 object-contain" />
            <span className="font-heading font-bold text-sm text-white">NCST</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer links */}
        <div className="px-4 py-6 space-y-1 overflow-y-auto">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-200 hover:text-univ-gold hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              {link.label}
              <ChevronRight className="w-4 h-4 opacity-50" aria-hidden="true" />
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-white/10 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate('lms');
              }}
              className="w-full rounded-xl border border-white/30 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Learning Management System
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate('gateway');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-univ-gold text-univ-navy text-sm font-bold rounded-xl hover:bg-yellow-400 transition-colors cursor-pointer shadow-md"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Access Portal
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
