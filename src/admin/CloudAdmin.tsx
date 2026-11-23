// Admin panel for the deployed site (pariksha.aryan.cfd/?admin). Everything goes to outsie with a
// short-lived admin token from Google sign-in (see adminAuth.ts); the dev-server-only tools
// (local bank, ChromaDB indexing) stay in AdminDashboard.tsx.
import React from "react";
import { ArrowLeft, LogOut, RefreshCw, Sparkles, Eye, Upload, Trash2, Plus, ShieldCheck, Loader2, Pencil, Download, FilePlus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Latex } from "../components/Latex";
import { API_BASE_URL } from "../utils";
import { adminFetch, completeSignIn, getSession, signOut, startGoogleSignIn, type AdminSession } from "./adminAuth";
import { QuestionForm, emptyQuestion, toDraft, toPayload, type QDraft } from "./QuestionForm";
import { CommunityPanel, PresetsPanel } from "./ExamsAdmin";

type TopicRow = { name: string; slug: string; count: number };
type Q = {
  id: string; type: string; difficulty: string; question: string; explanation: string;
  options?: { label: number; value: string }[] | null; answer_label?: number | null;
  answer_labels?: number[] | null; answer_value?: string | null; answer_range?: { min?: number; max?: number } | null;
};

const slugify = (t: string) => t.trim().replace(/ /g, "_").toLowerCase();
const input = "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm";
const small = "!px-3 !py-1.5 text-sm";

function SignIn({ error }: { error: string }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="max-w-md mx-auto mt-16">
      <Card title="Admin sign-in" icon={<ShieldCheck />}>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Sign in with the Google account that is on the server's admin list. Other accounts are refused.
        </p>
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <Button disabled={busy} onClick={async () => { setBusy(true); try { await startGoogleSignIn(); } catch { setBusy(false); } }}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : null} Continue with Google
        </Button>
      </Card>
    </div>
  );
}

