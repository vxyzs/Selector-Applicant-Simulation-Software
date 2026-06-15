'use client'

import React, { useState, useEffect } from 'react'
import { Card, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, User, Chip, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@nextui-org/react'
import { toast } from 'react-hot-toast'

export default function ExpertManagement() {
  const [expertsList, setExpertsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Add Expert form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit Expert form state
  const [editingExpert, setEditingExpert] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editSpecialization, setEditSpecialization] = useState('')
  const [updating, setUpdating] = useState(false)

  // Delete Expert state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingExpert, setDeletingExpert] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchExperts = async () => {
    setLoading(true)
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
      console.error('Error fetching experts list:', err)
      toast.error('Failed to connect to experts service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExperts()
  }, [])

  const handleAddExpert = async (e) => {
    e.preventDefault()

    if (!name.trim() || !email.trim()) {
      toast.error('Name and Email are required')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/experts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          specialization: specialization.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Expert added successfully')
        setIsAddOpen(false)
        setName('')
        setEmail('')
        setSpecialization('')
        fetchExperts() // reload table
      } else {
        toast.error(data.message || 'Failed to add expert')
      }
    } catch (err) {
      console.error('Error submitting expert:', err)
      toast.error('Internal server error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (expert) => {
    setEditingExpert(expert)
    setEditName(expert.name || '')
    setEditEmail(expert.email || '')
    setEditSpecialization(expert.specialization || expert.department || '')
    setIsEditOpen(true)
  }

  const handleUpdateExpert = async (e) => {
    e.preventDefault()

    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Name and Email are required')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch('/api/experts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: editingExpert._id,
          name: editName.trim(),
          email: editEmail.trim(),
          specialization: editSpecialization.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Expert updated successfully')
        setIsEditOpen(false)
        fetchExperts() // reload table
      } else {
        toast.error(data.message || 'Failed to update expert')
      }
    } catch (err) {
      console.error('Error updating expert details:', err)
      toast.error('Server error occurred')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteClick = (expert) => {
    setDeletingExpert(expert)
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingExpert) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/experts?id=${deletingExpert._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Expert deleted successfully')
        setIsDeleteOpen(false)
        setDeletingExpert(null)
        fetchExperts()
      } else {
        toast.error(data.message || 'Failed to delete expert')
      }
    } catch (err) {
      console.error('Error deleting expert:', err)
      toast.error('Server error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Expert Examiner Panels</h2>
          <p className="text-xs text-gray-400">View and register professional domain experts for scientific boardrooms.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            className="font-semibold shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200"
            onClick={fetchExperts}
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
            Add Expert
          </Button>
        </div>
      </div>

      <Card className="border border-gray-150 shadow-sm p-4 bg-white rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
            <p className="text-sm text-gray-500 font-medium">Loading panel experts...</p>
          </div>
        ) : expertsList.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base font-bold">No active experts registered</p>
            <p className="text-xs text-gray-400 mt-1">Click the "Add Expert" button above to register a panel expert.</p>
          </div>
        ) : (
          <Table aria-label="Experts list table" shadow="none">
            <TableHeader>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">EXPERT PANEL</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">SPECIALIZATION / DEPT</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">ORGANIZATION</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold">STATUS</TableColumn>
              <TableColumn className="bg-gray-50 text-gray-500 font-bold text-center">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody>
              {expertsList.map((expert) => {
                const initials = expert.name ? expert.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'E'
                return (
                  <TableRow key={expert._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <TableCell>
                      <User
                        name={<span className="font-semibold text-gray-800">{expert.name}</span>}
                        description={expert.email}
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
                        {expert.specialization || expert.department || 'General Science'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {expert.organization || 'Internal'}
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
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="font-semibold"
                          onClick={() => handleEditClick(expert)}
                        >
                          Edit Details
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          className="font-semibold"
                          onClick={() => handleDeleteClick(expert)}
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

      {/* Add Expert Modal */}
      <Modal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleAddExpert}>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Register Panel Expert
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                <Input
                  label="Expert Name"
                  placeholder="Enter expert's full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Expert Email"
                  placeholder="Enter expert's email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Specialization / Department"
                  placeholder="e.g. AI / Machine Learning"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  variant="bordered"
                />
                <div className="text-[11px] text-gray-400 leading-relaxed px-1">
                  💡 The expert's organization affiliation will be automatically inherited. A secure invitation password will be assigned.
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
                  Create Expert
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Expert Modal */}
      <Modal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateExpert}>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Edit Expert Details
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                <Input
                  label="Expert Name"
                  placeholder="Enter expert's name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Expert Email"
                  placeholder="Enter expert's email address"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Specialization / Department"
                  placeholder="e.g. AI / Machine Learning"
                  value={editSpecialization}
                  onChange={(e) => setEditSpecialization(e.target.value)}
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

      {/* Delete Expert Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} placement="center" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <div className="p-1">
              <ModalHeader className="flex flex-col gap-1 text-red-600 font-bold border-b border-gray-100">
                Confirm Deletion
              </ModalHeader>
              <ModalBody className="py-6">
                <p className="text-gray-700 font-medium">Are you sure you want to delete expert <strong className="text-gray-900">"{deletingExpert?.name}"</strong>?</p>
                <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 p-3 rounded mt-2 leading-relaxed">
                  ⚠️ WARNING: This will permanently remove the expert from the system.
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
