import fs from "node:fs";
import path from "node:path";
const file=path.resolve("public/dev.js");
let s=fs.readFileSync(file,"utf8");
const marker="NOVA_MAINTENANCE_ADMIN_LOADER";
if(!s.includes(marker)){
  s += `\n/* ${marker} */\n(()=>{const load=()=>{if(!document.querySelector('script[data-maintenance-admin]')){const sc=document.createElement('script');sc.src='/maintenance-admin.js';sc.dataset.maintenanceAdmin='1';document.body.appendChild(sc)}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()})();\n`;
  fs.writeFileSync(file,s);
  console.log("Nova maintenance admin loader added");
}
