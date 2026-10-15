import React, { useState, useEffect } from 'react';
import { X, Play, Sparkles, CheckCircle2, ShieldCheck, Volume2, VolumeX, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AdModal: React.FC = () => {
  const { 
    isAdModalOpen, 
    adModalType, 
    pendingRewardEpisode, 
    completeRewardedAdUnlock, 
    closeAdModal,
    adConfig
  } = useApp();

  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(15);
  const [isMuted, setIsMuted] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (!isAdModalOpen) {
      setIsPlayingAd(false);
      setSecondsRemaining(15);
      setCanSkip(false);
      return;
    }

    if (adModalType === 'interstitial') {
      // Auto-start 5s interstitial
      setIsPlayingAd(true);
      setSecondsRemaining(5);
    } else {
      // Rewarded ad waits for user click to confirm
      setIsPlayingAd(false);
      setSecondsRemaining(15);
    }
  }, [isAdModalOpen, adModalType]);

  // Countdown timer
  useEffect(() => {
    if (!isPlayingAd || secondsRemaining <= 0) {
      if (secondsRemaining <= 0) {
        setCanSkip(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlayingAd, secondsRemaining]);

  if (!isAdModalOpen) return null;

  const handleStartRewardAd = () => {
    setIsPlayingAd(true);
    setSecondsRemaining(15);
    setCanSkip(false);
  };

  const handleClaimReward = async () => {
    await completeRewardedAdUnlock();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#151C2E] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col text-[#F7F7FA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 bg-[#0B1020]/90 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {adModalType === 'reward' ? 'Anuncio Recompensado' : 'Pausa Publicitaria'}
            </span>
            <span className="text-xs text-[#A7B0C0] font-medium">Patrocinado por Azterra Media</span>
          </div>

          {(canSkip || !isPlayingAd) && (
            <button
              onClick={closeAdModal}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Area */}
        {!isPlayingAd ? (
          // Pre-Ad Prompt for Rewarded Unlock
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-[#38BDF8] text-[11px] font-bold mb-2">
                1 solo anuncio desbloquea {adConfig.chaptersUnlockedPerAd || 3} capítulos seguidos
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Desbloquea desde el Cap. {pendingRewardEpisode?.episodeNumber}
              </h3>
              <p className="text-sm font-semibold text-[#38BDF8] mt-1">
                "{pendingRewardEpisode?.title}"
              </p>
              <p className="text-xs text-[#A7B0C0] mt-2 max-w-sm mx-auto leading-relaxed">
                Mira un breve video patrocinado de Adsterra (15s) y desbloquearás en bloque los siguientes {adConfig.chaptersUnlockedPerAd || 3} capítulos de esta novela sin tener que ver otro anuncio.
              </p>
            </div>

            {/* Benefits assurance */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-[#A7B0C0] border-y border-white/5 py-3">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Desbloqueo en Bloque
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Clock className="w-3.5 h-3.5" /> 15 Segundos
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleStartRewardAd}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white font-bold text-sm shadow-xl shadow-blue-500/30 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Ver anuncio y desbloquear {adConfig.chaptersUnlockedPerAd || 3} capítulos
              </button>

              <button
                onClick={closeAdModal}
                className="w-full py-2.5 text-xs text-[#A7B0C0] hover:text-white transition-colors"
              >
                No gracias, volver a la lista
              </button>
            </div>
          </div>
        ) : (
          // Playing Ad View
          <div className="relative aspect-video w-full bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Animated Demo Sponsor Video Simulation */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#101935] via-[#080D1A] to-[#162244] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/25 border border-[#38BDF8]/40 flex items-center justify-center mb-3 animate-pulse">
                <Sparkles className="w-7 h-7 text-[#38BDF8]" />
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#38BDF8] bg-blue-500/10 px-2.5 py-0.5 rounded-full mb-1">
                Adsterra AX Terra Video Sponsor
              </span>
              <h4 className="text-base sm:text-lg font-black text-white tracking-wide">
                Adsterra Monetization Network
              </h4>
              <p className="text-xs text-[#A7B0C0] max-w-xs mt-1">
                Al finalizar el contador se desbloquearán automáticamente {adConfig.chaptersUnlockedPerAd || 3} capítulos seguidos.
              </p>
              {adConfig.adsterraRewardedSmartlink && (
                <a
                  href={adConfig.adsterraRewardedSmartlink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-[11px] text-[#38BDF8] underline font-semibold hover:text-white"
                >
                  Abrir enlace del patrocinador
                </a>
              )}
            </div>

            {/* Video HUD: Timer & Controls */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
              <div className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-bold text-white flex items-center gap-2 border border-white/10">
                {secondsRemaining > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>El video termina en {secondsRemaining}s</span>
                  </>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ¡Anuncio completado!
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full bg-black/70 text-white backdrop-blur-md border border-white/10"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Bottom Claim / Skip Button */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              {adModalType === 'reward' ? (
                canSkip ? (
                  <button
                    onClick={handleClaimReward}
                    className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 animate-bounce"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ¡Desbloquear {adConfig.chaptersUnlockedPerAd || 3} capítulos ahora!
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-center text-xs text-[#A7B0C0]">
                    Mira {secondsRemaining}s más para desbloquear los {adConfig.chaptersUnlockedPerAd || 3} capítulos
                  </div>
                )
              ) : (
                canSkip ? (
                  <button
                    onClick={closeAdModal}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-xl active:scale-95 transition-all"
                  >
                    Continuar al video
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-center text-xs text-[#A7B0C0]">
                    Puedes saltar en {secondsRemaining}s
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
