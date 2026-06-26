# 🎬 أفلامي — Movies App

تطبيق موبايل لاكتشاف **أعلى الأفلام في السينما الآن** و**الرائج على كل المنصات**، مع إمكانية
بناء **قوائمك الخاصة** من أفلام ومسلسلات من منصات مختلفة، **مشاركتها** مع أصدقائك برابط،
و**تقييم** الأعمال بالنجوم وكتابة التعليقات.

> An app to discover the top movies in cinemas and trending across all streaming
> platforms, build and share your own watchlists, and rate/review titles with
> stars and comments. Built with **Expo (React Native)** + an **Express / Prisma**
> backend, powered by the **TMDB** API.

---

## ✨ الميزات (Features)

- 🏠 **الرئيسية** — الأعلى في السينما الآن، الرائج على كل المنصات، مسلسلات شائعة، والأعلى تقييماً (من TMDB).
- 🔍 **بحث** فوري عن أي فيلم أو مسلسل.
- 🎞️ **صفحة العمل** — القصة، الطاقم، التقييم، و**وين تقدر تشوفه** (منصات العرض حسب منطقتك).
- 📁 **قوائمك الخاصة** — اجمع أفلام ومسلسلات من منصات مختلفة في قوائم ترجع لها لاحقاً.
- ↗️ **مشاركة** القوائم برابط عام (deep link) — أي شخص يفتحه يشوف قائمتك بدون حساب.
- ⭐ **تقييم المستخدمين** — قيّم بالنجوم (١–٥) واكتب تعليق، وشوف متوسط تقييمات بقية المستخدمين.
- 👤 **حسابات** — تسجيل دخول/إنشاء حساب (JWT)، وقوائمك وتقييماتك محفوظة على السيرفر.

---

## 🗂️ بنية المشروع (Structure)

```
movies/
├── server/        # Express + Prisma (SQLite) + JWT — API و وسيط TMDB
│   ├── src/
│   │   ├── routes/  auth · tmdb · lists · titles
│   │   ├── lib/tmdb.ts
│   │   └── middleware/auth.ts
│   └── prisma/schema.prisma
└── app/           # Expo (React Native) + expo-router — واجهة التطبيق
    ├── app/         # الشاشات (file-based routing)
    └── src/         # api · context · components · theme
```

---

## 🚀 التشغيل (Getting started)

### 1) الباك-إند (server)

```bash
cd server
cp .env.example .env        # ثم عبّي القيم (راجع تحت)
npm install
npx prisma generate
npx prisma db push          # ينشئ قاعدة بيانات SQLite (dev.db)
npm run dev                 # يشتغل على http://localhost:4000
```

**مفتاح TMDB مطلوب:** سجّل (مجاناً) في <https://www.themoviedb.org> ثم من
`Settings → API` انسخ الـ **API Read Access Token (v4)** وحطّه في `.env`:

```env
TMDB_ACCESS_TOKEN=ضع_التوكن_هنا
TMDB_REGION=SA
TMDB_LANGUAGE=ar-SA
JWT_SECRET=أي_نص_عشوائي_طويل
```

بدون المفتاح يشتغل السيرفر لكن مسارات `/api/tmdb/*` ترجع 503 (تسجيل الدخول والقوائم تشتغل عادي).

### 2) التطبيق (app)

```bash
cd app
cp .env.example .env        # عدّل EXPO_PUBLIC_API_URL حسب جهازك
npm install
npm start                   # امسح QR بتطبيق Expo Go، أو اضغط a/i للمحاكي
```

اضبط `EXPO_PUBLIC_API_URL`:

| البيئة | القيمة |
| --- | --- |
| محاكي iOS / الويب | `http://localhost:4000` |
| محاكي Android | `http://10.0.2.2:4000` |
| جهاز حقيقي | `http://<عنوان-IP-لجهازك>:4000` |

---

## 🔌 واجهة الـ API (API overview)

| Method | Path | الوصف |
| --- | --- | --- |
| POST | `/api/auth/register` · `/login` | إنشاء حساب / تسجيل دخول |
| GET | `/api/auth/me` | بيانات المستخدم الحالي |
| GET | `/api/tmdb/now-playing` | الأفلام في السينما الآن |
| GET | `/api/tmdb/trending` | الرائج على كل المنصات |
| GET | `/api/tmdb/popular/tv` · `/top-rated/movies` | قوائم إضافية |
| GET | `/api/tmdb/search?q=` | بحث |
| GET | `/api/tmdb/:mediaType/:id` | تفاصيل عمل + منصات العرض + الطاقم |
| GET/POST | `/api/lists` | قوائمي / إنشاء قائمة |
| GET/PATCH/DELETE | `/api/lists/:id` | عرض / تعديل / حذف قائمة |
| POST/DELETE | `/api/lists/:id/items[/:itemId]` | إضافة / حذف عنصر |
| GET | `/api/lists/shared/:shareId` | عرض عام لقائمة مشتركة |
| GET | `/api/titles/:mediaType/:tmdbId/summary` | متوسط التقييم + تقييمي |
| PUT | `/api/titles/:mediaType/:tmdbId/rating` | تعيين تقييمي بالنجوم |
| GET/POST | `/api/titles/:mediaType/:tmdbId/comments` | التعليقات |

---

## 🛠️ التقنيات (Tech stack)

- **التطبيق:** Expo SDK 52 · React Native 0.76 · expo-router · TypeScript · واجهة RTL عربية.
- **السيرفر:** Node + Express · Prisma ORM · SQLite (قابل للتبديل لـ Postgres) · JWT · Zod.
- **البيانات:** TMDB API (الأفلام، المسلسلات، الصور، ومنصات العرض).

## 🧭 خطوات قادمة مقترحة (Roadmap)

- نشر السيرفر على استضافة + تبديل القاعدة إلى PostgreSQL.
- إشعارات عند نزول فيلم تتابعه على منصة معيّنة.
- متابعة المستخدمين لبعض ومشاهدة قوائمهم وتقييماتهم.
