import StaffUploadClient from './StaffUploadClient'

export async function generateStaticParams() {
  return [{ slug: 'preview' }]
}

export default function StaffUploadPage() {
  return <StaffUploadClient />
}
