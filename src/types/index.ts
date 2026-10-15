export type NovelStatus = 'airing' | 'completed' | 'upcoming';
export type AccessType = 'free' | 'reward_ad' | 'vip';

export interface Novel {
  id: string;
  title: string;
  synopsis: string;
  coverUrl: string;
  bannerUrl: string;
  status: NovelStatus;
  genres: string[];
  tags: string[];
  episodeCount: number;
  views: number;
  likesCount?: number;
  releaseYear?: number;
  rating: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isExclusive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Episode {
  id: string;
  novelId: string;
  episodeNumber: number;
  title: string;
  description: string;
  videoUrl: string;
  driveFileId?: string;
  thumbnail?: string;
  durationSec: number;
  accessType: AccessType;
  isPublished: boolean;
  scheduledAt?: string;
  views: number;
  likesCount: number;
  commentsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoUrl?: string;
  novelId: string;
  episodeId: string;
  text: string;
  likesCount: number;
  isReported: boolean;
  isHidden: boolean;
  createdAt: string;
}

export interface UserProgress {
  userId: string;
  novelId: string;
  episodeId: string;
  episodeNumber: number;
  progressSeconds: number;
  totalDurationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface UserWatchlist {
  userId: string;
  novelId: string;
  addedAt: string;
}

export interface UnlockedEpisode {
  userId: string;
  novelId: string;
  episodeId: string;
  unlockedVia: 'reward_ad' | 'vip' | 'free_trial';
  unlockedAt: string;
}

export interface AdConfig {
  interstitialFrequency: number; // e.g. 3 = every 3 episodes
  bannersEnabled: boolean;
  rewardedAdsEnabled: boolean;
  // Adsterra (AX Terra) Integration
  adsterraBannerType?: 'code' | 'smartlink'; // Chooses between direct script/HTML code or Smartlink URL
  adsterraTopBannerEnabled?: boolean;
  adsterraTopBannerUrl?: string;
  adsterraTopBannerText?: string;
  adsterraBannerCode?: string; // Raw Adsterra JavaScript / HTML banner code snippet
  adsterraRewardedSmartlink?: string;
  chaptersUnlockedPerAd?: number; // e.g. 3 chapters unlocked per 1 ad
  freeChaptersCount?: number; // initial free chapters before ad gate (default 2)
  adsterraPopunderCode?: string; // Optional Adsterra popunder script code
  adsterraSocialBarCode?: string; // Optional Adsterra social bar script code
  updatedAt?: string;
  updatedBy?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  userId: string;
  userEmail: string;
  timestamp: string;
}

export interface DriveVideoFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
}
