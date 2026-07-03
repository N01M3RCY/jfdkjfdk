# Kadrajdaki Sır — Proje Genel Bakışı

Gerçek dünya konumlarında oynanan dedektif / soruşturma mobil oyunu.

## Mimari

```
workspace/
├── artifacts/
│   ├── mobile/          # Expo / React Native uygulaması (iOS + Android + Web)
│   └── api-server/      # Express + TypeScript REST API (Node.js)
├── lib/
│   ├── db/              # Drizzle ORM şeması + PostgreSQL bağlantısı
│   ├── api-zod/         # Paylaşılan Zod şemaları (API doğrulama)
│   └── api-client-react/ # Orval ile üretilen React Query hook'ları
└── tsconfig.base.json   # Tüm paketler için temel TypeScript ayarları
```

## Çalıştırma Komutları

| Servis | Komut |
|---|---|
| Mobile (Expo) | `pnpm --filter @workspace/mobile run dev` |
| API Server | `pnpm --filter @workspace/api-server run dev` |
| DB schema push | `cd lib/db && pnpm run push` |
| DB build (declarations) | `cd lib/db && npx tsc -p tsconfig.json` |

## Önemli Bilgiler

### Kimlik Doğrulama
- JWT tabanlı, `SESSION_SECRET` ile imzalanır (30 günlük token)
- Mobil: `AsyncStorage`'da token saklanır, `context/UserContext.tsx`
- API: `src/middlewares/auth.ts` → `requireAuth`, `requireAdmin`
- Admin hesabı: `halilaisnc / halilcan1514!` (seed ile oluşturulur)

### Veritabanı Tabloları
- `cases` — Davalar (`codeTitle`, `maxParticipants` dahil)
- `case_steps` — Dava adımları (photo/riddle/location)
- `user_progress` — Kullanıcı ilerleme durumu
- `submissions` — Kullanıcı cevapları + AI eşleşme skoru
- `users` — Kullanıcı hesapları (bcryptjs hash, isAdmin, xp, badge)
- `daily_steps` — Günlük pedometer verisi

### Önemli Kalıplar
- `lib/db` composite TypeScript project → yeni schema dosyalarında `cd lib/db && npx tsc -p tsconfig.json` çalıştır
- Express `req.params` değerleri `String(req.params.xxx)` ile cast et (TS2769 hatasını önler)
- Expo sensor API için `expo-sensors@~15.0.8` kullan (Expo 53 uyumu)

## Kullanıcı Tercihleri

- Uygulama adı: **Kadrajdaki Sır**
- Dil: Türkçe (UI), İngilizce (kod ve yorumlar)
- Admin kullanıcı: `halilaisnc` / `halilcan1514!`
- Dava `codeTitle` formatı: `KS-NNN: Kısa Başlık`
