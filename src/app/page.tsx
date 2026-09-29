"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ===== TYPES =====
interface Listener { id: string; source: string; sourceId: string; label: string; category: string; config: unknown; active: boolean; }
interface NewsItem { title: string; detail: string; type: string; time: string; category: string; listenerLabel: string; }
interface CatalogItem { source: string; sourceId: string; label: string; category: string; group: string; fetchConfig: unknown; }

// ===== CANVAS HELPERS =====
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line + (line ? " " : "") + word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
  return curY;
}

const PALETTES: Record<string, { bg1: string; bg2: string; accent: string }> = {
  nfl: { bg1: "#0a1628", bg2: "#1a2a4a", accent: "#ff6b35" },
  nba: { bg1: "#1a0a28", bg2: "#2a1a4a", accent: "#ef4444" },
  mlb: { bg1: "#0a1a12", bg2: "#0a2a1a", accent: "#22c55e" },
  nhl: { bg1: "#0a0a1a", bg2: "#1a1a3a", accent: "#60a5fa" },
  soccer: { bg1: "#0a1a0a", bg2: "#0a2a1a", accent: "#2ec4b6" },
  crypto: { bg1: "#0f0a1a", bg2: "#1a0a2a", accent: "#a855f7" },
  cultural: { bg1: "#1a0a0a", bg2: "#2a1a0a", accent: "#f59e0b" },
  custom: { bg1: "#0a1a2a", bg2: "#0a2a3a", accent: "#2ec4b6" },
};

