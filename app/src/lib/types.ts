// Shared DTO types (client + server). Server functions return these flat,
// fully-typed shapes — never raw D1 rows.

export interface Instrument {
  id: number;
  name: string;
  slug: string;
  emoji: string;
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  avatarHue: number;
}

export interface UserInstrument extends Instrument {
  skill: number; // 1 Beginner .. 4 Pro
}

export interface SongStat {
  id: number;
  title: string;
  artist: string;
  genre: string;
  year: number | null;
  hue: number;
  artworkUrl: string; // real album art ("" → fall back to the gradient)
  previewUrl: string; // 30s preview ("" → none)
  players: number;
  avgDifficulty: number | null; // 1..5 aggregate, null if never rated
}

// A search hit from the external music catalog (not yet in our DB).
export interface CatalogTrack {
  externalId: string;
  title: string;
  artist: string;
  genre: string;
  year: number | null;
  artworkUrl: string;
  previewUrl: string;
  hue: number; // deterministic fallback colour
  // annotations from our own DB, when the song already exists here:
  songId: number | null;
  players: number;
  avgDifficulty: number | null;
  inLibrary: boolean;
}

export interface MySong {
  userSongId: number;
  song: SongStat;
  instrument: Instrument;
  difficulty: number; // this user's rating 1..5
  note: string;
}

export interface ProfilePublic {
  user: {
    id: number;
    username: string;
    displayName: string;
    bio: string;
    avatarHue: number;
    isSeed: boolean;
  };
  instruments: UserInstrument[];
  songs: MySong[];
  stats: { songCount: number; instrumentCount: number; avgDifficulty: number | null };
  isMe: boolean;
}

export interface Recommendation {
  song: SongStat;
  reason: string;
  score: number;
  sharedWith: number; // similar musicians who play it
  matchingInstruments: Instrument[]; // instruments you play that fit this song
}

export interface SongPlayer {
  username: string;
  displayName: string;
  avatarHue: number;
  instrument: Instrument;
  difficulty: number;
  note: string;
}

export interface SongDetail {
  song: SongStat;
  players: SongPlayer[];
  byInstrument: { instrument: Instrument; avgDifficulty: number; players: number }[];
  mine: MySong[];
}

export interface SearchSong extends SongStat {
  inLibrary: boolean;
}

/* ── Technique tags, reputation, comments ─────────────────────────────── */

export interface TechniqueTag {
  id: number;
  name: string;
  slug: string;
}

export interface AnnotationAuthor {
  username: string;
  displayName: string;
  avatarHue: number;
  reputation: number;
  isModerator: boolean;
}

export interface SongAnnotation {
  author: AnnotationAuthor;
  note: string;
  tags: TechniqueTag[];
  likes: number;
  dislikes: number;
  myVote: number; // -1 | 0 | 1
  netNegative: boolean; // dislikes > likes → unlocked for rewrite
  mine: boolean; // the viewer authored this
  updatedAt: string;
}

export interface ViewerMeta {
  userId: number;
  reputation: number;
  isModerator: boolean; // rep >= MOD threshold
  banned: boolean;
}

// Everything the song page needs for the techniques panel.
export interface SongExtras {
  annotation: SongAnnotation | null;
  vocabulary: TechniqueTag[];
  canEdit: boolean; // can the viewer create/rewrite the annotation right now
  viewer: ViewerMeta;
}

export interface Comment {
  id: number;
  username: string;
  displayName: string;
  avatarHue: number;
  reputation: number;
  body: string;
  createdAt: string;
  canDelete: boolean;
}
