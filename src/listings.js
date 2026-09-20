/**
 * Catalog + site config. Add a listing here, set LISTING_<ID>_ADDRESS in Cloudflare.
 * Features default from availability: open → apply+tour; closed → waitlist+tour.
 */
export const SITE = {
  brand: "Theory",
  companyName: "Theory Company",
  companyUrl: "https://theorycompany.com",
  hero: {
    eyebrow: "Now available",
    headline: "A quiet home in Fremont.",
    lede: "Handled directly.",
    featuredListingId: "fremont",
  },
};

/** Hourly tour slots shown on every tour form. */
export const TOUR_TIMES = [
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
];

export const LISTINGS = [
  {
    id: "fremont",
    publicName: "Fremont home",
    publicLocation: "Fremont, CA",
    facts: "3 bed · 2 bath · single-family",
    available: true,
  },
  {
    id: "fremont-room",
    publicName: "Private room",
    publicLocation: "Fremont, CA",
    facts: "Single room · private entrance",
    available: false,
    addressFrom: "fremont",
  },
];

export function listingFeatures(listing) {
  const available = listing?.available !== false;
  const overrides = listing?.features || {};
  return {
    apply: overrides.apply ?? available,
    tour: overrides.tour ?? true,
    waitlist: overrides.waitlist ?? !available,
  };
}

export function publicListings() {
  return LISTINGS.map((listing) => {
    const available = listing.available !== false;
    return {
      id: listing.id,
      publicName: listing.publicName,
      publicLocation: listing.publicLocation,
      facts: listing.facts,
      available,
      features: listingFeatures({ ...listing, available }),
    };
  });
}

export function publicSite() {
  const featured =
    LISTINGS.find((item) => item.id === SITE.hero.featuredListingId) ||
    LISTINGS.find((item) => item.available !== false) ||
    LISTINGS[0] ||
    null;
  return {
    ...SITE,
    featuredListingId: featured?.id || null,
    featuredListing: featured
      ? {
          id: featured.id,
          publicName: featured.publicName,
          publicLocation: featured.publicLocation,
          available: featured.available !== false,
          features: listingFeatures(featured),
        }
      : null,
  };
}

export function resolveListing(env, listingId, { requireAvailable = false } = {}) {
  const requested = String(listingId || "").trim().toLowerCase();
  const listing =
    LISTINGS.find((item) => item.id === requested) ||
    (LISTINGS.length === 1 ? LISTINGS[0] : null);
  if (!listing) return null;
  if (requireAvailable && listing.available === false) return null;

  return {
    ...listing,
    available: listing.available !== false,
    features: listingFeatures(listing),
    address: listingAddress(env, listing.addressFrom || listing.id),
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
