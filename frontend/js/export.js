function exportToCSV() {
  if (allReports.length === 0) {
    showAlert('Tidak ada data untuk diekspor.');
    return;
  }

  const headers = ['ID', 'Tanggal', 'Service Advisor', 'No. Polisi', 'Model', 'Odometer (km)', 'Keluhan', 'Status', 'Foto Awal', 'Foto Bukti'];

  const rows = allReports.map(report => [
    report.id,
    new Date(report.created_at).toLocaleDateString('id-ID'),
    report.creator?.username || '-',
    report.vehicle?.license_plate || '-',
    report.vehicle?.model || '-',
    report.odometer,
    `"${(report.complaint || '').replace(/"/g, '""')}"`,
    report.status,
    report.initial_photo || '-',
    report.proof_photo || '-',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fleetify_laporan_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showAlert(`Berhasil mengekspor ${allReports.length} laporan ke CSV.`, 'success');
}
