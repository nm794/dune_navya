'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, BarChart3, Settings, Users } from 'lucide-react'

export default function HomePage() {
  const [recentForms, setRecentForms] = useState([
    {
      id: '1',
      title: 'Customer Feedback Survey',
      responses: 24,
      lastResponse: '2 hours ago',
    },
    {
      id: '2',
      title: 'Employee Satisfaction',
      responses: 156,
      lastResponse: '1 day ago',
    },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Custom Form Builder
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/forms/new"
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Form</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Build Dynamic Forms with Live Analytics
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create customizable forms, collect responses, and view real-time analytics 
            to understand your audience better.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            href="/forms/new"
            className="card hover:shadow-md transition-shadow duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Create New Form
                </h3>
                <p className="text-gray-600">
                  Build a custom form with drag-and-drop fields
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/forms"
            className="card hover:shadow-md transition-shadow duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  View Analytics
                </h3>
                <p className="text-gray-600">
                  See real-time insights from your forms
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/forms"
            className="card hover:shadow-md transition-shadow duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Forms
                </h3>
                <p className="text-gray-600">
                  Edit, duplicate, or delete existing forms
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Forms */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Recent Forms
            </h3>
            <Link href="/forms" className="text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentForms.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{form.title}</h4>
                    <p className="text-sm text-gray-600">
                      {form.responses} responses • Last response {form.lastResponse}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/analytics/${form.id}`}
                    className="btn-secondary text-sm"
                  >
                    Analytics
                  </Link>
                  <Link
                    href={`/builder/${form.id}`}
                    className="btn-primary text-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Drag & Drop</h4>
            <p className="text-gray-600 text-sm">
              Easy form building with intuitive drag-and-drop interface
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Live Analytics</h4>
            <p className="text-gray-600 text-sm">
              Real-time insights and visualizations of form responses
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Custom Fields</h4>
            <p className="text-gray-600 text-sm">
              Multiple field types: text, multiple choice, ratings, and more
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Shareable Links</h4>
            <p className="text-gray-600 text-sm">
              Generate unique links to share your forms with respondents
            </p>
          </div>
        </div>
      </main>
    </div>
  )
} 