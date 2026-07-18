# Oceanman yol haritası

## Aşama 1 — Hazırlanan MVP

- Kurumsal ana sayfa
- Mobil uyumlu beş adımlı randevu akışı
- Hizmet, personel ve çalışma saati veri modeli
- Veritabanı seviyesinde çakışan randevu koruması
- Müşteri verilerini doğrudan okumaya kapatan RLS politikaları
- Supabase bağlantısı yokken çalışan demo modu

## Aşama 2 — Gerçek müsaitlik

- Hizmet ve personelleri Supabase'den okuma
- Seçilen gün için sunucu tarafında uygun saat üretme
- Yönetici girişi ve randevu listesi
- Çalışma saatleri, molalar, izinler ve hizmet süreleri yönetimi
- Güvenli randevu iptal/değişiklik bağlantısı

## Aşama 3 — Google Takvim

- İşletmeye ait Google Cloud projesi
- Personel bazında OAuth yetkilendirmesi
- Randevu kaydından sonra Google etkinliği oluşturma
- Google webhook alıcısı ve kanal yenileme görevi
- Sync token ile periyodik tamamlama/mutabakat
- Personelin elle eklediği etkinlikleri `calendar_blocks` tablosuna işleme

## Aşama 4 — Operasyon

- E-posta/SMS bildirimleri
- CAPTCHA ve hız sınırı
- KVKK metinlerinin hukukçu kontrolü
- Otomatik yedek ve çalışma süresi alarmı
- Search Console temizliği ve eski spam URL'leri kaldırma
- Staging → production yayın akışı
