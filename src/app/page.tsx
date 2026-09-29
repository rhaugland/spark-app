"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ===== TYPES =====
interface Interest { id: string; label: string; category: string | null; }
interface Friend { id: string; name: string; phone: string | null; birthday: string | null; interests: Interest[]; }
interface Listener { id: string; source: string; sourceId: string; label: string; category: string; config: unknown; active: boolean; }
interface FeedItem { title: string; detail: string; type: string; time: string; category: string; listenerLabel: string; friends: { id: string; name: string }[]; }
interface CatalogItem { source: string; sourceId: string; label: string; category: string; group: string; fetchConfig: unknown; }

const CATEGORIES = [
  { id: "nfl", label: "NFL" }, { id: "nba", label: "NBA" }, { id: "mlb", label: "MLB" },
  { id: "nhl", label: "NHL" }, { id: "golf", label: "Golf" }, { id: "soccer", label: "Soccer" },
  { id: "mma", label: "MMA/UFC" }, { id: "bourbon", label: "Bourbon" }, { id: "beer", label: "Craft Beer" },
  { id: "wine", label: "Wine" }, { id: "coffee", label: "Coffee" }, { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" }, { id: "movies", label: "Movies" }, { id: "fitness", label: "Fitness" },
  { id: "cooking", label: "Cooking" }, { id: "travel", label: "Travel" }, { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "Stocks" }, { id: "fishing", label: "Fishing" }, { id: "hiking", label: "Hiking" },
  { id: "cars", label: "Cars" }, { id: "cultural", label: "Cultural" },
];

const COLORS = [
  { bg: "rgba(255,107,53,0.15)", fg: "#ff6b35" }, { bg: "rgba(78,168,222,0.15)", fg: "#4ea8de" },
  { bg: "rgba(176,124,216,0.15)", fg: "#b07cd8" }, { bg: "rgba(46,196,182,0.15)", fg: "#2ec4b6" },
  { bg: "rgba(239,68,68,0.15)", fg: "#ef4444" }, { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" },
  { bg: "rgba(16,185,129,0.15)", fg: "#10b981" }, { bg: "rgba(124,58,237,0.15)", fg: "#7c3aed" },
];

export default function Home() {
  const [tab, setTab] = useState<"friends" | "listeners" | "feed">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeListeners, setActiveListeners] = useState<Listener[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [toast, setToast] = useState("");
  const [listenerSearch, setListenerSearch] = useState("");
  const [listenerGroup, setListenerGroup] = useState<string | null>(null);
  const [generatedEvents, setGeneratedEvents] = useState<Set<number>>(new Set());
  const [generatingEvent, setGeneratingEvent] = useState<number | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const animFrames = useRef<Map<number, number>>(new Map());

  // Form
  const [fn, setFn] = useState(""); const [fp, setFp] = useState("");
  const [fb, setFb] = useState(""); const [fi, setFi] = useState<Set<string>>(new Set());
  const [fc, setFc] = useState("");

  const showToast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); }, []);

  const fetchFriends = useCallback(async () => {
    const r = await fetch("/api/friends"); setFriends(await r.json()); setLoading(false);
  }, []);

  const fetchListeners = useCallback(async () => {
    const r = await fetch("/api/listeners"); setActiveListeners(await r.json());
  }, []);

  const fetchCatalog = useCallback(async () => {
    const r = await fetch("/api/listeners/catalog"); setCatalog(await r.json());
  }, []);

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    const r = await fetch("/api/events"); setFeed(await r.json()); setFeedLoading(false);
  }, []);

  useEffect(() => { fetchFriends(); fetchListeners(); fetchCatalog(); }, [fetchFriends, fetchListeners, fetchCatalog]);
  useEffect(() => { if (tab === "feed") fetchFeed(); }, [tab, fetchFeed]);

  // ===== CONTACTS =====
  async function pickContact() {
    if ("contacts" in navigator && "ContactsManager" in window) {
      try {
        // @ts-expect-error Contacts API
        const c = await navigator.contacts.select(["name", "tel"], { multiple: false });
        if (c.length) { setFn(c[0].name?.[0] || ""); setFp(c[0].tel?.[0] || ""); showToast("Contact imported!"); }
      } catch { showToast("Cancelled"); }
    } else { showToast("Contacts API not available - add manually"); }
  }

  // ===== FRIEND CRUD =====
  function openAdd() {
    if (friends.length >= 15) { showToast("Max 15 friends"); return; }
    setEditingFriend(null); setFn(""); setFp(""); setFb(""); setFi(new Set()); setFc(""); setModal("add");
  }
  function openEdit(f: Friend) {
    setEditingFriend(f); setFn(f.name); setFp(f.phone || ""); setFb(f.birthday || "");
    setFi(new Set(f.interests.filter(i => i.category).map(i => i.category!)));
    setFc(f.interests.filter(i => !i.category).map(i => i.label).join(", ")); setModal("edit");
  }

  async function saveFriend() {
    if (!fn.trim()) { showToast("Enter a name"); return; }
    const ints = [
      ...Array.from(fi).map(id => ({ label: CATEGORIES.find(c => c.id === id)?.label || id, category: id })),
      ...fc.split(",").map(s => s.trim()).filter(Boolean).map(s => ({ label: s, category: undefined })),
    ];
    const body = { name: fn.trim(), phone: fp.trim() || null, birthday: fb || null, interests: ints };
    if (modal === "edit" && editingFriend) {
      await fetch(`/api/friends/${editingFriend.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      showToast(`${fn} updated!`);
    } else {
      const r = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { showToast((await r.json()).error || "Error"); return; }
      showToast(`${fn} added!`);
    }
    setModal(null); fetchFriends();
  }

  async function removeFriend(id: string, name: string) {
    await fetch(`/api/friends/${id}`, { method: "DELETE" }); showToast(`${name} removed`); fetchFriends();
  }

  // ===== LISTENER TOGGLE =====
  async function toggleListener(item: CatalogItem) {
    await fetch("/api/listeners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: item.source, sourceId: item.sourceId,
        label: item.label, category: item.category,
        config: item.fetchConfig,
      }),
    });
    fetchListeners();
  }

  function isListenerActive(sourceId: string) {
    return activeListeners.some(l => l.sourceId === sourceId && l.active);
  }

  // ===== CONTENT GENERATION =====
  function createContent(idx: number, ev: FeedItem) {
    setGeneratingEvent(idx);
    setTimeout(() => {
      setGeneratingEvent(null);
      setGeneratedEvents(prev => new Set(prev).add(idx));
      const canvas = canvasRefs.current.get(idx);
      if (canvas) startAnimation(canvas, idx, ev);
      showToast("Content created!");
    }, 1200);
  }

  function startAnimation(canvas: HTMLCanvasElement, idx: number, ev: FeedItem) {
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height; let frame = 0;
    const prev = animFrames.current.get(idx); if (prev) cancelAnimationFrame(prev);
    function draw() {
      if (!ctx) return; ctx.clearRect(0, 0, W, H);
      if (ev.type === "sports") drawSports(ctx, W, H, frame, ev.title);
      else if (ev.type === "market") drawMarket(ctx, W, H, frame, ev.title);
      else if (ev.type === "birthday") drawBirthday(ctx, W, H, frame, ev.friends[0]?.name || "");
      else drawGeneric(ctx, W, H, frame, ev.title, ev.category);
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.font = "600 10px Inter,sans-serif"; ctx.textAlign = "right";
      ctx.fillText("made with Spark", W - 12, H - 10);
      frame++; animFrames.current.set(idx, requestAnimationFrame(draw));
    }
    draw();
  }

  // ===== RENDER HELPERS =====
  const col = (i: number) => COLORS[i % COLORS.length];

  const groups = catalog.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const groupNames = Object.keys(groups);

  const filteredGroups: Record<string, CatalogItem[]> = listenerGroup
    ? { [listenerGroup]: groups[listenerGroup]?.filter(i => i.label.toLowerCase().includes(listenerSearch.toLowerCase())) || [] }
    : listenerSearch
      ? Object.fromEntries(Object.entries(groups).map(([g, items]) => [g, items.filter(i => i.label.toLowerCase().includes(listenerSearch.toLowerCase()))]).filter(([, items]) => (items as CatalogItem[]).length > 0))
      : groups;

  const activeCount = activeListeners.filter(l => l.active).length;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-5 py-3 flex items-center justify-between border-b border-[#2a2a2a] bg-[#0a0a0a]/85 backdrop-blur-xl" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <h1 className="text-[22px] font-bold bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] bg-clip-text text-transparent">Spark</h1>
        <div className="flex gap-2">
          <span className="text-[11px] text-[#888] bg-[#1e1e1e] px-2.5 py-1 rounded-xl border border-[#2a2a2a]">{friends.length}/15 friends</span>
          <span className="text-[11px] text-[#888] bg-[#1e1e1e] px-2.5 py-1 rounded-xl border border-[#2a2a2a]">{activeCount} listeners</span>
        </div>
      </div>

      {/* Toast */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] bg-black/90 text-white px-7 py-4 rounded-2xl text-[15px] font-semibold text-center transition-all duration-300 pointer-events-none ${toast ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>{toast}</div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-end justify-center">
          <div className="bg-[#161616] rounded-t-3xl p-6 w-full max-w-[420px] max-h-[85dvh] overflow-y-auto" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <h2 className="text-xl font-bold mb-1">{modal === "edit" ? "Edit friend" : "Add a friend"}</h2>
            <p className="text-[13px] text-[#888] mb-5">{modal === "edit" ? "Update their info and interests." : "Tag what matters to them."}</p>
            {modal === "add" && (
              <>
                <button onClick={pickContact} className="w-full p-3.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-2 active:border-[#ff6b35]">
                  <svg className="w-[18px] h-[18px] text-[#ff6b35]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Import from Contacts
                </button>
                <div className="text-center text-[#888] text-xs my-3 relative before:absolute before:left-0 before:top-1/2 before:w-[38%] before:h-px before:bg-[#2a2a2a] after:absolute after:right-0 after:top-1/2 after:w-[38%] after:h-px after:bg-[#2a2a2a]">or manually</div>
              </>
            )}
            <Field label="Name" value={fn} onChange={setFn} placeholder="Dave" />
            <Field label="Phone" value={fp} onChange={setFp} placeholder="+1 555 123 4567" type="tel" />
            <Field label="Birthday" value={fb} onChange={setFb} type="date" />
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Interests</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFi(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                  className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all ${fi.has(c.id) ? "bg-[#ff6b35]/15 border-[#ff6b35] text-[#ff6b35]" : "bg-[#1e1e1e] border-[#2a2a2a] text-[#888]"}`}>{c.label}</button>
              ))}
            </div>
            <Field label="Custom interests" value={fc} onChange={setFc} placeholder="Chicago Bears, woodworking..." />
            <button onClick={saveFriend} className="w-full p-3.5 bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] rounded-xl text-white text-[15px] font-semibold active:scale-[0.97]">{modal === "edit" ? "Save Changes" : "Add Friend"}</button>
            <button onClick={() => setModal(null)} className="w-full p-3.5 bg-[#1e1e1e] rounded-xl text-[15px] font-semibold mt-2 active:scale-[0.97]">Cancel</button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pt-[60px] pb-[90px] flex-1">
        {/* ===== FRIENDS TAB ===== */}
        {tab === "friends" && (
          <div className="p-4">
            <button onClick={openAdd} disabled={friends.length >= 15} className="w-full p-3.5 bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 mb-4 active:scale-[0.97] disabled:opacity-40">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Add Friend
            </button>
            {loading ? <p className="text-center py-20 text-[#888] text-sm">Loading...</p> :
            friends.length === 0 ? (
              <div className="text-center py-16 px-5"><div className="text-5xl mb-4 opacity-30">&#x1F465;</div><h3 className="text-lg font-semibold mb-2">No friends yet</h3><p className="text-[13px] text-[#888] leading-relaxed">Add up to 15 friends and tag their interests.</p></div>
            ) : friends.map((f, i) => (
              <div key={f.id} className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-4 mb-2.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0" style={{ background: col(i).bg, color: col(i).fg }}>{f.name[0].toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><h3 className="text-[15px] font-semibold truncate">{f.name}</h3><p className="text-xs text-[#888] mt-0.5 truncate">{[f.phone, f.birthday && new Date(f.birthday+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})].filter(Boolean).join(" \u00B7 ")}</p></div>
                  <button onClick={() => openEdit(f)} className="w-7 h-7 rounded-full border border-[#2a2a2a] text-[#888] flex items-center justify-center shrink-0 active:bg-[#ff6b35] active:text-white active:border-[#ff6b35]">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => removeFriend(f.id, f.name)} className="w-7 h-7 rounded-full border border-[#2a2a2a] text-[#888] flex items-center justify-center shrink-0 active:bg-[#ef4444] active:text-white">&times;</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.interests.map(int => <span key={int.id} className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-[#ff6b35]/10 border border-[#ff6b35]/30 text-[#ff6b35]">{int.label}</span>)}
                  {f.interests.length === 0 && <span className="text-xs text-[#888] italic">No interests yet</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== LISTENERS TAB ===== */}
        {tab === "listeners" && (
          <div className="p-4">
            {/* Search */}
            <input value={listenerSearch} onChange={e => setListenerSearch(e.target.value)} placeholder="Search teams, coins, cultures..." className="w-full p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl text-sm outline-none focus:border-[#ff6b35] mb-3 placeholder:text-[#555]" />

            {/* Group pills */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
              <button onClick={() => setListenerGroup(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${!listenerGroup ? "bg-[#ff6b35]/15 border-[#ff6b35] text-[#ff6b35]" : "bg-[#1e1e1e] border-[#2a2a2a] text-[#888]"}`}>All</button>
              {groupNames.map(g => (
                <button key={g} onClick={() => setListenerGroup(listenerGroup === g ? null : g)} className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${listenerGroup === g ? "bg-[#ff6b35]/15 border-[#ff6b35] text-[#ff6b35]" : "bg-[#1e1e1e] border-[#2a2a2a] text-[#888]"}`}>{g}</button>
              ))}
            </div>

            {/* Active listeners summary */}
            {activeCount > 0 && (
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-3 mb-4">
                <p className="text-xs text-[#888] mb-2">{activeCount} active listener{activeCount !== 1 ? "s" : ""}</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeListeners.filter(l => l.active).map(l => (
                    <span key={l.id} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[#2ec4b6]/10 border border-[#2ec4b6]/30 text-[#2ec4b6]">{l.label}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Catalog */}
            {Object.entries(filteredGroups).map(([group, items]) => (
              <div key={group} className="mb-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2 pl-1">{group}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(item => {
                    const active = isListenerActive(item.sourceId);
                    return (
                      <button key={item.sourceId} onClick={() => toggleListener(item)}
                        className={`p-3 rounded-xl text-left text-[13px] font-medium border transition-all active:scale-[0.96] ${active ? "bg-[#2ec4b6]/10 border-[#2ec4b6]/40 text-[#2ec4b6]" : "bg-[#161616] border-[#2a2a2a] text-[#888]"}`}>
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.label}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${active ? "border-[#2ec4b6] bg-[#2ec4b6]" : "border-[#2a2a2a]"}`}>
                            {active && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== FEED TAB ===== */}
        {tab === "feed" && (
          <div className="p-4">
            {feedLoading ? <p className="text-center py-20 text-[#888] text-sm">Fetching live events...</p> :
            feed.length === 0 ? (
              <div className="text-center py-16 px-5"><div className="text-5xl mb-4 opacity-30">&#x26A1;</div><h3 className="text-lg font-semibold mb-2">{activeCount === 0 ? "No listeners active" : "No events right now"}</h3><p className="text-[13px] text-[#888]">{activeCount === 0 ? "Turn on some listeners first." : "Check back later for live events."}</p></div>
            ) : feed.map((ev, idx) => {
              const tc: Record<string, { bg: string; fg: string }> = {
                sports: { bg: "rgba(78,168,222,0.15)", fg: "#4ea8de" }, market: { bg: "rgba(34,197,94,0.15)", fg: "#22c55e" },
                birthday: { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" }, event: { bg: "rgba(176,124,216,0.15)", fg: "#b07cd8" },
                upcoming: { bg: "rgba(101,163,13,0.15)", fg: "#65a30d" },
              };
              const c = tc[ev.type] || tc.sports;
              const isGen = generatedEvents.has(idx);
              const isGening = generatingEvent === idx;
              return (
                <div key={idx} className="bg-[#161616] border border-[#2a2a2a] rounded-2xl mb-3 overflow-hidden">
                  <div className="p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: c.bg, color: c.fg }}>
                      {ev.type === "sports" ? "\u{1F3C8}" : ev.type === "market" ? "\u{1F4C8}" : ev.type === "birthday" ? "\u{1F382}" : ev.type === "event" ? "\u{1F389}" : "\u{1F4C5}"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{ev.title}</h3>
                      <p className="text-xs text-[#888] mt-0.5 truncate">{ev.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-semibold ${ev.time === "LIVE" ? "text-[#ef4444]" : ev.time === "Today" ? "text-[#ff6b35]" : "text-[#888]"}`}>{ev.time}</span>
                      <p className="text-[10px] text-[#555] mt-0.5">{ev.listenerLabel}</p>
                    </div>
                  </div>
                  {ev.friends.length > 0 && (
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <span className="text-[11px] text-[#888]">Matches:</span>
                      <div className="flex -space-x-1.5">
                        {ev.friends.map((f, fi) => {
                          const ci = friends.findIndex(fr => fr.id === f.id);
                          const fc2 = col(ci >= 0 ? ci : fi);
                          return <div key={f.id} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#161616]" style={{ background: fc2.bg, color: fc2.fg }}>{f.name[0]}</div>;
                        })}
                      </div>
                      <span className="text-[11px] text-[#888] ml-1 truncate">{ev.friends.map(f => f.name).join(", ")}</span>
                    </div>
                  )}
                  <div className="w-full aspect-[16/10] relative bg-[#1e1e1e]">
                    <canvas ref={el => { if (el) canvasRefs.current.set(idx, el); }} width={640} height={400} className="w-full h-full block" />
                    {!isGen && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <button onClick={() => createContent(idx, ev)} disabled={isGening} className="px-6 py-3 bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] rounded-xl text-white text-sm font-semibold flex items-center gap-2 active:scale-[0.97]">
                          {isGening ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>Create Content</>}
                        </button>
                      </div>
                    )}
                  </div>
                  {isGen && (
                    <div className="flex gap-2 p-4">
                      {ev.friends.map(f => (
                        <button key={f.id} onClick={() => showToast(`Opening iMessage to ${f.name}`)} className="flex-1 p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl text-xs font-medium text-center active:bg-[#ff6b35] active:border-[#ff6b35]">Send to {f.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-1 px-3 py-2 bg-[#0a0a0a]/92 backdrop-blur-xl border-t border-[#2a2a2a]" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {[
          { id: "friends" as const, label: "Friends", icon: <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
          { id: "listeners" as const, label: "Listeners", icon: <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
          { id: "feed" as const, label: "Feed", icon: <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-all ${tab === t.id ? "text-[#ff6b35] bg-[#ff6b35]/10" : "text-[#888]"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== FORM FIELD =====
function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="mb-3.5">
      <label className="block text-xs font-semibold text-[#888] uppercase tracking-wide mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type || "text"} placeholder={placeholder} className="w-full p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl text-sm outline-none focus:border-[#ff6b35] placeholder:text-[#555]" />
    </div>
  );
}

// ===== CANVAS DRAWING =====
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function mt(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  ctx.font=`900 ${size}px Inter,sans-serif`;ctx.textAlign="center";ctx.fillStyle="#fff";ctx.strokeStyle="#000";
  ctx.lineWidth=size*0.15;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeText(text,x,y);ctx.fillText(text,x,y);
}
function drawSports(ctx: CanvasRenderingContext2D, W: number, H: number, f: number, title: string) {
  let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#0b1628");g.addColorStop(1,"#162d50");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#1a5c2a";ctx.fillRect(0,H*0.55,W,H*0.45);
  ctx.strokeStyle="rgba(255,255,255,0.15)";ctx.lineWidth=2;for(let i=0;i<10;i++){const x=W*0.05+(W*0.9)*(i/9);ctx.beginPath();ctx.moveTo(x,H*0.55);ctx.lineTo(x,H);ctx.stroke()}
  for(let i=0;i<5;i++){const lx=W*0.1+(W*0.8)*(i/4);const lg=ctx.createRadialGradient(lx,20,0,lx,20,50);lg.addColorStop(0,"rgba(255,220,150,0.3)");lg.addColorStop(1,"rgba(255,220,150,0)");ctx.fillStyle=lg;ctx.beginPath();ctx.arc(lx,20,50,0,Math.PI*2);ctx.fill()}
  const sbW=260,sbH=80,sbX=(W-sbW)/2,sbY=H*0.1;ctx.fillStyle="#111";rr(ctx,sbX,sbY,sbW,sbH,8);ctx.fill();ctx.strokeStyle="#333";ctx.lineWidth=2;rr(ctx,sbX,sbY,sbW,sbH,8);ctx.stroke();
  const sm=title.match(/(\d+)\s*[@-]\s*.+?(\d+)/);if(sm){ctx.font="900 28px Inter,sans-serif";ctx.textAlign="center";ctx.fillStyle="#ff6b35";ctx.fillText(sm[1],sbX+sbW*0.3,sbY+sbH*0.65);ctx.fillStyle="#4ade80";ctx.fillText(sm[2],sbX+sbW*0.7,sbY+sbH*0.65)}
  for(let i=0;i<40;i++){const cx=(i*17.3+Math.sin(f*0.05+i)*3)%W;const cy=H*0.45+(i*3.7)%(H*0.12);ctx.fillStyle=`hsl(${i*30},50%,50%)`;ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill()}
  mt(ctx,title.length>35?title.substring(0,35)+"...":title,W/2,H-30,20);
}
function drawMarket(ctx: CanvasRenderingContext2D, W: number, H: number, f: number, title: string) {
  ctx.fillStyle="#0a0a1a";ctx.fillRect(0,0,W,H);ctx.strokeStyle="rgba(255,255,255,0.05)";ctx.lineWidth=1;
  for(let i=0;i<20;i++){ctx.beginPath();ctx.moveTo(W*(i/20),0);ctx.lineTo(W*(i/20),H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,H*(i/20));ctx.lineTo(W,H*(i/20));ctx.stroke()}
  ctx.strokeStyle="#f7931a";ctx.lineWidth=3;ctx.beginPath();
  const pts:{x:number;y:number}[]=[];for(let i=0;i<=40;i++){const x=W*0.05+(W*0.9)*(i/40);const n=Math.sin(i*0.3)*20+Math.sin(i*0.7)*15+Math.cos(i*0.15)*30;const y=H*0.7-(i/40)*80-n;pts.push({x,y});if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();
  ctx.lineTo(W*0.95,H);ctx.lineTo(W*0.05,H);ctx.closePath();const cg=ctx.createLinearGradient(0,H*0.2,0,H);cg.addColorStop(0,"rgba(247,147,26,0.2)");cg.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=cg;ctx.fill();
  const l=pts[pts.length-1];ctx.fillStyle="#f7931a";ctx.beginPath();ctx.arc(l.x,l.y,6+Math.sin(f*0.1)*2,0,Math.PI*2);ctx.fill();
  mt(ctx,title,W/2,40,22);
}
function drawBirthday(ctx: CanvasRenderingContext2D, W: number, H: number, f: number, name: string) {
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1a0a2e");g.addColorStop(1,"#2a1040");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<30;i++){const cx=(i*47.3+f*0.8)%W;const cy=(i*31.7+f*1.2)%H;ctx.fillStyle=["#ff6b35","#ff9f1c","#4ea8de","#b07cd8","#2ec4b6","#ef4444"][i%6];ctx.save();ctx.translate(cx,cy);ctx.rotate(f*0.02+i);ctx.fillRect(-3,-6,6,12);ctx.restore()}
  const ckx=W/2,cky=H*0.55;ctx.fillStyle="#ddd";ctx.beginPath();ctx.ellipse(ckx,cky+45,80,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#d4856a";rr(ctx,ckx-60,cky,120,45,6);ctx.fill();ctx.fillStyle="#e8a080";rr(ctx,ckx-40,cky-35,80,38,6);ctx.fill();
  for(let i=0;i<5;i++){const cx=ckx-28+i*14;ctx.fillStyle=["#4ea8de","#ff6b35","#b07cd8","#2ec4b6","#ff9f1c"][i];ctx.fillRect(cx-2,cky-55,4,22);const fl=Math.sin(f*0.15+i)*3;ctx.fillStyle="#ff9f1c";ctx.beginPath();ctx.ellipse(cx,cky-60+fl,5,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffee88";ctx.beginPath();ctx.ellipse(cx,cky-60+fl,2.5,5,0,0,Math.PI*2);ctx.fill()}
  mt(ctx,`HAPPY BIRTHDAY ${name.toUpperCase()}!`,W/2,50,26);
}
function drawGeneric(ctx: CanvasRenderingContext2D, W: number, H: number, f: number, title: string, cat: string) {
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#1a1a2e");g.addColorStop(0.5,"#16213e");g.addColorStop(1,"#0f3460");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<8;i++){const cx=W/2+Math.sin(f*0.02+i*0.8)*100;const cy=H/2+Math.cos(f*0.015+i*1.1)*60;ctx.fillStyle=`rgba(255,107,53,${0.05+Math.sin(f*0.03+i)*0.03})`;ctx.beginPath();ctx.arc(cx,cy,20+Math.sin(i)*10,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle="rgba(255,255,255,0.06)";ctx.font="900 60px Inter,sans-serif";ctx.textAlign="center";ctx.fillText(cat.toUpperCase(),W/2,H/2+20);
  mt(ctx,title.length>40?title.substring(0,40)+"...":title,W/2,H-30,18);
}
