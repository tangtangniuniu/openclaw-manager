import fs from "node:fs/promises";
import JSON5 from "json5";

export async function readJson5File<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON5.parse(raw) as T;
}

export async function readRawFile(filePath: string) {
  return fs.readFile(filePath, "utf8");
}

