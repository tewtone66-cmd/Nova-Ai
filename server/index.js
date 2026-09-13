import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import cookieSession from "cookie-session";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {load, save, getUserData, findUserByUsername, findUserById} from "./store.js";
import {hashPassword, verifyPassword, validateUsername, validatePassword, validateContact, publicUser} from "./auth.js";
import {classify, streamResponse, generateImage, extractMemory, generateTitle, PERSONALITY_MODES} from "./openai.js";
import {extractText} from "./files.js";
import {getUsage, addUsage, estimateTokens} from "./usage.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir,{recursive:true});
const maxMb = Number(process.env.MAX_UPLOAD_MB || 15);
const upload = multer({dest:uploadDir, limits:{fileSize:maxMb*1024*1024}});
let db = load();
const controllers = new Map();

// Needed so Express knows the connection is HTTPS when running behind a
// reverse proxy / load balancer (Render, Railway, etc.). Without this,
// req.secure is always false behind a proxy, which breaks "secure" cookies.
app.set("trust proxy", 1);

app.use(cors({origin:true, credentials:true}));
app.use(express.json({limit:"2mb"}));
app.use(cookieSession({
  name: "nova.sid",
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  maxAge: 1000*60*60*24*30,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production"
}));
app.use(express.static(path.resolve("public")));

function jsonError(res, status, message, code="ERROR") {
  return res.status(status).json({ok:false,error:{code,message}});
}
function id(){ return crypto.randomUUID(); }

// ---- auth --------------------------------------------------------------

function requireAuth(req, res, next) {
  db = load();
  const userId = req.session?.userId;
  const user = userId && findUserById(db, userId);
  if (!user) return jsonError(res, 401, "لطفاً وارد حساب کاربری خود شوید.", "UNAUTHENTICATED");
  req.user = user;
  next();
}

app.post("/api/auth/register", (req,res)=>{
  db = load();
  const { username, password, email, phone } = req.body || {};

  const uCheck = validateUsername(username);
  if (!uCheck.ok) return jsonError(res,400,uCheck.message,"INVALID_USERNAME");

  const pCheck = validatePassword(password);
  if (!pCheck.ok) return jsonError(res,400,pCheck.message,"WEAK_PASSWORD");

  const cCheck = validateContact({email, phone});
  if (!cCheck.ok) return jsonError(res,400,cCheck.message,"INVALID_CONTACT");

  if (findUserByUsername(db, uCheck.value)) {
    return jsonError(res,409,"این نام کاربری قبلاً استفاده شده است.","USERNAME_TAKEN");
  }

  const {salt, hash} = hashPassword(password);
  const user = {
    id: id(),
    username: uCheck.value,
    passwordSalt: salt,
    passwordHash: hash,
    email: email ? String(email).trim() : "",
    phone: phone ? String(phone).trim() : "",
    createdAt: Date.now()
  };
  db.users.push(user);
  getUserData(db, user.id); // create the user's empty workspace
  save(db);

  req.session.userId = user.id;
  res.json({ok:true, user: publicUser(user)});
});

app.post("/api/auth/login", (req,res)=>{
  db = load();
  const { username, password } = req.body || {};
  const user = findUserByUsername(db, username);
  if (!user || !verifyPassword(String(password||""), user.passwordSalt, user.passwordHash)) {
    return jsonError(res,401,"نام کاربری یا رمز عبور اشتباه است.","INVALID_CREDENTIALS");
  }
  req.session.userId = user.id;
  res.json({ok:true, user: publicUser(user)});
});

app.post("/api/auth/logout", (req,res)=>{
  req.session = null;
  res.json({ok:true});
});

app.get("/api/auth/me", (req,res)=>{
  db = load();
  const user = req.session?.userId && findUserById(db, req.session.userId);
  res.json({ok:true, user: user ? publicUser(user) : null});
});

// ---- everything below requires login ------------------------------------
app.use("/api", (req,res,next)=>{
  if (req.path.startsWith("/auth/") || req.path === "/health") return next();
  requireAuth(req,res,next);
});

app.get("/api/state",(req,res)=>{
  db=load();
  const u = getUserData(db, req.user.id);
  res.json({ok:true, settings:u.settings, conversations:u.conversations, memories:u.memories, usage:getUsage(u), personalityModes: PERSONALITY_MODES});
});

