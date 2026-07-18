import React from 'react';
import { BookOpen, Users, Building, Laptop, Globe, GraduationCap } from 'lucide-react';

export default function WhyChooseSection() {
  const features = [
    {
      icon: BookOpen,
      title: 'Quality Education',
      description: 'Our curriculum is designed to meet international standards and industry demands, ensuring our graduates are highly competitive.'
    },
    {
      icon: Users,
      title: 'Experienced Faculty',
      description: 'Learn from industry professionals and seasoned academicians who bring real-world experience into the classroom.'
    },
    {
      icon: Building,
      title: 'Modern Facilities',
      description: 'Train in state-of-the-art laboratories, modern classrooms, and comprehensive libraries equipped with the latest technology.'
    },
    {
      icon: Laptop,
      title: 'Industry-Ready Curriculum',
      description: 'Our programs are regularly updated in partnership with industry leaders to ensure relevance and employability.'
    },
    {
      icon: Globe,
      title: 'Student Organizations',
      description: 'Develop leadership and interpersonal skills through a vibrant campus life with diverse student clubs and organizations.'
    },
    {
      icon: GraduationCap,
      title: 'Scholarship Opportunities',
      description: 'We believe education should be accessible. Various academic and athletic scholarships are available for deserving students.'
    }
  ];

  return (
    <section className="py-24 bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          <div className="lg:w-1/3">
            <h2 className="text-sm font-extrabold text-univ-blue uppercase tracking-[0.2em] mb-3">Why Choose NCST</h2>
            <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy mb-6 tracking-tight">
              An Environment Built for Excellence
            </h3>
            <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
              We provide more than just education. We offer an ecosystem where talent is nurtured, skills are honed, and futures are secured.
            </p>
            <div className="hidden lg:block relative rounded-3xl overflow-hidden shadow-2xl h-80">
              <img 
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Students studying" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-univ-navy/20"></div>
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index}
                    className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-univ-blue/30 shadow-sm hover:shadow-xl hover:shadow-univ-blue/5 transition-all duration-300 group cursor-default"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-univ-blue flex items-center justify-center group-hover:bg-univ-blue group-hover:text-white transition-colors duration-300">
                        <Icon className="w-5 h-5 stroke-[2]" />
                      </div>
                      <h4 className="text-base font-bold text-univ-navy">{feature.title}</h4>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
