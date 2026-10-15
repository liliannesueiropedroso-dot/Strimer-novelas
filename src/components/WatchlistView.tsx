import React from 'react';
import { Bookmark, Play, Trash2, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NovelCard } from './NovelCard';

export const WatchlistView: React.FC = () => {
  const { watchlist, novels, setCurrentTab, openPlayer, toggleWatchlistState, progressMap } = useApp();

  const savedNovels = novels.filter((n) => watchlist.includes(n.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 text-[#F7F7FA]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-[#FF5A5F]" />
            Mi Lista ({savedNovels.length})
          </h1>
          <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1">
            Novelas y microdramas guardados para ver cuando quieras.
          </p>
        </div>
      </div>

      {savedNovels.length === 0 ? (
        <div className="py-24 text-center max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-[#A7B0C0]">
            <Bookmark className="w-8 h-8 text-[#8B5CF6]" />
          </div>
          <h2 className="text-lg font-bold text-[#F7F7FA]">Tu lista está vacía</h2>
          <p className="text-xs text-[#A7B0C0] leading-relaxed">
            Agrega tus historias favoritas haciendo clic en el ícono de lista en cualquier portada para continuar sin perder el hilo.
          </p>
          <button
            onClick={() => setCurrentTab('home')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF5A5F] hover:bg-[#e04e53] text-white font-bold text-xs shadow-lg shadow-[#FF5A5F]/20 active:scale-95 transition-all"
          >
            <Compass className="w-4 h-4" />
            Descubrir Novelas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {savedNovels.map((novel) => {
            const prog = progressMap[novel.id];
            return (
              <div key={novel.id} className="relative flex flex-col group">
                <NovelCard novel={novel} />
                {prog && (
                  <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-[#8B5CF6]">
                    <span>Cap. {prog.episodeNumber}</span>
                    <span>{Math.round((prog.progressSeconds / (prog.totalDurationSeconds || 60)) * 100)}% visto</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
