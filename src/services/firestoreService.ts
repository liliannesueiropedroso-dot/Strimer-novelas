import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Novel, Episode, Comment, UserProgress, AdConfig, AuditLog, UnlockedEpisode } from '../types';
import { INITIAL_NOVELS, INITIAL_EPISODES, INITIAL_AD_CONFIG } from '../data/initialNovels';

// Local storage keys for resilient offline and instant playback resume
const LS_PROGRESS_KEY = 'novelastream_progress';
const LS_WATCHLIST_KEY = 'novelastream_watchlist';
const LS_UNLOCKED_KEY = 'novelastream_unlocked';
const LS_LOCAL_NOVELS = 'novelastream_novels';
const LS_LOCAL_EPISODES = 'novelastream_episodes';
const LS_AD_CONFIG = 'novelastream_ad_config';

const MOCK_IDS = [
  'heredero-multimillonario',
  'venganza-esposa-secreta',
  'amor-ceo-frio',
  'reina-de-la-mafia',
  'matrimonio-por-sorpresa',
  'segunda-oportunidad-luna',
];

// Initialize local defaults - filters out any old mock artifacts
export function getStoredNovels(): Novel[] {
  try {
    const raw = localStorage.getItem(LS_LOCAL_NOVELS);
    if (raw) {
      const parsed: Novel[] = JSON.parse(raw);
      const cleaned = parsed.filter(n => !MOCK_IDS.includes(n.id));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(LS_LOCAL_NOVELS, JSON.stringify(cleaned));
      }
      return cleaned;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveStoredNovels(novels: Novel[]) {
  try {
    const cleaned = novels.filter(n => !MOCK_IDS.includes(n.id));
    localStorage.setItem(LS_LOCAL_NOVELS, JSON.stringify(cleaned));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredEpisodes(novelId: string): Episode[] {
  try {
    const raw = localStorage.getItem(`${LS_LOCAL_EPISODES}_${novelId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveStoredEpisodes(novelId: string, episodes: Episode[]) {
  try {
    localStorage.setItem(`${LS_LOCAL_EPISODES}_${novelId}`, JSON.stringify(episodes));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Real-time listener for all novels in Firestore
 */
export function subscribeNovels(onUpdate: (novels: Novel[]) => void) {
  try {
    const novelsCol = collection(db, 'novels');
    return onSnapshot(novelsCol, (snapshot) => {
      const list: Novel[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Novel);
      });
      list.sort((a, b) => (a.order || 99) - (b.order || 99));
      saveStoredNovels(list);
      onUpdate(list);
    }, (error) => {
      console.warn('Real-time novels listener warning:', error);
      onUpdate(getStoredNovels());
    });
  } catch (err) {
    console.warn('subscribeNovels fallback:', err);
    onUpdate(getStoredNovels());
    return () => {};
  }
}

/**
 * Fetch all novels (merging Firestore with baseline)
 */
export async function fetchNovels(): Promise<Novel[]> {
  try {
    const novelsCol = collection(db, 'novels');
    const snapshot = await getDocs(novelsCol);
    if (!snapshot.empty) {
      const list: Novel[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Novel);
      });
      list.sort((a, b) => (a.order || 99) - (b.order || 99));
      saveStoredNovels(list);
      return list;
    } else {
      // Empty in Firestore
      saveStoredNovels([]);
      return [];
    }
  } catch (error) {
    console.warn('Firestore fetchNovels fallback to local:', error);
  }
  return getStoredNovels();
}

/**
 * Real-time listener for episodes of a specific novel
 */
export function subscribeEpisodes(novelId: string, onUpdate: (episodes: Episode[]) => void) {
  try {
    const episodesCol = collection(db, 'novels', novelId, 'episodes');
    const q = query(episodesCol, orderBy('episodeNumber', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const list: Episode[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Episode);
      });
      saveStoredEpisodes(novelId, list);
      onUpdate(list);
    }, (error) => {
      console.warn(`Real-time episodes listener warning for ${novelId}:`, error);
      onUpdate(getStoredEpisodes(novelId));
    });
  } catch (err) {
    onUpdate(getStoredEpisodes(novelId));
    return () => {};
  }
}

/**
 * Fetch episodes for a novel
 */
export async function fetchEpisodes(novelId: string): Promise<Episode[]> {
  try {
    const episodesCol = collection(db, 'novels', novelId, 'episodes');
    const q = query(episodesCol, orderBy('episodeNumber', 'asc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list: Episode[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Episode);
      });
      saveStoredEpisodes(novelId, list);
      return list;
    }
  } catch (error) {
    console.warn(`Firestore fetchEpisodes fallback for ${novelId}:`, error);
  }
  return getStoredEpisodes(novelId);
}

/**
 * Save or update a novel (Admin)
 */
export async function upsertNovel(novel: Novel): Promise<void> {
  const path = `novels/${novel.id}`;
  try {
    const novelRef = doc(db, 'novels', novel.id);
    await setDoc(novelRef, {
      title: novel.title,
      synopsis: novel.synopsis,
      coverUrl: novel.coverUrl,
      bannerUrl: novel.bannerUrl,
      status: novel.status,
      genres: novel.genres || [],
      tags: novel.tags || [],
      episodeCount: novel.episodeCount || 0,
      views: novel.views || 0,
      likesCount: novel.likesCount || 0,
      releaseYear: novel.releaseYear || new Date().getFullYear(),
      rating: novel.rating || 5.0,
      isFeatured: !!novel.isFeatured,
      isNew: !!novel.isNew,
      isExclusive: !!novel.isExclusive,
      order: novel.order || 1,
      createdAt: novel.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Update local cache
    const current = getStoredNovels();
    const idx = current.findIndex(n => n.id === novel.id);
    if (idx >= 0) {
      current[idx] = novel;
    } else {
      current.push(novel);
    }
    saveStoredNovels(current);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a novel (Admin)
 */
export async function deleteNovel(novelId: string): Promise<void> {
  const path = `novels/${novelId}`;
  try {
    await deleteDoc(doc(db, 'novels', novelId));
    const current = getStoredNovels().filter(n => n.id !== novelId);
    saveStoredNovels(current);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save or update an episode (Admin)
 */
export async function upsertEpisode(novelId: string, episode: Episode): Promise<void> {
  const path = `novels/${novelId}/episodes/${episode.id}`;
  try {
    const epRef = doc(db, 'novels', novelId, 'episodes', episode.id);
    await setDoc(epRef, {
      novelId,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      description: episode.description,
      videoUrl: episode.videoUrl,
      driveFileId: episode.driveFileId || '',
      thumbnail: episode.thumbnail || '',
      durationSec: episode.durationSec || 60,
      accessType: episode.accessType,
      isPublished: episode.isPublished,
      scheduledAt: episode.scheduledAt || '',
      views: episode.views || 0,
      likesCount: episode.likesCount || 0,
      commentsCount: episode.commentsCount || 0,
      createdAt: episode.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const current = getStoredEpisodes(novelId);
    const idx = current.findIndex(e => e.id === episode.id);
    if (idx >= 0) {
      current[idx] = episode;
    } else {
      current.push(episode);
    }
    saveStoredEpisodes(novelId, current);

    // Sync episodeCount on parent novel
    try {
      await updateDoc(doc(db, 'novels', novelId), {
        episodeCount: current.length,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // ignore if partial
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete an episode (Admin)
 */
export async function deleteEpisode(novelId: string, episodeId: string): Promise<void> {
  const path = `novels/${novelId}/episodes/${episodeId}`;
  try {
    await deleteDoc(doc(db, 'novels', novelId, 'episodes', episodeId));
    const current = getStoredEpisodes(novelId).filter(e => e.id !== episodeId);
    saveStoredEpisodes(novelId, current);

    // Sync episodeCount on parent novel
    try {
      await updateDoc(doc(db, 'novels', novelId), {
        episodeCount: Math.max(0, current.length),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Watchlist Management
 */
export function getLocalWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(LS_WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleWatchlist(userId: string | null, novelId: string): Promise<boolean> {
  const current = getLocalWatchlist();
  const exists = current.includes(novelId);
  const updated = exists ? current.filter(id => id !== novelId) : [...current, novelId];
  localStorage.setItem(LS_WATCHLIST_KEY, JSON.stringify(updated));

  if (userId) {
    const path = `users/${userId}/watchlist/${novelId}`;
    try {
      const ref = doc(db, 'users', userId, 'watchlist', novelId);
      if (exists) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          userId,
          novelId,
          addedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('Watchlist sync error:', error);
    }
  }

  return !exists;
}

/**
 * Continue Watching / User Progress
 */
export function getLocalProgress(): Record<string, UserProgress> {
  try {
    const raw = localStorage.getItem(LS_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveProgress(
  userId: string | null,
  novelId: string,
  episodeId: string,
  episodeNumber: number,
  progressSeconds: number,
  totalDurationSeconds: number
): Promise<void> {
  const completed = progressSeconds >= totalDurationSeconds * 0.9;
  const progressObj: UserProgress = {
    userId: userId || 'anonymous',
    novelId,
    episodeId,
    episodeNumber,
    progressSeconds: Math.floor(progressSeconds),
    totalDurationSeconds: Math.floor(totalDurationSeconds),
    completed,
    lastWatchedAt: new Date().toISOString(),
  };

  // Local storage backup
  const all = getLocalProgress();
  all[novelId] = progressObj;
  localStorage.setItem(LS_PROGRESS_KEY, JSON.stringify(all));

  // Firestore sync if signed in
  if (userId) {
    const path = `users/${userId}/progress/${novelId}`;
    try {
      await setDoc(doc(db, 'users', userId, 'progress', novelId), progressObj, { merge: true });
    } catch (error) {
      console.warn('Progress sync error:', error);
    }
  }
}

/**
 * Unlocked Episodes (via Rewarded Ad or VIP)
 */
export function isEpisodeUnlockedLocal(userId: string | null, novelId: string, episodeId: string): boolean {
  try {
    const raw = localStorage.getItem(LS_UNLOCKED_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return !!map[`${novelId}_${episodeId}`];
  } catch {
    return false;
  }
}

export async function unlockEpisode(
  userId: string | null,
  novelId: string,
  episodeId: string,
  unlockedVia: 'reward_ad' | 'vip' | 'free_trial' = 'reward_ad'
): Promise<void> {
  const raw = localStorage.getItem(LS_UNLOCKED_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[`${novelId}_${episodeId}`] = true;
  localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(map));

  if (userId) {
    const unlockedId = `${novelId}_${episodeId}`;
    const path = `users/${userId}/unlockedEpisodes/${unlockedId}`;
    try {
      const payload: UnlockedEpisode = {
        userId,
        novelId,
        episodeId,
        unlockedVia,
        unlockedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userId, 'unlockedEpisodes', unlockedId), payload);
    } catch (error) {
      console.warn('Unlock episode sync error:', error);
    }
  }
}

/**
 * Unlock multiple episodes at once (e.g. 1 Rewarded Ad unlocks next 3-5 chapters)
 */
export async function unlockMultipleEpisodes(
  userId: string | null,
  novelId: string,
  episodeIds: string[],
  unlockedVia: 'reward_ad' | 'vip' | 'free_trial' = 'reward_ad'
): Promise<void> {
  const raw = localStorage.getItem(LS_UNLOCKED_KEY);
  const map = raw ? JSON.parse(raw) : {};
  for (const epId of episodeIds) {
    map[`${novelId}_${epId}`] = true;
  }
  localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(map));

  if (userId) {
    for (const epId of episodeIds) {
      const unlockedId = `${novelId}_${epId}`;
      try {
        const payload: UnlockedEpisode = {
          userId,
          novelId,
          episodeId: epId,
          unlockedVia,
          unlockedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', userId, 'unlockedEpisodes', unlockedId), payload);
      } catch (err) {
        console.warn('Batch unlock error:', err);
      }
    }
  }
}

/**
 * Episode Comments
 */
export function subscribeComments(
  novelId: string,
  episodeId: string,
  onUpdate: (comments: Comment[]) => void
) {
  const path = `novels/${novelId}/episodes/${episodeId}/comments`;
  try {
    const commentsCol = collection(db, 'novels', novelId, 'episodes', episodeId, 'comments');
    const q = query(commentsCol, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Comment);
      });
      onUpdate(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    console.warn('Comments subscription fallback:', error);
    return () => {};
  }
}

export async function addComment(
  novelId: string,
  episodeId: string,
  userId: string,
  userDisplayName: string,
  text: string,
  userPhotoUrl?: string
): Promise<void> {
  const commentId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `novels/${novelId}/episodes/${episodeId}/comments/${commentId}`;
  try {
    const ref = doc(db, 'novels', novelId, 'episodes', episodeId, 'comments', commentId);
    await setDoc(ref, {
      userId,
      userDisplayName: userDisplayName.slice(0, 100),
      userPhotoUrl: userPhotoUrl || '',
      novelId,
      episodeId,
      text: text.trim().slice(0, 1000),
      likesCount: 0,
      isReported: false,
      isHidden: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleReportComment(novelId: string, episodeId: string, commentId: string, isReported: boolean): Promise<void> {
  const path = `novels/${novelId}/episodes/${episodeId}/comments/${commentId}`;
  try {
    const ref = doc(db, 'novels', novelId, 'episodes', episodeId, 'comments', commentId);
    await updateDoc(ref, { isReported });
  } catch (error) {
    console.warn('Error reporting comment:', error);
  }
}

export async function toggleHideComment(novelId: string, episodeId: string, commentId: string, isHidden: boolean): Promise<void> {
  const path = `novels/${novelId}/episodes/${episodeId}/comments/${commentId}`;
  try {
    const ref = doc(db, 'novels', novelId, 'episodes', episodeId, 'comments', commentId);
    await updateDoc(ref, { isHidden });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

const LS_LIKED_EPISODES = 'novelastream_liked_episodes';

export function isEpisodeLikedLocal(novelId: string, episodeId: string, userId?: string | null): boolean {
  try {
    const raw = localStorage.getItem(LS_LIKED_EPISODES);
    const map = raw ? JSON.parse(raw) : {};
    const key = `${userId || 'guest'}_${novelId}_${episodeId}`;
    return !!map[key];
  } catch {
    return false;
  }
}

export async function toggleEpisodeLike(novelId: string, episodeId: string, userId?: string | null): Promise<{ isLiked: boolean; newCount: number }> {
  const key = `${userId || 'guest'}_${novelId}_${episodeId}`;
  let currentlyLiked = false;
  let map: Record<string, boolean> = {};

  try {
    const raw = localStorage.getItem(LS_LIKED_EPISODES);
    map = raw ? JSON.parse(raw) : {};
    currentlyLiked = !!map[key];
  } catch (e) {
    console.error(e);
  }

  const newLikedState = !currentlyLiked;
  map[key] = newLikedState;
  localStorage.setItem(LS_LIKED_EPISODES, JSON.stringify(map));

  // Update in local episodes cache
  const localEps = getStoredEpisodes(novelId);
  const epIndex = localEps.findIndex(e => e.id === episodeId);
  let newCount = 0;
  if (epIndex >= 0) {
    const currCount = localEps[epIndex].likesCount || 0;
    newCount = newLikedState ? currCount + 1 : Math.max(0, currCount - 1);
    localEps[epIndex].likesCount = newCount;
    saveStoredEpisodes(novelId, localEps);
  }

  // Update in Firestore
  try {
    const epRef = doc(db, 'novels', novelId, 'episodes', episodeId);
    const snap = await getDoc(epRef);
    if (snap.exists()) {
      const data = snap.data();
      const dbCount = (data.likesCount || 0) + (newLikedState ? 1 : -1);
      newCount = Math.max(0, dbCount);
      await updateDoc(epRef, { likesCount: newCount });
    }
  } catch (err) {
    console.warn('Firestore episode like update error:', err);
  }

  return { isLiked: newLikedState, newCount };
}

const LS_LIKED_NOVELS = 'novelastream_liked_novels';

export function isNovelLikedLocal(novelId: string, userId?: string | null): boolean {
  try {
    const raw = localStorage.getItem(LS_LIKED_NOVELS);
    const map = raw ? JSON.parse(raw) : {};
    const key = `${userId || 'guest'}_${novelId}`;
    return !!map[key];
  } catch {
    return false;
  }
}

export async function toggleNovelLike(novelId: string, userId?: string | null): Promise<{ isLiked: boolean; newCount: number }> {
  const key = `${userId || 'guest'}_${novelId}`;
  let currentlyLiked = false;
  let map: Record<string, boolean> = {};

  try {
    const raw = localStorage.getItem(LS_LIKED_NOVELS);
    map = raw ? JSON.parse(raw) : {};
    currentlyLiked = !!map[key];
  } catch (e) {
    console.error(e);
  }

  const newLikedState = !currentlyLiked;
  map[key] = newLikedState;
  localStorage.setItem(LS_LIKED_NOVELS, JSON.stringify(map));

  // Update in local novels cache
  const localNovels = getStoredNovels();
  const nIndex = localNovels.findIndex(n => n.id === novelId);
  let newCount = 0;
  if (nIndex >= 0) {
    const currCount = localNovels[nIndex].likesCount || 0;
    newCount = newLikedState ? currCount + 1 : Math.max(0, currCount - 1);
    localNovels[nIndex].likesCount = newCount;
    saveStoredNovels(localNovels);
  }

  // Update in Firestore
  try {
    const novelRef = doc(db, 'novels', novelId);
    const snap = await getDoc(novelRef);
    if (snap.exists()) {
      const data = snap.data();
      const dbCount = (data.likesCount || 0) + (newLikedState ? 1 : -1);
      newCount = Math.max(0, dbCount);
      await updateDoc(novelRef, { likesCount: newCount });
    }
  } catch (err) {
    console.warn('Firestore novel like update error:', err);
  }

  return { isLiked: newLikedState, newCount };
}

/**
 * Increment view count for a novel
 */
export async function incrementNovelViews(novelId: string): Promise<void> {
  // Update local cache
  const localNovels = getStoredNovels();
  const nIndex = localNovels.findIndex(n => n.id === novelId);
  if (nIndex >= 0) {
    localNovels[nIndex].views = (localNovels[nIndex].views || 0) + 1;
    saveStoredNovels(localNovels);
  }

  // Update Firestore
  try {
    const novelRef = doc(db, 'novels', novelId);
    const snap = await getDoc(novelRef);
    if (snap.exists()) {
      const currentViews = snap.data().views || 0;
      await updateDoc(novelRef, { views: currentViews + 1 });
    }
  } catch (err) {
    console.warn('Firestore incrementNovelViews error:', err);
  }
}

/**
 * Increment view count for an episode
 */
export async function incrementEpisodeViews(novelId: string, episodeId: string): Promise<void> {
  // Update local cache
  const localEps = getStoredEpisodes(novelId);
  const epIndex = localEps.findIndex(e => e.id === episodeId);
  if (epIndex >= 0) {
    localEps[epIndex].views = (localEps[epIndex].views || 0) + 1;
    saveStoredEpisodes(novelId, localEps);
  }

  // Update Firestore
  try {
    const epRef = doc(db, 'novels', novelId, 'episodes', episodeId);
    const snap = await getDoc(epRef);
    if (snap.exists()) {
      const currentViews = snap.data().views || 0;
      await updateDoc(epRef, { views: currentViews + 1 });
    }
  } catch (err) {
    console.warn('Firestore incrementEpisodeViews error:', err);
  }
}

/**
 * Ad Configuration & Audit Logs
 */
export async function getAdConfig(): Promise<AdConfig> {
  try {
    const snap = await getDoc(doc(db, 'config', 'ads'));
    if (snap.exists()) {
      return snap.data() as AdConfig;
    }
  } catch (error) {
    console.warn('AdConfig fetch fallback:', error);
  }
  const local = localStorage.getItem(LS_AD_CONFIG);
  return local ? JSON.parse(local) : INITIAL_AD_CONFIG;
}

export async function saveAdConfig(config: AdConfig, userId: string, userEmail: string): Promise<void> {
  const path = 'config/ads';
  localStorage.setItem(LS_AD_CONFIG, JSON.stringify(config));
  try {
    await setDoc(doc(db, 'config', 'ads'), {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
    });
    await logAdminAction('UPDATE_AD_CONFIG', `Actualizada frecuencia a cada ${config.interstitialFrequency} caps`, userId, userEmail);
  } catch (error) {
    console.warn('Failed saving ad config to firestore:', error);
  }
}

export async function logAdminAction(action: string, details: string, userId: string, userEmail: string): Promise<void> {
  const logId = `log_${Date.now()}`;
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      action,
      details,
      userId,
      userEmail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to write audit log:', error);
  }
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const col = collection(db, 'auditLogs');
    const q = query(col, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const logs: AuditLog[] = [];
    snap.forEach(d => logs.push({ id: d.id, ...d.data() } as AuditLog));
    return logs;
  } catch (e) {
    return [];
  }
}
