import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Novel } from '../types';
import { NovelCard } from './NovelCard';

interface NovelRowProps {
  title: string;
  subtitle?: string;
  novels: Novel[];
  icon?: React.ReactNode;
}

export const NovelRow: React.FC<NovelRowProps> = ({ title, subtitle, novels, icon }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (novels.length === 0) return null;

  return (
    <section className="my-6 sm:my-8 group relative">
      {/* Row Header */}
      <div className="flex items-end justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#FF5A5F]">{icon}</span>}
          <div>
            <h2 className="text-base sm:text-xl font-bold text-[#F7F7FA] tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#A7B0C0] font-normal mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Scroll Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            className="w-7 h-7 rounded-full bg-[#151C2E] border border-white/10 hover:border-white/30 text-[#F7F7FA] flex items-center justify-center transition-all active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-7 h-7 rounded-full bg-[#151C2E] border border-white/10 hover:border-white/30 text-[#F7F7FA] flex items-center justify-center transition-all active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards Scroll Container */}
      <div
        ref={scrollRef}
        className="flex items-start gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
      >
        {novels.map((novel) => (
          <NovelCard key={novel.id} novel={novel} />
        ))}
      </div>
    </section>
  );
};
