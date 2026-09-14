"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
import MobileNav from "@/app/components/MobileNav";
import PlaceActions from "@/app/components/PlaceActions";
import PlaceImage from "@/app/components/PlaceImage";
import { BrandMark } from "@/app/components/icons/HungerIcons";

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/places?id=${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((data) => setPlace(data.places?.[0] || null))
      .finally(() => setLoading(false));
  }, [id]);
  if (loading)
    return (
      <div className="min-h-screen bg-[#0D0D0D] p-8 text-white">
        Loading Place…
      </div>
    );
  if (!place)
    return (
      <div className="min-h-screen bg-[#0D0D0D] p-8 text-white">
        <p>Place not found.</p>
        <Link href="/nearby" className="text-[#FF5722]">
          Back to Nearby
        </Link>
      </div>
    );
  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <BrandMark size={34} />
          <Link href="/nearby" className="font-black">
            HungerSwipes Places
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <PlaceImage
          placeId={place.id}
          enabled={place.google_photo_enabled}
          approvedImageUrl={place.approved_place_image_url}
          name={place.name}
          className="h-64 rounded-3xl"
        />
        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">{place.name}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {[place.cuisine, place.category].filter(Boolean).join(" · ") ||
                "Food Place"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${place.claimed_status === "claimed" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-gray-300"}`}
          >
            {place.claimed_status === "claimed"
              ? "Claimed seller"
              : place.claimed_status === "claim_pending"
                ? "Claim pending"
                : "Unclaimed Place"}
          </span>
        </div>
        <div className="mt-5 space-y-2 text-sm text-gray-300">
          <p className="flex gap-2">
            <MapPin className="shrink-0 text-[#FF5722]" size={18} />{" "}
            {place.address || place.location_text}
          </p>
          {place.hours && (
            <p className="flex gap-2">
              <Clock3 className="shrink-0 text-[#FF5722]" size={18} />{" "}
              {place.hours}
            </p>
          )}
          {place.distanceMiles != null && (
            <p>{place.distanceMiles} miles away</p>
          )}
        </div>
        <div className="mt-6">
          <PlaceActions place={place} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/post?place=${place.id}`}
            className="rounded-xl bg-[#FF5722] px-5 py-4 text-center font-black"
          >
            Post food from here
          </Link>
          {place.claimed_status === "unclaimed" && (
            <Link
              href={`/claim?place=${place.id}`}
              className="rounded-xl border border-white/15 px-5 py-4 text-center font-bold"
            >
              Is this your business? Claim this Place
            </Link>
          )}
        </div>
        {place.external_source === "openstreetmap" && (
          <p className="mt-8 text-xs text-gray-600">
            Place data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              OpenStreetMap contributors
            </a>
            , ODbL.
          </p>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
