export function FoxThumb() {
  return (
    <svg className="fox-thumb" viewBox="0 0 80 80" aria-hidden>
      <rect width="80" height="80" rx="12" fill="#0b1220" />
      <path d="M18 34 28 14l10 14 10-14 10 20-6 8H24z" fill="#f08a2a" />
      <path d="M28 14l6 16H28z" fill="#f4d2b0" />
      <path d="M48 14l-6 16h6z" fill="#f4d2b0" />
      <ellipse cx="40" cy="48" rx="18" ry="16" fill="#f08a2a" />
      <ellipse cx="40" cy="52" rx="10" ry="8" fill="#f4d2b0" />
      <circle cx="33" cy="44" r="2.2" fill="#1b120c" />
      <circle cx="47" cy="44" r="2.2" fill="#1b120c" />
      <path d="M40 48v4" stroke="#1b120c" strokeWidth="1.6" />
      <path d="M36 56c2.4 2 5.6 2 8 0" stroke="#1b120c" strokeWidth="1.6" fill="none" />
      <path d="M22 56c-6 8 2 16 10 10" fill="#e07820" />
    </svg>
  );
}

export function SheetPreview({ cols, rows }: { cols: number; rows: number }) {
  const c = Math.max(1, Math.min(cols, 12));
  const r = Math.max(1, Math.min(rows, 12));
  return (
    <div className="sheet-preview" style={{ gridTemplateColumns: `repeat(${c}, 1fr)`, gridTemplateRows: `repeat(${r}, 1fr)` }}>
      {Array.from({ length: c * r }, (_, i) => (
        <span key={i} className="sheet-preview-cell" />
      ))}
    </div>
  );
}
