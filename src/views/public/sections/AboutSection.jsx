import React from 'react';
import { Target, Eye, Star, Award } from 'lucide-react';

export default function AboutSection() {
  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To provide quality, relevant, and responsive education to our students, preparing them for global competitiveness and ethical leadership.'
    },
    {
      icon: Eye,
      title: 'Our Vision',
      description: 'To be a premier institution of higher learning recognized for academic excellence, innovative research, and impactful community extension.'
    },
    {
      icon: Star,
      title: 'Core Values',
      description: 'Excellence, Integrity, Innovation, Social Responsibility, and Lifelong Learning are the pillars that guide our institutional culture.'
    },
    {
      icon: Award,
      title: 'Our History',
      description: 'Founded with a commitment to transforming lives through technology and science, NCST has grown into a leading educational hub in the region.'
    }
  ];

  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-extrabold text-univ-blue uppercase tracking-[0.2em] mb-3">About NCST</h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy mb-6 tracking-tight">
            Building the Future Through Innovation
          </h3>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            National College of Science and Technology is dedicated to fostering a culture of excellence. We don't just teach; we inspire, innovate, and prepare you for the challenges of tomorrow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="bg-slate-50 border border-slate-100 rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl hover:shadow-univ-blue/5"
              >
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-univ-blue mb-6">
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>
                <h4 className="text-lg font-bold text-univ-navy mb-3">{item.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
