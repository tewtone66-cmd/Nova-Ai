import fs from "node:fs";
import path from "node:path";

const file=path.resolve("server/index.js");
let s=fs.readFileSync(file,"utf8");

const sessionLine='app.use(cookieSession({name:"nova.sid",secret:process.env.SESSION_SECRET||"dev-secret-change-me",maxAge:1000*60*60*24*30,sameSite:"lax",secure:process.env.NODE_ENV === "production"}));';
const gate=`\nconst MAINTENANCE_FILE=path.resolve("data/maintenance.json");\nfs.mkdirSync(path.dirname(MAINTENANCE_FILE),{recursive:true});\nfunction maintenanceOn(){try{return Boolean(JSON.parse(fs.readFileSync(MAINTENANCE_FILE,"utf8")).enabled)}catch{return false}}\nfunction ownerHost(req){const configured=String(process.env.NOVA_OWNER_DOMAIN||"").trim().toLowerCase();const host=String(req.headers.host||"").split(":")[0].toLowerCase();return Boolean(configured&&host===configured)}\napp.use((req,res,next)=>{if(!maintenanceOn()||ownerHost(req)||req.path.startsWith("/api/admin/login"))return next();if(req.path.startsWith("/api/"))return res.status(503).json({ok:false,error:{code:"MAINTENANCE",message:"سایت در حال آپدیت است. لطفاً بعداً مجدداً تلاش کنید."}});return res.sendFile(path.resolve("public/maintenance.html"))});\n`;
if(!s.includes("const MAINTENANCE_FILE=")){
  if(!s.includes(sessionLine)) throw new Error("session anchor not found");
  s=s.replace(sessionLine,sessionLine+gate);
}
const ownerAnchor='function requireOwner(req,res,next){if(req.session?.owner===true)return next();return jsonError(res,401,"دسترسی فقط برای صاحب سایت مجاز است.","OWNER_UNAUTHORIZED");}';
const routes=`\napp.get("/api/admin/maintenance",requireOwner,(req,res)=>{res.json({ok:true,enabled:maintenanceOn(),ownerDomain:String(process.env.NOVA_OWNER_DOMAIN||"")})});\napp.put("/api/admin/maintenance",requireOwner,(req,res)=>{const enabled=Boolean(req.body?.enabled);fs.writeFileSync(MAINTENANCE_FILE,JSON.stringify({enabled,updatedAt:Date.now()},null,2));res.json({ok:true,enabled})});`;
if(!s.includes("app.get(\"/api/admin/maintenance\"")){
  if(!s.includes(ownerAnchor)) throw new Error("owner anchor not found");
  s=s.replace(ownerAnchor,ownerAnchor+routes);
}
fs.writeFileSync(file,s);
console.log("Nova maintenance patch ready");
