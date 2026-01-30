
import { TableType, FieldDefinition } from './types';

export const getTableName = (type: TableType) => {
    switch (type) {
        case 'shangzhi': return '商智';
        case 'jingzhuntong': return '广告';
        case 'customer_service': return '客服';
        default: return type;
    }
};

export const normalizeDate = (dateInput: any): string | null => {
    if (dateInput === null || dateInput === undefined || String(dateInput).trim() === '') return null;

    if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime())) return null;
        const year = dateInput.getUTCFullYear();
        const month = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dateInput.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    if (typeof dateInput === 'number' && dateInput > 25569 && dateInput < 150000) {
        const utcMilliseconds = (dateInput - 25569) * 86400 * 1000;
        const date = new Date(utcMilliseconds);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    const dateStr = String(dateInput).trim();

    const match = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (match) {
        const year = parseInt(match[1], 10);
        if (year > 1980) {
            const month = String(match[2]).padStart(2, '0');
            const day = String(match[3]).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    
    if (/^\d{8}$/.test(dateStr) && parseInt(dateStr.substring(0, 4), 10) > 1980) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }

    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1980) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) { /* ignore */ }

    return null;
};

export const detectTableType = (headers: string[], schemas: any): TableType | null => {
    if (!headers || headers.length === 0) return null;

    const scores: Record<TableType, number> = {
        shangzhi: 0,
        jingzhuntong: 0,
        customer_service: 0,
    };

    const schemaEntries = Object.entries(schemas) as [TableType, FieldDefinition[]][];

    for (const [tableType, schema] of schemaEntries) {
        const schemaFields = new Set<string>();
        schema.forEach(field => {
            schemaFields.add(field.label);
            field.tags?.forEach(tag => schemaFields.add(tag));
        });

        let matchCount = 0;
        headers.forEach(header => {
            if (schemaFields.has(String(header))) {
                matchCount++;
            }
        });
        scores[tableType] = matchCount / headers.length;
    }
    
    let bestMatch: TableType | null = null;
    let maxScore = 0.5;

    for (const tableType in scores) {
        if (scores[tableType as TableType] > maxScore) {
            maxScore = scores[tableType as TableType];
            bestMatch = tableType as TableType;
        }
    }

    return bestMatch;
};

// 🛡️ 核心修复：强力 SKU 识别器
// 能够处理：纯数字、科学计数法字符串 ("1.00212E+11")、带空格字符串
export const getSkuIdentifier = (row: any): string | null => {
    if (!row) return null;
    
    // 优先取 sku_code，其次 product_id，再次 tracked_sku_id
    const rawVal = row.sku_code || row.product_id || row.tracked_sku_id;
    if (rawVal === undefined || rawVal === null) return null;

    // 1. 如果是数字，强制转为非科学计数法的字符串
    if (typeof rawVal === 'number') {
        return rawVal.toLocaleString('fullwide', { useGrouping: false });
    }

    const strVal = String(rawVal).trim();

    // 2. 如果是科学计数法字符串 (e.g. "1.00212482468E11")，尝试还原
    if (/^[0-9.]+[eE][+-]?\d+$/.test(strVal)) {
        const num = Number(strVal);
        if (!isNaN(num)) {
            return num.toLocaleString('fullwide', { useGrouping: false });
        }
    }

    return strVal;
};
