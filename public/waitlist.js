document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-waitlist]");
  if (!form) return;
  event.preventDefault();

  const status = form.querySelector("[data-waitlist-status]");
  const button = form.querySelector("button[type='submit']");
  const data = Object.fromEntries(new FormData(form).entries());
  if (status) {
    status.hidden = true;
    status.classList.remove("form-error");
  }
  if (button) {
    button.disabled = true;
    button.textContent = "Saving…";
  }

  try {
    const response = await fetch("/api/availability-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not save that alert.");
    }
    form.querySelectorAll("input, button").forEach((el) => {
      if (el.type !== "hidden") el.disabled = true;
    });
    if (button) button.textContent = "You’re on the list";
    if (status) {
      status.textContent = "Check your inbox — we’ll email you when it opens.";
      status.hidden = false;
    }
  } catch (err) {
    if (button) {
      button.disabled = false;
      button.textContent = "Notify me";
    }
    if (status) {
      status.textContent = err.message;
      status.classList.add("form-error");
      status.hidden = false;
    }
  }
});
