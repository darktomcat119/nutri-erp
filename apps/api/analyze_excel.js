const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const files = [
  '/home/tomcat/Documents/MyWork/New folder (3)/refer_docs/Reporte_Ventas_20260303_20260310.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/refer_docs/ReportedeInventario07_04_2026.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/IN01_5.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/IN02_5.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/IN07.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN03_4.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN04_4.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN05_4.1.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN06_2.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/MO01_5.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/MO02_4.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/MO05.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/Semanal base/MO03_4.1.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/Semanal base/MO04_4.0.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/MOS1803/MOS 18.03/MOS BASE COMPRAS 18.03.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/1803compras/18.03 compras/INS BASE COMPRAS 18.03.xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/1803compras/18.03 compras/Requisicion 18.03 CDUP 130326 (1).xlsx',
  '/home/tomcat/Documents/MyWork/New folder (3)/1803compras/18.03 compras/Requisicion 18.03 NSM (3).xlsx',
];

async function readExcelFile(filePath, outputStream) {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    
    const fileName = path.basename(filePath);
    outputStream.write(`\n${'='.repeat(100)}\n`);
    outputStream.write(`FILE: ${fileName}\n`);
    outputStream.write(`Path: ${filePath}\n`);
    outputStream.write(`${'='.repeat(100)}\n`);
    
    for (const ws of wb.worksheets) {
      outputStream.write(`\n>>> Sheet: ${ws.name} (${ws.rowCount} rows x ${ws.columnCount} cols)\n`);
      
      let processed = 0;
      
      ws.eachRow({ includeEmpty: false }, (row, ri) => {
        // Show first 10 rows, last 3 rows
        if (ri <= 10 || ri > ws.rowCount - 3) {
          const vals = [];
          row.eachCell({ includeEmpty: true }, (cell, ci) => {
            if (ci <= 20) {
              const val = cell.value;
              let formatted = '';
              if (val === null || val === undefined) {
                formatted = '';
              } else if (typeof val === 'object' && val.result !== undefined) {
                formatted = String(val.result).substring(0, 45);
              } else if (typeof val === 'object' && val.error !== undefined) {
                formatted = String(val.error).substring(0, 45);
              } else {
                formatted = String(val).substring(0, 45);
              }
              vals.push(formatted);
            }
          });
          outputStream.write(`  R${ri.toString().padStart(4)}: [${vals.join(' | ')}]\n`);
          processed++;
          if (processed > 100) {
            outputStream.write(`  ... (${ws.rowCount - ri - 3} more rows) ...\n`);
            return;
          }
        }
      });
    }
  } catch (err) {
    outputStream.write(`ERROR reading ${filePath}: ${err.message}\n`);
  }
}

async function main() {
  const outFile = fs.createWriteStream('/tmp/nutri_analysis.txt');
  
  for (const file of files) {
    await readExcelFile(file, outFile);
  }
  
  outFile.end();
  console.log('Analysis saved to /tmp/nutri_analysis.txt');
}

main();
