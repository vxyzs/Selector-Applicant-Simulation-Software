'use client'

import React, { useState, useEffect } from 'react'
import { Card, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, User, Chip, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@nextui-org/react'
import { toast } from 'react-hot-toast'
import Lottie from 'lottie-react'
import animationDataload from '@/components/lottie/loading.json'
import { useUser } from '@/app/context/user'
import { withRoleProtection } from '@/middleware/clientAuthorization'

function AdminDashboard() {
  const { user } = useUser()
  const [orgList, setOrgList] = useState([])
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalHRs: 0,
    totalExperts: 0,
    totalCandidates: 0
  })
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Form states
  const [orgName, setOrgName] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [recruiterEmail, setRecruiterEmail] = useState('')
  const [recruiterDesignation, setRecruiterDesignation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit/Delete target state
  const [targetOrg, setTargetOrg] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/organizations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setOrgList(data.organizations || [])
        if (data.stats) {
          setStats(data.stats)
        }
      } else {
        const errData = await response.json()
        toast.error(errData.message || 'Failed to load platform organizations')
      }
    } catch (err) {
      console.error('Error fetching admin data:', err)
      toast.error('Failed to connect to administrative service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddOrg = async (e) => {
    e.preventDefault()

    if (!orgName.trim() || !recruiterName.trim() || !recruiterEmail.trim()) {
      toast.error('Organization Name, Lead Recruiter Name, and Email are required')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: orgName.trim(),
          leadRecruiterName: recruiterName.trim(),
          leadRecruiterEmail: recruiterEmail.trim(),
          leadRecruiterDesignation: recruiterDesignation.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Organization & Lead Recruiter created!')
        setIsAddOpen(false)
        setOrgName('')
        setRecruiterName('')
        setRecruiterEmail('')
        setRecruiterDesignation('')
        fetchData()
      } else {
        toast.error(data.message || 'Failed to add organization')
      }
    } catch (err) {
      console.error('Error submitting organization:', err)
      toast.error('Server error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (org) => {
    setTargetOrg(org)
    setOrgName(org.name || '')
    setRecruiterName(org.leadRecruiterName || '')
    setRecruiterEmail(org.leadRecruiterEmail || '')
    setRecruiterDesignation(org.leadRecruiterDesignation || '')
    setIsEditOpen(true)
  }

  const handleUpdateOrg = async (e) => {
    e.preventDefault()

    if (!orgName.trim() || !recruiterName.trim() || !recruiterEmail.trim()) {
      toast.error('Organization Name, Lead Recruiter Name, and Email are required')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/organizations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: targetOrg._id,
          name: orgName.trim(),
          leadRecruiterName: recruiterName.trim(),
          leadRecruiterEmail: recruiterEmail.trim(),
          leadRecruiterDesignation: recruiterDesignation.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Organization updated successfully')
        setIsEditOpen(false)
        setOrgName('')
        setRecruiterName('')
        setRecruiterEmail('')
        setRecruiterDesignation('')
        setTargetOrg(null)
        fetchData()
      } else {
        toast.error(data.message || 'Failed to update organization')
      }
    } catch (err) {
      console.error('Error updating organization:', err)
      toast.error('Server error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (org) => {
    setTargetOrg(org)
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/organizations?id=${targetOrg._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Organization deleted successfully')
        setIsDeleteOpen(false)
        setTargetOrg(null)
        fetchData()
      } else {
        toast.error(data.message || 'Failed to delete organization')
      }
    } catch (err) {
      console.error('Error deleting organization:', err)
      toast.error('Server error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Lottie
            animationData={animationDataload}
            style={{ height: '150px', width: '150px' }}
          />
          <p className="text-gray-800 font-medium">Loading Admin Portal...</p>
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex flex-col relative overflow-hidden">
      <div className="max-w-6xl mx-auto w-full z-10 space-y-8">

        {/* Banner Section */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans">Developer Admin Workspace</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage enterprise organizations, onboarding systems, and monitor platform utilization statistics.</p>
          </div>
          <Card className="p-4 bg-white/10 backdrop-blur-md border-0 text-white min-w-[240px]">
            <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Admin Account</p>
            <p className="text-md font-bold truncate mt-1">{user.email}</p>
            <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold mt-3">Access Tier</p>
            <Chip color="secondary" variant="flat" size="sm" className="mt-1 text-white border-white/20 capitalize bg-purple-500/20">{user.role}</Chip>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border border-gray-100 bg-white shadow-sm flex flex-col justify-between min-h-[100px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Organizations</span>
            <span className="text-3xl font-extrabold text-indigo-600 mt-2">{stats.totalOrgs}</span>
          </Card>
          <Card className="p-4 border border-gray-100 bg-white shadow-sm flex flex-col justify-between min-h-[100px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">HR Coordinators</span>
            <span className="text-3xl font-extrabold text-teal-600 mt-2">{stats.totalHRs}</span>
          </Card>
          <Card className="p-4 border border-gray-100 bg-white shadow-sm flex flex-col justify-between min-h-[100px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Experts</span>
            <span className="text-3xl font-extrabold text-amber-600 mt-2">{stats.totalExperts}</span>
          </Card>
          <Card className="p-4 border border-gray-100 bg-white shadow-sm flex flex-col justify-between min-h-[100px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered Candidates</span>
            <span className="text-3xl font-extrabold text-blue-600 mt-2">{stats.totalCandidates}</span>
          </Card>
        </div>

        {/* Organizations Core CRUD Card */}
        <Card className="p-6 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 w-full space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-100 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Platform Organizations</h2>
              <p className="text-xs text-gray-400">View and administer registered enterprise environments and their active lead recruiters.</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                className="font-semibold shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 w-"
                onClick={fetchData}
              >
                <svg className="w-4 h-4 transition-transform duration-500 hover:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </Button>
              <Button
                size="sm"
                color="primary"
                variant="solid"
                className="font-semibold shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  setOrgName('')
                  setRecruiterName('')
                  setRecruiterEmail('')
                  setRecruiterDesignation('')
                  setIsAddOpen(true)
                }}
              >
                Add Organization
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
              <p className="text-sm text-gray-500 font-medium">Loading platform data...</p>
            </div>
          ) : orgList.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-base font-bold">No organizations registered yet</p>
              <p className="text-xs text-gray-400 mt-1">Click the "Add Organization" button above to add enterprise recruiters onto the platform.</p>
            </div>
          ) : (
            <Table aria-label="Organizations directory" shadow="none">
              <TableHeader>
                <TableColumn className="bg-gray-50 text-gray-500 font-bold">ORGANIZATION</TableColumn>
                <TableColumn className="bg-gray-50 text-gray-500 font-bold">LEAD RECRUITER</TableColumn>
                <TableColumn className="bg-gray-50 text-gray-500 font-bold">DESIGNATION</TableColumn>
                <TableColumn className="bg-gray-50 text-gray-500 font-bold">CREATED DATE</TableColumn>
                <TableColumn className="bg-gray-50 text-gray-500 font-bold text-center">ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {orgList.map((org) => {
                  const initials = org.leadRecruiterName ? org.leadRecruiterName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'HR'
                  return (
                    <TableRow key={org._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <TableCell>
                        <span className="font-semibold text-gray-800 tracking-wide">{org.name}</span>
                      </TableCell>
                      <TableCell>
                        <User
                          name={<span className="font-semibold text-gray-800">{org.leadRecruiterName}</span>}
                          description={org.leadRecruiterEmail}
                          avatarProps={{
                            radius: 'full',
                            size: 'sm',
                            className: 'bg-indigo-100 text-indigo-700 font-bold uppercase',
                            name: initials
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-gray-600">
                          {org.leadRecruiterDesignation || 'Lead Recruiter'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-400">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="font-semibold"
                            onClick={() => handleEditClick(org)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            className="font-semibold"
                            onClick={() => handleDeleteClick(org)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Card>

      </div>

      {/* Add Org Modal */}
      <Modal isOpen={isAddOpen} onOpenChange={setIsAddOpen} placement="center" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleAddOrg}>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Register New Organization
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                <Input
                  label="Organization Name"
                  placeholder="e.g. Google"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Lead Recruiter Name"
                  placeholder="e.g. Jane Doe"
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Lead Recruiter Email"
                  placeholder="e.g. jane@google.com"
                  type="email"
                  value={recruiterEmail}
                  onChange={(e) => setRecruiterEmail(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Lead Recruiter Designation"
                  placeholder="e.g. Talent Acquisition Director"
                  value={recruiterDesignation}
                  onChange={(e) => setRecruiterDesignation(e.target.value)}
                  variant="bordered"
                />
                <div className="text-[11px] text-gray-400 leading-relaxed px-1">
                  💡 Creating an organization automatically registers its Lead Recruiter user account and sends them onboarding instructions and login credentials via email.
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button color="danger" variant="flat" onPress={onClose} className="font-semibold">
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isLoading={submitting}
                  className="font-semibold text-white px-5 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Create Organization
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Org Modal */}
      <Modal isOpen={isEditOpen} onOpenChange={setIsEditOpen} placement="center" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateOrg}>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Edit Organization Details
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                <Input
                  label="Organization Name"
                  placeholder="e.g. Google"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Lead Recruiter Name"
                  placeholder="e.g. Jane Doe"
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Lead Recruiter Email"
                  placeholder="e.g. jane@google.com"
                  type="email"
                  value={recruiterEmail}
                  onChange={(e) => setRecruiterEmail(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Lead Recruiter Designation"
                  placeholder="e.g. Talent Acquisition Director"
                  value={recruiterDesignation}
                  onChange={(e) => setRecruiterDesignation(e.target.value)}
                  variant="bordered"
                />
                <div className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 leading-relaxed">
                  ⚠️ <strong>Notice:</strong> Changing the recruiter email deletes the old lead recruiter user account and creates a new account. An onboarding email will be sent to the new email address.
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button color="danger" variant="flat" onPress={onClose} className="font-semibold">
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isLoading={submitting}
                  className="font-semibold text-white px-5 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Save Changes
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Org Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} placement="center" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <div className="p-1">
              <ModalHeader className="flex flex-col gap-1 text-red-600 font-bold border-b border-gray-100">
                Confirm Deletion
              </ModalHeader>
              <ModalBody className="py-6">
                <p className="text-gray-700 font-medium">Are you sure you want to delete the organization <strong className="text-gray-900">"{targetOrg?.name}"</strong>?</p>
                <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 p-3 rounded mt-2 leading-relaxed">
                  ⚠️ CAUTION: This operation is irreversible. This will delete the organization and cascade delete ALL associated users (HR coordinators, experts, candidates) belonging to it.
                </p>
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button variant="flat" color="default" onPress={onClose} className="font-semibold">
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onClick={handleDeleteConfirm}
                  isLoading={submitting}
                  className="font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm"
                >
                  Confirm Delete
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>

    </div>
  )
}

export default withRoleProtection(AdminDashboard, ['admin'])
