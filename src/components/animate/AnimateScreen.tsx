"use client";

import { useEffect, useRef } from "react";
import { FramePreview } from "@/components/ui/FramePreview";
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

export function AnimateScreen() {
  const app = useSpriteCut();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<HTMLCanvasElement[]>([]);
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
      <section className="screen-page" id="screen-animate">
        <div className="empty-panel">
          <span className="empty-mark">▶</span>
          <strong>Ainda não há spritesheet nesta sessão</strong>
          <p>
            Gere a PNG com o prompt e abra-a em Recortar. Depois cada linha (IDLE, WALK, …) vira um clip para
            pré-visualizar e exportar.
          </p>
          <div className="prompt-actions">
            <button type="button" className="btn primary" onClick={() => app.fileInputRef.current?.click()}>
              Abrir PNG
            </button>
            <button type="button" className="btn ghost" onClick={() => app.setScreen("about")}>
              Voltar ao prompt
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="screen-page" id="screen-animate">
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
    </section>
  );
}
