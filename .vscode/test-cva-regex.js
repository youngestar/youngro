const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../packages/ui/src/button.tsx");
const s = fs.readFileSync(file, "utf8");
const regexes = [
  /className\s*=\s*\"([^\"]*)\"/g,
  /class\s*=\s*{?`([^`]*)`?}/g,
  /cn\(([^)]*)\)/g,
  /clsx\(([^)]*)\)/g,
  /cva\s*\(\s*`([^`]*)`/g,
  /cva\s*\(\s*\"([^\"]*)\"/g,
  /cva\s*\(\s*'([^']*)'/g,
  /\b[A-Za-z0-9_]+\s*:\s*\"([^\"]*)\"/g,
  /\b[A-Za-z0-9_]+\s*:\s*'([^']*)'/g,
];
console.log("Testing regexes against", file);
regexes.forEach((r) => {
  const matches = [];
  let m;
  while ((m = r.exec(s)) !== null) {
    matches.push(m[1]);
  }
  console.log("\nRegex:", r);
  console.log("Matches found:", matches.length);
  matches.slice(0, 5).forEach((mm, i) => console.log(i + 1, "=>", mm));
});
