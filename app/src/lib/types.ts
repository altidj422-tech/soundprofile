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
  players: number;
  avgDifficulty: number | null; // 1..5 aggregate, null if never rated
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
