import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { ProductForm } from "@/components/inventory/product-form";
import type { ProductCategory } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const { branding } = await requireSession();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Inventario
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
        <p className="text-muted-foreground">
          Las existencias se cargan después, desde la ficha del producto.
        </p>
      </div>

      <ProductForm
        categories={(categories ?? []) as Pick<ProductCategory, "id" | "name">[]}
        currency={branding?.currency ?? "MXN"}
        locale={branding?.locale ?? "es-MX"}
      />
    </div>
  );
}
