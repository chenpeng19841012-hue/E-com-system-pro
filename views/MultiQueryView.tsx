import React, { useState, useMemo, useRef } from 'react';
import { Zap, ChevronDown, BarChart3, X, Download, TrendingUp, ArrowUp, ArrowDown, Activity, Filter, Database, Search, Sparkles, RefreshCcw, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
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
    addToast: any;
}

const METRIC_COLORS: Record<string, string> = {
    'pv': '#22C55E',                // 绿色
    'uv': '#06B6D4',                // 青色
    'paid_items': '#8B5CF6',         // 紫色
    'paid_amount': '#10B981',        // 翠绿
    'paid_conversion_rate': '#F43F5E', // 红色
    'cost': '#3B82F6',               // 蓝色
    'cpc': '#6366F1',                // 靛蓝
    'roi': '#D946EF'                 // 粉紫
};

const formatMetricValue = (value: number, key: string) => {
    if (key === 'roi') return (value || 0).toFixed(1);
    if (key === 'cpc') return `¥${(value || 0).toFixed(2)}`;
    if (key === 'paid_conversion_rate') return `${(value * 100).toFixed(2)}%`;
    if (key.includes('amount') || key.includes('cost')) return `¥${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return Math.round(value || 0).toLocaleString();
};

const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

// 微型趋势图组件
const MiniSparkline = ({ data, color }: { data: number[], color: string }) => {
    if (!data || data.length < 2) return <div className="h-8" />;
    const max = Math.max(...data, 0.0001);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 32;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' L ');
    
    return (
        <svg width="100%" height="32" viewBox={`0 0 ${width} ${height}`} className="overflow-visible opacity-40 group-hover/kpi:opacity-100 transition-opacity">
            <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const MetricSelectionModal = ({ isOpen, onClose, shangzhiMetrics, jingzhuntongMetrics, selectedMetrics, onConfirm }: any) => {
    const [tempSelected, setTempSelected] = useState(new Set(selectedMetrics));
    React.useEffect(() => { if (isOpen) setTempSelected(new Set(selectedMetrics)); }, [isOpen, selectedMetrics]);
    const handleToggle = (key: string) => {
        setTempSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
            return newSet;
        });
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl p-10 m-4 max-h-[85vh] flex flex-col border border-slate-200">
                <div className="flex justify-between items-center mb-8 shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Filter className="text-brand" size={24} /> 维度算力配置
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Dimensional Power Selection</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                </div>
                <div className="grid grid-cols-2 gap-12 overflow-y-auto flex-1 no-scrollbar pb-6">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><div className="w-1.5 h-4 bg-brand rounded-full"></div><h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">商智销售指标</h4></div>
                        <div className="grid grid-cols-1 gap-2">
                            {shangzhiMetrics.map((field: FieldDefinition) => (
                                <label key={field.key} className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${tempSelected.has(field.key) ? 'bg-brand/5 border-brand/20 text-brand' : 'bg-white border-transparent hover:bg-slate-50 text-slate-500'}`}>
                                    <input type="checkbox" checked={tempSelected.has(field.key)} onChange={() => handleToggle(field.key)} className="form-checkbox h-4 w-4 text-brand border-slate-300 rounded focus:ring-brand" />
                                    <span className="text-xs font-bold">{field.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div><h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">广告投放指标</h4></div>
                        <div className="grid grid-cols-1 gap-2">
                            {jingzhuntongMetrics.map((field: FieldDefinition) => (
                                <label key={field.key} className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${tempSelected.has(field.key) ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-white border-transparent hover:bg-slate-50 text-slate-500'}`}>
                                    <input type="checkbox" checked={tempSelected.has(field.key)} onChange={() => handleToggle(field.key)} className="form-checkbox h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                                    <span className="text-xs font-bold">{field.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-8 pt-8 border-t border-slate-100 shrink-0">
                    <button onClick={onClose} className="px-8 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all">取消</button>
                    <button onClick={() => onConfirm(Array.from(tempSelected))} className="px-10 py-3 rounded-xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-xl shadow-brand/20 transition-all">确认应用 ({tempSelected.size})</button>
                </div>
            </div>
        </div>
    );
};

const TrendChart = ({ dailyData, chartMetrics, metricsMap }: { dailyData: any[], chartMetrics: Set<string>, metricsMap: Map<string, any> }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    if (dailyData.length < 2 || chartMetrics.size === 0) return (
        <div className="h-32 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
            <BarChart3 size={48} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest">请勾选上方卡片指标以激活全维度趋势流</p>
        </div>
    );

    // 高度减半：从 300 降至 150
    const width = 1000; const height = 150; 
    const padding = { top: 20, right: 40, bottom: 30, left: 60 };
    
    const selectedMetricsData = Array.from(chartMetrics);
    const metricMaxMap = new Map<string, number>();
    selectedMetricsData.forEach(key => metricMaxMap.set(key, Math.max(...dailyData.map(d => d[key] || 0), 0.0001)));
    
    const xScale = (i: number) => padding.left + (i / (dailyData.length - 1)) * (width - padding.left - padding.right);
    const yScale = (v: number, key: string) => { 
        const max = metricMaxMap.get(key) || 1; 
        return height - padding.bottom - (v / max) * (height - padding.top - padding.bottom); 
    };

    return (
        <div ref={containerRef} className="relative pt-6 font-sans" onMouseLeave={() => setHoveredIndex(null)} onMouseMove={(e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * width;
            const idx = Math.round(((x - padding.left) / (width - padding.left - padding.right)) * (dailyData.length - 1));
            if (idx >= 0 && idx < dailyData.length) setHoveredIndex(idx);
        }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible cursor-crosshair">
                <defs>
                    {selectedMetricsData.map(key => (
                        <linearGradient key={`g-${key}`} id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={METRIC_COLORS[key]} stopOpacity="0.15"/>
                            <stop offset="100%" stopColor={METRIC_COLORS[key]} stopOpacity="0"/>
                        </linearGradient>
                    ))}
                </defs>
                <line x1={padding.left} y1={height-padding.bottom} x2={width-padding.right} y2={height-padding.bottom} stroke="#f1f5f9" strokeWidth="2" />
                {selectedMetricsData.map(key => {
                    const pts = dailyData.map((d, i) => `${xScale(i)},${yScale(d[key] || 0, key)}`).join(' L ');
                    return (
                        <g key={key} className="transition-all duration-700">
                            <path d={`M ${xScale(0)},${height-padding.bottom} L ${pts} L ${xScale(dailyData.length-1)},${height-padding.bottom} Z`} fill={`url(#g-${key})`} />
                            {/* 线宽从 4 减至 2 */}
                            <path d={`M ${pts}`} fill="none" stroke={METRIC_COLORS[key]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                    );
                })}
                {hoveredIndex !== null && <line x1={xScale(hoveredIndex)} y1={padding.top} x2={xScale(hoveredIndex)} y2={height-padding.bottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="6 4" />}
            </svg>
            {hoveredIndex !== null && (
                <div className="absolute z-50 pointer-events-none bg-slate-900/95 backdrop-blur text-white rounded-2xl p-5 shadow-2xl animate-fadeIn" style={{ left: `${(xScale(hoveredIndex)/width)*100}%`, top: '40%', transform: `translate(${hoveredIndex > dailyData.length/2 ? '-110%' : '15%'}, -50%)` }}>
                    <p className="text-[10px] font-black text-slate-500 mb-3 border-b border-white/10 pb-2 uppercase">{dailyData[hoveredIndex].date}</p>
                    <div className="space-y-2">
                        {selectedMetricsData.map(key => (
                            <div key={key} className="flex justify-between items-center gap-10">
                                <span className="flex items-center gap-2 text-[10px] font-bold text-slate-300"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: METRIC_COLORS[key] }}></div>{metricsMap.get(key)?.label}</span>
                                <span className="text-xs font-black tabular-nums">{formatMetricValue(dailyData[hoveredIndex][key] || 0, key)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const MultiQueryView = ({ shangzhiData, jingzhuntongData, skus, shops, schemas, addToast }: MultiQueryViewProps) => {
    const [startDate, setStartDate] = useState(new Date(Date.now() - 6*86400000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [timeDimension, setTimeDimension] = useState('day');
    const [selectedShopId, setSelectedShopId] = useState('all');
    const [skuInput, setSkuInput] = useState('');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['pv', 'uv', 'paid_items', 'paid_amount', 'paid_conversion_rate', 'cost', 'cpc', 'roi']);
    const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [queryResult, setQueryResult] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [visualisationData, setVisualisationData] = useState<any>(null);
    const [comparisonType, setComparisonType] = useState<'period' | 'year'>('period');
    
    const VISUAL_METRICS = ['pv', 'uv', 'paid_items', 'paid_amount', 'paid_conversion_rate', 'cost', 'cpc', 'roi'];
    // 默认选择：访客数(uv)、成交金额(paid_amount)、广告花费(cost)
    const [chartMetrics, setChartMetrics] = useState<Set<string>>(new Set(['uv', 'paid_amount', 'cost']));
    
    // 显示行数改为 20
    const ROWS_PER_PAGE = 20;

    const handleQuery = () => {
        setIsLoading(true); setQueryResult([]); setVisualisationData(null); setCurrentPage(1);
        setTimeout(() => {
            const parsedSkus = skuInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
            const skuCodeToInfoMap = new Map(skus.map(s => [s.code, s]));
            const currentSelectedShop = selectedShopId !== 'all' ? shops.find(s => s.id === selectedShopId) : null;
            const getData = (start: string, end: string) => {
                const filter = (row: any) => {
                    const code = getSkuIdentifier(row); if (!row.date || !code) return false;
                    if (start && row.date < start) return false; if (end && row.date > end) return false;
                    if (parsedSkus.length > 0 && !parsedSkus.includes(code)) return false;
                    if (currentSelectedShop) {
                        const assetShopId = skuCodeToInfoMap.get(code)?.shopId;
                        if (assetShopId !== currentSelectedShop.id && row.shop_name !== currentSelectedShop.name) return false;
                    }
                    return true;
                };
                const merged = new Map<string, any>();
                const proc = (row: any) => {
                    const code = getSkuIdentifier(row)!;
                    const d = new Date(row.date);
                    let key = row.date;
                    if (timeDimension === 'month') key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                    else if (timeDimension === 'week') { d.setUTCDate(d.getUTCDate() - (d.getDay() || 7) + 1); key = d.toISOString().split('T')[0]; }
                    const aggKey = `${key}-${code}`;
                    if (!merged.has(aggKey)) merged.set(aggKey, { date: row.date, aggDate: key, sku_code: code, sku_shop: { code, shopName: row.shop_name || shops.find(s => s.id === skuCodeToInfoMap.get(code)?.shopId)?.name || '未知' } });
                    const ent = merged.get(aggKey)!;
                    [...selectedMetrics, ...VISUAL_METRICS, 'clicks', 'paid_users', 'paid_customers', 'total_order_amount'].forEach(m => {
                        if (m === 'paid_users') ent[m] = (ent[m] || 0) + (Number(row.paid_users) || Number(row.paid_customers) || 0);
                        else ent[m] = (ent[m] || 0) + (Number(row[m]) || 0);
                    });
                };
                shangzhiData.filter(filter).forEach(proc); jingzhuntongData.filter(filter).forEach(proc);
                return Array.from(merged.values());
            };
            const mainData = getData(startDate, endDate);
            const mainStart = new Date(startDate); const mainEnd = new Date(endDate);
            const diff = (mainEnd.getTime() - mainStart.getTime());
            let cS: Date, cE: Date;
            if (comparisonType === 'period') { cE = new Date(mainStart); cE.setDate(cE.getDate()-1); cS = new Date(cE.getTime() - diff); }
            else { cS = new Date(mainStart); cS.setFullYear(cS.getFullYear()-1); cE = new Date(mainEnd); cE.setFullYear(cE.getFullYear()-1); }
            const compData = getData(cS.toISOString().split('T')[0], cE.toISOString().split('T')[0]);
            const calc = (d: any[]) => {
                const t = d.reduce((acc, row) => { [...VISUAL_METRICS, 'clicks', 'paid_users', 'total_order_amount'].forEach(k => acc[k] = (acc[k] || 0) + (Number(row[k]) || 0)); return acc; }, {} as any);
                t.cpc = t.clicks ? t.cost / t.clicks : 0; t.roi = t.cost ? (t.total_order_amount || t.paid_amount || 0) / t.cost : 0; t.paid_conversion_rate = t.uv ? t.paid_users / t.uv : 0;
                return t;
            };
            const dMap = new Map<string, any>();
            mainData.forEach(r => {
                if (!dMap.has(r.aggDate)) dMap.set(r.aggDate, { date: r.aggDate });
                const ent = dMap.get(r.aggDate);
                [...VISUAL_METRICS, 'clicks', 'paid_users', 'total_order_amount'].forEach(k => ent[k] = (ent[k] || 0) + (Number(r[k]) || 0));
            });
            const dData = Array.from(dMap.values()).sort((a,b) => a.date.localeCompare(b.date));
            dData.forEach(d => { d.cpc = d.clicks ? d.cost / d.clicks : 0; d.roi = d.cost ? (d.total_order_amount || d.paid_amount || 0) / d.cost : 0; d.paid_conversion_rate = d.uv ? d.paid_users / d.uv : 0; });
            setVisualisationData({ mainTotals: calc(mainData), compTotals: calc(compData), dailyData: dData });
            setQueryResult(mainData.sort((a,b) => b.date.localeCompare(a.date))); setIsLoading(false);
            addToast('success', '计算完成', `已聚合 ${mainData.length} 条物理记录。`);
        }, 600);
    };

    const { allMetricsMap } = useMemo(() => {
        const map = new Map<string, any>(); [...schemas.shangzhi, ...schemas.jingzhuntong].forEach(f => map.set(f.key, f));
        ['date','sku_shop','pv','uv','paid_users','paid_items','paid_amount','paid_conversion_rate','cost','cpc','roi'].forEach(k => map.set(k, { key: k, label: {date:'日期',sku_shop:'资产归属',pv:'浏览量',uv:'访客数',paid_users:'成交人数',paid_items:'成交件数',paid_amount:'成交金额',paid_conversion_rate:'成交转化率',cost:'广告花费',cpc:'CPC',roi:'ROI'}[k] }));
        return { allMetricsMap: map };
    }, [schemas]);

    const totalPages = Math.ceil(queryResult.length / ROWS_PER_PAGE);
    const resultHeaders = ['date', 'sku_shop', ...selectedMetrics];
    const paginatedResult = queryResult.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    return (
        <>
            <MetricSelectionModal isOpen={isMetricModalOpen} onClose={() => setIsMetricModalOpen(false)} shangzhiMetrics={schemas.shangzhi.filter(f => !['date','sku_code','product_name'].includes(f.key))} jingzhuntongMetrics={schemas.jingzhuntong.filter(f => !['date'].includes(f.key))} selectedMetrics={selectedMetrics} onConfirm={(m:any) => { setSelectedMetrics(m); setIsMetricModalOpen(false); }} />
            <div className="p-8 md:p-10 w-full animate-fadeIn space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2"><div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div><span className="text-[10px] font-black text-brand uppercase tracking-widest">物理层多维透视中</span></div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">多维数据透视中心</h1>
                        <p className="text-slate-500 font-medium text-xs mt-1 opacity-60">Physical Dimensional Intelligence Hub & Record Penetration</p>
                    </div>
                </div>

                {/* 配置面板 */}
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">时间跨度</label><div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-inner focus-within:border-brand transition-all"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent border-none text-[11px] font-black text-slate-700 px-3 py-2 outline-none" /><span className="text-slate-300 font-black">-</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent border-none text-[11px] font-black text-slate-700 px-3 py-2 outline-none" /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">聚合粒度</label><div className="relative"><select value={timeDimension} onChange={e => setTimeDimension(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm"><option value="day">按天 (Daily)</option><option value="week">按周 (Weekly)</option><option value="month">按月 (Monthly)</option></select><ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">归属店铺</label><div className="relative"><select value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm"><option value="all">全域探测</option>{shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">算力因子</label><button onClick={() => setIsMetricModalOpen(true)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-all shadow-sm"><span className="font-black text-xs">{selectedMetrics.length} 项因子已就绪</span><Filter size={14} className="text-slate-400" /></button></div>
                    </div>
                    <div className="flex items-end gap-6 relative z-10 pt-6 border-t border-slate-50">
                        <div className="flex-1 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU 精准检索</label><textarea placeholder="输入 SKU 编码，以回车或逗号分隔..." value={skuInput} onChange={e => setSkuInput(e.target.value)} className="w-full h-24 bg-slate-50 border border-slate-200 rounded-[28px] px-6 py-4 text-xs font-black text-slate-700 outline-none focus:border-brand resize-none shadow-inner no-scrollbar font-mono" /></div>
                        <div className="flex gap-3 pb-2"><button onClick={() => { setSkuInput(''); setVisualisationData(null); }} className="w-14 h-14 rounded-3xl bg-white border border-slate-200 text-slate-300 hover:text-slate-500 transition-all active:scale-90 flex items-center justify-center"><RefreshCcw size={20}/></button><button onClick={handleQuery} disabled={isLoading} className="px-12 py-5 rounded-[28px] bg-brand text-white font-black text-sm hover:bg-[#5da035] shadow-2xl shadow-brand/20 flex items-center gap-3 transition-all active:scale-95 disabled:bg-slate-200 uppercase tracking-widest">{isLoading ? <Activity className="animate-spin" size={18} /> : <Zap size={18} className="fill-white" />} 执行聚合透视</button></div>
                    </div>
                </div>

                {/* 看板区域 */}
                <div className="bg-white rounded-[48px] p-10 text-slate-900 shadow-sm border border-slate-100 relative overflow-hidden group/board">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(112,173,71,0.03),transparent_70%)] pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-12 relative z-10">
                        <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-3xl bg-brand flex items-center justify-center shadow-lg border border-white/10 group-hover/board:rotate-6 transition-transform duration-500"><TrendingUp size={28} className="text-white" /></div><div><h3 className="text-xl font-black tracking-tight uppercase">核心业务透视看板</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Physical Performance Insight Board</p></div></div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner"><button onClick={() => setComparisonType('period')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${comparisonType === 'period' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>环比前一周期</button><button onClick={() => setComparisonType('year')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${comparisonType === 'year' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>同比去年同期</button></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-12 relative z-10">
                        {VISUAL_METRICS.map(key => {
                            const label = allMetricsMap.get(key)?.label || key;
                            const color = METRIC_COLORS[key];
                            const isSelected = chartMetrics.has(key);
                            
                            if (!visualisationData) return (
                                <div key={key} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 h-44 flex flex-col justify-center items-center opacity-30"><p className="text-[9px] font-black text-slate-400 uppercase">{label}</p><p className="text-2xl font-black text-slate-300 mt-2">-</p></div>
                            );

                            const main = visualisationData.mainTotals[key] || 0;
                            const comp = visualisationData.compTotals[key] || 0;
                            const chg = getChange(main, comp);
                            const isG = chg >= 0; 
                            const txtC = isG ? 'text-green-600' : 'text-rose-600';
                            
                            const sparkData = visualisationData.dailyData.map((d: any) => d[key] || 0).slice(-7);

                            return (
                                <div key={key} 
                                    onClick={() => setChartMetrics(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; })} 
                                    className={`p-5 rounded-3xl transition-all cursor-pointer border-2 relative group/kpi h-44 flex flex-col justify-between ${isSelected ? 'bg-slate-50 ring-4 ring-slate-100 shadow-xl' : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm'}`} 
                                    style={{ borderColor: isSelected ? color : 'transparent' }}>
                                    
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {isSelected ? <CheckSquare size={14} style={{ color }} /> : <Square size={14} className="text-slate-300" />}
                                            <span className={`text-[9px] font-black uppercase truncate ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
                                        </div>
                                        <p className="text-xl font-black text-slate-900 tabular-nums tracking-tighter mt-1">{formatMetricValue(main, key).replace('¥', '')}</p>
                                    </div>

                                    <div className="my-2">
                                        <MiniSparkline data={sparkData} color={color} />
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className={`${txtC} text-[10px] font-black flex items-center gap-0.5`}>
                                            {isG ? <ArrowUp size={8} strokeWidth={4} /> : <ArrowDown size={8} strokeWidth={4} />}
                                            {Math.abs(chg).toFixed(0)}%
                                        </span>
                                        <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Trend</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {visualisationData && (
                        <div className="bg-slate-50 rounded-[40px] p-10 border border-slate-100 relative group/chart animate-fadeIn">
                             <div className="absolute top-6 left-10 flex items-center gap-3"><Sparkles size={16} className="text-brand animate-pulse" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Neural Trend Engine Processing</span></div>
                             <TrendChart dailyData={visualisationData.dailyData} chartMetrics={chartMetrics} metricsMap={allMetricsMap} />
                        </div>
                    )}
                </div>

                {/* 明细表区域 */}
                <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-brand shadow-sm"><Database size={24} /></div><div><h3 className="text-xl font-black text-slate-800 tracking-tight">物理透视穿透明细</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Aggregated Physical Penetration Set</p></div></div>
                        <button className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-slate-800 text-white font-black text-xs hover:bg-slate-700 shadow-xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-widest"><Download size={16} /> 导出维度明细</button>
                    </div>
                    <div className="flex-1 p-8 flex flex-col">
                        <div className="overflow-x-auto rounded-[32px] border border-slate-100 no-scrollbar shadow-inner bg-white flex-1 min-h-[400px]">
                            <table className="w-full text-sm table-fixed min-w-[1000px]">
                                <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                                    <tr className="text-slate-400 font-black text-[10px] uppercase tracking-widest text-center">
                                        {resultHeaders.map(k => <th key={k} className={`py-6 px-4 border-b border-slate-100 ${['date','sku_shop'].includes(k) ? 'w-[150px]' : 'w-[100px]'}`}>{allMetricsMap.get(k)?.label || k}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (<tr><td colSpan={resultHeaders.length} className="py-40 text-center"><div className="flex flex-col items-center gap-4 text-slate-300 animate-pulse"><Activity size={48} /><p className="font-black uppercase tracking-[0.4em] text-xs">Penetrating Records...</p></div></td></tr>) : queryResult.length === 0 ? (<tr><td colSpan={resultHeaders.length} className="py-48 text-center text-slate-300 font-black text-sm uppercase tracking-widest opacity-20">Awaiting Search Execution</td></tr>) : (
                                        paginatedResult.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                                {resultHeaders.map(key => (
                                                    <td key={key} className={`py-4 px-4 text-[11px] text-slate-600 truncate font-mono text-center border-b border-slate-50`}>
                                                        {key === 'sku_shop' ? (<div className="truncate text-left pl-2"><div className="font-black text-slate-800 truncate" title={row.sku_shop.code}>{row.sku_shop.code}</div><div className="text-[9px] text-slate-400 font-bold mt-0.5 truncate uppercase tracking-tighter opacity-70">{row.sku_shop.shopName}</div></div>) : key === 'date' ? (<span className="font-black text-slate-500 whitespace-nowrap bg-slate-100/50 px-2 py-1 rounded-md">{row.date}</span>) : (row[key] == null) ? (<span className="opacity-20">-</span>) : typeof row[key] === 'number' ? (<span className={`font-black ${['paid_amount','cost','roi'].includes(key) ? 'text-slate-900' : 'text-slate-600'}`}>{formatMetricValue(row[key], key)}</span>) : row[key]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 分页组件 */}
                        {queryResult.length > 0 && (
                            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6 px-4">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    展示 {(currentPage - 1) * ROWS_PER_PAGE + 1} - {Math.min(currentPage * ROWS_PER_PAGE, queryResult.length)} / 共 {queryResult.length} 行记录
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="text-xs font-black text-slate-600 px-4 min-w-[100px] text-center">
                                        第 {currentPage} / {totalPages} 页
                                    </div>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronRight size={16} />
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