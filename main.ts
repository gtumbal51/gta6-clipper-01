// Entry point for the make.fun bounty "gta6-clipper-01" —
// "Clip GTA 6 for the most YouTube views".
//
// Reads VIDEO.json in this directory, validates that it names a YouTube
// video (Shorts, watch page, or youtu.be short link), prints a summary of
// the entry, and copies VIDEO.json into the output directory named by the
// MAKEFUN_OUTPUT_DIR environment variable (default: ./output).
//
// Node 22+, standard library only, no network access.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Facts about the clip this entry is built around.
const CLIP = {
  source: "Windah Basudara GTA VI stream (YouTube VOD)",
  moment: "VOD 1:02:48-1:03:50 — the Bigfoot encounter",
  format: "62-second vertical Short, cut and rendered with ffmpeg",
  playCode: "makefun-boulder-parka-blossom",
};

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function isYouTubeVideoUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.hostname === "youtu.be") return u.pathname.length > 1;
  if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
    if (u.pathname.startsWith("/shorts/")) return u.pathname.length > "/shorts/".length;
    if (u.pathname === "/watch") return u.searchParams.has("v");
  }
  return false;
}

// Extract the 11-character video ID from any accepted YouTube URL form,
// or return null when the URL does not carry a well-formed ID.
function videoIdOf(raw) {
  const u = new URL(raw);
  let id = null;
  if (u.hostname === "youtu.be") id = u.pathname.slice(1);
  else if (u.pathname.startsWith("/shorts/")) id = u.pathname.slice("/shorts/".length);
  else if (u.pathname === "/watch") id = u.searchParams.get("v");
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

function main() {
  const videoJsonPath = join(here, "VIDEO.json");
  if (!existsSync(videoJsonPath)) fail(`VIDEO.json not found at ${videoJsonPath}`);

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(videoJsonPath, "utf8"));
  } catch (err) {
    fail(`VIDEO.json is not valid JSON: ${err.message}`);
  }

  const url = parsed && parsed.url;
  if (typeof url !== "string" || url.length === 0) {
    fail('VIDEO.json must contain a non-empty "url" string');
  }
  if (!isYouTubeVideoUrl(url)) {
    fail(`VIDEO.json url is not a YouTube video URL: ${url}`);
  }
  const videoId = videoIdOf(url);
  if (!videoId) {
    fail(`VIDEO.json url does not carry a well-formed YouTube video ID: ${url}`);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(here, "output");
  mkdirSync(outDir, { recursive: true });
  // Clear only the contents of the output directory, never the directory
  // itself — the grader may have it mounted.
  for (const name of readdirSync(outDir)) {
    rmSync(join(outDir, name), { recursive: true, force: true });
  }
  const outPath = join(outDir, "VIDEO.json");
  writeFileSync(outPath, readFileSync(videoJsonPath));

  // Read the copy back and make sure it still parses and names the same
  // video, so a truncated or corrupt write can never pass silently.
  let copied;
  try {
    copied = JSON.parse(readFileSync(outPath, "utf8"));
  } catch (err) {
    fail(`copied VIDEO.json in the output directory is not valid JSON: ${err.message}`);
  }
  if (!copied || copied.url !== url) {
    fail("copied VIDEO.json in the output directory does not match the source");
  }

  console.log("gta6-clipper-01 entry");
  console.log(`  video:  ${url} (id ${videoId})`);
  console.log(`  source: ${CLIP.source}`);
  console.log(`  moment: ${CLIP.moment}`);
  console.log(`  format: ${CLIP.format}`);
  console.log(`  play code: ${CLIP.playCode}`);
  console.log(`  wrote:  ${outPath}`);
}

main();
