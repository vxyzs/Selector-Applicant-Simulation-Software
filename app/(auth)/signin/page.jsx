"use client"
import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/app/context/user';
import toast from 'react-hot-toast';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, setUser } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      if (response.status === 200) {
        const { token, user } = response.data;
        const role = user.role ? user.role.toLowerCase() : '';



        localStorage.setItem('token', token);
        setUser(user);
        console.log(user);
        toast.success('Logged in successfully');
        if (role === 'admin') {
          router.push('/dashboard/admin');
        } else if (role === 'candidate') {
          router.push('/dashboard/candidate');
        } else if (role === 'expert') {
          router.push(`/dashboard/expert?id=${user._id}`);
        } else if (role === 'hr') {
          router.push('/dashboard/hr');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
      toast.error(err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <section className="bg-gradient-to-b from-gray-100 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-32 pb-12 md:pt-40 md:pb-20">

          <div className="max-w-3xl mx-auto text-center pb-12 md:pb-20">
            <h1 className="h1">Login to your account</h1>
          </div>

          <div className="max-w-sm mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <label className="block text-gray-800 text-sm font-medium mb-1" htmlFor="email">Email <span className="text-red-600">*</span></label>
                  <input id="email" type="email" className="form-input w-full text-gray-800" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-gray-800 text-sm font-medium" htmlFor="password">Password <span className="text-red-600">*</span></label>
                    <Link href="/reset-password" className="text-xs text-blue-600 hover:underline transition duration-150 ease-in-out">Forgot Password?</Link>
                  </div>
                  <input id="password" type="password" className="form-input w-full text-gray-800" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mt-6">
                <div className="w-full px-3">
                  <button type="submit" className="btn text-white bg-blue-600 hover:bg-blue-700 w-full">Login</button>
                </div>
              </div>
            </form>
            <div className="flex items-center my-6">
              <div className="border-t border-gray-300 grow mr-3" aria-hidden="true"></div>
              <div className="text-gray-600 italic">Or</div>
              <div className="border-t border-gray-300 grow ml-3" aria-hidden="true"></div>
            </div>
            <div className="text-gray-600 text-center mt-6">
              Don't have an account ? <Link href="/signup" className="text-blue-600 hover:underline transition duration-150 ease-in-out">Sign up</Link>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <details className="group text-sm text-gray-500 cursor-pointer">
                <summary className="list-none flex items-center justify-center gap-1 hover:text-gray-700 transition duration-150 select-none">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Demo access credentials</span>
                </summary>
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-3 font-mono text-left animate-in fade-in duration-200">
                  <div className="cursor-pointer hover:bg-gray-100 p-1 rounded transition duration-100" onClick={() => { setEmail('john@nexus.com'); setPassword('da807443a2df'); }}>
                    <span className="font-semibold text-gray-700">HR Recruiter (Click to autofill):</span>
                    <div className="mt-1 pl-2 border-l-2 border-indigo-500">
                      <div>Email: john@nexus.com</div>
                      <div>Password: da807443a2df</div>
                    </div>
                  </div>
                  <div className="cursor-pointer hover:bg-gray-100 p-1 rounded transition duration-100" onClick={() => { setEmail('test@nexus.com'); setPassword('7db92e11cdcb'); }}>
                    <span className="font-semibold text-gray-700">Panel Expert (Click to autofill):</span>
                    <div className="mt-1 pl-2 border-l-2 border-indigo-500">
                      <div>Email: test@nexus.com</div>
                      <div>Password: 7db92e11cdcb</div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
