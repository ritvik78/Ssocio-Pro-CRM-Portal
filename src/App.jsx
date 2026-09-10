import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

const navItems = [
  ["Overview", "⌂"],
  ["Brand submissions", "▣", "12"],
  ["Influencer submissions", "↗"],
  ["Campaigns", "◈"],
  ["Creators", "◎"],
  ["Wallet & payouts", "▣"],
  ["Email automation", "✦"],
];
const logoPath = `${import.meta.env.BASE_URL}ssssssssss.png`;
const apiBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:8787" : "");
const emailTemplates = [
  {
    name: "Submission update",
    subject: "Your Ssocio Pro submission update",
    body: "Hi {{name}},\n\nYour latest submission has been reviewed by the Ssocio Pro team.\n\nThank you,\nThe Ssocio Pro team",
  },
  {
    name: "Submission approved",
    subject: "Your Ssocio Pro submission was approved",
    body: "Hi {{name}},\n\nGood news: your submission for {{brand_name}} has been approved.\n\nThank you,\nThe Ssocio Pro team",
  },
  {
    name: "More information needed",
    subject: "Action needed on your Ssocio Pro submission",
    body: "Hi {{name}},\n\nWe need a little more information before we can complete the review of your submission. Please reply to this email with the requested details.\n\nThank you,\nThe Ssocio Pro team",
  },
];
const accessByRole = {
  "Ops / Admin": ["Overview", "Brand submissions", "Influencer submissions", "Campaigns", "Creators", "Wallet & payouts", "Email automation", "Settings"],
  Brand: ["Overview", "Influencer submissions", "Campaigns", "Creators", "Wallet & payouts", "Email automation"],
  Influencer: ["Overview", "Creators", "Wallet & payouts"],
};
const initialSubmissions = [
  {
    creator: "Amara Okafor",
    handle: "@amara.creates",
    campaign: "Glow Recipe launch",
    submitted: "12 min ago",
    comments: "184",
    likes: "12.8K",
    remarks: "Check story frame 3",
    status: "Needs review",
    initials: "AO",
    tone: "coral",
  },
  {
    creator: "Marcus Chen",
    handle: "@marcusframes",
    campaign: "Solis eyewear",
    submitted: "38 min ago",
    comments: "96",
    likes: "8.4K",
    remarks: "Waiting for link proof",
    status: "In review",
    initials: "MC",
    tone: "blue",
  },
  {
    creator: "Sofia Patel",
    handle: "@sofiaonfilm",
    campaign: "Aster skincare",
    submitted: "1 hr ago",
    comments: "241",
    likes: "19.2K",
    remarks: "Verified by admin",
    status: "Approved",
    initials: "SP",
    tone: "yellow",
  },
  {
    creator: "Theo Williams",
    handle: "@theomakes",
    campaign: "Northstar coffee",
    submitted: "2 hrs ago",
    comments: "62",
    likes: "6.1K",
    remarks: "",
    status: "Needs review",
    initials: "TW",
    tone: "green",
  },
];
const cloneSubmissions = (items) => items.map((item) => ({ ...item }));
const submissionIdentity = (item) => [item.creator, item.handle, item.campaign, item.submitted]
  .map((value) => String(value || "").trim().toLowerCase())
  .join("|");
