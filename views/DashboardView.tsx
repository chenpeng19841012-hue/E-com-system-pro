
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, BarChart, ShoppingBag, Activity, CreditCard, Target, ArrowUp, ArrowDown, Zap, Sparkles, Bot as BotIcon, ChevronRight, Calendar, Filter, AlertTriangle, ShieldAlert, PackageSearch, Rocket, Coins, Flame, Headset, CalendarX, DatabaseZap, Star, TrendingDown, MousePointerClick, Info, X } from 'lucide-react';
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
    type: 'asset' | 'stock_severe' | 'stock_warning' | 'explosive' | 'ad_star' | 'ad_waste' | 'cs_alert' | 'data_gap' | 'high_potential' | 'roi_drop' | 'cpc_spike' | 'low_efficiency';
    title: string;
    desc: string;
    details: Record<string, string | number>;
    severity: 'critical' | 'warning' | 'info' | 'success';
}

// 诊断全量报告弹窗
const FullReportModal = ({ isOpen, onClose, diagnoses }: { isOpen: boolean; onClose: () => void; diagnoses: Diagnosis[] }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <DatabaseZap className="text-brand" /> 全链路战略诊断报告
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Full System Audit & AI Decision Strategy</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                    {diagnoses.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <ShieldAlert size={64} className="text-slate-100 mb-4" />
                            <p className="text-slate-400 font-black">系统运行极其稳健，暂无风险项。</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {diagnoses.map(d => <DiagnosisCard key={d.id} diagnosis={d} isFullMode />)}
                        </div>
                    )}
                </div>
                <div className="p-8 border-t border-slate-100 text-center bg-slate-50/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">以上报告由 云舟 AI 神经元模型根据实时物理库数据分析生成</p>
                </div>
            </div>
        </div>
    );
};

