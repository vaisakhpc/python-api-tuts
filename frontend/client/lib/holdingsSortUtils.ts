// holdingsSortUtils.ts
// Utility for sorting holdings array by any field (supports nested fields)

export type OrderDir = "asc" | "desc";

export function sortHoldings<T = any>(holdings: T[], orderBy: string, orderDir: OrderDir): T[] {
  const getValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  };
  return [...holdings].sort((a, b) => {
    const aValue = getValue(a, orderBy);
    const bValue = getValue(b, orderBy);
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return orderDir === "asc" ? 1 : -1;
    if (bValue === undefined) return orderDir === "asc" ? -1 : 1;
    if (typeof aValue === "string" && typeof bValue === "string") {
      return orderDir === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    return orderDir === "asc" ? (aValue - bValue) : (bValue - aValue);
  });
}
