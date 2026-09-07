"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from "react";
import type {
  AnimMode,
  EditorTab,
  FrameRect,
  Guide,
  PromptParams,
  ScreenId,
  ToastKind,
  Tool
} from "@/types";
import { CHROME_KEY, PROMPT_DEFAULTS, SCREENS, cloneData, sheetFromParams } from "@/lib/constants";
import {
  buildTestNegative,
  buildTestPrompt,
  copyText,
  frameZipPath,
  loadPromptParams,
  nextClipName,
  persistPromptParams,
  rowLabelName
} from "@/lib/prompt";
import {
  buildLockedGrid,
  buildPresetCuts,
  buildUniformCuts,
  cutsToGuides,
  frameRects,
  guidesFromPreset,
  lockedGridOrigin,
  minContentPadForImage,
  percents,
  scaledPromptCells,
  shiftLockedAxis,
  uid
} from "@/lib/guides";
import { detectGenericGrid, detectSpriteLayout, protectCutsFromContent, readImageData } from "@/lib/grid-detect";
import { frameOffsets, medianOffset, signedPx } from "@/lib/frame-align";
import { blobToDataUrl, buildAnimatedIndexHtml, cropFramePng } from "@/lib/export";
import { blobToUint8, buildZip, downloadBlob } from "@/lib/zip";
import { clearLearnMemory, learnMemory, learnStatusText, mixLearn, upsertLearn } from "@/lib/learn";
import { inferProjectTags, nameFromFile, newProjectId, slugifyName, type ProjectListItem, type SpriteProject } from "@/lib/project";
import {
  canUseFolderPicker,
  deleteProjectFolder,
  listProjectsInFolder,
  loadProjectFromFolder,
  loadRememberedHandle,
  makeSheetThumb,
  peekProject,
  pickLibraryFolder,
  queryFolderPermission,
  renameProjectInFolder,
  requestFolderPermission,
  revokeThumbUrls,
  saveProjectToFolder
} from "@/lib/project-fs";

type Toast = { msg: string; kind: ToastKind };

type AnimState = {
  playing: boolean;
  fps: number;
  loop: boolean;
  mode: AnimMode;
  row: number;
  clipIndex: number;
  rangeFrom: number;
  rangeTo: number;
  exportPick: number[];
};

type Ctx = {
  screen: ScreenId;
  tab: EditorTab;
  tool: Tool;
  setScreen: (s: ScreenId, focus?: string | null) => void;
  setTab: (t: EditorTab) => void;
  setTool: (t: Tool) => void;
  page: { title: string; sub: string };
  hasImage: boolean;
  imageUrl: string | null;
  imageEl: HTMLImageElement | null;
  imageW: number;
  imageH: number;
  fileName: string;
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
  safeMarginPx: number;
  setGapX: (n: number) => void;
  setGapY: (n: number) => void;
  setSafeMargin: (n: number) => void;
  setCols: (n: number) => void;
  setRows: (n: number) => void;
  guides: Guide[];
  activeGuideId: string | null;
  addAxis: "v" | "h";
  setAddAxis: (a: "v" | "h") => void;
  selectGuide: (id: string | null) => void;
  setGuidePercent: (id: string, pct: number, learn?: boolean) => void;
  addGuide: () => void;
  duplicateGuide: (id: string) => string | null;
  removeGuide: () => void;
  nudgeGuide: (deltaPx: number) => void;
  selectedFrame: number;
  selectFrame: (n: number) => void;
  zoom: number;
  setZoom: (z: number) => void;
  fitToView: () => void;
  zoomActual: () => void;
  snapEnabled: boolean;
  showRulers: boolean;
  showMinimap: boolean;
  learnEnabled: boolean;
  setSnapEnabled: (v: boolean) => void;
  setShowRulers: (v: boolean) => void;
  setShowMinimap: (v: boolean) => void;
  setLearnEnabled: (v: boolean) => void;
  chromeCollapsed: boolean;
  toggleChrome: () => void;
  guideThickness: number;
  guideColor: string;
  setGuideThickness: (n: number) => void;
  setGuideColor: (c: string) => void;
  brightness: number;
  contrast: number;
  cellOpacity: number;
  setBrightness: (n: number) => void;
  setContrast: (n: number) => void;
  setCellOpacity: (n: number) => void;
  promptParams: PromptParams;
  updatePrompt: (patch: Partial<PromptParams>, applyGrid?: boolean) => void;
  addClip: () => void;
  removeClip: (i: number) => void;
  duplicateClip: (i: number) => void;
  moveClip: (i: number, dir: number) => void;
  resetParams: () => void;
  applyPreset: (opts?: { toast?: boolean; switchScreen?: boolean; params?: PromptParams }) => void;
  detectGrid: () => void;
  resetGuides: () => void;
  applyGuides: () => void;
  lockUniformGrid: boolean;
  setLockUniformGrid: (v: boolean) => void;
  lockedCell: { w: number; h: number };
  gridOrigin: { x: number; y: number };
  setGridOrigin: (axis: "v" | "h", px: number) => void;
  autoCenterFrames: boolean;
  setAutoCenterFrames: (v: boolean) => void;
  alignOffset: { dx: number; dy: number } | null;
  alignGridFromFrames: () => void;
  history: { at: string; text: string }[];
  toast: Toast | null;
  openImage: (file: File) => void;
  openBatch: (files: FileList | File[]) => void;
  batchFiles: File[];
  exportZip: () => Promise<void>;
  exportBatch: () => Promise<void>;
  exportHtml: () => Promise<void>;
  anim: AnimState;
  setAnim: (patch: Partial<AnimState>) => void;
  togglePlay: () => void;
  stopPlay: () => void;
  stepAnim: (dir: number) => void;
  pickExport: (index: number, on?: boolean) => void;
  pickAll: (on: boolean) => void;
  pickOnlyCurrent: () => void;
  rects: FrameRect[];
  clipFrames: FrameRect[];
  clipTitle: string;
  learnStatus: string;
  clearLearn: () => void;
  copyPrompt: () => Promise<void>;
  copyNegative: () => Promise<void>;
  stageRef: RefObject<HTMLDivElement | null>;
  sheetRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  batchInputRef: RefObject<HTMLInputElement | null>;
  promptText: string;
  negativeText: string;
  folderSupported: boolean;
  libraryName: string | null;
  libraryReady: boolean;
  libraryNeedsPermission: boolean;
  projects: ProjectListItem[];
  projectName: string;
  currentProjectId: string | null;
  setProjectName: (name: string) => void;
  pickLibraryFolder: () => Promise<void>;
  reconnectLibrary: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  saveProject: (asNew?: boolean) => Promise<void>;
  startNewProject: (opts?: { name?: string; prompt?: Partial<PromptParams> }) => void;
  openProject: (slug: string) => Promise<void>;
  renameProject: (slug: string, name: string) => Promise<void>;
  deleteProject: (slug: string) => Promise<void>;
};

const SpriteCutContext = createContext<Ctx | null>(null);

function nowStamp() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

