"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ===== TYPES =====
interface Interest {
  id: string;
  label: string;
  category: string | null;
}

interface Friend {
  id: string;
  name: string;
  phone: string | null;
  birthday: string | null;
  interests: Interest[];
}

interface MatchedEvent {
  title: string;
  detail: string;
  type: string;
  time: string;
  categories: string[];
  friends: Friend[];
}

// ===== INTEREST CATEGORIES =====
const CATEGORIES = [
  { id: "nfl", label: "NFL" },
  { id: "nba", label: "NBA" },
  { id: "mlb", label: "MLB" },
  { id: "nhl", label: "NHL" },
  { id: "golf", label: "Golf" },
  { id: "soccer", label: "Soccer" },
  { id: "mma", label: "MMA/UFC" },
  { id: "bourbon", label: "Bourbon" },
  { id: "beer", label: "Craft Beer" },
  { id: "wine", label: "Wine" },
  { id: "coffee", label: "Coffee" },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "movies", label: "Movies" },
  { id: "fitness", label: "Fitness" },
  { id: "cooking", label: "Cooking" },
  { id: "travel", label: "Travel" },
  { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "Stocks" },
  { id: "fishing", label: "Fishing" },
  { id: "hiking", label: "Hiking" },
  { id: "cars", label: "Cars" },
];

