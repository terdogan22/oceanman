import nodemailer from "nodemailer";
import { decryptSecret } from "@/lib/secret-crypto";
import { getAdminSupabase } from "@/lib/supabase-admin";

export type SmtpSecurity = "starttls" | "tls" | "none";

export type SmtpSettings = {
  fromName: string;
  fromEmail: string;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password: string;
};

export async function loadStoredSmtpSettings(): Promise<SmtpSettings | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("email_settings")
    .select("from_name, from_email, smtp_host, smtp_port, smtp_security, smtp_username, smtp_password_encrypted")
    .eq("singleton", true)
    .maybeSingle();

  if (error || !data?.smtp_password_encrypted) return null;

  let password = "";
  try {
    password = decryptSecret(data.smtp_password_encrypted);
  } catch {
    return null;
  }

  const security = data.smtp_security === "tls" || data.smtp_security === "none"
    ? data.smtp_security
    : "starttls";

  return {
    fromName: String(data.from_name || "Oceanman Edirne"),
    fromEmail: String(data.from_email || ""),
    host: String(data.smtp_host || ""),
    port: Number(data.smtp_port || 587),
    security,
    username: String(data.smtp_username || ""),
    password,
  };
}

export function createSmtpTransport(settings: SmtpSettings) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "tls",
    requireTLS: settings.security === "starttls",
    auth: {
      user: settings.username,
      pass: settings.password,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
}

export async function sendSmtpEmail(
  settings: SmtpSettings,
  input: { to: string; subject: string; html: string; text: string },
) {
  const transport = createSmtpTransport(settings);
  const result = await transport.sendMail({
    from: { name: settings.fromName, address: settings.fromEmail },
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return result.accepted.length > 0;
}