function GeneratePanel({ topics, group, onDone }: { topics: string[]; group: string; onDone: () => void }) {
  const [count, setCount] = React.useState(10);
  const [difficulty, setDifficulty] = React.useState("medium");
  const [skill, setSkill] = React.useState((group.match(/physics|chemistry|biology|history|geography|math\w*/i)?.[0] || "").toLowerCase());
  const [audience, setAudience] = React.useState(group.startsWith("pg_") ? "postgraduate entrance exam (GATE / CSIR NET / TIFR level)" : "");
  const [log, setLog] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    setBusy(true);
    setLog("");
    let added = 0;
    try {
      for (const t of topics) {
        let left = count;
        while (left > 0) {
          const n = Math.min(20, left);
          left -= n;
          setLog(l => l + `→ ${t}: generating ${n}… `);
          const r = await adminFetch("/api/question_bank/generate", {
            method: "POST",
            body: JSON.stringify({ topic: t, group, count: n, difficulty, save: true, skill: skill || undefined, audience: audience || undefined }),
          });
          if (r.status === 401) throw new Error("Session expired, sign in again");
          if (!r.ok) { const err = (await r.text()).slice(0, 160); setLog(l => l + `failed (${r.status}) ${err}\n`); continue; }
          const d = await r.json();
          added += d.saved?.added ?? 0;
          setLog(l => l + `${d.questions.length} valid, ${d.rejected.length} rejected, ${d.saved?.added ?? 0} new · ${d.sources?.length ?? 0} KB sources (${d.retrieval_method || "no retrieval"}, skill ${d.skill})\n`);
        }
      }
      setLog(l => l + `\nDone: ${added} new questions saved.\n`);
      onDone();
    } catch (e) {
      setLog(l => l + `\n[stopped] ${(e as Error).message}\n`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        {topics.length === 1 ? <>Topic <b>{topics[0]}</b></> : <>{topics.length} topics in <b>{group}</b></>} · grounded in the agentcyto knowledge base, validated, deduplicated, saved.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Questions per topic
          <input type="number" min={1} max={200} value={count} onChange={e => setCount(Math.max(1, Math.min(200, +e.target.value || 1)))} className={input} disabled={busy} />
        </label>
        <label className="text-sm">Difficulty
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={input} disabled={busy}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
        </label>
        <label className="text-sm">KB skill (subject)
          <input value={skill} onChange={e => setSkill(e.target.value)} placeholder="physics" className={input} disabled={busy} />
        </label>
        <label className="text-sm">Audience
          <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Class 10 CBSE board exam" className={input} disabled={busy} />
        </label>
      </div>
      <Button onClick={run} disabled={busy || topics.length === 0} className={small}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Generate
      </Button>
      {log && <pre className="text-xs whitespace-pre-wrap bg-slate-100 dark:bg-slate-950 rounded-lg p-3 max-h-64 overflow-auto">{log}</pre>}
    </div>
  );
}

function answerText(q: Q) {
  if (q.type === "NAT") return q.answer_value ?? (q.answer_range ? `${q.answer_range.min} – ${q.answer_range.max}` : "?");
  const labels = q.answer_labels?.length ? q.answer_labels : q.answer_label != null ? [q.answer_label] : [];
  return labels.map(l => String.fromCharCode(64 + l)).join(", ");
}

function QuestionsPanel({ slug, onChanged }: { slug: string; onChanged: () => void }) {
  const [page, setPage] = React.useState(0);
  const [editing, setEditing] = React.useState<QDraft | null>(null);
  const [data, setData] = React.useState<{ total: number; questions: Q[] } | null>(null);
  const per = 20;
  const load = React.useCallback(async () => {
    const r = await adminFetch(`/api/question_bank/topics/${encodeURIComponent(slug)}/questions?offset=${page * per}&limit=${per}`);
    if (r.ok) setData(await r.json());
  }, [slug, page]);
  React.useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm("Delete this question? Saved exams that used it lose it too.")) return;
    const r = await adminFetch(`/api/question_bank/questions/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) { load(); onChanged(); }
  };

  const saveEdit = async (q: QDraft) => {
    const r = await adminFetch(`/api/question_bank/questions/${encodeURIComponent(q.id!)}`, { method: "PUT", body: JSON.stringify(toPayload(q)) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return typeof j.detail === "string" ? j.detail : `Save failed (${r.status})`; }
    setEditing(null);
    load();
  };

  if (editing) return <QuestionForm initial={editing} onSave={saveEdit} onCancel={() => setEditing(null)} />;
  if (!data) return <Loader2 className="animate-spin" />;
  const pages = Math.max(1, Math.ceil(data.total / per));
  return (
    <div className="space-y-3">
      {data.questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm">
          <div className="flex justify-between gap-2 text-xs text-slate-500 mb-1">
            <span>#{page * per + i + 1} · {q.type} · {q.difficulty}</span>
            <span className="flex gap-3">
              <button onClick={() => setEditing(toDraft(q))} className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"><Pencil size={12} /> edit</button>
              <button onClick={() => del(q.id)} className="text-red-500 hover:underline flex items-center gap-1"><Trash2 size={12} /> delete</button>
            </span>
          </div>
          <Latex>{q.question}</Latex>
          {q.options?.length ? (
            <ol className="list-[upper-alpha] ml-5 mt-1">{q.options.map(o => <li key={o.label}><Latex>{o.value}</Latex></li>)}</ol>
          ) : null}
          <p className="mt-1 text-teal-600 dark:text-teal-400">Answer: {answerText(q)}</p>
          <details className="mt-1 text-slate-600 dark:text-slate-400"><summary className="cursor-pointer">Explanation</summary><Latex>{q.explanation}</Latex></details>
        </div>
      ))}
      <div className="flex items-center gap-3 text-sm">
        <Button variant="secondary" className={small} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span>{page + 1} / {pages} ({data.total})</span>
        <Button variant="secondary" className={small} disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}

function UploadPanel({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [msg, setMsg] = React.useState("");
  const onFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      const qs = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(qs)) throw new Error("Expected an array of questions (or {questions: [...]})");
      const r = await adminFetch(`/api/question_bank/topics/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(qs) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : `Upload failed (${r.status})`);
      setMsg(`Added ${d.added ?? 0} new (duplicates skipped); topic now has ${d.total ?? "?"}.`);
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-500">Questions JSON in the question-bank format. Only questions not already in the topic are added.</p>
      <input type="file" accept="application/json,.json" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      {msg && <p>{msg}</p>}
    </div>
  );
}