const AVATAR_COLORS = [
  { bg: "rgba(255,107,53,0.15)", fg: "#ff6b35" },
  { bg: "rgba(78,168,222,0.15)", fg: "#4ea8de" },
  { bg: "rgba(176,124,216,0.15)", fg: "#b07cd8" },
  { bg: "rgba(46,196,182,0.15)", fg: "#2ec4b6" },
  { bg: "rgba(239,68,68,0.15)", fg: "#ef4444" },
  { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" },
  { bg: "rgba(16,185,129,0.15)", fg: "#10b981" },
  { bg: "rgba(124,58,237,0.15)", fg: "#7c3aed" },
];

export default function Home() {
  const [tab, setTab] = useState<"friends" | "feed">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [events, setEvents] = useState<MatchedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [toast, setToast] = useState("");
  const [generatedEvents, setGeneratedEvents] = useState<Set<number>>(new Set());
  const [generatingEvent, setGeneratingEvent] = useState<number | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const animFrames = useRef<Map<number, number>>(new Map());

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBday, setFormBday] = useState("");
  const [formInterests, setFormInterests] = useState<Set<string>>(new Set());
  const [formCustom, setFormCustom] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }, []);

  const fetchFriends = useCallback(async () => {
    const res = await fetch("/api/friends");
    const data = await res.json();
    setFriends(data);
    setLoading(false);
  }, []);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data);
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    if (tab === "feed") fetchEvents();
  }, [tab, fetchEvents]);

  // ===== CONTACTS API =====
  async function pickContact() {
    if ("contacts" in navigator && "ContactsManager" in window) {
      try {
        // @ts-expect-error Contacts API not in TS types
        const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
        if (contacts.length > 0) {
          setFormName(contacts[0].name?.[0] || "");
          setFormPhone(contacts[0].tel?.[0] || "");
          showToast("Contact imported!");
        }
      } catch {
        showToast("Contact picker cancelled");
      }
    } else {
      showToast("Contacts API not available - add manually");
    }
  }

  // ===== CRUD =====
  function openAdd() {
    if (friends.length >= 15) { showToast("Max 15 friends"); return; }
    setEditingFriend(null);
    setFormName(""); setFormPhone(""); setFormBday("");
    setFormInterests(new Set()); setFormCustom("");
    setModal("add");
  }

  function openEdit(friend: Friend) {
    setEditingFriend(friend);
    setFormName(friend.name);
    setFormPhone(friend.phone || "");
    setFormBday(friend.birthday || "");
    const cats = new Set(friend.interests.filter(i => i.category).map(i => i.category!));
    setFormInterests(cats);
    const customs = friend.interests.filter(i => !i.category).map(i => i.label);
    setFormCustom(customs.join(", "));
    setModal("edit");
  }

  async function saveFriend() {
    if (!formName.trim()) { showToast("Enter a name"); return; }

    const interestList = [
      ...Array.from(formInterests).map(id => {
        const cat = CATEGORIES.find(c => c.id === id);
        return { label: cat?.label || id, category: id };
      }),
      ...formCustom.split(",").map(s => s.trim()).filter(Boolean).map(s => ({ label: s, category: undefined })),
    ];

    const body = {
      name: formName.trim(),
      phone: formPhone.trim() || null,
      birthday: formBday || null,
      interests: interestList,
    };

    if (modal === "edit" && editingFriend) {
      await fetch(`/api/friends/${editingFriend.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      showToast(`${formName} updated!`);
    } else {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Error"); return;
      }
      showToast(`${formName} added!`);
    }

    setModal(null);
    fetchFriends();
  }

  async function removeFriend(id: string, name: string) {
    await fetch(`/api/friends/${id}`, { method: "DELETE" });
    showToast(`${name} removed`);
    fetchFriends();
  }

  function toggleInterest(id: string) {
    setFormInterests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ===== CONTENT GENERATION =====
  function createContent(idx: number, ev: MatchedEvent) {
    setGeneratingEvent(idx);
    setTimeout(() => {
      setGeneratingEvent(null);
      setGeneratedEvents(prev => new Set(prev).add(idx));
      const canvas = canvasRefs.current.get(idx);
      if (canvas) startAnimation(canvas, idx, ev);
      showToast("Content created!");
    }, 1200);
  }

  function startAnimation(canvas: HTMLCanvasElement, idx: number, ev: MatchedEvent) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    let frame = 0;
    const interest = ev.categories[0];

    // Cancel previous animation for this canvas
    const prevFrame = animFrames.current.get(idx);
    if (prevFrame) cancelAnimationFrame(prevFrame);

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      if (["nfl","nba","mlb","nhl","mma","soccer"].includes(interest)) {
        drawSports(ctx, W, H, frame, ev.title, interest);
      } else if (["bourbon","beer","wine","coffee"].includes(interest)) {
        drawDrink(ctx, W, H, frame, ev.title, interest);
      } else if (interest === "birthday") {
        drawBirthday(ctx, W, H, frame, ev.friends[0]?.name || "");
      } else if (interest === "golf") {
        drawGolf(ctx, W, H, frame);
      } else if (["crypto","stocks"].includes(interest)) {
        drawMarket(ctx, W, H, frame, ev.title, interest);
      } else {
        drawGeneric(ctx, W, H, frame, ev.title, interest);
      }

      // Watermark
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "600 10px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("made with Spark", W - 12, H - 10);

      frame++;
      animFrames.current.set(idx, requestAnimationFrame(draw));
    }
    draw();
  }

  // ===== RENDER =====
  const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-5 py-3 flex items-center justify-between border-b border-border bg-bg/85 backdrop-blur-xl" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <h1 className="text-[22px] font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">Spark</h1>
        <span className="text-[11px] text-text2 bg-surface2 px-2.5 py-1 rounded-xl border border-border">{friends.length} / 15 friends</span>
      </div>

      {/* Toast */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] bg-black/90 text-white px-7 py-4 rounded-2xl text-[15px] font-semibold text-center transition-all duration-300 pointer-events-none ${toast ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
        {toast}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-end justify-center">
          <div className="bg-surface rounded-t-3xl p-6 w-full max-w-[420px] max-h-[85dvh] overflow-y-auto" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <h2 className="text-xl font-bold mb-1">{modal === "edit" ? "Edit friend" : "Add a friend"}</h2>
            <p className="text-[13px] text-text2 mb-5 leading-relaxed">
              {modal === "edit" ? "Update their info and interests." : "Pick from contacts or add manually. Tag what matters to them."}
            </p>

            {modal === "add" && (
              <>
                <button onClick={pickContact} className="w-full p-3.5 bg-surface2 border border-border rounded-xl text-text text-sm font-medium flex items-center justify-center gap-2 mb-2 active:border-accent">
                  <svg className="w-[18px] h-[18px] text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Import from Contacts
                </button>
                <div className="text-center text-text2 text-xs my-3 relative before:absolute before:left-0 before:top-1/2 before:w-[38%] before:h-px before:bg-border after:absolute after:right-0 after:top-1/2 after:w-[38%] after:h-px after:bg-border">or add manually</div>
              </>
            )}

            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-1.5">Name</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full p-3 bg-surface2 border border-border rounded-xl text-text text-sm outline-none focus:border-accent" placeholder="Dave" />
            </div>
            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-1.5">Phone</label>
              <input value={formPhone} onChange={e => setFormPhone(e.target.value)} type="tel" className="w-full p-3 bg-surface2 border border-border rounded-xl text-text text-sm outline-none focus:border-accent" placeholder="+1 555 123 4567" />
            </div>
            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-1.5">Birthday</label>
              <input value={formBday} onChange={e => setFormBday(e.target.value)} type="date" className="w-full p-3 bg-surface2 border border-border rounded-xl text-text text-sm outline-none focus:border-accent" />
            </div>

            <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-2">What do they care about?</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => toggleInterest(c.id)} className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all ${formInterests.has(c.id) ? "bg-accent/15 border-accent text-accent" : "bg-surface2 border-border text-text2"}`}>
                  {c.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-1.5">Custom interests</label>
              <input value={formCustom} onChange={e => setFormCustom(e.target.value)} className="w-full p-3 bg-surface2 border border-border rounded-xl text-text text-sm outline-none focus:border-accent" placeholder="Chicago Bears, woodworking..." />
            </div>

            <button onClick={saveFriend} className="w-full p-3.5 bg-gradient-to-r from-accent to-accent2 rounded-xl text-white text-[15px] font-semibold active:scale-[0.97]">
              {modal === "edit" ? "Save Changes" : "Add Friend"}
            </button>
            <button onClick={() => setModal(null)} className="w-full p-3.5 bg-surface2 rounded-xl text-text text-[15px] font-semibold mt-2 active:scale-[0.97]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pt-[60px] pb-[90px] flex-1">
        {/* Friends Tab */}
        {tab === "friends" && (
          <div className="p-4">
            <button onClick={openAdd} disabled={friends.length >= 15} className="w-full p-3.5 bg-gradient-to-r from-accent to-accent2 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 mb-4 active:scale-[0.97] disabled:opacity-40">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Add Friend
            </button>

            {loading ? (
              <div className="text-center py-20 text-text2 text-sm">Loading...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-16 px-5">
                <div className="text-5xl mb-4 opacity-30">&#x1F465;</div>
                <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                <p className="text-[13px] text-text2 leading-relaxed">Add up to 15 close friends and tag what matters to them. Spark will watch for moments worth reaching out about.</p>
              </div>
            ) : (
              friends.map((f, i) => {
                const col = avatarColor(i);
                return (
                  <div key={f.id} className="bg-surface border border-border rounded-2xl p-4 mb-2.5 active:scale-[0.98] transition-transform">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0" style={{ background: col.bg, color: col.fg }}>
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold truncate">{f.name}</h3>
                        <p className="text-xs text-text2 mt-0.5 truncate">
                          {[f.phone, f.birthday && new Date(f.birthday + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })].filter(Boolean).join(" \u00B7 ")}
                        </p>
                      </div>
                      <button onClick={() => openEdit(f)} className="w-7 h-7 rounded-full border border-border text-text2 text-xs flex items-center justify-center shrink-0 active:bg-accent active:text-white active:border-accent">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => removeFriend(f.id, f.name)} className="w-7 h-7 rounded-full border border-border text-text2 text-sm flex items-center justify-center shrink-0 active:bg-red active:text-white active:border-red">
                        &times;
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {f.interests.map(int => (
                        <span key={int.id} className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-accent/12 border border-accent/30 text-accent">
                          {int.label}
                        </span>
                      ))}
                      {f.interests.length === 0 && (
                        <span className="text-xs text-text2 italic">No interests yet - tap edit to add</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Feed Tab */}
        {tab === "feed" && (
          <div className="p-4">
            {friends.length === 0 ? (
              <div className="text-center py-16 px-5">
                <div className="text-5xl mb-4 opacity-30">&#x26A1;</div>
                <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                <p className="text-[13px] text-text2 leading-relaxed">Add friends and their interests first. Spark will match events to your friends automatically.</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 px-5">
                <div className="text-5xl mb-4 opacity-30">&#x26A1;</div>
                <h3 className="text-lg font-semibold mb-2">No matches</h3>
                <p className="text-[13px] text-text2 leading-relaxed">Your friends&apos; interests don&apos;t match any current events. Add more interests or check back later.</p>
              </div>
            ) : (
              events.map((ev, idx) => {
                const typeColors: Record<string, { bg: string; fg: string }> = {
                  sports: { bg: "rgba(78,168,222,0.15)", fg: "#4ea8de" },
                  release: { bg: "rgba(255,107,53,0.15)", fg: "#ff6b35" },
                  market: { bg: "rgba(34,197,94,0.15)", fg: "#22c55e" },
                  birthday: { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" },
                  seasonal: { bg: "rgba(101,163,13,0.15)", fg: "#65a30d" },
                  event: { bg: "rgba(176,124,216,0.15)", fg: "#b07cd8" },
                  deal: { bg: "rgba(6,182,212,0.15)", fg: "#06b6d4" },
                };
                const tc = typeColors[ev.type] || typeColors.sports;
                const isGenerated = generatedEvents.has(idx);
                const isGenerating = generatingEvent === idx;

                return (
                  <div key={idx} className="bg-surface border border-border rounded-2xl mb-3 overflow-hidden">
                    <div className="p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: tc.bg, color: tc.fg }}>
                        {ev.type === "sports" ? "\u26BD" : ev.type === "release" ? "\u2728" : ev.type === "market" ? "\u{1F4C8}" : ev.type === "birthday" ? "\u{1F382}" : ev.type === "seasonal" ? "\u{1F343}" : ev.type === "deal" ? "\u2708" : "\u26A1"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{ev.title}</h3>
                        <p className="text-xs text-text2 mt-0.5 truncate">{ev.detail}</p>
                      </div>
                      <span className="text-[10px] text-text2 whitespace-nowrap shrink-0">{ev.time}</span>
                    </div>

                    <div className="px-4 pb-3 flex items-center gap-2">
                      <span className="text-[11px] text-text2">Matches:</span>
                      <div className="flex -space-x-1.5">
                        {ev.friends.map((f, fi) => {
                          const ci = friends.findIndex(fr => fr.id === f.id);
                          const col = avatarColor(ci >= 0 ? ci : fi);
                          return (
                            <div key={f.id} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-surface" style={{ background: col.bg, color: col.fg }}>
                              {f.name.charAt(0)}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-text2 ml-1 truncate">{ev.friends.map(f => f.name).join(", ")}</span>
                    </div>

                    {/* Canvas preview */}
                    <div className="w-full aspect-[16/10] relative bg-surface2">
                      <canvas
                        ref={el => { if (el) canvasRefs.current.set(idx, el); }}
                        width={640}
                        height={400}
                        className="w-full h-full block"
                      />
                      {!isGenerated && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <button
                            onClick={() => createContent(idx, ev)}
                            disabled={isGenerating}
                            className="px-6 py-3 bg-gradient-to-r from-accent to-accent2 rounded-xl text-white text-sm font-semibold flex items-center gap-2 active:scale-[0.97]"
                          >
                            {isGenerating ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                Create Content
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Send buttons */}
                    {isGenerated && (
                      <div className="flex gap-2 p-4">
                        {ev.friends.map(f => (
                          <button key={f.id} onClick={() => showToast(`Opening iMessage to ${f.name}`)} className="flex-1 p-2.5 bg-surface2 border border-border rounded-xl text-xs font-medium text-text text-center active:bg-accent active:border-accent">
                            Send to {f.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-1 px-3 py-2 bg-bg/92 backdrop-blur-xl border-t border-border" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <button onClick={() => setTab("friends")} className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-all ${tab === "friends" ? "text-accent bg-accent/10" : "text-text2"}`}>
          <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          Friends
        </button>
        <button onClick={() => setTab("feed")} className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-all ${tab === "feed" ? "text-accent bg-accent/10" : "text-text2"}`}>
          <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Feed
        </button>
      </div>
    </div>
  );
}

// ===== CANVAS DRAWING FUNCTIONS =====
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function memeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  ctx.font = `900 ${size}px Inter,sans-serif`; ctx.textAlign = "center";
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000";
  ctx.lineWidth = size*0.15; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeText(text, x, y); ctx.fillText(text, x, y);
}

function drawSports(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number, title: string, sport: string) {
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,"#0b1628"); grad.addColorStop(1,"#162d50");
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  const fc = sport==="nhl"?"#c8dce8":sport==="nba"?"#c9884a":"#1a5c2a";
  ctx.fillStyle = fc; ctx.fillRect(0,H*0.55,W,H*0.45);
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
  for (let i=0;i<10;i++){const x=W*0.05+(W*0.9)*(i/9);ctx.beginPath();ctx.moveTo(x,H*0.55);ctx.lineTo(x,H);ctx.stroke()}
  for (let i=0;i<5;i++){const lx=W*0.1+(W*0.8)*(i/4);const lg=ctx.createRadialGradient(lx,20,0,lx,20,50);lg.addColorStop(0,"rgba(255,220,150,0.3)");lg.addColorStop(1,"rgba(255,220,150,0)");ctx.fillStyle=lg;ctx.beginPath();ctx.arc(lx,20,50,0,Math.PI*2);ctx.fill()}
  const sbW=260,sbH=80,sbX=(W-sbW)/2,sbY=H*0.1;
  ctx.fillStyle="#111";roundRect(ctx,sbX,sbY,sbW,sbH,8);ctx.fill();
  ctx.strokeStyle="#333";ctx.lineWidth=2;roundRect(ctx,sbX,sbY,sbW,sbH,8);ctx.stroke();
  const sm=title.match(/(\d+)[\s-]+(\d+)/);
  if(sm){ctx.font="bold 14px Inter,sans-serif";ctx.textAlign="center";ctx.fillStyle="#ff6b35";ctx.fillText(title.split(/\s+\d/)[0].trim().substring(0,12),sbX+sbW*0.25,sbY+sbH*0.35);ctx.fillStyle="#4ade80";ctx.fillText((title.split(/\d+[\s-]+\d+/)[1]||"").trim().substring(0,12),sbX+sbW*0.75,sbY+sbH*0.35);ctx.font="900 28px Inter,sans-serif";ctx.fillStyle="#ef4444";ctx.fillText(sm[1],sbX+sbW*0.25,sbY+sbH*0.75);ctx.fillStyle="#4ade80";ctx.fillText(sm[2],sbX+sbW*0.75,sbY+sbH*0.75)}
  for(let i=0;i<40;i++){const cx=(i*17.3+Math.sin(frame*0.05+i)*3)%W;const cy=H*0.45+(i*3.7)%(H*0.12);ctx.fillStyle=`hsl(${i*30},50%,50%)`;ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill()}
  memeText(ctx,title.length>35?title.substring(0,35)+"...":title,W/2,H-30,22);
}

function drawDrink(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number, title: string, type: string) {
  const colors:{[k:string]:string[]} = {bourbon:["#3d1f00","#1a0e00","#0a0500"],beer:["#3d2f00","#1a1500","#0a0800"],wine:["#3d0020","#1a000e","#0a0005"],coffee:["#2d1a0d","#1a0e05","#0a0500"]};
  const c=colors[type]||colors.bourbon;const grad=ctx.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,W*0.7);grad.addColorStop(0,c[0]);grad.addColorStop(0.5,c[1]);grad.addColorStop(1,c[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,120);glow.addColorStop(0,"rgba(255,140,0,0.12)");glow.addColorStop(1,"rgba(255,140,0,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  const bx=W/2,by=H*0.45;
  ctx.fillStyle=type==="wine"?"#2a0015":"#2a1800";ctx.beginPath();ctx.moveTo(bx-30,by+80);ctx.lineTo(bx-30,by-20);ctx.quadraticCurveTo(bx-30,by-40,bx-15,by-50);ctx.lineTo(bx-12,by-80);ctx.lineTo(bx+12,by-80);ctx.lineTo(bx+15,by-50);ctx.quadraticCurveTo(bx+30,by-40,bx+30,by-20);ctx.lineTo(bx+30,by+80);ctx.closePath();ctx.fill();
  ctx.save();ctx.beginPath();ctx.rect(bx-29,by-10,58,89);ctx.clip();const wave=Math.sin(frame*0.06)*4;ctx.fillStyle=type==="wine"?"#5a0030":"#8B4513";ctx.beginPath();ctx.moveTo(bx-30,by+80);ctx.lineTo(bx-30,by+10+wave);for(let x=-30;x<=30;x+=5)ctx.lineTo(bx+x,by+10+Math.sin((x+frame*2)*0.1)*4+wave);ctx.lineTo(bx+30,by+80);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle="#f5e6c8";roundRect(ctx,bx-24,by+5,48,40,4);ctx.fill();ctx.fillStyle="#2a1800";ctx.font="900 8px Inter,sans-serif";ctx.textAlign="center";
  ctx.fillStyle="#1a0e00";ctx.fillRect(bx-10,by-88,20,10);
  for(let i=0;i<12;i++){const px=bx+Math.sin(frame*0.03+i*0.5)*60;const py=by+80-((frame*1.5+i*20)%160);const a=1-((frame*1.5+i*20)%160)/160;ctx.fillStyle=`rgba(255,180,50,${a*0.5})`;ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fill()}
  memeText(ctx,title.length>40?title.substring(0,40)+"...":title,W/2,H-25,20);
}

function drawBirthday(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number, name: string) {
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#1a0a2e");grad.addColorStop(1,"#2a1040");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  for(let i=0;i<30;i++){const cx=(i*47.3+frame*0.8)%W;const cy=(i*31.7+frame*1.2)%H;ctx.fillStyle=["#ff6b35","#ff9f1c","#4ea8de","#b07cd8","#2ec4b6","#ef4444"][i%6];ctx.save();ctx.translate(cx,cy);ctx.rotate(frame*0.02+i);ctx.fillRect(-3,-6,6,12);ctx.restore()}
  const ckx=W/2,cky=H*0.55;ctx.fillStyle="#ddd";ctx.beginPath();ctx.ellipse(ckx,cky+45,80,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#d4856a";roundRect(ctx,ckx-60,cky,120,45,6);ctx.fill();ctx.fillStyle="#f0a0a0";roundRect(ctx,ckx-60,cky,120,15,6);ctx.fill();
  ctx.fillStyle="#e8a080";roundRect(ctx,ckx-40,cky-35,80,38,6);ctx.fill();ctx.fillStyle="#f5c0b0";roundRect(ctx,ckx-40,cky-35,80,12,6);ctx.fill();
  for(let i=0;i<5;i++){const candleX=ckx-28+i*14;ctx.fillStyle=["#4ea8de","#ff6b35","#b07cd8","#2ec4b6","#ff9f1c"][i];ctx.fillRect(candleX-2,cky-55,4,22);const fl=Math.sin(frame*0.15+i)*3;ctx.fillStyle="#ff9f1c";ctx.beginPath();ctx.ellipse(candleX,cky-60+fl,5,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffee88";ctx.beginPath();ctx.ellipse(candleX,cky-60+fl,2.5,5,0,0,Math.PI*2);ctx.fill()}
  memeText(ctx,`HAPPY BIRTHDAY ${name.toUpperCase()}!`,W/2,50,28);memeText(ctx,"TIME TO CELEBRATE",W/2,H-30,20);
}

function drawGolf(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number) {
  const sky=ctx.createLinearGradient(0,0,0,H*0.6);sky.addColorStop(0,"#87CEEB");sky.addColorStop(1,"#e0f0ff");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#2d8c3e";ctx.fillRect(0,H*0.5,W,H*0.5);ctx.fillStyle="#34a047";for(let i=0;i<8;i+=2)ctx.fillRect(W*(i/8),H*0.5,W/8,H*0.5);
  ctx.fillStyle="#3daa50";ctx.beginPath();ctx.ellipse(W*0.6,H*0.65,80,50,0,0,Math.PI*2);ctx.fill();
  const fb=Math.sin(frame*0.04)*2;ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*0.6,H*0.65);ctx.lineTo(W*0.6,H*0.35+fb);ctx.stroke();
  ctx.fillStyle="#ef4444";ctx.beginPath();ctx.moveTo(W*0.6,H*0.35+fb);ctx.lineTo(W*0.6+25,H*0.38+fb);ctx.lineTo(W*0.6,H*0.41+fb);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(W*0.55,H*0.67,5,0,Math.PI*2);ctx.fill();
  for(let i=0;i<3;i++){const cx=((i*220+frame*0.3)%(W+100))-50;ctx.fillStyle="rgba(255,255,255,0.6)";ctx.beginPath();ctx.arc(cx,60+i*20,25,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+20,55+i*20,20,0,Math.PI*2);ctx.fill()}
  memeText(ctx,"TEE TIME",W/2,H-25,24);
}

function drawMarket(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number, title: string, type: string) {
  ctx.fillStyle="#0a0a1a";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(255,255,255,0.05)";ctx.lineWidth=1;for(let i=0;i<20;i++){ctx.beginPath();ctx.moveTo(W*(i/20),0);ctx.lineTo(W*(i/20),H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,H*(i/20));ctx.lineTo(W,H*(i/20));ctx.stroke()}
  const color=type==="crypto"?"#f7931a":"#22c55e";ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
  const pts:{x:number;y:number}[]=[];for(let i=0;i<=40;i++){const x=W*0.05+(W*0.9)*(i/40);const n=Math.sin(i*0.3)*20+Math.sin(i*0.7)*15+Math.cos(i*0.15)*30;const y=H*0.7-(i/40)*80-n;pts.push({x,y});if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();
  ctx.lineTo(W*0.95,H);ctx.lineTo(W*0.05,H);ctx.closePath();const cg=ctx.createLinearGradient(0,H*0.2,0,H);cg.addColorStop(0,type==="crypto"?"rgba(247,147,26,0.2)":"rgba(34,197,94,0.2)");cg.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=cg;ctx.fill();
  const last=pts[pts.length-1];ctx.fillStyle=color;ctx.beginPath();ctx.arc(last.x,last.y,6+Math.sin(frame*0.1)*2,0,Math.PI*2);ctx.fill();
  memeText(ctx,title,W/2,40,22);
}

function drawGeneric(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number, title: string, interest: string) {
  const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,"#1a1a2e");grad.addColorStop(0.5,"#16213e");grad.addColorStop(1,"#0f3460");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  for(let i=0;i<8;i++){const cx=W/2+Math.sin(frame*0.02+i*0.8)*100;const cy=H/2+Math.cos(frame*0.015+i*1.1)*60;ctx.fillStyle=`rgba(255,107,53,${0.05+Math.sin(frame*0.03+i)*0.03})`;ctx.beginPath();ctx.arc(cx,cy,20+Math.sin(i)*10,0,Math.PI*2);ctx.fill()}
  const cat=CATEGORIES.find(c=>c.id===interest);ctx.fillStyle="rgba(255,255,255,0.08)";ctx.font="900 72px Inter,sans-serif";ctx.textAlign="center";ctx.fillText((cat?.label||interest).toUpperCase(),W/2,H/2+20);
  memeText(ctx,title.length>40?title.substring(0,40)+"...":title,W/2,H-30,20);
}
