export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function oceanmanEmailFrame(content: string) {
  return `
    <!doctype html>
    <html lang="tr">
      <body style="margin:0;padding:0;background:#eef0eb;font-family:Arial,Helvetica,sans-serif;color:#10201b">
        <div style="padding:32px 16px;background:#eef0eb">
          <div style="max-width:620px;margin:0 auto;background:#fffaf0;border:1px solid #ded4c1">
            <div style="padding:25px 28px;background:#10201b;color:#f2d28c">
              <strong style="font-size:22px;letter-spacing:2px">OCEAN MAN</strong>
              <div style="margin-top:6px;font-size:10px;letter-spacing:2px;color:#c5c8c5">YENİ NESİL BERBER · EDİRNE</div>
            </div>
            <div style="padding:32px 28px">${content}</div>
            <div style="padding:18px 28px;background:#eee7da;color:#6d716d;font-size:12px;line-height:1.6">
              Şükrüpaşa · Edirne · 0 540 236 00 66<br>
              Bu e-posta Oceanman Edirne yönetim sistemi tarafından gönderildi.
            </div>
          </div>
        </div>
      </body>
    </html>`;
}
