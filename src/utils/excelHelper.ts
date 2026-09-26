import * as XLSX from 'xlsx';
import { DayColumn, LineOECData, MonthlyTrendItem } from '../types/oec';

/**
 * Generate and download an Excel template file for OEC data
 */
export function downloadOECTemplate(days: DayColumn[], lines: LineOECData[]) {
  // Build 2D array representation matching the UI table
  const headers = ['Plant', 'Prod.line', 'Category', ...days.map(d => `${d.day} ${d.weekday}`)];

  const rows: (string | number)[][] = [headers];

  lines.forEach(line => {
    // Planning
    const planRow: (string | number)[] = [line.plant, line.prodLine, 'Planning'];
    days.forEach(d => {
      planRow.push(line.planning[d.day] ?? '');
    });
    rows.push(planRow);

    // Act
    const actRow: (string | number)[] = [line.plant, line.prodLine, 'Act'];
    days.forEach(d => {
      actRow.push(line.act[d.day] ?? '');
    });
    rows.push(actRow);

    // Gap
    const gapRow: (string | number)[] = [line.plant, line.prodLine, 'Gap'];
    days.forEach(d => {
      const p = line.planning[d.day];
      const a = line.act[d.day];
      if (a !== null && a !== undefined) {
        gapRow.push(a - (p || 0));
      } else {
        gapRow.push('');
      }
    });
    rows.push(gapRow);

    // Work Time
    const wtRow: (string | number)[] = [line.plant, line.prodLine, 'Work Time'];
    days.forEach(d => {
      wtRow.push(line.workTime[d.day] ?? '');
    });
    rows.push(wtRow);

    // UPH
    const uphRow: (string | number)[] = [line.plant, line.prodLine, 'UPH'];
    days.forEach(d => {
      const a = line.act[d.day];
      const wt = line.workTime[d.day];
      if (a && wt && wt > 0) {
        uphRow.push(Math.round(a / wt));
      } else {
        uphRow.push('');
      }
    });
    rows.push(uphRow);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 18 }, // Plant
    { wch: 12 }, // Prod.line
    { wch: 14 }, // Category
    ...days.map(() => ({ wch: 8 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily OEC');

  XLSX.writeFile(wb, `OEC_Production_Efficiency_Data.xlsx`);
}

/**
 * Export current matrix to CSV
 */
export function exportToCSV(days: DayColumn[], lines: LineOECData[], filename = 'OEC_Data.csv') {
  const headers = ['Plant', 'Prod.line', 'Category', ...days.map(d => `${d.day}_${d.weekday}`)];
  const rows: (string | number)[][] = [headers];

  lines.forEach(line => {
    const planRow: (string | number)[] = [line.plant, line.prodLine, 'Planning'];
    const actRow: (string | number)[] = [line.plant, line.prodLine, 'Act'];
    const gapRow: (string | number)[] = [line.plant, line.prodLine, 'Gap'];
    const wtRow: (string | number)[] = [line.plant, line.prodLine, 'Work Time'];
    const uphRow: (string | number)[] = [line.plant, line.prodLine, 'UPH'];

    days.forEach(d => {
      const p = line.planning[d.day];
      const a = line.act[d.day];
      const wt = line.workTime[d.day];

      planRow.push(p !== null && p !== undefined ? p : '');
      actRow.push(a !== null && a !== undefined ? a : '');
      gapRow.push(a !== null && a !== undefined ? a - (p || 0) : '');
      wtRow.push(wt !== null && wt !== undefined ? wt : '');
      uphRow.push(a && wt && wt > 0 ? Math.round(a / wt) : '');
    });

    rows.push(planRow, actRow, gapRow, wtRow, uphRow);
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse an uploaded Excel or CSV file
 */
export async function parseUploadedFile(file: File): Promise<{
  lines: LineOECData[];
  days: DayColumn[];
  monthlyProd?: MonthlyTrendItem[];
  monthlyUph?: MonthlyTrendItem[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });

        if (!json || json.length < 2) {
          throw new Error('ไฟล์ไม่มีข้อมูลเพียงพอ กรุณาตรวจสอบหัวตารางและเนื้อหา');
        }

        // Header row
        const headerRow = json[0].map(h => String(h).trim());

        // Detect day columns: columns after Plant, Prod.line, Category
        // Usually index 3 onwards
        let plantColIdx = -1;
        let lineColIdx = -1;
        let catColIdx = -1;

        headerRow.forEach((col, idx) => {
          const lower = col.toLowerCase();
          if (lower.includes('plant') || lower.includes('โรงงาน')) plantColIdx = idx;
          else if (lower.includes('line') || lower.includes('prod') || lower.includes('สายการผลิต')) lineColIdx = idx;
          else if (lower.includes('cat') || lower.includes('ประเภท') || lower.includes('รายการ')) catColIdx = idx;
        });

        // Fallback default indices if not matched
        if (plantColIdx === -1) plantColIdx = 0;
        if (lineColIdx === -1) lineColIdx = 1;
        if (catColIdx === -1) catColIdx = 2;

        const dayStartIndex = Math.max(plantColIdx, lineColIdx, catColIdx) + 1;
        const parsedDays: DayColumn[] = [];

        for (let c = dayStartIndex; c < headerRow.length; c++) {
          const headerText = headerRow[c];
          if (!headerText) continue;

          // Parse day and weekday e.g. "1 TUE", "2_WEN", or just "1"
          const match = headerText.match(/(\d+)\s*[_/\s-]?\s*([A-Za-z]+)?/);
          if (match) {
            const dayNum = parseInt(match[1], 10);
            const weekday = match[2] ? match[2].toUpperCase() : 'DAY';
            parsedDays.push({ day: dayNum, weekday });
          } else {
            const numOnly = parseInt(headerText, 10);
            if (!isNaN(numOnly)) {
              parsedDays.push({ day: numOnly, weekday: 'DAY' });
            }
          }
        }

        // If no day columns could be parsed, fallback to 1..25
        if (parsedDays.length === 0) {
          for (let i = 1; i <= 25; i++) {
            parsedDays.push({ day: i, weekday: 'DAY' });
          }
        }

        // Parse lines
        const linesMap: { [key: string]: LineOECData } = {};

        for (let r = 1; r < json.length; r++) {
          const row = json[r];
          if (!row || row.length === 0) continue;

          const plant = String(row[plantColIdx] || '').trim();
          const prodLine = String(row[lineColIdx] || '').trim();
          const category = String(row[catColIdx] || '').trim().toLowerCase();

          if (!prodLine) continue;

          const lineKey = `${plant}_${prodLine}`;
          if (!linesMap[lineKey]) {
            linesMap[lineKey] = {
              id: `line-${prodLine.toLowerCase().replace(/\s+/g, '-')}`,
              plant: plant || 'HTC Ref(泰国冰箱)',
              prodLine: prodLine,
              planning: {},
              act: {},
              workTime: {},
            };
          }

          const currentLine = linesMap[lineKey];

          parsedDays.forEach((d, dIdx) => {
            const colIndex = dayStartIndex + dIdx;
            const valRaw = row[colIndex];
            const num = valRaw !== '' && valRaw !== undefined && valRaw !== null ? Number(valRaw) : null;

            if (category.includes('plan') || category.includes('แผน')) {
              currentLine.planning[d.day] = num !== null && !isNaN(num) ? num : null;
            } else if (category === 'act' || category.includes('act') || category.includes('จริง')) {
              currentLine.act[d.day] = num !== null && !isNaN(num) ? num : null;
            } else if (category.includes('work') || category.includes('time') || category.includes('เวลา') || category.includes('ชม')) {
              currentLine.workTime[d.day] = num !== null && !isNaN(num) ? num : null;
            }
          });
        }

        const resultLines = Object.values(linesMap);
        if (resultLines.length === 0) {
          throw new Error('ไม่พบข้อมูลสายการผลิตในไฟล์ กรุณาตรวจสอบฟอร์แมต');
        }

        resolve({
          lines: resultLines,
          days: parsedDays,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านไฟล์';
        reject(new Error(errorMsg));
      }
    };

    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการโหลดไฟล์'));
    reader.readAsArrayBuffer(file);
  });
}
