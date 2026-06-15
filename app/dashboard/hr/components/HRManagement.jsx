'use client'

import React, { useState, useEffect } from 'react'
import { Card, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, User, Chip, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@nextui-org/react'
import { toast } from 'react-hot-toast'
import { useUser } from '@/app/context/user'

export default function HRManagement() {
  const { user } = useUser()
  const [hrList, setHrList] = useState([])
  const [leadEmail, setLeadEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingHr, setDeletingHr] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Add HR form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [designation, setDesignation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit HR form state
  const [editingHr, setEditingHr] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDesignation, setEditDesignation] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchHRList = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/hr', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setHrList(data.hrList || [])
        setLeadEmail(data.leadRecruiterEmail || '')
      } else {
        toast.error('Failed to load HR team directory')
      }
    } catch (err) {
      console.error('Error fetching HR list:', err)
      toast.error('Failed to connect to team service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHRList()
  }, [])

  const handleAddHR = async (e) => {
    e.preventDefault()

    if (!name.trim() || !email.trim()) {
      toast.error('Name and Email are required')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/hr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          designation: designation.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('HR coordinator added successfully')
        setIsAddOpen(false)
        setName('')
        setEmail('')
        setDesignation('')
        fetchHRList() // reload table
      } else {
        toast.error(data.message || 'Failed to add HR coordinator')
      }
    } catch (err) {
      console.error('Error submitting HR:', err)
      toast.error('Internal server error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (hr) => {
    setEditingHr(hr)
    setEditName(hr.name || '')
    setEditEmail(hr.email || '')
    setEditDesignation(hr.designation || '')
    setIsEditOpen(true)
  }

  const handleUpdateHR = async (e) => {
    e.preventDefault()

    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Name and Email are required')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch('/api/hr', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: editingHr._id,
          name: editName.trim(),
          email: editEmail.trim(),
          designation: editDesignation.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Coordinator updated successfully')
        setIsEditOpen(false)
        fetchHRList() // reload table
      } else {
        toast.error(data.message || 'Failed to update coordinator')
      }
    } catch (err) {
      console.error('Error updating HR coordinator:', err)
      toast.error('Server error occurred')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteClick = (hr) => {
    setDeletingHr(hr)
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingHr) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/hr?id=${deletingHr._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('HR coordinator deleted successfully')
        setIsDeleteOpen(false)
        setDeletingHr(null)
        fetchHRList()
      } else {
        toast.error(data.message || 'Failed to delete HR coordinator')
      }
    } catch (err) {
      console.error('Error deleting HR:', err)
      toast.error('Server error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Recruitment Team Coordinators</h2>
          <p className="text-xs text-gray-400">View and register recruitment coordinators and HR members within your organization.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            className="font-semibold shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200"
            onClick={fetchHRList}
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
            onClick={() => setIsAddOpen(true)}
          >
            Add Coordinator
          </Button>
        </div>
      </div>

      <Card className="border border-gray-150 shadow-sm p-4 bg-white rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
            <p className="text-sm text-gray-500 font-medium">Loading team coordinators...</p>
          </div>
        ) : hrList.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base font-bold">No active HR coordinators registered</p>
            <p className="text-xs text-gray-400 mt-1">Click the "Add Coordinator" button above to add HR managers.</p>
          </div>
        ) : (
          <Table aria-label="HR team list table" shadow="none">
            <TableHeader>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">COORDINATOR</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">DESIGNATION / ROLE</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">ORGANIZATION</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">STATUS</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold text-center">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody>
              {hrList.map((hr) => {
                const initials = hr.name ? hr.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'HR'
                return (
                  <TableRow key={hr._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <TableCell>
                      <User
                        name={<span className="font-semibold text-gray-800">{hr.name}</span>}
                        description={hr.email}
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
                        {hr.designation || 'HR Coordinator'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {hr.organization || 'Internal'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color="success"
                        variant="flat"
                        size="sm"
                        className="font-bold text-[10px]"
                      >
                        Active
                      </Chip>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        {((user && leadEmail && user.email.toLowerCase() === leadEmail.toLowerCase()) || (user && hr.email.toLowerCase() === user.email.toLowerCase())) && (
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="font-semibold"
                            onClick={() => handleEditClick(hr)}
                          >
                            Edit Details
                          </Button>
                        )}
                        {user && leadEmail && user.email.toLowerCase() === leadEmail.toLowerCase() && hr.email.toLowerCase() !== user.email.toLowerCase() && (
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            className="font-semibold"
                            onClick={() => handleDeleteClick(hr)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add HR Modal */}
      <Modal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleAddHR}>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Register HR Coordinator
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                <Input
                  label="Name"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Email"
                  placeholder="Enter email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Designation"
                  placeholder="e.g. Talent Acquisition Partner"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  variant="bordered"
                />
                <div className="text-[11px] text-gray-400 leading-relaxed px-1">
                  💡 The new coordinator will automatically inherit your organization and receives temporary login details via email.
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
                  Create Coordinator
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit HR Modal */}
      <Modal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateHR}>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Edit Coordinator Details
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                <Input
                  label="Name"
                  placeholder="Enter coordinator name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Email"
                  placeholder="Enter email address"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Designation"
                  placeholder="e.g. Talent Acquisition Partner"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  variant="bordered"
                />
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button color="danger" variant="flat" onPress={onClose} className="font-semibold">
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isLoading={updating}
                  className="font-semibold text-white px-5 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Save Changes
                </Button>
              </ModalFooter>
            </form>
           )}
        </ModalContent>
      </Modal>

      {/* Delete HR Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} placement="center" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <div className="p-1">
              <ModalHeader className="flex flex-col gap-1 text-red-650 font-bold border-b border-gray-100">
                Confirm Deletion
              </ModalHeader>
              <ModalBody className="py-6">
                <p className="text-gray-700 font-medium">Are you sure you want to delete HR coordinator <strong className="text-gray-900">"{deletingHr?.name}"</strong>?</p>
                <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 p-3 rounded mt-2 leading-relaxed">
                  ⚠️ WARNING: This will permanently remove the HR coordinator from the system.
                </p>
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button variant="flat" color="default" onPress={onClose} className="font-semibold">
                  Cancel
                </Button>
                <Button 
                  color="danger" 
                  onClick={handleDeleteConfirm}
                  isLoading={deleting}
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
