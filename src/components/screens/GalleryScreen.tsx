"use client";

import { Folder, LayoutGrid, List, MoreVertical, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSpriteCut } from "@/context/sprite-cut-context";
import {
  GALLERY_EXAMPLES,
  GALLERY_FILTERS,
  matchesGalleryFilter,
  tagTone,
  type GalleryExample,
  type GalleryFilterId
} from "@/lib/gallery-examples";
import type { ProjectListItem } from "@/lib/project";

const BANNER_KEY = "spritecut-gallery-banner";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleDateString("pt-BR") +
    " • " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

function ExampleThumb({ motif, cols, rows }: { motif: GalleryExample["motif"]; cols: number; rows: number }) {
  const c = Math.max(4, Math.min(cols, 8));
  const r = Math.max(4, Math.min(rows, 6));
  const faces: Record<GalleryExample["motif"], string> = {
    fox: "🦊",
    knight: "🛡️",
    trees: "🌲",
    coins: "🪙",
    slime: "🟢",
    crates: "📦",
    potions: "🧪",
    fire: "🔥",
    robot: "🤖"
  };
  return (
    <span
      className={"gallery-sheet gallery-sheet-" + motif}
      style={{ gridTemplateColumns: `repeat(${c}, 1fr)`, gridTemplateRows: `repeat(${r}, 1fr)` }}
      aria-hidden
    >
      {Array.from({ length: c * r }, (_, i) => (
        <span key={i} className="gallery-sheet-cell" />
      ))}
      <span className="gallery-sheet-face">{faces[motif]}</span>
    </span>
  );
}

