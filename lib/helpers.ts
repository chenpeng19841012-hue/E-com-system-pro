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

    // Differentiate Excel serial numbers from YYYYMMDD numbers.
    // Excel serials for modern dates are much smaller than YYYYMMDD numbers.
    // A reasonable upper bound (e.g., for year 2300) is around 150000.
    if (typeof dateInput === 'number' && dateInput > 25569 && dateInput < 150000) {
        const utcMilliseconds = (dateInput - 25569) * 86400 * 1000;
        const date = new Date(utcMilliseconds);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    const dateStr = String(dateInput).trim();

    // Regex for YYYY-MM-DD or YYYY/MM/DD
    const match = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (match) {
        const year = parseInt(match[1], 10);
        if (year > 1980) {
            const month = String(match[2]).padStart(2, '0');
            const day = String(match[3]).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    
    // Regex for YYYYMMDD (as a string or number)
    if (/^\d{8}$/.test(dateStr) && parseInt(dateStr.substring(0, 4), 10) > 1980) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }

    // Fallback for other string formats
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

export const getSkuIdentifier = (row: any): string | null => {
    if (!row) return null;
    // Prioritize sku_code, then fall back to product_id or tracked_sku_id
    const identifier = row.sku_code || row.product_id || row.tracked_sku_id;
    return identifier ? String(identifier) : null;
};
