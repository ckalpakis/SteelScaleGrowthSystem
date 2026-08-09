// =============================================================================
// GHL integration — zod schemas for inputs and (lenient) response validation.
//
// Response shapes are validated defensively: we pick the fields we use and
// tolerate the two common GHL envelope styles ({x} vs {resource:{x}}) and
// snake/camel key variants. The exact shapes MUST be confirmed against the live
// HighLevel API docs; these schemas are intentionally forgiving so a minor
// envelope difference degrades to a clear GhlSchemaError rather than a crash.
// =============================================================================

import { z } from "zod";

// ---------------------------------------------------------------- inputs
export const createLocationInputSchema = z.object({
  companyId: z.string().min(1).optional(),
  name: z.string().trim().min(1, "name (public business name) is required"),
  legalName: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().url().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
});

export const updateCustomValueInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  value: z.string(),
});

// ---------------------------------------------------------------- responses
const idHolder = z.object({ id: z.union([z.string(), z.number()]) }).passthrough();

/** Create/Get location: accept {id,...} or {location:{id,...}}. */
export const locationResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().nullish(),
    companyId: z.string().nullish(),
    location: idHolder.partial().extend({ name: z.string().nullish(), companyId: z.string().nullish() }).optional(),
  })
  .passthrough();

/** OAuth token endpoint (snake_case per OAuth spec). */
export const oauthTokenResponseSchema = z
  .object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
    scope: z.string().optional(),
    token_type: z.string().optional(),
  })
  .passthrough();

/** Location access token from an agency token. */
export const locationTokenResponseSchema = z
  .object({
    access_token: z.string().optional(),
    accessToken: z.string().optional(),
    expires_in: z.number().optional(),
    expiresIn: z.number().optional(),
  })
  .passthrough()
  .refine((d) => Boolean(d.access_token || d.accessToken), "missing access token");

const customValueItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    name: z.string().nullish(),
    key: z.string().nullish(),
    fieldKey: z.string().nullish(),
    value: z.string().nullish(),
  })
  .passthrough();

/** Custom values list: accept {customValues:[...]} or a bare array. */
export const customValuesListSchema = z.union([
  z.object({ customValues: z.array(customValueItemSchema) }).passthrough(),
  z.array(customValueItemSchema),
]);

/** Single custom value update: accept {customValue:{...}} or {id,...}. */
export const customValueResponseSchema = z.union([
  z.object({ customValue: customValueItemSchema }).passthrough(),
  customValueItemSchema,
]);

const snapshotItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    name: z.string().nullish(),
    type: z.string().nullish(),
  })
  .passthrough();

/** Snapshots list: accept {snapshots:[...]} or a bare array. */
export const snapshotsListSchema = z.union([
  z.object({ snapshots: z.array(snapshotItemSchema) }).passthrough(),
  z.array(snapshotItemSchema),
]);
