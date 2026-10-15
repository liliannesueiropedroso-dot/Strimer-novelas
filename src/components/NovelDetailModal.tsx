import React, { useEffect, useState } from 'react';
import { X, Play, Plus, Check, Star, Lock, Film, Share2, Heart, Eye, Calendar, Sparkles, ExternalLink } from 'lucide-react';
import { Novel, Episode } from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { fetchEpisodes, isNovelLikedLocal, toggleNovelLike } from '../services/firestoreService';
import { getSafeImageUrl, handleImageError } from '../services/driveService';

export const NovelDetailModal: React.FC = () => {
  const { 
    selectedNovelForDetail, 
    setSelectedNovelForDetail, 
    openPlayer, 
    playEpisodeInNewPage,
    toggleWatchlistState, 
    watchlist,
    progressMap,
    isEpisodeUnlocked,
    showToast,
    refreshCatalog
  } = useApp();

  const { user } = useAuth();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEps, setLoadingEps] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const novel = selectedNovelForDetail;
  const isSaved = novel ? watchlist.includes(novel.id) : false;

  useEffect(() => {
    if (!novel) return;
    setLoadingEps(true);
    setIsLiked(isNovelLikedLocal(novel.id, user?.uid));
    setLikesCount(novel.likesCount || 0);

    fetchEpisodes(novel.id).then((eps) => {
      setEpisodes(eps);
      setLoadingEps(false);
    });
  }, [novel, user]);

  if (!novel) return null;

  const currentProg = progressMap[novel.id];

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: novel.title,
        text: novel.synopsis,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast('Enlace de la novela copiado al portapapeles');
    }
  };

  const handleToggleNovelLike = async () => {
    try {
      const res = await toggleNovelLike(novel.id, user?.uid);
      setIsLiked(res.isLiked);
      setLikesCount(res.newCount);
      if (res.isLiked) {
        showToast('¡Te gusta esta novela!');
      }
      refreshCatalog();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] bg-[#101935] rounded-3xl border border-[#1E3A8A] shadow-2xl flex flex-col overflow-hidden text-[#F7F7FA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setSelectedNovelForDetail(null)}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center transition-colors border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header / Backdrop */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden shrink-0">
          <img
            src={getSafeImageUrl(novel.bannerUrl || novel.coverUrl)}
            alt={novel.title}
            className="w-full h-full object-cover filter brightness-[0.7]"
            onError={(e) => handleImageError(e, novel.bannerUrl || novel.coverUrl)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101935] via-[#101935]/40 to-transparent" />

          {/* Quick info over backdrop */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#2563EB] text-white shadow-sm">
                  {novel.status === 'airing' ? 'En emisión' : novel.status === 'completed' ? 'Completa' : 'Próxima'}
                </span>
                
                {novel.releaseYear && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[#38BDF8] border border-[#38BDF8]/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Año {novel.releaseYear}
                  </span>
                )}

                <div className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-300 border border-white/10">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{(novel.rating || 5.0).toFixed(1)}</span>
                </div>
              </div>

              <h2 className="text-xl sm:text-3xl font-black text-[#F7F7FA] tracking-tight drop-shadow-md">
                {novel.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Main Action Bar & Professional Counters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/50">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => playEpisodeInNewPage(novel, episodes[0])}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                title="Reproducir capítulo en otra página (100% sin bloqueos de navegador)"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{currentProg ? `Continuar Cap. ${currentProg.episodeNumber}` : 'Reproducir en otra página'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-90 ml-0.5" />
              </button>

              <button
                onClick={() => openPlayer(novel)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#A7B0C0] hover:text-white transition-all active:scale-95"
                title="Abrir reproductor y panel de comentarios en la app"
              >
                <Film className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="hidden sm:inline">Panel en App</span>
              </button>

              <button
                onClick={() => toggleWatchlistState(novel.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                  isSaved 
                    ? 'bg-[#2563EB]/20 border-[#38BDF8] text-white' 
                    : 'bg-white/5 border-white/10 hover:border-white/20 text-[#F7F7FA]'
                }`}
              >
                {isSaved ? <Check className="w-4 h-4 text-[#2ECC8F]" /> : <Plus className="w-4 h-4" />}
                {isSaved ? 'En mi lista' : 'Mi lista'}
              </button>

              {/* Interactive Novel Like Button */}
              <button
                onClick={handleToggleNovelLike}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all active:scale-95 ${
                  isLiked
                    ? 'bg-[#FF5A5F]/20 border-[#FF5A5F] text-[#FF5A5F]'
                    : 'bg-white/5 border-white/10 hover:border-white/20 text-[#A7B0C0] hover:text-white'
                }`}
                title="Me gusta esta novela"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-[#FF5A5F]' : ''}`} />
                <span>{likesCount}</span>
              </button>

              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#A7B0C0] hover:text-[#F7F7FA] transition-colors"
                title="Compartir"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Counters (Professional Streaming Stats) */}
            <div className="flex items-center gap-3 text-xs font-semibold text-[#A7B0C0] shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
              <div className="flex items-center gap-1 text-[#38BDF8]">
                <Eye className="w-4 h-4" />
                <span>{novel.views.toLocaleString()} vistas</span>
              </div>
              <span className="text-white/20">•</span>
              <div className="flex items-center gap-1 text-[#FF5A5F]">
                <Heart className="w-4 h-4 fill-current" />
                <span>{likesCount.toLocaleString()} Me gusta</span>
              </div>
            </div>
          </div>

          {/* Genre & Tag Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {(novel.genres || []).map(g => (
              <span key={g} className="text-xs px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[#38BDF8] font-semibold">
                {g}
              </span>
            ))}
            {(novel.tags || []).map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#A7B0C0]">
                #{t}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A7B0C0] mb-1.5">
              Sinopsis de la historia
            </h3>
            <p className="text-sm text-[#F7F7FA]/90 leading-relaxed bg-[#080D1A]/50 p-4 rounded-2xl border border-white/5">
              {novel.synopsis}
            </p>
          </div>

          {/* Episodes List */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-sm font-bold text-[#F7F7FA]">
                  Capítulos disponibles ({episodes.length})
                </h3>
              </div>
              <span className="text-xs text-[#A7B0C0]">Formato vertical 9:16</span>
            </div>

            {loadingEps ? (
              <div className="py-8 text-center text-xs text-[#A7B0C0]">Cargando capítulos...</div>
            ) : episodes.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A7B0C0] bg-[#080D1A] rounded-2xl p-4">
                No hay capítulos disponibles en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {episodes.map((ep) => {
                  const unlocked = isEpisodeUnlocked(ep);
                  return (
                    <div
                      key={ep.id}
                      onClick={() => playEpisodeInNewPage(novel, ep)}
                      className="p-2.5 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/40 hover:border-[#38BDF8]/60 cursor-pointer flex items-center justify-between gap-3 transition-all group hover:bg-[#0c142b]"
                      title="Reproducir capítulo en otra página (sin bloqueos)"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getSafeImageUrl(ep.thumbnail || novel.coverUrl)}
                          alt={ep.title}
                          className="w-10 h-14 rounded-xl object-cover bg-black border border-white/10 shrink-0"
                          onError={(e) => handleImageError(e, ep.thumbnail || novel.coverUrl)}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-[#38BDF8] truncate transition-colors">
                            Capítulo {ep.episodeNumber}: {ep.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-[#A7B0C0] mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-3 h-3 text-[#38BDF8]" />
                              {ep.views || 0}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="w-3 h-3 text-[#FF5A5F]" />
                              {ep.likesCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pr-1 flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPlayer(novel, ep);
                          }}
                          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-[#A7B0C0] hover:text-white flex items-center justify-center transition-all"
                          title="Abrir en reproductor de la app"
                        >
                          <Film className="w-3 h-3 text-[#38BDF8]" />
                        </button>

                        {unlocked ? (
                          <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform" title="Ver en otra página">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
