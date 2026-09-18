const loginView = document.getElementById("login-view");
const inboxView = document.getElementById("inbox-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const listEl = document.getElementById("app-list");
const listMeta = document.getElementById("list-meta");
const detailPane = document.getElementById("detail-pane");
const logoutBtn = document.getElementById("logout-btn");
const providerPill = document.getElementById("provider-pill");

const LABELS = {
  listingName: "Listing",
  listingLocation: "Area",
  propertyAddress: "Street address",
  desiredRent: "Rent offered",
  leaseTerm: "Lease term",
  moveInDate: "Move-in",
  fullName: "Name",
  otherNames: "Other names",
  dateOfBirth: "Date of birth",
  ssnLast4: "SSN last 4",
  license: "ID",
  email: "Email",
  phone: "Phone",
  currentAddress: "Current address",
  city: "City",
  state: "State",
  zip: "ZIP",
  currentRent: "Current rent",
  timeAtAddress: "Time at address",
  landlordName: "Current landlord",
  landlordPhone: "Landlord phone",
  reasonLeaving: "Reason for leaving",
  employer: "Employer",
  jobTitle: "Title",
  employmentLength: "Time at job",
  workPhone: "Work phone",
  monthlyIncome: "Monthly income",
  otherIncome: "Other income",
  occupants: "Occupants",
  pets: "Pets",
  vehicles: "Vehicles",
  evicted: "Evicted?",
  bankruptcy: "Bankruptcy?",
  felony: "Felony?",
  screeningNotes: "Screening notes",
  emergencyName: "Emergency contact",
  emergencyPhone: "Emergency phone",
  emergencyRelation: "Relationship",
  howHeard: "Source",
  signature: "Signature",
};

let selectedId = null;
let creditProviderName = "demo";

boot();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const password = new FormData(loginForm).get("password");
  const res = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    loginError.textContent = res.error || "Could not sign in.";
    loginError.hidden = false;
    return;
  }
  await showInbox();
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" });
  selectedId = null;
  showLogin();
});

async function boot() {
  const session = await api("/api/admin/session");
  if (session.ok) {
    await showInbox();
    return;
  }
  showLogin();
  if (session.configured === false) {
    loginError.textContent =
      "Set the ADMIN_PASSWORD Worker secret in Cloudflare, then reload.";
    loginError.hidden = false;
  }
}

function showLogin() {
  loginView.hidden = false;
  inboxView.hidden = true;
  logoutBtn.hidden = true;
  providerPill.hidden = true;
}

async function showInbox() {
  loginView.hidden = true;
  inboxView.hidden = false;
  logoutBtn.hidden = false;
  await refreshList();
}

async function refreshList() {
  const res = await api("/api/admin/applications");
  if (!res.ok) {
    listEl.innerHTML = `<p class="form-error">${escapeHtml(res.error || "Could not load applications.")}</p>`;
    return;
  }

  creditProviderName = res.creditProvider || "demo";
  providerPill.hidden = false;
  providerPill.textContent =
    creditProviderName === "demo" ? "Demo credit" : `${creditProviderName} credit`;
  listMeta.textContent = `${res.applications.length} received`;

  if (!res.applications.length) {
    listEl.innerHTML = `<p class="empty" style="padding:16px 18px">No applications yet.</p>`;
    return;
  }

  listEl.innerHTML = res.applications
    .map((app) => {
      const active = app.id === selectedId ? " active" : "";
      const score = app.credit_score
        ? `<span class="score-chip ${escapeHtml(app.credit_rating || "unknown")}">${app.credit_score}</span>`
        : `<span class="score-chip unknown">—</span>`;
      return `<button class="app-row${active}" data-id="${app.id}">
        <span>
          <strong>${escapeHtml(app.full_name)}</strong>
          <small>${escapeHtml(app.listing_name || app.property_address || "No listing")} · ${formatDate(app.created_at)}</small>
          <span class="status">${escapeHtml(app.status)}</span>
        </span>
        ${score}
      </button>`;
    })
    .join("");

  listEl.querySelectorAll(".app-row").forEach((btn) => {
    btn.addEventListener("click", () => openApplication(btn.dataset.id));
  });

  if (selectedId) await openApplication(selectedId);
}

async function openApplication(id) {
  selectedId = id;
  listEl.querySelectorAll(".app-row").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === id);
  });

  const res = await api(`/api/admin/applications/${id}`);
  if (!res.ok) {
    detailPane.innerHTML = `<p class="form-error">${escapeHtml(res.error)}</p>`;
    return;
  }

  const app = res.application;
  const payload = app.payload || {};
  const latest = (app.credit_checks || [])[0];
  const fields = Object.entries(LABELS)
    .filter(([key]) => payload[key])
    .map(
      ([key, label]) =>
        `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(payload[key])}</dd></div>`,
    )
    .join("");

  const demoNote =
    latest?.provider === "demo"
      ? `<p class="demo-flag">This is a demo score. Add Microbilt or CREDIT_API_KEY for a live pull.</p>`
      : "";

  const creditHtml = latest
    ? `<div class="credit-card">
        <p class="eyebrow">${escapeHtml(latest.provider)} · ${escapeHtml(latest.status)}</p>
        <div class="score">${latest.score || "—"}</div>
        <p>${escapeHtml(latest.recommendation || latest.summary || "")}</p>
        ${demoNote}
      </div>`
    : `<div class="credit-card"><p>No credit pull yet.</p></div>`;

  detailPane.innerHTML = `
    <p class="eyebrow">${escapeHtml(app.status)}</p>
    <h2>${escapeHtml(app.full_name)}</h2>
    <p class="hint">${escapeHtml(app.email)} · ${escapeHtml(app.phone || "")}</p>
    ${creditHtml}
    <div class="actions-row">
      <button type="button" id="run-credit">Run credit</button>
      <button type="button" class="secondary" data-status="approved">Approve</button>
      <button type="button" class="secondary" data-status="declined">Decline</button>
      <button type="button" class="secondary" data-status="reviewing">Mark reviewing</button>
    </div>
    <p class="hint">${app.has_ssn ? "Full SSN on file (not shown)." : "Only last 4 on file — live credit needs the full SSN."}</p>
    <dl class="detail-grid">${fields}</dl>
    <label>Private notes
      <textarea id="notes" class="notes">${escapeHtml(app.notes || "")}</textarea>
    </label>
    <div class="actions-row">
      <button type="button" id="save-notes" class="secondary">Save notes</button>
    </div>
    <p id="detail-msg" class="hint"></p>
  `;

  document.getElementById("run-credit").addEventListener("click", () => runCredit(id));
  document.getElementById("save-notes").addEventListener("click", () => saveNotes(id));
  detailPane.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", () => setStatus(id, btn.dataset.status));
  });
}

async function runCredit(id) {
  const msg = document.getElementById("detail-msg");
  msg.textContent = "Pulling credit…";
  const res = await api(`/api/admin/applications/${id}/credit`, { method: "POST" });
  msg.textContent = res.ok ? res.credit.summary : res.error;
  if (res.ok) await refreshList();
}

async function setStatus(id, status) {
  const res = await api(`/api/admin/applications/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
  const msg = document.getElementById("detail-msg");
  msg.textContent = res.ok ? `Marked ${status}.` : res.error;
  if (res.ok) await refreshList();
}

async function saveNotes(id) {
  const notes = document.getElementById("notes").value;
  const res = await api(`/api/admin/applications/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
  document.getElementById("detail-msg").textContent = res.ok ? "Notes saved." : res.error;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  return res.json().catch(() => ({ ok: false, error: "Bad response" }));
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
