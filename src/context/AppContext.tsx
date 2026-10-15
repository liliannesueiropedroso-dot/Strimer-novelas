import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Novel, Episode, UserProgress, AdConfig } from '../types';
import { 
  fetchNovels, 
  subscribeNovels,
  fetchEpisodes, 
  getLocalWatchlist, 
  toggleWatchlist, 
  getLocalProgress, 
  saveProgress, 
  isEpisodeUnlockedLocal, 
  unlockEpisode, 
  unlockMultipleEpisodes,
  getAdConfig,
  incrementNovelViews,
  incrementEpisodeViews
} from '../services/firestoreService';
import { INITIAL_AD_CONFIG } from '../data/initialNovels';
import { useAuth } from './AuthContext';
import { getStreamtapeExternalUrl } from '../services/driveService';
import confetti from 'canvas-confetti';

interface AppContextType {
  novels: Novel[];
  episodesMap: Record<string, Episode[]>;
  activeNovel: Novel | null;
  activeEpisode: Episode | null;
  isPlayerOpen: boolean;
  watchlist: string[];
  progressMap: Record<string, UserProgress>;
  adConfig: AdConfig;
  currentTab: 'home' | 'explore' | 'watchlist' | 'profile' | 'admin';
  searchFilter: string;
  selectedGenre: string;
  selectedStatus: string;
  selectedSort: string;
  isAdModalOpen: boolean;
  adModalType: 'interstitial' | 'reward' | null;
  pendingRewardEpisode: Episode | null;
  selectedNovelForDetail: Novel | null;
  
  // Actions
  setCurrentTab: (tab: 'home' | 'explore' | 'watchlist' | 'profile' | 'admin') => void;
  setSearchFilter: (term: string) => void;
  setSelectedGenre: (genre: string) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedSort: (sort: string) => void;
  setSelectedNovelForDetail: (novel: Novel | null) => void;
  