const removeDuplicateRows = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const identity = submissionIdentity(item);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};
const offlineStorageKey = (audience) => `ssocio-pro-${audience}-submissions`;
const readOfflineRows = (audience) => {
  try {
    const value = localStorage.getItem(offlineStorageKey(audience));
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
};
const writeOfflineRows = (audience, rows) => {
  try {
    localStorage.setItem(offlineStorageKey(audience), JSON.stringify(rows));
  } catch {
    // Browser storage can be unavailable in private or restricted contexts.
  }
};
const campaigns = [
  {
    name: "Glow Recipe launch",
    brand: "Glow Recipe",
    creators: 18,
    submitted: 74,
    budget: "$8,420",
    status: "Live",
    tone: "pink",
  },
  {
    name: "Solis eyewear",
    brand: "Solis",
    creators: 12,
    submitted: 58,
    budget: "$4,180",
    status: "Live",
    tone: "black",
  },
  {
    name: "Aster skincare",
    brand: "Aster",
    creators: 24,
    submitted: 91,
    budget: "$12,600",
    status: "Reviewing",
    tone: "yellow",
  },
];
const creators = [
  {
    name: "Amara Okafor",
    handle: "@amara.creates",
    tier: "ProElite",
    score: "94",
    posts: 18,
    tone: "coral",
    initials: "AO",
  },
  {
    name: "Marcus Chen",
    handle: "@marcusframes",
    tier: "ProBasic",
    score: "81",
    posts: 12,
    tone: "blue",
    initials: "MC",
  },
  {
    name: "Sofia Patel",
    handle: "@sofiaonfilm",
    tier: "ProElite",
    score: "97",
    posts: 24,
    tone: "yellow",
    initials: "SP",
  },
  {
    name: "Theo Williams",
    handle: "@theomakes",
    tier: "ProLite",
    score: "73",
    posts: 9,
    tone: "green",
    initials: "TW",
  },
];

const readCell = (row, names) => {
  const key = Object.keys(row).find((item) =>
    names.includes(item.toLowerCase().replace(/[^a-z0-9]/g, "")),
  );
  return key ? String(row[key] ?? "") : "";
};

const normalizeSubmission = (row, index) => {
  const creator =
    readCell(row, [
      "creator",
      "creatorname",
      "influencer",
      "influencername",
      "name",
    ]) || `Imported creator ${index + 1}`;
  const handle =
    readCell(row, ["handle", "username", "instagram", "instagramhandle"]) ||
    "@imported_creator";
  const campaign =
    readCell(row, ["campaign", "campaignname", "offer"]) || "Imported campaign";
  const status = readCell(row, ["status", "reviewstatus"]) || "Needs review";
  const comments =
    readCell(row, ["comments", "commentcount", "commentscount"]) || "0";
  const likes = readCell(row, ["likes", "likecount", "likescount"]) || "0";
  const remarks = readCell(row, [
    "remarks",
    "remark",
    "notes",
    "note",
    "comment",
  ]);
  return {
    creator,
    handle,
    campaign,
    submitted:
      readCell(row, ["submitted", "submittedat", "date"]) ||
      "Imported just now",
    comments,
    likes,
    remarks,
    status,
    initials: creator
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    tone: ["coral", "blue", "yellow", "green"][index % 4],
    imported: true,
  };
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [role, setRole] = useState("Ops / Admin");
  const [toast, setToast] = useState("");
  const [brandSubmissions, setBrandSubmissions] = useState(() => removeDuplicateRows(readOfflineRows("brand") || cloneSubmissions(initialSubmissions)));
  const [influencerSubmissions, setInfluencerSubmissions] = useState(() => removeDuplicateRows(readOfflineRows("influencer") || cloneSubmissions(initialSubmissions)));
  const [search, setSearch] = useState("");
  const fileInput = useRef(null);
  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const goTo = (page) => {
    if (accessByRole[role].includes(page)) setActiveNav(page);
    setSearch("");
  };
  const changeRole = (nextRole) => {
    setRole(nextRole);
    setActiveNav("Overview");
    setSearch("");
  };
  const persistAudience = async (audience, rows) => {
    writeOfflineRows(audience, rows);
    if (!apiBase) return;
    try {
      const response = await fetch(`${apiBase}/api/storage/submissions/${audience}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      if (!response.ok) throw new Error("Storage API rejected the data");
    } catch (error) {
      console.warn(`Backend storage unavailable; ${audience} data remains saved offline.`, error.message);
    }
  };
  const setForAudience = (audience, updater) => {
    const setter = audience === "brand" ? setBrandSubmissions : setInfluencerSubmissions;
    setter((current) => {
      const next = updater(current);
      void persistAudience(audience, next);
      return next;
    });
  };
  useEffect(() => {
    const loadAudience = async (audience, setter) => {
      const offlineRows = readOfflineRows(audience);
      if (offlineRows !== null) {
        const uniqueRows = removeDuplicateRows(offlineRows);
        setter(uniqueRows);
        void persistAudience(audience, uniqueRows);
        return;
      }
      if (!apiBase) return;
      try {
        const response = await fetch(`${apiBase}/api/storage/submissions/${audience}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Storage API unavailable");
        if (result.rows.length) {
          const uniqueRows = removeDuplicateRows(result.rows);
          setter(uniqueRows);
          if (uniqueRows.length !== result.rows.length) void persistAudience(audience, uniqueRows);
        }
        else {
          const seed = cloneSubmissions(initialSubmissions);
          setter(seed);
          void persistAudience(audience, seed);
        }
      } catch {
        const seed = cloneSubmissions(initialSubmissions);
        setter(seed);
        writeOfflineRows(audience, seed);
      }
    };
    void loadAudience("brand", setBrandSubmissions);
    void loadAudience("influencer", setInfluencerSubmissions);
  }, []);
  const updateSubmission = (audience, creator, status) => {
    setForAudience(audience, (items) =>
      items.map((item) =>
        item.creator === creator ? { ...item, status } : item,
      ),
    );
    notify(`${creator} marked ${status.toLowerCase()}`);
  };
  const removeSubmission = (audience, creator) => {
    setForAudience(audience, (items) =>
      items.filter((item) => item.creator !== creator),
    );
    notify(`${creator} removed from the imported queue`);
  };
  const removeDuplicateSubmissions = (audience) => {
    let removed = 0;
    setForAudience(audience, (items) => {
      const uniqueRows = removeDuplicateRows(items);
      removed = items.length - uniqueRows.length;
      return uniqueRows;
    });
    notify(removed ? `${removed} duplicate submission${removed === 1 ? "" : "s"} removed` : "No duplicate submissions found");
  };
  const editSubmission = (audience, creator, field, value) =>
    setForAudience(audience, (items) =>
      items.map((item) =>
        item.creator === creator ? { ...item, [field]: value } : item,
      ),
    );
  const addSubmission = (audience, draft) => {
    const creator = draft.creator.trim();
    const handle = draft.handle.trim();
    const campaign = draft.campaign.trim();
    if (!creator || !handle || !campaign) {
      notify("Creator, handle, and campaign are required");
      return false;
    }
    setForAudience(audience, (items) => [
      {
        ...draft,
        creator,
        handle,
        campaign,
        submitted: draft.submitted.trim() || "Just now",
        comments: draft.comments.trim() || "0",
        likes: draft.likes.trim() || "0",
        remarks: draft.remarks.trim(),
        status: draft.status || "Needs review",
        initials: creator
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        tone: ["coral", "blue", "yellow", "green"][items.length % 4],
        manual: true,
      },
      ...items,
    ]);
    notify(`${creator} added to ${audience} submissions`);
    return true;
  };
  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      if (!rows.length) throw new Error("The first sheet is empty");
      const audience =
        activeNav === "Brand submissions" ? "brand" : "influencer";
      setForAudience(audience, (current) => removeDuplicateRows([
        ...rows.map(normalizeSubmission),
        ...current,
      ]));
      notify(
        `${rows.length} submission${rows.length === 1 ? "" : "s"} imported from Excel`,
      );
    } catch (error) {
      notify(error.message || "Excel file could not be read");
    }
    event.target.value = "";
  };

  const login = (selectedRole) => {
    setRole(selectedRole);
    setActiveNav("Overview");
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) return <LoginPage onLogin={login} />;

  const roleHome = role === "Brand" ? <BrandHome goTo={goTo} /> : role === "Influencer" ? <InfluencerHome goTo={goTo} /> : <Dashboard goTo={goTo} notify={notify} submissions={brandSubmissions} updateSubmission={(creator, status) => updateSubmission("brand", creator, status)} editSubmission={(creator, field, value) => editSubmission("brand", creator, field, value)} removeSubmission={(creator) => removeSubmission("brand", creator)} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand-mark"
          onClick={() => goTo("Overview")}
          aria-label="Go to overview"
        >
          <img src={logoPath} alt="Ssocio Pro" />
        </button>
        <button
          className="workspace-switcher"
          onClick={() => notify("Workspace switcher opened")}
        >
          <span className="workspace-dot"></span>
          <div>
            <strong>Ssocio Pro</strong>
            <small>Internal workspace</small>
          </div>
          <span className="chevron">⌄</span>
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navItems.filter(([label]) => accessByRole[role].includes(label)).map(([label, icon, badge]) => (
            <button
              key={label}
              className={activeNav === label ? "nav-item active" : "nav-item"}
              onClick={() => goTo(label)}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
              {badge && <b>{badge}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="nav-label">SYSTEM</p>
          {accessByRole[role].includes("Settings") && <button
            className={
              activeNav === "Settings" ? "nav-item active" : "nav-item"
            }
            onClick={() => goTo("Settings")}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>}
          <div className="profile">
            <div className="avatar avatar-purple">RV</div>
            <div>
              <strong>Rithik Verma</strong>
              <small>Administrator</small>
            </div>
            <button
              className="more"
              onClick={() => setIsAuthenticated(false)}
              aria-label="Log out"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span>/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="top-actions">
            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workspace"
                aria-label="Search workspace"
              />
            </div>
            <button
              className="icon-button notification"
              aria-label="Notifications"
              onClick={() => notify("You have 3 new notifications")}
            >
              ♢<i></i>
            </button>
            <div className="role-select">
              <span className="online-dot"></span>
              <select
                value={role}
                onChange={(event) => changeRole(event.target.value)}
                aria-label="Switch role"
              >
                <option>Ops / Admin</option>
                <option>Brand</option>
                <option>Influencer</option>
              </select>
            </div>
          </div>
        </header>
        <input
          ref={fileInput}
          className="hidden-file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={importExcel}
        />
        <div className="page-body">
          {activeNav === "Overview" ? (
            roleHome
          ) : activeNav === "Brand submissions" ? (
            <Submissions
              audience="brand"
              submissions={brandSubmissions}
              search={search}
              updateSubmission={(creator, status) =>
                updateSubmission("brand", creator, status)
              }
              editSubmission={(creator, field, value) =>
                editSubmission("brand", creator, field, value)
              }
              removeSubmission={(creator) => removeSubmission("brand", creator)}
              removeDuplicateSubmissions={() => removeDuplicateSubmissions("brand")}
              onAdd={(draft) => addSubmission("brand", draft)}
              onImport={() => fileInput.current?.click()}
            />
          ) : activeNav === "Influencer submissions" ? (
            <Submissions
              audience="influencer"
              submissions={influencerSubmissions}
              search={search}
              updateSubmission={(creator, status) =>
                updateSubmission("influencer", creator, status)
              }
              editSubmission={(creator, field, value) =>
                editSubmission("influencer", creator, field, value)
              }
              removeSubmission={(creator) =>
                removeSubmission("influencer", creator)
              }
              removeDuplicateSubmissions={() => removeDuplicateSubmissions("influencer")}
              onAdd={(draft) => addSubmission("influencer", draft)}
              onImport={() => fileInput.current?.click()}
            />
          ) : activeNav === "Campaigns" ? (
            <Campaigns notify={notify} />
          ) : activeNav === "Creators" ? (
            <Creators search={search} notify={notify} />
          ) : activeNav === "Wallet & payouts" ? (
            <Wallet notify={notify} />
          ) : activeNav === "Email automation" ? (
            <Automation notify={notify} />
          ) : (
            <Settings notify={notify} />
          )}
        </div>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("Ops / Admin");
  const [error, setError] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (!email.trim() || !email.includes("@") || !password.trim()) {
      setError("Enter a valid email and password to continue.");
      return;
    }
    onLogin(selectedRole);
  };
  return <main className="login-page"><div className="login-brand"><img src={logoPath} alt="Ssocio Pro" /></div><section className="login-card"><p className="eyebrow">SSOCIO PRO PORTAL</p><h1>Welcome back</h1><p className="login-copy">Sign in to manage creator campaigns, submissions, and payouts.</p><form onSubmit={submit}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" /></label><label>Sign in as<select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}><option>Ops / Admin</option><option>Brand</option><option>Influencer</option></select></label>{error && <p className="login-error">{error}</p>}<button className="primary-button login-button" type="submit">Sign in <span>→</span></button></form><small className="login-demo">Demo portal · role access is ready for integration with your auth provider</small></section></main>;
}

function BrandHome({ goTo }) { return <><PageHeader eyebrow="BRAND WORKSPACE" title="Your campaigns, at a glance" description="Track creator submissions, campaign performance, and return on investment." action="View submissions" onAction={() => goTo("Influencer submissions")} /><section className="metric-grid"><Metric label="ACTIVE CAMPAIGNS" value="08" detail="2" color="blue" /><Metric label="SUBMISSIONS RECEIVED" value="42" detail="8" /><Metric label="TOTAL REACH" value="1.8M" detail="14%" color="yellow" /><Metric label="CAMPAIGN ROI" value="3.8x" detail=".6x" color="green" /></section><section className="role-dashboard-grid"><article className="panel role-welcome-panel"><PanelHeading title="Brand action center" description="Keep your creator activations moving" /><button className="role-action" onClick={() => goTo("Campaigns")}>Manage campaigns <span>→</span></button><button className="role-action" onClick={() => goTo("Influencer submissions")}>Review influencer submissions <span>→</span></button><button className="role-action" onClick={() => goTo("Wallet & payouts")}>Open wallet statement <span>→</span></button></article><article className="panel role-welcome-panel"><PanelHeading title="This week's performance" description="Across all live brand campaigns" /><div className="role-stat"><strong>74%</strong><span>submission completion</span></div><div className="progress"><i style={{ width: "74%" }}></i></div><div className="role-stat"><strong>8.4%</strong><span>average engagement rate</span></div><div className="progress"><i style={{ width: "62%" }}></i></div></article></section></> }
function InfluencerHome({ goTo }) { return <><PageHeader eyebrow="INFLUENCER WORKSPACE" title="Your creator dashboard" description="Follow your creator performance and keep track of your Ssocio earnings." action="View creator profile" onAction={() => goTo("Creators")} /><section className="metric-grid"><Metric label="ACTIVE OFFERS" value="06" detail="2" color="blue" /><Metric label="POSTS SUBMITTED" value="18" detail="4" /><Metric label="SSOCIO SCORE" value="94" detail="7" color="yellow" /><Metric label="WALLET BALANCE" value="$2,480" detail="$420" color="green" /></section><section className="role-dashboard-grid"><article className="panel role-welcome-panel"><PanelHeading title="Creator action center" description="Your available workspace tools" /><button className="role-action" onClick={() => goTo("Creators")}>View creator profile <span>→</span></button><button className="role-action" onClick={() => goTo("Wallet & payouts")}>View cashback balance <span>→</span></button></article><article className="panel role-welcome-panel"><PanelHeading title="Your current tier" description="Based on engagement and consistency" /><div className="tier-display"><strong>ProElite</strong><span>94 Ssocio Score</span></div><div className="progress"><i style={{ width: "94%" }}></i></div><p className="role-note">Keep your posts active and connected to unlock faster cashback reviews.</p></article></section></> }

function PageHeader({ eyebrow, title, description, action, onAction }) {
  return (
    <section className="welcome-row">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subcopy">{description}</p>
      </div>
      {action && (
        <button className="primary-button" onClick={onAction}>
          <span>＋</span>
          {action}
        </button>
      )}
    </section>
  );
}
function PanelHeading({ title, description, action, onAction }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action} <span>→</span>
        </button>
      )}
    </div>
  );
}
function Metric({ label, value, detail, color = "coral" }) {
  return (
    <article className={`metric-card accent-${color}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-symbol">◎</span>
      </div>
      <strong>{value}</strong>
      <div className="metric-foot">
        <span className="trend-up">↑ {detail}</span>
        <span>vs last period</span>
      </div>
      <div className="sparkline">
        {Array(8)
          .fill(0)
          .map((_, index) => (
            <span key={index}></span>
          ))}
      </div>
    </article>
  );
}
function Status({ value }) {
  return (
    <span
RithikSSclassName={`status status-${value.toLowerCase().replaceAll(" ", "-")}`}
    >
      {value}
    </span>
  );
}
function Avatar({ item }) {
  return <div className={`avatar avatar-${item.tone}`}>{item.initials}</div>;
}

function Dashboard({
  goTo,
  notify,
  submissions,
  updateSubmission,
  editSubmission,
  removeSubmission,
}) {
  return (
    <>
      <PageHeader
        eyebrow="WEDNESDAY, SEPTEMBER 09, 2026"
        title={
          <>
            Good morning, Rithik <span>✦</span>
          </>
        }
        description="Here is what is happening across your creator network today."
        action="New campaign"
        onAction={() => goTo("Campaigns")}
      />
      <section className="metric-grid">
        <Metric label="PENDING SUBMISSIONS" value="12" detail="3" />
        <Metric label="ACTIVE CAMPAIGNS" value="08" detail="2" color="blue" />
        <Metric
          label="ENGAGEMENT RATE"
          value="8.4%"
          detail="1.2%"
          color="yellow"
        />
        <Metric
          label="WALLET BALANCE"
          value="$24,860"
          detail="$4,280"
          color="green"
        />
      </section>
      <section className="content-grid">
        <article className="panel submissions-panel">
          <PanelHeading
            title="Submission queue"
            description="Edit, review, and verify recent creator posts"
            action="View all"
            onAction={() => goTo("Brand submissions")}
          />
          <SubmissionTable
            submissions={submissions.slice(0, 4)}
            review
            updateSubmission={updateSubmission}
            editSubmission={editSubmission}
            removeSubmission={removeSubmission}
          />
        </article>
        <Activity notify={notify} />
      </section>
      <section className="bottom-grid">
        <CampaignPulse goTo={goTo} />
        <Roadmap />
      </section>
    </>
  );
}
function SubmissionTable({
  submissions,
  onAction,
  review = false,
  updateSubmission,
  editSubmission,
  removeSubmission,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CREATOR</th>
            <th>CAMPAIGN</th>
            <th>SUBMITTED</th>
            <th>ENGAGEMENT</th>
            <th>REMARKS</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((item) => (
            <tr key={`${item.creator}-${item.handle}`}>
              <td>
                <div className="creator-cell">
                  <Avatar item={item} />
                  <div>
                    {review ? (
                      <>
                        <input
                          className="inline-input"
                          value={item.creator}
                          onChange={(event) =>
                            editSubmission(
                              item.creator,
                              "creator",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          className="inline-input subtle"
                          value={item.handle}
                          onChange={(event) =>
                            editSubmission(
                              item.creator,
                              "handle",
                              event.target.value,
                            )
                          }
                        />
                      </>
                    ) : (
                      <>
                        <strong>{item.creator}</strong>
                        <small>{item.handle}</small>
                      </>
                    )}
                  </div>
                </div>
              </td>
              <td>
                {review ? (
                  <input
                    className="inline-input"
                    value={item.campaign}
                    onChange={(event) =>
                      editSubmission(
                        item.creator,
                        "campaign",
                        event.target.value,
                      )
                    }
                  />
                ) : (
                  item.campaign
                )}
              </td>
              <td className="muted">{item.submitted}</td>
              <td>
                {review ? (
                  <div className="edit-engagement">
                    <input
                      className="inline-input"
                      value={item.comments}
                      onChange={(event) =>
                        editSubmission(
                          item.creator,
                          "comments",
                          event.target.value,
                        )
                      }
                    />
                    <input
                      className="inline-input"
                      value={item.likes}
                      onChange={(event) =>
                        editSubmission(
                          item.creator,
                          "likes",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ) : (
                  <div className="engagement">
                    <span>{item.comments} comments</span>
                    <span>{item.likes} likes</span>
                  </div>
                )}
              </td>
              <td>
                {review ? (
                  <input
                    className="inline-input remarks-input"
                    value={item.remarks || ""}
                    onChange={(event) =>
                      editSubmission(
                        item.creator,
                        "remarks",
                        event.target.value,
                      )
                    }
                    placeholder="Add remark"
                  />
                ) : (
                  <span className="remarks-text">{item.remarks || "—"}</span>
                )}
              </td>
              <td>
                {review ? (
                  <select
                    className="inline-select"
                    value={item.status}
                    onChange={(event) =>
                      editSubmission(item.creator, "status", event.target.value)
                    }
                  >
                    <option>Needs review</option>
                    <option>In review</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                ) : (
                  <Status value={item.status} />
                )}
              </td>
              <td>
                {review ? (
                  <div className="row-actions">
                    <button
                      className="approve-button"
                      onClick={() => updateSubmission(item.creator, "Approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="reject-button"
                      onClick={() => updateSubmission(item.creator, "Rejected")}
                    >
                      Reject
                    </button>
                    {item.imported && (
                      <button
                        className="remove-button"
                        onClick={() => removeSubmission(item.creator)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="row-menu"
                    onClick={() => onAction(item.creator)}
                  >
                    •••
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Activity({ notify }) {
  return (
    <aside className="panel activity-panel">
      <PanelHeading
        title="Activity"
        description="Latest events across the workspace"
        action=""
      />
      <div className="activity-list">
        <div className="activity-item">
          <span className="activity-icon coral-bg">✓</span>
          <div>
            <strong>Post approved</strong>
            <p>Sofia Patel was approved for Aster skincare</p>
            <small>8 minutes ago</small>
          </div>
        </div>
        <div className="activity-item">
          <span className="activity-icon blue-bg">↗</span>
          <div>
            <strong>New submission</strong>
            <p>Amara Okafor submitted a post for review</p>
            <small>12 minutes ago</small>
          </div>
        </div>
        <div className="activity-item">
          <span className="activity-icon yellow-bg">$</span>
          <div>
            <strong>Payout processed</strong>
            <p>$1,240 sent to creator wallets</p>
            <small>42 minutes ago</small>
          </div>
        </div>
        <div className="activity-item">
          <span className="activity-icon green-bg">✦</span>
          <div>
            <strong>Campaign launched</strong>
            <p>Northstar coffee is now live</p>
            <small>2 hours ago</small>
          </div>
        </div>
      </div>
      <button
        className="activity-footer"
        onClick={() => notify("Activity log opened")}
      >
        Open activity log <span>→</span>
      </button>
    </aside>
  );
}
function CampaignPulse({ goTo }) {
  return (
    <article className="panel campaign-panel">
      <PanelHeading
        title="Campaign pulse"
        description="Performance across active offers"
        action="All campaigns"
        onAction={() => goTo("Campaigns")}
      />
      {campaigns.slice(0, 2).map((campaign) => (
        <div className="campaign-row" key={campaign.name}>
          <div className={`campaign-brand brand-${campaign.tone}`}>
            {campaign.name[0]}
          </div>
          <div className="campaign-info">
            <strong>{campaign.name}</strong>
            <span>
              {campaign.creators} creators · {campaign.submitted}% submitted
            </span>
            <div className="progress">
              <i style={{ width: `${campaign.submitted}%` }}></i>
            </div>
          </div>
          <strong className="campaign-value">
            {campaign.budget} <small>spent</small>
          </strong>
        </div>
      ))}
    </article>
  );
}
function Roadmap() {
  return (
    <article className="panel roadmap-panel">
      <PanelHeading title="Roadmap" description="Product milestones" />
      <div className="roadmap-track">
        <div className="roadmap-step done">
          <span>✓</span>
          <div>
            <strong>Submission MVP</strong>
            <small>Complete</small>
          </div>
        </div>
        <div className="roadmap-step current">
          <span>2</span>
          <div>
            <strong>Engagement tracking</strong>
            <small>In progress · Week 6-8</small>
          </div>
        </div>
        <div className="roadmap-step">
          <span>3</span>
          <div>
            <strong>Cashback engine</strong>
            <small>Upcoming · Week 9-11</small>
          </div>
        </div>
      </div>
    </article>
  );
}

function Submissions({
  audience,
  submissions,
  search,
  updateSubmission,
  editSubmission,
  removeSubmission,
  removeDuplicateSubmissions,
  onAdd,
  onImport,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const emptyDraft = {
    creator: "",
    handle: "",
    campaign: "",
    submitted: "Just now",
    comments: "0",
    likes: "0",
    remarks: "",
    status: "Needs review",
  };
  const [draft, setDraft] = useState(emptyDraft);
  const filtered = submissions.filter((item) =>
    `${item.creator} ${item.campaign} ${item.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const audienceName =
    audience === "brand" ? "Brand submissions" : "Influencer submissions";
  const description =
    audience === "brand"
      ? "Review creator content submitted to brand campaigns, verify proof, and track performance."
      : "Manage creator post submissions, update details, and follow approval progress.";
  return (
    <>
      <PageHeader
        eyebrow={`OPERATIONS / ${audience.toUpperCase()} SUBMISSIONS`}
        title={audienceName}
        description={description}
        action="Add submission"
        onAction={() => setShowCreate(true)}
      />
      {showCreate && (
        <section className="panel inline-create-form submission-create-form">
          <h2>New submission</h2>
          <div className="form-grid submission-form-grid">
            <input placeholder="Creator name *" value={draft.creator} onChange={(event) => setDraft({ ...draft, creator: event.target.value })} />
            <input placeholder="Handle *" value={draft.handle} onChange={(event) => setDraft({ ...draft, handle: event.target.value })} />
            <input placeholder="Campaign *" value={draft.campaign} onChange={(event) => setDraft({ ...draft, campaign: event.target.value })} />
            <input placeholder="Submitted" value={draft.submitted} onChange={(event) => setDraft({ ...draft, submitted: event.target.value })} />
            <input placeholder="Comments" value={draft.comments} onChange={(event) => setDraft({ ...draft, comments: event.target.value })} />
            <input placeholder="Likes" value={draft.likes} onChange={(event) => setDraft({ ...draft, likes: event.target.value })} />
            <input placeholder="Remarks" value={draft.remarks} onChange={(event) => setDraft({ ...draft, remarks: event.target.value })} />
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              <option>Needs review</option>
              <option>In review</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="primary-button" onClick={() => { if (onAdd(draft)) { setDraft(emptyDraft); setShowCreate(false); } }}>Add submission</button>
          </div>
        </section>
      )}
      <section className="metric-grid">
        <Metric
          label="AWAITING REVIEW"
          value={
            submissions.filter((item) => item.status !== "Approved").length
          }
          detail="3"
        />
        <Metric label="APPROVED TODAY" value="18" detail="6" color="green" />
        <Metric
          label="AVG. REVIEW TIME"
          value="2.4h"
          detail="18%"
          color="blue"
        />
        <Metric label="FLAGGED POSTS" value="03" detail="1" color="yellow" />
      </section>
      <article className="panel full-panel">
        <PanelHeading
          title={`${audienceName} queue`}
          description={`${filtered.length} submissions match your current view · all fields are editable`}
          action="Import Excel"
          onAction={onImport}
        />
        <div className="submission-tools">
          <button className="text-button" onClick={removeDuplicateSubmissions}>
            Remove duplicates <span>↻</span>
          </button>
        </div>
        <SubmissionTable
          submissions={filtered}
          review
          updateSubmission={updateSubmission}
          editSubmission={editSubmission}
          removeSubmission={removeSubmission}
        />
      </article>
    </>
  );
}
function Campaigns({ notify }) {
  const [items, setItems] = useState(campaigns)
  const [editing, setEditing] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState({ name: '', brand: '', budget: '$0', creators: 0, submitted: 0, status: 'Draft', tone: 'yellow' })
  const update = (name, field, value) => setItems((current) => current.map((item) => item.name === name ? { ...item, [field]: value } : item))
  const create = () => { if (!draft.name.trim() || !draft.brand.trim()) { notify('Campaign name and brand are required'); return }; setItems((current) => [{ ...draft, creators: Number(draft.creators) || 0, submitted: Number(draft.submitted) || 0 }, ...current]); setDraft({ name: '', brand: '', budget: '$0', creators: 0, submitted: 0, status: 'Draft', tone: 'yellow' }); setShowCreate(false); notify('Campaign created') }
  return (
    <>
      <PageHeader
        eyebrow="CAMPAIGNS / OFFERS"
        title="Campaigns"
        description="Launch offers, assign creators, and follow campaign performance."
        action="Create campaign"
        onAction={() => setShowCreate(true)}
      />
      {showCreate && <div className="panel inline-create-form"><h2>New campaign</h2><div className="form-grid"><input placeholder="Campaign name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input placeholder="Brand name" value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} /><input placeholder="Budget" value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: event.target.value })} /><input type="number" placeholder="Creators" value={draft.creators} onChange={(event) => setDraft({ ...draft, creators: event.target.value })} /></div><div className="form-actions"><button className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="primary-button" onClick={create}>Create campaign</button></div></div>}
      <section className="campaign-card-grid">
        {items.map((campaign) => (
          <article className="panel campaign-card" key={campaign.name}>
            <div className="campaign-card-top">
              <div className={`campaign-brand brand-${campaign.tone}`}>
                {campaign.name[0]}
              </div>
              <Status value={campaign.status} />
            </div>
            {editing === campaign.name ? <div className="card-edit-fields"><input value={campaign.name} onChange={(event) => update(campaign.name, 'name', event.target.value)} /><input value={campaign.brand} onChange={(event) => update(campaign.name, 'brand', event.target.value)} /><input value={campaign.budget} onChange={(event) => update(campaign.name, 'budget', event.target.value)} /></div> : <><h2>{campaign.name}</h2><p>{campaign.brand} · creator activation</p></>}
            <div className="campaign-stat-row">
              <span>
                <strong>{campaign.creators}</strong> creators
              </span>
              <span>
                <strong>{campaign.submitted}%</strong> submitted
              </span>
            </div>
            <div className="progress">
              <i style={{ width: `${campaign.submitted}%` }}></i>
            </div>
            <div className="campaign-card-foot">
              <span>Budget used</span>
              <strong>{campaign.budget}</strong>
            </div>
            <button className="secondary-button" onClick={() => { setEditing(editing === campaign.name ? null : campaign.name); notify(editing === campaign.name ? 'Campaign changes saved' : `${campaign.name} opened for editing`) }}>{editing === campaign.name ? 'Save campaign' : 'Edit campaign'}</button>
          </article>
        ))}
      </section>
    </>
  );
}
function Creators({ search, notify }) {
  const [items, setItems] = useState(creators)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState(null)
  const [invite, setInvite] = useState({ name: '', handle: '', tier: 'ProLite' })
  const update = (name, field, value) => setItems((current) => current.map((item) => item.name === name ? { ...item, [field]: value } : item))
  const addCreator = () => { if (!invite.name.trim() || !invite.handle.trim()) { notify('Creator name and handle are required'); return }; const initials = invite.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(); setItems((current) => [{ ...invite, score: '—', posts: 0, initials, tone: 'yellow' }, ...current]); setInvite({ name: '', handle: '', tier: 'ProLite' }); setShowInvite(false); notify('Creator invited') }
  const filtered = items.filter((item) =>
    `${item.name} ${item.handle} ${item.tier}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="NETWORK / CREATOR DIRECTORY"
        title="Creators"
        description="Monitor creator health, score, tier, and participation across offers."
        action="Invite creator"
        onAction={() => setShowInvite(true)}
      />
      {showInvite && <div className="panel inline-create-form"><h2>Invite creator</h2><div className="form-grid"><input placeholder="Creator name" value={invite.name} onChange={(event) => setInvite({ ...invite, name: event.target.value })} /><input placeholder="Instagram handle" value={invite.handle} onChange={(event) => setInvite({ ...invite, handle: event.target.value })} /><select value={invite.tier} onChange={(event) => setInvite({ ...invite, tier: event.target.value })}><option>ProLite</option><option>ProBasic</option><option>ProElite</option></select></div><div className="form-actions"><button className="secondary-button" onClick={() => setShowInvite(false)}>Cancel</button><button className="primary-button" onClick={addCreator}>Send invite</button></div></div>}
      <article className="panel full-panel">
        <PanelHeading
          title="Creator directory"
          description={`${filtered.length} active creators`}
        />
        <div className="creator-grid">
          {filtered.map((creator) => (
            <div className="creator-card" key={creator.name}>
              <div className="creator-card-head">
                <Avatar item={creator} />
                {editing === creator.name ? <div className="card-edit-fields"><input value={creator.name} onChange={(event) => update(creator.name, 'name', event.target.value)} /><input value={creator.handle} onChange={(event) => update(creator.name, 'handle', event.target.value)} /></div> : <div><strong>{creator.name}</strong><small>{creator.handle}</small></div>}
                <button
                  className="row-menu"
                  onClick={() => { setEditing(editing === creator.name ? null : creator.name); notify(editing === creator.name ? 'Creator changes saved' : `${creator.name} opened for editing`) }}
                >
                  {editing === creator.name ? 'Save' : 'Edit'}
                </button>
              </div>
              <div className="creator-stats">
                <div>
                  <span>Ssocio Score</span>
                  <strong>{creator.score}</strong>
                </div>
                <div>
                  <span>Tier</span>
                  <strong>{creator.tier}</strong>
                </div>
                <div>
                  <span>Posts</span>
                  <strong>{creator.posts}</strong>
                </div>
              </div>
              <div className="creator-card-foot">
                <span className="online-dot"></span> Instagram connected
              </div>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
function Wallet({ notify }) {
  const [showPayout, setShowPayout] = useState(false)
  const [payout, setPayout] = useState({ recipient: '', amount: '', note: '' })
  const [transactions, setTransactions] = useState([
    { icon: '↓', tone: 'green', title: 'Cashback credit · Amara Okafor', detail: 'Glow Recipe launch · Today, 10:42', amount: '+$420.00', status: 'Processed' },
    { icon: '↗', tone: 'yellow', title: 'Settlement · Glow Recipe', detail: 'Brand wallet · Yesterday, 16:08', amount: '-$1,240.00', status: 'Pending' },
    { icon: '↓', tone: 'blue', title: 'Cashback credit · Sofia Patel', detail: 'Aster skincare · Yesterday, 09:21', amount: '+$680.00', status: 'Processed' },
  ])
  const recordPayout = () => { if (!payout.recipient.trim() || !payout.amount.trim()) { notify('Recipient and amount are required'); return }; setTransactions((current) => [{ icon: '↗', tone: 'yellow', title: `Payout · ${payout.recipient}`, detail: `${payout.note || 'Manual payout'} · Just now`, amount: `-$${payout.amount}`, status: 'Pending' }, ...current]); setPayout({ recipient: '', amount: '', note: '' }); setShowPayout(false); notify('Payout recorded') }
  return (
    <>
      <PageHeader
        eyebrow="FINANCE / SETTLEMENTS"
        title="Wallet & payouts"
        description="Track balances, cashback credits, and settlement requests."
        action="Record payout"
        onAction={() => setShowPayout(true)}
      />
      {showPayout && <div className="panel inline-create-form"><h2>Record payout</h2><div className="form-grid"><input placeholder="Recipient" value={payout.recipient} onChange={(event) => setPayout({ ...payout, recipient: event.target.value })} /><input placeholder="Amount" type="number" value={payout.amount} onChange={(event) => setPayout({ ...payout, amount: event.target.value })} /><input placeholder="Note" value={payout.note} onChange={(event) => setPayout({ ...payout, note: event.target.value })} /></div><div className="form-actions"><button className="secondary-button" onClick={() => setShowPayout(false)}>Cancel</button><button className="primary-button" onClick={recordPayout}>Record payout</button></div></div>}
      <section className="metric-grid">
        <Metric
          label="AVAILABLE BALANCE"
          value="$24,860"
          detail="$4,280"
          color="green"
        />
        <Metric
          label="PENDING SETTLEMENTS"
          value="$4,280"
          detail="12%"
          color="yellow"
        />
        <Metric
          label="PAID THIS MONTH"
          value="$18,420"
          detail="24%"
          color="blue"
        />
        <Metric label="PLATFORM COMMISSION" value="$6,920" detail="9%" />
      </section>
      <article className="panel full-panel">
        <PanelHeading
          title="Recent transactions"
          description="Latest wallet ledger activity"
        />
        <div className="transaction-list">
          {transactions.map((transaction, index) => <div className="transaction-row" key={`${transaction.title}-${index}`}><span className={`transaction-icon ${transaction.tone}-bg`}>{transaction.icon}</span><div><strong>{transaction.title}</strong><small>{transaction.detail}</small></div><strong className={`amount ${transaction.amount.startsWith('+') ? 'positive' : ''}`}>{transaction.amount}</strong><Status value={transaction.status} /></div>)}
        </div>
      </article>
    </>
  );
}
function Automation({ notify }) {
  const [recipient, setRecipient] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [subject, setSubject] = useState(emailTemplates[0].subject);
  const [body, setBody] = useState(emailTemplates[0].body);
  const [sentEmails, setSentEmails] = useState([]);
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/api/email/status`)
      .then((response) => response.json())
      .then((result) => {
        if (active) setEmailStatus(result.ready ? "ready" : result.configured ? "offline" : "not-configured");
      })
      .catch(() => {
        if (active) setEmailStatus("offline");
      });
    return () => { active = false; };
  }, []);

  const sendEmail = async () => {
    if (!recipient.trim() || !recipient.includes("@")) {
      notify("Enter a valid influencer email address");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      notify("Add a subject and message before sending");
      return;
    }
    setSending(true);
    try {
      const response = await fetch(
        `${apiBase}/api/email/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: recipient.trim(),
            subject: subject.trim(),
            body: body.trim(),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Email delivery failed");
      setSentEmails((emails) => [
        {
          recipient: result.recipient,
          subject: subject.trim(),
          sentAt: "Just now",
        },
        ...emails,
      ]);
      notify(`Email sent to ${result.recipient}`);
      setRecipient("");
    } catch (error) {
      notify(error.message || "Email service is unavailable");
    } finally {
      setSending(false);
    }
  };

  const chooseTemplate = (value) => {
    const index = Number(value);
    const template = emailTemplates[index];
    setSelectedTemplate(index);
    setSubject(template.subject);
    setBody(template.body);
  };

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM / EMAIL AUTOMATION"
        title="Automation"
        description="Draft and send creator communication from one workspace."
        action="New template"
        onAction={() => {
          setSelectedTemplate(-1);
          setSubject("");
          setBody("");
          notify("New blank email draft created");
        }}
      />
      <section className="email-composer-layout">
        <article className="panel email-composer">
          <PanelHeading
            title="Send an email"
            description="Send a drafted message directly to any influencer"
          />
          <div className={`email-service-status ${emailStatus}`}>
            <span className="online-dot"></span>
            {emailStatus === "ready" && "Email service ready"}
            {emailStatus === "checking" && "Checking email service..."}
            {emailStatus === "not-configured" && "Email service needs SMTP settings"}
            {emailStatus === "offline" && "Email service unavailable"}
          </div>
          <div className="email-form">
            <label>
              Message template
              <select
                value={selectedTemplate < 0 ? "custom" : selectedTemplate}
                onChange={(event) => event.target.value === "custom" ? setSelectedTemplate(-1) : chooseTemplate(event.target.value)}
              >
                {emailTemplates.map((template, index) => <option value={index} key={template.name}>{template.name}</option>)}
                <option value="custom">Custom message</option>
              </select>
            </label>
            <label>
              Influencer email
              <input
                type="email"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="influencer@example.com"
              />
            </label>
            <label>
              Subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Email subject"
              />
            </label>
            <label>
              Draft email
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write your email..."
                rows="11"
              />
            </label>
            <div className="email-form-footer">
              <span>
                Merge fields: <code>{"{{name}}"}</code>{" "}
                <code>{"{{brand_name}}"}</code>
              </span>
              <button
                className="primary-button"
                disabled={sending}
                onClick={sendEmail}
              >
                <span>↗</span> {sending ? "Sending..." : "Send email"}
              </button>
            </div>
          </div>
        </article>
        <article className="panel sent-email-panel">
          <PanelHeading
            title="Sent activity"
            description="Messages sent from this workspace"
          />
          {sentEmails.length === 0 ? (
            <div className="empty-state">
              <span>✉</span>
              <strong>No emails sent yet</strong>
              <p>Your sent messages will appear here.</p>
            </div>
          ) : (
            <div className="sent-email-list">
              {sentEmails.map((email, index) => (
                <div
                  className="sent-email-row"
                  key={`${email.recipient}-${index}`}
                >
                  <span className="activity-icon green-bg">✓</span>
                  <div>
                    <strong>{email.recipient}</strong>
                    <small>{email.subject}</small>
                    <em>{email.sentAt}</em>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
      <section className="automation-layout">
        <article className="panel full-panel">
          <PanelHeading
            title="Active workflows"
            description="Automated communication across the creator lifecycle"
          />
          <div className="workflow-list">
            {[
              [
                "Submission received",
                "Influencer + Admin",
                "Sent 148 times",
                "green",
              ],
              ["Submission approved", "Influencer", "Sent 92 times", "blue"],
              [
                "Engagement threshold crossed",
                "Admin",
                "Sent 34 times",
                "yellow",
              ],
              [
                "Wallet payout processed",
                "Brand + Influencer",
                "Sent 28 times",
                "coral",
              ],
            ].map(([title, audience, sent, tone]) => (
              <div className="workflow-row" key={title}>
                <span className={`workflow-icon ${tone}-bg`}>✦</span>
                <div>
                  <strong>{title}</strong>
                  <small>
                    {audience} · {sent}
                  </small>
                </div>
                <span className="automation-status">Active</span>
                <button
                  className="row-menu"
                  onClick={() => notify(`${title} workflow opened`)}
                >
                  •••
                </button>
              </div>
            ))}
          </div>
        </article>
        <article className="panel automation-guide">
          <div className="panel-heading">
            <div>
              <h2>Trigger chain</h2>
              <p>How every workflow is structured</p>
            </div>
          </div>
          <div className="chain">
            <span>Trigger</span>
            <b>→</b>
            <span>Template</span>
            <b>→</b>
            <span>Send</span>
          </div>
          <p>
            Templates support merge fields like <code>{"{{name}}"}</code>,{" "}
            <code>{"{{brand_name}}"}</code>, and{" "}
            <code>{"{{cashback_amount}}"}</code>.
          </p>
        </article>
      </section>
    </>
  );
}
function Settings({ notify }) {
  const [settings, setSettings] = useState({ workspace: 'Ssocio Pro', domain: 'ssociopro.com', timezone: 'Africa/Lagos' })
  const updateSetting = (field, value) => setSettings((current) => ({ ...current, [field]: value }))
  return (
    <>
      <PageHeader
        eyebrow="SYSTEM / WORKSPACE SETTINGS"
        title="Settings"
        description="Manage workspace access, integrations, and notification preferences."
        action="Save changes"
          onAction={() => notify(`Settings saved for ${settings.workspace}`)}
      />
      <section className="settings-grid">
        <article className="panel settings-panel">
          <PanelHeading
            title="Workspace profile"
            description="The internal identity for this CRM"
          />
          <label>
            Workspace name
            <input value={settings.workspace} onChange={(event) => updateSetting('workspace', event.target.value)} />
          </label>
          <label>
            Primary domain
            <input value={settings.domain} onChange={(event) => updateSetting('domain', event.target.value)} />
          </label>
          <label>
            Timezone
            <select value={settings.timezone} onChange={(event) => updateSetting('timezone', event.target.value)}>
              <option>Africa/Lagos</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </select>
          </label>
        </article>
        <article className="panel settings-panel">
          <PanelHeading
            title="Integrations"
            description="Connections required by the roadmap"
          />
          <div className="integration-row">
            <span className="integration-badge coral-bg">IG</span>
            <div>
              <strong>Instagram Graph API</strong>
              <small>Business account connection</small>
            </div>
            <Status value="Connected" />
          </div>
          <div className="integration-row">
            <span className="integration-badge blue-bg">✉</span>
            <div>
              <strong>Transactional email</strong>
              <small>Postmark delivery service</small>
            </div>
            <Status value="Connected" />
          </div>
          <div className="integration-row">
            <span className="integration-badge yellow-bg">$</span>
            <div>
              <strong>Payout provider</strong>
              <small>Settlement account required</small>
            </div>
            <Status value="Pending" />
          </div>
        </article>
      </section>
    </>
  );
}

export default App;
