'use client';

import FormBuilder from '@/components/FormBuilder';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// ✅ use the shared app types (do NOT re-declare)
import type { Field, FieldType, Form as FormType } from '@/types/form';

export default function EditFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<FormType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/forms/${formId}`);
        if (res.status === 404) {
          notFound();
          return;
        }
        if (!res.ok) throw new Error(`Failed to load form (${res.status})`);

        const data = await res.json();

        // ✅ normalize backend JSON into our strict Form type
        const normalized: FormType = {
          id: String(data.id),
          title: String(data.title ?? ''),
          description: data.description ?? '',
          fields: (data.fields ?? []).map((f: any): Field => ({
            id: String(f.id),
            // coerce to our enum type; fallback to 'text' if missing
            type: (f.type as FieldType) ?? 'text',
            label: String(f.label ?? ''),
            required: Boolean(f.required),
            placeholder: f.placeholder ?? '',
            options: (f.options ?? []) as string[],
            minValue: f.minValue ?? undefined,
            maxValue: f.maxValue ?? undefined,
            order: Number(f.order ?? 0),
          })),
        };

        setForm(normalized);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load form');
      } finally {
        setLoading(false);
      }
    })();
  }, [formId]);

  if (loading) return <main className="p-6">Loading…</main>;
  if (error)   return <main className="p-6 text-red-600">{error}</main>;
  if (!form)   return null;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Edit Form</h1>
      <FormBuilder
        initialForm={{
          id: form.id,
          title: form.title,
          description: form.description ?? '', // ensure string
          fields: form.fields,
        }}
      />
    </main>
  );
}
