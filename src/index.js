import { login, logout, requireAdmin, sessionOk } from "./auth.js";
import { creditProvider, runCredit } from "./credit.js";
import {
  getApplication,
  getApplicationForCredit,
  hasDb,
  listApplications,
  saveApplication,
  saveCreditCheck,
  updateNotes,
  updateStatus,
} from "./db.js";

const TO_EMAIL = "vibhorfall@gmail.com";
const FROM_EMAIL = "applications@vibmehta.com";
const SITE_NAME = "Vib Mehta Rentals";

const REQUIRED = [
  "fullName",
  "email",
  "phone",
  "dateOfBirth",
  "currentAddress",
  "moveInDate",
  "employer",
  "monthlyIncome",
  "signature",
  "certify",
  "creditAuth",
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
  city: "City",
  state: "State",
  zip: "ZIP",
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
    const { pathname } = url;

    if (pathname === "/api/apply") {
      if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
      if (request.method !== "POST") return cors(json({ ok: false, error: "Method not allowed" }, 405));
      return cors(await handleApply(request, env));
    }

    if (pathname.startsWith("/api/admin/")) {
      return handleAdmin(request, env, pathname);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleAdmin(request, env, pathname) {
  if (pathname === "/api/admin/login" && request.method === "POST") {
    return login(request, env);
  }
  if (pathname === "/api/admin/logout" && request.method === "POST") {
    return logout(request);
  }
  if (pathname === "/api/admin/session" && request.method === "GET") {
    return sessionOk(request, env);
  }

  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  if (!hasDb(env)) {
    return json(
      {
        ok: false,
        error:
          "Create a D1 database named vibmehta-applications, bind it as DB, and run migrations.",
      },
      503,
    );
  }

  if (pathname === "/api/admin/applications" && request.method === "GET") {
    const applications = await listApplications(env);
    return json({
      ok: true,
      applications,
      creditProvider: creditProvider(env),
    });
  }

  const match = pathname.match(/^\/api\/admin\/applications\/([^/]+)(?:\/(credit|status|notes))?$/);
  if (!match) return json({ ok: false, error: "Not found." }, 404);

  const id = match[1];
  const action = match[2];

  if (!action && request.method === "GET") {
    const application = await getApplication(env, id);
    if (!application) return json({ ok: false, error: "Application not found." }, 404);
    return json({ ok: true, application, creditProvider: creditProvider(env) });
  }

  if (action === "status" && request.method === "POST") {
    const body = await readJson(request);
    try {
      const ok = await updateStatus(env, id, String(body.status || ""));
      if (!ok) return json({ ok: false, error: "Application not found." }, 404);
      return json({ ok: true });
    } catch (err) {
      return json({ ok: false, error: err.message }, 400);
    }
  }

  if (action === "notes" && request.method === "POST") {
    const body = await readJson(request);
    const ok = await updateNotes(env, id, body.notes);
    if (!ok) return json({ ok: false, error: "Application not found." }, 404);
    return json({ ok: true });
  }

  if (action === "credit" && request.method === "POST") {
    const row = await getApplicationForCredit(env, id);
    if (!row) return json({ ok: false, error: "Application not found." }, 404);
    try {
      const result = await runCredit(env, row);
      await saveCreditCheck(env, id, result);
      await updateStatus(env, id, "reviewing");
      return json({
        ok: true,
        credit: {
          provider: result.provider,
          status: result.status,
          score: result.score,
          rating: result.rating,
          recommendation: result.recommendation,
          summary: result.summary,
        },
      });
    } catch (err) {
      await saveCreditCheck(env, id, {
        provider: creditProvider(env),
        status: "failed",
        summary: err.message,
        raw: { error: err.message },
      });
      return json({ ok: false, error: err.message }, 502);
    }
  }

  return json({ ok: false, error: "Method not allowed." }, 405);
}

async function handleApply(request, env) {
  let data;
  try {
    data = await readBody(request);
  } catch {
    return json({ ok: false, error: "Could not read the application." }, 400);
  }

  if (typeof data !== "object" || data === null) {
    return json({ ok: false, error: "Invalid application." }, 400);
  }

  if (String(data.fax || data.website || "").trim()) {
    return json({ ok: true });
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "fax" || key === "website" || key === "certify" || key === "creditAuth") continue;
    cleaned[key] = String(value ?? "").trim();
  }

  const missing = REQUIRED.filter((key) => {
    if (key === "certify" || key === "creditAuth") return !isChecked(data[key]);
    return !cleaned[key];
  });

  if (missing.length) {
    return json({ ok: false, error: "Please complete the required fields.", missing }, 400);
  }

  if (!isEmail(cleaned.email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  const ssnDigits = String(cleaned.ssnFull || cleaned.ssnLast4 || "").replace(/\D/g, "");
  if (ssnDigits.length === 9) {
    cleaned.ssnLast4 = ssnDigits.slice(-4);
    cleaned.ssnFull = ssnDigits;
  } else if (ssnDigits.length === 4) {
    cleaned.ssnLast4 = ssnDigits;
  }

  cleaned.submittedAt = new Date().toISOString();
  cleaned.applicantIp = request.headers.get("cf-connecting-ip") || "";

  let applicationId = null;
  if (hasDb(env)) {
    try {
      applicationId = await saveApplication(env, cleaned);
    } catch (err) {
      console.error("Database save failed", err);
      return json(
        { ok: false, error: "The application could not be saved. Please try again." },
        500,
      );
    }
  }

  const emailSafe = { ...cleaned };
  delete emailSafe.ssnFull;
  if (applicationId) emailSafe.adminId = applicationId;

  try {
    await deliverEmail(env, {
      subject: `Rental application — ${cleaned.fullName}`,
      text: toPlainText(emailSafe),
      html: toHtmlEmail(emailSafe, applicationId),
      replyTo: cleaned.email,
      applicantName: cleaned.fullName,
    });
  } catch (err) {
    console.error("Email delivery failed", err);
    if (!applicationId) {
      return json(
        {
          ok: false,
          error:
            "The application could not be emailed. Please try again or email vibhorfall@gmail.com directly.",
        },
        502,
      );
    }
  }

  return json({ ok: true, id: applicationId });
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
  if (data.adminId) lines.push(`Inbox: https://vibmehta.com/admin  (id ${data.adminId})`, "");
  for (const [key, label] of Object.entries(LABELS)) {
    const value = data[key];
    if (!value) continue;
    lines.push(`${label}: ${value}`);
  }
  return lines.join("\n");
}

function toHtmlEmail(data, applicationId) {
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

  const inbox = applicationId
    ? `<p style="padding:0 28px 8px;font-size:14px;"><a href="https://vibmehta.com/admin" style="color:#2c4a3e;">Open landlord inbox</a></p>`
    : "";

  return `<!doctype html>
<html>
<body style="margin:0;background:#f6f1e8;font-family:Georgia,serif;">
  <div style="max-width:640px;margin:24px auto;background:#fffdf8;border:1px solid #e6dccb;border-radius:12px;overflow:hidden;">
    <div style="padding:24px 28px;background:#2c4a3e;color:#f6f1e8;">
      <div style="letter-spacing:.16em;text-transform:uppercase;font-size:11px;opacity:.8;">${escapeHtml(SITE_NAME)}</div>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:normal;">New rental application</h1>
    </div>
    ${inbox}
    <table style="width:100%;border-collapse:collapse;font-size:15px;">${rows}</table>
    <p style="padding:18px 28px 28px;color:#7a7368;font-size:13px;">Reply directly to this email to reach the applicant. Full SSN is never emailed.</p>
  </div>
</body>
</html>`;
}

async function readBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
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
