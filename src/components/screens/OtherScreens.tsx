"use client";

import { useSpriteCut } from "@/context/sprite-cut-context";

export function BatchScreen() {
  const app = useSpriteCut();
  return (
    <section className="screen-page" id="screen-batch">
      <p className="hint lead">
        Várias PNGs com a mesma grade do prompt. Cada ficheiro gera um ZIP com uma pasta por clip.
      </p>
      <div className="prompt-actions">
        <button type="button" className="btn primary" onClick={() => app.batchInputRef.current?.click()}>
          Selecionar imagens
        </button>
        <button type="button" className="btn" disabled={!app.batchFiles.length} onClick={() => void app.exportBatch()}>
          Exportar ZIPs do lote
        </button>
      </div>
      <ul className="file-list">
        {app.batchFiles.length ? (
          app.batchFiles.map((f) => <li key={f.name + f.size}>{f.name}</li>)
        ) : (
          <li className="muted">Nenhum arquivo no lote</li>
        )}
      </ul>
    </section>
  );
}

export function SettingsScreen() {
  const app = useSpriteCut();
  return (
    <section className="screen-page" id="screen-settings">
      <div className="settings-list">
        <label className="switch-row">
          <span>Snap ao arrastar</span>
          <input type="checkbox" checked={app.snapEnabled} onChange={(e) => app.setSnapEnabled(e.target.checked)} />
        </label>
        <label className="switch-row">
          <span>Mostrar réguas</span>
          <input type="checkbox" checked={app.showRulers} onChange={(e) => app.setShowRulers(e.target.checked)} />
        </label>
        <label className="switch-row">
          <span>Mostrar minimapa</span>
          <input type="checkbox" checked={app.showMinimap} onChange={(e) => app.setShowMinimap(e.target.checked)} />
        </label>
        <label className="switch-row">
          <span>Usar memória de guias</span>
          <input type="checkbox" checked={app.learnEnabled} onChange={(e) => app.setLearnEnabled(e.target.checked)} />
        </label>
      </div>
      <p className="hint">{app.learnStatus}</p>
      <button type="button" className="btn" onClick={app.clearLearn}>
        Limpar aprendizado
      </button>
      <p className="hint">
        Quando move as guias, o app grava o ajuste e reaplica em imagens com a mesma grade (ex.: 8×7).
      </p>
    </section>
  );
}

export function HistoryScreen() {
  const app = useSpriteCut();
  return (
    <section className="screen-page" id="screen-history">
      <ul className="history-list">
        {app.history.length ? (
          app.history.map((item, i) => (
            <li key={item.at + i}>
              <time>{item.at}</time>
              <span>{item.text}</span>
            </li>
          ))
        ) : (
          <li className="muted">Nenhuma ação ainda nesta sessão.</li>
        )}
      </ul>
    </section>
  );
}
