export const metadata = {
  title:
    'Nexus - Structured Interview Evaluations',

  description:
    'Role-based interview platform with multi-expert evaluations, candidate data masking, and resume-aware AI assistance.',
}

import Hero from '@/components/hero'
import Features from '@/components/features'
import FeaturesBlocks from '@/components/features-blocks'
import Newsletter from '@/components/newsletter'

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <FeaturesBlocks />
      <Newsletter />
    </>
  )
}
