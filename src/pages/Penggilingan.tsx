import React from 'react';
import SheetPage from '../components/SheetPage';

export default function Penggilingan() {
  const headers = [
    "KABUPATEN/KOTA",
    "NAMA PETUGAS SKGB GILING",
    "JENIS SAMPEL",
    "NAMA PENGGILINGAN",
    "SKALA",
    "TANGGAL PENDATAAN",
    "LOKASI PENGGILINGAN",
    "115. HASIL PENCACAHAN",
    "401.A. BERAT WADAH (GKG)",
    "401.B. BERAT GABAH (GKG) + WADAH",
    "401.C. RATA-RATA KADAR AIR (GKG)",
    "403.A. BERAT WADAH (GKP)",
    "403.B. BERAT GABAH (GKP) + WADAH",
    "403.C. RATA-RATA KADAR AIR (GKP)"
  ];

  return (
    <SheetPage 
      sheetName="Giling"
      title="Penggilingan"
      description="Input data hasil penggilingan gabah menjadi beras."
      predefinedHeaders={headers}
    />
  );
}
