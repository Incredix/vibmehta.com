const TO_EMAIL = "vibhorfall@gmail.com";
const FROM_EMAIL = "applications@vibmehta.com";
const SITE_NAME = "Vib Mehta Rentals";

const REQUIRED = [
  "fullName",
  "email",
  "phone",
  "currentAddress",
  "moveInDate",
  "employer",
  "monthlyIncome",
  "signature",
  "certify",
];

const LABELS = {
  propertyAddress: "Property applying for",
  desiredRent: "Monthly rent offered",
  leaseTerm: "Requested lease term",
  moveInDate: "Desired move-in date",
  fullName: "Full legal name",
  otherNames: "Other names used",
  dateOfBirth: "Date of birth",
  ssnLast4: "SSN last 4",
  license: "Driver's license / state ID",
  email: "Email",
  phone: "Phone",
  currentAddress: "Current address",
  currentRent: "Current monthly rent",
  timeAtAddress: "Time at current address",
  landlordName: "Current landlord / manager",
  landlordPhone: "Landlord phone",
  reasonLeaving: "Reason for leaving",
  employer: "Employer",
  jobTitle: "Job title",
  employmentLength: "Time at job",
  workPhone: "Work phone",
  monthlyIncome: "Gross monthly income",
  otherIncome: "Other income",
  occupants: "Other occupants",
  pets: "Pets",
  vehicles: "Vehicles",
  evicted: "Ever been evicted?",
  bankruptcy: "Bankruptcy in last 7 years?",
  felony: "Felony conviction?",
  screeningNotes: "Screening notes",
  emergencyName: "Emergency contact",
  emergencyPhone: "Emergency phone",
  emergencyRelation: "Relationship",
  howHeard: "How did you hear about this rental?",
  signature: "Signature",
  submittedAt: "Submitted",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apply") {
      if (request.method === "OPTIONS") {
        return cors(new Response(null, { status: 204 }));
      }
      if (request.method !== "POST") {
        return cors(json({ ok: false, error: "Method not allowed" }, 405));
      }
      return cors(await handleApply(request, env));
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleApply(request, env) {
  let data;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch {
    return json({ ok: false, error: "Could not read the application." }, 400);
  }

  if (typeof data !== "object" || data === null) {
    return json({ ok: false, error: "Invalid application." }, 400);
  }

  // Honeypot — bots fill hidden fields.
  if (String(data.fax || data.website || "").trim()) {
    return json({ ok: true });
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "fax" || key === "website" || key === "certify") continue;
    cleaned[key] = String(value ?? "").trim();
  }

  const missing = REQUIRED.filter((key) => {
    if (key === "certify") return !isChecked(data.certify);
    return !cleaned[key];
  });

  if (missing.length) {
    return json(
      { ok: false, error: "Please complete the required fields.", missing },
      400,
    );
  }

  if (!isEmail(cleaned.email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  cleaned.submittedAt = new Date().toISOString();
  cleaned.applicantIp = request.headers.get("cf-connecting-ip") || "";

  const subject = `Rental application — ${cleaned.fullName}`;
  const text = toPlainText(cleaned);
  const html = toHtmlEmail(cleaned);

  try {
    await deliverEmail(env, {
      subject,
      text,
      html,
      replyTo: cleaned.email,
      applicantName: cleaned.fullName,
    });
  } catch (err) {
    console.error("Email delivery failed", err);
    return json(
      {
        ok: false,
        error:
          "The application could not be emailed. Please try again or email vibhorfall@gmail.com directly.",
      },
      502,
    );
  }

  return json({ ok: true });
}

async function deliverEmail(env, { subject, text, html, replyTo, applicantName }) {
  const to = env.TO_EMAIL || TO_EMAIL;
  const from = env.FROM_EMAIL || FROM_EMAIL;

  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    try {
      await env.EMAIL.send({
        to,
        from: { name: env.SITE_NAME || SITE_NAME, email: from },
        replyTo,
        subject,
        text,
        html,
      });
      return;
    } catch (err) {
      console.warn("Cloudflare Email send failed, using backup", err);
    }
  }

  // Backup: FormSubmit delivers to Gmail with no extra Cloudflare product setup.
  // The first live submission sends a one-time confirmation email to Gmail.
  const backup = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: subject,
      _template: "table",
      _captcha: "false",
      _replyto: replyTo,
      name: applicantName,
      email: replyTo,
      message: text,
    }),
  });

  if (!backup.ok) {
    const body = await backup.text();
    throw new Error(`Backup email failed (${backup.status}): ${body}`);
  }
}

function toPlainText(data) {
  const lines = [`New rental application from ${data.fullName}`, ""];
  for (const [key, label] of Object.entries(LABELS)) {
    const value = data[key];
    if (!value) continue;
    lines.push(`${label}: ${value}`);
  }
  return lines.join("\n");
}

function toHtmlEmail(data) {
  const rows = Object.entries(LABELS)
    .filter(([key]) => data[key])
    .map(
      ([key, label]) =>
        `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#5c564e;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#1c1916;vertical-align:top;">${escapeHtml(data[key]).replace(/\n/g, "<br>")}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<body style="margin:0;background:#f6f1e8;font-family:Georgia,serif;">
  <div style="max-width:640px;margin:24px auto;background:#fffdf8;border:1px solid #e6dccb;border-radius:12px;overflow:hidden;">
    <div style="padding:24px 28px;background:#2c4a3e;color:#f6f1e8;">
      <div style="letter-spacing:.16em;text-transform:uppercase;font-size:11px;opacity:.8;">${escapeHtml(SITE_NAME)}</div>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:normal;">New rental application</h1>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">${rows}</table>
    <p style="padding:18px 28px 28px;color:#7a7368;font-size:13px;">Reply directly to this email to reach the applicant.</p>
  </div>
</body>
</html>`;
}

function isChecked(value) {
  return value === true || value === "true" || value === "on" || value === "yes";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function cors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
