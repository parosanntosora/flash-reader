import { useState, useEffect, useRef, useCallback } from "react";

// ── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    name: "ライト", bg: "#f4f4f2", surface: "#ffffff", card: "#ebebea",
    border: "#ddddd8", text: "#1a1a18", subtext: "#6b6b65", accent: "#2d6a4f",
    accentLight: "#e0f0e8", flash: "#1a1a18", flashBg: "#ffffff",
    slider: "#2d6a4f", progress: "#2d6a4f", trackBg: "#ddddd8",
  },
  dark: {
    name: "ダーク", bg: "#0f0f0d", surface: "#181815", card: "#202020",
    border: "#2e2e2a", text: "#e8e8e2", subtext: "#888880", accent: "#52b788",
    accentLight: "#1b3a2a", flash: "#e8e8e2", flashBg: "#181815",
    slider: "#52b788", progress: "#52b788", trackBg: "#2e2e2a",
  },
  beige: {
    name: "ベージュ", bg: "#f2ede4", surface: "#f8f4ec", card: "#ece6da",
    border: "#d4ccbc", text: "#2c2418", subtext: "#7a6e5e", accent: "#8b6914",
    accentLight: "#ece0c0", flash: "#2c2418", flashBg: "#f8f4ec",
    slider: "#8b6914", progress: "#8b6914", trackBg: "#d4ccbc",
  },
};

// ── Slider global CSS ────────────────────────────────────────────────────────
function injectSliderCSS(accent, trackBg) {
  let el = document.getElementById("fr-slider-css");
  if (!el) { el = document.createElement("style"); el.id = "fr-slider-css"; document.head.appendChild(el); }
  el.textContent = `
    .fr-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; outline: none; cursor: pointer; border: none; }
    .fr-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: ${accent}; border: 3px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.28); cursor: pointer; margin-top: -8px; transition: transform 0.1s; }
    .fr-slider::-webkit-slider-thumb:active { transform: scale(1.2); }
    .fr-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; }
    .fr-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${accent}; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer; }
  `;
}

// ── SVG Thumbnail Patterns ───────────────────────────────────────────────────
// 8 distinct geometric SVG motifs, no emoji
const SVG_MOTIFS = [
  // 0: concentric circles
  (fg) => `<circle cx="60" cy="60" r="44" fill="none" stroke="${fg}" stroke-width="2" opacity=".35"/>
    <circle cx="60" cy="60" r="30" fill="none" stroke="${fg}" stroke-width="2" opacity=".5"/>
    <circle cx="60" cy="60" r="16" fill="${fg}" opacity=".7"/>`,
  // 1: diagonal lines + square
  (fg) => `<rect x="20" y="20" width="80" height="80" fill="none" stroke="${fg}" stroke-width="2" opacity=".4"/>
    <line x1="20" y1="20" x2="100" y2="100" stroke="${fg}" stroke-width="1.5" opacity=".5"/>
    <line x1="100" y1="20" x2="20" y2="100" stroke="${fg}" stroke-width="1.5" opacity=".5"/>
    <rect x="44" y="44" width="32" height="32" fill="${fg}" opacity=".6"/>`,
  // 2: triangle stack
  (fg) => `<polygon points="60,14 106,94 14,94" fill="none" stroke="${fg}" stroke-width="2" opacity=".4"/>
    <polygon points="60,30 90,78 30,78" fill="none" stroke="${fg}" stroke-width="2" opacity=".5"/>
    <polygon points="60,46 76,64 44,64" fill="${fg}" opacity=".7"/>`,
  // 3: grid dots
  (fg) => Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) =>
    `<circle cx="${22 + c * 19}" cy="${22 + r * 19}" r="${r === 2 && c === 2 ? 6 : 3}" fill="${fg}" opacity="${r === 2 && c === 2 ? '.9' : '.4'}"/>`
  ).join("")).join(""),
  // 4: spiral lines
  (fg) => `<path d="M60,60 m-36,0 a36,36 0 1,1 0,0.1" fill="none" stroke="${fg}" stroke-width="1.5" opacity=".3"/>
    <path d="M60,60 m-26,0 a26,26 0 1,1 0,0.1" fill="none" stroke="${fg}" stroke-width="1.5" opacity=".45"/>
    <path d="M60,60 m-16,0 a16,16 0 1,1 0,0.1" fill="none" stroke="${fg}" stroke-width="1.5" opacity=".6"/>
    <circle cx="60" cy="60" r="5" fill="${fg}" opacity=".85"/>`,
  // 5: cross + diamond
  (fg) => `<line x1="60" y1="16" x2="60" y2="104" stroke="${fg}" stroke-width="2" opacity=".4"/>
    <line x1="16" y1="60" x2="104" y2="60" stroke="${fg}" stroke-width="2" opacity=".4"/>
    <polygon points="60,34 86,60 60,86 34,60" fill="none" stroke="${fg}" stroke-width="2" opacity=".6"/>
    <polygon points="60,48 72,60 60,72 48,60" fill="${fg}" opacity=".75"/>`,
  // 6: horizontal bars
  (fg) => `<rect x="18" y="30" width="84" height="8" rx="2" fill="${fg}" opacity=".3"/>
    <rect x="18" y="48" width="60" height="8" rx="2" fill="${fg}" opacity=".5"/>
    <rect x="18" y="66" width="72" height="8" rx="2" fill="${fg}" opacity=".4"/>
    <rect x="18" y="84" width="40" height="8" rx="2" fill="${fg}" opacity=".7"/>`,
  // 7: hexagon
  (fg) => `<polygon points="60,14 99,36 99,80 60,102 21,80 21,36" fill="none" stroke="${fg}" stroke-width="2" opacity=".4"/>
    <polygon points="60,30 83,43 83,69 60,82 37,69 37,43" fill="none" stroke="${fg}" stroke-width="2" opacity=".55"/>
    <polygon points="60,46 71,52 71,64 60,70 49,64 49,52" fill="${fg}" opacity=".72"/>`,
];

