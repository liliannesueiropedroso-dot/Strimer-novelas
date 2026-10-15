import React from 'react';
import { Play, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSafeImageUrl, handleImageError } from '../services/driveService';

export const ContinueWatchingRow: React.FC = () => {
  const { progressMap, novels, playEpisodeInNewPage } = useApp();

  const progressEntries = Object.values(progressMap).filter(p => p.progressSeconds > 5);

  if (progressEntries.length === 0) return null;

  return (
    <section className="my-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Clock className="w-4 h-4 text-[#FF5A5F]" />
        <h2 className="text-base sm:text-xl font-bold text-[#F7F7FA] tracking-tight">
          Continuar viendo
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-2 px-1">
        {progressEntries.map((prog) => {
          const novel = novels.find(n => n.id === prog.novelId);
          if (!novel) return null;

          const pct = Math.min(
            100, 
            Math.round((prog.progressSeconds / (prog.totalDurationSeconds || 60)) * 100)
          );

          return (
            <div
              key={prog.novelId}
              onClick={() => playEpisodeInNewPage(novel)}
              className="group flex-shrink-0 w-64 sm:w-72 bg-[#151C2E] rounded-2xl border border-white/5 hover:border-[#FF5A5F]/40 p-2.5 flex items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg select-none"
              title="Continuar viendo en otra página (sin bloqueos)"
            >
              {/* Thumbnail */}
              <div className="relative w-20 h-28 rounded-xl overflow-hidden bg-black flex-shrink-0">
                <img
                  src={getSafeImageUrl(novel.coverUrl)}
                  alt={novel.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => handleImageError(e, novel.coverUrl)}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center shadow-md">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Progress Info */}
              <div className="flex-1 min-w-0 pr-1">
                <h3 className="text-xs sm:text-sm font-bold text-[#F7F7FA] truncate group-hover:text-[#FF5A5F] transition-colors">
                  {novel.title}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-[#8B5CF6]">
                  Capítulo {prog.episodeNumber}
                </span>

                {/* Progress Bar */}
                <div className="mt-2 w-full">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF5A5F] to-[#8B5CF6] rounded-full transition-all duration-300" 
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#A7B0C0] mt-1">
                    <span>{pct}% visto</span>
                    <span className="text-[#FF5A5F] font-semibold group-hover:underline">Reanudar</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
