'use client'

import { useEffect, useRef, useState } from 'react'

interface FoodVideoProps {
  src: string
  poster?: string
  className?: string
  preload?: boolean
  autoPlay?: boolean
}

export default function FoodVideo({ src, poster, className = '', preload = false, autoPlay = true }: FoodVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)
  const [inView, setInView] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setInView(entry.isIntersecting)
        })
      },
      { threshold: 0.5 }
    )
    observer.observe(videoRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (inView && autoPlay && loaded) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [inView, autoPlay, loaded])

  if (error && poster) {
    return <img src={poster} alt="" className={`${className} object-cover`} loading={preload ? 'eager' : 'lazy'} />
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={`${className} object-cover`}
      muted
      loop
      playsInline
      preload={preload ? 'auto' : 'none'}
      onLoadedData={() => setLoaded(true)}
      onError={() => setError(true)}
      aria-label="Food video"
    />
  )
}
