// =============================================================================
// Google Business Profile API client. Server-only.
//
// The Business Profile API is split across hosts: account + location listing use
// the newer v1 APIs; reviews are still on the v4 host. This wraps the calls we
// need to sync a location's reviews and aggregate rating.
// =============================================================================

const ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const LOCATIONS_HOST = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_HOST = "https://mybusiness.googleapis.com/v4";

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

async function authedGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google API ${res.status} for ${url.split("?")[0]}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface GoogleLocation {
  accountName: string; // "accounts/{id}"
  locationId: string; // "{locationId}"
  title: string | null;
}

/** First Business Profile account for the connected user. */
export async function getFirstAccount(accessToken: string): Promise<string | null> {
  const data = await authedGet<{ accounts?: { name: string }[] }>(ACCOUNTS_URL, accessToken);
  return data.accounts?.[0]?.name ?? null;
}

/** First location under an account. */
export async function getFirstLocation(accessToken: string, accountName: string): Promise<GoogleLocation | null> {
  const url = `${LOCATIONS_HOST}/${accountName}/locations?readMask=name,title&pageSize=1`;
  const data = await authedGet<{ locations?: { name: string; title?: string }[] }>(url, accessToken);
  const loc = data.locations?.[0];
  if (!loc) return null;
  // location name is "locations/{id}"
  const locationId = loc.name.split("/").pop() ?? loc.name;
  return { accountName, locationId, title: loc.title ?? null };
}

export interface GoogleReview {
  reviewId: string;
  reviewerName: string | null;
  rating: number | null;
  comment: string | null;
  createTime: string | null;
  updateTime: string | null;
}

export interface GoogleReviewsResult {
  reviews: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number;
}

interface RawReviewsPage {
  reviews?: {
    reviewId: string;
    reviewer?: { displayName?: string };
    starRating?: string;
    comment?: string;
    createTime?: string;
    updateTime?: string;
  }[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

/** Fetch all reviews for a location (paginated) plus the aggregate rating. */
export async function listReviews(
  accessToken: string,
  accountName: string,
  locationId: string,
  maxPages = 10
): Promise<GoogleReviewsResult> {
  const base = `${REVIEWS_HOST}/${accountName}/locations/${locationId}/reviews`;
  const reviews: GoogleReview[] = [];
  let averageRating: number | null = null;
  let totalReviewCount = 0;
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const url = pageToken ? `${base}?pageSize=50&pageToken=${encodeURIComponent(pageToken)}` : `${base}?pageSize=50`;
    const data = await authedGet<RawReviewsPage>(url, accessToken);
    averageRating = data.averageRating ?? averageRating;
    totalReviewCount = data.totalReviewCount ?? totalReviewCount;

    for (const r of data.reviews ?? []) {
      reviews.push({
        reviewId: r.reviewId,
        reviewerName: r.reviewer?.displayName ?? null,
        rating: r.starRating ? STAR_MAP[r.starRating] ?? null : null,
        comment: r.comment ?? null,
        createTime: r.createTime ?? null,
        updateTime: r.updateTime ?? null,
      });
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return { reviews, averageRating, totalReviewCount };
}