const PALETTES = [
  ["#1b4332", "#52b788"], ["#2d3a8c", "#7b93db"], ["#7b2d00", "#e07b39"],
  ["#4a1942", "#c97db5"], ["#1a3a2a", "#a8d5b5"], ["#3d2b00", "#c4954a"],
  ["#0d2137", "#4a9eca"], ["#2a0a0a", "#c96b6b"],
];

function BookThumbnail({ bookId, title, catchText, height = 108 }) {
  const idx = bookId % PALETTES.length;
  const [bg, accent] = PALETTES[idx];
  const motifSVG = SVG_MOTIFS[bookId % SVG_MOTIFS.length](accent);

  return (
    <div style={{ background: `linear-gradient(140deg, ${bg} 0%, ${bg}cc 100%)`, height, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 10 }}>
      {/* SVG motif background */}
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }} dangerouslySetInnerHTML={{ __html: motifSVG }} />
      {/* Title text */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: accent, fontWeight: 800, lineHeight: 1.5, wordBreak: "break-all", textShadow: `0 1px 4px ${bg}` }}>{title}</div>
        {catchText && <div style={{ fontSize: 9, color: "#ffffff70", marginTop: 4, lineHeight: 1.4 }}>{catchText.slice(0, 20)}</div>}
      </div>
    </div>
  );
}

// ── AI title generation ──────────────────────────────────────────────────────
async function generateBookMeta(text, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 200,
      messages: [{ role: "user", content: `以下の文章の冒頭から、タイトル（15字以内）とサムネイル用キャッチコピー（30字以内）をJSONのみで返してください。説明不要。\n{"title":"...","catch":"..."}\n\n${text.slice(0, 400)}` }]
    })
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || '{"title":"無題","catch":""}';
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { title: text.slice(0, 15), catch: text.slice(0, 30) }; }
}

