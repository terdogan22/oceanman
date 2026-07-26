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
  mustChangePassword: boolean;
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
  admin?: { displayName: string; email: string; role: AdminRole; mustChangePassword: boolean };
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
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);
  const [passwordChange, setPasswordChange] = useState({ password: "", confirm: "" });
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
        setMustChangePassword(null);
        setActiveTab("services");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) return;
    loadAdminSession(session);
    // Session bootstrap intentionally runs only when the authenticated session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session || mustChangePassword !== false || role !== "superadmin") return;
    if (activeTab === "users" && users.length === 0) loadUsers(session);
    if (activeTab === "email" && !emailSettings.fromEmail) loadEmailSettings(session);
    // The loaders are stable for the current session and are gated by tab state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, emailSettings.fromEmail, mustChangePassword, role, session, users.length]);

  function authHeaders(currentSession = session): Record<string, string> {
    return currentSession ? { Authorization: `Bearer ${currentSession.access_token}` } : {};
  }

  async function loadAdminSession(currentSession: Session) {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/session", {
      cache: "no-store",
      headers: authHeaders(currentSession),
    });
    const data = (await response.json()) as {
      admin?: { displayName: string; email: string; role: AdminRole; mustChangePassword: boolean };
      error?: string;
    };
    if (!response.ok || !data.admin) {
      setMessage(data.error || "Yönetim hesabı doğrulanamadı.");
      setMustChangePassword(null);
      setLoading(false);
      return;
    }

    setAdminName(data.admin.displayName || data.admin.email || "Yönetici");
    setRole(data.admin.role);
    setMustChangePassword(data.admin.mustChangePassword);
    if (data.admin.mustChangePassword) {
      setLoading(false);
      return;
    }

    await Promise.all([loadServices(currentSession), loadBookingSettings(currentSession)]);
    setLoading(false);
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
    const data = (await response.json()) as { error?: string; message?: string; emailSent?: boolean };
    if (!response.ok) setMessage(data.error || "Kullanıcı oluşturulamadı.");
    else {
      setNewUser({ displayName: "", email: "", password: "" });
      await loadUsers();
      setMessage(data.message || "Kullanıcı oluşturuldu ve giriş bilgileri e-postayla gönderildi.");
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

  async function sendUserInvitation(user: AdminUser) {
    if (!session || user.role === "superadmin") return;
    const actionId = `invite-${user.userId}`;
    setSavingId(actionId);
    setMessage("");
    const response = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.userId }),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setMessage(data.error || "Giriş bilgileri gönderilemedi.");
    } else {
      await loadUsers();
      setMessage(data.message || "Yeni giriş bilgileri e-postayla gönderildi.");
    }
    setSavingId("");
  }

  async function changeFirstPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (passwordChange.password.length < 10) {
      setMessage("Yeni şifre en az 10 karakter olmalıdır.");
      return;
    }
    if (passwordChange.password !== passwordChange.confirm) {
      setMessage("Yeni şifreler birbiriyle aynı değil.");
      return;
    }

    setSavingId("first-password");
    setMessage("");
    const response = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordChange.password }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "Yeni şifre kaydedilemedi.");
      setSavingId("");
      return;
    }

    setPassword("");
    setPasswordChange({ password: "", confirm: "" });
    await supabase?.auth.signOut({ scope: "local" });
    setMessage("Şifreniz değiştirildi. Şimdi yeni şifrenizle giriş yapabilirsiniz.");
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

  async function sendEmailExamples() {
    if (!session) return;
    setSavingId("email-examples");
    setMessage("");
    const response = await fetch("/api/admin/email-settings/examples", {
      method: "POST",
      headers: authHeaders(),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    setMessage(response.ok ? data.message || "Örnek e-postalar gönderildi." : data.error || "Örnek e-postalar gönderilemedi.");
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
            {message && <p className={`admin-message ${message.includes("değiştirildi") ? "" : "admin-error"}`} role="alert">{message}</p>}
            <button className="admin-primary" disabled={loading} type="submit">{loading ? "Giriş yapılıyor…" : "Giriş yap"}</button>
          </form>
        </section>
      </main>
    );
  }

  if (mustChangePassword === null) {
    return <main className="admin-shell"><p className="admin-loading">{message || "Hesabınız doğrulanıyor…"}</p></main>;
  }

  if (mustChangePassword) {
    return (
      <main className="admin-shell">
        <section className="admin-login-card admin-password-card">
          <SiteLogo />
          <div>
            <p className="eyebrow">İLK GİRİŞ GÜVENLİĞİ</p>
            <h1>Yeni şifrenizi belirleyin</h1>
            <p>{adminName || session.user.email}, yönetim paneline devam etmek için geçici şifrenizi değiştirmeniz gerekiyor.</p>
          </div>
          <form className="admin-login-form" onSubmit={changeFirstPassword}>
            <label><span>Yeni şifre</span><input required minLength={10} type="password" autoComplete="new-password" value={passwordChange.password} onChange={(event) => setPasswordChange({ ...passwordChange, password: event.target.value })} /></label>
            <label><span>Yeni şifre tekrar</span><input required minLength={10} type="password" autoComplete="new-password" value={passwordChange.confirm} onChange={(event) => setPasswordChange({ ...passwordChange, confirm: event.target.value })} /></label>
            <p className="admin-password-hint">En az 10 karakter kullanın. Harf, sayı ve özel karakterleri birlikte kullanmanızı öneririz.</p>
            {message && <p className="admin-message admin-error" role="alert">{message}</p>}
            <button className="admin-primary" disabled={savingId === "first-password"} type="submit">{savingId === "first-password" ? "Şifre kaydediliyor…" : "Şifremi değiştir ve devam et"}</button>
            <button className="admin-secondary" type="button" onClick={signOut}>Başka hesapla giriş yap</button>
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
                  <div className="admin-user-role">
                    <strong>{user.email}</strong>
                    <span>{user.role === "superadmin" ? "Superadmin" : user.mustChangePassword ? "İlk giriş bekleniyor" : "Yetkili"}</span>
                  </div>
                  <div className="admin-fields">
                    <label><span>Ad soyad</span><input disabled={user.role === "superadmin"} value={user.displayName} onChange={(event) => changeUser(user.userId, "displayName", event.target.value)} /></label>
                    <label><span>Yeni şifre (isteğe bağlı)</span><input disabled={user.role === "superadmin"} minLength={8} type="password" value={user.newPassword ?? ""} onChange={(event) => changeUser(user.userId, "newPassword", event.target.value)} /></label>
                    <label className="admin-active admin-user-active"><input disabled={user.role === "superadmin"} type="checkbox" checked={user.active} onChange={(event) => changeUser(user.userId, "active", event.target.checked)} /> Hesap aktif</label>
                  </div>
                  {user.role !== "superadmin" && (
                    <div className="admin-save-row admin-user-actions">
                      <span>{savedId === user.userId ? "Kaydedildi ✓" : ""}</span>
                      <div>
                        <button className="admin-secondary" disabled={Boolean(savingId)} type="button" onClick={() => sendUserInvitation(user)}>
                          {savingId === `invite-${user.userId}` ? "Gönderiliyor…" : "Giriş bilgilerini gönder"}
                        </button>
                        <button className="admin-primary" disabled={Boolean(savingId)} type="button" onClick={() => saveUser(user)}>
                          {savingId === user.userId ? "Kaydediliyor…" : "Kullanıcıyı kaydet"}
                        </button>
                      </div>
                    </div>
                  )}
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
                <button className="admin-secondary" disabled={Boolean(savingId)} type="button" onClick={sendEmailExamples}>{savingId === "email-examples" ? "Gönderiliyor…" : "4 örnek e-posta gönder"}</button>
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
