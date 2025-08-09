'use client';

import { Copy, Eye, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormState } from '../hooks/useFormState';
import { Field } from '../types/form';
import FieldSidebar from './FieldSidebar';
import FormField from './FormField';

interface FormBuilderProps {
  initialForm?: {
    id?: string;
    title: string;
    description?: string;  // <- make optional to avoid TS error
    fields: Field[];
  };
  onSave?: (form: any) => void;
}

export default function FormBuilder({ initialForm, onSave }: FormBuilderProps) {
  const router = useRouter();

  const {
    form,
    updateForm,
    addField,
    updateField,
    removeField,
    reorderFields,
    saveDraft,
    loadDraft,
  } = useFormState({
    initialForm: {
      id: initialForm?.id,
      title: initialForm?.title ?? '',
      description: initialForm?.description ?? '',
      fields: initialForm?.fields ?? [],
    },
  });

  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const dragRef = useRef<HTMLDivElement>(null);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(form);
    }, 30000);
    return () => clearInterval(interval);
  }, [form, saveDraft]);

  // Load draft on mount for "new" forms only
  useEffect(() => {
    const draft = loadDraft();
    if (draft && !initialForm?.id) {
      updateForm(draft);
    }
  }, [initialForm?.id, loadDraft, updateForm]);

  const handleDragStart = useCallback((e: React.DragEvent, fieldId: string) => {
    setIsDragging(true);
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    if (draggedFieldId !== fieldId) {
      setDragOverFieldId(fieldId);
    }
  }, [draggedFieldId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFieldId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');

    if (draggedId && draggedId !== targetFieldId) {
      const draggedIndex = form.fields.findIndex(f => f.id === draggedId);
      const targetIndex = form.fields.findIndex(f => f.id === targetFieldId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        reorderFields(draggedIndex, targetIndex);
      }
    }

    setIsDragging(false);
    setDraggedFieldId(null);
    setDragOverFieldId(null);
  }, [form.fields, reorderFields]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('Please enter a form title');
      return;
    }
    if (form.fields.length === 0) {
      alert('Please add at least one field to your form');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = Boolean(initialForm?.id);
      const endpoint = isEdit ? `/api/forms/${initialForm!.id}` : '/api/forms';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description ?? '',
          fields: form.fields,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to save form (${response.status}) ${text}`);
      }

      const savedForm = await response.json();
      onSave?.(savedForm);

      // Clear draft after successful save (only for new forms)
      if (!isEdit) localStorage.removeItem('formDraft');

      alert('Form saved successfully!');

      // Optionally redirect to analytics after save
      if (savedForm?.id) {
        router.push(`/analytics/${savedForm.id}`);
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Failed to save form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyShareableLink = () => {
    const id = initialForm?.id;
    if (!id) return;
    const link = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(link);
    alert('Shareable link copied to clipboard!');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <FieldSidebar onAddField={addField} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Enter form title..."
                value={form.title}
                onChange={(e) => updateForm({ ...form, title: e.target.value })}
                className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>{showPreview ? 'Edit' : 'Preview'}</span>
              </button>

              {initialForm?.id && (
                <button
                  onClick={copyShareableLink}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Form'}</span>
              </button>
            </div>
          </div>

          <textarea
            placeholder="Enter form description (optional)…"
            value={form.description ?? ''}
            onChange={(e) => updateForm({ ...form, description: e.target.value })}
            className="mt-3 w-full text-gray-600 bg-transparent border-none outline-none focus:ring-0 resize-none"
            rows={2}
          />
        </header>

        {/* Form Builder Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {form.fields.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No fields yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Add fields from the sidebar to start building your form
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.fields.map((field, index) => (
                  <div
                    key={field.id}
                    ref={dragRef}
                    draggable
                    onDragStart={(e) => handleDragStart(e, field.id)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, field.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, field.id)}
                    className={`form-field ${
                      isDragging && draggedFieldId === field.id ? 'dragging' : ''
                    } ${dragOverFieldId === field.id ? 'drag-over' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        <span className="text-sm font-medium text-gray-700">
                          Field {index + 1}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => removeField(field.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <FormField
                      field={field}
                      onUpdate={(updatedField) => updateField(field.id, updatedField)}
                      preview={showPreview}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
