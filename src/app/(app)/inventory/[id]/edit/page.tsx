import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { ProductForm } from "@/components/inventory/product-form";
import type { Product, ProductCategory } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { branding } = await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("product_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/inventory/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al producto
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">Editar producto</h1>

      <ProductForm
        product={product as Product}
        categories={(categories ?? []) as Pick<ProductCategory, "id" | "name">[]}
        currency={branding?.currency ?? "MXN"}
        locale={branding?.locale ?? "es-MX"}
      />
    </div>
  );
}
