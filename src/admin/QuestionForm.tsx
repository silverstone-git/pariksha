// Edit or add one question with a live LaTeX preview. Used for bank questions (PUT/POST to outsie)
// and for questions stored inside legacy community exams (onSave just returns the object).
import React from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "../components/Button";
import { Latex } from "../components/Latex";

export type QDraft = {
  id?: string;
  type: "MCQ" | "MSQ" | "NAT";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: { label: number; value: string }[] | null;
  answer_label: number | null;
  answer_labels: number[] | null;
  answer_value: string | null;
  answer_range: { min: number; max: number } | null;
  explanation: string;
  image_path?: string | null;
  topic?: string;
};

export const emptyQuestion = (): QDraft => ({
  type: "MCQ", difficulty: "medium", question: "", explanation: "",
  options: [1, 2, 3, 4].map(label => ({ label, value: "" })), answer_label: 1, answer_labels: null,
  answer_value: null, answer_range: null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toDraft = (q: any): QDraft => ({
  id: q.id, type: (q.type || "MCQ").toUpperCase(), difficulty: q.difficulty || "medium", question: q.question || "",
  options: q.options ?? null, answer_label: q.answer_label ?? null, answer_labels: q.answer_labels ?? null,
  answer_value: q.answer_value ?? null, answer_range: q.answer_range ?? null, explanation: q.explanation || "",
  image_path: q.image_path ?? null, topic: q.topic,
});

/** Body for outsie's QuestionCreate: only the fields that matter for the type. */
export const toPayload = (d: QDraft) => ({
  type: d.type, difficulty: d.difficulty, question: d.question, explanation: d.explanation,
  image_path: d.image_path || null,
  options: d.type === "NAT" ? null : d.options,
  answer_label: d.type === "MCQ" ? d.answer_label : null,
  answer_labels: d.type === "MSQ" ? d.answer_labels : null,
  answer_value: d.type === "NAT" ? (d.answer_value || null) : null,
  answer_range: d.type === "NAT" && !d.answer_value ? d.answer_range : null,
});

const input = "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono";
const letter = (l: number) => String.fromCharCode(64 + l);

export function QuestionForm({ initial, onSave, onCancel, saveLabel = "Save" }: {
  initial: QDraft;
  onSave: (d: QDraft) => Promise<string | void>; // resolves to an error message, or nothing on success
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [d, setD] = React.useState<QDraft>(initial);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const set = (patch: Partial<QDraft>) => setD(prev => ({ ...prev, ...patch }));
  const opts = d.options ?? [];

  const setType = (type: QDraft["type"]) => {
    const options = type === "NAT" ? d.options : (d.options?.length ? d.options : emptyQuestion().options);
    set({ type, options, answer_label: type === "MCQ" ? (d.answer_label ?? 1) : d.answer_label,
          answer_labels: type === "MSQ" ? (d.answer_labels ?? []) : d.answer_labels });
  };

  const save = async () => {
    setBusy(true);
    setErr("");
    const e = await onSave(d).catch((x: Error) => x.message);
    if (e) setErr(e);
    setBusy(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 text-sm">
        <div className="flex gap-2">
          {(["MCQ", "MSQ", "NAT"] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-3 py-1 rounded-lg border ${d.type === t ? "border-teal-500 text-teal-600 dark:text-teal-400" : "border-slate-300 dark:border-slate-700"}`}>{t}</button>
          ))}
          <select value={d.difficulty} onChange={e => set({ difficulty: e.target.value as QDraft["difficulty"] })} className="ml-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2">
            <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
          </select>
        </div>
        <label className="block">Question (LaTeX in $…$)
          <textarea rows={5} value={d.question} onChange={e => set({ question: e.target.value })} className={input} />
        </label>
        {d.type !== "NAT" ? (
          <div className="space-y-2">
            {opts.map((o, i) => (
              <div key={o.label} className="flex items-center gap-2">
                <input type={d.type === "MCQ" ? "radio" : "checkbox"} name="answer" title="Correct answer"
                  checked={d.type === "MCQ" ? d.answer_label === o.label : !!d.answer_labels?.includes(o.label)}
                  onChange={e => d.type === "MCQ" ? set({ answer_label: o.label })
                    : set({ answer_labels: e.target.checked ? [...(d.answer_labels ?? []), o.label].sort() : (d.answer_labels ?? []).filter(l => l !== o.label) })} />
                <span className="w-4">{letter(o.label)}</span>
                <input value={o.value} onChange={e => set({ options: opts.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} className={input} />
                <button type="button" onClick={() => set({ options: opts.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => set({ options: [...opts, { label: Math.max(0, ...opts.map(o => o.label)) + 1, value: "" }] })}
              className="flex items-center gap-1 text-teal-600 dark:text-teal-400"><Plus size={14} /> option</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <label>Exact value<input value={d.answer_value ?? ""} onChange={e => set({ answer_value: e.target.value })} className={input} /></label>
            <label>or min<input type="number" value={d.answer_range?.min ?? ""} onChange={e => set({ answer_range: { min: +e.target.value, max: d.answer_range?.max ?? +e.target.value } })} className={input} /></label>
            <label>max<input type="number" value={d.answer_range?.max ?? ""} onChange={e => set({ answer_range: { min: d.answer_range?.min ?? +e.target.value, max: +e.target.value } })} className={input} /></label>
          </div>
        )}
        <label className="block">Explanation
          <textarea rows={4} value={d.explanation} onChange={e => set({ explanation: e.target.value })} className={input} />
        </label>
        {err && <p className="text-red-500">{err}</p>}
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy} className="!px-4 !py-2 text-sm">{busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {saveLabel}</Button>
          <Button variant="secondary" onClick={onCancel} className="!px-4 !py-2 text-sm">Cancel</Button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm space-y-2 bg-slate-50 dark:bg-slate-950">
        <div className="text-xs uppercase tracking-wider text-slate-500">Preview</div>
        <Latex>{d.question || "…"}</Latex>
        {d.type !== "NAT" && (
          <ol className="list-[upper-alpha] ml-5">{opts.map(o => <li key={o.label}><Latex>{o.value || "…"}</Latex></li>)}</ol>
        )}
        <div className="text-teal-600 dark:text-teal-400">
          Answer: {d.type === "MCQ" ? letter(d.answer_label ?? 0) : d.type === "MSQ" ? (d.answer_labels ?? []).map(letter).join(", ")
            : d.answer_value || (d.answer_range ? `${d.answer_range.min} – ${d.answer_range.max}` : "?")}
        </div>
        <Latex>{d.explanation || ""}</Latex>
      </div>
    </div>
  );
}
