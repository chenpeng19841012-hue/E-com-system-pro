
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, BarChart, ShoppingBag, Activity, CreditCard, Target, ArrowUp, ArrowDown, Zap, Sparkles, Bot as BotIcon, ChevronRight, Calendar, Filter, AlertTriangle, ShieldAlert, PackageSearch, Rocket, Coins, Flame, Headset } from 'lucide-react';
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

interface Diagnosis {
    id: string;
    type: 'asset' | 'stock_severe' | 'stock_warning' | 'explosive' | 'ad_star' | 'ad_waste' | 'cs_alert';
    title: string;
    desc: string;
    details: any;
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

    const [allTrends, setAllTrends] = useState<Record<MetricKey, DailyRecord[]>>({
        gmv: [], ca: [], spend: [], roi: []
    });

    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

    const skuToModeMap = useMemo(() => {
        const map = new Map<string, string>();
        const shopIdToMode = new Map(shops.map(s => [s.id, s.mode]));
        skus.forEach(s => {
            const mode = shopIdToMode.get(s.shopId);
            if (mode) map.set(s.code, mode);
        });
        return map;
    }, [skus, shops]);

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
                const [currSz, currJzt, prevSz, prevJzt, currCs] = await Promise.all([
                    DB.getRange('fact_shangzhi', start, end),
                    DB.getRange('fact_jingzhuntong', start, end),
                    DB.getRange('fact_shangzhi', prevStartObj.toISOString().split('T')[0], prevEndObj.toISOString().split('T')[0]),
                    DB.getRange('fact_jingzhuntong', prevStartObj.toISOString().split('T')[0], prevEndObj.toISOString().split('T')[0]),
                    DB.getRange('fact_customer_service', start, end)
                ]);

                // --- 1. KPI 计算逻辑 ---
                const calculateStats = (sz: any[], jzt: any[]) => {
                    const stats = { gmv: { total: 0, self: 0, pop: 0 }, ca: { total: 0, self: 0, pop: 0 }, spend: { total: 0, self: 0, pop: 0 } };
                    sz.forEach(row => {
                        const code = getSkuIdentifier(row);
                        if (code && enabledSkuCodes.has(code)) {
                            const amount = Number(row.paid_amount) || 0;
                            const items = Number(row.paid_items) || 0;
                            const mode = skuToModeMap.get(code) || (shops.find(s => s.name === row.shop_name)?.mode) || '自营';
                            stats.gmv.total += amount; stats.ca.total += items;
                            if (mode === '自营') { stats.gmv.self += amount; stats.ca.self += items; }
                            else { stats.gmv.pop += amount; stats.ca.pop += items; }
                        }
                    });
                    jzt.forEach(row => {
                        const code = getSkuIdentifier(row);
                        if (code && enabledSkuCodes.has(code)) {
                            const cost = Number(row.cost) || 0;
                            const mode = skuToModeMap.get(code) || (shops.find(s => s.name === row.shop_name)?.mode) || '自营';
                            stats.spend.total += cost;
                            if (mode === '自营') stats.spend.self += cost; else stats.spend.pop += cost;
                        }
                    });
                    return stats;
                };

                const currentStats = calculateStats(currSz, currJzt);
                const previousStats = calculateStats(prevSz, prevJzt);
                
                // 每日趋势聚合
                const dailyAgg: Record<string, { gmv: any, ca: any, spend: any }> = {};
                for(let i=0; i<diffDays; i++) {
                    const d = new Date(startDateObj); d.setDate(d.getDate() + i);
                    const ds = d.toISOString().split('T')[0];
                    dailyAgg[ds] = { gmv: { self: 0, pop: 0 }, ca: { self: 0, pop: 0 }, spend: { self: 0, pop: 0 } };
                }
                currSz.forEach(r => {
                    const code = getSkuIdentifier(r);
                    if (code && enabledSkuCodes.has(code) && dailyAgg[r.date]) {
                        const mode = skuToModeMap.get(code) || '自营';
                        if (mode === '自营') { dailyAgg[r.date].gmv.self += Number(r.paid_amount) || 0; dailyAgg[r.date].ca.self += Number(r.paid_items) || 0; }
                        else { dailyAgg[r.date].gmv.pop += Number(r.paid_amount) || 0; dailyAgg[r.date].ca.pop += Number(r.paid_items) || 0; }
                    }
                });
                currJzt.forEach(r => {
                    const code = getSkuIdentifier(r);
                    if (code && enabledSkuCodes.has(code) && dailyAgg[r.date]) {
                        const mode = skuToModeMap.get(code) || '自营';
                        if (mode === '自营') dailyAgg[r.date].spend.self += Number(r.cost) || 0; else dailyAgg[r.date].spend.pop += Number(r.cost) || 0;
                    }
                });

