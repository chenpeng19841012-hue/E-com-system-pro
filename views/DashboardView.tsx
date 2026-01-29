
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    TrendingUp, ShoppingBag, Activity, CreditCard, Target, 
    ArrowUp, ArrowDown, Sparkles, Bot as BotIcon, ChevronRight, 
    ShieldAlert, PackageSearch, Flame, DatabaseZap, 
    Star, CalendarX, X, MousePointer2, SearchCode, ChevronLeft,
    AlertTriangle, TrendingDown, Layers, Ban, Zap, UploadCloud,
    History, Store, Truck, Wifi, Clock
} from 'lucide-react';
import { DB } from '../lib/db';
import { ProductSKU, Shop } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

type RangeType = 'realtime' | 'yesterday' | '7d' | '30d' | 'custom';
type MetricKey = 'gmv' | 'ca' | 'spend' | 'roi';

interface MetricPoint { current: number; previous: number; }
interface MetricGroup { total: MetricPoint; self: MetricPoint; pop: MetricPoint; }
interface DailyRecord { date: string; self: number; pop: number; total: number; }

interface Diagnosis {
    id: string;
    type: 'asset' | 'stock_severe' | 'explosive' | 'data_gap' | 'high_potential' | 'low_roi' | 'new_sku' | 'data_integrity' | 'stale_inventory';
    title: string;
    desc: string;
    details: Record<string, string | number>;
    severity: 'critical' | 'warning' | 'info' | 'success';
}

const formatVal = (v: number, isFloat = false) => isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();

