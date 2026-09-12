import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {load, save} from "./store.js";
import {classify, streamResponse, generateImage} from "./openai.js";
import {extractText} from "./files.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir,{recursive:true});
const maxMb = Number(process.env.MAX_UPLOAD_MB || 15);
const upload = multer({dest:uploadDir, limits:{fileSize:maxMb*1024*1024}});
let db = load();
const controllers = new Map();

app.use(cors({origin:true}));
app.use(express.json({limit:"2mb"}));
app.use(express.static(path.resolve("public")));

function jsonError(res, status, message, code="ERROR") {
  return res.status(status).json({ok:false,error:{code,message}});
}
function persist(){ db = load(); save(db); }
function id(){ return crypto.randomUUID(); }

app.get("/api/state",(req,res)=>{
  db=load();
  res.json({ok:true,settings:db.settings,conversations:db.conversations,memories:db.memories});
});

app.put("/api/settings",(req,res)=>{
  const allowed=["novaName","novaBio","novaAvatar","userName","userBio","userAvatar","personality","customPrompt","theme","customAccent","mode","novaEnabled","limit"];
  const next={...db.settings};
  for(const k of allowed) if(req.body[k] !== undefined) next[k]=req.body[k];
  next.limit=Math.max(0,Math.min(100,Number(next.limit)||0));
  db.settings=next; save(db);
  res.json({ok:true,settings:db.settings});
});

app.post("/api/conversations",(req,res)=>{
  const c={id:id(),title:(req.body.title||"New chat").slice(0,80),messages:[],updatedAt:Date.now()};
  db.conversations.unshift(c); save(db); res.json({ok:true,conversation:c});
});

app.put("/api/conversations/:id",(req,res)=>{
  const c=db.conversations.find(x=>x.id===req.params.id);
  if(!c) return jsonError(res,404,"Conversation not found","NOT_FOUND");
  if(req.body.title!==undefined)c.title=String(req.body.title).slice(0,80);
  if(req.body.messages!==undefined)c.messages=req.body.messages;
  c.updatedAt=Date.now(); save(db); res.json({ok:true,conversation:c});
});

app.delete("/api/conversations/:id",(req,res)=>{
  db.conversations=db.conversations.filter(x=>x.id!==req.params.id); save(db); res.json({ok:true});
});

app.post("/api/memories",(req,res)=>{
  const text=String(req.body.text||"").trim();
  if(!text) return jsonError(res,400,"Memory text is required","VALIDATION");
  const memory={id:id(),text:text.slice(0,500),createdAt:Date.now()};
  db.memories.unshift(memory); save(db); res.json({ok:true,memory});
});
app.delete("/api/memories/:id",(req,res)=>{
  db.memories=db.memories.filter(x=>x.id!==req.params.id); save(db); res.json({ok:true});
});

app.post("/api/upload", upload.single("file"), async (req,res)=>{
  try {
    if(!req.file) return jsonError(res,400,"No file uploaded","VALIDATION");
    const text=await extractText(req.file);
    res.json({ok:true,file:{name:req.file.originalname,size:req.file.size,type:req.file.mimetype,text}});
  } catch(e){ jsonError(res,500,e.message,"UPLOAD_ERROR"); }
});

app.post("/api/chat", async (req,res)=>{
  if(!db.settings.novaEnabled) return jsonError(res,403,"Nova is OFF. Turn Nova ON in Settings.","NOVA_OFF");
  if(db.settings.limit<=0) return jsonError(res,429,"Your Nova limit has reached 0%.","LIMIT_REACHED");
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
    const stream=await streamResponse({messages,settings:db.settings,kind,useWeb,signal:controller.signal});
    let full="";
    for await (const event of stream) {
      if(event.type==="response.output_text.delta"){
        full += event.delta;
        res.write(`data:${JSON.stringify({type:"delta",delta:event.delta})}\n\n`);
      }
      if(event.type==="response.completed"){
        const used=Math.max(1, Math.min(10, Math.ceil(full.length/900)));
        db.settings.limit=Math.max(0,db.settings.limit-used);
        save(db);
        res.write(`data:${JSON.stringify({type:"done",requestId,limit:db.settings.limit})}\n\n`);
      }
    }
  } catch(e) {
    const aborted=controller.signal.aborted;
    res.write(`data:${JSON.stringify({type:aborted?"stopped":"error",message:aborted?"Generation stopped":(e.message||"OpenAI request failed")})}\n\n`);
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

app.post("/api/image",upload.single("reference"),async(req,res)=>{
  try{
    if(!db.settings.novaEnabled) return jsonError(res,403,"Nova is OFF.","NOVA_OFF");
    if(db.settings.limit<=0)return jsonError(res,429,"Your Nova limit has reached 0%.","LIMIT_REACHED");
    const prompt=String(req.body.prompt||"").trim();
    if(!prompt)return jsonError(res,400,"Image prompt is required","VALIDATION");
    const result=await generateImage({prompt,imageFile:req.file?.path,size:req.body.size||"1024x1024"});
    db.settings.limit=Math.max(0,db.settings.limit-5); save(db);
    const b64=result.data?.[0]?.b64_json;
    if(!b64)return jsonError(res,502,"Image provider returned no image","IMAGE_PROVIDER");
    res.json({ok:true,b64,limit:db.settings.limit});
  }catch(e){jsonError(res,500,e.message||"Image generation failed","IMAGE_ERROR");}
});

app.get("/api/health",(req,res)=>res.json({ok:true,configured:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_MODEL||"gpt-5.6-luna"}));

app.use((req,res)=>{
  if(req.path.startsWith("/api/")) return jsonError(res,404,"API route not found","NOT_FOUND");
  res.sendFile(path.resolve("public/index.html"));
});

app.listen(port,()=>console.log(`Nova running at http://localhost:${port}`));
