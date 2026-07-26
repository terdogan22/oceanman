import { loadStoredSmtpSettings, sendSmtpEmail } from "@/lib/smtp-mail";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { escapeEmailHtml as escapeHtml, oceanmanEmailFrame } from "@/lib/email-template";

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
  const settings = await loadStoredSmtpSettings();
  if (!settings) return false;

  return sendSmtpEmail(settings, {
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
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
  const html = oceanmanEmailFrame(`
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
  const html = oceanmanEmailFrame(`
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
