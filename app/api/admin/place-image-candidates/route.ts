import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkAdmin, getAdminPrincipal } from "@/lib/admin-auth";
import { isHttpsUrl } from "@/lib/food";

const STAGING_NOTICE =
  "Temporary staging image. Source retained. Reuse rights have not been independently confirmed. Replace with an owner-supplied, licensed, or approved community image when available.";

const RIGHTS_STATUSES = ["permission_required", "approved", "rejected"] as const;
type RightsStatus = (typeof RIGHTS_STATUSES)[number];

export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );

  const status = new URL(request.url).searchParams.get("status");
  const usage = new URL(request.url).searchParams.get("usage");
  let query = admin
    .from("place_image_candidates")
    .select(
      "id,place_id,dish_name,image_url,source_url,source_type,rights_status,usage_status,notes,created_at,updated_at,created_by,intake_kind,place:places(id,name,address,status,operational_status,temporary_staging_place_image_url)",
    )
    .order("created_at", { ascending: true });
  if (status) query = query.eq("rights_status", status);
  if (usage) query = query.eq("usage_status", usage);
  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = (data || []).map((c: any) => ({
    ...c,
    adminNotice:
      c.usage_status === "temporary_staging" || c.rights_status === "permission_required"
        ? STAGING_NOTICE
        : undefined,
  }));
  return NextResponse.json({ candidates });
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  // Creation path for the Food Content Intake tool.
  const hasCreateFields =
    body.place_id &&
    body.dish_name &&
    body.image_url &&
    body.source_url &&
    body.source_type;

  if (hasCreateFields) {
    const principal = await getAdminPrincipal(request);
    const createdBy =
      principal?.kind === "owner" ? principal.userId : principal?.kind === "legacy" ? "legacy-admin" : "unknown";

    const placeId = String(body.place_id).trim();
    const dishName = String(body.dish_name).trim();
    const imageUrl = String(body.image_url).trim();
    const sourceUrl = String(body.source_url).trim();
    const sourceType = String(body.source_type).trim();
    const rightsStatus: RightsStatus = RIGHTS_STATUSES.includes(body.rights_status)
      ? body.rights_status
      : "permission_required";
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    const intakeKind = typeof body.intake_kind === "string" ? body.intake_kind.trim() || null : null;

    if (!/^[0-9a-f-]{36}$/i.test(placeId)) {
      return NextResponse.json({ error: "place_id must be a valid uuid" }, { status: 400 });
    }
    if (dishName.length < 1 || dishName.length > 200) {
      return NextResponse.json({ error: "dish_name is required (1-200 chars)" }, { status: 400 });
    }
    if (!isHttpsUrl(imageUrl)) {
      return NextResponse.json({ error: "image_url must be a valid HTTPS URL" }, { status: 400 });
    }
    if (!isHttpsUrl(sourceUrl)) {
      return NextResponse.json({ error: "source_url must be a valid HTTPS URL" }, { status: 400 });
    }
    if (sourceType.length < 1 || sourceType.length > 120) {
      return NextResponse.json({ error: "source_type is required (1-120 chars)" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin)
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data: place, error: placeError } = await admin
      .from("places")
      .select("id")
      .eq("id", placeId)
      .maybeSingle();
    if (placeError) return NextResponse.json({ error: placeError.message }, { status: 500 });
    if (!place) return NextResponse.json({ error: "Place not found" }, { status: 404 });

    const insert = {
      place_id: placeId,
      dish_name: dishName,
      image_url: imageUrl,
      source_url: sourceUrl,
      source_type: sourceType,
      rights_status: rightsStatus,
      notes,
      intake_kind: intakeKind,
      created_by: createdBy,
    };

    const { data, error } = await admin
      .from("place_image_candidates")
      .insert(insert)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ candidate: data }, { status: 201 });
  }

  // Original approve/reject/stage/unstage path.
  if (
    !body.candidateId ||
    !["approve", "reject", "stage", "unstage"].includes(body.action)
  ) {
    return NextResponse.json(
      { error: "candidateId and action (approve|reject|stage|unstage) are required, or provide place_id/dish_name/image_url/source_url/source_type to create" },
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
    .select("id,place_id,image_url,rights_status,notes")
    .eq("id", body.candidateId)
    .single();
  if (candidateError || !candidate)
    return NextResponse.json(
      { error: candidateError?.message || "Candidate not found" },
      { status: 404 },
    );

  if (body.action === "stage") {
    const noteAppend = `[STAGING NOTICE] ${STAGING_NOTICE}`;
    const newNotes = candidate.notes?.includes("[STAGING NOTICE]")
      ? candidate.notes
      : [candidate.notes, noteAppend].filter(Boolean).join("\n");
    const { error: usageError } = await admin
      .from("place_image_candidates")
      .update({
        usage_status: "temporary_staging",
        notes: newNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);
    if (usageError)
      return NextResponse.json({ error: usageError.message }, { status: 500 });

    const { error: placeError } = await admin
      .from("places")
      .update({
        temporary_staging_place_image_url: candidate.image_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.place_id);
    if (placeError)
      return NextResponse.json({ error: placeError.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      candidateId: candidate.id,
      placeId: candidate.place_id,
      usageStatus: "temporary_staging",
      staged: true,
      adminNotice: STAGING_NOTICE,
    });
  }

  if (body.action === "unstage") {
    const { error: usageError } = await admin
      .from("place_image_candidates")
      .update({
        usage_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);
    if (usageError)
      return NextResponse.json({ error: usageError.message }, { status: 500 });

    const { error: placeError } = await admin
      .from("places")
      .update({
        temporary_staging_place_image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.place_id)
      .eq("temporary_staging_place_image_url", candidate.image_url);
    if (placeError)
      return NextResponse.json({ error: placeError.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      candidateId: candidate.id,
      placeId: candidate.place_id,
      usageStatus: null,
      staged: false,
    });
  }

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

export async function PATCH(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const candidateId = typeof body.candidateId === "string" ? body.candidateId.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes : undefined;

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
  }
  if (notes === undefined) {
    return NextResponse.json({ error: "notes is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("place_image_candidates")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", candidateId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  return NextResponse.json({ candidate: data });
}
