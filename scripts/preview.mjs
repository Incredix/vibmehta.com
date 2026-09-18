import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

const root = join(import.meta.dirname, "../public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(join(import.meta.dirname, "../migrations/0001_init.sql"), "utf8"));
const devVars = readDevVars();
seed(sqlite, devVars.LISTING_FREMONT_ADDRESS || "Fremont home");

const env = {
  DB: wrapD1(sqlite),
  ADMIN_PASSWORD: "local-admin",
  TO_EMAIL: "vibhorfall@gmail.com",
  FROM_EMAIL: "applications@vibmehta.com",
  SITE_NAME: "Theory",
  ...devVars,
  EMAIL: {
    async send() {
      return { messageId: "local-preview" };
    },
  },
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      let pathname = url.pathname === "/" ? "/index.html" : url.pathname;
      if (pathname.endsWith("/")) pathname += "index.html";
      else if (!extname(pathname) && existsSync(join(root, pathname, "index.html"))) {
        pathname += "/index.html";
      }
      const file = join(root, pathname);
      if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
        const notFound = readFileSync(join(root, "404.html"));
        return new Response(notFound, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return new Response(readFileSync(file), {
        headers: { "Content-Type": types[extname(file)] || "application/octet-stream" },
      });
    },
  },
};

const server = createServer(async (req, res) => {
  try {
    const url = `http://127.0.0.1:8787${req.url}`;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const method = req.method || "GET";
    const body = method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks);
    const request = new Request(url, { method, headers: req.headers, body });
    const response = await worker.fetch(request, env);
    const headers = Object.fromEntries(response.headers);
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(String(err));
  }
});

server.listen(8787, "127.0.0.1", () => {
  console.log("ready http://127.0.0.1:8787");
  console.log("admin http://127.0.0.1:8787/admin/  password local-admin");
});

function readDevVars() {
  const file = join(import.meta.dirname, "../.dev.vars");
  if (!existsSync(file)) return {};
  const vars = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

function wrapD1(db) {
  return {
    prepare(sql) {
      const bound = {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async run() {
          const info = db.prepare(sql).run(...this.args);
          return { success: true, meta: { changes: info.changes } };
        },
        async first() {
          return db.prepare(sql).get(...this.args) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...this.args) };
        },
      };
      return bound;
    },
  };
}

function seed(db, address) {
  const now = new Date().toISOString();
  const payload = JSON.stringify({
    listingId: "fremont",
    listingName: "Fremont home",
    listingLocation: "Fremont, CA",
    propertyAddress: address,
    desiredRent: "$2,450",
    leaseTerm: "12 months",
    moveInDate: "2026-10-01",
    fullName: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "(555) 014-8892",
    dateOfBirth: "1992-04-18",
    ssnLast4: "7788",
    currentAddress: "88 Pine Ave, Apt 4",
    city: "Oakland",
    state: "CA",
    zip: "94601",
    employer: "Northshore Clinic",
    jobTitle: "RN",
    monthlyIncome: "$6,800",
    signature: "Alex Rivera",
  });
  db.prepare(
    `INSERT INTO applications (
      id, created_at, updated_at, status, property_address, full_name,
      email, phone, date_of_birth, ssn_last4, ssn_full, monthly_income, payload, notes
    ) VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    "seed-alex-rivera",
    now,
    now,
    address || "Fremont home",
    "Alex Rivera",
    "alex.rivera@example.com",
    "(555) 014-8892",
    "1992-04-18",
    "7788",
    "123456789",
    "$6,800",
    payload,
  );
}
