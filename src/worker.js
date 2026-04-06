// Entry point — Cloudflare Workers fetch handler
// TODO: Implement routing and handler wiring
//
// Routes:
//   /api?username=X         → stats card
//   /api/top-langs?username=X → top languages card
//   /api/pin?username=X&repo=Y → repo pin card
//
// See PLAN.md for full implementation details

export default {
  async fetch(request, env, ctx) {
    return new Response("github-readme-stats-worker — not yet implemented", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
};