export const DashboardView = ({ skus, shops, addToast }: { skus: ProductSKU[], shops: Shop[], addToast: any }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState<MetricKey>('gmv');
    const [rangeType, setRangeType] = useState<RangeType>('7d');
    const [isFullReportOpen, setIsFullReportOpen] = useState(false);
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
            const mode = s.mode || shopIdToMode.get(s.shopId);
            if (mode) map.set(s.code, mode);
        });
        return map;
    }, [skus, shops]);

    const enabledSkuCodes = useMemo(() => {
        return new Set(skus.filter(s => s.isStatisticsEnabled).map(s => s.code));
    }, [skus]);

    const isSelfOperated = (mode: string | undefined): boolean => {
        if (!mode) return true;
        return ['自营', '入仓', 'LBP', 'SOPL'].includes(mode);
    };

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

            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            try {
                const [currSz, currJzt, prevSz, prevJzt, currCs, monthSz, monthJzt] = await Promise.all([
                    DB.getRange('fact_shangzhi', start, end),
                    DB.getRange('fact_jingzhuntong', start, end),
                    DB.getRange('fact_shangzhi', prevStartObj.toISOString().split('T')[0], prevEndObj.toISOString().split('T')[0]),
                    DB.getRange('fact_jingzhuntong', prevStartObj.toISOString().split('T')[0], prevEndObj.toISOString().split('T')[0]),
                    DB.getRange('fact_customer_service', start, end),
                    DB.getRange('fact_shangzhi', firstDayOfMonth, yesterdayStr),
                    DB.getRange('fact_jingzhuntong', firstDayOfMonth, yesterdayStr)
                ]);

                const calculateStats = (sz: any[], jzt: any[]) => {
                    const stats = { gmv: { total: 0, self: 0, pop: 0 }, ca: { total: 0, self: 0, pop: 0 }, spend: { total: 0, self: 0, pop: 0 } };
                    sz.forEach(row => {
                        const code = getSkuIdentifier(row);
                        if (code && enabledSkuCodes.has(code)) {
                            const amount = Number(row.paid_amount) || 0;
                            const items = Number(row.paid_items) || 0;
                            const mode = skuToModeMap.get(code) || (shops.find(s => s.name === row.shop_name)?.mode) || '自营';
                            stats.gmv.total += amount; stats.ca.total += items;
                            if (isSelfOperated(mode)) { stats.gmv.self += amount; stats.ca.self += items; }
                            else { stats.gmv.pop += amount; stats.ca.pop += items; }
                        }
                    });
                    jzt.forEach(row => {
                        const code = getSkuIdentifier(row);
                        if (code && enabledSkuCodes.has(code)) {
                            const cost = Number(row.cost) || 0;
                            const mode = skuToModeMap.get(code) || (shops.find(s => s.name === row.shop_name)?.mode) || '自营';
                            stats.spend.total += cost;
                            if (isSelfOperated(mode)) stats.spend.self += cost; else stats.spend.pop += cost;
                        }
                    });
                    return stats;
                };

                const currentStats = calculateStats(currSz, currJzt);
                const previousStats = calculateStats(prevSz, prevJzt);
                
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
                        if (isSelfOperated(mode)) { dailyAgg[r.date].gmv.self += Number(r.paid_amount) || 0; dailyAgg[r.date].ca.self += Number(r.paid_items) || 0; }
                        else { dailyAgg[r.date].gmv.pop += Number(r.paid_amount) || 0; dailyAgg[r.date].ca.pop += Number(r.paid_items) || 0; }
                    }
                });
                currJzt.forEach(r => {
                    const code = getSkuIdentifier(r);
                    if (code && enabledSkuCodes.has(code) && dailyAgg[r.date]) {
                        const mode = skuToModeMap.get(code) || '自营';
                        if (isSelfOperated(mode)) dailyAgg[r.date].spend.self += Number(r.cost) || 0; else dailyAgg[r.date].spend.pop += Number(r.cost) || 0;
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
                        total: { current: currentStats.spend.total > 0 ? currentStats.gmv.total / currentStats.spend.total : 0, previous: previousStats.spend.total > 0 ? currentStats.gmv.total / previousStats.spend.total : 0 },
                        self: { current: currentStats.spend.self > 0 ? currentStats.gmv.self / currentStats.spend.self : 0, previous: previousStats.spend.self > 0 ? currentStats.gmv.self / previousStats.spend.self : 0 },
                        pop: { current: currentStats.spend.pop > 0 ? currentStats.gmv.pop / currentStats.spend.pop : 0, previous: previousStats.spend.pop > 0 ? currentStats.gmv.pop / previousStats.spend.pop : 0 }
                    }
                });

                // --- 2. 增强决策引擎 (Enhanced Neural Decision Engine) ---
                const newDiagnoses: Diagnosis[] = [];
                const skuGmvMap = new Map<string, number>();
                currSz.forEach(r => { const c = getSkuIdentifier(r); if(c) skuGmvMap.set(c, (skuGmvMap.get(c) || 0) + (Number(r.paid_amount) || 0)); });
                const skuPrevGmvMap = new Map<string, number>();
                prevSz.forEach(r => { const c = getSkuIdentifier(r); if(c) skuPrevGmvMap.set(c, (skuPrevGmvMap.get(c) || 0) + (Number(r.paid_amount) || 0)); });
                
                const skuCostMap = new Map<string, number>();
                currJzt.forEach(r => { const c = getSkuIdentifier(r); if(c) skuCostMap.set(c, (skuCostMap.get(c) || 0) + (Number(r.cost) || 0)); });
                const skuPrevCostMap = new Map<string, number>();
                prevJzt.forEach(r => { const c = getSkuIdentifier(r); if(c) skuPrevCostMap.set(c, (skuPrevCostMap.get(c) || 0) + (Number(r.cost) || 0)); });

                const skuClicksMap = new Map<string, number>();
                currJzt.forEach(r => { const c = getSkuIdentifier(r); if(c) skuClicksMap.set(c, (skuClicksMap.get(c) || 0) + (Number(r.clicks) || 0)); });

                // A. 物理数据与资产校验
                const knownSkuCodes = new Set(skus.map(s => s.code));
                const activeCodes = new Set(currSz.map(r => getSkuIdentifier(r)).filter(Boolean));
                activeCodes.forEach(code => {
                    if (code && !knownSkuCodes.has(code)) {
                        const row = currSz.find(r => getSkuIdentifier(r) === code);
                        newDiagnoses.push({ id: `asset-${code}`, type: 'asset', severity: 'critical', title: '资产映射缺失', desc: `物理层发现活跃 SKU [${code}]，但资产库未登记。`, details: { '店铺': row.shop_name, '名称': row.product_name, '建议': '前往资产名录录入' } });
                    }
                });

                const szDates = new Set(monthSz.map(r => r.date));
                const jztDates = new Set(monthJzt.map(r => r.date));
                const missingSz: string[] = [];
                const missingJzt: string[] = [];
                let checkDate = new Date(firstDayOfMonth);
                const limitDate = new Date(yesterdayStr);
                while(checkDate <= limitDate) {
                    const dStr = checkDate.toISOString().split('T')[0];
                    if (!szDates.has(dStr)) missingSz.push(dStr);
                    if (!jztDates.has(dStr)) missingJzt.push(dStr);
                    checkDate.setDate(checkDate.getDate() + 1);
                }
                if (missingSz.length > 0) newDiagnoses.push({ id: 'gap-sz', type: 'data_gap', severity: 'warning', title: '商智记录断层', desc: `本月探测到 ${missingSz.length} 个自然日数据缺失。`, details: { '缺失节点': missingSz.slice(-3).join(', ') + (missingSz.length > 3 ? '...' : '') } });
                if (missingJzt.length > 0) newDiagnoses.push({ id: 'gap-jzt', type: 'data_gap', severity: 'warning', title: '广告记录断层', desc: `本月缺失 ${missingJzt.length} 天消耗明细。`, details: { '缺失节点': missingJzt.slice(-3).join(', ') + (missingJzt.length > 3 ? '...' : '') } });

                // B. ROI 异常与消耗效率
                skuGmvMap.forEach((gmv, code) => {
                    const cost = skuCostMap.get(code) || 0;
                    const roi = cost > 0 ? gmv / cost : 0;
                    const prevGmv = skuPrevGmvMap.get(code) || 0;
                    const prevCost = skuPrevCostMap.get(code) || 0;
                    const prevRoi = prevCost > 0 ? prevGmv / prevCost : 0;

                    // ROI 跳水检测
                    if (prevRoi > 2 && roi < prevRoi * 0.7 && cost > 1000) {
                        newDiagnoses.push({ id: `roi-drop-${code}`, type: 'roi_drop', severity: 'critical', title: 'ROI 异常跳水', desc: `SKU [${code}] 投产比环比下降超过 30%。`, details: { '当前ROI': roi.toFixed(2), '上期ROI': prevRoi.toFixed(2), '消耗': `¥${cost}` } });
                    }

                    // CPC 激增检测
                    const clicks = skuClicksMap.get(code) || 0;
                    const cpc = clicks > 0 ? cost / clicks : 0;
                    const prevClicks = (prevJzt.filter(r => getSkuIdentifier(r) === code).reduce((s, r) => s + (Number(r.clicks) || 0), 0));
                    const prevCpc = prevClicks > 0 ? prevCost / prevClicks : 0;
                    if (prevCpc > 0 && cpc > prevCpc * 1.5 && clicks > 100) {
                        newDiagnoses.push({ id: `cpc-spike-${code}`, type: 'cpc_spike', severity: 'warning', title: 'CPC 异常激增', desc: `SKU [${code}] 点击成本飙升，出价竞争力异常。`, details: { '当前CPC': `¥${cpc.toFixed(2)}`, '上期CPC': `¥${prevCpc.toFixed(2)}`, '增长': `${((cpc-prevCpc)/prevCpc*100).toFixed(0)}%` } });
                    }

                    // 流量利用率检测 (高 UV 低 CVR)
                    const row = currSz.find(r => getSkuIdentifier(r) === code);
                    const uv = Number(row?.uv) || 0;
                    const cvr = Number(row?.paid_conversion_rate) || 0;
                    if (uv > 1000 && cvr < 0.015) {
                        newDiagnoses.push({ id: `low-eff-${code}`, type: 'low_efficiency', severity: 'warning', title: '流量利用率极低', desc: `SKU [${code}] 访客规模巨大但转化能力严重脱节。`, details: { '访客(UV)': uv, '转化率': `${(cvr*100).toFixed(2)}%`, '诊断': '排版/价格/评价问题' } });
                    }

                    // 爆款识别
                    if (roi > 8 && cost < 1000 && gmv > 5000) {
                         newDiagnoses.push({ id: `exp-${code}`, type: 'explosive', severity: 'success', title: '爆款爆发预警', desc: `SKU [${code}] 处于高 ROI 爆发点，建议立即提预算。`, details: { '当前ROI': roi.toFixed(1), 'GMV': `¥${gmv.toLocaleString()}` } });
                    }
                });

                // C. 库存熔断
                skus.filter(s => s.mode === '入仓').forEach(s => {
                    const sales15d = (currSz.filter(r => getSkuIdentifier(r) === s.code).reduce((sum, r) => sum + (Number(r.paid_items) || 0), 0));
                    const s7 = sales15d * 0.46;
                    const stock = s.warehouseStock || 0;
                    if (sales15d > 0 && stock < s7) {
                        newDiagnoses.push({ id: `stock-sev-${s.code}`, type: 'stock_severe', severity: 'critical', title: '库存熔断预警', desc: `入仓 SKU [${s.code}] 库存告急，预计 3 日内断货。`, details: { '库存': stock, '7日销量预估': Math.round(s7) } });
                    }
                });

                setDiagnoses(newDiagnoses.sort((a,b) => {
                    const order = { critical: 0, warning: 1, info: 2, success: 3 };
                    return order[a.severity] - order[b.severity];
                }));

            } catch (e) { console.error(e); }
            finally { setTimeout(() => setIsLoading(false), 300); }
        };
        fetchData();
    }, [rangeType, customRange, enabledSkuCodes, skuToModeMap, skus, shops]);

    return (
        <div className="p-6 md:p-10 w-full animate-fadeIn space-y-10">
            <FullReportModal isOpen={isFullReportOpen} onClose={() => setIsFullReportOpen(false)} diagnoses={diagnoses} />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none">全向维度穿透中</span>
                        {enabledSkuCodes.size > 0 && (
                            <span className="bg-brand/10 text-brand px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 shadow-sm">
                                <Filter size={10} /> 已锁定 {enabledSkuCodes.size} SKU
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">战略指挥控制台</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic opacity-60">Dimensional Performance Dashboard & AI Decision Engine</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                    {[{id:'7d',l:'近 7 天'},{id:'30d',l:'近 30 天'}].map(i => (
                        <button key={i.id} onClick={() => setRangeType(i.id as RangeType)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${rangeType === i.id ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{i.l}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard isActive={activeMetric === 'gmv'} onClick={() => setActiveMetric('gmv')} title="GMV" value={data.gmv} prefix="¥" icon={<ShoppingBag size={20}/>} color="text-brand" bg="bg-brand/5" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'ca'} onClick={() => setActiveMetric('ca')} title="CA" value={data.ca} icon={<Activity size={20}/>} color="text-blue-600" bg="bg-blue-50" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'spend'} onClick={() => setActiveMetric('spend')} title="广告消耗" value={data.spend} prefix="¥" icon={<CreditCard size={20}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" isLoading={isLoading} />
                <KPICard isActive={activeMetric === 'roi'} onClick={() => setActiveMetric('roi')} title="ROI" value={data.roi} isFloat icon={<Target size={20}/>} color="text-purple-600" bg="bg-purple-50" isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm min-h-[560px] flex flex-col group/chart">
                    <div className="flex items-center justify-between mb-12 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-3xl bg-slate-50 flex items-center justify-center text-brand border border-slate-100 group-hover/chart:rotate-3 transition-transform">
                                <TrendingUp size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{activeMetric.toUpperCase()} 业务增长趋势流</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Physical Performance Temporal Stream</p>
                            </div>
                        </div>
                        <div className="flex gap-8">
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 rounded-full bg-brand shadow-sm"></div><span className="text-[10px] font-black text-slate-500 uppercase">自营模式</span></div>
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm"></div><span className="text-[10px] font-black text-slate-500 uppercase">POP 模式</span></div>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                <Activity className="animate-pulse mb-3" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Processing...</p>
                            </div>
                        ) : allTrends[activeMetric].length > 0 ? (
                            <TrendVisual data={allTrends[activeMetric]} isFloat={activeMetric === 'roi'} />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 opacity-30">
                                <BarChart size={64} className="mb-4" strokeWidth={1} />
                                <p className="text-xs font-bold uppercase tracking-widest">物理层暂无可用数据记录</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-4 bg-navy rounded-[48px] p-10 text-white shadow-2xl flex flex-col relative overflow-hidden group/room">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3"></div>
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-14 h-14 rounded-3xl bg-brand flex items-center justify-center shadow-[0_12px_30px_rgba(112,173,71,0.4)] border border-white/10 group-hover/room:scale-110 transition-transform duration-500">
                            <BotIcon size={28} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">AI 战略诊断室 <Sparkles size={16} className="text-brand animate-pulse" /></h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Decision Augmentation Hub</p>
                        </div>
                    </div>
                    
                    {/* Fixed Height Container with scrolling wheel for sidebar cards */}
                    <div className="flex-1 relative z-10 overflow-hidden mb-8 h-[360px]">
                        {diagnoses.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-white/5 rounded-[32px] border border-white/5 p-8 text-center">
                                <DatabaseZap size={48} className="text-slate-700 mb-6 opacity-40" />
                                <p className="text-xs font-bold text-slate-400 italic">系统运行平稳，暂无风险</p>
                            </div>
                        ) : (
                            <div className={`space-y-4 ${diagnoses.length > 2 ? 'animate-verticalScroll' : ''}`}>
                                {diagnoses.map((d) => (
                                    <div key={d.id} className="h-[170px] shrink-0">
                                        <DiagnosisCard diagnosis={d} />
                                    </div>
                                ))}
                                {/* Seamless scroll trick: repeat items if more than 2 */}
                                {diagnoses.length > 2 && diagnoses.map((d) => (
                                    <div key={`${d.id}-repeat`} className="h-[170px] shrink-0">
                                        <DiagnosisCard diagnosis={d} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setIsFullReportOpen(true)}
                        className="w-full relative z-10 py-5 bg-brand text-white rounded-[24px] font-black text-sm hover:bg-[#5da035] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-brand/20 group/btn active:scale-95">
                        查看全链路完整决策报告 <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes verticalScroll {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(calc(-186px * ${diagnoses.length})); }
                }
                .animate-verticalScroll {
                    animation: verticalScroll ${diagnoses.length * 4}s linear infinite;
                }
                .animate-verticalScroll:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};

const DiagnosisCard: React.FC<{ diagnosis: Diagnosis; isFullMode?: boolean }> = ({ diagnosis, isFullMode = false }) => {
    const configMap = {
        asset: { icon: <PackageSearch size={20}/>, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        stock_severe: { icon: <ShieldAlert size={20}/>, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        stock_warning: { icon: <AlertTriangle size={20}/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        explosive: { icon: <Flame size={20}/>, color: "text-brand", bg: "bg-brand/10", border: "border-brand/20" },
        ad_star: { icon: <Rocket size={20}/>, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
        ad_waste: { icon: <Coins size={20}/>, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
        cs_alert: { icon: <Headset size={20}/>, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
        data_gap: { icon: <CalendarX size={20}/>, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
        high_potential: { icon: <Star size={20}/>, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
        roi_drop: { icon: <TrendingDown size={20}/>, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        cpc_spike: { icon: <MousePointerClick size={20}/>, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
        low_efficiency: { icon: <Info size={20}/>, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" }
    };
    const cfg = configMap[diagnosis.type] || configMap.asset;
    return (
        <div className={`rounded-[32px] border transition-all hover:bg-white/5 group/dcard ${cfg.bg} ${cfg.border} animate-slideIn ${isFullMode ? 'p-6 h-full' : 'p-5 h-[170px]'}`}>
            <div className="flex gap-4 mb-4">
                <div className={`${cfg.color} shrink-0 mt-0.5 group-hover/dcard:rotate-12 transition-transform duration-500`}>{cfg.icon}</div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase tracking-tight truncate">{diagnosis.title}</p>
                        {diagnosis.severity === 'critical' && <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">Critical</span>}
                    </div>
                    <p className={`text-[11px] text-slate-300 font-bold mt-1 opacity-80 leading-relaxed ${isFullMode ? '' : 'line-clamp-2'}`}>{diagnosis.desc}</p>
                </div>
            </div>
            <div className="bg-navy/50 rounded-2xl p-4 border border-white/5 space-y-1.5">
                {Object.entries(diagnosis.details).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-[10px]"><span className="text-slate-500 font-black uppercase tracking-widest">{key}</span><span className="text-slate-200 font-black tabular-nums">{val}</span></div>
                ))}
            </div>
        </div>
    );
};

const TrendVisual: React.FC<{ data: DailyRecord[]; isFloat?: boolean }> = ({ data, isFloat = false }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const width = 800; const height = 300; const padding = { top: 30, right: 30, bottom: 50, left: 30 };
    const maxVal = Math.max(...data.map(d => d.total), 0.1) * 1.05;
    const getX = (i: number) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const getY = (v: number) => height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);
    const selfPath = useMemo(() => { if (data.length < 2) return ""; let p = `M ${getX(0)},${getY(data[0].self)}`; data.forEach((d, i) => { if(i>0) p += ` L ${getX(i)},${getY(d.self)}`; }); p += ` L ${getX(data.length-1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`; return p; }, [data, maxVal]);
    const popPath = useMemo(() => { if (data.length < 2) return ""; let p = `M ${getX(0)},${getY(data[0].total)}`; data.forEach((d, i) => { if(i>0) p += ` L ${getX(i)},${getY(d.total)}`; }); p += ` L ${getX(data.length-1)},${getY(data[data.length-1].self)}`; for (let i = data.length - 1; i >= 0; i--) { p += ` L ${getX(i)},${getY(data[i].self)}`; } p += " Z"; return p; }, [data, maxVal]);
    const formatVal = (v: number) => isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();
    return (
        <div ref={containerRef} className="w-full h-full relative cursor-crosshair group/trend" onMouseMove={(e) => { const rect = containerRef.current!.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * width; const idx = Math.round(((x - padding.left) / (width - padding.left - padding.right)) * (data.length - 1)); if(idx >= 0 && idx < data.length) setHoverIndex(idx); }} onMouseLeave={() => setHoverIndex(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                <defs><linearGradient id="gSelf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70AD47" stopOpacity="0.4"/><stop offset="100%" stopColor="#70AD47" stopOpacity="0.05"/></linearGradient><linearGradient id="gPop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05"/></linearGradient></defs>
                {[0, 0.5, 1].map(v => <line key={v} x1={padding.left} y1={getY(maxVal * v / 1.05)} x2={width - padding.right} y2={getY(maxVal * v / 1.05)} stroke="#f8fafc" strokeWidth="2" />)}
                <path d={selfPath} fill="url(#gSelf)" className="transition-all duration-700"/><path d={popPath} fill="url(#gPop)" className="transition-all duration-700"/>
                <path d={`M ${data.map((d,i) => `${getX(i)},${getY(d.self)}`).join(' L ')}`} fill="none" stroke="#70AD47" strokeWidth="3" strokeLinecap="round"/><path d={`M ${data.map((d,i) => `${getX(i)},${getY(d.total)}`).join(' L ')}`} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
                {hoverIndex !== null && <><line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={height - padding.bottom} stroke="#020617" strokeDasharray="6 4" strokeWidth="1" /><circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].self)} r="5" fill="#fff" stroke="#70AD47" strokeWidth="3 shadow-lg"/><circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].total)} r="5" fill="#fff" stroke="#3B82F6" strokeWidth="3 shadow-lg"/></>}
                <text x={padding.left} y={height - 15} fontSize="10" fill="#94a3b8" fontWeight="900" className="uppercase tracking-widest">{data[0].date.substring(5)}</text>
                <text x={width - padding.right} y={height - 15} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="900" className="uppercase tracking-widest">{data[data.length-1].date.substring(5)}</text>
            </svg>
            {hoverIndex !== null && (
                <div className="absolute z-50 pointer-events-none bg-slate-900 text-white rounded-2xl p-5 shadow-2xl animate-fadeIn" style={{ left: `${(getX(hoverIndex)/width)*100}%`, top: '35%', transform: `translate(${hoverIndex > data.length/2 ? '-110%' : '15%'}, -50%)` }}>
                    <p className="text-[10px] font-black text-slate-500 mb-3 border-b border-white/10 pb-2 uppercase tracking-widest">{data[hoverIndex].date}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between gap-10 items-center"><span className="flex items-center gap-2 text-[10px] font-bold text-slate-300"><div className="w-1.5 h-1.5 rounded-full bg-brand"></div>自营体系</span><span className="text-xs font-black tabular-nums">{formatVal(data[hoverIndex].self)}</span></div>
                        <div className="flex justify-between gap-10 items-center"><span className="flex items-center gap-2 text-[10px] font-bold text-slate-300"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>POP 模式</span><span className="text-xs font-black tabular-nums">{formatVal(data[hoverIndex].pop)}</span></div>
                        <div className="pt-2 border-t border-white/10 flex justify-between gap-10 items-center"><span className="text-[10px] font-black text-brand uppercase">当日总量合计</span><span className="text-sm font-black text-brand tabular-nums">{formatVal(data[hoverIndex].total)}</span></div>
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
    return (
        <button onClick={onClick} className={`bg-white rounded-[40px] border text-left transition-all duration-500 group flex flex-col overflow-hidden relative active:scale-95 ${isActive ? 'ring-[6px] ring-brand/10 border-brand shadow-2xl scale-[1.02]' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200'}`}>
            <div className="p-8 flex-1 space-y-6">
                <div className="flex justify-between items-start">
                    <div className={`w-14 h-14 ${bg} rounded-[22px] flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-700`}>{icon}</div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{title}</h3>
                        {!isLoading && (
                            <div className={`text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${((totalChange > 0 && isHigherBetter) || (totalChange < 0 && !isHigherBetter)) ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                                {totalChange >= 0 ? <ArrowUp size={10} strokeWidth={4} /> : <ArrowDown size={10} strokeWidth={4} />}
                                {Math.abs(totalChange).toFixed(1)}%
                            </div>
                        )}
                    </div>
                </div>
                <div>{isLoading ? <div className="h-10 w-3/4 bg-slate-50 animate-pulse rounded-2xl"></div> : <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{prefix}{formatVal(value.total.current)}</p>}</div>
            </div>
            <div className={`bg-slate-50/50 border-t p-5 grid grid-cols-2 gap-4 ${isActive ? 'bg-brand/5 border-brand/10' : 'border-slate-50'}`}>
                <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">自营端</p><p className="text-[11px] font-black text-slate-700 tabular-nums">{prefix}{formatVal(value.self.current)}</p></div>
                <div className="border-l border-slate-200 pl-4"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">POP端</p><p className="text-[11px] font-black text-slate-700 tabular-nums">{prefix}{formatVal(value.pop.current)}</p></div>
            </div>
        </button>
    );
};