function AddQuestionPanel({ topic, group, onDone }: { topic: string; group: string; onDone: () => void }) {
  const [msg, setMsg] = React.useState("");
  const [key, setKey] = React.useState(0);
  const save = async (q: QDraft) => {
    const r = await adminFetch(`/api/question_bank/topics/${encodeURIComponent(slugify(topic))}/question?group=${encodeURIComponent(group)}`,
      { method: "POST", body: JSON.stringify(toPayload(q)) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return typeof j.detail === "string" ? j.detail : `Save failed (${r.status})`; }
    setMsg("Added. Write another, or close.");
    setKey(k => k + 1);
    onDone();
  };
  return (
    <div className="space-y-2">
      {msg && <p className="text-sm text-teal-600 dark:text-teal-400">{msg}</p>}
      <QuestionForm key={key} initial={emptyQuestion()} onSave={save} onCancel={() => setMsg("")} saveLabel="Add question" />
    </div>
  );
}

async function downloadExport(params: Record<string, string>, filename: string) {
  const r = await adminFetch(`/api/question_bank/export?${new URLSearchParams(params)}`);
  if (!r.ok) { alert(`Export failed (${r.status})`); return; }
  const blob = new Blob([JSON.stringify(await r.json(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function NewGroupPanel({ onDone }: { onDone: (group: string) => void }) {
  const [name, setName] = React.useState("");
  const [topicsText, setTopicsText] = React.useState("");
  const topics = topicsText.split("\n").map(t => t.trim()).filter(Boolean);
  const group = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        A group is a list of topics. The knowledge base for its subject lives in agentcyto (one folder per skill),
        so make sure that skill exists first. Topics are created as questions are generated.
      </p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name, e.g. class10 history" className={input} />
      <textarea value={topicsText} onChange={e => setTopicsText(e.target.value)} rows={6} placeholder={"One topic per line\nThe French Revolution\nNationalism in India"} className={input} />
      {group && topics.length > 0 && <GeneratePanel key={group + topics.length} topics={topics} group={group} onDone={() => onDone(group)} />}
    </div>
  );
}

export default function CloudAdmin({ onBack }: { onBack: () => void }) {
  const [session, setSession] = React.useState<AdminSession | null>(getSession);
  const [authError, setAuthError] = React.useState("");
  const [checking, setChecking] = React.useState(true);
  const [groups, setGroups] = React.useState<string[]>([]);
  const [group, setGroup] = React.useState("");
  const [rows, setRows] = React.useState<TopicRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [panel, setPanel] = React.useState<{ kind: "generate" | "view" | "upload" | "add"; topic: string | null } | { kind: "new" } | null>(null);
  const [tab, setTab] = React.useState<"bank" | "types" | "community">("bank");

  React.useEffect(() => {
    completeSignIn()
      .then(s => { if (s) setSession(s); })
      .catch(e => setAuthError((e as Error).message))
      .finally(() => setChecking(false));
    const out = () => setSession(null);
    window.addEventListener("pariksha-admin-signed-out", out);
    return () => window.removeEventListener("pariksha-admin-signed-out", out);
  }, []);

  const loadGroups = React.useCallback(async () => {
    const r = await fetch(`${API_BASE_URL}/api/question_bank/groups`);
    const g: string[] = r.ok ? await r.json() : [];
    setGroups(g);
    setGroup(cur => (cur && g.includes(cur) ? cur : g[0] || ""));
  }, []);

  const loadTopics = React.useCallback(async () => {
    if (!group) return;
    setLoading(true);
    try {
      const [named, stats] = await Promise.all([
        fetch(`${API_BASE_URL}/api/question_bank/topics?group=${encodeURIComponent(group)}`).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/question_bank/topics`).then(r => r.json()),
      ]);
      const counts = new Map<string, TopicRow>((stats as TopicRow[]).map(s => [s.slug, s]));
      setRows(((named?.[group] as string[]) || []).map(n => counts.get(slugify(n)) || { name: n, slug: slugify(n), count: 0 }));
    } finally {
      setLoading(false);
    }
  }, [group]);

  React.useEffect(() => { if (session) loadGroups(); }, [session, loadGroups]);
  React.useEffect(() => { if (session) loadTopics(); }, [session, loadTopics]);

  const clearTopic = async (t: TopicRow) => {
    const typed = prompt(`Delete ALL ${t.count} questions in "${t.name}"? Type the topic slug to confirm:\n${t.slug}`);
    if (typed !== t.slug) return;
    const r = await adminFetch(`/api/question_bank/topics/${encodeURIComponent(t.slug)}`, { method: "DELETE" });
    if (r.ok) loadTopics();
  };

  const header = (
    <div className="flex items-center justify-between gap-3 mb-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-teal-500"><ArrowLeft size={18} /> Back</button>
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">Question bank admin</h1>
      {session ? (
        <button onClick={() => { signOut(); setSession(null); }} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-500" title={session.email}>
          <LogOut size={16} /> Sign out
        </button>
      ) : <span />}
    </div>
  );

  if (checking) return <div className="p-6">{header}<Loader2 className="animate-spin mx-auto" /></div>;
  if (!session) return <div className="p-4 sm:p-6">{header}<SignIn error={authError} /></div>;

  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {header}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800">
        {([["bank", "Question bank"], ["types", "Exam types"], ["community", "Community exams"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === k ? "border-teal-500 text-teal-600 dark:text-teal-400" : "border-transparent text-slate-500"}`}>{label}</button>
        ))}
      </div>
      {tab === "types" && <PresetsPanel groups={groups} />}
      {tab === "community" && <CommunityPanel />}
      {tab === "bank" && <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={group} onChange={e => { setGroup(e.target.value); setPanel(null); }} className={`${input} !w-auto`}>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-sm text-slate-500">{rows.length} topics · {total} questions</span>
        <div className="flex-1" />
        <Button variant="secondary" className={small} onClick={loadTopics}><RefreshCw size={14} /> Refresh</Button>
        <Button variant="secondary" className={small} onClick={() => setPanel({ kind: "generate", topic: null })}><Sparkles size={14} /> Generate for all</Button>
        <Button variant="secondary" className={small} onClick={() => downloadExport({ group }, `${group}.json`)}><Download size={14} /> Download group</Button>
        <Button className={small} onClick={() => setPanel({ kind: "new" })}><Plus size={14} /> New group</Button>
      </div>

      {panel && (
        <Card className="mb-6 hover:!translate-y-0">
          <div className="flex justify-between mb-3">
            <h2 className="font-semibold">
              {panel.kind === "new" ? "New group" : panel.kind === "generate" ? "Generate from knowledge base" : panel.kind === "view" ? `Questions: ${panel.topic}` : panel.kind === "add" ? `Add a question: ${panel.topic}` : `Upload JSON: ${panel.topic}`}
            </h2>
            <button onClick={() => setPanel(null)} className="text-sm text-slate-500">Close</button>
          </div>
          {panel.kind === "new" && <NewGroupPanel onDone={g => { loadGroups().then(() => setGroup(g)); }} />}
          {panel.kind === "generate" && <GeneratePanel key={`${group}:${panel.topic}`} topics={panel.topic ? [panel.topic] : rows.map(r => r.name)} group={group} onDone={loadTopics} />}
          {panel.kind === "view" && panel.topic && <QuestionsPanel slug={slugify(panel.topic)} onChanged={loadTopics} />}
          {panel.kind === "upload" && panel.topic && <UploadPanel slug={slugify(panel.topic)} onDone={loadTopics} />}
          {panel.kind === "add" && panel.topic && <AddQuestionPanel topic={panel.topic} group={group} onDone={loadTopics} />}
        </Card>
      )}

      {loading ? <Loader2 className="animate-spin mx-auto" /> : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
          {rows.map(t => (
            <div key={t.slug} className="flex flex-wrap items-center gap-2 p-3">
              <div className="flex-1 min-w-[12rem]">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-slate-500">{t.count} questions</div>
              </div>
              <button title="Generate" onClick={() => setPanel({ kind: "generate", topic: t.name })} className="p-2 hover:text-teal-500"><Sparkles size={16} /></button>
              <button title="View questions" onClick={() => setPanel({ kind: "view", topic: t.name })} className="p-2 hover:text-teal-500"><Eye size={16} /></button>
              <button title="Add a question by hand" onClick={() => setPanel({ kind: "add", topic: t.name })} className="p-2 hover:text-teal-500"><FilePlus size={16} /></button>
              <button title="Upload JSON" onClick={() => setPanel({ kind: "upload", topic: t.name })} className="p-2 hover:text-teal-500"><Upload size={16} /></button>
              <button title="Download JSON" onClick={() => downloadExport({ topic: t.slug }, `${t.slug}.json`)} className="p-2 hover:text-teal-500"><Download size={16} /></button>
              <button title="Delete all questions" onClick={() => clearTopic(t)} className="p-2 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
          {rows.length === 0 && <p className="p-4 text-sm text-slate-500">No topics in this group yet.</p>}
        </div>
      )}
      </>}
    </div>
  );
}
