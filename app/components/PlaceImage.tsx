"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Coins } from "lucide-react";

export default function PlaceImage({
  placeId,
  enabled,
  approvedImageUrl,
  stagingImageUrl,
  name,
  className = "",
}: {
  placeId: string;
  enabled?: boolean;
  approvedImageUrl?: string | null;
  stagingImageUrl?: string | null;
  name: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [photo, setPhoto] = useState<any>(null);
  const [photoResolved, setPhotoResolved] = useState(!enabled);
  const effectiveUrl = approvedImageUrl || stagingImageUrl || null;

  useEffect(() => {
    if (!enabled || effectiveUrl || !container.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [enabled, effectiveUrl]);

  useEffect(() => {
    if (!visible || !enabled) return;
    const controller = new AbortController();
    setPhotoResolved(false);
    fetch(`/api/places/${encodeURIComponent(placeId)}/google-photo`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(setPhoto)
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setPhotoResolved(true);
      });
    return () => controller.abort();
  }, [visible, enabled, placeId]);

  return (
    <div
      ref={container}
      className={`relative overflow-hidden bg-gradient-to-br from-[#2a201c] to-[#151515] ${className}`}
    >
      {effectiveUrl ? (
        <img
          src={effectiveUrl}
          alt={`${name} place`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : photo?.photoUrl ? (
        <img
          src={photo.photoUrl}
          alt={`${name} place`}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : enabled && !photoResolved ? (
        <div
          className="h-full min-h-28 animate-pulse bg-white/[0.04]"
          aria-label={`Loading a photo for ${name}`}
        />
      ) : (
        <Link
          href={`/post?place=${encodeURIComponent(placeId)}`}
          aria-label={`Take a food photo at ${name} and earn points`}
          className="group flex h-full min-h-28 flex-col items-center justify-center gap-2 px-4 text-center transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFD700]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF5722]/15 text-[#FF5722] transition group-hover:scale-105">
            <Camera size={23} aria-hidden="true" />
          </span>
          <span className="text-sm font-black text-white">
            Be the first to show the food
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FFD700]">
            <Coins size={14} aria-hidden="true" /> Take a pic · earn points
          </span>
        </Link>
      )}
      {photo?.photoUrl && (
        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[10px] text-white">
          <a
            href={photo.googleMapsUri || "#"}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline"
          >
            Google Maps
          </a>
          {photo.authorAttributions?.map((author: any, index: number) => (
            <span key={`${author.displayName}-${index}`}>
              {" "}
              ·{" "}
              {author.uri ? (
                <a
                  href={author.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {author.displayName}
                </a>
              ) : (
                author.displayName
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
