import {
  escapeAttr,
  escapeHtml,
  fetchCatalog,
  featuresOf,
} from "/js/catalog.js";

const grid = document.getElementById("listing-grid");
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

loadListings();

async function loadListings() {
  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("listing") || "").toLowerCase();

  try {
    const { listings } = await fetchCatalog();
    if (!grid) return;

    const tourable = listings.filter((item) => featuresOf(item).tour);
    const ordered = requested
      ? [
          ...tourable.filter((item) => item.id === requested),
          ...tourable.filter((item) => item.id !== requested),
        ]
      : tourable;

    if (!ordered.length) {
      grid.innerHTML = `<p class="req-note">No listings are taking tour requests right now.</p>`;
      return;
    }

    grid.innerHTML = ordered.map(renderTourGateCard).join("");
  } catch {
    if (grid) {
      grid.innerHTML = `<p class="req-note">Could not load listings. <a href="/apply">Start an application</a>.</p>`;
    }
  }
}

function renderTourGateCard(listing) {
  const features = featuresOf(listing);
  const id = encodeURIComponent(listing.id);
  const name = escapeHtml(listing.publicName);
  const location = escapeHtml(listing.publicLocation);
  const facts = escapeHtml(listing.facts || "Residential rental");
  const eyebrow =
    listing.available === false ? `${location} · Unavailable` : location;

  if (features.apply) {
    return `
      <article class="home-listing">
        <span class="eyebrow">${eyebrow}</span>
        <h2>${name}</h2>
        <p>${facts}. Submit an application, then schedule your tour.</p>
        <p class="listing-actions">
          <a class="listing-cta" href="/apply?listing=${id}&tour=1">Complete application</a>
        </p>
      </article>`;
  }

  return `
      <article class="home-listing">
        <span class="eyebrow">${eyebrow}</span>
        <h2>${name}</h2>
        <p>${facts}. This listing isn’t open to apply yet. Join the waitlist and we’ll follow up when tours are available.</p>
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
