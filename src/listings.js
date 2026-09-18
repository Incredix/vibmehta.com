/**
 * Public listing catalog.
 *
 * Add a home: copy an entry, pick a new id, then set
 * LISTING_<ID>_ADDRESS in Cloudflare (and .dev.vars locally).
 * Street addresses stay in env so they are not on the public form or in git.
 */
export const LISTINGS = [
  {
    id: "fremont",
    publicName: "Fremont home",
    publicLocation: "Fremont, CA",
  },
];

export function publicListings() {
  return LISTINGS.map(({ id, publicName, publicLocation }) => ({
    id,
    publicName,
    publicLocation,
  }));
}

export function resolveListing(env, listingId) {
  const requested = String(listingId || "").trim().toLowerCase();
  const listing =
    LISTINGS.find((item) => item.id === requested) ||
    (LISTINGS.length === 1 ? LISTINGS[0] : null);
  if (!listing) return null;

  return {
    ...listing,
    address: listingAddress(env, listing.id),
  };
}

function listingAddress(env, id) {
  const key = `LISTING_${id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_ADDRESS`;
  if (env[key]) return String(env[key]).trim();

  try {
    const map = JSON.parse(env.LISTING_ADDRESSES || "{}");
    return String(map[id] || "").trim();
  } catch {
    return "";
  }
}
