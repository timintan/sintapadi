import React, { useState, useEffect } from 'react';
import { Save, Globe, Database, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [apiUrl, setApiUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedUrl = localStorage.getItem('konver_api_url') || 'https://script.google.com/macros/s/AKfycbzIqjMa4HLaR2iNvB7b55BtZG9yP-opFKRKpjHEK3j9XPe7JPw5ZT-nDmQYJcg5Xec0aw/exec';
    setApiUrl(storedUrl);
  }, []);

  const handleSave = () => {
    localStorage.setItem('konver_api_url', apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 lg:space-y-8">
      <div className="card-polish p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 lg:p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-indigo-900">
          <AlertCircle className="w-6 h-6 flex-shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-bold">Informasi Konektivitas</p>
            <p className="opacity-70">URL API digunakan untuk sinkronisasi data real-time dengan Google Spreadsheet Anda.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
            <Globe className="w-4 h-4 text-primary" />
            Spreadsheet API Endpoint (Legacy/Web App)
          </label>
          <input 
            type="url" 
            placeholder="https://script.google.com/macros/s/.../exec"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="input-polish font-medium text-slate-700"
          />
        </div>

        <div className="pt-2">
          <button 
            onClick={handleSave}
            className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-xl shadow-primary/20"
          >
            <Save className="w-5 h-5" />
            <span className="tracking-tight">{saved ? 'Konfigurasi Disimpan!' : 'Update Lokasi API'}</span>
          </button>
        </div>

        <div className="pt-8 border-t border-slate-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <Database className="w-4 h-4" />
                    <span>Sync Protocol v1.02</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Secure Connection</span>
                </div>
            </div>
        </div>
      </div>

      <div className="card-polish p-6 lg:p-10">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between text-sm lg:text-base">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-400" />
              Langkah Integrasi Backend
            </div>
          </h3>
          <div className="space-y-6">
            {[
              "Buka project spreadsheet target konversi.",
              "Salin skrip backend 'KonverEngine.gs' di bawah ini.",
              "Buka 'Extensions' -> 'Apps Script' di Spreadsheet.",
              "Hapus kode lama dan paste kode di bawah.",
              "Deploy sebagai 'Web App', Execute as 'Me', Who has access 'Anyone'.",
              "Paste URL yang dihasilkan di input atas."
            ].map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-6 h-6 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
                  {idx + 1}
                </div>
                <p className="text-sm text-slate-600 font-medium">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KonverEngine.gs Code :</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                  alert('Kode disalin!');
                }}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
              >
                Copy Code
              </button>
            </div>
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10px] sm:text-xs font-mono overflow-x-auto max-h-[400px] scrollbar-thin scrollbar-thumb-slate-700">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>
      </div>
    </div>
  );
}

const APPS_SCRIPT_CODE = `/**
 * KONVER PADI - GOOGLE APPS SCRIPT BACKEND
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Spreadsheet.
 * 2. Go to 'Extensions' -> 'Apps Script'.
 * 3. Delete any existing code and paste this script.
 * 4. Create sheets with these names: 'Kering1', 'Kering2', 'Giling', 'Panen', 'PetKer', 'PetGil'.
 * 5. Click 'Deploy' -> 'New Deployment'.
 * 6. Select 'Web App' as the type.
 * 7. Set 'Execute As' to 'Me'.
 * 8. Set 'Who has access' to 'Anyone'.
 * 9. Copy the Web App URL and paste it into the SINTA PADI Settings page.
 */

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheetName || e.parameter.sheet || e.parameter.name;
  
  if (action === 'read') {
    return handleRead(sheetName);
  }
  
  // Default response if no action or unknown action
  return JSONResponse({
    status: "success",
    message: "SINTA PADI Engine v1.0.2 is online. Current context: " + (sheetName || "Root")
  });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sheetName;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const lastCol = sheet.getLastColumn();
    let headers = [];
    
    if (lastCol > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }
    
    // Prepare row data
    const rowData = [];
    if (headers.length === 0) {
      // If sheet empty, create headers from data keys
      const keys = Object.keys(data).filter(k => k !== 'sheetName');
      sheet.appendRow(keys);
      headers = keys;
    }
    
    headers.forEach(h => {
      // Match case-insensitive
      const key = Object.keys(data).find(k => k.toUpperCase() === h.trim().toUpperCase());
      rowData.push(key ? data[key] : "");
    });
    
    sheet.appendRow(rowData);
    
    return JSONResponse({ success: true, message: "Data saved to " + sheetName });
  } catch (err) {
    return JSONResponse({ success: false, error: err.toString() });
  }
}

function handleRead(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return JSONResponse({ 
        status: "error", 
        message: "Sheet '" + sheetName + "' not found.",
        headers: [],
        data: []
      });
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      return JSONResponse({ 
        sheetName: sheetName,
        headers: [],
        data: []
      });
    }
    
    const headers = data[0];
    const rows = data.length > 1 ? data.slice(1) : [];
    
    // Convert rows to objects for easier frontend consumption
    const objectRows = rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i];
      });
      return obj;
    });
    
    const response = {
      sheetName: sheetName,
      headers: headers,
      data: objectRows
    };
    
    // Also include a key with the sheet name for compatibility
    response[sheetName] = objectRows;
    
    return JSONResponse(response);
  } catch (err) {
    return JSONResponse({ status: "error", message: err.toString() });
  }
}

function JSONResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
