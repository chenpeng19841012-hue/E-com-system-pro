
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
    'paid_items': '#22C55E',         // 绿色
    'paid_amount': '#059669',        // 翠绿色
    'cost': '#F43F5E',               // 玫瑰红
    'cpc': '#F59E0B',               // 琥珀色
    'roi': '#6366F1',               // 靛蓝色
    'total_order_amount': '#8B5CF6' // 紫罗兰色
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

// 数值精度格式化工具
const formatMetricValue = (value: number, key: string) => {
    if (key === 'roi' || key === 'cpc') return (value || 0).toFixed(1);
    if (key.includes('amount') || key.includes('cost')) return `¥${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return Math.round(value || 0).toLocaleString();
};

const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? Infinity : 0;
    return ((current - previous) / previous) * 100;
};

const isChangePositive = (key: string, change: number) => {
    if (key === 'cost' || key === 'cpc') return change < 0; 
    return change > 0;
};

// 趋势图组件 (支持色彩同步与动态 Tooltip)
const TrendChart = ({ dailyData, chartMetrics, metricsMap }: { dailyData: any[], chartMetrics: Set<string>, metricsMap: Map<string, any> }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    if (dailyData.length < 2 || chartMetrics.size === 0) {
        return <div className="h-full flex items-center justify-center text-slate-400">请执行查询并勾选指标以显示趋势</div>;
    }

    const width = 800;
    const height = 125; // 高度缩短一半 (250 -> 125)
    const padding = { top: 20, right: 20, bottom: 25, left: 40 };

    const selectedMetricsData = Array.from(chartMetrics);
    
    // 计算归一化基准
    const metricMaxMap = new Map<string, number>();
    selectedMetricsData.forEach(key => {
        const max = Math.max(...dailyData.map(d => d[key] || 0), 0.1);
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
            // Tooltip 浮层位置计算（防止溢出右边界）
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

            <svg 
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`} 
                className="w-full h-auto cursor-crosshair"
                onMouseMove={handleMouseMove}
            >
                {/* 坐标轴 */}
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" strokeWidth="1" />
                {dailyData.map((d, i) => ( (i === 0 || i === dailyData.length - 1 || i % Math.ceil(dailyData.length / 8) === 0) &&
                    <text key={i} x={xScale(i)} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#94a3b8">{d.date.substring(5)}</text>
                ))}

                {/* 悬停对齐线 */}
                {hoveredIndex !== null && (
                    <line 
                        x1={xScale(hoveredIndex)} 
                        y1={padding.top} 
                        x2={xScale(hoveredIndex)} 
                        y2={height - padding.bottom} 
                        stroke="#70AD47" 
                        strokeWidth="1" 
                        strokeDasharray="4 2" 
                    />
                )}

                {/* 趋势线 */}
                {selectedMetricsData.map(key => (
                    <path
                        key={key}
                        d={`M ${dailyData.map((d, i) => `${xScale(i)},${yScale(d[key] || 0, key)}`).join(' L ')}`}
                        fill="none"
                        stroke={METRIC_COLORS[key]}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-opacity duration-300"
                        style={{ opacity: hoveredIndex === null ? 1 : 0.8 }}
                    />
                ))}

                {/* 悬停数据点突出显示 */}
                {hoveredIndex !== null && selectedMetricsData.map(key => (
                    <circle 
                        key={key}
                        cx={xScale(hoveredIndex)}
                        cy={yScale(dailyData[hoveredIndex][key] || 0, key)}
                        r="3"
                        fill="white"
                        stroke={METRIC_COLORS[key]}
                        strokeWidth="2"
                    />
                ))}
            </svg>

            {/* 动态悬浮窗 Tooltip */}
            {hoveredIndex !== null && (
                <div 
                    className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-xl p-3 w-40 animate-fadeIn"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <p className="text-[10px] font-black text-slate-400 mb-2 border-b border-slate-100 pb-1">{dailyData[hoveredIndex].date}</p>
                    <div className="space-y-1.5">
                        {selectedMetricsData.map(key => (
                            <div key={key} className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: METRIC_COLORS[key] }}></div>
                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[60px]">{metricsMap.get(key)?.label}</span>
                                </div>
                                <span className="text-[11px] font-black text-slate-800 tabular-nums">
                                    {formatMetricValue(dailyData[hoveredIndex][key] || 0, key)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-2 text-center text-[9px] text-slate-400 font-bold italic">* 各指标线条已归一化，颜色与上方卡片同步；移动鼠标查看具体数值</div>
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
    
    const VISUAL_METRICS = ['pv', 'uv', 'paid_items', 'paid_amount', 'cost', 'cpc', 'roi', 'total_order_amount'];
    // 默认勾选 访客数、成交件数、消耗(花费)
    const [chartMetrics, setChartMetrics] = useState<Set<string>>(new Set(['uv', 'paid_items', 'cost']));
    
    const ROWS_PER_PAGE = 50;
    
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
        if (!startDate || !endDate) return;
        setIsLoading(true);
        setCurrentPage(1);
        setVisualisationData(null);
        
        setTimeout(() => {
            const managedSkuCodes = skus.length > 0 ? new Set(skus.map(s => s.code)) : null;
            const parsedSkus = skuInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
            const skuCodeToInfoMap = new Map(skus.map((s: ProductSKU) => [s.code, s]));

            const getDataForPeriod = (start: string, end: string) => {
                 const filteredShangzhi = (shangzhiData || []).filter((row: any) => {
                    const skuCode = getSkuIdentifier(row);
                    if (!row.date || !skuCode) return false;
                    if (managedSkuCodes && !managedSkuCodes.has(skuCode)) return false;
                    if (start && row.date < start) return false;
                    if (end && row.date > end) return false;
                    if (parsedSkus.length > 0 && !parsedSkus.includes(skuCode)) return false;
                    if (selectedShopId !== 'all') {
                        const skuInfo = skuCodeToInfoMap.get(skuCode);
                        if (skuInfo?.shopId !== selectedShopId) return false;
                    }
                    return true;
                });

                const filteredJingzhuntong = (jingzhuntongData || []).filter((row: any) => {
                    const skuCode = getSkuIdentifier(row);
                    if (!row.date || !skuCode) return false;
                    if (managedSkuCodes && !managedSkuCodes.has(skuCode)) return false;
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

                const getAggregationKey = (dateStr: string, skuCode: string) => {
                    const d = new Date(dateStr);
                    if (timeDimension === 'month') {
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${skuCode}`;
                    }
                    if (timeDimension === 'week') {
                        const date = new Date(dateStr);
                        const day = date.getDay() || 7;
                        date.setUTCDate(date.getUTCDate() - day + 1);
                        return `${date.toISOString().split('T')[0]}-${skuCode}`;
                    }
                    return `${dateStr}-${skuCode}`;
                };

                const processRow = (row: any) => {
                    const skuCode = getSkuIdentifier(row)!;
                    const key = getAggregationKey(row.date, skuCode);
                    if (!mergedData.has(key)) {
                        const skuInfo = skuCodeToInfoMap.get(skuCode);
                        const shopInfo = shops.find(s => s.id === skuInfo?.shopId);
                        
                        let displayDate = row.date;
                        if (timeDimension === 'month') displayDate = row.date.substring(0, 7);
                        else if (timeDimension === 'week') displayDate = key.split('-').slice(0,3).join('-');

                        mergedData.set(key, { 
                            date: displayDate,
                            sku_code: skuCode,
                            sku_shop: { code: skuCode, shopName: shopInfo?.name || row.shop_name || row.account_nickname || '默认店铺' },
                        });
                    }
                    const entry = mergedData.get(key)!;
                    for (const metric of metricsToAggregate) {
                        if (row[metric] !== undefined && row[metric] !== null) entry[metric] = (entry[metric] || 0) + Number(row[metric]);
                    }
                };

                filteredShangzhi.forEach(processRow);
                filteredJingzhuntong.forEach(processRow);

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
                totals.roi = totals.cost ? (totals.total_order_amount || totals.paid_amount || 0) / totals.cost : 0;
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
                d.roi = d.cost ? (d.total_order_amount || d.paid_amount || 0) / d.cost : 0;
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
        map.set('date', { key: 'date', label: '时间范围', type: 'TIMESTAMP' });
        map.set('sku_shop', { key: 'sku_shop', label: 'SKU / 店铺', type: 'STRING' });
        
        map.set('pv', { ...(map.get('pv') || {key: 'pv', label:'浏览量', type:'INTEGER'}), label: '浏览量' });
        map.set('uv', { ...(map.get('uv') || {key: 'uv', label:'访客数', type:'INTEGER'}), label: '访客数' });
        map.set('paid_items', { ...(map.get('paid_items') || {key: 'paid_items', label:'CA', type:'INTEGER'}), label: '成交件数' });
        map.set('paid_amount', { ...(map.get('paid_amount') || {key: 'paid_amount', label:'GMV', type:'REAL'}), label: '成交金额' });
        map.set('cost', { ...(map.get('cost') || {key: 'cost', label:'花费', type:'REAL'}), label: '消耗' });
        map.set('total_order_amount', { ...(map.get('total_order_amount') || {key:'total_order_amount', label:'总订单金额', type:'REAL'}), label: '总成交额' });

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
        const headers = resultHeaders.map(key => allMetricsMap.get(key)?.label || key);
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
        XLSX.utils.book_append_sheet(wb, ws, "数据聚合报表");
        XLSX.writeFile(wb, `聚合查询_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const totalPages = Math.ceil(queryResult.length / ROWS_PER_PAGE);
    const paginatedResult = queryResult.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
    const isDataLoaded = (shangzhiData?.length || 0) > 0 || (jingzhuntongData?.length || 0) > 0;

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
                <div className="mb-6 flex items-center justify-between">
                   <div>
                       <h1 className="text-3xl font-black text-slate-800 tracking-tight">多维数据查询</h1>
                       <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">Comprehensive Data Aggregator</p>
                   </div>
                   {!isDataLoaded && (
                       <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl border border-amber-100 animate-pulse">
                           <AlertCircle size={16} />
                           <span className="text-xs font-black">警告：物理库中暂无同步数据，请先前往「数据中心」上传表格。</span>
                       </div>
                   )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">选择时间段</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#70AD47]" />
                                <span className="text-slate-300">-</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#70AD47]" />
                            </div>
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">时间维度</label>
                             <select value={timeDimension} onChange={e => setTimeDimension(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#70AD47]">
                                 <option value="day">按天汇总</option>
                                 <option value="week">按周汇总</option>
                                 <option value="month">按月汇总</option>
                             </select>
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">限定店铺</label>
                             <select value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#70AD47]">
                                 <option value="all">所有店铺</option>
                                 {shops.map((s: Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">指标筛选</label>
                            <button onClick={() => setIsMetricModalOpen(true)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                                <span className="font-bold text-sm">{selectedMetrics.length} 个指标已选</span>
                                <ChevronDown size={16} className="text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU 精准过滤 (支持模糊匹配)</label>
                             <textarea 
                                placeholder="输入SKU，以逗号或换行分隔。留空则代表统计范围内全量资产。" 
                                value={skuInput}
                                onChange={e => setSkuInput(e.target.value)}
                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-none"
                             ></textarea>
                        </div>
                        <div className="flex gap-4 pb-1">
                            <button onClick={handleReset} className="px-8 py-3 rounded-lg border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 transition-colors uppercase tracking-widest">重置</button>
                            <button 
                                onClick={handleQuery} 
                                disabled={isLoading} 
                                className="px-10 py-3 rounded-lg bg-[#70AD47] text-white font-black text-xs hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed uppercase tracking-widest"
                            >
                                {isLoading ? '正在穿透计算...' : <><Zap size={14} className="fill-white" /> 执行聚合查询</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-[#70AD47]"/> 核心业务看板</h3>
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                            <button onClick={() => setComparisonType('period')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${comparisonType === 'period' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-400'}`}>环比前一周期</button>
                            <button onClick={() => setComparisonType('year')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${comparisonType === 'year' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-400'}`}>同比去年同期</button>
                        </div>
                    </div>
                    {/* 均等 8*1 布局调整 (grid-cols-2 md:grid-cols-4 -> lg:grid-cols-8) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-10">
                        {VISUAL_METRICS.map(key => {
                            const metricLabel = allMetricsMap.get(key)?.label || key;
                            const metricColor = METRIC_COLORS[key] || '#94a3b8';

                            if (!visualisationData) {
                                return (
                                    <div key={key} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer truncate">
                                            <input type="checkbox" checked={chartMetrics.has(key)} onChange={() => setChartMetrics(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;})} className="form-checkbox h-3 w-3 bg-transparent border-slate-300 rounded-sm text-[#70AD47] focus:ring-0" />
                                            {metricLabel}
                                        </label>
                                        <p className="text-xl font-black mt-2 text-slate-200">-</p>
                                    </div>
                                );
                            }
                            
                            const mainValue = visualisationData.mainTotals[key] || 0;
                            const compValue = visualisationData.compTotals[key] || 0;
                            const change = getChange(mainValue, compValue);
                            const isPositive = isChangePositive(key, change);

                            return (
                                <div key={key} style={{ borderColor: chartMetrics.has(key) ? `${metricColor}30` : '' }} className={`p-4 rounded-2xl bg-white border border-slate-100 shadow-sm group hover:border-slate-200 transition-all`}>
                                    <label style={{ color: metricColor }} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer truncate`}>
                                        <input 
                                            type="checkbox" 
                                            checked={chartMetrics.has(key)} 
                                            onChange={() => setChartMetrics(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;})} 
                                            style={{ color: metricColor }}
                                            className={`form-checkbox h-3 w-3 bg-transparent border-slate-200 rounded-sm focus:ring-0`}
                                        />
                                        {metricLabel}
                                    </label>
                                    <p className="text-xl font-black mt-2 text-slate-800 truncate">{formatMetricValue(mainValue, key)}</p>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 text-[9px] font-black">
                                        {isFinite(change) && (
                                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {isPositive ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                                                {Math.abs(change).toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {visualisationData?.dailyData ? (
                        <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-100 overflow-visible">
                             <TrendChart dailyData={visualisationData.dailyData} chartMetrics={chartMetrics} metricsMap={allMetricsMap} />
                        </div>
                    ) : (
                        <div className="h-[150px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
                             <TrendingUp size={32} className="mb-2 opacity-10" />
                             <p className="font-black text-[10px] uppercase tracking-widest">请点击按钮执行查询以渲染趋势分析</p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 min-h-[400px]">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <BarChart3 size={20} className="text-[#70AD47]" />
                            <span className="font-black text-slate-800 uppercase tracking-widest">查询结果明细集 (已聚合)</span>
                        </div>
                        <button 
                            onClick={handleExport} 
                            disabled={queryResult.length === 0} 
                            className="flex items-center gap-2 px-6 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-black text-[10px] hover:bg-slate-50 shadow-sm transition-all disabled:opacity-30 disabled:shadow-none"
                        >
                            <Download size={14} /> 导出 EXCEL 报表
                        </button>
                    </div>
                    <div className="p-4 overflow-hidden">
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                        {resultHeaders.map(key => (
                                            <th key={key} className={`py-4 px-4 ${key === 'sku_shop' ? 'w-[300px]' : 'w-[120px]'}`}>{allMetricsMap.get(key)?.label || key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                         <tr><td colSpan={resultHeaders.length} className="py-32 text-center text-slate-400 font-black animate-pulse">正在处理海量流水聚合中...</td></tr>
                                    ) : queryResult.length === 0 ? (
                                        <tr>
                                            <td colSpan={resultHeaders.length} className="py-40 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-300">
                                                     <Zap size={64} className="mb-6 opacity-10" />
                                                     <p className="font-black text-sm uppercase tracking-widest text-slate-400">准备就绪，点击上方按钮开始查询</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedResult.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                {resultHeaders.map(key => (
                                                    <td key={key} className="py-4 px-4 text-xs text-slate-600 truncate font-mono">
                                                        {key === 'sku_shop' ? (
                                                            <div className="truncate">
                                                                <div className="font-black text-slate-800 truncate" title={row.sku_shop.code}>{row.sku_shop.code}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold mt-1 truncate">{row.sku_shop.shopName}</div>
                                                            </div>
                                                        ) : (row[key] === undefined || row[key] === null) ? '-' : typeof row[key] === 'number' ? 
                                                            (
                                                                key === 'paid_amount' ? `¥${Math.round(row[key]).toLocaleString()}` :
                                                                key === 'cost' ? `¥${Math.round(row[key]).toLocaleString()}` :
                                                                ['cpc', 'roi'].includes(key) ? row[key].toFixed(1) : 
                                                                Math.round(row[key]).toLocaleString()
                                                            ) : row[key]}
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
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    共匹配 {queryResult.length} 条数据 / 第 {currentPage} - {totalPages} 页
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 font-black text-[10px] hover:bg-slate-50 disabled:opacity-30 uppercase transition-all"
                                    >
                                        上一页
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 font-black text-[10px] hover:bg-slate-50 disabled:opacity-30 uppercase transition-all"
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