function drawCanvas(canvas: HTMLCanvasElement, item: NewsItem, recipientName: string, customMsg: string) {
  const ctx = canvas.getContext("2d")!;
  const s = 1080;
  canvas.width = s;
  canvas.height = s;

  const pal = PALETTES[item.category] || PALETTES.custom;

  // Background
  const grad = ctx.createLinearGradient(0, 0, s * 0.3, s);
  grad.addColorStop(0, pal.bg1);
  grad.addColorStop(1, pal.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  // Decorative elements
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(s * 0.85, s * 0.15, 280, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.1, s * 0.85, 220, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s * 0.85, s * 0.15, 180 + i * 80, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Accent bar
  ctx.fillStyle = pal.accent;
  ctx.fillRect(80, 80, 50, 6);

  let y = 140;

  // Category / listener label
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = pal.accent;
  ctx.fillText(item.listenerLabel.toUpperCase(), 80, y);
  y += 70;

  // Recipient
  if (recipientName.trim()) {
    ctx.font = "500 54px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`Hey ${recipientName.trim()}!`, 80, y);
    y += 80;
  }

  // Title
  ctx.font = "bold 68px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ffffff";
  y = wrapText(ctx, item.title, 80, y, s - 160, 82);
  y += 50;

  // Detail
  ctx.font = "400 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  y = wrapText(ctx, item.detail, 80, y, s - 160, 44);

  // Time badge (top right)
  if (item.time) {
    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const tw = ctx.measureText(item.time.toUpperCase()).width;
    const bx = s - 80 - tw - 32;
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.15;
    roundRect(ctx, bx, 76, tw + 32, 38, 19);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.accent;
    ctx.fillText(item.time.toUpperCase(), bx + 16, 102);
  }

  // Custom message
  if (customMsg.trim()) {
    ctx.font = "italic 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    wrapText(ctx, `"${customMsg.trim()}"`, 80, s - 200, s - 160, 40);
  }

  // Branding
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillText("SPARK", 80, s - 50);

  // Accent line bottom
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, s - 6, s, 6);
  ctx.globalAlpha = 1;
}

function buildText(item: NewsItem, recipientName: string, customMsg: string): string {
  let t = "";
  if (recipientName.trim()) t += `Hey ${recipientName.trim()}! `;
  t += item.title;
  if (item.detail) t += `\n${item.detail}`;
  if (item.time && item.time !== "Live") t += ` (${item.time})`;
  if (customMsg.trim()) t += `\n\n${customMsg.trim()}`;
  return t;
}

// ===== MAIN COMPONENT =====
export default function Home() {
  const [tab, setTab] = useState<"listeners" | "news" | "content">("listeners");
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [toast, setToast] = useState("");

  // Listener state
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cMonth, setCMonth] = useState("");
  const [cDay, setCDay] = useState("");
  const [cDesc, setCDesc] = useState("");

  // Content state
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [format, setFormat] = useState<"image" | "gif" | "text">("image");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const showToast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); }, []);

  const fetchListeners = useCallback(async () => {
    const r = await fetch("/api/listeners"); setListeners(await r.json());
  }, []);
  const fetchCatalog = useCallback(async () => {
    const r = await fetch("/api/listeners/catalog"); setCatalog(await r.json());
  }, []);
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    const r = await fetch("/api/events"); setNews(await r.json()); setNewsLoading(false);
  }, []);

  useEffect(() => { fetchListeners(); fetchCatalog(); }, [fetchListeners, fetchCatalog]);
  useEffect(() => { if (tab === "news") fetchNews(); }, [tab, fetchNews]);

  // ===== LISTENER ACTIONS =====
  const isActive = (sourceId: string) => listeners.some(l => l.sourceId === sourceId && l.active);

  async function toggleListener(item: CatalogItem) {
    await fetch("/api/listeners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: item.source, sourceId: item.sourceId, label: item.label, category: item.category, config: item.fetchConfig }),
    });
    fetchListeners();
  }

  async function deleteListener(id: string) {
    await fetch(`/api/listeners/${id}`, { method: "DELETE" });
    fetchListeners();
    showToast("Removed");
  }

  async function createCustom() {
    if (!cName.trim()) return;
    const dateStr = cMonth && cDay ? `${cMonth.padStart(2, "0")}-${cDay.padStart(2, "0")}` : "";
    await fetch("/api/listeners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "custom", sourceId: `custom-${Date.now()}`, label: cName.trim(), category: "custom",
        config: { events: [{ name: cName.trim(), date: dateStr, description: cDesc.trim() || cName.trim() }] },
      }),
    });
    setCName(""); setCMonth(""); setCDay(""); setCDesc("");
    setShowCreate(false);
    fetchListeners();
    showToast("Listener created!");
  }

  // ===== CONTENT ACTIONS =====
  function selectForContent(item: NewsItem) {
    setSelectedItem(item);
    setGenerated(false);
    setFormat("image");
    setRecipient("");
    setMessage("");
    setTab("content");
  }

  function generate() {
    if (!selectedItem) return;
    if (format === "text") { setGenerated(true); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCanvas(canvas, selectedItem, recipient, message);
    setGenerated(true);
  }

  async function shareContent() {
    if (!selectedItem) return;

    if (format === "text") {
      const text = buildText(selectedItem, recipient, message);
      if (navigator.share) {
        try { await navigator.share({ text }); } catch { /* cancelled */ }
      } else {
        await navigator.clipboard.writeText(text);
        showToast("Copied!");
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "spark-content.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch { /* cancelled */ }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "spark-content.png"; a.click();
        URL.revokeObjectURL(url);
        showToast("Downloaded!");
      }
    }, "image/png");
  }

  // ===== CATALOG GROUPING =====
  const groups = catalog.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});
  const groupNames = Object.keys(groups);

  const filteredGroups: Record<string, CatalogItem[]> = groupFilter
    ? { [groupFilter]: (groups[groupFilter] || []).filter(i => i.label.toLowerCase().includes(search.toLowerCase())) }
    : search
      ? Object.fromEntries(
          Object.entries(groups)
            .map(([g, items]) => [g, items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))])
            .filter(([, items]) => (items as CatalogItem[]).length > 0)
        )
      : groups;

  const activeCount = listeners.filter(l => l.active).length;
  const customListeners = listeners.filter(l => l.source === "custom");

  // ===== RENDER =====
  return (
    <div className="min-h-dvh flex flex-col bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 px-5 py-3 flex items-center justify-between border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <h1 className="text-[22px] font-bold bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] bg-clip-text text-transparent">Spark</h1>
        {tab === "listeners" && (
          <button onClick={() => setShowCreate(true)} className="text-[13px] font-semibold text-[#ff6b35] px-3 py-1.5 rounded-lg bg-[#ff6b35]/10 active:scale-95 transition-transform">
            + Custom
          </button>
        )}
        {tab === "news" && (
          <button onClick={fetchNews} className="text-[13px] font-semibold text-[#888] active:text-white transition-colors">
            Refresh
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-white text-black text-[13px] font-semibold px-4 py-2 rounded-full shadow-lg animate-[fadeIn_0.2s]">
          {toast}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 pt-[72px] pb-[88px] overflow-y-auto">
        <div className="px-4 py-4 max-w-lg mx-auto">

          {/* ===== LISTENERS TAB ===== */}
          {tab === "listeners" && (
            <>
              {/* Active summary */}
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#ff6b35]/10 to-[#ff9f1c]/5 border border-[#ff6b35]/20">
                <div className="text-[13px] text-[#999]">Active Listeners</div>
                <div className="text-[28px] font-bold text-white">{activeCount}</div>
              </div>

              {/* Custom listeners */}
              {customListeners.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#666] mb-2 pl-1">Your Custom Listeners</h3>
                  {customListeners.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3 mb-2 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                      <div>
                        <div className="text-[14px] font-medium text-white">{l.label}</div>
                        <div className="text-[11px] text-[#666]">
                          {(() => {
                            const config = l.config as { events?: { date?: string }[] };
                            const date = config?.events?.[0]?.date;
                            return date ? `Date: ${date}` : "No date set";
                          })()}
                        </div>
                      </div>
                      <button onClick={() => deleteListener(l.id)} className="text-[12px] text-[#666] hover:text-red-400 px-2 py-1 transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <input
                type="text" placeholder="Search listeners..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full mb-3 p-3 rounded-xl bg-[#141414] border border-[#1f1f1f] text-[14px] text-white placeholder:text-[#555] outline-none focus:border-[#333]"
              />

              {/* Group filter */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
                <button onClick={() => setGroupFilter(null)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${!groupFilter ? "bg-white text-black" : "bg-[#1a1a1a] text-[#888]"}`}>
                  All
                </button>
                {groupNames.map(g => (
                  <button key={g} onClick={() => setGroupFilter(groupFilter === g ? null : g)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap ${groupFilter === g ? "bg-white text-black" : "bg-[#1a1a1a] text-[#888]"}`}>
                    {g}
                  </button>
                ))}
              </div>

              {/* Catalog */}
              {Object.entries(filteredGroups).map(([g, items]) => (
                <div key={g} className="mb-5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#555] mb-2 pl-1">{g}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map(item => {
                      const active = isActive(item.sourceId);
                      return (
                        <button key={item.sourceId} onClick={() => toggleListener(item)}
                          className={`p-3 rounded-xl text-left text-[13px] font-medium border transition-all active:scale-[0.96] ${active ? "bg-[#2ec4b6]/10 border-[#2ec4b6]/30 text-[#2ec4b6]" : "bg-[#141414] border-[#1f1f1f] text-[#888]"}`}>
                          <div className="flex items-center justify-between">
                            <span className="truncate">{item.label}</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${active ? "border-[#2ec4b6] bg-[#2ec4b6]" : "border-[#333]"}`}>
                              {active && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ===== NEWS TAB ===== */}
          {tab === "news" && (
            <>
              {newsLoading && (
                <div className="text-center py-12 text-[#555]">
                  <div className="w-6 h-6 border-2 border-[#333] border-t-[#ff6b35] rounded-full animate-spin mx-auto mb-3" />
                  Loading news...
                </div>
              )}

              {!newsLoading && news.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-[40px] mb-3 opacity-20">
                    <svg className="w-12 h-12 mx-auto text-[#333]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z"/>
                    </svg>
                  </div>
                  <div className="text-[15px] text-[#555] font-medium">No news yet</div>
                  <div className="text-[13px] text-[#444] mt-1">Add listeners to start getting updates</div>
                </div>
              )}

              {!newsLoading && news.map((item, i) => (
                <div key={i} className="mb-3 p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item.time === "LIVE" ? "bg-red-500/20 text-red-400" :
                      item.time === "Today" ? "bg-[#ff6b35]/20 text-[#ff6b35]" :
                      "bg-[#1f1f1f] text-[#666]"
                    }`}>
                      {item.time}
                    </span>
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">{item.listenerLabel}</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-[13px] text-[#888] mb-3">{item.detail}</p>
                  <button onClick={() => selectForContent(item)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] text-white text-[13px] font-semibold active:scale-[0.98] transition-transform">
                    Create Content
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ===== CONTENT TAB ===== */}
          {tab === "content" && (
            <>
              {!selectedItem ? (
                <div className="text-center py-16">
                  <svg className="w-12 h-12 mx-auto text-[#333] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  <div className="text-[15px] text-[#555] font-medium">No item selected</div>
                  <div className="text-[13px] text-[#444] mt-1">Go to News and tap &quot;Create Content&quot;</div>
                  <button onClick={() => setTab("news")} className="mt-4 px-5 py-2 rounded-xl bg-[#1a1a1a] text-[#888] text-[13px] font-medium">
                    Go to News
                  </button>
                </div>
              ) : (
                <>
                  {/* Selected item summary */}
                  <div className="mb-4 p-3 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                    <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{selectedItem.listenerLabel}</div>
                    <div className="text-[14px] font-semibold text-white">{selectedItem.title}</div>
                    <div className="text-[12px] text-[#666]">{selectedItem.detail}</div>
                  </div>

                  {/* Format picker */}
                  <div className="flex gap-2 mb-4">
                    {(["image", "gif", "text"] as const).map(f => (
                      <button key={f} onClick={() => { setFormat(f); setGenerated(false); }}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${format === f ? "bg-white text-black" : "bg-[#1a1a1a] text-[#666]"}`}>
                        {f === "image" ? "Image" : f === "gif" ? "GIF" : "Text"}
                      </button>
                    ))}
                  </div>

                  {/* Personalization */}
                  <div className="space-y-3 mb-4">
                    <input type="text" placeholder="Recipient name (optional)" value={recipient}
                      onChange={e => { setRecipient(e.target.value); setGenerated(false); }}
                      className="w-full p-3 rounded-xl bg-[#141414] border border-[#1f1f1f] text-[14px] text-white placeholder:text-[#444] outline-none focus:border-[#333]"
                    />
                    <textarea placeholder="Add a personal message (optional)" value={message}
                      onChange={e => { setMessage(e.target.value); setGenerated(false); }}
                      rows={2}
                      className="w-full p-3 rounded-xl bg-[#141414] border border-[#1f1f1f] text-[14px] text-white placeholder:text-[#444] outline-none focus:border-[#333] resize-none"
                    />
                  </div>

                  {/* Generate button */}
                  <button onClick={generate}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] text-white text-[14px] font-bold active:scale-[0.98] transition-transform mb-4">
                    {generated ? "Regenerate" : "Generate"} {format === "text" ? "Text" : format === "gif" ? "GIF" : "Image"}
                  </button>

                  {format === "gif" && !generated && (
                    <div className="text-[12px] text-[#555] text-center mb-4 -mt-2">
                      AI-powered GIF generation coming soon. Generates as image for now.
                    </div>
                  )}

                  {/* Preview */}
                  {generated && format === "text" && (
                    <div className="mb-4">
                      <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] text-[14px] text-white whitespace-pre-wrap leading-relaxed">
                        {buildText(selectedItem, recipient, message)}
                      </div>
                    </div>
                  )}

                  <div className={format !== "text" ? "" : "hidden"}>
                    <canvas ref={canvasRef} className="w-full rounded-xl mb-4" style={{ display: generated ? "block" : "none" }} />
                  </div>

                  {/* Actions */}
                  {generated && (
                    <div className="flex gap-3">
                      <button onClick={shareContent}
                        className="flex-1 py-3 rounded-xl bg-[#2ec4b6] text-white text-[14px] font-bold active:scale-[0.98] transition-transform">
                        {format === "text" ? "Copy / Share" : "Send / Share"}
                      </button>
                      <button onClick={() => { setGenerated(false); setSelectedItem(null); setTab("news"); }}
                        className="py-3 px-5 rounded-xl bg-[#1a1a1a] text-[#888] text-[14px] font-medium">
                        Done
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Custom Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg bg-[#141414] rounded-t-3xl p-6 pb-10 border-t border-[#2a2a2a]" onClick={e => e.stopPropagation()} style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom))" }}>
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mb-5" />
            <h2 className="text-[18px] font-bold mb-4">Create Custom Listener</h2>
            <p className="text-[13px] text-[#888] mb-4">Add any event, holiday, or date you want to track. Think: National Donut Day, friend&apos;s anniversary, industry events.</p>

            <input type="text" placeholder="Event name *" value={cName} onChange={e => setCName(e.target.value)}
              className="w-full mb-3 p-3 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] text-[14px] text-white placeholder:text-[#555] outline-none focus:border-[#333]"
            />

            <div className="flex gap-3 mb-3">
              <select value={cMonth} onChange={e => setCMonth(e.target.value)}
                className="flex-1 p-3 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] text-[14px] text-white outline-none appearance-none">
                <option value="">Month</option>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <select value={cDay} onChange={e => setCDay(e.target.value)}
                className="flex-1 p-3 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] text-[14px] text-white outline-none appearance-none">
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                ))}
              </select>
            </div>

            <textarea placeholder="Description (optional)" value={cDesc} onChange={e => setCDesc(e.target.value)} rows={2}
              className="w-full mb-4 p-3 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] text-[14px] text-white placeholder:text-[#555] outline-none focus:border-[#333] resize-none"
            />

            <button onClick={createCustom} disabled={!cName.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] text-white text-[14px] font-bold disabled:opacity-40 active:scale-[0.98] transition-transform">
              Create Listener
            </button>
          </div>
        </div>
      )}

      {/* Bottom tabs */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {([
          { id: "listeners" as const, label: "Listeners", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2a7 7 0 017 7c0 3-2 5.5-4 7.5L12 22l-3-5.5C7 14.5 5 12 5 9a7 7 0 017-7z"/>
              <circle cx="12" cy="9" r="2"/>
            </svg>
          )},
          { id: "news" as const, label: "News", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"/>
              <path d="M7 7h10M7 11h6M7 15h8"/>
            </svg>
          )},
          { id: "content" as const, label: "Content", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
          )},
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${tab === t.id ? "text-[#ff6b35]" : "text-[#555]"}`}>
            {t.icon}
            <span className="text-[10px] font-semibold">{t.label}</span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </div>
  );
}
