import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Factory, Sun, BarChart3, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

interface RegencyData {
  name: string;
  value: number;
}

interface RegencyBarChartProps {
  dryingData: RegencyData[];
  millingData: RegencyData[];
}

export default function RegencyBarChart({ dryingData, millingData }: RegencyBarChartProps) {
  const [activeTab, setActiveTab] = useState<'drying' | 'milling'>('drying');
  const [searchTerm, setSearchTerm] = useState('');

  const currentData = useMemo(() => {
    const data = activeTab === 'drying' ? dryingData : millingData;
    return data
      .filter(item => {
        const name = String(item?.name || "");
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => b.value - a.value);
  }, [activeTab, dryingData, millingData, searchTerm]);

  const color = activeTab === 'drying' ? '#6366f1' : '#10b981';
  const bgColor = activeTab === 'drying' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)';

  // Calculate height based on number of items to prevent crunching
  const chartHeight = Math.max(400, currentData.length * 35);

  return (
    <div className="card-polish flex flex-col h-full bg-bg-card border border-border-main/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-border-main/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg transition-colors", bgColor)}>
            <BarChart3 className={cn("w-5 h-5", activeTab === 'drying' ? "text-primary" : "text-emerald-600")} />
          </div>
          <div>
            <h3 className="font-bold text-text-main tracking-tight">Realisasi Per Kabupaten/Kota</h3>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
              Detail Distribusi Capaian {(activeTab === 'drying' ? 'Pengeringan' : 'Penggilingan')}
            </p>
          </div>
        </div>

        <div className="flex bg-bg-main p-1 rounded-xl items-center border border-border-main/50">
          <button 
            onClick={() => setActiveTab('drying')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-[10px] sm:text-xs font-black rounded-lg transition-all uppercase tracking-wider",
              activeTab === 'drying' ? "bg-bg-card text-primary shadow-sm ring-1 ring-black/5" : "text-text-muted hover:text-text-main"
            )}
          >
            <Sun className="w-3.5 h-3.5" />
            Pengeringan
          </button>
          <button 
            onClick={() => setActiveTab('milling')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-[10px] sm:text-xs font-black rounded-lg transition-all uppercase tracking-wider",
              activeTab === 'milling' ? "bg-bg-card text-emerald-600 shadow-sm ring-1 ring-black/5" : "text-text-muted hover:text-text-main"
            )}
          >
            <Factory className="w-3.5 h-3.5" />
            Penggilingan
          </button>
        </div>
      </div>

      {/* Filter / Search Area */}
      <div className="px-5 py-3 bg-bg-main/30 border-b border-border-main/20 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input 
            type="text" 
            placeholder="Cari Kabupaten/Kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-card border border-border-main/50 rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Total: {currentData.length} Wilayah
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120} 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-main)' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-bg-card border border-border-main shadow-xl p-3 rounded-xl backdrop-blur-md">
                        <p className="text-xs font-black text-text-main mb-1">{data.name}</p>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-text-muted uppercase flex items-center justify-between gap-4">
                            <span>Realisasi:</span>
                            <span className={cn("text-xs font-black", activeTab === 'drying' ? "text-primary" : "text-emerald-600")}>
                              {data.count !== undefined ? data.count : payload[0].value}
                            </span>
                          </p>
                          {data.total !== undefined && (
                            <p className="text-[10px] font-bold text-text-muted uppercase flex items-center justify-between gap-4">
                              <span>Target:</span>
                              <span className="text-xs font-black">
                                {data.total}
                              </span>
                            </p>
                          )}
                          <p className="text-[10px] font-bold text-text-muted uppercase flex items-center justify-between gap-4 border-t border-border-main/20 pt-1 mt-1">
                            <span>Persentase:</span>
                            <span className={cn("text-xs font-black", activeTab === 'drying' ? "text-primary" : "text-emerald-600")}>
                              {payload[0].value}%
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]} 
                barSize={16}
              >
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(val: number) => `${val}%`}
                  style={{ fontSize: '10px', fontWeight: 800, fill: 'var(--text-muted)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer / Summary */}
      <div className="p-4 bg-bg-main/50 border-t border-border-main/30 grid grid-cols-2 gap-4">
        <div className="text-center p-3 rounded-xl bg-bg-card border border-border-main/20 shadow-sm">
          <p className="text-[9px] font-bold text-text-muted uppercase mb-1">Rata-rata</p>
          <p className="text-lg font-black text-text-main">
            {(currentData.reduce((acc, curr) => acc + curr.value, 0) / (currentData.length || 1)).toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-3 rounded-xl bg-bg-card border border-border-main/20 shadow-sm">
          <p className="text-[9px] font-bold text-text-muted uppercase mb-1">Wilayah Aktif</p>
          <p className="text-lg font-black text-text-main">
            {currentData.filter(d => d.value > 0).length}
          </p>
        </div>
      </div>
    </div>
  );
}
