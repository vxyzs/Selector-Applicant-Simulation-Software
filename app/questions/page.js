'use client'

import Table from "@/components/question-table/table";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/app/context/user";
import animationDataload from '@/components/lottie/loading.json'
import Lottie from 'lottie-react'
import NextLink from "next/link";
import { Breadcrumbs, BreadcrumbItem, Accordion, AccordionItem, Chip, Button } from "@nextui-org/react";
import { toast } from "react-hot-toast";

function QuestionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const interviewId = searchParams.get('interviewId');
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!interviewId) return;
    try {
      const response = await fetch(`/api/interviews/get?interviewId=${interviewId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      } else {
        console.error('Failed to fetch interview details');
      }
    } catch (error) {
      console.error('Error fetching interview details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (!token || !storedUser) {
      router.push('/')
      return
    }

    if (user === null) {
      return
    }

    fetchData();
  }, [interviewId, user, router]);

  if (loading || !user) {
    return (
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Lottie
            animationData={animationDataload}
            style={{ height: '150px', width: '150px' }}
          />
          <p className="text-gray-800 font-medium">Loading interview data...</p>
        </div>
      </section>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 pt-24">
      {/* Main content area */}
      <main className="flex-1 p-4 md:p-8 pt-6 max-w-6xl mx-auto w-full z-10 space-y-6">
        {/* Breadcrumbs Navigation */}
        <div className="flex justify-start px-2">
          <Breadcrumbs size="md" variant="solid" color="default">
            <BreadcrumbItem as={NextLink} href="/">Home</BreadcrumbItem>
            <BreadcrumbItem 
              as={NextLink} 
              href={user.role === 'expert' ? `/dashboard?id=${user._id}` : '/candidate-dashboard'}
              className="capitalize"
            >
              {user.role} Dashboard
            </BreadcrumbItem>
            <BreadcrumbItem>Questionnaire</BreadcrumbItem>
          </Breadcrumbs>
        </div>

        {/* Centered heading container */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
            Evaluation <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">Questionnaire</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base max-w-md">
            Conduct the evaluation, rate response quality, or generate real-time questions.
          </p>
        </div>
        
        {/* Extracted Resume Text Accordion */}
        {details.extractedText && (
          <div className="max-w-5xl mx-auto w-full">
            <Accordion variant="splitted" className="px-0">
              <AccordionItem
                key="resume-text"
                aria-label="Extracted Resume Text Preview"
                title={
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-bold text-gray-800">Extracted Resume Content</span>
                    <Chip size="sm" color="secondary" variant="flat" className="ml-2 font-semibold">Parsed</Chip>
                  </div>
                }
                subtitle="View the raw text extracted from the candidate's uploaded resume"
                className="bg-white border border-gray-100 shadow-sm rounded-2xl"
              >
                <div className="relative bg-slate-50/70 border border-slate-100 rounded-xl p-4 mt-2">
                  <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      className="font-bold text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(details.extractedText);
                        toast.success("Resume text copied to clipboard!");
                      }}
                    >
                      Copy Text
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 max-h-[300px] overflow-y-auto pr-2 leading-relaxed">
                    {details.extractedText}
                  </pre>
                </div>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Render Table with a unique key to force state reinitialization when data load completes */}
        <Table key={details._id || 'loading'} interview={details} user={user} />
      </main>
    </div>
  );
}

export default function Questions() {
  return (
    <Suspense fallback={
      <section className="bg-gradient-to-b from-gray-100 to-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Lottie
            animationData={animationDataload}
            style={{ height: '150px', width: '150px' }}
          />
          <p className="text-gray-800 font-medium">Loading interview details...</p>
        </div>
      </section>
    }>
      <QuestionsContent />
    </Suspense>
  );
}