// ── Storage ──────────────────────────────────────────────────────────────────
const BOOKS_KEY = "flash_reader_books_v2";
const SETTINGS_KEY = "flash_reader_settings_v3";
const loadBooks = () => { try { return JSON.parse(localStorage.getItem(BOOKS_KEY) || "[]"); } catch { return []; } };
const saveBooks = (b) => localStorage.setItem(BOOKS_KEY, JSON.stringify(b));
const loadSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") ||
      { charSpeed: 180, pausePeriod: 800, pauseComma: 300, fontSize: 120, theme: "light" };
  } catch { return { charSpeed: 180, pausePeriod: 800, pauseComma: 300, fontSize: 120, theme: "light" }; }
};
const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("library");
  const [books, setBooks] = useState(loadBooks);
  const [settings, setSettings] = useState(loadSettings);
  const [activeBook, setActiveBook] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("flash_api_key") || "");
  const [addText, setAddText] = useState("");
  const [adding, setAdding] = useState(false);
  const t = THEMES[settings.theme];

  useEffect(() => { injectSliderCSS(t.slider, t.trackBg); }, [t.slider, t.trackBg]);

  const updateSettings = (patch) => { const n = { ...settings, ...patch }; setSettings(n); saveSettings(n); };

  const handleAddBook = async () => {
    if (!addText.trim()) return;
    setAdding(true);
    let meta = { title: addText.slice(0, 15), catch: addText.slice(0, 30) };
    if (apiKey) { try { meta = await generateBookMeta(addText, apiKey); } catch {} }
    const book = {
      id: Date.now(), title: meta.title, catch: meta.catch, text: addText,
      charCount: [...addText].length, addedAt: new Date().toLocaleDateString("ja-JP"),
      readCount: 0, lastRead: null, savedIdx: null
    };
    const next = [book, ...books]; setBooks(next); saveBooks(next);
    setAddText(""); setAdding(false); setScreen("library");
  };

  const handleDeleteBook = (id) => { const n = books.filter(b => b.id !== id); setBooks(n); saveBooks(n); };

  const handleOpenBook = (book, fromSaved = false) => {
    setActiveBook({ ...book, startIdx: fromSaved && book.savedIdx != null ? book.savedIdx : 0 });
    setScreen("reader");
  };

  const handleAbandon = (idx) => {
    const next = books.map(b => b.id === activeBook.id ? { ...b, savedIdx: idx } : b);
    setBooks(next); saveBooks(next); setScreen("library");
  };

  const handleComplete = (elapsed) => {
    const next = books.map(b =>
      b.id === activeBook.id ? { ...b, readCount: b.readCount + 1, lastRead: new Date().toLocaleDateString("ja-JP"), savedIdx: null } : b
    );
    setBooks(next); saveBooks(next);
    setActiveBook(prev => ({ ...prev, elapsed }));
    setScreen("result");
  };

  const css = makeCSS(t);

  return (
    <div style={css.app}>
      {screen === "library" && <Library books={books} t={t} css={css} onOpen={handleOpenBook} onDelete={handleDeleteBook} onAdd={() => setScreen("add")} onSettings={() => setScreen("settings")} />}
      {screen === "add" && <AddBook t={t} css={css} text={addText} onTextChange={setAddText} onAdd={handleAddBook} onBack={() => setScreen("library")} adding={adding} apiKey={apiKey} onApiKeyChange={v => { setApiKey(v); localStorage.setItem("flash_api_key", v); }} />}
      {screen === "reader" && activeBook && <Reader book={activeBook} t={t} css={css} settings={settings} onComplete={handleComplete} onAbandon={handleAbandon} />}
      {screen === "result" && activeBook && <Result book={activeBook} t={t} css={css} onBack={() => setScreen("library")} onReread={() => { setActiveBook({ ...activeBook, startIdx: 0 }); setScreen("reader"); }} />}
      {screen === "settings" && <Settings t={t} css={css} settings={settings} onUpdate={updateSettings} onBack={() => setScreen("library")} apiKey={apiKey} onApiKeyChange={v => { setApiKey(v); localStorage.setItem("flash_api_key", v); }} />}
    </div>
  );
}

