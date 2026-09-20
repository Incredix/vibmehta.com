import {
  fetchCatalog,
  fillListingSelect,
  fillTourTimeSelect,
  setTourDateMin,
} from "/js/catalog.js";

const form = document.getElementById("tour-form");
const errorEl = document.getElementById("tour-error");
const submitBtn = document.getElementById("tour-submit");
const done = document.getElementById("tour-done");
const listingSelect = document.getElementById("listingId");
const listingCard = document.getElementById("listing-card");

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

setTourDateMin(document.getElementById("tourDate"));
fillTourTimeSelect(document.querySelector("#tour-form select[name='tourTime']"));

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
    const { listings } = await fetchCatalog();
    const tourable = listings.filter((item) => (item.features?.tour ?? true) === true);
    fillListingSelect(listingSelect, tourable, {
      requested,
      mode: "all",
      card: listingCard,
    });
  } catch {
    listingSelect.innerHTML = `<option value="">Could not load listings</option>`;
  }
}
