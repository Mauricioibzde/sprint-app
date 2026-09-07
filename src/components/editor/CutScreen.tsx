"use client";

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { flushSync } from "react-dom";
import { FramePreview } from "@/components/ui/FramePreview";
import { useSpriteCut } from "@/context/sprite-cut-context";
import { formatAlignDelta } from "@/lib/frame-align";
import { gridStyle, percents } from "@/lib/guides";
import { rowLabelName } from "@/lib/prompt";

export function CutScreen() {
  const app = useSpriteCut();
  const {
    hasImage,
    imageUrl,
    imageEl,
    imageW,
    imageH,
    fileName,
    cols,
    rows,
    zoom,
    tool,
    tab,
    guides,
    activeGuideId,
    selectedFrame,
    rects,
    promptParams,
    brightness,
    contrast,
    cellOpacity,
    guideThickness,
    chromeCollapsed,
    showRulers,
    showMinimap,
    stageRef,
    sheetRef,
    snapEnabled
  } = app;

  const gs = gridStyle(guides);
  const xs = percents(guides, "v");
  const ys = percents(guides, "h");
  const active = guides.find((g) => g.id === activeGuideId);
  const total = cols * rows;
  const wrapRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ active: false, pointerId: -1, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  const dragGuideRef = useRef<{ id: string; axis: "v" | "h"; dup: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [altDupHover, setAltDupHover] = useState(false);

  useEffect(() => {
    const sync = (e: KeyboardEvent) => setAltDupHover(e.altKey);
    const off = () => setAltDupHover(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", off);
    };
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>, id: string, axis: "v" | "h") => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    let pct = axis === "v" ? ((e.clientX - rect.left) / rect.width) * 100 : ((e.clientY - rect.top) / rect.height) * 100;
    if (snapEnabled) pct = Math.round(pct * 2) / 2;
    app.setGuidePercent(id, pct);
  };

  const onPanDown = (e: PointerEvent<HTMLDivElement>) => {
    if (tool !== "pan") return;
    if ((e.target as HTMLElement).closest(".guide")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    panRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop
    };
    setDragging(true);
    wrapRef.current?.setPointerCapture(e.pointerId);
  };

  const onPanMove = (e: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan.active || pan.pointerId !== e.pointerId) return;
    const stage = stageRef.current;
    if (!stage) return;
    stage.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX);
    stage.scrollTop = pan.scrollTop - (e.clientY - pan.startY);
  };

  const onPanEnd = (e: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan.active || pan.pointerId !== e.pointerId) return;
    pan.active = false;
    setDragging(false);
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    app.setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  };

  return (
    <div className="view-cut">
      <section className={"chrome-bar" + (chromeCollapsed ? " collapsed" : "")} aria-label="Arquivo e modos">
        <button type="button" className="chrome-toggle" onClick={app.toggleChrome} aria-expanded={!chromeCollapsed}>
          <span className="chev">▾</span>
        </button>
        <div className="chrome-body">
          <div className="filemeta">
            <div className="fileicon">🖼</div>
            <div style={{ minWidth: 0 }}>
              <strong>{hasImage ? fileName : "Nenhuma imagem"}</strong>
              <span id="file-meta">
                {hasImage ? imageW + "×" + imageH + " · " + cols + "×" + rows : "Abra uma spritesheet para começar"}
              </span>
            </div>
          </div>
          <span className="chrome-hint">{tab === "view" ? "Visualizar" : tab === "adjust" ? "Ajustes" : "Guias"}</span>
          <div className="tabs">
            <button type="button" className={"tab" + (tab === "view" ? " active" : "")} onClick={() => app.setTab("view")}>
              Visualizar
            </button>
            <button type="button" className={"tab" + (tab === "guides" ? " active" : "")} onClick={() => app.setTab("guides")}>
              Guias
            </button>
            <button type="button" className={"tab" + (tab === "adjust" ? " active" : "")} onClick={() => app.setTab("adjust")}>
              Ajustes
            </button>
          </div>
          <button type="button" className="btn tiny" onClick={() => app.fileInputRef.current?.click()}>
            ↻ Trocar
          </button>
        </div>
      </section>

      <div className="layout">
        <section className="cut-stage">
          <div className="workspace">
            <div className="toolbar">
              <button type="button" className="toolbtn" onClick={() => app.setZoom(zoom / 1.15)}>
                −
              </button>
              <button type="button" className="toolbtn" onClick={() => app.setZoom(zoom * 1.15)}>
                ＋
              </button>
              <span className="zoomvalue">{Math.round(zoom * 100)}%</span>
              <button type="button" className="toolbtn desktop-only" onClick={app.fitToView}>
                Ajustar
              </button>
              <button type="button" className="toolbtn desktop-only" onClick={app.zoomActual}>
                1:1
              </button>
              <div className="spacer" />
              <button type="button" className={"toolbtn" + (tool === "pan" ? " active" : "")} onClick={() => app.setTool("pan")}>
                ✋
              </button>
              <button type="button" className={"toolbtn" + (tool === "guides" ? " active" : "")} onClick={() => app.setTool("guides")}>
                ⌖
              </button>
              <button
                type="button"
                className="toolbtn"
                onClick={() => wrapRef.current?.requestFullscreen?.()}
                title="Tela cheia"
              >
                ⛶
              </button>
            </div>

            <div
              ref={wrapRef}
              className={
                "canvas-wrap tool-" +
                tool +
                (tab === "view" ? " guides-hidden" : "") +
                (showRulers ? "" : " hide-rulers") +
                (showMinimap ? "" : " hide-minimap") +
                (dragging ? " dragging" : "") +
                (altDupHover ? " alt-dup" : "")
              }
              onPointerDown={onPanDown}
              onPointerMove={onPanMove}
              onPointerUp={onPanEnd}
              onPointerCancel={onPanEnd}
              onWheel={onWheel}
            >
              {!hasImage ? (
                <button type="button" className="drop-panel" onClick={() => app.fileInputRef.current?.click()}>
                  <strong>Passo 2 — abrir a PNG gerada</strong>
                  <span>Arraste o ficheiro para aqui ou clique para escolher. A grade {cols}×{rows} do prompt aplica-se ao carregar.</span>
                </button>
              ) : null}
              <div className="ruler-x">
                {[0, 0.2, 0.4, 0.6, 0.8].map((t, i) => (
                  <span key={t} style={{ left: 4 + i * 17 + "%" }}>
                    {Math.round(imageW * t)}
                  </span>
                ))}
              </div>
              <div className="ruler-y">
                {[0, 0.33, 0.66, 1].map((t, i) => (
                  <span key={t} style={{ top: 4 + i * 25 + "%" }}>
                    {Math.round(imageH * t)}
                  </span>
                ))}
              </div>
              <div className="stage" ref={stageRef}>
                <div
                  className={"sheet" + (hasImage ? " has-image" : "")}
                  ref={sheetRef}
                  style={{
                    transform: "scale(" + zoom + ")",
                    transformOrigin: "top center",
                    aspectRatio: imageW + " / " + imageH
                  }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="sheet-image"
                      src={imageUrl}
                      alt="Spritesheet"
                      style={{ filter: "brightness(" + brightness + "%) contrast(" + contrast + "%)" }}
                    />
                  ) : (
                    <div className="sheet-image" />
                  )}
                  <div className="grid" style={{ ...(gs || {}), gap: hasImage ? 0 : 3, opacity: cellOpacity / 100 }}>
                    {Array.from({ length: total }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={"cell" + (selectedFrame === i + 1 ? " active" : "")}
                        onClick={() => app.selectFrame(i + 1)}
                      >
                        <span className="cell-num">{i + 1}</span>
                      </button>
                    ))}
                  </div>
                  <div className="frame-marks">
                    {hasImage &&
                      rects.map((r) => (
                        <div
                          key={r.index}
                          className={"frame-mark" + (selectedFrame === r.index ? " active" : "")}
                          style={{
                            left: (r.x / imageW) * 100 + "%",
                            top: (r.y / imageH) * 100 + "%",
                            width: (r.w / imageW) * 100 + "%",
                            height: (r.h / imageH) * 100 + "%"
                          }}
                        />
                      ))}
                  </div>
                  <div>
                    {!hasImage &&
                      ys.slice(0, -1).map((y, r) => (
                        <div key={r} className="label" style={{ top: (y + ys[r + 1]) / 2 + "%" }}>
                          {rowLabelName(promptParams, r)}
                          <br />({cols} FRAMES)
                        </div>
                      ))}
                  </div>
                  {guides.map((g) => (
                    <div
                      key={g.id}
                      className={
                        "guide " +
                        g.axis +
                        (g.id === activeGuideId ? " selected" : "") +
                        (dragging && dragGuideRef.current?.id === g.id ? " dragging" : "")
                      }
                      title="Arraste para mover. Alt + arrastar duplica."
                      style={
                        g.axis === "v"
                          ? { left: g.percent + "%", width: guideThickness + "px" }
                          : { top: g.percent + "%", height: guideThickness + "px" }
                      }
                      onPointerDown={(e) => {
                        if (tool !== "guides") return;
                        if (e.pointerType === "mouse" && e.button !== 0) return;
                        e.stopPropagation();
                        let id = g.id;
                        let dup = false;
                        if (e.altKey) {
                          flushSync(() => {
                            const next = app.duplicateGuide(g.id);
                            if (next) id = next;
                          });
                          dup = true;
                        }
                        dragGuideRef.current = { id, axis: g.axis, dup };
                        app.selectGuide(id);
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        setDragging(true);
                      }}
                      onPointerMove={(e) => {
                        if (tool !== "guides" || !e.buttons) return;
                        const drag = dragGuideRef.current;
                        if (!drag) return;
                        if (e.altKey && !drag.dup) {
                          flushSync(() => {
                            const next = app.duplicateGuide(drag.id);
                            if (next) {
                              drag.id = next;
                              drag.dup = true;
                            }
                          });
                        }
                        onPointerMove(e, drag.id, drag.axis);
                      }}
                      onPointerUp={() => {
                        dragGuideRef.current = null;
                        setDragging(false);
                      }}
                      onPointerCancel={() => {
                        dragGuideRef.current = null;
                        setDragging(false);
                      }}
                    />
                  ))}
                  {active && (
                    <>
                      <div className="guide-tag y">Y: {Math.round(((percents(guides, "h")[1] || 0) / 100) * imageH)} px</div>
                      <div className="guide-tag x">X: {Math.round((active.axis === "v" ? active.percent : xs[0] || 0) / 100 * imageW)} px</div>
                    </>
                  )}
                </div>
              </div>
              <div className="minimap">
                <div
                  className="minimap-inner"
                  style={{ gridTemplateColumns: "repeat(" + cols + ",1fr)", gridTemplateRows: "repeat(" + rows + ",1fr)" }}
                >
                  {Array.from({ length: total }, (_, i) => (
                    <i
                      key={i}
                      className={selectedFrame === i + 1 ? "active" : ""}
                      onClick={() => app.selectFrame(i + 1)}
                    >
                      <FramePreview img={imageEl} rect={rects[i]} maxSide={48} center={app.autoCenterFrames} />
                    </i>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="thumbs">
            <div className="thumb-head">
              <strong>Frames ({total})</strong>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {selectedFrame ? "Frame " + selectedFrame + " selecionado" : "Nenhum frame"}
              </span>
            </div>
            <div className="thumb-list">
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className={"thumb" + (selectedFrame === i + 1 ? " active" : "") + (hasImage ? "" : " empty")}
                  onClick={() => app.selectFrame(i + 1)}
                >
                  <b>{i + 1}</b>
                  <FramePreview img={imageEl} rect={rects[i]} maxSide={80} center={app.autoCenterFrames} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <GuidesPanel />
      </div>
    </div>
  );
}

function GuidesPanel() {
  const app = useSpriteCut();
  const g = app.guides.find((x) => x.id === app.activeGuideId);
  const px = g ? Math.round((g.percent / 100) * (g.axis === "v" ? app.imageW : app.imageH)) : 0;
  const locked = app.lockUniformGrid;
  return (
    <aside className="panel cut-panel" data-mode={app.tab}>
      <div id="panel-guides" className="panel-block">
        <div className="cut-panel-head">
          <h3 title={locked ? "Grade uniforme. Arraste para alinhar." : "Modo livre. Cada guia move-se à parte."}>
            Guias
          </h3>
          <label className="switch-mini" title="Células iguais">
            <span>Iguais</span>
            <input type="checkbox" checked={locked} onChange={(e) => app.setLockUniformGrid(e.target.checked)} />
          </label>
        </div>

        <div className="cut-panel-body">
          <div className="cut-grid">
            <div className="field compact stat">
              <span>Célula</span>
              <strong>
                {app.lockedCell.w}×{app.lockedCell.h}
              </strong>
            </div>
            <div className="field compact">
              <span>Folga</span>
              <input
                defaultValue={app.safeMarginPx}
                onBlur={(e) => app.setSafeMargin(Math.max(4, Math.round(parseFloat(e.target.value) || 4)))}
              />
            </div>

            <label className="switch-mini cut-center" title="Recentrar a arte em cada célula na faixa e na exportação">
              <span>Centrar</span>
              <input
                type="checkbox"
                checked={app.autoCenterFrames}
                onChange={(e) => app.setAutoCenterFrames(e.target.checked)}
              />
            </label>
            <button
              type="button"
              className="btn tiny"
              title="Deslocar a grade pela mediana do desvio da arte"
              onClick={app.alignGridFromFrames}
            >
              Alinhar
            </button>
            <div className="field compact cut-span cut-delta" title="Desvio mediano da arte ao centro da célula">
              <span>
                {app.alignOffset ? formatAlignDelta(app.alignOffset.dx, app.alignOffset.dy) : "Δ —"}
              </span>
            </div>

            {locked ? (
              <>
                <div className="field compact">
                  <span>X</span>
                  <input
                    key={"ox-" + app.gridOrigin.x}
                    defaultValue={app.gridOrigin.x}
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      if (Number.isNaN(n)) return;
                      app.setGridOrigin("v", n);
                    }}
                  />
                </div>
                <div className="field compact">
                  <span>Y</span>
                  <input
                    key={"oy-" + app.gridOrigin.y}
                    defaultValue={app.gridOrigin.y}
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      if (Number.isNaN(n)) return;
                      app.setGridOrigin("h", n);
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="field compact">
                  <span>{g?.axis === "h" ? "Y" : "X"}</span>
                  <input
                    value={String(px)}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!g || Number.isNaN(n)) return;
                      const total = g.axis === "v" ? app.imageW : app.imageH;
                      app.setGuidePercent(g.id, (n / total) * 100);
                    }}
                  />
                </div>
                <div className="field compact cut-color">
                  <span>Cor</span>
                  <div className="colorchip" style={{ background: app.guideColor }} title={app.guideColor}>
                    <input type="color" value={app.guideColor} onChange={(e) => app.setGuideColor(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="row compact">
              <label>Cols</label>
              <div className="counter">
                <button type="button" onClick={() => app.setCols(app.cols - 1)}>
                  −
                </button>
                <span>{app.cols}</span>
                <button type="button" onClick={() => app.setCols(app.cols + 1)}>
                  +
                </button>
              </div>
            </div>
            <div className="row compact">
              <label>Lins</label>
              <div className="counter">
                <button type="button" onClick={() => app.setRows(app.rows - 1)}>
                  −
                </button>
                <span>{app.rows}</span>
                <button type="button" onClick={() => app.setRows(app.rows + 1)}>
                  +
                </button>
              </div>
            </div>

            {locked ? (
              <div className="field compact cut-color">
                <span>Cor</span>
                <div className="colorchip" style={{ background: app.guideColor }} title={app.guideColor}>
                  <input type="color" value={app.guideColor} onChange={(e) => app.setGuideColor(e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <div className="field compact">
                  <span>Gap X</span>
                  <input defaultValue={app.gapX} onBlur={(e) => app.setGapX(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="field compact">
                  <span>Gap Y</span>
                  <input defaultValue={app.gapY} onBlur={(e) => app.setGapY(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </>
            )}

            {locked ? (
              <label className="cut-range">
                <span>{app.guideThickness}px</span>
                <input
                  className="range"
                  type="range"
                  min={1}
                  max={6}
                  value={app.guideThickness}
                  onChange={(e) => app.setGuideThickness(Number(e.target.value))}
                />
              </label>
            ) : (
              <div className="seg cut-span">
                <button type="button" className={app.addAxis === "v" ? "active" : ""} onClick={() => app.setAddAxis("v")}>
                  Cols
                </button>
                <button type="button" className={app.addAxis === "h" ? "active" : ""} onClick={() => app.setAddAxis("h")}>
                  Lins
                </button>
              </div>
            )}

            {!locked ? (
              <>
                <label className="cut-range cut-span">
                  <span>{app.guideThickness}px</span>
                  <input
                    className="range"
                    type="range"
                    min={1}
                    max={6}
                    value={app.guideThickness}
                    onChange={(e) => app.setGuideThickness(Number(e.target.value))}
                  />
                </label>
                <button type="button" className="btn tiny" onClick={app.addGuide}>
                  + Guia
                </button>
                <button type="button" className="btn tiny danger" onClick={app.removeGuide}>
                  Apagar
                </button>
              </>
            ) : null}

            <div className="cut-tools cut-span">
              <button
                type="button"
                className="btn tiny"
                onClick={app.detectGrid}
                title={locked ? "Estimar origem" : "Detectar grade"}
              >
                {locked ? "Origem" : "Auto"}
              </button>
              <button type="button" className="btn tiny" onClick={() => app.applyPreset()} title="Aplicar preset do prompt">
                Preset
              </button>
              <button type="button" className="btn tiny" onClick={app.resetGuides} title="Redefinir guias">
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="cut-panel-foot">
          <div className="cut-nudge-row">
            <button type="button" className="btn tiny" title="−1 px" onClick={() => app.nudgeGuide(-1)}>
              −1
            </button>
            <button type="button" className="btn primary" onClick={app.applyGuides}>
              Aplicar
            </button>
            <button type="button" className="btn tiny" title="+1 px" onClick={() => app.nudgeGuide(1)}>
              +1
            </button>
          </div>
          <p className="cut-keys" title={locked ? "Setas ou [ ] · Alt duplica" : "Setas / [ ] · Delete · Alt duplica"}>
            {locked ? app.cols + "×" + app.rows : (g?.axis === "h" ? "H" : "V") + " " + px + "px"}
          </p>
        </div>
      </div>

      <div id="panel-view" className="panel-block">
        <div className="cut-panel-head">
          <h3>Vista</h3>
        </div>
        <div className="cut-panel-body">
          <div className="cut-grid">
            <div className="field compact">
              <span>Frames</span>
              <strong>{app.cols * app.rows}</strong>
            </div>
            <div className="field compact">
              <span>Grade</span>
              <strong>
                {app.cols}×{app.rows}
              </strong>
            </div>
            <div className="field compact cut-span">
              <span>Sel.</span>
              <strong>#{app.selectedFrame}</strong>
            </div>
          </div>
        </div>
        <div className="cut-panel-foot">
          <button type="button" className="btn primary" onClick={() => app.setTab("guides")}>
            Guias
          </button>
        </div>
      </div>

      <div id="panel-adjust" className="panel-block">
        <div className="cut-panel-head">
          <h3>Ajustes</h3>
        </div>
        <div className="cut-panel-body">
          <div className="cut-grid">
            <label className="cut-range cut-span">
              <span>Brilho</span>
              <input className="range" type="range" min={50} max={150} value={app.brightness} onChange={(e) => app.setBrightness(Number(e.target.value))} />
            </label>
            <label className="cut-range cut-span">
              <span>Contraste</span>
              <input className="range" type="range" min={50} max={150} value={app.contrast} onChange={(e) => app.setContrast(Number(e.target.value))} />
            </label>
            <label className="cut-range cut-span">
              <span>Células</span>
              <input className="range" type="range" min={20} max={100} value={app.cellOpacity} onChange={(e) => app.setCellOpacity(Number(e.target.value))} />
            </label>
          </div>
        </div>
        <div className="cut-panel-foot">
          <button
            type="button"
            className="btn tiny"
            onClick={() => {
              app.setBrightness(100);
              app.setContrast(100);
              app.setCellOpacity(100);
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </aside>
  );
}
