'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, Link, Input, Textarea, Card, CardBody, Chip } from '@nextui-org/react'
import { useUser } from '@/app/context/user'
import FeedbackForm from '@/components/feedback-form/page'
import animationDataload from '@/components/lottie/loading.json'
import Lottie from 'lottie-react'
import { toast } from 'react-hot-toast'

function CandidatePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()

  const [meetlink, setMeetLink] = useState('')
  const [showmeetlink, setShowMeetLink] = useState(false)
  const [showFeedbackPage, setShowFeedbackPage] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    skillSets: '',
    resume: null,
    existingResumeUrl: null,
  })

  const [interviewDetails, setInterviewDetails] = useState({
    jobPosition: '',
    organization: '',
  })

  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [isUser, setIsUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const idFromURL = searchParams.get('id')
    if (idFromURL) {
      setFormData((prevFormData) => ({ ...prevFormData, id: idFromURL }))
    }

    if (!user) {
      setLoading(false)
      return
    }

    if (user.role !== 'candidate') {
      router.push('/')
      return
    }

    // Prefill name & email from current authenticated user context as default
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
    }))

    // Validate if the interview ID belongs to the current candidate user
    if (idFromURL) {
      setLoading(true)
      fetch('/api/checkinterview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ interviewID: idFromURL.trim(), userEmail: user.email })
      })
        .then(async (response) => {
          const data = await response.json()
          if (response.ok) {
            setIsUser(true)
            if (data.interview) {
              setInterviewDetails({
                jobPosition: data.interview.jobPosition || '',
                organization: data.interview.organization || '',
              })
              setFormData((prev) => ({
                ...prev,
                name: data.interview.name || prev.name || user.name || '',
                email: data.interview.email || prev.email || user.email || '',
                skillSets: data.interview.skillSets || prev.skillSets || '',
                existingResumeUrl: data.interview.resumeLink || null,
              }))
            }
          } else {
            setIsUser(false)
            setErrorMsg(data.error || 'Failed to validate interview details')
            toast.error(data.error || 'Failed to validate interview details')
          }
        })
        .catch((err) => {
          console.error('Validation error:', err)
          setIsUser(false)
          setErrorMsg('An error occurred during interview verification.')
          toast.error('An error occurred during verification.')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setIsUser(true)
      setLoading(false)
    }
  }, [searchParams, user, router])

  if (loading) {
    return (
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Lottie
            animationData={animationDataload}
            style={{ height: '150px', width: '150px' }}
          />
          <p className="text-gray-800">Loading Interview data...</p>
        </div>
      </section>
    )
  }

  if (!isUser) {
    return (
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-red-100 max-w-md">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-sm text-gray-500 mb-6">
            {errorMsg || 'You must be a candidate to view this page.'}
          </p>
          <Button as={Link} href="/" color="primary" variant="solid" className="font-semibold shadow-sm text-white">
            Go to Home
          </Button>
        </div>
      </section>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }))
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size exceeds 2MB limit')
        return
      }
      setFormData((prevFormData) => ({
        ...prevFormData,
        resume: file,
      }))
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf') {
        if (file.size <= 2 * 1024 * 1024) {
          setFormData((prev) => ({ ...prev, resume: file }))
          toast.success(`Selected file: ${file.name}`)
        } else {
          toast.error('File size exceeds 2MB limit')
        }
      } else {
        toast.error('Only PDF files are supported')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResponseMessage('')

    const formDataToSend = new FormData()
    formDataToSend.append('id', formData.id)
    formDataToSend.append('name', formData.name)
    formDataToSend.append('email', formData.email)
    formDataToSend.append('skillSets', formData.skillSets)
    if (formData.resume) {
      formDataToSend.append('resume', formData.resume)
    }

    try {
      const response = await fetch('/api/candidate', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formDataToSend,
      })
      const result = await response.json()

      if (response.ok) {
        setResponseMessage('Submission successful')
        // Route candidate to their custom candidateLink to join properly
        setMeetLink(result.interview.candidateLink || result.interview.HostLink || '')
        setShowMeetLink(true)
        toast.success('Form submitted successfully! Meet link is ready.')
      } else {
        setResponseMessage(result.error || 'Submission failed')
        toast.error(result.error || 'Submission failed. Please try again.')
      }
    } catch (error) {
      setResponseMessage('An error occurred while submitting the form.')
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showFeedbackPage) return <FeedbackForm />

  return (
    <div className='flex flex-col md:flex-row min-h-screen md:h-screen pt-16 md:pt-20 bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 overflow-y-auto'>
      {/* Left side: Premium welcome and instructions */}
      <div className='md:w-1/2 p-8 md:p-16 bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-850 text-white flex flex-col justify-center relative overflow-hidden'>
        {/* Navigation Home */}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/candidate-dashboard" className="text-indigo-200/80 hover:text-white flex items-center gap-1.5 transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>

        {/* Abstract background blobs for design premium feel */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className='max-w-md mx-auto z-10 space-y-8'>
          <div>
            <Chip color="secondary" variant="flat" className="text-white border-white/20 mb-2 capitalize text-xs">
              Candidate Portal
            </Chip>
            <h1 className='text-4xl font-extrabold tracking-tight leading-tight bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-blue-200'>
              {interviewDetails.jobPosition ? `${interviewDetails.jobPosition} Interview` : 'Evaluation Panel'}
            </h1>
            {interviewDetails.organization && (
              <p className="text-indigo-200 mt-2 text-md leading-relaxed font-semibold">
                with {interviewDetails.organization}
              </p>
            )}
            {!interviewDetails.jobPosition && (
              <p className='text-indigo-200/80 mt-2 text-md leading-relaxed'>
                Configure your interview settings and prepare your details for the live evaluation.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-indigo-300 font-bold">Prerequisites</h3>

            {/* Step 1 */}
            <div className="flex gap-4 items-start bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:bg-white/10">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Identity Verification</h4>
                  {formData.name && formData.email && (
                    <Chip size="sm" color="success" variant="flat" className="text-emerald-300 text-[10px] h-4 font-semibold">Verified</Chip>
                  )}
                </div>
                <p className="text-xs text-indigo-200/70 mt-0.5">Provide your full registered name and active email address.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:bg-white/10">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Skills & Core Expertise</h4>
                  {formData.skillSets && (
                    <Chip size="sm" color="success" variant="flat" className="text-emerald-300 text-[10px] h-4 font-semibold">Provided</Chip>
                  )}
                </div>
                <p className="text-xs text-indigo-200/70 mt-0.5">List your relevant skill sets to customize the question generation.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:bg-white/10">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Resume Submission</h4>
                  {(formData.resume || formData.existingResumeUrl) && (
                    <Chip size="sm" color="success" variant="flat" className="text-emerald-300 text-[10px] h-4 font-semibold">Active</Chip>
                  )}
                </div>
                <p className="text-xs text-indigo-200/70 mt-0.5">Upload your updated resume PDF (limit 2MB) for evaluation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Modern Form */}
      <div className='md:w-1/2 p-6 md:p-12 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-blue-50/15 flex flex-col justify-center items-center overflow-y-auto relative min-h-[500px]'>
        {/* Soft background decor */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

        {showmeetlink ? (
          <div className="flex flex-col items-center justify-center gap-6 py-10 text-center animate-fade-in-up z-10">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-md border border-emerald-100 animate-bounce">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="max-w-md">
              <h2 className="text-3xl font-extrabold text-gray-800">Registration Complete!</h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Your details and resume have been securely uploaded. The evaluation panel is ready to meet you.
              </p>
            </div>
            <Card className="w-full border border-emerald-150 bg-emerald-50/20 shadow-lg p-6 max-w-sm mx-auto rounded-3xl">
              <CardBody className="p-0 flex flex-col gap-4">
                <div className="flex flex-col gap-1 text-center border-b border-emerald-100/50 pb-3">
                  <span className="text-sm font-bold text-emerald-800">{formData.name}</span>
                  <span className="text-xs text-emerald-600/80">Session Verified</span>
                </div>
                <Button
                  isDisabled={!meetlink}
                  as={meetlink ? Link : undefined}
                  href={meetlink || undefined}
                  onClick={() => {
                    if (meetlink) {
                      setShowFeedbackPage(true)
                    }
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="success"
                  size="lg"
                  className={`w-full text-white font-bold text-md shadow-lg transition-all duration-300 rounded-xl
                    ${meetlink 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.02] active:scale-[0.98] shadow-emerald-500/25' 
                      : 'bg-slate-400 cursor-not-allowed opacity-50 shadow-none'
                    }`}
                  startContent={
                    <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  }
                  title={!meetlink ? "Interviewer has not added the meet link yet" : "Join call"}
                >
                  {meetlink ? "Join Call" : "Call Link Pending"}
                </Button>
              </CardBody>
            </Card>
          </div>
        ) : (
          <Card className="w-full max-w-lg p-6 border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-indigo-100/30 rounded-3xl z-10">
            <CardBody className="p-0 space-y-6 overflow-auto">
              <div>
                <Chip color="primary" variant="flat" size="sm" className="mb-2 uppercase text-[10px] tracking-wider font-bold">
                  Setup Workspace
                </Chip>
                <h2 className='text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 bg-clip-text bg-gradient-to-r from-slate-800 to-indigo-950'>
                  Welcome to NexEval
                </h2>
                <p className='text-sm text-slate-500 mt-1.5 leading-relaxed'>
                  Please verify and complete your workspace details to start the evaluation:
                </p>
              </div>

              <form onSubmit={handleSubmit} className='space-y-5'>
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  variant="bordered"
                  isRequired
                  className="w-full"
                  classNames={{
                    inputWrapper: "border-slate-200 focus-within:border-indigo-500 rounded-xl",
                  }}
                />

                <Input
                  type="email"
                  label="Email Address"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  variant="bordered"
                  isRequired
                  className="w-full"
                  classNames={{
                    inputWrapper: "border-slate-200 focus-within:border-indigo-500 rounded-xl",
                  }}
                />

                <Textarea
                  label="Skill Sets"
                  name="skillSets"
                  value={formData.skillSets}
                  onChange={handleChange}
                  placeholder="E.g., React, Node.js, Python, SQL"
                  variant="bordered"
                  isRequired
                  className="w-full"
                  classNames={{
                    inputWrapper: "border-slate-200 focus-within:border-indigo-500 rounded-xl",
                  }}
                />

                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Upload Resume
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className="w-full"
                  >
                    <Card
                      className={`border-dashed border-2 transition-all duration-300 cursor-pointer shadow-none relative
                        ${dragActive
                          ? 'border-indigo-500 bg-indigo-50/30 scale-[1.01]'
                          : formData.resume
                            ? 'border-emerald-300 bg-emerald-50/10 hover:bg-emerald-50/20'
                            : formData.existingResumeUrl
                              ? 'border-teal-300 bg-teal-50/10 hover:bg-teal-50/20'
                              : 'border-slate-200 bg-slate-50/10 hover:bg-indigo-50/10 hover:border-indigo-300'
                        }`}
                    >
                      <CardBody className="py-8 flex flex-col items-center justify-center gap-2 relative min-h-[160px]">
                        <input
                          type="file"
                          id="resume"
                          name="resume"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-15"
                          required={!formData.resume && !formData.existingResumeUrl}
                        />
                        {formData.resume ? (
                          <div className="flex flex-col items-center gap-2 text-center text-indigo-700">
                            <svg className="w-10 h-10 text-emerald-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-bold truncate max-w-[280px]" title={formData.resume.name}>
                              {formData.resume.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              Ready to upload. Click or drag here to replace
                            </span>
                          </div>
                        ) : formData.existingResumeUrl ? (
                          <div className="flex flex-col items-center gap-2 text-center text-teal-700">
                            <svg className="w-10 h-10 text-teal-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-bold text-slate-700">
                              Resume already uploaded!
                            </span>
                            <a
                              href={formData.existingResumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-700 underline font-semibold transition-colors z-20 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View current resume
                            </a>
                            <span className="text-xs text-slate-400 mt-1">
                              Click or drag here to replace (PDF, max 2MB)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center text-slate-400">
                            <svg className="w-10 h-10 text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-700">
                              Choose a PDF file or drag it here
                            </span>
                            <span className="text-xs text-slate-400">
                              PDF format only, maximum 2MB
                            </span>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </div>
                </div>

                <div>
                  <Button
                    type='submit'
                    isLoading={isSubmitting}
                    className={`w-full font-bold text-md shadow-lg transition-all duration-300 py-6 mb-6 rounded-xl text-white
                      ${isSubmitting
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-500 hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99]'
                      }`}
                  >
                    {isSubmitting ? 'Submitting details...' : 'Submit Profile'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
          <p className="text-gray-800 font-medium">Loading workspace...</p>
        </div>
      </section>
    }>
      <CandidatePage />
    </Suspense>
  )
}
