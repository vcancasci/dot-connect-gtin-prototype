import { useState } from "react";
import ProductsPage from "./ProductsPage";
import GtinSearchPage from "./GtinSearchPage";

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
