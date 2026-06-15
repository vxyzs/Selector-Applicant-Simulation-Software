'use client'

import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Textarea, Select, SelectItem } from '@nextui-org/react'
import { toast } from 'react-hot-toast'

export default function CreateInterview() {
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [selectedInterviewers, setSelectedInterviewers] = useState([])
  const [rolePosition, setRolePosition] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [notes, setNotes] = useState('')
  const [expertsList, setExpertsList] = useState([])
  const [loadingExperts, setLoadingExperts] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const response = await fetch('/api/experts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setExpertsList(data.experts || [])
        } else {
          toast.error('Failed to load experts')
        }
      } catch (err) {
        console.error('Error fetching experts:', err)
        toast.error('Failed to connect to experts service')
      } finally {
        setLoadingExperts(false)
      }
    }
    fetchExperts()
  }, [])

  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!candidateName.trim() || !candidateEmail.trim() || !rolePosition || !scheduleTime) {
      toast.error('Please fill out all required fields')
      return
    }

    if (selectedInterviewers.length === 0) {
      toast.error('Please select at least one expert interviewer')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: candidateName.trim(),
        email: candidateEmail.trim(),
        role: rolePosition.trim(),
        scheduledAt: scheduleTime,
        interviewerIds: selectedInterviewers,
        notes: notes.trim(),
        status: 'scheduled',
        meetLink: null,
        roomId: null
      }

      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Interview scheduled successfully')
        // Reset form
        setCandidateName('')
        setCandidateEmail('')
        setSelectedInterviewers([])
        setRolePosition('')
        setScheduleTime('')
        setNotes('')
      } else {
        toast.error(data.message || 'Failed to schedule interview')
      }
    } catch (err) {
      console.error('Error scheduling interview:', err)
      toast.error('Internal server error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="pb-2 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Schedule New Evaluation Panel</h2>
        <p className="text-xs text-gray-400">Decouple scheduling from meeting rooms by registering candidate profiles first.</p>
      </div>

      <Card className="p-6 bg-white border border-gray-150 shadow-sm rounded-2xl">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Candidate Name"
              placeholder="Enter full name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              variant="bordered"
              isRequired
            />
            <Input
              label="Candidate Email"
              placeholder="Enter email address"
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              variant="bordered"
              isRequired
            />
          </div>

          <Input
            label="Role / Job Position"
            placeholder="e.g. Senior Frontend Architect"
            value={rolePosition}
            onChange={(e) => setRolePosition(e.target.value)}
            variant="bordered"
            isRequired
          />

          <Input
            label="Interview Date & Time"
            placeholder="Select date and time"
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            variant="bordered"
            isRequired
          />

          {loadingExperts ? (
            <p className="text-xs text-gray-400">Loading evaluation panel experts...</p>
          ) : expertsList.length === 0 ? (
            <p className="text-xs text-red-500">No experts found in your organization.</p>
          ) : (
            <Select
              label="Assign Panel Experts"
              placeholder="Select one or more experts"
              selectionMode="multiple"
              selectedKeys={new Set(selectedInterviewers)}
              onSelectionChange={(keys) => setSelectedInterviewers(Array.from(keys))}
              variant="bordered"
              isRequired
            >
              {expertsList.map((expert) => (
                <SelectItem key={expert._id} textValue={expert.name}>
                  {expert.name} ({expert.email})
                </SelectItem>
              ))}
            </Select>
          )}

          <Textarea
            label="Coordinator Notes / Prerequisites"
            placeholder="Include any special instructions, domain requirements, or evaluation criteria..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            variant="bordered"
            minRows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="flat" 
              color="danger" 
              className="font-semibold"
              onClick={() => {
                setCandidateName('')
                setCandidateEmail('')
                setSelectedInterviewers([])
                setRolePosition('')
                setScheduleTime('')
                setNotes('')
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="solid" 
              color="primary" 
              className="font-semibold text-white px-6"
              isLoading={submitting}
            >
              Schedule Interview
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
