export interface StickerItem {
  id: string;
  packId: string;
  title: string;
  badgeText: string;
  color: string;
  accentColor: string;
  emoji?: string;
  imageUrl?: string;
  subtext?: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: StickerItem[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'animals',
    name: 'Animal Pals',
    icon: '🐱',
    stickers: [
      {
        id: 'stk_cat_hello',
        packId: 'animals',
        title: 'Kitten Hello',
        badgeText: 'HELLO!',
        color: '#f97316',
        accentColor: '#ffedd5',
        emoji: '🐱',
        subtext: 'Paws up!',
      },
      {
        id: 'stk_dog_love',
        packId: 'animals',
        title: 'Puppy Love',
        badgeText: 'LOVE YOU',
        color: '#e11d48',
        accentColor: '#ffe4e6',
        emoji: '🐶',
        subtext: 'Wagging tail',
      },
      {
        id: 'stk_panda_cool',
        packId: 'animals',
        title: 'Cool Panda',
        badgeText: 'STAY COOL',
        color: '#0284c7',
        accentColor: '#e0f2fe',
        emoji: '🐼',
        subtext: 'No worries',
      },
      {
        id: 'stk_fox_party',
        packId: 'animals',
        title: 'Party Fox',
        badgeText: 'YAY!',
        color: '#d97706',
        accentColor: '#fef3c7',
        emoji: '🦊',
        subtext: 'Celebrate!',
      },
      {
        id: 'stk_bunny_hug',
        packId: 'animals',
        title: 'Bunny Hug',
        badgeText: 'BIG HUG',
        color: '#ec4899',
        accentColor: '#fce7f3',
        emoji: '🐰',
        subtext: 'Sending warmth',
      },
      {
        id: 'stk_bear_coffee',
        packId: 'animals',
        title: 'Bear Coffee',
        badgeText: 'NEED COFFEE',
        color: '#78350f',
        accentColor: '#fef3c7',
        emoji: '🐻',
        subtext: 'First things first',
      },
      {
        id: 'stk_koala_sleep',
        packId: 'animals',
        title: 'Sleepy Koala',
        badgeText: 'GOOD NIGHT',
        color: '#4f46e5',
        accentColor: '#e0e7ff',
        emoji: '🐨',
        subtext: 'Sweet dreams',
      },
      {
        id: 'stk_duck_ok',
        packId: 'animals',
        title: 'Approved Duck',
        badgeText: 'APPROVED!',
        color: '#16a34a',
        accentColor: '#dcfce7',
        emoji: '🦆',
        subtext: 'Quack yes!',
      },
    ],
  },
  {
    id: 'reactions',
    name: 'Super Reactions',
    icon: '🔥',
    stickers: [
      {
        id: 'stk_react_fire',
        packId: 'reactions',
        title: 'Lit Fire',
        badgeText: 'LIT & FIRE',
        color: '#ea580c',
        accentColor: '#ffedd5',
        emoji: '🔥',
        subtext: 'Super hot!',
      },
      {
        id: 'stk_react_100',
        packId: 'reactions',
        title: '100 Percent',
        badgeText: '100% FACT',
        color: '#dc2626',
        accentColor: '#fee2e2',
        emoji: '💯',
        subtext: 'Totally agree',
      },
      {
        id: 'stk_react_mindblown',
        packId: 'reactions',
        title: 'Mind Blown',
        badgeText: 'MIND BLOWN!',
        color: '#7c3aed',
        accentColor: '#ede9fe',
        emoji: '🤯',
        subtext: 'Unbelievable',
      },
      {
        id: 'stk_react_party',
        packId: 'reactions',
        title: 'Tada Party',
        badgeText: 'LET\'S PARTY',
        color: '#059669',
        accentColor: '#d1fae5',
        emoji: '🎉',
        subtext: 'Celebrate now',
      },
      {
        id: 'stk_react_star',
        packId: 'reactions',
        title: 'Super Star',
        badgeText: 'YOU ROCK!',
        color: '#ca8a04',
        accentColor: '#fef9c3',
        emoji: '⭐',
        subtext: 'Golden work',
      },
      {
        id: 'stk_react_rocket',
        packId: 'reactions',
        title: 'Rocket Launch',
        badgeText: 'TO THE MOON',
        color: '#2563eb',
        accentColor: '#dbeafe',
        emoji: '🚀',
        subtext: 'Speed mode',
      },
      {
        id: 'stk_react_clap',
        packId: 'reactions',
        title: 'Bravo Clap',
        badgeText: 'BRAVO!',
        color: '#0891b2',
        accentColor: '#cffafe',
        emoji: '👏',
        subtext: 'Standing ovation',
      },
      {
        id: 'stk_react_heart',
        packId: 'reactions',
        title: 'Sparkle Heart',
        badgeText: 'SO MUCH LOVE',
        color: '#db2777',
        accentColor: '#fce7f3',
        emoji: '💖',
        subtext: 'Grateful',
      },
    ],
  },
  {
    id: 'daily',
    name: 'Daily Talk',
    icon: '💬',
    stickers: [
      {
        id: 'stk_daily_gm',
        packId: 'daily',
        title: 'Good Morning',
        badgeText: 'GOOD MORNING',
        color: '#eab308',
        accentColor: '#fef9c3',
        emoji: '☀️',
        subtext: 'Have a great day',
      },
      {
        id: 'stk_daily_gn',
        packId: 'daily',
        title: 'Good Night',
        badgeText: 'SLEEP TIGHT',
        color: '#312e81',
        accentColor: '#e0e7ff',
        emoji: '🌙',
        subtext: 'Catch you tomorrow',
      },
      {
        id: 'stk_daily_thanks',
        packId: 'daily',
        title: 'Thank You',
        badgeText: 'THANK YOU!',
        color: '#0d9488',
        accentColor: '#ccfbf1',
        emoji: '🙏',
        subtext: 'Appreciate it',
      },
      {
        id: 'stk_daily_omw',
        packId: 'daily',
        title: 'On My Way',
        badgeText: 'ON MY WAY!',
        color: '#0284c7',
        accentColor: '#e0f2fe',
        emoji: '🛵',
        subtext: 'Arriving soon',
      },
      {
        id: 'stk_daily_brb',
        packId: 'daily',
        title: 'BRB Soon',
        badgeText: 'BRB IN 5',
        color: '#9333ea',
        accentColor: '#f3e8ff',
        emoji: '⏳',
        subtext: 'Step away',
      },
      {
        id: 'stk_daily_lol',
        packId: 'daily',
        title: 'LOL Haha',
        badgeText: 'HAHA ROFL',
        color: '#ea580c',
        accentColor: '#ffedd5',
        emoji: '😂',
        subtext: 'Can\'t breathe',
      },
      {
        id: 'stk_daily_work',
        packId: 'daily',
        title: 'Busy Working',
        badgeText: 'IN THE ZONE',
        color: '#475569',
        accentColor: '#f1f5f9',
        emoji: '💻',
        subtext: 'Focus time',
      },
      {
        id: 'stk_daily_yes',
        packId: 'daily',
        title: 'Super Yes',
        badgeText: 'ABSOLUTELY YES',
        color: '#15803d',
        accentColor: '#dcfce7',
        emoji: '✨',
        subtext: 'Let\'s do this',
      },
    ],
  },
];

