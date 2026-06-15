'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import NextLink from 'next/link'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Chip,
  User,
  Pagination,
  Link,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@nextui-org/react'
import { format, parseISO } from 'date-fns'
import { SearchIcon } from './SearchIcon'
import { toast } from 'react-hot-toast'
import ResumeViewer from '@/components/ResumeViewer'

const columns = [
  { name: 'ID', uid: '_id', sortable: true },
  { name: 'NAME', uid: 'name', sortable: true },
  { name: 'ROLE', uid: 'jobPosition', sortable: true },
  { name: 'RESUME', uid: 'resumeLink' },
  { name: 'STATUS', uid: 'status', sortable: true },
  { name: 'INTERVIEW DATE', uid: 'interviewTime', sortable: true },
  { name: 'REPORT', uid: 'report' },
]

const statusColorMap = {
  selected: 'success',
  rejected: 'danger',
  completed: 'primary',
  pending: 'warning',
}

const baseColumns = [
  '_id',
  'name',
  'jobPosition',
  'status',
  'interviewTime',
  'resumeLink',
  'report',
]

export default function PastTableComponent({ userId }) {
  const [filterValue, setFilterValue] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(new Set([]))
  const [visibleColumns] = useState(new Set(baseColumns))
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [sortDescriptor, setSortDescriptor] = useState({
    column: 'name',
    direction: 'ascending',
  })
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedResume, setSelectedResume] = useState(null)

  const hasSearchFilter = Boolean(filterValue)

  const handleOpenPreview = (userItem) => {
    setSelectedResume(userItem)
    setIsPreviewOpen(true)
  }

  const fetchInterviews = useCallback(async () => {
    setLoading(true)
    try {
      if (!userId) {
        console.error('No userId provided')
        return
      }

      const response = await fetch('/api/interviews/past', {
        headers: {
          userid: userId,
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      const data = await response.json()
      if (response.ok) {
        setUsers(data.candidates || [])
      } else {
        console.error('API error message:', data.message)
      }
    } catch (error) {
      console.error('Error fetching interviews:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  const handleStatusChange = async (interviewId, newStatus) => {
    try {
      const response = await fetch('/api/interviews/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          interviewId,
          status: newStatus,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u._id === interviewId ? { ...u, status: newStatus } : u))
        )
        toast.success(`Status updated to ${newStatus}`)
      } else {
        toast.error(data.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error updating candidate status')
    }
  }

  const headerColumns = useMemo(() => {
    return columns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid)
    )
  }, [visibleColumns])

  const filteredItems = useMemo(() => {
    let filteredUsers = [...users]

    if (hasSearchFilter) {
      filteredUsers = filteredUsers.filter((user) =>
        user.name?.toLowerCase().includes(filterValue.toLowerCase())
      )
    }
    return filteredUsers
  }, [users, filterValue, hasSearchFilter])

  const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    const end = start + rowsPerPage

    return filteredItems.slice(start, end)
  }, [page, filteredItems, rowsPerPage])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aValue = a[sortDescriptor.column] || ''
      const bValue = b[sortDescriptor.column] || ''
      const cmp = aValue < bValue ? -1 : aValue > bValue ? 1 : 0

      return sortDescriptor.direction === 'descending' ? -cmp : cmp
    })
  }, [sortDescriptor, items])

  const formatDate = (dateString) => {
    let date
    try {
      date = parseISO(dateString)
    } catch (error) {
      console.error('Error parsing date:', dateString, error)
      date = new Date(dateString)
    }
    if (isNaN(date.getTime())) {
      return { formattedDate: 'Invalid Date', formattedTime: '' }
    }
    const formattedDate = format(date, 'MMM dd, yyyy')
    const formattedTime = format(date, 'hh:mm a')
    return { formattedDate, formattedTime }
  }

  const renderCell = useCallback((user, columnKey) => {
    const cellValue = user[columnKey]

    switch (columnKey) {
      case '_id':
        return (
          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            EXT-{cellValue?.slice(-4)}
          </span>
        )
      case 'name':
        return (
          <User
            avatarProps={{
              radius: 'full',
              size: 'sm',
              className: 'bg-indigo-100 text-indigo-700 font-semibold uppercase',
              name: cellValue?.charAt(0)
            }}
            description={user.email}
            name={<span className="font-semibold text-gray-800">{cellValue}</span>}
          />
        )
      case 'jobPosition':
        return (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700 capitalize">{cellValue}</span>
            {user.department && (
              <span className="text-xs text-gray-400 capitalize">{user.department}</span>
            )}
          </div>
        )
      case 'status':
        return (
          <Dropdown>
            <DropdownTrigger>
              <Chip
                className="capitalize text-xs font-bold px-2 cursor-pointer hover:opacity-85 transition"
                color={statusColorMap[user.status] || 'default'}
                size="sm"
                variant="flat"
              >
                {cellValue || 'Completed'}
              </Chip>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Update Candidate Status"
              onAction={(key) => handleStatusChange(user._id, key)}
            >
              <DropdownItem key="selected" className="text-success font-semibold">Selected</DropdownItem>
              <DropdownItem key="rejected" className="text-danger font-semibold">Rejected</DropdownItem>
              <DropdownItem key="completed" className="text-primary font-semibold">Completed</DropdownItem>
              <DropdownItem key="pending" className="text-warning font-semibold">Pending</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )
      case 'interviewTime':
        const { formattedDate, formattedTime } = formatDate(cellValue)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-700">{formattedDate}</span>
            <span className="text-xs text-gray-400 font-semibold">{formattedTime}</span>
          </div>
        )
      case 'resumeLink':
        if (!cellValue) {
          return <span className="text-xs text-gray-400 font-medium">N/A</span>
        }
        return (
          // <Button
          //   color="default"
          //   variant="flat"
          //   size="sm"
          //   as={Link}
          //   href={cellValue}
          //   target="_blank"
          //   rel="noopener noreferrer"
          //   className="text-xs font-bold hover:bg-gray-200"
          //   startContent={
          //     <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          //     </svg>
          //   }
          // >
          //   Resume
          // </Button>
          <Button
            color="default"
            variant="flat"
            size="sm"
            onPress={() => handleOpenPreview(user)}
            className="text-xs font-bold hover:bg-gray-200"
            startContent={
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          >
            View
          </Button>
        )
      case 'report':
        return (
          <Button
            color="secondary"
            variant="flat"
            size="sm"
            as={NextLink}
            href={`/questions?interviewId=${user._id}`}
            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            startContent={
              <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            View Report
          </Button>
        )
      default:
        return cellValue || 'N/A'
    }
  }, [])

  const onNextPage = useCallback(() => {
    if (page < pages) {
      setPage(page + 1)
    }
  }, [page, pages])

  const onPreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1)
    }
  }, [page])

  const onRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(Number(e.target.value))
    setPage(1)
  }, [])

  const onSearchChange = useCallback((value) => {
    if (value) {
      setFilterValue(value)
      setPage(1)
    } else {
      setFilterValue('')
    }
  }, [])

  const onClear = useCallback(() => {
    setFilterValue('')
    setPage(1)
  }, [])

  const topContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:max-w-[50%]">
            <Input
              isClearable
              className="w-full"
              placeholder="Search completed evaluations by name..."
              startContent={<SearchIcon />}
              value={filterValue}
              onClear={() => onClear()}
              onValueChange={onSearchChange}
              variant="bordered"
              size="sm"
            />
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={fetchInterviews}
              isLoading={loading}
              className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl min-w-[36px] h-[36px] transition-all duration-300"
              title="Refresh completed evaluations"
            >
              {!loading && (
                <svg className="w-4 h-4 transition-transform duration-500 hover:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }, [filterValue, onClear, onSearchChange, fetchInterviews, loading])

  const bottomContent = useMemo(() => {
    return (
      <div className="py-2 px-2 flex justify-between items-center border-t border-gray-100">
        <div className="flex items-center gap-2">
          <small className="text-gray-400 font-medium">Rows per page:</small>
          <select
            className="bg-white text-gray-700 rounded-md border border-gray-200 p-1 text-xs outline-none"
            value={rowsPerPage}
            onChange={onRowsPerPageChange}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
        </div>
        <Pagination
          showControls
          showShadow
          color="primary"
          page={page}
          onChange={(newPage) => setPage(newPage)}
          total={pages}
          onNext={onNextPage}
          onPrevious={onPreviousPage}
          size="sm"
        />
      </div>
    )
  }, [
    page,
    pages,
    rowsPerPage,
    onRowsPerPageChange,
    onNextPage,
    onPreviousPage,
  ])

  return (
    <div className="space-y-4">
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block">
        <Table
          aria-label="User Data Table"
          sortDescriptor={sortDescriptor}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          onSortChange={setSortDescriptor}
          topContent={topContent}
          bottomContent={bottomContent}
          shadow="none"
          className="border border-gray-150 rounded-2xl bg-white overflow-hidden p-2"
        >
          <TableHeader columns={headerColumns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={column.uid === 'resumeLink' || column.uid === 'status' || column.uid === 'report' ? 'center' : 'start'}
                allowsSorting={column.sortable}
                className="bg-gray-50/75 text-gray-500 font-bold text-xs uppercase"
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            emptyContent={loading ? 'Loading past evaluations...' : 'No past evaluations found.'}
            items={sortedItems}
          >
            {(item) => (
              <TableRow key={item._id} className="border-b border-gray-50 hover:bg-gray-50/50 last:border-0 transition duration-150">
                {(columnKey) => (
                  <TableCell className="py-3.5">{renderCell(item, columnKey)}</TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-4">
        {/* Top Content for Search */}
        <div className="p-1">
          {topContent}
        </div>

        {/* Loading / Empty / Card list */}
        {loading ? (
          <div className="text-center py-8 text-gray-500 font-medium">
            Loading past evaluations...
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 font-medium border border-dashed border-gray-200 rounded-2xl bg-white">
            No past evaluations found.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedItems.map((item) => {
              const { formattedDate, formattedTime } = formatDate(item.interviewTime)
              return (
                <div key={item._id} className="p-4 bg-white border border-gray-150 rounded-2xl shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm uppercase">
                        {item.name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-400">{item.email}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      EXT-{item._id?.slice(-4)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-gray-50 py-2">
                    <div>
                      <p className="text-gray-400 font-semibold uppercase text-[10px]">Position</p>
                      <p className="font-semibold text-gray-700 capitalize">{item.jobPosition}</p>
                      {item.department && <p className="text-[10px] text-gray-400 capitalize">{item.department}</p>}
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold uppercase text-[10px]">Interview Date</p>
                      <p className="font-medium text-gray-700">{formattedDate}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{formattedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-2">
                    <div>
                      <p className="text-gray-400 font-semibold uppercase text-[10px] mb-1">Status</p>
                      <Dropdown>
                        <DropdownTrigger>
                          <Chip
                            className="capitalize text-xs font-bold px-2 cursor-pointer hover:opacity-85 transition"
                            color={statusColorMap[item.status] || 'default'}
                            size="sm"
                            variant="flat"
                          >
                            {item.status || 'Completed'}
                          </Chip>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label="Update Candidate Status"
                          onAction={(key) => handleStatusChange(item._id, key)}
                        >
                          <DropdownItem key="selected" className="text-success font-semibold">Selected</DropdownItem>
                          <DropdownItem key="rejected" className="text-danger font-semibold">Rejected</DropdownItem>
                          <DropdownItem key="completed" className="text-primary font-semibold">Completed</DropdownItem>
                          <DropdownItem key="pending" className="text-warning font-semibold">Pending</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {/* Resume Action */}
                    {item.resumeLink ? (
                      <Button
                        color="default"
                        variant="flat"
                        size="sm"
                        as={Link}
                        href={item.resumeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold flex-1"
                        startContent={
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        }
                      >
                        Resume
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium flex-1 text-center py-2 bg-gray-50 rounded-xl">No Resume</span>
                    )}

                    {/* Report Action */}
                    <Button
                      color="secondary"
                      variant="flat"
                      size="sm"
                      as={NextLink}
                      href={`/questions?interviewId=${item._id}`}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex-1"
                      startContent={
                        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      }
                    >
                      Report
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom Content for Pagination */}
        <div className="p-1">
          {bottomContent}
        </div>
      </div>

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
                Candidate Resume Viewer
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
