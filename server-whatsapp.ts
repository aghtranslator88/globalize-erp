import { GoogleGenAI, Type } from "@google/genai";
import express, { Request, Response, RequestHandler } from "express";
import crypto from "crypto";
import { DatabaseManager } from "./server-db";

type AuthenticatedRequest = Request & {
  user?: any;
};

let aiClient: GoogleGenAI | null = null;
let dbManagerInstance: DatabaseManager | null = null;

function getAiClient() {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

async function loadDB() {
  return dbManagerInstance ? dbManagerInstance.loadAll() : null;
}

async function saveDB(data: any) {
  if (!dbManagerInstance) return false;
  await dbManagerInstance.saveAll(data);
  return true;
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizePhone(phone: string): string {
  return phone ? phone.replace(/\D/g, "") : "";
}

function phonesMatch(phoneA: string, phoneB: string): boolean {
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  // Suffix matching to handle international format differences ( Egypt/GCC use 9+ digits )
  if (normA.length >= 9 && normB.length >= 9) {
    return normA.slice(-9) === normB.slice(-9);
  }
  return false;
}

function getNextSalesAssignee(db: any): string | undefined {
  const salesPeople = db.profiles?.filter((p: any) => p.role === "sales" && p.isActive) || [];
  if (salesPeople.length === 0) return undefined;
  
  // Find least loaded sales person by count of active leads
  const leadCounts = salesPeople.map((sp: any) => {
    const count = db.leads?.filter((l: any) => l.assignedTo === sp.id && !["won", "lost"].includes(l.stage)).length || 0;
    return { id: sp.id, count };
  });
  
  leadCounts.sort((a: any, b: any) => a.count - b.count);
  return leadCounts[0].id;
}

async function logWhatsAppEvent(db: any, type: string, phone: string | undefined, payload: any, error?: string) {
  db.whatsappLogs = db.whatsappLogs || [];
  db.whatsappLogs.push({
    id: makeId("wlog"),
    type,
    phone,
    payload,
    error,
    timestamp: new Date().toISOString()
  });
}

function validateWebhookSignature(req: Request, appSecret: string): boolean {
  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) return false;
  
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;
  const hash = parts[1];
  
  const rawBody = (req as any).rawBody || "";
  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
    
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

async function sendMetaMessageWithRetry(
  phoneId: string,
  accessToken: string,
  payload: any,
  maxRetries = 3,
  delayMs = 1000
): Promise<any> {
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v20.0";
  const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
  
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      // Retry on rate limit (429) or remote server errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        attempt++;
        if (attempt >= maxRetries) throw new Error(`Meta API failed with status ${response.status}: ${JSON.stringify(data)}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      } else {
        throw new Error(`Meta API error: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }
}

export async function runAIAgentForClient(phone: string, text: string): Promise<string> {
  const db = await loadDB();
  if (!db) throw new Error("Database is not available.");

  const matchedClient = db.clients?.find((client: any) => phonesMatch(client.phone, phone));
  let conversation = db.whatsappChats?.find((chat: any) => phonesMatch(chat.phone, phone));
  const timestamp = new Date().toISOString();

  if (!conversation) {
    conversation = { phone, name: matchedClient?.name || phone, messages: [] };
    db.whatsappChats = db.whatsappChats || [];
    db.whatsappChats.push(conversation);
  }

  conversation.messages.push({
    id: makeId("msg"),
    direction: "incoming",
    text,
    timestamp
  });

  const ai = getAiClient();
  let replyText = "";

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (db.whatsappSettings?.isAiEnabled && ai && model && db.whatsappSettings?.aiPrompt) {
    const pendingInvoices = db.invoices?.filter((invoice: any) => (
      invoice.clientId === matchedClient?.id && ["unpaid", "partial", "overdue"].includes(invoice.status)
    )) || [];
    const activeTasks = db.tasks?.filter((task: any) => task.clientId === matchedClient?.id) || [];
    const recentMessages = conversation.messages.slice(-10).map((message: any) => (
      `${message.direction}: ${message.text}`
    )).join("\n");

    try {
      const response = await ai.models.generateContent({
        model,
        contents: JSON.stringify({
          phone,
          incomingMessage: text,
          recentMessages,
          client: matchedClient ? {
            id: matchedClient.id,
            name: matchedClient.name,
            type: matchedClient.clientType
          } : null,
          pendingInvoices: pendingInvoices.map((invoice: any) => ({
            id: invoice.id,
            number: invoice.invoiceNumber || invoice.referenceNo,
            total: invoice.grandTotal,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            status: invoice.status
          })),
          activeTasks: activeTasks.map((task: any) => ({
            id: task.id,
            referenceNo: task.referenceNo,
            status: task.status,
            paymentStatus: task.paymentStatus
          }))
        }),
        config: {
          systemInstruction: db.whatsappSettings?.aiPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: { type: Type.STRING },
              shouldCreateLead: { type: Type.BOOLEAN },
              leadNotes: { type: Type.STRING }
            },
            required: ["replyText"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      replyText = parsed.replyText || "";

      if (!matchedClient && parsed.shouldCreateLead) {
        // Double check if lead already exists by phone
        const existingLead = db.leads?.find((l: any) => phonesMatch(l.phone, phone));
        if (!existingLead) {
          const leadId = makeId("lead");
          const assigneeId = getNextSalesAssignee(db);
          db.leads = db.leads || [];
          db.leads.push({
            id: leadId,
            name: phone,
            phone,
            source: "whatsapp",
            stage: "new",
            priority: "medium",
            estimatedValue: 0,
            currency: db.brandConfig?.currency || "USD",
            serviceInterests: [],
            notes: parsed.leadNotes || text,
            assignedTo: assigneeId,
            createdAt: timestamp,
            createdBy: "whatsapp-webhook"
          });
          
          db.leadActivities = db.leadActivities || [];
          db.leadActivities.push({
            id: makeId("lact"),
            leadId,
            type: "note",
            description: `Lead captured via AI WhatsApp Webhook. Assigned to ${assigneeId ? "Sales Representative" : "unassigned"}.`,
            performedBy: "system",
            createdAt: timestamp
          });
        }
      }
    } catch (aiErr) {
      console.error("AI automated agent processing failed:", aiErr);
    }
  }

  if (replyText) {
    conversation.messages.push({
      id: makeId("msg"),
      direction: "outgoing",
      text: replyText,
      timestamp: new Date().toISOString(),
      status: "sent",
      isAi: true
    });
    
    // Auto trigger remote API dispatch if credentials loaded
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;
    if (accessToken && phoneId) {
      try {
        const metaPayload = {
          messaging_product: "whatsapp",
          to: phone.replace("+", ""),
          type: "text",
          text: { body: replyText }
        };
        const metaResponse = await sendMetaMessageWithRetry(phoneId, accessToken, metaPayload);
        const lastMsg = conversation.messages[conversation.messages.length - 1];
        if (lastMsg) {
          lastMsg.metaMessageId = metaResponse?.messages?.[0]?.id;
        }
      } catch (sendErr: any) {
        console.error("Failed to send AI response out via Meta:", sendErr);
        const lastMsg = conversation.messages[conversation.messages.length - 1];
        if (lastMsg) {
          lastMsg.status = "failed";
          lastMsg.error = sendErr.message || "Meta API send failure";
        }
        await logWhatsAppEvent(db, "error", phone, { text: replyText }, sendErr.message);
      }
    }
  }

  await saveDB(db);
  return replyText;
}

export function registerWhatsAppRoutes(app: express.Application, dbManager: DatabaseManager, authenticated: RequestHandler) {
  dbManagerInstance = dbManager;

  // Retrieve Masked Configuration
  app.get("/api/whatsapp/config", authenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await loadDB();
      const settings = db?.whatsappSettings || {};
      
      const config = {
        isConfigured: !!(process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID),
        phoneNumberId: process.env.META_PHONE_NUMBER_ID ? `***${process.env.META_PHONE_NUMBER_ID.slice(-4)}` : "",
        wabaId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID ? `***${process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID.slice(-4)}` : "",
        verifyToken: process.env.META_VERIFY_TOKEN ? `***${process.env.META_VERIFY_TOKEN.slice(-4)}` : (process.env.WHATSAPP_VERIFY_TOKEN ? `***${process.env.WHATSAPP_VERIFY_TOKEN.slice(-4)}` : ""),
        isAiEnabled: settings.isAiEnabled === true,
        aiPrompt: settings.aiPrompt || "",
        webhookUrl: `${req.protocol}://${req.get("host")}/api/whatsapp/webhook`
      };
      
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Failed to read configuration." });
    }
  });

  // Edit AI configurations
  app.post("/api/whatsapp/config", authenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { isAiEnabled, aiPrompt } = req.body || {};
      const db = await loadDB();
      if (!db) return res.status(503).json({ success: false, error: "Database not available." });
      
      db.whatsappSettings = db.whatsappSettings || {};
      db.whatsappSettings.isAiEnabled = isAiEnabled === true;
      db.whatsappSettings.aiPrompt = aiPrompt || "";
      
      await saveDB(db);
      res.json({ success: true, settings: db.whatsappSettings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Failed to save configuration." });
    }
  });

  // Load Chats (with Sales isolation)
  app.get("/api/whatsapp/chats", authenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await loadDB();
      if (!db) return res.status(503).json({ error: "Database not available." });
      
      let chats = db.whatsappChats || [];
      
      if (req.user.role === "sales") {
        const salesLeads = (db.leads || []).filter((l: any) => l.assignedTo === req.user.id);
        const salesLeadPhones = new Set(salesLeads.map((l: any) => normalizePhone(l.phone)).filter(Boolean));
        
        const salesClientIds = new Set(salesLeads.map((l: any) => l.convertedToClientId).filter(Boolean));
        const salesClients = (db.clients || []).filter((c: any) => salesClientIds.has(c.id));
        const salesClientPhones = new Set(salesClients.map((c: any) => normalizePhone(c.phone)).filter(Boolean));
        
        chats = chats.filter((chat: any) => {
          const normPhone = normalizePhone(chat.phone);
          return salesLeadPhones.has(normPhone) || salesClientPhones.has(normPhone);
        });
      }
      
      res.json({ success: true, chats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Failed to load chats." });
    }
  });

  // Load Messages (with Sales isolation)
  app.get("/api/whatsapp/chats/:phone/messages", authenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { phone } = req.params;
      const db = await loadDB();
      if (!db) return res.status(503).json({ error: "Database not available." });
      
      const chat = db.whatsappChats?.find((c: any) => phonesMatch(c.phone, phone));
      if (!chat) return res.status(404).json({ success: false, error: "Chat thread not found." });
      
      if (req.user.role === "sales") {
        const lead = db.leads?.find((l: any) => phonesMatch(l.phone, phone));
        if (!lead || lead.assignedTo !== req.user.id) {
          return res.status(403).json({ success: false, error: "Access Denied: Conversation not assigned to you." });
        }
      }
      
      res.json({ success: true, messages: chat.messages || [] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Failed to load messages." });
    }
  });

  // Webhook Verification (GET)
  app.get("/api/whatsapp/webhook", async (req, res) => {
    const verifyToken = process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) return res.status(503).json({ error: "WhatsApp verification token is not configured in env." });

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) {
      console.info("WhatsApp Webhook verified successfully.");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verification token mismatch." });
  });

  // Webhook Event Handler (POST)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const appSecret = process.env.META_APP_SECRET;
      if (appSecret && !validateWebhookSignature(req, appSecret)) {
        console.warn("Invalid signature on incoming WhatsApp webhook event.");
        return res.status(401).json({ error: "Signature verification failed." });
      }

      const body = req.body;
      const db = await loadDB();
      if (!db) return res.status(503).json({ error: "Database not available." });

      const entries = body?.entry;
      if (!Array.isArray(entries)) {
        await logWhatsAppEvent(db, "error", undefined, body, "Invalid webhook payload format");
        await saveDB(db);
        return res.status(400).json({ error: "Invalid webhook payload." });
      }

      for (const entry of entries) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;
          
          const val = change.value;
          
          // 1. Process Message Status Updates
          if (Array.isArray(val?.statuses)) {
            for (const status of val.statuses) {
              let updated = false;
              for (const chat of db.whatsappChats || []) {
                const msg = chat.messages?.find((m: any) => m.metaMessageId === status.id);
                if (msg) {
                  msg.status = status.status;
                  if (status.errors && status.errors.length > 0) {
                    msg.error = status.errors[0].message || status.errors[0].title;
                  }
                  updated = true;
                  break;
                }
              }
              await logWhatsAppEvent(db, "status_update", status.recipient_id, status);
            }
          }

          // 2. Process Inbound Messages
          if (Array.isArray(val?.messages)) {
            for (const msg of val.messages) {
              const senderPhone = `+${msg.from}`;
              const contact = val.contacts?.find((c: any) => c.wa_id === msg.from);
              const senderName = contact?.profile?.name || senderPhone;
              
              let messageText = "";
              if (msg.type === "text") {
                messageText = msg.text?.body || "";
              } else if (msg.type === "image") {
                messageText = msg.image?.caption ? `[Image] ${msg.image.caption}` : "[Image]";
              } else if (msg.type === "document") {
                messageText = msg.document?.caption ? `[Document] ${msg.document.caption}` : "[Document]";
              } else if (msg.type === "interactive") {
                messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[Interactive Reply]";
              } else if (msg.type === "button") {
                messageText = msg.button?.text || "[Button Response]";
              } else {
                messageText = `[Unsupported Message Type: ${msg.type}]`;
              }
              
              if (!messageText) continue;

              await logWhatsAppEvent(db, "incoming", senderPhone, msg);

              // Auto-capture lead if contact does not exist in CRM leads or clients
              const matchedClient = db.clients?.find((client: any) => phonesMatch(client.phone, senderPhone));
              const matchedLead = db.leads?.find((l: any) => phonesMatch(l.phone, senderPhone));
              
              if (!matchedClient && !matchedLead) {
                const leadId = makeId("lead");
                const assigneeId = getNextSalesAssignee(db);
                db.leads = db.leads || [];
                db.leads.push({
                  id: leadId,
                  name: senderName,
                  phone: senderPhone,
                  source: "whatsapp",
                  stage: "new",
                  priority: "medium",
                  estimatedValue: 0,
                  currency: db.brandConfig?.currency || "USD",
                  serviceInterests: [],
                  notes: `Auto-captured via WhatsApp message: ${messageText}`,
                  assignedTo: assigneeId,
                  createdAt: new Date().toISOString(),
                  createdBy: "whatsapp-webhook"
                });

                db.leadActivities = db.leadActivities || [];
                db.leadActivities.push({
                  id: makeId("lact"),
                  leadId,
                  type: "note",
                  description: `Lead auto-captured from inbound message. Assigned to ${assigneeId ? "Sales" : "unassigned"}.`,
                  performedBy: "system",
                  createdAt: new Date().toISOString()
                });
              } else if (matchedLead) {
                // Update follow up / contact timestamp
                matchedLead.lastContactedAt = new Date().toISOString();
                db.leadActivities = db.leadActivities || [];
                db.leadActivities.push({
                  id: makeId("lact"),
                  leadId: matchedLead.id,
                  type: "note",
                  description: `Received WhatsApp message: ${messageText.slice(0, 100)}`,
                  performedBy: "customer",
                  createdAt: new Date().toISOString()
                });
              }

              // Route through AI agent or just append message to chat session
              await runAIAgentForClient(senderPhone, messageText);
            }
          }
        }
      }

      await saveDB(db);
      res.status(200).json({ success: true, received: true });
    } catch (error: any) {
      console.error("WhatsApp webhook processing failed:", error);
      res.status(500).json({ success: false, error: "Webhook processing failed." });
    }
  });

  // Outbound Message Sender API (POST)
  app.post("/api/whatsapp/send-message", authenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { phone, text, templateName, variables } = req.body || {};
      if (!phone || (!text && !templateName)) {
        return res.status(400).json({ success: false, error: "Recipient phone and message content are required." });
      }

      const db = await loadDB();
      if (!db) return res.status(503).json({ success: false, error: "Database not available." });

      // Sales user route isolation check
      if (req.user.role === "sales") {
        const lead = db.leads?.find((l: any) => phonesMatch(l.phone, phone));
        if (!lead || lead.assignedTo !== req.user.id) {
          return res.status(403).json({ success: false, error: "Access Denied: Recipient is not assigned to you." });
        }
      }

      const accessToken = process.env.META_ACCESS_TOKEN;
      const phoneId = process.env.META_PHONE_NUMBER_ID;
      
      if (!accessToken || !phoneId) {
        return res.status(503).json({ success: false, error: "WhatsApp credentials are not configured in server environment variables." });
      }

      const payload: any = {
        messaging_product: "whatsapp",
        to: normalizePhone(phone)
      };

      if (templateName) {
        payload.type = "template";
        payload.template = {
          name: templateName,
          language: { code: req.body.languageCode || "en_US" },
          components: [{
            type: "body",
            parameters: (variables || []).map((value: string) => ({ type: "text", text: value }))
          }]
        };
      } else {
        payload.type = "text";
        payload.text = { body: text };
      }

      let metaResponse;
      try {
        metaResponse = await sendMetaMessageWithRetry(phoneId, accessToken, payload);
      } catch (apiErr: any) {
        await logWhatsAppEvent(db, "error", phone, payload, apiErr.message);
        await saveDB(db);
        return res.status(502).json({ success: false, error: `Meta dispatch failed: ${apiErr.message}` });
      }

      await logWhatsAppEvent(db, "outgoing", phone, payload);

      let conversation = db.whatsappChats?.find((chat: any) => phonesMatch(chat.phone, phone));
      if (!conversation) {
        const matchedClient = db.clients?.find((client: any) => phonesMatch(client.phone, phone));
        const matchedLead = db.leads?.find((l: any) => phonesMatch(l.phone, phone));
        conversation = { 
          phone, 
          name: matchedClient?.name || matchedLead?.name || phone, 
          messages: [] 
        };
        db.whatsappChats = db.whatsappChats || [];
        db.whatsappChats.push(conversation);
      }

      const msgText = templateName ? `[Template: ${templateName}]` : text;
      conversation.messages.push({
        id: makeId("msg"),
        direction: "outgoing",
        text: msgText,
        timestamp: new Date().toISOString(),
        status: "sent",
        metaMessageId: metaResponse?.messages?.[0]?.id
      });

      // Update lead interacted timestamp
      const matchedLead = db.leads?.find((l: any) => phonesMatch(l.phone, phone));
      if (matchedLead) {
        matchedLead.lastContactedAt = new Date().toISOString();
        db.leadActivities = db.leadActivities || [];
        db.leadActivities.push({
          id: makeId("lact"),
          leadId: matchedLead.id,
          type: "note",
          description: `Dispatched WhatsApp message: ${msgText.slice(0, 100)}`,
          performedBy: req.user?.fullName || "system",
          createdAt: new Date().toISOString()
        });
      }

      await saveDB(db);
      res.json({ success: true, realSent: true, metaResponse });
    } catch (error: any) {
      console.error("WhatsApp send failed:", error);
      res.status(500).json({ success: false, error: "Failed to send WhatsApp message." });
    }
  });
}