function CardMenu({
  open,
  onToggle,
  children
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="gallery-menu" onMouseDown={(e) => e.stopPropagation()}>
      <button type="button" className="gallery-menu-btn" aria-label="Opções do projeto" onClick={onToggle}>
        <MoreVertical size={16} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="gallery-menu-pop" role="menu">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function GalleryScreen() {
  const app = useSpriteCut();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GalleryFilterId>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(BANNER_KEY) === "0") setShowBanner(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!menuKey) return;
    const onDown = () => setMenuKey(null);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenuKey(null);
        setEditingSlug(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const showExamples = app.projects.length === 0;
  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return app.projects.filter((p) => {
      if (!matchesGalleryFilter(p.tags, p.updatedAt, filter)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [app.projects, query, filter]);

  const filteredExamples = useMemo(() => {
    if (!showExamples) return [];
    const q = query.trim().toLowerCase();
    return GALLERY_EXAMPLES.filter((p) => {
      if (!matchesGalleryFilter(p.tags, p.updatedAt, filter)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [showExamples, query, filter]);

  const dismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(BANNER_KEY, "0");
    } catch {
      /* ignore */
    }
  };

  const startRename = (slug: string, name: string) => {
    setMenuKey(null);
    setEditingSlug(slug);
    setDraftName(name);
  };

  const confirmRename = async () => {
    if (!editingSlug) return;
    const name = draftName.trim();
    if (!name) return;
    await app.renameProject(editingSlug, name);
    setEditingSlug(null);
  };

  const removeProject = (item: ProjectListItem) => {
    setMenuKey(null);
    if (window.confirm("Excluir «" + item.name + "»? Isto apaga a pasta do projeto no computador.")) {
      void app.deleteProject(item.slug);
    }
  };

  const openExample = (ex: GalleryExample) => {
    setMenuKey(null);
    app.startNewProject({ name: ex.name, prompt: ex.prompt });
  };

  const listClass = "gallery-grid" + (view === "list" ? " is-list" : "");

  return (
    <section className="screen-page gallery-page" id="screen-gallery">
      {showBanner ? (
        <div className="gallery-banner">
          <Folder size={18} strokeWidth={1.75} />
          <p>
            {app.libraryNeedsPermission
              ? "A pasta já está ligada, mas este site precisa de permissão outra vez."
              : app.libraryName
                ? "Pasta «" +
                  app.libraryName +
                  "» — cada projeto é uma pasta no disco (project.json + PNG). Renomeie ou exclua aqui; as alterações vão para o computador."
                : "Cada projeto é uma pasta no disco (project.json + PNG). Renomeie, mova ou exclua aqui — as alterações são refletidas no seu computador."}
          </p>
          {app.libraryNeedsPermission ? (
            <button type="button" className="btn tiny" onClick={() => void app.reconnectLibrary()}>
              Ligar pasta
            </button>
          ) : null}
          <button type="button" className="gallery-banner-close" aria-label="Fechar aviso" onClick={dismissBanner}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      ) : null}

      <div className="gallery-tools">
        <label className="gallery-search">
          <Search size={16} strokeWidth={1.75} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar projetos..."
          />
          <kbd>Ctrl + K</kbd>
        </label>
        <div className="gallery-filters" role="tablist" aria-label="Filtros da galeria">
          {GALLERY_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={"gallery-chip" + (filter === item.id ? " active" : "")}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="gallery-views">
          <button
            type="button"
            className={"gallery-view" + (view === "grid" ? " active" : "")}
            aria-label="Vista em grelha"
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={"gallery-view" + (view === "list" ? " active" : "")}
            aria-label="Vista em lista"
            onClick={() => setView("list")}
          >
            <List size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <ul className={listClass}>
        <li className="gallery-new-item">
          <button type="button" className="gallery-new" onClick={() => app.startNewProject()}>
            <span className="gallery-new-plus">
              <Plus size={28} strokeWidth={1.75} />
            </span>
            <strong>Novo projeto</strong>
            <span>Crie uma nova pasta e comece a gerar sprites.</span>
          </button>
        </li>

        {filteredProjects.map((item) => {
          const editing = editingSlug === item.slug;
          const menuOpen = menuKey === item.slug;
          return (
            <li key={item.id + item.slug} className={app.currentProjectId === item.id ? "current" : ""}>
              <article className="gallery-card">
                <div className="gallery-card-media">
                  <button
                    type="button"
                    className="gallery-open"
                    onClick={() => void app.openProject(item.slug)}
                    disabled={editing}
                  >
                    <span className="gallery-thumb">
                      {item.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbUrl} alt="" />
                      ) : (
                        <span>Sem PNG</span>
                      )}
                    </span>
                  </button>
                  <CardMenu
                    open={menuOpen}
                    onToggle={() => setMenuKey(menuOpen ? null : item.slug)}
                  >
                    <button type="button" className="gallery-menu-item" onClick={() => startRename(item.slug, item.name)}>
                      Renomear
                    </button>
                    <button type="button" className="gallery-menu-item danger" onClick={() => removeProject(item)}>
                      <Trash2 size={14} strokeWidth={1.75} /> Excluir
                    </button>
                  </CardMenu>
                </div>
                <div className="gallery-card-body">
                  {editing ? (
                    <input
                      className="gallery-rename"
                      value={draftName}
                      autoFocus
                      aria-label="Novo nome do projeto"
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void confirmRename();
                        }
                        if (e.key === "Escape") setEditingSlug(null);
                      }}
                    />
                  ) : (
                    <strong>{item.name}</strong>
                  )}
                  <div className="gallery-meta">
                    <time dateTime={item.updatedAt}>{formatWhen(item.updatedAt)}</time>
                    <span>
                      {item.cols}×{item.rows}
                    </span>
                  </div>
                  {item.tags.length ? (
                    <ul className="gallery-tags">
                      {item.tags.map((tag) => (
                        <li key={tag} className={"gallery-tag tone-" + tagTone(tag)}>
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="gallery-card-foot">
                  {editing ? (
                    <>
                      <button type="button" className="btn tiny" onClick={() => void confirmRename()}>
                        Guardar nome
                      </button>
                      <button type="button" className="btn tiny" onClick={() => setEditingSlug(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn tiny gallery-open-btn" onClick={() => void app.openProject(item.slug)}>
                        <Folder size={14} strokeWidth={1.75} /> Abrir
                      </button>
                      <CardMenu
                        open={menuOpen}
                        onToggle={() => setMenuKey(menuOpen ? null : item.slug)}
                      >
                        <button type="button" className="gallery-menu-item" onClick={() => startRename(item.slug, item.name)}>
                          Renomear
                        </button>
                        <button type="button" className="gallery-menu-item danger" onClick={() => removeProject(item)}>
                          <Trash2 size={14} strokeWidth={1.75} /> Excluir
                        </button>
                      </CardMenu>
                    </>
                  )}
                </div>
              </article>
            </li>
          );
        })}

        {filteredExamples.map((item) => {
          const menuOpen = menuKey === item.id;
          return (
            <li key={item.id}>
              <article className="gallery-card is-example">
                <div className="gallery-card-media">
                  <button type="button" className="gallery-open" onClick={() => openExample(item)}>
                    <ExampleThumb motif={item.motif} cols={item.cols} rows={item.rows} />
                  </button>
                  <span className="gallery-example-badge">Exemplo</span>
                  <CardMenu
                    open={menuOpen}
                    onToggle={() => setMenuKey(menuOpen ? null : item.id)}
                  >
                    <button type="button" className="gallery-menu-item" onClick={() => openExample(item)}>
                      Usar modelo
                    </button>
                  </CardMenu>
                </div>
                <div className="gallery-card-body">
                  <strong>{item.name}</strong>
                  <div className="gallery-meta">
                    <time dateTime={item.updatedAt}>{formatWhen(item.updatedAt)}</time>
                    <span>
                      {item.cols}×{item.rows}
                    </span>
                  </div>
                  <ul className="gallery-tags">
                    {item.tags.map((tag) => (
                      <li key={tag} className={"gallery-tag tone-" + tagTone(tag)}>
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="gallery-card-foot">
                  <button type="button" className="btn tiny gallery-open-btn" onClick={() => openExample(item)}>
                    <Folder size={14} strokeWidth={1.75} /> Abrir
                  </button>
                  <CardMenu
                    open={menuOpen}
                    onToggle={() => setMenuKey(menuOpen ? null : item.id)}
                  >
                    <button type="button" className="gallery-menu-item" onClick={() => openExample(item)}>
                      Usar modelo
                    </button>
                  </CardMenu>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {showExamples && filteredExamples.length ? (
        <p className="muted gallery-empty">
          Cartões de exemplo para o layout da galeria. Ao guardar projetos na pasta, eles substituem estes modelos.
        </p>
      ) : null}

      {!filteredProjects.length && !filteredExamples.length ? (
        <p className="muted gallery-empty">
          {query || filter !== "all"
            ? "Nenhum projeto corresponde à busca."
            : app.libraryReady
              ? "Nenhum projeto nesta pasta ainda. Crie um novo ou guarde o trabalho atual."
              : "Ligue uma pasta para guardar os seus projetos. Os cartões acima são exemplos para começar."}
        </p>
      ) : null}
    </section>
  );
}
