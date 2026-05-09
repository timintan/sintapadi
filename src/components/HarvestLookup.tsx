import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Database, 
  MapPin, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Download,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { googleSheetService, SheetData } from '../services/googleSheetService';
import { cn } from '../lib/utils';

export default function HarvestLookup() {
  const [activeType, setActiveType] = useState<'Utama' | 'Cadangan'>('Utama');
  const [utData, setUtData] = useState<SheetData | null>(null);
  const [cadData, setCadData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedKab, setSelectedKab] = useState('');
  const [selectedAmatan, setSelectedAmatan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [ut, cad] = await Promise.all([
          googleSheetService.fetchData('UTKer'),
          googleSheetService.fetchData('CadKer')
        ]);
        setUtData(ut);
        setCadData(cad);
      } catch (err) {
        setError('Gagal memuat data lookup.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const activeSheet = activeType === 'Utama' ? utData : cadData;
  const rawData = activeSheet?.data || [];

  const getStatus = (item: any) => {
    // Check if an explicit status exists in any column containing "status" or "eligibel"
    const explicitStatusKey = Object.keys(item).find(key => 
      key.toLowerCase().includes('status') || 
      key.toLowerCase().includes('eligibel') ||
      key.toLowerCase().includes('eligible')
    );
    
    const explicitStatus = explicitStatusKey ? String(item[explicitStatusKey]).trim() : '';
    if (explicitStatus) {
      const lower = explicitStatus.toLowerCase();
      if (lower.includes('non')) return 'Non Eligible';
      if (lower.includes('elig')) return 'Eligible';
      return explicitStatus;
    }
    
    // Fallback to calculation based on Nilai Amatan
    const amatanRaw = item['Nilai Amatan'];
    if (amatanRaw === undefined || amatanRaw === null || String(amatanRaw).trim() === '') {
      return 'Unknown';
    }

    // Sheet contains strings like "3. Generatif..." - extract the leading number
    const amatanStr = String(amatanRaw).trim();
    const leadingNumber = parseInt(amatanStr.split('.')[0]);
    
    if (isNaN(leadingNumber)) return 'Unknown';
    
    // User logic: Eligible if Amatan is 1, 2, or 3 (Vegetatif/Generatif)
    // Non Eligible if Amatan is 4 (Panen), 5 (Persiapan), 7 (Bukan Padi)
    return (leadingNumber >= 1 && leadingNumber <= 3) ? 'Eligible' : 'Non Eligible';
  };

  // Get unique filter values
  const kabList = Array.from(new Set(rawData.map((item: any) => {
    const kab = item['kdkab'] || '';
    return kab;
  }).filter(Boolean))).sort();

  const amatanList = Array.from(new Set(rawData.map((item: any) => {
    const val = item['Nilai Amatan'] || '';
    return val;
  }).filter(Boolean))).sort();

  // Filtered data
  const filteredData = rawData.filter((item: any) => {
    const kabMatch = !selectedKab || String(item['kdkab']).includes(selectedKab);
    const amatanMatch = !selectedAmatan || String(item['Nilai Amatan']) === selectedAmatan;
    
    const itemStatus = getStatus(item);
    const statusMatch = !selectedStatus || 
      String(itemStatus).toLowerCase() === String(selectedStatus).toLowerCase();
    
    const searchMatch = !searchTerm || 
      Object.values(item).some(val => 
        String(val || "").toLowerCase().includes(String(searchTerm).toLowerCase())
      );
    return kabMatch && amatanMatch && statusMatch && searchMatch;
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`LAPORAN IDENTIFIKASI PANEN - ${String(activeType || "").toUpperCase()}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 105, 28, { align: 'center' });
    
    // Summary info
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Kabupaten/Kota: ${selectedKab || 'Semua'}`, 14, 40);
    doc.text(`Nilai Amatan: ${selectedAmatan || 'Semua'}`, 14, 46);
    doc.text(`Status: ${selectedStatus || 'Semua'}`, 14, 52);
    doc.text(`Total Data: ${filteredData.length}`, 14, 58);
    
    // Define headers from filtering relevant keys
    const tableHeaders = [['No', 'ID Subsegmen', 'Kabupaten/Kota', 'Nilai Amatan', 'Status']];
    
    // Map data for table body
    const tableData = filteredData.map((item, index) => [
      index + 1,
      item.idsubsegmen || '-',
      item.kdkab || '-',
      item['Nilai Amatan'] || '-',
      getStatus(item)
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: activeType === 'Utama' ? [99, 102, 241] : [249, 115, 22], // Indigo or Orange
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'center' },
        4: { halign: 'center' }
      }
    });
    
    doc.save(`Laporan_Identifikasi_Panen_${activeType}_${new Date().getTime()}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-primary/20 rounded-full animate-ping" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-text-main uppercase tracking-widest animate-pulse">Menghubungkan ke Server...</p>
          <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">Memuat database identifikasi panen</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto text-center card-polish bg-bg-card border-red-500/20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-text-main mb-2">Terjadi Kesalahan</h3>
        <p className="text-sm text-text-muted mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-black text-text-main tracking-tight uppercase italic underline decoration-primary underline-offset-4 decoration-4">
              Identifikasi Panen
            </h1>
          </div>
          <p className="text-sm text-text-muted font-medium max-w-xl">
            Sistem lookup subsegmen sampel untuk mempermudah identifikasi di lapangan. Pilih jenis sampel dan gunakan filter untuk mempersempit pencarian.
          </p>
        </div>

        <div className="flex p-1 bg-bg-card border border-border-main/50 rounded-xl shadow-sm self-start">
          <button
            onClick={() => setActiveType('Utama')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
              activeType === 'Utama' 
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105 z-10" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Sampel Utama
          </button>
          <button
            onClick={() => setActiveType('Cadangan')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
              activeType === 'Cadangan' 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105 z-10" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            <AlertCircle className="w-4 h-4" />
            Sampel Cadangan
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-5 bg-bg-card rounded-2xl border border-border-main/40 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
        
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cari Data</label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search anything..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-border-main/50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Kabupaten/Kota</label>
          <select
            value={selectedKab}
            onChange={(e) => setSelectedKab(e.target.value)}
            className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
          >
            <option value="">Semua Kabupaten</option>
            {kabList.map(kab => (
              <option key={kab} value={kab}>{kab}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nilai Amatan</label>
          <select
            value={selectedAmatan}
            onChange={(e) => setSelectedAmatan(e.target.value)}
            className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
          >
            <option value="">Semua Amatan</option>
            {amatanList.map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
          >
            <option value="">Semua Status</option>
            <option value="Eligible">Eligible (Amatan {'>'} 0)</option>
            <option value="Non Eligible">Non Eligible (Amatan 0)</option>
          </select>
        </div>

        <div className="flex items-end justify-between lg:col-span-1 gap-2">
          <div className="flex items-center gap-1 p-1 bg-bg-main border border-border-main/50 rounded-xl">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'card' ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
              )}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'table' ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg shadow-slate-800/10 active:scale-95"
          >
            <Download className="w-3 h-3" />
            PDF
          </button>
        </div>

        <div className="text-right lg:col-span-1 flex flex-col justify-end">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Data</p>
          <p className="text-2xl font-black text-primary italic leading-none">{filteredData.length}</p>
        </div>
      </div>

      {/* Results Section */}
      {filteredData.length > 0 ? (
        viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredData.map((item: any, idx) => {
              const status = getStatus(item);
              return (
                <motion.div
                  key={`${activeType}-${idx}-${item.idsubsegmen}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                  className={cn(
                    "group relative rounded-2xl p-5 shadow-lg transition-all duration-500 border backdrop-blur-md overflow-hidden",
                    status === 'Eligible' 
                      ? "bg-emerald-600/20 border-emerald-500/40 hover:border-emerald-500/60 hover:bg-emerald-600/25 shadow-emerald-900/5" 
                      : status === 'Non Eligible'
                        ? "bg-rose-500/15 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/20 shadow-rose-900/5"
                        : "bg-bg-card border-border-main/60 hover:border-primary/30"
                  )}
                >
                  {/* Glossy Overlay Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-sm",
                            activeType === 'Utama' ? "bg-primary text-white" : "bg-orange-500 text-white"
                          )}>
                            {activeType === 'Utama' ? 'Sample Utama' : 'Sample Cadangan'}
                          </span>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-sm",
                            status === 'Eligible' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                          )}>
                            {status}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-text-main flex items-center gap-2 group-hover:text-primary transition-colors italic tracking-tight">
                          {item.idsubsegmen || 'No ID'}
                          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-bold" />
                        </h3>
                      </div>
                      <div className={cn(
                        "p-2 rounded-xl border transition-all duration-300 shadow-inner",
                        status === 'Eligible' ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-700" : "bg-rose-500/20 border-rose-400/30 text-rose-700"
                      )}>
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-white/10 border-dashed">
                        <span className="text-[10px] font-black text-text-muted/80 uppercase tracking-widest">Kabupaten</span>
                        <span className="text-xs font-black text-text-main">{item.kdkab || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-[10px] font-black text-text-muted/80 uppercase tracking-widest">Nilai Amatan</span>
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-inner",
                          status === 'Eligible' ? 'bg-emerald-900/20 text-emerald-800' : 'bg-rose-900/20 text-rose-800'
                        )}>
                          {item['Nilai Amatan'] || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10">
                      <button className={cn(
                        "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm border",
                        status === 'Eligible' 
                          ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-800 hover:bg-emerald-600 hover:text-white" 
                          : "bg-rose-600/20 border-rose-500/40 text-rose-800 hover:bg-rose-600 hover:text-white"
                      )}>
                        <ChevronRight className="w-3 h-3" />
                        Lokasi Spasial
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        ) : (
          <div className="bg-bg-card border border-border-main/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-main border-b border-border-main/50 font-black text-[10px] uppercase tracking-widest text-text-muted">
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">ID Subsegmen</th>
                    <th className="px-6 py-4">Kabupaten/Kota</th>
                    <th className="px-6 py-4">Nilai Amatan</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
                  {filteredData.map((item: any, idx) => {
                    const status = getStatus(item);
                    return (
                      <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4 text-xs font-bold text-text-muted">{idx + 1}</td>
                        <td className="px-6 py-4 text-xs font-black text-text-main italic tracking-tight">{item.idsubsegmen || '-'}</td>
                        <td className="px-6 py-4 text-xs font-bold text-text-muted">{item.kdkab || '-'}</td>
                        <td className="px-6 py-4 text-xs font-bold text-text-main">{item['Nilai Amatan'] || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "inline-flex px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter",
                            status === 'Eligible' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          )}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-all">
                            <MapPin className="w-4 h-4 text-text-muted" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="py-20 text-center card-polish bg-bg-card border-border-main/30">
          <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center mx-auto mb-4 border border-border-main/50">
            <Search className="w-6 h-6 text-text-muted" />
          </div>
          <h3 className="text-lg font-black text-text-main mb-1 uppercase italic">Data Tidak Ditemukan</h3>
          <p className="text-sm text-text-muted max-w-xs mx-auto">
            Coba sesuaikan filter atau kata kunci pencarian Anda untuk menemukan data yang diinginkan.
          </p>
        </div>
      )}
    </div>
  );
}
