// =============================================================================
// Local business directory — domain types.
// =============================================================================

export const LISTING_TIERS = ["free", "premium"] as const;
export type ListingTier = (typeof LISTING_TIERS)[number];

export const LISTING_STATUSES = ["published", "hidden", "draft"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export interface Directory {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  tagline: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  primary_color: string;
  meta_title: string | null;
  meta_description: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DirectoryListing {
  id: string;
  directory_id: string;
  slug: string;
  business_name: string;
  category: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  image_url: string | null;
  tier: ListingTier;
  status: ListingStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** The fields a CSV row / manual add can set on a listing. */
export interface ListingInput {
  business_name: string;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  image_url?: string | null;
  tier?: ListingTier;
}
