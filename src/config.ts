import fs from "node:fs";
import path from "node:path";
import type { Config } from "./shared/ipc.js";

const CONFIG_DIR = path.resolve(process.cwd(), ".my-sim");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const DEFAULT_TARGET_PROJECT = path.resolve(process.cwd(), "..", "target-project");

export function saveConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function writeDefaultConfig(): Config {
  const config: Config = { defaultTargetProject: DEFAULT_TARGET_PROJECT, language: "en" };
  saveConfig(config);
  return config;
}

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    return writeDefaultConfig();
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  return {
    defaultTargetProject: raw.defaultTargetProject ?? DEFAULT_TARGET_PROJECT,
    language: raw.language ?? "en",
  };
}

function resolveRawPath(rawPath: string): string {
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), "..", rawPath);
}

/** Resolves the project directory Claude Code should launch in for a given issue. */
export function resolveTargetProject(config: Config, issueTargetProject?: string): string {
  if (!issueTargetProject) return config.defaultTargetProject;
  return resolveRawPath(issueTargetProject);
}

/** True if the given path (relative paths resolved the same way resolveTargetProject does) exists and is a directory. */
export function pathExists(rawPath: string): boolean {
  try {
    return fs.statSync(resolveRawPath(rawPath)).isDirectory();
  } catch {
    return false;
  }
}
