import * as XLSX from 'xlsx';

export const parseExcelFile = (fileData: any) => {
    const workbook = XLSX.read(fileData, { type: 'binary', cellDates: false });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("上传的文件不包含任何工作表。");
    }
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        throw new Error(`工作表 '${sheetName}' 未找到或为空。`);
    }

    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        const row = jsonData[i];
        if (row && row.some(cell => cell !== null && String(cell).trim() !== '')) {
            headerRowIndex = i;
            headers = row.map(h => h ? String(h).trim() : '');
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        return { headers: [], data: [] };
    }
    
    const dataRows = jsonData.slice(headerRowIndex + 1);

    const data = dataRows.map(rowArray => {
        if (!rowArray || rowArray.every(cell => cell === null)) return null;
        const rowObject: { [key: string]: any } = {};
        headers.forEach((header, index) => {
            if (header && index < rowArray.length) {
                rowObject[header] = rowArray[index];
            }
        });
        return rowObject;
    }).filter(row => row && Object.values(row).some(val => val !== null));

    return { headers, data };
};