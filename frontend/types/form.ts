export type FieldType = 
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'multiple_choice'
  | 'checkbox'
  | 'rating'

export interface Field {
  id: string
  type: FieldType
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
  minValue?: number
  maxValue?: number
  order: number
}

export interface Form {
  id?: string
  title: string
  description: string
  fields: Field[]
  shareableLink?: string
  createdAt?: string
  updatedAt?: string
}

export interface FormResponse {
  id?: string
  formId: string
  responses: Record<string, any>
  submittedAt?: string
}

export interface FieldStats {
  fieldId: string
  fieldLabel: string
  fieldType: FieldType
  responseCount: number
  averageRating?: number
  optionCounts?: Record<string, number>
  textResponses?: string[]
}

export interface Analytics {
  formId: string
  totalResponses: number
  fieldAnalytics: Record<string, FieldStats>
  lastUpdated: string
}

export interface CreateFormRequest {
  title: string
  description: string
  fields: Field[]
}

export interface UpdateFormRequest {
  title: string
  description: string
  fields: Field[]
}

export interface SubmitResponseRequest {
  formId: string
  responses: Record<string, any>
} 