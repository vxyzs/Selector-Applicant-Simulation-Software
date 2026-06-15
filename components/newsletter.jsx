'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Newsletter() {
  const [isOpen, setIsOpen] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)
  const [templateCopied, setTemplateCopied] = useState(false)

  const emailAddress = "admin@nexus-eval.com"
  const emailSubject = "Organization Registration Request"
  const emailBody = `Hi,

I would like to register our organization on Nexus. Here are the details:

Organization Name: [Your Organization Name]
Lead Recruiter Name: [Your Name]
Lead Recruiter Email: [Your Email]
Lead Recruiter Designation: [Your Designation]`

  const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress)
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  const handleCopyTemplate = () => {
    const fullMessage = `Subject: ${emailSubject}\n\n${emailBody}`
    navigator.clipboard.writeText(fullMessage)
    setTemplateCopied(true)
    setTimeout(() => setTemplateCopied(false), 2000)
  }

  return (
    <section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        <div className="pb-12 md:pb-20">

          {/* CTA box */}
          <div className="relative bg-gray-900 rounded py-10 px-8 md:py-16 md:px-12 shadow-2xl overflow-hidden" data-aos="zoom-y-out">

            {/* Background illustration */}
            <div className="absolute right-0 bottom-0 pointer-events-none hidden lg:block" aria-hidden="true">
              <svg width="428" height="328" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient cx="35.542%" cy="34.553%" fx="35.542%" fy="34.553%" r="96.031%" id="ni-a">
                    <stop stopColor="#DFDFDF" offset="0%" />
                    <stop stopColor="#4C4C4C" offset="44.317%" />
                    <stop stopColor="#333" offset="100%" />
                  </radialGradient>
                </defs>
                <g fill="none" fillRule="evenodd">
                  <g fill="#FFF">
                    <ellipse fillOpacity=".04" cx="185" cy="15.576" rx="16" ry="15.576" />
                    <ellipse fillOpacity=".24" cx="100" cy="68.402" rx="24" ry="23.364" />
                    <ellipse fillOpacity=".12" cx="29" cy="251.231" rx="29" ry="28.231" />
                    <ellipse fillOpacity=".64" cx="29" cy="251.231" rx="8" ry="7.788" />
                    <ellipse fillOpacity=".12" cx="342" cy="31.303" rx="8" ry="7.788" />
                    <ellipse fillOpacity=".48" cx="62" cy="126.811" rx="2" ry="1.947" />
                    <ellipse fillOpacity=".12" cx="78" cy="7.072" rx="2" ry="1.947" />
                    <ellipse fillOpacity=".64" cx="185" cy="15.576" rx="6" ry="5.841" />
                  </g>
                  <circle fill="url(#ni-a)" cx="276" cy="237" r="200" />
                </g>
              </svg>
            </div>

            <div className="relative flex flex-col lg:flex-row justify-between items-center">

              {/* CTA content */}
              <div className="text-center lg:text-left lg:max-w-xl">
                <h3 className="h3 text-white mb-2">Get Started with Nexus Today</h3>
                <p className="text-gray-300 text-lg mb-6">Register as a candidate to participate in evaluations, or request to register your organization to schedule and manage custom panels.</p>

                {/* CTA actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start max-w-xs mx-auto sm:max-w-md lg:mx-0">
                  <Link className="btn text-white bg-indigo-600 hover:bg-indigo-700 shadow-md font-semibold px-6 py-3 rounded-xl transition duration-150" href="/signup?role=candidate">
                    Register as Candidate
                  </Link>
                  <button 
                    onClick={() => setIsOpen(true)}
                    className="btn text-indigo-200 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 shadow-md font-semibold px-6 py-3 rounded-xl transition duration-150 text-center"
                  >
                    Register Organization
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Registration Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white mb-4">Request Organization Registration</h3>
            <p className="text-slate-400 text-sm mb-6">
              To setup your organization and configure Lead Recruiter credentials, please send an email request to our administration team.
            </p>

            {/* Email Field */}
            <div className="mb-4">
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Send To Email</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 justify-between">
                <span className="font-mono text-indigo-300 text-sm">{emailAddress}</span>
                <button
                  onClick={handleCopyEmail}
                  className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition duration-150 flex items-center gap-1"
                >
                  {emailCopied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    "Copy Email"
                  )}
                </button>
              </div>
            </div>

            {/* Subject Field */}
            <div className="mb-4">
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subject</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-slate-300">
                {emailSubject}
              </div>
            </div>

            {/* Body Field */}
            <div className="mb-6">
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Body Template</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {emailBody}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={handleCopyTemplate}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border border-slate-700 rounded-xl text-sm font-semibold transition duration-150 flex items-center justify-center gap-1.5"
              >
                {templateCopied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Template Copied!
                  </>
                ) : (
                  "Copy Template"
                )}
              </button>
              <a
                href={mailtoUrl}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold text-center transition duration-150 flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Open Mail Client
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}