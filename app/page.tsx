"use client";

/**
 * NEXT x RDEP: Smart receipt, "The Edit"
 *
 * Image-led fashion editorial concept with the full NEXT receipt journey, campaign imagery, loyalty and utility sections.
 *
 * Thinking behind it
 *  - NEXT is black and white, so richness comes from contrast, rhythm and craft instead of colour:
 *    black and white bands alternate down the page, everything is sharp-cornered and ruled with hairlines
 *    (architectural, like a printed lookbook), labels are wide-tracked caps like the NEXT wordmark,
 *    and the big numbers are set large and light.
 *  - Receipt details as craft: the total sits on a black ticket stub with punched notches and a barcode,
 *    coupons are tickets with barcodes or "scratch" tiles, the sizes sit in outlined boxes like garment labels,
 *    the closing block has a slow outlined "THANK YOU" marquee.
 *  - The ONLY colour on the page is the metallic tier foil (Silver, Gold, Platinum) on the Club card and the
 *    small tier chip in the header, so the loyalty card is the one thing that glows.
 *  - Press feedback is monochrome too: outlined buttons invert to solid black while pressed.
 *  - One fixed type scale (12 / 14 / 16 / 20 / 44). Invoice number and date appear once, in the closing block.
 *
 * Flow: header (name + QR) > purchase summary overlapping the header > History / Email / Download >
 *       black band with coupons + Club card > rating > video (full-bleed) > profile > exchange >
 *       reach us + store finder > store details > closing block > powered by.
 *
 * Rating works exactly like the Mango receipt (flashing stars until the first tap, 4 category ratings,
 * comment, send, thank-you state). Coupons are swipeable tickets with a barcode.
 * Purchase summary is a ruled ledger (numbered lines, Qty / Net columns) so it reads differently from Mango's.
 *
 * Phone first: designed at 400px wide. On phones (<= 520px) it is scaled with CSS `zoom` to fill the screen,
 * on larger screens it stays a centred 400px column. Hover styles only on devices that can hover.
 *
 * FONT: drop the NEXT font files into /public/fonts as "NextSans-Regular.ttf" (400) and "NextSans-Bold.ttf" (700).
 *       Until they exist the page falls back to Jost (a geometric sans, loaded through next/font/google).
 * ASSETS: /public/customers/next-logo.png (black logo on transparent, used inverted on dark), /public/images/design-mode/RDEP-logo.png
 *         Both fall back to text if the image is missing. Override with `logoSrc` / `rdepLogoSrc`.
 *
 * Usage:  app/next-receipt/page.tsx
 *   import NextReceipt from "@/components/NextReceipt";
 *   export default function Page() { return <NextReceipt />; }
 *
 * With real data: <NextReceipt receipts={[...]} data={currentReceipt} />
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import { Jost } from "next/font/google";

const fallbackFont = Jost({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--font-nx-fallback" });

const BRAND_STACK = `"NextSans", var(--font-nx-fallback), Arial, "Helvetica Neue", Helvetica, sans-serif`;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const FONT_FACES = `
@font-face{font-family:"NextSans";font-weight:400;font-style:normal;font-display:swap;src:url("/fonts/NextSans-Regular.ttf") format("truetype")}
@font-face{font-family:"NextSans";font-weight:700;font-style:normal;font-display:swap;src:url("/fonts/NextSans-Bold.ttf") format("truetype")}
.nx-root{font-family:${BRAND_STACK}}
.nx-bold{font-family:${BRAND_STACK};font-weight:700}

/* Phone press feedback: every button and link dips slightly while touched */
.nx-root a,.nx-root button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.nx-root a,.nx-root button:not(:disabled){transition:transform .12s ease,background-color .18s ease,color .18s ease,border-color .18s ease,opacity .18s ease}
.nx-root a:active,.nx-root button:not(:disabled):active{transform:scale(.98)}

/* Film grain on the black blocks */
.nx-grain{position:relative}
.nx-grain::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:${GRAIN};opacity:.1;mix-blend-mode:overlay}

/* Header entrance */
@keyframes nx-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.nx-rise{opacity:0;animation:nx-rise .7s cubic-bezier(.2,.7,.2,1) forwards}

/* Rating stars flash in a wave until the first tap */
@keyframes nx-star-flash{0%,100%{fill:transparent;transform:scale(1)}45%{fill:#0A0A0A;transform:scale(1.18)}}
.nx-star-flash{animation:nx-star-flash 1.6s ease-in-out infinite}

/* Light sweep across the Club card */
@keyframes nx-sheen{0%,55%{left:-60%}100%{left:130%}}
.nx-sheen{position:relative;overflow:hidden}
.nx-sheen::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);animation:nx-sheen 5s ease-in-out infinite}

