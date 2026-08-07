import { useEffect, useMemo, useState } from "react";
import { supabase, type ConnectProduct } from "@/lib/supabase";
import dotLogo from "@/imports/DOT.svg";
import gdsnLogo from "@/imports/GDSN.svg";
import usdaLogo from "@/imports/USDA.svg";
import uniproLogo from "@/imports/Unipro.svg";
import readinessIconStrip from "@/imports/EcommReadinessIcons.svg";
import { SideNav, getFoodImage, type EnrichmentNavigation } from "./GtinSearchPage";
import { imgProduct } from "@/lib/productImage";

type Source = {
  id: string;
  code: string;
  name: string;
  display_order: number;
};

type SourceRecord = {
  id: string;
  universal_product_id: string;
  enrichment_source_id: string;
  product_title: string | null;
  product_line?: string | null;
  manufacturer_name: string | null;
  manufacturer_item_number?: string | null;
  brand_name: string | null;
  product_description: string | null;
  marketing_message: string | null;
  referenced_files: unknown[] | null;
  ingredients: string | null;
  applicable_diets: unknown[] | null;
  allergen_statement: string | null;
  allergens: unknown[] | null;
  preparation_methods: unknown[] | null;
  preparation_instructions: string | null;
  serving_size: number | null;
  serving_size_uom: string | null;
  servings_per_container: number | null;
  nutrients: unknown[] | null;
  minimum_storage_temperature: number | null;
  minimum_storage_temperature_uom: string | null;
  maximum_storage_temperature: number | null;
  maximum_storage_temperature_uom: string | null;
  storage_instructions: string | null;
  total_shelf_life_days: number | null;
  packaging_level_code: string | null;
  child_gtins: unknown[] | null;
  net_contents: unknown[] | null;
  gross_weight: number | null;
  gross_weight_uom: string | null;
  net_weight: number | null;
  net_weight_uom: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensions_uom: string | null;
  pallet_ti: number | null;
  pallet_hi: number | null;
  items_per_pallet: number | null;
  country_of_origin_code: string | null;
  gpc_code: string | null;
  completeness_score: number | null;
  raw_source_data?: unknown;
  [key: string]: unknown;
};

type SourceColumn = Source & { record: SourceRecord | null };

type SectionKey =
  | "features"
  | "ingredients"
  | "nutrition"
  | "allergens"
  | "storage"
  | "packaging"
  | "additional";

const SOURCE_LOGOS: Record<string, string> = {
  DOT_MASTERED: dotLogo,
  DOT: dotLogo,
  GDSN: gdsnLogo,
  USDA: usdaLogo,
  UNIPRO: uniproLogo,
};

type ReadinessCategory = "images" | "features" | "ingredients" | "nutrition" | "allergens";

const READINESS_ICON_OFFSETS: Record<ReadinessCategory, number> = {
  images: 0,
  features: 25,
  allergens: 50,
  nutrition: 75,
  ingredients: 100,
};

function readinessIsGood(sourceId: string, category: ReadinessCategory): boolean {
  const seed = `${sourceId}:${category}`;
  const score = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  return score % 3 !== 0;
}

function ReadinessIcon({ sourceId, category }: { sourceId: string; category: ReadinessCategory }) {
  const ready = readinessIsGood(sourceId, category);
  return (
    <span
      className="inline-flex size-5 overflow-hidden rounded-full align-middle"
      title={ready ? "Ecommerce ready" : "Needs enrichment"}
      aria-label={ready ? "Ecommerce ready" : "Needs enrichment"}
    >
      <img
        src={readinessIconStrip}
        alt=""
        className="h-5 w-[120px] max-w-none"
        style={{
          transform: `translateX(-${READINESS_ICON_OFFSETS[category]}px)`,
          filter: ready ? undefined : "sepia(1) saturate(7) hue-rotate(335deg)",
        }}
      />
    </span>
  );
}

