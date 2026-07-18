import React, { useState, useEffect } from 'react';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TestimonialSection() {
  const testimonials = [
    {
      name: 'Maria Santos',
      program: 'BS Information Technology',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      quote: 'NCST provided me with the technical skills and industry connections I needed. Right after graduation, I landed a job at a top tech company.'
    },
    {
      name: 'Juan Dela Cruz',
      program: 'BS Computer Science',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      quote: 'The professors are incredibly supportive, and the modern laboratories made learning complex programming concepts much easier and practical.'
    },
    {
      name: 'Anna Reyes',
      program: 'BS Business Administration',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      quote: 'My experience here honed my leadership skills. The student organizations and practical curriculum prepared me well for the corporate world.'
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const handlePrev = () => {
    setActiveIndex((current) => (current === 0 ? testimonials.length - 1 : current - 1));
  };

  const handleNext = () => {
    setActiveIndex((current) => (current + 1) % testimonials.length);
  };

  return (
    <section className="py-24 bg-[#f8fafc] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-extrabold text-univ-blue uppercase tracking-[0.2em] mb-3">Student Success Stories</h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy mb-6 tracking-tight">
            Hear From Our Community
          </h3>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Main Carousel Container */}
          <div className="relative h-[300px] sm:h-[250px]">
            {testimonials.map((testimonial, index) => {
              const isActive = index === activeIndex;
              return (
                <div 
                  key={index}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    isActive ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-8 -z-10'
                  }`}
                >
                  <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-univ-blue/5 border border-slate-100 relative h-full flex flex-col sm:flex-row items-center gap-8">
                    <Quote className="absolute top-8 left-8 w-16 h-16 text-blue-50 stroke-[1]" />
                    
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    
                    <div className="relative z-10 text-center sm:text-left flex-1">
                      <p className="text-lg sm:text-xl text-slate-600 font-medium italic leading-relaxed mb-6">
                        "{testimonial.quote}"
                      </p>
                      <div>
                        <h4 className="text-base font-bold text-univ-navy">{testimonial.name}</h4>
                        <p className="text-sm text-univ-blue font-bold mt-1">{testimonial.program}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <button 
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-univ-blue hover:border-univ-blue hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx ? 'w-8 bg-univ-blue' : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
            <button 
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-univ-blue hover:border-univ-blue hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
