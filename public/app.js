const form = document.getElementById("application-form");
const errorEl = document.getElementById("form-error");
const success = document.getElementById("success");
const submitBtn = document.getElementById("submit-btn");

document.getElementById("year").textContent = new Date().getFullYear();

const params = new URLSearchParams(window.location.search);
const property = params.get("property");
if (property) {
  document.getElementById("propertyAddress").value = property;
}

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
