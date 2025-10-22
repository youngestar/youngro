// Moved from .vscode/test-cva-regex.js on 2025-10-22
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "..", "packages", "ui", "src", "button.tsx");
try {
  const s = fs.readFileSync(file, "utf8");
  console.log('Sample read length:', s.length);
} catch (e) {
  console.log('original file not found in archive context');
}
