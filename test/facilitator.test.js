// FACILITATOR.md must quote the game exactly as js/model.js plays it. Each table the guide
// relies on sits under a marker comment (<!-- facilitator-table: NAME -->), so the parser
// finds it by name, reads the header row, and looks columns up by their header text.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resources, initiatives, scenarios, WIN_BAR } from "../js/model.js";

const guide = await readFile(new URL("../FACILITATOR.md", import.meta.url), "utf8");

function splitRow(line) {
  const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
  return cells.map((cell) => cell.trim());
}

// The first pipe table after the named marker, as an array of { header: cell } objects.
function table(name) {
  const lines = guide.split(/\r?\n/);
  const marker = lines.findIndex((line) => line.trim() === `<!-- facilitator-table: ${name} -->`);
  assert.notEqual(marker, -1, `FACILITATOR.md has no "${name}" table marker`);
  let start = marker + 1;
  while (start < lines.length && !lines[start].trim().startsWith("|")) start++;
  const block = [];
  for (let i = start; i < lines.length && lines[i].trim().startsWith("|"); i++) block.push(lines[i]);
  assert.ok(block.length >= 3, `the "${name}" table has a header, a divider and at least one row`);
  const headers = splitRow(block[0]);
  assert.match(block[1], /^\s*\|[\s|:-]+\|\s*$/, `the "${name}" table's second line is a divider`);
  return block.slice(2).map((line) => {
    const cells = splitRow(line);
    assert.equal(cells.length, headers.length, `row has ${headers.length} cells in "${name}": ${line}`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

const stripTicks = (value) => value.replace(/`/g, "").trim();
const number = (value) => {
  const parsed = Number(String(value).replace(/[$,%\s]|K$/g, ""));
  assert.ok(Number.isFinite(parsed), `"${value}" is a number`);
  return parsed;
};
const close = (a, b) => Math.abs(a - b) < 1e-9;

test("the settings table matches the budget, team caps and win bar", () => {
  const rows = Object.fromEntries(table("settings").map((row) => [row.Setting, row.Value]));
  assert.equal(number(rows["Budget for the year ($K)"]), resources.budgetK);
  resources.quarters.forEach((quarter, index) => {
    const value = rows[`Team cap ${quarter} (FTE)`];
    assert.ok(value !== undefined, `settings table lists the ${quarter} team cap`);
    assert.ok(close(number(value), resources.fte[index]), `${quarter} cap is ${resources.fte[index]}`);
  });
  assert.ok(close(number(rows["Win bar (program score)"]) / 100, WIN_BAR), `win bar is ${WIN_BAR * 100}%`);
});

test("the card table lists every card once, with the model's cost, FTE and needs", () => {
  const rows = table("cards");
  const byId = Object.fromEntries(rows.map((row) => [stripTicks(row.ID), row]));
  assert.equal(rows.length, initiatives.length, "one row per card");
  assert.equal(Object.keys(byId).length, rows.length, "no card is listed twice");
  for (const card of initiatives) {
    const row = byId[card.id];
    assert.ok(row, `card table lists ${card.id}`);
    assert.equal(row.Card, card.name, `${card.id} name`);
    assert.equal(number(row["Cost ($K)"]), card.costK, `${card.id} cost`);
    assert.ok(close(number(row.FTE), card.fte), `${card.id} FTE`);
    const needs = row.Needs === "-" ? [] : row.Needs.split(",").map(stripTicks);
    assert.deepEqual(needs.sort(), [...(card.needs || [])].sort(), `${card.id} needs`);
    assert.equal(row.Kind.startsWith("Tool"), card.kind === "tool", `${card.id} kind`);
    assert.equal(/foundation/i.test(row.Kind), Boolean(card.foundation), `${card.id} foundation flag`);
    const [bsimm, samm] = card.ref.split(" · ");
    assert.equal(`BSIMM ${row.BSIMM}`, bsimm, `${card.id} BSIMM ref`);
    assert.equal(`SAMM ${row.SAMM}`, samm, `${card.id} SAMM ref`);
  }
});

// The card table names attacks by the simulation's short labels.
const SHORT = { "Log4j-style CVE": "dep", PHP2Shell: "php", "Credential stuffing": "cred", "SQL injection": "sqli", "Cloud key leak": "secret", "Refund logic abuse": "logic" };

test("the card table's stops and cuts match every attack's stopper and cuts", () => {
  for (const row of table("cards")) {
    const id = stripTicks(row.ID);
    const stops = row.Stops === "-" ? [] : row.Stops.split(",").map((label) => SHORT[label.trim()]);
    assert.deepEqual(stops.sort(), scenarios.filter((s) => s.stops === id).map((s) => s.id).sort(), `${id} stops`);
    const listed = {};
    const cutsCell = row["Cuts (at full strength)"];
    const every = cutsCell.match(/^Every attack (\d+)%$/);
    if (every) scenarios.forEach((s) => { listed[s.id] = Number(every[1]); });
    else if (cutsCell !== "-") {
      for (const part of cutsCell.split(",")) {
        const match = part.trim().match(/^(.+) (\d+)%$/);
        assert.ok(match && SHORT[match[1]], `${id} cut "${part.trim()}" names a known attack`);
        listed[SHORT[match[1]]] = Number(match[2]);
      }
    }
    const expected = Object.fromEntries(scenarios.filter((s) => s.cuts[id] !== undefined).map((s) => [s.id, Math.round(s.cuts[id] * 100)]));
    assert.deepEqual(listed, expected, `${id} cuts`);
  }
});

test("the attack table matches every weight, likelihood, stopper and stopper cut", () => {
  const rows = table("attacks");
  const byId = Object.fromEntries(rows.map((row) => [stripTicks(row.ID), row]));
  assert.equal(rows.length, scenarios.length, "one row per attack");
  for (const scenario of scenarios) {
    const row = byId[scenario.id];
    assert.ok(row, `attack table lists ${scenario.id}`);
    assert.equal(row.Attack, scenario.title, `${scenario.id} title`);
    assert.equal(row.Likelihood, scenario.likelihood, `${scenario.id} likelihood`);
    assert.ok(close(number(row.Weight), scenario.weight), `${scenario.id} weight`);
    assert.ok(close(number(row["Share of score"]), Math.round(scenario.weight * 100)), `${scenario.id} share of score`);
    assert.equal(stripTicks(row["Stopped by"]), scenario.stops, `${scenario.id} stopper`);
    assert.ok(close(number(row["Stopper's cut"]), Math.round(scenario.cuts[scenario.stops] * 100)), `${scenario.id} stopper cut`);
  }
});

test("the guide states the win bar and budget in its prose too", () => {
  assert.match(guide, new RegExp(`\\b${Math.round(WIN_BAR * 100)}% or more wins`));
  assert.match(guide, new RegExp(`budget \\$${resources.budgetK}K, FTE caps ${resources.fte.join("/")}, win bar ${Math.round(WIN_BAR * 100)}%`));
});
