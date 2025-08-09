"use client";
import FormBuilder from "@/components/FormBuilder"; // adjust if your component path differs

export default function NewFormPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create New Form</h1>
      <FormBuilder />
    </main>
  );
}
