import React, { useEffect, useState, useCallback } from 'react';
import { googleSheetService, SheetData } from '../services/googleSheetService';
import { Loader2, Send, RotateCw, CheckCircle, Database, MapPin, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { JATENG_REGIONS } from '../constants/regions';
import { STAFF_SKGB, STAFF_GILING } from '../constants/staff';

interface SheetPageProps {
  sheetName: string;
  title: string;
  description: string;
  predefinedHeaders?: string[];
}

export default function SheetPage({ sheetName, title, description, predefinedHeaders }: SheetPageProps) {
  const [sheetData, setSheetData] = useState<SheetData | null>(
    predefinedHeaders ? { sheetName, data: [], headers: predefinedHeaders } : null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    predefinedHeaders?.forEach(h => initial[h] = "");
    return initial;
  });
  const [activeTab, setActiveTab] = useState<'form' | 'table'>('form');
  
  // Reference data
  const [refData, setRefData] = useState<any[]>([]);
  const [kabList, setKabList] = useState<string[]>([]);
  const [petugasList, setPetugasList] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState<string | null>(null);
  const [utKerLookup, setUtKerLookup] = useState<SheetData | null>(null);
  const [cadKerLookup, setCadKerLookup] = useState<SheetData | null>(null);
  const [utGilLookup, setUtGilLookup] = useState<SheetData | null>(null);
  const [cadGilLookup, setCadGilLookup] = useState<SheetData | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSheetService.fetchData(sheetName);
      
      // Case-insensitive deduplication of headers
      const finalHeaders: string[] = [];
      const seen = new Set<string>();
      
      const candidateHeaders = (predefinedHeaders && predefinedHeaders.length > 0)
        ? predefinedHeaders
        : result.headers;

      candidateHeaders.forEach(h => {
        const trimmed = String(h || "").trim();
        if (!trimmed) return;
        const upper = trimmed.toUpperCase();
        if (!seen.has(upper)) {
          seen.add(upper);
          finalHeaders.push(trimmed);
        }
      });

      setSheetData({
        ...result,
        headers: finalHeaders
      });

      // Initialize form with final headers if not already partially filled
      setFormData(prev => {
        const initialForm: Record<string, string> = { ...prev };
        finalHeaders.forEach(header => {
          if (initialForm[header] === undefined) {
            initialForm[header] = "";
          }
        });
        return initialForm;
      });

      // Fetch reference data based on sheet context (Petugas/Staff)
      const isGiling = String(sheetName || "").toUpperCase().includes('GILING') || sheetName === 'Giling';
      const lookupSheet = isGiling ? 'PetGil' : 'PetKer';
      
      try {
        const reference = await googleSheetService.getReferenceData(lookupSheet);
        setRefData(reference);

        // Extract dynamic Kab list from sheet first
        const fromSheet = reference.map(r => {
          const getValue = (keys: string[]) => {
            for (const k of keys) {
              const upperK = k.toUpperCase();
              const actualKey = Object.keys(r).find(key => key.toUpperCase() === upperK);
              if (actualKey !== undefined) return r[actualKey];
            }
            return undefined;
          };
          const kabValue = getValue(['KdKab', 'KDKAB', 'KABUPATEN/KOTA', 'CODE', 'KODE']);
          return String(kabValue ?? '').split('.')[0].trim();
        }).filter(Boolean);

        // Hardcoded Central Java Kab list as fallback/requested
        const jatengKabs = [
          ...Array.from({ length: 29 }, (_, i) => String(3301 + i)),
          ...Array.from({ length: 6 }, (_, i) => String(3371 + i)),
          "331"
        ];

        const uniqueKabs = Array.from(new Set([...fromSheet, ...jatengKabs])).filter(Boolean).sort();
        setKabList(uniqueKabs);
      } catch (refErr) {
        console.warn(`Optional reference data '${lookupSheet}' not found or inaccessible:`, refErr);
        // If reference sheet missing, just use hardcoded Kab list
        const jatengKabs = [
          ...Array.from({ length: 29 }, (_, i) => String(3301 + i)),
          ...Array.from({ length: 6 }, (_, i) => String(3371 + i)),
          "331"
        ];
        setKabList(jatengKabs.sort());
        setRefData([]);
      }

      // Fetch lookup data for subsegments and penggilingan
      try {
        const [utK, cadK, utG, cadG] = await Promise.all([
          googleSheetService.fetchData('UTKer'),
          googleSheetService.fetchData('CadKer'),
          googleSheetService.fetchData('UTGil'),
          googleSheetService.fetchData('CadGil')
        ]);
        if (utK.data) setUtKerLookup(utK);
        if (cadK.data) setCadKerLookup(cadK);
        if (utG.data) setUtGilLookup(utG);
        if (cadG.data) setCadGilLookup(cadG);
      } catch (e) {
        console.error("Error fetching lookup data:", e);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [sheetName]);

  // Update petugas list when kab changes
  useEffect(() => {
    // Find the Kabupaten value case-insensitively
    const kabKey = Object.keys(formData).find(k => String(k || "").toUpperCase() === 'KABUPATEN/KOTA');
    const selectedKab = kabKey ? String(formData[kabKey] || "").trim() : '';

    if (selectedKab) {
      // 1. Check hardcoded staff lists first (User requirement: "tanam langsung ke sistem")
      const staffSource = sheetName === 'Giling' ? STAFF_GILING : STAFF_SKGB;
      const staticStaff = staffSource[selectedKab] || [];

      if (staticStaff.length > 0) {
        setPetugasList(staticStaff);
        return;
      }

      // 2. Fallback to dynamic refData if no static list matches
      if (refData.length > 0) {
        const filtered = refData.filter(r => {
          const getValue = (keys: string[]) => {
            for (const k of keys) {
              const upperK = String(k || "").toUpperCase();
              const actualKey = Object.keys(r).find(key => String(key || "").toUpperCase() === upperK);
              if (actualKey !== undefined) return r[actualKey];
            }
            return undefined;
          };

          const rKabRaw = getValue(['KdKab', 'KDKAB', 'KABUPATEN/KOTA', 'CODE', 'KODE']);
          const rKab = String(rKabRaw ?? '').split('.')[0].trim();
          
          return rKab === selectedKab || (selectedKab === "3301" && rKab === "331") || (selectedKab === "331" && rKab === "3301");
        });
        
        const names = filtered.map(r => {
          const getValue = (keys: string[]) => {
            for (const k of keys) {
              const upperK = String(k || "").toUpperCase();
              const actualKey = Object.keys(r).find(key => String(key || "").toUpperCase() === upperK);
              if (actualKey !== undefined) return r[actualKey];
            }
            return undefined;
          };
          const name = getValue(['NamaPetugas', 'NAMAPETUGAS', 'NAMA PETUGAS SKGB', 'NAMA PETUGAS', 'PERSONEL', 'NAMA']);
          return String(name ?? '').trim();
        });
        
        setPetugasList(Array.from(new Set(names)).filter(Boolean).sort());
      } else {
        setPetugasList([]);
      }
    } else {
      setPetugasList([]);
    }
  }, [formData, refData, sheetName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await googleSheetService.submitData(sheetName, formData);
    if (result.success) {
      const cleared: Record<string, string> = {};
      Object.keys(formData).forEach(k => cleared[k] = "");
      setFormData(cleared);
      setTimeout(refreshData, 2000);
      setActiveTab('table');
    }
    setSubmitting(false);
  };

  const handleInputChange = (header: string, value: string) => {
    setFormData(prev => ({ ...prev, [header]: value }));
  };

  const handleGetLocation = (header: string) => {
    if ("geolocation" in navigator) {
      setIsLocating(header);
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
        handleInputChange(header, coords);
        setIsLocating(null);
      }, (error) => {
        console.error("Error getting location:", error);
        let msg = "Gagal mengambil lokasi.";
        if (error.code === 1) msg = "Izin lokasi ditolak. Harap berikan izin di browser.";
        if (error.code === 3) msg = "Waktu pengambilan lokasi habis.";
        alert(msg);
        setIsLocating(null);
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    } else {
      alert("Browser tidak mendukung geolokasi.");
    }
  };

  const getInputType = (header: string) => {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes('tanggal')) return 'date';
    if (lowerHeader.includes('berat') || lowerHeader.includes('kadar') || lowerHeader.includes('hasil') || lowerHeader.includes('rendemen')) return 'number';
    return 'text';
  };

  const isLocationField = (header: string) => {
    const h = header.toLowerCase();
    return h.includes('lokasi') || h.includes('koordinat') || h.includes('lat') || h.includes('long');
  };

  const isKabHeader = (header: string) => header.toUpperCase() === 'KABUPATEN/KOTA';
  const isPetugasHeader = (header: string) => {
    const h = header.toUpperCase();
    return h.includes('PETUGAS') || h.includes('PERSONEL');
  };

  const isJenisSampelHeader = (header: string) => header.toUpperCase() === 'JENIS SAMPEL';

  const isHasilPencacahanHeader = (header: string) => {
    const h = header.toUpperCase();
    return h.includes('HASIL PENCACAHAN');
  };

  const isSubsegmenHeader = (header: string) => {
    const h = header.toUpperCase();
    return h.includes('SUBSEGMEN') || h.includes('SEGMAN') || h.includes('SEGMENT');
  };

  const isNamaPenggilinganHeader = (header: string) => {
    const h = header.toUpperCase();
    return h.includes('NAMA PENGGILINGAN') || h.includes('NAMA_GILING');
  };

  const isSkalaHeader = (header: string) => {
    const h = header.toUpperCase();
    return h === 'SKALA';
  };

  const HASIL_PENCACAHAN_OPTIONS = [
    "1. Berhasil diwawancarai",
    "2. Tidak bersedia diwawancarai",
    "3. Tidak dapat diwawancarai sampai batas akhir pencacahan",
    "4. Belum panen sampai batas waktu pendataan",
    "5. Lewat panen",
    "6. Gagal panen",
    "7. Tidak diwawancarai dengan alasan lainnya"
  ];

  if (loading && !sheetData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat Data & Lookup...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-text-main tracking-tight">{title}</h2>
          <p className="text-xs lg:text-sm text-text-muted">{description}</p>
        </div>
        <div className="flex bg-border-main/20 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('form')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === 'form' ? "bg-bg-card text-primary shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            Entry Form
          </button>
          <button 
            onClick={() => setActiveTab('table')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === 'table' ? "bg-bg-card text-emerald-600 shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            Lihat Tabel
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeTab === 'form' ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-polish p-4 lg:p-8 bg-bg-card"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 lg:gap-y-6">
              {sheetData?.headers.map((header) => (
                <div key={header} className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                    {header}
                  </label>
                  
                  {(() => {
                    const kabKey = Object.keys(formData).find(k => isKabHeader(k));
                    const selectedKab = kabKey ? formData[kabKey] : '';
                      
                    if (isKabHeader(header)) {
                      return (
                        <select
                          required
                          value={formData[header] || ""}
                          onChange={(e) => {
                            handleInputChange(header, e.target.value);
                            // Clear dependent fields when Kabupaten changes
                            const subsegmenKey = Object.keys(formData).find(k => isSubsegmenHeader(k));
                            if (subsegmenKey) handleInputChange(subsegmenKey, "");
                            const gilinganKey = Object.keys(formData).find(k => isNamaPenggilinganHeader(k));
                            if (gilinganKey) handleInputChange(gilinganKey, "");
                            const skalaKey = Object.keys(formData).find(k => isSkalaHeader(k));
                            if (skalaKey) handleInputChange(skalaKey, "");
                          }}
                          className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main"
                        >
                          <option value="">-- Pilih Kabupaten --</option>
                          {JATENG_REGIONS.map(region => (
                            <option key={region.code} value={region.code}>
                              {region.code} - {region.name}
                            </option>
                          ))}
                        </select>
                      );
                    }
                    
                    if (isPetugasHeader(header)) {
                      return (
                        <select
                          required
                          value={formData[header] || ""}
                          onChange={(e) => handleInputChange(header, e.target.value)}
                          className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main disabled:opacity-50"
                          disabled={!selectedKab}
                        >
                          <option value="">{selectedKab ? "-- Pilih Petugas --" : "-- Pilih Kab Terlebih Dahulu --"}</option>
                          {petugasList.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      );
                    }
 
                    if (isJenisSampelHeader(header)) {
                      return (
                        <select
                          required
                          value={formData[header] || ""}
                          onChange={(e) => {
                            handleInputChange(header, e.target.value);
                            // Clear dependent fields when sample type changes
                            const subsegmenKey = Object.keys(formData).find(k => isSubsegmenHeader(k));
                            if (subsegmenKey) handleInputChange(subsegmenKey, "");
                            const gilinganKey = Object.keys(formData).find(k => isNamaPenggilinganHeader(k));
                            if (gilinganKey) handleInputChange(gilinganKey, "");
                            const skalaKey = Object.keys(formData).find(k => isSkalaHeader(k));
                            if (skalaKey) handleInputChange(skalaKey, "");
                          }}
                          className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main"
                        >
                          <option value="">-- Pilih Jenis Sampel --</option>
                          <option value="Utama">Utama</option>
                          <option value="Cadangan">Cadangan</option>
                        </select>
                      );
                    }

                    if (isHasilPencacahanHeader(header)) {
                      return (
                        <select
                          required
                          value={formData[header] || ""}
                          onChange={(e) => handleInputChange(header, e.target.value)}
                          className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main"
                        >
                          <option value="">-- Pilih Hasil Pencacahan --</option>
                          {HASIL_PENCACAHAN_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      );
                    }

                    if (isSkalaHeader(header)) {
                      return (
                        <input
                          type="text"
                          required
                          value={formData[header] || ""}
                          onChange={(e) => handleInputChange(header, e.target.value)}
                          className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main"
                          placeholder="Input SKALA atau terpilih otomatis..."
                        />
                      );
                    }
                    
                    if (isLocationField(header)) {
                      return (
                        <div className="relative group">
                          <input
                            type="text"
                            required
                            value={formData[header] || ""}
                            onChange={(e) => handleInputChange(header, e.target.value)}
                            className="w-full pl-4 pr-12 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main"
                            placeholder="Lat, Long"
                          />
                          <button
                            type="button"
                            onClick={() => handleGetLocation(header)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-500"
                            title="Ambil Lokasi Sekarang"
                            disabled={isLocating === header}
                          >
                            {isLocating === header ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      );
                    }

                        if (isSubsegmenHeader(header) || isNamaPenggilinganHeader(header)) {
                          const isSubHeader = isSubsegmenHeader(header);
                          const jenisKey = Object.keys(formData).find(k => isJenisSampelHeader(k));
                          const jenisValue = String(jenisKey ? formData[jenisKey] : '').toUpperCase();
                          
                          const isUtama = jenisValue.includes('UTAMA') || jenisValue === 'UTAMA';
                          const isCadangan = jenisValue.includes('CADANGAN') || jenisValue === 'CADANGAN';

                          const kabKey = Object.keys(formData).find(k => isKabHeader(k));
                          const selectedKabValue = kabKey ? formData[kabKey] : '';
                          const kabCode = selectedKabValue ? String(selectedKabValue).split('-')[0].split(' ')[0].trim() : '';

                          // Choose source based on field type as requested by user:
                          // ID SUBSEGMEN -> UTKer / CadKer
                          // NAMA PENGGILINGAN -> UTGil / CadGil
                          let activeSheet: SheetData | null = null;
                          if (isSubHeader) {
                            activeSheet = isUtama ? utKerLookup : isCadangan ? cadKerLookup : null;
                          } else {
                            activeSheet = isUtama ? utGilLookup : isCadangan ? cadGilLookup : null;
                          }

                          let sourceData = activeSheet?.data || [];
                        
                        const headers = activeSheet?.headers || [];
                        const kabCol = headers.find(h => {
                          const uh = h.toUpperCase();
                          return uh === 'KDKAB' || uh === 'KD KAB' || uh === 'KABUPATEN' || uh === 'KODE KAB' || uh === 'KODE_KAB' || uh === 'KABUPATEN/KOTA' || uh === 'KABUPATEN_KOTA';
                        }) || headers[0];

                        // Target Column Logic
                        let targetCol = "";
                        if (isSubHeader) {
                          targetCol = headers.find(h => {
                            const uh = h.toUpperCase();
                            return uh === 'ID SUBSEGMEN' || uh === 'IDSUBSEGMEN' || uh === 'SUBSEGMEN' || uh === 'ID_SUBSEG' || uh === 'ID SAMPEL';
                          }) || headers[1];
                        } else {
                          // NAMA PENGGILINGAN Logic
                          targetCol = headers.find(h => {
                            const uh = h.toUpperCase();
                            return uh === 'NAMA PENGGILINGAN' || uh === 'NAMA_PENGGILINGAN' || uh === 'NAMA GILING' || uh === 'PENGGILINGAN' || uh === 'PERUSAHAAN';
                          }) || headers[2] || headers[1];
                        }

                        if (kabCode && sourceData.length > 0 && kabCol) {
                          sourceData = sourceData.filter(item => {
                            const itemKabRaw = String(item[kabCol] ?? '').trim();
                            // Clean itemKab: remove dots (33.17 -> 3317)
                            const itemKab = itemKabRaw.split('-')[0].split(' ')[0].replace(/\./g, '').trim();
                            
                            // Robust matching including 331/3301 edge case
                            return itemKab === kabCode || 
                                   (kabCode === "3301" && itemKab === "331") || 
                                   (kabCode === "331" && itemKab === "3301");
                          });
                        }
                        
                        if (sourceData.length > 0 && targetCol) {
                          const options = Array.from(new Set(sourceData.map(item => String(item[targetCol] ?? '')).filter(Boolean))).sort();
                          
                          if (options.length > 0) {
                            return (
                              <select
                                required
                                value={formData[header] || ""}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  handleInputChange(header, newVal);
                                  
                                  // Auto-fill SKALA if this is Nama Penggilingan
                                  if (!isSubHeader) {
                                    const skalaKey = Object.keys(formData).find(k => isSkalaHeader(k));
                                    if (skalaKey) {
                                      const match = sourceData.find(item => String(item[targetCol] ?? '') === newVal);
                                      if (match) {
                                        const skalaCol = headers.find(h => {
                                          const uh = h.toUpperCase();
                                          return uh === 'SKALA' || uh.includes('SKALA');
                                        }) || headers[2] || headers[3] || headers[1];
                                        
                                        const skalaVal = String(match[skalaCol] ?? '').trim();
                                        if (skalaVal) handleInputChange(skalaKey, skalaVal);
                                      } else {
                                        handleInputChange(skalaKey, "");
                                      }
                                    }
                                  }
                                }}
                                className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main"
                              >
                                <option value="">-- Pilih {header} --</option>
                                {options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            );
                          }
                        }
                        
                        return (
                          <input
                            type="text"
                            required
                            value={formData[header] || ""}
                            onChange={(e) => handleInputChange(header, e.target.value)}
                            className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main disabled:opacity-50"
                            placeholder={!kabCode ? "Pilih Kab dahulu" : !jenisValue ? "Pilih Jenis Sampel dahulu" : `Data ${header} tidak ditemukan`}
                            disabled={!kabCode || !jenisValue}
                          />
                        );
                      }
                    
                    return (
                      <input
                        type={getInputType(header)}
                        required
                        value={formData[header] || ""}
                        onChange={(e) => handleInputChange(header, e.target.value)}
                        className="w-full px-4 py-2.5 bg-bg-main border border-border-main/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-text-main"
                        placeholder={`Input ${header}...`}
                        step="any"
                      />
                    );
                  })()}
                </div>
              ))}
            </div>
 
            <div className="pt-6 border-t border-border-main/30 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => {
                  const cleared: Record<string, string> = {};
                  Object.keys(formData).forEach(k => cleared[k] = "");
                  setFormData(cleared);
                }}
                className="px-6 py-2.5 text-xs font-bold text-text-muted hover:text-text-main uppercase tracking-widest"
              >
                Reset
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{submitting ? "Mengirim..." : "Kirim Data"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-polish overflow-hidden"
        >
          <div className="p-4 border-b border-border-main/30 bg-bg-main flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Database className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Live Sync: {sheetName}</span>
            </div>
            <button 
              onClick={refreshData}
              className="p-2 hover:bg-bg-main rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RotateCw className={cn("w-4 h-4 text-text-muted", loading && "animate-spin")} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-main border-b border-border-main/50">
                  {sheetData?.headers.map(header => (
                    <th key={header} className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/20">
                {sheetData?.data.map((row, idx) => (
                  <tr key={idx} className="group hover:bg-bg-main transition-colors">
                    {sheetData.headers.map(header => (
                      <td key={header} className="px-6 py-4 text-sm font-medium text-text-muted whitespace-nowrap group-hover:text-text-main transition-colors">
                        {(() => {
                          const cleanHeader = header.trim().toUpperCase();
                          // 1. Get raw value with robust key targeting
                          let val = row[header];
                          if (val === undefined || val === null) {
                            const foundKey = Object.keys(row).find(k => k.trim().toUpperCase() === cleanHeader);
                            val = foundKey ? row[foundKey] : null;
                          }
                          
                          if (val === undefined || val === null) return "-";
                          let str = String(val).trim();
                          if (!str || str === "null" || str === "undefined") return "-";

                          // 2. Format ISO dates (e.g. 2026-05-07T17:00:00.000Z) to simple YYYY-MM-DD
                          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
                            return str.split('T')[0];
                          }
                          
                          return str;
                        })()}
                      </td>
                    ))}
                  </tr>
                ))}
                {sheetData?.data.length === 0 && (
                  <tr>
                    <td colSpan={sheetData.headers.length} className="px-6 py-12 text-center text-text-muted font-medium">
                       Belum ada data tersedia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
