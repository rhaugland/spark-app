"use client";

import { useState, useEffect, useCallback } from "react";

// ===== TYPES =====
interface Listener { id: string; source: string; sourceId: string; label: string; category: string; config: unknown; active: boolean; }
interface CatalogItem { source: string; sourceId: string; label: string; category: string; group: string; fetchConfig: unknown; }
interface Insight {
  headline: string; context: string; suggestedMessage: string;
  urgency: "now" | "today" | "soon" | "whenever";
  eventTitle: string; category: string;
}

export default function Home() {
  const [tab, setTab] = useState<"feed" | "listeners">("feed");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [toast, setToast] = useState("");

  // Editable messages
  const [editedMsgs, setEditedMsgs] = useState<Record<number, string>>({});
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Listeners
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cMonth, setCMonth] = useState("");
  const [cDay, setCDay] = useState("");
  const [cDesc, setCDesc] = useState("");

  const showToast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); }, []);

  // ===== FETCHING =====
  const fetchListeners = useCallback(async () => {
    const r = await fetch("/api/listeners"); setListeners(await r.json());
  }, []);
  const fetchCatalog = useCallback(async () => {
    const r = await fetch("/api/listeners/catalog"); setCatalog(await r.json());
  }, []);
  const fetchInsights = useCallback(async () => {
    setFeedLoading(true);
    setEditedMsgs({});
    setExpandedCard(null);
    try {
      const r = await fetch("/api/insights");
      setInsights(await r.json());
    } catch { setInsights([]); }
    setFeedLoading(false);
  }, []);

  useEffect(() => { fetchListeners(); fetchCatalog(); }, [fetchListeners, fetchCatalog]);
  useEffect(() => { if (tab === "feed") fetchInsights(); }, [tab, fetchInsights]);

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
    fetchListeners(); showToast("Removed");
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
    setCName(""); setCMonth(""); setCDay(""); setCDesc(""); setShowCreate(false);
    fetchListeners(); showToast("Created!");
  }

  // ===== SEND =====
  async function sendMessage(text: string) {
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(text);
    showToast("Copied!");
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
      ? Object.fromEntries(Object.entries(groups).map(([g, items]) => [g, items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))]).filter(([, items]) => (items as CatalogItem[]).length > 0))
      : groups;

  const activeCount = listeners.filter(l => l.active).length;
  const customListeners = listeners.filter(l => l.source === "custom");

  const urgencyStyle: Record<string, string> = {
    now: "bg-red-500/20 text-red-400",
    today: "bg-[#ff6b35]/20 text-[#ff6b35]",
    soon: "bg-[#f59e0b]/20 text-[#f59e0b]",
    whenever: "bg-[#1f1f1f] text-[#666]",
  };
  const catColor: Record<string, string> = {
    nfl: "#ff6b35", nba: "#ef4444", mlb: "#22c55e", nhl: "#60a5fa",
    soccer: "#2ec4b6", crypto: "#a855f7", cultural: "#f59e0b", custom: "#2ec4b6",
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 px-5 py-3 flex items-center justify-between border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <h1 className="text-[22px] font-bold bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] bg-clip-text text-transparent">Spark</h1>
        {tab === "feed" && (
          <button onClick={fetchInsights} className="text-[13px] font-semibold text-[#666] active:text-white transition-colors">Refresh</button>
        )}
        {tab === "listeners" && (
          <button onClick={() => setShowCreate(true)} className="text-[13px] font-semibold text-[#ff6b35] px-3 py-1.5 rounded-lg bg-[#ff6b35]/10 active:scale-95 transition-transform">+ Custom</button>
        )}
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-white text-black text-[13px] font-semibold px-4 py-2 rounded-full shadow-lg animate-[fadeIn_0.2s]">{toast}</div>
      )}

      {/* Main */}
      <div className="flex-1 pt-[72px] pb-[88px] overflow-y-auto">
        <div className="px-4 py-4 max-w-lg mx-auto">

          {/* ===== FEED ===== */}
          {tab === "feed" && (
            <>
              {feedLoading && (
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-2 border-[#333] border-t-[#ff6b35] rounded-full animate-spin mx-auto mb-4" />
                  <div className="text-[14px] text-[#555] font-medium">Scanning your world...</div>
                </div>
              )}

              {!feedLoading && insights.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#333]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div className="text-[15px] text-[#555] font-medium">Your radar is quiet</div>
                  <div className="text-[13px] text-[#444] mt-1">
                    {activeCount === 0 ? "Turn on some listeners to start scanning" : "No insights right now — check back soon"}
                  </div>
                  {activeCount === 0 && (
                    <button onClick={() => setTab("listeners")} className="mt-4 px-5 py-2 rounded-xl bg-[#1a1a1a] text-[#888] text-[13px] font-medium">
                      Set Up Listeners
                    </button>
                  )}
                </div>
              )}

              {!feedLoading && insights.map((insight, i) => {
                const expanded = expandedCard === i;
                const accent = catColor[insight.category] || "#2ec4b6";
                return (
                  <div key={i} className="mb-4 rounded-2xl bg-[#141414] border border-[#1f1f1f] overflow-hidden">
                    <div className="h-1" style={{ background: accent }} />
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>{insight.category}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${urgencyStyle[insight.urgency] || urgencyStyle.whenever}`}>
                          {insight.urgency}
                        </span>
                      </div>

                      {/* Insight */}
                      <h3 className="text-[16px] font-semibold text-white mb-1 leading-snug">{insight.headline}</h3>
                      <p className="text-[13px] text-[#777] mb-3 leading-relaxed">{insight.context}</p>

                      {/* Expand to send */}
                      {!expanded ? (
                        <button onClick={() => setExpandedCard(i)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] text-white text-[13px] font-bold active:scale-[0.98] transition-transform">
                          Send This
                        </button>
                      ) : (
                        <div className="animate-[fadeIn_0.15s]">
                          <div className="bg-[#0a0a0a] rounded-xl p-3 mb-3 border border-[#1a1a1a]">
                            <div className="text-[9px] text-[#555] uppercase tracking-wider font-semibold mb-1.5">Edit message</div>
                            <textarea
                              value={editedMsgs[i] ?? insight.suggestedMessage}
                              onChange={e => setEditedMsgs(prev => ({ ...prev, [i]: e.target.value }))}
                              rows={3}
                              className="w-full text-[14px] text-white bg-transparent outline-none resize-none leading-relaxed"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => sendMessage(editedMsgs[i] ?? insight.suggestedMessage)}
                              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] text-white text-[13px] font-bold active:scale-[0.98] transition-transform">
                              Share
                            </button>
                            <button onClick={() => setExpandedCard(null)}
                              className="py-2.5 px-4 rounded-xl bg-[#1a1a1a] text-[#666] text-[13px] font-medium">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ===== LISTENERS ===== */}
          {tab === "listeners" && (
            <>
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#ff6b35]/10 to-[#ff9f1c]/5 border border-[#ff6b35]/20">
                <div className="text-[13px] text-[#999]">Active Listeners</div>
                <div className="text-[28px] font-bold text-white">{activeCount}</div>
              </div>

              {customListeners.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#555] mb-2 pl-1">Your Custom Listeners</h3>
                  {customListeners.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3 mb-2 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                      <div>
                        <div className="text-[14px] font-medium text-white">{l.label}</div>
                        <div className="text-[11px] text-[#555]">
                          {(() => { const c = l.config as { events?: { date?: string }[] }; const d = c?.events?.[0]?.date; return d ? `Date: ${d}` : "No date"; })()}
                        </div>
                      </div>
                      <button onClick={() => deleteListener(l.id)} className="text-[12px] text-[#555] hover:text-red-400 px-2 py-1 transition-colors">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <input type="text" placeholder="Search listeners..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full mb-3 p-3 rounded-xl bg-[#141414] border border-[#1f1f1f] text-[14px] text-white placeholder:text-[#444] outline-none focus:border-[#333]"
              />

              <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
                <button onClick={() => setGroupFilter(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium ${!groupFilter ? "bg-white text-black" : "bg-[#1a1a1a] text-[#666]"}`}>All</button>
                {groupNames.map(g => (
                  <button key={g} onClick={() => setGroupFilter(groupFilter === g ? null : g)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap ${groupFilter === g ? "bg-white text-black" : "bg-[#1a1a1a] text-[#666]"}`}>{g}</button>
                ))}
              </div>

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
        </div>
      </div>

      {/* Create Custom Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg bg-[#141414] rounded-t-3xl p-6 border-t border-[#2a2a2a]" onClick={e => e.stopPropagation()} style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom))" }}>
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mb-5" />
            <h2 className="text-[18px] font-bold mb-2">Create Custom Listener</h2>
            <p className="text-[13px] text-[#777] mb-4">Track any event — National Donut Day, a conference, an anniversary, anything.</p>
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
                {Array.from({ length: 31 }, (_, i) => (<option key={i + 1} value={String(i + 1)}>{i + 1}</option>))}
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
          { id: "feed" as const, label: "Feed", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10"/><path d="M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10"/>
            </svg>
          )},
          { id: "listeners" as const, label: "Listeners", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
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
