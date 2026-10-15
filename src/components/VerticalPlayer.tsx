import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  List, 
  Eye, 
  ChevronRight, 
  ChevronLeft,
  Maximize2,
  Minimize2,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  formatDriveVideoUrl, 
  isStreamtapeUrl, 
  getStreamtapeExternalUrl, 
  resolveStreamtapeVideo,
  isVideoEmbed,
  getSafeImageUrl,
  handleImageError
} from '../services/driveService';
import { 
  toggleEpisodeLike, 
  isEpisodeLikedLocal,
  incrementEpisodeViews,
  incrementNovelViews 
} from '../services/firestoreService';
import { CommentsDrawer } from './CommentsDrawer';

export const VerticalPlayer: React.FC = () => {
  const {
    isPlayerOpen,
    activeNovel,
    activeEpisode,
    closePlayer,
    goToNextEpisode,
    goToPrevEpisode,
    selectEpisodeInPlayer,
    episodesMap,
    watchlist,
    toggleWatchlistState,
    showToast
  } = useApp();

  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [episodeViews, setEpisodeViews] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Direct MP4 playback & stream state (avoids browser iframe security blocking)
  const [resolvedDirectMp4, setResolvedDirectMp4] = useState<string | null>(null);
  const [resolvedPoster, setResolvedPoster] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [directVideoError, setDirectVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [forceIframeMode, setForceIframeMode] = useState(false);

  const novel = activeNovel;
  const episode = activeEpisode;
  const isSaved = novel ? watchlist.includes(novel.id) : false;
  const episodes = novel ? (episodesMap[novel.id] || []) : [];

  const rawVideoUrl = episode?.videoUrl || '';
  const isStreamtape = isStreamtapeUrl(rawVideoUrl);
  const externalWatchUrl = isStreamtape ? getStreamtapeExternalUrl(rawVideoUrl) : rawVideoUrl;
  const standardEmbedUrl = episode ? formatDriveVideoUrl(rawVideoUrl) : '';

  // Synchronize state, resolve direct MP4, and increment views on chapter change
  useEffect(() => {
    if (!episode || !novel) return;

    setLikesCount(episode.likesCount || 0);
    setEpisodeViews((episode.views || 0) + 1);
    const initialLiked = isEpisodeLikedLocal(novel.id, episode.id, user?.uid);
    setIsLiked(initialLiked);
    setDirectVideoError(false);
    setForceIframeMode(false);
    setIsPlaying(false);

    // If already a direct MP4/WebM URL, use directly
    if (/\.(mp4|webm|m4v)(\?.*)?$/i.test(rawVideoUrl)) {
      setResolvedDirectMp4(rawVideoUrl);
      setResolvedPoster(episode.thumbnail || novel.coverUrl);
      setIsResolving(false);
    } else if (isStreamtape) {
      // Resolve Streamtape into direct MP4 stream for 100% native in-app playback
      setIsResolving(true);
      resolveStreamtapeVideo(rawVideoUrl).then((result) => {
        setIsResolving(false);
        if (result.success && result.directVideoUrl) {
          setResolvedDirectMp4(result.directVideoUrl);
          if (result.posterUrl) {
            setResolvedPoster(result.posterUrl);
          }
        } else {
          // If direct MP4 extraction wasn't possible, fallback to embed
          setResolvedDirectMp4(null);
        }
      }).catch(() => {
        setIsResolving(false);
        setResolvedDirectMp4(null);
      });
    } else {
      setResolvedDirectMp4(null);
      setIsResolving(false);
    }

    // Increment views in Firestore
    incrementEpisodeViews(novel.id, episode.id);
    incrementNovelViews(novel.id);
  }, [episode?.id, novel?.id]);

  if (!isPlayerOpen || !novel || !episode) return null;

  const handleLike = async () => {
    if (!novel || !episode) return;
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 700);

    try {
      const res = await toggleEpisodeLike(novel.id, episode.id, user?.uid);
      setIsLiked(res.isLiked);
      setLikesCount(res.newCount);
      if (res.isLiked) {
        showToast('¡Te gustó este capítulo!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${novel.title} - Cap ${episode.episodeNumber}`,
        text: `¡Mira el capítulo ${episode.episodeNumber} de ${novel.title} en NovelaStream!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Enlace copiado al portapapeles');
    }
  };

  const openInNewWindow = () => {
    if (!externalWatchUrl) return;
    window.open(externalWatchUrl, '_blank', 'noopener,noreferrer');
    showToast('Abriendo video en nueva ventana');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleRetryDirect = () => {
    setDirectVideoError(false);
    setIsResolving(true);
    resolveStreamtapeVideo(rawVideoUrl).then((result) => {
      setIsResolving(false);
      if (result.success && result.directVideoUrl) {
        setResolvedDirectMp4(result.directVideoUrl);
        if (result.posterUrl) setResolvedPoster(result.posterUrl);
      }
    }).catch(() => {
      setIsResolving(false);
    });
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#060A14] flex items-center justify-center select-none overflow-hidden"
    >
      {/* Ambient background blur */}
      <div 
        className="hidden md:block absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 pointer-events-none"
        style={{ backgroundImage: `url(${getSafeImageUrl(novel.coverUrl)})` }}
      />

      {/* Main 9:16 Vertical Stage Container */}
      <div className="relative w-full h-full max-w-[460px] md:h-[96vh] md:rounded-3xl overflow-hidden bg-black shadow-2xl flex flex-col justify-between border border-[#162244]">
        
        {/* Top Header: Clean and minimal */}
        <div className="relative z-20 px-3.5 py-2.5 bg-gradient-to-b from-[#080D1A] via-[#080D1A]/90 to-transparent flex items-center justify-between shrink-0 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <button
              onClick={closePlayer}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 shrink-0"
              title="Cerrar reproductor"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-[#F7F7FA] truncate drop-shadow">
                  {novel.title}
                </h3>
                {novel.releaseYear && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-[#38BDF8] border border-blue-500/30 shrink-0">
                    {novel.releaseYear}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A7B0C0] truncate">
                Capítulo {episode.episodeNumber}: {episode.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Open in new tab button (always works 100% without iframe sandbox restrictions) */}
            <button
              onClick={openInNewWindow}
              className="px-2 py-1 rounded-full bg-blue-600/30 hover:bg-blue-600/50 text-[#38BDF8] hover:text-white border border-blue-500/40 flex items-center gap-1 text-[10px] font-bold transition-all active:scale-95 shadow-sm"
              title="Abrir video en nueva pestaña (100% funcional sin bloqueos)"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Nueva pestaña</span>
            </button>

            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all shrink-0"
              title="Compartir"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all shrink-0"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video Stage: Dual-Engine (Direct MP4 without iframe blocks, or Embed Fallback) */}
        <div className="flex-1 relative w-full h-full bg-black flex items-center justify-center overflow-hidden min-h-0">
          
          {/* Resolving indicator */}
          {isResolving && (
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Preparando reproducción directa...</p>
                <p className="text-xs text-[#A7B0C0]">
                  Evitando bloqueos de seguridad del navegador para ver el video sin problemas.
                </p>
              </div>
            </div>
          )}

          {/* ENGINE 1: NATIVE HTML5 VIDEO (Direct MP4 Stream, Zero Security/Iframe Errors) */}
          {resolvedDirectMp4 && !forceIframeMode && !directVideoError ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black group">
              <video
                ref={videoRef}
                src={resolvedDirectMp4}
                poster={getSafeImageUrl(resolvedPoster || episode.thumbnail || novel.coverUrl)}
                className="w-full h-full object-contain cursor-pointer"
                playsInline
                autoPlay
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                  console.warn('Native MP4 playback error, enabling fallback');
                  setDirectVideoError(true);
                }}
                onEnded={goToNextEpisode}
              />

              {/* Quick in-video toolbar overlay */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black/80 transition-all"
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={openInNewWindow}
                  className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-xs text-white/80 hover:text-white flex items-center gap-1"
                  title="Abrir en otra pestaña"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Otra ventana</span>
                </button>
              </div>
            </div>
          ) : forceIframeMode ? (
            /* ENGINE 2: FORCED IFRAME EMBED (Only when explicitly requested by user) */
            <div className="relative w-full h-full bg-black flex items-center justify-center">
              <iframe
                src={standardEmbedUrl}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                title={episode.title}
                onError={() => setDirectVideoError(true)}
              />

              {/* Fallback Banner if Browser Security Blocks the Iframe */}
              {directVideoError && (
                <div className="absolute inset-0 z-30 bg-[#080D1A]/95 p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-xs">
                    <h4 className="text-sm font-bold text-white">
                      Protección de iframe detectada
                    </h4>
                    <p className="text-xs text-[#A7B0C0] leading-relaxed">
                      El servidor de Streamtape restringe la inserción dentro de ventanas de desarrollo. En una pestaña nueva se reproduce de forma 100% inmediata.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
                    <button
                      onClick={openInNewWindow}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir y Ver en Nueva Pestaña</span>
                    </button>

                    <button
                      onClick={handleRetryDirect}
                      className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#38BDF8] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reintentar Extracción de Video Directo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* DEFAULT ENGINE: CHAPTER COVER STAGE & DIRECT UNBLOCKED PLAYBACK */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
              {/* Blurred atmospheric backdrop */}
              <img
                src={getSafeImageUrl(resolvedPoster || episode.thumbnail || novel.coverUrl)}
                alt={novel.title}
                className="absolute inset-0 w-full h-full object-cover filter brightness-[0.4] blur-md scale-110"
                onError={(e) => handleImageError(e, episode.thumbnail || novel.coverUrl)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080D1A] via-black/50 to-[#080D1A]/80" />

              {/* Central Floating Cover & Play Card */}
              <div className="relative z-10 flex flex-col items-center max-w-xs space-y-4">
                <div className="relative group">
                  <div className="w-44 aspect-[9/14] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
                    <img
                      src={getSafeImageUrl(resolvedPoster || episode.thumbnail || novel.coverUrl)}
                      alt={episode.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => handleImageError(e, episode.thumbnail || novel.coverUrl)}
                    />
                  </div>

                  {/* Pulsing Big Play Button Overlay */}
                  <button
                    onClick={openInNewWindow}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF5A5F] via-[#2563EB] to-[#38BDF8] text-white flex items-center justify-center shadow-2xl shadow-blue-500/50 hover:scale-110 active:scale-95 transition-all glow-coral cursor-pointer"
                    title="Reproducir capítulo en otra página (sin bloqueos)"
                  >
                    <Play className="w-8 h-8 fill-current ml-1 text-white" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-white drop-shadow">
                    Capítulo {episode.episodeNumber}: {episode.title}
                  </h3>
                  <p className="text-xs text-[#A7B0C0] line-clamp-2">
                    {novel.title}
                  </p>
                </div>

                {/* Primary Unblocked Playback Action Button */}
                <div className="w-full space-y-2 pt-1">
                  <button
                    onClick={openInNewWindow}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#1E3A8A] hover:brightness-110 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30 active:scale-95 transition-all border border-blue-400/40"
                    title="Abre el reproductor en una pestaña independiente sin bloqueos"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>▶ REPRODUCIR EN OTRA PÁGINA</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-90" />
                  </button>

                  <div className="text-[11px] text-[#A7B0C0] flex items-center justify-center gap-1">
                    <span>🛡️ 100% Funcional • Sin Bloqueos de Seguridad</span>
                  </div>

                  <button
                    onClick={() => setForceIframeMode(true)}
                    className="text-[10px] text-white/50 hover:text-white underline pt-1 transition-colors"
                  >
                    Intentar reproductor embebido aquí
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Social & Navigation Dock Below Video */}
        <div className="relative z-30 w-full bg-[#080D1A] border-t border-[#1E3A8A] px-3.5 sm:px-4 py-2.5 select-none shrink-0 space-y-2">
          
          {/* Action Buttons: Like, Comment, Watchlist, Chapters list */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            
            {/* 1. Like Button with real counter and animation */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                isLiked 
                  ? 'bg-[#FF5A5F]/20 border-[#FF5A5F] text-[#FF5A5F]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20 text-[#A7B0C0] hover:text-white'
              } ${likeAnimating ? 'scale-110' : ''}`}
              title="Me gusta este capítulo"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-[#FF5A5F]' : ''}`} />
              <span className="text-xs font-bold">{likesCount}</span>
            </button>

            {/* 2. Comments Button */}
            <button
              onClick={() => setIsCommentsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-[#A7B0C0] hover:text-white transition-all active:scale-95"
              title="Ver y publicar comentarios"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-bold">Comentarios</span>
            </button>

            {/* 3. Watchlist Bookmark Button */}
            <button
              onClick={() => toggleWatchlistState(novel.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                isSaved 
                  ? 'bg-blue-500/20 border-[#38BDF8] text-[#38BDF8]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20 text-[#A7B0C0] hover:text-white'
              }`}
              title={isSaved ? 'Guardado en Mi Lista' : 'Guardar serie'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span className="text-xs font-bold">{isSaved ? 'Guardado' : 'Guardar'}</span>
            </button>

            {/* 4. Episode Drawer Button */}
            <button
              onClick={() => setIsEpisodeDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2563EB]/20 to-[#1D4ED8]/20 border border-blue-500/30 text-[#38BDF8] hover:bg-blue-500/30 transition-all active:scale-95"
              title="Lista de todos los capítulos"
            >
              <List className="w-4 h-4" />
              <span className="text-xs font-bold">Capítulos</span>
            </button>
          </div>

          {/* Chapter Navigation & View Counter */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5 text-xs text-[#A7B0C0]">
            <div className="flex items-center gap-2 truncate">
              <button
                onClick={() => setIsEpisodeDrawerOpen(true)}
                className="font-bold text-white hover:text-[#38BDF8] transition-colors truncate"
              >
                Cap. {episode.episodeNumber} de {episodes.length}
              </button>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1 text-[11px] text-[#38BDF8]">
                <Eye className="w-3 h-3" />
                {episodeViews.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={goToPrevEpisode}
                className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold active:scale-95 transition-all"
                title="Capítulo anterior"
              >
                <ChevronLeft className="w-3 h-3" />
                Anterior
              </button>
              <button
                onClick={goToNextEpisode}
                className="flex items-center gap-0.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white text-[11px] font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                title="Siguiente capítulo"
              >
                Siguiente
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Chapters Drawer Overlay */}
        {isEpisodeDrawerOpen && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-[#101935] border-t border-[#1E3A8A] rounded-t-3xl p-4 max-h-[70%] flex flex-col animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-[#38BDF8]" />
                  <h4 className="text-sm font-bold text-white">Capítulos ({episodes.length})</h4>
                </div>
                <button
                  onClick={() => setIsEpisodeDrawerOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto divide-y divide-white/5 py-2 space-y-1">
                {episodes.map((ep) => {
                  const isCurrent = ep.id === episode.id;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => {
                        selectEpisodeInPlayer(ep);
                        setIsEpisodeDrawerOpen(false);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between text-left transition-all ${
                        isCurrent 
                          ? 'bg-blue-600/20 border border-blue-500/40 text-[#38BDF8]' 
                          : 'hover:bg-white/5 text-white/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`text-xs font-black ${isCurrent ? 'text-[#38BDF8]' : 'text-white/40'}`}>
                          #{ep.episodeNumber}
                        </span>
                        <span className="text-xs font-semibold truncate">{ep.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-[#A7B0C0]">
                        <span>❤️ {ep.likesCount || 0}</span>
                        <span>👁️ {ep.views || 0}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Real-time Comments Drawer */}
        <CommentsDrawer
          novelId={novel.id}
          episode={episode}
          isOpen={isCommentsOpen}
          onClose={() => setIsCommentsOpen(false)}
        />
      </div>
    </div>
  );
};
