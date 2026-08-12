/* ============ شُرعة إكسبريس — التفاعلات ============ */

// ---------- قائمة الجوال ----------
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

navToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

mainNav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    mainNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

// ---------- عدادات الإحصائيات ----------
const stats = document.querySelectorAll(".stat-num");

const animateCount = (el) => {
  const target = Number(el.dataset.count);
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString("ar-SA");
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const statsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statsObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

stats.forEach((el) => statsObserver.observe(el));

// ---------- تتبع الشحنات (بيانات تجريبية) ----------
const DEMO_SHIPMENTS = {
  SE123456789: {
    route: "الرياض ← جدة",
    status: "قيد التوصيل",
    events: [
      { title: "تم تأكيد الطلب", meta: "مركز فرز الرياض — 10 أغسطس، 9:14 ص", state: "done" },
      { title: "تم استلام الشحنة من المرسل", meta: "الرياض — 10 أغسطس، 1:40 م", state: "done" },
      { title: "الشحنة في الطريق", meta: "غادرت مركز الرياض — 11 أغسطس، 6:05 ص", state: "done" },
      { title: "وصلت إلى مركز التوزيع", meta: "مركز جدة — 12 أغسطس، 5:32 ص", state: "done" },
      { title: "خرجت للتوصيل", meta: "المندوب: أحمد • الوصول المتوقع اليوم 2–4 م", state: "current" },
      { title: "تم التسليم", meta: "قيد الانتظار", state: "" },
    ],
  },
  SE987654321: {
    route: "الدمام ← الرياض",
    status: "في الطريق",
    events: [
      { title: "تم تأكيد الطلب", meta: "مركز الدمام — 11 أغسطس، 3:02 م", state: "done" },
      { title: "تم استلام الشحنة من المرسل", meta: "الدمام — 12 أغسطس، 8:15 ص", state: "done" },
      { title: "الشحنة في الطريق", meta: "متجهة إلى مركز الرياض", state: "current" },
      { title: "خرجت للتوصيل", meta: "قيد الانتظار", state: "" },
      { title: "تم التسليم", meta: "قيد الانتظار", state: "" },
    ],
  },
};

const trackEmpty = document.getElementById("trackEmpty");
const trackResult = document.getElementById("trackResult");
const trackError = document.getElementById("trackError");
const trackNumber = document.getElementById("trackNumber");
const trackRoute = document.getElementById("trackRoute");
const trackStatus = document.getElementById("trackStatus");
const trackTimeline = document.getElementById("trackTimeline");

function renderTracking(rawInput) {
  const code = rawInput.trim().toUpperCase();
  if (!code) return;

  const shipment = DEMO_SHIPMENTS[code];
  trackEmpty.hidden = true;

  if (!shipment) {
    trackResult.hidden = true;
    trackError.hidden = false;
    trackError.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  trackError.hidden = true;
  trackNumber.textContent = code;
  trackRoute.textContent = shipment.route;
  trackStatus.textContent = shipment.status;

  trackTimeline.innerHTML = "";
  shipment.events.forEach((ev) => {
    const li = document.createElement("li");
    if (ev.state) li.classList.add(ev.state);

    const title = document.createElement("span");
    title.className = "tl-title";
    title.textContent = ev.title;

    const meta = document.createElement("span");
    meta.className = "tl-meta";
    meta.textContent = ev.meta;

    li.append(title, meta);
    trackTimeline.appendChild(li);
  });

  trackResult.hidden = false;
  trackResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.getElementById("trackForm").addEventListener("submit", (e) => {
  e.preventDefault();
  renderTracking(document.getElementById("trackInput").value);
});

// ---------- نموذج التواصل (تجريبي) ----------
const contactForm = document.getElementById("contactForm");
const contactSuccess = document.getElementById("contactSuccess");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  contactForm.reset();
  contactSuccess.hidden = false;
  setTimeout(() => (contactSuccess.hidden = true), 6000);
});
