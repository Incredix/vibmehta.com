const form = document.getElementById("application-form");
const errorEl = document.getElementById("form-error");
const success = document.getElementById("success");
const submitBtn = document.getElementById("submit-btn");
const listingSelect = document.getElementById("listingId");
const listingCard = document.getElementById("listing-card");
const tourForm = document.getElementById("tour-form");
const tourBlock = document.getElementById("tour-block");
const tourDone = document.getElementById("tour-done");
const tourError = document.getElementById("tour-error");
const tourSubmit = document.getElementById("tour-submit");
const tourSkip = document.getElementById("tour-skip");

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

    fillTourForm(payload.applicant || data, payload.id);
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

if (tourForm) {
  tourForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    tourError.hidden = true;

    if (!tourForm.reportValidity()) {
      tourError.textContent = "Choose a date and time for the tour.";
      tourError.hidden = false;
      return;
    }

    const data = Object.fromEntries(new FormData(tourForm).entries());
    tourSubmit.disabled = true;
    tourSubmit.textContent = "Sending…";

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
      tourBlock.hidden = true;
      tourDone.hidden = false;
    } catch (err) {
      tourError.textContent = err.message;
      tourError.hidden = false;
      tourSubmit.disabled = false;
      tourSubmit.textContent = "Request tour";
    }
  });
}

if (tourSkip) {
  tourSkip.addEventListener("click", () => {
    tourBlock.hidden = true;
    tourDone.hidden = false;
    tourDone.textContent =
      "No tour requested. The landlord will follow up by email if needed.";
  });
}

function fillTourForm(applicant, applicationId) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };
  set("tour-fullName", applicant.fullName);
  set("tour-email", applicant.email);
  set("tour-phone", applicant.phone);
  set("tour-listingId", applicant.listingId);
  set("tour-listingName", applicant.listingName);
  set("tour-applicationId", applicationId || "");
}

async function loadListings() {
  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("listing") || params.get("property") || "").toLowerCase();

  try {
    const res = await fetch("/api/listings");
    const payload = await res.json();
    const listings = payload.listings || [];
    listingSelect.innerHTML = "";

    const open = listings.filter((item) => item.available !== false);
    const picked = listings.find((item) => item.id === requested);

    if (!open.length) {
      listingSelect.innerHTML = `<option value="">No listings available</option>`;
      return;
    }

    if (picked && picked.available === false) {
      const panel = document.getElementById("waitlist-panel");
      const heading = document.getElementById("waitlist-heading");
      const listingIdInput = document.getElementById("waitlist-listing-id");
      if (panel) panel.hidden = false;
      if (heading) heading.textContent = `${picked.publicName} is unavailable.`;
      if (listingIdInput) listingIdInput.value = picked.id;
    }

    if (open.length === 1) {
      const listing = open[0];
      listingSelect.innerHTML = `<option value="${escapeAttr(listing.id)}" selected>${escapeHtml(listing.publicName)}</option>`;
      listingSelect.hidden = true;
      listingCard.hidden = false;
      listingCard.textContent = `${listing.publicName} · ${listing.publicLocation}`;
      return;
    }

    listingSelect.append(new Option("Choose a listing", ""));
    for (const listing of open) {
      listingSelect.append(
        new Option(`${listing.publicName} · ${listing.publicLocation}`, listing.id),
      );
    }

    if (requested && open.some((item) => item.id === requested)) {
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
