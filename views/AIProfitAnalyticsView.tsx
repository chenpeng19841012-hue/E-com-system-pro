import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DollarSign, Bot, LoaderCircle, AlertCircle, ChevronsUpDown, ChevronDown, Store, PieChart, LayoutDashboard, TrendingUp, ChevronLeft, ChevronRight, Sparkles, Filter, CheckSquare, Square, Search } from 'lucide-react';
import { DB } from '../lib/db';
import { getSkuIdentifier } from '../lib/helpers';
import { ProductSKU, Shop } from '../lib/types';

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
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
    };
};

export const AIProfitAnalyticsView = ({ skus, shops, addToast }: { skus: ProductSKU[], shops: Shop[], addToast: any }) => {
    const [startDate, setStartDate] = useState(getInitialDates().startDate);
    const [endDate, setEndDate] = useState(getInitialDates().endDate);
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const shopDropdownRef = useRef<HTMLDivElement>(null);
    const [sortBy, setSortBy] = useState<{ key: keyof ProfitData, direction: 'asc' | 'desc' }>({ key: 'netProfit', direction: 'desc' });
    
    const [isLoading, setIsLoading] = useState(false);
    const [tableData, setTableData] = useState<ProfitData[]>([]);
    const [shopSummaries, setShopSummaries] = useState<ShopSummary[]>([]);
    const [kpis, setKpis] = useState<KpiData>({ totalRevenue: 0, totalCogs: 0, totalAdSpend: 0, totalGrossProfit: 0, totalNetProfit: 0, avgNetProfitMargin: 0 });
    
    const [aiInsight, setAiInsight] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // 分页状态
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
                    if (skuCode) {
                        adSpendMap.set(skuCode, (adSpendMap.get(skuCode) || 0) + Number(r.cost || 0));
                    }
                });

                const profitMap = new Map<string, Omit<ProfitData, 'skuCode' | 'netProfitMargin'>>();
                const shopAgg = new Map<string, Omit<ShopSummary, 'shopId' | 'shopName' | 'margin'>>();

                szData.forEach((r: any) => {
                    const skuCode = getSkuIdentifier(r);
                    if (!skuCode) return;

                    const skuInfo = skuMap.get(skuCode);
                    if (!skuInfo) return;

                    if (selectedShopIds.length > 0 && !selectedShopIds.includes(skuInfo.shopId)) return;
                    
                    const revenue = Number(r.paid_amount) || 0;
                    const cogs = (skuInfo.costPrice || 0) * (Number(r.paid_items) || 0);
                    
                    // SKU Aggregation
                    const entry = profitMap.get(skuCode) || {
                        skuName: skuInfo.name,
                        shopName: shopMap.get(skuInfo.shopId) || '未知',
                        revenue: 0, cogs: 0, adSpend: 0, grossProfit: 0, netProfit: 0
                    };
                    entry.revenue += revenue;
                    entry.cogs += cogs;
                    entry.grossProfit += (revenue - cogs);
                    profitMap.set(skuCode, entry);

                    // Shop Aggregation
                    const sAgg = shopAgg.get(skuInfo.shopId) || { revenue: 0, cogs: 0, adSpend: 0, netProfit: 0 };
                    sAgg.revenue += revenue;
                    sAgg.cogs += cogs;
                    shopAgg.set(skuInfo.shopId, sAgg);
                });

                // Final Merge with Ad Spend for SKU level
                profitMap.forEach((data, skuCode) => {
                    data.adSpend = adSpendMap.get(skuCode) || 0;
                    data.netProfit = data.grossProfit - data.adSpend;
                });

                // Re-merge with Ad Spend for Shop level
                jztData.forEach((r: any) => {
                    const skuCode = getSkuIdentifier(r);
                    const skuInfo = skuCode ? skuMap.get(skuCode) : null;
                    if (skuInfo && shopAgg.has(skuInfo.shopId)) {
                        const sAgg = shopAgg.get(skuInfo.shopId)!;
                        sAgg.adSpend += Number(r.cost || 0);
                    }
                });

                let totalRevenue = 0, totalCogs = 0, totalAdSpend = 0, totalGrossProfit = 0, totalNetProfit = 0;
                
                const finalTableData = Array.from(profitMap.entries()).map(([skuCode, data]) => {
                    totalRevenue += data.revenue;
                    totalCogs += data.cogs;
                    totalAdSpend += data.adSpend;
                    totalGrossProfit += data.grossProfit;
                    totalNetProfit += data.netProfit;

                    return {
                        skuCode,
                        ...data,
                        netProfitMargin: data.revenue > 0 ? data.netProfit / data.revenue : 0,
                    };
                });

                const finalShopSummaries = Array.from(shopAgg.entries()).map(([shopId, data]) => {
                    const netProfit = data.revenue - data.cogs - data.adSpend;
                    return {
                        shopId,
                        shopName: shopMap.get(shopId) || '未知',
                        ...data,
                        netProfit,
                        margin: data.revenue > 0 ? netProfit / data.revenue : 0
                    };
                }).sort((a, b) => b.revenue - a.revenue);

                setKpis({
                    totalRevenue, totalCogs, totalAdSpend, totalGrossProfit, totalNetProfit,
                    avgNetProfitMargin: totalRevenue > 0 ? totalNetProfit / totalRevenue : 0,
                });
                setTableData(finalTableData);
                setShopSummaries(finalShopSummaries);
                setCurrentPage(1);
            } catch (err) {
                console.error("Profit fetching error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate, selectedShopIds, skus, shops]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
                setIsShopDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const sortedTableData = useMemo(() => {
        return [...tableData].sort((a, b) => {
            const valA = a[sortBy.key];
            const valB = b[sortBy.key];
            if (valA < valB) return sortBy.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortBy.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tableData, sortBy]);

    const paginatedTableData = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return sortedTableData.slice(start, start + ROWS_PER_PAGE);
    }, [sortedTableData, currentPage]);

    const totalPages = Math.ceil(sortedTableData.length / ROWS_PER_PAGE);
    
    const handleSort = (key: keyof ProfitData) => {
        setSortBy(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleAiAnalysis = async () => {
        setIsAiLoading(true);
        setAiInsight('');
        try {
            const top5 = sortedTableData.slice(0, 5);
            const bottom5 = sortedTableData.slice(-5).reverse();
            
            if(sortedTableData.length === 0) {
                setAiInsight("没有足够的利润数据进行分析。请先在数据中心上传销售与广告明细。");
                return;
            }

            const dataStr = top5.concat(bottom5).map(s => `SKU:${s.skuName}, GMV:${s.revenue}, 利润率:${(s.netProfitMargin*100).toFixed(2)}%`).join('; ');
            const shopStr = shopSummaries.map(s => `店铺:${s.shopName}, 利润:${s.netProfit}, 广告比:${(s.adSpend/s.revenue*100).toFixed(1)}%`).join('; ');
            
            const prompt = `你是一名资深电商运营专家。以下是本期利润表现快照：
            【店铺表现】：${shopStr}
            【核心SKU表现】：${dataStr}
            
            请给出深度盈利诊断：
            1. 识别盈利能力最强和最弱的店铺/环节；
            2. 分析亏损SKU的潜在原因（如广告过热、成本失控）；
            3. 提供3条具备实操性的下一步改进建议。
            语气专业且直接，250字以内。`;
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ text: prompt }] }
                })
            });
            
            if (!response.ok) throw new Error("API Route Failed");
            
            const resData = await response.json();
            const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || resData.text;
            setAiInsight(text || "AI分析生成失败。");
        } catch (err) {
            setAiInsight("无法连接AI服务进行盈利审计。请检查 API_KEY 配置。");
        } finally {
            setIsAiLoading(false);
        }
    };

    const formatCurrency = (val: number) => `¥${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

    return (
        <div className="p-8 md:p-10 w-full animate-fadeIn space-y-10">
            {/* Header - Aligned with Command Console */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">盈利模型审计引擎中</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI 利润透视中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 opacity-60">Physical SKU & Store Level Profit Intelligence</p>
                </div>
                
                {/* Unified Filters */}
                <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-[32px] shadow-xl border border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 shadow-inner focus-within:border-brand transition-all">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 outline-none" />
                        <span className="text-slate-300 font-black">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 outline-none" />
                    </div>
                    <div className="relative" ref={shopDropdownRef}>
                        <button onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)} className="min-w-[180px] bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 flex justify-between items-center hover:bg-slate-100 transition-all">
                            <span className="truncate">{selectedShopIds.length === 0 ? '全域探测' : `已选 ${selectedShopIds.length} 店铺`}</span>
                            <ChevronDown size={14} className="ml-2 text-slate-400" />
                        </button>
                        {isShopDropdownOpen && (
                            <div className="absolute top-full right-0 w-64 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 p-4 max-h-64 overflow-y-auto no-scrollbar animate-slideIn">
                                {shops.map(shop => (
                                    <label key={shop.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                                        <input type="checkbox" checked={selectedShopIds.includes(shop.id)} onChange={() => { setSelectedShopIds(prev => prev.includes(shop.id) ? prev.filter(id => id !== shop.id) : [...prev, shop.id]); }} className="hidden" />
                                        {selectedShopIds.includes(shop.id) ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} className="text-slate-300 group-hover:text-slate-400" />}
                                        <span className="text-xs font-bold text-slate-700">{shop.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Global KPIs - Dashboard Style */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {[
                    { title: '总收入 (GMV)', value: formatCurrency(kpis.totalRevenue), color: 'text-slate-900', bg: 'bg-slate-50' },
                    { title: '货品成本 (COGS)', value: formatCurrency(kpis.totalCogs), color: 'text-slate-500', bg: 'bg-slate-50/50' },
                    { title: '广告投放成本', value: formatCurrency(kpis.totalAdSpend), color: 'text-amber-600', bg: 'bg-amber-50/30' },
                    { title: '预估毛利', value: formatCurrency(kpis.totalGrossProfit), color: 'text-blue-600', bg: 'bg-blue-50/30' },
                    { title: '最终净利润', value: formatCurrency(kpis.totalNetProfit), color: kpis.totalNetProfit < 0 ? 'text-rose-600' : 'text-brand', bg: kpis.totalNetProfit < 0 ? 'bg-rose-50' : 'bg-brand/5', highlight: true },
                    { title: '平均利润率', value: formatPercent(kpis.avgNetProfitMargin), color: kpis.avgNetProfitMargin < 0 ? 'text-rose-600' : 'text-brand', bg: kpis.avgNetProfitMargin < 0 ? 'bg-rose-50' : 'bg-brand/5' },
                ].map(k => (
                    <div key={k.title} className={`p-8 rounded-[32px] border border-slate-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all ${k.bg}`}>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{k.title}</h4>
                        {isLoading ? (
                            <div className="h-8 bg-slate-200/50 animate-pulse rounded-xl w-3/4"></div>
                        ) : (
                            <p className={`text-2xl font-black tabular-nums tracking-tighter ${k.color}`}>{k.value}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Shop Summary Matrix */}
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 overflow-hidden group/matrix">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-brand">
                        <Store size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">店铺效能审计矩阵</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Store-Level Aggregated Profit Matrix</p>
                    </div>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50/50">
                            <tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                <th className="py-4 px-4">店铺名称</th>
                                <th className="py-4 px-2 text-right">营业收入 (GMV)</th>
                                <th className="py-4 px-2 text-right">货耗成本 (COGS)</th>
                                <th className="py-4 px-2 text-right">广告投放</th>
                                <th className="py-4 px-2 text-right">净利润</th>
                                <th className="py-4 px-4 text-center">利润率</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {shopSummaries.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-300 font-black italic">未检测到任何店铺数据流</td></tr>
                            ) : (
                                shopSummaries.map(s => (
                                    <tr key={s.shopId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-4 font-black text-slate-800">{s.shopName}</td>
                                        <td className="py-4 px-2 text-right font-mono font-bold text-slate-700">{formatCurrency(s.revenue)}</td>
                                        <td className="py-4 px-2 text-right font-mono text-slate-400">{formatCurrency(s.cogs)}</td>
                                        <td className="py-4 px-2 text-right font-mono text-amber-600">{formatCurrency(s.adSpend)}</td>
                                        <td className={`py-4 px-2 text-right font-mono font-black ${s.netProfit < 0 ? 'text-rose-500' : 'text-brand'}`}>{formatCurrency(s.netProfit)}</td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg font-black text-[10px] ${s.margin < 0 ? 'bg-rose-50 text-rose-600' : 'bg-brand/10 text-brand'}`}>
                                                {formatPercent(s.margin)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main SKU Profit Table with Pagination */}
                <div className="lg:col-span-8 bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 min-h-[700px] flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">SKU 级物理利润审计</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Detailed Performance Record Penetration</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto no-scrollbar">
                        <table className="w-full text-[11px] table-fixed min-w-[800px]">
                            <thead>
                                <tr className="text-left text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                    <th className="pb-5 px-2 w-[250px] cursor-pointer group" onClick={() => handleSort('skuName')}>
                                        <div className="flex items-center gap-1">SKU 资产明细 <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-100" /></div>
                                    </th>
                                    <th className="pb-5 px-2 text-right cursor-pointer group" onClick={() => handleSort('revenue')}>
                                        <div className="flex items-center justify-end gap-1">收入 <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-100" /></div>
                                    </th>
                                    <th className="pb-5 px-2 text-right">广告费</th>
                                    <th className="pb-5 px-2 text-right cursor-pointer group" onClick={() => handleSort('netProfit')}>
                                        <div className="flex items-center justify-end gap-1">净利润 <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-100" /></div>
                                    </th>
                                    <th className="pb-5 px-2 text-right cursor-pointer group" onClick={() => handleSort('netProfitMargin')}>
                                        <div className="flex items-center justify-end gap-1">利润率 <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-100" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="py-40 text-center animate-pulse"><LoaderCircle size={40} className="animate-spin text-slate-200 mx-auto mb-4" /><p className="text-xs font-black text-slate-300 uppercase tracking-widest">正在穿透海量物理记录核算利润...</p></td></tr>
                                ) : paginatedTableData.length === 0 ? (
                                    <tr><td colSpan={5} className="py-40 text-center text-slate-300 font-black italic">Awaiting Calculation Job</td></tr>
                                ) : (
                                    paginatedTableData.map(row => (
                                        <tr key={row.skuCode} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="py-5 px-2">
                                                <div className="font-black text-slate-800 truncate text-xs" title={row.skuName}>{row.skuName}</div>
                                                <div className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-tighter opacity-60">{row.skuCode} @ {row.shopName}</div>
                                            </td>
                                            <td className="py-5 px-2 text-right font-mono font-bold text-slate-700">{formatCurrency(row.revenue)}</td>
                                            <td className="py-5 px-2 text-right font-mono text-rose-400 font-medium">{formatCurrency(row.adSpend)}</td>
                                            <td className={`py-5 px-2 text-right font-mono font-black ${row.netProfit < 0 ? 'text-rose-500' : 'text-brand'} text-sm`}>{formatCurrency(row.netProfit)}</td>
                                            <td className={`py-5 px-2 text-right font-mono font-black ${row.netProfitMargin < 0 ? 'text-rose-500' : 'text-brand'}`}>
                                                {formatPercent(row.netProfitMargin)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination - Professional Style */}
                    {sortedTableData.length > ROWS_PER_PAGE && (
                        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">展示 {(currentPage-1)*ROWS_PER_PAGE + 1} - {Math.min(currentPage*ROWS_PER_PAGE, sortedTableData.length)} / 共 {sortedTableData.length} SKU</span>
                            <div className="flex items-center gap-2">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all bg-slate-50/50 hover:bg-white"><ChevronLeft size={16} /></button>
                                <div className="text-xs font-black text-slate-700 px-4">第 {currentPage} / {totalPages} 页</div>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all bg-slate-50/50 hover:bg-white"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Profit Room - Fixed Layout */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[48px] p-10 text-slate-900 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group/ai h-full min-h-[600px]">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3"></div>
                        
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                            <div className="w-14 h-14 rounded-3xl bg-brand flex items-center justify-center shadow-lg border border-white/10 group-hover/ai:rotate-6 transition-transform">
                                <Bot size={28} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">AI 盈利诊断官 <Sparkles size={16} className="text-brand animate-pulse" /></h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Neural Profit Audit Hub</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleAiAnalysis} 
                            disabled={isAiLoading || sortedTableData.length === 0} 
                            className="w-full relative z-10 mb-8 py-5 rounded-[24px] bg-brand text-white font-black text-sm shadow-2xl shadow-brand/20 hover:bg-[#5da035] transition-all flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95 uppercase tracking-widest"
                        >
                            {isAiLoading ? <LoaderCircle size={20} className="animate-spin" /> : <TrendingUp size={20} />}
                            启动全链路盈利审计
                        </button>

                        <div className="relative z-10 flex-1 bg-slate-50/50 rounded-[32px] p-8 border border-slate-100 overflow-y-auto no-scrollbar shadow-inner">
                            {isAiLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                    <LoaderCircle size={32} className="animate-spin text-brand" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">AI 正在扫描财务物理层记录...</p>
                                </div>
                            ) : aiInsight ? (
                                <div className="text-sm text-slate-600 leading-loose whitespace-pre-wrap font-medium animate-fadeIn">
                                    {aiInsight}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center opacity-60">
                                    <PieChart size={64} className="mb-6 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-widest">Awaiting Profit Audit</p>
                                    <p className="text-[10px] mt-2 font-bold max-w-[200px]">点击上方按钮以开启多维利润穿透与 AI 改进建议。</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-slate-100 text-center relative z-10 shrink-0">
                             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Decision Intelligence Powered by Gemini 3.0</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};