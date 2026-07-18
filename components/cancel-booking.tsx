"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function CancelBooking({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [appointmentCode, setAppointmentCode] = useState("");
  const [phone, setPhone] = useState("");

  async function cancel(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token } : { appointmentCode, phone }),
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
      <h1>{cancelled ? "Randevu iptal edildi." : token ? "Randevunuzu iptal etmek istiyor musunuz?" : "Randevunuzu bulalım."}</h1>
      <p>{message || (token
        ? "Bu işlem tamamlandığında ayırdığınız saat yeniden müsait hale gelir."
        : "Randevu numaranızı ve kayıt sırasında kullandığınız telefonu girin.")}</p>
      {!cancelled && token && (
        <button type="button" className="primary-button" disabled={loading} onClick={() => cancel()}>
          {loading ? "İptal ediliyor…" : "Randevuyu iptal et"} <span>→</span>
        </button>
      )}
      {!cancelled && !token && (
        <form className="cancel-form" onSubmit={cancel}>
          <label>
            <span>Randevu No</span>
            <input
              required
              minLength={4}
              maxLength={4}
              autoComplete="off"
              value={appointmentCode}
              onChange={(event) => setAppointmentCode(event.target.value.toUpperCase())}
              placeholder="Örn. A7K2"
            />
          </label>
          <label>
            <span>Telefon</span>
            <input
              required
              type="tel"
              minLength={10}
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="05xx xxx xx xx"
            />
          </label>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Kontrol ediliyor…" : "Randevuyu iptal et"} <span>→</span>
          </button>
        </form>
      )}
      <Link className="outline-button" href="/randevu">{cancelled ? "Yeni randevu al" : "Randevu ekranına dön"}</Link>
    </section>
  );
}
