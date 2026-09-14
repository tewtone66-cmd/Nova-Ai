import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
const dbFile = path.join(dataDir, "nova.json");

const defaults = {
  settings: {
    novaName: "Nova",
    novaBio: "هوش مصنوعی شخصی و خلاق شما",
    novaAvatar: "",
    userName: "کاربر",
    userBio: "",
    userAvatar: "",
    personality: "smart",
    customPrompt: "",
    theme: "green",
    customAccent: "#20a66a",
    mode: "dark",
    novaEnabled: true,
    limit: 100
  },
  conversations: [],
  memories: []
};

function clone(v){ return JSON.parse(JSON.stringify(v)); }

export function load() {
  fs.mkdirSync(dataDir, {recursive:true});
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaults, null, 2));
    return clone(defaults);
  }
  try {
    return {...clone(defaults), ...JSON.parse(fs.readFileSync(dbFile, "utf8"))};
  } catch {
    return clone(defaults);
  }
}

export function save(db) {
  fs.mkdirSync(dataDir, {recursive:true});
  const tmp = dbFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, dbFile);
}

export { dbFile };
