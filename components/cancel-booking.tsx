"use client";

import { useState } from "react";
import Link from "next/link";

export function CancelBooking({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cancelled, setCancelled] = useState(false);

  async function cancel() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Randevu iptal edilemedi.");
      setCancelled(true);
      setMessage("Randevunuz iptal edildi. İsterseniz yeni bir randevu oluşturabilirsiniz.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Randevu iptal edilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="booking-card cancel-card">
      <p className="eyebrow">RANDEVU İPTALİ</p>
      <h1>{cancelled ? "Randevu iptal edildi." : "Randevunuzu iptal etmek istiyor musunuz?"}</h1>
      <p>{message || "Bu işlem tamamlandığında ayırdığınız saat yeniden müsait hale gelir."}</p>
      {!cancelled && <button type="button" className="primary-button" disabled={loading || !token} onClick={cancel}>{loading ? "İptal ediliyor…" : "Randevuyu iptal et"} <span>→</span></button>}
      <Link className="outline-button" href={cancelled ? "/randevu" : "/"}>{cancelled ? "Yeni randevu al" : "Ana sayfaya dön"}</Link>
    </section>
  );
}
