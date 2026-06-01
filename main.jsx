import { useState, useEffect } from "react";

const SYSTEM_PROMPT = `אתה אנליסט פיננסי בכיר המתמחה בשוקי ההון הישראלי (TASE) ובשוק האמריקאי (NYSE/NASDAQ).

הפק דו"ח יומי מקיף. כלול את הסקשנים הבאים:

# סקירת שוק יומית

## 📊 מצב השוק הכללי
מדדי ת"א המרכזיים ומדדים אמריקאים עיקריים, מגמות ואווירה.

## 🔥 מניות חמות
מניות עם תנועה חזקה או קטליזטורים. ציין טיקר, חברה, סיבה, מגמה.

## 🚀 הנפקות קרובות (IPO)
הנפקות מתוכננות – חברה, שווי, תעשייה, תאריך.

## 🤝 מיזוגים ורכישות (M&A)
עסקאות שהוכרזו – מי קונה מי, שווי, השלכות.

## 📰 חדשות כלכליות חשובות
ריבית, אינפלציה, GDP, אירועים גיאופוליטיים, דוחות רווח.

## ⭐ המלצות השקעה
3-5 מניות מעניינות. לכל אחת: טיקר, נימוק, סיכון, קטליזטור.

---
⚠️ זהו מידע לצרכי מחקר אישי בלבד ואינו מהווה ייעוץ השקעות מוסמך.

כתוב בעברית, מקצועי ומפורט. השתמש בחיפוש רשת למידע עדכני.`;

function renderMarkdown(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{ height: 8 }} />;
    const bold = (s) =>
      s.split(/\*\*(.+?)\*\*/g).map((p, j) =>
        j % 2 === 1 ? <strong key={j} style={{ color: "#f1f5f9" }}>{p}</strong> : p
      );
    if (t.startsWith("### ")) return <h3 key={i} style={S.h3}>{bold(t.slice(4))}</h3>;
    if (t.startsWith("## "))  return <h2 key={i} style={S.h2}>{bold(t.slice(3))}</h2>;
    if (t.startsWith("# "))   return <h1 key={i} style={S.h1}>{bold(t.slice(2))}</h1>;
    if (t.startsWith("- ") || t.startsWith("• ") || t.startsWith("* "))
      return <div key={i} style={S.bullet}>{bold(t.slice(2))}</div>;
    if (/^\d+\./.test(t)) return <div key={i} style={S.bullet}>{bold(t)}</div>;
    if (t.includes("⚠️") || t.includes("אינו מהווה ייעוץ"))
      return <div key={i} style={S.disclaimerLine}>{bold(t)}</div>;
    return <p key={i} style={S.para}>{bold(t)}</p>;
  });
}

