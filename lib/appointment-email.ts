import { decryptSecret } from "@/lib/secret-crypto";
import { getAdminSupabase } from "@/lib/supabase-admin";

type AppointmentDetails = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  startAt: string;
  serviceName: string;
  staffName: string;
};

type DeliverySettings = {
  apiKey: string;
  from: string;
  replyTo: string;
  notificationEmail: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://oceanman.vercel.app").replace(/\/+$/, "");
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

async function loadDeliverySettings(): Promise<DeliverySettings | null> {
  const fallbackApiKey = process.env.RESEND_API_KEY ?? "";
  const fallbackFrom = process.env.EMAIL_FROM ?? "";
  const fallbackReplyTo = process.env.EMAIL_REPLY_TO ?? "";
  const fallbackNotification = process.env.BUSINESS_NOTIFICATION_EMAIL ?? "";
  const supabase = getAdminSupabase();

  if (!supabase) {
    return fallbackApiKey && fallbackFrom
      ? { apiKey: fallbackApiKey, from: fallbackFrom, replyTo: fallbackReplyTo, notificationEmail: fallbackNotification }
      : null;
  }

  const { data } = await supabase
    .from("email_settings")
    .select("from_name, from_email, reply_to, notification_email, api_key_encrypted")
    .eq("singleton", true)
    .maybeSingle();

  let databaseApiKey = "";
  if (data?.api_key_encrypted) {
    try {
      databaseApiKey = decryptSecret(data.api_key_encrypted);
    } catch {
      databaseApiKey = "";
    }
  }

  const apiKey = databaseApiKey || fallbackApiKey;
  const fromEmail = String(data?.from_email || "").trim();
  const fromName = String(data?.from_name || "Oceanman Edirne").trim();
  const from = fromEmail ? `${fromName} <${fromEmail}>` : fallbackFrom;
  if (!apiKey || !from) return null;

  return {
    apiKey,
    from,
    replyTo: String(data?.reply_to || fallbackReplyTo || ""),
    notificationEmail: String(data?.notification_email || fallbackNotification || ""),
  };
}

async function loadAppointment(appointmentId: string): Promise<AppointmentDetails | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id, service_id, staff_id, customer_first_name, customer_last_name, customer_email, customer_phone, start_at")
    .eq("id", appointmentId)
    .single();
  if (error || !appointment) return null;

  const [serviceResult, staffResult] = await Promise.all([
    supabase.from("services").select("name").eq("id", appointment.service_id).single(),
    supabase.from("staff").select("name").eq("id", appointment.staff_id).single(),
  ]);
  if (!serviceResult.data || !staffResult.data) return null;

  return {
    id: appointment.id,
    firstName: appointment.customer_first_name,
    lastName: appointment.customer_last_name,
    email: appointment.customer_email,
    phone: appointment.customer_phone,
    startAt: appointment.start_at,
    serviceName: serviceResult.data.name,
    staffName: staffResult.data.name,
  };
}

async function sendEmail(input: {
  appointmentId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  event: "created" | "cancelled";
}) {
  const settings = await loadDeliverySettings();
  if (!settings) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `oceanman-${input.event}-${input.appointmentId}`,
      "User-Agent": "Oceanman-Booking/1.0",
    },
    body: JSON.stringify({
      from: settings.from,
      to: [input.to],
      ...(settings.replyTo ? { reply_to: settings.replyTo } : {}),
      ...(settings.notificationEmail ? { bcc: [settings.notificationEmail] } : {}),
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: [{ name: "appointment_event", value: input.event }],
    }),
  });

  return response.ok;
}

function emailFrame(content: string) {
  return `
    <div style="margin:0;padding:32px 16px;background:#eef0eb;font-family:Arial,sans-serif;color:#10201b">
      <div style="max-width:620px;margin:0 auto;background:#fffaf0;border:1px solid #ded4c1">
        <div style="padding:24px 28px;background:#10201b;color:#f2d28c">
          <strong style="font-size:22px;letter-spacing:2px">OCEAN MAN</strong>
          <div style="margin-top:5px;font-size:10px;letter-spacing:2px;color:#c5c8c5">YENİ NESİL BERBER · EDİRNE</div>
        </div>
        <div style="padding:30px 28px">${content}</div>
        <div style="padding:18px 28px;background:#eee7da;color:#6d716d;font-size:12px">
          Şükrüpaşa · Edirne · 0 540 236 00 66
        </div>
      </div>
    </div>`;
}