app.put("/api/settings",(req,res)=>{
  const u = getUserData(db, req.user.id);
  const allowed=["novaName","novaBio","novaAvatar","userName","userBio","userAvatar","personality","customPrompt","theme","customAccent","mode","novaEnabled","memoryEnabled","memoryCategories","autoSpeak","voiceLang","animationLevel"];
  const next={...u.settings};
  for(const k of allowed) if(req.body[k] !== undefined) next[k]=req.body[k];
  if (next.personality && !PERSONALITY_MODES.includes(next.personality)) next.personality = u.settings.personality;
  u.settings=next; save(db);
  res.json({ok:true,settings:u.settings});
});

app.post("/api/conversations",(req,res)=>{
  const u = getUserData(db, req.user.id);
  const c={id:id(),title:(req.body.title||"New chat").slice(0,80),autoTitled:false,messages:[],updatedAt:Date.now()};
  u.conversations.unshift(c); save(db); res.json({ok:true,conversation:c});
});

app.put("/api/conversations/:id",(req,res)=>{
  const u = getUserData(db, req.user.id);
  const c=u.conversations.find(x=>x.id===req.params.id);
  if(!c) return jsonError(res,404,"Conversation not found","NOT_FOUND");
  if(req.body.title!==undefined){ c.title=String(req.body.title).slice(0,80); c.autoTitled=false; }
  if(req.body.messages!==undefined)c.messages=req.body.messages;
  c.updatedAt=Date.now(); save(db); res.json({ok:true,conversation:c});
});

app.delete("/api/conversations/:id",(req,res)=>{
  const u = getUserData(db, req.user.id);
  u.conversations=u.conversations.filter(x=>x.id!==req.params.id); save(db); res.json({ok:true});
});

app.post("/api/memories",(req,res)=>{
  const u = getUserData(db, req.user.id);
  const text=String(req.body.text||"").trim();
  if(!text) return jsonError(res,400,"Memory text is required","VALIDATION");
  const memory={id:id(),text:text.slice(0,500),category:req.body.category||"personal",createdAt:Date.now(),auto:false};
  u.memories.unshift(memory); save(db); res.json({ok:true,memory});
});
app.delete("/api/memories/:id",(req,res)=>{
  const u = getUserData(db, req.user.id);
  u.memories=u.memories.filter(x=>x.id!==req.params.id); save(db); res.json({ok:true});
});
app.delete("/api/memories",(req,res)=>{
  const u = getUserData(db, req.user.id);
  u.memories=[]; save(db); res.json({ok:true});
});

app.post("/api/upload", upload.single("file"), async (req,res)=>{
  try {
    if(!req.file) return jsonError(res,400,"No file uploaded","VALIDATION");
    const text=await extractText(req.file);
    res.json({ok:true,file:{name:req.file.originalname,size:req.file.size,type:req.file.mimetype,text}});
  } catch(e){ jsonError(res,500,e.message,"UPLOAD_ERROR"); }
});