  openPlayer: (novel: Novel, episode?: Episode) => Promise<void>;
  playEpisodeInNewPage: (novel: Novel, episode?: Episode) => Promise<void>;
  closePlayer: () => void;
  goToNextEpisode: () => void;
  goToPrevEpisode: () => void;
  selectEpisodeInPlayer: (episode: Episode) => void;
  updateUserProgress: (progressSec: number, totalDurationSec: number) => void;
  toggleWatchlistState: (novelId: string) => Promise<void>;
  isEpisodeUnlocked: (episode: Episode) => boolean;
  requestUnlockRewardedAd: (episode: Episode) => void;
  completeRewardedAdUnlock: () => Promise<void>;
  closeAdModal: () => void;
  refreshCatalog: () => Promise<void>;
  showToast: (msg: string) => void;
  toastMessage: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [episodesMap, setEpisodesMap] = useState<Record<string, Episode[]>>({});
  const [activeNovel, setActiveNovel] = useState<Novel | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedNovelForDetail, setSelectedNovelForDetail] = useState<Novel | null>(null);

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [adConfig, setAdConfig] = useState<AdConfig>(INITIAL_AD_CONFIG);
  
  const [currentTab, setCurrentTab] = useState<'home' | 'explore' | 'watchlist' | 'profile' | 'admin'>('home');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');

  // Ad triggers & interstitial count tracking
  const [episodesWatchedCount, setEpisodesWatchedCount] = useState(0);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [adModalType, setAdModalType] = useState<'interstitial' | 'reward' | null>(null);
  const [pendingRewardEpisode, setPendingRewardEpisode] = useState<Episode | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3200);
  }, []);

  const refreshCatalog = useCallback(async () => {
    const list = await fetchNovels();
    setNovels(list);
    const config = await getAdConfig();
    setAdConfig(config);
  }, []);

  // Real-time listener on mount
  useEffect(() => {
    const unsubscribe = subscribeNovels((list) => {
      setNovels(list);
    });
    getAdConfig().then(config => setAdConfig(config));
    setWatchlist(getLocalWatchlist());
    setProgressMap(getLocalProgress());
    return () => unsubscribe();
  }, []);

  const loadEpisodesForNovel = useCallback(async (novelId: string): Promise<Episode[]> => {
    if (episodesMap[novelId]?.length > 0) {
      return episodesMap[novelId];
    }
    const eps = await fetchEpisodes(novelId);
    setEpisodesMap(prev => ({ ...prev, [novelId]: eps }));
    return eps;
  }, [episodesMap]);

  const isEpisodeUnlocked = useCallback((episode: Episode): boolean => {
    const freeThreshold = adConfig.freeChaptersCount ?? 2;
    if (episode.episodeNumber <= freeThreshold) return true;
    if (episode.accessType === 'free') return true;
    return isEpisodeUnlockedLocal(user?.uid || null, episode.novelId, episode.id);
  }, [user, adConfig.freeChaptersCount]);

  const openPlayer = useCallback(async (novel: Novel, targetEpisode?: Episode) => {
    setActiveNovel(novel);
    setSelectedNovelForDetail(null);
    const eps = await loadEpisodesForNovel(novel.id);

    let epToPlay = targetEpisode;
    if (!epToPlay) {
      // Check saved progress
      const saved = progressMap[novel.id];
      if (saved) {
        epToPlay = eps.find(e => e.id === saved.episodeId) || eps[0];
      } else {
        epToPlay = eps[0];
      }
    }

    if (epToPlay) {
      setActiveEpisode(epToPlay);
      setIsPlayerOpen(true);
    }
  }, [loadEpisodesForNovel, progressMap]);

  const playEpisodeInNewPage = useCallback(async (novel: Novel, targetEpisode?: Episode) => {
    let epToPlay = targetEpisode;
    if (!epToPlay) {
      const eps = await loadEpisodesForNovel(novel.id);
      const saved = progressMap[novel.id];
      if (saved) {
        epToPlay = eps.find(e => e.id === saved.episodeId) || eps[0];
      } else {
        epToPlay = eps[0];
      }
    }

    if (!epToPlay) {
      showToast('No hay capítulos disponibles para reproducir');
      return;
    }

    // Determine watch URL for external playback (Streamtape, Drive, etc.)
    const watchUrl = getStreamtapeExternalUrl(epToPlay.videoUrl) || epToPlay.videoUrl;

    // Open video directly in another tab/window without iframe sandbox restrictions
    window.open(watchUrl, '_blank', 'noopener,noreferrer');

    // Register analytics & views
    incrementEpisodeViews(novel.id, epToPlay.id).catch(() => {});
    incrementNovelViews(novel.id).catch(() => {});

    // Save user progress
    saveProgress(
      user?.uid || null,
      novel.id,
      epToPlay.id,
      epToPlay.episodeNumber,
      10,
      60
    );
    setProgressMap(prev => ({
      ...prev,
      [novel.id]: {
        userId: user?.uid || 'anon',
        novelId: novel.id,
        episodeId: epToPlay!.id,
        episodeNumber: epToPlay!.episodeNumber,
        progressSeconds: 10,
        totalDurationSeconds: 60,
        completed: false,
        lastWatchedAt: new Date().toISOString(),
      },
    }));

    showToast(`▶ Abriendo Capítulo ${epToPlay.episodeNumber} en otra página (100% sin bloqueos)`);
  }, [loadEpisodesForNovel, progressMap, showToast, user]);

  const closePlayer = useCallback(() => {
    setIsPlayerOpen(false);
  }, []);

  const selectEpisodeInPlayer = useCallback((ep: Episode) => {
    setActiveEpisode(ep);
  }, []);

  const goToNextEpisode = useCallback(() => {
    if (!activeNovel || !activeEpisode) return;
    const eps = episodesMap[activeNovel.id] || [];
    const currentIndex = eps.findIndex(e => e.id === activeEpisode.id);
    if (currentIndex >= 0 && currentIndex < eps.length - 1) {
      selectEpisodeInPlayer(eps[currentIndex + 1]);
    } else {
      showToast('¡Has llegado al último capítulo disponible!');
    }
  }, [activeNovel, activeEpisode, episodesMap, selectEpisodeInPlayer, showToast]);

  const goToPrevEpisode = useCallback(() => {
    if (!activeNovel || !activeEpisode) return;
    const eps = episodesMap[activeNovel.id] || [];
    const currentIndex = eps.findIndex(e => e.id === activeEpisode.id);
    if (currentIndex > 0) {
      selectEpisodeInPlayer(eps[currentIndex - 1]);
    }
  }, [activeNovel, activeEpisode, episodesMap, selectEpisodeInPlayer]);

  const updateUserProgress = useCallback((progressSec: number, totalDurationSec: number) => {
    if (!activeNovel || !activeEpisode) return;
    saveProgress(
      user?.uid || null,
      activeNovel.id,
      activeEpisode.id,
      activeEpisode.episodeNumber,
      progressSec,
      totalDurationSec
    );
    setProgressMap(prev => ({
      ...prev,
      [activeNovel.id]: {
        userId: user?.uid || 'anon',
        novelId: activeNovel.id,
        episodeId: activeEpisode.id,
        episodeNumber: activeEpisode.episodeNumber,
        progressSeconds: Math.floor(progressSec),
        totalDurationSeconds: Math.floor(totalDurationSec),
        completed: progressSec >= totalDurationSec * 0.9,
        lastWatchedAt: new Date().toISOString(),
      },
    }));
  }, [activeNovel, activeEpisode, user]);

  const toggleWatchlistState = useCallback(async (novelId: string) => {
    const isAdded = await toggleWatchlist(user?.uid || null, novelId);
    setWatchlist(getLocalWatchlist());
    showToast(isAdded ? 'Agregado a Mi lista' : 'Eliminado de Mi lista');
  }, [user, showToast]);

  const requestUnlockRewardedAd = useCallback((episode: Episode) => {
    setPendingRewardEpisode(episode);
    setAdModalType('reward');
    setIsAdModalOpen(true);
  }, []);

  const completeRewardedAdUnlock = useCallback(async () => {
    if (!pendingRewardEpisode || !activeNovel) return;
    const eps = episodesMap[activeNovel.id] || [];
    const batchSize = Math.max(1, adConfig.chaptersUnlockedPerAd ?? 3);

    // Find starting index of pending episode
    const startIndex = eps.findIndex(e => e.id === pendingRewardEpisode.id);
    const episodesToUnlock: Episode[] = [];
    if (startIndex >= 0) {
      for (let i = startIndex; i < Math.min(eps.length, startIndex + batchSize); i++) {
        episodesToUnlock.push(eps[i]);
      }
    } else {
      episodesToUnlock.push(pendingRewardEpisode);
    }

    const idsToUnlock = episodesToUnlock.map(e => e.id);
    await unlockMultipleEpisodes(user?.uid || null, activeNovel.id, idsToUnlock, 'reward_ad');

    setIsAdModalOpen(false);
    setActiveEpisode(pendingRewardEpisode);
    setPendingRewardEpisode(null);

    try {
      confetti({
        particleCount: 90,
        spread: 65,
        origin: { y: 0.7 },
        colors: ['#2563EB', '#38BDF8', '#2ECC8F'],
      });
    } catch (e) {
      // ignore
    }

    if (episodesToUnlock.length > 1) {
      const lastEp = episodesToUnlock[episodesToUnlock.length - 1];
      showToast(`🎉 ¡Desbloqueaste ${episodesToUnlock.length} capítulos (Caps ${pendingRewardEpisode.episodeNumber} al ${lastEp.episodeNumber}) con 1 solo anuncio!`);
    } else {
      showToast(`🎉 ¡Capítulo ${pendingRewardEpisode.episodeNumber} desbloqueado!`);
    }
  }, [pendingRewardEpisode, activeNovel, episodesMap, adConfig.chaptersUnlockedPerAd, user, showToast]);

  const closeAdModal = useCallback(() => {
    setIsAdModalOpen(false);
    setPendingRewardEpisode(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        novels,
        episodesMap,
        activeNovel,
        activeEpisode,
        isPlayerOpen,
        watchlist,
        progressMap,
        adConfig,
        currentTab,
        searchFilter,
        selectedGenre,
        selectedStatus,
        selectedSort,
        isAdModalOpen,
        adModalType,
        pendingRewardEpisode,
        selectedNovelForDetail,
        setCurrentTab,
        setSearchFilter,
        setSelectedGenre,
        setSelectedStatus,
        setSelectedSort,
        setSelectedNovelForDetail,
        openPlayer,
        playEpisodeInNewPage,
        closePlayer,
        goToNextEpisode,
        goToPrevEpisode,
        selectEpisodeInPlayer,
        updateUserProgress,
        toggleWatchlistState,
        isEpisodeUnlocked,
        requestUnlockRewardedAd,
        completeRewardedAdUnlock,
        closeAdModal,
        refreshCatalog,
        showToast,
        toastMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
