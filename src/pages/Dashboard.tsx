import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, Wheat, Factory, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import RegencyBarChart from '../components/RegencyBarChart';
import { googleSheetService } from '../services/googleSheetService';

const REGIONS = [
  'Semarang', 'Surakarta', 'Magelang', 'Pekalongan', 'Tegal', 'Brebes', 'Cilacap', 'Banyumas',
  'Wonosobo', 'Temanggung', 'Kendal', 'Batang', 'Pemalang', 'Kebumen', 'Purworejo', 'Boyolali',
  'Klaten', 'Sukoharjo', 'Wonogiri', 'Karanganyar', 'Sragen', 'Grobogan', 'Blora', 'Rembang',
  'Pati', 'Kudus', 'Jepara', 'Demak', 'Banjarnegara', 'Salatiga'
];

const dryingData = [
  { name: 'Selesai', value: 65, color: '#6366f1' },
  { name: 'Proses', value: 25, color: '#a5b4fc' },
  { name: 'Belum Mulai', value: 10, color: '#f1f5f9' },
];

const millingData = [
  { name: 'Premium', value: 55, color: '#10b981' },
  { name: 'Medium', value: 30, color: '#6ee7b7' },
  { name: 'Broken', value: 15, color: '#f1f5f9' },
];

const StatCard = ({ title, value, icon: Icon, description, trend, colorClass }: any) => (
  <div className="card-polish p-4 sm:p-6 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className={cn("text-2xl font-bold tracking-tight", colorClass || "text-text-main")}>{value}</h3>
        {description && <p className="text-[10px] text-text-muted font-medium mt-1 uppercase">{description}</p>}
      </div>
      <div className="p-2.5 bg-bg-card/50 rounded-lg border border-border-main/50">
        <Icon className="w-5 h-5 text-text-muted" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-tight">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>{trend}</span>
      </div>
    )}
  </div>
);

