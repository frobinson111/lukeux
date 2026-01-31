/**
 * Export data to CSV file and trigger download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T | string; label: string; format?: (value: unknown, row: T) => string }[],
  filename: string
): void {
  if (!data.length) return;

  const headers = columns.map((col) => col.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = typeof col.key === "string" && col.key.includes(".")
        ? col.key.split(".").reduce((obj: unknown, key) => (obj as Record<string, unknown>)?.[key], row)
        : row[col.key as keyof T];

      if (col.format) {
        return col.format(value, row);
      }

      if (value instanceof Date) {
        return value.toISOString().split("T")[0];
      }

      if (value === null || value === undefined) {
        return "";
      }

      return String(value);
    })
  );

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
