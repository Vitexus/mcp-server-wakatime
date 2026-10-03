// ABOUTME: Transpile src/*.ts to dist/ without type-checking.
// ABOUTME: Used by the Debian build, whose typescript (4.x) is too old to type-check against zod 4.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const ts = createRequire(import.meta.url)("typescript");
fs.mkdirSync("dist", { recursive: true });
for (const f of fs.readdirSync("src").filter((n) => n.endsWith(".ts"))) {
  const out = ts.transpileModule(fs.readFileSync(path.join("src", f), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    fileName: f,
  });
  fs.writeFileSync(path.join("dist", f.replace(/\.ts$/, ".js")), out.outputText);
}
