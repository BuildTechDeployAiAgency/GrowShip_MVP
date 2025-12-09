import type { UserProfile, UserMembership } from "@/types/auth";

function findBrandFromMemberships(
  memberships: Array<UserMembership & { brand?: { id: string; organization_type?: string } }> | undefined
) {
  if (!memberships || memberships.length === 0) {
    return undefined;
  }

  // Prefer memberships that explicitly reference a brand organization
  const brandMembership = memberships.find((membership) =>
    membership.brand?.organization_type === "brand"
  );

  if (brandMembership?.brand?.id) {
    return brandMembership.brand.id;
  }

  // Fall back to the first membership's brand_id if available
  return memberships.find((membership) => Boolean(membership.brand_id))?.brand_id;
}

/**
 * Resolves the effective brand scope for the current user. Distributor users
 * inherit access from their parent brand or assigned memberships, so we try
 * several fallbacks before giving up.
 */
export function resolveUserBrandId(
  profile: UserProfile | null | undefined,
  isSuperAdmin: boolean
): string | undefined {
  if (isSuperAdmin) {
    return undefined;
  }

  if (!profile) {
    return undefined;
  }

  return (
    profile.brand_id ||
    profile.parent_brand_id ||
    findBrandFromMemberships(profile.memberships) ||
    undefined
  );
}