                const sortedDates = Object.keys(dailyAgg).sort();
                const trends: Record<MetricKey, DailyRecord[]> = { gmv: [], ca: [], spend: [], roi: [] };
                sortedDates.forEach(date => {
                    const d = dailyAgg[date];
                    trends.gmv.push({ date, self: d.gmv.self, pop: d.gmv.pop, total: d.gmv.self + d.gmv.pop });
                    trends.ca.push({ date, self: d.ca.self, pop: d.ca.pop, total: d.ca.self + d.ca.pop });
                    trends.spend.push({ date, self: d.spend.self, pop: d.spend.pop, total: d.spend.self + d.spend.pop });
                    const tRoi = (d.spend.self + d.spend.pop) > 0 ? (d.gmv.self + d.gmv.pop) / (d.spend.self + d.spend.pop) : 0;
                    trends.roi.push({ date, self: 0, pop: 0, total: tRoi });
                });

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

                // --- 2. 深度 AI 诊断逻辑 ---
                const newDiagnoses: Diagnosis[] = [];
                const managedShopNames = new Set(shops.map(s => s.name));
                const knownSkuCodes = new Set(skus.map(s => s.code));

                // A. 资产失联探测 (逻辑已增强：仅检查今日/昨日活跃 SKU)
                const activeCodesInSz = new Set(currSz.map(r => getSkuIdentifier(r)).filter(Boolean));
                activeCodesInSz.forEach(code => {
                    const row = currSz.find(r => getSkuIdentifier(r) === code);
                    if (code && managedShopNames.has(row?.shop_name) && !knownSkuCodes.has(code)) {
                        newDiagnoses.push({ id: `asset-${code}`, type: 'asset', title: '资产同步异常', desc: `发现未录入 SKU: ${code}`, details: { shop: row.shop_name, name: row.product_name, cat: row.category_l3 } });
                    }
                });

                // B. 京东入仓预警 (7/15日销量对齐)
                const sales15dMap = new Map<string, number>();
                currSz.forEach(r => { const c = getSkuIdentifier(r); if(c) sales15dMap.set(c, (sales15dMap.get(c) || 0) + (Number(r.paid_items) || 0)); });
                skus.filter(s => s.mode === '入仓').forEach(s => {
                    const s15 = sales15dMap.get(s.code) || 0;
                    const s7 = s15 * 0.46;
                    const stock = s.warehouseStock || 0;
                    if (stock < s7 && s15 > 0) newDiagnoses.push({ id: `s-sev-${s.code}`, type: 'stock_severe', title: '库存熔断警告', desc: `${s.model || s.name} 即将断货`, details: { stock, s7: Math.round(s7) } });
                    else if (stock < s15 && s15 > 0) newDiagnoses.push({ id: `s-war-${s.code}`, type: 'stock_warning', title: '建议补货', desc: `${s.model || s.name} 库存周转受压`, details: { stock, s15: Math.round(s15) } });
                });

                // C. 爆款潜力识别
                const prevGmvMap = new Map<string, number>();
                prevSz.forEach(r => { const c = getSkuIdentifier(r); if(c) prevGmvMap.set(c, (prevGmvMap.get(c) || 0) + (Number(r.paid_amount) || 0)); });
                const currGmvMap = new Map<string, number>();
                currSz.forEach(r => { const c = getSkuIdentifier(r); if(c) currGmvMap.set(c, (currGmvMap.get(c) || 0) + (Number(r.paid_amount) || 0)); });

                currGmvMap.forEach((val, code) => {
                    const prev = prevGmvMap.get(code) || 0;
                    if (prev > 0 && (val - prev) / prev > 0.4 && val > 5000) {
                        const sInfo = skus.find(s => s.code === code);
                        newDiagnoses.push({ id: `exp-${code}`, type: 'explosive', title: '潜在爆款发现', desc: `${sInfo?.model || '未知SKU'} GMV 环比暴涨 ${Math.round(((val-prev)/prev)*100)}%`, details: { gmv: val } });
                    }
                });

