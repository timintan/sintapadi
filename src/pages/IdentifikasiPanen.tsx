import React, { useState } from 'react';
import SheetPage from '../components/SheetPage';
import HarvestLookup from '../components/HarvestLookup';
import { Database, PlusCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function IdentifikasiPanen() {
  const [activeTab, setActiveTab] = useState<'lookup' | 'input'>('lookup');
  
  const headers = [
    "KABUPATEN/KOTA",
    "NAMA PETUGAS",
    "JENIS SAMPEL",
    "ID SAMPEL",
    "TANGGAL PANEN",
    "VARIETAS",
    "LUAS PANEN (HA)",
    "LOKASI PANEN (LAT, LONG)"
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-border-main/30">
        <button
          onClick={() => setActiveTab('lookup')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
            activeTab === 'lookup' 
              ? "text-primary" 
              : "text-text-muted hover:text-text-main"
          )}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Lookup Database
          </div>
          {activeTab === 'lookup' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('input')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
            activeTab === 'input' 
              ? "text-primary" 
              : "text-text-muted hover:text-text-main"
          )}
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Input Hasil Panen
          </div>
          {activeTab === 'input' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div>
        {activeTab === 'lookup' ? (
          <HarvestLookup />
        ) : (
          <SheetPage 
            sheetName="Panen"
            title="Identifikasi Panen"
            description="Input hasil identifikasi lahan panen dan sampel gabah di lapangan."
            predefinedHeaders={headers}
          />
        )}
      </div>
    </div>
  );
}
