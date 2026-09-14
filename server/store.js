import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
const dbFile = path.join(dataDir, "nova.json");

export const defaultUserSettings = {
  novaName: "Nova",
  novaBio: "دستیار هوش مصنوعی شما",
  novaAvatar: "",
  userBio: "",
  userName: "کاربر",
  userAvatar: "",
  personality: "smart",
  customPrompt: "",
  theme: "green",
  customAccent: "#20a66a",
  mode: "dark",
  novaEnabled: true,
  memoryEnabled: true,
  memoryCategories: { personal: true, preferences: true, work: true, projects: true },
  autoSpeak: false,
  voiceLang: "fa-IR",
  animationLevel: "reduced",
  nova2ThemeMigrated: true
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
  if (Array.isArray(db.updates)) pushRemoteUpdates(db.updates);
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REMOTE_KEY = "nova:db-backup";
const REMOTE_UPDATES_KEY = "nova:updates-backup";

function pushRemoteBackup(db) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  fetch(`${UPSTASH_URL}/set/${REMOTE_KEY}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    body: JSON.stringify(db)
  }).catch(e => console.error("Nova: remote backup failed:", e.message));
}

function pushRemoteUpdates(updates) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  fetch(`${UPSTASH_URL}/set/${REMOTE_UPDATES_KEY}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    body: JSON.stringify(updates)
  }).catch(e => console.error("Nova: remote update-log backup failed:", e.message));
}

export async function restoreRemoteBackup() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${REMOTE_KEY}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data?.result) {
      const restored = JSON.parse(data.result);
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(dbFile, JSON.stringify(restored, null, 2));
      console.log("Nova: restored account data from remote backup.");
      return restored;
    }
  } catch (e) {
    console.error("Nova: could not restore remote backup (starting with local data instead):", e.message);
  }
  return null;
}

export async function restoreRemoteUpdates() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${REMOTE_UPDATES_KEY}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data?.result) {
      const updates = JSON.parse(data.result);
      if (Array.isArray(updates)) {
        console.log(`Nova: restored ${updates.length} update logs from remote backup.`);
        return updates;
      }
    }
  } catch (e) {
    console.error("Nova: could not restore remote update logs:", e.message);
  }
  return null;
}

export function getUserData(db, userId) {
  if (!db.data[userId]) db.data[userId] = defaultUserData();
  const u = db.data[userId];
  const wasLegacyTheme = !u.settings || u.settings.nova2ThemeMigrated !== true;
  u.settings = { ...defaultUserSettings, ...u.settings };
  u.settings.memoryCategories = { ...defaultUserSettings.memoryCategories, ...(u.settings.memoryCategories || {}) };

  const account = findUserById(db, userId);
  if (account?.username && (!u.settings.userName || u.settings.userName === "کاربر" || u.settings.userName === "User")) {
    u.settings.userName = account.username;
  }

  if (wasLegacyTheme) {
    u.settings.mode = "dark";
    u.settings.animationLevel = "reduced";
    u.settings.nova2ThemeMigrated = true;
  }
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