export async function sendAppointmentCreatedEmail(
  appointmentId: string,
  cancellationToken: string,
  cancellationCode: string,
) {
  const appointment = await loadAppointment(appointmentId);
  if (!appointment) return false;

  const cancelUrl = `${siteUrl()}/randevu/iptal?token=${encodeURIComponent(cancellationToken)}`;
  const date = formattedDate(appointment.startAt);
  const name = `${appointment.firstName} ${appointment.lastName}`;
  const html = emailFrame(`
    <p style="margin:0 0 8px;color:#92713a;font-size:12px;font-weight:bold;letter-spacing:1px">RANDEVUNUZ ONAYLANDI</p>
    <h1 style="margin:0 0 20px;font-size:30px">Görüşmek üzere, ${escapeHtml(appointment.firstName)}.</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:10px;border-bottom:1px solid #ddd3c2;color:#737873">Hizmet</td><td style="padding:10px;border-bottom:1px solid #ddd3c2;font-weight:bold">${escapeHtml(appointment.serviceName)}</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #ddd3c2;color:#737873">Uzman</td><td style="padding:10px;border-bottom:1px solid #ddd3c2;font-weight:bold">${escapeHtml(appointment.staffName)}</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #ddd3c2;color:#737873">Tarih</td><td style="padding:10px;border-bottom:1px solid #ddd3c2;font-weight:bold">${escapeHtml(date)}</td></tr>
      <tr><td style="padding:10px;color:#737873">Randevu No</td><td style="padding:10px;font-weight:bold;font-size:18px">${escapeHtml(cancellationCode)}</td></tr>
    </table>
    <p style="margin:22px 0 12px;color:#626762;font-size:13px">Planınız değişirse randevu numaranız ve telefonunuzla iptal edebilirsiniz.</p>
    <a href="${escapeHtml(cancelUrl)}" style="display:inline-block;padding:13px 18px;background:#87483c;color:#fff;text-decoration:none;font-size:12px;font-weight:bold">RANDEVUYU İPTAL ET</a>
  `);
  const text = [
    `Merhaba ${name}, randevunuz onaylandı.`,
    `Hizmet: ${appointment.serviceName}`,
    `Uzman: ${appointment.staffName}`,
    `Tarih: ${date}`,
    `Randevu No: ${cancellationCode}`,
    `İptal: ${cancelUrl}`,
  ].join("\n");

  return sendEmail({
    appointmentId,
    to: appointment.email,
    subject: `Oceanman randevunuz onaylandı · ${date}`,
    html,
    text,
    event: "created",
  });
}

export async function sendAppointmentCancelledEmail(appointmentId: string) {
  const appointment = await loadAppointment(appointmentId);
  if (!appointment) return false;

  const date = formattedDate(appointment.startAt);
  const html = emailFrame(`
    <p style="margin:0 0 8px;color:#87483c;font-size:12px;font-weight:bold;letter-spacing:1px">RANDEVU İPTALİ</p>
    <h1 style="margin:0 0 18px;font-size:30px">Randevunuz iptal edildi.</h1>
    <p style="margin:0 0 22px;color:#626762;line-height:1.6">Merhaba ${escapeHtml(appointment.firstName)}, aşağıdaki randevunuz başarıyla iptal edildi.</p>
    <p style="padding:16px;background:#eee7da;line-height:1.7">
      <strong>${escapeHtml(appointment.serviceName)}</strong><br>
      ${escapeHtml(appointment.staffName)} · ${escapeHtml(date)}
    </p>
    <a href="${siteUrl()}/randevu" style="display:inline-block;margin-top:8px;padding:13px 18px;background:#10201b;color:#fff;text-decoration:none;font-size:12px;font-weight:bold">YENİ RANDEVU AL</a>
  `);
  const text = [
    `Merhaba ${appointment.firstName}, randevunuz iptal edildi.`,
    `Hizmet: ${appointment.serviceName}`,
    `Uzman: ${appointment.staffName}`,
    `Tarih: ${date}`,
    `Yeni randevu: ${siteUrl()}/randevu`,
  ].join("\n");

  return sendEmail({
    appointmentId,
    to: appointment.email,
    subject: "Oceanman randevunuz iptal edildi",
    html,
    text,
    event: "cancelled",
  });
}
