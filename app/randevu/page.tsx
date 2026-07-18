import Link from "next/link";
import { BookingWizard } from "@/components/booking-wizard";
import { SiteLogo } from "@/components/site-logo";

export const metadata = {
  title: "Online Randevu | Oceanman Edirne",
  description: "Hizmetinizi, uzmanınızı ve saatinizi seçerek online randevu oluşturun.",
  robots: { index: false, follow: true },
};

export default function BookingPage() {
  return (
    <main className="site-shell booking-page">
      <header className="site-header">
        <SiteLogo light />
        <div className="booking-header-right">
          <div className="header-meta"><span className="status-dot" /> Bugün 09:00–20:00</div>
          <Link className="back-home" href="/">Ana sayfa</Link>
        </div>
      </header>

      <section className="hero booking-hero">
        <div className="hero-copy">
          <p className="eyebrow">ONLINE REZERVASYON</p>
          <h1>Tarzına ayırdığın<br /><em>zaman, sana özel.</em></h1>
          <p className="hero-lead">Hizmetini ve uzmanını seç; sana uygun saati birkaç adımda ayıralım.</p>
          <div className="hero-proof">
            <div><strong>4.9</strong><span>müşteri puanı</span></div><i />
            <div><strong>3</strong><span>uzman ekip</span></div><i />
            <div><strong>7 gün</strong><span>hizmet</span></div>
          </div>
        </div>
        <BookingWizard />
      </section>

      <footer className="site-footer"><span>Şükrüpaşa · Edirne</span><span>© {new Date().getFullYear()} Oceanman</span><a href="tel:+905402360066">0 540 236 00 66</a></footer>
    </main>
  );
}
