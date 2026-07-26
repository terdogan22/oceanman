import { oceanmanEmailFrame } from "@/lib/email-template";
import { loadStoredSmtpSettings, sendSmtpEmail } from "@/lib/smtp-mail";

type ExampleMessage = {
  subject: string;
  html: string;
  text: string;
};

function examples(): ExampleMessage[] {
  const appointmentDate = "29 Temmuz 2026 Çarşamba · 14:30";
  return [
    {
      subject: "[ÖRNEK] Oceanman yönetim hesabınız hazır",
      html: oceanmanEmailFrame(`
        <p style="margin:0 0 8px;color:#92713a;font-size:12px;font-weight:bold;letter-spacing:1px">ÖRNEK · YÖNETİM HESABINIZ HAZIR</p>
        <h1 style="margin:0 0 18px;font-size:30px;line-height:1.15">Hoş geldiniz, Örnek Kullanıcı.</h1>
        <p style="margin:0 0 22px;color:#626762;font-size:14px;line-height:1.7">Oceanman Edirne yönetim paneline erişebilmeniz için hesabınız oluşturuldu.</p>
        <div style="padding:18px;background:#eee7da;border-left:3px solid #92713a;font-size:14px;line-height:1.8">
          <div><span style="color:#737873">E-posta:</span> <strong>ornek@oceanmanedirne.com</strong></div>
          <div><span style="color:#737873">Geçici şifre:</span> <strong style="font-size:16px">Ocean-2026!</strong></div>
        </div>
        <p style="margin:20px 0;color:#87483c;font-size:13px;font-weight:bold;line-height:1.6">İlk girişinizde yeni bir şifre belirlemeniz zorunludur.</p>
        <a href="https://oceanman.vercel.app/admin" style="display:inline-block;padding:13px 19px;background:#10201b;color:#fff;text-decoration:none;font-size:12px;font-weight:bold">YÖNETİM PANELİNE GİR</a>
      `),
      text: "ÖRNEK · Oceanman yönetim hesabınız hazır.\nE-posta: ornek@oceanmanedirne.com\nGeçici şifre: Ocean-2026!\nİlk girişte şifre değişikliği zorunludur.",
    },
    {
      subject: "[ÖRNEK] Oceanman randevunuz onaylandı",
      html: oceanmanEmailFrame(`
        <p style="margin:0 0 8px;color:#92713a;font-size:12px;font-weight:bold;letter-spacing:1px">ÖRNEK · RANDEVUNUZ ONAYLANDI</p>
        <h1 style="margin:0 0 20px;font-size:30px">Görüşmek üzere, Tolga.</h1>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:10px;border-bottom:1px solid #ddd3c2;color:#737873">Hizmet</td><td style="padding:10px;border-bottom:1px solid #ddd3c2;font-weight:bold">Saç + Sakal</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd3c2;color:#737873">Uzman</td><td style="padding:10px;border-bottom:1px solid #ddd3c2;font-weight:bold">Erdem Kaçar</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd3c2;color:#737873">Tarih</td><td style="padding:10px;border-bottom:1px solid #ddd3c2;font-weight:bold">${appointmentDate}</td></tr>
          <tr><td style="padding:10px;color:#737873">Randevu No</td><td style="padding:10px;font-weight:bold;font-size:18px">A7K9</td></tr>
        </table>
        <p style="margin:22px 0 12px;color:#626762;font-size:13px">Planınız değişirse randevu numaranız ve telefonunuzla iptal edebilirsiniz.</p>
        <a href="https://oceanman.vercel.app/randevu/iptal" style="display:inline-block;padding:13px 18px;background:#87483c;color:#fff;text-decoration:none;font-size:12px;font-weight:bold">RANDEVUYU İPTAL ET</a>
      `),
      text: `ÖRNEK · Randevunuz onaylandı.\nHizmet: Saç + Sakal\nUzman: Erdem Kaçar\nTarih: ${appointmentDate}\nRandevu No: A7K9`,
    },
    {
      subject: "[ÖRNEK] Oceanman randevunuz iptal edildi",
      html: oceanmanEmailFrame(`
        <p style="margin:0 0 8px;color:#87483c;font-size:12px;font-weight:bold;letter-spacing:1px">ÖRNEK · RANDEVU İPTALİ</p>
        <h1 style="margin:0 0 18px;font-size:30px">Randevunuz iptal edildi.</h1>
        <p style="margin:0 0 22px;color:#626762;line-height:1.6">Merhaba Tolga, aşağıdaki randevunuz başarıyla iptal edildi.</p>
        <p style="padding:16px;background:#eee7da;line-height:1.7"><strong>Saç + Sakal</strong><br>Erdem Kaçar · ${appointmentDate}</p>
        <a href="https://oceanman.vercel.app/randevu" style="display:inline-block;margin-top:8px;padding:13px 18px;background:#10201b;color:#fff;text-decoration:none;font-size:12px;font-weight:bold">YENİ RANDEVU AL</a>
      `),
      text: `ÖRNEK · Randevunuz iptal edildi.\nHizmet: Saç + Sakal\nUzman: Erdem Kaçar\nTarih: ${appointmentDate}`,
    },
    {
      subject: "[ÖRNEK] Oceanman yönetim şifreniz değiştirildi",
      html: oceanmanEmailFrame(`
        <p style="margin:0 0 8px;color:#92713a;font-size:12px;font-weight:bold;letter-spacing:1px">ÖRNEK · GÜVENLİK BİLDİRİMİ</p>
        <h1 style="margin:0 0 18px;font-size:30px;line-height:1.15">Şifreniz değiştirildi.</h1>
        <p style="margin:0 0 22px;color:#626762;font-size:14px;line-height:1.7">Merhaba Örnek Kullanıcı, Oceanman yönetim hesabınızın şifresi başarıyla değiştirildi.</p>
        <div style="padding:16px;background:#eee7da;border-left:3px solid #92713a;color:#626762;font-size:13px;line-height:1.7">Bu işlemi siz yapmadıysanız vakit kaybetmeden superadmin ile iletişime geçin.</div>
        <a href="https://oceanman.vercel.app/admin" style="display:inline-block;margin-top:22px;padding:13px 19px;background:#10201b;color:#fff;text-decoration:none;font-size:12px;font-weight:bold">YÖNETİM PANELİNE GİR</a>
      `),
      text: "ÖRNEK · Oceanman yönetim şifreniz değiştirildi.\nBu işlemi siz yapmadıysanız vakit kaybetmeden superadmin ile iletişime geçin.",
    },
  ];
}

export async function sendEmailExamples(to: string) {
  const settings = await loadStoredSmtpSettings();
  if (!settings) throw new Error("SMTP_NOT_CONFIGURED");

  const results: boolean[] = [];
  for (const message of examples()) {
    results.push(await sendSmtpEmail(settings, { to, ...message }));
  }
  return results.every(Boolean);
}