const DonutCard = ({ title, data, centerLabel, centerSub }: any) => (
  <div className="card-polish p-4 sm:p-6 h-[320px] sm:h-[340px] flex flex-col">
    <div className="flex justify-between items-center mb-6">
      <h3 className="font-bold text-text-main tracking-tight">{title}</h3>
      <span className="text-[10px] bg-border-main/30 px-2 py-1 rounded text-text-muted font-bold uppercase">Live Update</span>
    </div>
    <div className="flex-1 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '600' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '500', paddingTop: '20px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-10">
        <span className="text-2xl font-extrabold text-text-main leading-none">{centerLabel}%</span>
        <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest mt-1">{centerSub}</span>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = React.useState(true);
  const [activeDryingStage, setActiveDryingStage] = React.useState<'total' | 't1' | 't2'>('t1');
  const [regencyDryingData, setRegencyDryingData] = React.useState<{ name: string; value: number }[]>([]);
  const [regencyMillingData, setRegencyMillingData] = React.useState<{ name: string; value: number }[]>([]);
  const [dryingProgressState, setDryingProgressState] = React.useState<Record<string, { total: number; done1: number; done2: number }>>({});
  const [millingProgressState, setMillingProgressState] = React.useState<Record<string, { total: number; done: number }>>({});
  const [metrics, setMetrics] = React.useState({
    utamaTotal: 0,
    utamaEligible: 0,
    cadanganTotal: 0,
    cadanganEligible: 0,
    utamaGilTotal: 0,
    utamaGilEligible: 0,
    cadanganGilTotal: 0,
    cadanganGilEligible: 0,
    realisasi: 0,
    target: 1360
  });

  const normalizeKab = (name: any) => {
    if (!name) return "";
    const nameStr = String(name).trim();
    // Remove dots and everything after a hyphen (e.g. 33.17 -> 3317, 3317 - REMBANG -> 3317)
    // We also handle cases where only code is provided or only name
    const base = nameStr.split('-')[0].split(' ')[0].replace(/\./g, '').trim();
    // Special case for numerical codes stored as Strings with leading zeros in some places but not others
    // Actually, common codes in this project are 4 digits like 3301
    return base.toUpperCase().replace(/KABUPATEN|KOTA|KAB\./gi, '').trim();
  };

  const normalizeId = (id: any) => {
    if (id === undefined || id === null) return "";
    let s = String(id).trim();
    // Remove .0 suffix often added by Google Sheets/Excel for numeric IDs
    if (s.endsWith('.0')) s = s.substring(0, s.length - 2);
    // Strip leading zeros if the result is purely numeric to avoid mismatch between 04565 and 4565
    if (/^\d+$/.test(s) && s.length > 1) {
      s = String(parseInt(s, 10));
    }
    return s.toUpperCase(); // Ensure IDs match regardless of case
  };

  const getVal = (item: any, keys: string[]) => {
    if (!item) return undefined;
    const itemKeys = Object.keys(item);
    
    // Normalize keys for more robust matching
    const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    const normalizedTargetKeys = keys.map(norm);

    for (const key of itemKeys) {
      const nKey = norm(key);
      if (normalizedTargetKeys.includes(nKey)) {
        const val = item[key];
        if (val !== undefined && val !== null) return val;
      }
    }
    return undefined;
  };

  const getSubsegmenId = (item: any) => {
    const keys = [
      'idsubsegmen', 'ID SUBSEGMEN', 'ID_SUBSEG', 'ID SAMPEL', 'ID_SAMPEL', 'IDSUBSEGMEN', 'ID',
      'ID SAMPEL GILING', 'ID_SAMPEL_GILING', 'IDSAMPELGILING'
    ];
    const val = getVal(item, keys);
    return val !== undefined ? normalizeId(val) : '';
  };

  const getKabCode = (item: any) => {
    // Specifically looking for numeric codes or names
    const keys = ['kdkab', 'KD KAB', 'KDKAB', 'KABUPATEN/KOTA', 'KODE KAB', 'KABUPATEN', 'KODE_KAB', 'KAB'];
    const val = getVal(item, keys);
    return val !== undefined ? normalizeKab(val) : '';
  };

  const getStatus = (item: any) => {
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
    }
    
    const amatanRaw = getVal(item, ['Nilai Amatan', 'AMATAN', 'Hsl Amatan']);
    if (amatanRaw === undefined || amatanRaw === null || String(amatanRaw).trim() === '') return 'Unknown';

    const amatanStr = String(amatanRaw).trim();
    const leadingNumber = parseInt(amatanStr.split('.')[0]);
    if (isNaN(leadingNumber)) return 'Unknown';
    
    return (leadingNumber >= 1 && leadingNumber <= 3) ? 'Eligible' : 'Non Eligible';
  };

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ut, cad, utG, cadG, pnn, ker2] = await Promise.all([
          googleSheetService.fetchData('UTKer'),
          googleSheetService.fetchData('CadKer'),
          googleSheetService.fetchData('UTGil'),
          googleSheetService.fetchData('CadGil'),
          googleSheetService.fetchData('Panen'),
          googleSheetService.fetchData('Kering2')
        ]);

        // Robust CSV parser to handle quotes and commas
        const parseCSVLine = (line: string, delimiter: string = ',') => {
          const result = [];
          let cur = '';
          let inQuotes = false;
          for(let i=0; i<line.length; i++) {
            if (line[i] === '"') inQuotes = !inQuotes;
            else if (line[i] === delimiter && !inQuotes) {
              result.push(cur.trim().replace(/^"|"$/g, ''));
              cur = '';
            } else cur += line[i];
          }
          result.push(cur.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const fetchCSVData = async (url: string) => {
          try {
            const response = await fetch(url);
            let csvText = await response.text();
            csvText = csvText.replace(/^\ufeff/, ''); // Strip BOM
            const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length > 0) {
              // Auto-detect delimiter
              const firstLine = lines[0];
              const commaCount = (firstLine.match(/,/g) || []).length;
              const semiCount = (firstLine.match(/;/g) || []).length;
              const delimiter = semiCount > commaCount ? ';' : ',';

              const headers = parseCSVLine(lines[0], delimiter);
              return lines.slice(1).map(line => {
                const values = parseCSVLine(line, delimiter);
                const obj: any = {};
                headers.forEach((header, i) => {
                  obj[header] = values[i] || '';
                });
                return obj;
              });
            }
          } catch (error) {
            console.error("Error fetching CSV:", error);
          }
          return [];
        };

        // Fetch Tahap 1 and Giling from specific CSV links
        const [ker1List, gilcsvList] = await Promise.all([
          fetchCSVData("https://docs.google.com/spreadsheets/d/e/2PACX-1vQy1qAoq02q-t4DmfFzbCYHmovm0FHdiw4yzrVC1stfJbLfyruK6uKfKVb9Z_dXBcXao3HVQ-xxLy3H/pub?gid=0&single=true&output=csv"),
          fetchCSVData("https://docs.google.com/spreadsheets/d/e/2PACX-1vQy1qAoq02q-t4DmfFzbCYHmovm0FHdiw4yzrVC1stfJbLfyruK6uKfKVb9Z_dXBcXao3HVQ-xxLy3H/pub?gid=300376301&single=true&output=csv")
        ]);

        const utList = ut.data || [];
        const cadList = cad.data || [];
        const utGList = utG.data || [];
        const cadGList = cadG.data || [];
        const pnnList = pnn.data || [];
        const ker2List = ker2.data || [];
        const gilList = gilcsvList; // Using CSV data for Giling

        const utEligible = utList.filter(item => getStatus(item) === 'Eligible').length;
        const cadEligible = cadList.filter(item => getStatus(item) === 'Eligible').length;
        const utGEligible = utGList.filter(item => getStatus(item) === 'Eligible').length;
        const cadGEligible = cadGList.filter(item => getStatus(item) === 'Eligible').length;

        // Aggregate for Regency Bar Chart
        const dryingProgress: Record<string, { total: number; done1: number; done2: number }> = {};
        const millingProgress: Record<string, { total: number; done: number }> = {};

        // Helper to ensure kab exists in dryingProgress
        const ensureDryingKab = (kab: string) => {
          if (!dryingProgress[kab]) dryingProgress[kab] = { total: 0, done1: 0, done2: 0 };
        };

        // 1. Prepare drying targets per regency (UTKer + CadKer)
        [...utList, ...cadList].forEach(item => {
          const kab = getKabCode(item);
          if (kab) {
            ensureDryingKab(kab);
            dryingProgress[kab].total += 1;
          }
        });

        // 2. Prepare milling targets per regency (UTGil + CadGil)
        [...utGList, ...cadGList].forEach(item => {
          const kab = getKabCode(item);
          if (kab) {
            if (!millingProgress[kab]) millingProgress[kab] = { total: 0, done: 0 };
            millingProgress[kab].total += 1;
          }
        });

        // 3. Count completions for drying Tahap 1 (Kering1 from CSV)
        // Filter: 1. berhasil diwawancarai
        const doneKer1Set = new Set();
        ker1List.forEach(item => {
          const kab = getKabCode(item);
          const id = getSubsegmenId(item);
          // Robust result column finding
          const findResultKey = (it: any, code: string) => 
            Object.keys(it).find(k => {
              const nk = k.toUpperCase().replace(/[^A-Z0-0]/g, '');
              return nk.includes(code) || nk.includes('HASIL');
            });

          const hasilKey = findResultKey(item, '207');
          const hasilRaw = hasilKey ? String(item[hasilKey]).trim().toLowerCase() : '';
          
          const isSuccess = /^(1|berhasil)/i.test(hasilRaw) || hasilRaw.includes('berhasil');
          
          if (isSuccess && kab && id && !doneKer1Set.has(`${kab}-${id}`)) {
            ensureDryingKab(kab);
            dryingProgress[kab].done1 += 1;
            doneKer1Set.add(`${kab}-${id}`);
          }
        });

        // 4. Count completions for drying Tahap 2 (Kering2)
        const doneKer2Set = new Set();
        ker2List.forEach(item => {
          const kab = getKabCode(item);
          const id = getSubsegmenId(item);
          if (kab && id && !doneKer2Set.has(`${kab}-${id}`)) {
            ensureDryingKab(kab);
            dryingProgress[kab].done2 += 1;
            doneKer2Set.add(`${kab}-${id}`);
          }
        });

        // 5. Count completions for milling (Giling)
        const doneGilSet = new Set();
        gilList.forEach(item => {
          const kab = getKabCode(item);
          const id = getSubsegmenId(item);
          
          // Robust result column finding
          const findResultKey = (it: any, code: string) => 
            Object.keys(it).find(k => {
              const nk = k.toUpperCase().replace(/[^A-Z0-0]/g, '');
              return nk.includes(code) || nk.includes('HASIL');
            });

          const hasilKey = findResultKey(item, '304');
          const hasilRaw = hasilKey ? String(item[hasilKey]).trim().toLowerCase() : '';
          const isSuccess = /^(1|berhasil)/i.test(hasilRaw) || hasilRaw.includes('berhasil');

          if (isSuccess && kab && id && !doneGilSet.has(`${kab}-${id}`)) {
            if (!millingProgress[kab]) millingProgress[kab] = { total: 0, done: 0 };
            millingProgress[kab].done += 1;
            doneGilSet.add(`${kab}-${id}`);
          }
        });

        setDryingProgressState(dryingProgress);
        setMillingProgressState(millingProgress);

        setMetrics({
          utamaTotal: utList.length,
          utamaEligible: utEligible,
          cadanganTotal: cadList.length,
          cadanganEligible: cadEligible,
          utamaGilTotal: utGList.length,
          utamaGilEligible: utGEligible,
          cadanganGilTotal: cadGList.length,
          cadanganGilEligible: cadGEligible,
          realisasi: pnnList.length,
          target: (utList.length + cadList.length) || 1360
        });
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  React.useEffect(() => {
    if (Object.keys(dryingProgressState).length === 0) return;

    const data = Object.entries(dryingProgressState).map(([name, val]) => {
      let done = 0;
      const progress = val as { total: number; done1: number; done2: number };
      if (activeDryingStage === 't1') done = progress.done1;
      else if (activeDryingStage === 't2') done = progress.done2;
      else done = progress.done2; 

      // If total is 0 but we have work done, consider it 100% or just show the count
      // For the bar chart to render meaningfully, we stick to percentage but handle 0 total
      const denom = progress.total || done || 1;
      const percentage = Math.min(100, Math.round((done / denom) * 100));

      return {
        name,
        value: percentage,
        count: done,
        total: progress.total
      };
    }).filter(d => d.value > 0 || d.total > 0)
    .sort((a, b) => b.value - a.value || b.count - a.count);

    setRegencyDryingData(data);
  }, [activeDryingStage, dryingProgressState]);

  React.useEffect(() => {
    if (Object.keys(millingProgressState).length === 0) return;

    const data = Object.entries(millingProgressState).map(([name, val]) => {
      const progress = val as { total: number; done: number };
      const denom = progress.total || progress.done || 1;
      const percentage = Math.min(100, Math.round((progress.done / denom) * 100));

      return {
        name,
        value: percentage,
        count: progress.done,
        total: progress.total
      };
    }).filter(d => d.value > 0 || (d.total !== undefined && d.total > 0))
    .sort((a, b) => b.value - a.value || b.count - a.count);

    setRegencyMillingData(data);
  }, [millingProgressState]);


  const percentRealisasi = metrics.target > 0 
    ? Math.min(100, Math.round((metrics.realisasi / metrics.target) * 100)) 
    : 0;

  const realizationData = [
    { name: 'Terealisasi', value: metrics.realisasi, color: '#6366f1' },
    { name: 'Sisa Target', value: Math.max(0, metrics.target - metrics.realisasi), color: '#f1f5f9' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Utama Kering" 
          value={metrics.utamaTotal.toLocaleString()} 
          icon={Wheat} 
          description={`Eligible: ${metrics.utamaEligible}`}
          colorClass="text-primary" 
        />
        <StatCard 
          title="Cadangan Kering" 
          value={metrics.cadanganTotal.toLocaleString()} 
          icon={Wheat} 
          description={`Eligible: ${metrics.cadanganEligible}`}
          colorClass="text-orange-500" 
        />
        <StatCard 
          title="Utama Giling" 
          value={metrics.utamaGilTotal.toLocaleString()} 
          icon={Wheat} 
          description={`Eligible: ${metrics.utamaGilEligible}`}
          colorClass="text-emerald-600"
        />
        <StatCard 
          title="Cadangan Giling" 
          value={metrics.cadanganGilTotal.toLocaleString()} 
          icon={Wheat} 
          description={`Eligible: ${metrics.cadanganGilEligible}`}
          colorClass="text-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
        >
          <DonutCard 
            title="Progres Realisasi Panen" 
            data={realizationData} 
            centerLabel={percentRealisasi} 
            centerSub="Target" 
          />
        </motion.div>
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
        >
          <DonutCard title="Efisiensi Giling (Premium)" data={millingData} centerLabel="55" centerSub="Premium" />
        </motion.div>
      </div>

      <div className="w-full">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h4 className="text-sm font-black text-text-main uppercase tracking-widest mb-1">Filter Tahap Pengeringan</h4>
            <p className="text-[10px] text-text-muted font-bold">Pilih data yang ingin ditampilkan pada grafik</p>
          </div>
          <div className="flex bg-bg-main p-1 rounded-xl items-center border border-border-main/50 shadow-inner">
            <button 
              onClick={() => setActiveDryingStage('t1')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                activeDryingStage === 't1' ? "bg-bg-card text-primary shadow-sm border border-border-main/50" : "text-text-muted hover:text-text-main"
              )}
            >
              Tahap 1
            </button>
            <button 
              onClick={() => setActiveDryingStage('t2')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                activeDryingStage === 't2' ? "bg-bg-card text-primary shadow-sm border border-border-main/50" : "text-text-muted hover:text-text-main"
              )}
            >
              Tahap 2
            </button>
            <button 
              onClick={() => setActiveDryingStage('total')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                activeDryingStage === 'total' ? "bg-bg-card text-primary shadow-sm border border-border-main/50" : "text-text-muted hover:text-text-main"
              )}
            >
              Selesai
            </button>
          </div>
        </div>
        <RegencyBarChart dryingData={regencyDryingData} millingData={regencyMillingData} />
      </div>

    </div>
  );
}
