"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Form = { id: string; title: string; description?: string };

export default function FormsIndex() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/forms", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 401) { setErr("You must log in at /login."); setForms([]); return; }
      if (!res.ok) throw new Error(`Failed to load forms (${res.status})`);
      setForms(await res.json());
    } catch (e: any) { setErr(e.message || "Failed to load forms"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Forms</h1>
        <div className="flex gap-2">
          <Link href="/forms/new" className="px-3 py-2 rounded bg-black text-white">+ Create Form</Link>
          <button onClick={load} className="px-3 py-2 rounded border">Refresh</button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">{err}</p>}
      {!loading && !err && forms.length === 0 && <p className="text-gray-600">No forms yet.</p>}

      <ul className="space-y-3">
        {forms.map(f => (
          <li key={f.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{f.title}</div>
              {f.description && <div className="text-sm text-gray-600">{f.description}</div>}
            </div>
            <div className="flex gap-2">
              {/* Option B routing */}
              <Link className="px-3 py-1 border rounded" href={`/analytics/${f.id}`}>Analytics</Link>
              <Link className="px-3 py-1 border rounded" href={`/forms/${f.id}/edit`}>Edit</Link>
              <Link className="px-3 py-1 border rounded" href={`/share/${f.id}`} target="_blank">Open</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
