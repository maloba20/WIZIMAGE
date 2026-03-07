import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";

/* ─── CONFIG ─── change API_URL to your deployed backend URL ─────────────── */
const API_URL     = "http://localhost:8000/api";   // ← your FastAPI backend
const STRIPE_KEY  = "pk_test_YOUR_STRIPE_KEY_HERE"; // ← your Stripe publishable key
const APP_URL     = "http://localhost:3000";         // ← your frontend URL

/* ─── API client ─────────────────────────────────────────────────────────── */
async function api(path, { method = "GET", body, token, form } = {}) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !form) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: form ? form : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Network error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ─── Auth Context ───────────────────────────────────────────────────────── */
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("wiz_user") || "null"); } catch { return null; }
  });
  const [token,   setToken]   = useState(() => localStorage.getItem("wiz_token") || null);
  const [loading, setLoading] = useState(false);

  const save = (tok, usr) => {
    setToken(tok); setUser(usr);
    localStorage.setItem("wiz_token", tok);
    localStorage.setItem("wiz_user",  JSON.stringify(usr));
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem("wiz_token");
    localStorage.removeItem("wiz_user");
  };

  const signup = async (name, email, password) => {
    setLoading(true);
    try {
      const data = await api("/auth/signup", { method: "POST", body: { name, email, password } });
      save(data.access_token, data.user);
      return data.user;
    } finally { setLoading(false); }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
      save(data.access_token, data.user);
      return data.user;
    } finally { setLoading(false); }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const u = await api("/auth/me", { token });
      setUser(u);
      localStorage.setItem("wiz_user", JSON.stringify(u));
    } catch { logout(); }
  };

  return (
    <AuthCtx.Provider value={{ user, token, loading, signup, login, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300&family=Instrument+Serif:ital@0;1&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:#0d0d0d; --bg1:#121212; --bg2:#181818; --bg3:#242424; --bg4:#2a2a2a; --bg5:#333;
      --green:#1db954; --green-g:rgba(29,185,84,.12); --green-gg:rgba(29,185,84,.06);
      --blue:#0a84ff; --rose:#ff453a;
      --w:#fff; --w90:rgba(255,255,255,.9); --w70:rgba(255,255,255,.7);
      --w40:rgba(255,255,255,.4); --w15:rgba(255,255,255,.15);
      --w08:rgba(255,255,255,.08); --w04:rgba(255,255,255,.04);
      --font:'Plus Jakarta Sans',-apple-system,sans-serif;
      --serif:'Instrument Serif',Georgia,serif;
      --ease:cubic-bezier(.4,0,.2,1); --t:.2s var(--ease);
    }
    html{scroll-behavior:smooth}
    body{background:var(--bg);color:#fff;font-family:var(--font);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
    ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:var(--bg5);border-radius:99px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pw{from{width:0}to{width:var(--w,75%)}}
    @keyframes popIn{0%{opacity:0;transform:scale(.93)}100%{opacity:1;transform:scale(1)}}
    .gt{background:linear-gradient(135deg,#1db954 0%,#4ade80 50%,#1db954 100%);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s linear infinite}
    .td{font-family:var(--serif);font-style:italic;letter-spacing:-.02em;line-height:1.05}
    .tl{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
    .tg{color:var(--green)} .tdim{color:var(--w70)} .tm{color:var(--w40)}
    .container{max-width:1160px;margin:0 auto;padding:0 28px} .pp{padding:36px 40px}
    /* Nav */
    .nav{position:fixed;inset:0 0 auto 0;z-index:100;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:rgba(13,13,13,.85);backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid var(--w08)}
    .nlogo{display:flex;align-items:center;gap:9px;cursor:pointer;font-weight:800;font-size:17px;letter-spacing:-.03em}
    .nli{width:32px;height:32px;border-radius:9px;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:15px;color:#000;flex-shrink:0}
    .nlinks{display:flex;gap:2px}
    .nl{padding:7px 14px;border-radius:8px;font-size:13.5px;font-weight:500;color:var(--w70);cursor:pointer;transition:var(--t)}
    .nl:hover,.nl.act{color:#fff;background:var(--w08)}
    .nact{display:flex;gap:8px;align-items:center}
    /* Sidebar */
    .sidebar{position:fixed;top:60px;left:0;bottom:0;width:230px;background:var(--bg1);border-right:1px solid var(--w08);padding:20px 12px;overflow-y:auto;display:flex;flex-direction:column;gap:28px;z-index:50}
    .sg{display:flex;flex-direction:column;gap:2px}
    .sgl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--w40);padding:0 10px;margin-bottom:6px}
    .si{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font-size:13.5px;font-weight:500;color:var(--w70);cursor:pointer;transition:var(--t)}
    .si:hover{background:var(--w08);color:#fff} .si.act{background:var(--green-g);color:#fff} .si.act .sdi{color:var(--green)} .sdi{width:18px;text-align:center;flex-shrink:0;opacity:.8}
    /* App shell */
    .shell{display:flex;padding-top:60px;min-height:100vh} .main{flex:1;margin-left:230px;min-height:calc(100vh - 60px)}
    /* Buttons */
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 20px;border-radius:8px;font-family:var(--font);font-size:13.5px;font-weight:600;border:none;cursor:pointer;transition:var(--t);outline:none;white-space:nowrap}
    .btn:active{transform:scale(.97)} .btn:disabled{opacity:.45;cursor:not-allowed}
    .bg{background:var(--green);color:#000} .bg:hover:not(:disabled){background:#21cc5f;box-shadow:0 6px 24px rgba(29,185,84,.35)}
    .bw{background:#fff;color:#000} .bw:hover:not(:disabled){background:var(--w90)}
    .bgh{background:var(--w08);color:var(--w70)} .bgh:hover:not(:disabled){background:var(--w15);color:#fff}
    .bo{background:transparent;color:#fff;border:1px solid var(--w15)} .bo:hover:not(:disabled){background:var(--w08);border-color:var(--w40)}
    .bgo{background:transparent;color:var(--green);border:1px solid rgba(29,185,84,.35)} .bgo:hover:not(:disabled){background:var(--green-g);border-color:var(--green)}
    .br{background:transparent;color:var(--rose);border:1px solid rgba(255,69,58,.35)} .br:hover:not(:disabled){background:rgba(255,69,58,.1)}
    .bl{padding:14px 28px;font-size:15px;border-radius:12px} .bs{padding:7px 14px;font-size:12.5px;border-radius:8px} .bxs{padding:5px 10px;font-size:11.5px;border-radius:6px}
    .bi{padding:8px;border-radius:8px} .brnd{border-radius:99px}
    /* Cards */
    .card{background:var(--bg2);border:1px solid var(--w08);border-radius:16px;transition:var(--t)}
    .chov:hover{border-color:var(--w15);background:var(--bg3);transform:translateY(-2px)} .cp{padding:20px} .cpl{padding:28px}
    /* Inputs */
    input,select,textarea{font-family:var(--font);font-size:13.5px;color:#fff;background:var(--bg3);border:1px solid var(--w08);border-radius:8px;padding:10px 14px;outline:none;transition:var(--t);width:100%}
    input:focus,select:focus,textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(29,185,84,.12)}
    input::placeholder{color:var(--w40)} label{display:block;font-size:12px;font-weight:600;color:var(--w70);margin-bottom:6px} select option{background:var(--bg3)}
    input[type=range]{height:3px;padding:0;border-radius:99px;background:var(--bg5);border:none;cursor:pointer;appearance:none}
    input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.5)}
    input[type=range]:focus{box-shadow:none}
    /* Badges */
    .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
    .bdg{background:var(--green-g);color:var(--green);border:1px solid rgba(29,185,84,.2)}
    .bdb{background:rgba(10,132,255,.12);color:var(--blue);border:1px solid rgba(10,132,255,.2)}
    .bdw{background:var(--w08);color:var(--w90);border:1px solid var(--w15)}
    .bdr{background:rgba(255,69,58,.12);color:var(--rose);border:1px solid rgba(255,69,58,.2)}
    /* Progress */
    .prog{height:3px;background:var(--bg5);border-radius:99px;overflow:hidden}
    .progb{height:100%;background:var(--green);border-radius:99px;animation:pw 1.8s var(--ease) forwards;width:var(--w,0%)}
    /* Upload */
    .uz{border:1.5px dashed var(--bg5);border-radius:20px;padding:52px 32px;text-align:center;cursor:pointer;transition:var(--t);background:var(--bg2)}
    .uz:hover,.uz.over{border-color:var(--green);background:var(--green-gg)}
    .ui{width:56px;height:56px;border-radius:16px;margin:0 auto 18px;background:var(--green-g);display:flex;align-items:center;justify-content:center}
    /* Compare */
    .cmp{position:relative;overflow:hidden;border-radius:16px;cursor:col-resize;user-select:none}
    .cmpa{position:absolute;inset:0 auto 0 0;overflow:hidden}
    .cmpl{position:absolute;top:0;bottom:0;width:2px;background:#fff;z-index:5}
    .cmpk{position:absolute;top:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:#fff;color:#000;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.4)}
    .cmplb{position:absolute;top:12px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
    .cmplb-b{right:12px;background:var(--w15);color:var(--w70)} .cmplb-a{left:12px;background:var(--green-g);color:var(--green)}
    /* Modal */
    .ov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;animation:fadeIn .18s ease}
    .modal{background:var(--bg2);border:1px solid var(--w08);border-radius:24px;padding:40px;width:440px;max-width:92vw;position:relative;animation:popIn .22s var(--ease)}
    .mx{position:absolute;top:18px;right:18px;width:30px;height:30px;border-radius:50%;background:var(--w08);border:none;color:var(--w70);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:var(--t)}
    .mx:hover{background:var(--w15);color:#fff}
    /* Toast */
    .toast{position:fixed;bottom:28px;right:28px;z-index:300;display:flex;align-items:center;gap:10px;padding:13px 18px;border-radius:12px;background:var(--bg3);border:1px solid var(--w08);font-size:13.5px;font-weight:500;color:#fff;box-shadow:0 16px 48px rgba(0,0,0,.5);animation:popIn .22s var(--ease)}
    .tok{border-color:rgba(29,185,84,.3)} .terr{border-color:rgba(255,69,58,.3)}
    /* Spinner */
    .spin{width:16px;height:16px;border-radius:50%;border:2px solid transparent;border-top-color:currentColor;animation:spin .7s linear infinite}
    /* Tabs */
    .tabs{display:flex;gap:2px;padding:3px;background:var(--bg3);border-radius:8px}
    .tab{flex:1;padding:7px 12px;border-radius:6px;text-align:center;font-size:12.5px;font-weight:600;color:var(--w70);cursor:pointer;transition:var(--t)}
    .tab.on{background:var(--bg5);color:#fff} .tab:hover:not(.on){color:#fff}
    .div{height:1px;background:var(--w08)}
    /* Tool grid */
    .tg2{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}
    .tp{background:var(--bg2);border:1px solid var(--w08);border-radius:16px;padding:22px;position:sticky;top:20px}
    .cs{margin-bottom:22px} .cl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--w40);margin-bottom:10px;display:block}
    .slr{margin-bottom:14px} .slrt{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
    .slrt span:first-child{font-size:13px;color:var(--w70)} .slrt span:last-child{font-size:13px;font-weight:700;color:var(--green)}
    .cc{display:flex;align-items:center;gap:8px;background:var(--bg3);border:1px solid var(--w08);border-radius:8px;padding:10px 14px}
    .ccl{font-size:11px;color:var(--w40);margin-bottom:1px} .ccv{font-size:15px;font-weight:800;color:var(--green);letter-spacing:-.02em}
    /* Model opts */
    .mo{padding:11px 14px;border-radius:8px;cursor:pointer;border:1.5px solid var(--w08);background:var(--bg3);transition:var(--t);margin-bottom:8px}
    .mo:hover{border-color:var(--w15)} .mo.sel{border-color:var(--green);background:var(--green-g)}
    .mon{font-size:13px;font-weight:600;margin-bottom:2px} .mod{font-size:11.5px;color:var(--w40)}
    /* Pricing */
    .pc{background:var(--bg2);border:1px solid var(--w08);border-radius:20px;padding:32px;transition:var(--t);position:relative}
    .pc:hover{border-color:var(--w15);transform:translateY(-4px)}
    .pcf{border-color:var(--green);background:linear-gradient(160deg,var(--bg2) 0%,rgba(29,185,84,.06) 100%)}
    .pn{font-size:52px;font-weight:800;letter-spacing:-.05em;line-height:1}
    .fl{list-style:none;display:flex;flex-direction:column}
    .fl li{display:flex;align-items:center;gap:9px;padding:9px 0;font-size:13.5px;color:var(--w70);border-bottom:1px solid var(--w04)}
    .fl li:last-child{border-bottom:none}
    /* Template */
    .tmpl{border-radius:12px;aspect-ratio:9/16;cursor:pointer;border:2px solid transparent;position:relative;overflow:hidden;transition:var(--t)}
    .tmpl:hover{border-color:var(--w15);transform:translateY(-2px)} .tmpl.sel{border-color:var(--green);box-shadow:0 0 0 3px var(--green-g)}
    .tml{position:absolute;bottom:7px;left:7px;right:7px;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);border-radius:7px;padding:5px 8px;font-size:11px;font-weight:600;text-align:center;color:#fff}
    /* Swatches */
    .swg{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
    .sw{aspect-ratio:1;border-radius:6px;cursor:pointer;border:2px solid transparent;transition:var(--t)}
    .sw:hover,.sw.sel{border-color:#fff;transform:scale(1.12)}
    /* Steps */
    .steps{display:flex;gap:0;background:var(--bg3);border-radius:12px;padding:3px;width:fit-content}
    .step{display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:9px;font-size:13px;font-weight:600;color:var(--w40);cursor:pointer;transition:var(--t)}
    .step.done,.step.act{color:#fff} .step.act{background:var(--bg5)}
    .stepn{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:var(--bg5);color:var(--w40);flex-shrink:0}
    .step.act .stepn{background:var(--green);color:#000} .step.done .stepn{background:var(--green);color:#000}
    /* Gallery */
    .gall{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:14px}
    .gi{aspect-ratio:1;border-radius:12px;overflow:hidden;position:relative;cursor:pointer;background:var(--bg3);transition:var(--t)}
    .gi:hover{transform:scale(1.03)} .gio{position:absolute;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;gap:7px;opacity:0;transition:var(--t)} .gi:hover .gio{opacity:1}
    /* Proc overlay */
    .po{position:absolute;inset:0;z-index:10;background:rgba(13,13,13,.88);backdrop-filter:blur(4px);border-radius:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
    .ps{width:44px;height:44px;border-radius:50%;border:3px solid var(--bg5);border-top-color:var(--green);animation:spin .8s linear infinite}
    /* Orbs */
    .orb{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;animation:float 6s ease-in-out infinite}
    /* Grids */
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    /* Section header */
    .sh{margin-bottom:28px;animation:fadeUp .5s ease both}
    .sh h1{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.2;margin-bottom:8px}
    .sh p{font-size:14px;color:var(--w70)}
    /* Stat */
    .sv{font-size:34px;font-weight:800;letter-spacing:-.04em;line-height:1}
    /* Error banner */
    .err{background:rgba(255,69,58,.1);border:1px solid rgba(255,69,58,.3);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--rose);margin-bottom:16px}
    /* Success banner */
    .suc{background:var(--green-g);border:1px solid rgba(29,185,84,.3);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--green);margin-bottom:16px}
    /* Stripe badge */
    .stripe-badge{display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--bg3);border-radius:10px;border:1px solid var(--w08);margin-top:16px}
    @media(max-width:860px){.sidebar{display:none}.main{margin-left:0}.tg2{grid-template-columns:1fr}.g3{grid-template-columns:1fr}.g4{grid-template-columns:1fr 1fr}.nlinks{display:none}}
  `}</style>
);

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const paths = {
  home:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  grid:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  folder:"M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9z",
  scissors:"M6 2v4.5m0 0C4.3 6.5 3 7.8 3 9.5s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm0 0l12 9m-9-3l9-6m-3 13.5c1.3.5 2.5.5 3 .5s1-2.5-1-2.5-3 1.3-3 3 1.3 3 3 3z",
  sparkles:"M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-6.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-10.8 2.1 2.1m6.6 6.6 2.1 2.1",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
  wand:"M15 3l1.5 3L20 7.5l-3.5 1.5L15 12l-1.5-3.5L10 7.5l3.5-1.5L15 3zM3 11l1 2 2 1-2 1-1 2-1-2-2-1 2-1z",
  crop:"M6 2v14h14M18 22V8H4",
  filter:"M22 3H2l8 9.46V19l4 2v-8.54z",
  chart:"M18 20V10M12 20V4M6 20v-6",
  card:"M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zM1 9h22",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  bell:"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  upload:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  check:"M20 6L9 17l-5-5",
  x:"M18 6L6 18M6 6l12 12",
  plus:"M12 5v14M5 12h14",
  arrowr:"M5 12h14M12 5l7 7-7 7",
  arrowl:"M19 12H5M12 19l-7-7 7-7",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  trash:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  crown:"M3 17l3-9 5 7 2-5 5 7H3zM2 21h20",
  layers:"M12 2l9 4.5-9 4.5L3 6.5 12 2zM3 12l9 4.5 9-4.5M3 17l9 4.5 9-4.5",
  externallink:"M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
};
const Ic = ({ n, s=16, c="currentColor", sw=1.8 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[n]||paths.upload}/>
  </svg>
);

/* ─── Data ───────────────────────────────────────────────────────────────── */
const TEMPLATES = [
  {id:1,name:"Product Launch",g:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)"},
  {id:2,name:"Summer Sale",g:"linear-gradient(135deg,#f7971e,#ffd200)"},
  {id:3,name:"Event Flyer",g:"linear-gradient(135deg,#360033,#0b8793)"},
  {id:4,name:"YT Thumbnail",g:"linear-gradient(135deg,#141414,#cc0000)"},
  {id:5,name:"Social Post",g:"linear-gradient(135deg,#005c97,#363795)"},
  {id:6,name:"Minimal",g:"linear-gradient(135deg,#232526,#414345)"},
  {id:7,name:"Neon Night",g:"linear-gradient(135deg,#0d0d0d,#00d2ff)"},
  {id:8,name:"Nature",g:"linear-gradient(135deg,#134e5e,#71b280)"},
];
const GALLERY_MOCK = [
  {id:1,name:"Product Shot",tool:"4× Upscaled",date:"2h ago",bg:"#1a237e",em:"📸"},
  {id:2,name:"Profile Photo",tool:"BG Removed",date:"5h ago",bg:"#1b5e20",em:"👤"},
  {id:3,name:"Team Photo",tool:"Enhanced",date:"Yesterday",bg:"#4a1942",em:"🖼️"},
  {id:4,name:"Event Poster",tool:"Poster Gen",date:"2 days ago",bg:"#bf360c",em:"🎨"},
  {id:5,name:"Landscape",tool:"4× Upscaled",date:"3 days ago",bg:"#006064",em:"🌄"},
  {id:6,name:"Logo Design",tool:"Enhanced",date:"1 week ago",bg:"#263238",em:"✨"},
];

/* ─── Small reusable components ──────────────────────────────────────────── */
const UploadZone = ({onFile, label="Drop your image here, or click to browse"}) => {
  const [over, setOver] = useState(false);
  const ref = useRef();
  return (
    <div className={`uz ${over?"over":""}`}
      onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)}
      onDrop={e=>{e.preventDefault();setOver(false);const f=e.dataTransfer.files[0];if(f)onFile(f);}}
      onClick={()=>ref.current.click()}>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&onFile(e.target.files[0])}/>
      <div className="ui"><Ic n="upload" s={22} c="var(--green)" sw={2}/></div>
      <p style={{fontWeight:700,fontSize:15,marginBottom:6}}>{label}</p>
      <p className="tm" style={{fontSize:13}}>JPG, PNG, WebP · Up to 20 MB</p>
      <button className="btn bgh bs brnd" style={{marginTop:18}} onClick={e=>{e.stopPropagation();ref.current.click();}}>
        <Ic n="upload" s={13}/> Browse files
      </button>
    </div>
  );
};

const Compare = ({h=380}) => {
  const [pos,setPos]=useState(50); const ref=useRef(); const drag=useRef(false);
  const move=useCallback(e=>{
    if(!drag.current)return;
    const r=ref.current.getBoundingClientRect();
    const x=(e.clientX!=null?e.clientX:e.touches?.[0]?.clientX??0)-r.left;
    setPos(Math.min(100,Math.max(0,(x/r.width)*100)));
  },[]);
  return (
    <div ref={ref} className="cmp" style={{height:h}}
      onMouseMove={move} onTouchMove={move}
      onMouseDown={()=>{drag.current=true;}} onMouseUp={()=>{drag.current=false;}}
      onTouchStart={()=>{drag.current=true;}} onTouchEnd={()=>{drag.current=false;}}>
      <div style={{width:"100%",height:"100%",background:"var(--bg4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:64}}>🌄</div>
      <span className="cmplb cmplb-b">Before</span>
      <div className="cmpa" style={{width:`${pos}%`}}>
        <div style={{width:ref.current?ref.current.offsetWidth:700,height:"100%",background:"linear-gradient(135deg,#0d150d,#1a2a1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:64}}>✨</div>
        <span className="cmplb cmplb-a">After</span>
      </div>
      <div className="cmpl" style={{left:`calc(${pos}% - 1px)`}}>
        <div className="cmpk" style={{top:"50%"}}>⇌</div>
      </div>
    </div>
  );
};

/* ─── Auth Modal (real API) ──────────────────────────────────────────────── */
const AuthModal = ({mode, setMode, close}) => {
  const {signup, login, loading} = useAuth();
  const [form, setForm] = useState({name:"",email:"",pass:""});
  const [err, setErr] = useState("");
  const isLogin = mode==="login";

  const submit = async () => {
    setErr("");
    if (!form.email || !form.pass) { setErr("Please fill all fields."); return; }
    try {
      if (isLogin) await login(form.email, form.pass);
      else await signup(form.name, form.email, form.pass);
      close();
    } catch(e) { setErr(e.message); }
  };

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&close()}>
      <div className="modal">
        <button className="mx" onClick={close}>✕</button>
        <div style={{marginBottom:28}}>
          <div style={{width:36,height:36,borderRadius:10,background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,fontSize:16,color:"#000",fontWeight:700}}>✦</div>
          <h2 style={{fontWeight:800,fontSize:24,letterSpacing:"-.03em",marginBottom:6}}>{isLogin?"Welcome back":"Start for free"}</h2>
          <p className="tdim" style={{fontSize:13.5}}>{isLogin?"Sign in to WizImage":"Create account · 25 free credits"}</p>
        </div>
        {err && <div className="err">{err}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:13}}>
          {!isLogin&&<div><label>Full name</label><input placeholder="Your name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>}
          <div><label>Email</label><input type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <label style={{margin:0}}>Password</label>
              {isLogin&&<span style={{fontSize:12,color:"var(--green)",cursor:"pointer"}}>Forgot password?</span>}
            </div>
            <input type="password" placeholder="••••••••" value={form.pass} onChange={e=>setForm(f=>({...f,pass:e.target.value}))}/>
          </div>
          <button className="btn bg bl brnd" style={{marginTop:6}} onClick={submit} disabled={loading||!form.email||!form.pass}>
            {loading?<><div className="spin" style={{borderTopColor:"#000"}}/> Please wait…</>:isLogin?"Sign in":"Create free account"}
          </button>
          <div style={{textAlign:"center"}}>
            <div className="div" style={{marginBottom:16}}/>
            <span className="tdim" style={{fontSize:13}}>
              {isLogin?"New here? ":"Already have an account? "}
              <span style={{color:"var(--green)",cursor:"pointer",fontWeight:600}} onClick={()=>setMode(isLogin?"signup":"login")}>
                {isLogin?"Create account":"Sign in"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Stripe Checkout ────────────────────────────────────────────────────── */
const useCheckout = (token, showToast) => {
  const [loading, setLoading] = useState(false);

  const checkout = async (productType) => {
    setLoading(true);
    try {
      const data = await api("/payments/checkout", {
        method: "POST", token,
        body: {
          product_type: productType,
          success_url: `${APP_URL}/billing?success=1`,
          cancel_url:  `${APP_URL}/billing`,
        }
      });
      // Redirect to Stripe Checkout hosted page
      window.location.href = data.checkout_url;
    } catch(e) {
      showToast("⚠️ " + e.message, false);
    } finally { setLoading(false); }
  };

  const portal = async () => {
    setLoading(true);
    try {
      const data = await api("/payments/portal", { method:"POST", token });
      window.location.href = data.portal_url;
    } catch(e) { showToast("⚠️ " + e.message, false); }
    finally { setLoading(false); }
  };

  return { checkout, portal, loading };
};

/* ─── Nav ────────────────────────────────────────────────────────────────── */
const Nav = ({page, go, openAuth}) => {
  const {user, logout} = useAuth();
  const doLogout = () => { logout(); go("landing"); };
  return (
    <nav className="nav">
      <div className="nlogo" onClick={()=>go(user?"dashboard":"landing")}>
        <div className="nli">✦</div>WizImage
      </div>
      {user ? (
        <>
          <div className="nlinks">
            {[["Dashboard","dashboard"],["Upscale","upscale"],["Enhance","enhance"],["Remove BG","remove-bg"],["Poster","poster"]].map(([l,id])=>(
              <div key={id} className={`nl${page===id?" act":""}`} onClick={()=>go(id)}>{l}</div>
            ))}
          </div>
          <div className="nact">
            <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg3)",border:"1px solid var(--w08)",borderRadius:"99px",padding:"5px 12px 5px 8px"}}>
              <span style={{color:"var(--green)",fontSize:14}}>✦</span>
              <span style={{fontWeight:700,fontSize:13}}>{user.credits}</span>
              <span className="tm" style={{fontSize:12}}>credits</span>
            </div>
            <button className="btn bi bgh" onClick={()=>go("billing")}><Ic n="bell" s={15} c="var(--w70)"/></button>
            <button className="btn bi" style={{background:"var(--green)",borderRadius:"50%",width:34,height:34,padding:0}} onClick={doLogout}>
              <Ic n="user" s={15} c="#000"/>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="nlinks">
            {[["Pricing","pricing"]].map(([l,id])=>(
              <div key={id} className="nl" onClick={()=>go(id)}>{l}</div>
            ))}
          </div>
          <div className="nact">
            <button className="btn bgh bs" onClick={()=>openAuth("login")}>Log in</button>
            <button className="btn bg bs brnd" onClick={()=>openAuth("signup")}>Get started free</button>
          </div>
        </>
      )}
    </nav>
  );
};

const Sidebar = ({page, go}) => {
  const groups=[
    {label:"Workspace",items:[{n:"home",label:"Dashboard",id:"dashboard"},{n:"grid",label:"Gallery",id:"gallery"},{n:"folder",label:"Projects",id:"projects"}]},
    {label:"AI Tools",items:[{n:"zap",label:"Upscale",id:"upscale"},{n:"scissors",label:"Remove BG",id:"remove-bg"},{n:"sparkles",label:"Enhance",id:"enhance"},{n:"star",label:"Face Restore",id:"face-restore"},{n:"wand",label:"Poster Gen",id:"poster"}]},
    {label:"Free Tools",items:[{n:"crop",label:"Edit & Crop",id:"editor"},{n:"filter",label:"Filters",id:"filters"}]},
    {label:"Account",items:[{n:"chart",label:"Usage",id:"usage"},{n:"card",label:"Billing",id:"billing"},{n:"settings",label:"Settings",id:"settings"}]},
  ];
  return (
    <aside className="sidebar">
      {groups.map(g=>(
        <div key={g.label} className="sg">
          <div className="sgl">{g.label}</div>
          {g.items.map(item=>(
            <div key={item.id} className={`si${page===item.id?" act":""}`} onClick={()=>go(item.id)}>
              <span className="sdi"><Ic n={item.n} s={15}/></span>{item.label}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
};

/* ─── Landing ────────────────────────────────────────────────────────────── */
const Landing = ({go, openAuth}) => {
  const features=[
    {n:"zap",title:"AI Upscaling",desc:"8× upscale with Real-ESRGAN. Every pixel preserved.",c:"var(--green)"},
    {n:"scissors",title:"Background Removal",desc:"One-click U²-Net removal. Crisp transparent PNG output.",c:"#0a84ff"},
    {n:"sparkles",title:"AI Enhancement",desc:"Auto-enhance with HDR, denoise, clarity and face AI.",c:"#ff6b6b"},
    {n:"wand",title:"Poster Generator",desc:"Template + AI copy = stunning posters in seconds.",c:"#bf5af2"},
    {n:"crop",title:"Free Editor",desc:"Crop, resize, text, shapes — browser-native and free.",c:"#30d158"},
    {n:"layers",title:"Smart Filters",desc:"Cinematic LUTs, film grain, and AI color grading.",c:"#ffd60a"},
  ];
  return (
    <div>
      <section style={{minHeight:"100vh",display:"flex",alignItems:"center",background:"var(--bg)",position:"relative",overflow:"hidden",paddingTop:60}}>
        <div className="orb" style={{width:500,height:500,top:"5%",left:"-10%",background:"rgba(29,185,84,.07)",animationDuration:"7s"}}/>
        <div className="orb" style={{width:400,height:400,top:"50%",right:"-8%",background:"rgba(10,132,255,.06)",animationDuration:"9s"}}/>
        <div className="container" style={{position:"relative",zIndex:1,paddingTop:100,paddingBottom:80}}>
          <div style={{textAlign:"center",maxWidth:820,margin:"0 auto"}}>
            <div style={{marginBottom:24,animation:"fadeUp .6s ease"}}><span className="badge bdg">✦ Real-ESRGAN · GFPGAN · U²-Net</span></div>
            <h1 className="td" style={{fontSize:"clamp(52px,8vw,96px)",marginBottom:28,animation:"fadeUp .6s .08s ease both"}}>
              Make your images<br/><span className="gt">extraordinary</span>
            </h1>
            <p style={{fontSize:18,color:"var(--w70)",maxWidth:500,margin:"0 auto 44px",animation:"fadeUp .6s .16s ease both"}}>
              Upscale, enhance, remove backgrounds, and design visuals — powered by AI.
            </p>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",animation:"fadeUp .6s .24s ease both"}}>
              <button className="btn bg bl brnd" onClick={()=>openAuth("signup")}>Start for free <Ic n="arrowr" s={16} c="#000"/></button>
              <button className="btn bo bl brnd" onClick={()=>go("pricing")}>See pricing</button>
            </div>
            <p className="tm" style={{marginTop:20,fontSize:12,animation:"fadeUp .6s .32s ease both"}}>No credit card · 25 free credits on signup</p>
          </div>
          <div style={{marginTop:72,animation:"fadeUp .8s .4s ease both"}}>
            <div className="card" style={{maxWidth:740,margin:"0 auto",padding:16,background:"var(--bg1)"}}>
              <div style={{display:"flex",gap:6,marginBottom:14,padding:"4px 6px"}}>
                {["#ff5f57","#febc2e","#28c840"].map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
              </div>
              <Compare h={320}/>
              <div style={{display:"flex",gap:6,marginTop:14,justifyContent:"center",flexWrap:"wrap"}}>
                {["4× Upscaled","BG Removed","AI Enhanced","Face Restored"].map(t=>(
                  <span key={t} className="badge bdg" style={{fontSize:11}}>✓ {t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{background:"var(--bg1)",borderTop:"1px solid var(--w08)",borderBottom:"1px solid var(--w08)",padding:"36px 0"}}>
        <div className="container">
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:32,textAlign:"center"}}>
            {[["2.4M+","Images Processed"],["98.7%","Accuracy Score"],["<3s","Avg Processing"],["180+","Countries"]].map(([v,l])=>(
              <div key={l}><div className="gt" style={{fontSize:36,fontWeight:800,letterSpacing:"-.04em",lineHeight:1}}>{v}</div><div className="tm" style={{fontSize:13,marginTop:6}}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>

      <section style={{padding:"96px 0"}}>
        <div className="container">
          <div style={{textAlign:"center",marginBottom:64}}>
            <p className="tl tg" style={{marginBottom:12}}>Core Features</p>
            <h2 style={{fontSize:"clamp(32px,4vw,52px)",fontWeight:800,letterSpacing:"-.03em"}}>Everything in one place</h2>
          </div>
          <div className="g3">
            {features.map((f,i)=>(
              <div key={i} className="card chov cpl" style={{cursor:"pointer"}} onClick={()=>openAuth("signup")}>
                <div style={{width:44,height:44,borderRadius:12,marginBottom:18,background:`${f.c}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic n={f.n} s={20} c={f.c}/>
                </div>
                <h3 style={{fontWeight:700,fontSize:16,marginBottom:8,letterSpacing:"-.02em"}}>{f.title}</h3>
                <p style={{fontSize:13.5,color:"var(--w70)",lineHeight:1.65}}>{f.desc}</p>
                <div style={{marginTop:18,display:"flex",alignItems:"center",gap:5,fontSize:13,fontWeight:600,color:f.c}}>Try free <Ic n="arrowr" s={13} c={f.c}/></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:"80px 0",background:"var(--bg1)"}}>
        <div className="container">
          <div style={{textAlign:"center",marginBottom:56}}>
            <p className="tl tg" style={{marginBottom:12}}>Pricing</p>
            <h2 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:800,letterSpacing:"-.03em"}}>Pay for what you need</h2>
          </div>
          <div className="g3">
            {[
              {name:"Free",price:"$0",per:"/mo",feat:false,cta:"Start free",items:["25 credits/month","Basic editing","720p exports","Watermarked downloads"]},
              {name:"Pro",price:"$12",per:"/mo",feat:true,cta:"Start Pro trial",items:["500 credits/month","All AI tools","4K HD exports","No watermarks","Priority processing","Email support"]},
              {name:"Business",price:"$39",per:"/mo",feat:false,cta:"Contact sales",items:["Unlimited credits","Batch processing","API access","Custom branding","Dedicated support"]},
            ].map((p,i)=>(
              <div key={i} className={`pc${p.feat?" pcf":""}`}>
                {p.feat&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)"}}>
                  <span className="badge bdg"><Ic n="crown" s={10} c="var(--green)"/> Most Popular</span>
                </div>}
                <h3 style={{fontWeight:700,fontSize:16,letterSpacing:"-.02em",marginBottom:12}}>{p.name}</h3>
                <div style={{marginBottom:28}}><span className="pn">{p.price}</span><span style={{fontSize:15,color:"var(--w40)",fontWeight:400}}>{p.per}</span></div>
                <ul className="fl" style={{marginBottom:28}}>
                  {p.items.map((f,j)=><li key={j}><span style={{color:"var(--green)",flexShrink:0}}><Ic n="check" s={13} c="var(--green)"/></span>{f}</li>)}
                </ul>
                <button className={`btn brnd ${p.feat?"bg":"bo"}`} style={{width:"100%",padding:"13px"}} onClick={()=>openAuth("signup")}>{p.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:"100px 0"}}>
        <div className="container">
          <div style={{textAlign:"center",padding:"80px 40px",borderRadius:28,background:"linear-gradient(160deg,var(--bg2) 0%,rgba(29,185,84,.08) 100%)",border:"1px solid rgba(29,185,84,.2)"}}>
            <p className="tl tg" style={{marginBottom:16}}>Ready to start?</p>
            <h2 style={{fontSize:"clamp(28px,5vw,56px)",fontWeight:800,letterSpacing:"-.03em",marginBottom:16}}>Join 240,000+ creators</h2>
            <p style={{fontSize:17,color:"var(--w70)",marginBottom:40}}>Get 25 free credits. No card required.</p>
            <button className="btn bg bl brnd" onClick={()=>openAuth("signup")}>Create free account <Ic n="arrowr" s={16} c="#000"/></button>
          </div>
        </div>
      </section>

      <footer style={{background:"var(--bg1)",borderTop:"1px solid var(--w08)",padding:"40px 0"}}>
        <div className="container" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:20}}>
          <div className="nlogo"><div className="nli">✦</div>WizImage</div>
          <div style={{display:"flex",gap:24}}>{["Privacy","Terms","Blog","API","Support"].map(l=><span key={l} className="tm" style={{fontSize:13,cursor:"pointer"}}>{l}</span>)}</div>
          <span className="tm" style={{fontSize:12}}>© 2026 WizImage</span>
        </div>
      </footer>
    </div>
  );
};

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
const Dashboard = ({go}) => {
  const {user} = useAuth();
  return (
    <div className="pp">
      <div className="sh">
        <h1>Welcome back, <span className="gt">{user?.name||"Creator"}</span> 👋</h1>
        <p>Here's your workspace overview.</p>
      </div>
      <div className="g4" style={{marginBottom:36}}>
        {[
          {v:user?.credits??0,l:"Credits left",em:"✦",c:"var(--green)"},
          {v:"342",l:"Images processed",em:"🖼️",c:"#0a84ff"},
          {v:"12",l:"Posters created",em:"🎨",c:"#bf5af2"},
          {v:"4.2 GB",l:"Storage used",em:"💾",c:"#ff9f0a"},
        ].map((s,i)=>(
          <div key={i} className="card cpl">
            <div style={{fontSize:22,marginBottom:14}}>{s.em}</div>
            <div className="sv" style={{color:s.c}}>{s.v}</div>
            <div style={{fontSize:12.5,color:"var(--w40)",marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:36}}>
        <h2 style={{fontWeight:700,fontSize:17,letterSpacing:"-.02em",marginBottom:18}}>Quick Actions</h2>
        <div className="g4">
          {[["zap","Upscale","upscale","var(--green)"],["scissors","Remove BG","remove-bg","#0a84ff"],["sparkles","Enhance","enhance","#ff6b6b"],["wand","Poster Gen","poster","#bf5af2"]].map(([ic,l,id,c])=>(
            <div key={id} className="card chov cp" style={{cursor:"pointer"}} onClick={()=>go(id)}>
              <div style={{width:40,height:40,borderRadius:12,marginBottom:14,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={ic} s={18} c={c}/></div>
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{l}</div>
              <div className="tm" style={{fontSize:12}}>AI-powered</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h2 style={{fontWeight:700,fontSize:17,letterSpacing:"-.02em"}}>Recent Work</h2>
          <button className="btn bgh bs" onClick={()=>go("gallery")}>View all</button>
        </div>
        <div className="gall">
          {GALLERY_MOCK.map(g=>(
            <div key={g.id} className="gi">
              <div style={{width:"100%",height:"100%",background:g.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
                <span style={{fontSize:28}}>{g.em}</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:600}}>{g.name}</span>
              </div>
              <div className="gio"><button className="btn bw bxs"><Ic n="eye" s={11} c="#000"/> View</button><button className="btn bgh bxs"><Ic n="download" s={11}/></button></div>
              <div style={{position:"absolute",top:8,left:8}}><span className="badge bdg" style={{fontSize:10}}>{g.tool}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Upscale Tool ───────────────────────────────────────────────────────── */
const Upscale = ({showToast}) => {
  const {user, token, refreshUser} = useAuth();
  const [img,setImg]=useState(null); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  const [scale,setScale]=useState("4x"); const [model,setModel]=useState("realesrgan"); const [denoise,setDenoise]=useState(50);
  const [err,setErr]=useState("");

  const run=async()=>{
    if(!img){setErr("Please upload an image first.");return;}
    setErr(""); setBusy(true);
    try {
      const form=new FormData(); form.append("file",img); form.append("scale",scale); form.append("model",model); form.append("denoise",String(denoise));
      await api("/images/upscale",{method:"POST",token,form});
      await refreshUser();
      setDone(true); showToast("✓ Image upscaled "+scale+"!");
    } catch(e){setErr(e.message);}
    setBusy(false);
  };

  return (
    <div className="pp">
      <div className="sh"><p className="tl tg">AI Tool</p><h1>Image <span className="gt">Upscaling</span></h1><p>Enlarge up to 8× with Real-ESRGAN or SwinIR.</p></div>
      {err&&<div className="err">{err}</div>}
      <div className="tg2">
        <div>
          {!img?<UploadZone onFile={f=>{setImg(f);setDone(false);}} label="Upload image to upscale"/>:(
            <div style={{position:"relative"}}>
              {busy&&<div className="po"><div className="ps"/><span className="tdim" style={{fontSize:13}}>Upscaling with {model==="realesrgan"?"Real-ESRGAN":"SwinIR"}…</span><div style={{width:200}}><div className="prog"><div className="progb" style={{"--w":"80%"}}/></div></div></div>}
              {done?<Compare/>:<div className="card" style={{overflow:"hidden"}}><div style={{background:"var(--bg3)",padding:20,textAlign:"center",fontSize:13,color:"var(--w70)"}}>📁 {img.name} ({(img.size/1024/1024).toFixed(1)} MB) — ready to process</div></div>}
              {done&&<div style={{display:"flex",gap:10,marginTop:14}}><button className="btn bg brnd"><Ic n="download" s={15} c="#000"/> Download HD</button><button className="btn bgh brnd" onClick={()=>{setImg(null);setDone(false);}}><Ic n="refresh" s={14}/> New</button></div>}
            </div>
          )}
        </div>
        <div className="tp">
          <div className="cs">
            <span className="cl">Scale factor</span>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
              {["2x","4x","8x"].map(s=>(
                <button key={s} className={`btn brnd ${scale===s?"bg":"bgh"}`} style={{padding:"9px 4px",fontSize:13}} onClick={()=>setScale(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="cs">
            <span className="cl">AI Model</span>
            {[{id:"realesrgan",name:"Real-ESRGAN",desc:"Best for photos"},{id:"swinir",name:"SwinIR",desc:"Best for art/anime"}].map(m=>(
              <div key={m.id} className={`mo${model===m.id?" sel":""}`} onClick={()=>setModel(m.id)}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span className="mon">{m.name}</span>{model===m.id&&<Ic n="check" s={13} c="var(--green)"/>}</div>
                <div className="mod">{m.desc}</div>
              </div>
            ))}
          </div>
          <div className="cs">
            <span className="cl">Denoise strength</span>
            <div className="slr"><div className="slrt"><span>Strength</span><span>{denoise}%</span></div><input type="range" min="0" max="100" value={denoise} onChange={e=>setDenoise(+e.target.value)}/></div>
          </div>
          <div className="div" style={{margin:"18px 0"}}/>
          <div className="cc" style={{marginBottom:14}}>
            <span style={{fontSize:18}}>✦</span>
            <div><div className="ccl">Cost · Your balance</div><div className="ccv">{scale==="8x"?4:scale==="2x"?1:2} cr · {user?.credits??0} remaining</div></div>
          </div>
          <button className="btn bg brnd" style={{width:"100%"}} onClick={run} disabled={!img||busy}>
            {busy?<><div className="spin" style={{borderTopColor:"#000"}}/> Processing…</>:<><Ic n="zap" s={15} c="#000"/> Upscale Image</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Enhance Tool ───────────────────────────────────────────────────────── */
const Enhance = ({showToast}) => {
  const {user, token, refreshUser} = useAuth();
  const [img,setImg]=useState(null); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const def={brightness:50,contrast:50,sharpness:50,saturation:50,clarity:30,denoise:40,hdr:20,warmth:50};
  const [sl,setSl]=useState(def);

  const run=async(isAuto=false)=>{
    if(!img){setErr("Please upload an image.");return;}
    setErr(""); setBusy(true);
    if(isAuto) setSl({brightness:55,contrast:60,sharpness:65,saturation:55,clarity:50,denoise:45,hdr:35,warmth:52});
    try {
      const form=new FormData(); form.append("file",img); form.append("params",JSON.stringify({...sl,auto:isAuto}));
      await api("/images/enhance",{method:"POST",token,form});
      await refreshUser(); setDone(true); showToast("✓ Image enhanced!");
    } catch(e){setErr(e.message);}
    setBusy(false);
  };

  return (
    <div className="pp">
      <div className="sh"><p className="tl tg">AI Tool</p><h1>Image <span className="gt">Enhancement</span></h1><p>AI-assisted controls with one-click Auto Enhance.</p></div>
      {err&&<div className="err">{err}</div>}
      <div className="tg2">
        <div>
          {!img?<UploadZone onFile={f=>{setImg(f);setDone(false);}}/>:(
            <div style={{position:"relative"}}>
              {busy&&<div className="po"><div className="ps"/><span className="tdim" style={{fontSize:13}}>Applying enhancements…</span></div>}
              {done?<Compare/>:<div className="card cp"><div style={{textAlign:"center",fontSize:13,color:"var(--w70)"}}>📁 {img.name} — ready to enhance</div></div>}
              {done&&<div style={{display:"flex",gap:10,marginTop:14}}><button className="btn bg brnd"><Ic n="download" s={15} c="#000"/> Download</button><button className="btn bgh brnd" onClick={()=>{setImg(null);setDone(false);}}><Ic n="refresh" s={14}/> New</button></div>}
            </div>
          )}
        </div>
        <div className="tp">
          <button className="btn bg brnd" style={{width:"100%",marginBottom:20}} onClick={()=>run(true)} disabled={!img||busy}>
            <Ic n="wand" s={15} c="#000"/> ✨ Auto Enhance (1 cr)
          </button>
          <div className="div" style={{marginBottom:18}}/>
          <span className="cl">Manual Adjustments</span>
          <div style={{marginTop:14}}>
            {[["brightness","Brightness"],["contrast","Contrast"],["sharpness","Sharpness"],["saturation","Saturation"],["clarity","Clarity"],["denoise","Denoise"],["hdr","HDR Effect"],["warmth","Warmth"]].map(([k,l])=>(
              <div key={k} className="slr">
                <div className="slrt"><span>{l}</span><span>{sl[k]}</span></div>
                <input type="range" min="0" max="100" value={sl[k]} onChange={e=>setSl(s=>({...s,[k]:+e.target.value}))}/>
              </div>
            ))}
          </div>
          <div className="div" style={{margin:"18px 0"}}/>
          <div style={{display:"flex",gap:8}}>
            <button className="btn bgh brnd bs" style={{flex:1}} onClick={()=>setSl(def)}><Ic n="refresh" s={13}/> Reset</button>
            <button className="btn bg brnd bs" style={{flex:1}} onClick={()=>run(false)} disabled={!img||busy}>
              <Ic n="check" s={13} c="#000"/> Apply (1 cr)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Remove BG ──────────────────────────────────────────────────────────── */
const RemoveBg = ({showToast}) => {
  const {user, token, refreshUser} = useAuth();
  const [img,setImg]=useState(null); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  const [tab,setTab]=useState(0); const [color,setColor]=useState("#ffffff"); const [err,setErr]=useState("");
  const swatches=["#ffffff","#000000","#1e40af","#166534","#991b1b","#4c1d95","#374151","#f9fafb","#fef3c7","#fce7f3","#ecfdf5","#eff6ff"];
  const grads=["linear-gradient(135deg,#667eea,#764ba2)","linear-gradient(135deg,#f093fb,#f5576c)","linear-gradient(135deg,#4facfe,#00f2fe)","linear-gradient(135deg,#43e97b,#38f9d7)","linear-gradient(135deg,#fa709a,#fee140)","linear-gradient(135deg,#a18cd1,#fbc2eb)"];

  const run=async()=>{
    if(!img){setErr("Please upload an image.");return;}
    setErr(""); setBusy(true);
    try {
      const form=new FormData(); form.append("file",img); form.append("bg_mode",["transparent","color","gradient","upload"][tab]); form.append("bg_value",color);
      await api("/images/bg-remove",{method:"POST",token,form});
      await refreshUser(); setDone(true); showToast("✓ Background removed!");
    } catch(e){setErr(e.message);}
    setBusy(false);
  };

  const bg=tab===0?"repeating-conic-gradient(#2a2a2a 0% 25%,#333 0% 50%) 0 0 / 20px 20px":tab===1?color:tab===2?color:"var(--bg4)";
  return (
    <div className="pp">
      <div className="sh"><p className="tl tg">AI Tool</p><h1>Background <span className="gt">Removal</span></h1><p>U²-Net precision removal with instant background replacement.</p></div>
      {err&&<div className="err">{err}</div>}
      <div className="tg2">
        <div>
          {!img?<UploadZone onFile={f=>{setImg(f);setDone(false);}}/>:(
            <div style={{position:"relative"}}>
              {busy&&<div className="po"><div className="ps"/><span className="tdim" style={{fontSize:13}}>Detecting subject…</span><div style={{width:200}}><div className="prog"><div className="progb" style={{"--w":"65%"}}/></div></div></div>}
              <div className="card" style={{minHeight:380,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:done?bg:"var(--bg3)"}}>
                <div style={{textAlign:"center",fontSize:13,color:"var(--w70)",position:"relative",zIndex:1,padding:20}}>
                  {done?"✓ Background removed — download your PNG below":("📁 "+img.name)}
                </div>
                {done&&<div style={{position:"absolute",top:10,right:10}}><span className="badge bdg">✓ BG Removed</span></div>}
              </div>
              {done&&<div style={{display:"flex",gap:10,marginTop:14}}><button className="btn bg brnd"><Ic n="download" s={15} c="#000"/> Download PNG</button><button className="btn bgh brnd" onClick={()=>{setImg(null);setDone(false);}}><Ic n="refresh" s={14}/> New</button></div>}
            </div>
          )}
        </div>
        <div className="tp">
          <div className="cs">
            <span className="cl">Background</span>
            <div className="tabs" style={{marginBottom:14}}>
              {["Transparent","Color","Gradient","Upload"].map((t,i)=>(
                <div key={i} className={`tab${tab===i?" on":""}`} onClick={()=>setTab(i)}>{t}</div>
              ))}
            </div>
            {tab===1&&<><div className="swg">{swatches.map((c,i)=><div key={i} className={`sw${color===c?" sel":""}`} style={{background:c}} onClick={()=>setColor(c)}/>)}</div><input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{marginTop:10,height:36,background:"none",border:"none",padding:0,cursor:"pointer"}}/></>}
            {tab===2&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{grads.map((g,i)=><div key={i} className={`sw${color===g?" sel":""}`} style={{background:g,borderRadius:8,height:40}} onClick={()=>setColor(g)}/>)}</div>}
            {tab===3&&<UploadZone label="Drop background image"/>}
          </div>
          <div className="div" style={{margin:"18px 0"}}/>
          <div className="cc" style={{marginBottom:14}}>
            <span style={{fontSize:18}}>✦</span>
            <div><div className="ccl">Cost · Your balance</div><div className="ccv">2 cr · {user?.credits??0} remaining</div></div>
          </div>
          <button className="btn bg brnd" style={{width:"100%"}} onClick={run} disabled={!img||busy}>
            {busy?"Processing…":<><Ic n="scissors" s={15} c="#000"/> Remove Background</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Poster Generator ───────────────────────────────────────────────────── */
const PosterTool = ({showToast}) => {
  const {user, token, refreshUser} = useAuth();
  const [step,setStep]=useState(1); const [img,setImg]=useState(null); const [tmpl,setTmpl]=useState(null);
  const [busy,setBusy]=useState(false); const [text,setText]=useState({headline:"",sub:"",cta:""}); const [tips,setTips]=useState([]);

  const generateAI=async()=>{
    if(!tmpl){showToast("⚠️ Pick a template first.",false);return;}
    setBusy(true);
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`Generate poster copy for a "${TEMPLATES.find(t=>t.id===tmpl)?.name}" design. Return ONLY raw JSON: {headline, sub, cta, tips:[3 items]}. No markdown.`}]})});
      const data=await res.json();
      const raw=data.content?.find(c=>c.type==="text")?.text||"{}";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setText({headline:parsed.headline||"",sub:parsed.sub||"",cta:parsed.cta||""});
      setTips(parsed.tips||[]);
      showToast("✓ AI copy generated!");
    } catch{showToast("⚠️ AI generation failed.",false);}
    setBusy(false);
  };

  const finalize=async()=>{
    if(!img){showToast("⚠️ Upload an image first.",false);return;}
    setBusy(true);
    try {
      const form=new FormData(); form.append("file",img); form.append("template_id",String(tmpl));
      form.append("headline",text.headline); form.append("sub",text.sub); form.append("cta",text.cta);
      await api("/images/poster",{method:"POST",token,form});
      await refreshUser(); setStep(4); showToast("✓ Poster saved!");
    } catch(e){showToast("⚠️ "+e.message,false);}
    setBusy(false);
  };

  const sel=TEMPLATES.find(t=>t.id===tmpl);
  return (
    <div className="pp">
      <div className="sh"><p className="tl tg">AI Tool</p><h1>Poster <span className="gt">Generator</span></h1><p>Upload, pick a template, let AI craft the copy.</p></div>
      <div className="steps" style={{marginBottom:32}}>
        {[{n:1,l:"Upload"},{n:2,l:"Template"},{n:3,l:"Generate"},{n:4,l:"Export"}].map(s=>(
          <div key={s.n} className={`step${step===s.n?" act":""}${step>s.n?" done":""}`} onClick={()=>img&&setStep(s.n)}>
            <div className="stepn">{step>s.n?<Ic n="check" s={11} c="#000"/>:s.n}</div>{s.l}
          </div>
        ))}
      </div>

      {step===1&&(
        <div style={{maxWidth:560}}>
          {!img?<UploadZone onFile={f=>{setImg(f);setStep(2);}} label="Upload your product or photo"/>:(
            <div>
              <div className="card cp" style={{marginBottom:14,textAlign:"center",fontSize:13,color:"var(--w70)"}}>📁 {img.name}</div>
              <div style={{display:"flex",gap:10}}>
                <button className="btn bg brnd" onClick={()=>setStep(2)}>Choose Template <Ic n="arrowr" s={15} c="#000"/></button>
                <button className="btn bgh brnd" onClick={()=>setImg(null)}><Ic n="refresh" s={14}/> Re-upload</button>
              </div>
            </div>
          )}
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:20}}>
            {TEMPLATES.map(t=>(
              <div key={t.id} className={`tmpl${tmpl===t.id?" sel":""}`} onClick={()=>setTmpl(t.id)}>
                <div style={{width:"100%",height:"100%",background:t.g}}/>
                <div className="tml">{t.name}</div>
                {tmpl===t.id&&<div style={{position:"absolute",top:7,right:7,width:22,height:22,borderRadius:"50%",background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="check" s={11} c="#000"/></div>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn bgh brnd" onClick={()=>setStep(1)}><Ic n="arrowl" s={14}/> Back</button>
            <button className="btn bg brnd" disabled={!tmpl} onClick={()=>setStep(3)}>Continue <Ic n="arrowr" s={15} c="#000"/></button>
          </div>
        </div>
      )}

      {step===3&&(
        <div className="tg2">
          <div style={{borderRadius:16,overflow:"hidden",background:sel?.g,minHeight:480,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:44,textAlign:"center",gap:20,position:"relative"}}>
            {img&&<div style={{width:140,height:140,borderRadius:14,background:"rgba(0,0,0,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,boxShadow:"0 16px 48px rgba(0,0,0,.5)"}}>📸</div>}
            <div>
              <h2 style={{fontSize:34,fontWeight:800,color:"#fff",textShadow:"0 2px 20px rgba(0,0,0,.5)",marginBottom:10,letterSpacing:"-.03em"}}>{text.headline||"Your Headline"}</h2>
              <p style={{fontSize:15,color:"rgba(255,255,255,.75)",marginBottom:22}}>{text.sub||"Your subheadline"}</p>
              {text.cta&&<div style={{background:"rgba(255,255,255,.2)",backdropFilter:"blur(8px)",padding:"10px 26px",borderRadius:99,display:"inline-block",fontWeight:700,color:"#fff",fontSize:14}}>{text.cta}</div>}
            </div>
            <div style={{position:"absolute",bottom:14,right:14}}><span className="badge bdw" style={{fontSize:10}}>✦ WizImage</span></div>
          </div>
          <div className="tp">
            <button className="btn bg brnd" style={{width:"100%",marginBottom:18}} onClick={generateAI} disabled={busy}>
              {busy?<><div className="spin" style={{borderTopColor:"#000"}}/> Generating…</>:<><Ic n="wand" s={15} c="#000"/> Generate with AI</>}
            </button>
            {tips.length>0&&(
              <div style={{marginBottom:18,padding:14,background:"var(--green-g)",borderRadius:10,border:"1px solid rgba(29,185,84,.2)"}}>
                <div className="tl tg" style={{marginBottom:8}}>AI Tips</div>
                {tips.map((t,i)=><div key={i} style={{fontSize:12,color:"var(--w70)",marginBottom:4}}>• {t}</div>)}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><label>Headline</label><input value={text.headline} onChange={e=>setText(p=>({...p,headline:e.target.value}))} placeholder="Main headline"/></div>
              <div><label>Subheadline</label><input value={text.sub} onChange={e=>setText(p=>({...p,sub:e.target.value}))} placeholder="Supporting text"/></div>
              <div><label>Call to Action</label><input value={text.cta} onChange={e=>setText(p=>({...p,cta:e.target.value}))} placeholder="Shop Now, Learn More…"/></div>
            </div>
            <div className="div" style={{margin:"18px 0"}}/>
            <div className="cc" style={{marginBottom:16}}>
              <span>✦</span><div><div className="ccl">Cost · Balance</div><div className="ccv">3 cr · {user?.credits??0} left</div></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn bgh brnd bs" style={{flex:1}} onClick={()=>setStep(2)}><Ic n="arrowl" s={13}/> Template</button>
              <button className="btn bg brnd bs" style={{flex:1}} onClick={finalize} disabled={busy}>Save & Export <Ic n="arrowr" s={13} c="#000"/></button>
            </div>
          </div>
        </div>
      )}

      {step===4&&(
        <div style={{maxWidth:480,textAlign:"center"}}>
          <div style={{fontSize:64,animation:"float 3s ease-in-out infinite",marginBottom:20}}>🎉</div>
          <h2 style={{fontWeight:800,fontSize:28,letterSpacing:"-.03em",marginBottom:10}}>Poster saved!</h2>
          <p className="tdim" style={{marginBottom:36}}>Download in your preferred format.</p>
          <div className="g2" style={{marginBottom:20}}>
            {[["PNG","High quality"],["JPG","Web optimized"],["PDF","Print ready"],["Social","All sizes"]].map(([f,d])=>(
              <button key={f} className="btn bgh" style={{flexDirection:"column",gap:3,padding:16,height:72}} onClick={()=>showToast("✓ Downloading "+f+"…")}>
                <span style={{fontWeight:700}}>{f}</span><span style={{fontSize:11,color:"var(--w40)"}}>{d}</span>
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button className="btn bgh brnd" onClick={()=>setStep(3)}><Ic n="arrowl" s={14}/> Edit</button>
            <button className="btn bg brnd" onClick={()=>showToast("✓ Downloading PNG…")}><Ic n="download" s={15} c="#000"/> Download PNG</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Billing page (real Stripe) ─────────────────────────────────────────── */
const Billing = ({showToast}) => {
  const {user, token, refreshUser} = useAuth();
  const {checkout, portal, loading} = useCheckout(token, showToast);

  // Check for Stripe success redirect
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("success")){showToast("✓ Payment successful! Credits added.");refreshUser();window.history.replaceState({},"",window.location.pathname);}
  },[]);

  const packs=[["credits_25",25,"$2.99",null],["credits_100",100,"$8.99","Save 10%"],["credits_300",300,"$19.99","Save 30%"],["credits_1000",1000,"$49.99","Best Value"]];
  const singles=[["zap","single_upscale_4x","4× Upscale","$1.00","2 cr"],["zap","single_upscale_8x","8× Upscale","$1.99","4 cr"],["scissors","single_bg_remove","Remove BG","$1.00","2 cr"],["sparkles","single_enhance","Enhance","$0.50","1 cr"],["wand","single_poster","Poster Gen","$1.49","3 cr"],["star","single_face_restore","Face Restore","$1.00","2 cr"]];

  return (
    <div className="pp">
      <div className="sh"><h1>Billing <span className="gt">& Credits</span></h1><p>Manage subscription and credits. Payments via Stripe.</p></div>

      {/* Balance */}
      <div className="card" style={{padding:28,marginBottom:36,background:"linear-gradient(160deg,var(--bg2),rgba(29,185,84,.07))",border:"1px solid rgba(29,185,84,.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:20}}>
          <div>
            <p className="tl tg" style={{marginBottom:8}}>Current Balance</p>
            <div style={{fontSize:56,fontWeight:800,letterSpacing:"-.05em",lineHeight:1}}>
              <span className="gt">{user?.credits??0}</span><span className="tm" style={{fontSize:18,fontWeight:400}}> credits</span>
            </div>
            <div className="tm" style={{fontSize:12,marginTop:8}}>{user?.plan||"free"} plan</div>
          </div>
          <div style={{textAlign:"right"}}>
            <button className="btn bg bl brnd" onClick={()=>checkout("credits_100")} disabled={loading}>
              {loading?<div className="spin" style={{borderTopColor:"#000"}}/>:<><Ic n="plus" s={17} c="#000"/> Buy 100 credits</>}
            </button>
            <div className="tm" style={{fontSize:12,marginTop:8}}>100 credits = $8.99 via Stripe</div>
          </div>
        </div>
      </div>

      {/* Credit packs */}
      <h2 style={{fontWeight:700,fontSize:17,letterSpacing:"-.02em",marginBottom:18}}>Credit Packs</h2>
      <div className="g4" style={{marginBottom:40}}>
        {packs.map(([id,cr,p,tag])=>(
          <div key={id} className="card chov cpl" style={{textAlign:"center",cursor:"pointer"}} onClick={()=>checkout(id)}>
            {tag&&<div style={{marginBottom:10}}><span className="badge bdg">{tag}</span></div>}
            <div className="gt" style={{fontSize:40,fontWeight:800,letterSpacing:"-.04em"}}>{cr}</div>
            <div className="tm" style={{fontSize:12,marginBottom:14}}>credits</div>
            <button className="btn bgo brnd" style={{width:"100%",pointerEvents:"none"}}>{p}</button>
          </div>
        ))}
      </div>

      {/* Single action pay-per-use */}
      <h2 style={{fontWeight:700,fontSize:17,letterSpacing:"-.02em",marginBottom:8}}>Pay Per Use</h2>
      <p className="tdim" style={{fontSize:13,marginBottom:18}}>Single actions, no subscription. Charged via Stripe instantly.</p>
      <div className="g3" style={{marginBottom:40}}>
        {singles.map(([ic,id,n,p,cr])=>(
          <div key={id} className="card cp" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:34,height:34,borderRadius:10,background:"var(--green-g)",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={ic} s={15} c="var(--green)"/></div>
              <div><div style={{fontWeight:600,fontSize:13.5}}>{n}</div><div className="tm" style={{fontSize:11}}>{cr}</div></div>
            </div>
            <button className="btn bgo bs brnd" onClick={()=>checkout(id)} disabled={loading}>{p}</button>
          </div>
        ))}
      </div>

      {/* Subscriptions */}
      <h2 style={{fontWeight:700,fontSize:17,letterSpacing:"-.02em",marginBottom:18}}>Subscription Plans</h2>
      <div className="g3" style={{marginBottom:24}}>
        {[
          {id:"free",n:"Free",p:"$0",per:"/mo",f:false,items:["25 credits/month","Basic tools","720p exports"]},
          {id:"subscription_pro",n:"Pro",p:"$12",per:"/mo",f:true,items:["500 credits/month","All AI tools","4K exports","No watermarks","Priority processing"]},
          {id:"subscription_business",n:"Business",p:"$39",per:"/mo",f:false,items:["Unlimited credits","Batch processing","API access","Priority support"]},
        ].map((pl,i)=>(
          <div key={i} className={`pc${pl.f?" pcf":""}`}>
            <h3 style={{fontWeight:700,fontSize:16,letterSpacing:"-.02em",marginBottom:10}}>{pl.n}</h3>
            <div style={{marginBottom:22}}><span className="pn" style={{fontSize:44}}>{pl.p}</span><span className="tm" style={{fontSize:14}}>{pl.per}</span></div>
            <ul className="fl" style={{marginBottom:22}}>
              {pl.items.map((item,j)=><li key={j}><span style={{color:"var(--green)",flexShrink:0}}><Ic n="check" s={12} c="var(--green)"/></span>{item}</li>)}
            </ul>
            {user?.plan===pl.id||pl.id==="free"&&user?.plan==="free"
              ?<button className="btn bgh brnd" style={{width:"100%"}} disabled>Current Plan</button>
              :pl.id==="free"
                ?<button className="btn bo brnd" style={{width:"100%"}} disabled>Free</button>
                :<button className={`btn brnd ${pl.f?"bg":"bo"}`} style={{width:"100%"}} onClick={()=>checkout(pl.id)} disabled={loading}>
                  {loading?<div className="spin" style={{borderTopColor:pl.f?"#000":"#fff"}}/>:`Upgrade to ${pl.n} →`}
                </button>
            }
          </div>
        ))}
      </div>

      {/* Manage billing portal */}
      {user?.stripe_customer_id&&(
        <div className="card cp" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontWeight:600,marginBottom:2}}>Manage Subscription</div>
            <div className="tm" style={{fontSize:12}}>Update payment method, view invoices, cancel</div>
          </div>
          <button className="btn bgh bs brnd" onClick={portal} disabled={loading}>
            <Ic n="externallink" s={13}/> Billing portal
          </button>
        </div>
      )}

      <div className="stripe-badge">
        <Ic n="lock" s={15} c="var(--green)"/>
        <span style={{fontSize:13,color:"var(--w70)"}}>Secured by <strong style={{color:"#fff"}}>Stripe</strong> — PCI DSS compliant · 256-bit SSL · Supports Visa, Mastercard, PayPal, Apple Pay, Google Pay</span>
      </div>
    </div>
  );
};

/* ─── Gallery, Usage, Settings ───────────────────────────────────────────── */
const Gallery = () => (
  <div className="pp">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
      <div><h1 style={{fontWeight:800,fontSize:26,letterSpacing:"-.03em",marginBottom:4}}>Gallery</h1><p className="tdim">Your processed images and posters.</p></div>
      <button className="btn bgh bs"><Ic n="filter" s={13}/> Filter</button>
    </div>
    <div className="gall">
      {[...GALLERY_MOCK,...GALLERY_MOCK.map(g=>({...g,id:g.id+10}))].map(g=>(
        <div key={g.id} className="gi">
          <div style={{width:"100%",height:"100%",background:g.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
            <span style={{fontSize:28}}>{g.em}</span>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:600}}>{g.name}</span>
          </div>
          <div className="gio"><button className="btn bw bxs"><Ic n="eye" s={11} c="#000"/> View</button><button className="btn bgh bxs"><Ic n="download" s={11}/></button><button className="btn bgh bxs"><Ic n="trash" s={11}/></button></div>
          <div style={{position:"absolute",top:8,left:8}}><span className="badge bdg" style={{fontSize:10}}>{g.tool}</span></div>
        </div>
      ))}
    </div>
  </div>
);

const Usage = () => {
  const {user} = useAuth();
  return (
    <div className="pp">
      <div className="sh"><h1>Usage <span className="gt">Stats</span></h1></div>
      <div className="g4" style={{marginBottom:32}}>
        {[["342","Total Processes","🖼️"],[String(50-(user?.credits??0)),"Credits Used","✦"],["4.2 GB","Data Processed","💾"],["18 d","Until Reset","🔄"]].map(([v,l,e])=>(
          <div key={l} className="card cpl"><div style={{fontSize:22,marginBottom:12}}>{e}</div><div className="sv gt">{v}</div><div className="tm" style={{fontSize:12,marginTop:4}}>{l}</div></div>
        ))}
      </div>
      <div className="card cpl">
        <h2 style={{fontWeight:700,fontSize:17,letterSpacing:"-.02em",marginBottom:22}}>Tool Breakdown</h2>
        {[["Upscale",142,85,"var(--green)"],["Remove BG",89,53,"#0a84ff"],["Enhance",67,40,"#ff6b6b"],["Poster",34,20,"#bf5af2"],["Face Restore",10,6,"#30d158"]].map(([n,u,b,c])=>(
          <div key={n} style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13.5}}>
              <span style={{color:"var(--w70)"}}>{n}</span><span style={{fontWeight:700,color:c}}>{u} uses</span>
            </div>
            <div className="prog" style={{height:4}}><div className="progb" style={{"--w":`${b}%`,background:c}}/></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Settings = () => {
  const {user} = useAuth();
  return (
    <div className="pp">
      <div className="sh"><h1>Settings</h1></div>
      <div style={{maxWidth:540,display:"flex",flexDirection:"column",gap:20}}>
        {[
          {title:"Profile",fields:[{l:"Display name",v:user?.name,t:"text"},{l:"Email",v:user?.email,t:"email"}]},
          {title:"Preferences",fields:[{l:"Export format",v:"PNG",t:"select",opts:["PNG","JPG","WebP"]},{l:"Quality",v:"High",t:"select",opts:["Fast","Balanced","High","Ultra"]}]}
        ].map((sec,i)=>(
          <div key={i} className="card cpl">
            <h2 style={{fontWeight:700,fontSize:16,letterSpacing:"-.02em",marginBottom:18}}>{sec.title}</h2>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {sec.fields.map((f,j)=>(
                <div key={j}><label>{f.l}</label>{f.t==="select"?<select defaultValue={f.v}>{f.opts?.map(o=><option key={o}>{o}</option>)}</select>:<input type={f.t} defaultValue={f.v}/>}</div>
              ))}
            </div>
            <button className="btn bg brnd bs" style={{marginTop:18}}>Save changes</button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Pricing standalone ─────────────────────────────────────────────────── */
const PricingPage = ({openAuth}) => (
  <div style={{paddingTop:60}}>
    <section style={{padding:"96px 0"}}>
      <div className="container">
        <div style={{textAlign:"center",marginBottom:56}}>
          <p className="tl tg" style={{marginBottom:12}}>Pricing</p>
          <h1 style={{fontSize:"clamp(32px,5vw,58px)",fontWeight:800,letterSpacing:"-.035em",marginBottom:14}}>Simple, transparent pricing</h1>
          <p style={{fontSize:17,color:"var(--w70)",maxWidth:440,margin:"0 auto"}}>Start free, scale as you grow. No hidden fees.</p>
        </div>
        <div className="g3">
          {[
            {name:"Free",price:"$0",per:"/mo",feat:false,cta:"Get started",items:["25 credits/month","Basic editing","720p exports","Watermarked downloads"]},
            {name:"Pro",price:"$12",per:"/mo",feat:true,cta:"Start free trial",items:["500 credits/month","All AI tools","4K HD exports","No watermarks","Priority processing","Email support"]},
            {name:"Business",price:"$39",per:"/mo",feat:false,cta:"Contact sales",items:["Unlimited credits","Batch processing","API access","Custom branding","Dedicated support"]},
          ].map((p,i)=>(
            <div key={i} className={`pc${p.feat?" pcf":""}`} style={{position:"relative"}}>
              {p.feat&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)"}}>
                <span className="badge bdg"><Ic n="crown" s={10} c="var(--green)"/> Most Popular</span>
              </div>}
              <h3 style={{fontWeight:700,fontSize:17,letterSpacing:"-.02em",marginBottom:12}}>{p.name}</h3>
              <div style={{marginBottom:28}}><span className="pn">{p.price}</span><span className="tm" style={{fontSize:15}}>{p.per}</span></div>
              <ul className="fl" style={{marginBottom:32}}>
                {p.items.map((f,j)=><li key={j}><span style={{color:"var(--green)",flexShrink:0}}><Ic n="check" s={13} c="var(--green)"/></span>{f}</li>)}
              </ul>
              <button className={`btn brnd ${p.feat?"bg":"bo"}`} style={{width:"100%",padding:"13px"}} onClick={()=>openAuth("signup")}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

/* ─── Toast ──────────────────────────────────────────────────────────────── */
const Toast = ({msg, ok, close}) => {
  useEffect(()=>{const t=setTimeout(close,4000);return()=>clearTimeout(t);},[]);
  return (
    <div className={`toast ${ok?"tok":"terr"}`}>
      <span style={{fontSize:16}}>{ok?"✓":"⚠"}</span>
      <span>{msg}</span>
      <button style={{marginLeft:"auto",background:"none",border:"none",color:"var(--w40)",cursor:"pointer",fontSize:15,lineHeight:1}} onClick={close}>✕</button>
    </div>
  );
};

/* ─── Root App ───────────────────────────────────────────────────────────── */
function AppInner() {
  const {user} = useAuth();
  const [page,    setPage]    = useState("landing");
  const [authOpen,setAuthOpen]= useState(null);
  const [authMode,setAuthMode]= useState("signup");
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, ok=true) => setToast({msg,ok});
  const openAuth  = mode => { setAuthMode(mode); setAuthOpen(mode); };

  const go = p => {
    const prot=["dashboard","upscale","enhance","remove-bg","poster","editor","gallery","billing","settings","usage","face-restore","filters","projects"];
    if (!user && prot.includes(p)) { openAuth("signup"); return; }
    setPage(p);
  };

  // Redirect to dashboard after login
  useEffect(()=>{ if(user && page==="landing") setPage("dashboard"); },[user]);

  const render = () => {
    if (!user) {
      if (page==="pricing") return <PricingPage openAuth={openAuth}/>;
      return <Landing go={go} openAuth={openAuth}/>;
    }
    switch(page) {
      case "dashboard":  return <Dashboard go={go}/>;
      case "upscale":    return <Upscale showToast={showToast}/>;
      case "enhance":    return <Enhance showToast={showToast}/>;
      case "remove-bg":  return <RemoveBg showToast={showToast}/>;
      case "poster":     return <PosterTool showToast={showToast}/>;
      case "gallery":    return <Gallery/>;
      case "billing":    return <Billing showToast={showToast}/>;
      case "settings":   return <Settings/>;
      case "usage":      return <Usage/>;
      default:           return <Dashboard go={go}/>;
    }
  };

  return (
    <>
      <G/>
      <Nav page={page} go={go} openAuth={openAuth}/>
      {user ? (
        <div className="shell">
          <Sidebar page={page} go={go}/>
          <div className="main">{render()}</div>
        </div>
      ) : (
        <div>{render()}</div>
      )}
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} close={()=>setAuthOpen(null)}/>}
      {toast && <Toast msg={toast.msg} ok={toast.ok} close={()=>setToast(null)}/>}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner/>
    </AuthProvider>
  );
}
