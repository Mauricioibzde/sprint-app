"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CircleHelp, Crop, FolderOpen, ImageIcon, Play } from "lucide-react";
import { FramePreview } from "@/components/ui/FramePreview";
import { TutorialDialog } from "@/components/shell/Sidebar";
import { useSpriteCut } from "@/context/sprite-cut-context";
import { paintRectPreview } from "@/lib/export";
import { rowLabelName } from "@/lib/prompt";
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
        <p>Pré-visualize cada linha e exporte HTML ou ZIP para o jogo.</p>
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
  const [howOpen, setHowOpen] = useState(false);
  const current = app.clipFrames[app.anim.clipIndex];

  useEffect(() => {
    cacheRef.current = app.clipFrames.map((rect) => {
      const c = document.createElement("canvas");
      paintRectPreview(c, app.imageEl, rect, 512, app.autoCenterFrames);
      return c;
    });
    const dest = canvasRef.current;
    const src = cacheRef.current[app.anim.clipIndex];
    if (dest && src) blitFrame(dest, src);
    // clipIndex is read once after rebuilding the cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.imageEl, app.clipFrames, app.autoCenterFrames]);

  useEffect(() => {
    const dest = canvasRef.current;
    const src = cacheRef.current[app.anim.clipIndex];
    if (dest && src) blitFrame(dest, src);
  }, [app.anim.clipIndex]);

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
    <section className="screen-page animate-page" id="screen-animate">
      <AnimateHead onHow={() => setHowOpen(true)} />
      <div className="anim-layout">
        <div className="anim-stage">
          <div className="anim-canvas-wrap">
            <canvas id="anim-canvas" ref={canvasRef} width={512} height={256} aria-label="Preview da animação" />
          </div>
          <div className="anim-controls">
            <button type="button" className="btn" onClick={() => app.stepAnim(-1)} title="Frame anterior">
              ⏮
            </button>
            <button
              type="button"
              className={"btn primary" + (app.anim.playing ? " playing" : "")}
              onClick={app.togglePlay}
              title="Play / Pause"
            >
              {app.anim.playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <button type="button" className="btn" onClick={() => app.stepAnim(1)} title="Próximo frame">
              ⏭
            </button>
            <button type="button" className="btn" onClick={app.stopPlay} title="Parar">
              ⏹
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#eef6ff" }}>
              FPS
              <input
                type="range"
                min={1}
                max={48}
                value={app.anim.fps}
                style={{ width: 120 }}
                onChange={(e) => app.setAnim({ fps: Number(e.target.value) })}
              />
              <strong style={{ color: "#e8f7ff", minWidth: 28 }}>{app.anim.fps}</strong>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#eef6ff" }}>
              <input
                type="checkbox"
                checked={app.anim.loop}
                onChange={(e) => app.setAnim({ loop: e.target.checked })}
              />{" "}
              Loop
            </label>
          </div>
          <div className="anim-meta">
            <span>
              Clip: <strong>{app.clipTitle}</strong>
            </span>
            <span>
              Frame: <strong>{current ? current.index : "—"}</strong>
            </span>
            <span>
              Tamanho: <strong>{current ? current.w + "×" + current.h : "—"}</strong>
            </span>
            <span>
              Exportar: <strong>{app.anim.exportPick.length}</strong> frames
            </span>
          </div>
          <div className="anim-strip-bar">
            <button type="button" className="btn" onClick={() => app.pickAll(true)}>
              Marcar todos
            </button>
            <button type="button" className="btn" onClick={() => app.pickAll(false)}>
              Limpar
            </button>
            <button type="button" className="btn" onClick={app.pickOnlyCurrent}>
              Só o atual
            </button>
            <span className="sel-count">Clique no ✓ do frame para incluir/excluir do HTML</span>
          </div>
          <div className="anim-strip" aria-label="Frames do clip">
            {app.clipFrames.length ? (
              app.clipFrames.map((frame, i) => {
                const on = app.anim.exportPick.includes(frame.index);
                return (
                  <button
                    key={frame.index}
                    type="button"
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
                    <FramePreview img={app.imageEl} rect={frame} maxSide={56} center={app.autoCenterFrames} />
                    <span>{frame.index}</span>
                  </button>
                );
              })
            ) : (
              <p className="anim-strip-empty">Nenhum frame. Ajuste as guias ou o intervalo.</p>
            )}
          </div>
          <p className="anim-hint-keys">Atalhos: Espaço play/pause · ← → frames · Esc parar</p>
        </div>
        <aside className="anim-side">
          <h3>CLIPS / LINHAS</h3>
          <p className="hint" style={{ margin: 0 }}>
            Escolha a animação (linha). Os nomes são editáveis em <b>Prompt</b>.
          </p>
          <div className="anim-row-list">
            {app.promptParams.clips.map((clip, i) => (
              <button
                key={clip.name + i}
                type="button"
                className={app.anim.mode === "row" && app.anim.row === i ? "active" : ""}
                onClick={() => app.setAnim({ mode: "row", row: i, clipIndex: 0, playing: false })}
              >
                {rowLabelName(app.promptParams, i)}
              </button>
            ))}
          </div>
          <div className="field">
            <span>Modo</span>
            <select
              style={{
                width: "100%",
                marginTop: 6,
                background: "#081522",
                border: "1px solid var(--line)",
                color: "#e8f7ff",
                borderRadius: 10,
                padding: "8px 10px"
              }}
              value={app.anim.mode}
              onChange={(e) => app.setAnim({ mode: e.target.value as AnimMode, clipIndex: 0, playing: false })}
            >
              <option value="row">Por linha (animação)</option>
              <option value="all">Todos os frames</option>
              <option value="range">Intervalo</option>
            </select>
          </div>
          {app.anim.mode === "range" ? (
            <div className="row" style={{ display: "flex", gap: 8 }}>
              <div className="field" style={{ flex: 1, margin: 0 }}>
                <span>De</span>
                <input
                  value={app.anim.rangeFrom}
                  onChange={(e) => app.setAnim({ rangeFrom: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="field" style={{ flex: 1, margin: 0 }}>
                <span>Até</span>
                <input
                  value={app.anim.rangeTo}
                  onChange={(e) => app.setAnim({ rangeTo: Number(e.target.value) || 1 })}
                />
              </div>
            </div>
          ) : null}
          <button type="button" className="btn" onClick={() => app.applyPreset({ toast: true, switchScreen: false })}>
            ↻ Atualizar da grade
          </button>
          <button type="button" className="btn primary" onClick={() => void app.exportHtml()}>
            ⬇ Exportar HTML animado
          </button>
          <button type="button" className="btn" onClick={() => void app.exportZip()}>
            ⬆ Exportar ZIP (todos da grade)
          </button>
          <p className="hint" style={{ margin: 0 }}>
            HTML limpo: só o sprite animado (sem controles), pronto para embutir. FPS e loop seguem os da prévia.
          </p>
        </aside>
      </div>
      <TutorialDialog open={howOpen} onClose={() => setHowOpen(false)} />
    </section>
  );
}
