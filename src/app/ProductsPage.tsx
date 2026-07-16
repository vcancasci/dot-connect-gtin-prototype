import { useCallback, useEffect, useState } from "react";
import { imgProduct } from "@/lib/productImage";
import { supabase, type ConnectProduct } from "@/lib/supabase";
import { SideNav } from "./GtinSearchPage";

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

export default function ProductsPage({ onOpenAdvanced }: { onOpenAdvanced: (productId: string) => void }) {
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
