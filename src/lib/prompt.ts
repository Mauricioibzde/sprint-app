import type { PromptParams } from "@/types";
import {
  PARAMS_KEY,
  PROMPT_DEFAULTS,
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
    labelW: 0,
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
  const nRows = Math.max(1, p.clips.length);
  const width = p.cols * p.cellW;
  const height = nRows * p.cellH;
  const animLines = p.clips
    .map((c, i) => {
      const desc = String(c.desc || "").trim() || "ciclo da animação";
      return i + 1 + ". **" + rowLabelName(p, i) + ":** " + desc;
    })
    .join("\n");
  const extra = String(p.extra || "").trim();
  return (
    "Crie uma **spritesheet 2D limpa para jogo**, com tamanho exato de **" +
    width +
    " × " +
    height +
    " pixels**, em **PNG com fundo de canal alfa TOTALMENTE TRANSPARENTE** (alpha = 0 em todos os pixels sem arte — sem preenchimento preto, sem padrão quadriculado, sem nenhuma cor sólida atrás dos sprites), estilo " +
    p.style +
    ", sem brilho com antialiasing vazando para pixels vazios, sem sombras projetadas no fundo, sem linhas verdes, sem linhas ciano, sem sobreposições de guias, sem interface (UI) e sem marca-d'água.\n\n" +
    "**SEM TEXTO NA IMAGEM:** não desenhe letras, números, títulos, legendas, nomes de animação, «IDLE», «FRAMES», rótulos à esquerda, captions nem qualquer tipografia. A folha deve conter **apenas** os sprites do personagem, como um asset de jogo pronto a recortar.\n\n" +
    "**GRADE DE SPRITES (x=0 até x=" +
    width +
    ", y=0 até y=" +
    height +
    "):** grade perfeitamente regular de **" +
    p.cols +
    " colunas × " +
    nRows +
    " linhas**, ocupando a imagem inteira, sem coluna vazia e sem margem de texto à esquerda.\n\n" +
    "Cada célula deve ter exatamente **" +
    p.cellW +
    " × " +
    p.cellH +
    " pixels**.\n\n" +
    "Dentro de cada célula, deixe uma margem totalmente transparente de pelo menos **" +
    p.gutter +
    " px em todos os lados** (área de segurança para a arte nunca ser cortada) e posicione o personagem centralizado na área interna. Espaçamento uniforme entre frames; os sprites não se tocam nem se sobrepõem.\n\n" +
    "**NÃO desenhe retângulos ou bordas verdes, vermelhas ou ciano ao redor dos frames.** Só a arte do personagem sobre canal alfa — pixels vazios **RGBA(0,0,0,0)**.\n\n" +
    "**Personagem:** " +
    p.character +
    "\n\n" +
    "**Animações por linha (" +
    p.cols +
    " frames cada, da esquerda para a direita, com transições pequenas e contínuas entre poses para um ciclo fluido).** Os nomes abaixo são só instrução de pose — **não os escreva na PNG:**\n\n" +
    animLines +
    "\n" +
    (extra ? "\n" + extra + "\n" : "") +
    "\nExporte como **PNG-24/32 com canal alfa**.\n\n" +
    "**Alinhamento rigoroso:** cada frame preso à grade matemática, célula do mesmo tamanho, sem texto, sem sobreposição, sem inclinação, sem perspectiva, **qualidade de asset profissional para jogo**."
  );
}

export function buildTestNegative(): string {
  return "text, letters, numbers, typography, caption, title, label, legend, watermark, logo, IDLE, FRAMES, row names, left-side text column, UI chrome, solid black background, #000000 fill, opaque backdrop, white background, colored background, checkerboard, matte backdrop, green border, neon green box, cyan guides, grid overlay lines, ruler, blur, photo, 3D, uneven spacing, overlapping sprites, random layout, text over sprites, textured background, shadows on background, low contrast, extra characters, JPEG, flattened no-alpha";
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
