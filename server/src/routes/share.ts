import { Router } from "express";
import { prisma } from "../prisma";

// Serves a public, browser-openable HTML page for a shared list, so the copied
// link works for anyone (not just inside the app). Mounted at "/s".
export const shareRouter = Router();

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stars(n: number | null): string {
  if (!n) return '<span class="norate">بدون تقييم</span>';
  return '<span class="stars">' + "★".repeat(n) + "☆".repeat(5 - n) + "</span>";
}

shareRouter.get("/:shareId", async (req, res) => {
  const list = await prisma.movieList.findUnique({
    where: { shareId: req.params.shareId },
    include: {
      items: { orderBy: [{ order: "asc" }, { addedAt: "asc" }] },
      user: { select: { id: true, name: true } },
    },
  });

  if (!list || !list.isPublic) {
    return res
      .status(404)
      .send("<!doctype html><meta charset=utf-8><h2 style='font-family:sans-serif'>القائمة غير موجودة أو غير مشتركة</h2>");
  }

  const ratings = await prisma.rating.findMany({
    where: {
      userId: list.user.id,
      OR: list.items.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType })),
    },
    select: { tmdbId: true, mediaType: true, stars: true },
  });
  const starOf = new Map(ratings.map((r) => [`${r.mediaType}:${r.tmdbId}`, r.stars]));

  const rows = list.items
    .map((it, idx) => {
      const poster = it.posterPath
        ? `https://image.tmdb.org/t/p/w185${it.posterPath}`
        : "";
      const s = starOf.get(`${it.mediaType}:${it.tmdbId}`) ?? null;
      const type = it.mediaType === "tv" ? "مسلسل" : "فيلم";
      return `<li class="row">
        <span class="rank">${idx + 1}</span>
        ${poster ? `<img src="${poster}" alt="">` : `<div class="ph">🎬</div>`}
        <div class="info">
          <div class="t">${esc(it.title)}</div>
          <div class="type">${type}</div>
          ${stars(s)}
        </div>
      </li>`;
    })
    .join("");

  res.set("content-type", "text/html; charset=utf-8").send(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(list.title)} — قائمة ${esc(list.user.name)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0b0b12; color:#f5f5fa; font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif; }
  .wrap { max-width:640px; margin:0 auto; padding:24px 16px 60px; }
  h1 { font-size:26px; margin:0 0 4px; }
  .owner { color:#e50914; font-weight:800; }
  .desc { color:#9a9ab0; line-height:1.6; margin:10px 0; }
  .count { color:#9a9ab0; font-size:14px; margin-bottom:16px; }
  ul { list-style:none; padding:0; margin:0; }
  .row { display:flex; flex-direction:row-reverse; align-items:center; gap:12px;
         background:#15151f; border-radius:14px; padding:10px; margin-bottom:12px; }
  .rank { color:#e50914; font-size:22px; font-weight:900; width:32px; text-align:center; }
  .row img, .ph { width:52px; height:78px; border-radius:8px; background:#1d1d2b; object-fit:cover; }
  .ph { display:flex; align-items:center; justify-content:center; font-size:22px; }
  .info { flex:1; }
  .t { font-weight:700; font-size:16px; }
  .type { color:#9a9ab0; font-size:13px; margin:4px 0; }
  .stars { color:#f5c518; font-size:15px; }
  .norate { color:#9a9ab0; font-size:13px; }
  .footer { text-align:center; color:#9a9ab0; font-size:13px; margin-top:24px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="owner">ترتيب ${esc(list.user.name)} 🏆</div>
    <h1>${esc(list.title)}</h1>
    ${list.description ? `<p class="desc">${esc(list.description)}</p>` : ""}
    <div class="count">${list.items.length} عمل — مرتّبة من الأول للأخير</div>
    <ul>${rows || '<p class="desc">القائمة فاضية</p>'}</ul>
    <div class="footer">🎬 شورك عبر تطبيق أفلامي</div>
  </div>
</body>
</html>`);
});