export function SpriteCutProvider({ children }: { children: ReactNode }) {
  const [screen, setScreenState] = useState<ScreenId>("about");
  const [tab, setTab] = useState<EditorTab>("guides");
  const [tool, setTool] = useState<Tool>("guides");
  const [promptParams, setPromptParams] = useState<PromptParams>(() => cloneData(PROMPT_DEFAULTS));
  const preset = useMemo(() => sheetFromParams(promptParams), [promptParams]);
  const [hasImage, setHasImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [imageW, setImageW] = useState(preset.width);
  const [imageH, setImageH] = useState(preset.height);
  const [fileName, setFileName] = useState(preset.name);
  const [cols, setColsState] = useState(preset.cols);
  const [rows, setRowsState] = useState(preset.rows);
  const [gapX, setGapX] = useState(0);
  const [gapY, setGapY] = useState(0);
  const [safeMarginPx, setSafeMarginPx] = useState(preset.gutter);
  const [lockUniformGrid, setLockUniformGridState] = useState(true);
  const [autoCenterFrames, setAutoCenterFrames] = useState(true);
  const [guides, setGuides] = useState<Guide[]>(() => {
    const built = buildLockedGrid({
      originX: preset.labelW,
      originY: 0,
      cellW: preset.cellW,
      cellH: preset.cellH,
      cols: preset.cols,
      rows: preset.rows,
      imageW: preset.width,
      imageH: preset.height
    });
    return cutsToGuides(built.xCuts, built.yCuts, preset.width, preset.height);
  });
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [addAxis, setAddAxis] = useState<"v" | "h">("v");
  const [selectedFrame, setSelectedFrame] = useState(1);
  const [zoom, setZoomState] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [learnEnabled, setLearnEnabled] = useState(true);
  const [chromeCollapsed, setChromeCollapsed] = useState(false);
  const [guideThickness, setGuideThickness] = useState(2);
  const [guideColor, setGuideColor] = useState("#00e7ff");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [cellOpacity, setCellOpacity] = useState(100);
  const [history, setHistory] = useState<{ at: string; text: string }[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [learnStatus, setLearnStatus] = useState("Memória: —");
  const [anim, setAnimState] = useState<AnimState>({
    playing: false,
    fps: 8,
    loop: true,
    mode: "row",
    row: 0,
    clipIndex: 0,
    rangeFrom: 1,
    rangeTo: 8,
    exportPick: []
  });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<number | null>(null);
  const learnTimer = useRef<number | null>(null);
  const playTimer = useRef<number | null>(null);
  const clipKeyRef = useRef("");
  const skipDetectRef = useRef(false);
  const imageFileRef = useRef<File | Blob | null>(null);
  const libraryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [libraryName, setLibraryName] = useState<string | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryNeedsPermission, setLibraryNeedsPermission] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectName, setProjectName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [currentCreatedAt, setCurrentCreatedAt] = useState<string | null>(null);
  const folderSupported = canUseFolderPicker();

  const rects = useMemo(() => frameRects(guides, imageW, imageH), [guides, imageW, imageH]);
  const [sheetPixels, setSheetPixels] = useState<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!imageEl || !hasImage) {
      setSheetPixels(null);
      return;
    }
    try {
      const w = imageEl.naturalWidth || imageW;
      const h = imageEl.naturalHeight || imageH;
      setSheetPixels({ data: readImageData(imageEl, w, h), w, h });
    } catch {
      setSheetPixels(null);
    }
  }, [imageEl, hasImage, imageW, imageH]);

  const alignOffset = useMemo(() => {
    if (!sheetPixels || !rects.length) return null;
    return medianOffset(frameOffsets(sheetPixels.data, sheetPixels.w, sheetPixels.h, rects));
  }, [sheetPixels, rects]);

  const clipFrames = useMemo(() => {
    if (!rects.length) return [];
    if (anim.mode === "all") return rects;
    if (anim.mode === "range") {
      const from = Math.max(1, anim.rangeFrom);
      const to = Math.max(from, anim.rangeTo);
      return rects.filter((r) => r.index >= from && r.index <= to);
    }
    const row = Math.max(0, Math.min(rows - 1, anim.row));
    return rects.filter((r) => r.row === row + 1);
  }, [rects, anim.mode, anim.rangeFrom, anim.rangeTo, anim.row, rows]);

  const clipTitle = anim.mode === "all" ? "Todos" : anim.mode === "range" ? "Intervalo" : rowLabelName(promptParams, anim.row);

  const promptText = useMemo(() => buildTestPrompt(promptParams), [promptParams]);
  const negativeText = useMemo(() => buildTestNegative(), []);

  const showToast = useCallback((msg: string, kind: ToastKind = "ok") => {
    setToast({ msg, kind });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const pushHistory = useCallback((text: string) => {
    setHistory((h) => [{ at: nowStamp(), text }, ...h].slice(0, 80));
  }, []);

  const persistParams = useCallback((next: PromptParams) => {
    setPromptParams(next);
    persistPromptParams(next);
  }, []);

  const applyCuts = useCallback((xCuts: number[], yCuts: number[], w: number, h: number) => {
    const next = cutsToGuides(xCuts, yCuts, w, h);
    setGuides(next);
    setColsState(Math.max(1, xCuts.length - 1));
    setRowsState(Math.max(1, yCuts.length - 1));
    setActiveGuideId(next.find((g) => g.axis === "v")?.id || next[0]?.id || null);
  }, []);

  const promptCellMetrics = useCallback(() => {
    const p = sheetFromParams(promptParams);
    const w = hasImage ? imageW : p.width;
    const h = hasImage ? imageH : p.height;
    const cells = scaledPromptCells(p.width, p.height, p.cellW, p.cellH, p.labelW, w, h);
    return { p, w, h, ...cells };
  }, [promptParams, hasImage, imageW, imageH]);

  const applyLockedGrid = useCallback(
    (
      originX: number,
      originY: number,
      nCols: number,
      nRows: number,
      cell?: { cellW: number; cellH: number }
    ) => {
      const metrics = promptCellMetrics();
      const w = metrics.w;
      const h = metrics.h;
      const cellW = cell?.cellW ?? metrics.cellW;
      const cellH = cell?.cellH ?? metrics.cellH;
      const built = buildLockedGrid({
        originX,
        originY,
        cellW,
        cellH,
        cols: nCols,
        rows: nRows,
        imageW: w,
        imageH: h
      });
      applyCuts(built.xCuts, built.yCuts, w, h);
      return { cellW, cellH };
    },
    [promptCellMetrics, applyCuts]
  );

  const lockedCell = useMemo(() => {
    const m = promptCellMetrics();
    return { w: m.cellW, h: m.cellH };
  }, [promptCellMetrics]);

  const gridOrigin = useMemo(() => {
    const p = sheetFromParams(promptParams);
    const w = hasImage ? imageW : p.width;
    const h = hasImage ? imageH : p.height;
    const o = lockedGridOrigin(guides, w, h);
    return { x: o.originX, y: o.originY };
  }, [guides, hasImage, imageW, imageH, promptParams]);

  const applyPreset = useCallback(
    (opts?: { toast?: boolean; switchScreen?: boolean; params?: PromptParams }) => {
      const p = sheetFromParams(opts?.params || promptParams);
      const w = hasImage ? imageW : p.width;
      const h = hasImage ? imageH : p.height;
      if (!hasImage) {
        setImageW(p.width);
        setImageH(p.height);
        setFileName(p.name);
      }
      setColsState(p.cols);
      setRowsState(p.rows);
      setGapX(p.gapX);
      setGapY(p.gapY);
      setSafeMarginPx(p.gutter);
      const scaleX = w / p.width;
      const scaleY = h / p.height;
      const sameLayout = Math.abs(scaleX - scaleY) < 0.02 || (w === p.width && h === p.height);
      let xCuts: number[];
      let yCuts: number[];
      if (sameLayout || !hasImage) {
        const sx = hasImage ? scaleX : 1;
        const sy = hasImage ? scaleY : 1;
        const built = buildPresetCuts(
          w,
          h,
          Math.round(p.labelW * sx),
          Math.round(p.cellW * sx),
          Math.round(p.cellH * sy),
          p.cols,
          p.rows
        );
        xCuts = built.xCuts;
        yCuts = built.yCuts;
        setSafeMarginPx(Math.max(minContentPadForImage(w, h), Math.round(p.gutter * Math.min(sx, sy))));
      } else {
        const x0 = Math.round(w * (p.labelW / p.width));
        xCuts = buildUniformCuts(x0, w, p.cols);
        yCuts = buildUniformCuts(0, h, p.rows);
        setSafeMarginPx(minContentPadForImage(w, h));
      }
      applyCuts(xCuts, yCuts, w, h);
      pushHistory("Preset do prompt aplicado (" + w + "×" + h + ")");
      if (opts?.toast !== false) showToast("Preset aplicado: " + p.cols + "×" + p.rows, "ok");
      if (opts?.switchScreen !== false) {
        setTab("guides");
        setScreenState("cut");
      }
    },
    [promptParams, hasImage, imageW, imageH, applyCuts, pushHistory, showToast]
  );

  const scheduleLearn = useCallback(
    (reason: string) => {
      if (!learnEnabled) return;
      if (learnTimer.current) window.clearTimeout(learnTimer.current);
      learnTimer.current = window.setTimeout(() => {
        const xs = percents(guides, "v");
        const ys = percents(guides, "h");
        if (xs.length < 2 || ys.length < 2) return;
        upsertLearn(cols + "x" + rows, { x: xs, y: ys, safeMarginPx, gapX, gapY }, reason);
        setLearnStatus(learnStatusText());
        pushHistory("Aprendizado: " + reason + " (" + cols + "x" + rows + ")");
      }, 450);
    },
    [learnEnabled, guides, cols, rows, safeMarginPx, gapX, gapY, pushHistory]
  );

  const setGuidePercent = useCallback(
    (id: string, pct: number, learn = true) => {
      setGuides((gs) => {
        if (lockUniformGrid) {
          const g = gs.find((x) => x.id === id);
          if (!g) return gs;
          return shiftLockedAxis(gs, g.axis, pct - g.percent);
        }
        return gs.map((g) => (g.id === id ? { ...g, percent: Math.max(0, Math.min(100, pct)) } : g));
      });
      if (learn) scheduleLearn("posição");
    },
    [scheduleLearn, lockUniformGrid]
  );

  const setScreen = useCallback(
    (s: ScreenId) => {
      if (s !== "animate") {
        setAnimState((a) => ({ ...a, playing: false }));
      }
      setScreenState(s);
      if (s === "cut") setTab("guides");
    },
    []
  );

  const fitToView = useCallback(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return;
    const sw = stage.clientWidth - 48;
    const sh = stage.clientHeight - 48;
    const rect = sheet.getBoundingClientRect();
    const baseW = rect.width / zoom || 1;
    const baseH = rect.height / zoom || 1;
    const next = Math.max(0.2, Math.min(4, Math.min(sw / baseW, sh / baseH)));
    setZoomState(next);
  }, [zoom]);

  const openImage = useCallback(
    (file: File, opts?: { detect?: boolean }) => {
      const looksImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
      if (!looksImage) {
        showToast("Selecione um arquivo de imagem.", "warn");
        return;
      }
      const detect = opts?.detect !== false;
      if (!detect) skipDetectRef.current = true;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        imageFileRef.current = file;
        setImageEl(img);
        setHasImage(true);
        setImageW(img.naturalWidth);
        setImageH(img.naturalHeight);
        setFileName(file.name);
        setScreenState("cut");
        if (!projectName.trim()) setProjectName(nameFromFile(file.name));
        pushHistory("Imagem aberta: " + file.name + " (" + img.naturalWidth + "×" + img.naturalHeight + ")");
        showToast("PNG carregada. Confira a grade e anime os clips.", "ok");
        requestAnimationFrame(() => fitToView());
      };
      img.onerror = () => showToast("Não foi possível carregar a imagem.", "warn");
      img.src = url;
    },
    [showToast, pushHistory, fitToView, projectName]
  );

  const detectGrid = useCallback(() => {
    if (!imageEl) {
      showToast("Abra uma spritesheet primeiro.", "warn");
      return;
    }
    const w = imageEl.naturalWidth || imageW;
    const h = imageEl.naturalHeight || imageH;
    const p = sheetFromParams(promptParams);
    const ratioOk = Math.abs(w / h - p.width / p.height) < 0.03;
    const exact = w === p.width && h === p.height;
    const scaled = ratioOk && Math.abs(w / p.width - h / p.height) < 0.02;
    const nCols = Math.max(1, cols);
    const nRows = Math.max(1, rows);
    const gutterHint = Math.max(safeMarginPx, p.gutter, minContentPadForImage(w, h));

    try {
      const data = readImageData(imageEl, w, h);
      const layout = detectSpriteLayout(data, w, h, { gutter: gutterHint });
      if (layout) {
        persistParams({
          ...promptParams,
          cols: layout.cols,
          cellW: layout.cellW,
          cellH: layout.cellH,
          labelW: 0,
          gutter: layout.pad
        });
        setSafeMarginPx(layout.pad);
        applyLockedGrid(layout.originX, layout.originY, layout.cols, layout.rows, {
          cellW: layout.cellW,
          cellH: layout.cellH
        });
        const msg =
          layout.blobs.length +
          " sprites · grade " +
          layout.cols +
          "×" +
          layout.rows +
          " · célula " +
          layout.cellW +
          "×" +
          layout.cellH;
        showToast(msg, "ok");
        pushHistory("Grade pela arte: " + msg);
        setTab("guides");
        return;
      }

      if (lockUniformGrid) {
        const cells = scaledPromptCells(p.width, p.height, p.cellW, p.cellH, p.labelW, w, h);
        let originX = cells.defaultOriginX;
        let originY = cells.defaultOriginY;
        const found = detectGenericGrid(data, w, h, nCols, nRows);
        if (found?.xCuts.length && found.yCuts.length) {
          originX = found.xCuts[0];
          originY = found.yCuts[0];
        }
        applyLockedGrid(originX, originY, p.cols, p.rows);
        showToast("Grade uniforme " + cells.cellW + "×" + cells.cellH + " px", "ok");
        pushHistory("Grade uniforme " + cells.cellW + "×" + cells.cellH);
        setTab("guides");
        return;
      }

      if (exact || scaled) {
        const sx = w / p.width;
        const sy = h / p.height;
        const built = buildPresetCuts(
          w,
          h,
          Math.round(p.labelW * sx),
          Math.round(p.cellW * sx),
          Math.round(p.cellH * sy),
          p.cols,
          p.rows
        );
        const pad = Math.max(safeMarginPx, minContentPadForImage(w, h), Math.round(p.gutter * Math.min(sx, sy)));
        const protectedCuts = protectCutsFromContent(data, w, h, built.xCuts, built.yCuts, pad);
        setSafeMarginPx(pad);
        applyCuts(protectedCuts.xCuts, protectedCuts.yCuts, w, h);
        const entry = learnMemory()[p.cols + "x" + p.rows];
        if (learnEnabled && entry) {
          const mixed = mixLearn(
            percents(cutsToGuides(protectedCuts.xCuts, protectedCuts.yCuts, w, h), "v"),
            percents(cutsToGuides(protectedCuts.xCuts, protectedCuts.yCuts, w, h), "h"),
            entry,
            pad
          );
          if (mixed) {
            applyCuts(
              mixed.x.map((pct) => Math.round((pct / 100) * w)),
              mixed.y.map((pct) => Math.round((pct / 100) * h)),
              w,
              h
            );
            setSafeMarginPx(mixed.safeMarginPx);
            showToast("Memória aplicada (" + Math.round(mixed.weight * 100) + "% dos seus ajustes)", "ok");
            return;
          }
        }
        showToast("Grade protegida: nada da arte é cortado (folga " + pad + "px)", "ok");
        return;
      }
      const found = detectGenericGrid(data, w, h, cols, rows);
      if (!found) {
        showToast("Área de sprites insuficiente para " + cols + "×" + rows + ".", "warn");
        return;
      }
      const pad = Math.max(safeMarginPx, minContentPadForImage(w, h));
      const protectedCuts = protectCutsFromContent(data, w, h, found.xCuts, found.yCuts, pad);
      setSafeMarginPx(pad);
      applyCuts(protectedCuts.xCuts, protectedCuts.yCuts, w, h);
      showToast("Grade " + cols + "×" + rows + " sem cortar a arte · folga " + pad + "px", "ok");
      pushHistory("Grade segura " + cols + "×" + rows + " · folga " + pad + "px");
      setTab("guides");
    } catch {
      showToast("Não foi possível ler a imagem.", "warn");
    }
  }, [
    imageEl,
    imageW,
    imageH,
    promptParams,
    safeMarginPx,
    applyCuts,
    applyLockedGrid,
    persistParams,
    lockUniformGrid,
    learnEnabled,
    cols,
    rows,
    showToast,
    pushHistory
  ]);

  const alignGridFromFrames = useCallback(() => {
    if (!imageEl || !hasImage) {
      showToast("Abra uma spritesheet primeiro.", "warn");
      return;
    }
    const w = imageEl.naturalWidth || imageW;
    const h = imageEl.naturalHeight || imageH;
    if (rects.length < 1) {
      showToast("Defina as guias antes de alinhar.", "warn");
      return;
    }
    let data: Uint8ClampedArray;
    try {
      data = sheetPixels && sheetPixels.w === w && sheetPixels.h === h ? sheetPixels.data : readImageData(imageEl, w, h);
    } catch {
      showToast("Não foi possível ler a imagem.", "warn");
      return;
    }
    const med = medianOffset(frameOffsets(data, w, h, rects));
    if (!med) {
      showToast("Nenhuma arte nas células para alinhar.", "warn");
      return;
    }
    const pad = Math.max(safeMarginPx, minContentPadForImage(w, h));
    const { defaultOriginX, defaultOriginY, cellW, cellH } = promptCellMetrics();
    try {
      if (lockUniformGrid) {
        const origin = lockedGridOrigin(guides, w, h);
        const nextX = (origin.originX ?? defaultOriginX) - med.dx;
        const nextY = (origin.originY ?? defaultOriginY) - med.dy;
        const built = buildLockedGrid({
          originX: nextX,
          originY: nextY,
          cellW,
          cellH,
          cols,
          rows,
          imageW: w,
          imageH: h
        });
        const protectedCuts = protectCutsFromContent(data, w, h, built.xCuts, built.yCuts, pad);
        applyLockedGrid(protectedCuts.xCuts[0] ?? nextX, protectedCuts.yCuts[0] ?? nextY, cols, rows);
      } else {
        const xs = percents(guides, "v").map((p) => Math.round((p / 100) * w) - med.dx);
        const ys = percents(guides, "h").map((p) => Math.round((p / 100) * h) - med.dy);
        const protectedCuts = protectCutsFromContent(data, w, h, xs, ys, pad);
        applyCuts(protectedCuts.xCuts, protectedCuts.yCuts, w, h);
      }
      pushHistory("Grade alinhada " + signedPx(med.dx) + "×" + signedPx(med.dy));
      showToast("Grade alinhada · Δx " + signedPx(med.dx) + "px Δy " + signedPx(med.dy) + "px", "ok");
    } catch {
      showToast("Não foi possível alinhar a grade.", "warn");
    }
  }, [
    imageEl,
    hasImage,
    imageW,
    imageH,
    rects,
    sheetPixels,
    safeMarginPx,
    promptCellMetrics,
    lockUniformGrid,
    guides,
    cols,
    rows,
    applyLockedGrid,
    applyCuts,
    pushHistory,
    showToast
  ]);

  useEffect(() => {
    if (!hasImage || !imageEl) return;
    if (skipDetectRef.current) {
      skipDetectRef.current = false;
      return;
    }
    detectGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage, imageEl]);

  const exportZip = useCallback(async () => {
    if (!hasImage || !imageEl) {
      showToast("Abra uma spritesheet antes de exportar.", "warn");
      return;
    }
    if (rects.length < 1) {
      showToast("Defina as guias antes de exportar.", "warn");
      return;
    }
    showToast("Cortando " + rects.length + " frames…");
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const blob = await cropFramePng(imageEl, rect, autoCenterFrames);
        const data = await blobToUint8(blob);
        files.push({
          name: frameZipPath(rowLabelName(promptParams, rect.row - 1), rect.col),
          data
        });
      }
      const manifest = {
        file: fileName,
        width: imageW,
        height: imageH,
        cols,
        rows,
        frames: rects.length,
        contentPadPx: safeMarginPx,
        cropMode: autoCenterFrames ? "centered-bbox" : "full-cell",
        guides: {
          x: percents(guides, "v").map((p) => Math.round((p / 100) * imageW)),
          y: percents(guides, "h").map((p) => Math.round((p / 100) * imageH))
        },
        clips: promptParams.clips.map((c, i) => ({
          name: c.name,
          folder: frameZipPath(rowLabelName(promptParams, i), 1).split("/")[0],
          frames: rects.filter((r) => r.row === i + 1).length
        })),
        frameRects: rects,
        exportedAt: new Date().toISOString()
      };
      files.push({ name: "manifest.json", data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
      downloadBlob(buildZip(files), fileName.replace(/\.[^.]+$/, "") + "_frames.zip");
      pushHistory("ZIP exportado: " + rects.length + " frames");
      showToast("ZIP pronto: uma pasta por clip (idle, walk, …)", "ok");
    } catch (err) {
      console.error(err);
      showToast("Falha ao exportar ZIP. Tente outra imagem/navegador.", "warn");
    }
  }, [hasImage, imageEl, rects, fileName, imageW, imageH, cols, rows, safeMarginPx, guides, promptParams, autoCenterFrames, pushHistory, showToast]);

  const exportHtml = useCallback(async () => {
    if (!hasImage || !imageEl) {
      showToast("Abra uma spritesheet antes de exportar o HTML.", "warn");
      return;
    }
    const picked = clipFrames.filter((f) => anim.exportPick.includes(f.index));
    if (!picked.length) {
      showToast("Marque ao menos 1 frame (✓) para exportar.", "warn");
      return;
    }
    showToast("Gerando HTML com " + picked.length + " frame(s)…");
    try {
      const frames = [];
      for (const rect of picked) {
        const blob = await cropFramePng(imageEl, rect, autoCenterFrames);
        const src = await blobToDataUrl(blob);
        frames.push({ src, w: rect.w, h: rect.h });
      }
      const title = (fileName.replace(/\.[^.]+$/, "") || "sprite") + " — " + clipTitle;
      const html = buildAnimatedIndexHtml({ title, fps: anim.fps, loop: anim.loop, frames });
      const safeClip = clipTitle.replace(/[^\w\-]+/g, "_");
      downloadBlob(
        new Blob([html], { type: "text/html;charset=utf-8" }),
        (fileName.replace(/\.[^.]+$/, "") || "sprite") + "_" + safeClip + "_index.html"
      );
      pushHistory("HTML animado: " + clipTitle + " (" + picked.length + " frames)");
      showToast("HTML pronto: " + picked.length + " frames · " + clipTitle, "ok");
    } catch (err) {
      console.error(err);
      showToast("Falha ao gerar HTML animado.", "warn");
    }
  }, [hasImage, imageEl, clipFrames, anim, fileName, clipTitle, autoCenterFrames, pushHistory, showToast]);

  const exportBatch = useCallback(async () => {
    if (!batchFiles.length) {
      showToast("Selecione imagens para o lote.", "warn");
      return;
    }
    showToast("Processando lote…");
    for (const file of batchFiles) {
      await new Promise<void>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = async () => {
          const w = img.naturalWidth,
            h = img.naturalHeight;
          const p = sheetFromParams(promptParams);
          const built = buildPresetCuts(w, h, Math.round(p.labelW * (w / p.width)), Math.round(p.cellW * (w / p.width)), Math.round(p.cellH * (h / p.height)), p.cols, p.rows);
          const localGuides = cutsToGuides(built.xCuts, built.yCuts, w, h);
          const localRects = frameRects(localGuides, w, h);
          const files: { name: string; data: Uint8Array }[] = [];
          for (const rect of localRects) {
            const blob = await cropFramePng(img, rect, autoCenterFrames);
            files.push({
              name: frameZipPath(rowLabelName(promptParams, rect.row - 1), rect.col),
              data: await blobToUint8(blob)
            });
          }
          downloadBlob(buildZip(files), file.name.replace(/\.[^.]+$/, "") + "_frames.zip");
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    }
    showToast("Lote exportado: " + batchFiles.length + " ZIP(s)", "ok");
    pushHistory("Lote exportado: " + batchFiles.length + " arquivos");
  }, [batchFiles, promptParams, autoCenterFrames, showToast, pushHistory]);

  useEffect(() => {
    const key = clipFrames.map((f) => f.index).join(",");
    if (key !== clipKeyRef.current) {
      clipKeyRef.current = key;
      setAnimState((a) => ({ ...a, exportPick: clipFrames.map((f) => f.index), clipIndex: 0 }));
    }
  }, [clipFrames]);

  useEffect(() => {
    if (!anim.playing) {
      if (playTimer.current) window.clearTimeout(playTimer.current);
      return;
    }
    if (!clipFrames.length) {
      setAnimState((a) => ({ ...a, playing: false }));
      return;
    }
    playTimer.current = window.setTimeout(() => {
      setAnimState((a) => {
        let next = a.clipIndex + 1;
        if (next >= clipFrames.length) {
          if (!a.loop) return { ...a, playing: false, clipIndex: clipFrames.length - 1 };
          next = 0;
        }
        return { ...a, clipIndex: next };
      });
    }, Math.max(16, 1000 / Math.max(1, anim.fps)));
    return () => {
      if (playTimer.current) window.clearTimeout(playTimer.current);
    };
  }, [anim.playing, anim.clipIndex, anim.fps, anim.loop, clipFrames.length]);

  useEffect(() => {
    document.documentElement.style.setProperty("--guide", guideColor);
  }, [guideColor]);

  useEffect(() => {
    const loaded = loadPromptParams();
    setPromptParams(loaded);
    persistPromptParams(loaded);
    applyPreset({ toast: false, switchScreen: false, params: loaded });
    const p = sheetFromParams(loaded);
    pushHistory("Sessão iniciada — preset " + p.width + "×" + p.height);
    setLearnStatus(learnStatusText());
    try {
      setChromeCollapsed(sessionStorage.getItem(CHROME_KEY) === "1");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshLibrary = useCallback(async () => {
    const root = libraryHandleRef.current;
    if (!root) {
      setProjects((prev) => {
        revokeThumbUrls(prev);
        return [];
      });
      setLibraryReady(false);
      return;
    }
    try {
      const items = await listProjectsInFolder(root);
      setProjects((prev) => {
        revokeThumbUrls(prev);
        return items;
      });
      setLibraryReady(true);
      setLibraryNeedsPermission(false);
    } catch {
      setLibraryReady(false);
      setLibraryNeedsPermission(true);
      showToast("Não foi possível ler a pasta de projetos.", "warn");
    }
  }, [showToast]);

  const attachLibrary = useCallback(
    async (handle: FileSystemDirectoryHandle, request = false) => {
      libraryHandleRef.current = handle;
      setLibraryName(handle.name);
      const status = await queryFolderPermission(handle, true);
      if (status === "granted") {
        setLibraryNeedsPermission(false);
        await refreshLibrary();
        return true;
      }
      if (request) {
        const ok = await requestFolderPermission(handle, true);
        if (ok) {
          setLibraryNeedsPermission(false);
          await refreshLibrary();
          return true;
        }
      }
      setLibraryNeedsPermission(true);
      setLibraryReady(false);
      return false;
    },
    [refreshLibrary]
  );

  const pickLibrary = useCallback(async () => {
    if (!canUseFolderPicker()) {
      showToast("Chrome ou Edge são precisos para escolher uma pasta local.", "warn");
      return;
    }
    try {
      const handle = await pickLibraryFolder();
      await attachLibrary(handle, false);
      showToast("Pasta ligada: " + handle.name, "ok");
      pushHistory("Pasta de projetos: " + handle.name);
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      showToast("Não foi possível escolher a pasta.", "warn");
    }
  }, [attachLibrary, showToast, pushHistory]);

  const reconnectLibrary = useCallback(async () => {
    const handle = libraryHandleRef.current || (await loadRememberedHandle());
    if (!handle) {
      await pickLibrary();
      return;
    }
    const ok = await attachLibrary(handle, true);
    if (ok) showToast("Pasta reconectada: " + handle.name, "ok");
    else showToast("Permissão recusada para a pasta.", "warn");
  }, [attachLibrary, pickLibrary, showToast]);

  const saveProject = useCallback(
    async (asNew = false) => {
      if (!canUseFolderPicker()) {
        showToast("Use Chrome ou Edge para guardar na pasta local.", "warn");
        return;
      }
      let root = libraryHandleRef.current;
      if (!root) {
        try {
          root = await pickLibraryFolder();
          await attachLibrary(root, false);
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") return;
          showToast("Escolha uma pasta para guardar os projetos.", "warn");
          return;
        }
      } else {
        const ok = await requestFolderPermission(root, true);
        if (!ok) {
          showToast("Sem permissão de escrita na pasta.", "warn");
          setLibraryNeedsPermission(true);
          return;
        }
      }

      const name = projectName.trim() || nameFromFile(fileName);
      const id = !asNew && currentProjectId ? currentProjectId : newProjectId();
      let slug = !asNew && currentSlug ? currentSlug : slugifyName(name);
      if (asNew || !currentProjectId) {
        let n = 2;
        let candidate = slug;
        while (true) {
          const existing = await peekProject(root, candidate);
          if (!existing || existing.id === id) {
            slug = candidate;
            break;
          }
          candidate = slugifyName(name) + "-" + n;
          n += 1;
        }
      }

      const now = new Date().toISOString();
      const project: SpriteProject = {
        version: 1,
        id,
        name,
        slug,
        createdAt: !asNew && currentCreatedAt ? currentCreatedAt : now,
        updatedAt: now,
        tags: inferProjectTags(promptParams, []),
        fileName,
        imageW,
        imageH,
        hasSheet: Boolean(hasImage && (imageFileRef.current || imageUrl)),
        prompt: cloneData(promptParams),
        guides,
        lockUniformGrid,
        cols,
        rows,
        gapX,
        gapY,
        safeMarginPx,
        guideColor,
        guideThickness,
        autoCenterFrames,
        anim: { fps: anim.fps, loop: anim.loop, mode: anim.mode, row: anim.row }
      };

      let sheet: Blob | null = imageFileRef.current;
      if (!sheet && imageUrl) {
        try {
          sheet = await fetch(imageUrl).then((r) => r.blob());
        } catch {
          sheet = null;
        }
      }
      const thumb = imageEl ? await makeSheetThumb(imageEl) : null;
      try {
        await saveProjectToFolder(root, project, sheet, thumb);
        setCurrentProjectId(id);
        setCurrentSlug(slug);
        setCurrentCreatedAt(project.createdAt);
        setProjectName(name);
        await refreshLibrary();
        pushHistory("Projeto guardado: " + name);
        showToast("Guardado em " + root.name + " / " + slug, "ok");
      } catch (err) {
        console.error(err);
        showToast("Falha ao escrever na pasta. Confirme a permissão.", "warn");
      }
    },
    [
      projectName,
      fileName,
      currentProjectId,
      currentSlug,
      currentCreatedAt,
      hasImage,
      imageUrl,
      imageEl,
      imageW,
      imageH,
      promptParams,
      guides,
      lockUniformGrid,
      cols,
      rows,
      gapX,
      gapY,
      safeMarginPx,
      guideColor,
      guideThickness,
      autoCenterFrames,
      anim.fps,
      anim.loop,
      anim.mode,
      anim.row,
      attachLibrary,
      refreshLibrary,
      pushHistory,
      showToast
    ]
  );

  const openProject = useCallback(
    async (slug: string) => {
      const root = libraryHandleRef.current;
      if (!root) {
        showToast("Escolha primeiro a pasta dos projetos.", "warn");
        return;
      }
      try {
        const { project, sheet } = await loadProjectFromFolder(root, slug);
        persistParams(project.prompt);
        setLockUniformGridState(project.lockUniformGrid);
        setGuides(project.guides);
        setColsState(project.cols);
        setRowsState(project.rows);
        setGapX(project.gapX);
        setGapY(project.gapY);
        setSafeMarginPx(project.safeMarginPx);
        setGuideColor(project.guideColor);
        setGuideThickness(project.guideThickness);
        setAutoCenterFrames(project.autoCenterFrames !== false);
        setAnimState((a) => ({
          ...a,
          playing: false,
          fps: project.anim.fps,
          loop: project.anim.loop,
          mode: project.anim.mode,
          row: project.anim.row,
          clipIndex: 0
        }));
        setCurrentProjectId(project.id);
        setCurrentSlug(project.slug);
        setCurrentCreatedAt(project.createdAt);
        setProjectName(project.name);
        setFileName(project.fileName);
        setImageW(project.imageW || 0);
        setImageH(project.imageH || 0);
        if (sheet) {
          const file = new File([sheet], project.fileName || "sheet.png", { type: sheet.type || "image/png" });
          openImage(file, { detect: false });
        } else {
          skipDetectRef.current = true;
          setHasImage(false);
          setImageEl(null);
          setImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          imageFileRef.current = null;
          setScreenState("about");
        }
        setActiveGuideId(project.guides.find((g) => g.axis === "v")?.id || project.guides[0]?.id || null);
        pushHistory("Projeto aberto: " + project.name);
        showToast("Aberto: " + project.name, "ok");
      } catch (err) {
        console.error(err);
        showToast("Não foi possível abrir este projeto.", "warn");
      }
    },
    [openImage, persistParams, pushHistory, showToast]
  );

  const deleteProject = useCallback(
    async (slug: string) => {
      const root = libraryHandleRef.current;
      if (!root) return;
      const ok = await requestFolderPermission(root, true);
      if (!ok) {
        showToast("Sem permissão para alterar a pasta.", "warn");
        setLibraryNeedsPermission(true);
        return;
      }
      try {
        await deleteProjectFolder(root, slug);
        if (currentSlug === slug) {
          setCurrentProjectId(null);
          setCurrentSlug(null);
          setCurrentCreatedAt(null);
        }
        await refreshLibrary();
        pushHistory("Projeto excluído: " + slug);
        showToast("Projeto excluído da pasta.", "ok");
      } catch {
        showToast("Não foi possível excluir o projeto.", "warn");
      }
    },
    [currentSlug, refreshLibrary, pushHistory, showToast]
  );

  const renameProject = useCallback(
    async (slug: string, name: string) => {
      const root = libraryHandleRef.current;
      if (!root) {
        showToast("Escolha primeiro a pasta dos projetos.", "warn");
        return;
      }
      const ok = await requestFolderPermission(root, true);
      if (!ok) {
        showToast("Sem permissão para alterar a pasta.", "warn");
        setLibraryNeedsPermission(true);
        return;
      }
      try {
        const next = await renameProjectInFolder(root, slug, name);
        if (currentSlug === slug || currentProjectId === next.id) {
          setCurrentSlug(next.slug);
          setProjectName(next.name);
        }
        await refreshLibrary();
        pushHistory("Projeto renomeado: " + next.name);
        showToast("Renomeado para «" + next.name + "»", "ok");
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "Não foi possível renomear.", "warn");
      }
    },
    [currentSlug, currentProjectId, refreshLibrary, pushHistory, showToast]
  );

  const startNewProject = useCallback(
    (opts?: { name?: string; prompt?: Partial<PromptParams> }) => {
      const next = { ...cloneData(PROMPT_DEFAULTS), ...(opts?.prompt || {}) };
      persistParams(next);
      setCurrentProjectId(null);
      setCurrentSlug(null);
      setCurrentCreatedAt(null);
      setProjectName(opts?.name || "");
      setAutoCenterFrames(true);
      applyPreset({ toast: false, switchScreen: false, params: next });
      setScreenState("about");
      pushHistory(opts?.name ? "Modelo: " + opts.name : "Novo projeto");
      showToast(opts?.name ? "Modelo «" + opts.name + "» no prompt." : "Novo projeto. Copie o prompt e gere a PNG.", "ok");
    },
    [persistParams, applyPreset, pushHistory, showToast]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const handle = await loadRememberedHandle();
        if (cancelled || !handle) return;
        libraryHandleRef.current = handle;
        setLibraryName(handle.name || "Pasta local");
        const status = await queryFolderPermission(handle, true);
        if (cancelled) return;
        if (status === "granted") {
          setLibraryNeedsPermission(false);
          await refreshLibrary();
        } else {
          setLibraryNeedsPermission(true);
          setLibraryReady(false);
        }
      } catch {
        if (!cancelled) {
          setLibraryNeedsPermission(true);
          setLibraryReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLibrary]);

  const page = SCREENS[screen] || SCREENS.cut;

  const value: Ctx = {
    screen,
    tab,
    tool,
    setScreen,
    setTab,
    setTool,
    page,
    hasImage,
    imageUrl,
    imageEl,
    imageW,
    imageH,
    fileName,
    cols,
    rows,
    gapX,
    gapY,
    safeMarginPx,
    setGapX,
    setGapY,
    setSafeMargin: setSafeMarginPx,
    setCols: (n) => {
      const v = Math.max(1, Math.min(32, n));
      persistParams({ ...promptParams, cols: v });
      if (lockUniformGrid) {
        applyLockedGrid(gridOrigin.x, gridOrigin.y, v, rows);
      } else {
        setColsState(v);
      }
    },
    setRows: (n) => {
      const v = Math.max(1, Math.min(32, n));
      const clips = [...promptParams.clips];
      while (clips.length < v) clips.push({ name: "LINHA " + (clips.length + 1), desc: "" });
      while (clips.length > v) clips.pop();
      persistParams({ ...promptParams, clips });
      if (lockUniformGrid) {
        applyLockedGrid(gridOrigin.x, gridOrigin.y, cols, v);
      } else {
        setRowsState(v);
      }
    },
    guides,
    activeGuideId,
    addAxis,
    setAddAxis,
    selectGuide: setActiveGuideId,
    setGuidePercent,
    addGuide: () => {
      const same = guides.filter((g) => g.axis === addAxis);
      const active = guides.find((g) => g.id === activeGuideId);
      let pct = 50;
      if (active && active.axis === addAxis) pct = Math.min(100, active.percent + 3);
      else if (same.length) pct = Math.min(100, Math.max(...same.map((g) => g.percent)) + 3);
      const id = uid(addAxis);
      setGuides((gs) => [...gs, { id, axis: addAxis, percent: pct }]);
      setActiveGuideId(id);
      pushHistory("Guia " + (addAxis === "v" ? "vertical" : "horizontal") + " adicionada");
    },
    duplicateGuide: (id) => {
      const src = guides.find((g) => g.id === id);
      if (!src) return null;
      const nextId = uid(src.axis);
      if (lockUniformGrid) {
        setLockUniformGridState(false);
        showToast("Células iguais desligadas: a cópia é uma guia independente", "ok");
      }
      setGuides((gs) => {
        const origin = gs.find((g) => g.id === id) || src;
        return [...gs, { id: nextId, axis: origin.axis, percent: origin.percent }];
      });
      setActiveGuideId(nextId);
      pushHistory("Guia duplicada");
      return nextId;
    },
    removeGuide: () => {
      if (!activeGuideId) return;
      const rest = guides.filter((g) => g.id !== activeGuideId);
      setGuides(rest);
      setActiveGuideId(rest[0]?.id || null);
      pushHistory("Guia removida");
    },
    nudgeGuide: (deltaPx) => {
      if (lockUniformGrid) {
        const g = guides.find((x) => x.id === activeGuideId);
        const axis = g?.axis === "h" ? "h" : "v";
        applyLockedGrid(
          gridOrigin.x + (axis === "v" ? deltaPx : 0),
          gridOrigin.y + (axis === "h" ? deltaPx : 0),
          cols,
          rows
        );
        scheduleLearn("posição");
        return;
      }
      const g = guides.find((x) => x.id === activeGuideId);
      if (!g) return;
      const total = g.axis === "v" ? imageW : imageH;
      const next = Math.max(0, Math.min(total, (g.percent / 100) * total + deltaPx));
      setGuidePercent(g.id, (next / total) * 100);
    },
    selectedFrame,
    selectFrame: setSelectedFrame,
    zoom,
    setZoom: (z) => setZoomState(Math.max(0.2, Math.min(6, z))),
    fitToView,
    zoomActual: () => setZoomState(1),
    snapEnabled,
    showRulers,
    showMinimap,
    learnEnabled,
    setSnapEnabled,
    setShowRulers,
    setShowMinimap,
    setLearnEnabled,
    chromeCollapsed,
    toggleChrome: () => {
      setChromeCollapsed((c) => {
        const next = !c;
        try {
          sessionStorage.setItem(CHROME_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    guideThickness,
    guideColor,
    setGuideThickness,
    setGuideColor,
    brightness,
    contrast,
    cellOpacity,
    setBrightness,
    setContrast,
    setCellOpacity,
    promptParams,
    updatePrompt: (patch, applyGrid) => {
      const next = { ...promptParams, ...patch };
      persistParams(next);
      if (applyGrid) applyPreset({ toast: false, switchScreen: false, params: next });
    },
    addClip: () => {
      const clips = [...promptParams.clips, { name: "LINHA " + (promptParams.clips.length + 1), desc: "" }];
      persistParams({ ...promptParams, clips });
      applyPreset({ toast: false, switchScreen: false });
    },
    removeClip: (i) => {
      if (promptParams.clips.length <= 1) return;
      const clips = promptParams.clips.filter((_, idx) => idx !== i);
      persistParams({ ...promptParams, clips });
      applyPreset({ toast: false, switchScreen: false });
    },
    duplicateClip: (i) => {
      if (promptParams.clips.length >= 32) return;
      const src = promptParams.clips[i];
      const copy = { name: nextClipName(promptParams, src.name), desc: src.desc };
      const clips = [...promptParams.clips];
      clips.splice(i + 1, 0, copy);
      persistParams({ ...promptParams, clips });
      applyPreset({ toast: false, switchScreen: false });
      showToast("Linha duplicada: " + copy.name, "ok");
    },
    moveClip: (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= promptParams.clips.length) return;
      const clips = [...promptParams.clips];
      const tmp = clips[i];
      clips[i] = clips[j];
      clips[j] = tmp;
      persistParams({ ...promptParams, clips });
    },
    resetParams: () => {
      persistParams(cloneData(PROMPT_DEFAULTS));
      showToast("Parâmetros restaurados ao padrão da raposa 8×7", "ok");
      pushHistory("Parâmetros do prompt restaurados");
      setTimeout(() => applyPreset({ toast: false, switchScreen: false }), 0);
    },
    applyPreset,
    detectGrid,
    resetGuides: () => {
      applyPreset({ toast: false });
      showToast("Guias redefinidas para o preset do prompt.", "ok");
      pushHistory("Guias redefinidas (preset)");
    },
    applyGuides: () => {
      const { defaultOriginX, defaultOriginY, cellW, cellH, w, h, p } = promptCellMetrics();
      if (lockUniformGrid) {
        const origin = lockedGridOrigin(guides, w, h);
        applyLockedGrid(origin.originX ?? defaultOriginX, origin.originY ?? defaultOriginY, cols, rows);
        pushHistory("Grade uniforme " + cellW + "×" + cellH + " (" + cols + "×" + rows + ")");
        showToast("Células iguais: " + cellW + "×" + cellH + " px", "ok");
        return;
      }
      setGuides(guidesFromPreset({ ...p, cols, rows }, w, h, gapX, gapY));
      pushHistory("Guias aplicadas (" + cols + "×" + rows + ", margem " + safeMarginPx + "px)");
      showToast("Guias + margem segura aplicadas", "ok");
    },
    lockUniformGrid,
    setLockUniformGrid: (v: boolean) => {
      setLockUniformGridState(v);
      if (v) {
        const { defaultOriginX, defaultOriginY, w, h } = promptCellMetrics();
        const origin = lockedGridOrigin(guides, w, h);
        applyLockedGrid(origin.originX ?? defaultOriginX, origin.originY ?? defaultOriginY, cols, rows);
        showToast("Células iguais ligadas", "ok");
      }
    },
    lockedCell,
    gridOrigin,
    setGridOrigin: (axis: "v" | "h", px: number) => {
      const { defaultOriginX, defaultOriginY, w, h } = promptCellMetrics();
      const origin = lockedGridOrigin(guides, w, h);
      const nextX = axis === "v" ? Math.round(px) : origin.originX ?? defaultOriginX;
      const nextY = axis === "h" ? Math.round(px) : origin.originY ?? defaultOriginY;
      applyLockedGrid(nextX, nextY, cols, rows);
    },
    autoCenterFrames,
    setAutoCenterFrames,
    alignOffset: alignOffset ? { dx: alignOffset.dx, dy: alignOffset.dy } : null,
    alignGridFromFrames,
    history,
    toast,
    openImage,
    openBatch: (files) => setBatchFiles(Array.from(files)),
    batchFiles,
    exportZip,
    exportBatch,
    exportHtml,
    anim,
    setAnim: (patch) => setAnimState((a) => ({ ...a, ...patch })),
    togglePlay: () => {
      if (!clipFrames.length) {
        showToast("Nenhum frame no clip. Ajuste as guias ou o intervalo.", "warn");
        return;
      }
      if (!hasImage) {
        showToast("Abra uma spritesheet antes de animar.", "warn");
        return;
      }
      setAnimState((a) => ({ ...a, playing: !a.playing }));
    },
    stopPlay: () => setAnimState((a) => ({ ...a, playing: false, clipIndex: 0 })),
    stepAnim: (dir) => {
      if (!clipFrames.length) return;
      setAnimState((a) => ({
        ...a,
        playing: false,
        clipIndex: (a.clipIndex + dir + clipFrames.length) % clipFrames.length
      }));
    },
    pickExport: (index, on) => {
      setAnimState((a) => {
        const set = new Set(a.exportPick);
        const should = on ?? !set.has(index);
        if (should) set.add(index);
        else set.delete(index);
        return { ...a, exportPick: [...set] };
      });
    },
    pickAll: (on) => setAnimState((a) => ({ ...a, exportPick: on ? clipFrames.map((f) => f.index) : [] })),
    pickOnlyCurrent: () => {
      const cur = clipFrames[anim.clipIndex];
      setAnimState((a) => ({ ...a, exportPick: cur ? [cur.index] : [] }));
    },
    rects,
    clipFrames,
    clipTitle,
    learnStatus,
    clearLearn: () => {
      clearLearnMemory();
      setLearnStatus(learnStatusText());
      showToast("Aprendizado limpo", "ok");
    },
    copyPrompt: async () => {
      const ok = await copyText(promptText);
      showToast(ok ? "Prompt copiado. Cole no gerador e abra a PNG no passo 2." : "Não foi possível copiar", ok ? "ok" : "warn");
    },
    copyNegative: async () => {
      const ok = await copyText(negativeText);
      showToast(ok ? "Negativo copiado" : "Não foi possível copiar", ok ? "ok" : "warn");
    },
    stageRef,
    sheetRef,
    fileInputRef,
    batchInputRef,
    promptText,
    negativeText,
    folderSupported,
    libraryName,
    libraryReady,
    libraryNeedsPermission,
    projects,
    projectName,
    currentProjectId,
    setProjectName,
    pickLibraryFolder: pickLibrary,
    reconnectLibrary,
    refreshLibrary,
    saveProject,
    startNewProject,
    openProject,
    renameProject,
    deleteProject
  };

  return <SpriteCutContext.Provider value={value}>{children}</SpriteCutContext.Provider>;
}

export function useSpriteCut() {
  const ctx = useContext(SpriteCutContext);
  if (!ctx) throw new Error("useSpriteCut deve estar dentro de SpriteCutProvider");
  return ctx;
}

