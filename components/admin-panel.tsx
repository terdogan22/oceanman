"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { SiteLogo } from "@/components/site-logo";

type AdminRole = "superadmin" | "manager";
type AdminTab = "services" | "users" | "email";

type AdminService = {
  id: string;
  category: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
  sortOrder: number;
};

type AdminUser = {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  newPassword?: string;
};

type EmailSettings = {
  provider: "smtp";
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "starttls" | "tls" | "none";
  smtpUsername: string;
  smtpPasswordConfigured: boolean;
  smtpPassword: string;
};

type ServicesResponse = {
  services?: AdminService[];
  admin?: { displayName: string; email: string; role: AdminRole };
  error?: string;
};

type BookingSettings = {
  bookingEnabled: boolean;
  phoneDisplay: string;
  phoneHref: string;
};

const emptyEmailSettings: EmailSettings = {
  provider: "smtp",
  fromName: "Oceanman Edirne",
  fromEmail: "",
  smtpHost: "",
  smtpPort: 587,
  smtpSecurity: "starttls",
  smtpUsername: "",
  smtpPasswordConfigured: false,
  smtpPassword: "",
};

export function AdminPanel() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [services, setServices] = useState<AdminService[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(emptyEmailSettings);
  const [adminName, setAdminName] = useState("");
  const [role, setRole] = useState<AdminRole>("manager");
  const [activeTab, setActiveTab] = useState<AdminTab>("services");
  const [loading, setLoading] = useState(Boolean(supabase));
  const [savingId, setSavingId] = useState("");
  const [savedId, setSavedId] = useState("");
  const [message, setMessage] = useState(supabase ? "" : "Supabase bağlantısı yapılandırılmamış.");
  const [newUser, setNewUser] = useState({ displayName: "", email: "", password: "" });
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({
    bookingEnabled: true,
    phoneDisplay: "0 540 236 00 66",
    phoneHref: "+905402360066",
  });
  const [bookingSettingsLoaded, setBookingSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setServices([]);
        setUsers([]);
        setAdminName("");
        setActiveTab("services");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) return;
    loadServices(session);
    loadBookingSettings(session);
    // loadServices intentionally runs only when the authenticated session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session || role !== "superadmin") return;
    if (activeTab === "users" && users.length === 0) loadUsers(session);
    if (activeTab === "email" && !emailSettings.fromEmail) loadEmailSettings(session);
    // The loaders are stable for the current session and are gated by tab state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, emailSettings.fromEmail, role, session, users.length]);

  function authHeaders(currentSession = session): Record<string, string> {
    return currentSession ? { Authorization: `Bearer ${currentSession.access_token}` } : {};
  }

  async function loadServices(currentSession: Session) {
    setLoading(true);
    const response = await fetch("/api/admin/services", { headers: authHeaders(currentSession) });
    const data = (await response.json()) as ServicesResponse;
    if (!response.ok) setMessage(data.error || "Hizmetler alınamadı.");
    else {
      setServices(data.services ?? []);
      setAdminName(data.admin?.displayName ?? data.admin?.email ?? "Yönetici");
      setRole(data.admin?.role ?? "manager");
      setMessage("");
    }
    setLoading(false);
  }

  async function loadBookingSettings(currentSession = session) {
    if (!currentSession) return;
    const response = await fetch("/api/admin/booking-settings", {
      cache: "no-store",
      headers: authHeaders(currentSession),
    });
    const data = (await response.json()) as { settings?: BookingSettings; error?: string };
    if (!response.ok) setMessage(data.error || "Randevu ayarı alınamadı.");
    else if (data.settings) {
      setBookingSettings(data.settings);
      setBookingSettingsLoaded(true);
    }
  }

  async function loadUsers(currentSession = session) {
    if (!currentSession) return;
    setLoading(true);
    const response = await fetch("/api/admin/users", { headers: authHeaders(currentSession) });
    const data = (await response.json()) as { users?: AdminUser[]; error?: string };
    if (!response.ok) setMessage(data.error || "Kullanıcılar alınamadı.");
    else {
      setUsers(data.users ?? []);
      setMessage("");
    }
    setLoading(false);
  }

  async function loadEmailSettings(currentSession = session) {
    if (!currentSession) return;
    setLoading(true);
    const response = await fetch("/api/admin/email-settings", { headers: authHeaders(currentSession) });
    const data = (await response.json()) as { settings?: Omit<EmailSettings, "smtpPassword">; error?: string };
    if (!response.ok) setMessage(data.error || "E-posta ayarları alınamadı.");
    else if (data.settings) setEmailSettings({ ...data.settings, smtpPassword: "" });
    setLoading(false);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMessage("E-posta veya şifre hatalı.");
    setLoading(false);
  }

  async function signOut() {
    await supabase?.auth.signOut({ scope: "local" });
    setMessage("");
  }

  function changeService<K extends keyof AdminService>(id: string, field: K, value: AdminService[K]) {
    setSavedId("");
    setServices((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function saveService(service: AdminService) {
    if (!session) return;
    setSavingId(service.id);
    setSavedId("");
    setMessage("");
    const response = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(service),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) setMessage(data.error || "Hizmet kaydedilemedi.");
    else setSavedId(service.id);
    setSavingId("");
  }

  async function toggleBooking() {
    if (!session || !bookingSettingsLoaded) return;
    const nextEnabled = !bookingSettings.bookingEnabled;
    setSavingId("booking-settings");
    setMessage("");
    const response = await fetch("/api/admin/booking-settings", {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ bookingEnabled: nextEnabled }),
    });
    const data = (await response.json()) as { settings?: BookingSettings; error?: string };
    if (!response.ok || !data.settings) {
      setMessage(data.error || "Randevu durumu kaydedilemedi.");
    } else {
      setBookingSettings(data.settings);
      setMessage(nextEnabled ? "Online randevu hizmeti açıldı." : "Online randevu hizmeti kapatıldı.");
    }
    setSavingId("");
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSavingId("new-user");
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) setMessage(data.error || "Kullanıcı oluşturulamadı.");
    else {
      setNewUser({ displayName: "", email: "", password: "" });
      await loadUsers();
      setMessage("Kullanıcı oluşturuldu.");
    }
    setSavingId("");
  }

  function changeUser<K extends keyof AdminUser>(id: string, field: K, value: AdminUser[K]) {
    setUsers((current) => current.map((user) => user.userId === id ? { ...user, [field]: value } : user));
  }

  async function saveUser(user: AdminUser) {
    if (!session || user.role === "superadmin") return;
    setSavingId(user.userId);
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) setMessage(data.error || "Kullanıcı kaydedilemedi.");
    else {
      changeUser(user.userId, "newPassword", "");
      setSavedId(user.userId);
    }
    setSavingId("");
  }

  async function saveEmailSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSavingId("email");
    setMessage("");
    const response = await fetch("/api/admin/email-settings", {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(emailSettings),
    });
    const data = (await response.json()) as { error?: string; smtpPasswordConfigured?: boolean };
    if (!response.ok) setMessage(data.error || "SMTP ayarları kaydedilemedi.");
    else {
      setEmailSettings((current) => ({
        ...current,
        smtpPassword: "",
        smtpPasswordConfigured: data.smtpPasswordConfigured ?? current.smtpPasswordConfigured,
      }));
      setMessage("SMTP ayarları kaydedildi.");
    }
    setSavingId("");
  }

  async function testEmailSettings() {
    if (!session) return;
    setSavingId("email-test");
    setMessage("");
    const response = await fetch("/api/admin/email-settings/test", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(emailSettings),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    setMessage(response.ok ? data.message || "Test e-postası gönderildi." : data.error || "Test e-postası gönderilemedi.");
    setSavingId("");
  }

  if (loading && !session) {
    return <main className="admin-shell"><p className="admin-loading">Yönetim paneli hazırlanıyor…</p></main>;
  }

  if (!session) {
    return (
      <main className="admin-shell">
        <section className="admin-login-card">
          <SiteLogo />
          <div>
            <p className="eyebrow">OCEANMAN YÖNETİM</p>
            <h1>Yetkili girişi</h1>
            <p>Yönetim hesabınızın e-posta adresi ve şifresiyle giriş yapın.</p>
          </div>
          <form className="admin-login-form" onSubmit={signIn}>
            <label><span>E-posta</span><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label><span>Şifre</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {message && <p className="admin-message admin-error" role="alert">{message}</p>}
            <button className="admin-primary" disabled={loading} type="submit">{loading ? "Giriş yapılıyor…" : "Giriş yap"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <SiteLogo />
        <div><span>{adminName || session.user.email} · {role === "superadmin" ? "Superadmin" : "Yetkili"}</span><button type="button" onClick={signOut}>Çıkış yap</button></div>
      </header>

      <section className="admin-content">
        <section className={`admin-booking-switch ${bookingSettings.bookingEnabled ? "is-open" : "is-closed"}`}>
          <div>
            <p className="eyebrow">RANDEVU HİZMETİ</p>
            <div className="admin-booking-heading">
              <h2>Online randevu</h2>
              <span>{bookingSettings.bookingEnabled ? "Açık" : "Kapalı"}</span>
            </div>
            <p>
              {bookingSettings.bookingEnabled
                ? "Müşteriler internetten randevu oluşturabilir."
                : `Müşteriler ${bookingSettings.phoneDisplay} numarasına yönlendiriliyor.`}
            </p>
          </div>
          <button
            type="button"
            disabled={!bookingSettingsLoaded || savingId === "booking-settings"}
            onClick={toggleBooking}
          >
            {savingId === "booking-settings"
              ? "Kaydediliyor…"
              : bookingSettings.bookingEnabled ? "Randevuyu kapat" : "Randevuyu aç"}
          </button>
        </section>

        <nav className="admin-tabs" aria-label="Yönetim bölümleri">
          <button className={activeTab === "services" ? "active" : ""} type="button" onClick={() => setActiveTab("services")}>Fiyatlar</button>
          {role === "superadmin" && <button className={activeTab === "users" ? "active" : ""} type="button" onClick={() => setActiveTab("users")}>Kullanıcılar</button>}
          {role === "superadmin" && <button className={activeTab === "email" ? "active" : ""} type="button" onClick={() => setActiveTab("email")}>E-posta sistemi</button>}
        </nav>

        {message && <p className={`admin-message ${message.includes("alınamadı") || message.includes("edilemedi") || message.includes("geçersiz") ? "admin-error" : ""}`} role="status">{message}</p>}
        {loading && <p className="admin-message">Bilgiler yükleniyor…</p>}

        {activeTab === "services" && (
          <>
            <div className="admin-title">
              <div><p className="eyebrow">HİZMET YÖNETİMİ</p><h1>Fiyatlar ve hizmetler</h1></div>
              <p>Buradaki değişiklikler randevu ekranına doğrudan yansır.</p>
            </div>
            <div className="admin-service-list">
              {services.map((service) => (
                <article className="admin-service-card" key={service.id}>
                  <div className="admin-service-heading">
                    <span>{service.category}</span>
                    <label className="admin-active"><input type="checkbox" checked={service.active} onChange={(event) => changeService(service.id, "active", event.target.checked)} /> Yayında</label>
                  </div>
                  <div className="admin-fields">
                    <label className="admin-wide"><span>Hizmet adı</span><input value={service.name} onChange={(event) => changeService(service.id, "name", event.target.value)} /></label>
                    <label className="admin-wide"><span>Açıklama</span><input value={service.description} onChange={(event) => changeService(service.id, "description", event.target.value)} /></label>
                    <label><span>Fiyat (₺)</span><input min="0" step="1" type="number" value={service.price} onChange={(event) => changeService(service.id, "price", Number(event.target.value))} /></label>
                    <label><span>Süre (dk)</span><input min="5" max="480" step="5" type="number" value={service.duration} onChange={(event) => changeService(service.id, "duration", Number(event.target.value))} /></label>
                    <label><span>Sıralama</span><input min="0" step="1" type="number" value={service.sortOrder} onChange={(event) => changeService(service.id, "sortOrder", Number(event.target.value))} /></label>
                  </div>
                  <div className="admin-save-row">
                    {savedId === service.id && <span>Kaydedildi ✓</span>}
                    <button className="admin-primary" disabled={savingId === service.id} type="button" onClick={() => saveService(service)}>
                      {savingId === service.id ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {activeTab === "users" && role === "superadmin" && (
          <>
            <div className="admin-title">
              <div><p className="eyebrow">SUPERADMIN</p><h1>Kullanıcılar</h1></div>
              <p>Yetkili kullanıcılar fiyat ve hizmet bilgilerini düzenleyebilir.</p>
            </div>
            <form className="admin-create-user" onSubmit={createUser}>
              <h2>Yeni kullanıcı ekle</h2>
              <div className="admin-fields">
                <label><span>Ad soyad</span><input required value={newUser.displayName} onChange={(event) => setNewUser({ ...newUser, displayName: event.target.value })} /></label>
                <label><span>E-posta</span><input required type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
                <label><span>Geçici şifre</span><input required minLength={8} type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
              </div>
              <button className="admin-primary" disabled={savingId === "new-user"} type="submit">Kullanıcı oluştur</button>
            </form>
            <div className="admin-user-list">
              {users.map((user) => (
                <article className="admin-user-card" key={user.userId}>
                  <div className="admin-user-role"><strong>{user.email}</strong><span>{user.role === "superadmin" ? "Superadmin" : "Yetkili"}</span></div>
                  <div className="admin-fields">
                    <label><span>Ad soyad</span><input disabled={user.role === "superadmin"} value={user.displayName} onChange={(event) => changeUser(user.userId, "displayName", event.target.value)} /></label>
                    <label><span>Yeni şifre (isteğe bağlı)</span><input disabled={user.role === "superadmin"} minLength={8} type="password" value={user.newPassword ?? ""} onChange={(event) => changeUser(user.userId, "newPassword", event.target.value)} /></label>
                    <label className="admin-active admin-user-active"><input disabled={user.role === "superadmin"} type="checkbox" checked={user.active} onChange={(event) => changeUser(user.userId, "active", event.target.checked)} /> Hesap aktif</label>
                  </div>
                  {user.role !== "superadmin" && <div className="admin-save-row"><span>{savedId === user.userId ? "Kaydedildi ✓" : ""}</span><button className="admin-primary" disabled={savingId === user.userId} type="button" onClick={() => saveUser(user)}>Kullanıcıyı kaydet</button></div>}
                </article>
              ))}
            </div>
          </>
        )}

        {activeTab === "email" && role === "superadmin" && (
          <>
            <div className="admin-title">
              <div><p className="eyebrow">SUPERADMIN</p><h1>E-posta sistemi</h1></div>
              <p>Randevu ve iptal e-postaları bu SMTP hesabıyla gönderilir. SMTP şifresi güvenli biçimde şifrelenir.</p>
            </div>
            <form className="admin-email-card" onSubmit={saveEmailSettings}>
              <div className="admin-smtp-grid">
                <label><span>Gönderim yöntemi</span><select disabled value={emailSettings.provider}><option value="smtp">SMTP</option></select></label>
                <label><span>Gönderen e-posta</span><input required type="email" value={emailSettings.fromEmail} onChange={(event) => setEmailSettings({ ...emailSettings, fromEmail: event.target.value })} /></label>
                <label><span>Gönderen adı</span><input required value={emailSettings.fromName} onChange={(event) => setEmailSettings({ ...emailSettings, fromName: event.target.value })} /></label>
                <label className="admin-smtp-host"><span>SMTP sunucu</span><input required value={emailSettings.smtpHost} onChange={(event) => setEmailSettings({ ...emailSettings, smtpHost: event.target.value })} placeholder="smtp.ornek.com" /></label>
                <label><span>Port</span><input required min="1" max="65535" type="number" value={emailSettings.smtpPort} onChange={(event) => setEmailSettings({ ...emailSettings, smtpPort: Number(event.target.value) })} /></label>
                <label><span>Güvenlik</span><select value={emailSettings.smtpSecurity} onChange={(event) => setEmailSettings({ ...emailSettings, smtpSecurity: event.target.value as EmailSettings["smtpSecurity"] })}><option value="starttls">TLS / STARTTLS</option><option value="tls">SSL / TLS</option><option value="none">Yok</option></select></label>
                <label className="admin-smtp-half"><span>SMTP kullanıcı adı</span><input required autoComplete="username" value={emailSettings.smtpUsername} onChange={(event) => setEmailSettings({ ...emailSettings, smtpUsername: event.target.value })} /></label>
                <label className="admin-smtp-half"><span>SMTP şifresi</span><input type="password" autoComplete="new-password" placeholder={emailSettings.smtpPasswordConfigured ? "Mevcut şifre korunur" : "SMTP şifresini girin"} value={emailSettings.smtpPassword} onChange={(event) => setEmailSettings({ ...emailSettings, smtpPassword: event.target.value })} /></label>
              </div>
              <p className="admin-email-hint">Spam riskini azaltmak için e-postalar yalnızca işletmenin alan adına ait SMTP hesabıyla gönderilmelidir.</p>
              <div className="admin-email-actions">
                <button className="admin-secondary" disabled={savingId === "email-test" || savingId === "email"} type="button" onClick={testEmailSettings}>{savingId === "email-test" ? "Gönderiliyor…" : "Test e-postası"}</button>
                <button className="admin-primary" disabled={savingId === "email" || savingId === "email-test"} type="submit">{savingId === "email" ? "Kaydediliyor…" : "Ayarları kaydet"}</button>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
