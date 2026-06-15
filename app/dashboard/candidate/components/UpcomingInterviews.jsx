'use client'

import React, { useState } from 'react'
import { Tabs, Tab, Card, Chip } from '@nextui-org/react'
import InterviewCard from './InterviewCard'

export default function UpcomingInterviews({ upcomingInterviews = [], pastInterviews = [], onPreviewResume }) {
  const [activeTab, setActiveTab] = useState('upcoming')

  const formatSimpleDate = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A'
    try {
      const d = new Date(dateTimeStr)
      if (isNaN(d.getTime())) return dateTimeStr
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch(e) {
      return dateTimeStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Evaluations</h2>
          <p className="text-xs text-gray-400">Track your interview schedule and evaluation workspaces.</p>
        </div>
      </div>

      <Tabs
        aria-label="Evaluation Schedules"
        selectedKey={activeTab}
        onSelectionChange={setActiveTab}
        color="primary"
        variant="underlined"
        className="border-b border-gray-100"
      >
        {/* Upcoming tab */}
        <Tab 
          key="upcoming" 
          title={
            <div className="flex items-center gap-2 font-bold py-1">
              <span>Upcoming Panels</span>
              <Chip size="sm" variant="flat" color="primary" className="text-[10px] font-bold">
                {upcomingInterviews.length}
              </Chip>
            </div>
          }
        >
          {upcomingInterviews.length === 0 ? (
            <Card className="p-12 text-center text-gray-500 border border-gray-150 shadow-sm rounded-2xl bg-white mt-4">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-bold text-gray-700">No upcoming evaluations scheduled</p>
              <p className="text-xs text-gray-400 mt-1">If you have received an evaluation ID, validate it using the form on the sidebar.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {upcomingInterviews.map((interview) => (
                <InterviewCard 
                  key={interview._id} 
                  interview={interview} 
                  onPreviewResume={onPreviewResume} 
                />
              ))}
            </div>
          )}
        </Tab>

        {/* Past Evaluations Tab */}
        <Tab 
          key="past" 
          title={
            <div className="flex items-center gap-2 font-bold py-1">
              <span>Past Records</span>
              <Chip size="sm" variant="flat" color="default" className="text-[10px] font-bold">
                {pastInterviews.length}
              </Chip>
            </div>
          }
        >
          {pastInterviews.length === 0 ? (
            <Card className="p-12 text-center text-gray-500 border border-gray-150 shadow-sm rounded-2xl bg-white mt-4">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="text-lg font-bold text-gray-700">No past evaluations recorded</p>
              <p className="text-xs text-gray-400 mt-1">Completed evaluation workspaces will appear here once finalized.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {pastInterviews.map((interview) => (
                <InterviewCard 
                  key={interview._id} 
                  interview={interview} 
                  onPreviewResume={onPreviewResume} 
                />
              ))}
            </div>
          )}
        </Tab>
      </Tabs>
    </div>
  )
}
