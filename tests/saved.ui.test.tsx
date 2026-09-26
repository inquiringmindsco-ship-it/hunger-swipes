import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'test-user' }, loading: false }), getAuthToken: vi.fn().mockResolvedValue('test-token') }))
vi.mock('@/lib/auth-fetch', () => ({ authFetch: mocks.authFetch }))
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router, usePathname: () => '/saved' }))
vi.mock('@/app/components/MobileNav', () => ({ default: () => <nav aria-label="Test navigation" /> }))

import SavedPage from '@/app/saved/page'

const item = {
  id: 'save-1',
  content_kind: 'official',
  dish: {
    id: 'dish-1',
    name: 'Golden Curry',
    description: 'A test dish',
    photo_url: '/placeholder-dish.png',
    price: 18,
    seller: { id: 'seller-1', business_name: 'Test Kitchen', location_text: 'Ferguson, MO' },
  },
}

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

describe('SavedPage', () => {
  beforeEach(() => mocks.authFetch.mockReset())

  it('renders a saved item and removes it only after a successful request', async () => {
    mocks.authFetch.mockImplementationOnce(() => response({ saved: [item] })).mockImplementationOnce(() => response({ success: true }))
    render(<SavedPage />)
    expect(await screen.findByRole('heading', { name: 'Golden Curry' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Golden Curry from saved dishes' }))
    await waitFor(() => expect(screen.getByText('No saved dishes yet')).toBeVisible())
    expect(mocks.authFetch).toHaveBeenLastCalledWith('/api/saves?contentKind=official&contentId=dish-1', { method: 'DELETE' })
  })

  it('renders the intentional empty state', async () => {
    mocks.authFetch.mockImplementationOnce(() => response({ saved: [] }))
    render(<SavedPage />)
    expect(await screen.findByText('No saved dishes yet')).toBeVisible()
  })

  it('renders a retryable failed-request state', async () => {
    mocks.authFetch.mockImplementationOnce(() => response({ error: 'unavailable' }, false))
    render(<SavedPage />)
    expect(await screen.findByText('Saved is unavailable')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeVisible()
  })

  it('preserves the item when removal fails', async () => {
    mocks.authFetch.mockImplementationOnce(() => response({ saved: [item] })).mockImplementationOnce(() => response({ error: 'failed' }, false))
    render(<SavedPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Golden Curry from saved dishes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing changed')
    expect(screen.getByRole('heading', { name: 'Golden Curry' })).toBeVisible()
  })
})
