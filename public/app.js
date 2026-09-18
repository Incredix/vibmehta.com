const form = document.getElementById("application-form");
const errorEl = document.getElementById("form-error");
const success = document.getElementById("success");
const submitBtn = document.getElementById("submit-btn");
const listingSelect = document.getElementById("listingId");
const listingCard = document.getElementById("listing-card");

document.getElementById("year").textContent = new Date().getFullYear();

loadListings();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.hidden = true;

  if (!form.reportValidity()) {
    errorEl.textContent = "Please complete the required fields.";
    errorEl.hidden = false;
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    const response = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not send the application.");
    }

    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit application";
  }
});

async function loadListings() {
  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("listing") || params.get("property") || "").toLowerCase();

  try {
    const res = await fetch("/api/listings");
    const payload = await res.json();
    const listings = payload.listings || [];
    listingSelect.innerHTML = "";

    if (!listings.length) {
      listingSelect.innerHTML = `<option value="">No listings available</option>`;
      return;
    }

    if (listings.length === 1) {
      const listing = listings[0];
      listingSelect.innerHTML = `<option value="${escapeAttr(listing.id)}" selected>${escapeHtml(listing.publicName)}</option>`;
      listingSelect.hidden = true;
      listingCard.hidden = false;
      listingCard.textContent = `${listing.publicName} · ${listing.publicLocation}`;
      return;
    }

    listingSelect.append(new Option("Choose a home", ""));
    for (const listing of listings) {
      listingSelect.append(
        new Option(`${listing.publicName} · ${listing.publicLocation}`, listing.id),
      );
    }

    if (requested && listings.some((item) => item.id === requested)) {
      listingSelect.value = requested;
    }
  } catch {
    listingSelect.innerHTML = `<option value="fremont" selected>Fremont home</option>`;
    listingSelect.hidden = true;
    listingCard.hidden = false;
    listingCard.textContent = "Fremont home · Fremont, CA";
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
