import React from 'react';

export default function GallerySection() {
  const images = [
    { src: 'https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Modern Campus Library', span: 'md:col-span-2 md:row-span-2' },
    { src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Engineering Laboratory', span: 'md:col-span-1 md:row-span-1' },
    { src: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Campus Grounds', span: 'md:col-span-1 md:row-span-1' },
    { src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Student Activities', span: 'md:col-span-1 md:row-span-1' },
    { src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Modern Classrooms', span: 'md:col-span-1 md:row-span-1' }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-extrabold text-univ-blue uppercase tracking-[0.2em] mb-3">Campus Highlights</h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy mb-6 tracking-tight">
            Experience NCST Life
          </h3>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Take a glimpse into our state-of-the-art facilities, vibrant student life, and the beautiful campus that our students call their second home.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[600px]">
          {images.map((image, index) => (
            <div 
              key={index} 
              className={`relative rounded-3xl overflow-hidden group ${image.span}`}
            >
              <img 
                src={image.src} 
                alt={image.alt} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-univ-navy/90 via-univ-navy/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-white font-bold text-lg">{image.alt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
