import { useState, useEffect, useRef, useCallback } from "react";
import svgPaths from "@/imports/GtinMatchingActiveEnrichment/svg-j9irx8okth";
import { imgProduct } from "@/lib/productImage";
import { supabase, type ConnectProduct } from "@/lib/supabase";
import dotLogo from "@/imports/DOT.svg";
import gdsnLogo from "@/imports/GDSN.svg";
import usdaLogo from "@/imports/USDA.svg";
import uniproLogo from "@/imports/Unipro.svg";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStrength = "High" | "Medium" | "Low";
type EnrichmentSource = string | null;
type PackagingLevel = string | null;

interface ProductInQueue {
  id: string;
  productTitle: string;
  productId: string;
  supplierName: string;
  brandName: string;
  mfrItemNumber: string;
  productLine: string;
}

type SearchResult = {
  id: string;
  connectProductId: string;
  universalProductId: string;
  title: string;
  supplier: string;
  brand: string;
  dotItemNumber: string;
  mfrItemNumber: string;
  matchStrength: MatchStrength;
  matchScore: number;
  rank: number;
  primaryEnrichmentSource: EnrichmentSource;
  availableSources: { code: string; name: string; display_order: number }[];
  gtins: { id: string; level: string; label: string; gtin: string }[];
  imageUrl: string | null;
  matchedFields: Record<string, unknown>;
};


function connectProductToQueue(p: ConnectProduct): ProductInQueue {
  return {
    id: p.id,
    productTitle: p.product_name,
    productId: p.product_id,
    supplierName: p.supplier_name ?? "",
    brandName: p.brand_name ?? "",
    mfrItemNumber: p.manufacturer_item_number ?? "",
    productLine: p.product_line ?? "",
  };
}