/* Floating dock slides up */
@keyframes nx-dock{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.nx-dock{animation:nx-dock .35s cubic-bezier(.2,.7,.2,1) both}

/* Closing marquee */
@keyframes nx-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nx-marquee{animation:nx-marquee 28s linear infinite}

@media (prefers-reduced-motion:reduce){
  .nx-rise{opacity:1;animation:none}
  .nx-star-flash,.nx-dock,.nx-marquee{animation:none}
  .nx-sheen::after{animation:none;display:none}
  .nx-root a,.nx-root button:not(:disabled){transition:none}
  .nx-root a:active,.nx-root button:not(:disabled):active{transform:none}
}
`;

/* Greys only. */
const theme = {
  "--nx-black": "#0A0A0A",
  "--nx-ink2": "#181818",
  "--nx-gray": "#5C5C5C",
  "--nx-mid": "#8C8C8C",
  "--nx-silver": "#D4D4D4",
  "--nx-soft": "#E9E9E9",
  "--nx-wash": "#F4F4F4",
  "--nx-line": "rgba(10,10,10,0.16)",
} as CSSProperties;

/* Type scale. Everything on the page uses one of these. */
const T_CAPS = "text-[12px] uppercase tracking-[0.14em] leading-snug";
const T_TITLE = "nx-bold text-[20px] uppercase leading-[1.1] tracking-[0.08em]";
const T_BODY = "text-[14px] leading-snug";
const T_SMALL = "text-[12px] leading-snug";
const T_LABEL = "nx-bold text-[14px] leading-snug";
const T_AMOUNT = "nx-bold text-[16px] leading-snug tabular-nums";
const T_BIG = "text-[44px] leading-none tabular-nums tracking-[-0.01em]";

/* Assets + links (override with props) */
const DEFAULT_NEXT_LOGO = "/images/design-mode/next-logo.png";
const DEFAULT_RDEP_LOGO = "/images/design-mode/RDEP-logo.png";
const DEFAULT_INSTAGRAM_URL = "#next-social";
const DEFAULT_STORE_LOCATOR_URL = "#store-details";

/* Marketing video: https://youtu.be/8kRn-E-VjMA */
const MARKETING_VIDEO_ID = "8kRn-E-VjMA";

/* Club tiers, lowest to highest. `foil` is the metallic gradient on the Club card and the header chip.
 * This is the only colour on the page. Rename or add tiers here. */
export type TierName = "Silver" | "Gold" | "Platinum";
const TIERS: { name: TierName; foil: string }[] = [
  { name: "Silver", foil: "linear-gradient(120deg,#FFFFFF 0%,#C9CED6 35%,#8D949E 62%,#EEF0F3 100%)" },
  { name: "Gold", foil: "linear-gradient(120deg,#FFF3C4 0%,#E5BD52 38%,#A67C1A 62%,#F7E08F 100%)" },
  { name: "Platinum", foil: "linear-gradient(120deg,#FFFFFF 0%,#D6E2F2 32%,#93A9C9 62%,#F1F6FD 100%)" },
];

/* ------------------------------- types ------------------------------------------- */
export interface NextItem {
  name: string;
  size: string;
  sku: string;
  hsn: string;
  qty: number;
  mrp: number;
  discount: number;
}

export interface NextCoupon {
  code: string;
  /** Big headline, e.g. "20% OFF" or "₹500 OFF" */
  value: string;
  title: string;
  description: string;
  validTill: string;
}

export interface NextClub {
  tier: TierName;
  points: number;
  /** Points still needed for the next tier. null / omitted at the top tier. */
  pointsToNext?: number | null;
  coupons: NextCoupon[];
}

export interface NextReceiptData {
  invoiceNo: string;
  date: string;
  customer: { name: string; mobile: string; email: string };
  items: NextItem[];
  sgst: number;
  cgst: number;
  payment: { mode: string; ref: string };
  store: { name: string; address: string; email: string; phone: string; gstin?: string; associate: string };
  registeredOffice: string;
  exchange: { days: number; points: string[] };
  callTo: string;
  emailTo: string;
  /** Customer tier + coupons. Optional: the coupons band and the header chip are hidden without it. */
  club?: NextClub;
}

export interface ProfileValues {
  name: string;
  email: string;
  gender: string;
  birthday: string;
  anniversary: string;
  offers: boolean;
}

export interface FeedbackValues {
  invoiceNo: string;
  overall: number;
  categories: { service: number; product: number; sizes: number; value: number };
  comment: string;
}

export interface NextReceiptProps {
  data?: NextReceiptData;
  receipts?: NextReceiptData[];
  qrSrc?: string;
  logoSrc?: string;
  rdepLogoSrc?: string;
  instagramUrl?: string;
  storeLocatorUrl?: string;
  onDownload?: (receipt: NextReceiptData) => void;
  onSendEmail?: (email: string, receipt: NextReceiptData) => void;
  onSaveProfile?: (values: ProfileValues) => void;
  onSubmitFeedback?: (values: FeedbackValues) => void;
  onSelectReceipt?: (invoiceNo: string) => void;
}

type IconName =
  | "history" | "mail" | "download" | "phone" | "instagram" | "pin" | "store"
  | "close" | "check" | "arrow" | "chevron" | "user" | "tax" | "directions" | "call"
  | "star" | "ticket" | "qr";
type ModalId = "history" | "email" | "qr" | null;

interface HistoryRow {
  invoiceNo: string;
  date: string;
  storeName: string;
  amount: number;
  items: number;
  current: boolean;
}

/* ------------------------------- helpers ----------------------------------------- */
const inr = (n: number): string => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const trim = (n: number): string => String(Number(n.toFixed(2)));
const pctText = (n: number): string => String(Math.round(n * 10) / 10);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const netOf = (i: NextItem): number => round2(i.mrp * i.qty - i.discount);
const emailOk = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function totalsOf(r: NextReceiptData) {
  const subtotal = round2(r.items.reduce((a, i) => a + i.mrp * i.qty, 0));
  const discount = round2(r.items.reduce((a, i) => a + i.discount, 0));
  return { subtotal, discount, total: round2(subtotal - discount), pieces: r.items.reduce((a, i) => a + i.qty, 0) };
}

function dateValue(d: string): number {
  const [dd, mm, yyyy] = d.split(" ")[0].split("-").map(Number);
  return Date.UTC(yyyy, (mm || 1) - 1, dd || 1);
}

function seeded(seed: string): () => number {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  s = s || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/* ---------------------------- downloadable receipt ------------------------------- */
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildReceiptHtml(r: NextReceiptData, logoSrc: string, rdepLogoSrc: string): string {
  const abs = (p: string) => (/^(https?:|data:)/.test(p) ? p : `${window.location.origin}${encodeURI(p)}`);
  const t = totalsOf(r);
  const rows = r.items
    .map(
      (i) => `<tr>
      <td><div class="n">${esc(i.name)}</div><div class="s">Size ${esc(i.size)} &middot; SKU ${esc(i.sku)} &middot; HSN ${esc(i.hsn)}</div></td>
      <td class="r">${i.qty}</td><td class="r">${inr(i.mrp)}</td><td class="r">&minus;${inr(i.discount)}</td><td class="r b">${inr(netOf(i))}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>NEXT Receipt ${esc(r.invoiceNo)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,'Helvetica Neue',sans-serif;font-size:14px;color:#5C5C5C;background:#F4F4F4;max-width:760px;margin:0 auto;padding:24px}
.bar{display:flex;justify-content:flex-end;margin-bottom:16px}
.bar button{background:#0A0A0A;color:#fff;border:0;padding:10px 18px;font:700 12px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.sheet{background:#fff;border:1px solid #0A0A0A;padding:28px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:16px;border-bottom:3px solid #0A0A0A}
.head img{height:30px;width:auto}
h1{font-size:20px;color:#0A0A0A;text-transform:uppercase;letter-spacing:.14em;margin-top:12px}
.meta{text-align:right;font-size:12px;line-height:1.8}
table{width:100%;border-collapse:collapse;margin-top:20px}
th{text-align:left;font-size:11px;letter-spacing:.14em;padding:8px;background:#F4F4F4;border-bottom:1px solid #0A0A0A}
td{padding:12px 8px;border-bottom:1px solid rgba(10,10,10,.16);vertical-align:top;font-size:13px}
.r{text-align:right}.b{font-weight:700;color:#0A0A0A}.n{text-transform:uppercase;font-weight:700;color:#0A0A0A}.s{font-size:11px;margin-top:3px}
.sum{margin:18px 0 0 auto;width:300px}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
.total{display:flex;justify-content:space-between;align-items:baseline;border-top:3px solid #0A0A0A;margin-top:10px;padding-top:12px;color:#0A0A0A;font-weight:700}
.total strong{font-size:26px}
.pay{margin-top:18px;background:#0A0A0A;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;font-size:14px}
.store{margin-top:24px;font-size:12px;line-height:1.7;border-top:1px solid rgba(10,10,10,.16);padding-top:14px}
.foot{margin-top:22px;text-align:center;font-size:12px}.foot img{height:20px;vertical-align:middle;margin-left:6px}
@media print{.bar{display:none}body{max-width:none;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="bar"><button onclick="window.print()">Save as PDF</button></div>
<div class="sheet">
<div class="head"><div><img src="${esc(abs(logoSrc))}" alt="NEXT" onerror="this.style.display='none'"><h1>Tax invoice</h1></div>
<div class="meta"><div><b>Invoice no:</b> ${esc(r.invoiceNo)}</div><div><b>Date:</b> ${esc(r.date)}</div><div><b>Customer:</b> ${esc(r.customer.name)}</div><div><b>Mobile:</b> ${esc(r.customer.mobile)}</div></div></div>
<table><thead><tr><th style="width:44%">ITEM</th><th class="r">QTY</th><th class="r">UNIT PRICE</th><th class="r">DISCOUNT</th><th class="r">NET AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sum">
<div class="row"><span>Subtotal (MRP)</span><b>&#8377;${inr(t.subtotal)}</b></div>
<div class="row"><span>Discount</span><b>&minus;&#8377;${inr(t.discount)}</b></div>
<div class="row"><span>Includes SGST</span><b>&#8377;${inr(r.sgst)}</b></div>
<div class="row"><span>Includes CGST</span><b>&#8377;${inr(r.cgst)}</b></div>
<div class="total"><span>Total paid</span><strong>&#8377;${inr(t.total)}</strong></div></div>
<div class="pay"><span>Payment method &middot; ${esc(r.payment.mode)} &ndash; ${esc(r.payment.ref)}</span><b>&#8377;${inr(t.total)}</b></div>
<div class="store"><b>${esc(r.store.name)}</b><br>${esc(r.store.address)}<br>${esc(r.store.email)} &middot; ${esc(r.store.phone)}${r.store.gstin ? `<br>GSTIN: ${esc(r.store.gstin)}` : ""}<br>Registered office: ${esc(r.registeredOffice)}</div>
<div class="foot">Thank you for shopping at NEXT<br><br>Powered by <img src="${esc(abs(rdepLogoSrc))}" alt="rdep" onerror="this.style.display='none'"></div>
</div></body></html>`;
}

function downloadReceipt(r: NextReceiptData, logoSrc: string, rdepLogoSrc: string) {
  const blob = new Blob([buildReceiptHtml(r, logoSrc, rdepLogoSrc)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NEXT_Receipt_${r.invoiceNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------- Sample Data ----------------------------------- */
const halfTax = (total: number): number => Math.floor(((total - total / 1.18) / 2) * 100) / 100;

/* SAMPLE club data. Replace with the real tier, points and coupons from the NEXT loyalty API. */
const SAMPLE_CLUB: NextClub = {
  tier: "Gold",
  points: 3240,
  pointsToNext: 1760,
  coupons: [
    { code: "NEXT20", value: "20% OFF", title: "Welcome back offer", description: "On your next purchase of ₹3,999 or more.", validTill: "30 Nov 2026" },
    { code: "GOLD500", value: "₹500 OFF", title: "Gold member reward", description: "On any order above ₹2,999.", validTill: "31 Dec 2026" },
    { code: "FESTIVE10", value: "10% OFF", title: "Festive edit", description: "On new arrivals. One use only.", validTill: "15 Nov 2026" },
  ],
};

const SAMPLE_COMMON = {
  customer: { name: "Sunil", mobile: "7975331947", email: "lekha.s@proenx.com" },
  store: {
    name: "Next",
    address: "Laxmi Society, Model Colony, Shivajinagar, Maharashtra",
    email: "rema.k@proenx.com",
    phone: "9790258564",
    associate: "Rohit",
  },
  registeredOffice:
    "1/1, 4th Floor, Cabin 1, Vinayaka Towers, Gandhinagar, K. G. Road, Bangalore, Bangalore North, Karnataka, India, 560009",
  exchange: {
    days: 30,
    points: [
      "Items can be exchanged within 30 days of purchase with this receipt.",
      "Products must be unworn, unwashed and carry all original tags.",
      "Exchange is for the same or a higher value item; any price difference is payable.",
      "Items bought during the end of season sale, innerwear and accessories are not exchangeable.",
    ],
  },
  callTo: "+919790258564",
  emailTo: "rema.k@proenx.com",
  club: SAMPLE_CLUB,
};

export const sampleNextReceipts: NextReceiptData[] = [
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260626000169",
    date: "14-07-2026 18:18:04",
    items: [{ name: "BLEACH BLUE DENIM BAGGY FIT JEANS", size: "L", sku: "V16-027", hsn: "62032090", qty: 1, mrp: 3033, discount: 150.65 }],
    sgst: 219.84,
    cgst: 219.84,
    payment: { mode: "CASH", ref: "REF98765" },
  },
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260526000112",
    date: "26-05-2026 18:41:22",
    store: { ...SAMPLE_COMMON.store, name: "Next Pavilion Mall", address: "Pavilion Mall, Senapati Bapat Road, Pune, Maharashtra" },
    items: [
      { name: "RELAXED FIT STRAIGHT JEANS", size: "32", sku: "V12-310", hsn: "62034200", qty: 1, mrp: 3490, discount: 500 },
      { name: "TEXTURED COTTON T-SHIRT", size: "M", sku: "T07-118", hsn: "61091000", qty: 2, mrp: 1290, discount: 0 },
    ],
    sgst: halfTax(5570),
    cgst: halfTax(5570),
    payment: { mode: "CARD", ref: "REF40211" },
  },
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260203000047",
    date: "03-02-2026 14:09:50",
    store: { ...SAMPLE_COMMON.store, name: "Next Phoenix Mall of Asia", address: "Phoenix Mall of Asia, Yelahanka, Bengaluru, Karnataka" },
    items: [{ name: "BELTED MIDI DRESS", size: "S", sku: "D21-905", hsn: "62044990", qty: 1, mrp: 4990, discount: 0 }],
    sgst: halfTax(4990),
    cgst: halfTax(4990),
    payment: { mode: "UPI", ref: "REF77310" },
  },
];

/* -------------------------------- icons ------------------------------------------ */
const STAR_PATH = "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z";
const PHONE_PATH =
  "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z";
const PATHS: Record<IconName, ReactNode> = {
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 7 9 6 9-6" /></>),
  download: (<><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>),
  phone: <path d={PHONE_PATH} />,
  call: <path d={PHONE_PATH} />,
  instagram: (<><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>),
  pin: (<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  store: (<><path d="M3 9 4.5 4h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" /><path d="M10 20v-5h4v5" /></>),
  user: (<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  tax: (<><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M7 8h10M7 12h10M7 16h6" /></>),
  directions: <path d="M9 18l6-6-6-6" />,
  star: <path d={STAR_PATH} />,
  ticket: (<><path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M9 9h6M9 12h6M9 15h3" /></>),
  qr: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 18v3" /></>),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12 5 5 9-10" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* ------------------------- placeholder QR + decorative barcode ------------------- */
function PlaceholderQR({ seed }: { seed: string }) {
  const N = 25;
  const cells = useMemo(() => {
    const rnd = seeded(seed);
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    const out: [number, number][] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.5) out.push([x, y]);
    return out;
  }, [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} fill="#0A0A0A" shapeRendering="crispEdges" role="img" aria-label="Receipt QR code" className="h-full w-full">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

/** Decorative barcode (not scannable). Takes the colour of the surrounding text. */
function Barcode({ seed, className = "" }: { seed: string; className?: string }) {
  const bars = useMemo(() => {
    const rnd = seeded(seed);
    const out: { x: number; w: number }[] = [];
    let x = 0;
    while (x < 96) {
      const w = rnd() > 0.6 ? 3 : rnd() > 0.4 ? 2 : 1;
      if (rnd() > 0.28) out.push({ x, w });
      x += w + (rnd() > 0.5 ? 2 : 1);
    }
    return out;
  }, [seed]);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" fill="currentColor" aria-hidden="true" className={className}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="30" />
      ))}
    </svg>
  );
}

/* --------------------------------- shared ---------------------------------------- */
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nx-black)]";
const sheet = "border border-[var(--nx-line)] bg-white";
const pressInvert = "active:bg-[var(--nx-black)] active:text-white [@media(hover:hover)]:hover:bg-[var(--nx-black)] [@media(hover:hover)]:hover:text-white";

const fieldInput =
  "w-full border border-[var(--nx-line)] bg-[var(--nx-wash)] px-4 py-3.5 text-base text-[var(--nx-black)] outline-none transition-colors [-webkit-appearance:none] [appearance:none] rounded-none placeholder:text-[var(--nx-mid)] focus:border-[var(--nx-black)] focus:bg-white";
const fieldLabel = `${T_CAPS} mb-1.5 block text-[var(--nx-gray)]`;
const solidBtn = `nx-bold flex w-full items-center justify-center gap-2 bg-[var(--nx-black)] py-4 text-[12px] uppercase tracking-[0.18em] text-white transition-colors active:bg-[var(--nx-gray)] [@media(hover:hover)]:hover:bg-[var(--nx-gray)] motion-reduce:transition-none ${focusRing}`;

const DESIGN_W = 400;
const PHONE_MAX = 520;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useFitScale(): number {
  const [scale, setScale] = useState(1);
  useIsoLayoutEffect(() => {
    const update = () => {
      const w = document.documentElement.clientWidth;
      setScale(w <= PHONE_MAX ? w / DESIGN_W : 1);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return scale;
}
const zoomStyle = (scale: number): CSSProperties | undefined => (scale === 1 ? undefined : ({ zoom: scale } as CSSProperties));

/** True while the element is inside the viewport (expanded by `rootMargin`, needs `threshold` visible). */
function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin: string, threshold: number): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold]);
  return inView;
}

/** Copy-to-clipboard with a short "Copied" flag per code. */
function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard blocked: ignore */
    }
  }, []);
  return { copied, copy };
}

function BrandImage({
  src, alt, width, height, className, fallbackClassName, priority = false,
}: {
  src: string; alt: string; width: number; height: number; className: string; fallbackClassName: string; priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={fallbackClassName}>{alt}</span>;
  return (
    <Image
      ref={(img: HTMLImageElement | null) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function Leader({ label, value, strong = false, className = "" }: { label: ReactNode; value: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <dt className="flex min-w-0 flex-1 items-baseline gap-2 after:mb-[3px] after:h-0 after:min-w-3 after:flex-1 after:border-b after:border-dotted after:border-current after:opacity-40 after:content-['']">
        {label}
      </dt>
      <dd className={`shrink-0 text-right tabular-nums ${strong ? "nx-bold" : ""}`}>{value}</dd>
    </div>
  );
}

function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,visibility] duration-300 motion-reduce:transition-none ${
        open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function SectionTitle({ children, sub, light = false }: { children: ReactNode; sub?: string; light?: boolean }) {
  return (
    <div>
      <h2 className={`${T_TITLE} ${light ? "text-white" : "text-[var(--nx-black)]"}`}>{children}</h2>
      {sub && <p className={`mt-1.5 ${T_BODY} ${light ? "text-[var(--nx-silver)]" : "text-[var(--nx-gray)]"}`}>{sub}</p>}
    </div>
  );
}

/* Popups: sharp white sheets */
function Modal({ title, onClose, scale, children }: { title: string; onClose: () => void; scale: number; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      (previous as HTMLElement | null)?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0A0A]/70 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={theme}
        className={`nx-root ${fallbackFont.variable} max-h-[88vh] w-full overflow-y-auto border-t-4 border-[var(--nx-black)] bg-white outline-none sm:w-[400px] sm:border-4`}
      >
        <div className="w-full sm:w-[400px]" style={zoomStyle(scale)}>
          <div className="p-6 text-[var(--nx-gray)]">
            <div className="flex items-center justify-between gap-4">
              <h2 id={titleId} className={`${T_TITLE} text-[var(--nx-black)]`}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`grid h-10 w-10 shrink-0 place-items-center border border-[var(--nx-black)] text-[var(--nx-black)] ${pressInvert} ${focusRing}`}
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ item row (ledger line) --------------------------- */
const LEDGER_COLS = "grid-cols-[26px_minmax(0,1fr)_28px_92px]";

function ItemRow({ item, index, open, onToggle }: { item: NextItem; index: number; open: boolean; onToggle: () => void }) {
  const panelId = useId();
  const net = netOf(item);
  const gross = item.mrp * item.qty;
  const pct = gross > 0 ? (item.discount / gross) * 100 : 0;
  return (
    <li className="border-t border-[var(--nx-line)] first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`grid w-full ${LEDGER_COLS} items-start gap-x-3 px-5 py-4 text-left ${focusRing}`}
      >
        <span className="nx-bold text-[14px] tabular-nums text-[var(--nx-mid)]">{String(index + 1).padStart(2, "0")}</span>
        <span className="min-w-0">
          <span className="nx-bold block text-[14px] uppercase leading-snug tracking-[0.04em] text-[var(--nx-black)]">{item.name}</span>
          <span className={`mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 ${T_SMALL} text-[var(--nx-gray)]`}>
            <span className="nx-bold border border-[var(--nx-black)] px-1.5 py-0.5 uppercase tracking-[0.1em] text-[var(--nx-black)]">Size {item.size}</span>
            {pct > 0 && <span className="nx-bold bg-[var(--nx-black)] px-1.5 py-0.5 text-white">{pctText(pct)}% off</span>}
            <span className="nx-bold flex items-center gap-1 text-[var(--nx-black)]">
              Details
              <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </span>
          </span>
        </span>
        <span className={`${T_AMOUNT} text-center text-[var(--nx-black)]`}>{item.qty}</span>
        <span className="text-right">
          <span className={`${T_AMOUNT} block text-[var(--nx-black)]`}>₹{inr(net)}</span>
          {item.discount > 0 && <s className={`mt-0.5 block ${T_SMALL} tabular-nums text-[var(--nx-mid)]`}>₹{inr(gross)}</s>}
        </span>
      </button>

      <Collapse open={open} id={panelId}>
        <div className="mx-5 mb-4 border border-[var(--nx-line)]">
          <dl className="grid grid-cols-3 divide-x divide-[var(--nx-line)]">
            {(
              [
                ["SKU", item.sku],
                ["HSN", item.hsn],
                ["UoM", "Pcs"],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="min-w-0 p-3">
                <dt className={`${T_CAPS} text-[var(--nx-gray)]`}>{k}</dt>
                <dd className={`${T_LABEL} mt-1 break-words tabular-nums text-[var(--nx-black)]`}>{v}</dd>
              </div>
            ))}
          </dl>
          <dl className="grid grid-cols-2 divide-x divide-[var(--nx-line)] border-t border-[var(--nx-line)]">
            <div className="p-3">
              <dt className={`${T_CAPS} text-[var(--nx-gray)]`}>Discount</dt>
              <dd className={`${T_LABEL} mt-1 tabular-nums text-[var(--nx-black)]`}>{pctText(pct)}%</dd>
            </div>
            <div className="p-3">
              <dt className={`${T_CAPS} text-[var(--nx-gray)]`}>Amount</dt>
              <dd className={`${T_LABEL} mt-1 tabular-nums text-[var(--nx-black)]`}>₹{trim(item.discount)}</dd>
            </div>
          </dl>
        </div>
      </Collapse>
    </li>
  );
}

/* ------------------------------- feedback card ------------------------------------ */
const RATING_WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
const FEEDBACK_CATEGORIES = [
  { key: "service", label: "Service quality" },
  { key: "product", label: "Product offering" },
  { key: "sizes", label: "Sizes availability" },
  { key: "value", label: "Value for money" },
] as const;

function FeedbackCard({ data, onSubmit }: { data: NextReceiptData; onSubmit?: (v: FeedbackValues) => void }) {
  const [overall, setOverall] = useState(0);
  const [hover, setHover] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [cats, setCats] = useState({ service: 0, product: 0, sizes: 0, value: 0 });
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const commentId = useId();
  const detailId = useId();
  const shown = hover || overall;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.({ invoiceNo: data.invoiceNo, overall, categories: cats, comment: comment.trim() });
    setSubmitted(true);
  };

  return (
    <section aria-label="Rate your visit" className={`${sheet} p-5 text-[var(--nx-gray)]`}>
      <SectionTitle sub="How was your experience at NEXT?">Rate your visit</SectionTitle>

      {submitted ? (
        <div className="mt-5 flex items-start gap-3 bg-[var(--nx-black)] p-4 text-white" aria-live="polite">
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-white text-[var(--nx-black)]">
            <Icon name="check" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={T_LABEL}>Thank you for rating</p>
            <p className={`mt-0.5 ${T_SMALL} text-white/70`}>
              You gave {overall} {overall === 1 ? "star" : "stars"} ({RATING_WORDS[overall - 1].toLowerCase()}).
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setExpanded(false);
                setOverall(0);
              }}
              className={`${T_SMALL} nx-bold mt-2 underline underline-offset-4`}
            >
              Edit rating
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div role="radiogroup" aria-label="Overall rating" className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n <= shown;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={overall === n}
                  aria-label={`${n} ${n === 1 ? "star" : "stars"}, ${RATING_WORDS[n - 1]}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => {
                    setOverall(n);
                    setExpanded(true);
                  }}
                  className={`-ml-px grid h-14 flex-1 place-items-center border border-[var(--nx-black)] first:ml-0 ${on ? "bg-[var(--nx-black)]" : "bg-white"} ${focusRing}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className={`h-7 w-7 ${on ? "fill-white stroke-white" : "fill-transparent stroke-[var(--nx-black)]"} ${!overall && !hover ? "nx-star-flash" : ""}`}
                    style={!overall && !hover ? { animationDelay: `${(n - 1) * 0.18}s` } : undefined}
                  >
                    <path d={STAR_PATH} />
                  </svg>
                </button>
              );
            })}
          </div>
          <p className={`${T_CAPS} mt-2.5 text-[var(--nx-black)]`}>{overall ? `${RATING_WORDS[overall - 1]}, ${overall} of 5` : "Tap to rate"}</p>

          <Collapse open={expanded} id={detailId}>
            <form onSubmit={submit} noValidate className="space-y-4 pt-4">
              <div className="border-y border-[var(--nx-line)]">
                {FEEDBACK_CATEGORIES.map((c) => (
                  <div key={c.key} className="flex items-center justify-between border-t border-[var(--nx-line)] py-1.5 first:border-t-0">
                    <span className={`${T_BODY} text-[var(--nx-black)]`}>{c.label}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setCats((p) => ({ ...p, [c.key]: star }))} className="p-1.5" aria-label={`${star} stars for ${c.label}`}>
                          <svg viewBox="0 0 24 24" strokeWidth="1.5" className={`h-[18px] w-[18px] stroke-[var(--nx-black)] ${star <= cats[c.key] ? "fill-[var(--nx-black)]" : "fill-transparent"}`}>
                            <path d={STAR_PATH} />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor={commentId} className={fieldLabel}>
                  Anything else? (optional)
                </label>
                <textarea
                  id={commentId}
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked or how we can improve"
                  className={`${fieldInput} resize-none`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button type="submit" className={`${solidBtn} flex-1`}>
                  Send rating
                </button>
                <button type="button" onClick={() => setExpanded(false)} className={`nx-bold shrink-0 border border-[var(--nx-black)] px-5 py-4 text-[12px] uppercase tracking-[0.18em] text-[var(--nx-black)] ${pressInvert}`}>
                  Cancel
                </button>
              </div>
            </form>
          </Collapse>
        </div>
      )}
    </section>
  );
}

/* ------------------------------- video (full-bleed) -------------------------------- */
/** YouTube embed that autoplays muted while at least half of it is on screen and pauses when it leaves. */
function VideoBlock() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const near = useInView(sectionRef, "300px 0px", 0);
  const visible = useInView(sectionRef, "0px", 0.5);

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  const command = useCallback((func: string) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: "" }), "*");
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const func = visible ? "playVideo" : "pauseVideo";
    const timers = [0, 600, 1500].map((ms) => window.setTimeout(() => command(func), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [loaded, visible, command]);

  const src = mounted
    ? `https://www.youtube-nocookie.com/embed/${MARKETING_VIDEO_ID}?enablejsapi=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${MARKETING_VIDEO_ID}&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  return (
    <section ref={sectionRef} aria-label="NEXT video" className="border-y-4 border-[var(--nx-black)] bg-[var(--nx-black)]">
      <div className="relative aspect-video w-full bg-[var(--nx-black)] bg-cover bg-center" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${MARKETING_VIDEO_ID}/hqdefault.jpg)` }}>
        {mounted && (
          <iframe
            ref={frameRef}
            src={src}
            title="NEXT video"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>
    </section>
  );
}

/* ================================== COUPONS ======================================= */
/* Tickets sit on the black band and use only black, white and greys. */
const BAND = "#0A0A0A";

interface CouponViewProps {
  coupons: NextCoupon[];
  copied: string;
  onCopy: (code: string) => void;
}

/* ---- Coupon tickets: swipeable, with a barcode; the centred one turns white ---- */
function TicketView({ coupons, copied, onCopy }: CouponViewProps) {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(0);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const count = coupons.length;

  useEffect(() => {
    const root = trackRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const items = Array.from(root.children);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = items.indexOf(e.target);
            if (i >= 0) {
              activeRef.current = i;
              setActive(i);
            }
          }
        });
      },
      { root, rootMargin: "0px -45% 0px -45%", threshold: 0 },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [count]);

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: "smooth" });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = { down: true, x: e.clientX, left: el.scrollLeft, moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    const el = trackRef.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 5) d.moved = true;
    el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    setDragging(false);
    goTo(activeRef.current);
  };

  return (
    <>
      <ul
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
        className={`relative -mx-4 flex select-none gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          dragging ? "cursor-grabbing snap-none" : "cursor-grab snap-x snap-mandatory"
        }`}
      >
        {coupons.map((c, i) => {
          const on = i === active;
          return (
            <li key={c.code} className={`shrink-0 snap-center ${count > 1 ? "w-[80%]" : "w-full"}`}>
              <div
                className={`relative transition-all duration-300 motion-reduce:transition-none ${
                  on ? "scale-100 bg-white text-[var(--nx-black)]" : "scale-[0.96] border border-white/25 bg-[var(--nx-ink2)] text-white"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="nx-bold text-[26px] uppercase leading-none tracking-[0.02em]">{c.value}</p>
                    <Barcode seed={c.code} className="h-7 w-14 shrink-0" />
                  </div>
                  <p className={`${T_LABEL} mt-3`}>{c.title}</p>
                  <p className={`mt-1 ${T_SMALL} ${on ? "text-[var(--nx-gray)]" : "text-white/70"}`}>{c.description}</p>
                </div>
                <div className="relative">
                  <span aria-hidden="true" className="absolute -left-3 -top-3 h-6 w-6 rounded-full" style={{ background: BAND }} />
                  <span aria-hidden="true" className="absolute -right-3 -top-3 h-6 w-6 rounded-full" style={{ background: BAND }} />
                  <div className={`border-t-2 border-dashed ${on ? "border-black/25" : "border-white/25"}`} />
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="nx-bold truncate text-[16px] tracking-[0.12em]">{c.code}</p>
                    <p className={`mt-0.5 ${T_SMALL} ${on ? "text-[var(--nx-gray)]" : "text-white/60"}`}>Valid till {c.validTill}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(c.code)}
                    aria-live="polite"
                    className={`nx-bold shrink-0 border px-4 py-2 text-[12px] uppercase tracking-[0.14em] ${
                      on ? "border-[var(--nx-black)] bg-[var(--nx-black)] text-white active:bg-white active:text-[var(--nx-black)]" : "border-white bg-white text-[var(--nx-black)] active:bg-transparent active:text-white"
                    }`}
                  >
                    {copied === c.code ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {count > 1 && (
        <div className="-mt-1 flex justify-center gap-0.5">
          {coupons.map((c, i) => (
            <button key={c.code} type="button" aria-label={`Show coupon ${i + 1} of ${count}`} aria-current={i === active ? "true" : undefined} onClick={() => goTo(i)} className="grid h-6 w-7 place-items-center">
              <span className={`block h-[3px] transition-all duration-300 ${i === active ? "w-6 bg-white" : "w-2 bg-white/30"}`} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function CouponsSection({ coupons }: { coupons: NextCoupon[] }) {
  const { copied, copy } = useCopy();
  const count = coupons.length;

  return (
    <section aria-label="Coupons">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`${T_TITLE} text-white`}>Coupons</h2>
        <span className={`${T_CAPS} nx-bold border border-white/40 px-2.5 py-1 text-white`}>{count} available</span>
      </div>

      <div className="mt-4">
        {count === 0 ? (
          <div className="flex flex-col items-center border border-dashed border-white/30 px-6 py-7 text-center">
            <Icon name="ticket" className="h-8 w-8 text-white" />
            <p className={`${T_LABEL} mt-2 text-white`}>No coupons available</p>
            <p className={`${T_SMALL} mt-1 text-[var(--nx-silver)]`}>Please check this section later.</p>
          </div>
        ) : (
          <TicketView coupons={coupons} copied={copied} onCopy={copy} />
        )}
      </div>
    </section>
  );
}

/* ------------------------------ NEXT Club: compact foil card ----------------------- */
function ClubCard({ club, mobile, sectionRef, logoSrc }: { club: NextClub; mobile: string; sectionRef: RefObject<HTMLElement | null>; logoSrc: string }) {
  const idx = Math.max(0, TIERS.findIndex((t) => t.name === club.tier));
  const tier = TIERS[idx];
  const next = TIERS[idx + 1];
  const toNext = club.pointsToNext ?? null;
  const total = toNext != null ? club.points + toNext : club.points;
  const pct = !next || toNext == null || total <= 0 ? 100 : Math.min(100, Math.round((club.points / total) * 100));

  return (
    <section ref={sectionRef} aria-label="NEXT Club" className="scroll-mt-4">
      <div className="nx-sheen rounded-[14px] p-4 text-[var(--nx-black)] shadow-[0_22px_40px_-16px_rgba(0,0,0,1)]" style={{ backgroundImage: tier.foil }}>
        <svg aria-hidden="true" viewBox="0 0 368 150" preserveAspectRatio="xMaxYMin slice" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]" fill="none" stroke="#0A0A0A" strokeWidth="1">
          {[50, 80, 110, 140, 170].map((r) => (
            <circle key={r} cx="340" cy="10" r={r} />
          ))}
        </svg>

        <div className="relative flex items-center justify-between gap-3">
          <BrandImage src={logoSrc} alt="NEXT" width={320} height={80} className="h-5 w-auto object-contain object-left" fallbackClassName="nx-bold text-[16px] uppercase tracking-[0.3em]" />
          <span className={`${T_LABEL} tabular-nums tracking-[0.12em]`}>•••• {mobile.slice(-4)}</span>
        </div>

        <div className="relative mt-3 flex items-end justify-between gap-3">
          <div>
            <p className={`${T_SMALL} text-[rgba(10,10,10,0.75)]`}>Club tier</p>
            <p className="nx-bold text-[26px] uppercase leading-none tracking-[0.1em]">{tier.name}</p>
          </div>
          <div className="text-right">
            <p className="nx-bold text-[26px] leading-none tabular-nums">{club.points.toLocaleString("en-IN")}</p>
            <p className={`${T_SMALL} text-[rgba(10,10,10,0.75)]`}>points</p>
          </div>
        </div>

        <div className="relative mt-3.5">
          <div className="h-1.5 bg-black/15">
            <div className="h-full bg-[var(--nx-black)]" style={{ width: `${pct}%` }} />
          </div>
          <p className={`${T_SMALL} mt-1.5`}>
            {next && toNext != null ? (
              <>
                <span className="nx-bold tabular-nums">{toNext.toLocaleString("en-IN")}</span> more points to <span className="nx-bold">{next.name}</span>
              </>
            ) : (
              "You are at the top tier"
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- profile ----------------------------------------- */
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

function Toggle({ checked, onChange, disabled = false, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-7 w-[52px] shrink-0 border border-[var(--nx-black)] transition-colors motion-reduce:transition-none ${checked ? "bg-[var(--nx-black)]" : "bg-white"} ${disabled ? "opacity-60" : ""} ${focusRing}`}
    >
      <span aria-hidden="true" className={`absolute top-[3px] h-[18px] w-[18px] transition-all motion-reduce:transition-none ${checked ? "left-[30px] bg-white" : "left-[3px] bg-[var(--nx-black)]"}`} />
    </button>
  );
}

function ProfileCard({ data, onSave }: { data: NextReceiptData; onSave?: (v: ProfileValues) => void }) {
  const [form, setForm] = useState<ProfileValues>({
    name: data.customer.name,
    email: data.customer.email,
    gender: "",
    birthday: "",
    anniversary: "",
    offers: false,
  });
  const [saved, setSaved] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const upd = <K extends keyof ProfileValues>(k: K, v: ProfileValues[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.email && !emailOk(form.email)) {
      setEmailErr("Enter a valid email address, like name@example.com.");
      return;
    }
    setEmailErr("");
    onSave?.(form);
    setSaved(true);
  };

  return (
    <section aria-label="Your profile" className={`${sheet} p-5 text-[var(--nx-gray)]`}>
      <SectionTitle sub="Complete your profile for personalised updates and loyalty program benefits.">Your profile</SectionTitle>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <div>
          <span className={fieldLabel}>Mobile number</span>
          <p className={`${fieldInput} nx-bold tabular-nums`}>{data.customer.mobile}</p>
        </div>

        <label className="block">
          <span className={fieldLabel}>Full name</span>
          <input className={fieldInput} value={form.name} onChange={(e) => upd("name", e.target.value)} autoComplete="name" />
        </label>

        <label className="block">
          <span className={fieldLabel}>Email address</span>
          <input
            type="email"
            className={fieldInput}
            value={form.email}
            onChange={(e) => {
              setEmailErr("");
              upd("email", e.target.value);
            }}
            autoComplete="email"
            aria-invalid={!!emailErr}
          />
          {emailErr && (
            <span role="alert" className={`${T_LABEL} mt-1.5 block text-[var(--nx-black)]`}>
              {emailErr}
            </span>
          )}
        </label>

        <fieldset>
          <legend className={fieldLabel}>Gender</legend>
          <div className="grid grid-cols-2 gap-px bg-[var(--nx-line)] border border-[var(--nx-line)]">
            {GENDERS.map((g) => {
              const on = form.gender === g;
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={on}
                  onClick={() => upd("gender", on ? "" : g)}
                  className={`py-3 text-[14px] transition-colors motion-reduce:transition-none ${focusRing} ${on ? "nx-bold bg-[var(--nx-black)] text-white" : "bg-white text-[var(--nx-gray)] active:bg-[var(--nx-soft)]"}`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <label className="block min-w-0">
            <span className={fieldLabel}>Birthday</span>
            <input type="date" className={fieldInput} value={form.birthday} onChange={(e) => upd("birthday", e.target.value)} autoComplete="bday" />
            <span className={`mt-1 block ${T_SMALL}`}>For birthday offers</span>
          </label>
          <label className="block min-w-0">
            <span className={fieldLabel}>Anniversary</span>
            <input type="date" className={fieldInput} value={form.anniversary} onChange={(e) => upd("anniversary", e.target.value)} />
            <span className={`mt-1 block ${T_SMALL}`}>Optional</span>
          </label>
        </div>

        <fieldset>
          <legend className={fieldLabel}>Communication preferences</legend>
          <ul className="divide-y divide-[var(--nx-line)] border border-[var(--nx-line)]">
            <li className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className={`${T_LABEL} text-[var(--nx-black)]`}>Purchase and order updates</p>
                <p className={`mt-0.5 ${T_SMALL}`}>Receipts and return confirmations. Always on.</p>
              </div>
              <Toggle checked disabled label="Purchase and order updates, always on" />
            </li>
            <li className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className={`${T_LABEL} text-[var(--nx-black)]`}>New arrivals and offers</p>
                <p className={`mt-0.5 ${T_SMALL}`}>Collections, member offers and seasonal edits.</p>
              </div>
              <Toggle checked={form.offers} onChange={(v) => upd("offers", v)} label="New arrivals and offers" />
            </li>
          </ul>
        </fieldset>

        <div>
          <button type="submit" className={solidBtn}>
            {saved ? (
              <>
                <Icon name="check" className="h-4 w-4" /> Details saved
              </>
            ) : (
              "Save details"
            )}
          </button>
          <p className={`mt-3 text-center ${T_SMALL}`}>Your information is used only for purchase communication and personalisation. We never share your data with third parties.</p>
          <span className="sr-only" aria-live="polite">
            {saved ? "Details saved" : ""}
          </span>
        </div>
      </form>
    </section>
  );
}

/* ------------------------------ receipt view ------------------------------------- */
interface ReceiptViewProps extends Omit<NextReceiptProps, "data" | "receipts" | "onSelectReceipt"> {
  data: NextReceiptData;
  history: HistoryRow[];
  onSelect: (invoiceNo: string) => void;
}

function ReceiptView({
  data,
  history,
  onSelect,
  qrSrc,
  logoSrc = DEFAULT_NEXT_LOGO,
  rdepLogoSrc = DEFAULT_RDEP_LOGO,
  instagramUrl = DEFAULT_INSTAGRAM_URL,
  storeLocatorUrl = DEFAULT_STORE_LOCATOR_URL,
  onDownload,
  onSendEmail,
  onSaveProfile,
  onSubmitFeedback,
}: ReceiptViewProps) {
  const [openItem, setOpenItem] = useState(-1);
  const [modal, setModal] = useState<ModalId>(null);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passed, setPassed] = useState(false);
  const closeModal = useCallback(() => setModal(null), []);
  const exchangeId = useId();
  const contactId = useId();
  const clubRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const scale = useFitScale();

  const { store, exchange, club } = data;
  const t = useMemo(() => totalsOf(data), [data]);
  const firstName = data.customer.name.trim().split(/\s+/)[0] || data.customer.name;
  const nameSize = Math.min(44, Math.max(24, Math.floor(250 / (0.8 * firstName.length))));
  const tier = club ? TIERS.find((x) => x.name === club.tier) ?? TIERS[0] : null;
  const handleDownload = () => (onDownload ? onDownload(data) : downloadReceipt(data, logoSrc, rdepLogoSrc));
  const footerInView = useInView(footerRef, "0px", 0);

  /* the floating dock appears once the action strip has scrolled off the top */
  useEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPassed(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const actions: { icon: IconName; label: string; onClick: () => void }[] = [
    { icon: "history", label: "History", onClick: () => setModal("history") },
    { icon: "mail", label: "Email", onClick: () => setModal("email") },
    { icon: "download", label: "Download", onClick: handleDownload },
  ];

  return (
    <div
      style={theme}
      onTouchStart={() => {}} /* lets :active press states fire on iOS Safari */
      className={`nx-root ${fallbackFont.variable} min-h-screen overflow-x-hidden bg-[#DCDCDC] text-[var(--nx-gray)] antialiased [-webkit-text-size-adjust:100%] sm:py-8`}
    >
      <style>{FONT_FACES}</style>

      <main style={zoomStyle(scale)} className="mx-auto w-[400px] overflow-hidden bg-[var(--nx-wash)] pb-20 sm:shadow-[0_28px_64px_-26px_rgba(10,10,10,0.55)]">
        {/* ---------- 1. Header: logo, name, QR ---------- */}
        <header
          className="nx-grain relative overflow-hidden px-5 pb-16 pt-5 text-white"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,.22) 0%, rgba(0,0,0,.35) 38%, #0A0A0A 100%), url(https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85)", backgroundSize: "cover", backgroundPosition: "center 28%" }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-5 -right-2 select-none text-[136px] font-bold leading-none tracking-[0.04em]"
            style={{ WebkitTextStroke: "1px rgba(255,255,255,0.14)", color: "transparent" }}
          >
            NEXT
          </span>

          <div className="nx-rise relative flex items-center justify-between gap-4">
            <BrandImage
              src={logoSrc}
              alt="NEXT"
              width={320}
              height={80}
              priority
              className="h-6 w-auto max-w-[46%] shrink-0 object-contain object-left brightness-0 invert"
              fallbackClassName="nx-bold inline-block text-[24px] uppercase leading-none tracking-[0.34em] text-white"
            />
            {club && tier && (
              <button
                type="button"
                onClick={() => clubRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                aria-label={`${club.tier} member. View NEXT Club`}
                className="nx-bold inline-flex shrink-0 items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-[12px] uppercase tracking-[0.14em] text-[var(--nx-black)]"
                style={{ background: tier.foil }}
              >
                <Icon name="star" className="h-3.5 w-3.5" />
                {club.tier}
              </button>
            )}
          </div>

          <div className="nx-rise relative mt-7 flex items-end justify-between gap-4" style={{ animationDelay: "0.12s" }}>
            <div className="min-w-0">
              <p className={`${T_CAPS} text-[var(--nx-silver)]`}>Thank you,</p>
              <h1 className="mt-2 uppercase leading-[1.02] tracking-[0.1em] [overflow-wrap:anywhere]" style={{ fontSize: nameSize }}>
                {firstName}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setModal("qr")}
              aria-label="View QR code"
              className="relative h-[68px] w-[68px] shrink-0 bg-white p-1.5 text-[var(--nx-black)]"
            >
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="Receipt QR code" className="h-full w-full object-contain" />
              ) : (
                <PlaceholderQR seed={data.invoiceNo} />
              )}
            </button>
          </div>
        </header>

        {/* ---------- 2. Purchase summary: a ruled ledger, overlapping the header ---------- */}
        <section aria-label="Purchase summary" className="relative z-10 -mt-9 px-4">
          <div className={`${sheet} text-[var(--nx-gray)] shadow-[0_26px_44px_-24px_rgba(0,0,0,0.7)]`}>
            <div className="flex items-baseline justify-between gap-3 border-b-2 border-[var(--nx-black)] px-5 py-4">
              <h2 className={`${T_TITLE} text-[var(--nx-black)]`}>Purchase summary</h2>
              <p className={`${T_CAPS} nx-bold shrink-0 text-[var(--nx-black)]`}>
                {t.pieces} {t.pieces === 1 ? "item" : "items"}
              </p>
            </div>

            <div aria-hidden="true" className={`grid ${LEDGER_COLS} gap-x-3 border-b border-[var(--nx-line)] bg-[var(--nx-wash)] px-5 py-2 ${T_CAPS} text-[var(--nx-gray)]`}>
              <span>No</span>
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Net</span>
            </div>

            <ul aria-label="Items purchased">
              {data.items.map((item, i) => (
                <ItemRow key={`${item.sku}-${i}`} item={item} index={i} open={openItem === i} onToggle={() => setOpenItem(openItem === i ? -1 : i)} />
              ))}
            </ul>

            <dl className="border-t-2 border-[var(--nx-black)]">
              {(
                [
                  ["Subtotal (MRP)", `₹${inr(t.subtotal)}`],
                  ["Discount", `− ₹${inr(t.discount)}`],
                  ["SGST", `₹${inr(data.sgst)}`],
                  ["CGST", `₹${inr(data.cgst)}`],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-t border-[var(--nx-line)] px-5 py-3 first:border-t-0">
                  <dt className={`${T_CAPS} text-[var(--nx-gray)]`}>{label}</dt>
                  <dd className={`${T_AMOUNT} text-[var(--nx-black)]`}>{value}</dd>
                </div>
              ))}
            </dl>

            {/* the black ticket stub: punched notches, total, payment, barcode */}
            <div className="nx-grain relative bg-[var(--nx-black)] px-5 pb-5 pt-6 text-white">
              <span aria-hidden="true" className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[var(--nx-wash)]" />
              <span aria-hidden="true" className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[var(--nx-wash)]" />
              <div className="relative">
                <p className={`${T_CAPS} text-[var(--nx-silver)]`}>Total paid</p>
                <p className={`${T_BIG} mt-2`}>₹{inr(t.total)}</p>
                {t.discount > 0 && <p className={`mt-2 ${T_SMALL} text-[var(--nx-silver)]`}>You saved ₹{inr(t.discount)} on this purchase</p>}

                <div className="mt-5 flex items-end justify-between gap-4 border-t border-dashed border-white/30 pt-4">
                  <div className="min-w-0">
                    <p className={`${T_CAPS} text-[var(--nx-silver)]`}>Payment method</p>
                    <p className={`${T_LABEL} mt-1`}>
                      {data.payment.mode} &ndash; {data.payment.ref}
                    </p>
                  </div>
                  <Barcode seed={data.invoiceNo} className="h-9 w-[104px] shrink-0 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Action strip ---------- */}
        <div ref={actionsRef} className="mt-4 px-4">
          <div className="grid grid-cols-3 divide-x divide-[var(--nx-black)] border border-[var(--nx-black)] bg-white">
            {actions.map((a) => (
              <button key={a.label} type="button" onClick={a.onClick} className={`nx-bold flex items-center justify-center gap-2 py-4 text-[12px] uppercase tracking-[0.14em] text-[var(--nx-black)] ${pressInvert} ${focusRing}`}>
                <Icon name={a.icon} className="h-[18px] w-[18px]" />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------- 3. Black band: coupons + Club card ---------- */}
        {club && (
          <div
            className="nx-grain relative mt-8 px-4 pb-8 pt-8 text-white"
            style={{ background: `radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px) 0 0 / 14px 14px, ${BAND}` }}
          >
            <div className="relative space-y-7">
              <CouponsSection coupons={club.coupons} />
              <ClubCard club={club} mobile={data.customer.mobile} sectionRef={clubRef} logoSrc={logoSrc} />
            </div>
          </div>
        )}

        {/* ---------- 4. Rating (works like the Mango receipt) ---------- */}
        <div className="mt-8 px-4">
          <FeedbackCard data={data} onSubmit={onSubmitFeedback} />
        </div>

        {/* ---------- 5. Video, full-bleed ---------- */}
        <div className="mt-8">
          <VideoBlock />
        </div>

        {/* NEXT EDITORIAL: image-led discovery module */}
        <section aria-label="Discover the NEXT edit" className="mx-4 mt-8 overflow-hidden bg-white text-[var(--nx-black)]">
          <div className="relative h-[300px] overflow-hidden bg-[#d7d7d7]">
            <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85" alt="Fashion editorial from the NEXT style edit" className="h-full w-full object-cover object-center" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className={`${T_CAPS} text-white/75`}>The NEXT edit</p>
              <h2 className="nx-bold mt-2 max-w-[280px] text-[30px] uppercase leading-[.98] tracking-[.04em]">Discover what comes next.</h2>
              <p className="mt-2 max-w-[260px] text-[13px] leading-snug text-white/85">New-season pieces. Considered details. Your next favourite.</p>
              <button type="button" onClick={() => document.querySelector('[aria-label="Coupons"]')?.scrollIntoView({ behavior: "smooth", block: "start" })} className="nx-bold mt-4 inline-flex border border-white px-4 py-3 text-[11px] uppercase tracking-[.14em]">Explore your offers ↓</button>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[var(--nx-line)] border-x border-b border-[var(--nx-line)]">
            <div className="p-4"><p className={`${T_CAPS} text-[var(--nx-gray)]`}>Your purchase</p><p className="nx-bold mt-1 text-[14px] uppercase">Made to be worn</p></div>
            <div className="p-4"><p className={`${T_CAPS} text-[var(--nx-gray)]`}>Your next visit</p><p className="nx-bold mt-1 text-[14px] uppercase">Made to be found</p></div>
          </div>
        </section>

        {/* ---------- Retailer receipt sections: next-visit offers, spend ladder, referral, gift card ---------- */}
        <div className="space-y-4 px-4 pt-6">
          <section aria-label="On your next visit" className="grid grid-cols-2 gap-3">
            <article className="relative min-h-[142px] overflow-hidden bg-[var(--nx-black)] p-4 text-white">
              <p className="text-[9px] uppercase tracking-[.18em] text-white/65">Member preview</p>
              <h2 className="nx-bold mt-3 text-[19px] uppercase leading-[1.05]">Early access.<br/>End-of-season sale.</h2>
              <p className="mt-2 text-[11px] leading-snug text-white/75">Get a head start on selected styles.</p>
              <button type="button" onClick={() => document.querySelector('[aria-label="Coupons"]')?.scrollIntoView({behavior:'smooth',block:'start'})} className="mt-3 border-b border-white pb-1 text-[10px] uppercase tracking-[.12em]">View offers ↓</button>
            </article>
            <article className="flex min-h-[142px] flex-col justify-between border border-[var(--nx-line)] bg-white p-4 text-[var(--nx-black)]">
              <div><p className="text-[9px] uppercase tracking-[.18em] text-[var(--nx-gray)]">Style note</p><h2 className="nx-bold mt-3 text-[17px] uppercase leading-tight">Complete the look</h2><p className="mt-2 text-[11px] leading-snug text-[var(--nx-gray)]">Find the finishing touches for your latest purchase.</p></div>
              <button type="button" onClick={() => document.querySelector('[aria-label="Store details"]')?.scrollIntoView({behavior:'smooth',block:'start'})} className="mt-3 self-start border-b border-[var(--nx-black)] pb-1 text-[10px] uppercase tracking-[.12em]">Visit store ↓</button>
            </article>
          </section>

          <section aria-label="Spend more, save more" className="border border-[var(--nx-line)] bg-white p-4 text-[var(--nx-black)]">
            <p className="text-[9px] uppercase tracking-[.18em] text-[var(--nx-gray)]">Shop more. Save more. In-store.</p>
            <h2 className="nx-bold mt-1 text-[17px]">Spend-ladder offers</h2>
            <p className="mt-1 text-[11px] text-[var(--nx-gray)]">Unlock extra savings on your next bill.</p>
            <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
              <div className="border border-[var(--nx-line)] px-1 py-3"><p className="text-[9px] text-[var(--nx-gray)]">Spend ₹8,000</p><p className="nx-bold mt-1 text-[14px]">₹1,000 off</p></div>
              <div className="border border-[var(--nx-black)] bg-[var(--nx-black)] px-1 py-3 text-white"><p className="text-[9px] text-white/70">Spend ₹12,000</p><p className="nx-bold mt-1 text-[14px]">₹2,000 off</p><p className="mt-1 text-[8px] uppercase tracking-wide">Featured</p></div>
              <div className="border border-[var(--nx-line)] px-1 py-3"><p className="text-[9px] text-[var(--nx-gray)]">Spend ₹20,000</p><p className="nx-bold mt-1 text-[14px]">₹4,000 off</p></div>
            </div>
            <p className="mt-3 text-[10px] leading-snug text-[var(--nx-gray)]">Illustrative offer tiers for this sample. Final thresholds and validity can be configured for the retailer.</p>
          </section>

          <section aria-label="Refer a friend" className="bg-[var(--nx-black)] p-5 text-white">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.18em] text-white/65">Refer a friend</p><h2 className="nx-bold mt-2 text-[24px] leading-none">Give ₹500.<br/>Get ₹500.</h2></div><span aria-hidden="true" className="text-[34px] leading-none">✳</span></div>
            <p className="mt-3 max-w-[290px] text-[12px] leading-snug text-white/75">Your friend gets ₹500 off their first qualifying purchase. You earn a reward when they shop.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/20 py-3 text-[10px] text-white/80"><div><b className="block text-white">01</b>Share your code</div><div><b className="block text-white">02</b>Friend shops</div><div><b className="block text-white">03</b>You both save</div></div>
            <div className="mt-4 flex items-center justify-between gap-2"><span className="border border-white/30 px-3 py-2 text-[12px] tracking-[.16em]">NEXT500</span><button type="button" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText('NEXT500').catch(() => {}); }} className="nx-bold bg-white px-3 py-2.5 text-[10px] uppercase tracking-[.08em] text-[var(--nx-black)]">Copy referral code</button></div>
          </section>

          <button type="button" onClick={() => document.querySelector('[aria-label="Store details"]')?.scrollIntoView({behavior:'smooth',block:'start'})} aria-label="Explore NEXT e-gift cards" className="flex w-full items-center gap-3 border border-[var(--nx-line)] bg-white p-4 text-left text-[var(--nx-black)]"><span className="grid h-11 w-11 shrink-0 place-items-center bg-[var(--nx-soft)] text-[22px]">▤</span><span className="min-w-0 flex-1"><span className="nx-bold block text-[13px]">Gift a NEXT e-Gift Card</span><span className="mt-1 block text-[11px] text-[var(--nx-gray)]">For birthdays, celebrations and just-because moments.</span></span><span aria-hidden="true">⌄</span></button>
        </div>

        <div className="space-y-6 px-4 pt-8">
          {/* ---------- 6. Profile, exchange ---------- */}
          <ProfileCard data={data} onSave={onSaveProfile} />

          <section aria-label="Exchange" className={`${sheet} text-[var(--nx-black)]`}>
            <h2>
              <button
                type="button"
                onClick={() => setExchangeOpen((o) => !o)}
                aria-expanded={exchangeOpen}
                aria-controls={exchangeId}
                className={`flex w-full items-center justify-between gap-4 p-5 text-left ${focusRing}`}
              >
                <span>
                  <span className={`${T_TITLE} block`}>Exchange</span>
                  <span className={`mt-1.5 block ${T_BODY} font-normal normal-case tracking-normal text-[var(--nx-gray)]`}>{exchange.days}-day exchange policy</span>
                </span>
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center border border-[var(--nx-black)]">
                  <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${exchangeOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
            </h2>
            <Collapse open={exchangeOpen} id={exchangeId}>
              <ol className="border-t border-[var(--nx-black)]">
                {exchange.points.map((p, i) => (
                  <li key={p} className={`flex items-start gap-4 border-t border-[var(--nx-line)] px-5 py-4 first:border-t-0 ${T_BODY} text-[var(--nx-gray)]`}>
                    <span className="nx-bold w-6 shrink-0 text-[14px] tabular-nums text-[var(--nx-black)]">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </Collapse>
          </section>

          {/* ---------- 7. Reach us ---------- */}
          <section aria-label="Reach us" className={`${sheet} p-5`}>
            <SectionTitle sub="Get in touch or find us online.">Reach us</SectionTitle>
            <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--nx-black)] border border-[var(--nx-black)]">
              {(
                [
                  { icon: "instagram", label: "Social updates", href: "#next-social", ext: false },
                  { icon: "phone", label: "Call us", href: `tel:${data.callTo}`, ext: false },
                  { icon: "mail", label: "Email us", href: `mailto:${data.emailTo}`, ext: false },
                ] as { icon: IconName; label: string; href: string; ext: boolean }[]
              ).map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  {...(l.ext ? { target: "_blank", rel: "noopener noreferrer" } : null)}
                  className={`nx-bold flex flex-col items-center gap-2.5 py-5 text-center text-[12px] uppercase tracking-[0.14em] text-[var(--nx-black)] ${pressInvert} ${focusRing}`}
                >
                  <Icon name={l.icon} className="h-5 w-5" />
                  {l.label}
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={() => document.querySelector('[aria-label="Store details"]')?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="mt-3 flex w-full items-center justify-between gap-4 bg-[var(--nx-black)] p-5 text-left text-white active:bg-[var(--nx-gray)]"
            >
              <span>
                <span className={`${T_TITLE} block`}>Find a NEXT store</span>
                <span className={`mt-1.5 block ${T_BODY} text-[var(--nx-silver)]`}>Locate your nearest store in India</span>
              </span>
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-white text-[var(--nx-black)]">
                <Icon name="arrow" className="h-5 w-5" />
              </span>
            </button>
          </section>

          {/* ---------- 8. Store details ---------- */}
          <section aria-label="Store details" className={`${sheet} p-5 text-[var(--nx-black)]`}>
            <SectionTitle>Store details</SectionTitle>
            <p className={`${T_CAPS} mt-4 text-[var(--nx-gray)]`}>You shopped at</p>
            <p className="nx-bold mt-1 text-[16px] uppercase tracking-[0.06em]">{store.name}</p>
            <p className={`mt-2 flex items-start gap-2.5 ${T_BODY} text-[var(--nx-gray)]`}>
              <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0" />
              {store.address}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="nx-bold flex items-center justify-center gap-2 bg-[var(--nx-black)] py-3.5 text-[12px] uppercase tracking-[0.14em] text-white active:bg-[var(--nx-gray)]"
              >
                <Icon name="directions" className="h-4 w-4" />
                Directions / address
              </button>
              <a href={`tel:${store.phone}`} className={`nx-bold flex items-center justify-center gap-2 border border-[var(--nx-black)] py-3.5 text-[12px] uppercase tracking-[0.14em] text-[var(--nx-black)] ${pressInvert}`}>
                <Icon name="call" className="h-4 w-4" />
                Call store
              </a>
            </div>

            <button
              type="button"
              onClick={() => setContactOpen((o) => !o)}
              aria-expanded={contactOpen}
              aria-controls={contactId}
              className={`mt-4 flex w-full items-center justify-between gap-2 border-t border-[var(--nx-line)] pt-4 ${focusRing}`}
            >
              <span className={T_LABEL}>{contactOpen ? "Hide contact and tax info" : "View contact and tax info"}</span>
              <span className="grid h-8 w-8 place-items-center border border-[var(--nx-black)]">
                <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${contactOpen ? "rotate-180" : ""}`} />
              </span>
            </button>

            <Collapse open={contactOpen} id={contactId}>
              <div className="mt-3 border border-[var(--nx-line)]">
                <a href={`mailto:${store.email}`} className="flex items-center justify-between gap-3 border-b border-[var(--nx-line)] p-3.5 active:bg-[var(--nx-soft)]">
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon name="mail" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className={`block ${T_SMALL} text-[var(--nx-gray)]`}>Email support</span>
                      <span className={`${T_LABEL} block truncate`}>{store.email}</span>
                    </span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0" />
                </a>

                <a href={`tel:${store.phone}`} className="flex items-center justify-between gap-3 border-b border-[var(--nx-line)] p-3.5 active:bg-[var(--nx-soft)]">
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon name="phone" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className={`block ${T_SMALL} text-[var(--nx-gray)]`}>Store phone</span>
                      <span className={`${T_LABEL} block truncate tabular-nums`}>{store.phone}</span>
                    </span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0" />
                </a>

                <div className={`grid divide-x divide-[var(--nx-line)] ${store.gstin ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="p-3.5">
                    <p className={`flex items-center gap-1.5 ${T_SMALL} text-[var(--nx-gray)]`}>
                      <Icon name="user" className="h-3.5 w-3.5" /> Sales associate
                    </p>
                    <p className={`${T_LABEL} mt-1`}>{store.associate}</p>
                  </div>
                  {store.gstin && (
                    <div className="min-w-0 p-3.5">
                      <p className={`flex items-center gap-1.5 ${T_SMALL} text-[var(--nx-gray)]`}>
                        <Icon name="tax" className="h-3.5 w-3.5" /> GSTIN
                      </p>
                      <p className={`${T_LABEL} mt-1 truncate tabular-nums`} title={store.gstin}>
                        {store.gstin}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Collapse>
          </section>
        </div>

        {/* ---------- 9. Closing: marquee, invoice and date live here, once ---------- */}
        <footer ref={footerRef} className="mt-10">
          <div className="nx-grain relative overflow-hidden bg-[var(--nx-black)] pb-7 pt-0 text-white">
            <div aria-hidden="true" className="overflow-hidden border-b border-white/20 py-4">
              <div className="nx-marquee flex w-max">
                {[0, 1].map((k) => (
                  <span key={k} className="flex shrink-0 items-center gap-6 pr-6">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="flex items-center gap-6">
                        <span className="nx-bold text-[56px] uppercase leading-none tracking-[0.06em]" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.7)", color: "transparent" }}>
                          Thank you
                        </span>
                        <span className="text-[32px] leading-none text-white/40">/</span>
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative px-5 pt-7">
              <BrandImage
                src={logoSrc}
                alt="NEXT"
                width={320}
                height={80}
                className="h-7 w-auto max-w-[55%] object-contain object-left brightness-0 invert"
                fallbackClassName="nx-bold inline-block text-[24px] uppercase leading-none tracking-[0.34em] text-white"
              />
              <p className={`mt-4 ${T_BODY} text-[var(--nx-silver)]`}>For shopping with us. See you in store soon.</p>

              <dl className={`mt-5 space-y-2.5 border-t border-white/20 pt-4 ${T_CAPS} text-[var(--nx-silver)]`}>
                <Leader label="Invoice no" value={data.invoiceNo} strong className="[&_dd]:text-[14px] [&_dd]:normal-case [&_dd]:tracking-normal [&_dd]:text-white" />
                <Leader label="Date" value={data.date} strong className="[&_dd]:text-[14px] [&_dd]:normal-case [&_dd]:tracking-normal [&_dd]:text-white" />
              </dl>

              <div className="mt-4 border border-white/20 p-4">
                <h3 className={`${T_CAPS} nx-bold text-white`}>Registered office</h3>
                <p className={`mt-1.5 ${T_SMALL} text-white/75`}>{data.registeredOffice}</p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  aria-label="Back to top"
                  className={`nx-bold flex items-center gap-1.5 border border-white px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] text-white active:bg-white active:text-[var(--nx-black)] ${focusRing}`}
                >
                  Top <Icon name="arrow" className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-center gap-2.5 bg-white px-5 py-4 ${T_CAPS} text-[var(--nx-gray)]`}>
            <span>Powered by</span>
            <BrandImage src={rdepLogoSrc} alt="rdep" width={240} height={80} className="h-7 w-auto" fallbackClassName="text-lg font-bold tracking-tight text-[var(--nx-black)]" />
          </div>
        </footer>
      </main>

      {/* ---------------------------- Persistent section navigation ---------------------------- */}
      {!modal && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
          <div style={zoomStyle(scale)} className="w-[400px] px-2 pb-[max(8px,env(safe-area-inset-bottom))]">
            <nav aria-label="Receipt sections" className="nx-dock pointer-events-auto grid grid-cols-5 border border-white/20 bg-[#0A0A0A] text-white shadow-[0_18px_38px_-12px_rgba(0,0,0,0.65)]">
              {[
                { label: "Bill", icon: "history" as IconName, target: '[aria-label="Purchase summary"]' },
                { label: "Offers", icon: "ticket" as IconName, target: '[aria-label="Coupons"]' },
                { label: "+250", icon: "star" as IconName, target: '[aria-label="Rate your visit"]' },
                { label: "Profile", icon: "user" as IconName, target: '[aria-label="Your profile"]' },
                { label: "Store", icon: "pin" as IconName, target: '[aria-label="Store details"]' },
              ].map((item) => (
                <button key={item.label} type="button" onClick={() => document.querySelector(item.target)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex min-w-0 flex-col items-center justify-center gap-1 border-r border-white/15 px-1 py-2.5 text-[10px] uppercase tracking-[.08em] last:border-r-0 active:bg-white active:text-[var(--nx-black)]" aria-label={`Go to ${item.label}`}>
                  <Icon name={item.icon} className="h-[17px] w-[17px]" />
                  <span className="nx-bold">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ---------------------------- Transaction History Popup ---------------------------- */}
      {modal === "history" && (
        <Modal title="Transaction history" onClose={closeModal} scale={scale}>
          <div className="mb-4 flex items-center justify-between border border-[var(--nx-line)] p-4">
            <div>
              <p className={`${T_CAPS} text-[var(--nx-gray)]`}>Total receipts</p>
              <p className={`${T_LABEL} mt-1 text-[var(--nx-black)]`}>{history.length} recorded</p>
            </div>
            <div className="text-right">
              <p className={`${T_CAPS} text-[var(--nx-gray)]`}>Viewing</p>
              <p className={`${T_LABEL} mt-1 tabular-nums text-[var(--nx-black)]`}>#{data.invoiceNo.slice(-4)}</p>
            </div>
          </div>

          <ol className="space-y-2.5">
            {history.map((h) => (
              <li key={h.invoiceNo}>
                <div
                  className={`flex items-center justify-between gap-3 border p-4 transition-colors ${
                    h.current ? "border-[var(--nx-black)] bg-[var(--nx-black)] text-white" : "border-[var(--nx-line)] bg-white text-[var(--nx-black)] [@media(hover:hover)]:hover:border-[var(--nx-black)]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`${T_LABEL} tabular-nums`}>No. {h.invoiceNo}</span>
                      {h.current && <span className="nx-bold bg-white px-1.5 py-0.5 text-[12px] uppercase tracking-[0.1em] text-[var(--nx-black)]">Current</span>}
                    </div>
                    <p className={`mt-1 truncate ${T_SMALL} ${h.current ? "text-white/75" : "text-[var(--nx-gray)]"}`}>
                      {h.date} &middot; {h.storeName}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className={`${T_AMOUNT} block`}>₹{inr(h.amount)}</span>
                      <span className={`block ${T_SMALL} ${h.current ? "text-white/70" : "text-[var(--nx-gray)]"}`}>
                        {h.items} {h.items === 1 ? "piece" : "pieces"}
                      </span>
                    </div>

                    {!h.current && (
                      <button
                        type="button"
                        onClick={() => {
                          closeModal();
                          onSelect(h.invoiceNo);
                        }}
                        aria-label={`Open receipt ${h.invoiceNo}`}
                        className="grid h-10 w-10 shrink-0 place-items-center bg-[var(--nx-black)] text-white"
                      >
                        <Icon name="arrow" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Modal>
      )}

      {/* ---------------------------- QR Code Popup ---------------------------- */}
      {modal === "qr" && (
        <Modal title="Receipt QR code" onClose={closeModal} scale={scale}>
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-5 flex h-52 w-52 items-center justify-center border-2 border-[var(--nx-black)] bg-white p-4">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="Receipt QR code" className="h-full w-full object-contain" />
              ) : (
                <PlaceholderQR seed={data.invoiceNo} />
              )}
            </div>
            <p className={`${T_LABEL} tabular-nums text-[var(--nx-black)]`}>Invoice #{data.invoiceNo}</p>
            <p className={`mt-1 max-w-[280px] ${T_BODY}`}>Scan this code at the store counter for instant returns or inquiries.</p>
          </div>
        </Modal>
      )}

      {/* ---------------------------- Email Popup ---------------------------- */}
      {modal === "email" && (
        <Modal title="Email this receipt" onClose={closeModal} scale={scale}>
          <form
            className="space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!emailOk(email)) {
                setEmailErr("Enter a valid email address, like name@example.com.");
                return;
              }
              setEmailErr("");
              onSendEmail?.(email, data);
              setSentTo(email);
            }}
          >
            <label className="block">
              <span className={fieldLabel}>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setSentTo("");
                  setEmailErr("");
                  setEmail(e.target.value);
                }}
                className={fieldInput}
                autoComplete="email"
                aria-invalid={!!emailErr}
              />
              {emailErr && (
                <span role="alert" className={`${T_LABEL} mt-1.5 block text-[var(--nx-black)]`}>
                  {emailErr}
                </span>
              )}
            </label>
            <button type="submit" className={solidBtn}>
              Send receipt
            </button>
            <p aria-live="polite" className={sentTo ? `${T_LABEL} flex items-center justify-center gap-1.5 text-[var(--nx-black)]` : "sr-only"}>
              {sentTo && (
                <>
                  <Icon name="check" className="h-4 w-4" /> Receipt sent to {sentTo}
                </>
              )}
            </p>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------- main ------------------------------------------ */
export default function NextReceiptOption1({ data, receipts, onSelectReceipt, ...rest }: NextReceiptProps) {
  const list = useMemo(() => {
    const base = receipts ?? (data ? [data] : sampleNextReceipts);
    const merged = data && !base.some((r) => r.invoiceNo === data.invoiceNo) ? [data, ...base] : base;
    return [...merged].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [data, receipts]);

  const [currentId, setCurrentId] = useState(data?.invoiceNo ?? list[0].invoiceNo);
  const current = list.find((r) => r.invoiceNo === currentId) ?? list[0];

  const history = useMemo<HistoryRow[]>(
    () =>
      list.map((r) => {
        const t = totalsOf(r);
        return {
          invoiceNo: r.invoiceNo,
          date: r.date.split(" ")[0],
          storeName: r.store.name,
          amount: t.total,
          items: t.pieces,
          current: r.invoiceNo === current.invoiceNo,
        };
      }),
    [list, current.invoiceNo],
  );

  const select = useCallback(
    (invoiceNo: string) => {
      setCurrentId(invoiceNo);
      onSelectReceipt?.(invoiceNo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [onSelectReceipt],
  );

  return <ReceiptView key={current.invoiceNo} data={current} history={history} onSelect={select} {...rest} />;
}
