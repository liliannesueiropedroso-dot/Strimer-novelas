import { Novel, Episode, AdConfig } from '../types';

export const INITIAL_AD_CONFIG: AdConfig = {
  interstitialFrequency: 3,
  bannersEnabled: false, // middle banner disabled
  rewardedAdsEnabled: true,
  adsterraBannerType: 'smartlink',
  adsterraTopBannerEnabled: true,
  adsterraTopBannerUrl: 'https://www.google.com',
  adsterraTopBannerText: 'Patrocinado por Adsterra - Disfruta de todos los microdramas y novelas verticales en HD',
  adsterraBannerCode: '',
  adsterraRewardedSmartlink: '',
  chaptersUnlockedPerAd: 3, // 1 ad unlocks 3 chapters at once!
  freeChaptersCount: 2, // first 2 chapters are free
  adsterraSocialBarCode: '',
  adsterraPopunderCode: '',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

// No fictitious/mock novels. The catalog starts empty and builds dynamically in real-time from Firestore.
export const INITIAL_NOVELS: Novel[] = [];

export const INITIAL_EPISODES: Record<string, Episode[]> = {};