import { api } from '../services/api';

// Default starter custom stickers seeded in MongoDB Atlas
export const DEFAULT_CUSTOM_STICKERS: StickerItem[] = [
  {
    id: 'custom_default_star',
    packId: 'custom',
    title: 'Super Star',
    badgeText: 'YOU ROCK!',
    color: '#059669',
    accentColor: '#d1fae5',
    emoji: '⭐',
    subtext: 'Custom made',
  },
  {
    id: 'custom_default_fire',
    packId: 'custom',
    title: 'On Fire',
    badgeText: 'LIT!',
    color: '#ea580c',
    accentColor: '#ffedd5',
    emoji: '🔥',
    subtext: 'Custom made',
  },
];

// In-memory runtime cache for custom stickers synced with MongoDB Atlas
let customStickersCache: StickerItem[] = [...DEFAULT_CUSTOM_STICKERS];
let hasFetchedFromDb = false;

/**
 * Loads custom stickers directly from MongoDB Atlas.
 */
export async function fetchCustomStickersFromDb(): Promise<StickerItem[]> {
  try {
    const res = await api.get('/stickers');
    if (res.data?.success && Array.isArray(res.data?.data)) {
      if (res.data.data.length > 0) {
        customStickersCache = res.data.data;
      }
      hasFetchedFromDb = true;
      return customStickersCache;
    }
  } catch (err) {
    console.warn('[Stickers] Failed to fetch from MongoDB Atlas:', err);
  }
  return customStickersCache;
}

