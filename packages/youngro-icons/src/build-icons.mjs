import { promises as fs } from "fs";
import path from "path";

// base points to the package's src/ directory
const base = new URL("./", import.meta.url);
const svgDir = new URL("./svg/", base); // packages/youngro-icons/src/svg/
const generatedDir = new URL("./generated/", base); // packages/youngro-icons/src/generated/
const distReactDir = new URL("../dist/react/", base); // packages/youngro-icons/dist/react/

function pascalCase(name) {
  return name
    .replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_, __, c) => (c || "").toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}

async function ensureDir(u) {
  try {
    await fs.mkdir(u, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function build() {
  await ensureDir(generatedDir);
  await ensureDir(distReactDir);

  const files = await fs.readdir(svgDir);
  const svgs = files.filter((f) => f.endsWith(".svg"));

  const exports = [];

  for (const file of svgs) {
    const name = path.basename(file, ".svg");
    const compName = pascalCase(name) + "Icon";
    const svgPath = new URL("./" + file, svgDir);
    const svg = await fs.readFile(svgPath, "utf8");

    // create a component that dangerouslySetInnerHTML or return svg as JSX by simple transform
    // We'll embed the raw svg string into a React component for simplicity.
    const component = `import React from 'react'
export const ${compName} = (props) => (
  <span {...props} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(svg)} }} />
)

export default ${compName}
`;

    // write to generated (source) for reference
    const genPath = new URL("./" + compName + ".tsx", generatedDir);
    await fs.writeFile(genPath, component, "utf8");

    // write transpiled ESM (simple passthrough) to dist/react
    const distComp = `import React from 'react'
export const ${compName} = (props) => React.createElement('span', Object.assign({}, props, { dangerouslySetInnerHTML: { __html: ${JSON.stringify(svg)} } }))
export default ${compName}
`;
    const distPath = new URL("./" + compName + ".js", distReactDir);
    await fs.writeFile(distPath, distComp, "utf8");

    exports.push({ name: compName, file: "./" + compName + ".js" });
  }

  // write index.js
  let idx = "";
  for (const e of exports) {
    idx += `export { default as ${e.name} } from '${e.file}'\n`;
  }
  idx +=
    "export default { " +
    exports.map((e) => `${e.name}: ${e.name}`).join(", ") +
    " }\n";

  const indexPath = new URL("./index.js", distReactDir);
  await fs.writeFile(indexPath, idx, "utf8");

  console.log("built react icons to", distReactDir.pathname);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
