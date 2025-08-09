'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// align with your shared types if you have them
type Field = {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'multiple_choice' | 'checkbox' | 'rating';
  label: string;
  required?: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
};
type Form = { id: string; title: string; description?: string; fields: Field[] };

const WORDS_ONLY = /^[A-Za-z\s]+$/;               // letters + spaces
const EMAIL_TLD   = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/; // simple TLD check

export default function ShareFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/forms/${formId}`);
        if (!r.ok) throw new Error(`Failed to load form (${r.status})`);
        setForm(await r.json());
      } catch (e: any) { setErr(e.message); }
    })();
  }, [formId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;

    const fd = new FormData(e.currentTarget);

    // client-side validation
    for (const f of form.fields) {
      const raw = fd.getAll(f.id);
      const v = raw.length > 1 ? raw.join(',') : (raw[0] ?? '').toString().trim();

      if (f.required && !v) {
        alert(`"${f.label}" is required`);
        return;
      }

      if (v) {
        if (f.type === 'textarea' && !WORDS_ONLY.test(v)) {
          alert(`"${f.label}" must contain only letters and spaces`);
          return;
        }
        if (f.type === 'email') {
          // Use both native browser check and pattern fallback
          if (!EMAIL_TLD.test(v)) {
            alert(`"${f.label}" must be a valid email (e.g. name@example.com)`);
            return;
          }
        }
        if (f.type === 'number' || f.type === 'rating') {
          const num = Number(v);
          if (Number.isNaN(num)) {
            alert(`"${f.label}" must be a number`);
            return;
          }
          if (typeof f.minValue === 'number' && num < f.minValue) {
            alert(`"${f.label}" must be ≥ ${f.minValue}`);
            return;
          }
          if (typeof f.maxValue === 'number' && num > f.maxValue) {
            alert(`"${f.label}" must be ≤ ${f.maxValue}`);
            return;
          }
        }
      }
    }

    // Build responses object expected by backend
    const responses: Record<string, string> = {};
    for (const f of form.fields) {
      const raw = fd.getAll(f.id);
      responses[f.id] = raw.length > 1 ? raw.join(',') : (raw[0] ?? '').toString();
    }

    const res = await fetch(`/api/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: form.id, responses }),
    });

    if (!res.ok) {
      const text = await res.text();
      alert(`Submit failed: ${res.status} ${text}`);
      return;
    }
    alert('Thanks! Your response was recorded.');
    (e.target as HTMLFormElement).reset();
  }

  if (err) return <main className="p-6 text-red-600">{err}</main>;
  if (!form) return <main className="p-6">Loading…</main>;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{form.title}</h1>
        {form.description && <p className="text-gray-600 mt-2">{form.description}</p>}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {form.fields.map((f) => {
          switch (f.type) {
            case 'text':
              return (
                <div key={f.id}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <input
                    name={f.id}
                    className="w-full border rounded p-2"
                    required={!!f.required}
                  />
                </div>
              );

            case 'textarea':
              return (
                <div key={f.id}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  {/* pattern isn’t enforced on textarea, so we validate in JS above */}
                  <textarea
                    name={f.id}
                    className="w-full border rounded p-2"
                    rows={4}
                    required={!!f.required}
                    placeholder="Letters and spaces only"
                  />
                </div>
              );

            case 'email':
              return (
                <div key={f.id}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <input
                    type="email"
                    name={f.id}
                    className="w-full border rounded p-2"
                    required={!!f.required}
                    // extra pattern for stricter TLDs
                    pattern="^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$"
                    placeholder="name@example.com"
                  />
                </div>
              );

            case 'number':
              return (
                <div key={f.id}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <input
                    type="number"
                    name={f.id}
                    className="w-full border rounded p-2"
                    required={!!f.required}
                    inputMode="numeric"
                    step="any"
                    {...(typeof f.minValue === 'number' ? { min: f.minValue } : {})}
                    {...(typeof f.maxValue === 'number' ? { max: f.maxValue } : {})}
                  />
                </div>
              );

            case 'rating':
              return (
                <div key={f.id}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <input
                    type="number"
                    name={f.id}
                    className="w-24 border rounded p-2"
                    required={!!f.required}
                    min={1}
                    max={5}
                  />
                </div>
              );

            case 'multiple_choice':
              return (
                <div key={f.id}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <select name={f.id} className="w-full border rounded p-2" required={!!f.required}>
                    {(f.options ?? []).map((o, i) => (
                      <option key={i} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              );

            case 'checkbox':
              return (
                <div key={f.id}>
                  <span className="block text-sm font-medium mb-1">{f.label}</span>
                  <div className="flex gap-4 flex-wrap">
                    {(f.options ?? []).map((o, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={f.id} value={o} /> {o}
                      </label>
                    ))}
                  </div>
                </div>
              );

            default:
              return (
                <div key={f.id} className="text-gray-500">
                  Unsupported: {f.type}
                </div>
              );
          }
        })}

        <button className="px-4 py-2 rounded bg-black text-white">Submit</button>
      </form>
    </main>
  );
}
