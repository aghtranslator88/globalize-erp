import { GoogleGenAI, Type } from "@google/genai";
import express, { RequestHandler } from "express";
import crypto from "crypto";
import { DatabaseManager } from "./server-db";

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

function getPrimaryPhone(payload: any) {
  return payload?.replace?.("+", "") || "";
}

export async function runAIAgentForClient(phone: string, text: string): Promise<string> {
  const db = await loadDB();
  if (!db) throw new Error("Database is not available.");

  const matchedClient = db.clients?.find((client: any) => client.phone === phone);
  let conversation = db.whatsappChats?.find((chat: any) => chat.phone === phone);
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

  const model = process.env.GEMINI_MODEL;
  if (db.whatsappSettings?.isAiEnabled && ai && model && db.whatsappSettings?.aiPrompt) {
    const pendingInvoices = db.invoices?.filter((invoice: any) => (
      invoice.clientId === matchedClient?.id && ["unpaid", "partial", "overdue"].includes(invoice.status)
    )) || [];
    const activeTasks = db.tasks?.filter((task: any) => task.clientId === matchedClient?.id) || [];
    const recentMessages = conversation.messages.slice(-10).map((message: any) => (
      `${message.direction}: ${message.text}`
    )).join("\n");

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
      const leadId = makeId("lead");
      db.leads = db.leads || [];
      db.leads.push({
        id: leadId,
        name: phone,
        phone,
        source: "whatsapp",
        stage: "new",
        priority: "medium",
        estimatedValue: 0,
        currency: db.brandConfig?.currency,
        serviceInterests: [],
        notes: parsed.leadNotes || text,
        createdAt: timestamp,
        createdBy: "whatsapp-webhook"
      });
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
  }

  await saveDB(db);
  return replyText;
}

export function registerWhatsAppRoutes(app: express.Application, dbManager: DatabaseManager, authenticated: RequestHandler) {
  dbManagerInstance = dbManager;

  app.get("/api/whatsapp/webhook", async (req, res) => {
    const db = await loadDB();
    const verifyToken = db?.whatsappSettings?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) return res.status(503).json({ error: "WhatsApp verification token is not configured." });

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) return res.status(200).send(challenge);
    return res.status(403).json({ error: "Verification token mismatch." });
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const entries = req.body?.entry;
      if (!Array.isArray(entries)) return res.status(400).json({ error: "Invalid webhook payload." });

      for (const entry of entries) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;
          for (const message of change.value?.messages || []) {
            const senderPhone = `+${message.from}`;
            const messageText = message.text?.body;
            if (messageText) await runAIAgentForClient(senderPhone, messageText);
          }
        }
      }

      res.status(200).json({ success: true, received: true });
    } catch (error: any) {
      console.error("WhatsApp webhook processing failed:", error);
      res.status(500).json({ success: false, error: "Webhook processing failed." });
    }
  });

  app.post("/api/whatsapp/send-message", authenticated, async (req, res) => {
    try {
      const { phone, text, templateName, variables } = req.body || {};
      if (!phone || (!text && !templateName)) {
        return res.status(400).json({ success: false, error: "Recipient phone and message content are required." });
      }

      const db = await loadDB();
      const settings = db?.whatsappSettings || {};
      const accessToken = settings.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = settings.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!accessToken || !phoneId) {
        return res.status(503).json({ success: false, error: "WhatsApp Cloud API credentials are not configured." });
      }

      const payload: any = {
        messaging_product: "whatsapp",
        to: getPrimaryPhone(phone)
      };

      if (templateName) {
        payload.type = "template";
        payload.template = {
          name: templateName,
          language: { code: req.body.languageCode || settings.defaultTemplateLanguage || "en_US" },
          components: [{
            type: "body",
            parameters: (variables || []).map((value: string) => ({ type: "text", text: value }))
          }]
        };
      } else {
        payload.type = "text";
        payload.text = { body: text };
      }

      const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v20.0";
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const metaResponse = await response.json();

      if (!response.ok) {
        return res.status(502).json({ success: false, error: "Meta rejected the message.", metaResponse });
      }

      const conversation = db.whatsappChats?.find((chat: any) => chat.phone === phone) || { phone, name: phone, messages: [] };
      if (!db.whatsappChats?.some((chat: any) => chat.phone === phone)) {
        db.whatsappChats = db.whatsappChats || [];
        db.whatsappChats.push(conversation);
      }
      conversation.messages.push({
        id: makeId("msg"),
        direction: "outgoing",
        text: templateName ? `[Template: ${templateName}]` : text,
        timestamp: new Date().toISOString(),
        status: "sent",
        metaMessageId: metaResponse?.messages?.[0]?.id
      });
      await saveDB(db);

      res.json({ success: true, realSent: true, metaResponse });
    } catch (error: any) {
      console.error("WhatsApp send failed:", error);
      res.status(500).json({ success: false, error: "Failed to send WhatsApp message." });
    }
  });
}