// 诊断卡片组件 - 紧凑版适配
const DiagnosisCard: React.FC<{ d: Diagnosis, mode?: 'carousel' | 'list', onClickMore?: () => void }> = ({ d, mode = 'carousel', onClickMore }) => {
    const detailEntries = Object.entries(d.details);
    const limit = mode === 'carousel' ? 2 : 100; // Carousel 模式下只显示前2条，更紧凑
    const visibleDetails = detailEntries.slice(0, limit);
    const hiddenCount = detailEntries.length - limit;

    return (
        <div className={`transition-all duration-700 w-full flex flex-col ${mode === 'carousel' ? 'h-[160px] p-4 rounded-[20px] border border-slate-100 bg-white shadow-sm mb-3' : 'p-6 rounded-[24px] border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl'}`}>
            <div className="flex items-center gap-3 mb-1.5 shrink-0">
                <div className={`p-1.5 rounded-lg ${d.severity === 'critical' ? 'bg-rose-100 text-rose-600' : d.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-brand/10 text-brand'}`}>
                    {d.type === 'new_sku' ? <PackageSearch size={14}/> :
                     d.type === 'stock_severe' ? <AlertTriangle size={14}/> :
                     d.type === 'low_roi' ? <TrendingDown size={14}/> :
                     d.type === 'high_potential' ? <Zap size={14}/> :
                     d.type === 'stale_inventory' ? <Layers size={14}/> :
                     d.severity === 'critical' ? <ShieldAlert size={14}/> : 
                     <Flame size={14}/>}
                </div>
                <h4 className={`text-xs font-black uppercase tracking-tight truncate ${d.severity === 'critical' ? 'text-rose-600' : d.severity === 'warning' ? 'text-amber-600' : 'text-slate-800'}`}>{d.title}</h4>
            </div>
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed mb-2 line-clamp-1 shrink-0">{d.desc}</p>
            
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 overflow-hidden flex-1 relative">
                {visibleDetails.map(([k,v]) => (
                    <div key={k} className="flex flex-col gap-0.5 text-[8px] font-bold border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                        <span className="text-slate-700 leading-relaxed break-all font-mono whitespace-pre-wrap">{v}</span>
                    </div>
                ))}
                {mode === 'carousel' && hiddenCount > 0 && (
                    <div onClick={onClickMore} className="absolute bottom-0 left-0 w-full bg-slate-50/95 py-0.5 text-center cursor-pointer hover:bg-slate-100 transition-colors border-t border-slate-200">
                        <p className="text-[8px] font-black text-brand">... 以及其他 {hiddenCount} 个 (点击查看)</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SubValueTrend = ({ current, previous, isHigherBetter = true }: { current: number, previous: number, isHigherBetter?: boolean }) => {
    if (previous === 0) return null;
    const chg = ((current - previous) / previous) * 100;
    const isGood = (chg >= 0 && isHigherBetter) || (chg < 0 && !isHigherBetter);
    return (
        <div className={`flex items-center gap-0.5 font-black text-[10px] mt-0.5 ${isGood ? 'text-green-500' : 'text-rose-500'}`}>
            {chg >= 0 ? <ArrowUp size={8} strokeWidth={4}/> : <ArrowDown size={8} strokeWidth={4}/>}
            <span className="tabular-nums">{Math.abs(chg).toFixed(1)}%</span>
        </div>
    );
};

const KPICard = ({ title, value, prefix = "", isFloat = false, icon, isHigherBetter = true, color, bg, isActive, onClick }: any) => {
    const chg = value.total.previous === 0 ? 0 : ((value.total.current - value.total.previous) / value.total.previous) * 100;
    const isGood = (chg >= 0 && isHigherBetter) || (chg < 0 && !isHigherBetter);

    return (
        <button onClick={onClick} className={`bg-white rounded-[28px] border-2 text-left transition-all duration-500 flex flex-col overflow-hidden relative active:scale-95 ${isActive ? 'border-brand shadow-xl scale-[1.02] ring-4 ring-brand/5' : 'border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200'}`}>
            <div className="p-5 flex-1 space-y-3">
                <div className="flex justify-between items-start">
                    <div className={`w-10 h-10 ${bg} rounded-[14px] flex items-center justify-center ${color} shadow-inner`}>{icon}</div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{title}</h3>
                        <div className={`px-2 py-0.5 rounded-lg inline-flex items-center gap-1 ${isGood ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                            {chg >= 0 ? <ArrowUp size={8} strokeWidth={4}/> : <ArrowDown size={8} strokeWidth={4}/>}
                            <span className="text-[9px] font-black tabular-nums">{Math.abs(chg).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{prefix}{formatVal(value.total.current, isFloat)}</p>
            </div>
            <div className={`px-5 py-4 border-t grid grid-cols-2 gap-4 ${isActive ? 'bg-brand/5 border-brand/10' : 'bg-slate-50 border-slate-50'}`}>
                <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">自营</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-slate-700">{prefix}{formatVal(value.self.current, isFloat)}</span>
                        <SubValueTrend current={value.self.current} previous={value.self.previous} isHigherBetter={isHigherBetter} />
                    </div>
                </div>
                <div className="border-l border-slate-200 pl-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">POP</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-slate-700">{prefix}{formatVal(value.pop.current, isFloat)}</span>
                        <SubValueTrend current={value.pop.current} previous={value.pop.previous} isHigherBetter={isHigherBetter} />
                    </div>
                </div>
            </div>
        </button>
    );
};

const MainTrendVisual = ({ data, metricKey }: { data: DailyRecord[], metricKey: MetricKey }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    // Adjusted height for compressed container (420px total height -> approx 240px chart area)
    const width = 1000; const height = 240; const padding = { top: 20, right: 30, bottom: 30, left: 50 };
    const maxVal = Math.max(...data.map(d => Math.max(d.self, d.pop)), 0.1) * 1.2;
    
    // Fix: Handle single data point case to prevent division by zero
    const getX = (i: number) => {
        if (data.length <= 1) return width / 2;
        return padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    };
    
    const getY = (v: number) => height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current || data.length === 0) return;
        if (data.length === 1) { setHoverIndex(0); return; }
        
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * width;
        const index = Math.round(((mouseX - padding.left) / (width - padding.left - padding.right)) * (data.length - 1));
        if (index >= 0 && index < data.length) setHoverIndex(index);
    };

    if (data.length === 0) return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
            <Activity size={48} className="mb-4" strokeWidth={1}/>
            <p className="text-xs font-black uppercase tracking-widest">No Data Signal</p>
        </div>
    );

    // Render single point if only 1 day selected
    if (data.length === 1) {
        return (
            <div className="w-full h-full relative group/canvas flex items-center justify-center">
                <div className="bg-slate-50 px-8 py-6 rounded-3xl border border-slate-100 flex gap-8 items-center">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-1">自营</p>
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[0].self, metricKey==='roi')}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">POP</p>
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[0].pop, metricKey==='roi')}</p>
                    </div>
                </div>
                <p className="absolute bottom-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Single Day Snapshot: {data[0].date}</p>
            </div>
        );
    }

    const selfPoints = data.map((d, i) => `${getX(i)},${getY(d.self)}`).join(' L ');
    const popPoints = data.map((d, i) => `${getX(i)},${getY(d.pop)}`).join(' L ');

    return (
        <div className="w-full h-full relative group/canvas flex items-center justify-center">
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible cursor-crosshair" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
                <defs>
                    <linearGradient id="gSelf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70AD47" stopOpacity="0.2"/><stop offset="100%" stopColor="#70AD47" stopOpacity="0"/></linearGradient>
                    <linearGradient id="gPop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/></linearGradient>
                </defs>
                
                {[0, 0.25, 0.5, 0.75, 1].map(p => (
                    <line key={p} x1={padding.left} y1={getY(maxVal * p / 1.2)} x2={width-padding.right} y2={getY(maxVal * p / 1.2)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5 5" />
                ))}

                {data.map((d, i) => (
                    <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" fontSize="9" fill={hoverIndex === i ? "#020617" : "#94a3b8"} fontWeight="900" className="transition-colors uppercase font-black" style={{ opacity: data.length > 20 && i % 3 !== 0 && i !== data.length-1 ? 0 : 1 }}>
                        {d.date.split('-').slice(1).join('/')}
                    </text>
                ))}

                <path d={`M ${getX(0)},${height-padding.bottom} L ${selfPoints} L ${getX(data.length-1)},${height-padding.bottom} Z`} fill="url(#gSelf)" className="transition-all duration-500" />
                <path d={`M ${getX(0)},${height-padding.bottom} L ${popPoints} L ${getX(data.length-1)},${height-padding.bottom} Z`} fill="url(#gPop)" className="transition-all duration-500" />
                <path d={`M ${selfPoints}`} fill="none" stroke="#70AD47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`M ${popPoints}`} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {hoverIndex !== null && (
                    <g className="animate-fadeIn">
                        <line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={height-padding.bottom} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="6 4" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].self)} r="5" fill="#70AD47" stroke="white" strokeWidth="2" className="shadow-lg" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].pop)} r="5" fill="#3B82F6" stroke="white" strokeWidth="2" className="shadow-lg" />
                    </g>
                )}
            </svg>

            {hoverIndex !== null && (
                <div className="absolute bg-slate-900/95 backdrop-blur text-white p-4 rounded-2xl shadow-2xl z-[100] pointer-events-none transition-all duration-200 border border-white/10" style={{ left: `${(getX(hoverIndex)/width)*100}%`, top: '30%', transform: `translate(${hoverIndex > data.length/2 ? '-110%' : '10%'}, -50%)` }}>
                    <p className="text-[9px] font-black text-slate-400 mb-2 border-b border-white/10 pb-1.5 uppercase tracking-widest">{data[hoverIndex].date}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between gap-10 items-center">
                            <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand"></div>自营</span>
                            <span className="text-[10px] font-black tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[hoverIndex].self, metricKey==='roi')}</span>
                        </div>
                        <div className="flex justify-between gap-10 items-center">
                            <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>POP</span>
                            <span className="text-[10px] font-black tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[hoverIndex].pop, metricKey==='roi')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const DashboardView = ({ skus, shops, factStats, addToast }: { skus: ProductSKU[], shops: Shop[], factStats?: any, addToast: any }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState<MetricKey>('gmv');
    // Default to '7d'
    const [rangeType, setRangeType] = useState<RangeType>('7d');
    
    // Data Anchors & Status
    const [dataAnchorDate, setDataAnchorDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isDataStale, setIsDataStale] = useState(false);

    const [customRange, setCustomRange] = useState({
        start: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    
    const [data, setData] = useState<Record<MetricKey, MetricGroup>>({
        gmv: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} },
        ca: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} },
        spend: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} },
        roi: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} }
    });

    const [trends, setTrends] = useState<DailyRecord[]>([]);
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [isAllDiagnosesModalOpen, setIsAllDiagnosesModalOpen] = useState(false);
    const [diagOffset, setDiagOffset] = useState(0);

    // Dynamic Version Calculation
    const totalRows = (factStats?.shangzhi?.count || 0) + (factStats?.jingzhuntong?.count || 0) + (factStats?.customer_service?.count || 0);
    const systemVersion = `v6.0.${totalRows.toLocaleString().replace(/,/g, '')}`;

    useEffect(() => {
        if (factStats?.shangzhi?.latestDate && factStats.shangzhi.latestDate !== 'N/A') {
            const latest = factStats.shangzhi.latestDate;
            const today = new Date().toISOString().split('T')[0];
            // If latest data is older than today, anchor to it for 7d/30d views
            if (latest < today) {
                setDataAnchorDate(latest);
            } else {
                setDataAnchorDate(today);
            }
        }
    }, [factStats]);

    const enabledSkusMap = useMemo(() => {
        const map = new Map<string, ProductSKU>();
        skus.forEach(s => { if (s.isStatisticsEnabled) map.set(s.code, s); });
        return map;
    }, [skus]);

    const shopIdToMode = useMemo(() => new Map(shops.map(s => [s.id, s.mode])), [shops]);
    const shopMap = useMemo(() => new Map(shops.map(s => [s.id, s])), [shops]);

    useEffect(() => {
        if (diagnoses.length <= 2) { setDiagOffset(0); return; }
        const timer = setInterval(() => { setDiagOffset(prev => (prev + 1) % diagnoses.length); }, 5000);
        return () => clearInterval(timer);
    }, [diagnoses.length]);

    const fetchData = async () => {
        setIsLoading(true);
        setIsDataStale(false);

        const todayObj = new Date();
        const todayStr = todayObj.toISOString().split('T')[0];
        const yesterdayObj = new Date(todayObj);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

        let start = "";
        let end = "";

        if (rangeType === 'realtime') {
            start = end = todayStr;
            if (dataAnchorDate < todayStr) setIsDataStale(true);
        } else if (rangeType === 'yesterday') {
            start = end = yesterdayStr;
            if (dataAnchorDate < yesterdayStr) setIsDataStale(true);
        } else if (rangeType === 'custom') {
            start = customRange.start;
            end = customRange.end;
        } else {
            // 7d, 30d: Use Smart Backtracking (Anchor to latest data)
            const daysMap: Record<string, number> = { '7d': 6, '30d': 29 };
            const days = daysMap[rangeType] || 6;
            const refTime = new Date(dataAnchorDate).getTime();
            end = dataAnchorDate;
            start = new Date(refTime - days * 86400000).toISOString().split('T')[0];
        }

        const diff = Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
        const prevEnd = new Date(new Date(start).getTime() - 86400000).toISOString().split('T')[0];
        const prevStart = new Date(new Date(prevEnd).getTime() - (diff - 1) * 86400000).toISOString().split('T')[0];

        try {
            const [currSz, currJzt, prevSz, prevJzt] = await Promise.all([
                DB.getRange('fact_shangzhi', start, end),
                DB.getRange('fact_jingzhuntong', start, end),
                DB.getRange('fact_shangzhi', prevStart, prevEnd),
                DB.getRange('fact_jingzhuntong', prevStart, prevEnd)
            ]);

            const processStats = (sz: any[], jzt: any[]) => {
                const stats = { gmv: { total: 0, self: 0, pop: 0 }, ca: { total: 0, self: 0, pop: 0 }, spend: { total: 0, self: 0, pop: 0 } };
                sz.forEach(r => {
                    const code = getSkuIdentifier(r);
                    if (code && enabledSkusMap.has(code)) {
                        const val = Number(r.paid_amount) || 0;
                        const items = Number(r.paid_items) || 0;
                        const mode = shopIdToMode.get(enabledSkusMap.get(code)?.shopId || '') || '自营';
                        stats.gmv.total += val; stats.ca.total += items;
                        if (['自营', '入仓'].includes(mode)) { stats.gmv.self += val; stats.ca.self += items; }
                        else { stats.gmv.pop += val; stats.ca.pop += items; }
                    }
                });
                jzt.forEach(r => {
                    const code = getSkuIdentifier(r);
                    if (code && enabledSkusMap.has(code)) {
                        const cost = Number(r.cost) || 0;
                        const mode = shopIdToMode.get(enabledSkusMap.get(code)?.shopId || '') || '自营';
                        stats.spend.total += cost;
                        if (['自营', '入仓'].includes(mode)) stats.spend.self += cost; else stats.spend.pop += cost;
                    }
                });
                return stats;
            };

            const curr = processStats(currSz, currJzt);
            const prev = processStats(prevSz, prevJzt);
            
            const dailyAgg: Record<string, DailyRecord> = {};
            for(let i=0; i<diff; i++) {
                const ds = new Date(new Date(start).getTime() + i * 86400000).toISOString().split('T')[0];
                dailyAgg[ds] = { date: ds, self: 0, pop: 0, total: 0 };
            }
            
            const factorTable = activeMetric === 'gmv' ? currSz : (activeMetric === 'spend' ? currJzt : currSz);
            factorTable.forEach(r => {
                const code = getSkuIdentifier(r);
                if (code && enabledSkusMap.has(code) && dailyAgg[r.date]) {
                    const mode = shopIdToMode.get(enabledSkusMap.get(code)?.shopId || '') || '自营';
                    let val = 0;
                    if (activeMetric === 'gmv') val = Number(r.paid_amount);
                    else if (activeMetric === 'ca') val = Number(r.paid_items);
                    else if (activeMetric === 'spend') val = Number(r.cost);
                    else if (activeMetric === 'roi') {
                        const items = Number(r.paid_amount) || 0;
                        const cost = Number(currJzt.find(j => j.date === r.date && getSkuIdentifier(j) === code)?.cost) || 0;
                        val = cost > 0 ? items / cost : 0;
                    }
                    if (['自营', '入仓'].includes(mode)) dailyAgg[r.date].self += val; else dailyAgg[r.date].pop += val;
                    dailyAgg[r.date].total += val;
                }
            });

            setData({
                gmv: { total: { current: curr.gmv.total, previous: prev.gmv.total }, self: { current: curr.gmv.self, previous: prev.gmv.self }, pop: { current: curr.gmv.pop, previous: prev.gmv.pop } },
                ca: { total: { current: curr.ca.total, previous: prev.ca.total }, self: { current: curr.ca.self, previous: prev.ca.self }, pop: { current: curr.ca.pop, previous: prev.ca.pop } },
                spend: { total: { current: curr.spend.total, previous: prev.spend.total }, self: { current: curr.spend.self, previous: prev.spend.self }, pop: { current: curr.spend.pop, previous: prev.spend.pop } },
                roi: { 
                    total: { current: curr.spend.total > 0 ? curr.gmv.total / curr.spend.total : 0, previous: prev.spend.total > 0 ? prev.gmv.total / prev.spend.total : 0 },
                    self: { current: curr.spend.self > 0 ? curr.gmv.self / curr.spend.self : 0, previous: prev.spend.self > 0 ? prev.gmv.self / prev.spend.self : 0 },
                    pop: { current: curr.spend.pop > 0 ? curr.gmv.pop / curr.spend.pop : 0, previous: prev.spend.pop > 0 ? prev.gmv.pop / prev.spend.pop : 0 }
                }
            });
            setTrends(Object.values(dailyAgg));

            // Diagnostics Logic (Only run if we have data)
            const diag: Diagnosis[] = [];
            const currSkusSet = new Set(currSz.map(getSkuIdentifier));
            
            // Helper to get enriched SKU info string
            const getSkuInfoStr = (code: string) => {
                const s = enabledSkusMap.get(code);
                if (!s) return code;
                const shopName = shopMap.get(s.shopId)?.name || '未知';
                return `• ${s.name}\n  [${shopName}] | ${s.model || '-'} | ${s.mode}`;
            };

            if (curr.gmv.total < prev.gmv.total * 0.8 && prev.gmv.total > 0) {
                diag.push({ id: 'drop', severity: 'critical', type: 'data_gap', title: '全链路增长失速', desc: 'GMV 环比大幅度下滑超过 20%，需立即介入审计转化链路。', details: { '环比降幅': `${(((curr.gmv.total-prev.gmv.total)/prev.gmv.total)*100).toFixed(1)}%` } });
            }
            
            const stockRisks = skus.filter(s => s.isStatisticsEnabled && ((s.warehouseStock || 0) + (s.factoryStock || 0)) < (currSz.find(r => getSkuIdentifier(r) === s.code)?.paid_items || 0));
            if (stockRisks.length > 0) {
                diag.push({ 
                    id: 'stock_out', severity: 'critical', type: 'stock_severe', title: '物理库存枯竭预警', 
                    desc: `${stockRisks.length} 个核心资产库存已无法覆盖单周销量。`, 
                    details: { '风险列表': stockRisks.map(s => getSkuInfoStr(s.code)).join('\n') } 
                });
            }
            
            // Disabled Low ROI Diagnostic as requested by user
            /*
            const lowRoiSkus = Array.from(currSkusSet).filter(code => {
                const spend = currJzt.filter(j => getSkuIdentifier(j) === code).reduce((s, j) => s + (Number(j.cost) || 0), 0);
                const gmv = currSz.filter(z => getSkuIdentifier(z) === code).reduce((s, z) => s + (Number(z.paid_amount) || 0), 0);
                return spend > 500 && (gmv / spend) < 1.2;
            });
            if (lowRoiSkus.length > 0) {
                diag.push({ 
                    id: 'low_roi', severity: 'warning', type: 'low_roi', title: '投放能效赤字', 
                    desc: `检测到 ${lowRoiSkus.length} 个 SKU 广告投入产出比极低。`, 
                    details: { '重点负向SKU': lowRoiSkus.map(c => getSkuInfoStr(c!)).join('\n') } 
                });
            }
            */
            
            setDiagnoses(diag);
            setDiagOffset(0);
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [rangeType, customRange, activeMetric, enabledSkusMap, shopIdToMode, dataAnchorDate]);

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-8 min-h-screen bg-[#F8FAFC]">
            {/* Command Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                            <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none">系统版本：{systemVersion}</span>
                        </div>
                        {isDataStale && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-lg border border-amber-200 animate-fadeIn">
                                <Clock size={10} className="text-amber-600" />
                                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-none">
                                    数据尚未更新 (Latest: {dataAnchorDate})
                                </span>
                            </div>
                        )}
                        {!isDataStale && dataAnchorDate < new Date().toISOString().split('T')[0] && rangeType !== 'yesterday' && rangeType !== 'realtime' && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                <History size={10} className="text-slate-500" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                    智能回溯: {dataAnchorDate}
                                </span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">战略指挥控制台</h1>
                    <p className="text-slate-400 font-bold text-sm tracking-wide">Strategic Performance Intelligence & AI Dashboard</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-200/50 p-1.5 rounded-[22px] shadow-inner border border-slate-200">
                        {[
                            {id:'realtime', l:'实时', icon: Wifi}, 
                            {id:'yesterday', l:'昨日', icon: History},
                            {id:'7d', l:'近7天'},
                            {id:'30d', l:'近30天'},
                            {id:'custom', l:'自定义'}
                        ].map(i => (
                            <button key={i.id} onClick={() => setRangeType(i.id as RangeType)} className={`px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${rangeType === i.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
                                {i.icon && <i.icon size={12} className={rangeType === i.id ? 'text-brand' : 'opacity-50'} />}
                                {i.l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Matrix - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-2">
                <KPICard isActive={activeMetric === 'gmv'} onClick={() => setActiveMetric('gmv')} title="GMV" value={data.gmv} prefix="¥" icon={<ShoppingBag size={18}/>} color="text-brand" bg="bg-brand/5" />
                <KPICard isActive={activeMetric === 'ca'} onClick={() => setActiveMetric('ca')} title="CA" value={data.ca} icon={<Activity size={18}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard isActive={activeMetric === 'spend'} onClick={() => setActiveMetric('spend')} title="广告消耗" value={data.spend} prefix="¥" icon={<CreditCard size={18}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" />
                <KPICard isActive={activeMetric === 'roi'} onClick={() => setActiveMetric('roi')} title="ROI" value={data.roi} isFloat icon={<Target size={18}/>} color="text-purple-600" bg="bg-purple-50" />
            </div>

            {/* Main Section - Compact Fixed Height */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* 增长拓扑流 - 固定高度 420px */}
                <div className="xl:col-span-8 bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group/chart h-[420px]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[14px] bg-slate-50 flex items-center justify-center text-brand border border-slate-100 shadow-inner group-hover/chart:rotate-6 transition-transform">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">{activeMetric} 增长拓扑流</h3>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Physical Performance Stream</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand shadow-lg shadow-brand/20"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">自营资产</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">POP 店铺</span></div>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                         <MainTrendVisual data={trends} metricKey={activeMetric} />
                    </div>
                </div>

                {/* AI 诊断室 - 固定高度 420px */}
                <div className="xl:col-span-4 bg-white rounded-[40px] p-6 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden group/diag h-[420px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/3"></div>
                    <div className="flex items-center gap-4 mb-4 relative z-10 shrink-0">
                        <div className="w-10 h-10 rounded-[14px] bg-brand flex items-center justify-center shadow-2xl shadow-brand/30 border border-white/20 group-hover/diag:scale-110 transition-transform duration-500"><BotIcon size={20} className="text-white" /></div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">AI 战略诊断室 <Sparkles size={14} className="text-brand animate-pulse" /></h3>
                            <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5 tracking-widest leading-none">Neural Decision Intelligence</p>
                        </div>
                    </div>
                    
                    {/* 垂直轮播容器 - 适配剩余空间 */}
                    <div className="flex-1 relative mb-4 overflow-hidden mask-linear-fade">
                        {diagnoses.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 p-8 text-center opacity-40">
                                <DatabaseZap size={32} className="text-slate-300 mb-3" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">物理链路平稳，系统暂无风险</p>
                            </div>
                        ) : (
                            <div 
                                className="transition-transform duration-700 ease-in-out h-full" 
                                style={{ transform: `translateY(-${(diagOffset * 172)}px)` }} // 160px height + 12px margin
                            >
                                <div className="flex flex-col">
                                    {diagnoses.map((d, i) => (
                                        <div key={d.id} className="h-[160px] mb-3 shrink-0">
                                            <DiagnosisCard d={d} mode="carousel" onClickMore={() => setIsAllDiagnosesModalOpen(true)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button onClick={() => setIsAllDiagnosesModalOpen(true)} className="w-full relative z-10 py-3.5 bg-slate-900 text-white rounded-[18px] font-black text-[10px] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 uppercase tracking-[0.2em] mt-auto shrink-0">查看全量审计矩阵 <ChevronRight size={12} /></button>
                </div>
            </div>

            {/* Modal for all diagnoses */}
            {isAllDiagnosesModalOpen && (
                <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
                    <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl p-10 m-4 max-h-[85vh] flex flex-col border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6 shrink-0 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3"><BotIcon className="text-brand" size={24} /> 全量战略预警矩阵</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Full Neural Strategic Audit Matrix</p>
                            </div>
                            <button onClick={() => setIsAllDiagnosesModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 relative z-10 pb-6 pr-2">
                            {diagnoses.length === 0 ? (
                                <div className="py-20 text-center text-slate-300 italic font-black uppercase tracking-widest opacity-20">No data anomalies found.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {diagnoses.map(d => <DiagnosisCard key={d.id} d={d} mode="list" />)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
