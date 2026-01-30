
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DollarSign, Bot, LoaderCircle, AlertCircle, ChevronsUpDown, ChevronDown, Store, PieChart, LayoutDashboard, TrendingUp, ChevronLeft, ChevronRight, Sparkles, Filter, CheckSquare, Square, Search, Target, DatabaseZap } from 'lucide-react';
import { callQwen } from '../lib/ai';
import { DB } from '../lib/db';
import { getSkuIdentifier } from '../lib/helpers';
import { ProductSKU, Shop } from '../lib/types';
import { getTodayInBeijingString, generateDateRange } from '../lib/time';

interface ProfitData {
    skuCode: string;
    skuName: string;
    shopName: string;
    revenue: number;
    cogs: number;
    adSpend: number;
    grossProfit: number;
    netProfit: number;
    netProfitMargin: number;
}

interface ShopSummary {
    shopId: string;
    shopName: string;
    revenue: number;
    cogs: number;
    adSpend: number;
    netProfit: number;
    margin: number;
}

interface KpiData {
    totalRevenue: number;
    totalCogs: number;
    totalAdSpend: number;
    totalGrossProfit: number;
    totalNetProfit: number;
    avgNetProfitMargin: number;
}

const getInitialDates = () => {
    const end = getTodayInBeijingString();
    const start = generateDateRange(end, 7)[0];
    return {
        startDate: start,
        endDate: end,
    };
};

