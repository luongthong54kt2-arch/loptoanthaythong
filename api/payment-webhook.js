/**
 * api/payment-webhook.js
 * SeaPay / generic bank webhook → auto-send payment confirmation via GAS
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifySeaPaySignature(body, signature, secret) {
  if (!secret || !signature) return true;
  const hmac = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
  return hmac === signature;
}

async function sendViaGas(type, payload) {
  const gasUrl = process.env.GAS_EMAIL_URL;
  if (!gasUrl) return false;
  const res = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({ type, secret: process.env.GAS_WEBHOOK_SECRET || "", ...payload }),
  });
  const data = await res.json();
  return data.ok === true;
}

async function forwardToN8n(payload) {
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nUrl) return;
  try {
    await fetch(n8nUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (e) { console.error("n8n failed:", e.message); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const signature = req.headers["x-seapay-signature"] || "";
  if (!verifySeaPaySignature(req.body, signature, process.env.SEAPAY_WEBHOOK_SECRET || "")) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { transaction_id, amount, description = "", reference = "", transfer_at } = req.body;
  if (!transaction_id || !amount) return res.status(400).json({ error: "Missing required fields" });

  try {
    const codeMatch = (description + " " + reference).toUpperCase().match(/HS\d{3,}/);
    const studentCode = codeMatch ? codeMatch[0] : null;
    let student = null;

    if (studentCode) {
      const { data } = await supabase.from("students")
        .select("id, full_name, parent_email").eq("student_code", studentCode).single();
      if (data) student = data;
    }

    const { data: payment, error: payErr } = await supabase.from("payments").insert({
      student_id: student?.id || null,
      amount, method: "transfer",
      note: `SeaPay: ${description}`,
      paid_at: transfer_at || new Date().toISOString(),
      transaction_id,
    }).select().single();

    if (payErr) throw payErr;

    let emailSent = false;
    if (student?.parent_email) {
      const confirmPayload = {
        parentEmail: student.parent_email,
        studentName: student.full_name,
        amount, transactionId: transaction_id,
        transferAt: transfer_at, description,
        centerName: process.env.CENTER_NAME || "EduCenter",
      };
      emailSent = await sendViaGas("payment_confirm", confirmPayload);

      if (emailSent) {
        await supabase.from("email_logs").insert({
          student_id: student.id, type: "payment_confirm",
          recipient: student.parent_email,
          subject: `✅ Xác nhận thanh toán – ${student.full_name}`,
          status: "sent",
        });
        await forwardToN8n({ type: "payment_confirm", ...confirmPayload });
      }
    }

    return res.status(200).json({ ok: true, payment_id: payment.id, student_code: studentCode, email_sent: emailSent });
  } catch (err) {
    console.error("Payment webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
