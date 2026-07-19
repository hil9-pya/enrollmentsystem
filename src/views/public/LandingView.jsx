import React, { useEffect } from 'react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import WhyChooseSection from './sections/WhyChooseSection';
import ProgramsSection from './sections/ProgramsSection';
import AdmissionTimeline from './sections/AdmissionTimeline';
import FAQSection from './sections/FAQSection';
import ContactSection from './sections/ContactSection';

export default function LandingView({ onNavigate }) {
  // Ensure page loads at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-sans text-slate-800 bg-white selection:bg-univ-gold selection:text-univ-navy scroll-smooth">
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
    </div>
  );
}
