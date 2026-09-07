export type ScreenId = "cut" | "animate" | "batch" | "settings" | "history" | "about" | "gallery";
export type EditorTab = "view" | "guides" | "adjust";
export type Tool = "pan" | "guides";
export type GuideAxis = "v" | "h";
export type AnimMode = "row" | "all" | "range";
export type ToastKind = "ok" | "warn";

export type Clip = {
  name: string;
  desc: string;
};

export type PromptParams = {
  cols: number;
  labelW: number;
  cellW: number;
  cellH: number;
  gutter: number;
  character: string;
  style: string;
  extra: string;
  fileName: string;
  clips: Clip[];
};

export type SheetPreset = {
  name: string;
  width: number;
  height: number;
  cols: number;
  rows: number;
  labelW: number;
  cellW: number;
  cellH: number;
  gutter: number;
  gapX: number;
  gapY: number;
};

export type Guide = {
  id: string;
  axis: GuideAxis;
  percent: number;
};

export type FrameRect = {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type HistoryItem = {
  at: string;
  text: string;
};

export type LearnEntry = {
  count: number;
  x: number[];
  y: number[];
  safeMarginPx: number;
  gapX: number;
  gapY: number;
  lastReason: string;
  updatedAt: number;
};
