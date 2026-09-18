const grid = document.getElementById("listing-grid");

loadListings();

async function loadListings() {
  try {
    const res = await fetch("/api/listings");
    const payload = await res.json();
    const listings = payload.listings || [];
    if (!listings.length || !grid) return;

    grid.innerHTML = listings
      .map(
        (listing) => `
      <a class="home-listing" href="/apply?listing=${encodeURIComponent(listing.id)}">
        <span class="eyebrow">${escapeHtml(listing.publicLocation)}</span>
        <h2>${escapeHtml(listing.publicName)}</h2>
        <p>${escapeHtml(listing.facts || "Residential rental")}. Apply in a few minutes.</p>
        <span class="listing-cta">Start application</span>
      </a>`,
      )
      .join("");
  } catch {
    /* Keep the static Fremont card. */
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
