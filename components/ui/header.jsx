'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from './logo';
import MobileMenu from './mobile-menu';
import { useUser } from '@/app/context/user';
import { Button, Avatar, AvatarIcon, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input } from '@nextui-org/react';
import { toast } from 'react-hot-toast';

export default function Header() {
  const [top, setTop] = useState(true);
  const { user, logout } = useUser();
  const router = useRouter();
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const scrollHandler = () => {
    window.pageYOffset > 10 ? setTop(false) : setTop(true);
  };

  useEffect(() => {
    scrollHandler();
    window.addEventListener('scroll', scrollHandler);
    return () => window.removeEventListener('scroll', scrollHandler);
  }, [top, user]);

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
    <header className={`fixed w-full z-30 md:bg-opacity-90 transition bg-white duration-300 ease-in-out ${!top ? 'backdrop-blur-sm shadow-lg' : 'shadow-md'}`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Site branding */}
          <div className="shrink-0 mr-4 flex flex-row gap-1">
            <Logo />
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex md:grow">
            <ul className="flex grow justify-end flex-wrap items-center">
              {user ? (
                <div className="flex flex-row gap-1">
                  {user.role === 'expert' && (
                    <Button
                      href={`/dashboard/expert?id=${user._id}`}
                      as={Link}
                      color="transparent"
                      className="font-medium text-gray-600 hover:bg-slate-300 px-3 py-3 flex items-center transition duration-150 ease-in-out"
                    >
                      Dashboard
                    </Button>
                  )}
                  {user.role === 'candidate' && (
                    <Button
                      href="/dashboard/candidate"
                      as={Link}
                      color="transparent"
                      className="font-medium text-gray-600 hover:bg-slate-300 px-3 py-3 flex items-center transition duration-150 ease-in-out"
                    >
                      Dashboard
                    </Button>
                  )}
                  {user.role === 'hr' && (
                    <Button
                      href="/dashboard/hr"
                      as={Link}
                      color="transparent"
                      className="font-medium text-gray-600 hover:bg-slate-300 px-3 py-3 flex items-center transition duration-150 ease-in-out"
                    >
                      Dashboard
                    </Button>
                  )}
                  <Button
                    onClick={onOpen}
                    className="font-medium text-gray-600 hover:text-gray-900 px-3 py-3 flex items-center transition duration-150 ease-in-out bg-transparent hover:bg-gray-100"
                  >
                    Change Password
                  </Button>
                  <Button
                    onClick={handleLogout} // Use handleLogout instead of logout
                    className="font-medium text-gray-600 hover:text-gray-900 px-3 py-3 flex items-center transition duration-150 ease-in-out bg-transparent hover:bg-gray-100"
                  >
                    Log out
                  </Button>
                  <Avatar
                    icon={<AvatarIcon />}
                    size="md"
                    classNames={{
                      base: "bg-gradient-to-br from-[#4FC3F7] to-[#0288D1]",
                      icon: "text-black/80",
                    }}
                  />
                </div>
              ) : (
                <>
                  <li>
                    <Link href="/signin" className="font-medium text-gray-600 hover:text-gray-900 px-5 py-3 flex items-center transition duration-150 ease-in-out">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="btn-sm text-gray-200 bg-gray-900 hover:bg-gray-800 ml-3">
                      <span>Sign up</span>
                      <svg className="w-3 h-3 fill-current text-gray-400 shrink-0 ml-2 -mr-1" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.707 5.293L7 .586 5.586 2l3 3H0v2h8.586l-3 3L7 11.414l4.707-4.707a1 1 0 000-1.414z" fillRule="nonzero" />
                      </svg>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>

          <MobileMenu />
        </div>
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
    </header>
  );
}
