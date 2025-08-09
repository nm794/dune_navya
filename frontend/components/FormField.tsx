'use client'

import { useState } from 'react'
import { Field } from '../types/form'
import { Plus, X, Star } from 'lucide-react'

interface FormFieldProps {
  field: Field
  onUpdate: (field: Field) => void
  preview?: boolean
}

export default function FormField({ field, onUpdate, preview = false }: FormFieldProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const updateField = (updates: Partial<Field>) => {
    onUpdate({ ...field, ...updates })
  }

  const addOption = () => {
    if (field.options) {
      const newOptionNumber = field.options.length + 1
      updateField({
        options: [...field.options, `Option ${newOptionNumber}`],
      })
    }
  }

  const removeOption = (index: number) => {
    if (field.options && field.options.length > 1) {
      updateField({
        options: field.options.filter((_, i) => i !== index),
      })
    }
  }

  const updateOption = (index: number, value: string) => {
    if (field.options) {
      const newOptions = [...field.options]
      newOptions[index] = value
      updateField({ options: newOptions })
    }
  }

  if (preview) {
    return <FormFieldPreview field={field} />
  }

  return (
    <div className="space-y-4">
      {/* Field Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            {field.type.replace('_', ' ')}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-6">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Label
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField({ label: e.target.value })}
              className="input-field"
              placeholder="Enter field label..."
            />
          </div>

          {/* Placeholder */}
          {['text', 'textarea', 'email', 'number'].includes(field.type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder Text
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField({ placeholder: e.target.value })}
                className="input-field"
                placeholder="Enter placeholder text..."
              />
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`required-${field.id}`}
              checked={field.required}
              onChange={(e) => updateField({ required: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor={`required-${field.id}`} className="text-sm text-gray-700">
              This field is required
            </label>
          </div>

          {/* Number Field Specific Options */}
          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Value
                </label>
                <input
                  type="number"
                  value={field.minValue || ''}
                  onChange={(e) => updateField({ 
                    minValue: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="input-field"
                  placeholder="No minimum"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Value
                </label>
                <input
                  type="number"
                  value={field.maxValue || ''}
                  onChange={(e) => updateField({ 
                    maxValue: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="input-field"
                  placeholder="No maximum"
                />
              </div>
            </div>
          )}

          {/* Multiple Choice and Checkbox Options */}
          {(field.type === 'multiple_choice' || field.type === 'checkbox') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                <button
                  onClick={addOption}
                  className="btn-secondary flex items-center space-x-1 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Option</span>
                </button>
              </div>
              
              <div className="space-y-2">
                {field.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="input-field flex-1"
                      placeholder={`Option ${index + 1}`}
                    />
                    {field.options && field.options.length > 1 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
            <FormFieldPreview field={field} />
          </div>
        </div>
      )}
    </div>
  )
}

// Preview component for rendering the actual field
function FormFieldPreview({ field }: { field: Field }) {
  const [value, setValue] = useState<any>('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.placeholder}
            className="input-field"
            disabled
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.placeholder}
            className="input-field"
            rows={3}
            disabled
          />
        )

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.placeholder}
            className="input-field"
            disabled
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={field.minValue}
            max={field.maxValue}
            placeholder={field.placeholder}
            className="input-field"
            disabled
          />
        )

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => setValue(e.target.value)}
                  className="text-primary-600 focus:ring-primary-500"
                  disabled
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedOptions.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOptions([...selectedOptions, option])
                    } else {
                      setSelectedOptions(selectedOptions.filter(o => o !== option))
                    }
                  }}
                  className="text-primary-600 focus:ring-primary-500"
                  disabled
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'rating':
        return (
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setValue(star)}
                className={`p-1 ${
                  value >= star ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
                disabled
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
        )

      default:
        return <div className="text-gray-500">Unknown field type</div>
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
    </div>
  )
} 