// ─── Food image lookup ────────────────────────────────────────────────────────
// Maps title keywords → Unsplash image URL. First matching entry wins — most specific first.
const FOOD_IMAGE_MAP: { keywords: string[]; url: string }[] = [
  // Bread / baked goods — must come before "burger" to avoid bun → burger photo
  { keywords: ["hamburger bun", "hot dog bun", "bun", "roll", "bread roll"], url: "https://images.unsplash.com/photo-1588861472194-6883d8b5e552?w=400" },
  { keywords: ["pretzel"],              url: "https://images.unsplash.com/photo-1509957879660-dd8846a0b43d?w=400" },
  { keywords: ["pancake", "waffle", "french toast"], url: "https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=400" },
  // Sausage / hot dog — before generic "chicken" / "pork"
  { keywords: ["corn dog"],             url: "https://images.unsplash.com/photo-1730305950206-92867127d632?w=400" },
  { keywords: ["hot dog", "frankfurter", "frank"], url: "https://images.unsplash.com/photo-1638368593249-7cadb261e8b3?w=400" },
  { keywords: ["sausage gravy"],        url: "https://images.unsplash.com/photo-1551135020-39e4ca508d9b?w=400" },
  { keywords: ["chicken sausage", "chkn saus"], url: "https://images.unsplash.com/photo-1551135020-39e4ca508d9b?w=400" },
  { keywords: ["turkey sausage"],       url: "https://images.unsplash.com/photo-1777199192504-85af37037fb6?w=400" },
  { keywords: ["sausage link", "sausage patty", "sausage"], url: "https://images.unsplash.com/photo-1691480241974-92481cef09ff?w=400" },
  // Appetizers / snacks
  { keywords: ["mozzarella stick", "mozzarella"],  url: "https://images.unsplash.com/photo-1778449665117-2c607bbc7415?w=400" },
  { keywords: ["onion ring"],           url: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400" },
  { keywords: ["nugget", "tender", "popcorn chicken"], url: "https://images.unsplash.com/photo-1619881590738-a111d176d906?w=400" },
  { keywords: ["chicken wing", "wing"],  url: "https://images.unsplash.com/photo-1619881590738-a111d176d906?w=400" },
  // Chicken — before generic "sandwich"
  { keywords: ["chicken sandwich"],     url: "https://images.unsplash.com/photo-1703219342329-fce8488cf443?w=400" },
  { keywords: ["chicken"],              url: "https://images.unsplash.com/photo-1551135020-39e4ca508d9b?w=400" },
  // Seafood
  { keywords: ["cod", "fish fillet", "breaded fillet", "battered fish"], url: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400" },
  { keywords: ["shrimp"],               url: "https://images.unsplash.com/photo-1628919350249-eb45d8829629?w=400" },
  { keywords: ["seafood"],              url: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400" },
  // Beef / pork — "burger" comes after "bun" so buns don't get burger photos
  { keywords: ["meatball"],             url: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400" },
  { keywords: ["burger", "hamburger", "ground beef", "patty"], url: "https://images.unsplash.com/photo-1448907503123-67254d59ca4f?w=400" },
  { keywords: ["beef", "steak", "brisket", "meatloaf"], url: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400" },
  { keywords: ["bacon"],                url: "https://images.unsplash.com/photo-1694983361629-0363ab0d1b49?w=400" },
  { keywords: ["pork", "ham"],          url: "https://images.unsplash.com/photo-1691480241974-92481cef09ff?w=400" },
  // Condiments / sauces — before generic "sauce"
  { keywords: ["bbq sauce", "barbecue sauce"], url: "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=400" },
  { keywords: ["hot sauce"],            url: "https://images.unsplash.com/photo-1700619773778-f02b45ca0616?w=400" },
  { keywords: ["salsa", "dip"],         url: "https://images.unsplash.com/photo-1648437595584-62d15da353b7?w=400" },
  { keywords: ["sauce", "ketchup", "mustard", "mayo", "dressing", "vinaigrette"], url: "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=400" },
  // Wraps / sandwiches
  { keywords: ["burrito", "wrap", "taco"], url: "https://images.unsplash.com/photo-1671572579845-52270341950f?w=400" },
  { keywords: ["sandwich", "sub", "hoagie"], url: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400" },
  // Pizza / pasta
  { keywords: ["pizza"],                url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" },
  { keywords: ["pasta", "noodle", "lasagna", "marinara"], url: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400" },
  { keywords: ["mac and cheese", "macaroni"], url: "https://images.unsplash.com/photo-1667499989723-c4ab9549d63c?w=400" },
  // Potato / sides
  { keywords: ["fries", "french fry", "potato wedge", "hash brown"], url: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400" },
  // Dairy / eggs
  { keywords: ["egg"],                  url: "https://images.unsplash.com/photo-1691480184494-d9f822edd4d1?w=400" },
  { keywords: ["mac and cheese", "cheese sauce", "cheese"], url: "https://images.unsplash.com/photo-1683314573422-649a3c6ad784?w=400" },
  { keywords: ["ice cream", "frozen dessert", "gelato"], url: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400" },
  // Soup / grains / veg
  { keywords: ["soup", "broth", "chowder", "bisque"], url: "https://images.unsplash.com/photo-1469307517101-0b99d8fb0c33?w=400" },
  { keywords: ["rice", "grain"],        url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400" },
  { keywords: ["vegetable", "veggie", "broccoli", "carrot", "corn", "pea", "green bean"], url: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400" },
  { keywords: ["salad"],                url: "https://images.unsplash.com/photo-1570197571499-166b36435e9f?w=400" },
  { keywords: ["turkey"],               url: "https://images.unsplash.com/photo-1777199192504-85af37037fb6?w=400" },
  { keywords: ["creamer", "coffee"],    url: "https://images.unsplash.com/photo-1518552782168-0396d0079475?w=400" },
];

// Brand name → food category keyword. Used when the product title is too generic.
const BRAND_FOOD_HINTS: { brand: string; keyword: string }[] = [
  { brand: "jones dairy",     keyword: "sausage" },
  { brand: "tgi friday",      keyword: "mozzarella stick" },
  { brand: "tyson",           keyword: "chicken" },
  { brand: "heinz",           keyword: "ketchup" },
  { brand: "frank's",         keyword: "hot sauce" },
  { brand: "franks",          keyword: "hot sauce" },
  { brand: "sweet baby ray",  keyword: "bbq sauce" },
  { brand: "mccormick",       keyword: "sauce" },
  { brand: "conagra",         keyword: "chicken" },
  { brand: "pilgrim",         keyword: "chicken" },
  { brand: "perdue",          keyword: "chicken" },
  { brand: "oscar mayer",     keyword: "hot dog" },
  { brand: "ball park",       keyword: "hot dog" },
  { brand: "jimmy dean",      keyword: "sausage" },
  { brand: "bob evans",       keyword: "sausage" },
  { brand: "hillshire",       keyword: "sausage" },
  { brand: "kraft",           keyword: "mac and cheese" },
  { brand: "stouffer",        keyword: "mac and cheese" },
  { brand: "ore-ida",         keyword: "fries" },
  { brand: "lamb weston",     keyword: "fries" },
  { brand: "mccain",          keyword: "fries" },
  { brand: "totino",          keyword: "pizza" },
  { brand: "digiorno",        keyword: "pizza" },
  { brand: "red baron",       keyword: "pizza" },
  { brand: "sara lee",        keyword: "bread roll" },
  { brand: "pepperidge",      keyword: "bread roll" },
  { brand: "martin's",        keyword: "hamburger bun" },
  { brand: "old el paso",     keyword: "taco" },
  { brand: "el monterey",     keyword: "burrito" },
  { brand: "dole",            keyword: "vegetable" },
  { brand: "birds eye",       keyword: "vegetable" },
  { brand: "green giant",     keyword: "corn" },
];

// Simple string hash → index, for consistent fallback when no keyword matches
function hashToIndex(s: string, len: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

function getFoodImage(title: string, dbImageUrl: string | null, _usedUrls: Set<string> = new Set(), brand = ""): string {
  const realUrl = dbImageUrl && !dbImageUrl.includes("picsum") ? dbImageUrl : null;
  if (realUrl) return realUrl;

  const lower = title.toLowerCase();
  const lowerBrand = brand.toLowerCase();

  // 1. Title keyword match — always wins, accuracy over deduplication
  for (const entry of FOOD_IMAGE_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.url;
  }

  // 2. Brand hint fallback
  for (const hint of BRAND_FOOD_HINTS) {
    if (lowerBrand.includes(hint.brand) || lower.includes(hint.brand)) {
      for (const entry of FOOD_IMAGE_MAP) {
        if (entry.keywords.some((kw) => hint.keyword.includes(kw) || kw.includes(hint.keyword))) return entry.url;
      }
    }
  }

  // 3. Deterministic fallback — same product always gets the same image
  return FOOD_IMAGE_MAP[hashToIndex(title, FOOD_IMAGE_MAP.length)].url;
}

// ─── Match scoring ────────────────────────────────────────────────────────────
// Computes a 0-100 score by comparing universal product fields against the
// active connect product. Weights reflect field specificity:
//   title (40 scaled) > mfrItemNumber (35) > dotItemNumber (20) > brand (15) > supplier (10)
// Thresholds: High ≥ 50 | Medium ≥ 20 | Low < 20

// Words that appear in many product titles but carry no product identity signal
const TITLE_STOP_WORDS = new Set([
  // Packaging units
  "per", "case", "pack", "each", "pallet", "count", "box", "bag", "tray", "pouch",
  "sleeve", "carton", "container", "bottle", "jar", "can", "wrap",
  // Measurements
  "oz", "lb", "lbs", "g", "kg", "ml", "fl", "ct", "pc", "pk", "gal", "qt", "pt",
  // Generic descriptors that don't identify a food category
  "premium", "classic", "original", "fresh", "natural", "organic", "value",
  "mini", "family", "bulk", "single", "serve", "select", "style", "type",
  "size", "large", "small", "medium", "extra", "super", "new",
  // Filler words
  "with", "and", "the", "for", "in", "of", "variety", "assorted", "mix",
]);

// Tokenize a title into meaningful content words only.
// Strips punctuation, 1-char tokens, pure numbers (sizes like "1.4", "10"),
// and packaging/measurement stop words so that "1.4 OZ, 10 Per Case" doesn't
// create false overlaps between unrelated products.
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\W+/)
    .filter(
      (w) =>
        w.length > 1 &&
        !TITLE_STOP_WORDS.has(w) &&
        !/^\d+(\.\d+)?$/.test(w),
    );
}

// Ratio of connectTitle words found in universalTitle (0–1).
// "beer battered cod" vs "classic beer battered cod fillets" → 3/3 = 1.0
function titleWordOverlap(connectTitle: string, universalTitle: string): number {
  const connectWords = tokenize(connectTitle);
  if (connectWords.length === 0) return 0;
  const universalSet = new Set(tokenize(universalTitle));
  const matches = connectWords.filter((w) => universalSet.has(w)).length;
  return matches / connectWords.length;
}

// Filter predicate: does this universal title fuzzy-match the connect title?
// Requires at least 1 shared significant (non-stop) word — e.g. "cheese", "beef", "chicken".
// This keeps category-level matches while still filtering out completely unrelated products.
function titleFuzzyMatch(connectTitle: string, universalTitle: string): boolean {
  if (!connectTitle || !universalTitle) return false;
  const connectWords = tokenize(connectTitle);
  if (connectWords.length === 0) return true;
  const universalSet = new Set(tokenize(universalTitle));
  return connectWords.some((w) => universalSet.has(w));
}

function scoreResult(product: ProductInQueue, result: SearchResult): { score: number; strength: MatchStrength } {
  const eq = (a: string, b: string) =>
    !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

  let raw = 0;
  // Title: highest weight, scaled 0–40 by word-overlap ratio
  if (product.productTitle && result.title) {
    const overlap = titleWordOverlap(product.productTitle, result.title);
    raw += Math.round(overlap * 40);
  }
  if (eq(product.mfrItemNumber, result.mfrItemNumber)) raw += 35;
  if (eq(product.productId, result.dotItemNumber)) raw += 20;
  if (eq(product.brandName, result.brand)) raw += 15;
  if (eq(product.supplierName, result.supplier)) raw += 10;

  const score = Math.round((raw / 120) * 100);

  // If both titles have meaningful tokens but none overlap, cap at Low
  // regardless of how well brand/supplier match.
  const connectTokens = tokenize(product.productTitle ?? "");
  const noTitleOverlap =
    connectTokens.length > 0 &&
    tokenize(result.title).length > 0 &&
    titleWordOverlap(product.productTitle ?? "", result.title) === 0;

  const strength: MatchStrength =
    noTitleOverlap ? "Low" : score >= 50 ? "High" : score >= 20 ? "Medium" : "Low";
  return { score, strength };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectLogo() {
  return (
    <div className="h-[44px] w-[44px] shrink-0 relative">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 44 44">
        <rect fill="#007BC7" height="44" rx="22" width="44" />
        <path d={svgPaths.p37734780} fill="white" />
      </svg>
    </div>
  );
}

function NavIcon({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col gap-[2px] items-center justify-center py-2 w-full overflow-hidden transition-colors ${active ? "text-[#007BC7]" : "text-black/60 hover:text-black/80"}`}>
      {icon}
      <span className="text-[10px] leading-[14px] font-['Roboto',sans-serif]">{label}</span>
    </button>
  );
}

function SideNav({ activeNav, onProducts }: { activeNav: string; onProducts?: () => void }) {
  return (
    <div className="bg-[#f5f5f5] shrink-0 w-[64px] flex flex-col items-start py-4 gap-4 h-full border-r border-[#e0e0e0]">
      <div className="flex items-center justify-center w-full px-[10px]">
        <ConnectLogo />
      </div>
      <nav className="flex flex-col items-center w-full px-2 gap-0">
        <NavIcon
          active={activeNav === "home"}
          icon={
            <svg className="size-6" fill="none" viewBox="0 0 24 24">
              <path d={svgPaths.p11aa2f00} fill="currentColor" />
            </svg>
          }
          label="Home"
        />
        <div onClick={onProducts} className="w-full">
        <NavIcon
          active={activeNav === "products"}
          icon={
            <svg className="size-6" fill="none" viewBox="0 0 24 24">
              <path d="M8 10H4V14H8V10Z" fill="currentColor" />
              <path d="M14 10H10V14H14V10Z" fill="currentColor" />
              <path d={svgPaths.p1742ec00} fill="currentColor" />
              <path d="M8 4H4V8H8V4Z" fill="currentColor" />
              <path d="M14 4H10V8H14V4Z" fill="currentColor" />
            </svg>
          }
          label="Products"
        />
        </div>
        <NavIcon
          active={activeNav === "settings"}
          icon={
            <svg className="size-6" fill="none" viewBox="0 0 24 24">
              <path d={svgPaths.p306d88f0} fill="currentColor" />
            </svg>
          }
          label="Settings"
        />
        <NavIcon
          active={activeNav === "help"}
          icon={
            <svg className="size-6" fill="none" viewBox="0 0 24 24">
              <path d={svgPaths.p2eda3e70} fill="currentColor" />
            </svg>
          }
          label="Help"
        />
      </nav>
    </div>
  );
}

function MatchStrengthBadge({ strength }: { strength: MatchStrength }) {
  const colors: Record<MatchStrength, string> = {
    High: "bg-[#2e7d32]",
    Medium: "bg-[#ef6c00]",
    Low: "bg-[#d32f2f]",
  };
  return (
    <div className={`${colors[strength]} text-white text-[13px] font-['Roboto',sans-serif] leading-[18px] tracking-[0.16px] px-1.5 py-[3px] rounded-[4px] w-[72px] text-center`}>
      {strength}
    </div>
  );
}

const SOURCE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  DOT_MASTERED: { label: "DOT",   color: "#014361", bg: "#e5f6fd" },
  DOT:          { label: "DOT",   color: "#014361", bg: "#e5f6fd" },
  GDSN:         { label: "GDSN",  color: "#1a5e20", bg: "#e8f5e9" },
  USDA:         { label: "USDA",  color: "#7b1fa2", bg: "#f3e5f5" },
  UNIPRO:       { label: "UNIPRO",color: "#e65100", bg: "#fff3e0" },
};

const SOURCE_LOGO: Record<string, string> = {
  DOT_MASTERED: dotLogo,
  DOT:          dotLogo,
  GDSN:         gdsnLogo,
  USDA:         usdaLogo,
  UNIPRO:       uniproLogo,
};

function EnrichmentBadge({ source }: { source: EnrichmentSource }) {
  if (!source) {
    return (
      <div className="border border-[#e0e0e0] rounded-[4px] w-[72px] h-[52px] flex flex-col items-center justify-center gap-1 px-1">
        <p className="text-[8.7px] font-['Roboto',sans-serif] font-medium text-[#bdbdbd] uppercase tracking-[0.72px] text-center">Enrichment</p>
        <p className="text-[10px] font-['Roboto',sans-serif] font-medium text-[#bdbdbd] uppercase tracking-[0.14px] text-center leading-tight">No Source</p>
      </div>
    );
  }

  const logo = SOURCE_LOGO[source];

  return (
    <div className="rounded-[4px] w-[72px] h-[52px] flex flex-col items-center justify-center gap-1 px-2" style={{ backgroundColor: "#1976D2" }}>
      <p className="text-[8px] font-['Roboto',sans-serif] font-medium text-white uppercase tracking-[0.72px] text-center">
        Enrichment
      </p>
      {logo ? (
        <img src={logo} alt={source} className="w-full object-contain" style={{ maxHeight: 22, filter: "brightness(0) invert(1)" }} />
      ) : (
        <p className="text-[11px] font-['Roboto',sans-serif] font-bold text-white text-center leading-tight">{source}</p>
      )}
    </div>
  );
}

function PackagingButton({
  level,
  gtin,
  selected,
  onClick,
}: {
  level: string;
  gtin: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex gap-1.5 items-center px-2 py-2 rounded-[4px] border transition-colors ${
        selected
          ? "bg-[#007bc7] border-[rgba(25,118,210,0.5)] text-white"
          : "bg-white border-[rgba(25,118,210,0.5)] text-[#007bc7] hover:bg-blue-50"
      }`}
    >
      {selected ? (
        <svg className="size-[15px] shrink-0" fill="none" viewBox="0 0 15 15">
          <path d={svgPaths.pcdaa200} fill="white" />
        </svg>
      ) : (
        <svg className="size-[15px] shrink-0 opacity-70" fill="none" viewBox="0 0 15 15">
          <path d={svgPaths.p7fafe80} fill="#007BC7" />
        </svg>
      )}
      <span className="text-[12px] leading-[1.66] font-['Roboto',sans-serif] tracking-[0.4px]">{level}</span>
      <span className="text-[12px] leading-[1.66] font-['Roboto',sans-serif] tracking-[0.4px]">{gtin}</span>
    </button>
  );
}

function ImageViewer({ imageUrl, title }: { imageUrl?: string | null; title?: string }) {
  return (
    <div className="flex flex-col gap-2 items-start justify-center rounded-[4px] self-stretch shrink-0">
      <div className="aspect-square w-[80px] rounded-[4px] relative overflow-hidden bg-[#eee]">
        <img alt="Product" className="absolute inset-0 w-full h-full object-cover" src={imageUrl || imgProduct} onError={(e) => { (e.target as HTMLImageElement).src = imgProduct; }} />
      </div>
      <div className="flex gap-1 items-center justify-center w-full">
        <button className="size-6 rounded-full border border-[rgba(0,123,199,0.7)] flex items-center justify-center hover:bg-blue-50 transition-colors">
          <svg className="w-2 h-3" fill="none" viewBox="0 0 7.41 12">
            <path d={svgPaths.p10001380} fill="#007BC7" fillOpacity="0.7" />
          </svg>
        </button>
        <button className="size-6 rounded-full border border-[rgba(0,123,199,0.7)] flex items-center justify-center hover:bg-blue-50 transition-colors">
          <svg className="w-2 h-3" fill="none" viewBox="0 0 7.41 12">
            <path d={svgPaths.p25284240} fill="#007BC7" fillOpacity="0.7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PastOrderIcon() {
  return (
    <svg className="size-[18px] shrink-0" fill="none" viewBox="0 0 14.25 15">
      <path d={svgPaths.p21beb900} fill="#9C27B0" />
      <path clipRule="evenodd" d={svgPaths.pa6b8d00} fill="#9C27B0" fillRule="evenodd" />
      <path d={svgPaths.p316b5a00} fill="#9C27B0" />
      <path d={svgPaths.p1555c700} fill="#9C27B0" />
      <path d={svgPaths.p1d53c400} fill="#9C27B0" />
    </svg>
  );
}

function ResultRow({
  result,
  isSelected,
  selectedPackaging,
  onSelect,
  onPackagingSelect,
}: {
  result: SearchResult;
  isSelected: boolean;
  selectedPackaging: PackagingLevel;
  onSelect: () => void;
  onPackagingSelect: (level: PackagingLevel) => void;
  packagingSelections?: Record<string, PackagingLevel>;
}) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-[4px] border border-[#e0e0e0] cursor-pointer transition-colors ${
        isSelected ? "border-[#e0e0e0]" : "border-[#e0e0e0]"
      }`}
      style={isSelected ? { backgroundImage: "linear-gradient(90deg, rgba(25, 118, 210, 0.08) 0%, rgba(25, 118, 210, 0.08) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" } : { background: "white" }}
    >
      <div className="flex gap-8 items-start p-4">
        <div className="flex flex-1 gap-4 items-start min-w-0">
          <ImageViewer imageUrl={result.imageUrl} title={result.title} />
          <div className="flex flex-1 flex-col gap-2 items-start min-w-0">
            <div className="flex flex-col items-start w-full">
              <p className="text-[16px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.87)] leading-[1.5] tracking-[0.15px] line-clamp-2">
                {result.title}{" "}
                <button className="text-[#007bc7] text-[14px] underline tracking-[0.17px] hover:opacity-80">More Info</button>
              </p>
              <p className="text-[12px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.87)] tracking-[0.4px] whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                <strong>Supplier</strong> {result.supplier} • <strong>Brand</strong> {result.brand}
              </p>
              <div className="flex gap-1 items-center">
                <p className="text-[12px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.87)] tracking-[0.4px] whitespace-nowrap">
                  {result.dotItemNumber && <><strong>Dot</strong> {result.dotItemNumber} • </>}
                  {result.mfrItemNumber && <><strong>Mfr</strong> {result.mfrItemNumber} •</>}
                </p>
                {result.dotItemNumber && (
                  <div className="flex gap-0.5 items-center">
                    <PastOrderIcon />
                    <p className="text-[12px] font-['Roboto',sans-serif] text-[#9c27b0] tracking-[0.4px] whitespace-nowrap">
                      <strong>Dot Item</strong> {result.dotItemNumber}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-center pt-0" onClick={(e) => e.stopPropagation()}>
              {result.gtins.map((g) => (
                <PackagingButton
                  key={g.level}
                  gtin={g.gtin}
                  level={g.level}
                  selected={selectedPackaging === (g.level as PackagingLevel)}
                  onClick={() => onPackagingSelect(selectedPackaging === (g.level as PackagingLevel) ? null : (g.level as PackagingLevel))}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-start self-stretch shrink-0 w-[72px]">
          <MatchStrengthBadge strength={result.matchStrength} />
          <EnrichmentBadge source={result.primaryEnrichmentSource} />
        </div>
      </div>
    </div>
  );
}

function FilterCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex gap-1 items-start py-0.5 cursor-pointer w-full">
      <div className="flex items-center mt-px shrink-0" onClick={() => onChange(!checked)}>
        {checked ? (
          <svg className="size-5" fill="none" viewBox="0 0 15 15">
            <path d={svgPaths.pcdaa200} fill="#1976D2" />
          </svg>
        ) : (
          <svg className="size-5" fill="none" viewBox="0 0 15 15">
            <path d={svgPaths.p7fafe80} fill="black" fillOpacity="0.56" />
          </svg>
        )}
      </div>
      <span className="text-[14px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.6)] tracking-[0.17px] leading-[1.43] select-none">
        {label}
      </span>
    </label>
  );
}

function FilterTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[4.5px] w-full">
      <input
        className="text-[16px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.6)] tracking-[0.15px] leading-6 bg-transparent w-full outline-none border-0 border-b border-dashed border-black/40 focus:border-solid focus:border-[#1976d2] pb-px"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function AccordionSection({
  title,
  badge,
  onClearBadge,
}: {
  title: string;
  badge?: string;
  onClearBadge?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-[4px] border border-[#e0e0e0] w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
        className="flex gap-1 items-start px-4 py-2 w-full text-left cursor-pointer"
      >
        <div className="flex flex-1 gap-2 items-center min-w-0">
          <span className="text-[14px] font-['Roboto',sans-serif] font-medium text-black tracking-[0.1px] leading-[1.57]">{title}</span>
          {badge && (
            <div className="flex items-center border border-[#e0e0e0] rounded-[4px] px-1 py-[3px] max-h-6">
              <span className="text-[12px] font-['Roboto',sans-serif] font-medium text-[#007bc7] leading-5 px-1.5">{badge}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onClearBadge?.(); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClearBadge?.(); } }}
                className="hover:opacity-70 cursor-pointer"
              >
                <svg className="size-4" fill="none" viewBox="0 0 9.33 9.33">
                  <path d={svgPaths.p3599e800} fill="#007BC7" />
                </svg>
              </span>
            </div>
          )}
        </div>
        <svg className={`size-6 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 12 7.41">
          <path d={svgPaths.p180a8a80} fill="black" fillOpacity="0.54" />
        </svg>
      </div>
      {open && (
        <div className="px-4 pb-3 text-[14px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.6)]">
          <p>No items to display.</p>
        </div>
      )}
    </div>
  );
}



type ListingProduct = ConnectProduct & {
  selected_enrichment_source_id?: string | null;
  assigned_universal_product_id?: string | null;
  assigned_identifier_id?: string | null;
};

type QuickCandidate = {
  id: string;
  canonical_title: string;
  canonical_brand_name: string | null;
  canonical_manufacturer_name: string | null;
  canonical_manufacturer_item_number: string | null;
  dot_item_number: string | null;
  primary_image_url: string | null;
  product_identifiers: {
    id: string;
    identifier_value: string;
    packaging_level_code: string;
    display_label: string | null;
    is_primary: boolean;
  }[];
};

function ProductsPage({ onOpenAdvanced }: { onOpenAdvanced: (productId: string) => void }) {
  const [products, setProducts] = useState<ListingProduct[]>([]);
  const [sources, setSources] = useState<Record<string, { code: string; name: string }>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [activeProduct, setActiveProduct] = useState<ListingProduct | null>(null);
  const [gtinQuery, setGtinQuery] = useState("");
  const [candidates, setCandidates] = useState<QuickCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pageSize = 15;

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const [{ data: productData, error }, { data: sourceData }] = await Promise.all([
      supabase.from("connect_products").select("*").order("updated_at", { ascending: false }),
      supabase.from("enrichment_sources").select("id, code, name"),
    ]);
    if (error) {
      setNotice(error.message);
    } else {
      setProducts((productData ?? []) as ListingProduct[]);
    }
    const map: Record<string, { code: string; name: string }> = {};
    for (const row of sourceData ?? []) map[row.id] = { code: row.code, name: row.name };
    setSources(map);
    setLoadingProducts(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!activeProduct || gtinQuery.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const term = gtinQuery.trim();
      const { data } = await supabase
        .from("universal_products")
        .select("id, canonical_title, canonical_brand_name, canonical_manufacturer_name, canonical_manufacturer_item_number, dot_item_number, primary_image_url")
        .or(`canonical_title.ilike.%${term}%,canonical_brand_name.ilike.%${term}%,canonical_manufacturer_name.ilike.%${term}%,canonical_manufacturer_item_number.ilike.%${term}%,dot_item_number.ilike.%${term}%`)
        .limit(3);
      const base = (data ?? []) as Omit<QuickCandidate, "product_identifiers">[];
      if (!base.length) {
        setCandidates([]);
        setSearching(false);
        return;
      }
      const ids = base.map((r) => r.id);
      const { data: identifiers } = await supabase
        .from("product_identifiers")
        .select("id, universal_product_id, identifier_value, packaging_level_code, display_label, is_primary")
        .in("universal_product_id", ids)
        .eq("identifier_type", "GTIN");
      setCandidates(base.map((row) => ({
        ...row,
        product_identifiers: (identifiers ?? [])
          .filter((i) => i.universal_product_id === row.id)
          .sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
      })));
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [gtinQuery, activeProduct]);

  const filtered = products.filter((p) => {
    const text = `${p.product_id} ${p.supplier_name ?? ""} ${p.product_name} ${p.assigned_gtin ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const assignQuickMatch = async (candidate: QuickCandidate) => {
    if (!activeProduct) return;
    const identifier = candidate.product_identifiers[0];
    if (!identifier) {
      setNotice("This product does not have a GTIN identifier.");
      return;
    }
    const { error } = await supabase
      .from("connect_products")
      .update({
        assigned_universal_product_id: candidate.id,
        assigned_identifier_id: identifier.id,
        assigned_gtin: identifier.identifier_value,
        assigned_packaging_level: identifier.packaging_level_code,
        gtin_status: "ASSIGNED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeProduct.id);
    if (error) {
      setNotice(error.message);
      return;
    }
    setNotice(`GTIN ${identifier.identifier_value} assigned.`);
    setActiveProduct(null);
    setGtinQuery("");
    await loadProducts();
  };

  return (
    <div className="min-h-screen bg-white font-['Roboto',sans-serif] flex">
      {notice && <div className="fixed right-5 top-5 z-[100] rounded bg-[#323232] px-4 py-3 text-sm text-white shadow-lg">{notice}</div>}
      <SideNav activeNav="products" />
      <main className="min-w-0 flex-1 bg-[#fafafa]">
        <header className="h-16 border-b border-[#e0e0e0] bg-white px-6 flex items-center shadow-sm">
          <div className="flex-1 text-xs text-black/70">Home <span className="px-2 text-black/40">/</span> Products</div>
          <div className="flex items-center gap-4"><span className="text-black/50">?</span><div className="size-7 rounded-full bg-[#bdbdbd] text-white text-xs flex items-center justify-center">KB</div></div>
        </header>
        <section className="p-6">
          <div className="rounded border border-[#e0e0e0] bg-white shadow-sm">
            <div className="h-[74px] px-4 flex items-center border-b border-[#e0e0e0]">
              <h1 className="text-2xl text-black/90 flex-1">Products</h1>
              <button className="rounded bg-[#1976d2] px-4 py-2 text-sm font-medium uppercase tracking-wide text-white">Add Product</button>
            </div>
            <div className="p-4">
              <div className="h-10 flex items-center gap-3 mb-0">
                <div className="relative w-[360px]">
                  <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search Products" className="h-10 w-full rounded border border-[#cfcfcf] pl-10 pr-3 text-sm outline-none focus:border-[#1976d2]" />
                  <span className="absolute left-3 top-2.5 text-black/45">⌕</span>
                </div>
                <button className="h-10 rounded border border-[#cfcfcf] px-4 text-sm text-black/70">Filters</button>
                <div className="flex-1" />
                <span className="text-sm text-black/55">{filtered.length} products</span>
              </div>

              <div className="relative overflow-visible border border-[#e0e0e0]">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead className="bg-[#f5f5f5] text-left text-xs font-medium text-black/70">
                    <tr className="h-14">
                      <th className="w-[13%] px-3">PRODUCT ID</th>
                      <th className="w-[16%] px-3">SUPPLIER</th>
                      <th className="w-[30%] px-3">NAME</th>
                      <th className="w-[18%] px-3">GTIN</th>
                      <th className="w-[13%] px-3">ENRICHMENT</th>
                      <th className="w-[10%] px-3">UPDATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProducts ? (
                      <tr><td colSpan={6} className="h-40 text-center text-black/50">Loading products…</td></tr>
                    ) : visible.map((product) => {
                      const source = product.selected_enrichment_source_id ? sources[product.selected_enrichment_source_id] : null;
                      const isOpen = activeProduct?.id === product.id;
                      return (
                        <tr key={product.id} className="h-[52px] border-t border-[#e0e0e0] hover:bg-[#fafafa]">
                          <td className="px-3 font-medium text-[#1976d2]">{product.product_id}</td>
                          <td className="px-3 truncate">{product.supplier_name || "—"}</td>
                          <td className="px-3 truncate">{product.product_name}</td>
                          <td className="relative px-3">
                            {product.assigned_gtin ? (
                              <button onClick={() => { setActiveProduct(product); setGtinQuery(product.assigned_gtin || ""); }} className="text-[#1976d2] underline underline-offset-2">{product.assigned_gtin}</button>
                            ) : (
                              <button onClick={() => { setActiveProduct(product); setGtinQuery(product.product_name); }} className="font-medium text-[#1976d2] underline underline-offset-2">&lt;Add GTIN&gt;</button>
                            )}
                            {isOpen && (
                              <div className="absolute right-0 top-10 z-50 w-[476px] rounded border border-[#ddd] bg-white p-4 shadow-xl">
                                <div className="flex border-b border-[#e0e0e0] mb-3">
                                  <button className="border-b-2 border-[#1976d2] px-4 py-2 text-sm font-medium text-[#1976d2]">GTIN</button>
                                  <button className="px-4 py-2 text-sm text-black/55">UPC</button>
                                  <button onClick={() => { setActiveProduct(null); setGtinQuery(""); }} className="ml-auto px-2 text-black/50">×</button>
                                </div>
                                <input autoFocus value={gtinQuery} onChange={(e) => setGtinQuery(e.target.value)} className="h-10 w-full rounded border border-[#cfcfcf] px-3 text-sm outline-none focus:border-[#1976d2]" placeholder="Type GTIN, item number, product, supplier, or brand" />
                                <div className="mt-3 min-h-[88px]">
                                  {searching ? <div className="py-6 text-center text-sm text-black/50">Searching…</div> : candidates.map((candidate) => {
                                    const identifier = candidate.product_identifiers[0];
                                    return (
                                      <button key={candidate.id} onClick={() => assignQuickMatch(candidate)} className="flex w-full gap-3 border-b border-[#eee] p-3 text-left hover:bg-[#f7fbff]">
                                        <img src={candidate.primary_image_url || imgProduct} className="size-12 rounded object-cover bg-[#eee]" onError={(e) => { (e.currentTarget as HTMLImageElement).src = imgProduct; }} />
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-sm font-medium text-black/85">{candidate.canonical_title}</div>
                                          <div className="mt-1 truncate text-xs text-black/55">GTIN {identifier?.identifier_value || "—"} · Dot {candidate.dot_item_number || "—"} · Mfr {candidate.canonical_manufacturer_item_number || "—"}</div>
                                          <div className="truncate text-xs text-black/55">{candidate.canonical_manufacturer_name || "—"} · {candidate.canonical_brand_name || "—"}</div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                  {!searching && gtinQuery.trim().length >= 2 && candidates.length === 0 && <div className="py-6 text-center text-sm text-black/50">No matches found</div>}
                                </div>
                                <button onClick={() => onOpenAdvanced(product.id)} className="mt-3 text-sm font-medium text-[#1976d2] hover:underline">Advanced GTIN Search</button>
                              </div>
                            )}
                          </td>
                          <td className="px-3">{source ? <span className="inline-flex rounded bg-[#e5f6fd] px-2 py-1 text-xs font-medium text-[#014361]">{source.name}</span> : <span className="text-black/35">—</span>}</td>
                          <td className="px-3 text-xs text-black/55">{new Date(product.updated_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="h-11 border-t border-[#e0e0e0] px-3 flex items-center justify-end gap-4 text-sm text-black/60">
                  <span>Rows per page: {pageSize}</span>
                  <span>{filtered.length ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span>
                  <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="disabled:opacity-30">‹</button>
                  <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} className="disabled:opacity-30">›</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

interface FilterState {
  productTitle: boolean;
  productId: boolean;
  gtin: boolean;
  upc: boolean;
  supplierId: boolean;
  supplierName: boolean;
  brandName: boolean;
  productLine: boolean;
}

function GtinSearchPage({ onBack }: { onBack: () => void }) {
  const [productsQueue, setProductsQueue] = useState<ProductInQueue[]>([]);
  const [allUniversalResults, setAllUniversalResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [productIndex, setProductIndex] = useState(0);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  const [packagingSelections, setPackagingSelections] = useState<Record<string, PackagingLevel>>({});
  const [preserveSelections, setPreserveSelections] = useState(false);
  const [searchWithin, setSearchWithin] = useState("");
  const [sortBy, setSortBy] = useState<"match_strength" | "supplier" | "brand">("match_strength");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [allergenBadge, setAllergenBadge] = useState<string | undefined>("1 Selected");
  const [notification, setNotification] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredResultsRef = useRef<SearchResult[]>([]);
  const currentProduct = productsQueue[productIndex];

  // Fetch product queue on mount
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("connect_products")
        .select("*")
        .order("product_id");
      if (error) {
        setDbError(error.message);
        setLoading(false);
        return;
      }
      const queue = (data as ConnectProduct[]).map(connectProductToQueue);
      setProductsQueue(queue);
      const savedId = localStorage.getItem("dot_connect_product_id");
      if (savedId) {
        const idx = queue.findIndex((p) => p.id === savedId);
        if (idx !== -1) setProductIndex(idx);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  // Fetch all universal products once on mount (3 separate queries, merged client-side)
  useEffect(() => {
    async function fetchAllUniversal() {
      // 1. Base universal products
      const { data: upData, error: upError } = await supabase
        .from("universal_products")
        .select("id, canonical_title, canonical_brand_name, canonical_manufacturer_name, canonical_manufacturer_item_number, dot_item_number, primary_image_url")
        .limit(10000);
      if (upError) { console.error("[fetchAllUniversal] upError:", upError); setDbError(upError.message); return; }
      if (!upData || upData.length === 0) return;

      // 2. GTINs — paginate to bypass server row cap
      const allPiData: { id: string; universal_product_id: string; packaging_level_code: string; display_label: string; identifier_value: string }[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data: page, error: piError } = await supabase
          .from("product_identifiers")
          .select("id, universal_product_id, packaging_level_code, display_label, identifier_value")
          .eq("identifier_type", "GTIN")
          .range(from, from + PAGE - 1);
        if (piError || !page) break;
        allPiData.push(...page);
        if (page.length < PAGE) break;
      }
      const piData = allPiData;

      // 3. Enrichment sources via source_product_records → enrichment_sources (paginated)
      const allSprData: { id: string; universal_product_id: string; enrichment_source_id: string }[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data: page } = await supabase
          .from("source_product_records")
          .select("id, universal_product_id, enrichment_source_id")
          .range(from, from + PAGE - 1);
        if (!page) break;
        allSprData.push(...page);
        if (page.length < PAGE) break;
      }
      const sprData = allSprData;
      const { data: esData, error: esError } = await supabase
        .from("enrichment_sources")
        .select("id, code, name, display_order");
      console.log("[fetchAllUniversal] enrichment_sources:", esData?.length, "error:", esError?.message);
      console.log("[fetchAllUniversal] source_product_records:", sprData.length, "sample:", sprData.slice(0, 3));
      if (esData?.length) console.log("[fetchAllUniversal] esData sample:", esData.slice(0, 5));

      // Build lookup maps
      const gtinsByProduct: Record<string, { id: string; level: string; label: string; gtin: string }[]> = {};
      for (const pi of (piData ?? [])) {
        if (!gtinsByProduct[pi.universal_product_id]) gtinsByProduct[pi.universal_product_id] = [];
        gtinsByProduct[pi.universal_product_id].push({ id: pi.id, level: pi.packaging_level_code, label: pi.display_label, gtin: pi.identifier_value });
      }

      const esMap: Record<string, { id: string; code: string; name: string; display_order: number }> = {};
      for (const es of (esData ?? [])) esMap[es.id] = es;

      const sourcesByProduct: Record<string, { code: string; name: string; display_order: number }[]> = {};
      for (const spr of (sprData ?? [])) {
        const es = esMap[spr.enrichment_source_id];
        if (!es) continue;
        if (!sourcesByProduct[spr.universal_product_id]) sourcesByProduct[spr.universal_product_id] = [];
        if (!sourcesByProduct[spr.universal_product_id].find(s => s.code === es.code)) {
          sourcesByProduct[spr.universal_product_id].push({ code: es.code, name: es.name, display_order: es.display_order });
        }
      }

      const mapped = (upData as { id: string; canonical_title: string; canonical_brand_name: string | null; canonical_manufacturer_name: string | null; canonical_manufacturer_item_number: string | null; dot_item_number: string | null; primary_image_url: string | null }[]).map((up) => {
        const sources = (sourcesByProduct[up.id] ?? []).sort((a, b) => a.display_order - b.display_order);
        return {
          id: up.id,
          connectProductId: "",
          universalProductId: up.id,
          title: up.canonical_title,
          supplier: up.canonical_manufacturer_name ?? "",
          brand: up.canonical_brand_name ?? "",
          dotItemNumber: up.dot_item_number ?? "",
          mfrItemNumber: up.canonical_manufacturer_item_number ?? "",
          matchStrength: "Low" as MatchStrength,
          matchScore: 0,
          rank: 0,
          availableSources: sources,
          primaryEnrichmentSource: sources[0]?.code ?? null,
          gtins: gtinsByProduct[up.id] ?? [],
          imageUrl: up.primary_image_url,
          matchedFields: {},
        } satisfies SearchResult;
      });

      setAllUniversalResults(mapped);
    }
    fetchAllUniversal();
  }, []);

  // Reset selection when product changes
  useEffect(() => {
    if (!currentProduct) return;
    setSelectedResultIndex(null);
  }, [currentProduct?.id]);

  const [filters, setFilters] = useState<FilterState>({
    productTitle: true,
    productId: false,
    gtin: false,
    upc: false,
    supplierId: false,
    supplierName: true,
    brandName: true,
    productLine: false,
  });

  const [filterValues, setFilterValues] = useState({
    productTitle: "",
    productId: "",
    gtin: "",
    upc: "",
    supplierId: "",
    supplierName: "",
    brandName: "",
    productLine: "",
  });

  // Sync filter values whenever the current product changes (after load or skip)
  useEffect(() => {
    if (!currentProduct) return;
    setFilterValues({
      productTitle: currentProduct.productTitle,
      productId: currentProduct.productId,
      gtin: "",
      upc: "",
      supplierId: "",
      supplierName: currentProduct.supplierName,
      brandName: currentProduct.brandName,
      productLine: currentProduct.productLine,
    });
    localStorage.setItem("dot_connect_product_id", currentProduct.id);
  }, [currentProduct?.id]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const handleSkip = useCallback(() => {
    const next = (productIndex + 1) % productsQueue.length;
    setProductIndex(next);
    if (!preserveSelections) setPackagingSelections({});
    showNotification("Skipped — moved to next product");
  }, [productIndex, productsQueue.length, preserveSelections, showNotification]);

  const handlePrev = useCallback(() => {
    const prev = (productIndex - 1 + productsQueue.length) % productsQueue.length;
    setProductIndex(prev);
    if (!preserveSelections) setPackagingSelections({});
    showNotification("Moved to previous product");
  }, [productIndex, productsQueue.length, preserveSelections, showNotification]);

  const handleSaveGlobal = useCallback(() => {
    if (selectedResultIndex === null) { showNotification("Select a result first"); return; }
    const result = filteredResultsRef.current[selectedResultIndex];
    const pkg = packagingSelections[result?.id];
    if (!pkg) {
      showNotification("Select a packaging level first");
      return;
    }
    showNotification(`Saved ${pkg} GTIN for ${currentProduct.productId} as global default`);
    setTimeout(() => handleSkip(), 300);
  }, [selectedResultIndex, packagingSelections, currentProduct, handleSkip, showNotification]);

  const handleCompare = useCallback(() => {
    showNotification("Opening enrichment source comparison…");
  }, [showNotification]);

  const checkedFilterKeys = (Object.keys(filters) as (keyof FilterState)[]).filter((key) => filters[key]);

  // Exact case-insensitive field match helper
  const eq = (a: string | undefined | null, b: string) =>
    !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

  // No filters checked → browse all universal products.
  // Any filter checked → filter all universal products by exact field value match.
  const scoredResults = allUniversalResults.filter((r) => {
    if (searchWithin) {
      const q = searchWithin.toLowerCase();
      const textMatch =
        r.title.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q);
      if (!textMatch) return false;
    }
    for (const key of checkedFilterKeys) {
      const val = filterValues[key];
      if (!val) continue;
      switch (key) {
        case "productTitle":
          if (!titleFuzzyMatch(val, r.title)) return false;
          break;
        case "productId":
          if (!eq(r.dotItemNumber, val) && !eq(r.mfrItemNumber, val)) return false;
          break;
        case "supplierName": {
          const a = val.trim().toLowerCase();
          const b = r.supplier.trim().toLowerCase();
          if (!a || !b || (!b.includes(a) && !a.includes(b))) return false;
          break;
        }
        case "brandName": {
          const a = val.trim().toLowerCase();
          const b = r.brand.trim().toLowerCase();
          if (!a || !b || (!b.includes(a) && !a.includes(b))) return false;
          break;
        }
        case "gtin":
        case "upc":
          if (!r.gtins.some((g) => g.gtin === val)) return false;
          break;
      }
    }
    return true;
  }).map((r) => {
    if (!currentProduct) return r;
    const { score, strength } = scoreResult(currentProduct, r);
    return { ...r, matchScore: score, matchStrength: strength };
  }).sort((a, b) => {
    if (sortBy === "match_strength") return b.matchScore - a.matchScore;
    if (sortBy === "supplier") return a.supplier.localeCompare(b.supplier);
    if (sortBy === "brand") return a.brand.localeCompare(b.brand);
    return 0;
  });

  const filteredResults = scoredResults.map((r) => ({
    ...r,
    imageUrl: getFoodImage(r.title, r.imageUrl, undefined, r.brand),
  }));
  filteredResultsRef.current = filteredResults;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedResultIndex((cur) => {
          const nextIdx = e.key === "ArrowDown"
            ? (cur === null ? 0 : Math.min(cur + 1, filteredResults.length - 1))
            : (cur === null ? 0 : Math.max(cur - 1, 0));
          const nextResult = filteredResults[nextIdx];
          if (!nextResult) return cur;
          const carriedLevel =
            cur !== null
              ? (packagingSelections[filteredResults[cur]?.id] ?? nextResult.gtins[0]?.level ?? null)
              : (nextResult.gtins[0]?.level ?? null);
          if (carriedLevel) {
            setPackagingSelections({ [nextResult.id]: carriedLevel });
          }
          return nextIdx;
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        handleSaveGlobal();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleCompare();
      } else if (["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const targetIdx = selectedResultIndex ?? 0;
        const result = filteredResults[targetIdx];
        if (!result) return;
        const level = result.gtins[parseInt(e.key) - 1]?.level ?? null;
        if (level) {
          setSelectedResultIndex(targetIdx);
          setPackagingSelections({ [result.id]: level });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSkip, handlePrev, handleSaveGlobal, handleCompare, selectedResultIndex, filteredResults, packagingSelections]);


  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-[#1976d2] border-t-transparent rounded-full animate-spin" />
          <span className="text-[14px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.6)]">Loading data…</span>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="size-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-2 max-w-sm text-center">
          <span className="text-[16px] font-['Roboto',sans-serif] font-medium text-[#d32f2f]">Could not connect to database</span>
          <span className="text-[14px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.6)]">{dbError}</span>
        </div>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="size-full flex items-center justify-center bg-white">
        <span className="text-[14px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.6)]">No products in queue.</span>
      </div>
    );
  }

  return (
    <div className="bg-white flex flex-col size-full font-['Roboto',sans-serif]" ref={containerRef} tabIndex={-1}>
      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#323232] text-white text-[14px] px-4 py-2.5 rounded-[4px] shadow-lg animate-fade-in">
          {notification}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Side Nav */}
        <SideNav activeNav="products" onProducts={onBack} />

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* App Bar */}
          <div className="bg-white border-b border-[#e0e0e0] shrink-0 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center px-6 h-16">
              {/* Breadcrumb + Search */}
              <div className="flex flex-1 gap-16 items-center min-w-0">
                <div className="flex items-center shrink-0">
                  <button className="text-[12px] text-[rgba(0,0,0,0.87)] font-['Roboto',sans-serif] leading-[1.66] tracking-[0.4px] hover:underline">Home</button>
                  <span className="text-[16px] text-[rgba(0,0,0,0.6)] font-['Roboto',sans-serif] px-1.5">/</span>
                  <button className="text-[12px] text-[rgba(0,0,0,0.87)] font-['Roboto',sans-serif] leading-[1.66] tracking-[0.4px] hover:underline">Link GTINs</button>
                </div>
                <div className="bg-black/12 rounded-[4px] flex-1 max-w-xl">
                  <div className="flex gap-2.5 items-start p-2">
                    <svg className="size-6 shrink-0 opacity-50" fill="none" viewBox="0 0 17.49 17.49">
                      <path d={svgPaths.p3b681e80} fill="black" />
                    </svg>
                    <span className="text-[16px] text-black opacity-50 font-['Roboto',sans-serif] tracking-[0.15px]">Search</span>
                  </div>
                </div>
              </div>
              {/* Right side */}
              <div className="flex gap-4 items-center pl-16 shrink-0">
                <button className="size-6 flex items-center justify-center opacity-54 hover:opacity-80">
                  <svg className="size-6" fill="none" viewBox="0 0 24 24">
                    <path d={svgPaths.p24b67a00} fill="black" fillOpacity="0.54" />
                  </svg>
                </button>
                <div className="bg-[#bdbdbd] rounded-full size-6 flex items-center justify-center">
                  <span className="text-[12px] text-white leading-[12px] font-['Roboto',sans-serif]">KB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable page body */}
          <div className="flex-1 overflow-y-auto">
            {/* Page Header */}
            <div className="flex items-center px-4 py-4">
              <h1 className="text-[24px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.87)] leading-[1.334] flex-1">GTIN Enrichment Search</h1>
              <div className="bg-[#fafafa] flex gap-3 items-center px-4 py-1.5 rounded-[4px] text-[12px] text-[rgba(0,0,0,0.6)] font-['Roboto',sans-serif] tracking-[0.4px] whitespace-nowrap border border-[#e0e0e0]">
                <span>← → = Previous/Skip</span>
                <span>↑↓ = Make Selection</span>
                <span>1–3 = Cycle Packaging Level</span>
                <span>Shift+Enter = Save with Global Default</span>
                <span>Enter = Compare Enrichment Sources</span>
              </div>
            </div>

            {/* Task Container */}
            <div className="bg-[#fafafa] mx-4 mb-4 rounded-[4px] border border-[#e0e0e0] p-4 flex flex-col gap-4">
              {/* Task Header */}
              <div className="flex gap-4 items-center">
                <div className="flex flex-1 gap-4 items-center min-w-0">
                  <span className="text-[20px] font-['Roboto',sans-serif] font-medium text-[rgba(0,0,0,0.87)] tracking-[0.15px] whitespace-nowrap">Assign GTIN</span>
                  <div className="bg-[#e5f6fd] border border-[#e0e0e0] rounded-[4px] px-2 py-1">
                    <span className="text-[16px] font-['Roboto',sans-serif] font-medium text-[#014361] tracking-[0.15px]">{currentProduct.productId}</span>
                  </div>
                </div>
                <div className="flex gap-4 items-center shrink-0">
                  <button
                    onClick={handleSkip}
                    className="text-[#1976d2] text-[14px] font-medium tracking-[0.4px] uppercase px-2 py-1.5 rounded-[4px] hover:bg-blue-50 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSaveGlobal}
                    className="border border-[rgba(25,118,210,0.5)] text-[#1976d2] text-[14px] font-medium tracking-[0.4px] uppercase px-4 py-1.5 rounded-[4px] bg-white hover:bg-blue-50 transition-colors"
                  >
                    Save with Global Default
                  </button>
                  <button
                    onClick={handleCompare}
                    className="bg-[#1976d2] text-white text-[14px] font-medium tracking-[0.4px] uppercase px-4 py-1.5 rounded-[4px] shadow-[0px_1px_5px_0px_rgba(0,0,0,0.12),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_3px_1px_-2px_rgba(0,0,0,0.2)] hover:bg-[#1565c0] transition-colors"
                  >
                    Compare Enrichment Sources
                  </button>
                </div>
              </div>

              {/* Task Body */}
              <div className="flex gap-4 items-start">
                {/* Filter Panel */}
                <div className="bg-white rounded-[4px] border border-[#e0e0e0] shrink-0 w-[320px] overflow-y-auto max-h-[calc(100vh-280px)]">
                  <div className="flex flex-col gap-6 items-start p-3">
                    {/* Filters header */}
                    <div className="flex gap-6 items-start w-full px-0.5">
                      <span className="flex-1 text-[16px] font-['Roboto',sans-serif] font-medium text-[rgba(0,0,0,0.87)] tracking-[0.15px] leading-[1.75]">Filters</span>
                      <label className="flex gap-0.5 items-center cursor-pointer shrink-0">
                        <div onClick={() => setPreserveSelections(!preserveSelections)}>
                          {preserveSelections ? (
                            <svg className="size-5" fill="none" viewBox="0 0 15 15">
                              <path d={svgPaths.pcdaa200} fill="#1976D2" />
                            </svg>
                          ) : (
                            <svg className="size-5" fill="none" viewBox="0 0 15 15">
                              <path d={svgPaths.p7fafe80} fill="black" fillOpacity="0.56" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[12px] font-['Roboto',sans-serif] text-[rgba(0,0,0,0.6)] tracking-[0.4px] leading-[1.66]">Preserve Selections</span>
                      </label>
                    </div>

                    {/* Search within results */}
                    <div className="bg-white min-w-full rounded-[4px] border border-[#e0e0e0]">
                      <div className="flex gap-2.5 items-start p-2">
                        <svg className="size-6 shrink-0" fill="none" viewBox="0 0 17.49 17.49">
                          <path d={svgPaths.p3b681e80} fill="black" />
                        </svg>
                        <input
                          className="text-[16px] font-['Roboto',sans-serif] text-black/50 tracking-[0.15px] bg-transparent outline-none flex-1 placeholder:text-black/50"
                          placeholder="Search Within Results"
                          value={searchWithin}
                          onChange={(e) => setSearchWithin(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Key Product Data */}
                    <div className="bg-white rounded-[4px] border border-[#e0e0e0] w-full">
                      <div className="flex flex-col gap-6 items-start pb-6 pt-2 px-4">
                        {/* Section header */}
                        <div className="flex gap-1 items-center w-full">
                          <span className="flex-1 text-[14px] font-['Roboto',sans-serif] font-medium text-black tracking-[0.1px] leading-[1.57]">Key Product Data</span>
                          <button className="text-[#007bc7] text-[14px] tracking-[0.17px] hover:underline">Select All</button>
                          <button className="size-6 flex items-center justify-center">
                            <svg className="w-3 h-2" fill="none" viewBox="0 0 12 7.41">
                              <path d={svgPaths.p2bb41700} fill="black" fillOpacity="0.54" />
                            </svg>
                          </button>
                        </div>

                        {/* Filter fields */}
                        {(
                          [
                            { key: "productTitle", label: "Product Title", value: filterValues.productTitle },
                            { key: "productId", label: "Product ID", value: filterValues.productId },
                            { key: "gtin", label: "GTIN", value: filterValues.gtin },
                            { key: "upc", label: "UPC", value: filterValues.upc },
                            { key: "supplierId", label: "Mfr Item #", value: filterValues.supplierId },
                            { key: "supplierName", label: "Supplier Name", value: filterValues.supplierName },
                            { key: "brandName", label: "Brand Name", value: filterValues.brandName },
                            { key: "productLine", label: "Product Line", value: filterValues.productLine },
                          ] as { key: keyof FilterState; label: string; value: string }[]
                        ).map(({ key, label, value }) => (
                          <div key={key} className="flex flex-col gap-1 w-full">
                            <FilterCheckbox
                              checked={filters[key]}
                              label={label}
                              onChange={(v) => setFilters((f) => ({ ...f, [key]: v }))}
                            />
                            <FilterTextField
                              value={value}
                              onChange={(v) => setFilterValues((fv) => ({ ...fv, [key]: v }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Collapsed accordion sections */}
                    <AccordionSection title="Features" />
                    <AccordionSection title="Ingredients" />
                    <AccordionSection
                      badge={allergenBadge}
                      title="Allergens"
                      onClearBadge={() => setAllergenBadge(undefined)}
                    />
                  </div>
                </div>

                {/* Results Panel */}
                <div className="bg-white flex-1 min-w-0 rounded-[4px] border border-[#e0e0e0] self-stretch overflow-y-auto max-h-[calc(100vh-280px)]">
                  <div className="flex flex-col gap-3 p-3">
                    {/* Results Header */}
                    <div className="flex gap-3 items-start w-full px-0.5">
                      <span className="flex-1 text-[16px] font-['Roboto',sans-serif] font-medium text-[rgba(0,0,0,0.87)] tracking-[0.15px] leading-[1.75]">
                        {filteredResults.length} Matches Found
                      </span>
                      <div className="flex gap-2 items-center shrink-0">
                        <div className="flex gap-1 items-center">
                          <svg className="size-[18px]" fill="none" viewBox="0 0 13.5 9">
                            <path d={svgPaths.p38a15380} fill="black" fillOpacity="0.67" />
                          </svg>
                          <span className="text-[14px] font-['Roboto',sans-serif] font-medium text-[rgba(0,0,0,0.87)] tracking-[0.1px]">Sort by:</span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className="border border-[rgba(25,118,210,0.5)] bg-white text-[#1976d2] text-[13px] font-medium tracking-[0.46px] uppercase px-2.5 py-1 rounded-[4px] flex gap-1 items-center hover:bg-blue-50 transition-colors"
                          >
                            <span>{sortBy === "match_strength" ? "Match Strength" : sortBy === "supplier" ? "Supplier" : "Brand"}</span>
                            <svg className="w-2 h-1" fill="none" viewBox="0 0 7.5 3.75">
                              <path d="M0 0L3.75 3.75L7.5 0H0Z" fill="#007BC7" />
                            </svg>
                          </button>
                          {showSortMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-[#e0e0e0] rounded-[4px] shadow-lg z-10 min-w-[160px]">
                              {[
                                { value: "match_strength", label: "Match Strength" },
                                { value: "supplier", label: "Supplier" },
                                { value: "brand", label: "Brand" },
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => { setSortBy(opt.value as typeof sortBy); setShowSortMenu(false); }}
                                  className={`block w-full text-left px-4 py-2 text-[14px] font-['Roboto',sans-serif] hover:bg-[#f5f5f5] ${sortBy === opt.value ? "text-[#1976d2] font-medium" : "text-[rgba(0,0,0,0.87)]"}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Result rows */}
                    {filteredResults.map((result, idx) => (
                      <ResultRow
                        key={result.id}
                        isSelected={selectedResultIndex === idx && packagingSelections[result.id] != null}
                        result={result}
                        selectedPackaging={packagingSelections[result.id] ?? null}
                        onPackagingSelect={(level) => {
                          setSelectedResultIndex(idx);
                          setPackagingSelections({ [result.id]: level });
                        }}
                        onSelect={() => setSelectedResultIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const [screen, setScreen] = useState<"products" | "advanced">("products");
  return screen === "products" ? (
    <ProductsPage
      onOpenAdvanced={(productId) => {
        localStorage.setItem("dot_connect_product_id", productId);
        setScreen("advanced");
      }}
    />
  ) : (
    <GtinSearchPage onBack={() => setScreen("products")} />
  );
}
