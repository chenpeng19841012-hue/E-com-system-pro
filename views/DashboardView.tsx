import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    TrendingUp, ShoppingBag, Activity, CreditCard, Target, 
    ArrowUp, ArrowDown, Sparkles, Bot as BotIcon, ChevronRight, 
    ShieldAlert, PackageSearch, Flame, DatabaseZap, 
    Star, CalendarX, X, MousePointer2, SearchCode, ChevronLeft,
    AlertTriangle, TrendingDown, Layers, Ban, Zap
} from 'lucide-react';
import { DB } from '../lib/db';
import { ProductSKU, Shop } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

type RangeType = '7d' | '30d' | 'custom';
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

// 诊断卡片组件 - 适配垂直轮播与弹窗列表
const DiagnosisCard: React.FC<{ d: Diagnosis, mode?: 'carousel' | 'list' }> = ({ d, mode = 'carousel' }) => (
    <div className={`transition-all duration-700 w-full h-full flex flex-col ${mode === 'carousel' ? 'justify-center' : 'p-8 rounded-[32px] border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl'}`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`p-2.5 rounded-2xl ${d.severity === 'critical' ? 'bg-rose-100 text-rose-600' : d.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-brand/10 text-brand'}`}>
                {d.type === 'new_sku' ? <PackageSearch size={24}/> :
                 d.type === 'stock_severe' ? <AlertTriangle size={24}/> :
                 d.type === 'low_roi' ? <TrendingDown size={24}/> :
                 d.type === 'high_potential' ? <Zap size={24}/> :
                 d.type === 'stale_inventory' ? <Layers size={24}/> :
                 d.severity === 'critical' ? <ShieldAlert size={24}/> : 
                 <Flame size={24}/>}
            </div>
            <h4 className={`text-lg font-black uppercase tracking-tight ${d.severity === 'critical' ? 'text-rose-600' : d.severity === 'warning' ? 'text-amber-600' : 'text-slate-800'}`}>{d.title}</h4>
        </div>
        <p className="text-xs font-bold text-slate-500 leading-relaxed mb-6">{d.desc}</p>
        <div className="bg-white/70 rounded-2xl p-5 border border-white/40 space-y-3 shadow-inner max-h-[180px] overflow-y-auto no-scrollbar">
            {Object.entries(d.details).map(([k,v]) => (
                <div key={k} className="flex flex-col gap-1 text-[10px] font-black uppercase">
                    <span className="text-slate-400 tracking-widest border-b border-slate-100 pb-1">{k}</span>
                    <span className="text-slate-900 leading-relaxed break-all font-mono whitespace-pre-wrap">{v}</span>
                </div>
            ))}
        </div>
    </div>
);

