import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PackagePlus, AlertTriangle, ChevronsRight, X, Warehouse, Truck, Bot, Sparkles, LoaderCircle, Store, LayoutDashboard, ChevronLeft, ChevronRight, PieChart, TrendingUp, Filter, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { ProductSKU, Shop } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

interface AIReplenishmentViewProps {
  skus: ProductSKU[];
  shangzhiData: any[];
  shops: Shop[];
  onUpdateSKU: (sku: ProductSKU) => Promise<boolean> | boolean;
  addToast: (type: 'success' | 'error', title: string, message: string) => void;
}

type ReplenishmentStatus = 'normal' | 'warning' | 'severe';

interface ProcessedSkuData {
    sku: ProductSKU;
    totalStock: number;
    sales7d: number;
    sales15d: number;
    status: ReplenishmentStatus;
    suggestedQty: number;
    daysOfSupply: number;
}

interface ShopStockSummary {
    shopId: string;
    shopName: string;
    totalSkus: number;
    severeCount: number;
    warningCount: number;
    healthyCount: number;
}

const ReplenishmentModal = ({ sku, isOpen, onClose, onConfirm }: { sku: ProductSKU | null, isOpen: boolean, onClose: () => void, onConfirm: (skuToUpdate: ProductSKU, quantities: { warehouse: number, factory: number }) => void }) => {
    const [warehouseQty, setWarehouseQty] = useState(0);
    const [factoryQty, setFactoryQty] = useState(0);

    if (!isOpen || !sku) return null;

    const handleConfirm = () => {
        onConfirm(sku, { warehouse: warehouseQty, factory: factoryQty });
        setWarehouseQty(0);
        setFactoryQty(0);
    };

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 m-4 border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                             <Warehouse className="text-brand" size={24} /> 资产补货同步
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Manual Inventory Infusion</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">正在处理资产</p>
                        <p className="text-xs font-black text-slate-700 truncate" title={sku.name}>{sku.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sku.code}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Warehouse size={12}/> 添加入仓库存</label>
                            <input 
                                type="number" 
                                value={warehouseQty}
                                onChange={e => setWarehouseQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-brand shadow-inner" 
                            />
                            <p className="text-[9px] text-slate-400 font-bold ml-1">当前: {sku.warehouseStock || 0}</p>
                        </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Truck size={12}/> 添加厂直库存</label>
                             <input 
                                type="number" 
                                value={factoryQty}
                                onChange={e => setFactoryQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-brand shadow-inner" 
                            />
                            <p className="text-[9px] text-slate-400 font-bold ml-1">当前: {sku.factoryStock || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-10 pt-8 border-t border-slate-50">
                    <button onClick={onClose} className="px-8 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest">取消</button>
                    <button onClick={handleConfirm} className="px-10 py-3 rounded-xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-xl shadow-brand/20 transition-all active:scale-95 uppercase tracking-widest">确认物理补货</button>
                </div>
            </div>
        </div>
    )
};


export const AISmartReplenishmentView = ({ skus, shangzhiData, shops, onUpdateSKU, addToast }: AIReplenishmentViewProps) => {
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const shopDropdownRef = useRef<HTMLDivElement>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    
    const [replenishingSku, setReplenishingSku] = useState<ProductSKU | null>(null);
    const [aiInsight, setAiInsight] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 10;

    const shopIdToName = useMemo(() => new Map(shops.map(s => [s.id, s.name])), [shops]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
                setIsShopDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const replenishmentData = useMemo((): ProcessedSkuData[] => {
        const salesBySku = new Map<string, { date: string, sales: number }[]>();
        shangzhiData.forEach(row => {
            const skuCode = getSkuIdentifier(row);
            const sales = Number(row.paid_items) || 0;
            if (skuCode && sales > 0) {
                if (!salesBySku.has(skuCode)) salesBySku.set(skuCode, []);
                salesBySku.get(skuCode)!.push({ date: row.date, sales });
            }
        });

        const today = new Date();
        const date7Ago = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];
        const date15Ago = new Date(today.getTime() - 15 * 86400000).toISOString().split('T')[0];
        
        return skus.map(sku => {
            const totalStock = (sku.warehouseStock || 0) + (sku.factoryStock || 0);
            const skuSales = salesBySku.get(sku.code) || [];
            
            let sales7d = 0;
            let sales15d = 0;
            skuSales.forEach(sale => {
                if (sale.date >= date15Ago) {
                    sales15d += sale.sales;
                    if (sale.date >= date7Ago) sales7d += sale.sales;
                }
            });
            
            const dailyAvg = sales15d / 15;
            const monitoredStock = sku.mode === '入仓' ? (sku.warehouseStock || 0) : (sku.mode === '厂直' ? (sku.factoryStock || 0) : totalStock);
            const daysOfSupply = dailyAvg > 0 ? monitoredStock / dailyAvg : 999;

            let status: ReplenishmentStatus = 'normal';
            if (monitoredStock < sales7d || daysOfSupply < 3) status = 'severe';
            else if (monitoredStock < sales15d || daysOfSupply < 7) status = 'warning';

            const suggestedQty = Math.max(0, Math.ceil(dailyAvg * 30) - monitoredStock);

            return { sku, totalStock, sales7d, sales15d, status, suggestedQty, daysOfSupply };
        });
    }, [skus, shangzhiData]);

    const filteredData = useMemo(() => {
        return replenishmentData.filter(item => {
            const shopMatch = selectedShopIds.length === 0 || selectedShopIds.includes(item.sku.shopId);
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;
            return shopMatch && statusMatch;
        }).sort((a, b) => {
            const order = { severe: 0, warning: 1, normal: 2 };
            return order[a.status] - order[b.status];
        });
    }, [replenishmentData, selectedShopIds, statusFilter]);

    const shopSummaries = useMemo((): ShopStockSummary[] => {
        const summaries = new Map<string, ShopStockSummary>();
        
        replenishmentData.forEach(item => {
            const shopId = item.sku.shopId;
            if (!summaries.has(shopId)) {
                summaries.set(shopId, {
                    shopId,
                    shopName: shopIdToName.get(shopId) || '未知店铺',
                    totalSkus: 0,
                    severeCount: 0,
                    warningCount: 0,
                    healthyCount: 0
                });
            }
            const s = summaries.get(shopId)!;
            s.totalSkus++;
            if (item.status === 'severe') s.severeCount++;
            else if (item.status === 'warning') s.warningCount++;
            else s.healthyCount++;
        });

        return Array.from(summaries.values())
            .filter(s => selectedShopIds.length === 0 || selectedShopIds.includes(s.shopId))
            .sort((a, b) => b.severeCount - a.severeCount || b.warningCount - a.warningCount);
    }, [replenishmentData, selectedShopIds, shopIdToName]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return filteredData.slice(start, start + ROWS_PER_PAGE);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);

    const handleReplenishConfirm = async (skuToUpdate: ProductSKU, quantities: { warehouse: number, factory: number }) => {
        const updatedSku = {
            ...skuToUpdate,
            warehouseStock: (skuToUpdate.warehouseStock || 0) + quantities.warehouse,
            factoryStock: (skuToUpdate.factoryStock || 0) + quantities.factory,
        };
        if (await onUpdateSKU(updatedSku)) {
            addToast('success', '补货成功', `SKU [${skuToUpdate.code}] 物理库存已同步。`);
        }
        setReplenishingSku(null);
    };

    const handleAiAudit = async () => {
        setIsAiLoading(true);
        setAiInsight('');
        try {
            const riskItems = filteredData.filter(d => d.status === 'severe').slice(0, 5);
            const riskStr = riskItems.map(d => `SKU:${d.sku.name}, 库存:${d.totalStock}, 15日销:${d.sales15d}`).join('; ');
            const shopStr = shopSummaries.slice(0, 3).map(s => `${s.shopName}(断货:${s.severeCount})`).join('; ');
            
            const prompt = `你是一名顶尖供应链专家。以下是当前库存预警摘要：
            【重点风险店铺】：${shopStr}
            【断货高危SKU】：${riskStr}
            
            任务：
            1. 快速识别最急迫的供需断层；
            2. 针对厂直与入仓模式，给出差异化的补货优先级建议；
            3. 提供2条优化库存周转率的战略建议。
            专业、果断，200字以内。`;

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ text: prompt }] }
                })
            });
            
            const resData = await response.json();
            const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || resData.text;
            setAiInsight(text || "AI 供应链审计报告生成失败。");
        } catch (e) {
            setAiInsight("无法连接 AI 服务。请检查网络或 API_KEY 配置。");
        } finally {
            setIsAiLoading(false);
        }
    };

    const globalKpis = {
        severe: replenishmentData.filter(d => d.status === 'severe').length,
        warning: replenishmentData.filter(d => d.status === 'warning').length,
        totalSkus: replenishmentData.length,
        healthyRate: (replenishmentData.filter(d => d.status === 'normal').length / replenishmentData.length * 100).toFixed(1)
    };

    return (
        <div className="p-8 md:p-10 w-full animate-fadeIn space-y-10">
            <ReplenishmentModal
                isOpen={!!replenishingSku}
                onClose={() => setReplenishingSku(null)}
                sku={replenishingSku}
                onConfirm={handleReplenishConfirm}
            />

            {/* Header - Command Console Style */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">动态供应链链路审计中</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI 供应链决策中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 opacity-60">Demand Forecasting & Intelligent Inventory Replenishment Hub</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-[32px] shadow-xl border border-slate-100">
                    <div className="relative" ref={shopDropdownRef}>
                        <button onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)} className="min-w-[180px] bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 flex justify-between items-center hover:bg-slate-100 transition-all">
                            <span className="truncate">{selectedShopIds.length === 0 ? '全域探测' : `已选 ${selectedShopIds.length} 店铺`}</span>
                            <ChevronDown size={14} className="ml-2 text-slate-400" />
                        </button>
                        {isShopDropdownOpen && (
                            <div className="absolute top-full right-0 w-64 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 p-4 max-h-64 overflow-y-auto no-scrollbar animate-slideIn">
                                {shops.map(shop => (
                                    <label key={shop.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                                        <input type="checkbox" checked={selectedShopIds.includes(shop.id)} onChange={() => { setSelectedShopIds(prev => prev.includes(shop.id) ? prev.filter(id => id !== shop.id) : [...prev, shop.id]); setCurrentPage(1); }} className="hidden" />
                                        {selectedShopIds.includes(shop.id) ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} className="text-slate-300 group-hover:text-slate-400" />}
                                        <span className="text-xs font-bold text-slate-700">{shop.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <select 
                        value={statusFilter} 
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm min-w-[150px]"
                    >
                        <option value="all">全策略状态</option>
                        <option value="severe">断货高危</option>
                        <option value="warning">建议补货</option>
                        <option value="normal">健康周转</option>
                    </select>
                </div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { title: '断货高危 SKU', value: globalKpis.severe, color: 'text-rose-600', bg: 'bg-rose-50', icon: <AlertTriangle size={20}/> },
                    { title: '建议补货 SKU', value: globalKpis.warning, color: 'text-amber-600', bg: 'bg-amber-50', icon: <PackagePlus size={20}/> },
                    { title: '库存健康率', value: `${globalKpis.healthyRate}%`, color: 'text-brand', bg: 'bg-brand/5', icon: <TrendingUp size={20}/> },
                    { title: '监控总资产', value: globalKpis.totalSkus, color: 'text-slate-900', bg: 'bg-slate-50', icon: <LayoutDashboard size={20}/> },
                ].map(k => (
                    <div key={k.title} className={`p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all ${k.bg} group`}>
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{k.title}</h4>
                            <div className={`${k.color} opacity-40 group-hover:opacity-100 transition-opacity`}>{k.icon}</div>
                        </div>
                        <p className={`text-3xl font-black tabular-nums tracking-tighter ${k.color}`}>{k.value}</p>
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
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">店铺周转健康矩阵</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Store-Level Supply Chain Health Matrix</p>
                    </div>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50/50">
                            <tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                <th className="py-4 px-4">店铺名称</th>
                                <th className="py-4 px-2 text-center">覆盖资产数</th>
                                <th className="py-4 px-2 text-center">断货高危 (3D)</th>
                                <th className="py-4 px-2 text-center">建议补货 (7D)</th>
                                <th className="py-4 px-2 text-center">健康周转</th>
                                <th className="py-4 px-4 text-center">健康率</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {shopSummaries.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-300 font-black italic">未检测到多店铺周转数据</td></tr>
                            ) : (
                                shopSummaries.map(s => {
                                    const rate = (s.healthyCount / s.totalSkus * 100).toFixed(1);
                                    return (
                                        <tr key={s.shopId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-4 font-black text-slate-800">{s.shopName}</td>
                                            <td className="py-4 px-2 text-center font-mono font-bold text-slate-700">{s.totalSkus}</td>
                                            <td className="py-4 px-2 text-center font-mono font-black text-rose-500">{s.severeCount}</td>
                                            <td className="py-4 px-2 text-center font-mono font-bold text-amber-500">{s.warningCount}</td>
                                            <td className="py-4 px-2 text-center font-mono text-slate-400">{s.healthyCount}</td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg font-black text-[10px] ${Number(rate) < 70 ? 'bg-rose-50 text-rose-600' : 'bg-brand/10 text-brand'}`}>
                                                    {rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main SKU Table */}
                <div className="lg:col-span-8 bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 min-h-[700px] flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">资产周转穿透明细</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">SKU Level Stock Peneteration Records</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto no-scrollbar">
                        <table className="w-full text-[11px] table-fixed min-w-[900px]">
                            <thead>
                                <tr className="text-left text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                    <th className="pb-5 px-2 w-[220px]">SKU 资产明细</th>
                                    <th className="pb-5 px-2 text-center w-[80px]">经营模式</th>
                                    <th className="pb-5 px-2 text-center w-[160px]">当前库存 (仓/直/合)</th>
                                    <th className="pb-5 px-2 text-center w-[80px]">15日销</th>
                                    <th className="pb-5 px-2 text-center w-[80px]">预计补货</th>
                                    <th className="pb-5 px-2 text-center w-[100px]">周转状态</th>
                                    <th className="pb-5 px-2 text-right w-[60px]">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.length === 0 ? (
                                    <tr><td colSpan={7} className="py-40 text-center text-slate-300 font-black italic">Awaiting Inventory Audit Job</td></tr>
                                ) : (
                                    paginatedData.map(item => (
                                        <tr key={item.sku.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="py-5 px-2">
                                                <div className="font-black text-slate-800 truncate text-xs" title={item.sku.name}>{item.sku.name}</div>
                                                <div className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-tighter opacity-60">{item.sku.code} @ {shopIdToName.get(item.sku.shopId)}</div>
                                            </td>
                                            <td className="py-5 px-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${item.sku.mode === '入仓' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {item.sku.mode || '未定'}
                                                </span>
                                            </td>
                                            <td className="py-5 px-2 text-center font-mono">
                                                <span className={`${item.sku.mode === '入仓' ? 'text-brand font-black' : 'text-slate-400'}`}>{item.sku.warehouseStock || 0}</span> / 
                                                <span className={`${item.sku.mode === '厂直' ? 'text-brand font-black' : 'text-slate-400'} ml-1`}>{item.sku.factoryStock || 0}</span> / 
                                                <span className="font-black text-slate-900 ml-1">{item.totalStock}</span>
                                            </td>
                                            <td className="py-5 px-2 text-center font-mono font-bold text-slate-700">{item.sales15d}</td>
                                            <td className="py-5 px-2 text-center">
                                                {item.suggestedQty > 0 ? (
                                                    <span className="font-black text-brand">+{item.suggestedQty}</span>
                                                ) : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="py-5 px-2 text-center">
                                                {item.status === 'severe' && <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 font-black text-[9px] uppercase">断货高危</span>}
                                                {item.status === 'warning' && <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 font-black text-[9px] uppercase">建议补货</span>}
                                                {item.status === 'normal' && <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-600 font-black text-[9px] uppercase">健康</span>}
                                            </td>
                                            <td className="py-5 px-2 text-right">
                                                <button onClick={() => setReplenishingSku(item.sku)} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-brand hover:bg-brand/10 transition-all">
                                                    <PackagePlus size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredData.length > ROWS_PER_PAGE && (
                        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">展示 {(currentPage-1)*ROWS_PER_PAGE + 1} - {Math.min(currentPage*ROWS_PER_PAGE, filteredData.length)} / 共 {filteredData.length} SKU</span>
                            <div className="flex items-center gap-2">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all bg-slate-50/50 hover:bg-white"><ChevronLeft size={16} /></button>
                                <div className="text-xs font-black text-slate-700 px-4">第 {currentPage} / {totalPages} 页</div>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all bg-slate-50/50 hover:bg-white"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Supply Chain Officer */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[48px] p-10 text-slate-900 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group/ai h-full min-h-[600px]">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3"></div>
                        
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                            <div className="w-14 h-14 rounded-3xl bg-brand flex items-center justify-center shadow-lg border border-white/10 group-hover/ai:rotate-6 transition-transform">
                                <Bot size={28} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">AI 供应链决策官 <Sparkles size={16} className="text-brand animate-pulse" /></h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Neural Supply Chain Auditor</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleAiAudit} 
                            disabled={isAiLoading || filteredData.length === 0} 
                            className="w-full relative z-10 mb-8 py-5 rounded-[24px] bg-brand text-white font-black text-sm shadow-2xl shadow-brand/20 hover:bg-[#5da035] transition-all flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95 uppercase tracking-widest"
                        >
                            {isAiLoading ? <LoaderCircle size={20} className="animate-spin" /> : <TrendingUp size={20} />}
                            启动全链路供需审计
                        </button>

                        <div className="relative z-10 flex-1 bg-slate-50/50 rounded-[32px] p-8 border border-slate-100 overflow-y-auto no-scrollbar shadow-inner">
                            {isAiLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                    <LoaderCircle size={32} className="animate-spin text-brand" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">AI 正在穿透供应链物理流记录...</p>
                                </div>
                            ) : aiInsight ? (
                                <div className="text-sm text-slate-600 leading-loose whitespace-pre-wrap font-medium animate-fadeIn">
                                    {aiInsight}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center opacity-60">
                                    <PieChart size={64} className="mb-6 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-widest">Awaiting Inventory Audit</p>
                                    <p className="text-[10px] mt-2 font-bold max-w-[200px]">点击上方按钮以开启全量供需穿透与 AI 补货策略建议。</p>
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