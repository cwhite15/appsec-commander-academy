import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { academyConfig } from "../js/config.js";

const trackerClient = await readFile(new URL("../js/tracker.js", import.meta.url), "utf8");
const appClient = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const nginx = await readFile(new URL("../nginx.conf", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("academy brand returns to the community mission selector", () => {
  assert.match(html, /<a class="brand" href="\/" aria-label="Return to AppSec Community Academy">/);
});

test("awards a Hackers Challenge formatted token", () => {
  assert.match(academyConfig.ctfToken, /^HC\{[^{}]+\}$/);
});

test("sends activity to the central production tracker", () => {
  assert.match(trackerClient, /https:\/\/appsec\.community\/api\/activity/);
  assert.match(trackerClient, /credentials:\s*"omit"/);
});

test("reset progress clears tracker identity and reloads", () => {
  assert.match(trackerClient, /removeItem\(participantKey\)/);
  assert.match(trackerClient, /removeItem\(sessionKey\)/);
  assert.match(trackerClient, /removeItem\(sentKey\)/);
  assert.match(appClient, /resetActivityIdentity\(\)/);
  assert.match(appClient, /window\.location\.reload\(\)/);
});

test("five minutes of inactivity starts the same full session reset", () => {
  assert.match(appClient, /installIdleReset\(\(\) => actions\.restart\(\)\)/);
});

test("allows the production tracker in local and nginx CSP headers", () => {
  assert.match(nginx, /connect-src 'self' https:\/\/appsec\.community/);
  assert.match(server, /connect-src 'self' https:\/\/appsec\.community/);
});
