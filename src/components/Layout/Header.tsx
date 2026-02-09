import React from 'react';
import { Layers } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-center">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25 rotate-3 hover:rotate-6 transition-transform">
          <Layers className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tight text-foreground leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
            Red <span className="text-primary italic">Vibe</span>
          </h1>
          <span className="text-xs text-gray-500 font-bold tracking-[0.15em] uppercase mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            create viral social media covers
          </span>
        </div>
      </div>
    </header>
  );
};
