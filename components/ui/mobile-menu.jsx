"use client"

import { useState, useRef, useEffect } from "react"
import { Transition } from "@headlessui/react"
import Link from "next/link"
import { useUser } from "@/app/context/user"
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input } from "@nextui-org/react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

export default function MobileMenu() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, logout } = useUser()
  const trigger = useRef(null)
  const mobileNav = useRef(null)
  const router = useRouter()

  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // close the mobile menu on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!mobileNav.current || !trigger.current) return
      if (
        !mobileNavOpen ||
        mobileNav.current.contains(target) ||
        trigger.current.contains(target)
      )
        return
      setMobileNavOpen(false)
    }
    document.addEventListener("click", clickHandler)
    return () => document.removeEventListener("click", clickHandler)
  })

  // close the mobile menu if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!mobileNavOpen || keyCode !== 27) return
      setMobileNavOpen(false)
    }
    document.addEventListener("keydown", keyHandler)
    return () => document.removeEventListener("keydown", keyHandler)
  })

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleChangePassword = async (onClose) => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
        setMobileNavOpen(false);
      } else {
        toast.error(data.message || 'Failed to update password');
      }
    } catch (err) {
      console.error('Password change error:', err);
      toast.error('Internal server error');
    } finally {
      setPasswordLoading(false);
    }
  };
  return (
    <div className="flex md:hidden">
      {/* Hamburger button */}
      <button
        ref={trigger}
        className={`hamburger ${mobileNavOpen && "active"}`}
        aria-controls="mobile-nav"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        <span className="sr-only">Menu</span>
        <svg
          className="w-6 h-6 fill-current text-gray-900"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect y="4" width="24" height="2" />
          <rect y="11" width="24" height="2" />
          <rect y="18" width="24" height="2" />
        </svg>
      </button>

      {/* Mobile navigation */}
      <div ref={mobileNav}>
        <Transition
          show={mobileNavOpen}
          as="nav"
          id="mobile-nav"
          className="absolute top-full h-screen pb-16 z-20 left-0 w-full overflow-scroll bg-white"
          enter="transition ease-out duration-200 transform"
          enterFrom="opacity-0 -translate-y-2"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ul className="px-5 py-2">
            {!user ? (
              <>
                <li>
                  <Link
                    href="/signin"
                    className="flex font-medium w-full text-gray-600 hover:text-gray-900 py-2 justify-center"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="btn-sm text-gray-200 bg-gray-900 hover:bg-gray-800 w-full my-2"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <span>Sign up</span>
                    <svg
                      className="w-3 h-3 fill-current text-gray-400 shrink-0 ml-2 -mr-1"
                      viewBox="0 0 12 12"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.707 5.293L7 .586 5.586 2l3 3H0v2h8.586l-3 3L7 11.414l4.707-4.707a1 1 0 000-1.414z"
                        fill="#999"
                        fillRule="nonzero"
                      />
                    </svg>
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="flex flex-col space-y-2">
                {user.role === 'expert' && (
                  <Button
                    href={`/dashboard/expert?id=${user._id}`}
                    as={Link}
                    color="transparent"
                    className="flex items-center text-gray-600 bg-slate-300 hover:bg-slate-400 px-4 py-2 rounded-md transition duration-150 ease-in-out"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m-6 0l-3-3V8m6 8H4a2 2 0 00-2 2v2h20v-2a2 2 0 00-2-2h-6z"
                      />
                    </svg>
                    Dashboard
                  </Button>
                )}
                {user.role === 'candidate' && (
                  <Button
                    href="/dashboard/candidate"
                    as={Link}
                    color="transparent"
                    className="flex items-center text-gray-600 bg-slate-300 hover:bg-slate-400 px-4 py-2 rounded-md transition duration-150 ease-in-out"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m-6 0l-3-3V8m6 8H4a2 2 0 00-2 2v2h20v-2a2 2 0 00-2-2h-6z"
                      />
                    </svg>
                    Dashboard
                  </Button>
                )}
                {user.role === 'hr' && (
                  <Button
                    href="/dashboard/hr"
                    as={Link}
                    color="transparent"
                    className="flex items-center text-gray-600 bg-slate-300 hover:bg-slate-400 px-4 py-2 rounded-md transition duration-150 ease-in-out"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m-6 0l-3-3V8m6 8H4a2 2 0 00-2 2v2h20v-2a2 2 0 00-2-2h-6z"
                      />
                    </svg>
                    Dashboard
                  </Button>
                )}
                <Button
                  onClick={onOpen}
                  className="flex items-center text-gray-600 hover:text-gray-900 bg-transparent hover:bg-gray-200 px-4 py-2 rounded-md transition duration-150 ease-in-out"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h3a3 3 0 013 3v2"
                    />
                  </svg>
                  Change Password
                </Button>
                <Button
                  onClick={handleLogout} // Use handleLogout instead of logout
                  className="flex items-center text-gray-600 hover:text-gray-900 bg-transparent hover:bg-gray-200 px-4 py-2 rounded-md transition duration-150 ease-in-out"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12H4m8 8H4m8-16H4m16 8a8 8 0 11-8-8 8 8 0 018 8z"
                    />
                  </svg>
                  Log out
                </Button>
              </li>
              </>
            )}
          </ul>
        </Transition>
      </div>

      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-gray-800 font-bold border-b border-gray-100">
                Change Account Password
              </ModalHeader>
              <ModalBody className="py-4 space-y-4">
                <Input
                  label="Current Password"
                  placeholder="Enter current password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="New Password"
                  placeholder="Enter new password (min. 6 chars)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Confirm New Password"
                  placeholder="Confirm your new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  variant="bordered"
                  isRequired
                />
              </ModalBody>
              <ModalFooter className="border-t border-gray-100">
                <Button color="danger" variant="flat" onPress={onClose} className="font-semibold">
                  Cancel
                </Button>
                <Button
                  color="primary"
                  isLoading={passwordLoading}
                  onClick={() => handleChangePassword(onClose)}
                  className="font-semibold text-white px-5 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Update Password
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
