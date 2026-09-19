export function hasDb(env) {
  return Boolean(env.DB && typeof env.DB.prepare === "function");
}

export async function saveApplication(env, data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const payload = { ...data };
  delete payload.ssnFull;
  delete payload.fax;
  delete payload.website;

  await env.DB.prepare(
    `INSERT INTO applications (
      id, created_at, updated_at, status, property_address, full_name,
      email, phone, date_of_birth, ssn_last4, ssn_full, monthly_income, payload, notes
    ) VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(
      id,
      now,
      now,
      data.propertyAddress || "",
      data.fullName,
      data.email,
      data.phone || "",
      data.dateOfBirth || "",
      last4(data.ssnFull || data.ssnLast4),
      digits(data.ssnFull),
      data.monthlyIncome || "",
      JSON.stringify(payload),
    )
    .run();

  return id;
}

export async function listApplications(env) {
  const { results } = await env.DB.prepare(
    `SELECT
      a.id, a.created_at, a.status, a.property_address, a.full_name,
      a.email, a.phone, a.monthly_income,
      json_extract(a.payload, '$.listingName') AS listing_name,
      c.score AS credit_score,
      c.rating AS credit_rating,
      c.status AS credit_status,
      c.provider AS credit_provider
    FROM applications a
    LEFT JOIN credit_checks c ON c.id = (
      SELECT id FROM credit_checks
      WHERE application_id = a.id
      ORDER BY created_at DESC
      LIMIT 1
    )
    ORDER BY a.created_at DESC`,
  ).all();

  return results || [];
}

export async function getApplication(env, id) {
  const row = await env.DB.prepare(
    `SELECT id, created_at, updated_at, status, property_address, full_name,
            email, phone, date_of_birth, ssn_last4, monthly_income, payload, notes,
            CASE WHEN ssn_full IS NOT NULL AND length(ssn_full) = 9 THEN 1 ELSE 0 END AS has_ssn
     FROM applications WHERE id = ?`,
  )
    .bind(id)
    .first();

  if (!row) return null;

  let payload = {};
  try {
    payload = JSON.parse(row.payload || "{}");
  } catch {
    payload = {};
  }
  delete payload.ssnFull;

  const checks = await env.DB.prepare(
    `SELECT id, created_at, provider, status, score, rating, recommendation, summary
     FROM credit_checks WHERE application_id = ? ORDER BY created_at DESC`,
  )
    .bind(id)
    .all();

  return {
    ...row,
    payload,
    has_ssn: Boolean(row.has_ssn),
    credit_checks: checks.results || [],
  };
}

export async function getApplicationForCredit(env, id) {
  return env.DB.prepare(`SELECT * FROM applications WHERE id = ?`).bind(id).first();
}

export async function updateStatus(env, id, status) {
  const allowed = new Set(["new", "reviewing", "approved", "declined"]);
  if (!allowed.has(status)) throw new Error("Invalid status.");
  const result = await env.DB.prepare(
    `UPDATE applications SET status = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(status, new Date().toISOString(), id)
    .run();
  return result.meta?.changes > 0;
}

export async function updateNotes(env, id, notes) {
  const result = await env.DB.prepare(
    `UPDATE applications SET notes = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(String(notes || ""), new Date().toISOString(), id)
    .run();
  return result.meta?.changes > 0;
}

export async function saveCreditCheck(env, applicationId, result) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO credit_checks (
      id, application_id, created_at, provider, status, score, rating, recommendation, summary, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      applicationId,
      new Date().toISOString(),
      result.provider,
      result.status,
      result.score ?? null,
      result.rating || "",
      result.recommendation || "",
      result.summary || "",
      JSON.stringify(result.raw || {}),
    )
    .run();
  return id;
}

function digits(value) {
  const only = String(value || "").replace(/\D/g, "");
  return only.length === 9 ? only : "";
}

function last4(value) {
  const only = String(value || "").replace(/\D/g, "");
  return only.slice(-4);
}

export async function saveWaitlist(env, { listingId, listingName, email, name, phone }) {
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(
    `SELECT id FROM availability_alerts WHERE listing_id = ? AND email = ?`,
  )
    .bind(listingId, email)
    .first();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE availability_alerts
       SET name = ?, phone = ?, listing_name = ?, notified_at = NULL
       WHERE id = ?`,
    )
      .bind(name || "", phone || "", listingName || "", existing.id)
      .run();
    return existing.id;
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO availability_alerts (
      id, created_at, listing_id, listing_name, email, name, phone, notified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(id, now, listingId, listingName || "", email, name || "", phone || "")
    .run();
  return id;
}

export async function pendingWaitlist(env, listingId) {
  const { results } = await env.DB.prepare(
    `SELECT id, email, name, listing_id, listing_name
     FROM availability_alerts
     WHERE listing_id = ? AND notified_at IS NULL`,
  )
    .bind(listingId)
    .all();
  return results || [];
}

export async function markWaitlistNotified(env, id) {
  await env.DB.prepare(
    `UPDATE availability_alerts SET notified_at = ? WHERE id = ?`,
  )
    .bind(new Date().toISOString(), id)
    .run();
}
