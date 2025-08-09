import { useCallback, useState } from 'react'
import { Field, Form } from '../types/form'

interface UseFormStateProps {
  initialForm?: {
    id?: string
    title: string
    description: string
    fields: Field[]
  }
}

export function useFormState({ initialForm }: UseFormStateProps = {}) {
  const [form, setForm] = useState<Form>({
    title: initialForm?.title || '',
    description: initialForm?.description || '',
    fields: initialForm?.fields || [],
  })

  // Update entire form
  const updateForm = useCallback((newForm: Form) => {
    setForm(newForm)
  }, [])

  // Add a new field
  const addField = useCallback((fieldType: string) => {
    const newField: Field = {
      id: generateId(),
      type: fieldType as any,
      label: `New ${fieldType.replace('_', ' ')} field`,
      required: false,
      order: form.fields.length,
      options:
        fieldType === 'multiple_choice' || fieldType === 'checkbox'
          ? ['Option 1']
          : undefined,
    }

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }))
  }, [form.fields.length])

  // Update a specific field
  const updateField = useCallback((fieldId: string, updatedField: Partial<Field>) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updatedField } : field
      ),
    }))
  }, [])

  // Remove a field
  const removeField = useCallback((fieldId: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId),
    }))
  }, [])

  // Reorder fields
  const reorderFields = useCallback((fromIndex: number, toIndex: number) => {
    setForm(prev => {
      const newFields = [...prev.fields]
      const [movedField] = newFields.splice(fromIndex, 1)
      newFields.splice(toIndex, 0, movedField)

      // Update order property
      newFields.forEach((field, index) => {
        field.order = index
      })

      return {
        ...prev,
        fields: newFields,
      }
    })
  }, [])

  // Add option to multiple choice or checkbox field
  const addOption = useCallback((fieldId: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field => {
        if (field.id === fieldId && field.options) {
          const optionNumber = field.options.length + 1
          return {
            ...field,
            options: [...field.options, `Option ${optionNumber}`],
          }
        }
        return field
      }),
    }))
  }, [])

  // Remove option from multiple choice or checkbox field
  const removeOption = useCallback((fieldId: string, optionIndex: number) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field => {
        if (field.id === fieldId && field.options) {
          return {
            ...field,
            options: field.options.filter((_, index) => index !== optionIndex),
          }
        }
        return field
      }),
    }))
  }, [])

  // Update option text
  const updateOption = useCallback((fieldId: string, optionIndex: number, newText: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field => {
        if (field.id === fieldId && field.options) {
          const newOptions = [...field.options]
          newOptions[optionIndex] = newText
          return {
            ...field,
            options: newOptions,
          }
        }
        return field
      }),
    }))
  }, [])

  // Save draft to localStorage
  const saveDraft = useCallback((currentForm: Form) => {
    try {
      localStorage.setItem('formDraft', JSON.stringify(currentForm))
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }, [])

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem('formDraft')
      return draft ? JSON.parse(draft) : null
    } catch (error) {
      console.error('Failed to load draft:', error)
      return null
    }
  }, [])

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem('formDraft')
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [])

  // Validate form
  const validateForm = useCallback(() => {
    const errors: string[] = []

    if (!form.title.trim()) {
      errors.push('Form title is required')
    }

    if (form.fields.length === 0) {
      errors.push('At least one field is required')
    }

    form.fields.forEach((field, index) => {
      if (!field.label.trim()) {
        errors.push(`Field ${index + 1} must have a label`)
      }

      if (
        (field.type === 'multiple_choice' || field.type === 'checkbox') &&
        (!field.options || field.options.length === 0)
      ) {
        errors.push(`Field "${field.label}" must have at least one option`)
      }

      if (field.type === 'number') {
        if (
          field.minValue !== undefined &&
          field.maxValue !== undefined &&
          field.minValue > field.maxValue
        ) {
          errors.push(
            `Field "${field.label}" minimum value cannot be greater than maximum value`
          )
        }
      }
    })

    return errors
  }, [form])

  // Generate unique ID
  const generateId = () => {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  return {
    form,
    updateForm,
    addField,
    updateField,
    removeField,
    reorderFields,
    addOption,
    removeOption,
    updateOption,
    saveDraft,
    loadDraft,
    clearDraft,
    validateForm,
  }
}
