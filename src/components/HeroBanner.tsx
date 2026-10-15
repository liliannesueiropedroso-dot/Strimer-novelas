import React from 'react';
import { Play, Plus, Check, Info, Star, Sparkles } from 'lucide-react';
import { Novel } from '../types';
import { useApp } from '../context/AppContext';
import { getSafeImageUrl, handleImageError } from '../services/driveService';

interface HeroBannerProps {
  novel: Novel;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ novel }) => {
  const { playEpisodeInNewPage, setSelectedNovelForDetail, toggleWatchlistState, watchlist } = useApp();
  const isSaved = watchlist.includes(novel.id);
  const heroImage = novel.bannerUrl || novel.coverUrl;

  return (
    <div className="relative w-full h-[460px] sm:h-[520px] md:h-[580px] overflow-hidden rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 my-4 shadow-2xl">
      {/* Background Backdrop Image */}
      <img
        src={getSafeImageUrl(heroImage)}
        alt={novel.title}
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.65] transform scale-105"
        onError={(e) => handleImageError(e, heroImage)}
      />

      {/* Cinematic Vignette Gradients with Deep Obsidian Blue */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080D1A] via-[#080D1A]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080D1A] via-[#080D1A]/50 to-transparent" />

      {/* Content Container */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-8 sm:pb-12 z-10">
        <div className="max-w-2xl space-y-3.5">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-lg shadow-blue-500/30">
              <Sparkles className="w-3 h-3" />
              Destacado
            </span>
            {novel.releaseYear && (
              <span className="text-[11px] font-black tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-[#38BDF8] border border-[#38BDF8]/40 backdrop-blur-sm">
                Año {novel.releaseYear}
              </span>
            )}
            <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/50 text-amber-300 backdrop-blur-sm border border-white/10">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{(novel.rating || 5.0).toFixed(1)}</span>
            </div>
            <span className="text-xs text-[#A7B0C0] font-medium bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
              👁️ {(novel.views || 0).toLocaleString()} vistas • ❤️ {(novel.likesCount || 0).toLocaleString()} Me gusta • {novel.episodeCount} Eps
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#F7F7FA] tracking-tight leading-tight drop-shadow-md">
            {novel.title}
          </h1>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-[#A7B0C0] line-clamp-3 leading-relaxed drop-shadow">
            {novel.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => playEpisodeInNewPage(novel)}
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[#FF5A5F] hover:bg-[#e04e53] text-white font-bold text-sm shadow-xl shadow-[#FF5A5F]/30 active:scale-95 transition-all glow-coral"
              title="Reproducir en otra página (sin bloqueos de navegador)"
            >
              <Play className="w-4 h-4 fill-current" />
              Ver ahora
            </button>

            <button
              onClick={() => toggleWatchlistState(novel.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-semibold backdrop-blur-md transition-all active:scale-95 ${
                isSaved 
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white' 
                  : 'bg-black/40 border-white/10 hover:border-white/30 text-[#F7F7FA]'
              }`}
            >
              {isSaved ? <Check className="w-4 h-4 text-[#2ECC8F]" /> : <Plus className="w-4 h-4" />}
              {isSaved ? 'En mi lista' : 'Mi lista'}
            </button>

            <button
              onClick={() => setSelectedNovelForDetail(novel)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-[#F7F7FA] text-sm font-semibold backdrop-blur-md transition-all"
            >
              <Info className="w-4 h-4" />
              Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
