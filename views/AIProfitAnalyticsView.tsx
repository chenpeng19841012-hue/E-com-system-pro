import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { DollarSign, Bot, LoaderCircle, AlertCircle, ChevronsUpDown, Filter, ChevronDown } from 'lucide-react';
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

export const AIProfitAnalyticsView = ({ factTables, skus, shops }: { factTables: any, skus: ProductSKU[], shops: Shop[] }) => {
    const [startDate, setStartDate] = useState(getInitialDates().startDate);
    const [endDate, setEndDate] = useState(getInitialDates().endDate);
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const shopDropdownRef = useRef<HTMLDivElement>(null);
    const [sortBy, setSortBy] = useState<{ key: keyof ProfitData, direction: 'asc' | 'desc' }>({ key: 'netProfit', direction: 'desc' });
    const [aiInsight, setAiInsight] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
                setIsShopDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    const handleToggleShop = (shopId: string) => {
        setSelectedShopIds(prev => prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]);
    };

    const { kpis, tableData } = useMemo<{ kpis: KpiData, tableData: ProfitData[] }>(() => {
        const skuMap = new Map(skus.map(s => [s.code, s]));
        const shopMap = new Map(shops.map(s => [s.id, s.name]));
        
        const adSpendMap = new Map<string, number>();
        factTables.jingzhuntong
            .filter((r: any) => r.date >= startDate && r.date <= endDate)
            .forEach((r: any) => {
                const skuCode = getSkuIdentifier(r);
                if (skuCode) {
                    const key = `${r.date}-${skuCode}`;
                    adSpendMap.set(key, (adSpendMap.get(key) || 0) + Number(r.cost || 0));
                }
            });

        const profitMap = new Map<string, Omit<ProfitData, 'skuCode' | 'netProfitMargin'>>();

        factTables.shangzhi
            .filter((r: any) => r.date >= startDate && r.date <= endDate)
            .forEach((r: any) => {
                const skuCode = getSkuIdentifier(r);
                if (!skuCode) return;

                const skuInfo = skuMap.get(skuCode);
                if (!skuInfo) return;

                if (selectedShopIds.length > 0 && !selectedShopIds.includes(skuInfo.shopId)) return;
                
                const revenue = Number(r.paid_amount) || 0;
                const cogs = (skuInfo.costPrice || 0) * (Number(r.paid_items) || 0);
                const adSpend = adSpendMap.get(`${r.date}-${skuCode}`) || 0;
                const grossProfit = revenue - cogs;
                const netProfit = grossProfit - adSpend;
                
                const entry = profitMap.get(skuCode) || {
                    skuName: skuInfo.name,
                    shopName: shopMap.get(skuInfo.shopId) || '未知',
                    revenue: 0, cogs: 0, adSpend: 0, grossProfit: 0, netProfit: 0
                };

                entry.revenue += revenue;
                entry.cogs += cogs;
                entry.adSpend += adSpend;
                entry.grossProfit += grossProfit;
                entry.netProfit += netProfit;

                profitMap.set(skuCode, entry);
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

        const finalKpis: KpiData = {
            totalRevenue, totalCogs, totalAdSpend, totalGrossProfit, totalNetProfit,
            avgNetProfitMargin: totalRevenue > 0 ? totalNetProfit / totalRevenue : 0,
        };

        return { kpis: finalKpis, tableData: finalTableData };
    }, [factTables, skus, shops, startDate, endDate, selectedShopIds]);

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
            const dataForPrompt = [...top5, ...bottom5];

            if(dataForPrompt.length === 0) {
                setAiInsight("没有足够的利润数据进行分析。");
                return;
            }

            const promptData = `...`;
            const prompt = `...`;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setAiInsight(response.text.trim());
        } catch (err) {
            console.error(err);
            setAiInsight("AI诊断失败，请检查API密钥或网络连接。");
        } finally {
            setIsAiLoading(false);
        }
    };

    const formatCurrency = (val: number) => `¥${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;
    const kpiCards = [
        { title: '总收入 (GMV)', value: formatCurrency(kpis.totalRevenue) },
        { title: '总商品成本 (COGS)', value: formatCurrency(kpis.totalCogs) },
        { title: '总广告花费', value: formatCurrency(kpis.totalAdSpend) },
        { title: '总毛利润', value: formatCurrency(kpis.totalGrossProfit) },
        { title: '总净利润', value: formatCurrency(kpis.totalNetProfit) },
        { title: '平均净利润率', value: formatPercent(kpis.avgNetProfitMargin) },
    ];
    
    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn space-y-8">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 利润分析</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">SKU-LEVEL PROFIT INSIGHTS</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-slate-600 shrink-0">时间范围:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" />
                    <span className="text-slate-400">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" />
                </div>
                 <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-slate-600 shrink-0">店铺:</label>
                    <div className="relative" ref={shopDropdownRef}>
                        <button onClick={() => setIsShopDropdownOpen(prev => !prev)} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47] flex justify-between items-center">
                            <span className="truncate">{selectedShopIds.length === 0 ? '全部店铺' : `已选 ${selectedShopIds.length} 个`}</span>
                            <ChevronDown size={16} />
                        </button>
                        {isShopDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col">
                                <div className="flex-1 overflow-y-auto max-h-48 text-sm">
                                    {shops.map((shop: Shop) => (
                                        <label key={shop.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={selectedShopIds.includes(shop.id)} onChange={() => handleToggleShop(shop.id)} className="form-checkbox h-3.5 w-3.5 text-[#70AD47] border-slate-300 rounded focus:ring-[#70AD47]" />
                                            <span className="truncate text-xs">{shop.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-100">
                                    <button onClick={() => setSelectedShopIds([])} className="w-full text-center text-xs font-bold text-rose-500 hover:bg-rose-50 p-1 rounded">清空选择</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpiCards.map(k => <div key={k.title} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100"><h4 className="text-xs font-bold text-slate-400">{k.title}</h4><p className={`text-2xl font-black mt-2 ${k.title.includes('净利润') && kpis.totalNetProfit < 0 ? 'text-rose-500' : 'text-slate-800'}`}>{k.value}</p></div>)}
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-3 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
                     <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left text-slate-500 font-bold">
                                {(['skuName', 'revenue', 'grossProfit', 'adSpend', 'netProfit', 'netProfitMargin'] as const).map(key => (
                                     <th key={key} className="p-2 border-b cursor-pointer" onClick={() => handleSort(key)}>
                                        <div className="flex items-center gap-1">
                                            { {skuName: 'SKU / 店铺', revenue: '收入', grossProfit: '毛利润', adSpend: '广告费', netProfit: '净利润', netProfitMargin: '净利润率'}[key] }
                                            {sortBy.key === key && <ChevronsUpDown size={12} />}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTableData.map(row => (
                                <tr key={row.skuCode} className="hover:bg-slate-50">
                                    <td className="p-2 border-b border-slate-100"><div className="font-bold text-slate-800 truncate" title={row.skuName}>{row.skuName}</div><div className="text-[10px] text-slate-400">{row.shopName}</div></td>
                                    <td className="p-2 border-b border-slate-100 font-mono">{formatCurrency(row.revenue)}</td>
                                    <td className="p-2 border-b border-slate-100 font-mono">{formatCurrency(row.grossProfit)}</td>
                                    <td className="p-2 border-b border-slate-100 font-mono">{formatCurrency(row.adSpend)}</td>
                                    <td className={`p-2 border-b border-slate-100 font-mono font-bold ${row.netProfit < 0 ? 'text-rose-500' : 'text-green-600'}`}>{formatCurrency(row.netProfit)}</td>
                                    <td className={`p-2 border-b border-slate-100 font-mono font-bold ${row.netProfitMargin < 0 ? 'text-rose-500' : 'text-green-600'}`}>{formatPercent(row.netProfitMargin)}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                     {tableData.length === 0 && <div className="py-20 text-center text-slate-400">暂无符合条件的利润数据</div>}
                </div>
                 <div className="col-span-3 lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Bot size={18} className="text-[#70AD47]"/> AI 盈利诊断</h3>
                     <button onClick={handleAiAnalysis} disabled={isAiLoading} className="w-full mb-4 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2">
                        {isAiLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Filter size={16} />}
                        分析当前数据
                    </button>
                    <div className="bg-slate-50/70 rounded-lg p-4 min-h-[200px]">
                        {isAiLoading ? (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400"><LoaderCircle size={24} className="animate-spin mb-2" /><p className="text-xs font-bold">AI正在分析...</p></div>
                        ) : aiInsight ? (
                             <div className="text-xs text-slate-600 space-y-2 leading-relaxed whitespace-pre-wrap">{aiInsight.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center"><Bot size={32} className="mb-2 opacity-50" /><p className="text-xs font-bold">点击按钮，<br/>让AI为您诊断盈利状况</p></div>
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
};