export const AIProfitAnalyticsView = ({ skus, shops, addToast }: { skus: ProductSKU[], shops: Shop[], addToast: any }) => {
    const [startDate, setStartDate] = useState(getInitialDates().startDate);
    const [endDate, setEndDate] = useState(getInitialDates().endDate);
    const [selectedShopId, setSelectedShopId] = useState('all');
    const [sortBy, setSortBy] = useState<{ key: keyof ProfitData, direction: 'asc' | 'desc' }>({ key: 'netProfit', direction: 'desc' });
    
    const [isLoading, setIsLoading] = useState(false);
    const [tableData, setTableData] = useState<ProfitData[]>([]);
    const [kpis, setKpis] = useState<KpiData>({ totalRevenue: 0, totalCogs: 0, totalAdSpend: 0, totalGrossProfit: 0, totalNetProfit: 0, avgNetProfitMargin: 0 });
    
    const [aiInsight, setAiInsight] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 10;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [szData, jztData] = await Promise.all([
                    DB.getRange('fact_shangzhi', startDate, endDate),
                    DB.getRange('fact_jingzhuntong', startDate, endDate)
                ]);

                const skuMap = new Map(skus.map(s => [s.code, s]));
                const shopMap = new Map(shops.map(s => [s.id, s.name]));
                const adSpendMap = new Map<string, number>();

                jztData.forEach((r: any) => {
                    const skuCode = getSkuIdentifier(r);
                    if (skuCode) adSpendMap.set(skuCode, (adSpendMap.get(skuCode) || 0) + Number(r.cost || 0));
                });

                const profitMap = new Map<string, Omit<ProfitData, 'skuCode' | 'netProfitMargin'>>();

                szData.forEach((r: any) => {
                    const skuCode = getSkuIdentifier(r);
                    if (!skuCode) return;
                    const skuInfo = skuMap.get(skuCode);
                    if (!skuInfo) return;
                    
                    // 店铺过滤逻辑
                    if (selectedShopId !== 'all' && skuInfo.shopId !== selectedShopId) return;
                    
                    const revenue = Number(r.paid_amount) || 0;
                    const cogs = (skuInfo.costPrice || 0) * (Number(r.paid_items) || 0);
                    
                    const entry = profitMap.get(skuCode) || { skuName: skuInfo.name, shopName: shopMap.get(skuInfo.shopId) || '未知', revenue: 0, cogs: 0, adSpend: 0, grossProfit: 0, netProfit: 0 };
                    entry.revenue += revenue;
                    entry.cogs += cogs;
                    entry.grossProfit += (revenue - cogs);
                    profitMap.set(skuCode, entry);
                });

                profitMap.forEach((data, skuCode) => {
                    data.adSpend = adSpendMap.get(skuCode) || 0;
                    data.netProfit = data.grossProfit - data.adSpend;
                });

                let tRev = 0, tCogs = 0, tAd = 0, tGross = 0, tNet = 0;
                const finalTableData = Array.from(profitMap.entries()).map(([skuCode, data]) => {
                    tRev += data.revenue; tCogs += data.cogs; tAd += data.adSpend; tGross += data.grossProfit; tNet += data.netProfit;
                    return { skuCode, ...data, netProfitMargin: data.revenue > 0 ? data.netProfit / data.revenue : 0 };
                });

                setKpis({ totalRevenue: tRev, totalCogs: tCogs, totalAdSpend: tAd, totalGrossProfit: tGross, totalNetProfit: tNet, avgNetProfitMargin: tRev > 0 ? tNet / tRev : 0 });
                setTableData(finalTableData);
            } finally { setIsLoading(false); }
        };
        fetchData();
    }, [startDate, endDate, skus, shops, selectedShopId]);

    // Sorting Logic
    const sortedData = useMemo(() => {
        return [...tableData].sort((a, b) => {
            const valA = a[sortBy.key];
            const valB = b[sortBy.key];
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortBy.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            // @ts-ignore
            return sortBy.direction === 'asc' ? valA - valB : valB - valA;
        });
    }, [tableData, sortBy]);

    // Pagination Logic
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return sortedData.slice(start, start + ROWS_PER_PAGE);
    }, [sortedData, currentPage]);

    const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);

    const handleSort = (key: keyof ProfitData) => {
        setSortBy(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleAiAnalysis = async () => {
        setIsAiLoading(true);
        try {
            const topSkus = tableData.sort((a, b) => b.netProfit - a.netProfit).slice(0, 3);
            const lowSkus = tableData.sort((a, b) => a.netProfit - b.netProfit).slice(0, 3);
            
            const prompt = `
                你是电商财务分析专家。基于以下数据进行利润诊断：
                
                【周期业绩】
                总营收: ¥${kpis.totalRevenue.toLocaleString()}
                总净利: ¥${kpis.totalNetProfit.toLocaleString()} (净利率 ${(kpis.avgNetProfitMargin * 100).toFixed(1)}%)
                
                【高利明星商品】
                ${topSkus.map(s => `- ${s.skuName}: 净利 ¥${s.netProfit.toFixed(0)}, 利润率 ${(s.netProfitMargin * 100).toFixed(1)}%`).join('\n')}
                
                【亏损/低利商品】
                ${lowSkus.map(s => `- ${s.skuName}: 净利 ¥${s.netProfit.toFixed(0)}, 利润率 ${(s.netProfitMargin * 100).toFixed(1)}%`).join('\n')}
                
                请提供：
                1. 整体盈利能力评价
                2. 针对亏损商品的具体优化建议（如提价、降广、清仓）
                3. 下一步利润增长点
                
                保持专业、客观，200字以内。
            `;
            const result = await callQwen(prompt);
            setAiInsight(result || "AI 分析服务暂不可用");
        } catch (e: any) {
            setAiInsight(`分析失败: ${e.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none">财务审计链路已贯通</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">全链路盈利分析</h1>
                    <p className="text-slate-400 font-bold text-sm tracking-wide">Net Profit & Margin Analysis Hub</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 flex flex-wrap gap-8 items-end relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分析周期</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-inner">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 px-3 py-2 outline-none" />
                        <span className="text-slate-300 font-black">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 px-3 py-2 outline-none" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">店铺筛选</label>
                    <div className="relative">
                        <select 
                            value={selectedShopId} 
                            onChange={e => setSelectedShopId(e.target.value)}
                            className="min-w-[200px] bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-inner"
                        >
                            <option value="all">全域资产核算</option>
                            {shops.map((s: Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <KpiCard label="总营收 (Revenue)" value={kpis.totalRevenue} prefix="¥" />
                <KpiCard label="总成本 (COGS)" value={kpis.totalCogs} prefix="¥" />
                <KpiCard label="广告消耗 (Ads)" value={kpis.totalAdSpend} prefix="¥" />
                <KpiCard label="毛利润 (Gross)" value={kpis.totalGrossProfit} prefix="¥" highlight />
                <KpiCard label="净利润 (Net)" value={kpis.totalNetProfit} prefix="¥" highlight color="text-brand" />
                <KpiCard label="净利率 (Margin)" value={kpis.avgNetProfitMargin * 100} suffix="%" highlight color={kpis.avgNetProfitMargin > 0.1 ? "text-brand" : "text-amber-500"} />
            </div>

            {/* AI Analysis Section */}
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-white shadow-lg"><Bot size={24} /></div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">AI 财务总监</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Financial Intelligence Audit</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAiAnalysis} 
                        disabled={isAiLoading || tableData.length === 0}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
                    >
                        {isAiLoading ? <LoaderCircle className="animate-spin" size={14} /> : <Sparkles size={14} />}
                        {isAiLoading ? '审计中...' : '启动深度诊断'}
                    </button>
                </div>
                
                {aiInsight && (
                    <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 relative z-10 animate-fadeIn">
                        <p className="text-sm text-slate-600 font-bold leading-loose whitespace-pre-wrap">{aiInsight}</p>
                    </div>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm"><DatabaseZap size={20} /></div>
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">单品盈亏穿透</h3>
                    </div>
                </div>
                
                <div className="flex-1 overflow-x-auto p-8">
                    <table className="w-full text-left text-sm table-fixed min-w-[1200px]">
                        <thead>
                            <tr className="text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                                <th className="pb-6 pl-4 w-[25%] cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('skuName')}>
                                    商品资产信息 {sortBy.key === 'skuName' && (sortBy.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="pb-6 text-right cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('revenue')}>营收 (Revenue)</th>
                                <th className="pb-6 text-right cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('cogs')}>成本 (COGS)</th>
                                <th className="pb-6 text-right cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('adSpend')}>推广费 (Ads)</th>
                                <th className="pb-6 text-right cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('grossProfit')}>毛利 (Gross)</th>
                                <th className="pb-6 text-right cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('netProfit')}>净利 (Net) {sortBy.key === 'netProfit' && (sortBy.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="pb-6 text-right pr-4 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('netProfitMargin')}>净利率 (Margin)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={7} className="py-32 text-center text-slate-300 font-black uppercase tracking-[0.3em]">No Financial Records</td></tr>
                            ) : paginatedData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-5 pl-4">
                                        <div className="font-black text-slate-800 text-xs truncate" title={row.skuName}>{row.skuName}</div>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[9px] font-mono text-slate-400">{row.skuCode}</span>
                                            <span className="text-[9px] text-slate-300 uppercase tracking-tighter flex items-center gap-1"><Store size={8}/> {row.shopName}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 text-right font-mono font-bold text-slate-600">¥{row.revenue.toLocaleString()}</td>
                                    <td className="py-5 text-right font-mono font-bold text-slate-400">¥{row.cogs.toLocaleString()}</td>
                                    <td className="py-5 text-right font-mono font-bold text-amber-500">¥{row.adSpend.toLocaleString()}</td>
                                    <td className="py-5 text-right font-mono font-bold text-slate-700">¥{row.grossProfit.toLocaleString()}</td>
                                    <td className={`py-5 text-right font-mono font-black ${row.netProfit > 0 ? 'text-brand' : 'text-rose-500'}`}>¥{row.netProfit.toLocaleString()}</td>
                                    <td className="py-5 text-right pr-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black ${row.netProfitMargin > 0.15 ? 'bg-green-50 text-green-600' : row.netProfitMargin > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {(row.netProfitMargin * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-auto px-8 py-6 border-t border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-800 disabled:opacity-30 transition-all"><ChevronLeft size={16}/></button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-800 disabled:opacity-30 transition-all"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const KpiCard = ({ label, value, prefix = '', suffix = '', highlight = false, color = 'text-slate-900' }: any) => (
    <div className={`p-6 rounded-[32px] border ${highlight ? 'bg-white border-slate-100 shadow-md' : 'bg-slate-50 border-slate-100'} hover:-translate-y-1 transition-all duration-500`}>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-2xl font-black tabular-nums tracking-tighter ${color}`}>
            {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{suffix}
        </p>
    </div>
);
