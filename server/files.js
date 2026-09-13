import fs from "node:fs";

const textExt = new Set([".txt",".md",".csv",".json",".js",".ts",".jsx",".tsx",".py",".html",".css",".java",".c",".cpp",".h",".xml",".yaml",".yml"]);

export async function extractText(file) {
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
  if (textExt.has(ext)) return fs.readFileSync(file.path, "utf8").slice(0, 120000);
  if (ext === ".pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = new Uint8Array(fs.readFileSync(file.path));
      const pdf = await pdfjs.getDocument({data}).promise;
      let out = "";
      for (let i=1; i<=Math.min(pdf.numPages,30); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        out += content.items.map(x=>x.str).join(" ") + "\n";
        if (out.length > 120000) break;
      }
      return out;
    } catch {
      return "[PDF uploaded. Text extraction dependency is optional; install pdfjs-dist to enable PDF extraction.]";
    }
  }
  if ([".doc",".docx"].includes(ext)) {
    return "[DOC/DOCX uploaded. Add a DOCX parser such as mammoth if you need local extraction.]";
  }
  return `[Uploaded file: ${file.originalname}]`;
}