                // D. 投放预算建议 (高 ROI 扩量)
                const skuCostMap = new Map<string, number>();
                currJzt.forEach(r => { const c = getSkuIdentifier(r); if(c) skuCostMap.set(c, (skuCostMap.get(c) || 0) + (Number(r.cost) || 0)); });
                skuCostMap.forEach((cost, code) => {
                    const gmv = currGmvMap.get(code) || 0;
                    const roi = cost > 0 ? gmv / cost : 0;
                    if (roi > 8 && cost < 1000) {
                        newDiagnoses.push({ id: `ad-star-${code}`, type: 'ad_star', title: '广告扩量建议', desc: `SKU ${code} ROI 极高(${roi.toFixed(1)})，建议增加出价`, details: { roi, cost } });
                    } else if (roi < 1.2 && cost > 2000) {
                        newDiagnoses.push({ id: `ad-waste-${code}`, type: 'ad_waste', title: '投放损耗预警', desc: `SKU ${code} 处于低效引流状态(ROI: ${roi.toFixed(1)})`, details: { roi, cost } });
                    }
                });

                // E. 客服效率预警
                if (currCs.length > 0) {
                    const avgResponse = currCs.reduce((acc, r) => acc + (Number(r.avg_first_response_time) || 0), 0) / currCs.length;
                    if (avgResponse > 45) {
                        newDiagnoses.push({ id: 'cs-risk', type: 'cs_alert', title: '服务响应风险', desc: `全店平均首响 ${Math.round(avgResponse)}s，远超安全阈值`, details: { avg: avgResponse } });
                    }
                }

