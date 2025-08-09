'use client'

import { useState } from 'react'
import { 
  Type, 
  MessageSquare, 
  Mail, 
  Hash, 
  List, 
  CheckSquare, 
  Star,
  Plus 
} from 'lucide-react'

interface FieldSidebarProps {
  onAddField: (fieldType: string) => void
}

const fieldTypes = [
  {
    type: 'text',
    label: 'Short Text',
    icon: Type,
    description: 'Single line text input',
  },
  {
    type: 'textarea',
    label: 'Long Text',
    icon: MessageSquare,
    description: 'Multi-line text area',
  },
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    description: 'Email address input',
  },
  {
    type: 'number',
    label: 'Number',
    icon: Hash,
    description: 'Numeric input',
  },
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    icon: List,
    description: 'Single selection from options',
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    icon: CheckSquare,
    description: 'Multiple selections allowed',
  },
  {
    type: 'rating',
    label: 'Rating',
    icon: Star,
    description: '1-5 star rating',
  },
]

export default function FieldSidebar({ onAddField }: FieldSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Form Fields</h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Plus 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-45' : ''}`} 
            />
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Drag fields to add them to your form
        </p>
      </div>

      {/* Field Types */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {fieldTypes.map((fieldType) => {
              const Icon = fieldType.icon
              return (
                <div
                  key={fieldType.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('fieldType', fieldType.type)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onAddField(fieldType.type)}
                  className="group cursor-pointer p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary-100 transition-colors">
                      <Icon className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-primary-900">
                        {fieldType.label}
                      </h3>
                      <p className="text-sm text-gray-600 group-hover:text-primary-700">
                        {fieldType.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Quick Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click any field to add it to your form</li>
              <li>• Drag fields to reorder them</li>
              <li>• Use the preview mode to test your form</li>
              <li>• Save regularly to avoid losing your work</li>
            </ul>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Form Builder v1.0
          </p>
        </div>
      </div>
    </div>
  )
} 