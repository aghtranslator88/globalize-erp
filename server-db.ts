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
  "hrLeaves", "hrCandidates", "hrOvertimes", "hrDisciplinary", "hrPolicies", "hrDocuments",
  "whatsappLogs"
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
        pass: ""
      } : undefined
    } : null,
    whatsappSettings: payload.whatsappSettings ? {
      ...payload.whatsappSettings,
      accessToken: "",
      phoneNumberId: "",
      wabaId: "",
      verifyToken: ""
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
    await this.run(`
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (type)
    `);

    const profileRow = await this.get("SELECT COUNT(*) as count FROM entities WHERE type = 'profiles'");
    if (Number(profileRow?.count || 0) === 0) {
      await this.createInitialAdminFromEnv();
    } else {
      await this.migrateProfileSecrets();
    }

    const templateRow = await this.get("SELECT COUNT(*) as count FROM entities WHERE type = 'whatsappTemplates'");
    if (Number(templateRow?.count || 0) === 0) {
      await this.upsertEntity("whatsappTemplates", "tpl-reminder", {
        id: "tpl-reminder",
        name: "invoice_payment_reminder",
        category: "utility",
        language: "en_US",
        body: "Hello {{1}}, this is a friendly reminder that invoice {{2}} is due for payment. The total amount is {{3}}.",
        variables: ["client_name", "invoice_number", "amount_due"],
        status: "approved"
      });
      await this.upsertEntity("whatsappTemplates", "tpl-quote", {
        id: "tpl-quote",
        name: "quotation_ready",
        category: "utility",
        language: "en_US",
        body: "Hello {{1}}, your quotation {{2}} is ready. The estimated total is {{3}}.",
        variables: ["client_name", "quotation_number", "estimated_total"],
        status: "approved"
      });
    }

    // Database Migration: Clean all Nada references
    await this.run("DELETE FROM entities WHERE id = 'p-nada'");
    await this.run("DELETE FROM entities WHERE type = 'notifications' AND JSON_EXTRACT(data, '$.userId') = 'p-nada'");
    
    try {
      const profiles = await this.getEntities("profiles");
      for (const profile of profiles) {
        if (
          profile.fullName?.toLowerCase().includes("nada") || 
          profile.fullNameAr?.includes("نادى") || 
          profile.fullNameAr?.includes("ندى") || 
          profile.id === "p-nada"
        ) {
          console.info(`Removing profile Nada (${profile.id}) from database.`);
          await this.run("DELETE FROM entities WHERE type = 'profiles' AND id = ?", [profile.id]);
        }
      }

      const tasks = await this.getEntities("tasks");
      for (const task of tasks) {
        let updated = false;
        if (task.createdBy === 'p-nada') {
          task.createdBy = 'system';
          updated = true;
        }
        if (updated) {
          await this.upsertEntity("tasks", task.id, task);
        }
      }
    } catch (err) {
      console.error("Failed to run profile migration: ", err);
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

  async saveAll(payload: any, userContext?: { id: string; role: string }): Promise<void> {
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload must be an object.");
    }

    // Backend guard: Ensure one approved quotation cannot generate multiple tasks
    const quotationIds = new Set<string>();
    if (payload.tasks && Array.isArray(payload.tasks)) {
      for (const task of payload.tasks) {
        const qId = task.quotation_id || task.quotationId;
        if (qId) {
          if (quotationIds.has(qId)) {
            throw new Error(`Duplicate task creation detected for quotation: ${qId}`);
          }
          quotationIds.add(qId);
        }
      }
    }

    const release = await this.writeLock.acquire();
    this.autoPersist = false;
    try {
      const fullDb = await this.loadAll();

      // Always preserve WhatsApp chats, logs, templates, and settings from the database
      // because they are updated in real-time by webhooks and dedicated APIs.
      payload.whatsappChats = fullDb.whatsappChats || [];
      payload.whatsappLogs = fullDb.whatsappLogs || [];
      payload.whatsappSettings = fullDb.whatsappSettings || null;
      payload.whatsappTemplates = fullDb.whatsappTemplates || [];

      // Role-based data merging and security isolation
      if (userContext && userContext.role === "sales") {
        // Sales allowed tables. Discard sales-sent values for other tables.
        const salesAllowedKeys = [
          "leads", "leadActivities", "clients", "whatsappChats", "whatsappTemplates", "whatsappLogs",
          "quotations", "invoices", "tasks", "notifications", "feedback"
        ];
        
        for (const key of COLLECTION_KEYS) {
          if (!salesAllowedKeys.includes(key)) {
            payload[key] = fullDb[key] || [];
          }
        }
        for (const key of SINGLETON_KEYS) {
          payload[key] = fullDb[key];
        }

        // Merge and protect leads not assigned to this sales person
        const otherLeads = (fullDb.leads || []).filter((l: any) => l.assignedTo && l.assignedTo !== userContext.id);
        const salesLeads = payload.leads || [];
        const mergedLeads = [
          ...otherLeads,
          ...salesLeads.filter((l: any) => !l.assignedTo || l.assignedTo === userContext.id)
        ];
        const leadMap = new Map();
        mergedLeads.forEach((l: any) => leadMap.set(l.id, l));
        payload.leads = Array.from(leadMap.values());

        // Merge and protect chats not associated with this sales person's leads
        const otherLeadPhones = new Set(otherLeads.map((l: any) => l.phone?.replace(/\D/g, "")).filter(Boolean));
        const otherChats = (fullDb.whatsappChats || []).filter((c: any) => {
          const norm = c.phone?.replace(/\D/g, "");
          return norm && otherLeadPhones.has(norm);
        });
        const salesChats = payload.whatsappChats || [];
        const mergedChats = [
          ...otherChats,
          ...salesChats
        ];
        const chatMap = new Map();
        mergedChats.forEach((c: any) => chatMap.set(c.phone, c));
        payload.whatsappChats = Array.from(chatMap.values());
      } else if (userContext && userContext.role === "translator") {
        // Translators can only update their own profile and task statuses assigned to them
        for (const key of COLLECTION_KEYS) {
          if (key === "profiles") {
            const clientProfiles = payload.profiles || [];
            const myUpdatedProfile = clientProfiles.find((p: any) => p.id === userContext.id);
            payload.profiles = (fullDb.profiles || []).map((p: any) => {
              if (p.id === userContext.id && myUpdatedProfile) {
                return { ...p, ...myUpdatedProfile, role: p.role, id: p.id }; // Prevent role escalation
              }
              return p;
            });
          } else {
            payload[key] = fullDb[key] || [];
          }
        }
        for (const key of SINGLETON_KEYS) {
          payload[key] = fullDb[key];
        }
      }

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
