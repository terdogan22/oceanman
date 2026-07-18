# Oceanman Edirne

Oceanman için kurumsal tanıtım sitesi ve Supabase tabanlı online randevu MVP'si.

## Sayfalar

- `/` — ana sayfa, hizmetler, hikâye ve ekip
- `/randevu` — beş adımlı rezervasyon akışı
- `/api/appointments` — güvenli randevu oluşturma API'si
- `/api/availability` — randevu ve Google Takvim bloklarını dikkate alan müsaitlik API'si
- `/randevu/iptal` — gizli bağlantıyla müşteri randevu iptali

Supabase bilgileri yokken API demo yanıtı üretir; böylece arayüz kurulmadan da incelenebilir.

## Yerel kurulum

Node.js 22 veya daha yenisi gerekir.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Windows PowerShell için:

```powershell
Copy-Item .env.example .env.local
pnpm dev
```

Uygulama `http://localhost:3000` adresinde açılır.

## Supabase bağlantısı

Proje referansı: `ieecxnccneypjmtmwgrj`

1. Supabase Dashboard > **Connect** bölümünden publishable key'i alın.
2. `.env.local` içindeki `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerini doldurun.
3. Sunucu tarafındaki Google senkronizasyonu için service role anahtarını yalnızca Vercel ortam değişkenine ekleyin.
4. Supabase CLI ile projeyi bağlayıp migration'ları gönderin:

```bash
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref ieecxnccneypjmtmwgrj
pnpm dlx supabase@latest db push
```

Şema değişikliklerini Dashboard'da elle yapmak yerine yeni migration dosyalarıyla uygulayın.

## Güvenlik notları

- `.env.local` Git'e girmez.
- Service role key bu MVP'de kullanılmaz ve tarayıcıya kesinlikle verilmemelidir.
- Anon kullanıcılar müşteri/randevu tablosunu okuyamaz.
- Randevu yalnızca kontrollü `create_public_appointment` fonksiyonundan oluşturulur.
- Aynı personele çakışan iki aktif randevu PostgreSQL exclusion constraint ile engellenir.
- Google refresh token'ları normal tabloda tutulmamalıdır; secret manager veya Supabase Vault kullanılmalıdır.

## Google Takvim bağlantısı

Bu sürüm personel takvimlerini bir Google hizmet hesabıyla çift yönlü eşitler. Google Cloud'da Calendar API'yi etkinleştirin ve bir hizmet hesabı oluşturun. Her personel kendi Google Takvimini hizmet hesabının e-posta adresiyle **Etkinliklerde değişiklik yapabilir** yetkisiyle paylaşır.

Vercel ortam değişkenlerine `.env.example` içindeki Google, service role ve güvenlik anahtarlarını ekledikten sonra personel takvimini bağlayın:

```bash
curl -X POST https://oceanman.vercel.app/api/google-calendar/connect \
  -H "Authorization: Bearer CALENDAR_ADMIN_SECRET_DEGERI" \
  -H "Content-Type: application/json" \
  -d '{"staffId":"20000000-0000-4000-8000-000000000001","calendarId":"personel@gmail.com"}'
```

Personel kimlikleri:

- Erdem Kaçan: `20000000-0000-4000-8000-000000000001`
- Emrah Ak: `20000000-0000-4000-8000-000000000002`
- Yunus Taş: `20000000-0000-4000-8000-000000000003`

Bağlantı isteği ilk senkronizasyonu yapar ve Google webhook kanalını açar. Vercel günlük cron görevi kaçmış olabilecek bildirimleri tamamlar ve Google'a yazılamamış randevuları yeniden dener.

## Doğrulama

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Sonraki işler için [yol haritasına](docs/ROADMAP.md) bakın.
