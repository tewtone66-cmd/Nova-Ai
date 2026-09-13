import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
const dbFile = path.join(dataDir, "nova.json");

// Every field a user's personal workspace can have. New accounts get a
// fresh copy of this; existing accounts get missing fields backfilled on
// load so upgrades never crash on old data files.
export const defaultUserSettings = {
  novaName: "Nova",
  novaBio: "دستیار هوش مصنوعی شما",
  novaAvatar: "",
  userName: "کاربر",
  userBio: "",
  userAvatar: "",
  // Mood slider — exactly 5 stops, index 0..4 (see server/openai.js for what each does).
  personality: "smart",
  customPrompt: "",
  theme: "green",
  customAccent: "#20a66a",
  mode: "light",
  novaEnabled: true,
  // Memory controls
  memoryEnabled: true,
  memoryCategories: { personal: true, preferences: true, work: true, projects: true },
  // Voice
  autoSpeak: false,
  voiceLang: "fa-IR",
  // Motion
  animationLevel: "normal" // "off" | "reduced" | "normal" | "extra"
};

function defaultUserData() {
  return {
    settings: { ...defaultUserSettings, memoryCategories: { ...defaultUserSettings.memoryCategories } },
    conversations: [],
    memories: [],
    usage: { periodStart: Date.now(), tokensUsed: 0 }
  };
}

const defaults = { users: [], data: {} };

function clone(v) { return JSON.parse(JSON.stringify(v)); }

export function load() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaults, null, 2));
    return clone(defaults);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    return { ...clone(defaults), ...raw };
  } catch {
    return clone(defaults);
  }
}

export function save(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = dbFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, dbFile);
  pushRemoteBackup(db);
}

// ---- optional remote backup (Upstash Redis REST) ------------------------
//
// Render's free plan (and most free/serverless hosts) wipes the local disk
// every time the instance restarts or spins back up after being idle. Since
// accounts live only in data/nova.json, that means every registered user
// silently disappears — registering still works (same running process),
// but a login attempt after the instance recycles fails because the server
// genuinely has no memory of that account anymore.
//
// If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set (free tier
// at https://upstash.com), every save() also mirrors the whole DB to Redis,
// and restoreRemoteBackup() pulls it back down into the local file the
// moment the server boots. With no Upstash env vars set, both functions are
// complete no-ops and everything behaves exactly as it did before (pure
// local file, fine for local development).
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REMOTE_KEY = "nova:db-backup";

function pushRemoteBackup(db) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  fetch(`${UPSTASH_URL}/set/${REMOTE_KEY}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    body: JSON.stringify(db)
  }).catch(e => console.error("Nova: remote backup failed:", e.message));
}

export async function restoreRemoteBackup() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${REMOTE_KEY}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data?.result) {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(dbFile, data.result);
      console.log("Nova: restored account data from remote backup.");
    }
  } catch (e) {
    console.error("Nova: could not restore remote backup (starting with local data instead):", e.message);
  }
}

/** Get (creating if needed) the per-user workspace, with any missing fields backfilled. */
export function getUserData(db, userId) {
  if (!db.data[userId]) db.data[userId] = defaultUserData();
  const u = db.data[userId];
  u.settings = { ...defaultUserSettings, ...u.settings };
  u.settings.memoryCategories = { ...defaultUserSettings.memoryCategories, ...(u.settings.memoryCategories || {}) };
  if (!u.usage) u.usage = { periodStart: Date.now(), tokensUsed: 0 };
  if (!Array.isArray(u.conversations)) u.conversations = [];
  if (!Array.isArray(u.memories)) u.memories = [];
  return u;
}

export function findUserByUsername(db, username) {
  const needle = String(username || "").trim().toLowerCase();
  return db.users.find((u) => u.username.toLowerCase() === needle) || null;
}

export function findUserById(db, id) {
  return db.users.find((u) => u.id === id) || null;
}

export { dbFile };
