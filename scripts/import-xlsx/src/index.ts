import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MonthlyBillData, UtilityBill, ResidentDailyWeights } from '@house-bills/bills-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../');
const XLSX_PATH = resolve(REPO_ROOT, 'CONTAS CASA 21.xlsx');
const DATA_OUT = resolve(REPO_ROOT, 'data/months');

const PLACEHOLDER_RESIDENT = 'null';

// Row indices (0-based) within each monthly sheet
// Structure: 3 utility blocks, each 12 rows apart
// LUZ block starts at row 5 (0-based), GÁS at row 17, ÁGUA at row 29
const UTILITY_BLOCKS = [
  { type: 'electricity' as const, label: 'Luz', headerRow: 5, dayRow: 6, firstResidentRow: 7, totalWeightsRow: 15 },
  { type: 'gas' as const, label: 'Gás', headerRow: 17, dayRow: 18, firstResidentRow: 19, totalWeightsRow: 27 },
  { type: 'water' as const, label: 'Água', headerRow: 29, dayRow: 30, firstResidentRow: 31, totalWeightsRow: 39 },
];

// Summary info block positions (0-based row)
const SUMMARY_ROW = 0; // row 1 in spreadsheet = index 0
const GAS_ROW = 1;
const WATER_ROW = 2;

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    const y = String(date.y).padStart(4, '0');
    const m = String(date.m).padStart(2, '0');
    const d = String(date.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function cellValue(ws: XLSX.WorkSheet, row: number, col: number): unknown {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  return cell?.v ?? null;
}

function parseMonthSheet(
  ws: XLSX.WorkSheet,
  monthId: string,
  monthLabel: string,
  internetFixedCost: number | null,
): MonthlyBillData {
  // Col 15 of the gas summary row (row index 1) holds the date the new cylinder was opened.
  const gasCylinderRaw = cellValue(ws, 1, 15);
  const gasCylinderDate = toIsoDate(gasCylinderRaw);
  // Parse the top summary rows (rows 0,1,2) to get totals and dates
  // Col layout: [0]=empty,[1]=empty,[2]=label,[3]=empty,[4]=total,[5]='PARTES',[6]=partes,[7]='EURO/PARTE',[8]=euroPerParte
  //             [10]='Datas',[11]=periodStart,[12]=periodEnd,[13]=label,[14]=notes?,[15]=nextGasDate?

  const utilitySummaryRows = [0, 1, 2];
  const utilityTypes: UtilityBill['type'][] = ['electricity', 'gas', 'water'];

  const utilityMeta: Array<{ type: UtilityBill['type']; label: string; total: number; periodStart: string; periodEnd: string; notes: string | null }> = [];

  for (let i = 0; i < 3; i++) {
    const row = utilitySummaryRows[i]!;
    const type = utilityTypes[i]!;
    const total = (cellValue(ws, row, 4) as number) ?? 0;
    const startRaw = cellValue(ws, row, 11);
    const endRaw = cellValue(ws, row, 12);
    const periodStart = toIsoDate(startRaw) ?? '';
    const periodEnd = toIsoDate(endRaw) ?? '';
    const notesRaw = cellValue(ws, row, 14);
    const notes = typeof notesRaw === 'string' ? notesRaw : null;
    const labels = ['Luz', 'Gás', 'Água'];
    utilityMeta.push({ type, label: labels[i]!, total, periodStart, periodEnd, notes });
  }

  // Parse each utility block to get daily weights per resident
  const allResidentNames: string[] = [];
  const residentWeightMaps: Map<string, Record<string, number | null>> = new Map();

  for (const block of UTILITY_BLOCKS) {
    // Day header row: col 0 = 'DIA', col 1..N = dates until non-date
    const days: string[] = [];
    let col = 1;
    while (true) {
      const raw = cellValue(ws, block.dayRow, col);
      if (raw == null || raw === '#NAME?') break;
      const iso = toIsoDate(raw);
      if (!iso) break;
      days.push(iso);
      col++;
    }

    // Resident rows: from firstResidentRow until 'Total PESOS' or similar
    let resRow = block.firstResidentRow;
    while (resRow < block.totalWeightsRow) {
      const residentName = cellValue(ws, resRow, 0);
      if (typeof residentName !== 'string' || residentName === 'Total PESOS') break;

      if (!residentWeightMaps.has(residentName)) {
        residentWeightMaps.set(residentName, {});
        allResidentNames.push(residentName);
      }

      const weightMap = residentWeightMaps.get(residentName)!;
      for (let d = 0; d < days.length; d++) {
        const day = days[d]!;
        const w = cellValue(ws, resRow, d + 1);
        // Only set if not already set (another utility block may cover overlapping dates)
        if (!(day in weightMap)) {
          weightMap[day] = typeof w === 'number' ? w : null;
        }
      }

      resRow++;
    }
  }

  const residents: ResidentDailyWeights[] = allResidentNames.map((name) => ({
    resident: name,
    days: residentWeightMaps.get(name) ?? {},
  }));

  const utilities: UtilityBill[] = utilityMeta.map(({ type, label, total, periodStart, periodEnd, notes }) => ({
    type,
    label,
    total,
    periodStart,
    periodEnd,
    notes,
  }));

  return { monthId, monthLabel, utilities, residents, internetFixedCost, gasCylinderDate };
}

function parseResumoSheet(ws: XLSX.WorkSheet): Array<{
  monthId: string;
  sheetId: string;
  internetFixedCost: number | null;
}> {
  const result: Array<{ monthId: string; sheetId: string; internetFixedCost: number | null }> = [];

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1');
  for (let row = 1; row <= range.e.r; row++) {
    const monthRaw = cellValue(ws, row, 0);
    if (typeof monthRaw !== 'string') continue;

    // monthRaw looks like "2026-03-março"
    const monthId = monthRaw.slice(0, 7); // "2026-03"
    // sheetId is the matching sheet name, e.g. "2026-03-Março"
    const netCostRaw = cellValue(ws, row, 16);
    const internetFixedCost = typeof netCostRaw === 'number' ? netCostRaw : null;

    result.push({ monthId, sheetId: monthRaw, internetFixedCost });
  }

  return result;
}

function monthLabelFromId(monthId: string): string {
  const MONTHS: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  };
  const [year, month] = monthId.split('-') as [string, string];
  return `${MONTHS[month] ?? month} ${year}`;
}

