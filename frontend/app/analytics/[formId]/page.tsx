'use client'

import { useParams } from 'next/navigation'
import AnalyticsDashboard from '../../../components/AnalyticsDashboard'

export default function AnalyticsPage() {
  const params = useParams()
  const formId = params.formId as string

  return <AnalyticsDashboard formId={formId} />
} 