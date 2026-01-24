
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Zap, ChevronDown, BarChart3, X, Download, TrendingUp, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { Shop, ProductSKU, FieldDefinition } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

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

// 核心指标色彩映射表
const METRIC_COLORS: Record<string, string> = {
    'pv': '#3B82F6',                // 蓝色
    'uv': '#06B6D4',                // 青色
    'paid_users': '#8B5CF6',         // 紫色
    'paid_items': '#22C55E',         // 绿色
    'paid_amount': '#059669',        // 翠绿色
    'paid_conversion_rate': '#F59E0B', // 橙黄色
    'cost': '#F43F5E',               // 玫瑰红
    'cpc': '#6366F1',                // 靛蓝色
    'roi': '#D946EF'                 // 粉紫色
};

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
            if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
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

const formatMetricValue = (value: number, key: string) => {
    if (key === 'roi') return (value || 0).toFixed(1);
    if (key === 'cpc') return `¥${(value || 0).toFixed(1)}`;
    if (key === 'paid_conversion_rate') return `${(value * 100).toFixed(2)}%`;
    if (key.includes('amount') || key.includes('cost')) return `¥${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return Math.round(value || 0).toLocaleString();
};

const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? Infinity : 0;
    return ((current - previous) / previous) * 100;
};

const TrendChart = ({ dailyData, chartMetrics, metricsMap }: { dailyData: any[], chartMetrics: Set<string>, metricsMap: Map<string, any> }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    if (dailyData.length < 2 || chartMetrics.size === 0) {
        return <div className="h-full flex items-center justify-center text-slate-400">请执行查询并勾选指标以显示趋势</div>;
    }

    const width = 800;
    const height = 125; 
    const padding = { top: 20, right: 20, bottom: 25, left: 40 };

    const selectedMetricsData = Array.from(chartMetrics);
    const metricMaxMap = new Map<string, number>();
    selectedMetricsData.forEach(key => {
        const max = Math.max(...dailyData.map(d => d[key] || 0), 0.0001);
        metricMaxMap.set(key, max);
    });
    
    const xScale = (index: number) => padding.left + (index / (dailyData.length - 1)) * (width - padding.left - padding.right);
    const yScale = (value: number, metricKey: string) => {
        const max = metricMaxMap.get(metricKey) || 1;
        return height - padding.bottom - (value / max) * (height - padding.top - padding.bottom);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * width;
        const index = Math.round(((svgX - padding.left) / (width - padding.left - padding.right)) * (dailyData.length - 1));
        if (index >= 0 && index < dailyData.length) {
            setHoveredIndex(index);
            const tooltipX = e.clientX - rect.left > rect.width / 2 ? e.clientX - rect.left - 180 : e.clientX - rect.left + 20;
            setTooltipPos({ x: tooltipX, y: e.clientY - rect.top });
        }
    };
    
    return (
        <div className="relative pt-6 group" onMouseLeave={() => setHoveredIndex(null)}>
             <div className="absolute top-0 right-0 flex flex-wrap justify-end gap-x-4 gap-y-2 text-[10px]">
                {selectedMetricsData.map(key => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: METRIC_COLORS[key] }}></div>
                        <span className="font-bold text-slate-500">{metricsMap.get(key)?.label}</span>
                    </div>
                ))}
            </div>
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto cursor-crosshair" onMouseMove={handleMouseMove}>
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" strokeWidth="1" />
                {dailyData.map((d, i) => ( (i === 0 || i === dailyData.length - 1 || i % Math.ceil(dailyData.length / 8) === 0) &&
                    <text key={i} x={xScale(i)} y={height - padding.bottom + 12} textAnchor="middle" fontSize="6" fontWeight="black" fill="#cbd5e1">{d.date.substring(5)}</text>
                ))}
                {hoveredIndex !== null && (
                    <line x1={xScale(hoveredIndex)} y1={padding.top} x2={xScale(hoveredIndex)} y2={height - padding.bottom} stroke="#70AD47" strokeWidth="1" strokeDasharray="4 2" />
                )}
                {selectedMetricsData.map(key => (
                    <path key={key} d={`M ${dailyData.map((d, i) => `${xScale(i)},${yScale(d[key] || 0, key)}`).join(' L ')}`} fill="none" stroke={METRIC_COLORS[key]} strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round" className="transition-opacity duration-300" style={{ opacity: hoveredIndex === null ? 1 : 0.8 }} />
                ))}
                {hoveredIndex !== null && selectedMetricsData.map(key => (
                    <circle key={key} cx={xScale(hoveredIndex)} cy={yScale(dailyData[hoveredIndex][key] || 0, key)} r="2.5" fill="white" stroke={METRIC_COLORS[key]} strokeWidth="1.5" />
                ))}
            </svg>
            {hoveredIndex !== null && (
                <div className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-xl p-3 w-40 animate-fadeIn" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <p className="text-[10px] font-black text-slate-400 mb-2 border-b border-slate-100 pb-1">{dailyData[hoveredIndex].date}</p>
                    <div className="space-y-1.5">
                        {selectedMetricsData.map(key => (
                            <div key={key} className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: METRIC_COLORS[key] }}></div><span className="text-[10px] font-bold text-slate-500 truncate max-w-[60px]">{metricsMap.get(key)?.label}</span></div>
                                <span className="text-[11px] font-black text-slate-800 tabular-nums">{formatMetricValue(dailyData[hoveredIndex][key] || 0, key)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="mt-2 text-center text-[8px] text-slate-300 font-black italic tracking-tighter">* 各指标线条已归一化，粗细 1.0px；移动鼠标查看数值</div>
        </div>
    );
};

export const MultiQueryView = ({ shangzhiData, jingzhuntongData, skus, shops, schemas }: MultiQueryViewProps) => {
    const [startDate, setStartDate] = useState(new Date(Date.now() - 6*86400000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
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
    
    // 8 个核心卡片排序：PV -> UV -> 成交件数 -> 成交金额 -> 成交转化率 -> 广告花费 -> CPC -> ROI
    const VISUAL_METRICS = ['pv', 'uv', 'paid_items', 'paid_amount', 'paid_conversion_rate', 'cost', 'cpc', 'roi'];
    const [chartMetrics, setChartMetrics] = useState<Set<string>>(new Set(['uv', 'paid_items', 'cost']));
    const ROWS_PER_PAGE = 50;
    
    const handleReset = () => {
        setStartDate(new Date(Date.now() - 6*86400000).toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        setTimeDimension('day');
        setSelectedShopId('all');
        setSkuInput('');
        setSelectedMetrics(['pv', 'uv', 'paid_users', 'paid_items', 'paid_amount', 'cost', 'cpc', 'roi']);
        setQueryResult([]);
        setVisualisationData(null);
    };

    const handleQuery = () => {
        if (!startDate || !endDate) return;
        setIsLoading(true);
        setCurrentPage(1);
        setTimeout(() => {
            const managedSkuCodes = skus.length > 0 ? new Set(skus.map(s => s.code)) : null;
            const parsedSkus = skuInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
            const skuCodeToInfoMap = new Map(skus.map((s: ProductSKU) => [s.code, s]));

            const getDataForPeriod = (start: string, end: string) => {
                const filterFunc = (row: any) => {
                    const skuCode = getSkuIdentifier(row);
                    if (!row.date || !skuCode) return false;
                    if (managedSkuCodes && !managedSkuCodes.has(skuCode)) return false;
                    if (start && row.date < start) return false;
                    if (end && row.date > end) return false;
                    if (parsedSkus.length > 0 && !parsedSkus.includes(skuCode)) return false;
                    if (selectedShopId !== 'all' && skuCodeToInfoMap.get(skuCode)?.shopId !== selectedShopId) return false;
                    return true;
                };
                const fSz = (shangzhiData || []).filter(filterFunc);
                const fJzt = (jingzhuntongData || []).filter(filterFunc);
                const merged = new Map<string, any>();
                const mAgg = new Set([...selectedMetrics, ...VISUAL_METRICS, 'clicks', 'paid_users', 'total_order_amount']);

                const getAggregationKey = (dStr: string, sCode: string) => {
                    const d = new Date(dStr);
                    if (timeDimension === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${sCode}`;
                    if (timeDimension === 'week') {
                        const date = new Date(dStr);
                        date.setUTCDate(date.getUTCDate() - (date.getDay() || 7) + 1);
                        return `${date.toISOString().split('T')[0]}-${sCode}`;
                    }
                    return `${dStr}-${sCode}`;
                };

                const proc = (row: any) => {
                    const sCode = getSkuIdentifier(row)!;
                    const key = getAggregationKey(row.date, sCode);
                    if (!merged.has(key)) {
                        const sInfo = skuCodeToInfoMap.get(sCode);
                        const shopInfo = shops.find(s => s.id === sInfo?.shopId);
                        merged.set(key, { date: row.date, sku_code: sCode, sku_shop: { code: sCode, shopName: shopInfo?.name || row.shop_name || '默认店铺' } });
                    }
                    const ent = merged.get(key)!;
                    mAgg.forEach(m => { if (row[m] != null) ent[m] = (ent[m] || 0) + Number(row[m]); });
                };
                fSz.forEach(proc); fJzt.forEach(proc);
                return Array.from(merged.values());
            };

            const mainData = getDataForPeriod(startDate, endDate);
            const mainStart = new Date(startDate); const mainEnd = new Date(endDate);
            const diffDays = (mainEnd.getTime() - mainStart.getTime()) / 86400000;
            let compStart: Date, compEnd: Date;
            if (comparisonType === 'period') {
                compEnd = new Date(mainStart); compEnd.setDate(compEnd.getDate() - 1);
                compStart = new Date(compEnd); compStart.setDate(compStart.getDate() - diffDays);
            } else {
                compStart = new Date(mainStart); compStart.setFullYear(compStart.getFullYear() - 1);
                compEnd = new Date(mainEnd); compEnd.setFullYear(compEnd.getFullYear() - 1);
            }
            const compData = getDataForPeriod(compStart.toISOString().split('T')[0], compEnd.toISOString().split('T')[0]);
            const calcTotals = (data: any[]) => {
                const t = data.reduce((acc, row) => {
                    [...VISUAL_METRICS, 'clicks', 'paid_users', 'total_order_amount'].forEach(k => { acc[k] = (acc[k] || 0) + (Number(row[k]) || 0); });
                    return acc;
                }, {} as Record<string, number>);
                t.cpc = t.clicks ? t.cost / t.clicks : 0;
                t.roi = t.cost ? (t.total_order_amount || t.paid_amount || 0) / t.cost : 0;
                t.paid_conversion_rate = t.uv ? t.paid_users / t.uv : 0;
                return t;
            };

            const dMap = new Map<string, any>();
            mainData.forEach(r => {
                if (!dMap.has(r.date)) dMap.set(r.date, { date: r.date });
                const ent = dMap.get(r.date);
                [...VISUAL_METRICS, 'clicks', 'paid_users', 'total_order_amount'].forEach(k => { ent[k] = (ent[k] || 0) + (Number(r[k]) || 0); });
            });
            const dData = Array.from(dMap.values()).sort((a,b) => a.date.localeCompare(b.date));
            dData.forEach(d => {
                d.cpc = d.clicks ? d.cost / d.clicks : 0;
                d.roi = d.cost ? (d.total_order_amount || d.paid_amount || 0) / d.cost : 0;
                d.paid_conversion_rate = d.uv ? d.paid_users / d.uv : 0;
            });
            
            setVisualisationData({ mainTotals: calcTotals(mainData), compTotals: calcTotals(compData), dailyData: dData });
            setQueryResult(mainData.sort((a,b) => b.date.localeCompare(a.date)));
            setIsLoading(false);
        }, 500);
    };

    const { shangzhiMetricsForModal, jingzhuntongMetricsForModal, allMetricsMap } = useMemo(() => {
        const map = new Map<string, FieldDefinition>();
        [...schemas.shangzhi, ...schemas.jingzhuntong].forEach(f => map.set(f.key, f));
        map.set('date', { key: 'date', label: '时间范围', type: 'TIMESTAMP' });
        map.set('sku_shop', { key: 'sku_shop', label: 'SKU / 店铺', type: 'STRING' });
        map.set('pv', { key: 'pv', label: '浏览量', type: 'INTEGER' });
        map.set('uv', { key: 'uv', label: '访客数', type: 'INTEGER' });
        map.set('paid_users', { key: 'paid_users', label: '成交人数', type: 'INTEGER' });
        map.set('paid_items', { key: 'paid_items', label: '成交件数', type: 'INTEGER' });
        map.set('paid_amount', { key: 'paid_amount', label: '成交金额', type: 'REAL' });
        map.set('paid_conversion_rate', { key: 'paid_conversion_rate', label: '成交转化率', type: 'REAL' });
        map.set('cost', { key: 'cost', label: '广告花费', type: 'REAL' });
        map.set('cpc', { key: 'cpc', label: 'CPC', type: 'REAL' });
        map.set('roi', { key: 'roi', label: 'ROI', type: 'REAL' });
        return { 
            shangzhiMetricsForModal: schemas.shangzhi.filter(f => !['date', 'sku_code', 'product_name'].includes(f.key)), 
            jingzhuntongMetricsForModal: schemas.jingzhuntong.filter(f => !['date'].includes(f.key)), 
            allMetricsMap: map 
        };
    }, [schemas]);

    const resultHeaders = ['date', 'sku_shop', ...selectedMetrics];
    const totalPages = Math.ceil(queryResult.length / ROWS_PER_PAGE);
    const paginatedResult = queryResult.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    // 获取动态列宽 - 适配 1920 屏，核心指标严格定义宽度，确保无滚动条
    const getColumnWidth = (key: string) => {
        switch (key) {
            case 'sku_shop': return 'w-[120px]'; 
            case 'date': return 'w-[90px]';     
            case 'pv':
            case 'uv': return 'w-[70px]';
            case 'cost': return 'w-[80px]';     
            case 'paid_users':
            case 'paid_items': return 'w-[75px]';
            case 'cpc':
            case 'roi': return 'w-[70px]';      
            case 'paid_amount': return 'w-[90px]';
            default: return 'w-[80px]';        
        }
    };

    // 获取对齐样式 - 严格按需求：SKU左，时间/金额/花费右，其他居中
    const getTextAlign = (key: string) => {
        if (key === 'sku_shop') return 'text-left pl-2';
        if (['date', 'paid_amount', 'cost'].includes(key)) return 'text-right pr-2';
        return 'text-center'; 
    };

    return (
        <>
            <MetricSelectionModal isOpen={isMetricModalOpen} onClose={() => setIsMetricModalOpen(false)} shangzhiMetrics={shangzhiMetricsForModal} jingzhuntongMetrics={jingzhuntongMetricsForModal} selectedMetrics={selectedMetrics} onConfirm={(m: string[]) => { setSelectedMetrics(m); setIsMetricModalOpen(false); }} />
            <div className="p-8 w-full max-w-[1920px] mx-auto animate-fadeIn">
                <div className="mb-6 flex items-center justify-between">
                   <div>
                       <h1 className="text-3xl font-black text-slate-800 tracking-tight">多维数据查询</h1>
                       <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">Comprehensive Data Aggregator</p>
                   </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">选择时间段</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-[#70AD47] outline-none" />
                                <span className="text-slate-300">-</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-[#70AD47] outline-none" />
                            </div>
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">时间维度</label>
                             <select value={timeDimension} onChange={e => setTimeDimension(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-[#70AD47] outline-none">
                                 <option value="day">按天汇总</option><option value="week">按周汇总</option><option value="month">按月汇总</option>
                             </select>
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">限定店铺</label>
                             <select value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-[#70AD47] outline-none">
                                 <option value="all">所有店铺</option>{shops.map((s: Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">指标筛选</label>
                            <button onClick={() => setIsMetricModalOpen(true)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-colors">
                                <span className="font-bold text-sm">{selectedMetrics.length} 个指标已选</span><ChevronDown size={16} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-end gap-4">
                        <textarea placeholder="输入SKU编码，以逗号或换行分隔..." value={skuInput} onChange={e => setSkuInput(e.target.value)} className="flex-1 h-24 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-none" />
                        <div className="flex gap-4 pb-1">
                            <button onClick={handleReset} className="px-8 py-3 rounded-lg border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 uppercase">重置</button>
                            <button onClick={handleQuery} disabled={isLoading} className="px-10 py-3 rounded-lg bg-[#70AD47] text-white font-black text-xs hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-200 uppercase">
                                {isLoading ? '正在穿透计算...' : <><Zap size={14} className="fill-white" /> 执行聚合查询</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-[#70AD47]"/> 核心业务看板</h3>
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                            <button onClick={() => setComparisonType('period')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${comparisonType === 'period' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>环比前一周期</button>
                            <button onClick={() => setComparisonType('year')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${comparisonType === 'year' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>同比去年同期</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-10">
                        {VISUAL_METRICS.map(key => {
                            const label = allMetricsMap.get(key)?.label || key;
                            const color = METRIC_COLORS[key] || '#94a3b8';
                            if (!visualisationData) return <div key={key} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 h-28 flex flex-col justify-center items-center"><p className="text-[10px] font-black text-slate-300 uppercase">{label}</p><p className="text-xl font-black text-slate-100">-</p></div>;
                            const main = visualisationData.mainTotals[key] || 0;
                            const comp = visualisationData.compTotals[key] || 0;
                            const chg = getChange(main, comp);
                            const isG = chg > 0; const isD = chg < 0;
                            // 维持红涨绿跌
                            const bg = isG ? 'bg-rose-200/60' : isD ? 'bg-green-200/60' : 'bg-white';
                            const brd = isG ? 'border-rose-300' : isD ? 'border-green-300' : 'border-slate-100';
                            const txt = isG ? 'text-rose-700' : isD ? 'text-green-800' : 'text-slate-400';
                            return (
                                <div key={key} style={{ borderColor: chartMetrics.has(key) ? color : '' }} className={`p-4 rounded-2xl ${bg} border ${brd} shadow-sm transition-all group`}>
                                    <label style={{ color: color }} className="flex items-center gap-2 text-[10px] font-black uppercase cursor-pointer truncate">
                                        <input type="checkbox" checked={chartMetrics.has(key)} onChange={() => setChartMetrics(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; })} className="form-checkbox h-3 w-3 bg-transparent border-slate-300 rounded-sm focus:ring-0" /> {label}
                                    </label>
                                    <p className="text-lg font-black mt-2 text-slate-900 truncate">{formatMetricValue(main, key)}</p>
                                    <div className={`flex justify-between items-center mt-2 pt-2 border-t ${isG ? 'border-rose-300/50' : isD ? 'border-green-300/50' : 'border-slate-100'} text-[10px] font-black`}>
                                        {isFinite(chg) && <span className={`${txt} flex items-center`}>{isG ? <ArrowUp size={10} strokeWidth={4} /> : isD ? <ArrowDown size={10} strokeWidth={4} /> : null}{Math.abs(chg).toFixed(0)}%</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {visualisationData ? <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-100"><TrendChart dailyData={visualisationData.dailyData} chartMetrics={chartMetrics} metricsMap={allMetricsMap} /></div> : null}
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <div className="flex items-center gap-3"><BarChart3 size={20} className="text-[#70AD47]" /><span className="font-black text-slate-800 uppercase tracking-widest">查询结果明细集 (已聚合)</span></div>
                        <button onClick={() => {}} className="flex items-center gap-2 px-6 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-black text-[10px] hover:bg-slate-50 shadow-sm transition-all"><Download size={14} /> 导出 EXCEL 报表</button>
                    </div>
                    <div className="p-4">
                        <div className="overflow-x-auto rounded-xl border border-slate-100 no-scrollbar">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                        {resultHeaders.map(key => (
                                            <th key={key} className={`py-4 px-2 border-b border-slate-200 ${getColumnWidth(key)} ${getTextAlign(key)}`}>{allMetricsMap.get(key)?.label || key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                         <tr><td colSpan={resultHeaders.length} className="py-32 text-center text-slate-400 font-black animate-pulse">正在处理聚合中...</td></tr>
                                    ) : queryResult.length === 0 ? (
                                        <tr><td colSpan={resultHeaders.length} className="py-40 text-center text-slate-300 font-black text-sm uppercase tracking-widest">点击按钮开始查询</td></tr>
                                    ) : (
                                        paginatedResult.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-100/50 transition-colors group">
                                                {resultHeaders.map(key => (
                                                    <td key={key} className={`py-3 px-1.5 text-[11px] text-slate-600 truncate font-mono ${getTextAlign(key)}`}>
                                                        {key === 'sku_shop' ? (
                                                            <div className="truncate text-left">
                                                                <div className="font-black text-slate-800 truncate" title={row.sku_shop.code}>{row.sku_shop.code}</div>
                                                                <div className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">{row.sku_shop.shopName}</div>
                                                            </div>
                                                        ) : key === 'date' ? (
                                                            <span className="font-black text-slate-500 whitespace-nowrap">{row.date}</span>
                                                        ) : (row[key] == null) ? '-' : typeof row[key] === 'number' ? formatMetricValue(row[key], key) : row[key]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {queryResult.length > 0 && (
                            <div className="flex justify-between items-center pt-6 px-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase">共 {queryResult.length} 条数据 / 第 {currentPage} - {totalPages} 页</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 font-black text-[10px] hover:bg-slate-50 disabled:opacity-30 uppercase transition-all">上一页</button>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 font-black text-[10px] hover:bg-slate-50 disabled:opacity-30 uppercase transition-all">下一页</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
