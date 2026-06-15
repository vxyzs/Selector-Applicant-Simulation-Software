// app/dashboard/hr/page.jsx
'use client'

import React from 'react'
import { Tabs, Tab, Card, Chip } from '@nextui-org/react'
import { useUser } from '@/app/context/user'
import Lottie from 'lottie-react'
import animationDataload from '@/components/lottie/loading.json'
import { withRoleProtection } from '@/middleware/clientAuthorization'

import Interviews from './components/Interviews'
import ExpertManagement from './components/ExpertManagement'
import CreateInterview from './components/CreateInterview'
import BulkUploadPlaceholder from './components/BulkUploadPlaceholder'
import HRManagement from './components/HRManagement'

function HRDashboardScaffold() {
  const { user } = useUser()

  if (!user) {
    return (
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Lottie
            animationData={animationDataload}
            style={{ height: '150px', width: '150px' }}
          />
          <p className="text-gray-800 font-medium">Loading HR dashboard...</p>
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex flex-col relative overflow-hidden">
      <div className="max-w-6xl mx-auto w-full z-10 space-y-8">

        {/* Banner Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans">HR Management Workspace</h1>
            <p className="text-indigo-100 mt-2 text-lg">Schedule boardroom panels, manage candidates and active expert examiners.</p>
          </div>
          <Card className="p-4 bg-white/10 backdrop-blur-md border-0 text-white min-w-[240px]">
            <p className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">HR User</p>
            <p className="text-md font-bold truncate mt-1">{user.email}</p>
            <p className="text-xs uppercase tracking-wider text-indigo-200 font-semibold mt-3">Account Level</p>
            <Chip color="success" variant="flat" size="sm" className="mt-1 text-white border-white/20 capitalize bg-teal-500/20">{user.role}</Chip>
          </Card>
        </div>

        {/* Tab Navigation Hub */}
        <Card className="p-6 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 w-full">
          <Tabs
            aria-label="HR Operations Navigation"
            color="primary"
            variant="underlined"
            className="mb-6 border-b border-gray-100 pb-2"
          >
            <Tab key="interviews" title="Interviews">
              <div className="mt-4">
                <Interviews />
              </div>
            </Tab>
            <Tab key="experts" title="Expert Management">
              <div className="mt-4">
                <ExpertManagement />
              </div>
            </Tab>
            <Tab key="team" title="Team Management">
              <div className="mt-4">
                <HRManagement />
              </div>
            </Tab>
            <Tab key="create" title="Create Interview">
              <div className="mt-4">
                <CreateInterview />
              </div>
            </Tab>
            <Tab key="bulk" title="Bulk Upload">
              <div className="mt-4">
                <BulkUploadPlaceholder />
              </div>
            </Tab>
          </Tabs>
        </Card>

      </div>
    </div>
  )
}

export default withRoleProtection(HRDashboardScaffold, ['hr'])