function isEmpty(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function pretty(value: unknown): string {
  if (value == null || value === "") return "Not available";
  if (Array.isArray(value)) {
    if (!value.length) return "Not available";
    return value.map((item) => pretty(item)).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${humanize(key)}: ${pretty(item)}`)
      .join("\n");
  }
  return String(value);
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function recordValue(record: SourceRecord, keys: string[]): unknown {
  const rawSourceData = record.raw_source_data;
  for (const key of keys) {
    const directValue = (record as Record<string, unknown>)[key];
    if (!isEmpty(directValue)) return directValue;
    if (rawSourceData && typeof rawSourceData === "object") {
      const rawValue = (rawSourceData as Record<string, unknown>)[key];
      if (!isEmpty(rawValue)) return rawValue;
    }
  }
  return null;
}

function Field({ label, value, suffix }: { label: string; value: unknown; suffix?: string }) {
  const empty = isEmpty(value);
  return (
    <div className="grid grid-cols-[145px_1fr] gap-3 py-2 border-b border-[#eeeeee] last:border-0">
      <div className="text-[12px] font-medium text-[rgba(0,0,0,0.6)]">{label}</div>
      <div className={`text-[13px] whitespace-pre-wrap break-words ${empty ? "text-[#9e9e9e] italic" : "text-[rgba(0,0,0,0.87)]"}`}>
        {pretty(value)}{!empty && suffix ? ` ${suffix}` : ""}
      </div>
    </div>
  );
}

type DisplayFieldDefinition = {
  label: string;
  keys: string[];
  suffix?: string;
};

function DisplayFields({ record, fields }: { record: SourceRecord; fields: DisplayFieldDefinition[] }) {
  return (
    <>
      {fields.map((field) => (
        <Field key={field.label} label={field.label} value={recordValue(record, field.keys)} suffix={field.suffix} />
      ))}
    </>
  );
}

const FEATURE_FIELDS: DisplayFieldDefinition[] = [
  { label: "Description", keys: ["product_description", "description"] },
  { label: "Features and Benefits", keys: ["features_and_benefits", "features_benefits"] },
  { label: "Bake-to-Bake / Cooking Instructions", keys: ["preparation_instructions", "preparation_methods"] },
  { label: "Marketing Message", keys: ["marketing_message"] },
];

const INGREDIENT_FIELDS: DisplayFieldDefinition[] = [
  { label: "Ingredients", keys: ["ingredients"] },
  { label: "USDA Organic Percentage", keys: ["usda_organic_percentage", "organic_percentage"] },
  { label: "Organic Trade Codes", keys: ["organic_trade_codes", "organic_trade_code"] },
  { label: "Natural Specialty", keys: ["natural_specialty", "natural_specialty_indicator"] },
  { label: "GMO Free", keys: ["gmo_free", "gmo_free_indicator"] },
];

const ALLERGEN_FIELDS: DisplayFieldDefinition[] = [
  { label: "Contains", keys: ["contains", "allergens"] },
  { label: "May Contain", keys: ["may_contain"] },
  { label: "Free From", keys: ["free_from"] },
  { label: "Allergen Statement", keys: ["allergen_statement"] },
  { label: "Applicable Diets", keys: ["applicable_diets"] },
];

const STORAGE_FIELDS: DisplayFieldDefinition[] = [
  { label: "Storage Type", keys: ["storage_type"] },
  { label: "Storage Instructions", keys: ["storage_instructions"] },
  { label: "Storage Temperature Unit", keys: ["minimum_storage_temperature_uom", "maximum_storage_temperature_uom"] },
  { label: "Minimum Storage Temperature", keys: ["minimum_storage_temperature"] },
  { label: "Maximum Storage Temperature", keys: ["maximum_storage_temperature"] },
  { label: "Total Shelf Life", keys: ["total_shelf_life_days"], suffix: "days" },
  { label: "Guaranteed Shelf Life", keys: ["guaranteed_shelf_life"], suffix: "days" },
  { label: "Shelf Life After Opening", keys: ["shelf_life_after_opening"], suffix: "days" },
];

const PACKAGING_FIELDS: DisplayFieldDefinition[] = [
  { label: "Items in Pack", keys: ["items_in_pack", "pack_count"] },
  { label: "Pack Size Text", keys: ["pack_size_text", "net_contents"] },
  { label: "Weight Unit", keys: ["gross_weight_uom", "net_weight_uom", "weight_uom"] },
  { label: "Each Item Weight", keys: ["each_item_weight"] },
  { label: "Gross Weight", keys: ["gross_weight"] },
  { label: "Net Weight", keys: ["net_weight"] },
  { label: "L/W/H Unit", keys: ["dimensions_uom"] },
  { label: "Length", keys: ["length"] },
  { label: "Height", keys: ["height"] },
  { label: "Width", keys: ["width"] },
  { label: "Cube Unit", keys: ["cube_uom"] },
  { label: "Cube", keys: ["cube"] },
  { label: "Primary Packaging GTIN", keys: ["primary_packaging_gtin", "primary_gtin"] },
  { label: "Case GTIN", keys: ["case_gtin", "child_gtins"] },
  { label: "Inner GTIN", keys: ["inner_gtin"] },
  { label: "Pallet GTIN", keys: ["pallet_gtin"] },
  { label: "Catch Weight Product", keys: ["catch_weight_indicator"] },
];

const ADDITIONAL_FIELDS: DisplayFieldDefinition[] = [
  { label: "Country of Origin", keys: ["country_of_origin_code"] },
  { label: "Category", keys: ["category", "product_type"] },
  { label: "Subcategory", keys: ["subcategory"] },
  { label: "Keywords", keys: ["keywords"] },
  { label: "Global Product Classification", keys: ["gpc_code"] },
  { label: "Child Nutrition Label", keys: ["child_nutrition_label"] },
];

function extractImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && /^(https?:|data:|blob:)/.test(item)) return [item];
    if (!item || typeof item !== "object") return [];
    const object = item as Record<string, unknown>;
    for (const key of ["url", "uri", "src", "href", "image_url"]) {
      const candidate = object[key];
      if (typeof candidate === "string" && candidate) return [candidate];
    }
    return [];
  });
}

function imageFallback(event: React.SyntheticEvent<HTMLImageElement>, fallback: string) {
  const image = event.currentTarget;
  if (image.src !== fallback) image.src = fallback;
}

type NutrientRow = {
  label: string;
  value: string;
  unit: string;
  basis: string;
};

function normalizeNutrients(value: unknown): NutrientRow[] {
  if (!value) return [];
  const source = Array.isArray(value)
    ? value
    : typeof value === "object" && Array.isArray((value as Record<string, unknown>).nutrients)
      ? (value as Record<string, unknown>).nutrients
      : typeof value === "object"
        ? Object.entries(value as Record<string, unknown>).map(([name, nutrient]) => (
            nutrient && typeof nutrient === "object"
              ? { ...(nutrient as Record<string, unknown>), nutrient_name: (nutrient as Record<string, unknown>).nutrient_name ?? name }
              : { nutrient_name: name, value: nutrient }
          ))
        : [];

  if (!Array.isArray(source)) return [];
  return source.flatMap((item, index) => {
    if (item == null || typeof item !== "object") return [];
    const object = item as Record<string, unknown>;
    const label = String(object.nutrient_name ?? object.nutrientName ?? object.nutrient_type_code ?? object.name ?? `Nutrient ${index + 1}`);
    const nutrientValue = object.nutrient_value ?? object.value ?? object.amount ?? object.quantity;
    if (nutrientValue == null || nutrientValue === "") return [];
    return [{
      label: humanize(label),
      value: String(nutrientValue),
      unit: String(object.nutrient_uom ?? object.unit ?? object.uom ?? ""),
      basis: String(object.nutrient_basis_quantity ?? object.basis_quantity ?? object.per ?? "per serving"),
    }];
  });
}

function NutritionDisplay({ record }: { record: SourceRecord }) {
  const rows = normalizeNutrients(record.nutrients);
  return (
    <div>
      <Field label="Serving size" value={record.serving_size} suffix={record.serving_size_uom ?? undefined} />
      <Field label="Servings per container" value={record.servings_per_container} />
      <div className="mt-4 overflow-hidden rounded border border-[#e0e0e0]">
        <div className="grid grid-cols-[1fr_90px_80px_100px] gap-2 bg-[#f5f5f5] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#616161]">
          <span>Nutrient</span>
          <span>Value</span>
          <span>Unit</span>
          <span>Basis</span>
        </div>
        {rows.length ? rows.map((row) => (
          <div key={`${row.label}-${row.basis}`} className="grid grid-cols-[1fr_90px_80px_100px] gap-2 border-t border-[#eeeeee] px-3 py-2 text-[12px] text-[rgba(0,0,0,0.87)]">
            <span>{row.label}</span>
            <span>{row.value}</span>
            <span>{row.unit || "—"}</span>
            <span>{row.basis}</span>
          </div>
        )) : (
          <div className="px-3 py-3 text-[13px] italic text-[#9e9e9e]">No structured nutrition data available.</div>
        )}
      </div>
    </div>
  );
}

function ImageGallery({ record, productTitle, brandName, sourceId }: { record: SourceRecord; productTitle: string; brandName: string; sourceId: string }) {
  const [showAll, setShowAll] = useState(false);
  const primary = getFoodImage(productTitle, null, new Set(), brandName);
  const primaryVariant = `${primary}${primary.includes("?") ? "&" : "?"}gallery=2`;
  const secondaryVariant = `${primary}${primary.includes("?") ? "&" : "?"}gallery=3`;
  const referencedImages = extractImageUrls(record.referenced_files);
  const additionalImageCount = 2 + [...sourceId].reduce((total, character) => total + character.charCodeAt(0), 0) % 8;
  const imageSeeds = Array.from(new Set([primary, ...referencedImages, primaryVariant, secondaryVariant, imgProduct]));
  const imageUrls = Array.from({ length: 3 + additionalImageCount }, (_, index) => {
    const image = imageSeeds[index % imageSeeds.length];
    if (index < imageSeeds.length) return image;
    return `${image}${image.includes("?") ? "&" : "?"}gallery=${index + 1}`;
  });
  const previewImages = imageUrls.slice(0, 3);

  return (
    <>
      <div className="border-t border-[#e0e0e0] px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[15px] font-medium text-[rgba(0,0,0,0.87)]">
            Images
            <ReadinessIcon sourceId={sourceId} category="images" />
          </span>
        </div>
        <div className="grid grid-cols-[1fr_72px] gap-2">
          <img
            src={previewImages[0]}
            alt={productTitle}
            className="h-[166px] w-full rounded border border-[#eeeeee] object-cover"
            onError={(event) => imageFallback(event, imgProduct)}
          />
          <div className="grid grid-rows-3 gap-2">
            {previewImages.slice(1).map((url, index) => (
              <img
                key={`${url}-${index}`}
                src={url}
                alt={`${productTitle} image ${index + 2}`}
                className="h-[52px] w-full rounded border border-[#eeeeee] object-cover"
                onError={(event) => imageFallback(event, imgProduct)}
              />
            ))}
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex h-[52px] items-center justify-center rounded border border-[#d0d0d0] bg-[#f5f5f5] text-[13px] font-medium text-[#1976d2] hover:bg-[#eef6fd]"
            >
              +{additionalImageCount}
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-[12px] font-medium text-[#1976d2] hover:underline">
          View all images
        </button>
      </div>

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true" aria-label={`${productTitle} image gallery`}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-medium text-[rgba(0,0,0,0.87)]">{productTitle} Images</h3>
              <button type="button" onClick={() => setShowAll(false)} className="rounded px-2 py-1 text-[22px] leading-none text-[#616161] hover:bg-[#f5f5f5]" aria-label="Close image gallery">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imageUrls.map((url, index) => (
                <img key={`${url}-modal-${index}`} src={url} alt={`${productTitle} image ${index + 1}`} className="aspect-square w-full rounded border border-[#eeeeee] object-cover" onError={(event) => imageFallback(event, imgProduct)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SourceSection({
  title,
  open,
  onToggle,
  readiness,
  sourceId,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  readiness?: ReadinessCategory;
  sourceId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#e0e0e0]">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#fafafa]">
        <span className="flex items-center gap-2 text-[15px] font-medium text-[rgba(0,0,0,0.87)]">
          {title}
          {readiness && sourceId && <ReadinessIcon sourceId={sourceId} category={readiness} />}
        </span>
        <span className={`text-[18px] transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function SourceCard({
  source,
  selected,
  onSelect,
}: {
  source: SourceColumn;
  selected: boolean;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    features: false,
    ingredients: false,
    nutrition: false,
    allergens: false,
    storage: false,
    packaging: false,
    additional: false,
  });
  const record = source.record;
  const logo = SOURCE_LOGOS[source.code];
  const toggle = (key: SectionKey) => setOpen((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div
      className={`w-[350px] shrink-0 border rounded-[4px] overflow-hidden ${selected ? "bg-[#eef6fd] border-[#1976d2] shadow-[0_0_0_1px_#1976d2]" : "bg-white border-[#e0e0e0]"}`}
    >
      <button
        disabled={!record}
        onClick={onSelect}
        className={`w-full text-left ${record ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-[#e0e0e0] ${selected ? "bg-[#eef6fd]" : "bg-white"}`}>
          {logo ? <img src={logo} alt="" className="w-7 h-7 object-contain" /> : <div className="w-7 h-7 rounded-full bg-[#e0e0e0]" />}
          <div className="flex-1 text-[16px] font-medium text-[rgba(0,0,0,0.87)]">{source.name}</div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-[#1976d2]" : "border-[#9e9e9e]"}`}>
            {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#1976d2]" />}
          </div>
        </div>
      </button>

      {!record ? (
        <div className="h-[580px] flex flex-col items-center justify-center px-8 text-center bg-[#fafafa]">
          <div className="text-[18px] font-medium text-[#757575]">No source available</div>
          <div className="mt-2 text-[13px] text-[#9e9e9e]">This enrichment source does not have a record for the selected GTIN.</div>
        </div>
      ) : (
        <>
          <div className={`px-5 py-5 min-h-[216px] ${selected ? "bg-[#eef6fd]" : "bg-white"}`}>
            <div className="text-[20px] leading-[1.35] font-medium text-[rgba(0,0,0,0.87)] line-clamp-4">
              {record.product_title || "Untitled product"}
            </div>
            <div className="mt-4 text-[13px] text-[rgba(0,0,0,0.72)]">
              <strong>Supplier Name:</strong> {record.manufacturer_name || "Not available"}
            </div>
            <div className="mt-2 text-[13px] text-[rgba(0,0,0,0.72)]">
              <strong>Brand Name:</strong> {record.brand_name || "Not available"}
            </div>
            <div className="mt-2 text-[13px] text-[rgba(0,0,0,0.72)] break-words">
              <strong>Supplier ID:</strong> {pretty(record.manufacturer_item_number ?? record.source_record_id)}
            </div>
            <div className="mt-2 text-[13px] text-[rgba(0,0,0,0.72)] break-words">
              <strong>Product Line:</strong> {pretty(record.product_line)}
            </div>
            <div className="mt-4 text-[12px] text-[#1976d2] font-medium">
              Completeness: {record.completeness_score ?? 0}%
            </div>
          </div>

          <ImageGallery record={record} sourceId={source.id} productTitle={record.product_title || "Untitled product"} brandName={record.brand_name || ""} />
          <SourceSection title="Features" readiness="features" sourceId={source.id} open={open.features} onToggle={() => toggle("features")}>
            <DisplayFields record={record} fields={FEATURE_FIELDS} />
          </SourceSection>
          <SourceSection title="Ingredients" readiness="ingredients" sourceId={source.id} open={open.ingredients} onToggle={() => toggle("ingredients")}>
            <DisplayFields record={record} fields={INGREDIENT_FIELDS} />
          </SourceSection>
          <SourceSection title="Nutrition" readiness="nutrition" sourceId={source.id} open={open.nutrition} onToggle={() => toggle("nutrition")}>
            <NutritionDisplay record={record} />
          </SourceSection>
          <SourceSection title="Allergens" readiness="allergens" sourceId={source.id} open={open.allergens} onToggle={() => toggle("allergens")}>
            <DisplayFields record={record} fields={ALLERGEN_FIELDS} />
          </SourceSection>
          <SourceSection title="Storage and Shelf Life" open={open.storage} onToggle={() => toggle("storage")}>
            <DisplayFields record={record} fields={STORAGE_FIELDS} />
          </SourceSection>
          <SourceSection title="Packaging and Weight" open={open.packaging} onToggle={() => toggle("packaging")}>
            <DisplayFields record={record} fields={PACKAGING_FIELDS} />
          </SourceSection>
          <SourceSection title="Additional Details" open={open.additional} onToggle={() => toggle("additional")}>
            <DisplayFields record={record} fields={ADDITIONAL_FIELDS} />
          </SourceSection>
        </>
      )}
    </div>
  );
}

export default function EnrichmentComparisonPage({
  selection,
  onBack,
  onComplete,
}: {
  selection: EnrichmentNavigation | null;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [product, setProduct] = useState<ConnectProduct | null>(null);
  const [columns, setColumns] = useState<SourceColumn[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectProductId = selection?.connectProductId ?? localStorage.getItem("dot_connect_product_id");
  const universalProductId = selection?.universalProductId ?? localStorage.getItem("dot_connect_universal_product_id");

  useEffect(() => {
    async function load() {
      if (!connectProductId || !universalProductId) {
        setError("No selected product was found. Return to Assign GTIN and select a match.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const [productResult, sourceResult, recordResult] = await Promise.all([
        supabase.from("connect_products").select("*").eq("id", connectProductId).single(),
        supabase.from("enrichment_sources").select("id, code, name, display_order").eq("is_active", true).order("display_order"),
        supabase.from("source_product_records").select("*").eq("universal_product_id", universalProductId),
      ]);
      if (productResult.error || sourceResult.error || recordResult.error) {
        setError(productResult.error?.message || sourceResult.error?.message || recordResult.error?.message || "Unable to load enrichment data");
        setLoading(false);
        return;
      }
      const records = (recordResult.data ?? []) as SourceRecord[];
      const nextColumns = ((sourceResult.data ?? []) as Source[]).map((source) => ({
        ...source,
        record: records.find((record) => record.enrichment_source_id === source.id) ?? null,
      }));
      setProduct(productResult.data as ConnectProduct);
      setColumns(nextColumns);
      const existing = (productResult.data as ConnectProduct & { selected_source_product_record_id?: string | null }).selected_source_product_record_id;
      if (existing) setSelectedRecordId(existing);
      setLoading(false);
    }
    load();
  }, [connectProductId, universalProductId]);

  const selectedColumn = useMemo(
    () => columns.find((column) => column.record?.id === selectedRecordId) ?? null,
    [columns, selectedRecordId],
  );

  const save = async () => {
    if (!connectProductId || !selectedColumn?.record) {
      setError("Select an available enrichment source first.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase
      .from("connect_products")
      .update({
        selected_enrichment_source_id: selectedColumn.id,
        selected_source_product_record_id: selectedColumn.record.id,
        enrichment_status: "SELECTED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectProductId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onComplete();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#616161]">Loading enrichment sources…</div>;
  }

  return (
    <div className="bg-white min-h-screen flex font-['Roboto',sans-serif]">
      <SideNav activeNav="products" onProducts={onComplete} />
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-[#e0e0e0] flex items-center px-6 shadow-sm">
          <div className="text-[12px] text-[rgba(0,0,0,0.75)]">Home&nbsp;&nbsp;/&nbsp;&nbsp;Link GTINs</div>
          <div className="ml-16 flex-1 max-w-3xl h-10 bg-[#eeeeee] rounded-[4px] flex items-center px-4 text-[#757575]">⌕&nbsp;&nbsp; Search</div>
          <div className="ml-auto w-7 h-7 rounded-full bg-[#bdbdbd] text-white text-[11px] flex items-center justify-center">KB</div>
        </header>

        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[24px] text-[rgba(0,0,0,0.87)]">GTIN Enrichment Search</h1>
            <div className="bg-[#fafafa] border border-[#eeeeee] rounded px-4 py-2 text-[12px] text-[#757575]">Escape = Back to Assign GTIN&nbsp;&nbsp;&nbsp; 1–4 = Choose Enrichment Source&nbsp;&nbsp;&nbsp; Enter = Save and Continue</div>
          </div>

          <section className="border border-[#e0e0e0] rounded-[4px] bg-[#fafafa] p-4">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-[20px] font-medium">Compare Enrichment Sources</h2>
              <div className="bg-[#e5f6fd] border border-[#c5e5f3] text-[#014361] rounded px-2 py-1 font-medium">{product?.product_id ?? ""}</div>
              <div className="ml-auto flex items-center gap-4">
                <button onClick={onBack} className="text-[#1976d2] text-[14px] font-medium uppercase px-3 py-2">Back to Assign GTIN</button>
                <button onClick={save} disabled={saving} className="bg-[#1976d2] disabled:bg-[#90caf9] text-white text-[14px] font-medium uppercase rounded px-5 py-2 shadow">
                  {saving ? "Saving…" : "Save and Continue"}
                </button>
              </div>
            </div>

            {error && <div className="mb-4 rounded border border-[#ef9a9a] bg-[#ffebee] text-[#c62828] px-4 py-3 text-[13px]">{error}</div>}

            <div className="bg-white border border-[#e0e0e0] rounded-[4px] p-3 overflow-x-auto">
              <div className="text-[16px] font-medium mb-3">{columns.filter((column) => column.record).length} Enrichment Sources Found</div>
              <div className="flex gap-3 min-w-max">
                {columns.filter((column) => column.record).map((column) => (
                  <SourceCard
                    key={column.id}
                    source={column}
                    selected={column.record?.id === selectedRecordId}
                    onSelect={() => column.record && setSelectedRecordId(column.record.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
