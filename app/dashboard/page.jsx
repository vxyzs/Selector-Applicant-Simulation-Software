// app/dashboard/page.jsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/context/user'
import Lottie from 'lottie-react'
import animationDataload from '@/components/lottie/loading.json'

export default function DashboardRedirect() {
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (!token || !storedUser) {
      router.push('/signin')
      return
    }

    if (user === null) {
      return // Wait for context load
    }

    const role = user.role ? user.role.toLowerCase() : ''
    if (role === 'admin') {
      router.push('/dashboard/admin')
    } else if (role === 'hr') {
      router.push('/dashboard/hr')
    } else if (role === 'expert') {
      router.push(`/dashboard/expert?id=${user._id}`)
    } else if (role === 'candidate') {
      router.push('/dashboard/candidate')
    } else {
      router.push('/signin')
    }
  }, [user, router])

  return (
    <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Lottie
          animationData={animationDataload}
          style={{ height: '150px', width: '150px' }}
        />
        <p className="text-gray-800 font-medium">Routing to dashboard...</p>
      </div>
    </section>
  )
}