app.post("/api/chat", async (req,res)=>{
  const u = getUserData(db, req.user.id);
  if(!u.settings.novaEnabled) return jsonError(res,403,"Nova is OFF. Turn Nova ON in Settings.","NOVA_OFF");
  const usageBefore = getUsage(u);
  if(usageBefore.remaining<=0) return jsonError(res,429,"اعتبار روزانه‌ی شما به پایان رسیده. فردا دوباره پر می‌شود.","LIMIT_REACHED");

  const messages=Array.isArray(req.body.messages)?req.body.messages:[];
  if(!messages.length) return jsonError(res,400,"Messages are required","VALIDATION");
  const text=String(messages.at(-1)?.content||"");
  const kind=req.body.kind || classify(text);
  const useWeb=Boolean(req.body.useWeb);
  const requestId=id();
  const controller=new AbortController();
  controllers.set(requestId,controller);
  res.setHeader("Content-Type","text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control","no-cache, no-transform");
  res.setHeader("Connection","keep-alive");
  res.flushHeaders();
  try {
    const stream=await streamResponse({messages,settings:u.settings,kind,useWeb,signal:controller.signal});
    let full="";
    let usageMetadata=null;
    for await (const event of stream) {
      const delta = typeof event.text === "string" ? event.text : "";
      if (event.usageMetadata) usageMetadata = event.usageMetadata;
      if(delta){
        full += delta;
        res.write(`data:${JSON.stringify({type:"delta",delta})}\n\n`);
      }
    }
    const promptText = messages.map(m=>m.content||"").join(" ");
    const tokens = estimateTokens({usageMetadata, promptText, outputText: full});
    addUsage(u, tokens);
    save(db);

    // Fire-and-forget: pick up a durable fact from this exchange, if any.
    if (u.settings.memoryEnabled) {
      extractMemory({ userText: text, assistantText: full, enabledCategories: u.settings.memoryCategories })
        .then(fact => {
          if (!fact) return;
          db = load();
          const uu = getUserData(db, req.user.id);
          const exists = uu.memories.some(m => m.text.toLowerCase() === fact.text.toLowerCase());
          if (!exists) {
            uu.memories.unshift({ id: id(), text: fact.text, category: fact.category, createdAt: Date.now(), auto: true });
            save(db);
          }
        })
        .catch(()=>{});
    }

    const usageAfter = getUsage(u);
    res.write(`data:${JSON.stringify({type:"done",requestId,limit:usageAfter.percent,usage:usageAfter})}\n\n`);
  } catch(e) {
    const aborted=controller.signal.aborted;
    res.write(`data:${JSON.stringify({type:aborted?"stopped":"error",message:aborted?"Generation stopped":(e.message||"Gemini request failed")})}\n\n`);
  } finally {
    controllers.delete(requestId);
    res.end();
  }
});

app.post("/api/chat/stop",(req,res)=>{
  const requestId=String(req.body.requestId||"");
  const c=controllers.get(requestId);
  if(c)c.abort();
  res.json({ok:true,stopped:Boolean(c)});
});

app.post("/api/conversations/:id/title", async (req,res)=>{
  const u = getUserData(db, req.user.id);
  const c = u.conversations.find(x=>x.id===req.params.id);
  if(!c) return jsonError(res,404,"Conversation not found","NOT_FOUND");
  const firstUser = c.messages.find(m=>m.role==="user")?.content;
  if(!firstUser) return jsonError(res,400,"No message to title from","VALIDATION");
  const title = await generateTitle(firstUser);
  if(title){ c.title = title; c.autoTitled = true; save(db); }
  res.json({ok:true, conversation:c});
});

app.post("/api/image",upload.single("reference"),async(req,res)=>{
  try{
    const u = getUserData(db, req.user.id);
    if(!u.settings.novaEnabled) return jsonError(res,403,"Nova is OFF.","NOVA_OFF");
    const usageBefore = getUsage(u);
    if(usageBefore.remaining<=0)return jsonError(res,429,"اعتبار روزانه‌ی شما به پایان رسیده. فردا دوباره پر می‌شود.","LIMIT_REACHED");
    const prompt=String(req.body.prompt||"").trim();
    if(!prompt)return jsonError(res,400,"Image prompt is required","VALIDATION");
    const result=await generateImage({prompt,imageFile:req.file?.path,size:req.body.size||"1024x1024"});
    addUsage(u, Number(process.env.IMAGE_TOKEN_COST)||2500);
    save(db);
    const b64=result.data?.[0]?.b64_json ?? result.candidates?.[0]?.content?.parts?.find(p=>p.inlineData)?.inlineData?.data;
    if(!b64)return jsonError(res,502,"Image provider returned no image","IMAGE_PROVIDER");
    res.json({ok:true,b64,usage:getUsage(u)});
  }catch(e){jsonError(res,500,e.message||"Image generation failed","IMAGE_ERROR");}
});

app.get("/api/health",(req,res)=>res.json({ok:true,configured:Boolean(process.env.GEMINI_API_KEY),model:process.env.GEMINI_MODEL||"gemini-3.6-flash"}));

app.use((req,res)=>{
  if(req.path.startsWith("/api/")) return jsonError(res,404,"API route not found","NOT_FOUND");
  res.sendFile(path.resolve("public/index.html"));
});

app.listen(port,()=>console.log(`Nova running at http://localhost:${port}`));
