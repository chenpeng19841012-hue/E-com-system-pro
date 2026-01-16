import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Zap, ChevronDown, BarChart3, X, Download, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Shop, ProductSKU, FieldDefinition } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

// FIX: Define a props interface for type safety.
interface MultiQueryViewProps {
    shangzhiData: any[];
    jingzhuntongData: any[];
    skus: ProductSKU[];
    shops: Shop[];
    schemas: {
        shangzhi: FieldDefinition[];
        jingzhuntong: FieldDefinition[];
    };
}

const MetricSelectionModal = ({ isOpen, onClose, shangzhiMetrics, jingzhuntongMetrics, selectedMetrics, onConfirm }: any) => {
    const [tempSelected, setTempSelected] = useState(new Set(selectedMetrics));

    React.useEffect(() => {
        if (isOpen) {
            setTempSelected(new Set(selectedMetrics));
        }
    }, [isOpen, selectedMetrics]);

    const handleToggle = (key: string) => {
        setTempSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 m-4 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">选择查询指标</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="grid grid-cols-2 gap-8 overflow-y-auto flex-1">
                    <div>
                        <h4 className="font-bold text-slate-600 mb-4 border-b border-slate-200 pb-2">商智指标</h4>
                        <div className="space-y-2">
                            {shangzhiMetrics.map((field: FieldDefinition) => (
                                <label key={field.key} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={tempSelected.has(field.key)} onChange={() => handleToggle(field.key)} className="form-checkbox h-4 w-4 text-[#70AD47] border-slate-300 rounded focus:ring-[#70AD47]" />
                                    <span className="text-sm text-slate-700">{field.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-bold text-slate-600 mb-4 border-b border-slate-200 pb-2">广告指标</h4>
                        <div className="space-y-2">
                            {jingzhuntongMetrics.map((field: FieldDefinition) => (
                                <label key={field.key} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={tempSelected.has(field.key)} onChange={() => handleToggle(field.key)} className="form-checkbox h-4 w-4 text-[#70AD47] border-slate-300 rounded focus:ring-[#70AD47]" />
                                    <span className="text-sm text-slate-700">{field.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">取消</button>
                    <button onClick={() => onConfirm(Array.from(tempSelected))} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95">确认 ({tempSelected.size})</button>
                </div>
            </div>
        </div>
    );
};

const formatNumberForCard = (value: number, key: string) => {
    if (key.includes('amount') || key.includes('cost')) return `¥${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (key === 'roi' || key === 'cpc') return (value || 0).toFixed(2);
    return (value || 0).toLocaleString();
};

const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? Infinity : 0;
    return ((current - previous) / previous) * 100;
};

const isChangePositive = (key: string, change: number) => {
    if (key === 'cost' || key === 'cpc') return change < 0; // Lower cost/cpc is better
    return change > 0;
};

const TrendChart = ({ dailyData, chartMetrics, metricsMap }: { dailyData: any[], chartMetrics: Set<string>, metricsMap: Map<string, any> }) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const metricColors = useMemo(() => Array.from(metricsMap.keys()).reduce((acc, key, i) => ({ ...acc, [key]: colors[i % colors.length] }), {}), [metricsMap]);

    if (dailyData.length < 2 || chartMetrics.size === 0) {
        return <div className="h-full flex items-center justify-center text-slate-400">请勾选至少一个核心指标以显示趋势图</div>;
    }

    const width = 800;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 30, left: 0 };

    const selectedMetricsData = Array.from(chartMetrics);
    const maxY = Math.max(...dailyData.flatMap(d => selectedMetricsData.map(m => d[m] || 0)), 1);
    
    const xScale = (index: number) => padding.left + (index / (dailyData.length - 1)) * (width - padding.left - padding.right);
    const yScale = (value: number) => height - padding.bottom - (value / maxY) * (height - padding.top - padding.bottom);
    
    return (
        <div className="relative">
             <div className="absolute top-0 right-0 flex gap-4 text-xs">
                {selectedMetricsData.map(key => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: (metricColors as any)[key] }}></div>
                        <span>{metricsMap.get(key)?.label}</span>
                    </div>
                ))}
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* X Axis */}
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" />
                {dailyData.map((d, i) => ( i % Math.ceil(dailyData.length / 10) === 0 &&
                    <text key={i} x={xScale(i)} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date.substring(5)}</text>
                ))}

                {/* Lines */}
                {selectedMetricsData.map(key => (
                    <path
                        key={key}
                        d={`M ${dailyData.map((d, i) => `${xScale(i)},${yScale(d[key] || 0)}`).join(' L ')}`}
                        fill="none"
                        stroke={(metricColors as any)[key]}
                        strokeWidth="2"
                    />
                ))}
            </svg>
        </div>
    );
};

const getInitialDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
    };
};

export const MultiQueryView = ({ shangzhiData, jingzhuntongData, skus, shops, schemas }: MultiQueryViewProps) => {
    const [startDate, setStartDate] = useState(getInitialDates().startDate);
    const [endDate, setEndDate] = useState(getInitialDates().endDate);
    const [timeDimension, setTimeDimension] = useState('day');
    const [selectedShopId, setSelectedShopId] = useState('all');
    const [skuInput, setSkuInput] = useState('');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['pv', 'uv', 'paid_users', 'paid_items', 'paid_amount', 'cost', 'cpc', 'roi']);
    const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [queryResult, setQueryResult] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [visualisationData, setVisualisationData] = useState<any>(null);
    const [comparisonType, setComparisonType] = useState<'period' | 'year'>('period');
    const [chartMetrics, setChartMetrics] = useState<Set<string>>(new Set(['paid_amount', 'cost']));
    
    const ROWS_PER_PAGE = 50;

    const VISUAL_METRICS = ['pv', 'uv', 'paid_items', 'paid_amount', 'cost', 'cpc', 'roi', 'total_order_amount'];
    
    const handleReset = () => {
        setStartDate(getInitialDates().startDate);
        setEndDate(getInitialDates().endDate);
        setTimeDimension('day');
        setSelectedShopId('all');
        setSkuInput('');
        setSelectedMetrics(['pv', 'uv', 'paid_users', 'paid_items', 'paid_amount', 'cost', 'cpc', 'roi']);
        setQueryResult([]);
        setVisualisationData(null);
        setCurrentPage(1);
    };

    const handleQuery = () => {
        setIsLoading(true);
        setCurrentPage(1);
        setVisualisationData(null);
        
        setTimeout(() => {
            const managedSkuCodes = new Set(skus.map(s => s.code));
            if (managedSkuCodes.size === 0 || !startDate || !endDate) {
                 setQueryResult([]);
                 setIsLoading(false);
                 return;
            }

            const parsedSkus = skuInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
            const skuCodeToInfoMap = new Map(skus.map((s: ProductSKU) => [s.code, s]));

            const getDataForPeriod = (start: string, end: string) => {
                 const filteredShangzhi = shangzhiData.filter((row: any) => {
                    const skuCode = getSkuIdentifier(row);
                    if (!row.date || !skuCode || !managedSkuCodes.has(skuCode)) return false;
                    if (start && row.date < start) return false;
                    if (end && row.date > end) return false;
                    if (parsedSkus.length > 0 && !parsedSkus.includes(skuCode)) return false;
                    if (selectedShopId !== 'all') {
                        const skuInfo = skuCodeToInfoMap.get(skuCode);
                        if (skuInfo?.shopId !== selectedShopId) return false;
                    }
                    return true;
                });

                const filteredJingzhuntong = jingzhuntongData.filter((row: any) => {
                    const skuCode = getSkuIdentifier(row);
                    if (!row.date || !skuCode || !managedSkuCodes.has(skuCode)) return false;
                    if (start && row.date < start) return false;
                    if (end && row.date > end) return false;
                    if (parsedSkus.length > 0 && !parsedSkus.includes(skuCode)) return false;
                    if (selectedShopId !== 'all') {
                        const skuInfo = skuCodeToInfoMap.get(skuCode);
                        if (skuInfo?.shopId !== selectedShopId) return false;
                    }
                    return true;
                });

                const mergedData = new Map<string, any>();
                const metricsToAggregate = new Set([...selectedMetrics, ...VISUAL_METRICS, 'clicks', 'total_order_amount']);

                filteredShangzhi.forEach((row: any) => {
                    const skuCode = getSkuIdentifier(row)!;
                    const key = `${row.date}-${skuCode}`;
                    if (!mergedData.has(key)) {
                        const skuInfo = skuCodeToInfoMap.get(skuCode);
                        const shopInfo = shops.find(s => s.id === skuInfo?.shopId);
                        mergedData.set(key, { 
                            date: row.date,
                            sku_code: skuCode,
                            sku_shop: { code: skuCode, shopName: shopInfo?.name || row.shop_name || '未知店铺' },
                        });
                    }
                    const entry = mergedData.get(key)!;
                    for (const metric of metricsToAggregate) {
                        if (row[metric] !== undefined && row[metric] !== null) entry[metric] = (entry[metric] || 0) + Number(row[metric]);
                    }
                });

                filteredJingzhuntong.forEach((row: any) => {
                    const skuCode = getSkuIdentifier(row)!;
                    const key = `${row.date}-${skuCode}`;
                    if (!mergedData.has(key)) {
                        const skuInfo = skuCodeToInfoMap.get(skuCode)!;
                        const shopInfo = shops.find(s => s.id === skuInfo.shopId);
                         mergedData.set(key, { 
                            date: row.date,
                            sku_code: skuCode,
                            sku_shop: { code: skuCode, shopName: shopInfo?.name || '未知店铺' },
                        });
                    }
                    const entry = mergedData.get(key)!;
                    for (const metric of metricsToAggregate) {
                         if (row[metric] !== undefined && row[metric] !== null) entry[metric] = (entry[metric] || 0) + Number(row[metric]);
                    }
                });

                return Array.from(mergedData.values());
            };

            const mainPeriodData = getDataForPeriod(startDate, endDate);
            
            const mainStart = new Date(startDate);
            const mainEnd = new Date(endDate);
            const diffDays = (mainEnd.getTime() - mainStart.getTime()) / (1000 * 3600 * 24);
            
            let compStart: Date, compEnd: Date;
            if (comparisonType === 'period') {
                compEnd = new Date(mainStart);
                compEnd.setDate(compEnd.getDate() - 1);
                compStart = new Date(compEnd);
                compStart.setDate(compStart.getDate() - diffDays);
            } else { 
                compStart = new Date(mainStart);
                compStart.setFullYear(compStart.getFullYear() - 1);
                compEnd = new Date(mainEnd);
                compEnd.setFullYear(compEnd.getFullYear() - 1);
            }

            const compPeriodData = getDataForPeriod(compStart.toISOString().split('T')[0], compEnd.toISOString().split('T')[0]);
            
            const calculateTotals = (data: any[]) => {
                const totals = data.reduce((acc, row) => {
                    for(const key of [...VISUAL_METRICS, 'clicks']) {
                        acc[key] = (acc[key] || 0) + (Number(row[key]) || 0);
                    }
                    return acc;
                }, {} as Record<string, number>);
                
                totals.cpc = totals.clicks ? totals.cost / totals.clicks : 0;
                totals.roi = totals.cost ? (totals.total_order_amount || 0) / totals.cost : 0;
                return totals;
            };

            const mainTotals = calculateTotals(mainPeriodData);
            const compTotals = calculateTotals(compPeriodData);

            const dailyDataMap = new Map<string, any>();
            mainPeriodData.forEach(row => {
                if (!dailyDataMap.has(row.date)) dailyDataMap.set(row.date, { date: row.date });
                const entry = dailyDataMap.get(row.date);
                for(const key of [...VISUAL_METRICS, 'clicks']) {
                    entry[key] = (entry[key] || 0) + (Number(row[key]) || 0);
                }
            });
            const dailyData = Array.from(dailyDataMap.values()).sort((a,b) => a.date.localeCompare(b.date));
            dailyData.forEach(d => {
                d.cpc = d.clicks ? d.cost / d.clicks : 0;
                d.roi = d.cost ? (d.total_order_amount || 0) / d.cost : 0;
            });
            
            setVisualisationData({ mainTotals, compTotals, dailyData });

            const result = mainPeriodData.sort((a, b) => b.date.localeCompare(a.date) || a.sku_code.localeCompare(b.sku_code));
            result.forEach(row => {
                const cost = row.cost || 0;
                const clicks = row.clicks || 0;
                const totalOrderAmount = row.total_order_amount || row.paid_amount || 0;
                row.cpc = clicks > 0 ? cost / clicks : 0;
                row.roi = cost > 0 ? totalOrderAmount / cost : 0;
            });
            setQueryResult(result);
            setIsLoading(false);
        }, 500);
    };

    const { shangzhiMetricsForModal, jingzhuntongMetricsForModal, allMetricsMap } = useMemo(() => {
        const map = new Map<string, FieldDefinition>();
        [...schemas.shangzhi, ...schemas.jingzhuntong].forEach(f => map.set(f.key, f));
        map.set('date', { key: 'date', label: '日期', type: 'TIMESTAMP' });
        map.set('sku_shop', { key: 'sku_shop', label: 'SKU / 店铺', type: 'STRING' });
        
        // FIX: Use non-null assertion (!) as schema guarantees these keys exist.
        // This resolves the TypeScript error where 'type' property was considered optional.
        // Overwrite labels as per user request
        map.set('pv', { ...map.get('pv')!, label: '浏览量' });
        map.set('uv', { ...map.get('uv')!, label: '访客数' });
        map.set('paid_items', { ...map.get('paid_items')!, label: '成交件数' });
        map.set('paid_amount', { ...map.get('paid_amount')!, label: '成交金额' });
        map.set('cost', { ...map.get('cost')!, label: '花费' });
        map.set('total_order_amount', { ...map.get('total_order_amount')!, label: '总订单金额' });

        map.set('cpc', { key: 'cpc', label: 'CPC', type: 'REAL' });
        map.set('roi', { key: 'roi', label: 'ROI', type: 'REAL' });
        
        const shangzhiMetrics = schemas.shangzhi.filter(f => !['date', 'product_name', 'sku_code', 'brand', 'category_l1', 'category_l2', 'category_l3', 'shop_name', 'business_mode', 'product_id', 'item_number', 'last_listed_at'].includes(f.key));
        const jingzhuntongMetrics = schemas.jingzhuntong.filter(f => !['date', 'account_nickname', 'tracked_sku_id', 'tracked_sku_name'].includes(f.key));
        
        return { 
            shangzhiMetricsForModal: shangzhiMetrics, 
            jingzhuntongMetricsForModal: jingzhuntongMetrics, 
            allMetricsMap: map 
        };
    }, [schemas]);

    const resultHeaders = ['date', 'sku_shop', ...selectedMetrics];

    const handleExport = () => {
        if (queryResult.length === 0) return;
        const headers = resultHeaders.map(key => allMetricsMap.get(key)?.label || key.replace('_', ' '));
        const dataToExport = queryResult.map(row => {
            return resultHeaders.map(key => {
                const value = row[key];
                if (key === 'sku_shop') return `${value.code} (${value.shopName})`;
                if (value === undefined || value === null) return '';
                return value;
            });
        });
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "查询结果");
        XLSX.writeFile(wb, `多维查询报表_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const totalPages = Math.ceil(queryResult.length / ROWS_PER_PAGE);
    const paginatedResult = queryResult.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    return (
        <>
            <MetricSelectionModal 
                isOpen={isMetricModalOpen}
                onClose={() => setIsMetricModalOpen(false)}
                shangzhiMetrics={shangzhiMetricsForModal}
                jingzhuntongMetrics={jingzhuntongMetricsForModal}
                selectedMetrics={selectedMetrics}
                onConfirm={(newMetrics: string[]) => {
                    setSelectedMetrics(newMetrics);
                    setIsMetricModalOpen(false);
                }}
            />
            <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
                <div className="mb-6">
                   <h1 className="text-3xl font-black text-slate-800 tracking-tight">多维数据查询</h1>
                   <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">COMPREHENSIVE DATA AGGREGATOR</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">时间跨度</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" />
                                <span className="text-slate-400">-</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-2">时间维度</label>
                             <select value={timeDimension} onChange={e => setTimeDimension(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]">
                                 <option value="day">按天</option>
                                 <option value="week" disabled>按周 (待开发)</option>
                                 <option value="month" disabled>按月 (待开发)</option>
                             </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-2">关联店铺</label>
                             <select value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]">
                                 <option value="all">所有店铺</option>
                                 {shops.map((s: Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">指标勾选 (商智+广告)</label>
                            <button onClick={() => setIsMetricModalOpen(true)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                                <span className="font-medium text-sm">{selectedMetrics.length} 个已选</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                             <label className="block text-xs font-bold text-slate-500 mb-2">SKU 精准筛选</label>
                             <textarea 
                                placeholder="输入SKU，以逗号或换行分隔" 
                                value={skuInput}
                                onChange={e => setSkuInput(e.target.value)}
                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-none"
                             ></textarea>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handleReset} className="px-8 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">重置</button>
                            <button onClick={handleQuery} disabled={isLoading || skus.length === 0} className="px-8 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed">
                                {isLoading ? '查询中...' : <><Zap size={16} className="fill-white" /> 执行聚合查询</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-[#70AD47]"/> 核心数据看板</h3>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                            <button onClick={() => setComparisonType('period')} className={`px-3 py-1 text-xs font-bold rounded-md ${comparisonType === 'period' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}>环比</button>
                            <button onClick={() => setComparisonType('year')} className={`px-3 py-1 text-xs font-bold rounded-md ${comparisonType === 'year' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}>同比</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {VISUAL_METRICS.map(key => {
                            const metricLabel = allMetricsMap.get(key)?.label || key;
                            if (!visualisationData) {
                                return (
                                    <div key={key} className="p-4 rounded-lg bg-slate-100/70">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer">
                                            <input type="checkbox" checked={chartMetrics.has(key)} onChange={() => setChartMetrics(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;})} className="form-checkbox h-3.5 w-3.5 bg-transparent border-slate-300 rounded-sm text-[#70AD47] focus:ring-0" />
                                            {metricLabel}
                                        </label>
                                        <p className="text-3xl font-black mt-2 text-slate-300">-</p>
                                        <div className="flex justify-between items-center mt-1 text-xs font-bold text-slate-300">
                                            <span>较上一周期</span>
                                        </div>
                                    </div>
                                );
                            }
                            
                            const mainValue = visualisationData.mainTotals[key] || 0;
                            const compValue = visualisationData.compTotals[key] || 0;
                            const change = getChange(mainValue, compValue);
                            const isPositive = isChangePositive(key, change);
                            const cardColor = ['pv', 'uv', 'cost'].includes(key) ? 'bg-rose-500' : 'bg-teal-500';

                            return (
                                <div key={key} className={`p-4 rounded-lg text-white ${cardColor} relative overflow-hidden`}>
                                    <label className="flex items-center gap-2 text-xs font-bold opacity-80 cursor-pointer">
                                        <input type="checkbox" checked={chartMetrics.has(key)} onChange={() => setChartMetrics(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;})} className="form-checkbox h-3.5 w-3.5 bg-transparent border-white/50 rounded-sm text-[#70AD47] focus:ring-0"/>
                                        {metricLabel}
                                    </label>
                                    <p className="text-3xl font-black mt-2">{formatNumberForCard(mainValue, key)}</p>
                                    <div className="flex justify-between items-center mt-1 text-xs font-bold opacity-80">
                                        <span>较上一周期</span>
                                        {isFinite(change) && (
                                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-white/20' : 'bg-black/10'}`}>
                                                {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                                {Math.abs(change).toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {visualisationData?.dailyData ? (
                        <TrendChart dailyData={visualisationData.dailyData} chartMetrics={chartMetrics} metricsMap={allMetricsMap} />
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-slate-400">执行查询后显示趋势图</div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={18} className="text-[#70AD47]" />
                            <span className="font-bold text-sm text-slate-800">综合查询报表</span>
                        </div>
                        <button onClick={handleExport} disabled={queryResult.length === 0} className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed">
                            <Download size={14} /> 导出报表
                        </button>
                    </div>
                    <div className="p-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                                <thead>
                                    <tr className="text-slate-400 border-b border-slate-100">
                                        {resultHeaders.map(key => (
                                            <th key={key} className={`pb-3 font-bold text-xs px-2 ${key === 'sku_shop' ? 'w-80' : ''}`}>{allMetricsMap.get(key)?.label || key.replace('_', ' ')}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                         <tr><td colSpan={resultHeaders.length} className="py-20 text-center text-slate-400 font-bold">加载中...</td></tr>
                                    ) : queryResult.length === 0 ? (
                                        <tr><td colSpan={resultHeaders.length} className="py-20 text-center text-slate-300 font-bold tracking-widest text-xs uppercase italic">Ready for Multi-dimensional Analysis</td></tr>
                                    ) : (
                                        paginatedResult.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                {resultHeaders.map(key => (
                                                    <td key={key} className="py-3 px-2 text-xs text-slate-600 border-b border-slate-50 truncate">
                                                        {key === 'sku_shop' ? (
                                                            <div className="truncate">
                                                                <div className="font-bold text-slate-800 truncate" title={row.sku_shop.code}>{row.sku_shop.code}</div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">{row.sku_shop.shopName}</div>
                                                            </div>
                                                        ) : (row[key] === undefined || row[key] === null) ? '-' : typeof row[key] === 'number' ? row[key].toFixed(2) : row[key]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                         {queryResult.length > 0 && (
                            <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
                                <span className="text-xs font-bold text-slate-500">
                                    共 {queryResult.length} 条记录, 第 {currentPage} / {totalPages} 页
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300"
                                    >
                                        上一页
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300"
                                    >
                                        下一页
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