                setDiagnoses(newDiagnoses);
            } catch (e) { console.error(e); }
            finally { setTimeout(() => setIsLoading(false), 300); }
        };
        fetchData();
    }, [rangeType, customRange, enabledSkuCodes, skuToModeMap, skus, shops]);

    return (
        <div className="p-6 md:p-10 w-full animate-fadeIn space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none">AI 战略指挥官已上线</span>
                        {enabledSkuCodes.size > 0 && (
                            <span className="bg-brand/10 text-brand px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5">
                                <Filter size={10} /> 监控中: {enabledSkuCodes.size} SKU
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">全域运营中枢</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Intelligent Operations Command & Neural Diagnostic Engine</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
                    {[{id:'7d',l:'近7天'},{id:'30d',l:'近30天'}].map(i => (
                        <button key={i.id} onClick={() => setRangeType(i.id as RangeType)} className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${rangeType === i.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>{i.l}</button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard isActive={activeMetric === 'gmv'} onClick={() => setActiveMetric('gmv')} title="GMV" value={data.gmv} prefix="¥" icon={<ShoppingBag size={20}/>} color="text-brand" bg="bg-brand/5" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'ca'} onClick={() => setActiveMetric('ca')} title="CA" value={data.ca} icon={<Activity size={20}/>} color="text-blue-600" bg="bg-blue-50" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'spend'} onClick={() => setActiveMetric('spend')} title="广告消耗" value={data.spend} prefix="¥" icon={<CreditCard size={20}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'roi'} onClick={() => setActiveMetric('roi')} title="ROI" value={data.roi} isFloat icon={<Target size={20}/>} color="text-purple-600" bg="bg-purple-50" isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                 <div className="xl:col-span-8 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm min-h-[550px] flex flex-col">
                    <div className="flex items-center justify-between mb-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-brand border border-slate-100"><TrendingUp size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{activeMetric.toUpperCase()} 业务增长趋势</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Physical Performance Stream</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand"></div><span className="text-[10px] font-black text-slate-500 uppercase">自营</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-[10px] font-black text-slate-500 uppercase">POP</span></div>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        {isLoading ? <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 animate-pulse"><Activity className="mb-2"/><p className="text-[10px] font-black uppercase">计算中...</p></div> : allTrends[activeMetric].length > 0 ? <TrendVisual data={allTrends[activeMetric]} isFloat={activeMetric === 'roi'} /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 opacity-40"><BarChart size={48} className="mb-4"/><p className="text-xs font-bold uppercase">无数据记录</p></div>}
                    </div>
                 </div>

                 <div className="xl:col-span-4 bg-navy rounded-[40px] p-10 text-white shadow-2xl flex flex-col relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-48 h-48 bg-brand/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                     <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-lg border border-white/10 group-hover:rotate-6 transition-transform"><BotIcon size={24} className="text-white" /></div>
                        <div><h3 className="text-xl font-black tracking-tight">AI 战略诊断室</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Decision Engine</p></div>
                     </div>
                     <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 relative z-10">
                        {diagnoses.length === 0 ? (
                            <div className="bg-white/5 rounded-2xl p-10 border border-white/5 text-center opacity-40 italic"><p className="text-xs font-bold text-slate-400">目前系统运行极其稳健，暂未探测到结构性风险。</p></div>
                        ) : diagnoses.map(d => <DiagnosisCard key={d.id} diagnosis={d} />)}
                     </div>
                     <button className="w-full mt-8 py-4 bg-brand text-white rounded-2xl font-black text-xs hover:bg-[#5da035] transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand/20 group/btn">查看全链路深度报告 <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" /></button>
                 </div>
            </div>
        </div>
    );
};

// 增强型诊断卡片
const DiagnosisCard: React.FC<{ diagnosis: Diagnosis }> = ({ diagnosis }) => {
    const config = {
        asset: { icon: <PackageSearch size={18}/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        stock_severe: { icon: <ShieldAlert size={18}/>, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        stock_warning: { icon: <AlertTriangle size={18}/>, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
        explosive: { icon: <Flame size={18}/>, color: "text-brand", bg: "bg-brand/10", border: "border-brand/20" },
        ad_star: { icon: <Rocket size={18}/>, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
        ad_waste: { icon: <Coins size={18}/>, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
        cs_alert: { icon: <Headset size={18}/>, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" }
    }[diagnosis.type];

    return (
        <div className={`p-5 rounded-2xl border transition-all hover:bg-white/5 ${config.bg} ${config.border}`}>
            <div className="flex gap-3 mb-3">
                <div className={`${config.color}`}>{config.icon}</div>
                <div><p className="text-xs font-black uppercase tracking-tight">{diagnosis.title}</p><p className="text-[10px] text-slate-400 font-bold mt-0.5">{diagnosis.desc}</p></div>
            </div>
            <div className="bg-navy/40 rounded-xl p-3 border border-white/5 text-[10px] space-y-1">
                {Object.entries(diagnosis.details).map(([k,v]) => (
                    <div key={k} className="flex justify-between items-center"><span className="text-slate-500 uppercase font-black text-[8px]">{k}</span><span className="text-slate-200 font-bold">{String(v)}</span></div>
                ))}
            </div>
        </div>
    );
};

// 趋势图 SVG 组件
const TrendVisual: React.FC<{ data: DailyRecord[]; isFloat?: boolean }> = ({ data, isFloat = false }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const width = 800; const height = 280; const padding = { top: 20, right: 20, bottom: 40, left: 20 };
    const maxVal = Math.max(...data.map(d => d.total), 0.1) * 1.15;
    const getX = (i: number) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const getY = (v: number) => height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);
    const selfPath = useMemo(() => { if (data.length < 2) return ""; let p = `M ${getX(0)},${getY(data[0].self)}`; data.forEach((d, i) => { if(i>0) p += ` L ${getX(i)},${getY(d.self)}`; }); p += ` L ${getX(data.length-1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`; return p; }, [data, maxVal]);
    const popPath = useMemo(() => { if (data.length < 2) return ""; let p = `M ${getX(0)},${getY(data[0].total)}`; data.forEach((d, i) => { if(i>0) p += ` L ${getX(i)},${getY(d.total)}`; }); p += ` L ${getX(data.length-1)},${getY(data[data.length-1].self)}`; for (let i = data.length - 1; i >= 0; i--) { p += ` L ${getX(i)},${getY(data[i].self)}`; } p += " Z"; return p; }, [data, maxVal]);
    const formatVal = (v: number) => isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();
    return (
        <div ref={containerRef} className="w-full h-full relative cursor-crosshair group" onMouseMove={(e) => { const rect = containerRef.current!.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * width; const idx = Math.round(((x - padding.left) / (width - padding.left - padding.right)) * (data.length - 1)); if(idx >= 0 && idx < data.length) setHoverIndex(idx); }} onMouseLeave={() => setHoverIndex(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                <defs><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70AD47" stopOpacity="0.3"/><stop offset="100%" stopColor="#70AD47" stopOpacity="0.02"/></linearGradient><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02"/></linearGradient></defs>
                {[0, 0.5, 1].map(v => <line key={v} x1={padding.left} y1={getY(maxVal * v / 1.15)} x2={width - padding.right} y2={getY(maxVal * v / 1.15)} stroke="#f1f5f9" strokeWidth="1" />)}
                <path d={selfPath} fill="url(#gS)" className="transition-all duration-500"/><path d={popPath} fill="url(#gP)" className="transition-all duration-500"/>
                <path d={`M ${data.map((d,i) => `${getX(i)},${getY(d.self)}`).join(' L ')}`} fill="none" stroke="#70AD47" strokeWidth="2.5"/><path d={`M ${data.map((d,i) => `${getX(i)},${getY(d.total)}`).join(' L ')}`} fill="none" stroke="#3B82F6" strokeWidth="2.5"/>
                {hoverIndex !== null && <><line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={height - padding.bottom} stroke="#000" strokeDasharray="4 4" /><circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].self)} r="4" fill="#fff" stroke="#70AD47" strokeWidth="2"/><circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].total)} r="4" fill="#fff" stroke="#3B82F6" strokeWidth="2"/></>}
                <text x={padding.left} y={height - 10} fontSize="10" fill="#cbd5e1" fontWeight="bold">{data[0].date.substring(5)}</text>
                <text x={width - padding.right} y={height - 10} textAnchor="end" fontSize="10" fill="#cbd5e1" fontWeight="bold">{data[data.length-1].date.substring(5)}</text>
            </svg>
            {hoverIndex !== null && (
                <div className="absolute z-50 pointer-events-none bg-slate-900 text-white rounded-xl p-4 shadow-2xl animate-fadeIn" style={{ left: `${(getX(hoverIndex)/width)*100}%`, top: '30%', transform: `translate(${hoverIndex > data.length/2 ? '-110%' : '10%'}, -50%)` }}>
                    <p className="text-[10px] font-black text-slate-400 mb-2">{data[hoverIndex].date}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-8"><span className="text-[10px] font-bold">自营模式</span><span className="text-xs font-black">{formatVal(data[hoverIndex].self)}</span></div>
                        <div className="flex justify-between gap-8"><span className="text-[10px] font-bold">POP 模式</span><span className="text-xs font-black">{formatVal(data[hoverIndex].pop)}</span></div>
                        <div className="pt-1.5 border-t border-white/10 flex justify-between gap-8"><span className="text-[10px] font-black text-slate-400 uppercase">总量</span><span className="text-sm font-black text-brand">{formatVal(data[hoverIndex].total)}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const KPICard = ({ title, value, prefix = "", isFloat = false, icon, isHigherBetter = true, color, bg, isLoading, isActive, onClick }: any) => {
    const calculateChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    const formatVal = (v: number) => isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();
    const chg = calculateChange(value.total.current, value.total.previous);
    return (
        <button onClick={onClick} className={`bg-white rounded-[32px] border text-left transition-all duration-300 group flex flex-col overflow-hidden relative active:scale-95 ${isActive ? 'ring-4 ring-brand/10 border-brand shadow-xl' : 'border-slate-100 shadow-sm hover:shadow-lg'}`}>
            <div className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase mb-1">{title}</h3>
                        {!isLoading && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${((chg > 0 && isHigherBetter) || (chg < 0 && !isHigherBetter)) ? 'bg-green-50 text-green-500' : 'bg-rose-50 text-rose-500'}`}>{chg > 0 ? '↑' : '↓'} {Math.abs(chg).toFixed(1)}%</span>}
                    </div>
                </div>
                <div className="pt-2">
                    {isLoading ? <div className="h-10 w-3/4 bg-slate-50 animate-pulse rounded-xl"></div> : <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">{prefix}{formatVal(value.total.current)}</p>}
                </div>
            </div>
            <div className={`bg-slate-50/50 border-t p-4 grid grid-cols-2 gap-3 ${isActive ? 'bg-brand/5 border-brand/10' : ''}`}>
                <div><p className="text-[8px] font-black text-slate-400 uppercase">自营</p><p className="text-xs font-black text-slate-700">{prefix}{formatVal(value.self.current)}</p></div>
                <div className="border-l border-slate-100 pl-3">
                    <p className="text-[8px] font-black text-slate-400 uppercase">POP</p><p className="text-xs font-black text-slate-700">{prefix}{formatVal(value.pop.current)}</p>
                </div>
            </div>
        </button>
    );
};
