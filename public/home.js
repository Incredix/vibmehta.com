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
        const id = encodeURIComponent(listing.id);
        const tourLink = `<a class="listing-cta listing-cta-muted" href="/tour?listing=${id}">Request a tour</a>`;

        if (listing.available === false) {
          return `
      <article class="home-listing">
        <span class="eyebrow">${location} · Unavailable</span>
        <h2>${name}</h2>
        <p>${facts}. Live listing — applications open when it’s available.</p>
        <p class="listing-actions">${tourLink}</p>
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
      <article class="home-listing">
        <span class="eyebrow">${location}</span>
        <h2>${name}</h2>
        <p>${facts}. Apply in a few minutes.</p>
        <p class="listing-actions">
          <a class="listing-cta" href="/apply?listing=${id}">Start application</a>
          ${tourLink}
        </p>
      </article>`;
      })
      .join("");
  } catch {
    /* Keep the static listing cards. */
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
