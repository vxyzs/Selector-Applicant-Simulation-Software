'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/context/user';
import Lottie from 'lottie-react';
import animationDataload from '@/components/lottie/loading.json';
import { hasRole } from '@/utils/permissions';

/**
 * Higher-Order Component protecting pages on client mount.
 * Redirects unauthorized users to signin screen.
 * @param {React.ComponentType} Component 
 * @param {string[]} allowedRoles 
 */
export function withRoleProtection(Component, allowedRoles) {
  return function ProtectedComponent(props) {
    const { user } = useUser();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token || !storedUser) {
        router.push('/signin');
        return;
      }

      if (user === null) {
        return; // Wait for context initialization
      }

      if (!hasRole(user, allowedRoles)) {
        router.push('/signin');
        return;
      }

      setAuthorized(true);
    }, [user, router]);

    if (!authorized) {
      return (
        <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Lottie
              animationData={animationDataload}
              style={{ height: '150px', width: '150px' }}
            />
            <p className="text-gray-800 font-semibold text-lg">Validating credentials...</p>
          </div>
        </section>
      );
    }

    return <Component {...props} />;
  };
}
