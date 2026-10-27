// Mission 03 content. Field prompts and examples are carried over from section
// 05 BUILD of the Base44 "Build an AppSec Roadmap" page.
import { findInitiative, optionCost, postureOf, startOf, toRoadmap } from "./simulation.js";

export const buildIntro = "Stack-rank by impact vs. effort before assigning timelines — start with high-impact, lower-effort work to build credibility. If two initiatives compete for the same resource, pick one; a half-executed initiative is worse than a deferred one.";

export const maxRows = 3;
export const maxFieldLength = 140;

export const fields = [
  { id: "initiative", label: "Initiative (What you will do)", example: "e.g. Roll out SAST on 5 key repos" },
  { id: "goal", label: "Goal / Outcome (Why?)", example: "e.g. Find critical bugs before prod" },
  { id: "metric", label: "Metric for Success", example: "e.g. 80% of new PRs scanned" },
  { id: "investment", label: "Investment (Headcount / Tooling / Budget)", example: "e.g. $10k Tool and one employee" }
];

export const timelines = [
  { id: "30", label: "30 Days" },
  { id: "60", label: "60 Days" },
  { id: "90", label: "90 Days (checkpoint: adjust)" },
  { id: "180", label: "180 Days" },
  { id: "360", label: "360 Days (re-evaluate: rerun Define)" }
];

export const levels = [
  { id: "high", label: "High", score: 3 },
  { id: "moderate", label: "Moderate", score: 2 },
  { id: "low", label: "Low", score: 1 }
];

export const checkpoint = {
  question: "Two initiatives on your map need the same engineer during the same 30 days. What do you do?",
  choices: [
    { id: "split", label: "Run both at half speed so neither one stalls" },
    { id: "pick", label: "Pick the higher-impact initiative and defer the other" },
    { id: "effort-first", label: "Start the higher-effort initiative first because it takes longest" },
    { id: "overcommit", label: "Put both in the 30-day column and sort it out at the 90-day checkpoint" }
  ],
  correctId: "pick",
  hints: {
    split: "A half-executed initiative is worse than a deferred one. When two initiatives compete for the same resource, pick one.",
    "effort-first": "Start with high-impact, lower-effort work to build credibility. Long, expensive work comes after you have earned trust.",
    overcommit: "Overcommitting the first 30 days spends credibility you have not built yet. The 90-day checkpoint is for adjusting, not rescuing."
  },
  takeaway: "Stack-rank by impact vs. effort, and finish what you start."
};

export const emptyRow = () => ({ initiative: "", goal: "", metric: "", investment: "", timeline: "", impact: "", effort: "" });

const textFieldIds = fields.map((field) => field.id);
const levelScore = (id) => levels.find((level) => level.id === id)?.score || 0;

export function sanitizeRow(row) {
  const clean = emptyRow();
  if (!row || typeof row !== "object") return clean;
  for (const id of textFieldIds) clean[id] = typeof row[id] === "string" ? row[id].slice(0, maxFieldLength) : "";
  clean.timeline = timelines.some((item) => item.id === row.timeline) ? row.timeline : "";
  clean.impact = levels.some((item) => item.id === row.impact) ? row.impact : "";
  clean.effort = levels.some((item) => item.id === row.effort) ? row.effort : "";
  return clean;
}

export function sanitizeRows(rows) {
  const list = Array.isArray(rows) ? rows.slice(0, maxRows).map(sanitizeRow) : [];
  while (list.length < maxRows) list.push(emptyRow());
  return list;
}

export function isRowComplete(row) {
  return textFieldIds.every((id) => row[id].trim().length > 0) && Boolean(row.timeline && row.impact && row.effort);
}

export function isRowStarted(row) {
  return Object.values(row).some((value) => String(value).trim().length > 0);
}

export function priorityLabel(row) {
  if (!row.impact || !row.effort) return "Unranked";
  const value = levelScore(row.impact) - levelScore(row.effort);
  if (value > 0) return "Quick win";
  if (value < 0) return "Reconsider";
  return row.impact === "low" ? "Fill-in" : "Planned investment";
}

// Highest impact first, then lowest effort, then the order the attendee entered.
export function rankRows(rows) {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => isRowStarted(row))
    .sort((a, b) => (levelScore(b.row.impact) - levelScore(a.row.impact))
      || (levelScore(a.row.effort) - levelScore(b.row.effort))
      || (a.index - b.index))
    .map(({ row, index }) => ({ ...row, slot: index + 1, priority: priorityLabel(row) }));
}

// Upgrading a partial control imports as "Upgrade existing …", at the upgrade's cost. The row's
// timeline comes from the control's start: now → 30 days, +3 months → 90, +6 → 180, +12 → 360.
const timelineForStart = { 0: "30", 3: "90", 6: "180", 12: "360" };

export function rowsFromSimulation(scenario, roadmapInput) {
  const roadmap = toRoadmap(roadmapInput);
  return roadmap.activated.slice(0, maxRows).map((id) => {
    const initiative = findInitiative(id);
    if (!initiative || !scenario) return emptyRow();
    const start = startOf(roadmap, id);
    const cost = optionCost(scenario, id, start);
    const upgrade = postureOf(scenario, id) === "partial";
    return {
      ...emptyRow(),
      initiative: `${upgrade ? "Upgrade existing " : ""}${initiative.name}`,
      goal: initiative.description,
      investment: `$${cost.budget}K and ${Math.round(cost.weeks)} engineer-weeks, starting ${start === 0 ? "now" : `in month ${start + 1}`}`,
      timeline: timelineForStart[start] ?? ""
    };
  });
}

export function checkMapAnswer(choiceId) {
  const correct = checkpoint.correctId === choiceId;
  return { correct, hint: correct ? checkpoint.takeaway : checkpoint.hints[choiceId] || "That approach does not hold up. Try again." };
}

export function readyToLock(rows, checkpointPassed) {
  return checkpointPassed === true && rows.some(isRowComplete);
}
