
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, BarChart, ShoppingBag, Activity, CreditCard, Target, ArrowUp, ArrowDown, Zap, Sparkles, Bot as BotIcon, ChevronRight, Calendar, Filter, Store } from 'lucide-react';
import { DB } from '../lib/db';
import { ProductSKU, Shop } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

type RangeType = '7d' | '30d' | 'custom';
type MetricKey = 'gmv' | 'ca' | 'spend' | 'roi';

interface MetricPoint {
    current: number;
    previous: number;
}

interface MetricGroup {
    total: MetricPoint;
    self: MetricPoint;
    pop: MetricPoint;
}

interface DailyRecord {
    date: string;
    self: number;
    pop: number;
    total: number;
}

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

    // 存储所有维度的每日趋势
    const [allTrends, setAllTrends] = useState<Record<MetricKey, DailyRecord[]>>({
        gmv: [], ca: [], spend: [], roi: []
    });

    const skuToModeMap = useMemo(() => {
        const map = new Map<string, string>();
        const shopIdToMode = new Map(shops.map(s => [s.id, s.mode]));
        skus.forEach(s => {
            const mode = shopIdToMode.get(s.shopId);
            if (mode) map.set(s.code, mode);
        });
        return map;
    }, [skus, shops]);

    const shopNameToModeMap = useMemo(() => {
        return new Map(shops.map(s => [s.name, s.mode]));
    }, [shops]);

    const enabledSkuCodes = useMemo(() => {
        return new Set(skus.filter(s => s.isStatisticsEnabled).map(s => s.code));
    }, [skus]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            let start: string;
            let end = new Date().toISOString().split('T')[0];

            if (rangeType === '7d') {
                start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
            } else if (rangeType === '30d') {
                start = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
            } else {
                start = customRange.start;
                end = customRange.end;
            }

            const startDateObj = new Date(start);
            const endDateObj = new Date(end);
            const diffDays = Math.ceil(Math.abs(endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            const prevEndObj = new Date(startDateObj);
            prevEndObj.setDate(prevEndObj.getDate() - 1);
            const prevStartObj = new Date(prevEndObj);
            prevStartObj.setDate(prevStartObj.getDate() - (diffDays - 1));

            try {
                const [currSz, currJzt, prevSz, prevJzt] = await Promise.all([
                    DB.getRange('fact_shangzhi', start, end),
                    DB.getRange('fact_jingzhuntong', start, end),
                    DB.getRange('fact_shangzhi', prevStartObj.toISOString().split('T')[0], prevEndObj.toISOString().split('T')[0]),
                    DB.getRange('fact_jingzhuntong', prevStartObj.toISOString().split('T')[0], prevEndObj.toISOString().split('T')[0])
                ]);

                const calculateStats = (sz: any[], jzt: any[]) => {
                    const stats = {
                        gmv: { total: 0, self: 0, pop: 0 },
                        ca: { total: 0, self: 0, pop: 0 },
                        spend: { total: 0, self: 0, pop: 0 }
                    };
                    sz.forEach(row => {
                        const code = getSkuIdentifier(row);
                        if (code && enabledSkuCodes.has(code)) {
                            const amount = Number(row.paid_amount) || 0;
                            const items = Number(row.paid_items) || 0;
                            const mode = skuToModeMap.get(code) || shopNameToModeMap.get(row.shop_name) || '自营';
                            stats.gmv.total += amount;
                            stats.ca.total += items;
                            if (mode === '自营') { stats.gmv.self += amount; stats.ca.self += items; }
                            else { stats.gmv.pop += amount; stats.ca.pop += items; }
                        }
                    });
                    jzt.forEach(row => {
                        const code = getSkuIdentifier(row);
                        if (code && enabledSkuCodes.has(code)) {
                            const cost = Number(row.cost) || 0;
                            const mode = skuToModeMap.get(code) || shopNameToModeMap.get(row.shop_name) || '自营';
                            stats.spend.total += cost;
                            if (mode === '自营') stats.spend.self += cost; else stats.spend.pop += cost;
                        }
                    });
                    return stats;
                };

                // 核心趋势聚合逻辑
                const dailyAgg: Record<string, { gmv: any, ca: any, spend: any }> = {};
                for(let i=0; i<diffDays; i++) {
                    const d = new Date(startDateObj); d.setDate(d.getDate() + i);
                    const ds = d.toISOString().split('T')[0];
                    dailyAgg[ds] = {
                        gmv: { self: 0, pop: 0 },
                        ca: { self: 0, pop: 0 },
                        spend: { self: 0, pop: 0 }
                    };
                }

                currSz.forEach(row => {
                    const code = getSkuIdentifier(row);
                    if (code && enabledSkuCodes.has(code) && dailyAgg[row.date]) {
                        const mode = skuToModeMap.get(code) || shopNameToModeMap.get(row.shop_name) || '自营';
                        if (mode === '自营') {
                            dailyAgg[row.date].gmv.self += Number(row.paid_amount) || 0;
                            dailyAgg[row.date].ca.self += Number(row.paid_items) || 0;
                        } else {
                            dailyAgg[row.date].gmv.pop += Number(row.paid_amount) || 0;
                            dailyAgg[row.date].ca.pop += Number(row.paid_items) || 0;
                        }
                    }
                });

                currJzt.forEach(row => {
                    const code = getSkuIdentifier(row);
                    if (code && enabledSkuCodes.has(code) && dailyAgg[row.date]) {
                        const mode = skuToModeMap.get(code) || shopNameToModeMap.get(row.shop_name) || '自营';
                        if (mode === '自营') dailyAgg[row.date].spend.self += Number(row.cost) || 0;
                        else dailyAgg[row.date].spend.pop += Number(row.cost) || 0;
                    }
                });

                const sortedDates = Object.keys(dailyAgg).sort();
                const trends: Record<MetricKey, DailyRecord[]> = { gmv: [], ca: [], spend: [], roi: [] };

                sortedDates.forEach(date => {
                    const d = dailyAgg[date];
                    trends.gmv.push({ date, self: d.gmv.self, pop: d.gmv.pop, total: d.gmv.self + d.gmv.pop });
                    trends.ca.push({ date, self: d.ca.self, pop: d.ca.pop, total: d.ca.self + d.ca.pop });
                    trends.spend.push({ date, self: d.spend.self, pop: d.spend.pop, total: d.spend.self + d.spend.pop });
                    
                    const selfRoi = d.spend.self > 0 ? d.gmv.self / d.spend.self : 0;
                    const popRoi = d.spend.pop > 0 ? d.gmv.pop / d.spend.pop : 0;
                    const totalRoi = (d.spend.self + d.spend.pop) > 0 ? (d.gmv.self + d.gmv.pop) / (d.spend.self + d.spend.pop) : 0;
                    trends.roi.push({ date, self: selfRoi, pop: popRoi, total: totalRoi });
                });

                const currentStats = calculateStats(currSz, currJzt);
                const previousStats = calculateStats(prevSz, prevJzt);

                setAllTrends(trends);
                setData({
                    gmv: { total: { current: currentStats.gmv.total, previous: previousStats.gmv.total }, self: { current: currentStats.gmv.self, previous: previousStats.gmv.self }, pop: { current: currentStats.gmv.pop, previous: previousStats.gmv.pop } },
                    ca: { total: { current: currentStats.ca.total, previous: previousStats.ca.total }, self: { current: currentStats.ca.self, previous: previousStats.ca.self }, pop: { current: currentStats.ca.pop, previous: previousStats.ca.pop } },
                    spend: { total: { current: currentStats.spend.total, previous: previousStats.spend.total }, self: { current: currentStats.spend.self, previous: previousStats.spend.self }, pop: { current: currentStats.spend.pop, previous: previousStats.spend.pop } },
                    roi: { 
                        total: { current: currentStats.spend.total > 0 ? currentStats.gmv.total / currentStats.spend.total : 0, previous: previousStats.spend.total > 0 ? previousStats.gmv.total / previousStats.spend.total : 0 },
                        self: { current: currentStats.spend.self > 0 ? currentStats.gmv.self / currentStats.spend.self : 0, previous: previousStats.spend.self > 0 ? previousStats.gmv.self / previousStats.spend.self : 0 },
                        pop: { current: currentStats.spend.pop > 0 ? currentStats.gmv.pop / currentStats.spend.pop : 0, previous: previousStats.spend.pop > 0 ? previousStats.gmv.pop / previousStats.spend.pop : 0 }
                    }
                });
            } catch (e) {
                console.error("Dashboard error:", e);
            } finally {
                setTimeout(() => setIsLoading(false), 300);
            }
        };
        fetchData();
    }, [rangeType, customRange, enabledSkuCodes, skuToModeMap, shopNameToModeMap]);

    return (
        <div className="p-6 md:p-10 w-full animate-fadeIn space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none">全向维度战略透视</span>
                        {enabledSkuCodes.size > 0 && (
                            <span className="flex items-center gap-1.5 bg-brand/10 text-brand px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight">
                                <Filter size={10} /> 已锁定 {enabledSkuCodes.size} 个 SKU
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">战略指挥中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Dimensional KPI Hub & Dynamic Growth Visualizer</p>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 shadow-inner">
                        {[{id:'7d',label:'近 7 天'},{id:'30d',label:'近 30 天'},{id:'custom',label:'自定义'}].map((item) => (
                            <button key={item.id} onClick={() => setRangeType(item.id as RangeType)} className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${rangeType === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{item.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards Grid - With Dynamic Interaction */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard isActive={activeMetric === 'gmv'} onClick={() => setActiveMetric('gmv')} title="GMV" value={data.gmv} prefix="¥" icon={<ShoppingBag size={20}/>} color="text-brand" bg="bg-brand/5" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'ca'} onClick={() => setActiveMetric('ca')} title="CA" value={data.ca} icon={<Activity size={20}/>} color="text-blue-600" bg="bg-blue-50" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'spend'} onClick={() => setActiveMetric('spend')} title="广告花费" value={data.spend} prefix="¥" icon={<CreditCard size={20}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'roi'} onClick={() => setActiveMetric('roi')} title="ROI" value={data.roi} isFloat icon={<Target size={20}/>} color="text-purple-600" bg="bg-purple-50" isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                 <div className="xl:col-span-8 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm min-h-[480px] flex flex-col">
                    <div className="flex items-center justify-between mb-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${activeMetric === 'gmv' ? 'bg-brand/10 border-brand/20 text-brand' : activeMetric === 'ca' ? 'bg-blue-50 border-blue-100 text-blue-500' : activeMetric === 'spend' ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-purple-50 border-purple-100 text-purple-500'}`}>
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">全域业务增长趋势 ({activeMetric.toUpperCase()})</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dynamic Performance Analytics Stream</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-brand"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">自营模式</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">POP 模式</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                <Activity className="animate-pulse mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">计算维度中...</p>
                            </div>
                        ) : allTrends[activeMetric].length > 0 ? (
                            <TrendVisual key={activeMetric} data={allTrends[activeMetric]} isFloat={activeMetric === 'roi'} />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 opacity-40">
                                <BarChart size={48} strokeWidth={1} className="mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest text-center max-w-xs">当前筛选范围内无有效物理数据，请检查资产勾选或数据中心导入状态。</p>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="xl:col-span-4 bg-navy rounded-[40px] p-10 text-white shadow-2xl flex flex-col relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-48 h-48 bg-brand/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-brand/20 transition-all duration-700"></div>
                     <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-[0_8px_20px_rgba(112,173,71,0.3)] border border-white/10">
                            <BotIcon size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">AI 战略诊断室</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cognitive Strategy Engine</p>
                        </div>
                     </div>

                     <div className="flex-1 space-y-5 relative z-10">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3 backdrop-blur-sm">
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                指挥中心已挂载 <span className="text-brand font-black">{shops.length} 个点位</span>。
                                {activeMetric === 'roi' && data.roi.total.current < 2 ? " 预警：当前全域 ROI 处于低位，受控 SKU 流量溢价显著，建议收缩非核心词消耗。" : " 系统正在根据物理层记录实时刷新各维度的边际贡献率。"}
                            </p>
                        </div>
                        <DiagnosisItem icon={<Zap size={16}/>} title="多维联动激活" desc="点击上方卡片可即时透视不同业务纬度" type="warning" />
                        <DiagnosisItem icon={<Sparkles size={16}/>} title="状态报告" desc={`当前聚焦维度: ${activeMetric.toUpperCase()} 事实分布`} type="success" />
                     </div>

                     <button className="w-full mt-10 py-4 bg-brand text-white rounded-2xl font-black text-xs hover:bg-[#5da035] transition-all flex items-center justify-center gap-2 relative z-10 shadow-xl shadow-brand/20 group/btn">
                        查看完整全链路报表 <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                     </button>
                 </div>
            </div>
        </div>
    );
};

// 核心组件：趋势可视化 SVG
// Fix: Added key to props type to resolve TypeScript assignment error on line 269
const TrendVisual = ({ data, isFloat = false }: { data: DailyRecord[], isFloat?: boolean, key?: string }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const width = 800;
    const height = 280;
    const padding = { top: 20, right: 20, bottom: 40, left: 20 };

    const maxVal = Math.max(...data.map(d => d.total), 0.1) * 1.15;
    const getX = (i: number) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const getY = (v: number) => height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);

    const selfPath = useMemo(() => {
        if (data.length < 2) return "";
        let path = `M ${getX(0)},${getY(data[0].self)}`;
        data.forEach((d, i) => { if(i>0) path += ` L ${getX(i)},${getY(d.self)}`; });
        path += ` L ${getX(data.length-1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`;
        return path;
    }, [data, maxVal]);

    const popPath = useMemo(() => {
        if (data.length < 2) return "";
        let path = `M ${getX(0)},${getY(data[0].total)}`;
        data.forEach((d, i) => { if(i>0) path += ` L ${getX(i)},${getY(d.total)}`; });
        path += ` L ${getX(data.length-1)},${getY(data[data.length-1].self)}`;
        for (let i = data.length - 1; i >= 0; i--) { path += ` L ${getX(i)},${getY(data[i].self)}`; }
        path += " Z";
        return path;
    }, [data, maxVal]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const index = Math.round(((mouseX - (padding.left * rect.width / width)) / ((width - padding.left - padding.right) * rect.width / width)) * (data.length - 1));
        if (index >= 0 && index < data.length) setHoverIndex(index);
    };

    const formatVal = (v: number) => isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();

    return (
        <div ref={containerRef} className="w-full h-full relative cursor-crosshair group" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                <defs>
                    <linearGradient id="gradSelf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#70AD47" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#70AD47" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="gradPop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map(v => (
                    <line key={v} x1={padding.left} y1={getY(maxVal * v / 1.15)} x2={width - padding.right} y2={getY(maxVal * v / 1.15)} stroke="#f1f5f9" strokeWidth="1" />
                ))}
                <path d={selfPath} fill="url(#gradSelf)" className="transition-all duration-500" />
                <path d={popPath} fill="url(#gradPop)" className="transition-all duration-500" />
                <path d={`M ${data.map((d, i) => `${getX(i)},${getY(d.self)}`).join(' L ')}`} fill="none" stroke="#70AD47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`M ${data.map((d, i) => `${getX(i)},${getY(d.total)}`).join(' L ')}`} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {data.map((d, i) => (
                    (i === 0 || i === data.length - 1 || (data.length > 10 && i % Math.floor(data.length/4) === 0)) && (
                        <text key={i} x={getX(i)} y={height - 15} textAnchor="middle" fontSize="10" fontWeight="black" fill="#94a3b8">{d.date.substring(5)}</text>
                    )
                ))}
                {hoverIndex !== null && (
                    <>
                        <line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={height - padding.bottom} stroke="#020617" strokeWidth="1" strokeDasharray="4 4" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].self)} r="4" fill="white" stroke="#70AD47" strokeWidth="2" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].total)} r="4" fill="white" stroke="#3B82F6" strokeWidth="2" />
                    </>
                )}
            </svg>

            {hoverIndex !== null && (
                <div className="absolute z-50 pointer-events-none bg-slate-900 text-white rounded-xl p-4 shadow-2xl animate-fadeIn" style={{ left: `${(getX(hoverIndex) / width) * 100}%`, top: '40%', transform: `translate(${hoverIndex > data.length / 2 ? '-110%' : '10%'}, -50%)` }}>
                    <p className="text-[10px] font-black text-slate-400 mb-2 border-b border-white/10 pb-1">{data[hoverIndex].date}</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-8">
                            <span className="flex items-center gap-2 text-[10px] font-bold"><div className="w-2 h-2 rounded-full bg-brand"></div>自营模式</span>
                            <span className="text-xs font-black tabular-nums">{formatVal(data[hoverIndex].self)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                            <span className="flex items-center gap-2 text-[10px] font-bold"><div className="w-2 h-2 rounded-full bg-blue-500"></div>POP 模式</span>
                            <span className="text-xs font-black tabular-nums">{formatVal(data[hoverIndex].pop)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-8 pt-1.5 border-t border-white/10">
                            <span className="text-[10px] font-black text-slate-400 uppercase">当前总量</span>
                            <span className="text-sm font-black text-brand tabular-nums">{formatVal(data[hoverIndex].total)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const KPICard = ({ title, value, prefix = "", isFloat = false, icon, isHigherBetter = true, color, bg, isLoading, isActive, onClick }: any) => {
    const calculateChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    const formatVal = (v: number) => isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();
    
    const totalChange = calculateChange(value.total.current, value.total.previous);
    const selfChange = calculateChange(value.self.current, value.self.previous);
    const popChange = calculateChange(value.pop.current, value.pop.previous);

    const GrowthTag = ({ change, small = false }: { change: number, small?: boolean }) => {
        if (change === 0) return <span className={`font-black text-slate-400 ${small ? 'text-[8px]' : 'text-[9px]'}`}>0.0%</span>;
        const isUp = change > 0;
        const isGood = isUp === isHigherBetter;
        return (
            <span className={`inline-flex items-center gap-0.5 font-black ${isGood ? 'text-green-500' : 'text-rose-500'} ${small ? 'text-[8px]' : 'text-[9px]'}`}>
                {isUp ? <ArrowUp size={small ? 6 : 8} strokeWidth={4} /> : <ArrowDown size={small ? 6 : 8} strokeWidth={4} />}
                {Math.abs(change).toFixed(1)}%
            </span>
        );
    };

    return (
        <button 
            onClick={onClick}
            className={`bg-white rounded-[32px] border text-left transition-all duration-300 group flex flex-col overflow-hidden relative active:scale-95 ${isActive ? 'ring-4 ring-brand/10 border-brand shadow-xl' : 'border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200'}`}
        >
            <div className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-500`}>
                        {icon}
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</h3>
                        {!isLoading && <div className="bg-slate-50 px-2 py-0.5 rounded-full inline-block border border-slate-100"><GrowthTag change={totalChange} /></div>}
                    </div>
                </div>
                <div className="pt-2">
                    {isLoading ? (
                        <div className="h-10 w-3/4 bg-slate-50 animate-pulse rounded-xl"></div>
                    ) : (
                        <div className="flex items-baseline gap-1.5">
                            <span className={`text-sm font-black ${color} opacity-40`}>{prefix}</span>
                            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">{formatVal(value.total.current)}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className={`bg-slate-50/50 border-t p-4 grid grid-cols-2 gap-3 transition-colors ${isActive ? 'bg-brand/5 border-brand/10' : 'border-slate-50'}`}>
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-slate-300"></div> 自营</p>
                        {!isLoading && <GrowthTag change={selfChange} small />}
                    </div>
                    <p className="text-xs font-black text-slate-700 tabular-nums">{prefix}{formatVal(value.self.current)}</p>
                </div>
                <div className="space-y-1 border-l border-slate-100 pl-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-blue-400"></div> POP</p>
                        {!isLoading && <GrowthTag change={popChange} small />}
                    </div>
                    <p className="text-xs font-black text-slate-700 tabular-nums">{prefix}{formatVal(value.pop.current)}</p>
                </div>
            </div>
        </button>
    );
};

const DiagnosisItem = ({ icon, title, desc, type }: any) => (
    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group/item">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover/item:rotate-6 ${type === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_4px_12px_rgba(245,158,11,0.1)]' : 'bg-brand/10 text-brand border-brand/20 shadow-[0_4px_12px_rgba(112,173,71,0.1)]'}`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-xs font-black text-slate-200">{title}</p>
            <p className="text-[10px] text-slate-500 truncate font-bold mt-0.5">{desc}</p>
        </div>
    </div>
);
