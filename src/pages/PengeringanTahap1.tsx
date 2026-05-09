import React from 'react';
import SheetPage from '../components/SheetPage';

export default function PengeringanTahap1() {
  const headers = [
    "KABUPATEN/KOTA",
    "NAMA PETUGAS SKGB",
    "JENIS SAMPEL",
    "ID SUBSEGMEN",
    "207. HASIL PENCACAHAN",
    "TANGGAL KUNJUNGAN PERTAMA (SAAT PANEN)",
    "LOKASI (PANEN)",
    "305.a. BERAT WADAH (PANEN)",
    "305.b. BERAT GABAH DAN WADAH (PANEN)",
    "305.c. RATA-RATA KADAR AIR (PANEN)"
  ];

  return (
    <SheetPage 
      sheetName="Kering1"
      title="Pengeringan - Tahap 1"
      description="Input data pengeringan tahap 1 (saat panen)."
      predefinedHeaders={headers}
    />
  );
}
