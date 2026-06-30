import { hexToHslString } from "@/lib/utils";

/**
 * Inyecta el color de marca de la organización como variable CSS, sobre-
 * escribiendo `--primary`/`--ring` en claro y oscuro. Se renderiza en el
 * servidor (sin flash). `primaryColor` viene validado desde la BD (regex hex),
 * y hexToHslString sólo produce números → seguro para insertar en CSS.
 */
export function BrandStyle({ primaryColor }: { primaryColor: string }) {
  const hsl = hexToHslString(primaryColor);
  const css = `:root{--primary:${hsl};--ring:${hsl};}.dark{--primary:${hsl};--ring:${hsl};}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
