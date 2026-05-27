import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", "dist"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".txt",
  ".xml",
  "",
]);

const slash = "/";
const backslash = String.fromCharCode(92);
const joined = (...parts) => parts.join("");

const localPathChecks = [
  (line) => line.includes(joined(slash, "Users", slash)),
  (line) => line.includes(joined(slash, "private", slash, "var", slash)),
  (line) => line.includes(joined(slash, "var", slash, "folders", slash)),
  (line) => line.includes(joined(slash, "tmp", slash)),
  (line) => line.includes(joined(backslash, "Users", backslash)),
  (line) => line.includes(["generated", "images"].join("_")),
  (line) => line.includes(["Documents", "Codex"].join(slash)),
];

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await collectFiles(root);
const findings = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const relativePath = path.relative(root, file);

  content.split(/\r?\n/).forEach((line, index) => {
    if (localPathChecks.some((check) => check(line))) {
      findings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (findings.length > 0) {
  console.error("Local or machine-specific paths found:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log(`Checked ${files.length} text files. No local paths found.`);
