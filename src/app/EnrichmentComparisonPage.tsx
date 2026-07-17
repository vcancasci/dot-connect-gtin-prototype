import { useEffect, useMemo, useState } from "react";
import { supabase, type ConnectProduct } from "@/lib/supabase";
import dotLogo from "@/imports/DOT.svg";
import gdsnLogo from "@/imports/GDSN.svg";
import usdaLogo from "@/imports/USDA.svg";
import uniproLogo from "@/imports/Unipro.svg";
import { SideNav, type EnrichmentNavigation } from "./GtinSearchPage";

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
  manufacturer_name: string | null;
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
    return value
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
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

function SourceSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#e0e0e0]">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#fafafa]">
        <span className="text-[15px] font-medium text-[rgba(0,0,0,0.87)]">{title}</span>
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
      className={`w-[350px] shrink-0 border rounded-[4px] overflow-hidden bg-white ${selected ? "border-[#1976d2] shadow-[0_0_0_1px_#1976d2]" : "border-[#e0e0e0]"}`}
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
            <div className="mt-4 text-[12px] text-[#1976d2] font-medium">
              Completeness: {record.completeness_score ?? 0}%
            </div>
          </div>

          <SourceSection title="Images" open={open.features} onToggle={() => toggle("features")}>
            <Field label="Referenced files" value={record.referenced_files} />
            <Field label="Marketing message" value={record.marketing_message} />
            <Field label="Description" value={record.product_description} />
          </SourceSection>
          <SourceSection title="Features" open={open.features} onToggle={() => toggle("features")}>
            <Field label="Applicable diets" value={record.applicable_diets} />
            <Field label="Preparation" value={record.preparation_methods} />
            <Field label="Instructions" value={record.preparation_instructions} />
          </SourceSection>
          <SourceSection title="Ingredients" open={open.ingredients} onToggle={() => toggle("ingredients")}>
            <Field label="Ingredients" value={record.ingredients} />
          </SourceSection>
          <SourceSection title="Nutrition" open={open.nutrition} onToggle={() => toggle("nutrition")}>
            <Field label="Serving size" value={record.serving_size} suffix={record.serving_size_uom ?? undefined} />
            <Field label="Servings/container" value={record.servings_per_container} />
            <Field label="Nutrients" value={record.nutrients} />
          </SourceSection>
          <SourceSection title="Allergens" open={open.allergens} onToggle={() => toggle("allergens")}>
            <Field label="Statement" value={record.allergen_statement} />
            <Field label="Allergens" value={record.allergens} />
          </SourceSection>
          <SourceSection title="Storage and Shelf Life" open={open.storage} onToggle={() => toggle("storage")}>
            <Field label="Instructions" value={record.storage_instructions} />
            <Field label="Minimum temp" value={record.minimum_storage_temperature} suffix={record.minimum_storage_temperature_uom ?? undefined} />
            <Field label="Maximum temp" value={record.maximum_storage_temperature} suffix={record.maximum_storage_temperature_uom ?? undefined} />
            <Field label="Shelf life" value={record.total_shelf_life_days} suffix="days" />
          </SourceSection>
          <SourceSection title="Packaging and Weight" open={open.packaging} onToggle={() => toggle("packaging")}>
            <Field label="Packaging level" value={record.packaging_level_code} />
            <Field label="Net content" value={record.net_contents} />
            <Field label="Gross weight" value={record.gross_weight} suffix={record.gross_weight_uom ?? undefined} />
            <Field label="Net weight" value={record.net_weight} suffix={record.net_weight_uom ?? undefined} />
            <Field label="Dimensions" value={record.length != null ? `${record.length} × ${record.width ?? "–"} × ${record.height ?? "–"}` : null} suffix={record.dimensions_uom ?? undefined} />
            <Field label="Pallet TI / HI" value={record.pallet_ti != null || record.pallet_hi != null ? `${record.pallet_ti ?? "–"} / ${record.pallet_hi ?? "–"}` : null} />
          </SourceSection>
          <SourceSection title="Additional Details" open={open.additional} onToggle={() => toggle("additional")}>
            <Field label="Country of origin" value={record.country_of_origin_code} />
            <Field label="GPC" value={record.gpc_code} />
            <Field label="Child GTINs" value={record.child_gtins} />
            <Field label="Items per pallet" value={record.items_per_pallet} />
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
                {columns.map((column) => (
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
