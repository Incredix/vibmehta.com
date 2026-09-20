/** Shared listing UI helpers (no build step — plain ES module). */

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

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export async function fetchCatalog() {
  const res = await fetch("/api/listings");
  const payload = await res.json();
  return {
    listings: payload.listings || [],
    site: payload.site || null,
  };
}

export function listingLabel(listing, { markUnavailable = true } = {}) {
  const base = `${listing.publicName} · ${listing.publicLocation}`;
  if (markUnavailable && listing.available === false) return `${base} (unavailable)`;
  return base;
}

export function featuresOf(listing) {
  return (
    listing.features || {
      apply: listing.available !== false,
      tour: true,
      waitlist: listing.available === false,
    }
  );
}

/** Fill a <select> from catalog. mode: "all" | "apply" (only listings with apply). */
export function fillListingSelect(select, listings, { requested = "", mode = "all", card = null } = {}) {
  if (!select) return [];
  select.innerHTML = "";
  const filtered =
    mode === "apply" ? listings.filter((item) => featuresOf(item).apply) : listings;

  if (!filtered.length) {
    select.innerHTML = `<option value="">No listings available</option>`;
    return filtered;
  }

  if (filtered.length === 1) {
    const listing = filtered[0];
    const option = new Option(listing.publicName, listing.id, true, true);
    option.dataset.name = listingLabel(listing, { markUnavailable: false });
    select.append(option);
    select.hidden = true;
    if (card) {
      card.hidden = false;
      card.textContent = listingLabel(listing, { markUnavailable: true }).replace(
        " (unavailable)",
        " · Currently unavailable to rent",
      );
    }
    return filtered;
  }

  select.hidden = false;
  if (card) card.hidden = true;
  select.append(new Option("Choose a listing", ""));
  for (const listing of filtered) {
    const option = new Option(listingLabel(listing), listing.id);
    option.dataset.name = listingLabel(listing, { markUnavailable: false });
    select.append(option);
  }
  if (requested && filtered.some((item) => item.id === requested)) {
    select.value = requested;
  }
  return filtered;
}

export function setTourDateMin(input) {
  if (!input) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  input.min = tomorrow.toISOString().slice(0, 10);
}

export function fillTourTimeSelect(select) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Choose a time</option>`;
  for (const time of TOUR_TIMES) {
    select.append(new Option(time, time));
  }
  if (current && TOUR_TIMES.includes(current)) select.value = current;
}

export function renderListingCard(listing) {
  const facts = escapeHtml(listing.facts || "Residential rental");
  const name = escapeHtml(listing.publicName);
  const location = escapeHtml(listing.publicLocation);
  const id = encodeURIComponent(listing.id);
  const features = featuresOf(listing);
  const actions = [];

  if (features.apply) {
    actions.push(
      `<a class="listing-cta" href="/apply?listing=${id}">Start application</a>`,
    );
  }
  if (features.tour) {
    actions.push(
      `<a class="listing-cta listing-cta-muted" href="/tour?listing=${id}">Request a tour</a>`,
    );
  }

  const waitlist = features.waitlist
    ? `<form class="waitlist-form" data-waitlist>
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
        </form>`
    : "";

  const blurb = features.apply
    ? `${facts}. Apply in a few minutes.`
    : `${facts}. Live listing — applications open when it’s available.`;

  const eyebrow =
    listing.available === false ? `${location} · Unavailable` : location;

  return `
      <article class="home-listing">
        <span class="eyebrow">${eyebrow}</span>
        <h2>${name}</h2>
        <p>${blurb}</p>
        ${actions.length ? `<p class="listing-actions">${actions.join("")}</p>` : ""}
        ${waitlist}
      </article>`;
}

export function renderHeroActions(featured) {
  if (!featured) return "";
  const id = encodeURIComponent(featured.id);
  const features = featuresOf(featured);
  const parts = [];
  if (features.apply) {
    parts.push(`<a class="btn" href="/apply?listing=${id}">Apply for this home</a>`);
  }
  if (features.tour) {
    parts.push(
      `<a class="btn btn-secondary" href="/tour?listing=${id}">Request a tour</a>`,
    );
  }
  if (features.waitlist) {
    parts.push(
      `<a class="btn btn-secondary" href="/apply?listing=${id}">Get availability alerts</a>`,
    );
  }
  return parts.join("");
}
