type PlaceImageAdmin = {
  from: (table: string) => any;
};

export async function promoteApprovedCommunityPlaceImage(
  admin: PlaceImageAdmin,
  placeId: string,
  photoUrl: string,
) {
  const { error } = await admin
    .from("places")
    .update({ approved_community_place_image_url: photoUrl })
    .eq("id", placeId)
    .is("approved_owner_place_image_url", null)
    .is("approved_community_place_image_url", null);

  if (error) throw new Error(`Could not promote community place image: ${error.message}`);
}

export async function replaceRemovedCommunityPlaceImage(
  admin: PlaceImageAdmin,
  placeId: string,
  removedPhotoUrl: string,
) {
  const { data: place, error: placeError } = await admin
    .from("places")
    .select("approved_community_place_image_url")
    .eq("id", placeId)
    .maybeSingle();

  if (placeError) throw new Error(`Could not inspect community place image: ${placeError.message}`);
  if (place?.approved_community_place_image_url !== removedPhotoUrl) return;

  const { data: replacement, error: replacementError } = await admin
    .from("community_food_posts")
    .select("photo_url")
    .eq("place_id", placeId)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .neq("photo_url", removedPhotoUrl)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (replacementError) throw new Error(`Could not find replacement place image: ${replacementError.message}`);
  const { error: updateError } = await admin
    .from("places")
    .update({ approved_community_place_image_url: replacement?.photo_url || null })
    .eq("id", placeId)
    .eq("approved_community_place_image_url", removedPhotoUrl);

  if (updateError) throw new Error(`Could not replace community place image: ${updateError.message}`);
}
