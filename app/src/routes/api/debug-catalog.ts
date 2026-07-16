import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY diagnostic: does the deployed Worker allow outbound fetch to iTunes?
export const Route = createFileRoute("/api/debug-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams.get("q") ?? "queen";
        const url =
          "https://itunes.apple.com/search?media=music&entity=song&country=US&limit=2&term=" +
          encodeURIComponent(q);
        try {
          const res = await fetch(url);
          const text = await res.text();
          return Response.json({
            ok: true,
            status: res.status,
            contentType: res.headers.get("content-type"),
            len: text.length,
            sample: text.slice(0, 160),
          });
        } catch (e) {
          return Response.json({ ok: false, error: String(e && (e as Error).message) || String(e) });
        }
      },
    },
  },
});
