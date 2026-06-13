import { Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  VF_WORKBOOK_TABS,
  LOCATION_TAB_COLUMNS,
  sanitizeSheetName,
  locationTabName,
  type WorkbookTabSpec,
} from '@vf/shared';
import type { WorkbookSheetData } from '@vf/shared';

@Injectable()
export class WorkbookBuilderService {
  private readonly logger = new Logger(WorkbookBuilderService.name);

  async buildWorkbook(
    sheets: WorkbookSheetData,
    locationTabs: Record<string, Array<Record<string, string | number>>>,
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Valiant Firm Agent Command Center';
    wb.created = new Date();

    for (const spec of VF_WORKBOOK_TABS) {
      this.addDataSheet(wb, spec, sheets[spec.name] ?? []);
    }

    for (const [market, rows] of Object.entries(locationTabs)) {
      const spec: WorkbookTabSpec = {
        name: locationTabName(market),
        columns: LOCATION_TAB_COLUMNS,
        minRows: 5,
      };
      this.addDataSheet(wb, spec, rows);
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private addDataSheet(
    wb: ExcelJS.Workbook,
    spec: WorkbookTabSpec,
    rows: Array<Record<string, string | number>>,
  ) {
    const ws = wb.addWorksheet(sanitizeSheetName(spec.name));

    const headerRow = ws.addRow(spec.columns);
    headerRow.font = { bold: true, color: { argb: 'FF1A1A1A' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF37' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    for (const row of rows) {
      const values = spec.columns.map((col) => {
        const val = row[col] ?? row[this.normalizeKey(col)] ?? '';
        return typeof val === 'string' && val.startsWith('=') ? { formula: val.slice(1) } : val;
      });
      const dataRow = ws.addRow(values);

      spec.columns.forEach((col, idx) => {
        const cell = dataRow.getCell(idx + 1);
        const raw = row[col] ?? row[this.normalizeKey(col)];
        if (typeof raw === 'string' && raw.startsWith('=')) {
          cell.value = { formula: raw.slice(1) };
        }
        if (col === 'Priority' || col === 'Validation Status' || col === 'Status') {
          this.applyStatusFormatting(cell, String(raw ?? ''));
        }
      });
    }

    spec.columns.forEach((_, i) => {
      ws.getColumn(i + 1).width = Math.min(40, Math.max(12, spec.columns[i].length + 2));
    });

    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: spec.columns.length } };
  }

  private normalizeKey(col: string): string {
    return col.replace(/\s+/g, '_').toLowerCase();
  }

  private applyStatusFormatting(cell: ExcelJS.Cell, value: string) {
    const lower = value.toLowerCase();
    if (lower.includes('high') || lower.includes('urgent') || lower.includes('needs validation')) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } };
    } else if (lower.includes('live verified') || lower.includes('complete') || lower.includes('passed')) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0FFE0' } };
    } else if (lower.includes('ai estimated') || lower.includes('tool estimated')) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E0' } };
    }
  }
}
