export function creditProvider(env) {
  const forced = String(env.CREDIT_PROVIDER || "").toLowerCase();
  if (forced) return forced;
  if (env.MICROBILT_CLIENT_ID && env.MICROBILT_CLIENT_SECRET) return "microbilt";
  if (env.CRS_API_KEY || (env.CREDIT_API_URL && env.CREDIT_API_KEY)) return "generic";
  return "demo";
}

export async function runCredit(env, application) {
  const provider = creditProvider(env);
  const person = toPerson(application);

  if (provider !== "demo" && person.ssn.replace(/\D/g, "").length !== 9) {
    throw new Error("A full 9-digit SSN is required for a live credit pull.");
  }

  if (provider === "microbilt") return runMicrobilt(env, person);
  if (provider === "generic" || provider === "crs") return runGeneric(env, person);
  return runDemo(person);
}

function toPerson(application) {
  let payload = {};
  try {
    payload = JSON.parse(application.payload || "{}");
  } catch {
    payload = {};
  }

  const { firstName, lastName } = splitName(application.full_name);
  const address = parseAddress(
    payload.currentAddress || application.property_address || "",
    payload,
  );

  return {
    firstName,
    lastName,
    fullName: application.full_name,
    email: application.email,
    phone: application.phone || payload.phone || "",
    dateOfBirth: application.date_of_birth || payload.dateOfBirth || "",
    ssn: application.ssn_full || "",
    ssnLast4: application.ssn_last4 || "",
    ...address,
  };
}

async function runMicrobilt(env, person) {
  const sandbox = String(env.MICROBILT_SANDBOX || "") === "true";
  const base = sandbox
    ? "https://apitest.microbilt.com"
    : env.MICROBILT_BASE_URL || "https://api.microbilt.com";

  const tokenRes = await fetch(`${base}/OAuth/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.MICROBILT_CLIENT_ID,
      client_secret: env.MICROBILT_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const tokenBody = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw new Error(tokenBody.error_description || "Microbilt login failed.");
  }

  const path = env.MICROBILT_PRODUCT_PATH || "/Experian/GetReport";
  const body = {
    PersonInfo: {
      PersonName: {
        FirstName: person.firstName,
        LastName: person.lastName,
      },
      ContactInfo: [
        {
          PostAddr: {
            Addr1: person.street,
            City: person.city,
            StateProv: person.state,
            PostalCode: person.zip,
          },
        },
      ],
      TINInfo: {
        TINType: "SSN",
        TaxId: person.ssn,
      },
      BirthDt: person.dateOfBirth,
    },
  };

  const reportRes = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenBody.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const report = await reportRes.json().catch(() => ({}));
  if (!reportRes.ok) {
    throw new Error(errorMessage(report) || `Microbilt returned ${reportRes.status}.`);
  }

  return normalize("microbilt", report);
}

async function runGeneric(env, person) {
  const url =
    env.CREDIT_API_URL ||
    "https://api.crscreditapi.com/experian/credit-profile/credit-report/basic";
  const key = env.CREDIT_API_KEY || env.CRS_API_KEY;
  if (!url || !key) {
    throw new Error("Set CREDIT_API_URL and CREDIT_API_KEY (or CRS_API_KEY).");
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${key}`,
    "X-API-KEY": key,
  };
  if (env.CRS_CONFIG) {
    headers["config"] = env.CRS_CONFIG;
  }

  const endpoint = env.CRS_CONFIG && url.includes("{config}")
    ? url.replace("{config}", encodeURIComponent(env.CRS_CONFIG))
    : env.CRS_CONFIG && !url.includes("{config}") && url.endsWith("basic")
      ? `${url}/${encodeURIComponent(env.CRS_CONFIG)}`
      : url;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      firstName: person.firstName,
      lastName: person.lastName,
      dob: person.dateOfBirth,
      ssn: person.ssn,
      phone: person.phone,
      street1: person.street,
      city: person.city,
      state: person.state,
      zip: person.zip,
      purpose: "tenant_screening",
    }),
  });
  const report = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(errorMessage(report) || `Credit API returned ${res.status}.`);
  }
  return normalize("generic", report);
}

function runDemo(person) {
  const seed = hash(`${person.fullName}|${person.ssnLast4}|${person.dateOfBirth}`);
  const score = 580 + (seed % 210);
  const rating = ratingFromScore(score);
  return {
    provider: "demo",
    status: "complete",
    score,
    rating,
    recommendation: recommend(score),
    summary: `Demo score for ${person.fullName}. Add Microbilt or CREDIT_API_KEY for a live FCRA pull.`,
    raw: { demo: true, seed },
  };
}

function normalize(provider, report) {
  const score = findScore(report);
  return {
    provider,
    status: "complete",
    score,
    rating: ratingFromScore(score),
    recommendation: recommend(score),
    summary: score
      ? `Credit score ${score} (${ratingFromScore(score)}).`
      : "Report received, but no score field was found. Open the raw result if needed.",
    raw: report,
  };
}

function findScore(value, depth = 0, keyHint = "") {
  if (value == null || depth > 8) return null;
  if (typeof value === "number" && value >= 300 && value <= 900 && /score|fico|vantage/i.test(keyHint)) {
    return Math.round(value);
  }
  if (typeof value === "string" && /score|fico|vantage/i.test(keyHint)) {
    const n = Number(value.replace(/[^\d.]/g, ""));
    if (n >= 300 && n <= 900) return Math.round(n);
  }
  if (typeof value !== "object") return null;

  for (const [key, child] of Object.entries(value)) {
    const found = findScore(child, depth + 1, key);
    if (found) return found;
  }
  return null;
}

function ratingFromScore(score) {
  if (!score) return "unknown";
  if (score >= 740) return "excellent";
  if (score >= 670) return "good";
  if (score >= 580) return "fair";
  return "poor";
}

function recommend(score) {
  if (!score) return "Review the full report before deciding.";
  if (score >= 700) return "Approve if income and rental history check out.";
  if (score >= 640) return "Approve with a larger deposit or guarantor.";
  return "High risk — review tradelines and ask for more documentation.";
}

function splitName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || parts[0] || "",
  };
}

function parseAddress(line, payload = {}) {
  const match = String(line).match(
    /^(.*?),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/,
  );
  return {
    street: payload.street || (match ? match[1] : line),
    city: payload.city || (match ? match[2] : ""),
    state: (payload.state || (match ? match[3] : "")).toUpperCase(),
    zip: payload.zip || (match ? match[4] : ""),
  };
}

function errorMessage(report) {
  return (
    report?.error ||
    report?.message ||
    report?.Error?.Message ||
    report?.fault?.faultstring ||
    ""
  );
}

function hash(value) {
  let n = 0;
  for (let i = 0; i < value.length; i += 1) {
    n = (n * 31 + value.charCodeAt(i)) >>> 0;
  }
  return n;
}
