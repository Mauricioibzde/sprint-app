import type { PromptParams } from "@/types";
import {
  PARAMS_KEY,
  PROMPT_DEFAULTS,
  canvasFromParams,
  clampInt,
  cloneData
} from "@/lib/constants";

export function normalizePromptParams(raw: unknown): PromptParams {
  const d = PROMPT_DEFAULTS;
  const src = raw && typeof raw === "object" ? (raw as Partial<PromptParams>) : {};
  const clips =
    Array.isArray(src.clips) && src.clips.length
      ? src.clips.slice(0, 32).map((c, i) => ({
          name: String((c && c.name) || "LINHA " + (i + 1)).trim() || "LINHA " + (i + 1),
          desc: String((c && c.desc) || "")
        }))
      : cloneData(d.clips);
  return {
    cols: clampInt(src.cols, 1, 32, d.cols),
    labelW: clampInt(src.labelW, 0, 4096, d.labelW),
    cellW: clampInt(src.cellW, 8, 4096, d.cellW),
    cellH: clampInt(src.cellH, 8, 4096, d.cellH),
    gutter: clampInt(src.gutter, 0, 256, d.gutter),
    character: String(src.character || d.character),
    style: String(src.style || d.style),
    extra: String(src.extra || ""),
    fileName: String(src.fileName || d.fileName),
    clips
  };
}

export function loadPromptParams(): PromptParams {
  if (typeof window === "undefined") return cloneData(PROMPT_DEFAULTS);
  try {
    return normalizePromptParams(JSON.parse(localStorage.getItem(PARAMS_KEY) || "null"));
  } catch {
    return cloneData(PROMPT_DEFAULTS);
  }
}

export function persistPromptParams(params: PromptParams) {
  try {
    localStorage.setItem(PARAMS_KEY, JSON.stringify(params));
  } catch {
    /* quota */
  }
}

export function rowLabelName(params: PromptParams, r: number): string {
  const clip = params.clips[r];
  const name = clip && String(clip.name).trim();
  return name || "Linha " + (r + 1);
}

export function clipSlug(name: string): string {
  const slug = String(name || "clip")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return slug || "clip";
}

export function frameZipPath(clipName: string, col: number): string {
  const slug = clipSlug(clipName);
  return slug + "/" + slug + "_" + String(col).padStart(2, "0") + ".png";
}

export function nextClipName(params: PromptParams, base: string): string {
  const name = String(base || "LINHA").trim() || "LINHA";
  const used = new Set(params.clips.map((c) => String(c.name || "").trim()));
  if (!used.has(name)) return name;
  let n = 2;
  while (used.has(name + " " + n) && n < 99) n += 1;
  return name + " " + n;
}

export function buildTestPrompt(p: PromptParams): string {
  const size = canvasFromParams(p);
  const nRows = Math.max(1, p.clips.length);
  const labelLines = p.clips
    .map((_, i) => "Linha " + (i + 1) + ": " + rowLabelName(p, i) + " (" + p.cols + " FRAMES)")
    .join("\n");
  const animLines = p.clips
    .map((c, i) => {
      const desc = String(c.desc || "").trim() || "ciclo da animação";
      return i + 1 + ". **" + rowLabelName(p, i) + ":** " + desc;
    })
    .join("\n");
  const extra = String(p.extra || "").trim();
  return (
    "Crie uma **spritesheet 2D limpa para jogo**, com tamanho exato de **" +
    size.width +
    " × " +
    size.height +
    " pixels**, em **PNG com fundo de canal alfa TOTALMENTE TRANSPARENTE** (alpha = 0 em todos os locais onde não houver arte ou texto — sem preenchimento preto, sem padrão quadriculado, sem nenhuma cor sólida atrás dos sprites), estilo " +
    p.style +
    ", sem brilho com antialiasing vazando para pixels vazios, sem sombras projetadas no fundo, sem linhas verdes, sem linhas ciano, sem sobreposições de guias, sem interface (UI) e sem marca-d'água.\n\n" +
    "**COLUNA DE RÓTULOS À ESQUERDA (x=0 até x=" +
    p.labelW +
    "):** fundo totalmente transparente, com texto branco, em negrito, maiúsculo e fonte sans-serif (somente os glifos brancos devem ser opacos), centralizado verticalmente em cada linha:\n\n" +
    labelLines +
    "\n\n" +
    "**GRADE DE SPRITES (x=" +
    p.labelW +
    " até x=" +
    size.width +
    ", altura total de 0 até " +
    size.height +
    "):** grade perfeitamente regular de **" +
    p.cols +
    " colunas × " +
    nRows +
    " linhas**.\n\n" +
    "Cada célula deve ter exatamente **" +
    p.cellW +
    " × " +
    p.cellH +
    " pixels**.\n\n" +
    "Dentro de cada célula, deixe uma margem totalmente transparente de pelo menos **" +
    p.gutter +
    " px em todos os lados** (uma área de segurança vazia para garantir que a arte do personagem nunca seja cortada) e posicione a arte do personagem centralizada na área interna restante.\n\n" +
    "**NÃO desenhe retângulos ou bordas verdes, vermelhas ou ciano ao redor dos frames.** Apenas a arte do personagem (e o texto dos rótulos) deve aparecer sobre o canal alfa transparente — todos os pixels vazios devem ser **RGBA(0,0,0,0)**.\n\n" +
    "**Personagem:** " +
    p.character +
    "\n\n" +
    "**Animações por linha (" +
    p.cols +
    " frames cada, da esquerda para a direita):**\n\n" +
    animLines +
    "\n" +
    (extra ? "\n" + extra + "\n" : "") +
    "\nExporte como **PNG-24/32 com canal alfa**.\n\n" +
    "**Alinhamento rigoroso:** cada frame deve estar perfeitamente preso à grade matemática, com tamanho de célula idêntico, sem sobreposição entre sprites, sem frames inclinados, sem perspectiva e com **qualidade de asset profissional pronto para uso em jogos**."
  );
}

export function buildTestNegative(): string {
  return "solid black background, #000000 fill, opaque backdrop, white background, colored background, checkerboard, matte backdrop, green border, neon green box, cyan guides, grid overlay lines, ruler, watermark, logo, blur, photo, 3D, uneven spacing, overlapping sprites, random layout, text over sprites, textured background, shadows on background, low contrast, extra characters, UI chrome, JPEG, flattened no-alpha";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    ta.remove();
  }
}
