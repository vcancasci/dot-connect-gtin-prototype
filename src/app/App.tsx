import { useEffect, useMemo, useState } from "react";
import ProductsPage from "./ProductsPage";
import GtinSearchPage, { type EnrichmentNavigation } from "./GtinSearchPage";
import EnrichmentComparisonPage from "./EnrichmentComparisonPage";

type Route =
  | { screen: "products" }
  | { screen: "advanced"; productId: string }
  | { screen: "enrichment"; productId: string };

function readRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  const enrichmentMatch = path.match(/^\/products\/([^/]+)\/gtin\/enrichment$/);
  if (enrichmentMatch) {
    return {
      screen: "enrichment",
      productId: decodeURIComponent(enrichmentMatch[1]),
    };
  }

  const gtinMatch = path.match(/^\/products\/([^/]+)\/gtin$/);
  if (gtinMatch) {
    return {
      screen: "advanced",
      productId: decodeURIComponent(gtinMatch[1]),
    };
  }

  return { screen: "products" };
}

function productPath(productId: string) {
  return `/products/${encodeURIComponent(productId)}/gtin`;
}

function enrichmentPath(productId: string) {
  return `${productPath(productId)}/enrichment`;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [selection, setSelection] = useState<EnrichmentNavigation | null>(null);

  const navigate = (nextPath: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, "", nextPath);
    } else {
      window.history.pushState({}, "", nextPath);
    }
    setRoute(readRoute());
  };

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Preserve the active Connect product across refreshes and direct links.
  useEffect(() => {
    if (route.screen !== "products") {
      localStorage.setItem("dot_connect_product_id", route.productId);
    }
  }, [route]);

  const activeProductId = useMemo(() => {
    if (route.screen !== "products") return route.productId;
    return localStorage.getItem("dot_connect_product_id") ?? "";
  }, [route]);

  if (route.screen === "products") {
    return (
      <ProductsPage
        onOpenAdvanced={(productId) => {
          localStorage.setItem("dot_connect_product_id", productId);
          navigate(productPath(productId));
        }}
      />
    );
  }

  if (route.screen === "advanced") {
    return (
      <GtinSearchPage
        onBack={() => navigate("/products")}
        onCompare={(nextSelection) => {
          setSelection(nextSelection);
          navigate(enrichmentPath(route.productId));
        }}
      />
    );
  }

  return (
    <EnrichmentComparisonPage
      selection={selection}
      onBack={() => navigate(productPath(activeProductId))}
      onComplete={() => navigate("/products")}
    />
  );
}
