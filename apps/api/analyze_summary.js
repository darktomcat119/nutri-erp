const ExcelJS = require('exceljs');
const path = require('path');

const files = [
  { name: '1. SALES REPORT', path: '/home/tomcat/Documents/MyWork/New folder (3)/refer_docs/Reporte_Ventas_20260303_20260310.xlsx' },
  { name: '2. INVENTORY REPORT', path: '/home/tomcat/Documents/MyWork/New folder (3)/refer_docs/ReportedeInventario07_04_2026.xlsx' },
  { name: '3. INSUMOS CATALOG', path: '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/IN01_5.0.xlsx' },
  { name: '4. RECIPES+INGREDIENTS', path: '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/IN02_5.0.xlsx' },
  { name: '5. IN07', path: '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/IN07.xlsx' },
  { name: '6. IN03_SEMANAL', path: '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN03_4.0.xlsx' },
  { name: '7. IN04_SEMANAL', path: '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN04_4.0.xlsx' },
  { name: '8. IN05_SEMANAL', path: '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN05_4.1.xlsx' },
  { name: '9. IN06_SEMANAL', path: '/home/tomcat/Documents/MyWork/New folder (3)/Insumos/SEMANAL BASE/IN06_2.0.xlsx' },
  { name: '10. MOS CATALOG', path: '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/MO01_5.0.xlsx' },
  { name: '11. MOS BRANCH CONFIG', path: '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/MO02_4.0.xlsx' },
  { name: '12. MO05', path: '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/MO05.xlsx' },
  { name: '13. MO03_SEMANAL', path: '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/Semanal base/MO03_4.1.xlsx' },
  { name: '14. MO04_SEMANAL', path: '/home/tomcat/Documents/MyWork/New folder (3)/Mostrador/Semanal base/MO04_4.0.xlsx' },
  { name: '15. MOS PURCHASE CALC', path: '/home/tomcat/Documents/MyWork/New folder (3)/MOS1803/MOS 18.03/MOS BASE COMPRAS 18.03.xlsx' },
  { name: '16. INS PURCHASE CALC', path: '/home/tomcat/Documents/MyWork/New folder (3)/1803compras/18.03 compras/INS BASE COMPRAS 18.03.xlsx' },
  { name: '17. INS REQ CDUP', path: '/home/tomcat/Documents/MyWork/New folder (3)/1803compras/18.03 compras/Requisicion 18.03 CDUP 130326 (1).xlsx' },
  { name: '18. INS REQ NSM', path: '/home/tomcat/Documents/MyWork/New folder (3)/1803compras/18.03 compras/Requisicion 18.03 NSM (3).xlsx' },
];

async function analyzeFile(label, filePath) {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    
    console.log(`\n${label}`);
    console.log(`Path: ${filePath}`);
    
    for (const ws of wb.worksheets) {
      console.log(`\n  Sheet: "${ws.name}" (${ws.rowCount}r x ${ws.columnCount}c)`);
      
      // Get headers (row 1)
      let headers = [];
      if (ws.rowCount > 0) {
        const headerRow = ws.getRow(1);
        headerRow.eachCell({ includeEmpty: true }, (cell, ci) => {
          if (ci <= 15) {
            const val = cell.value;
            const formatted = val ? String(val).substring(0, 35) : '';
            headers.push(formatted);
          }
        });
        if (headers.some(h => h)) {
          console.log(`    Headers: [${headers.filter(h => h).join(' | ')}]`);
        }
      }
      
      // Show first 5 data rows
      let rowNum = 0;
      ws.eachRow({ includeEmpty: false }, (row, ri) => {
        if (ri > 1 && ri <= 6) {
          const vals = [];
          row.eachCell({ includeEmpty: true }, (cell, ci) => {
            if (ci <= 15) {
              const val = cell.value;
              let formatted = '';
              if (val === null || val === undefined) {
                formatted = '';
              } else if (typeof val === 'object' && val.result !== undefined) {
                formatted = String(val.result).substring(0, 30);
              } else {
                formatted = String(val).substring(0, 30);
              }
              vals.push(formatted);
            }
          });
          console.log(`    R${ri}: [${vals.join(' | ')}]`);
          rowNum++;
        }
      });
      if (ws.rowCount > 6) {
        console.log(`    ... (${ws.rowCount - 6} more rows)`);
      }
    }
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
  }
}

async function main() {
  console.log('='.repeat(120));
  console.log('NUTRI ERP COMPREHENSIVE REFERENCE ANALYSIS');
  console.log('='.repeat(120));
  
  for (const file of files) {
    await analyzeFile(file.name, file.path);
  }
  
  console.log('\n' + '='.repeat(120));
  console.log('END OF ANALYSIS');
  console.log('='.repeat(120));
}

main();
