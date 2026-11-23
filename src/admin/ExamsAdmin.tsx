// Admin tabs for exams: exam types (server presets), building + publishing an exam, and community
// exam moderation. All writes go through adminFetch (outsie admin token).
import React from "react";
import { Loader2, Pencil, Trash2, Plus, Sparkles, Send, Save, ChevronLeft } from "lucide-react";
import { Button } from "../components/Button";
import { Latex } from "../components/Latex";
import { API_BASE_URL, SUBJECT_GROUPS, fetchSubjectGroups, generatePresetExam, robustJsonParse } from "../utils";
import type { QuestionType } from "../types";
import { adminFetch } from "./adminAuth";
import { QuestionForm, toDraft, toPayload, type QDraft } from "./QuestionForm";

export type PresetSection = {
  name: string;
  topicWeights: Record<string, number>;
  marking: { positive: number; negative: number };
  allowedTypes: QuestionType[];
  maxAttempts?: number | null;
};
export type ServerPreset = {
  preset_id?: string; name: string; description: string; group: string; skill?: string | null;
  audience?: string | null; duration_minutes: number; sections: PresetSection[]; published: boolean;
};

const input = "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm";
const small = "!px-3 !py-1.5 text-sm";
const slugify = (t: string) => t.trim().replace(/ /g, "_").toLowerCase();
const errText = async (r: Response) => {
  try { const j = await r.json(); return typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail).slice(0, 300); }
  catch { return `HTTP ${r.status}`; }
};

/** Topic/category names usable as section weights for a group, plus category -> topics. */
async function groupVocabulary(group: string) {
  const map = await fetchSubjectGroups(group);
  const topics = map[group] || Object.values(map).flat();
  const categories = group === "pg_physics" ? Object.keys(SUBJECT_GROUPS) : [];
  const resolve = (key: string) => (topics.includes(key) ? [key] : map[key] || []);
  return { topics, categories, resolve };
}

/** Generate `count` KB-grounded questions for a topic (chunks of 20) and save them. Returns how many were new. */
async function generateInto(topic: string, group: string, count: number, skill: string | null | undefined,
                            audience: string | null | undefined, log: (s: string) => void): Promise<number> {
  let added = 0;
  for (let left = count; left > 0; left -= 20) {
    const n = Math.min(20, left);
    log(`→ ${topic}: generating ${n}… `);
    const r = await adminFetch("/api/question_bank/generate", {
      method: "POST",
      body: JSON.stringify({ topic, group, count: n, difficulty: "medium", save: true, skill: skill || undefined, audience: audience || undefined }),
    });
    if (r.status === 401) throw new Error("Session expired, sign in again");
    if (!r.ok) { log(`failed: ${await errText(r)}\n`); continue; }
    const d = await r.json();
    added += d.saved?.added ?? 0;
    log(`${d.saved?.added ?? 0} new (${d.rejected.length} rejected, skill ${d.skill})\n`);
  }
  return added;
}

// ---------------------------------------------------------------------------------------------------
// Exam types (presets)
// ---------------------------------------------------------------------------------------------------

const blankSection = (): PresetSection => ({ name: "Section A", topicWeights: {}, marking: { positive: 4, negative: 1 }, allowedTypes: ["MCQ", "MSQ", "NAT"] });

