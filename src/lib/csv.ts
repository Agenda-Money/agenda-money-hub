import csaApi from './csaApi';

export const downloadCsv = (rows: any[], filePrefix = 'export') => {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const fetchAndDownloadCsaExport = async () => {
  const res = await csaApi.get('/api/csa/collections/export');
  const rows = res.data?.data ?? [];
  downloadCsv(rows, 'collections-due');
};

export default downloadCsv;
