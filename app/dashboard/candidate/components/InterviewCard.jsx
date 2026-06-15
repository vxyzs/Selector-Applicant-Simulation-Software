'use client'

import React, { useState, useEffect } from 'react'
import { Card, Chip, Button, Tooltip } from '@nextui-org/react'
import Link from 'next/link'

export default function InterviewCard({ interview, onPreviewResume }) {
  const [timeState, setTimeState] = useState({
    joinStatus: 'valid',
    statusMessage: '',
    timeLeftStr: ''
  })

  const isResumeUploaded = interview.resumeLink && (interview.resumeLink.startsWith('http://') || interview.resumeLink.startsWith('https://'))

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { dateStr: 'Not scheduled', timeStr: '' }
    try {
      const date = new Date(dateTimeStr)
      if (isNaN(date.getTime())) return { dateStr: dateTimeStr, timeStr: '' }
      
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      return { dateStr, timeStr }
    } catch (e) {
      return { dateStr: dateTimeStr, timeStr: '' }
    }
  }

  const { dateStr, timeStr } = formatDateTime(interview.scheduledAt || interview.interviewTime)

  useEffect(() => {
    const checkTimeWindow = () => {
      const link = interview.meetLink || interview.candidateLink
      if (!link) {
        setTimeState({
          joinStatus: 'no_link',
          statusMessage: 'Meeting details will be shared soon',
          timeLeftStr: ''
        })
        return
      }

      const now = new Date()
      const scheduledTime = new Date(interview.scheduledAt || interview.interviewTime)
      if (isNaN(scheduledTime.getTime())) {
        setTimeState({
          joinStatus: 'valid',
          statusMessage: '',
          timeLeftStr: ''
        })
        return
      }

      const timeDiffMs = scheduledTime.getTime() - now.getTime()
      const timeDiffMins = timeDiffMs / (1000 * 60)

      if (timeDiffMins > 15) {
        // More than 15 minutes before the start
        const hours = Math.floor(timeDiffMins / 60)
        const mins = Math.floor(timeDiffMins % 60)
        const timeLeftStr = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`
        
        setTimeState({
          joinStatus: 'not_started',
          statusMessage: 'Interview not started yet',
          timeLeftStr
        })
      } else if (timeDiffMins < -30) {
        // More than 30 minutes after scheduled start
        setTimeState({
          joinStatus: 'expired',
          statusMessage: 'Interview window expired',
          timeLeftStr: ''
        })
      } else {
        // Within the active join window
        setTimeState({
          joinStatus: 'valid',
          statusMessage: 'Interview is active',
          timeLeftStr: ''
        })
      }
    }

    checkTimeWindow()
    const timer = setInterval(checkTimeWindow, 10000) // Check every 10 seconds
    return () => clearInterval(timer)
  }, [interview])

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default'
      case 'scheduled': return 'primary'
      case 'room_generated': return 'secondary'
      case 'in_progress': return 'success'
      case 'completed': return 'success'
      case 'cancelled': return 'danger'
      default: return 'warning'
    }
  }

  const getInterviewerInitials = (name) => {
    if (!name) return 'E'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <Card className="p-6 bg-white border border-gray-150 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between rounded-2xl relative overflow-hidden">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {interview.organization || 'Nexus board evaluation'}
            </span>
            <h4 className="font-bold text-gray-800 text-lg leading-snug mt-1">
              {interview.role || interview.jobPosition || 'Evaluation Panel'}
            </h4>
          </div>
          <Chip color={getStatusColor(interview.status)} variant="flat" size="sm" className="capitalize font-semibold text-[10px]">
            {(interview.status || 'scheduled').replace('_', ' ')}
          </Chip>
        </div>

        {/* Date and Time Info */}
        <div className="flex items-center gap-2.5 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="font-bold text-gray-700">{dateStr}</p>
            <p className="text-[10px] text-gray-400 font-semibold">{timeStr}</p>
          </div>
        </div>

        {/* Experts List */}
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Panel Interviewers</p>
          {interview.interviewers && interview.interviewers.length > 0 ? (
            <div className="flex gap-2 flex-wrap items-center">
              {interview.interviewers.map((expert, idx) => (
                <Tooltip key={idx} content={`${expert.name} (${expert.organization})`} placement="top">
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full py-0.5 px-2 text-xs font-semibold text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[9px]">
                      {getInterviewerInitials(expert.name)}
                    </span>
                    <span>{expert.name}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic font-medium">Interviewers to be assigned soon</p>
          )}
        </div>

        {/* Coordinator Notes */}
        {interview.notes && (
          <div className="text-xs text-gray-500 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/50">
            <p className="font-semibold text-amber-800 mb-0.5">Instructions / Notes:</p>
            <p className="line-clamp-2">{interview.notes}</p>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="pt-4 border-t border-gray-100 mt-5 space-y-3">
        {/* Join limitations warnings */}
        {timeState.joinStatus !== 'valid' && (
          <div className={`p-2.5 rounded-xl border text-xs font-semibold text-center flex items-center justify-center gap-2 ${
            timeState.joinStatus === 'no_link' 
              ? 'bg-blue-50/50 border-blue-100 text-blue-800' 
              : timeState.joinStatus === 'not_started' 
              ? 'bg-amber-50/50 border-amber-100 text-amber-800' 
              : 'bg-red-50/50 border-red-100 text-red-800'
          }`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {timeState.statusMessage}
              {timeState.timeLeftStr ? ` (${timeState.timeLeftStr})` : ''}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {/* Resume Upload / View buttons */}
          {!isResumeUploaded ? (
            <Button
              as={Link}
              href={`/can?id=${interview._id}`}
              color="warning"
              size="sm"
              variant="flat"
              className="flex-1 font-bold text-xs"
            >
              Upload Resume
            </Button>
          ) : (
            <Button
              onPress={() => onPreviewResume(interview)}
              color="default"
              size="sm"
              variant="flat"
              className="flex-1 font-semibold text-xs"
            >
              View Resume
            </Button>
          )}

          {/* Join Call button */}
          <Button
            isDisabled={timeState.joinStatus !== 'valid'}
            color="success"
            variant="solid"
            size="sm"
            className="flex-1 font-bold text-xs text-white"
            onClick={() => {
              const link = interview.meetLink || interview.candidateLink
              if (link) {
                window.open(link, '_blank', 'noopener,noreferrer')
              }
            }}
            startContent={
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
          >
            Join Interview
          </Button>
        </div>
      </div>
    </Card>
  )
}
