import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isAdmin(request: NextRequest) {
  const provided = Buffer.from(request.headers.get("x-admin-secret") || "");
  const expected = Buffer.from(process.env.ADMIN_SECRET || "");
  return (
    expected.length > 0 &&
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );

  const status = new URL(request.url).searchParams.get("status");
  let query = admin
    .from("place_image_candidates")
    .select(
      "id,place_id,dish_name,image_url,source_url,source_type,rights_status,notes,created_at,updated_at,place:places(id,name,address,status,operational_status)",
    )
    .order("created_at", { ascending: true });
  if (status) query = query.eq("rights_status", status);
  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ candidates: data || [] });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.candidateId || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json(
      { error: "candidateId and action (approve|reject) are required" },
      { status: 400 },
    );
  }
  if (body.action === "approve" && body.rightsConfirmed !== true) {
    return NextResponse.json(
      { error: "rightsConfirmed=true is required before publishing an image" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  const { data: candidate, error: candidateError } = await admin
    .from("place_image_candidates")
    .select("id,place_id,image_url,rights_status")
    .eq("id", body.candidateId)
    .single();
  if (candidateError || !candidate)
    return NextResponse.json(
      { error: candidateError?.message || "Candidate not found" },
      { status: 404 },
    );

  const rightsStatus = body.action === "approve" ? "approved" : "rejected";
  const { error: statusError } = await admin
    .from("place_image_candidates")
    .update({ rights_status: rightsStatus, updated_at: new Date().toISOString() })
    .eq("id", candidate.id);
  if (statusError)
    return NextResponse.json({ error: statusError.message }, { status: 500 });

  const placeUpdate =
    body.action === "approve"
      ? admin
          .from("places")
          .update({ approved_owner_place_image_url: candidate.image_url })
          .eq("id", candidate.place_id)
      : admin
          .from("places")
          .update({ approved_owner_place_image_url: null })
          .eq("id", candidate.place_id)
          .eq("approved_owner_place_image_url", candidate.image_url);
  const { error: placeError } = await placeUpdate;
  if (placeError)
    return NextResponse.json({ error: placeError.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    candidateId: candidate.id,
    placeId: candidate.place_id,
    rightsStatus,
    published: body.action === "approve",
  });
}
