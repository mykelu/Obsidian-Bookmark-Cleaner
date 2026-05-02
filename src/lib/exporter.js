/**
 * Generates a JSON Blob from data.
 */
export function generateJsonBlob(data) {
  const jsonStr = JSON.stringify(data, null, 2);
  return new Blob([jsonStr], { type: 'application/json' });
}

/**
 * Generates a CSV Blob from bookmark data.
 */
export function generateCsvBlob(data) {
  if (!data || data.length === 0) return null;
  
  const headers = ['id', 'title', 'url', 'folderPath', 'status'];
  const rows = data.map(item => {
    return headers.map(header => {
      let val = item[header] || '';
      // Escape quotes and wrap in quotes for CSV
      val = val.toString().replace(/"/g, '""');
      return `"${val}"`;
    }).join(',');
  });
  
  const csvStr = headers.join(',') + '\n' + rows.join('\n');
  return new Blob([csvStr], { type: 'text/csv' });
}
