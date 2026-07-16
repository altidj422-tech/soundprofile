// Client-side Apple/iTunes catalog search via JSONP.
//
// Why JSONP + client-side: the iTunes Search API rate-limits by IP and blocks
// the shared Cloudflare Worker egress IPs (429), so it can't run server-side.
// It also sends no CORS header, so a browser fetch() is blocked — but it returns
// `text/javascript`, so a <script> (JSONP) call works, runs from the user's own
// IP, and the app's CSP does not restrict script-src. Pure client module; the
// only server-safe export is `catalogKey`.

export interface ItunesTrack {
  externalId: string;
  title: string;
  artist: string;
  genre: string;
  year: number | null;
  artworkUrl: string;
  previewUrl: string;
  hue: number;
}

// Stable key used to match a catalog hit to a row in our DB (client + server
// MUST produce the same string).
export function catalogKey(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}␟${artist.trim().toLowerCase()}`;
}

function hueFromText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

interface ItunesRaw {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  previewUrl?: string;
}

function normalize(results: ItunesRaw[]): ItunesTrack[] {
  const seen = new Set<string>();
  const out: ItunesTrack[] = [];
  for (const r of results) {
    if (!r.trackName || !r.artistName) continue;
    const title = r.trackName.trim();
    const artist = r.artistName.trim();
    const k = catalogKey(title, artist);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      externalId: r.trackId ? String(r.trackId) : "",
      title,
      artist,
      genre: r.primaryGenreName ?? "",
      year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) || null : null,
      artworkUrl: (r.artworkUrl100 ?? "").replace(/\/\d+x\d+bb\./, "/300x300bb."),
      previewUrl: r.previewUrl ?? "",
      hue: hueFromText(`${title} ${artist}`),
    });
  }
  return out;
}

let counter = 0;

export function searchItunes(q: string): Promise<ItunesTrack[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined" || q.trim().length < 2) {
      resolve([]);
      return;
    }
    const cbName = `__itunesCb${++counter}`;
    const script = document.createElement("script");
    let settled = false;

    const win = window as unknown as Record<string, unknown>;
    const cleanup = () => {
      try {
        delete win[cbName];
      } catch {
        win[cbName] = undefined;
      }
      script.remove();
    };
    const finish = (rows: ItunesTrack[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(rows);
    };

    win[cbName] = (data: { results?: ItunesRaw[] }) => finish(normalize(data?.results ?? []));
    script.onerror = () => finish([]);
    script.src =
      "https://itunes.apple.com/search?media=music&entity=song&country=US&limit=25&callback=" +
      cbName +
      "&term=" +
      encodeURIComponent(q.trim());
    document.body.appendChild(script);
    window.setTimeout(() => finish([]), 6000);
  });
}
