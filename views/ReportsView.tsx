import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Calendar, Bot, FileText, Printer, Download, LoaderCircle, ChevronDown, List, ChevronsUpDown, Edit2, Trash2, X, Plus, Store, CheckSquare, Square, Sparkles, DatabaseZap, Search, Filter } from 'lucide-react';
import { SkuList, ProductSKU, Shop } from '../lib/types';
import { ConfirmModal } from '../components/ConfirmModal';
import { getSkuIdentifier } from '../lib/helpers';

// --- Detailed Report Components ---

type Metric = {
  current: number;
  previous: number;
};

type ShopReportData = {
  shopId: string;
  shopName: string;
  sales: {
    pv: Metric;
    uv: Metric;
    buyers: Metric;
    conversionRate: Metric;
    orders: Metric;
    ca: Metric;
    gmv: Metric;
    aov: Metric;
    addToCart: Metric;
  };
  advertising: {
    impressions: Metric;
    clicks: Metric;
    cost: Metric;
    directOrders: Metric;
    directOrderAmount: Metric;
    totalOrders: Metric;
    totalOrderAmount: Metric;
    roi: Metric;
    cpc: Metric;
  };
  timeframes: {
    current: string;
    previous: string;
  };
};

const formatNumber = (val: number, type: 'int' | 'float' | 'currency' | 'percent' = 'int') => {
    if (isNaN(val) || val === null || val === undefined) return '-';
    switch (type) {
        case 'currency': return `¥${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        case 'float': return val.toFixed(2);
        case 'percent': return `${(val * 100).toFixed(2)}%`;
        case 'int': return val.toLocaleString('en-US');
        default: return val.toString();
    }
};

const ChangeBadge = ({ current, previous, isBetterWhenLower = false }: { current: number, previous: number, isBetterWhenLower?: boolean }) => {
    if (previous === 0) return <span className="text-slate-300 text-[10px] font-bold">-</span>;
    const change = ((current - previous) / previous);
    const isPositive = change >= 0;
    const isGood = isBetterWhenLower ? !isPositive : isPositive;
    const color = change === 0 ? 'text-slate-400 bg-slate-50' : isGood ? 'text-green-600 bg-green-50' : 'text-rose-600 bg-rose-50';
    return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${color}`}>
            {isPositive ? '+' : ''}{(change * 100).toFixed(1)}%
        </span>
    );
};

