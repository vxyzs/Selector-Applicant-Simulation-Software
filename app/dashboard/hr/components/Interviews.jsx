'use client'

import React, { useState, useEffect } from 'react'
import { Card, Chip, Button, Avatar, Tooltip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Textarea, Select, SelectItem, Tabs, Tab } from '@nextui-org/react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import ResumeViewer from '@/components/ResumeViewer'
import { SiGooglemeet, SiZoom } from "react-icons/si";
import { FaVideo } from "react-icons/fa";

export default function Interviews() {
  const [activeInterviews, setActiveInterviews] = useState([])
  const [completedInterviews, setCompletedInterviews] = useState([])
  const [expertsList, setExpertsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('active')

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingInterview, setEditingInterview] = useState(null)
  const [editMeetLink, setEditMeetLink] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editScheduleTime, setEditScheduleTime] = useState('')
  const [editInterviewers, setEditInterviewers] = useState([])
  const [editCandidateName, setEditCandidateName] = useState('')

  // Resume preview state
  const [selectedResume, setSelectedResume] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const fetchInterviewsAndExperts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')

      // Fetch experts list first
      const expertsRes = await fetch('/api/experts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      let resolvedExperts = []
      if (expertsRes.ok) {
        const expertsData = await expertsRes.json()
        resolvedExperts = expertsData.experts || []
        setExpertsList(resolvedExperts)
      }

      // Fetch interviews
      const interviewsRes = await fetch('/api/interviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (interviewsRes.ok) {
        const interviewsData = await interviewsRes.json()
        const all = interviewsData.users || []

        const active = []
        const completed = []

        all.forEach(interview => {
          const isPast = ['completed', 'cancelled', 'selected', 'rejected', 'hold'].includes(interview.status)
          if (isPast) {
            completed.push(interview)
          } else {
            active.push(interview)
          }
        })

        setActiveInterviews(active)
        setCompletedInterviews(completed)
      } else {
        toast.error('Failed to load scheduled evaluations')
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterviewsAndExperts()
  }, [])

  const handleEditClick = (interview) => {
    setEditingInterview(interview)
    setEditMeetLink(interview.meetLink || interview.candidateLink || '')
    setEditNotes(interview.notes || '')
    setEditScheduleTime(interview.scheduledAt || interview.interviewTime || '')
    setEditCandidateName(interview.name || '')

    // Map assigned interviewers list
    const assignedIds = interview.interviewerIds || (interview.expertId ? interview.expertId.split(',') : [])
    setEditInterviewers(assignedIds.map(id => id.trim()).filter(Boolean))

    setIsEditOpen(true)
  }

  const handleSaveChanges = async () => {
    if (!editingInterview) return

    if (!editScheduleTime) {
      toast.error('Interview schedule time is required')
      return
    }

    if (editInterviewers.length === 0) {
      toast.error('Please assign at least one expert interviewer')
      return
    }

    setUpdating(true)
    try {
      const payload = {
        interviewId: editingInterview._id,
        name: editCandidateName.trim(),
        scheduledAt: editScheduleTime,
        interviewerIds: editInterviewers,
        notes: editNotes,
        meetLink: editMeetLink.trim() || null,
        status: editMeetLink.trim() ? 'room_generated' : (editingInterview.status || 'scheduled')
      }

      const response = await fetch('/api/interviews/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('Interview updated successfully')
        setIsEditOpen(false)
        fetchInterviewsAndExperts() // Reload list
      } else {
        toast.error(data.message || 'Failed to update interview')
      }
    } catch (err) {
      console.error('Error updating interview:', err)
      toast.error('Failed to update interview details')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusChange = async (interviewId, newStatus) => {
    setUpdatingId(interviewId)
    try {
      const response = await fetch('/api/interviews/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          interviewId,
          status: newStatus
        })
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(`Candidate status updated to ${newStatus}`)
        fetchInterviewsAndExperts() // Reload list
      } else {
        toast.error(data.message || 'Failed to update candidate status')
      }
    } catch (err) {
      console.error('Error updating candidate status:', err)
      toast.error('Failed to update candidate status')
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default'
      case 'scheduled': return 'primary'
      case 'room_generated': return 'secondary'
      case 'in_progress': return 'primary'
      case 'completed': return 'success'
      case 'selected': return 'success'
      case 'rejected': return 'danger'
      case 'hold': return 'warning'
      case 'cancelled': return 'danger'
      default: return 'warning'
    }
  }

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'Not scheduled'
    try {
      const date = new Date(dateTimeStr)
      if (isNaN(date.getTime())) return dateTimeStr
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (e) {
      return dateTimeStr
    }
  }

  const renderInterviewCard = (interview) => {
    const hasLink = interview.meetLink || interview.candidateLink;
    const assignedIds = interview.interviewerIds || (interview.expertId ? interview.expertId.split(',') : []);
    const isCompleted = ['completed', 'selected', 'rejected', 'hold', 'cancelled'].includes(interview.status);

    return (
      <Card key={interview._id} className="p-5 bg-white border border-gray-150 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between rounded-2xl">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-gray-800 text-lg leading-snug">{interview.name || 'Candidate'}</h4>
              <p className="text-xs text-gray-400 font-semibold">{interview.email}</p>
              <p className="text-xs font-bold text-indigo-600 tracking-wide mt-1.5">{interview.role || interview.jobPosition || 'N/A'}</p>
            </div>
            <Chip color={getStatusColor(interview.status)} variant="flat" size="sm" className="capitalize font-semibold text-[10px]">
              {(interview.status || 'scheduled').replace('_', ' ')}
            </Chip>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-gray-700">{formatDateTime(interview.scheduledAt || interview.interviewTime)}</span>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Panel Experts</p>
            <div className="flex gap-1.5 flex-wrap">
              {assignedIds.map((id, idx) => {
                const expert = expertsList.find(e => e._id === id.trim())
                const initials = expert?.name ? expert.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'E'
                return (
                  <Tooltip key={idx} content={expert ? `${expert.name} (${expert.email})` : 'Assigned Expert'} placement="top">
                    <Avatar
                      size="sm"
                      name={initials}
                      className="bg-indigo-50 text-indigo-700 font-bold text-xs border border-white"
                    />
                  </Tooltip>
                )
              })}
            </div>
          </div>

          {interview.notes && (
            <div className="text-xs text-gray-500 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/50">
              <p className="font-semibold text-amber-800 mb-0.5">Notes:</p>
              <p className="line-clamp-2">{interview.notes}</p>
            </div>
          )}

          <div className="flex gap-4 text-xs">
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Resume</p>
              {interview.resumeLink ? (
                <Button
                  size="sm"
                  variant="flat"
                  color="default"
                  className="font-semibold text-xs w-full"
                  onClick={() => {
                    setSelectedResume(interview)
                    setIsPreviewOpen(true)
                  }}
                >
                  View Resume
                </Button>
              ) : (
                <span className="text-gray-400 italic block mt-1.5">No resume</span>
              )}
            </div>

            {!isCompleted && (
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Meeting Details</p>
                {hasLink ? (
                  <Button
                    color="primary"
                    variant="solid"
                    size="sm"
                    as={Link}
                    href={interview.meetLink ||
                      interview.candidateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm w-full"
                    startContent={
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    }
                  >
                    Join Call
                  </Button>
                ) : (
                  <span className="text-gray-400 italic block mt-1.5">No link yet</span>
                )}
              </div>
            )}
          </div>

          {/* Panel Evaluation Summary */}
          {(() => {
            const evaluationKeys = interview.evaluations ? Object.keys(interview.evaluations) : [];
            const evaluations = evaluationKeys.map(expId => {
              const evaluation = interview.evaluations[expId];
              const expert = expertsList.find(e => e._id === expId);
              return {
                expertId: expId,
                expertName: expert ? expert.name : 'Expert Coder',
                ...evaluation
              };
            });
            if (evaluations.length === 0) return null;
            return (
              <div className="space-y-2 mt-2 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expert Recommendations</p>
                <div className="space-y-1.5">
                  {evaluations.map((evalItem, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700 truncate max-w-[120px]">
                        {evalItem.expertName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {evalItem.status === 'completed' ? (
                          <>
                            <span className="text-[11px] font-bold text-indigo-650 shrink-0">
                              {evalItem.totalScore}/{evalItem.maxScore}
                            </span>
                            {evalItem.verdict && (
                              <Chip
                                size="sm"
                                color={evalItem.verdict === 'select' ? 'success' : (evalItem.verdict === 'reject' ? 'danger' : 'warning')}
                                variant="flat"
                                className="font-bold text-[9px] h-4 px-1 shrink-0"
                              >
                                {evalItem.verdict === 'select' ? 'Select' : (evalItem.verdict === 'reject' ? 'Reject' : 'Potential')}
                              </Chip>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Evaluating</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* HR Final Outcome Decision panel */}
          {['completed', 'selected', 'rejected', 'hold'].includes(interview.status) && (
            <div className="mt-4 pt-4 border-t border-gray-150 space-y-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">Decide Candidate Outcome</p>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  size="sm"
                  color="success"
                  variant={interview.status === "selected" ? "solid" : "flat"}
                  className="font-bold text-[11px] h-8"
                  onClick={() => handleStatusChange(interview._id, "selected")}
                  isLoading={updatingId === interview._id}
                >
                  Select
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  variant={interview.status === "rejected" ? "solid" : "flat"}
                  className="font-bold text-[11px] h-8"
                  onClick={() => handleStatusChange(interview._id, "rejected")}
                  isLoading={updatingId === interview._id}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  color="warning"
                  variant={interview.status === "hold" ? "solid" : "flat"}
                  className={`font-bold text-[11px] h-8 ${interview.status === "hold"
                    ? "text-white bg-amber-500 hover:bg-amber-600"
                    : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                    }`}
                  onClick={() => handleStatusChange(interview._id, "hold")}
                  isLoading={updatingId === interview._id}
                >
                  Hold
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isCompleted && (
          <div className="flex gap-2 pt-4 border-t border-gray-100 mt-5">
            <Button
              size="sm"
              variant="flat"
              color="primary"
              className="flex-1 font-semibold"
              onClick={() => handleEditClick(interview)}
            >
              Edit Details
            </Button>
          </div>
        )}
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
        <p className="text-sm text-gray-500 font-medium">Loading evaluations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Evaluations Workspace</h2>
          <p className="text-xs text-gray-400">View and track all active and completed scientific boardroom panels.</p>
        </div>
        <Button
          size="sm"
          variant="flat"
          className="font-semibold shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200"
          onClick={fetchInterviewsAndExperts}
        >
          <svg className="w-4 h-4 transition-transform duration-500 hover:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </Button>
      </div>

      <Tabs
        aria-label="Evaluation Categories"
        selectedKey={activeSubTab}
        onSelectionChange={setActiveSubTab}
        color="primary"
        variant="underlined"
        className="border-b border-gray-100"
      >
        <Tab
          key="active"
          title={
            <div className="flex items-center gap-2 font-bold py-1">
              <span>Active Panels</span>
              <Chip size="sm" variant="flat" color="primary" className="text-[10px] font-bold">
                {activeInterviews.length}
              </Chip>
            </div>
          }
        >
          {activeInterviews.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 border border-gray-100 shadow-sm rounded-2xl bg-white mt-4">
              <p className="text-lg font-bold">No active interviews found</p>
              <p className="text-xs text-gray-400 mt-1">Navigate to the "Create Interview" tab to schedule one.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {activeInterviews.map((interview) => renderInterviewCard(interview))}
            </div>
          )}
        </Tab>

        <Tab
          key="completed"
          title={
            <div className="flex items-center gap-2 font-bold py-1">
              <span>Completed / Decisions</span>
              <Chip size="sm" variant="flat" color="default" className="text-[10px] font-bold">
                {completedInterviews.length}
              </Chip>
            </div>
          }
        >
          {completedInterviews.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 border border-gray-100 shadow-sm rounded-2xl bg-white mt-4">
              <p className="text-lg font-bold">No completed evaluations found</p>
              <p className="text-xs text-gray-400 mt-1">Evaluations that are completed, cancelled, selected, or rejected will appear here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {completedInterviews.map((interview) => renderInterviewCard(interview))}
            </div>
          )}
        </Tab>
      </Tabs>

      {/* Edit Details Modal */}
      <Modal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        size="lg"
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Edit Interview details
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                {editingInterview && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Candidate Name"
                        value={editCandidateName}
                        onChange={(e) => setEditCandidateName(e.target.value)}
                        variant="bordered"
                        isRequired
                      />
                      <Input
                        label="Candidate Email"
                        value={editingInterview.email}
                        isDisabled
                        variant="bordered"
                      />
                    </div>

                    <Input
                      label="Interview Date & Time"
                      type="datetime-local"
                      value={editScheduleTime}
                      onChange={(e) => setEditScheduleTime(e.target.value)}
                      variant="bordered"
                      isRequired
                    />

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Create Meet Link (External)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="flat"
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 h-auto flex items-center justify-center gap-1.5 border border-indigo-100 rounded-xl"
                          onClick={() => window.open('https://nexusmeetapp.vercel.app/', '_blank')}
                        >
                          <FaVideo className="w-3.5 h-3.5" />
                          Nexus
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="flat"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2 h-auto flex items-center justify-center gap-1.5 border border-emerald-100 rounded-xl"
                          onClick={() => window.open('https://meet.google.com/', '_blank')}
                        >
                          <SiGooglemeet className="w-3.5 h-3.5" />
                          Google
                        </Button>

                      </div>
                    </div>

                    <Input
                      label="Meet Link (Google Meet, Zoom, Agora, etc.)"
                      placeholder="Enter meeting URL"
                      value={editMeetLink}
                      onChange={(e) => setEditMeetLink(e.target.value)}
                      variant="bordered"
                    />

                    {expertsList.length === 0 ? (
                      <p className="text-xs text-red-500">No experts found in your organization.</p>
                    ) : (
                      <Select
                        label="Assign Panel Experts"
                        placeholder="Select one or more experts"
                        selectionMode="multiple"
                        selectedKeys={new Set(editInterviewers)}
                        onSelectionChange={(keys) => setEditInterviewers(Array.from(keys))}
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
                      label="Coordinator Notes"
                      placeholder="Enter prerequisites or coordinator instructions"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      variant="bordered"
                      minRows={3}
                    />
                  </>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button color="danger" variant="flat" onPress={onClose} className="font-semibold">
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSaveChanges}
                  isLoading={updating}
                  className="font-semibold text-white px-5"
                >
                  Save Changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* Resume Preview Modal */}
      <Modal
        size="3xl"
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        placement="center"
        scrollBehavior="inside"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Candidate Resume Preview
              </ModalHeader>
              <ModalBody className="py-6">
                {selectedResume && (
                  <ResumeViewer
                    resumeUrl={selectedResume.resumeLink}
                    resumeMetadata={selectedResume.resumeMetadata}
                  />
                )}
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button color="danger" variant="flat" onPress={onClose} size="sm" className="font-semibold">
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
