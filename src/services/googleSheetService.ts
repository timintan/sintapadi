export interface SheetData {
  sheetName: string;
  data: any[];
  headers: string[];
}

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('konver_api_url') || "https://script.google.com/macros/s/AKfycbzIqjMa4HLaR2iNvB7b55BtZG9yP-opFKRKpjHEK3j9XPe7JPw5ZT-nDmQYJcg5Xec0aw/exec";
  }
  return "https://script.google.com/macros/s/AKfycbzIqjMa4HLaR2iNvB7b55BtZG9yP-opFKRKpjHEK3j9XPe7JPw5ZT-nDmQYJcg5Xec0aw/exec";
};

const API_URL = getApiUrl();

const FALLBACK_HEADERS: Record<string, string[]> = {
  "Kering1": [
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
  ],
  "Kering2": [
    "KABUPATEN/KOTA",
    "NAMA PETUGAS SKGB",
    "TANGGAL PENGUKURAN TAHAP 2",
    "ID SAMPEL",
    "BERAT GABAH KERING (KG)",
    "KADAR AIR TAHAP 2 (%)",
    "SUHU PENYIMPANAN",
    "CATATAN"
  ],
  "Giling": [
    "KABUPATEN/KOTA",
    "NAMA PETUGAS",
    "ID SAMPEL GILING",
    "TANGGAL PENGGILINGAN",
    "VARIETAS GABAH",
    "BERAT GABAH MASUK (KG)",
    "BERAT BERAS KELUAR (KG)",
    "RENDEMEN (%)",
    "KUALITAS BERAS (PREMIUM/MEDIUM)"
  ],
  "Panen": [
    "KABUPATEN/KOTA",
    "NAMA PETUGAS",
    "ID SAMPEL",
    "TANGGAL PANEN",
    "VARIETAS",
    "LUAS PANEN (HA)",
    "LOKASI PANEN (LAT, LONG)"
  ],
  "PetKer": [
    "KdKab",
    "NamaPetugas"
  ],
  "PetGil": [
    "KdKab",
    "NamaPetugas"
  ],
  "UTKer": [
    "kdkab",
    "idsubsegmen",
    "Nilai Amatan"
  ],
  "CadKer": [
    "kdkab",
    "idsubsegmen",
    "Nilai Amatan"
  ],
  "UTGil": [
    "kdkab",
    "idsubsegmen",
    "Nilai Amatan"
  ],
  "CadGil": [
    "kdkab",
    "idsubsegmen",
    "Nilai Amatan"
  ]
};

export const googleSheetService = {
  async fetchData(sheetName: string): Promise<SheetData> {
    const currentUrl = getApiUrl();
    try {
      const response = await fetch(`${currentUrl}?action=read&sheetName=${encodeURIComponent(sheetName)}&sheet=${encodeURIComponent(sheetName)}&name=${encodeURIComponent(sheetName)}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      
      if (result && result.status === "error") {
        throw new Error(result.message || "Google Script error");
      }

      // Improved data discovery - prioritize sheet-specific keys
      let data: any[] = [];
      let headers: string[] = [];

      if (Array.isArray(result)) {
        data = result;
      } else if (result && typeof result === 'object') {
        // Try sheet-specific key first to avoid merged data from a global 'data' key
        const sheetKey = Object.keys(result).find(k => k.toLowerCase() === sheetName.toLowerCase());
        const sheetContext = sheetKey ? result[sheetKey] : null;

        if (sheetContext) {
          const potentialData = Array.isArray(sheetContext) 
            ? sheetContext 
            : (sheetContext.data || sheetContext.values || sheetContext.rows || []);
          data = Array.isArray(potentialData) ? potentialData : [];
          headers = (sheetContext.headers || sheetContext.columns || []).map((h: any) => String(h).trim());
        }

        // Only fallback if sheet-specific search failed
        if (data.length === 0) {
          const potentialData = result.data || result.values || result.rows || result.result || result.items || [];
          data = Array.isArray(potentialData) ? potentialData : [];
          headers = (result.headers || result.columns || []).map((h: any) => String(h).trim());
        }
        
        // Final broad fallback search
        if (data.length === 0) {
          for (const key in result) {
            if (Array.isArray(result[key]) && result[key].length > 0) {
              if (['headers', 'columns', 'status', 'message'].includes(key.toLowerCase())) continue;
              data = result[key];
              break;
            }
          }
        }
      }

      // If data is array of objects, extract headers if missing
      if (headers.length === 0 && data.length > 0 && !Array.isArray(data[0])) {
        headers = Object.keys(data[0]);
      }

      if (!headers || headers.length === 0) {
        headers = (FALLBACK_HEADERS[sheetName] || []).map(h => h.trim());
      }

      // If data is array of arrays, and headers match columns, check if row 1 is header string
      if (data.length > 0 && Array.isArray(data[0]) && headers.length > 0) {
        const firstRow = data[0].map((v: any) => String(v).toUpperCase().trim());
        const headerMatches = headers.some(h => firstRow.includes(h.toUpperCase().trim()));
        if (headerMatches) {
          data = data.slice(1);
        }
      }

      // Normalize data to objects for consistent UI access
      const normalizedData = data.map((row: any) => {
        if (!Array.isArray(row)) return row;
        const obj: Record<string, any> = {};
        // If data is array but headers are fewer, it's still mapped safely by index
        headers.forEach((header, idx) => {
          obj[header] = row[idx];
        });
        return obj;
      });

      return { sheetName, data: normalizedData, headers };
    } catch (error) {
      console.error(`Error fetching ${sheetName}:`, error);
      return { 
        sheetName, 
        data: [], 
        headers: FALLBACK_HEADERS[sheetName] || [] 
      };
    }
  },

  async submitData(sheetName: string, payload: any): Promise<{ success: boolean; message: string }> {
    const currentUrl = getApiUrl();
    try {
      const dataToSubmit = { ...payload };
      const response = await fetch(currentUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheetName, ...dataToSubmit }),
      });
      return { success: true, message: "Data submitted successfully" };
    } catch (error) {
       console.error("Error submitting data:", error);
       return { success: false, message: String(error) };
    }
  },

  async getReferenceData(sheetName: string): Promise<any[]> {
    const result = await this.fetchData(sheetName);
    const { data, headers } = result;

    if (!data || data.length === 0) return [];

    if (Array.isArray(data[0])) {
      return data.map((row: any) => {
        const obj: Record<string, any> = {};
        const lookupHeaders = headers.length > 0 ? headers : (FALLBACK_HEADERS[sheetName] || ['KdKab', 'NamaPetugas']);
        lookupHeaders.forEach((header, idx) => {
          obj[header] = row[idx];
        });
        return obj;
      });
    }

    return data;
  }
};
