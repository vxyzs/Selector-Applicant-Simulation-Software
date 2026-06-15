"use client"
import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/app/context/user';
import toast from 'react-hot-toast';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isHREligible, setIsHREligible] = useState(false);
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const { user, setUser } = useUser();
  const router = useRouter();

  // Check if email is whitelisted for HR role when email input blurs
  const checkHREligibility = async (emailVal) => {
    if (!emailVal) return;
    try {
      const res = await axios.get(`/api/auth/check-hr?email=${encodeURIComponent(emailVal.trim())}`);
      setIsHREligible(res.data.isHR);
    } catch (err) {
      console.error('Error checking HR whitelist status:', err);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    // Proactively check if email is valid and check whitelist
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(val.trim())) {
      checkHREligibility(val);
    } else {
      setIsHREligible(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      toast.error('Invalid email format');
      return;
    }
    try {
      const payload = {
        name,
        email: email.trim(),
        password,
        role: isHREligible ? 'hr' : 'candidate'
      };
      if (isHREligible) {
        payload.organization = organization.trim();
      }
      const response = await axios.post('/api/auth/signup', payload);

      if (response.status === 200) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        toast.success('Account created successfully');
        setError('Account created successfully');
        const role = user.role ? user.role.toLowerCase() : '';
        if (role === 'candidate') {
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

          {/* Page header */}
          <div className="max-w-3xl mx-auto text-center pb-12 md:pb-20">
            <h1 className="h1">Create Your Account</h1>
          </div>

          {/* Form */}
          <div className="max-w-sm mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <label className="block text-gray-800 text-sm font-medium mb-1" htmlFor="name">Name <span className="text-red-600">*</span></label>
                  <input id="name" type="text" className="form-input w-full text-gray-800" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <label className="block text-gray-800 text-sm font-medium mb-1" htmlFor="email">Email <span className="text-red-600">*</span></label>
                  <input id="email" type="text" className="form-input w-full text-gray-800" placeholder="Enter your email address" value={email} onChange={handleEmailChange} onBlur={() => checkHREligibility(email)} required />
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <label className="block text-gray-800 text-sm font-medium mb-1" htmlFor="password">Password <span className="text-red-600">*</span></label>
                  <input id="password" type="password" className="form-input w-full text-gray-800" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-4 px-1 flex items-center gap-1.5 font-medium">
                <span>ℹ️</span>
                <span>Experts and HR accounts are managed internally.</span>
              </div>
              {isHREligible && (
                <div className="flex flex-wrap -mx-3 mb-4">
                  <div className="w-full px-3">
                    <label className="block text-gray-800 text-sm font-medium mb-1" htmlFor="organization">Organization Name <span className="text-red-600">*</span></label>
                    <input id="organization" type="text" className="form-input w-full text-gray-800" placeholder="Enter your organization name" value={organization} onChange={(e) => setOrganization(e.target.value)} required />
                  </div>
                </div>
              )}
              {error && <div id='error' className="text-red-600 text-center mb-4">{error}</div>}
              <div className="flex flex-wrap -mx-3 mt-6">
                <div className="w-full px-3">
                  <button type="submit" className="btn text-white bg-blue-600 hover:bg-blue-700 w-full">Sign up</button>
                </div>
              </div>
              <div className="text-sm text-gray-500 text-center mt-3">
                By creating an account, you agree to the <a className="underline" href="#0">terms & conditions</a>, and our <a className="underline" href="#0">privacy policy</a>.
              </div>
            </form>
            <div className="flex items-center my-6">
              <div className="border-t border-gray-300 grow mr-3" aria-hidden="true"></div>
              <div className="text-gray-600 italic">Or</div>
              <div className="border-t border-gray-300 grow ml-3" aria-hidden="true"></div>
            </div>
            <div className="text-gray-600 text-center mt-6">
              Already have an account? <Link href="/signin" className="text-blue-600 hover:underline transition duration-150 ease-in-out">Sign in</Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}