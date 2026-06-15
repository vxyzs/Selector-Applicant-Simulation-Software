// app/dashboard/candidate/page.jsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/context/user'
import Lottie from 'lottie-react'
import animationDataload from '@/components/lottie/loading.json'
import animationDatasch from '@/components/lottie/schedule.json'
import { toast } from 'react-hot-toast'
import ResumeViewer from '@/components/ResumeViewer'
import { withRoleProtection } from '@/middleware/clientAuthorization'
import UpcomingInterviews from './components/UpcomingInterviews'

const CandidateDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [pastInterviews, setPastInterviews] = useState([])
  const [upcomingInterviews, setUpcomingInterviews] = useState([])
  const [newInterviewID, setNewInterviewID] = useState('')
  const [submittingID, setSubmittingID] = useState(false)

  const [selectedResume, setSelectedResume] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const handleOpenPreview = (interview) => {
    setSelectedResume(interview)
    setIsPreviewOpen(true)
  }

  const { user } = useUser()
  const router = useRouter()

  const fetchInterviews = useCallback(async () => {
    if (!user) return
    setFetching(true)
    try {
      const response = await fetch('/api/interviews/candidate', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setPastInterviews(data.past || [])
        setUpcomingInterviews(data.future || [])
      } else {
        toast.error(data.message || 'Failed to retrieve interviews')
      }
    } catch (error) {
      console.error('Error fetching interviews:', error)
      toast.error('Error fetching interview records')
    } finally {
      setFetching(false)
    }
  }, [user])

  useEffect(() => {
    fetchInterviews().then(() => {
      setLoading(false)
    })
  }, [fetchInterviews])

  const handleValidateNewID = async (e) => {
    e.preventDefault()
    if (!newInterviewID.trim()) {
      toast.error('Please enter a valid Interview ID')
      return
    }

    setSubmittingID(true)
    try {
      const response = await fetch('/api/checkinterview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ interviewID: newInterviewID.trim(), userEmail: user.email })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Interview validated! Redirecting to setup...')
        router.push(`/can/?id=${newInterviewID.trim()}`)
      } else {
        toast.error(data.error || 'Failed to validate Interview ID')
      }
    } catch (error) {
      console.error('Error validating ID:', error)
      toast.error('Error validating Interview ID')
    } finally {
      setSubmittingID(false)
    }
  }

  if (loading || !user) {
    return (
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Lottie
            animationData={animationDataload}
            style={{ height: '150px', width: '150px' }}
          />
          <p className="text-gray-800 font-medium">Loading your profile dashboard...</p>
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
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Welcome, {user.name || 'Candidate'}!</h1>
            <p className="text-indigo-100 mt-2 text-lg">Manage your upcoming evaluations, fill prerequisite details, and join video interviews.</p>
          </div>
          <Card className="p-4 bg-white/10 backdrop-blur-md border-0 text-white min-w-[240px]">
            <p className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">Registered Email</p>
            <p className="text-md font-bold truncate mt-1">{user.email}</p>
            <p className="text-xs uppercase tracking-wider text-indigo-200 font-semibold mt-3">Account Level</p>
            <Chip color="secondary" variant="flat" size="sm" className="mt-1 text-white border-white/20 capitalize">{user.role}</Chip>
          </Card>
        </div>

        {/* Dashboard grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Evaluations Center</span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={fetchInterviews}
                  isLoading={fetching}
                  className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl min-w-[32px] h-[32px] transition-all duration-300"
                  title="Refresh evaluations"
                >
                  {!fetching && (
                    <svg className="w-4 h-4 transition-transform duration-500 hover:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  )}
                </Button>
              </div>
              
              <UpcomingInterviews 
                upcomingInterviews={upcomingInterviews}
                pastInterviews={pastInterviews}
                onPreviewResume={handleOpenPreview}
              />
            </Card>
          </div>

          {/* Sidebar Action Cards */}
          <div className="space-y-6">
            <Card className="p-6 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-gray-800">Add Scheduled Interview</h2>
              <p className="text-sm text-gray-600">Have you received a new evaluation ID via email? Validate it below to attach it to your candidate dashboard.</p>
              <form onSubmit={handleValidateNewID} className="space-y-4">
                <Input
                  label="Interview ID"
                  placeholder="Enter 24-character ID"
                  variant="bordered"
                  value={newInterviewID}
                  onChange={(e) => setNewInterviewID(e.target.value)}
                  isRequired
                />
                <Button
                  type="submit"
                  color="primary"
                  className="w-full font-semibold text-white"
                  isLoading={submittingID}
                >
                  Verify & Add
                </Button>
              </form>
            </Card>

            <Card className="p-6 bg-indigo-50/50 backdrop-blur-md border border-indigo-100 shadow-sm">
              <h3 className="text-md font-bold text-indigo-900 mb-2">💡 Quick Tips for Candidates</h3>
              <ul className="text-xs text-indigo-800 space-y-2 list-disc list-inside">
                <li>Make sure your webcam and microphone are working before joining a call.</li>
                <li>Complete your profile and upload your resume *at least 15 minutes* prior to schedule time.</li>
                <li>Performance reports are generated immediately after the interview concludes.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

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
                My Uploaded Resume
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

export default withRoleProtection(CandidateDashboard, ['candidate'])
