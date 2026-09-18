const encoder = new TextEncoder();
const COOKIE = "vm_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function login(request, env) {
  const password = env.ADMIN_PASSWORD;
  if (!password) {
    return json(
      {
        ok: false,
        error:
          "Set ADMIN_PASSWORD as a Worker secret, then sign in at /admin.",
      },
      503,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid login." }, 400);
  }

  const offered = String(body.password || "");
  if (!(await passwordsMatch(offered, password))) {
    return json({ ok: false, error: "Wrong password." }, 401);
  }

  const token = await signToken(env, Date.now() + MAX_AGE_SEC * 1000);
  const response = json({ ok: true });
  response.headers.set("Set-Cookie", cookie(token, MAX_AGE_SEC, request));
  return response;
}

export function logout(request) {
  const response = json({ ok: true });
  response.headers.set("Set-Cookie", cookie("", 0, request));
  return response;
}

export async function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json(
      {
        ok: false,
        error: "Set ADMIN_PASSWORD as a Worker secret to use the inbox.",
      },
      503,
    );
  }

  const token = readCookie(request, COOKIE);
  if (!(await validToken(env, token))) {
    return json({ ok: false, error: "Sign in required." }, 401);
  }

  return null;
}

export async function sessionOk(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ ok: false, configured: false }, 503);
  }
  const token = readCookie(request, COOKIE);
  return json({ ok: await validToken(env, token), configured: true });
}

async function passwordsMatch(offered, stored) {
  const [a, b] = await Promise.all([sha256(offered), sha256(stored)]);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function signToken(env, expiresAt) {
  const secret = env.ADMIN_SECRET || env.ADMIN_PASSWORD;
  const payload = String(expiresAt);
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

async function validToken(env, token) {
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expiresAt = Number(payload);
  if (!expiresAt || Date.now() > expiresAt) return false;
  const secret = env.ADMIN_SECRET || env.ADMIN_PASSWORD;
  const expected = await hmac(secret, payload);
  return sig === expected;
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value) {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return new Uint8Array(buf);
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function cookie(value, maxAge, request) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
