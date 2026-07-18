# Oceanman Edirne

Oceanman için kurumsal tanıtım sitesi ve Supabase tabanlı online randevu MVP'si.

## Sayfalar

- `/` — ana sayfa, hizmetler, hikâye ve ekip
- `/randevu` — beş adımlı rezervasyon akışı
- `/api/appointments` — güvenli randevu oluşturma API'si

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
3. Supabase CLI ile projeyi bağlayıp migration'ı gönderin:

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

## Doğrulama

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Sonraki işler için [yol haritasına](docs/ROADMAP.md) bakın.
