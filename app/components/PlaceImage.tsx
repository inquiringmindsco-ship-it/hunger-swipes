"use client";

import { useEffect, useRef, useState } from "react";
import { Store } from "lucide-react";

export default function PlaceImage({
  placeId,
  enabled,
  approvedImageUrl,
  name,
  className = "",
}: {
  placeId: string;
  enabled?: boolean;
  approvedImageUrl?: string | null;
  name: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [photo, setPhoto] = useState<any>(null);
  useEffect(() => {
    if (!enabled || approvedImageUrl || !container.current) return;
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
  }, [enabled, approvedImageUrl]);
  useEffect(() => {
    if (!visible || !enabled) return;
    const controller = new AbortController();
    fetch(`/api/places/${encodeURIComponent(placeId)}/google-photo`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(setPhoto)
      .catch(() => {});
    return () => controller.abort();
  }, [visible, enabled, placeId]);
  return (
    <div
      ref={container}
      className={`relative overflow-hidden bg-gradient-to-br from-[#2a201c] to-[#151515] ${className}`}
    >
      {approvedImageUrl ? (
        <img
          src={approvedImageUrl}
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
      ) : (
        <div className="flex h-full min-h-28 items-center justify-center text-[#FF5722]/60">
          <Store size={38} aria-hidden="true" />
        </div>
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
