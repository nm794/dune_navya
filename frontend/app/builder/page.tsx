'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FormBuilder from '../../components/FormBuilder'
import { Form } from '../../types/form'

export default function BuilderPage() {
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we're editing an existing form
    const urlParams = new URLSearchParams(window.location.search)
    const formId = urlParams.get('id')
    
    if (formId) {
      loadForm(formId)
    } else {
      setLoading(false)
    }
  }, [])

  const loadForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}`)
      if (response.ok) {
        const formData = await response.json()
        setForm(formData)
      } else {
        console.error('Failed to load form')
      }
    } catch (error) {
      console.error('Error loading form:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (savedForm: Form) => {
    setForm(savedForm)
    // Optionally redirect to analytics or show success message
    router.push(`/analytics/${savedForm.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  return (
    <FormBuilder
      initialForm={form || undefined}
      onSave={handleSave}
    />
  )
} 