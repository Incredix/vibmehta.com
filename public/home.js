import {
  fetchCatalog,
  renderHeroActions,
  renderListingCard,
} from "/js/catalog.js";

const grid = document.getElementById("listing-grid");
const heroActions = document.getElementById("hero-actions");

loadCatalog();

async function loadCatalog() {
  try {
    const { listings, site } = await fetchCatalog();
    if (grid && listings.length) {
      grid.innerHTML = listings.map(renderListingCard).join("");
    }
    if (heroActions && site?.featuredListing) {
      heroActions.innerHTML = renderHeroActions(site.featuredListing);
    }
  } catch {
    /* Keep server-rendered fallback markup. */
  }
}