function main() {
  console.log(`Reading ${XLSX_PATH}...`);
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true, dense: false });

  const resumoWs = wb.Sheets['Resumo'];
  if (!resumoWs) throw new Error('Resumo sheet not found');

  const resumoEntries = parseResumoSheet(resumoWs);
  console.log(`Found ${resumoEntries.length} months in Resumo`);

  mkdirSync(DATA_OUT, { recursive: true });

  for (const entry of resumoEntries) {
    // Find matching sheet (case-insensitive prefix match on monthId)
    const sheetName = wb.SheetNames.find(
      (name) => name.toLowerCase().startsWith(entry.monthId.toLowerCase()),
    );

    if (!sheetName) {
      console.warn(`  Sheet not found for ${entry.monthId}, skipping`);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const monthLabel = monthLabelFromId(entry.monthId);
    console.log(`  Parsing ${sheetName} → ${entry.monthId} (${monthLabel})`);

    const data = parseMonthSheet(ws, entry.monthId, monthLabel, entry.internetFixedCost);

    // Filter out placeholder residents from output
    data.residents = data.residents.filter((r) => r.resident !== PLACEHOLDER_RESIDENT);

    const outPath = resolve(DATA_OUT, `${entry.monthId}.json`);
    writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`  Written ${outPath}`);
  }

  console.log('Done.');
}

main();
