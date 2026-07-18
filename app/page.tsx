import Image from "next/image";
import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";

const instagramUrl = "https://www.instagram.com/oceanmanedirne/";

const featuredServices = [
  { number: "01", title: "Saç Tasarımı", text: "Yüz hatlarınıza ve günlük stilinize göre modern, klasik veya fade kesimler.", meta: "45 dk", icon: "✦" },
  { number: "02", title: "Sakal Ritüeli", text: "Sıcak havlu, hassas kontur, bakım ve cildinizi rahatlatan son dokunuşlar.", meta: "30 dk", icon: "⌁" },
  { number: "03", title: "Cilt Bakımı", text: "Derinlemesine temizlik, peeling ve cilt tipinize özel nem dengesi.", meta: "45 dk", icon: "◐" },
  { number: "04", title: "Solaryum", text: "Cilt tipinize göre planlanan kontrollü seanslarla dört mevsim eşit bronzluk.", meta: "20 dk", icon: "☼" },
];

const team = [
  { name: "Erdem Kaçan", role: "Stilist", photo: "/images/oceanman-style.jpg", index: 1 },
  { name: "Emrah Ak", role: "Stilist", photo: "/images/oceanman-barber.jpg", index: 2 },
  { name: "Yunus Taş", role: "Stilist", photo: "/images/oceanman-cutting.jpg", index: 3 },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <nav className="home-nav">
          <SiteLogo light />
          <div className="nav-links" aria-label="Ana menü">
            <a href="#hizmetler">Hizmetler</a>
            <a href="#hikayemiz">Hikayemiz</a>
            <a href="#ekip">Ekibimiz</a>
            <a href="#iletisim">İletişim</a>
          </div>
          <div className="nav-actions">
            <a className="nav-instagram" href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Oceanman Instagram hesabını aç">Instagram</a>
            <Link className="nav-book" href="/randevu">Randevu Al <Arrow /></Link>
          </div>
        </nav>

        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="home-hero-content">
          <p className="eyebrow">EDİRNE&apos;DE YENİ NESİL ERKEK BAKIMI</p>
          <h1>Görünüşün<br /><em>imzandır.</em></h1>
          <p className="home-hero-lead">Ustalık, kişisel stil ve özenli bakım. Kendinizi iyi hissettiren görünüm için koltuğumuz hazır.</p>
          <div className="home-hero-actions">
            <Link className="gold-button" href="/randevu">Randevunu Oluştur <Arrow /></Link>
            <a className="text-link" href="#hizmetler">Hizmetleri keşfet <span>↓</span></a>
          </div>
        </div>

        <div className="hero-visual">
          <Image className="hero-photo" src="/images/oceanman-barber.jpg" alt="Oceanman salonunda saç şekillendirme uygulaması" fill sizes="(max-width: 720px) 520px, 40vw" priority />
          <div className="hero-card hero-card-top"><span>7 GÜN</span><strong>09:00 — 20:00</strong></div>
          <div className="hero-card hero-card-bottom"><span>MÜŞTERİ PUANI</span><strong>★ 4.9</strong></div>
        </div>

        <div className="hero-bottom-line">
          <span>ŞÜKRÜPAŞA · EDİRNE</span>
          <span>SAÇ · SAKAL · BAKIM · SOLARYUM</span>
          <span>EST. 2017</span>
        </div>
      </section>

      <section className="intro-strip">
        <p>Detaya gösterilen özen, <em>tarzın tamamını değiştirir.</em></p>
        <div><span>01</span><span>USTALIK</span><i /><span>02</span><span>HİJYEN</span><i /><span>03</span><span>KİŞİSEL STİL</span></div>
      </section>

      <section className="services-section" id="hizmetler">
        <div className="section-heading">
          <div><p className="eyebrow dark">HİZMETLERİMİZ</p><h2>Bakımın her adımında<br /><em>uzman dokunuşu.</em></h2></div>
          <p>Sadece bir işlem değil, size göre tasarlanan bütünsel bir bakım deneyimi.</p>
        </div>
        <div className="service-showcase">
          {featuredServices.map((service) => (
            <article className="home-service-card" key={service.number}>
              <span className="service-number">{service.number}</span>
              <span className="service-symbol">{service.icon}</span>
              <div><h3>{service.title}</h3><p>{service.text}</p></div>
              <footer><span>{service.meta}</span><Link href="/randevu">Randevu <Arrow /></Link></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section" id="hikayemiz">
        <div className="story-visual">
          <Image src="/images/oceanman-cutting.jpg" alt="Oceanman'de makasla saç kesimi detayı" fill sizes="(max-width: 1050px) 100vw, 52vw" />
          <div className="story-stamp"><strong>O</strong><span>USTALIK<br />VE STİL</span></div>
          <div className="story-lines" />
          <p>GELENEKSEL USTALIK<br />MODERN VİZYON</p>
        </div>
        <div className="story-copy">
          <p className="eyebrow">OCEANMAN HİKAYESİ</p>
          <h2>Koltuğumuzdan<br /><em>kendin gibi kalk.</em></h2>
          <p>Oceanman&apos;de her hizmet yüz hatlarınız, saç yapınız ve yaşam tarzınız düşünülerek planlanır. Amacımız yalnızca iyi bir kesim değil; kendinizi daha güçlü hissettiren, sürdürülebilir bir stil yaratmaktır.</p>
          <ul>
            <li><span>01</span> Kişiye özel stil danışmanlığı</li>
            <li><span>02</span> Profesyonel ürün ve ekipman</li>
            <li><span>03</span> Steril ve konforlu ortam</li>
          </ul>
          <Link className="outline-button" href="/randevu">Koltuğunu Ayır <Arrow /></Link>
        </div>
      </section>

      <section className="team-section" id="ekip">
        <div className="section-heading team-heading">
          <div><p className="eyebrow dark">EKİBİMİZ</p><h2>Tarzını emanet<br />edeceğin <em>ustalar.</em></h2></div>
          <p>Teknik, deneyim ve kişisel yaklaşımı aynı koltukta buluşturan ekip.</p>
        </div>
        <div className="team-grid">
          {team.map((member) => (
            <article className="team-card" key={member.name}>
              <div className={`team-portrait portrait-${member.index}`}>
                <Image src={member.photo} alt="Oceanman salonunda stilist çalışma anı" fill sizes="(max-width: 720px) 100vw, 33vw" />
                <i>OCEANMAN</i>
              </div>
              <div><span>0{member.index}</span><h3>{member.name}</h3><p>{member.role}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="instagram-section" aria-labelledby="instagram-heading">
        <div className="instagram-copy">
          <p className="eyebrow dark">@OCEANMANEDIRNE</p>
          <h2 id="instagram-heading">Salondan yeni stiller,<br /><em>Instagram&apos;da.</em></h2>
          <p>Son kesimlerimizi, bakım uygulamalarımızı ve salondan güncel kareleri takip edin.</p>
          <a className="instagram-button" href={instagramUrl} target="_blank" rel="noreferrer">Instagram&apos;da Takip Et <Arrow /></a>
        </div>
        <div className="instagram-grid">
          <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Oceanman Instagram profilini aç">
            <Image src="/images/oceanman-style.jpg" alt="Oceanman salonunda saç şekillendirme" fill sizes="(max-width: 720px) 100vw, 34vw" />
          </a>
          <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Oceanman Instagram profilini aç">
            <Image src="/images/oceanman-salon.jpg" alt="Oceanman Yeni Nesil Berber salonu" fill sizes="(max-width: 720px) 100vw, 34vw" />
          </a>
        </div>
      </section>

      <section className="home-cta" id="iletisim">
        <p className="eyebrow">SIRA SENDE</p>
        <h2>Yeni stilin için<br /><em>bir zaman seç.</em></h2>
        <p>Hizmetini, uzmanını ve sana uygun saati birkaç adımda belirle.</p>
        <Link className="gold-button" href="/randevu">Online Randevu Al <Arrow /></Link>
        <div className="cta-details"><span>Şükrüpaşa, Edirne</span><span>Her gün 09:00 — 20:00</span><a href="tel:+905402360066">0 540 236 00 66</a><a href={instagramUrl} target="_blank" rel="noreferrer">@oceanmanedirne ↗</a></div>
      </section>

      <footer className="home-footer">
        <SiteLogo light />
        <p>Görünüşün imzandır. İmzanı Oceanman ile at.</p>
        <div><a href="#hizmetler">Hizmetler</a><a href="#ekip">Ekibimiz</a><Link href="/randevu">Randevu</Link><a href={instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a></div>
        <small>© {new Date().getFullYear()} Oceanman Edirne</small>
      </footer>
    </main>
  );
}