const SubValueTrend = ({ current, previous, isHigherBetter = true }: { current: number, previous: number, isHigherBetter?: boolean }) => {
    if (previous === 0) return null;
    const chg = ((current - previous) / previous) * 100;
    const isGood = (chg >= 0 && isHigherBetter) || (chg < 0 && !isHigherBetter);
    // 底部微趋势保持 10px
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
        <button onClick={onClick} className={`bg-white rounded-[40px] border-2 text-left transition-all duration-500 flex flex-col overflow-hidden relative active:scale-95 ${isActive ? 'border-brand shadow-2xl scale-[1.03] ring-8 ring-brand/5' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200'}`}>
            <div className="p-8 flex-1 space-y-8">
                <div className="flex justify-between items-start">
                    <div className={`w-16 h-16 ${bg} rounded-[24px] flex items-center justify-center ${color} shadow-inner`}>{icon}</div>
                    <div className="text-right">
                        {/* 1. 指标标签提升至 16px (text-base) */}
                        <h3 className="text-base font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</h3>
                        {/* 2. 涨跌幅气泡提升至 14px (text-sm) */}
                        <div className={`px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 ${isGood ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                            {chg >= 0 ? <ArrowUp size={12} strokeWidth={4}/> : <ArrowDown size={12} strokeWidth={4}/>}
                            <span className="text-sm font-black tabular-nums">{Math.abs(chg).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <p className="text-6xl font-black text-slate-900 tabular-nums tracking-tighter">{prefix}{formatVal(value.total.current, isFloat)}</p>
            </div>
            {/* 底部明细栏：字号整体升级 */}
            <div className={`px-8 py-8 border-t grid grid-cols-2 gap-4 ${isActive ? 'bg-brand/5 border-brand/10' : 'bg-slate-50 border-slate-50'}`}>
                <div>
                    {/* 3. 分类标签保持 11px */}
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">自营</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        {/* 4. 数值提升至 16px (text-base) */}
                        <span className="text-base font-black text-slate-700">{prefix}{formatVal(value.self.current, isFloat)}</span>
                        <SubValueTrend current={value.self.current} previous={value.self.previous} isHigherBetter={isHigherBetter} />
                    </div>
                </div>
                <div className="border-l border-slate-200 pl-4">
                    {/* 3. 分类标签保持 11px */}
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">POP</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        {/* 4. 数值提升至 16px (text-base) */}
                        <span className="text-base font-black text-slate-700">{prefix}{formatVal(value.pop.current, isFloat)}</span>
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
    const width = 1000; const height = 320; const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const maxVal = Math.max(...data.map(d => Math.max(d.self, d.pop)), 0.1) * 1.2;
    
    const getX = (i: number) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const getY = (v: number) => height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * width;
        const index = Math.round(((mouseX - padding.left) / (width - padding.left - padding.right)) * (data.length - 1));
        if (index >= 0 && index < data.length) setHoverIndex(index);
    };

    const selfPoints = data.map((d, i) => `${getX(i)},${getY(d.self)}`).join(' L ');
    const popPoints = data.map((d, i) => `${getX(i)},${getY(d.pop)}`).join(' L ');

    return (
        <div className="w-full h-full relative group/canvas">
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible cursor-crosshair" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
                <defs>
                    <linearGradient id="gSelf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70AD47" stopOpacity="0.2"/><stop offset="100%" stopColor="#70AD47" stopOpacity="0"/></linearGradient>
                    <linearGradient id="gPop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/></linearGradient>
                </defs>
                
                {[0, 0.25, 0.5, 0.75, 1].map(p => (
                    <line key={p} x1={padding.left} y1={getY(maxVal * p / 1.2)} x2={width-padding.right} y2={getY(maxVal * p / 1.2)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5 5" />
                ))}

                {data.map((d, i) => (
                    <text key={i} x={getX(i)} y={height - 20} textAnchor="middle" fontSize="9" fill={hoverIndex === i ? "#020617" : "#94a3b8"} fontWeight="900" className="transition-colors uppercase font-black">
                        {d.date.split('-').slice(1).join('/')}
                    </text>
                ))}

                <path d={`M ${getX(0)},${height-padding.bottom} L ${selfPoints} L ${getX(data.length-1)},${height-padding.bottom} Z`} fill="url(#gSelf)" className="transition-all duration-500" />
                <path d={`M ${getX(0)},${height-padding.bottom} L ${popPoints} L ${getX(data.length-1)},${height-padding.bottom} Z`} fill="url(#gPop)" className="transition-all duration-500" />
                <path d={`M ${selfPoints}`} fill="none" stroke="#70AD47" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`M ${popPoints}`} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {hoverIndex !== null && (
                    <g className="animate-fadeIn">
                        <line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={height-padding.bottom} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="6 4" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].self)} r="6" fill="#70AD47" stroke="white" strokeWidth="2.5" className="shadow-lg" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].pop)} r="6" fill="#3B82F6" stroke="white" strokeWidth="2.5" className="shadow-lg" />
                    </g>
                )}
            </svg>

            {hoverIndex !== null && (
                <div className="absolute bg-slate-900/95 backdrop-blur text-white p-5 rounded-2xl shadow-2xl z-[100] pointer-events-none transition-all duration-200 border border-white/10" style={{ left: `${(getX(hoverIndex)/width)*100}%`, top: '30%', transform: `translate(${hoverIndex > data.length/2 ? '-110%' : '10%'}, -50%)` }}>
                    <p className="text-[10px] font-black text-slate-400 mb-3 border-b border-white/10 pb-2 uppercase tracking-widest">{data[hoverIndex].date}</p>
                    <div className="space-y-2.5">
                        <div className="flex justify-between gap-12 items-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand"></div>自营资产</span>
                            <span className="text-xs font-black tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[hoverIndex].self, metricKey==='roi')}</span>
                        </div>
                        <div className="flex justify-between gap-12 items-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>POP资产</span>
                            <span className="text-xs font-black tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[hoverIndex].pop, metricKey==='roi')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const DashboardView = ({ skus, shops, addToast }: { skus: ProductSKU[], shops: Shop[], addToast: any }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState<MetricKey>('gmv');
    const [rangeType, setRangeType] = useState<RangeType>('7d');
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
    
    // 轮播状态
    const [activeDiagIndex, setActiveDiagIndex] = useState(0);

    const enabledSkusMap = useMemo(() => {
        const map = new Map<string, ProductSKU>();
        skus.forEach(s => { if (s.isStatisticsEnabled) map.set(s.code, s); });
        return map;
    }, [skus]);

    const shopIdToMode = useMemo(() => new Map(shops.map(s => [s.id, s.mode])), [shops]);

    // 垂直轮播定时器：保持 2 秒
    useEffect(() => {
        if (diagnoses.length <= 1) return;
        const timer = setInterval(() => {
            setActiveDiagIndex(prev => (prev + 1) % diagnoses.length);
        }, 2000);
        return () => clearInterval(timer);
    }, [diagnoses.length]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            let start = rangeType === 'custom' ? customRange.start : new Date(Date.now() - (rangeType === '7d' ? 6 : 29) * 86400000).toISOString().split('T')[0];
            let end = rangeType === 'custom' ? customRange.end : new Date().toISOString().split('T')[0];

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

                const diag: Diagnosis[] = [];
                const currSkusSet = new Set(currSz.map(getSkuIdentifier));
                const prevSkusSet = new Set(prevSz.map(getSkuIdentifier));

                // 1. 新资产激活
                const newlyActive = Array.from(currSkusSet).filter(c => c && !prevSkusSet.has(c) && enabledSkusMap.has(c));
                if (newlyActive.length > 0) {
                    diag.push({
                        id: 'new_active', severity: 'success', type: 'new_sku', title: '新资产动销激活',
                        desc: `探测到 ${newlyActive.length} 个 SKU 在本周期内首次产生物理交易流水。`,
                        details: { '激活清单': newlyActive.map(c => `• ${enabledSkusMap.get(c!)?.name || c}`).join('\n') }
                    });
                }
                // 2. 增长失速
                if (curr.gmv.total < prev.gmv.total * 0.8 && prev.gmv.total > 0) {
                    diag.push({ id: 'drop', severity: 'critical', type: 'data_gap', title: '全链路增长失速', desc: 'GMV 环比大幅度下滑超过 20%，需立即介入审计转化链路。', details: { '环比降幅': `${(((curr.gmv.total-prev.gmv.total)/prev.gmv.total)*100).toFixed(1)}%` } });
                }
                // 3. 库存枯竭
                const stockRisks = skus.filter(s => s.isStatisticsEnabled && ((s.warehouseStock || 0) + (s.factoryStock || 0)) < (currSz.find(r => getSkuIdentifier(r) === s.code)?.paid_items || 0));
                if (stockRisks.length > 0) {
                    diag.push({ id: 'stock_out', severity: 'critical', type: 'stock_severe', title: '物理库存枯竭预警', desc: `${stockRisks.length} 个核心资产库存已无法覆盖单周销量。`, details: { '风险列表': stockRisks.slice(0,3).map(s => `• ${s.name} (余:${(s.warehouseStock||0)+(s.factoryStock||0)})`).join('\n') } });
                }
                // 4. 投放赤字
                const lowRoiSkus = Array.from(currSkusSet).filter(code => {
                    const spend = currJzt.filter(j => getSkuIdentifier(j) === code).reduce((s, j) => s + (Number(j.cost) || 0), 0);
                    const gmv = currSz.filter(z => getSkuIdentifier(z) === code).reduce((s, z) => s + (Number(z.paid_amount) || 0), 0);
                    return spend > 500 && (gmv / spend) < 1.2;
                });
                if (lowRoiSkus.length > 0) {
                    diag.push({ id: 'low_roi', severity: 'warning', type: 'low_roi', title: '投放能效赤字', desc: `检测到 ${lowRoiSkus.length} 个 SKU 广告投入产出比极低。`, details: { '重点负向SKU': lowRoiSkus.slice(0,3).map(c => `• ${enabledSkusMap.get(c!)?.name || c}`).join('\n') } });
                }
                
                setDiagnoses(diag);
                setActiveDiagIndex(0);
            } finally { setIsLoading(false); }
        };
        fetchData();
    }, [rangeType, customRange, activeMetric, enabledSkusMap, shopIdToMode]);

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 min-h-screen bg-[#F8FAFC]">
            {/* Command Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-[0.3em] leading-none">物理层指挥链路已建立</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">战略指挥控制台</h1>
                    <p className="text-slate-400 font-bold text-sm tracking-wide">Strategic Performance Intelligence & AI Dashboard</p>
                </div>
                
                <div className="flex bg-slate-200/50 p-1.5 rounded-[22px] shadow-inner border border-slate-200">
                    {[{id:'7d',l:'近7天'},{id:'30d',l:'近30天'},{id:'custom',l:'自定义'}].map(i => (
                        <button key={i.id} onClick={() => setRangeType(i.id as RangeType)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${rangeType === i.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}>{i.l}</button>
                    ))}
                </div>
            </div>

            {/* KPI Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                <KPICard isActive={activeMetric === 'gmv'} onClick={() => setActiveMetric('gmv')} title="GMV" value={data.gmv} prefix="¥" icon={<ShoppingBag size={22}/>} color="text-brand" bg="bg-brand/5" />
                <KPICard isActive={activeMetric === 'ca'} onClick={() => setActiveMetric('ca')} title="CA" value={data.ca} icon={<Activity size={22}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard isActive={activeMetric === 'spend'} onClick={() => setActiveMetric('spend')} title="广告消耗" value={data.spend} prefix="¥" icon={<CreditCard size={22}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" />
                <KPICard isActive={activeMetric === 'roi'} onClick={() => setActiveMetric('roi')} title="ROI" value={data.roi} isFloat icon={<Target size={22}/>} color="text-purple-600" bg="bg-purple-50" />
            </div>

            {/* Main Section */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 bg-white rounded-[56px] p-12 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group/chart min-h-[500px]">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-brand border border-slate-100 shadow-inner group-hover/chart:rotate-6 transition-transform">
                                <TrendingUp size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{activeMetric} 增长拓扑流</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Physical Performance Temporal Stream</p>
                            </div>
                        </div>
                        <div className="flex gap-8">
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-brand shadow-lg shadow-brand/20"></div><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">自营店铺</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20"></div><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">POP 店铺</span></div>
                        </div>
                    </div>
                    <div className="flex-1">
                         <MainTrendVisual data={trends} metricKey={activeMetric} />
                    </div>
                </div>

                <div className="xl:col-span-4 bg-white rounded-[48px] p-12 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden group/diag">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3"></div>
                    <div className="flex items-center gap-5 mb-10 relative z-10">
                        <div className="w-16 h-16 rounded-[24px] bg-brand flex items-center justify-center shadow-2xl shadow-brand/30 border border-white/20 group-hover/diag:scale-110 transition-transform duration-500"><BotIcon size={32} className="text-white" /></div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">AI 战略诊断室 <Sparkles size={20} className="text-brand animate-pulse" /></h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest leading-none">Neural Decision Intelligence</p>
                        </div>
                    </div>
                    
                    {/* 优化的上下垂直轮播容器：单条显示，2秒切换 */}
                    <div className="h-[360px] relative mb-10 overflow-hidden">
                        {diagnoses.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200 p-10 text-center opacity-40">
                                <DatabaseZap size={48} className="text-slate-300 mb-6" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">物理链路平稳，系统暂无风险</p>
                            </div>
                        ) : (
                            <>
                                <div className="h-full relative overflow-hidden">
                                    {diagnoses.map((d, idx) => {
                                        const isActive = idx === activeDiagIndex;
                                        // 计算是否是上一条，用于执行滑出动画
                                        const isPrev = idx === (activeDiagIndex - 1 + diagnoses.length) % diagnoses.length;
                                        
                                        return (
                                            <div 
                                                key={d.id} 
                                                className={`absolute inset-0 transition-all duration-700 ease-in-out transform flex items-center justify-center
                                                    ${isActive ? 'translate-y-0 opacity-100 scale-100 z-10' : 
                                                      isPrev ? '-translate-y-full opacity-0 scale-95 z-0' : 
                                                      'translate-y-full opacity-0 scale-95 z-0'}
                                                `}
                                            >
                                                <DiagnosisCard d={d} mode="carousel" />
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* 轮播指示器点 */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                                    {diagnoses.map((_, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => setActiveDiagIndex(idx)}
                                            className={`w-1.5 rounded-full transition-all duration-500 ${idx === activeDiagIndex ? 'h-8 bg-brand' : 'h-1.5 bg-slate-200 hover:bg-slate-300'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    
                    <button onClick={() => setIsAllDiagnosesModalOpen(true)} className="w-full relative z-10 py-6 bg-slate-900 text-white rounded-[28px] font-black text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 uppercase tracking-[0.2em] mt-auto">查看全量审计矩阵 <ChevronRight size={18} /></button>
                </div>
            </div>

            {/* Modal for all diagnoses - 弹窗显示全量 6 条预警 */}
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
