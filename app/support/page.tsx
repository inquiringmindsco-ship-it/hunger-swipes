import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Support — Hunger Swipes',
  description: 'Get help with Hunger Swipes, including account access, food posts, Swipe Bucks, and account deletion.',
  alternates: { canonical: 'https://hungerswipes.com/support' },
}

export default function SupportPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white px-6 py-12 text-gray-900">
      <Link href="/" className="text-[#FF5722]">← Hunger Swipes</Link>
      <h1 className="mt-6 text-3xl font-black">Hunger Swipes Support</h1>
      <p className="mt-4 text-gray-700">
        For help with your account, food posts, seller access, Swipe Bucks, or the iOS app, email{' '}
        <a className="text-[#FF5722] underline" href="mailto:support@hungerswipes.com">support@hungerswipes.com</a>.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-bold">Delete your account</h2>
        <ol className="list-decimal space-y-2 pl-6 text-gray-700">
          <li>Sign in to Hunger Swipes.</li>
          <li>Open Account from the bottom navigation.</li>
          <li>Scroll to Account and choose Delete Account.</li>
          <li>Review the warning and confirm Delete Account.</li>
        </ol>
        <p className="text-gray-700">This permanently removes the account, clears personal profile fields, and removes the account&apos;s community posts from public display. The account deletion cannot be undone. If you cannot access the app, email support for deletion help.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-bold">Before contacting support</h2>
        <p className="text-gray-700">Include the email address associated with your Hunger Swipes account and a short description of the issue. Never send your password, verification code, Apple credentials, or payment details.</p>
      </section>

      <p className="mt-8 text-sm text-gray-600">
        <Link className="underline" href="/privacy">Privacy Policy</Link>{' · '}
        <Link className="underline" href="/terms">Terms of Use</Link>
      </p>
    </main>
  )
}
