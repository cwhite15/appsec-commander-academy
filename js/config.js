export const academyConfig = {
  event: "SAINTCON 26",
  academy: "AppSec Academy",
  program: "Mission Commander Qualification",
  tagline: "Build the program. Defend the roadmap.",
  // Placeholder: confirm the final token with the Hackers Challenge organizers before deployment.
  ctfToken: "SC26{APPSEC_COMMANDER_ROADMAP_READY}",
  storageKey: "saintcon-appsec-commander-progress-v1",
  ranks: ["Cadet", "Navigator", "Communication Officer", "Commander"],
  assets: {
    logo: "./assets/space-owasp.png",
    recruitmentPoster: "./assets/appsec-needs-you.png",
    rankPoster: "./assets/appsec-ranks.png"
  },
  timing: {
    initiateMs: 700,
    thinkingMs: 850,
    assessMs: 1200,
    evidenceDelayMs: 500
  },
  theme: {
    ink: "#0c1116",
    panel: "#141b24",
    panelBright: "#1e3034",
    cyan: "#73e5f1",
    teal: "#587d80",
    amber: "#f9c401",
    coral: "#f8781e",
    paper: "#f3e5c3",
    muted: "#d9cba1"
  }
};
