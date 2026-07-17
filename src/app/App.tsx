import { useState } from "react";
import ProductsPage from "./ProductsPage";
import GtinSearchPage, { type EnrichmentNavigation } from "./GtinSearchPage";
import EnrichmentComparisonPage from "./EnrichmentComparisonPage";

type Screen = "products" | "advanced" | "enrichment";

export default function App() {
  const [screen, setScreen] = useState<Screen>("products");
  const [selection, setSelection] = useState<EnrichmentNavigation | null>(null);

  if (screen === "products") {
    return (
      <ProductsPage
        onOpenAdvanced={(productId) => {
          localStorage.setItem("dot_connect_product_id", productId);
          setScreen("advanced");
        }}
      />
    );
  }

  if (screen === "advanced") {
    return (
      <GtinSearchPage
        onBack={() => setScreen("products")}
        onCompare={(nextSelection) => {
          setSelection(nextSelection);
          setScreen("enrichment");
        }}
      />
    );
  }

  return (
    <EnrichmentComparisonPage
      selection={selection}
      onBack={() => setScreen("advanced")}
      onComplete={() => setScreen("products")}
    />
  );
}
