
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Calendar, Bot, FileText, Printer, Download, LoaderCircle, ChevronDown, List, ChevronsUpDown, Edit2, Trash2, X, Plus, Store, CheckSquare, Square } from 'lucide-react';
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

interface ChangeCellProps {
    current: number;
    previous: number;
    isBetterWhenLower?: boolean;
}

const ChangeCell: React.FC<ChangeCellProps> = ({ current, previous, isBetterWhenLower = false }) => {
    if (previous === 0) return <td className="p-2 text-center border border-slate-200 text-slate-400 font-bold">-</td>;
    const change = ((current - previous) / previous);
    const isPositive = isBetterWhenLower ? change < 0 : change > 0;
    const color = change === 0 ? 'text-slate-500' : isPositive ? 'text-green-500' : 'text-red-500';
    return <td className={`p-2 text-center font-black border border-slate-200 ${color}`}>{(change * 100).toFixed(2)}%</td>;
};


const DetailedReportDisplay = ({ reports, mainTitle, aiCommentary, isAiLoading }: { reports: ShopReportData[], mainTitle: string, aiCommentary: string, isAiLoading: boolean }) => {
    const salesMetrics: (keyof ShopReportData['sales'])[] = ['pv', 'uv', 'buyers', 'conversionRate', 'orders', 'ca', 'gmv', 'aov', 'addToCart'];
    const salesHeaders = ['浏览量', '访客数', '成交人数', '转化率', '成交单量', 'CA', 'GMV', '客单价', '加购人数'];
    
    const adMetrics: (keyof ShopReportData['advertising'])[] = ['impressions', 'clicks', 'cost', 'directOrders', 'directOrderAmount', 'totalOrders', 'totalOrderAmount', 'roi', 'cpc'];
    const adHeaders = ['展现量', '点击数', '广告消耗', '直接单量', '直接金额', '总单量', '总金额', 'ROI', 'CPC'];

    return (
        <div className="p-6 animate-fadeIn bg-white rounded-2xl shadow-sm border border-slate-100 mt-8">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">{mainTitle}</h2>
                    <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Operation Report Dashboard</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Printer size={14}/> 打印预览</button>
                </div>
            </div>

            {/* AI Commentary Section */}
            <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3">
                    <Bot size={18} className="text-[#70AD47]" />
                    AI 运营综述与决策建议
                </h3>
                {isAiLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 py-4 animate-pulse">
                        <LoaderCircle size={16} className="animate-spin" />
                        <span className="text-xs font-bold">AI正在深入解析报表数据...</span>
                    </div>
                ) : (
                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                        {aiCommentary || "暂无AI点评。点击“生成报表”以启动AI分析。"}
                    </div>
                )}
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px] min-w-[1200px]">
                    <tbody>
                        {reports.map((report) => (
                            <React.Fragment key={report.shopId}>
                                {/* Shop Header */}
                                <tr>
                                    <td colSpan={12} className="p-3 bg-slate-100 font-black text-slate-800 border border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Store size={14} className="text-[#70AD47]" />
                                            {report.shopName} (数据详情)
                                        </div>
                                    </td>
                                </tr>

                                {/* Sales Section */}
                                <tr className="bg-slate-50 font-bold text-slate-500">
                                    <td className="p-2 border border-slate-200 text-center w-16" rowSpan={4}>销售指标</td>
                                    <td className="p-2 border border-slate-200 text-center w-24">周期对比</td>
                                    {salesHeaders.map(h => <td key={h} className="p-2 border border-slate-200 text-center">{h}</td>)}
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-700">{report.timeframes.current}</td>
                                    {salesMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center font-black text-slate-800">{formatNumber(report.sales[key].current, key === 'gmv' || key === 'aov' ? 'currency' : key === 'conversionRate' ? 'percent' : 'int')}</td>)}
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-400">{report.timeframes.previous}</td>
                                    {salesMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center text-slate-500">{formatNumber(report.sales[key].previous, key === 'gmv' || key === 'aov' ? 'currency' : key === 'conversionRate' ? 'percent' : 'int')}</td>)}
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-500">周期环比</td>
                                    {salesMetrics.map(metricKey => <ChangeCell key={metricKey} current={report.sales[metricKey].current} previous={report.sales[metricKey].previous} />)}
                                </tr>

                                {/* Spacer */}
                                <tr className="h-4"></tr>

                                {/* Ad Section */}
                                <tr className="bg-slate-50 font-bold text-slate-500">
                                    <td className="p-2 border border-slate-200 text-center w-16" rowSpan={4}>投放指标</td>
                                    <td className="p-2 border border-slate-200 text-center w-24">周期对比</td>
                                    {adHeaders.map(h => <td key={h} className="p-2 border border-slate-200 text-center">{h}</td>)}
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-700">{report.timeframes.current}</td>
                                    {adMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center font-black text-slate-800">{formatNumber(report.advertising[key].current, key.includes('cost') || key.includes('Amount') ? 'currency' : ['roi', 'cpc'].includes(key) ? 'float' : 'int')}</td>)}
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-400">{report.timeframes.previous}</td>
                                    {adMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center text-slate-500">{formatNumber(report.advertising[key].previous, key.includes('cost') || key.includes('Amount') ? 'currency' : ['roi', 'cpc'].includes(key) ? 'float' : 'int')}</td>)}
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-500">周期环比</td>
                                    {adMetrics.map(metricKey => <ChangeCell key={metricKey} current={report.advertising[metricKey].current} previous={report.advertising[metricKey].previous} isBetterWhenLower={metricKey === 'cost' || metricKey === 'cpc'} />)}
                                </tr>
                                
                                {/* Padding for next shop */}
                                <tr className="h-12 border-none"></tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
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
            
            const mainTitle = `${currentStart} 至 ${currentEnd} 运营报表`;

            // Filter context
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
                    // 获取该店铺在此时间段物理表中出现的所有 SKU（用于补充未录入资产库的 SKU）
                    const physicalShopSkuCodes = new Set<string>();
                    factTables.shangzhi.forEach((r: any) => {
                        if (r.shop_name === shop.name) {
                            const code = getSkuIdentifier(r);
                            if (code) physicalShopSkuCodes.add(code);
                        }
                    });

                    // 最终该店铺参与计算的 SKU 全集
                    const combinedShopSkuCodes = new Set([...shopSkuCodesFromAssets, ...physicalShopSkuCodes]);

                    const szData = factTables.shangzhi.filter((r: any) => {
                        const code = getSkuIdentifier(r);
                        // 归属判断：资产库匹配 OR 物理名称匹配
                        const isShop = combinedShopSkuCodes.has(code || '') || r.shop_name === shop.name;
                        // 清单限制（如果有）
                        const isListMatch = skuCodesFromLists.size === 0 || skuCodesFromLists.has(code || '');
                        return r.date >= start && r.date <= end && isShop && isListMatch;
                    });

                    const jztData = factTables.jingzhuntong.filter((r: any) => {
                        const code = getSkuIdentifier(r);
                        // 广告表同样使用穿透后的 SKU 全集进行匹配
                        const isShop = combinedShopSkuCodes.has(code || '') || r.shop_name === shop.name;
                        const isListMatch = skuCodesFromLists.size === 0 || skuCodesFromLists.has(code || '');
                        return r.date >= start && r.date <= end && isShop && isListMatch;
                    });

                    const agg = {
                        pv: szData.reduce((s: any, r: any) => s + (Number(r.pv) || 0), 0),
                        uv: szData.reduce((s: any, r: any) => s + (Number(r.uv) || 0), 0),
                        // 核心优化：成交人数口径对齐（自营 paid_users vs POP paid_customers）
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

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gemini-3-flash-preview', contents: prompt })
            });
            const resData = await response.json();
            setAiCommentary(resData.candidates?.[0]?.content?.parts?.[0]?.text || "AI分析生成失败。");
        } catch (e) {
            setAiCommentary("无法连接AI服务进行诊断分析。");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">运营报表中心</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">Automated Performance Reports</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-wrap items-end gap-4">
                {/* Date Selection */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">设定时间范围</label>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#70AD47]" />
                        <span className="text-slate-300 font-bold">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#70AD47]" />
                    </div>
                </div>

                {/* Shop Filter */}
                <div className="space-y-1 relative" ref={shopDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase">店铺范围</label>
                    <button onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 flex justify-between items-center shadow-sm">
                        <span className="truncate">{selectedShopIds.length === 0 ? '全部店铺' : `已选 ${selectedShopIds.length} 个`}</span>
                        <ChevronDown size={16} className="text-slate-400" />
                    </button>
                    {isShopDropdownOpen && (
                        <div className="absolute top-full left-0 w-64 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 max-h-60 overflow-y-auto">
                            {shops.map(shop => (
                                <label key={shop.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedShopIds.includes(shop.id)} 
                                        onChange={() => setSelectedShopIds(prev => prev.includes(shop.id) ? prev.filter(id => id !== shop.id) : [...prev, shop.id])}
                                        className="hidden"
                                    />
                                    {selectedShopIds.includes(shop.id) ? <CheckSquare size={16} className="text-[#70AD47]" /> : <Square size={16} className="text-slate-300" />}
                                    <span className="text-xs font-bold text-slate-700">{shop.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* SKU List Filter */}
                <div className="space-y-1 relative" ref={listDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase">SKU清单限制</label>
                    <button onClick={() => setIsListDropdownOpen(!isListDropdownOpen)} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 flex justify-between items-center shadow-sm">
                        <span className="truncate">{selectedListIds.length === 0 ? '不限清单' : `已选 ${selectedListIds.length} 个`}</span>
                        <ChevronDown size={16} className="text-slate-400" />
                    </button>
                    {isListDropdownOpen && (
                        <div className="absolute top-full left-0 w-64 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 max-h-60 overflow-y-auto">
                            {skuLists.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 font-bold">暂无可用清单</div>
                            ) : skuLists.map(list => (
                                <label key={list.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedListIds.includes(list.id)} 
                                        onChange={() => setSelectedListIds(prev => prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id])}
                                        className="hidden"
                                    />
                                    {selectedListIds.includes(list.id) ? <CheckSquare size={16} className="text-[#70AD47]" /> : <Square size={16} className="text-slate-300" />}
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
                    className="bg-[#70AD47] text-white px-8 py-2 rounded-lg font-black text-sm shadow-lg shadow-[#70AD47]/20 hover:bg-[#5da035] transition-all active:scale-95 disabled:bg-slate-200 disabled:shadow-none"
                >
                    {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : '生成对比报表'}
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
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-20 mt-8 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                        <FileText size={64} className="mb-6 opacity-20" />
                        <h3 className="text-xl font-black text-slate-400">报表已就绪</h3>
                        <p className="text-sm mt-2 font-bold max-w-sm">请在上方设定自定义时间范围与筛选参数，点击“生成对比报表”开启多维数据审计。</p>
                    </div>
                </div>
            )}
        </div>
    );
};
