import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://udouvbipzirnzubysxjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkb3V2Ymlwemlybnp1YnlzeGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDMyOTMsImV4cCI6MjA5OTYxOTI5M30.E0j4DkhhnAJh5t_4IJKqyhO77A-ajVUyP81xnhhotMI";

const globalKey = "__supabase_singleton__";
declare global { interface Window { [globalKey]?: SupabaseClient } }

if (!window[globalKey]) {
  window[globalKey] = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "sb-udouvbipzirnzubysxjc-singleton",
    },
  });
}

export const supabase = window[globalKey]!;

// ─── connect_products ─────────────────────────────────────────────────────────

export interface ConnectProduct {
  id: string;
  product_id: string;
  supplier_name: string | null;
  product_name: string;
  manufacturer_item_number: string | null;
  brand_name: string | null;
  product_line: string | null;
  package_size: number | null;
  package_size_uom: string | null;
  case_pack: number | null;
  assigned_gtin: string | null;
  assigned_packaging_level: string | null;
  gtin_status: string;
  enrichment_status: string;
  updated_at: string;
}

// ─── gtin_search_results view ─────────────────────────────────────────────────

export interface GtinSearchResult {
  candidate_id: string;
  connect_product_id: string;
  universal_product_id: string;
  match_score: number;
  match_strength: "High" | "Medium" | "Low";
  rank: number | null;
  matched_fields: Record<string, unknown>;

  // Connect product fields
  connect_product_ref: string;
  connect_product_name: string;
  connect_supplier_name: string | null;
  connect_brand_name: string | null;
  connect_mfr_item_number: string | null;
  connect_product_line: string | null;
  gtin_status: string;
  enrichment_status: string;
  assigned_gtin: string | null;
  assigned_packaging_level: string | null;

  // Universal product fields
  canonical_title: string;
  canonical_brand_name: string | null;
  canonical_manufacturer_name: string | null;
  canonical_manufacturer_item_number: string | null;
  dot_item_number: string | null;
  primary_image_url: string | null;

  // Aggregated
  gtins: { id: string; level: string; label: string; gtin: string; primary: boolean }[] | null;
  available_sources: { source_id: string; code: string; name: string; display_order: number; record_id: string }[] | null;
  primary_enrichment_source: string | null;
}

// ─── products_listing view ────────────────────────────────────────────────────

export interface ProductsListingRow {
  id: string;
  product_id: string;
  supplier_name: string | null;
  product_name: string;
  brand_name: string | null;
  product_line: string | null;
  package_size: number | null;
  package_size_uom: string | null;
  case_pack: number | null;
  assigned_gtin: string | null;
  assigned_packaging_level: string | null;
  gtin_status: string;
  enrichment_status: string;
  updated_at: string;
  enrichment_source_code: string | null;
  enrichment_source_name: string | null;
  canonical_title: string | null;
  canonical_brand_name: string | null;
  primary_image_url: string | null;
  match_candidate_count: number;
}

// ─── universal_products direct query ─────────────────────────────────────────

export interface UniversalProductRow {
  id: string;
  canonical_title: string;
  canonical_brand_name: string | null;
  canonical_manufacturer_name: string | null;
  canonical_manufacturer_item_number: string | null;
  dot_item_number: string | null;
  primary_image_url: string | null;
  product_identifiers: { id: string; level: string; label: string; gtin: string }[] | null;
  source_product_records: {
    id: string;
    enrichment_sources: { id: string; code: string; name: string; display_order: number } | null;
  }[] | null;
}

// ─── enrichment_comparison view ───────────────────────────────────────────────

export interface EnrichmentComparisonRow {
  record_id: string;
  universal_product_id: string;
  enrichment_source_id: string;
  source_code: string;
  source_name: string;
  display_order: number;
  canonical_title: string;
  dot_item_number: string | null;
  product_title: string | null;
  brand_name: string | null;
  manufacturer_name: string | null;
  manufacturer_item_number: string | null;
  product_description: string | null;
  marketing_message: string | null;
  ingredients: string | null;
  allergen_statement: string | null;
  allergens: unknown;
  applicable_diets: unknown;
  nutrients: unknown;
  serving_size: number | null;
  serving_size_uom: string | null;
  servings_per_container: number | null;
  preparation_instructions: string | null;
  preparation_methods: unknown;
  storage_instructions: string | null;
  total_shelf_life_days: number | null;
  primary_gtin: string | null;
  packaging_level_code: string | null;
}
