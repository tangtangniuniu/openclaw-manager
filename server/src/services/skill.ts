import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { OPENCLAW_HOME } from "../util/paths.js";

const SKILLS_DIR = path.join(OPENCLAW_HOME, "skills");

export interface SkillSummary {
  name: string;
  path: string;
  description?: string;
  isSymlink: boolean;
  linkTarget?: string;
  hasBody: boolean;
}

export interface CreateSkillPayload {
  name: string;
  description: string;
  body?: string;
}

export function listSkills(): SkillSummary[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR).flatMap((entry) => {
    const abs = path.join(SKILLS_DIR, entry);
    const lstat = fs.lstatSync(abs);
    const isSymlink = lstat.isSymbolicLink();
    let linkTarget: string | undefined;
    if (isSymlink) {
      try {
        linkTarget = fs.readlinkSync(abs);
      } catch {
        linkTarget = "<unreadable>";
      }
    }
    let stat: fs.Stats | null = null;
    try {
      stat = fs.statSync(abs);
    } catch {
      return [{ name: entry, path: abs, isSymlink, linkTarget, hasBody: false } as SkillSummary];
    }
    if (!stat.isDirectory()) return [];
    const skillFile = path.join(abs, "SKILL.md");
    const hasBody = fs.existsSync(skillFile);
    let description: string | undefined;
    if (hasBody) {
      try {
        const text = fs.readFileSync(skillFile, "utf8");
        description = extractFrontmatterDescription(text);
      } catch {
        description = undefined;
      }
    }
    return [{ name: entry, path: abs, description, isSymlink, linkTarget, hasBody } satisfies SkillSummary];
  });
}

function extractFrontmatterDescription(text: string): string | undefined {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return undefined;
  const fm = match[1];
  const descMatch = fm.match(/description:\s*(?:>[-]?\s*\n([\s\S]*?)(?=\n[a-zA-Z_]+:|$)|(.+))/);
  if (!descMatch) return undefined;
  const multiline = descMatch[1];
  const single = descMatch[2];
  const value = (multiline ?? single ?? "").split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  return value || undefined;
}

export function createSkill(payload: CreateSkillPayload): SkillSummary {
  const name = payload.name?.trim();
  if (!name || !/^[a-z][a-z0-9-]{1,48}$/i.test(name)) {
    const err = new Error("Skill name must be 2-49 chars, [a-zA-Z0-9-], start with letter.");
    (err as any).status = 400;
    throw err;
  }
  if (!payload.description?.trim()) {
    const err = new Error("description is required");
    (err as any).status = 400;
    throw err;
  }
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  const target = path.join(SKILLS_DIR, name);
  if (fs.existsSync(target)) {
    const err = new Error(`Skill ${name} already exists`);
    (err as any).status = 409;
    throw err;
  }
  fs.mkdirSync(target);
  const body = payload.body?.trim() ?? DEFAULT_BODY(name);
  const frontmatter = `---
name: ${name}
description: >
  ${payload.description.trim().replace(/\n/g, "\n  ")}
---

${body}
`;
  fs.writeFileSync(path.join(target, "SKILL.md"), frontmatter);
  return {
    name,
    path: target,
    description: payload.description.trim(),
    isSymlink: false,
    hasBody: true,
  };
}

export function deleteSkill(name: string): void {
  const target = path.join(SKILLS_DIR, name);
  const rel = path.relative(SKILLS_DIR, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const err = new Error("invalid skill name");
    (err as any).status = 400;
    throw err;
  }
  if (!fs.existsSync(target)) return;
  const lstat = fs.lstatSync(target);
  if (lstat.isSymbolicLink()) {
    fs.unlinkSync(target);
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
}

function DEFAULT_BODY(name: string): string {
  return `# ${name}

Describe what this skill does, when to trigger it, and the steps to follow.

## When to use

- Trigger phrase 1
- Trigger phrase 2

## Steps

1. ...
2. ...
3. ...

## Examples

\`\`\`
Input: ...
Output: ...
\`\`\`
`;
}
