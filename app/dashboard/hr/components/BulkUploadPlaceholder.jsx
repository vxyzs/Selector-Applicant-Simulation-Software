'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, Input, Chip, Tooltip, Avatar } from '@nextui-org/react'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function BulkUploadPlaceholder() {
  const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'importing' | 'success'
  const [expertsList, setExpertsList] = useState([])
  const [loadingExperts, setLoadingExperts] = useState(true)
  const [parsedInterviews, setParsedInterviews] = useState([])
  const [searchExpert, setSearchExpert] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const fileInputRef = useRef(null)

  // Fetch experts list to resolve emails to database IDs
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
          toast.error('Failed to load experts directory')
        }
      } catch (err) {
        console.error('Error fetching experts:', err)
        toast.error('Failed to load experts library')
      } finally {
        setLoadingExperts(false)
      }
    }
    fetchExperts()
  }, [])

  // Helper to convert Excel date number to standard JS Date
  const excelDateToJSDate = (serial) => {
    const utc_days = Math.floor(serial - 25569)
    const utc_value = utc_days * 86400
    const date_info = new Date(utc_value * 1000)
    const fractional_day = serial - Math.floor(serial) + 0.0000001
    let total_seconds = Math.floor(86400 * fractional_day)
    const seconds = total_seconds % 60
    total_seconds = Math.floor(total_seconds / 60)
    const minutes = total_seconds % 60
    const hours = Math.floor(total_seconds / 60)
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds)
  }

  // Handle Drag Events
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current.click()
  }

  // Parse and validate the Excel/CSV file
  const processFile = (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      toast.error('Unsupported file format. Please upload .csv, .xlsx, or .xls')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (rows.length <= 1) {
          toast.error('Spreadsheet is empty or lacks candidate rows')
          return
        }

        // Parse headers dynamically (case-insensitive, trimmed)
        const headers = rows[0].map(h => String(h || '').trim().toLowerCase())

        const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('expert'))
        const emailIdx = headers.findIndex(h => h.includes('email') && !h.includes('expert'))
        const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('position') || h.includes('role'))
        const timeIdx = headers.findIndex(h => (h.includes('time') || h.includes('date') || h.includes('schedule')) && !h.includes('candidate'))
        const expertsIdx = headers.findIndex(h => h.includes('expert') || h.includes('interviewer') || h === 'id' || h.includes(' id') || h.startsWith('id'))

        if (nameIdx === -1 || emailIdx === -1 || titleIdx === -1 || timeIdx === -1) {
          toast.error('Required column headers not found. Check the template structure!')
          return
        }

        const parsedData = []
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
            continue // skip empty rows
          }

          const rawName = row[nameIdx] ? String(row[nameIdx]).trim() : ''
          const rawEmail = row[emailIdx] ? String(row[emailIdx]).trim() : ''
          const rawTitle = row[titleIdx] ? String(row[titleIdx]).trim() : ''
          const rawTime = row[timeIdx] ? String(row[timeIdx]).trim() : ''
          const rawExperts = expertsIdx !== -1 && row[expertsIdx] ? String(row[expertsIdx]).trim() : ''

          const errors = []

          // 1. Candidate Name Validation
          if (!rawName) {
            errors.push('Candidate Name is missing')
          }

          // 2. Candidate Email Validation
          if (!rawEmail) {
            errors.push('Candidate Email is missing')
          } else if (!emailRegex.test(rawEmail)) {
            errors.push('Invalid Candidate Email address')
          }

          // 3. Job Title Validation
          if (!rawTitle) {
            errors.push('Job position / Title is missing')
          }

          // 4. Interview DateTime Validation
          let formattedDate = ''
          if (!rawTime) {
            errors.push('Interview Date & Time is missing')
          } else {
            // Excel stores dates as serial numbers
            if (!isNaN(rawTime) && Number(rawTime) > 40000 && Number(rawTime) < 60000) {
              const jsDate = excelDateToJSDate(Number(rawTime))
              if (!isNaN(jsDate.getTime())) {
                formattedDate = jsDate.toISOString().slice(0, 16)
              } else {
                errors.push('Invalid Date & Time value')
              }
            } else {
              const jsDate = new Date(rawTime)
              if (!isNaN(jsDate.getTime())) {
                formattedDate = jsDate.toISOString().slice(0, 16)
              } else {
                errors.push('Invalid Date & Time format. Use YYYY-MM-DD HH:MM')
              }
            }
          }

          // 5. Experts / Interviewers Validation (lookup by email or ID)
          const mappedInterviewerIds = []
          const expertEmailsList = []
          const unresolvedEmails = []

          if (rawExperts) {
            // Allow comma, semicolon, or line breaks to separate experts
            const expertTokens = rawExperts.split(/[;,\n]+/).map(t => t.trim()).filter(Boolean)

            expertTokens.forEach(token => {
              const isEmail = emailRegex.test(token)
              let foundExpert = null

              if (isEmail) {
                foundExpert = expertsList.find(e => e.email.toLowerCase() === token.toLowerCase())
              } else {
                foundExpert = expertsList.find(e => e._id === token || e.name.toLowerCase() === token.toLowerCase())
              }

              if (foundExpert) {
                mappedInterviewerIds.push(foundExpert._id)
                expertEmailsList.push(foundExpert.email)
              } else {
                unresolvedEmails.push(token)
              }
            })
          }

          if (mappedInterviewerIds.length === 0) {
            errors.push('No matching/active evaluation experts assigned')
          }
          if (unresolvedEmails.length > 0) {
            errors.push(`Expert(s) not found in system: ${unresolvedEmails.join(', ')}`)
          }

          parsedData.push({
            id: i,
            name: rawName,
            email: rawEmail,
            jobPosition: rawTitle,
            scheduledAt: formattedDate,
            interviewerIds: mappedInterviewerIds,
            expertEmails: expertEmailsList,
            unresolvedExperts: unresolvedEmails,
            rawTime,
            rawExperts,
            errors,
            isValid: errors.length === 0
          })
        }

        if (parsedData.length === 0) {
          toast.error('No valid rows found in the uploaded file')
          return
        }

        setParsedInterviews(parsedData)
        setStep('preview')
        toast.success(`Loaded ${parsedData.length} records from spreadsheet`)
      } catch (err) {
        console.error('Error reading spreadsheet file:', err)
        toast.error('Failed to parse file. Make sure it is not corrupt.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Trigger Client-side Download of CSV Template
  const downloadTemplate = () => {
    const headers = ['Candidate Name', 'Candidate Email', 'Job Title', 'Interview Date & Time', 'Expert Email(s)']
    const sampleRows = [
      ['Rohan Sharma', 'rohan.sharma@example.com', 'Machine Learning Engineer', '2026-06-25 10:00', 'expert1@organization.com, expert2@organization.com'],
      ['Priya Patel', 'priya.patel@example.com', 'Senior UI/UX Specialist', '2026-06-26 14:30', 'expert2@organization.com']
    ]

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' // adding BOM for Excel encoding compatibility
      + [headers.join(','), ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'sih_bulk_import_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Template download initiated')
  }

  // Submit parsed valid records to backend
  const handleBulkSubmit = async () => {
    const validRows = parsedInterviews.filter(item => item.isValid)
    if (validRows.length === 0) {
      toast.error('No valid records to upload')
      return
    }

    setSubmitting(true)
    setStep('importing')

    try {
      // Map frontend fields to match backend schema format
      const payload = {
        interviews: validRows.map(item => ({
          name: item.name,
          email: item.email,
          role: item.jobPosition,
          jobPosition: item.jobPosition,
          scheduledAt: item.scheduledAt,
          interviewerIds: item.interviewerIds,
          status: 'scheduled',
          notes: `Imported via Bulk Upload. Assigned Experts: ${item.expertEmails.join(', ')}`,
          meetLink: null,
          roomId: null
        }))
      }

      const response = await fetch('/api/interviews/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        setImportedCount(data.insertedCount)
        setStep('success')
        toast.success(`Successfully scheduled ${data.insertedCount} evaluation panels!`)
      } else {
        setStep('preview')
        toast.error(data.message || 'Failed to bulk import interviews')
      }
    } catch (err) {
      console.error('Error during bulk submit:', err)
      setStep('preview')
      toast.error('Network failure or server error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email)
    toast.success(`Copied: ${email}`, { id: 'copy-email-toast' })
  }

  const filteredExperts = expertsList.filter(exp =>
    exp.name.toLowerCase().includes(searchExpert.toLowerCase()) ||
    exp.email.toLowerCase().includes(searchExpert.toLowerCase())
  )

  const validCount = parsedInterviews.filter(x => x.isValid).length
  const invalidCount = parsedInterviews.filter(x => !x.isValid).length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Dropzone */}
          <div className="lg:col-span-2 space-y-6">
            <div className="pb-2 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Bulk Upload Evaluation Pipelines</h2>
              <p className="text-xs text-gray-400">Import hundreds of candidate profiles and schedule boardroom panel sessions instantly.</p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`p-10 bg-white border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-6 cursor-pointer group transition-all duration-300 ${isDragging ? 'border-indigo-600 bg-indigo-50/50 shadow-md scale-[0.99]' : 'border-gray-200 hover:border-indigo-500 hover:shadow-sm'
                }`}
            >
              <div className={`p-5 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-105 transition-all duration-300 ${isDragging ? 'scale-105 bg-indigo-100' : ''
                }`}>
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-800">Drag & drop your scheduling file here</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Support spreadsheet uploads in <strong className="text-indigo-600">.csv</strong>, <strong className="text-indigo-600">.xls</strong>, or <strong className="text-indigo-600">.xlsx</strong> format. Maximum file size is 10MB.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Button size="sm" variant="solid" color="primary" className="font-semibold text-white px-5 shadow-sm" onClick={triggerFileSelect}>
                  Browse Local Files
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="default"
                  className="font-semibold"
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadTemplate()
                  }}
                  startContent={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  }
                >
                  Download Spreadsheet Template
                </Button>
              </div>
            </div>

            <div className="bg-indigo-50/40 border border-indigo-100/70 rounded-2xl p-5 text-xs text-indigo-900 leading-relaxed space-y-3 shadow-sm">
              <p className="font-bold text-sm text-indigo-950">💡 Standardized Import Workflow Instructions:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-indigo-800 font-medium">
                <li>Download the layout spreadsheet layout template.</li>
                <li>Populate candidate profiles: Name, Email, and job title.</li>
                <li>Set the date format clearly (e.g. <code className="bg-indigo-100/60 px-1 py-0.5 rounded text-[10px] font-mono">YYYY-MM-DD HH:MM</code>).</li>
                <li>Assign panel experts by copying their registered emails from the experts directory.</li>
                <li>Separate multiple emails using commas (e.g. <code className="bg-indigo-100/60 px-1 py-0.5 rounded text-[10px] font-mono">priya@sih.in, rohan@sih.in</code>).</li>
              </ol>
            </div>
          </div>

          {/* Sidebar Panel Experts Directory */}
          <div className="space-y-4">
            <Card className="p-4 bg-white border border-gray-150 shadow-sm rounded-2xl h-[480px] flex flex-col">
              <div className="pb-3 border-b border-gray-100 space-y-2">
                <h3 className="font-bold text-gray-800 text-sm">Experts Directory</h3>
                <p className="text-[11px] text-gray-400">Copy expert emails to map schedules accurately in your template.</p>
                <Input
                  size="sm"
                  placeholder="Search expert name or email..."
                  value={searchExpert}
                  onChange={(e) => setSearchExpert(e.target.value)}
                  variant="bordered"
                  className="mt-2"
                  startContent={
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>

              <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
                {loadingExperts ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-indigo-600"></div>
                    <p className="text-[10px] text-gray-400">Loading directory...</p>
                  </div>
                ) : filteredExperts.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic text-center py-10">No matching experts found</p>
                ) : (
                  filteredExperts.map(expert => {
                    const initials = expert.name ? expert.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'E'
                    return (
                      <div key={expert._id} className="flex justify-between items-center p-2 rounded-xl bg-gray-50 border border-gray-100/50 hover:bg-indigo-50/20 transition-all duration-300">
                        <div className="flex items-center gap-2 max-w-[80%]">
                          <Avatar size="sm" name={initials} className="bg-indigo-100 text-indigo-700 font-bold text-[10px] shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-gray-800 truncate leading-snug">{expert.name}</p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{expert.email}</p>
                          </div>
                        </div>
                        <Tooltip content="Copy Email Address" placement="left">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-gray-400 hover:text-indigo-600 shrink-0"
                            onClick={() => handleCopyEmail(expert.email)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </Button>
                        </Tooltip>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          {/* Preview Statistics Panel */}
          <div className="bg-gradient-to-r from-gray-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-xl font-bold font-sans">Validate Scheduling Import</h2>
              <p className="text-xs text-gray-300 mt-1">Verify parsed records before writing database schedules. Missing experts or incorrect fields are highlighted.</p>
            </div>

            <div className="flex gap-4">
              <Card className="px-4 py-2.5 bg-white/10 backdrop-blur-md border-0 text-white min-w-[120px] text-center">
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Total Rows</p>
                <p className="text-xl font-extrabold mt-0.5">{parsedInterviews.length}</p>
              </Card>
              <Card className="px-4 py-2.5 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/25 text-emerald-300 min-w-[120px] text-center font-bold">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Ready</p>
                <p className="text-xl font-extrabold mt-0.5">{validCount}</p>
              </Card>
              <Card className="px-4 py-2.5 bg-rose-500/20 backdrop-blur-md border border-rose-500/25 text-rose-300 min-w-[120px] text-center font-bold">
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Errors</p>
                <p className="text-xl font-extrabold mt-0.5">{invalidCount}</p>
              </Card>
            </div>
          </div>

          {/* Interactive Preview Table */}
          <Card className="overflow-hidden bg-white border border-gray-150 shadow-sm rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-700 text-xs font-bold uppercase">
                    <th className="py-3.5 px-4 text-center w-16">Row</th>
                    <th className="py-3.5 px-4 w-24">Status</th>
                    <th className="py-3.5 px-4">Candidate Profile</th>
                    <th className="py-3.5 px-4">Role / Job Position</th>
                    <th className="py-3.5 px-4">Interview Schedule</th>
                    <th className="py-3.5 px-4">Assigned Experts</th>
                    <th className="py-3.5 px-4">Validation Feedback / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-750">
                  {parsedInterviews.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/50 transition duration-150 ${!item.isValid ? 'bg-rose-50/20' : ''
                        }`}
                    >
                      <td className="py-4 px-4 text-center font-semibold text-gray-400">{item.id}</td>
                      <td className="py-4 px-4">
                        <Chip
                          color={item.isValid ? 'success' : 'danger'}
                          variant="flat"
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {item.isValid ? 'VALID' : 'INVALID'}
                        </Chip>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-gray-800 leading-snug">{item.name || <span className="text-red-500 italic">Empty Name</span>}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.email || <span className="text-red-500 italic">Empty Email</span>}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-700">
                        {item.jobPosition || <span className="text-red-500 italic">Empty Title</span>}
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-600">
                        {item.scheduledAt ? (
                          new Date(item.scheduledAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                        ) : (
                          <span className="text-red-500 font-bold italic">{item.rawTime || 'Empty DateTime'}</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1 max-w-[200px]">
                          {item.expertEmails.map((email, idx) => (
                            <Chip key={idx} size="sm" variant="dot" color="success" className="font-medium">
                              {email}
                            </Chip>
                          ))}
                          {item.unresolvedExperts.map((token, idx) => (
                            <Chip key={idx} size="sm" variant="dot" color="danger" className="font-medium">
                              Unresolved: {token}
                            </Chip>
                          ))}
                          {item.expertEmails.length === 0 && item.unresolvedExperts.length === 0 && (
                            <span className="text-red-500 italic">No experts set</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {item.isValid ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Ready to import
                          </span>
                        ) : (
                          <div className="text-rose-700 font-medium space-y-1">
                            {item.errors.map((err, idx) => (
                              <p key={idx} className="flex items-start gap-1 leading-snug">
                                <span className="text-rose-500 shrink-0 text-xs">⚠️</span>
                                <span>{err}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Preview Actions */}
          <div className="flex justify-between items-center bg-gray-50 border border-gray-150 p-4 rounded-2xl">
            <Button
              variant="flat"
              color="danger"
              className="font-bold shadow-sm"
              onClick={() => {
                setParsedInterviews([])
                setStep('upload')
              }}
            >
              Discard and Go Back
            </Button>

            <div className="flex gap-3">
              {invalidCount > 0 && (
                <div className="flex items-center text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200/50 px-4 py-2 rounded-xl">
                  ⚠️ Invalid rows will be skipped during import.
                </div>
              )}
              <Button
                variant="solid"
                color="primary"
                className="font-bold text-white px-6 shadow-md"
                disabled={validCount === 0}
                onClick={handleBulkSubmit}
              >
                Confirm & Import {validCount} Panels
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <Card className="p-16 text-center bg-white border border-gray-150 rounded-3xl shadow-sm flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-800">Processing Bulk Operations</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
              Registering candidate credentials, matching expert assignments, and generating panel databases. Please don't close this tab.
            </p>
          </div>
        </Card>
      )}

      {step === 'success' && (
        <Card className="p-12 text-center bg-white border border-gray-150 rounded-3xl shadow-sm flex flex-col items-center justify-center space-y-6">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full scale-110 shadow-sm">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-gray-800 tracking-tight">Bulk Import Complete!</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
              Successfully generated <strong className="text-emerald-600 font-bold">{importedCount} new evaluation panels</strong> in the secure interviews registry. Assigned experts have been updated.
            </p>
          </div>

          <div className="flex gap-4 pt-3">
            <Button
              variant="flat"
              color="primary"
              className="font-bold px-6"
              onClick={() => {
                setParsedInterviews([])
                setStep('upload')
              }}
            >
              Schedule More Candidates
            </Button>
            <Button
              variant="solid"
              color="primary"
              className="font-bold text-white px-6 bg-indigo-600 hover:bg-indigo-700 shadow-md"
              onClick={() => {
                // Reloading will reset dashboard views and fetch the fresh list of scheduled interviews
                window.location.reload()
              }}
            >
              Go to Evaluations Workspace
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
