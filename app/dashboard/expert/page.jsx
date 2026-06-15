// app/dashboard/expert/page.jsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Tabs, Tab, Card, Button, Chip } from '@nextui-org/react'
import PastTableComponent from '@/components/Table/PastTable'
import FutureTableComponent from '@/components/Table/FutureTable'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/app/context/user'
import Lottie from 'lottie-react'
import animationDataload from '@/components/lottie/loading.json'
import animationDatasch from '@/components/lottie/schedule.json'
import { withRoleProtection } from '@/middleware/clientAuthorization'

const ExpertDashboard = () => {
  const [activeTab, setActiveTab] = useState('scheduledInterview')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    averageScore: 0
  })
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('id') || (user && user._id)

  const fetchStats = useCallback(async () => {
    if (!userId) return
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'userid': userId,
        'Authorization': `Bearer ${token}`
      }

      const [pastRes, futureRes] = await Promise.all([
        fetch('/api/interviews/past', { headers }),
        fetch('/api/interviews/future', { headers })
      ])

      const pastData = await pastRes.json()
      const futureData = await futureRes.json()

      if (pastRes.ok && futureRes.ok) {
        const pastList = pastData.candidates || []
        const futureList = futureData.candidates || []

        let scoreSum = 0
        let scoreCount = 0
        pastList.forEach(c => {
          if (c.totalScore !== undefined && c.totalScore !== null) {
            scoreSum += Number(c.totalScore)
            scoreCount++
          }
        })

        const average = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : '0.0'

        setStats({
          completed: pastList.length,
          pending: futureList.length,
          averageScore: average
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchStats().then(() => {
        setLoading(false)
      })
    }
  }, [userId, fetchStats])

  const handleRefreshStats = () => {
    fetchStats()
    setRefreshTrigger(prev => prev + 1)
  }

  if (loading || !user) {
    return (
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Lottie
            animationData={animationDataload}
            style={{ height: '150px', width: '150px' }}
          />
          <p className="text-gray-800 font-medium">Loading expert dashboard...</p>
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Background schedule animation */}
      <div className="fixed right-[-100px] bottom-[-100px] pointer-events-none z-0 opacity-10 md:opacity-20">
        <Lottie
          animationData={animationDatasch}
          style={{ height: '500px', width: '500px' }}
        />
      </div>

      <div className="max-w-6xl mx-auto w-full z-10 space-y-8">
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Welcome back, {user.name || 'Expert'}!</h1>
            <p className="text-indigo-100 mt-2 text-lg">Manage scheduled candidate evaluations, host interview panels, and review generated performance metrics.</p>
          </div>
          <Card className="p-4 bg-white/10 backdrop-blur-md border-0 text-white min-w-[240px]">
            <p className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">Registered Email</p>
            <p className="text-md font-bold truncate mt-1">{user.email}</p>
            <p className="text-xs uppercase tracking-wider text-indigo-200 font-semibold mt-3">Account Level</p>
            <Chip color="secondary" variant="flat" size="sm" className="mt-1 text-white border-white/20 capitalize">{user.role}</Chip>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white shadow-md border border-gray-150 flex flex-row items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Completed Evaluations</p>
              <p className="text-3xl font-extrabold text-gray-800 mt-2">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-50 text-green-500 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </Card>

          <Card className="p-6 bg-white shadow-md border border-gray-150 flex flex-row items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending Evaluations</p>
              <p className="text-3xl font-extrabold text-gray-800 mt-2">{stats.pending}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m-6 0l-3-3V8m6 8H4a2 2 0 00-2 2v2h20v-2a2 2 0 00-2-2h-6z" />
              </svg>
            </div>
          </Card>

          <Card className="p-6 bg-white shadow-md border border-gray-150 flex flex-row items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Average Score Given</p>
              <p className="text-3xl font-extrabold text-gray-800 mt-2">{stats.averageScore} <span className="text-sm text-gray-400 font-normal">pts</span></p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </Card>
        </div>

        {/* Dashboard Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 border-b border-gray-100 pb-2">
                <Tabs
                  aria-label="Evaluation Categories"
                  selectedKey={activeTab}
                  onSelectionChange={setActiveTab}
                  color="primary"
                  variant="underlined"
                  className="mb-0"
                >
                  <Tab key="scheduledInterview" title="Scheduled Evaluations" />
                  <Tab key="pastInterview" title="Past Evaluations" />
                </Tabs>
              </div>

              {activeTab === 'scheduledInterview' ? (
                <div className="w-full mt-2">
                  <FutureTableComponent userId={userId} refreshTrigger={refreshTrigger} onInterviewScheduled={handleRefreshStats} />
                </div>
              ) : (
                <div className="w-full mt-2">
                  <PastTableComponent userId={userId} />
                </div>
              )}
            </Card>
          </div>

          {/* Quick Actions Panel */}
          <Card className="p-6 h-fit bg-indigo-50/50 backdrop-blur-md border border-indigo-100 shadow-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold text-indigo-950">💡 Expert Portal Instructions</h3>
            <p className="text-xs text-indigo-900 leading-relaxed">
              As an expert examiner, you can view interviews scheduled for you by HR, host meeting panels, evaluate candidate capability, and record ratings.
            </p>
            <ul className="text-xs text-indigo-850 space-y-2 list-disc list-inside">
              <li>HR schedules invitations and coordinates emails.</li>
              <li>Conduct evaluation interviews using generated Gemini questions.</li>
              <li>Submit ratings to generate candidate capability reports.</li>
            </ul>
            <Button
              onClick={handleRefreshStats}
              color="primary"
              variant="flat"
              size="sm"
              className="mt-2"
            >
              Refresh Statistics
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default withRoleProtection(ExpertDashboard, ['expert'])
