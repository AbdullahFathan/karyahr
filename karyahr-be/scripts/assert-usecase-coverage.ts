import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const THRESHOLD = 80;
const root = join(import.meta.dir, "..");
const candidates = [join(root, "coverage", "lcov.info"), join(root, "lcov.info")];
const lcovPath = candidates.find((path) => existsSync(path));

if (!lcovPath) {
  console.error("No lcov.info found. Run bun test --coverage first.");
  process.exit(1);
}

const records = readFileSync(lcovPath, "utf8").split("end_of_record");
let hit = 0;
let found = 0;
const files: Array<{ path: string; pct: number; hit: number; found: number }> = [];

for (const record of records) {
  const source = record.match(/^SF:(.+)$/m)?.[1]?.replaceAll("\\", "/");
  if (!source || !source.endsWith(".usecase.ts") || source.includes(".usecase.test.")) {
    continue;
  }

  const lf = Number(record.match(/^LF:(\d+)/m)?.[1] ?? Number.NaN);
  const lh = Number(record.match(/^LH:(\d+)/m)?.[1] ?? Number.NaN);
  let fileFound = Number.isFinite(lf) ? lf : 0;
  let fileHit = Number.isFinite(lh) ? lh : 0;

  if (!Number.isFinite(lf) || !Number.isFinite(lh)) {
    fileFound = 0;
    fileHit = 0;
    for (const line of record.split("\n")) {
      const da = line.match(/^DA:\d+,(\d+)/);
      if (!da) {
        continue;
      }
      fileFound += 1;
      if (Number(da[1]) > 0) {
        fileHit += 1;
      }
    }
  }

  found += fileFound;
  hit += fileHit;
  files.push({
    path: source,
    hit: fileHit,
    found: fileFound,
    pct: fileFound === 0 ? 100 : (fileHit / fileFound) * 100,
  });
}

if (found === 0) {
  console.error("No *.usecase.ts files in lcov.info.");
  process.exit(1);
}

const pct = (hit / found) * 100;
console.log(`Domain use case line coverage: ${pct.toFixed(2)}% (${hit}/${found})`);
for (const file of files.sort((a, b) => a.pct - b.pct)) {
  console.log(`  ${file.pct.toFixed(1).padStart(6)}%  ${file.path}`);
}

if (pct < THRESHOLD) {
  console.error(`Below ${THRESHOLD}% threshold for *.usecase.ts.`);
  process.exit(1);
}
