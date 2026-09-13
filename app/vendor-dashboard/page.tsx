'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function Redirect() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id')

  useEffect(() => {
    const dest = id ? `/seller/dashboard?id=${id}` : '/join'
    router.replace(dest)
  }, [router, id])

  return <div className="min-h-screen flex items-center justify-center text-white">Redirecting...</div>
}

export default function VendorDashboardRedirect() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Redirecting...</div>}>
      <Redirect />
    </Suspense>
  )
}
