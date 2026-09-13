import assert from "node:assert/strict";
function classify(text){
  const t=(text||"").toLowerCase();
  if (/(generate|create|make|draw|image|photo|picture|عکس|تصویر|بساز|ساخت عکس|تصویر بساز)/i.test(t)) return "image";
  if (/(code|coding|debug|bug|javascript|python|typescript|html|css|react|node|کد|برنامه نویسی|باگ|خطا)/i.test(t)) return "coding";
  return "text";
}
assert.equal(classify("write python code"),"coding");
assert.equal(classify("یک عکس از تهران بساز"),"image");
assert.equal(classify("امروز چه خبر است؟"),"text");
console.log("Nova smoke tests passed.");
