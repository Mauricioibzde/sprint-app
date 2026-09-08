"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  Copy,
  Crop,
  Eye,
  FolderOpen,
  ImageIcon,
  Lock,
  Maximize2,
  Pause,
  Pencil,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Trash2
} from "lucide-react";
import { FramePreview } from "@/components/ui/FramePreview";
import { TutorialDialog } from "@/components/shell/Sidebar";
import { useSpriteCut } from "@/context/sprite-cut-context";
import { paintRectPreview } from "@/lib/export";
import { nextClipName, rowLabelName } from "@/lib/prompt";
import type { AnimMode } from "@/types";

function blitFrame(dest: HTMLCanvasElement, src: HTMLCanvasElement) {
  const ctx = dest.getContext("2d");
  if (!ctx) return;
  if (dest.width !== src.width) dest.width = src.width;
  if (dest.height !== src.height) dest.height = src.height;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, dest.width, dest.height);
  ctx.drawImage(src, 0, 0);
}

function formatTime(frameIndex: number, fps: number) {
  const sec = Math.max(0, frameIndex) / Math.max(1, fps);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function PixelKnight({ pose = 0 }: { pose?: 0 | 1 | 2 }) {
  const shift = pose === 1 ? 1 : pose === 2 ? 2 : 0;
  return (
    <svg className="anim-knight" viewBox="0 0 32 40" aria-hidden>
      <g transform={`translate(${shift} 0)`}>
        <rect x="18" y="1" width="3" height="5" fill="#ef4444" />
        <rect x="10" y="3" width="12" height="3" fill="#eab308" />
        <rect x="8" y="6" width="16" height="8" fill="#facc15" />
        <rect x="10" y="9" width="12" height="3" fill="#0f172a" />
        <rect x="11" y="10" width="4" height="1" fill="#38bdf8" />
        <rect x="17" y="10" width="4" height="1" fill="#38bdf8" />
        <rect x="10" y="14" width="12" height="11" fill="#ca8a04" />
        <rect x="12" y="16" width="8" height="7" fill="#facc15" />
        <rect x="14" y="18" width="4" height="3" fill="#b91c1c" />
        <rect x="1" y="15" width="9" height="11" fill="#2563eb" />
        <rect x="3" y="17" width="5" height="7" fill="#93c5fd" />
        <rect x="2" y="20" width="7" height="2" fill="#1d4ed8" />
        <rect x="23" y="12" width="3" height="16" fill="#e2e8f0" />
        <rect x="22" y="10" width="5" height="3" fill="#f8fafc" />
        <rect x="24" y="7" width="2" height="4" fill="#94a3b8" />
        <rect x="9" y="25" width="5" height={pose === 2 ? 8 : 10} fill="#a16207" />
        <rect x="18" y="25" width="5" height={pose === 1 ? 8 : 10} fill="#a16207" />
        <rect x="8" y={pose === 2 ? 33 : 35} width="7" height="3" fill="#1e293b" />
        <rect x="17" y={pose === 1 ? 33 : 35} width="7" height="3" fill="#1e293b" />
      </g>
    </svg>
  );
}

function AnimateHead({ onHow }: { onHow: () => void }) {
  return (
    <div className="page-head anim-head">
      <div>
        <h2>Animar</h2>
        <p>Pré-visualize, edite a animação e exporte em HTML ou ZIP para o jogo.</p>
      </div>
      <button type="button" className="how-btn" onClick={onHow}>
        <CircleHelp size={16} strokeWidth={1.75} />
        Como funciona?
      </button>
    </div>
  );
}

function AnimateEmpty({ onOpen, onBack }: { onOpen: () => void; onBack: () => void }) {
  return (
    <article className="anim-empty-card">
      <div className="anim-empty-hero">
        <div className="anim-empty-art" aria-hidden>
          <span className="anim-empty-orbit anim-empty-orbit-a" />
          <span className="anim-empty-orbit anim-empty-orbit-b" />
          <span className="anim-empty-arrow" />
          <div className="anim-empty-stack">
            <div className="anim-empty-frame f1">
              <PixelKnight pose={0} />
            </div>
            <div className="anim-empty-frame f2">
              <PixelKnight pose={1} />
            </div>
            <div className="anim-empty-frame f3">
              <PixelKnight pose={2} />
              <span className="anim-empty-play">
                <Play size={22} strokeWidth={2.4} fill="currentColor" />
              </span>
            </div>
          </div>
        </div>
        <div className="anim-empty-copy">
          <span className="anim-empty-badge">Quase lá!</span>
          <h3>Ainda não há spritesheet nesta sessão</h3>
          <p>
            Gere uma PNG com o prompt e abra-a em Recortar. Depois cada linha (IDLE, WALK, …) vira um clip para
            pré-visualizar e exportar.
          </p>
          <div className="anim-empty-actions">
            <button type="button" className="btn primary" onClick={onOpen}>
              <FolderOpen size={18} strokeWidth={1.75} /> Abrir PNG
            </button>
            <button type="button" className="btn ghost" onClick={onBack}>
              <ArrowLeft size={16} strokeWidth={1.75} /> Voltar ao prompt
            </button>
          </div>
        </div>
      </div>
      <ol className="anim-empty-steps">
        <li>
          <span className="anim-empty-step-ico">
            <ImageIcon size={18} strokeWidth={1.75} />
          </span>
          <div>
            <strong>Gere a PNG</strong>
            <span>Use o prompt e crie a imagem com fundo transparente.</span>
          </div>
        </li>
        <li>
          <span className="anim-empty-step-ico">
            <Crop size={18} strokeWidth={1.75} />
          </span>
          <div>
            <strong>Abra em Recortar</strong>
            <span>A grade será aplicada automaticamente.</span>
          </div>
        </li>
        <li>
          <span className="anim-empty-step-ico">
            <Play size={18} strokeWidth={1.75} fill="currentColor" />
          </span>
          <div>
            <strong>Anime os clips</strong>
            <span>Pré-visualize e exporte ZIP ou HTML.</span>
          </div>
        </li>
      </ol>
    </article>
  );
}

export function AnimateScreen() {
  const app = useSpriteCut();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<HTMLCanvasElement[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [zoom, setZoom] = useState(200);
  const [showGrid, setShowGrid] = useState(true);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const [mobileTab, setMobileTab] = useState<"preview" | "clips">("preview");
  const current = app.clipFrames[app.anim.clipIndex];
  const totalFrames = app.clipFrames.length;
  const durationLabel = formatTime(Math.max(0, totalFrames - 1), app.anim.fps);
  const currentLabel = formatTime(app.anim.clipIndex, app.anim.fps);

  useEffect(() => {
    cacheRef.current = app.clipFrames.map((rect) => {
      const c = document.createElement("canvas");
      paintRectPreview(c, app.imageEl, rect, 512, app.autoCenterFrames);
      return c;
    });
    const dest = canvasRef.current;
    const src = cacheRef.current[app.anim.clipIndex];
    if (dest && src) blitFrame(dest, src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.imageEl, app.clipFrames, app.autoCenterFrames]);

  useEffect(() => {
    const dest = canvasRef.current;
    const src = cacheRef.current[app.anim.clipIndex];
    if (dest && src) blitFrame(dest, src);
  }, [app.anim.clipIndex]);

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [app.anim.clipIndex]);

  const invertSelection = () => {
    const set = new Set(app.anim.exportPick);
    app.setAnim({
      exportPick: app.clipFrames.filter((f) => !set.has(f.index)).map((f) => f.index)
    });
  };

  const reverseSelection = () => {
    app.setAnim({ exportPick: [...app.anim.exportPick].reverse() });
  };

  const duplicateSelection = () => {
    if (!app.anim.exportPick.length) {
      app.pickOnlyCurrent();
      return;
    }
    app.setAnim({ exportPick: [...app.anim.exportPick, ...app.anim.exportPick] });
  };

  const addClip = () => {
    const name = nextClipName(app.promptParams, "IDLE");
    app.updatePrompt(
      {
        clips: [...app.promptParams.clips, { name, desc: "nova animação" }]
      },
      true
    );
    app.setAnim({
      mode: "row",
      row: app.promptParams.clips.length,
      clipIndex: 0,
      playing: false,
      playDir: 1
    });
  };

  const goStart = () => app.setAnim({ clipIndex: 0, playing: false, playDir: 1 });
  const goEnd = () =>
    app.setAnim({
      clipIndex: Math.max(0, totalFrames - 1),
      playing: false,
      playDir: 1
    });

  const modeLabel = useMemo(() => {
    if (app.anim.mode === "all") return "Todos os frames";
    if (app.anim.mode === "range") return "Intervalo";
    return "Por linha (animação)";
  }, [app.anim.mode]);

  if (!app.hasImage) {
    return (
      <section className="screen-page animate-page" id="screen-animate">
        <AnimateHead onHow={() => setHowOpen(true)} />
        <AnimateEmpty
          onOpen={() => app.fileInputRef.current?.click()}
          onBack={() => app.setScreen("about")}
        />
        <TutorialDialog open={howOpen} onClose={() => setHowOpen(false)} />
      </section>
    );
  }

  return (
    <section className="screen-page anim-page animate-page" id="screen-animate">
      <AnimateHead onHow={() => setHowOpen(true)} />
      <div className="anim-mobile-tabs" role="tablist" aria-label="Secções do Animar">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "preview"}
          className={mobileTab === "preview" ? "active" : ""}
          onClick={() => setMobileTab("preview")}
        >
          Pré-visualização
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "clips"}
          className={mobileTab === "clips" ? "active" : ""}
          onClick={() => setMobileTab("clips")}
        >
          Clips
        </button>
      </div>

      <div className={"anim-layout" + (mobileTab === "clips" ? " show-clips" : " show-preview")}>
        <div className="anim-main">
          <div className={"anim-stage" + (showGrid ? " has-grid" : "")}>
            <div className="anim-stage-toolbar">
              <label className="anim-zoom">
                <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom">
                  <option value={100}>100%</option>
                  <option value={150}>150%</option>
                  <option value={200}>200%</option>
                  <option value={300}>300%</option>
                </select>
                <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
              </label>
              <button
                type="button"
                className="icon-btn"
                title="Ecrã inteiro"
                onClick={() => {
                  const wrap = canvasRef.current?.parentElement;
                  void wrap?.requestFullscreen?.();
                }}
              >
                <Maximize2 size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div
              className={"anim-canvas-wrap fit-" + fitMode}
              style={{ ["--anim-zoom" as string]: String(zoom / 100) }}
            >
              {current ? (
                <canvas id="anim-canvas" ref={canvasRef} width={512} height={256} aria-label="Preview da animação" />
              ) : (
                <div className="anim-empty-preview">
                  <span className="anim-empty-ico" aria-hidden />
                  <strong>Sprite em pré-visualização</strong>
                  <p>A animação será exibida aqui.</p>
                </div>
              )}
            </div>

            <div className="anim-transport">
              <div className="anim-transport-left">
                <button type="button" className="icon-btn" title="Início" onClick={goStart}>
                  <SkipBack size={16} strokeWidth={1.75} />
                </button>
                <button type="button" className="icon-btn" title="Frame anterior" onClick={() => app.stepAnim(-1)}>
                  <StepBack size={16} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className={"anim-play" + (app.anim.playing ? " playing" : "")}
                  onClick={app.togglePlay}
                  title="Play / Pause"
                >
                  {app.anim.playing ? <Pause size={18} strokeWidth={2} /> : <Play size={18} strokeWidth={2} />}
                </button>
                <button type="button" className="icon-btn" title="Próximo frame" onClick={() => app.stepAnim(1)}>
                  <StepForward size={16} strokeWidth={1.75} />
                </button>
                <button type="button" className="icon-btn" title="Fim" onClick={goEnd}>
                  <SkipForward size={16} strokeWidth={1.75} />
                </button>
                <span className="anim-timecode">
                  {currentLabel} / {durationLabel}
                </span>
              </div>
              <div className="anim-transport-right">
                <label className="anim-inline-field">
                  <span>FPS</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={app.anim.fps}
                    onChange={(e) => app.setAnim({ fps: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                  />
                </label>
                <label className="anim-inline-field">
                  <span>Velocidade</span>
                  <select value={app.anim.speed} onChange={(e) => app.setAnim({ speed: Number(e.target.value) })}>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1.0x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2.0x</option>
                  </select>
                </label>
                <label className={"anim-switch" + (app.anim.loop ? " on" : "")}>
                  <input
                    type="checkbox"
                    checked={app.anim.loop}
                    onChange={(e) => app.setAnim({ loop: e.target.checked })}
                  />
                  <span className="anim-switch-ui" aria-hidden />
                  Loop
                </label>
                <label className={"anim-switch cyan" + (showGrid ? " on" : "")}>
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  <span className="anim-switch-ui" aria-hidden />
                  Grade
                </label>
                <label className="anim-inline-field">
                  <span>Ajustar</span>
                  <select value={fitMode} onChange={(e) => setFitMode(e.target.value as "contain" | "cover")}>
                    <option value="contain">Contido</option>
                    <option value="cover">Preencher</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="anim-timeline">
            <div className="anim-timeline-toolbar">
              <button type="button" className="icon-btn" title="Limpar seleção" onClick={() => app.pickAll(false)}>
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
              <button type="button" className="icon-btn" title="Duplicar seleção" onClick={duplicateSelection}>
                <Copy size={15} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="btn tiny"
                onClick={() => app.setAnim({ mode: "range", playing: false })}
              >
                <Plus size={14} strokeWidth={1.75} /> Adicionar frames
              </button>
            </div>

            <div className="anim-timeline-track">
              <div className="anim-layer">
                <strong>Layer 1</strong>
                <span>
                  <Eye size={14} strokeWidth={1.75} aria-hidden />
                  <Lock size={14} strokeWidth={1.75} aria-hidden />
                </span>
              </div>
              <div className="anim-strip-wrap">
                <div
                  className="anim-playhead"
                  style={{
                    left: totalFrames ? `calc(${(app.anim.clipIndex + 0.5) / totalFrames} * 100%)` : "12px"
                  }}
                >
                  <b>{app.anim.clipIndex}</b>
                </div>
                <div className="anim-strip" ref={stripRef} aria-label="Frames do clip">
                  {app.clipFrames.length ? (
                    app.clipFrames.map((frame, i) => {
                      const on = app.anim.exportPick.includes(frame.index);
                      return (
                        <button
                          key={frame.index + "-" + i}
                          type="button"
                          data-active={i === app.anim.clipIndex ? "true" : "false"}
                          className={
                            (i === app.anim.clipIndex ? "active " : "") + (on ? "export-on" : "export-off")
                          }
                          onClick={() => app.setAnim({ clipIndex: i, playing: false })}
                        >
                          <span
                            className="pick"
                            onClick={(e) => {
                              e.stopPropagation();
                              app.pickExport(frame.index);
                            }}
                          />
                          <FramePreview
                            img={app.imageEl}
                            rect={frame}
                            maxSide={56}
                            center={app.autoCenterFrames}
                          />
                          <span className="frame-n">{frame.index}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="anim-strip-empty">Nenhum frame. Ajuste as guias ou o intervalo.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="anim-edit-tools">
              <span>Ferramentas de edição</span>
              <div>
                <button type="button" className="btn tiny" onClick={() => app.pickAll(true)}>
                  Marcar todos
                </button>
                <button type="button" className="btn tiny" onClick={() => app.pickAll(false)}>
                  Desmarcar
                </button>
                <button type="button" className="btn tiny" onClick={() => app.pickAll(false)}>
                  Limpar
                </button>
                <button type="button" className="btn tiny" onClick={duplicateSelection}>
                  Duplicar
                </button>
                <button type="button" className="btn tiny" onClick={invertSelection}>
                  Inverter
                </button>
                <button type="button" className="btn tiny" onClick={reverseSelection}>
                  Reverter
                </button>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => app.setAnim({ clipIndex: Math.max(0, app.anim.clipIndex - 1), playing: false })}
                >
                  Comparar
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="anim-side">
          <div className="anim-side-block">
            <h3>CLIPS / LINHAS</h3>
            <p className="hint">Escolha a animação (linha). Os nomes são editáveis em Prompt.</p>
            <div className="anim-row-list">
              {app.promptParams.clips.map((clip, i) => (
                <button
                  key={clip.name + i}
                  type="button"
                  className={app.anim.mode === "row" && app.anim.row === i ? "active" : ""}
                  onClick={() =>
                    app.setAnim({ mode: "row", row: i, clipIndex: 0, playing: false, playDir: 1 })
                  }
                >
                  <span>{rowLabelName(app.promptParams, i)}</span>
                  <span
                    className="anim-clip-edit"
                    title="Editar no Prompt"
                    onClick={(e) => {
                      e.stopPropagation();
                      app.setScreen("about");
                    }}
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className="btn anim-new-clip" onClick={addClip}>
              <Plus size={14} strokeWidth={1.75} /> Novo clip
            </button>
          </div>

          <div className="anim-side-block">
            <h3>Configurações da animação</h3>
            <label className="anim-field">
              <span>FPS</span>
              <select value={app.anim.fps} onChange={(e) => app.setAnim({ fps: Number(e.target.value) })}>
                {[6, 8, 10, 12, 15, 24, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="anim-field">
              <span>Modo de reprodução</span>
              <select
                value={app.anim.mode}
                onChange={(e) =>
                  app.setAnim({ mode: e.target.value as AnimMode, clipIndex: 0, playing: false, playDir: 1 })
                }
              >
                <option value="row">Por linha (animação)</option>
                <option value="all">Todos os frames</option>
                <option value="range">Intervalo</option>
              </select>
            </label>
            {app.anim.mode === "range" ? (
              <div className="anim-range-row">
                <label className="anim-field">
                  <span>De</span>
                  <input
                    value={app.anim.rangeFrom}
                    onChange={(e) => app.setAnim({ rangeFrom: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="anim-field">
                  <span>Até</span>
                  <input
                    value={app.anim.rangeTo}
                    onChange={(e) => app.setAnim({ rangeTo: Number(e.target.value) || 1 })}
                  />
                </label>
              </div>
            ) : null}
            <div className="anim-side-toggles">
              <label className={"anim-switch" + (app.anim.loop ? " on" : "")}>
                <input
                  type="checkbox"
                  checked={app.anim.loop}
                  onChange={(e) => app.setAnim({ loop: e.target.checked })}
                />
                <span className="anim-switch-ui" aria-hidden />
                Loop
              </label>
              <label className={"anim-switch cyan" + (app.anim.pingPong ? " on" : "")}>
                <input
                  type="checkbox"
                  checked={app.anim.pingPong}
                  onChange={(e) => app.setAnim({ pingPong: e.target.checked, playDir: 1 })}
                />
                <span className="anim-switch-ui" aria-hidden />
                Ping-pong
              </label>
            </div>
            <p className="anim-mode-note">{modeLabel}</p>
          </div>

          <div className="anim-side-actions">
            <button type="button" className="btn" onClick={() => app.applyPreset({ toast: true, switchScreen: false })}>
              ↻ Atualizar da grade
            </button>
            <button type="button" className="btn primary" onClick={() => void app.exportHtml()}>
              Exportar HTML animado
            </button>
            <button type="button" className="btn ghost" onClick={() => void app.exportZip()}>
              Exportar ZIP (todos da grade)
            </button>
            <p className="hint">
              O HTML usa os mesmos FPS, velocidade, loop e ping-pong do preview, com os frames marcados (✓).
            </p>
          </div>
        </aside>
      </div>
      <TutorialDialog open={howOpen} onClose={() => setHowOpen(false)} />
    </section>
  );
}
