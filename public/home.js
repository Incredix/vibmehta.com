const grid = document.getElementById("listing-grid");

loadListings();

async function loadListings() {
  try {
    const res = await fetch("/api/listings");
    const payload = await res.json();
    const listings = payload.listings || [];
    if (!listings.length || !grid) return;

    grid.innerHTML = listings
      .map((listing) => {
        const facts = escapeHtml(listing.facts || "Residential rental");
        const name = escapeHtml(listing.publicName);
        const location = escapeHtml(listing.publicLocation);
        if (listing.available === false) {
          return `
      <article class="home-listing is-unavailable">
        <span class="eyebrow">${location}</span>
        <h2>${name}</h2>
        <p>${facts}.</p>
        <span class="listing-cta listing-cta-muted">Currently unavailable</span>
      </article>`;
        }
        return `
      <a class="home-listing" href="/apply?listing=${encodeURIComponent(listing.id)}">
        <span class="eyebrow">${location}</span>
        <h2>${name}</h2>
        <p>${facts}. Apply in a few minutes.</p>
        <span class="listing-cta">Start application</span>
      </a>`;
      })
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
