// Helpers για export του χάρτη σε εικόνα ή αρχείο.
import * as XLSX from "xlsx";
import { downloadBlob } from "../../lib/download";

export function exportWorkbook(filename: string, workbook: XLSX.WorkBook) {
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  downloadBlob(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
