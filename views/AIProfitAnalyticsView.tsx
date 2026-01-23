
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DollarSign, Bot, LoaderCircle, AlertCircle, ChevronsUpDown, ChevronDown } from 'lucide-react';
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
    const [kpis, setKpis] = useState<KpiData>({ totalRevenue: 0, totalCogs: 0, totalAdSpend: 0, totalGrossProfit: 0, totalNetProfit: 0, avgNetProfitMargin: 0 });
    
    const [aiInsight, setAiInsight] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

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
                        const key = skuCode;
                        adSpendMap.set(key, (adSpendMap.get(key) || 0) + Number(r.cost || 0));
                    }
                });

                const profitMap = new Map<string, Omit<ProfitData, 'skuCode' | 'netProfitMargin'>>();

                szData.forEach((r: any) => {
                    const skuCode = getSkuIdentifier(r);
                    if (!skuCode) return;

                    const skuInfo = skuMap.get(skuCode);
                    if (!skuInfo) return;

                    if (selectedShopIds.length > 0 && !selectedShopIds.includes(skuInfo.shopId)) return;
                    
                    const revenue = Number(r.paid_amount) || 0;
                    const cogs = (skuInfo.costPrice || 0) * (Number(r.paid_items) || 0);
                    const adSpendForThisRecord = 0; // JZT distribution is simplified here to SKU level
                    
                    const entry = profitMap.get(skuCode) || {
                        skuName: skuInfo.name,
                        shopName: shopMap.get(skuInfo.shopId) || '未知',
                        revenue: 0, cogs: 0, adSpend: 0, grossProfit: 0, netProfit: 0
                    };

                    entry.revenue += revenue;
                    entry.cogs += cogs;
                    entry.grossProfit += (revenue - cogs);
                    profitMap.set(skuCode, entry);
                });

                // Re-merge with Ad Spend
                profitMap.forEach((data, skuCode) => {
                    data.adSpend = adSpendMap.get(skuCode) || 0;
                    data.netProfit = data.grossProfit - data.adSpend;
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

                setKpis({
                    totalRevenue, totalCogs, totalAdSpend, totalGrossProfit, totalNetProfit,
                    avgNetProfitMargin: totalRevenue > 0 ? totalNetProfit / totalRevenue : 0,
                });
                setTableData(finalTableData);
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
    
    const handleToggleShop = (shopId: string) => {
        setSelectedShopIds(prev => prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]);
    };

    const sortedTableData = useMemo(() => {
        return [...tableData].sort((a, b) => {
            const valA = a[sortBy.key];
            const valB = b[sortBy.key];
            if (valA < valB) return sortBy.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortBy.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tableData, sortBy]);
    
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

            const dataStr = top5.concat(bottom5).map(s => `${s.skuName}: GMV=${s.revenue}, 利润率=${(s.netProfitMargin*100).toFixed(2)}%`).join('; ');
            const prompt = `你是一名资深电商CFO。以下是当前时段的SKU利润表现快照：${dataStr}。请根据这些数据：1. 诊断整体盈利健康度；2. 识别表现最差的SKU并推测原因（如广告浪费、成本过高）；3. 提供3个具体的盈利优化建议。语气简练有力，200字以内。`;
            
            const apiResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gemini-3-flash-preview', contents: prompt })
            });

            if (!apiResponse.ok) throw new Error('AI request failed');
            const responseData = await apiResponse.json();
            setAiInsight(responseData.candidates?.[0]?.content?.parts?.[0]?.text || "分析报告生成失败。");
        } catch (err) {
            setAiInsight("AI诊断失败，请检查API密钥或网络连接。");
        } finally {
            setIsAiLoading(false);
        }
    };

    const formatCurrency = (val: number) => `¥${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 利润分析</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">SKU-LEVEL PROFIT INTELLIGENCE</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-600 px-3 py-1 outline-none" />
                        <span className="text-slate-300 self-center">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-600 px-3 py-1 outline-none" />
                    </div>
                    <div className="relative" ref={shopDropdownRef}>
                        <button onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)} className="min-w-[160px] bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 flex justify-between items-center shadow-sm">
                            <span className="truncate">{selectedShopIds.length === 0 ? '全部店铺' : `已选 ${selectedShopIds.length} 个`}</span>
                            <ChevronDown size={14} className="ml-2 text-slate-400" />
                        </button>
                        {isShopDropdownOpen && (
                            <div className="absolute top-full right-0 w-64 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 max-h-60 overflow-y-auto">
                                {shops.map(shop => (
                                    <label key={shop.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                        <input type="checkbox" checked={selectedShopIds.includes(shop.id)} onChange={() => handleToggleShop(shop.id)} className="form-checkbox h-4 w-4 text-[#70AD47] rounded" />
                                        <span className="text-xs font-bold text-slate-700">{shop.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {[
                    { title: '总收入 (GMV)', value: formatCurrency(kpis.totalRevenue) },
                    { title: '货品成本 (COGS)', value: formatCurrency(kpis.totalCogs) },
                    { title: '广告花费', value: formatCurrency(kpis.totalAdSpend) },
                    { title: '总毛利', value: formatCurrency(kpis.totalGrossProfit) },
                    { title: '总净利润', value: formatCurrency(kpis.totalNetProfit), highlight: kpis.totalNetProfit < 0 },
                    { title: '平均净利润率', value: formatPercent(kpis.avgNetProfitMargin), highlight: kpis.avgNetProfitMargin < 0 },
                ].map(k => (
                    <div key={k.title} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{k.title}</h4>
                        {isLoading ? (
                            <div className="h-8 bg-slate-50 animate-pulse rounded mt-2 w-3/4"></div>
                        ) : (
                            <p className={`text-2xl font-black mt-2 ${k.highlight ? 'text-rose-500' : 'text-slate-800'}`}>{k.value}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[500px]">
                     <table className="w-full text-[11px]">
                        <thead>
                            <tr className="text-left text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                {(['skuName', 'revenue', 'grossProfit', 'adSpend', 'netProfit', 'netProfitMargin'] as const).map(key => (
                                     <th key={key} className="pb-4 px-2 cursor-pointer group" onClick={() => handleSort(key)}>
                                        <div className="flex items-center gap-1">
                                            { {skuName: 'SKU / 店铺', revenue: '收入', grossProfit: '毛利润', adSpend: '广告费', netProfit: '净利润', netProfitMargin: '净利润率'}[key] }
                                            <ChevronsUpDown size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sortBy.key === key ? 'opacity-100 text-[#70AD47]' : ''}`} />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold animate-pulse">正在穿透海量记录计算利润...</td></tr>
                            ) : sortedTableData.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold italic">当前周期无销售记录</td></tr>
                            ) : (
                                sortedTableData.map(row => (
                                    <tr key={row.skuCode} className="hover:bg-slate-50 transition-colors group">
                                        <td className="py-4 px-2 border-b border-slate-50 max-w-[200px]">
                                            <div className="font-black text-slate-800 truncate" title={row.skuName}>{row.skuName}</div>
                                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">{row.shopName}</div>
                                        </td>
                                        <td className="py-4 px-2 border-b border-slate-50 font-mono font-bold text-slate-600">{formatCurrency(row.revenue)}</td>
                                        <td className="py-4 px-2 border-b border-slate-50 font-mono text-slate-500">{formatCurrency(row.grossProfit)}</td>
                                        <td className="py-4 px-2 border-b border-slate-50 font-mono text-rose-400">{formatCurrency(row.adSpend)}</td>
                                        <td className={`py-4 px-2 border-b border-slate-50 font-mono font-black ${row.netProfit < 0 ? 'text-rose-500' : 'text-green-600'}`}>{formatCurrency(row.netProfit)}</td>
                                        <td className={`py-4 px-2 border-b border-slate-50 font-mono font-black ${row.netProfitMargin < 0 ? 'text-rose-500' : 'text-green-600'}`}>{formatPercent(row.netProfitMargin)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                     </table>
                </div>
                 <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit">
                     <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6">
                         <Bot size={20} className="text-[#70AD47]"/> 
                         AI 盈利诊断官
                     </h3>
                     <button 
                        onClick={handleAiAnalysis} 
                        disabled={isAiLoading || sortedTableData.length === 0} 
                        className="w-full mb-6 py-3 rounded-2xl bg-[#70AD47] text-white font-black text-xs shadow-lg shadow-[#70AD47]/20 hover:bg-[#5da035] transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                    >
                        {isAiLoading ? <LoaderCircle size={16} className="animate-spin" /> : <DollarSign size={16} />}
                        执行深度盈利诊断
                    </button>
                    <div className="bg-slate-50/70 rounded-2xl p-6 min-h-[300px]">
                        {isAiLoading ? (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LoaderCircle size={28} className="animate-spin mb-4" />
                                <p className="text-xs font-bold">AI 正在审计财务明细...</p>
                            </div>
                        ) : aiInsight ? (
                             <div className="text-xs text-slate-600 space-y-4 leading-relaxed whitespace-pre-wrap font-medium">
                                 {aiInsight}
                             </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center opacity-60">
                                 <Bot size={48} className="mb-4" />
                                 <p className="text-xs font-black uppercase tracking-widest">Awaiting Analysis</p>
                                 <p className="text-[10px] mt-2 font-bold">点击上方按钮启动审计</p>
                             </div>
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
};
