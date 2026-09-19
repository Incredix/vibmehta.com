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
      <article class="home-listing">
        <span class="eyebrow">${location} · Unavailable</span>
        <h2>${name}</h2>
        <p>${facts}. Live listing — applications open when it’s available.</p>
        <form class="waitlist-form" data-waitlist>
          <input type="hidden" name="listingId" value="${escapeAttr(listing.id)}" />
          <label>
            Email
            <input name="email" type="email" required autocomplete="email" placeholder="you@email.com" />
          </label>
          <button type="submit">Notify me</button>
          <label class="hp" aria-hidden="true">
            Fax
            <input name="fax" type="text" tabindex="-1" autocomplete="off" />
          </label>
          <p class="waitlist-status" data-waitlist-status hidden></p>
        </form>
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

function escapeAttr(value) {
  return escapeHtml(value);
}
