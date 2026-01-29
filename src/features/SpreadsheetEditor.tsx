import { useState } from 'react';
import { motion } from 'framer-motion';
import { Table, Download, Upload, Plus, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

interface Cell {
  value: string;
  formula?: string;
}

interface SpreadsheetData {
  [key: string]: Cell;
}

export function SpreadsheetEditor() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [data, setData] = useState<SpreadsheetData>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(8);

  const getCellKey = (row: number, col: number) => `${String.fromCharCode(65 + col)}${row + 1}`;
  const getCellDisplay = (row: number, col: number) => {
    const key = getCellKey(row, col);
    return data[key]?.value || '';
  };

  const handleCellClick = (row: number, col: number) => {
    const key = getCellKey(row, col);
    setSelectedCell(key);
    setEditValue(data[key]?.value || '');
  };

  const handleCellUpdate = () => {
    if (!selectedCell) return;
    
    const newData = { ...data };
    
    // Check if it's a formula
    if (editValue.startsWith('=')) {
      try {
        const formula = editValue.substring(1);
        // Simple formula evaluation (sum, avg, etc.)
        let result = evaluateFormula(formula, data);
        newData[selectedCell] = { value: result, formula: editValue };
      } catch (e) {
        newData[selectedCell] = { value: '#ERROR!', formula: editValue };
      }
    } else {
      newData[selectedCell] = { value: editValue };
    }
    
    setData(newData);
    setSelectedCell(null);
  };

  const evaluateFormula = (formula: string, allData: SpreadsheetData): string => {
    // Simple formula parser
    formula = formula.toUpperCase();
    
    if (formula.startsWith('SUM(')) {
      const range = formula.match(/SUM\(([A-Z]\d+):([A-Z]\d+)\)/);
      if (range) {
        // Simple sum implementation
        return '0'; // Placeholder
      }
    }
    
    // Try to evaluate as math expression
    try {
      // Replace cell references with values
      let expr = formula;
      const cellRefs = formula.match(/[A-Z]\d+/g) || [];
      cellRefs.forEach(ref => {
        const val = parseFloat(allData[ref]?.value || '0');
        expr = expr.replace(ref, val.toString());
      });
      
      // eslint-disable-next-line no-eval
      const result = eval(expr);
      return result.toString();
    } catch (e) {
      return '#ERROR!';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellUpdate();
    } else if (e.key === 'Escape') {
      setSelectedCell(null);
    }
  };

  const addRow = () => setRows(r => r + 1);
  const addCol = () => setCols(c => c + 1);

  const downloadExcel = () => {
    const wsData: (string | number)[][] = [];
    
    // Header row
    const header = [''];
    for (let c = 0; c < cols; c++) {
      header.push(String.fromCharCode(65 + c));
    }
    wsData.push(header);
    
    // Data rows
    for (let r = 0; r < rows; r++) {
      const row: (string | number)[] = [r + 1];
      for (let c = 0; c < cols; c++) {
        const key = getCellKey(r, c);
        const val = data[key]?.value || '';
        row.push(isNaN(Number(val)) ? val : Number(val));
      }
      wsData.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'zidni-spreadsheet.xlsx');
  };

  const uploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (data) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        
        // Convert to our format
        const newData: SpreadsheetData = {};
        jsonData.forEach((row, rIndex) => {
          row.forEach((cell, cIndex) => {
            if (cell !== undefined && cell !== null && cell !== '') {
              const key = getCellKey(rIndex, cIndex);
              newData[key] = { value: String(cell) };
            }
          });
        });
        
        setData(newData);
        setRows(Math.max(rows, jsonData.length));
        setCols(Math.max(cols, jsonData[0]?.length || 0));
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <Table className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('spreadsheetEditor.title')}</h1>
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{t('spreadsheetEditor.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-2 px-3 py-2 border border-kimi-border rounded-lg hover:bg-kimi-bg-hover cursor-pointer transition-colors ${isRTL ? 'font-arabic' : ''}`}>
            <Upload className="w-4 h-4" />
            {t('spreadsheetEditor.import')}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={uploadExcel} className="hidden" />
          </label>
          <button
            onClick={downloadExcel}
            className={`flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('spreadsheetEditor.export')}
          </button>
        </div>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`flex items-center gap-2 mb-4 p-2 bg-kimi-bg-sidebar rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <button onClick={addRow} className={`flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-white rounded transition-colors ${isRTL ? 'font-arabic' : ''}`}>
          <Plus className="w-4 h-4" />
          {isRTL ? 'صف' : 'Row'}
        </button>
        <button onClick={addCol} className={`flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-white rounded transition-colors ${isRTL ? 'font-arabic' : ''}`}>
          <Plus className="w-4 h-4" />
          {isRTL ? 'عمود' : 'Col'}
        </button>
        <div className="w-px h-6 bg-kimi-border mx-2" />
        <span className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>
          {rows} × {cols}
        </span>
        <div className="flex-1" />
        {selectedCell && (
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{selectedCell}:</span>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCellUpdate}
              autoFocus
              className="px-3 py-1 border border-kimi-border rounded text-sm outline-none focus:ring-2 focus:ring-green-300"
              dir="ltr"
            />
          </div>
        )}
      </motion.div>

      {/* Spreadsheet Grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 overflow-auto bg-white rounded-2xl border border-kimi-border"
      >
        <div className="inline-block min-w-full">
          {/* Header Row */}
          <div className="flex sticky top-0 z-10">
            <div className="w-12 h-8 bg-kimi-bg-sidebar border-b border-r border-kimi-border flex items-center justify-center text-xs text-kimi-text-muted">
              {/* Corner cell */}
            </div>
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={`h-${c}`}
                className="w-24 h-8 bg-kimi-bg-sidebar border-b border-r border-kimi-border flex items-center justify-center text-xs font-medium text-kimi-text"
              >
                {String.fromCharCode(65 + c)}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {Array.from({ length: rows }).map((_, r) => (
            <div key={`r-${r}`} className="flex">
              <div className="w-12 h-8 bg-kimi-bg-sidebar border-b border-r border-kimi-border flex items-center justify-center text-xs text-kimi-text-muted sticky left-0">
                {r + 1}
              </div>
              {Array.from({ length: cols }).map((_, c) => {
                const key = getCellKey(r, c);
                const isSelected = selectedCell === key;
                const displayValue = getCellDisplay(r, c);
                
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className={`w-24 h-8 border-b border-r border-kimi-border flex items-center px-2 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-green-100 border-green-300'
                        : 'hover:bg-kimi-bg-hover'
                    }`}
                  >
                    <span className={`truncate ${isRTL ? 'font-arabic' : ''}`}>{displayValue}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Formula Bar */}
      {selectedCell && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-3 bg-kimi-bg-sidebar rounded-xl flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Calculator className="w-5 h-5 text-kimi-text-muted" />
          <span className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{isRTL ? 'الصيغ:' : 'Formulas:'}</span>
          <code className="text-sm bg-white px-3 py-1 rounded border border-kimi-border">
            =SUM(A1:A10) =AVERAGE(B1:B5) =A1+B1
          </code>
        </motion.div>
      )}
    </div>
  );
}