const DetailedReportDisplay = ({ reports, mainTitle, aiCommentary, isAiLoading }: { reports: ShopReportData[], mainTitle: string, aiCommentary: string, isAiLoading: boolean }) => {
    const salesMetrics: (keyof ShopReportData['sales'])[] = ['pv', 'uv', 'buyers', 'conversionRate', 'orders', 'ca', 'gmv', 'aov', 'addToCart'];
    const salesHeaders = ['浏览量', '访客数', '成交人数', '转化率', '成交单量', 'CA', 'GMV', '客单价', '加购人数'];
    
    const adMetrics: (keyof ShopReportData['advertising'])[] = ['impressions', 'clicks', 'cost', 'directOrders', 'directOrderAmount', 'totalOrders', 'totalOrderAmount', 'roi', 'cpc'];
    const adHeaders = ['展现量', '点击数', '广告消耗', '直接单量', '直接金额', '总单量', '总金额', 'ROI', 'CPC'];

    return (
        <div className="space-y-10 animate-fadeIn">
            {/* AI Strategic Commentary Section - Dashboard Style */}
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 relative overflow-hidden group/ai">
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3"></div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-brand flex items-center justify-center shadow-lg border border-white/10 group-hover/ai:rotate-6 transition-transform duration-500">
                            <Bot size={28} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">AI 战略综述与决策建议 <Sparkles size={16} className="text-brand animate-pulse" /></h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Neural Decision Intelligence Hub</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] hidden md:block">Audit Mode: Fully Automated</span>
                         <button onClick={() => window.print()} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-slate-100 shadow-sm"><Printer size={20}/></button>
                    </div>
                </div>

                <div className="relative z-10 min-h-[120px] bg-slate-50/50 rounded-[32px] p-8 border border-slate-100">
                    {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <LoaderCircle size={32} className="animate-spin text-brand" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">正在穿透物理记录生成战略分析...</p>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                            {aiCommentary || "暂无AI点评。点击“生成对比报表”以启动全链路 AI 审计。"}
                        </div>
                    )}
                </div>
            </div>

            {/* Shop Reports List */}
            {reports.map((report) => (
                <div key={report.shopId} className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 overflow-hidden group/shop">
                    <div className="flex items-center justify-between mb-10 border-b border-slate-50 pb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-brand shadow-sm group-hover/shop:scale-105 transition-transform">
                                <Store size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{report.shopName}</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Multi-Dimensional Audit Dataset</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">主对比周期</p>
                             <div className="bg-slate-100 px-4 py-1.5 rounded-xl text-[11px] font-black text-slate-600 border border-slate-200 shadow-inner">{report.timeframes.current}</div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {/* Sales Table Section */}
                        <div className="overflow-x-auto no-scrollbar">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-3 bg-brand rounded-full"></div> 销售核心指标审计
                            </h4>
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 rounded-2xl">
                                    <tr className="text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                                        <th className="py-4 px-4 w-32">对比维度</th>
                                        {salesHeaders.map(h => <th key={h} className="py-4 px-2 text-center">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-sans">
                                    <tr className="group/row">
                                        <td className="py-5 px-4 font-black text-xs text-slate-500 uppercase tracking-tight">本期数值</td>
                                        {salesMetrics.map(key => (
                                            <td key={key} className={`py-5 px-2 text-center font-black tabular-nums ${key==='gmv' ? 'text-lg text-slate-900' : 'text-xs text-slate-700'}`}>
                                                {formatNumber(report.sales[key].current, key === 'gmv' || key === 'aov' ? 'currency' : key === 'conversionRate' ? 'percent' : 'int')}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-50/30">
                                        <td className="py-4 px-4 font-bold text-[10px] text-slate-400 uppercase tracking-tight">上期参考</td>
                                        {salesMetrics.map(key => (
                                            <td key={key} className="py-4 px-2 text-center font-bold text-[10px] text-slate-400 tabular-nums">
                                                {formatNumber(report.sales[key].previous, key === 'gmv' || key === 'aov' ? 'currency' : key === 'conversionRate' ? 'percent' : 'int')}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-4 font-black text-[10px] text-slate-400 uppercase tracking-tight">周期环比</td>
                                        {salesMetrics.map(key => (
                                            <td key={key} className="py-4 px-2 text-center">
                                                <ChangeBadge current={report.sales[key].current} previous={report.sales[key].previous} />
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Ad Table Section */}
                        <div className="overflow-x-auto no-scrollbar pt-6 border-t border-slate-50">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-3 bg-blue-500 rounded-full"></div> 广告投放效能审计
                            </h4>
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 rounded-2xl">
                                    <tr className="text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                                        <th className="py-4 px-4 w-32">对比维度</th>
                                        {adHeaders.map(h => <th key={h} className="py-4 px-2 text-center">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-sans">
                                    <tr className="group/row">
                                        <td className="py-5 px-4 font-black text-xs text-slate-500 uppercase tracking-tight">本期数值</td>
                                        {adMetrics.map(key => (
                                            <td key={key} className={`py-5 px-2 text-center font-black tabular-nums ${key==='roi' ? 'text-lg text-brand' : key==='cost' ? 'text-slate-900 text-sm' : 'text-xs text-slate-700'}`}>
                                                {formatNumber(report.advertising[key].current, key.includes('cost') || key.includes('Amount') ? 'currency' : ['roi', 'cpc'].includes(key) ? 'float' : 'int')}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-50/30">
                                        <td className="py-4 px-4 font-bold text-[10px] text-slate-400 uppercase tracking-tight">上期参考</td>
                                        {adMetrics.map(key => (
                                            <td key={key} className="py-4 px-2 text-center font-bold text-[10px] text-slate-400 tabular-nums">
                                                {formatNumber(report.advertising[key].previous, key.includes('cost') || key.includes('Amount') ? 'currency' : ['roi', 'cpc'].includes(key) ? 'float' : 'int')}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-4 font-black text-[10px] text-slate-400 uppercase tracking-tight">周期环比</td>
                                        {adMetrics.map(key => (
                                            <td key={key} className="py-4 px-2 text-center">
                                                <ChangeBadge current={report.advertising[key].current} previous={report.advertising[key].previous} isBetterWhenLower={key === 'cost' || key === 'cpc'} />
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Main Reports View ---

interface ReportsViewProps {
    factTables: any; 
    skus: ProductSKU[]; 
    shops: Shop[]; 
    skuLists: SkuList[];
    onAddNewSkuList: (listData: Omit<SkuList, 'id'>) => Promise<boolean>;
    onUpdateSkuList: (listData: SkuList) => Promise<boolean>;
    onDeleteSkuList: (listId: string) => void;
    addToast: (type: 'success' | 'error', title: string, message: string) => void;
}

export const ReportsView = ({ factTables, skus, shops, skuLists, onAddNewSkuList, onUpdateSkuList, onDeleteSkuList, addToast }: ReportsViewProps) => {
    const [reportData, setReportData] = useState<ShopReportData[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiCommentary, setAiCommentary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // Time Range Selection
    const [startDate, setStartDate] = useState(new Date(Date.now() - 6*86400000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
    
    const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    
    const listDropdownRef = useRef<HTMLDivElement>(null);
    const shopDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (listDropdownRef.current && !listDropdownRef.current.contains(event.target as Node)) setIsListDropdownOpen(false);
            if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) setIsShopDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const generateReport = async () => {
        if (!startDate || !endDate) {
            addToast('error', '参数缺失', '请选择完整的时间范围。');
            return;
        }

        setIsLoading(true);
        setReportData(null);
        setAiCommentary('');
        
        try {
            const currentStart = startDate;
            const currentEnd = endDate;
            
            const sDate = new Date(startDate);
            const eDate = new Date(endDate);
            const diffDays = Math.ceil((eDate.getTime() - sDate.getTime()) / 86400000) + 1;
            
            const prevEndDateObj = new Date(sDate);
            prevEndDateObj.setDate(prevEndDateObj.getDate() - 1);
            const prevStartDateObj = new Date(prevEndDateObj);
            prevStartDateObj.setDate(prevStartDateObj.getDate() - (diffDays - 1));
            
            const prevStart = prevStartDateObj.toISOString().split('T')[0];
            const prevEnd = prevEndDateObj.toISOString().split('T')[0];

            const enabledSkuCodes = new Set(skus.filter(s => s.isStatisticsEnabled).map(s => s.code));
            const skuCodesFromLists = new Set<string>();
            selectedListIds.forEach(id => {
                const list = skuLists.find(l => l.id === id);
                if (list) list.skuCodes.forEach(c => skuCodesFromLists.add(c));
            });

            const targetShops = selectedShopIds.length > 0 
                ? shops.filter(s => selectedShopIds.includes(s.id))
                : shops;

            const finalReportData: ShopReportData[] = targetShops.map(shop => {
                const shopSkuCodesFromAssets = new Set(skus.filter(s => s.shopId === shop.id).map(s => s.code));
                
                const calculateForPeriod = (start: string, end: string) => {
                    const physicalShopSkuCodes = new Set<string>();
                    factTables.shangzhi.forEach((r: any) => {
                        if (r.shop_name === shop.name) {
                            const code = getSkuIdentifier(r);
                            if (code) physicalShopSkuCodes.add(code);
                        }
                    });
                    const combinedShopSkuCodes = new Set([...shopSkuCodesFromAssets, ...physicalShopSkuCodes]);

                    const szData = factTables.shangzhi.filter((r: any) => {
                        const code = getSkuIdentifier(r);
                        if (!code || !enabledSkuCodes.has(code)) return false;
                        const isShop = combinedShopSkuCodes.has(code) || r.shop_name === shop.name;
                        const isListMatch = skuCodesFromLists.size === 0 || skuCodesFromLists.has(code);
                        return r.date >= start && r.date <= end && isShop && isListMatch;
                    });

                    const jztData = factTables.jingzhuntong.filter((r: any) => {
                        const code = getSkuIdentifier(r);
                        if (!code || !enabledSkuCodes.has(code)) return false;
                        const isShop = combinedShopSkuCodes.has(code) || r.shop_name === shop.name;
                        const isListMatch = skuCodesFromLists.size === 0 || skuCodesFromLists.has(code);
                        return r.date >= start && r.date <= end && isShop && isListMatch;
                    });

                    const agg = {
                        pv: szData.reduce((s: any, r: any) => s + (Number(r.pv) || 0), 0),
                        uv: szData.reduce((s: any, r: any) => s + (Number(r.uv) || 0), 0),
                        buyers: szData.reduce((s: any, r: any) => s + (Number(r.paid_users) || Number(r.paid_customers) || 0), 0),
                        orders: szData.reduce((s: any, r: any) => s + (Number(r.paid_orders) || 0), 0),
                        ca: szData.reduce((s: any, r: any) => s + (Number(r.paid_items) || 0), 0),
                        gmv: szData.reduce((s: any, r: any) => s + (Number(r.paid_amount) || 0), 0),
                        addToCart: szData.reduce((s: any, r: any) => s + (Number(r.add_to_cart_users) || 0), 0),
                        impressions: jztData.reduce((s: any, r: any) => s + (Number(r.impressions) || 0), 0),
                        clicks: jztData.reduce((s: any, r: any) => s + (Number(r.clicks) || 0), 0),
                        cost: jztData.reduce((s: any, r: any) => s + (Number(r.cost) || 0), 0),
                        directOrders: jztData.reduce((s: any, r: any) => s + (Number(r.direct_orders) || 0), 0),
                        directOrderAmount: jztData.reduce((s: any, r: any) => s + (Number(r.direct_order_amount) || 0), 0),
                        totalOrders: jztData.reduce((s: any, r: any) => s + (Number(r.total_orders) || 0), 0),
                        totalOrderAmount: jztData.reduce((s: any, r: any) => s + (Number(r.total_order_amount) || 0), 0),
                    };

                    return {
                        ...agg,
                        conversionRate: agg.uv > 0 ? agg.buyers / agg.uv : 0,
                        aov: agg.buyers > 0 ? agg.gmv / agg.buyers : 0,
                        roi: agg.cost > 0 ? agg.totalOrderAmount / agg.cost : 0,
                        cpc: agg.clicks > 0 ? agg.cost / agg.clicks : 0
                    };
                };

                const current = calculateForPeriod(currentStart, currentEnd);
                const previous = calculateForPeriod(prevStart, prevEnd);

                return {
                    shopId: shop.id,
                    shopName: shop.name,
                    timeframes: { current: currentStart === currentEnd ? currentStart : `${currentStart}~${currentEnd}`, previous: prevStart === prevEnd ? prevStart : `${prevStart}~${prevEnd}` },
                    sales: {
                        pv: { current: current.pv, previous: previous.pv },
                        uv: { current: current.uv, previous: previous.uv },
                        buyers: { current: current.buyers, previous: previous.buyers },
                        conversionRate: { current: current.conversionRate, previous: previous.conversionRate },
                        orders: { current: current.orders, previous: previous.orders },
                        ca: { current: current.ca, previous: previous.ca },
                        gmv: { current: current.gmv, previous: previous.gmv },
                        aov: { current: current.aov, previous: previous.aov },
                        addToCart: { current: current.addToCart, previous: previous.addToCart },
                    },
                    advertising: {
                        impressions: { current: current.impressions, previous: previous.impressions },
                        clicks: { current: current.clicks, previous: previous.clicks },
                        cost: { current: current.cost, previous: previous.cost },
                        directOrders: { current: current.directOrders, previous: previous.directOrders },
                        directOrderAmount: { current: current.directOrderAmount, previous: previous.directOrderAmount },
                        totalOrders: { current: current.totalOrders, previous: previous.totalOrders },
                        totalOrderAmount: { current: current.totalOrderAmount, previous: previous.totalOrderAmount },
                        roi: { current: current.roi, previous: previous.roi },
                        cpc: { current: current.cpc, previous: previous.cpc },
                    }
                };
            });

            const mainTitle = startDate === endDate ? startDate : `${startDate} 至 ${endDate} 运营对比审计报表`;
            setReportData(finalReportData);
            fetchAiCommentary(finalReportData, mainTitle);

        } catch (err) {
            console.error(err);
            addToast('error', '生成失败', '计算报表数据时发生错误。');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAiCommentary = async (data: ShopReportData[], title: string) => {
        setIsAiLoading(true);
        try {
            const summary = data.map(s => `店铺:${s.shopName}, GMV:${s.sales.gmv.current}, 环比:${((s.sales.gmv.current - s.sales.gmv.previous)/s.sales.gmv.previous*100).toFixed(2)}%, ROI:${s.advertising.roi.current.toFixed(2)}`).join('; ');
            const prompt = `你是一名电商运营总监，这是最新的[${title}]报表数据摘要：${summary}。请根据这些核心指标，提供一段简明扼要的运营综述。要求：1. 指出表现最好和最差的店铺或环节；2. 分析ROI异动的潜在原因；3. 给出3条具体的下一步行动建议。语气要专业、直接且有洞察力。字数控制在300字以内。`;

            // 使用项目内部接口以确保环境变量读取的稳定性
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
            
            setAiCommentary(text || "AI分析生成失败。");
        } catch (e) {
            console.error("AI Fetch Error:", e);
            setAiCommentary("无法连接AI服务进行诊断分析。请检查您的网络连接或确认 API_KEY 已在本地环境变量中正确配置。");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="p-8 md:p-10 w-full animate-fadeIn space-y-10">
            {/* Header - Aligned with Dashboard */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">物理层自动化审计引擎中</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">运营报表中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 opacity-60">Automated Multi-Dimensional Performance Audit & Comparison</p>
                </div>
            </div>

            {/* Filter Panel - Removed overflow-hidden to allow dropdowns to show */}
            <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 p-10 relative flex flex-wrap items-end gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                {/* Date Selection */}
                <div className="space-y-2 min-w-[280px] relative z-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">时间范围</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-inner focus-within:border-brand transition-all">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent border-none text-[11px] font-black text-slate-700 px-2 outline-none" />
                        <span className="text-slate-300 font-black">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent border-none text-[11px] font-black text-slate-700 px-2 outline-none" />
                    </div>
                </div>

                {/* Shop Filter */}
                <div className="space-y-2 relative z-30" ref={shopDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">店铺</label>
                    <button onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)} className="w-48 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 flex justify-between items-center shadow-sm hover:bg-slate-100 transition-all">
                        <span className="truncate">{selectedShopIds.length === 0 ? '全域探测' : `已选 ${selectedShopIds.length} 个`}</span>
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>
                    {isShopDropdownOpen && (
                        <div className="absolute top-full left-0 w-64 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl z-[100] p-4 max-h-64 overflow-y-auto no-scrollbar animate-slideIn">
                            {shops.map(shop => (
                                <label key={shop.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                                    <input type="checkbox" checked={selectedShopIds.includes(shop.id)} onChange={() => setSelectedShopIds(prev => prev.includes(shop.id) ? prev.filter(id => id !== shop.id) : [...prev, shop.id])} className="hidden" />
                                    {selectedShopIds.includes(shop.id) ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} className="text-slate-300 group-hover:text-slate-400" />}
                                    <span className="text-xs font-bold text-slate-700">{shop.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* SKU List Filter */}
                <div className="space-y-2 relative z-30" ref={listDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分层清单</label>
                    <button onClick={() => setIsListDropdownOpen(!isListDropdownOpen)} className="w-48 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 flex justify-between items-center shadow-sm hover:bg-slate-100 transition-all">
                        <span className="truncate">{selectedListIds.length === 0 ? '不限清单' : `已选 ${selectedListIds.length} 个`}</span>
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>
                    {isListDropdownOpen && (
                        <div className="absolute top-full left-0 w-64 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl z-[100] p-4 max-h-64 overflow-y-auto no-scrollbar animate-slideIn">
                            {skuLists.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest italic opacity-50">无可用清单</div>
                            ) : skuLists.map(list => (
                                <label key={list.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                                    <input type="checkbox" checked={selectedListIds.includes(list.id)} onChange={() => setSelectedListIds(prev => prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id])} className="hidden" />
                                    {selectedListIds.includes(list.id) ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} className="text-slate-300 group-hover:text-slate-400" />}
                                    <span className="text-xs font-bold text-slate-700">{list.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1"></div>

                <button 
                    onClick={generateReport}
                    disabled={isLoading}
                    className="relative z-10 bg-brand text-white px-10 py-4 rounded-[24px] font-black text-sm shadow-2xl shadow-brand/30 hover:bg-[#5da035] transition-all active:scale-95 disabled:bg-slate-200 disabled:shadow-none flex items-center gap-3 uppercase tracking-widest"
                >
                    {isLoading ? <LoaderCircle size={20} className="animate-spin" /> : <DatabaseZap size={20} />}
                    生成对比审计报表
                </button>
            </div>

            {reportData ? (
                <DetailedReportDisplay 
                    reports={reportData} 
                    mainTitle={`${startDate} 至 ${endDate} 运营对比报表`}
                    aiCommentary={aiCommentary}
                    isAiLoading={isAiLoading}
                />
            ) : (
                <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 p-32 text-center group">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-6">
                        <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                             <FileText size={48} className="opacity-10 group-hover:opacity-20 transition-opacity" />
                        </div>
                        <div className="space-y-2">
                             <h3 className="text-xl font-black text-slate-400 uppercase tracking-[0.2em]">物理层引擎待命中</h3>
                             <p className="text-xs mt-2 font-bold max-w-sm mx-auto text-slate-400 leading-relaxed">请在上方设定自定义审计周期与维度参数，点击按钮开启多源数据穿透与 AI 战略诊断。</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};