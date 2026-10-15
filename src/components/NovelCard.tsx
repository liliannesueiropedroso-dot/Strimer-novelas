import React from 'react';
import { Play, Star, Plus, Check, Eye, Heart, Calendar } from 'lucide-react';
import { Novel } from '../types';
import { useApp } from '../context/AppContext';
import { getSafeImageUrl, handleImageError } from '../services/driveService';

interface NovelCardProps {
  novel: Novel;
}

export const NovelCard: React.FC<NovelCardProps> = ({ novel }) => {
  const { setSelectedNovelForDetail, playEpisodeInNewPage, toggleWatchlistState, watchlist } = useApp();
  const isSaved = watchlist.includes(novel.id);

  const formattedViews = novel.views > 999 
    ? `${(novel.views / 1000).toFixed(1)}k` 
    : novel.views.toString();

  const formattedLikes = (novel.likesCount || 0) > 999
    ? `${((novel.likesCount || 0) / 1000).toFixed(1)}k`
    : (novel.likesCount || 0).toString();

  return (
    <div 
      className="group relative flex-shrink-0 w-36 sm:w-44 md:w-52 flex flex-col cursor-pointer select-none"
      onClick={() => setSelectedNovelForDetail(novel)}
    >
      {/* Poster Container */}
      <div className="relative aspect-[9/14] w-full overflow-hidden rounded-2xl bg-[#101935] border border-[#1E3A8A]/50 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl group-hover:shadow-blue-500/20 group-hover:border-[#38BDF8]">
        <img
          src={getSafeImageUrl(novel.coverUrl)}
          alt={novel.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => handleImageError(e, novel.coverUrl)}
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-1">
          <div className="flex items-center gap-1">
            {novel.releaseYear && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#2563EB]/90 backdrop-blur-md text-white border border-blue-400/40 shadow-sm flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {novel.releaseYear}
              </span>
            )}
            {novel.isNew ? (
              <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-[#2ECC8F] text-white shadow-md">
                Nuevo
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-300 border border-white/10">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{(novel.rating || 5.0).toFixed(1)}</span>
          </div>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              playEpisodeInNewPage(novel);
            }}
            className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform active:scale-95 hover:brightness-110"
            title="Reproducir en otra página (sin bloqueos)"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlistState(novel.id);
            }}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
            title={isSaved ? 'Quitar de mi lista' : 'Agregar a mi lista'}
          >
            {isSaved ? <Check className="w-4 h-4 text-[#2ECC8F]" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Gradient shadow on bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080D1A] via-transparent to-transparent opacity-90 group-hover:opacity-60 transition-opacity" />

        {/* Bottom Metrics Bar on Poster (Views, Likes, Episode count) */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white font-medium pointer-events-none">
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
            <span className="flex items-center gap-0.5 text-[#38BDF8]">
              <Eye className="w-3 h-3" />
              <span>{formattedViews}</span>
            </span>
            <span className="flex items-center gap-0.5 text-[#FF5A5F]">
              <Heart className="w-2.5 h-2.5 fill-current" />
              <span>{formattedLikes}</span>
            </span>
          </div>

          <span className="text-[10px] text-[#A7B0C0] font-semibold px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
            {novel.episodeCount} eps
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div className="pt-2 px-1">
        <h3 className="text-xs sm:text-sm font-bold text-[#F7F7FA] truncate group-hover:text-[#38BDF8] transition-colors">
          {novel.title}
        </h3>
        <p className="text-[11px] text-[#A7B0C0] truncate mt-0.5">
          {(novel.genres || []).slice(0, 2).join(' • ') || 'Microdrama'}
        </p>
      </div>
    </div>
  );
};
