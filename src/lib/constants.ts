import type { PromptParams, SheetPreset } from "@/types";

export const PARAMS_KEY = "spritecut-prompt-params";
export const LEARN_KEY = "spritecut-learn-v1";
export const CHROME_KEY = "spritecut-chrome-collapsed";

export const DEFAULT_CLIPS = [
  { name: "IDLE", desc: "ciclo sutil do personagem parado" },
  { name: "WALK", desc: "ciclo de caminhada" },
  { name: "RUN", desc: "ciclo de corrida" },
  { name: "JUMP", desc: "agachar, saltar, permanecer no ar e aterrissar" },
  { name: "ATTACK", desc: "ataque com golpe/deslize, acompanhado de linhas simples de movimento brancas" },
  { name: "HURT", desc: "reação ao receber um golpe / recuo por impacto" },
  { name: "DEATH", desc: "cair e permanecer imóvel no chão" }
] as const;

export const CLIP_PRESETS = [
  ...DEFAULT_CLIPS,
  { name: "CROUCH", desc: "agachar e permanecer baixo, pronto para se mover" },
  { name: "CLIMB", desc: "subir parede ou escada, mãos e pés em sequência" },
  { name: "DASH", desc: "impulso rápido para a frente, corpo esticado, linhas simples de movimento" },
  { name: "DOUBLE JUMP", desc: "segundo salto no ar, impulso extra antes de descer" },
  { name: "FALL", desc: "queda no ar, corpo em descida, sem contato com o chão" },
  { name: "LAND", desc: "aterrissar, absorver o impacto e recuperar o equilíbrio" },
  { name: "SLIDE", desc: "deslizar baixo no chão, corpo alongado" },
  { name: "BLOCK", desc: "defesa à frente, recuo firme contra o golpe" },
  { name: "CAST", desc: "lançar magia, gesto de conjuração com brilho nas mãos" },
  { name: "SHOOT", desc: "disparo à distância, apontar e soltar o projétil" },
  { name: "SWIM", desc: "ciclo de nado, corpo horizontal em propulsão" },
  { name: "FLY", desc: "ciclo de voo, flutuação estável no ar" },
  { name: "INTERACT", desc: "usar um objeto ou alavanca, gesto de alcançar e acionar" },
  { name: "VICTORY", desc: "celebrar a vitória, pose de triunfo" }
] as const;

export const PROMPT_DEFAULTS: PromptParams = {
  cols: 8,
  labelW: 0,
  cellW: 512,
  cellH: 256,
  gutter: 12,
  character:
    "uma raposa cartoon laranja e fofa, mantendo tamanho e proporções consistentes em todos os frames, vista lateral no estilo de jogos de plataforma, cores sólidas e pixels do personagem totalmente opacos (alpha = 255 na raposa)",
  style: "cartoon 2D plano, bordas nítidas, sem desfoque",
  extra: "",
  fileName: "raposa_spritesheet.png",
  clips: DEFAULT_CLIPS.map((c) => ({ ...c }))
};

export const SCREENS: Record<string, { title: string; sub: string }> = {
  cut: {
    title: "Recortar",
    sub: "Abra a PNG gerada. A grade do prompt aplica-se ao carregar."
  },
  animate: {
    title: "Animar",
    sub: "Pré-visualize cada linha e exporte HTML ou ZIP para o jogo."
  },
  batch: { title: "Lote", sub: "Processe várias spritesheets com a mesma grade do prompt." },
  gallery: {
    title: "Galeria de projetos",
    sub: "Seus projetos salvos na pasta local. Organize, renomeie, exclua ou abra para continuar editando."
  },
  settings: { title: "Configurações", sub: "Preferências da sessão atual." },
  history: { title: "Histórico", sub: "Ações recentes nesta sessão." },
  about: {
    title: "Prompt",
    sub: "Defina personagem e animações, copie o texto e gere a PNG com alpha."
  }
};

export const WORKFLOW_STEPS = [
  { screen: "about" as const, n: 1, label: "Prompt" },
  { screen: "cut" as const, n: 2, label: "Recortar" },
  { screen: "animate" as const, n: 3, label: "Animar" }
];

export const ROW_NAMES = ["IDLE", "WALK", "RUN", "JUMP", "ATTACK", "HURT", "DEATH"];

export function cloneData<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number.parseInt(String(n), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

export function parsePx(value: string): number {
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function canvasFromParams(p: PromptParams): { width: number; height: number } {
  return {
    width: p.labelW + p.cols * p.cellW,
    height: Math.max(1, p.clips.length) * p.cellH
  };
}

export function sheetFromParams(p: PromptParams): SheetPreset {
  const size = canvasFromParams(p);
  return {
    name: p.fileName || "spritesheet.png",
    width: size.width,
    height: size.height,
    cols: p.cols,
    rows: Math.max(1, p.clips.length),
    labelW: p.labelW,
    cellW: p.cellW,
    cellH: p.cellH,
    gutter: p.gutter,
    gapX: 0,
    gapY: 0
  };
}

export function originXFromPreset(p: SheetPreset): number {
  return p.width ? (p.labelW / p.width) * 100 : 0;
}
