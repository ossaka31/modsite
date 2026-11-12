# OSAKA mod sitesi

Minecraft 26.1.2 için Fabric modunun sayfası. Giriş Supabase ile yapılır. Sayfa metnini, sırayı, indirme bağlantısını ve görselleri yalnızca yönetici değiştirir.

## Bağlantı

1. [Supabase](https://supabase.com) üzerinde proje aç.
2. `.env.example` dosyasını `.env.local` olarak kopyala. Project URL ve anon public key yaz. Servis rolü anahtarını siteye koyma.
3. SQL Editor'da `supabase/schema.sql` dosyasının tamamını çalıştır.
4. Authentication > URL Configuration içine site adresini ve `http://localhost:3000/auth/callback` yönlendirmesini ekle.
5. `npm run dev` ile siteyi aç. Kayıt ol, e-postayı doğrula, giriş yap.
6. SQL Editor'da kendi adresinle çalıştır:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('senin-epostan@ornek.com');
```

7. Hesabından kimlik doğrulayıcıyı kur. Yönetim ancak bu ikinci adımdayken açılır.

## Güvenlik

Site “kırılamaz” diye sunulmaz. Kilit, tek bir çerçeveye değil şu katmanlara dayanır:

- Oturum çerezi HttpOnly ve üretimde Secure. 14 günde düşer.
- Yönetici rolü kullanıcı isteğiyle yazılamaz. Veritabanı tetikleyicisi rol değişimini kilitler. Rolü SQL Editor verir.
- Yazma politikaları `is_admin()` ile sınırlıdır. Anon anahtar tek başına sayfayı değiştiremez.
- Yönetim, parola yetmez; doğrulayıcı kodu (AAL2) olmadan kayıt yazılmaz.
- Parola en az 12 karakter, harf, rakam ve özel karakter ister.
- Giriş, kayıt ve parola sıfırlama istekleri sınırlıdır.
- Görseller tür baytlarından kontrol edilir. SVG alınmaz. Dosya adı rastgeledir. Üst sınır 4 MB.
- Metin HTML olarak basılmaz. Bağlantılar yalnızca https kabul eder.
- Güvenlik başlıkları: CSP, frame engeli, nosniff, referrer, permissions policy. Üretimde HSTS vardır.
- Server Action istekleri kaynak kontrolünden geçer. Üretimde `NEXT_PUBLIC_SITE_URL` gerçek adresin olmalıdır.

Supabase panelinde ayrıca şunları aç:

- E-posta doğrulaması
- Leaked password protection
- MFA / TOTP
- İstersen Turnstile. Anahtarları hem panelde hem `.env.local` içinde aynı anda doldur.

Yayın adresin hazır olunca `.env.local` içindeki `NEXT_PUBLIC_SITE_URL` değerini o adres yap.
