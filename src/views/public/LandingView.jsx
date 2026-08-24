import React, { useEffect, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import WhyChooseSection from './sections/WhyChooseSection';
import ProgramsSection from './sections/ProgramsSection';
import AdmissionTimeline from './sections/AdmissionTimeline';
import FAQSection from './sections/FAQSection';
import ContactSection from './sections/ContactSection';
import { ArrowUp } from 'lucide-react';

export default function LandingView({ onNavigate }) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitor scroll position across all elements & window
  useEffect(() => {
    window.scrollTo(0, 0);

    const handleScroll = () => {
      const scrollY =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      setShowScrollTop(scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="font-sans text-slate-800 bg-white selection:bg-univ-gold selection:text-univ-navy scroll-smooth overflow-x-hidden relative">
      <Navbar onNavigate={onNavigate} />
      
      <main>
        <HeroSection onNavigate={onNavigate} />
        <AboutSection />
        <WhyChooseSection />
        <ProgramsSection />
        <AdmissionTimeline />
        <FAQSection />
        <ContactSection />
      </main>
      
      <Footer onNavigate={onNavigate} />

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[9999] flex items-center gap-2 px-4 py-3 bg-univ-blue hover:bg-univ-navy text-white font-extrabold text-xs rounded-full shadow-2xl shadow-univ-blue/50 border-2 border-white transition-all duration-200 transform hover:scale-105 cursor-pointer group active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-300"
          aria-label="Scroll back to top"
          title="Scroll back to top"
        >
          <ArrowUp className="w-4 h-4 stroke-[3] text-univ-gold group-hover:-translate-y-0.5 transition-transform" />
          <span className="hidden sm:inline tracking-wider uppercase">Back to top</span>
        </button>
      )}
    </div>
  );
}
