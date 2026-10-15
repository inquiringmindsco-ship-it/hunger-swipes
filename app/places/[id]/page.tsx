import PlaceDetailClient from './PlaceDetailClient'

export async function generateStaticParams() {
  return [{ id: 'preview' }]
}

export default function PlaceDetailPage() {
  return <PlaceDetailClient />
}
