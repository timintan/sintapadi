import React from 'react';
import SheetPage from '../components/SheetPage';

export default function PengeringanTahap2() {
  const headers = [
    "KABUPATEN/KOTA",
    "NAMA PETUGAS SKGB",
    "JENIS SAMPEL",
    "ID SUBSEGMEN",
    "207. HASIL PENCACAHAN",
    "TANGGAL KUNJUNGAN KEDUA SAAT (PENGERINGAN)",
    "400. LOKASI (PENGERINGAN)",
    "401.a. BERAT WADAH (PENGERINGAN)",
    "401.b. BERAT GABAH DAN WADAH (PENGERINGAN)",
    "401.c. RATA-RATA KADAR AIR (PENGERINGAN)"
  ];

  return (
    <SheetPage 
      sheetName="Kering2"
      title="Pengeringan - Tahap 2"
      description="Input data pengeringan tahap 2 (akhir)."
      predefinedHeaders={headers}
    />
  );
}
