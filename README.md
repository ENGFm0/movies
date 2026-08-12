# ParcelPal — Delivery Service Website

A modern, responsive landing page for **ParcelPal**, a parcel delivery service.

## Features

- **Hero section** with a quick-track widget
- **Animated stats** (parcels delivered, on-time rate, cities covered)
- **Services** — same-day delivery, live tracking, secure handling, business solutions
- **How It Works** — 4-step shipping flow
- **Parcel tracking** with an interactive demo timeline
  (try tracking numbers `PP-2481-9635` or `PP-1102-4478`)
- **Pricing** — Standard / Express / Same-Day tiers
- **Testimonials**, **contact form**, and full footer
- Fully responsive with a mobile navigation menu

## Running locally

It's a static site — no build step needed. Open `index.html` directly, or serve it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

```
index.html      # All page markup
css/style.css   # Styles (navy + orange theme, responsive)
js/main.js      # Mobile nav, stat counters, demo tracking, contact form
```
