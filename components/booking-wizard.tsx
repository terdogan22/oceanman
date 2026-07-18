"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { categories, nextDays, services, staff, type Category, type Service, type Staff } from "@/lib/booking-data";

type Customer = { firstName: string; lastName: string; phone: string; email: string };
type BookingResponse = { appointmentId: string; cancellationUrl?: string; cancellationCode?: string; demo?: boolean; message: string };

const initialCustomer: Customer = { firstName: "", lastName: "", phone: "", email: "" };
const steps = ["Hizmet", "İşlem", "Uzman", "Zaman", "Bilgiler"];

function Arrow({ back = false }: { back?: boolean }) {
  return <span aria-hidden="true">{back ? "←" : "→"}</span>;
}

export function BookingWizard() {
  const days = useMemo(() => nextDays(), []);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [expert, setExpert] = useState<Staff | null>(null);
  const [date, setDate] = useState(days[0]?.iso ?? "");
  const [time, setTime] = useState("");
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [accepted, setAccepted] = useState(false);
  const [availability, setAvailability] = useState<{ key: string; slots: string[]; demo: boolean }>({ key: "", slots: [], demo: false });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [error, setError] = useState("");

  const filteredServices = services.filter((item) => item.category === category);
  const filteredStaff = staff.filter((item) => !service || item.services.includes(service.id));
  const canContinue = [Boolean(category), Boolean(service), Boolean(expert), Boolean(date && time)][step] ?? false;
  const availabilityKey = step === 3 && service && expert && date
    ? new URLSearchParams({ serviceId: service.id, staffId: expert.id, date }).toString()
    : "";
  const availabilityLoading = Boolean(availabilityKey && availability.key !== availabilityKey);
  const availableSlots = availability.key === availabilityKey ? availability.slots : [];
  const availabilityDemo = availability.key === availabilityKey && availability.demo;

  useEffect(() => {
    if (!availabilityKey) return;

    const controller = new AbortController();
    fetch(`/api/availability?${availabilityKey}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as { slots?: string[]; demo?: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || "Uygun saatler alınamadı.");
        setAvailability({ key: availabilityKey, slots: data.slots ?? [], demo: Boolean(data.demo) });
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Uygun saatler alınamadı.");
      });

    return () => controller.abort();
  }, [availabilityKey]);

  function chooseCategory(value: Category) {
    setCategory(value);
    setService(null);
    setExpert(null);
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (canContinue) {
      setError("");
      setStep((current) => Math.min(4, current + 1));
    }
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !expert || !date || !time || !accepted) return;
    setSubmitting(true);
    setError("");

    try {
      const startAt = new Date(`${date}T${time}:00+03:00`).toISOString();
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, staffId: expert.id, startAt, ...customer, privacyAccepted: accepted }),
      });
      const data = (await response.json()) as BookingResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Randevu oluşturulamadı.");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(0);
    setCategory(null);
    setService(null);
    setExpert(null);
    setTime("");
    setCustomer(initialCustomer);
    setAccepted(false);
    setResult(null);
  }

  if (result) {
    return (
      <section className="booking-card success-card" aria-live="polite">
        <div className="success-icon">✓</div>
        <p className="eyebrow">RANDEVUN HAZIR</p>
        <h2>Görüşmek üzere, {customer.firstName}.</h2>
        <p>{result.message}</p>
        <div className="receipt">
          <div><span>Hizmet</span><strong>{service?.title}</strong></div>
          <div><span>Uzman</span><strong>{expert?.name}</strong></div>
          <div><span>Tarih</span><strong>{date} · {time}</strong></div>
          <div><span>Randevu No</span><strong>{result.cancellationCode ?? "—"}</strong></div>
        </div>
        <p className="booking-reference-note">Randevu numaranızı saklayın; telefon numaranızla birlikte iptal işlemi yapabilirsiniz.</p>
        {result.demo && <p className="demo-note">Demo modu: Supabase bağlantısı yapıldığında kayıt gerçek veritabanına yazılacak.</p>}
        {result.cancellationUrl && <Link className="cancel-link" href={result.cancellationUrl}>İptal bağlantısını görüntüle</Link>}
        <button type="button" className="primary-button" onClick={reset}>Yeni randevu oluştur <Arrow /></button>
      </section>
    );
  }

  return (
    <section className="booking-card" aria-label="Randevu oluşturma">
      <div className="booking-head">
        <div>
          <p className="step-kicker">ADIM {step + 1} / {steps.length}</p>
          <h2>{steps[step]}</h2>
        </div>
        <span className="secure-label">● Güvenli rezervasyon</span>
      </div>

      <div className="progress" aria-label={`Randevu adımı ${step + 1} / ${steps.length}`}>
        {steps.map((item, index) => <span key={item} className={index <= step ? "active" : ""} />)}
      </div>

      <div className="booking-body">
        {step === 0 && (
          <div className="option-grid category-grid">
            {categories.map((item) => (
              <button type="button" key={item.id} className={`option-card ${category === item.id ? "selected" : ""}`} onClick={() => chooseCategory(item.id)}>
                <span className="option-icon">{item.icon}</span>
                <span><strong>{item.title}</strong><small>{item.caption}</small></span>
                <b>→</b>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="option-grid">
            {filteredServices.map((item) => (
              <button type="button" key={item.id} className={`service-row ${service?.id === item.id ? "selected" : ""}`} onClick={() => { setService(item); setExpert(null); }}>
                <span className="radio-mark" />
                <span className="service-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
                <span className="service-meta"><strong>{item.price} ₺</strong><small>{item.duration} dk</small></span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="expert-grid">
            {filteredStaff.map((item, index) => (
              <button type="button" key={item.id} className={`expert-card ${expert?.id === item.id ? "selected" : ""}`} onClick={() => setExpert(item)}>
                <span className={`avatar avatar-${index + 1}`}>{item.initials}</span>
                <span><strong>{item.name}</strong><small>{item.title}</small><em>★ 4.{9 - index}</em></span>
                <span className="radio-mark" />
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="field-label">TARİH SEÇİN</p>
            <div className="date-strip">
              {days.map((item) => (
                <button type="button" key={item.iso} className={date === item.iso ? "selected" : ""} onClick={() => { setDate(item.iso); setTime(""); setError(""); }}>
                  <small>{item.weekday}</small><strong>{item.day}</strong><span>{item.month}</span>
                </button>
              ))}
            </div>
            <p className="field-label time-title">UYGUN SAATLER</p>
            <div className="time-grid" aria-busy={availabilityLoading}>
              {availableSlots.map((slot) => (
                <button type="button" key={slot} className={time === slot ? "selected" : ""} onClick={() => setTime(slot)}>{slot}</button>
              ))}
            </div>
            {availabilityLoading && <p className="availability-state">Uygun saatler kontrol ediliyor…</p>}
            {!availabilityLoading && !error && availableSlots.length === 0 && <p className="availability-state">Bu gün için uygun saat kalmadı. Başka bir tarih seçebilirsiniz.</p>}
            {availabilityDemo && <p className="availability-demo">Demo saatleri gösteriliyor. Supabase bağlantısından sonra dolu saatler gerçek zamanlı kapanacak.</p>}
          </div>
        )}

        {step === 4 && (
          <form id="customer-form" className="customer-form" onSubmit={submitBooking}>
            <div className="summary-line">
              <div><span>{service?.title}</span><small>{expert?.name}</small></div>
              <strong>{date}<br /><em>{time}</em></strong>
            </div>
            <div className="form-grid">
              <label><span>Ad</span><input required autoComplete="given-name" value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} placeholder="Adınız" /></label>
              <label><span>Soyad</span><input required autoComplete="family-name" value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} placeholder="Soyadınız" /></label>
              <label><span>Telefon</span><input required type="tel" autoComplete="tel" minLength={10} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="05xx xxx xx xx" /></label>
              <label><span>E-posta</span><input required type="email" autoComplete="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="ornek@email.com" /></label>
            </div>
            <label className="consent"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span><b>KVKK aydınlatma metnini</b> okudum; randevu bilgilerimin işlenmesini kabul ediyorum.</span></label>
          </form>
        )}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="booking-actions">
        {step > 0 ? <button type="button" className="back-button" onClick={goBack}><Arrow back /> Geri</button> : <span />}
        {step < 4 ? (
          <button type="button" className="primary-button" disabled={!canContinue} onClick={goNext}>Devam et <Arrow /></button>
        ) : (
          <button type="submit" form="customer-form" className="primary-button" disabled={!accepted || submitting}>{submitting ? "Kaydediliyor…" : "Randevuyu onayla"} <Arrow /></button>
        )}
      </div>
    </section>
  );
}