/**
 * Returns current custom stickers from memory.
 * Triggers background fetch from MongoDB Atlas if not yet retrieved.
 */
export function getCustomStickers(): StickerItem[] {
  if (!hasFetchedFromDb && typeof window !== 'undefined') {
    fetchCustomStickersFromDb().catch(() => {});
  }
  return customStickersCache;
}

/**
 * Saves custom sticker into MongoDB Atlas and updates memory cache.
 */
export async function saveCustomSticker(sticker: StickerItem): Promise<void> {
  const filtered = customStickersCache.filter((s) => s.id !== sticker.id);
  customStickersCache = [sticker, ...filtered];

  try {
    await api.post('/stickers', sticker);
  } catch (err) {
    console.warn('[Stickers] Failed to save to MongoDB Atlas:', err);
  }
}

/**
 * Deletes custom sticker from MongoDB Atlas and updates memory cache.
 */
export async function deleteCustomSticker(stickerId: string): Promise<void> {
  customStickersCache = customStickersCache.filter((s) => s.id !== stickerId);

  try {
    await api.delete(`/stickers/${stickerId}`);
  } catch (err) {
    console.warn('[Stickers] Failed to delete from MongoDB Atlas:', err);
  }
}

// Helper to find a sticker by its unique ID (searches built-in packs and user-created stickers)
export function getStickerById(id: string): StickerItem | undefined {
  // 1. Check built-in sticker packs
  for (const pack of STICKER_PACKS) {
    const found = pack.stickers.find((s) => s.id === id);
    if (found) return found;
  }
  // 2. Check local custom stickers
  try {
    const custom = getCustomStickers();
    const foundCustom = custom.find((s) => s.id === id);
    if (foundCustom) return foundCustom;
  } catch {
    // ignore
  }
  return undefined;
}

// Prefix format for sticker messages: [sticker:stk_cat_hello] or [custom_sticker:BASE64]
export function encodeSticker(stickerId: string, stickerItem?: StickerItem): string {
  // If it's a custom sticker or we have the item with packId === 'custom', encode its payload
  // so any recipient in the conversation can view and render it without needing local storage
  if (stickerItem && (stickerItem.packId === 'custom' || stickerId.startsWith('custom_'))) {
    try {
      const jsonStr = JSON.stringify({
        id: stickerItem.id,
        packId: 'custom',
        title: stickerItem.title,
        badgeText: stickerItem.badgeText,
        color: stickerItem.color,
        accentColor: stickerItem.accentColor,
        emoji: stickerItem.emoji,
        imageUrl: stickerItem.imageUrl,
        subtext: stickerItem.subtext,
      });
      const encoded = btoa(encodeURIComponent(jsonStr));
      return `[custom_sticker:${encoded}]`;
    } catch {
      return `[sticker:${stickerId}]`;
    }
  }
  return `[sticker:${stickerId}]`;
}

export function parseSticker(content: string): StickerItem | null {
  if (!content) return null;

  // Check if it's a custom sticker message with encoded payload
  if (content.startsWith('[custom_sticker:') && content.endsWith(']')) {
    try {
      const base64Data = content.slice(16, -1);
      const jsonStr = decodeURIComponent(atob(base64Data));
      const parsed = JSON.parse(jsonStr);
      if (parsed && (parsed.emoji || parsed.imageUrl) && parsed.badgeText) {
        return parsed as StickerItem;
      }
    } catch (e) {
      console.warn('Failed to parse custom sticker payload', e);
    }
  }

  const match = content.match(/^\[sticker:([a-zA-Z0-9_-]+)\]$/);
  if (!match) return null;
  const stickerId = match[1];
  return getStickerById(stickerId) || null;
}
