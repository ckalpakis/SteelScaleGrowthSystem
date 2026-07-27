// =============================================================================
// Directory — slug helpers. Pure.
// =============================================================================

/** Turn a string into a URL-safe slug. */
export function slugify(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Make `base`'s slug unique against a set of taken slugs by appending -2, -3, …
 * (used when importing many businesses that may share a name).
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || "listing";
  if (!taken.has(root)) {
    taken.add(root);
    return root;
  }
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  const s = `${root}-${n}`;
  taken.add(s);
  return s;
}
