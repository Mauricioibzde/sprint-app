import type { AnimMode, Guide, PromptParams } from "@/types";
import { cloneData } from "@/lib/constants";

export const PROJECT_VERSION = 1;

export type ProjectAnim = {
  fps: number;
  loop: boolean;
  mode: AnimMode;
  row: number;
};

export type SpriteProject = {
  version: number;
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  fileName: string;
  imageW: number;
  imageH: number;
  hasSheet: boolean;
  prompt: PromptParams;
  guides: Guide[];
  lockUniformGrid: boolean;
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
  safeMarginPx: number;
  guideColor: string;
  guideThickness: number;
  autoCenterFrames?: boolean;
  anim: ProjectAnim;
};

export type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  hasSheet: boolean;
  thumbUrl: string | null;
  tags: string[];
};

export function newProjectId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function slugifyName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "projeto";
}

export function nameFromFile(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "Projeto";
}

export function parseProject(raw: unknown): SpriteProject | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Partial<SpriteProject>;
  if (!src.id || !src.name || !src.prompt || !Array.isArray(src.guides)) return null;
  return {
    version: PROJECT_VERSION,
    id: String(src.id),
    name: String(src.name),
    slug: slugifyName(String(src.slug || src.name)),
    createdAt: String(src.createdAt || new Date().toISOString()),
    updatedAt: String(src.updatedAt || new Date().toISOString()),
    tags: Array.isArray(src.tags) ? src.tags.map(String).filter(Boolean).slice(0, 24) : [],
    fileName: String(src.fileName || "spritesheet.png"),
    imageW: Number(src.imageW) || 0,
    imageH: Number(src.imageH) || 0,
    hasSheet: Boolean(src.hasSheet),
    prompt: cloneData(src.prompt),
    guides: src.guides.map((g) => ({
      id: String(g.id),
      axis: g.axis === "h" ? "h" : "v",
      percent: Number(g.percent) || 0
    })),
    lockUniformGrid: src.lockUniformGrid !== false,
    cols: Math.max(1, Number(src.cols) || 1),
    rows: Math.max(1, Number(src.rows) || 1),
    gapX: Math.max(0, Number(src.gapX) || 0),
    gapY: Math.max(0, Number(src.gapY) || 0),
    safeMarginPx: Math.max(0, Number(src.safeMarginPx) || 0),
    guideColor: String(src.guideColor || "#00e7ff"),
    guideThickness: Math.max(1, Number(src.guideThickness) || 2),
    autoCenterFrames: src.autoCenterFrames !== false,
    anim: {
      fps: Math.max(1, Number(src.anim?.fps) || 12),
      loop: src.anim?.loop !== false,
      mode: src.anim?.mode === "all" || src.anim?.mode === "range" ? src.anim.mode : "row",
      row: Math.max(0, Number(src.anim?.row) || 0)
    }
  };
}

export function inferProjectTags(prompt: PromptParams, existing: string[] = []): string[] {
  if (existing.length) return existing.slice(0, 24);
  const blob = `${prompt.character} ${prompt.style} ${prompt.extra} ${prompt.fileName}`.toLowerCase();
  const tags: string[] = [];
  if (/cen[aá]rio|floresta|[aá]rvore|tile|background|paisagem/.test(blob)) tags.push("cenario");
  else if (/moeda|item|po[cç][aã]o|caixa|colet|prop/.test(blob)) tags.push("item");
  else if (/fogo|efeito|explos|spark|part[ií]cula/.test(blob)) tags.push("efeito");
  else if (/slime|inimigo|monster|goblin/.test(blob)) tags.push("inimigo");
  else tags.push("personagem");
  if (/pixel/.test(blob)) tags.push("pixel");
  if (/fantasia|medieval|cavaleiro|mago/.test(blob)) tags.push("fantasia");
  if (/natureza|floresta/.test(blob)) tags.push("natureza");
  if (/sci-?fi|rob[oô]/.test(blob)) tags.push("sci-fi");
  return [...new Set(tags)].slice(0, 4);
}

export function toListItem(project: SpriteProject, thumbUrl: string | null): ProjectListItem {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    updatedAt: project.updatedAt,
    cols: project.cols,
    rows: project.rows,
    cellW: project.prompt.cellW,
    cellH: project.prompt.cellH,
    hasSheet: project.hasSheet,
    thumbUrl,
    tags: inferProjectTags(project.prompt, project.tags)
  };
}
