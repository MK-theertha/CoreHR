export function buildCsv(rows: Record<string, unknown>[], columns: { key: string; header: string }[]) {
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((column) => escape(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escape(row[column.key])).join(',')).join('\n');

  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
