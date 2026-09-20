const form = document.getElementById("tour-form");
const errorEl = document.getElementById("tour-error");
const submitBtn = document.getElementById("tour-submit");
const done = document.getElementById("tour-done");
const listingSelect = document.getElementById("listingId");
const listingCard = document.getElementById("listing-card");

document.getElementById("year").textContent = new Date().getFullYear();

const tourDate = document.getElementById("tourDate");
if (tourDate) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tourDate.min = tomorrow.toISOString().slice(0, 10);
}

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
  const selected = listingSelect.selectedOptions[0];
  if (selected) {
    data.listingName = selected.dataset.name || selected.textContent;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    const response = await fetch("/api/tour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not send the tour request.");
    }
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Request tour";
  }
});

async function loadListings() {
  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("listing") || "").toLowerCase();

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
      const option = new Option(listing.publicName, listing.id, true, true);
      option.dataset.name = `${listing.publicName} · ${listing.publicLocation}`;
      listingSelect.append(option);
      listingSelect.hidden = true;
      listingCard.hidden = false;
      listingCard.textContent = `${listing.publicName} · ${listing.publicLocation}${
        listing.available === false ? " · Currently unavailable to rent" : ""
      }`;
      return;
    }

    listingSelect.append(new Option("Choose a listing", ""));
    for (const listing of listings) {
      const label =
        listing.available === false
          ? `${listing.publicName} · ${listing.publicLocation} (unavailable)`
          : `${listing.publicName} · ${listing.publicLocation}`;
      const option = new Option(label, listing.id);
      option.dataset.name = `${listing.publicName} · ${listing.publicLocation}`;
      listingSelect.append(option);
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