// ── Library ──────────────────────────────────────────────────────────────────
function Library({ books, t, css, onOpen, onDelete, onAdd, onSettings }) {
  return (
    <div>
      <header style={css.header}>
        <span style={css.headerTitle}>FlashRead</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={css.iconBtn} onClick={onSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button style={{ ...css.primaryBtn, padding: "7px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }} onClick={onAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            追加
          </button>
        </div>
      </header>
      <div style={{ padding: "18px 14px" }}>
        {books.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 20px", color: t.subtext }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14, opacity: 0.4 }}>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>ライブラリが空です</div>
            <div style={{ fontSize: 13, marginBottom: 22 }}>テキストを追加して速読を始めましょう</div>
            <button style={css.primaryBtn} onClick={onAdd}>最初のテキストを追加</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(146px, 1fr))", gap: 12 }}>
            {books.map(b => <BookCard key={b.id} book={b} t={t} css={css} onOpen={onOpen} onDelete={onDelete} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function BookCard({ book, t, css, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const chars = [...book.text];
  const hasSaved = book.savedIdx != null && book.savedIdx > 0;
  const pct = hasSaved ? Math.round(book.savedIdx / chars.length * 100) : 0;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{ borderRadius: 5, overflow: "hidden", border: `1px solid ${t.border}`, background: t.surface, boxShadow: "0 1px 5px rgba(0,0,0,0.07)", cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 5px 16px rgba(0,0,0,0.13)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 5px rgba(0,0,0,0.07)"; }}
        onClick={() => onOpen(book, false)}
      >
        <div style={{ position: "relative" }}>
          <BookThumbnail bookId={book.id % 8} title={book.title} catchText={book.catch} height={108} />
          {hasSaved && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,0.2)" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: PALETTES[book.id % PALETTES.length][1] }} />
            </div>
          )}
        </div>
        <div style={{ padding: "7px 10px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</div>
          <div style={{ fontSize: 10, color: t.subtext, marginTop: 2 }}>{book.charCount.toLocaleString()}字 · {book.addedAt}</div>
          {book.readCount > 0 && <div style={{ fontSize: 10, color: t.accent, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            {book.readCount}回読了
          </div>}
        </div>
      </div>

      {hasSaved && (
        <button
          onClick={e => { e.stopPropagation(); onOpen(book, true); }}
          style={{ width: "100%", marginTop: 4, padding: "7px 0", background: t.accentLight, color: t.accent, border: `1px solid ${t.accent}50`, borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          続きから ({pct}%)
        </button>
      )}

      <button
        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.28)", border: "none", borderRadius: 3, width: 20, height: 20, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
      >···</button>
      {menuOpen && (
        <div style={{ position: "absolute", top: 28, right: 5, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 4, padding: 4, zIndex: 20, boxShadow: "0 4px 14px rgba(0,0,0,0.14)", minWidth: 90 }}>
          <button onClick={() => { setMenuOpen(false); if (window.confirm("削除しますか？")) onDelete(book.id); }}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "none", border: "none", color: "#e05c5c", padding: "6px 10px", cursor: "pointer", fontSize: 12, textAlign: "left", borderRadius: 3 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            削除
          </button>
        </div>
      )}
    </div>
  );
}

// ── AddBook ──────────────────────────────────────────────────────────────────
function AddBook({ t, css, text, onTextChange, onAdd, onBack, adding, apiKey, onApiKeyChange }) {
  return (
    <div>
      <header style={css.header}>
        <button style={css.iconBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <span style={{ ...css.headerTitle, fontSize: 15 }}>テキストを追加</span>
        <button style={{ ...css.primaryBtn, padding: "7px 14px", fontSize: 13, opacity: adding || !text.trim() ? 0.45 : 1 }} onClick={onAdd} disabled={adding || !text.trim()}>{adding ? "生成中…" : "追加"}</button>
      </header>
      <div style={{ padding: "16px 14px", maxWidth: 560, margin: "0 auto" }}>
        <p style={{ fontSize: 13, color: t.subtext, marginBottom: 10 }}>読みたいテキストを貼り付けてください。AIがタイトルを自動生成します。</p>
        <textarea value={text} onChange={e => onTextChange(e.target.value)} placeholder="ここにテキストを貼り付け…"
          style={{ width: "100%", minHeight: 250, background: t.surface, color: t.text, border: `1.5px solid ${t.border}`, borderRadius: 4, padding: 14, fontSize: 15, lineHeight: 1.8, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        {text && <div style={{ fontSize: 11, color: t.subtext, marginTop: 4, textAlign: "right" }}>{[...text].length.toLocaleString()}字</div>}
        <div style={{ marginTop: 18, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 4, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            APIキー（任意）
          </div>
          <div style={{ fontSize: 11, color: t.subtext, marginBottom: 8 }}>設定するとAIが自動でタイトルを生成します</div>
          <input type="password" value={apiKey} onChange={e => onApiKeyChange(e.target.value)} placeholder="sk-ant-..."
            style={{ width: "100%", background: t.bg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 3, padding: "9px 11px", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
    </div>
  );
}

// ── Reader ───────────────────────────────────────────────────────────────────
function Reader({ book, t, css, settings, onComplete, onAbandon }) {
  const chars = [...book.text];
  const total = chars.length;
  const [idx, setIdx] = useState(book.startIdx || 0);
  const [playing, setPlaying] = useState(false);
  const [showAbandon, setShowAbandon] = useState(false);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  const getDelay = useCallback((char) => {
    if ("。！？".includes(char)) return settings.pausePeriod;
    if ("、・…".includes(char)) return settings.pauseComma;
    return settings.charSpeed;
  }, [settings.charSpeed, settings.pausePeriod, settings.pauseComma]);

  useEffect(() => {
    if (!playing) { clearTimeout(timerRef.current); return; }
    if (!startTimeRef.current) startTimeRef.current = Date.now();
    if (idx >= total) {
      setPlaying(false);
      onComplete(Math.round((Date.now() - startTimeRef.current) / 1000));
      return;
    }
    timerRef.current = setTimeout(() => setIdx(i => i + 1), getDelay(chars[idx]));
    return () => clearTimeout(timerRef.current);
  }, [playing, idx]);

  const progress = total > 0 ? idx / total : 0;
  const remaining = Math.max(0, Math.round((total - idx) / (1000 / settings.charSpeed)));
  const rMin = Math.floor(remaining / 60), rSec = remaining % 60;
  const currentChar = chars[idx] || "";
  const fontSize = settings.fontSize || 120;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: t.flashBg }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ flex: 1, height: 4, background: t.trackBg, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: t.progress, borderRadius: 2, transition: "width 0.08s linear" }} />
        </div>
        <span style={{ fontSize: 12, color: t.subtext, minWidth: 56, textAlign: "right" }}>
          残り {rMin > 0 ? `${rMin}分` : ""}{rSec}秒
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{
          fontSize: fontSize,
          fontWeight: 700,
          color: t.flash,
          lineHeight: 1,
          minHeight: "1.2em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif",
          opacity: playing ? 1 : 0.3,
          transition: "opacity 0.06s, font-size 0.15s",
          userSelect: "none",
        }}>
          {!playing && idx === 0
            ? <svg width={fontSize * 0.5} height={fontSize * 0.5} viewBox="0 0 24 24" fill={t.flash} opacity="0.3"><polygon points="5,3 19,12 5,21"/></svg>
            : currentChar}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: t.subtext }}>{idx.toLocaleString()} / {total.toLocaleString()}字</div>
      </div>

      <div style={{ padding: "14px 14px 26px", background: t.surface, borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={() => setIdx(i => Math.max(0, i - 10))} style={{ ...css.secondaryBtn, padding: "8px 12px", fontSize: 12 }}>« 10字</button>
          <button
            onClick={() => { if (idx >= total) { setIdx(0); startTimeRef.current = null; } setPlaying(p => !p); }}
            style={{ ...css.primaryBtn, padding: "12px 34px", fontSize: 20, borderRadius: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {playing
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : idx >= total
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            }
          </button>
          <button onClick={() => setIdx(i => Math.min(total, i + 10))} style={{ ...css.secondaryBtn, padding: "8px 12px", fontSize: 12 }}>10字 »</button>
        </div>

        {!playing && idx > 0 && (
          <div style={{ textAlign: "center" }}>
            <button onClick={() => setShowAbandon(true)}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.subtext, borderRadius: 4, padding: "7px 18px", fontSize: 12, cursor: "pointer", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              中断してライブラリへ戻る
            </button>
          </div>
        )}
      </div>

      {showAbandon && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 5, padding: 22, maxWidth: 290, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 7 }}>中断しますか？</div>
            <div style={{ fontSize: 12, color: t.subtext, marginBottom: 18 }}>現在の位置（{Math.round(progress * 100)}%）を保存してライブラリに戻ります。</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAbandon(false)} style={{ ...css.secondaryBtn, flex: 1, padding: "9px" }}>キャンセル</button>
              <button onClick={() => onAbandon(idx)} style={{ ...css.primaryBtn, flex: 1, padding: "9px" }}>保存して戻る</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────
function Result({ book, t, css, onBack, onReread }) {
  const min = Math.floor((book.elapsed || 0) / 60), sec = (book.elapsed || 0) % 60;
  const speed = book.elapsed > 0 ? Math.round(book.charCount / book.elapsed * 60) : 0;
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 5, padding: 26, maxWidth: 320, width: "100%", textAlign: "center" }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>読了</div>
        <div style={{ fontSize: 12, color: t.subtext, marginBottom: 22 }}>{book.title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
          {[["文字数", `${book.charCount.toLocaleString()}字`], ["読書時間", min > 0 ? `${min}分${sec}秒` : `${sec}秒`], ["読書速度", `${speed.toLocaleString()}字/分`], ["読了回数", `${book.readCount}回目`]].map(([l, v]) => (
            <div key={l} style={{ background: t.accentLight, borderRadius: 4, padding: "10px 8px" }}>
              <div style={{ fontSize: 10, color: t.subtext, marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...css.secondaryBtn, flex: 1 }} onClick={onBack}>ライブラリへ</button>
          <button style={{ ...css.primaryBtn, flex: 1 }} onClick={onReread}>もう一度</button>
        </div>
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
function Settings({ t, css, settings, onUpdate, onBack, apiKey, onApiKeyChange }) {
  const sliderBg = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${t.slider} ${pct}%, ${t.trackBg} ${pct}%)`;
  };

  // charSpeed: low ms = fast, high ms = slow → slider left=fast(low ms), right=slow(high ms)
  // We invert by storing inverted value internally for display
  const SliderRow = ({ label, value, min, max, step, onChange, unit, leftLabel = "遅い", rightLabel = "速い", preview }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, color: t.accent, fontWeight: 700 }}>{preview !== undefined ? preview : `${value}${unit}`}</span>
      </div>
      <input
        type="range" className="fr-slider"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: sliderBg(value, min, max) }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: t.subtext }}>
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
    </div>
  );

  // For charSpeed: we want LEFT=速い RIGHT=遅い, but slider value increases left→right.
  // Solution: store speed in ms, invert display value. Slider min=50(fast) max=800(slow).
  // Left label=速い, right=遅い — slider bg shows progress from left naturally.
  // We flip the gradient to fill from RIGHT for speed slider.
  const speedSliderBg = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    // fill from right: fast=low value=left side filled little, slow=high value=right filled more
    // Actually we want: left=速い means moving right = slower. Fill from left still works, just swap labels.
    return `linear-gradient(to right, ${t.slider} ${pct}%, ${t.trackBg} ${pct}%)`;
  };

  return (
    <div>
      <header style={css.header}>
        <button style={css.iconBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <span style={{ ...css.headerTitle, fontSize: 15 }}>設定</span>
        <div style={{ width: 36 }} />
      </header>
      <div style={{ padding: "16px 14px", maxWidth: 460, margin: "0 auto" }}>

        {/* Theme */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>テーマ</div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(THEMES).map(([key, theme]) => (
              <button key={key} onClick={() => onUpdate({ theme: key })}
                style={{ flex: 1, padding: "9px 4px", borderRadius: 3, border: settings.theme === key ? `2px solid ${t.accent}` : `1.5px solid ${t.border}`, background: theme.bg, color: theme.text, cursor: "pointer", fontSize: 12, fontWeight: settings.theme === key ? 700 : 400 }}>
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        {/* Speed sliders */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>速度設定</div>

          {/* charSpeed: min=50(fast) max=800(slow), left=速い right=遅い */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>文字送り速度</span>
              <span style={{ fontSize: 13, color: t.accent, fontWeight: 700 }}>{settings.charSpeed}ms/字</span>
            </div>
            <input type="range" className="fr-slider" min={50} max={800} step={10} value={settings.charSpeed}
              onChange={e => onUpdate({ charSpeed: Number(e.target.value) })}
              style={{ background: speedSliderBg(settings.charSpeed, 50, 800) }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: t.subtext }}>
              <span>速い</span><span>遅い</span>
            </div>
          </div>

          <SliderRow label="句点（。）停止時間" value={settings.pausePeriod} min={100} max={2000} step={50}
            onChange={v => onUpdate({ pausePeriod: v })} unit="ms" leftLabel="短い" rightLabel="長い" />
          <SliderRow label="読点（、）停止時間" value={settings.pauseComma} min={50} max={1000} step={50}
            onChange={v => onUpdate({ pauseComma: v })} unit="ms" leftLabel="短い" rightLabel="長い" />

          <div style={{ marginTop: 6, padding: "8px 12px", background: t.accentLight, borderRadius: 3, fontSize: 12, color: t.subtext }}>
            目安: 約 {Math.round(60000 / settings.charSpeed).toLocaleString()}字/分
          </div>
        </div>

        {/* Font size slider */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>文字サイズ</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>表示サイズ</span>
              <span style={{ fontSize: 13, color: t.accent, fontWeight: 700 }}>{settings.fontSize}px</span>
            </div>
            <input type="range" className="fr-slider" min={60} max={220} step={10} value={settings.fontSize}
              onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
              style={{ background: sliderBg(settings.fontSize, 60, 220) }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: t.subtext }}>
              <span>小さい</span><span>大きい</span>
            </div>
          </div>
          {/* Preview */}
          <div style={{ textAlign: "center", padding: "16px 0 8px", borderTop: `1px solid ${t.border}` }}>
            <span style={{ fontSize: settings.fontSize * 0.45, fontWeight: 700, color: t.text, fontFamily: "'Hiragino Mincho ProN','Yu Mincho',serif", transition: "font-size 0.15s" }}>読</span>
            <div style={{ fontSize: 10, color: t.subtext, marginTop: 6 }}>プレビュー</div>
          </div>
        </div>

        {/* API Key */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            APIキー
          </div>
          <div style={{ fontSize: 11, color: t.subtext, marginBottom: 8 }}>設定するとAIが自動でタイトルを生成します</div>
          <input type="password" value={apiKey} onChange={e => onApiKeyChange(e.target.value)} placeholder="sk-ant-..."
            style={{ width: "100%", background: t.bg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 3, padding: "9px 11px", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
    </div>
  );
}

// ── Shared CSS ────────────────────────────────────────────────────────────────
function makeCSS(t) {
  return {
    app: { minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Hiragino Mincho ProN','Yu Mincho',serif", transition: "background 0.22s,color 0.22s" },
    header: { background: t.surface, borderBottom: `1px solid ${t.border}`, padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
    headerTitle: { fontSize: 17, fontWeight: 800, letterSpacing: "0.06em", color: t.accent },
    iconBtn: { background: "none", border: "none", color: t.subtext, cursor: "pointer", padding: "4px 8px", borderRadius: 3, display: "flex", alignItems: "center" },
    primaryBtn: { background: t.accent, color: "#fff", border: "none", borderRadius: 4, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", transition: "opacity 0.12s" },
    secondaryBtn: { background: "none", color: t.accent, border: `1.5px solid ${t.accent}`, borderRadius: 4, padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  };
}
