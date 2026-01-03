/**
 * Triggers a file download in the browser
 * @param blob - The file content as a Blob
 * @param filename - The name for the downloaded file
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a CSV download from string content
 * @param content - The CSV content as a string
 * @param filename - The name for the downloaded file
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, filename);
}