function PresetEditor({ initial, groups, onSaved, onCancel }: {
  initial: ServerPreset; groups: string[]; onSaved: () => void; onCancel: () => void;
}) {
  const [p, setP] = React.useState<ServerPreset>(initial);
  const [vocab, setVocab] = React.useState<string[]>([]);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const set = (patch: Partial<ServerPreset>) => setP(prev => ({ ...prev, ...patch }));
  const setSection = (i: number, patch: Partial<PresetSection>) =>
    set({ sections: p.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  React.useEffect(() => {
    if (p.group) groupVocabulary(p.group).then(v => setVocab([...v.categories, ...v.topics]));
  }, [p.group]);

  const save = async () => {
    setBusy(true);
    setErr("");
    const body = JSON.stringify({ ...p, sections: p.sections.map(s => ({ ...s, maxAttempts: s.maxAttempts || null })) });
    const r = p.preset_id
      ? await adminFetch(`/api/exam_presets/${p.preset_id}`, { method: "PUT", body })
      : await adminFetch("/api/exam_presets", { method: "POST", body });
    setBusy(false);
    if (!r.ok) return setErr(await errText(r));
    onSaved();
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Name<input value={p.name} onChange={e => set({ name: e.target.value })} className={input} placeholder="JEE Main Physics mock" /></label>
        <label>Question bank group
          <select value={p.group} onChange={e => set({ group: e.target.value })} className={input}>
            {groups.map(g => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2">Description<input value={p.description} onChange={e => set({ description: e.target.value })} className={input} placeholder="30 questions · 60 min · +4/−1" /></label>
        <label>KB skill (for topping up the bank)<input value={p.skill ?? ""} onChange={e => set({ skill: e.target.value })} className={input} placeholder="physics" /></label>
        <label>Audience<input value={p.audience ?? ""} onChange={e => set({ audience: e.target.value })} className={input} placeholder="JEE Main aspirants" /></label>
        <label>Duration (minutes)<input type="number" min={5} max={600} value={p.duration_minutes} onChange={e => set({ duration_minutes: +e.target.value || 60 })} className={input} /></label>
        <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={p.published} onChange={e => set({ published: e.target.checked })} /> Published (students see it)</label>
      </div>

      {p.sections.map((s, i) => (
        <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex-1 min-w-[10rem]">Section<input value={s.name} onChange={e => setSection(i, { name: e.target.value })} className={input} /></label>
            <label className="w-20">+ marks<input type="number" step="0.25" value={s.marking.positive} onChange={e => setSection(i, { marking: { ...s.marking, positive: +e.target.value } })} className={input} /></label>
            <label className="w-20">− marks<input type="number" step="0.25" value={s.marking.negative} onChange={e => setSection(i, { marking: { ...s.marking, negative: +e.target.value } })} className={input} /></label>
            <label className="w-24">Max attempts<input type="number" min={1} value={s.maxAttempts ?? ""} onChange={e => setSection(i, { maxAttempts: e.target.value ? +e.target.value : null })} className={input} /></label>
            <button type="button" onClick={() => set({ sections: p.sections.filter((_, j) => j !== i) })} className="p-2 text-slate-400 hover:text-red-500" title="Remove section"><Trash2 size={14} /></button>
          </div>
          <div className="flex gap-3">
            {(["MCQ", "MSQ", "NAT"] as QuestionType[]).map(t => (
              <label key={t} className="flex items-center gap-1">
                <input type="checkbox" checked={s.allowedTypes.includes(t)}
                  onChange={e => setSection(i, { allowedTypes: e.target.checked ? [...s.allowedTypes, t] : s.allowedTypes.filter(x => x !== t) })} /> {t}
              </label>
            ))}
          </div>
          {Object.entries(s.topicWeights).map(([k, n]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="flex-1 truncate">{k}</span>
              <input type="number" min={0} value={n} className={`${input} !w-24`}
                onChange={e => setSection(i, { topicWeights: { ...s.topicWeights, [k]: Math.max(0, +e.target.value || 0) } })} />
              <button type="button" className="text-slate-400 hover:text-red-500"
                onClick={() => { const w = { ...s.topicWeights }; delete w[k]; setSection(i, { topicWeights: w }); }}><Trash2 size={14} /></button>
            </div>
          ))}
          <select value="" className={input}
            onChange={e => e.target.value && setSection(i, { topicWeights: { ...s.topicWeights, [e.target.value]: 5 } })}>
            <option value="">+ add a topic or category…</option>
            {vocab.filter(v => !(v in s.topicWeights)).map(v => <option key={v}>{v}</option>)}
          </select>
          <p className="text-xs text-slate-500">{Object.values(s.topicWeights).reduce((a, b) => a + b, 0)} questions</p>
        </div>
      ))}
      <button type="button" onClick={() => set({ sections: [...p.sections, { ...blankSection(), name: `Section ${String.fromCharCode(65 + p.sections.length)}` }] })}
        className="flex items-center gap-1 text-teal-600 dark:text-teal-400"><Plus size={14} /> section</button>

      {err && <p className="text-red-500">{err}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy || !p.name || !p.group} className={small}>{busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save exam type</Button>
        <Button variant="secondary" onClick={onCancel} className={small}>Cancel</Button>
      </div>
    </div>
  );
}

export function PresetsPanel({ groups }: { groups: string[] }) {
  const [list, setList] = React.useState<ServerPreset[] | null>(null);
  const [editing, setEditing] = React.useState<ServerPreset | null>(null);
  const [log, setLog] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const append = (s: string) => setLog(l => l + s);

  const load = React.useCallback(async () => {
    const r = await adminFetch("/api/exam_presets?all=true");
    setList(r.ok ? await r.json() : []);
  }, []);
  React.useEffect(() => { load(); }, [load]);

  /** Generate enough grounded questions that every topic the preset draws from has what it needs. */
  const topUp = async (p: ServerPreset) => {
    setBusy(true);
    setLog(`Topping up the "${p.group}" bank for ${p.name} (skill ${p.skill || "auto"})…\n`);
    try {
      const { resolve } = await groupVocabulary(p.group);
      const need: Record<string, number> = {};
      for (const s of p.sections) for (const [k, n] of Object.entries(s.topicWeights)) {
        const ts = resolve(k);
        if (ts.length === 0 && n > 0) ts.push(k); // a brand-new topic: generation creates it
        for (const t of ts) need[t] = (need[t] || 0) + Math.ceil(n / ts.length) * 2; // 2x headroom for type filters + reuse
      }
      const stats: { slug: string; count: number }[] = await fetch(`${API_BASE_URL}/api/question_bank/topics`).then(r => r.json());
      const have = new Map(stats.map(s => [s.slug, s.count]));
      let added = 0;
      for (const [t, n] of Object.entries(need)) {
        const missing = Math.min(60, n - (have.get(slugify(t)) || 0));
        if (missing <= 0) { append(`✓ ${t}: enough (${have.get(slugify(t))})\n`); continue; }
        added += await generateInto(t, p.group, missing, p.skill, p.audience, append);
      }
      append(`\nDone: ${added} new questions.\n`);
    } catch (e) {
      append(`\n[stopped] ${(e as Error).message}\n`);
    } finally {
      setBusy(false);
    }
  };

  /** Sample a fixed paper from the bank with this preset and publish it as a community exam. */
  const publish = async (p: ServerPreset) => {
    const title = prompt("Title for the published exam:", `${p.name} — Mock ${new Date().toLocaleDateString("en-IN")}`);
    if (!title) return;
    setBusy(true);
    setLog(`Building "${title}" from the bank…\n`);
    try {
      const config = await generatePresetExam("CUSTOM", { sections: p.sections.map(s => ({ ...s, maxAttempts: s.maxAttempts ?? undefined })) }, p.group);
      config.name = title;
      config.settings = { ...config.settings!, timerHours: Math.floor(p.duration_minutes / 60), timerMinutes: p.duration_minutes % 60 };
      const sections = config.sections || [];
      const total = sections.reduce((a, s) => a + s.questions.length, 0);
      const wanted = p.sections.reduce((a, s) => a + Object.values(s.topicWeights).reduce((x, y) => x + y, 0), 0);
      if (total === 0) throw new Error("No questions found. Top up the bank first.");
      if (total < wanted && !confirm(`Only ${total} of ${wanted} questions are available. Publish anyway?`)) { setLog(l => l + "Cancelled.\n"); return; }
      const r = await fetch(`${API_BASE_URL}/pariksha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_title: title, exam_json_str: JSON.stringify(config),
          sections: sections.map(s => ({ name: s.name, questions: s.questions.map(q => q.id).filter(Boolean), marking: s.marking, max_attempts: s.maxAttempts ?? null })),
        }),
      });
      if (!r.ok) throw new Error(await errText(r));
      append(`Published with ${total} questions. It is now under Community exams.\n`);
    } catch (e) {
      append(`[failed] ${(e as Error).message}\n`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: ServerPreset) => {
    if (!confirm(`Delete exam type "${p.name}"? Published exams made from it stay.`)) return;
    await adminFetch(`/api/exam_presets/${p.preset_id}`, { method: "DELETE" });
    load();
  };

  if (editing) return <PresetEditor initial={editing} groups={groups} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />;
  if (!list) return <Loader2 className="animate-spin" />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Exam types are patterns students can pick on the Pariksha home screen (shown next to GATE, CSIR NET…). Each one samples a fresh
        paper from its group's bank. "Top up" fills the bank with questions grounded in the chosen KB skill; "Publish" freezes one
        paper as a community exam.
      </p>
      <Button className={small} onClick={() => setEditing({ name: "", description: "", group: groups[0] || "", skill: "", audience: "", duration_minutes: 60, published: false, sections: [blankSection()] })}>
        <Plus size={14} /> New exam type
      </Button>
      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
        {list.map(p => (
          <div key={p.preset_id} className="flex flex-wrap items-center gap-2 p-3">
            <div className="flex-1 min-w-[12rem]">
              <div className="font-medium">{p.name} {!p.published && <span className="text-xs text-amber-500">(draft)</span>}</div>
              <div className="text-xs text-slate-500">
                {p.group} · {p.sections.reduce((a, s) => a + Object.values(s.topicWeights).reduce((x, y) => x + y, 0), 0)} questions · {p.duration_minutes} min · skill {p.skill || "auto"}
              </div>
            </div>
            <button title="Top up bank (grounded generation)" disabled={busy} onClick={() => topUp(p)} className="p-2 hover:text-teal-500 disabled:opacity-40"><Sparkles size={16} /></button>
            <button title="Build & publish as community exam" disabled={busy} onClick={() => publish(p)} className="p-2 hover:text-teal-500 disabled:opacity-40"><Send size={16} /></button>
            <button title="Edit" onClick={() => setEditing(p)} className="p-2 hover:text-teal-500"><Pencil size={16} /></button>
            <button title="Delete" onClick={() => remove(p)} className="p-2 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
        {list.length === 0 && <p className="p-4 text-sm text-slate-500">No exam types yet.</p>}
      </div>
      {log && <pre className="text-xs whitespace-pre-wrap bg-slate-100 dark:bg-slate-950 rounded-lg p-3 max-h-64 overflow-auto">{log}</pre>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------
// Community exam moderation
// ---------------------------------------------------------------------------------------------------

type ExamListItem = { exam_id: string; exam_title: string; datetime_uploaded: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExamDetail = { exam_id: string; exam_title: string; exam_json_str: string; sections: { id: string; name: string; questions: any[] }[] };

function ExamModerator({ id, onBack, onDeleted }: { id: string; onBack: () => void; onDeleted: () => void }) {
  const [exam, setExam] = React.useState<ExamDetail | null>(null);
  const [title, setTitle] = React.useState("");
  const [editing, setEditing] = React.useState<{ where: "bank" | "json"; index: number; q: QDraft } | null>(null);
  const [msg, setMsg] = React.useState("");

  const load = React.useCallback(async () => {
    const r = await fetch(`${API_BASE_URL}/pariksha/${id}`);
    if (r.ok) { const e = await r.json(); setExam(e); setTitle(e.exam_title); }
  }, [id]);
  React.useEffect(() => { load(); }, [load]);

  if (!exam) return <Loader2 className="animate-spin" />;

  const bankQuestions = exam.sections.flatMap(s => s.questions);
  // Legacy exams keep questions in exam_json_str: an array, {questions}, or a full config with sections.
  const parsed = bankQuestions.length ? null : (() => { try { return robustJsonParse(exam.exam_json_str); } catch { return null; } })();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonQuestions: any[] = !parsed ? [] : Array.isArray(parsed) ? parsed : parsed.questions || (parsed.sections || []).flatMap((s: any) => s.questions || []);

  const saveJson = async (index: number, q: QDraft) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replace = (arr: any[]) => arr.map((x, i) => (i === index ? { ...x, ...toPayload(q), topic: x.topic ?? q.topic } : x));
    let next;
    if (Array.isArray(parsed)) next = replace(parsed);
    else if (parsed.questions) next = { ...parsed, questions: replace(parsed.questions) };
    else {
      let offset = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next = { ...parsed, sections: parsed.sections.map((s: any) => {
        const n = (s.questions || []).length;
        const out = index >= offset && index < offset + n ? { ...s, questions: s.questions.map((x: any, i: number) => (i === index - offset ? { ...x, ...toPayload(q) } : x)) } : s;
        offset += n;
        return out;
      }) };
    }
    const r = await adminFetch(`/pariksha/${id}`, { method: "PUT", body: JSON.stringify({ exam_json_str: JSON.stringify(next) }) });
    if (!r.ok) return errText(r);
    setEditing(null);
    load();
  };

  const saveBank = async (q: QDraft) => {
    const r = await adminFetch(`/api/question_bank/questions/${q.id}`, { method: "PUT", body: JSON.stringify(toPayload(q)) });
    if (!r.ok) return errText(r);
    setEditing(null);
    load();
  };

  const rename = async () => {
    const r = await adminFetch(`/pariksha/${id}`, { method: "PUT", body: JSON.stringify({ exam_title: title }) });
    setMsg(r.ok ? "Renamed." : await errText(r));
  };
  const remove = async () => {
    if (!confirm(`Delete "${exam.exam_title}" for everyone?`)) return;
    const r = await adminFetch(`/pariksha/${id}`, { method: "DELETE" });
    if (r.ok) onDeleted(); else setMsg(await errText(r));
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-500">{editing.where === "bank" ? "Editing the bank question: every exam that uses it gets the fix." : "Editing this exam's stored copy."}</p>
        <QuestionForm initial={editing.q} onCancel={() => setEditing(null)}
          onSave={q => (editing.where === "bank" ? saveBank(q) : saveJson(editing.index, q)).then(e => e || undefined)} />
      </div>
    );
  }

  const qs = bankQuestions.length ? bankQuestions : jsonQuestions;
  return (
    <div className="space-y-3 text-sm">
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-teal-500"><ChevronLeft size={16} /> All exams</button>
      <div className="flex flex-wrap gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} className={`${input} flex-1 min-w-[12rem]`} />
        <Button className={small} onClick={rename} disabled={!title.trim() || title === exam.exam_title}><Save size={14} /> Rename</Button>
        <Button variant="danger" className={small} onClick={remove}><Trash2 size={14} /> Delete exam</Button>
      </div>
      {msg && <p>{msg}</p>}
      <p className="text-slate-500">{qs.length} questions · {bankQuestions.length ? "from the question bank" : "stored in the exam"}</p>
      {qs.length === 0 && !bankQuestions.length && <p className="text-amber-500">Couldn't read questions from this exam's JSON.</p>}
      {qs.map((q, i) => (
        <div key={q.id || i} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>#{i + 1} · {(q.type || "MCQ").toUpperCase()} · {q.topic}</span>
            <button className="flex items-center gap-1 hover:text-teal-500"
              onClick={() => setEditing({ where: bankQuestions.length ? "bank" : "json", index: i, q: toDraft(q) })}><Pencil size={12} /> edit</button>
          </div>
          <Latex>{q.question}</Latex>
        </div>
      ))}
    </div>
  );
}

export function CommunityPanel() {
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<ExamListItem[] | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setItems(null);
    const r = await fetch(`${API_BASE_URL}/pariksha?page=${page}`);
    setItems(r.ok ? await r.json() : []);
  }, [page]);
  React.useEffect(() => { load(); }, [load]);

  if (open) return <ExamModerator id={open} onBack={() => setOpen(null)} onDeleted={() => { setOpen(null); load(); }} />;
  if (!items) return <Loader2 className="animate-spin" />;
  return (
    <div className="space-y-3 text-sm">
      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
        {items.map(e => (
          <button key={e.exam_id} onClick={() => setOpen(e.exam_id)} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-900">
            <div className="font-medium">{e.exam_title}</div>
            <div className="text-xs text-slate-500">{new Date(/Z|[+-]\d\d:?\d\d$/.test(e.datetime_uploaded) ? e.datetime_uploaded : e.datetime_uploaded + "Z").toLocaleString("en-IN")}</div>
          </button>
        ))}
        {items.length === 0 && <p className="p-4 text-slate-500">No exams on this page.</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" className={small} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span>Page {page}</span>
        <Button variant="secondary" className={small} disabled={items.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
