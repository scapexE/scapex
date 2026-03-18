import { readFileSync, writeFileSync } from "fs";

const versionFile = "version.json";
const version = JSON.parse(readFileSync(versionFile, "utf-8"));

version.patch += 1;

writeFileSync(versionFile, JSON.stringify(version, null, 2) + "\n");

const tag = `V${version.major}.${version.minor}.${version.patch}`;
console.log(`Version bumped to ${tag}`);
