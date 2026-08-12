/* ============ ParcelPal — Interactions ============ */

// ---------- Mobile nav ----------
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

// ---------- Animated stats counters ----------
const stats = document.querySelectorAll(".stat-num");

const animateCount = (el) => {
  const target = Number(el.dataset.count);
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
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

// ---------- Parcel tracking (demo data) ----------
const DEMO_SHIPMENTS = {
  "PP-2481-9635": {
    route: "Riyadh → Jeddah",
    status: "Out for Delivery",
    events: [
      { title: "Order confirmed", meta: "Riyadh sorting hub — Aug 10, 09:14", state: "done" },
      { title: "Picked up from sender", meta: "Riyadh — Aug 10, 13:40", state: "done" },
      { title: "In transit", meta: "Departed Riyadh hub — Aug 11, 06:05", state: "done" },
      { title: "Arrived at local facility", meta: "Jeddah hub — Aug 12, 05:32", state: "done" },
      { title: "Out for delivery", meta: "Courier: Ahmed • ETA today 2–4pm", state: "current" },
      { title: "Delivered", meta: "Pending", state: "" },
    ],
  },
  "PP-1102-4478": {
    route: "Dammam → Riyadh",
    status: "In Transit",
    events: [
      { title: "Order confirmed", meta: "Dammam hub — Aug 11, 15:02", state: "done" },
      { title: "Picked up from sender", meta: "Dammam — Aug 12, 08:15", state: "done" },
      { title: "In transit", meta: "On the way to Riyadh hub", state: "current" },
      { title: "Out for delivery", meta: "Pending", state: "" },
      { title: "Delivered", meta: "Pending", state: "" },
    ],
  },
};

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

  if (!shipment) {
    trackResult.hidden = true;
    trackError.hidden = false;
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

// Hero quick-track: forward to the main tracking section
document.getElementById("heroTrackForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const value = document.getElementById("heroTrackInput").value;
  document.getElementById("trackInput").value = value.trim().toUpperCase();
  document.getElementById("tracking").scrollIntoView({ behavior: "smooth" });
  renderTracking(value);
});

// ---------- Contact form (demo) ----------
const contactForm = document.getElementById("contactForm");
const contactSuccess = document.getElementById("contactSuccess");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  contactForm.reset();
  contactSuccess.hidden = false;
  setTimeout(() => (contactSuccess.hidden = true), 6000);
});