export default function App() {
  const [phase, setPhase]       = useState("hero");
  const [report, setReport]     = useState("");
  const [errMsg, setErrMsg]     = useState("");
  const [copied, setCopied]     = useState(false);
  const [genTime, setGenTime]   = useState("");
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem("mi_api_key") || "");
  const [showKey, setShowKey]   = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  const today = new Date().toLocaleDateString("he-IL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  function saveKey() {
    const k = keyInput.trim();
    if (!k.startsWith("sk-ant-")) {
      setKeyError("מפתח לא תקין — צריך להתחיל עם sk-ant-");
      return;
    }
    localStorage.setItem("mi_api_key", k);
    setApiKey(k);
    setShowKey(false);
    setKeyInput("");
    setKeyError("");
  }

  function clearKey() {
    localStorage.removeItem("mi_api_key");
    setApiKey("");
    setShowKey(true);
  }

  async function generateReport() {
    if (!apiKey) { setShowKey(true); return; }
    setPhase("loading");
    setReport("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `תאריך היום: ${today}\n\nהפק דו"ח יומי מקיף ומפורט על שוק ההון הישראלי והאמריקאי.`,
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message || `שגיאה ${res.status}`);
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      if (!text.trim()) throw new Error("תגובה ריקה");
      setReport(text);
      setGenTime(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
      setPhase("report");
    } catch (e) {
      setErrMsg(e.message);
      setPhase("error");
    }
  }

  function copyReport() {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={S.root}>
      <div style={S.grid} />

      {/* HEADER */}
      <header style={S.header}>
        <div>
          <div style={S.logo}>◈ MARKET INTEL</div>
          <div style={S.logoSub}>IL + US DAILY BRIEFING</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={S.headerDate}>{today}</div>
            <div style={S.liveBadge}><span style={S.liveDot} />POWERED BY AI</div>
          </div>
          <button
            style={{ ...S.toolBtn, fontSize: 18, padding: "6px 10px", opacity: apiKey ? 1 : 0.5 }}
            title={apiKey ? "מפתח API מוגדר — לחץ לשינוי" : "הגדר מפתח API"}
            onClick={() => { setShowKey(true); setKeyInput(""); setKeyError(""); }}
          >
            🔑
          </button>
        </div>
      </header>

      {/* API KEY MODAL */}
      {showKey && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={S.modalTitle}>🔑 מפתח Anthropic API</div>
            <p style={S.modalDesc}>
              צריך מפתח API חד-פעמי כדי שהאפליקציה תעבוד.<br />
              קבל אותו בחינם בכתובת:{" "}
              <a href="https://console.anthropic.com/keys" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>
                console.anthropic.com/keys
              </a>
            </p>
            <input
              style={S.keyInput}
              type="password"
              placeholder="sk-ant-api03-..."
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setKeyError(""); }}
              onKeyDown={e => e.key === "Enter" && saveKey()}
              autoFocus
            />
            {keyError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6, textAlign: "right" }}>{keyError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              {apiKey && (
                <button style={{ ...S.toolBtn, color: "#ef4444" }} onClick={clearKey}>מחק מפתח</button>
              )}
              <button style={S.toolBtn} onClick={() => setShowKey(false)}>ביטול</button>
              <button style={S.genBtn} onClick={saveKey}>שמור ✓</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#475569", textAlign: "right" }}>
              המפתח נשמר רק על המחשב שלך (localStorage) ולא נשלח לשום שרת חיצוני.
            </div>
          </div>
        </div>
      )}

      <main style={S.main}>
        {/* HERO */}
        {phase === "hero" && (
          <div style={S.hero}>
            <div style={S.heroIcon}>📈</div>
            <h1 style={S.heroTitle}>דו"ח שוק יומי חכם</h1>
            <p style={S.heroDesc}>
              בינה מלאכותית שסורקת את השווקים הישראלי והאמריקאי ומפיקה ניתוח מעמיק עם המלצות.
            </p>
            <div style={S.featureRow}>
              {["🇮🇱 בורסת ת\"א","🇺🇸 NYSE/NASDAQ","🔥 מניות חמות","🚀 IPO","🤝 M&A","📊 מאקרו"].map(f => (
                <div key={f} style={S.featureTag}>{f}</div>
              ))}
            </div>
            <button style={S.genBtn} onClick={generateReport}>⚡ צור דו"ח עכשיו</button>
            {!apiKey && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#f59e0b" }}>
                ⚠️ נדרש מפתח API — לחץ על 🔑 בפינה
              </div>
            )}
            <div style={S.disclaimer}>למטרות מחקר אישי בלבד • אינו מהווה ייעוץ השקעות מוסמך</div>
          </div>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <div style={S.loadingTitle}>מאסף מידע מהשווקים...</div>
            <div style={S.steps}>
              {["📡 מחפש חדשות בורסת ת\"א","🌐 סורק NYSE & NASDAQ","📋 בודק IPO ועסקאות M&A","🔥 מנתח מניות חמות","✍️ מגבש המלצות..."].map((s, i) => (
                <div key={i} style={{ ...S.step, animationDelay: `${i * 1.2}s` }}>
                  <div style={S.stepDot} />{s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT */}
        {phase === "report" && (
          <div>
            <div style={S.toolbar}>
              <div style={S.toolbarTitle}>📋 DAILY REPORT — {today}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.toolBtn} onClick={copyReport}>{copied ? "✓ הועתק!" : "📋 העתק"}</button>
                <button style={S.toolBtn} onClick={generateReport}>↻ רענן</button>
              </div>
            </div>
            <div style={S.reportCard}>
              <div style={S.cardHeader}>
                <span style={{ fontSize: 20 }}>🌐</span>
                <span style={S.cardTitle}>ניתוח שוק מקיף — ישראל + ארה"ב</span>
                <span style={S.cardBadge}>עודכן {genTime}</span>
              </div>
              <div style={S.reportBody} dir="rtl">{renderMarkdown(report)}</div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div style={S.errorWrap}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ color: "#ef4444", fontSize: 16, marginBottom: 8 }}>שגיאה בטעינת הדו"ח</div>
            <div style={{ color: "#475569", fontSize: 13, marginBottom: 24 }}>{errMsg}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={S.toolBtn} onClick={() => { setShowKey(true); setKeyInput(""); }}>בדוק מפתח API</button>
              <button style={S.genBtn} onClick={generateReport}>נסה שוב</button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes stepIn  { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
        @keyframes float   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes dotPulse{ 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.7); } }
      `}</style>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#06090f", color:"#e2e8f0", fontFamily:"'Heebo','Segoe UI',sans-serif", position:"relative" },
  grid: { position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:"linear-gradient(rgba(59,130,246,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.03) 1px,transparent 1px)", backgroundSize:"40px 40px" },
  header: { position:"sticky", top:0, zIndex:100, background:"rgba(6,9,15,.93)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1c2d4a", padding:"14px 28px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  logo: { fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:14, fontWeight:600, color:"#22d3ee", letterSpacing:3 },
  logoSub: { fontFamily:"monospace", fontSize:10, color:"#4a6fa5", letterSpacing:1, marginTop:2 },
  headerDate: { fontSize:12, color:"#4a6fa5", fontFamily:"monospace" },
  liveBadge: { display:"flex", alignItems:"center", gap:5, justifyContent:"flex-end", fontSize:10, color:"#10b981", fontFamily:"monospace", marginTop:2 },
  liveDot: { display:"inline-block", width:6, height:6, background:"#10b981", borderRadius:"50%", animation:"dotPulse 1.5s infinite" },
  main: { position:"relative", zIndex:1, maxWidth:880, margin:"0 auto", padding:"28px 20px 60px" },
  hero: { display:"flex", flexDirection:"column", alignItems:"center", padding:"56px 20px", textAlign:"center", animation:"fadeUp .5s ease" },
  heroIcon: { fontSize:70, marginBottom:20, animation:"float 3s ease-in-out infinite", filter:"drop-shadow(0 0 20px rgba(59,130,246,.5))" },
  heroTitle: { fontSize:28, fontWeight:800, color:"#f1f5f9", marginBottom:10, letterSpacing:-.5 },
  heroDesc: { fontSize:15, color:"#94a3b8", maxWidth:420, lineHeight:1.7, marginBottom:32 },
  featureRow: { display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:36 },
  featureTag: { background:"#0c1220", border:"1px solid #1c2d4a", padding:"6px 14px", borderRadius:20, fontSize:12, color:"#94a3b8" },
  genBtn: { background:"linear-gradient(135deg,#2563eb,#0ea5e9)", border:"none", color:"white", padding:"15px 48px", borderRadius:12, fontSize:17, fontWeight:700, cursor:"pointer", fontFamily:"'Heebo','Segoe UI',sans-serif", boxShadow:"0 0 40px rgba(37,99,235,.35),0 4px 20px rgba(0,0,0,.4)", letterSpacing:.3 },
  disclaimer: { marginTop:16, fontSize:11, color:"#4a6fa5" },
  loadingWrap: { display:"flex", flexDirection:"column", alignItems:"center", padding:"56px 20px", animation:"fadeUp .3s ease" },
  spinner: { width:52, height:52, border:"2px solid #1c2d4a", borderTop:"2px solid #22d3ee", borderRadius:"50%", animation:"spin .9s linear infinite", marginBottom:24 },
  loadingTitle: { fontSize:18, fontWeight:600, color:"#22d3ee", marginBottom:28 },
  steps: { display:"flex", flexDirection:"column", gap:10, width:280 },
  step: { display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#4a6fa5", fontFamily:"monospace", opacity:0, animation:"stepIn .5s ease forwards" },
  stepDot: { width:6, height:6, background:"#3b82f6", borderRadius:"50%", flexShrink:0 },
  toolbar: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 },
  toolbarTitle: { fontFamily:"monospace", fontSize:12, color:"#22d3ee", letterSpacing:1 },
  toolBtn: { background:"#0c1220", border:"1px solid #1c2d4a", color:"#94a3b8", padding:"7px 16px", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"'Heebo','Segoe UI',sans-serif" },
  reportCard: { background:"#0c1220", border:"1px solid #1c2d4a", borderRadius:16, overflow:"hidden", animation:"fadeUp .5s ease" },
  cardHeader: { background:"linear-gradient(135deg,rgba(37,99,235,.1),rgba(14,165,233,.05))", padding:"14px 24px", borderBottom:"1px solid #1c2d4a", display:"flex", alignItems:"center", gap:10 },
  cardTitle: { fontSize:14, fontWeight:600, color:"#0ea5e9" },
  cardBadge: { marginRight:"auto", fontSize:10, fontFamily:"monospace", color:"#4a6fa5", background:"rgba(59,130,246,.06)", border:"1px solid #1c2d4a", padding:"3px 8px", borderRadius:4 },
  reportBody: { padding:"28px 28px", lineHeight:1.85 },
  h1: { fontSize:20, fontWeight:800, color:"#22d3ee", borderBottom:"1px solid #1c2d4a", paddingBottom:8, margin:"24px 0 12px" },
  h2: { fontSize:17, fontWeight:700, color:"#7dd3fc", margin:"20px 0 8px" },
  h3: { fontSize:15, fontWeight:600, color:"#bae6fd", margin:"14px 0 6px" },
  para: { fontSize:14, color:"#94a3b8", margin:"4px 0" },
  bullet: { fontSize:14, color:"#cbd5e1", padding:"4px 12px", borderRight:"2px solid #1c2d4a", marginRight:8, marginBottom:2 },
  disclaimerLine: { marginTop:20, padding:"12px 14px", background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.2)", borderRadius:10, fontSize:12, color:"#f59e0b" },
  errorWrap: { textAlign:"center", padding:"60px 20px", animation:"fadeUp .3s ease" },
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" },
  modal: { background:"#0c1220", border:"1px solid #1c2d4a", borderRadius:16, padding:"28px", width:"min(440px, 90vw)", direction:"rtl" },
  modalTitle: { fontSize:18, fontWeight:700, color:"#f1f5f9", marginBottom:12 },
  modalDesc: { fontSize:13, color:"#94a3b8", lineHeight:1.7, marginBottom:16 },
  keyInput: { width:"100%", background:"#060910", border:"1px solid #1c2d4a", color:"#e2e8f0", padding:"10px 14px", borderRadius:8, fontSize:14, fontFamily:"monospace", outline:"none", direction:"ltr" },
};
