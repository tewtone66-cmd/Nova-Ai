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
