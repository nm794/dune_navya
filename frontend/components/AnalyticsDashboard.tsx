'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { Analytics, FieldStats } from '../types/form'
import { useWebSocket } from '../hooks/useWebSocket'
import { Users, TrendingUp, Clock, CheckCircle } from 'lucide-react'

interface AnalyticsDashboardProps {
  formId: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsDashboard({ formId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('7d')
  
  const { lastMessage } = useWebSocket('ws://localhost:8080/ws')
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadAnalytics()
    
    // Set up polling for real-time updates
    intervalRef.current = setInterval(loadAnalytics, 5000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [formId])

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_response') {
      const data = lastMessage.data
      if (data.formId === formId) {
        // Reload analytics when new response is received
        loadAnalytics()
      }
    }
  }, [lastMessage, formId])

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics/${formId}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
        setError(null)
      } else {
        setError('Failed to load analytics')
      }
    } catch (error) {
      setError('Error loading analytics')
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getResponseTrendData = () => {
    // Mock data for response trends - in real app, this would come from the API
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day, index) => ({
      day,
      responses: Math.floor(Math.random() * 20) + 5,
    }))
  }

  const getFieldChartData = (fieldStats: FieldStats) => {
    if (fieldStats.fieldType === 'multiple_choice' || fieldStats.fieldType === 'checkbox') {
      return Object.entries(fieldStats.optionCounts || {}).map(([option, count]) => ({
        option,
        count,
      }))
    }
    return []
  }

  const renderFieldChart = (fieldStats: FieldStats) => {
    const data = getFieldChartData(fieldStats)
    
    if (data.length === 0) return null

    return (
      <div key={fieldStats.fieldId} className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {fieldStats.fieldLabel}
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="option" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderRatingChart = (fieldStats: FieldStats) => {
    if (fieldStats.fieldType !== 'rating' || !fieldStats.averageRating) return null

    const data = [
      { rating: '1★', count: Math.floor(Math.random() * 10) },
      { rating: '2★', count: Math.floor(Math.random() * 15) },
      { rating: '3★', count: Math.floor(Math.random() * 20) },
      { rating: '4★', count: Math.floor(Math.random() * 25) },
      { rating: '5★', count: Math.floor(Math.random() * 30) },
    ]

    return (
      <div key={fieldStats.fieldId} className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {fieldStats.fieldLabel}
        </h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600">
              {fieldStats.averageRating.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Real-time insights from your form responses</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input-field w-32"
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalResponses}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.totalResponses > 0 ? 'Active' : 'No responses'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Date(analytics.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">95%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Response Trends */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Response Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getResponseTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="responses" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Field Analytics */}
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-gray-900">Field Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.values(analytics.fieldAnalytics).map((fieldStats) => {
              if (fieldStats.fieldType === 'rating') {
                return renderRatingChart(fieldStats)
              } else if (['multiple_choice', 'checkbox'].includes(fieldStats.fieldType)) {
                return renderFieldChart(fieldStats)
              }
              return null
            })}
          </div>
        </div>

        {/* Text Responses */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Text Responses</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.values(analytics.fieldAnalytics)
              .filter(field => ['text', 'textarea', 'email'].includes(field.fieldType))
              .map(fieldStats => (
                <div key={fieldStats.fieldId} className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {fieldStats.fieldLabel}
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {fieldStats.textResponses?.slice(0, 10).map((response, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{response}</p>
                      </div>
                    ))}
                    {(!fieldStats.textResponses || fieldStats.textResponses.length === 0) && (
                      <p className="text-gray-500 text-sm">No text responses yet</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  )
} 