import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const COLLECTION_KEYS = [
  "profiles", "clients", "tasks", "assignments", "quotations", "invoices",
  "purchaseOrders", "payments", "vendorPayables", "expenses", "accounts",
  "transactions", "receivables", "liabilities", "closings", "attendance",
  "notifications", "letterheads", "stamps", "presets", "pdfLogs", "feedback",
  "leads", "leadActivities", "automationRules", "exportRequests", "securityLogs",
  "taskAccountingRecords", "taskPaymentAuditLogs", "whatsappChats", "whatsappTemplates",
  "branches", "costCenters", "expenseCategories", "recurringExpenses",
  "freelancerCosts", "payrollExpenses", "accountingEntries",
  "hrLeaves", "hrCandidates", "hrOvertimes", "hrDisciplinary", "hrPolicies", "hrDocuments"
];

const SINGLETON_KEYS = ["brandConfig", "whatsappSettings"];
const PASSWORD_ALGO = "scrypt";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_ALGO}:${salt}:${hash}`;
}

export function verifyPassword(password: string, encodedHash?: string): boolean {
  if (!encodedHash || !encodedHash.startsWith(`${PASSWORD_ALGO}:`)) return false;
  const [, salt, storedHash] = encodedHash.split(":");
  if (!salt || !storedHash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

export function sanitizeProfile(profile: any) {
  if (!profile) return profile;
  const { password, passwordHash, ...safe } = profile;
  return safe;
}

function sanitizePayloadForClient(payload: any) {
  return {
    ...payload,
    profiles: (payload.profiles || []).map(sanitizeProfile),
    brandConfig: payload.brandConfig ? {
      ...payload.brandConfig,
      smtpConfig: payload.brandConfig.smtpConfig ? {
        ...payload.brandConfig.smtpConfig,
        pass: payload.brandConfig.smtpConfig.pass ? "" : ""
      } : undefined
    } : null,
    whatsappSettings: payload.whatsappSettings ? {
      ...payload.whatsappSettings,
      accessToken: payload.whatsappSettings.accessToken ? "" : ""
    } : null
  };
}

function emptyPayload() {
  const result: any = {};
  for (const key of COLLECTION_KEYS) result[key] = [];
  for (const key of SINGLETON_KEYS) result[key] = null;
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

class Mutex {
  private promise: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentPromise = this.promise;
    this.promise = nextPromise;
    await currentPromise;
    return release!;
  }
}

export class DatabaseManager {
  private db: initSqlJs.Database | null = null;
  private dbPath: string;
  private autoPersist = true;
  private writeLock = new Mutex();

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    const SQL = await initSqlJs();
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
      console.info(`SQLite database loaded from ${this.dbPath}`);
      return;
    }

    this.db = new SQL.Database();
    console.info(`SQLite database will be created at ${this.dbPath}`);
  }

  private persist(): void {
    if (!this.db) return;
    fs.writeFileSync(this.dbPath, Buffer.from(this.db.export()));
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error("Database not connected");
    this.db.run(sql, params);
    if (this.autoPersist) {
      this.persist();
    }
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const rows = await this.all(sql, params);
    return rows[0] || null;
  }

  async init(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS entities (
        type TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (type, id)
      )
    `);

    const profileRow = await this.get("SELECT COUNT(*) as count FROM entities WHERE type = 'profiles'");
    if (Number(profileRow?.count || 0) === 0) {
      await this.createInitialAdminFromEnv();
    } else {
      await this.migrateProfileSecrets();
    }
  }

  private async createInitialAdminFromEnv(): Promise<void> {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const fullName = process.env.INITIAL_ADMIN_NAME;

    if (!email || !password || !fullName) {
      console.warn("No profiles exist. Set INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, and INITIAL_ADMIN_NAME to bootstrap the first administrator.");
      return;
    }

    const admin = {
      id: `profile-${crypto.randomUUID()}`,
      fullName,
      fullNameAr: fullName,
      role: "owner",
      isActive: true,
      email,
      passwordHash: hashPassword(password),
      createdAt: nowIso()
    };
    await this.upsertEntity("profiles", admin.id, admin);
    console.info(`Initial owner profile created for ${email}`);
  }

  private async migrateProfileSecrets(): Promise<void> {
    const profiles = await this.getEntities("profiles");
    for (const profile of profiles) {
      if (profile.password && !profile.passwordHash) {
        profile.passwordHash = hashPassword(profile.password);
        delete profile.password;
        await this.upsertEntity("profiles", profile.id, profile);
      }
    }
  }

  async upsertEntity(type: string, id: string, data: any): Promise<void> {
    const timestamp = nowIso();
    await this.run(
      `INSERT INTO entities (type, id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(type, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      [type, id, JSON.stringify(data), timestamp, timestamp]
    );
  }

  async getEntities(type: string): Promise<any[]> {
    const rows = await this.all("SELECT data FROM entities WHERE type = ?", [type]);
    return rows.map((row) => JSON.parse(row.data));
  }

  async findProfileForAuth(identifier: string): Promise<any | null> {
    const normalized = identifier.trim().toLowerCase();
    const profiles = await this.getEntities("profiles");
    return profiles.find((profile) => {
      const email = profile.email?.trim().toLowerCase();
      const personalEmail = profile.personalEmail?.trim().toLowerCase();
      return email === normalized || personalEmail === normalized;
    }) || null;
  }

  async updateProfile(profile: any): Promise<void> {
    await this.upsertEntity("profiles", profile.id, profile);
  }

  async loadAll(options: { redactSecrets?: boolean } = {}): Promise<any> {
    const rows = await this.all("SELECT type, id, data FROM entities ORDER BY type, id");
    const result = emptyPayload();

    for (const row of rows) {
      const parsed = JSON.parse(row.data);
      if (SINGLETON_KEYS.includes(row.type)) {
        result[row.type] = parsed;
      } else if (COLLECTION_KEYS.includes(row.type)) {
        result[row.type].push(parsed);
      }
    }

    return options.redactSecrets ? sanitizePayloadForClient(result) : result;
  }

  async saveAll(payload: any): Promise<void> {
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload must be an object.");
    }

    const release = await this.writeLock.acquire();
    this.autoPersist = false;
    try {
      const existingProfiles = await this.getEntities("profiles");
      const existingById = new Map(existingProfiles.map((profile) => [profile.id, profile]));

      await this.run("BEGIN TRANSACTION");
      try {
        await this.run("DELETE FROM entities");

        for (const key of Object.keys(payload)) {
          const val = payload[key];
          if (val === undefined || val === null) continue;

          if (SINGLETON_KEYS.includes(key)) {
            await this.upsertEntity(key, "singleton", val);
            continue;
          }

          if (!COLLECTION_KEYS.includes(key) || !Array.isArray(val)) continue;

          for (const item of val) {
            const itemId = item.id || `${key}-${crypto.randomUUID()}`;
            const data = { ...item, id: itemId };

            if (key === "profiles") {
              const existing = existingById.get(itemId) || {};
              if (data.password) {
                data.passwordHash = hashPassword(String(data.password));
                delete data.password;
              } else if (!data.passwordHash && existing.passwordHash) {
                data.passwordHash = existing.passwordHash;
              }
            }

            await this.upsertEntity(key, itemId, data);
          }
        }

        await this.run("COMMIT");
        await this.migrateProfileSecrets();
      } catch (err) {
        console.error("Database save failed inside transaction. Attempting rollback...", err);
        try {
          await this.run("ROLLBACK");
        } catch (rollbackErr) {
          console.error("Database rollback failed:", rollbackErr);
        }
        throw err;
      }
    } finally {
      this.autoPersist = true;
      this.persist();
      release();
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
