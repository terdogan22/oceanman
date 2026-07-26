import { escapeEmailHtml, oceanmanEmailFrame } from "@/lib/email-template";
import { loadStoredSmtpSettings, sendSmtpEmail } from "@/lib/smtp-mail";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://oceanman.vercel.app").replace(/\/+$/, "");
}

export async function sendAdminInvitationEmail(input: {
  to: string;
  displayName: string;
  temporaryPassword: string;
}) {
  const settings = await loadStoredSmtpSettings();
  if (!settings) {
    return { sent: false, reason: "SMTP ayarları henüz tamamlanmamış." };
  }

  const adminUrl = `${siteUrl()}/admin`;
  const safeName = escapeEmailHtml(input.displayName);
  const safeEmail = escapeEmailHtml(input.to);
  const safePassword = escapeEmailHtml(input.temporaryPassword);
  const safeAdminUrl = escapeEmailHtml(adminUrl);
  const html = oceanmanEmailFrame(`
    <p style="margin:0 0 8px;color:#92713a;font-size:12px;font-weight:bold;letter-spacing:1px">YÖNETİM HESABINIZ HAZIR</p>
    <h1 style="margin:0 0 18px;font-size:30px;line-height:1.15">Hoş geldiniz, ${safeName}.</h1>
    <p style="margin:0 0 22px;color:#626762;font-size:14px;line-height:1.7">
      Oceanman Edirne yönetim paneline erişebilmeniz için hesabınız oluşturuldu.
    </p>
    <div style="padding:18px;background:#eee7da;border-left:3px solid #92713a;font-size:14px;line-height:1.8">
      <div><span style="color:#737873">E-posta:</span> <strong>${safeEmail}</strong></div>
      <div><span style="color:#737873">Geçici şifre:</span> <strong style="font-size:16px">${safePassword}</strong></div>
    </div>
    <p style="margin:20px 0;color:#87483c;font-size:13px;font-weight:bold;line-height:1.6">
      Güvenliğiniz için ilk girişinizde yeni bir şifre belirlemeniz zorunludur.
    </p>
    <a href="${safeAdminUrl}" style="display:inline-block;padding:13px 19px;background:#10201b;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.4px">YÖNETİM PANELİNE GİR</a>
    <p style="margin:20px 0 0;color:#777d78;font-size:11px;line-height:1.6">
      Bu giriş bilgisini kimseyle paylaşmayın. Bu hesabı siz istemediyseniz işletme yetkilisiyle iletişime geçin.
    </p>
  `);
  const text = [
    `Merhaba ${input.displayName},`,
    "Oceanman Edirne yönetim hesabınız hazır.",
    `Giriş adresi: ${adminUrl}`,
    `E-posta: ${input.to}`,
    `Geçici şifre: ${input.temporaryPassword}`,
    "İlk girişinizde yeni bir şifre belirlemeniz zorunludur.",
  ].join("\n");

  try {
    const sent = await sendSmtpEmail(settings, {
      to: input.to,
      subject: "Oceanman yönetim hesabınız hazır",
      html,
      text,
    });
    return sent
      ? { sent: true as const }
      : { sent: false as const, reason: "E-posta sunucusu gönderimi kabul etmedi." };
  } catch {
    return { sent: false as const, reason: "Davet e-postası gönderilemedi." };
  }
}
