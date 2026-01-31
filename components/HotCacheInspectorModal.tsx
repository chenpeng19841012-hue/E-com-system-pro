
import React from 'react';
import { X, Zap, Database, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export const HotCacheInspectorModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: any[] }) => {
    if (!isOpen) return null;

    const handleExport = () => {
        const headers = [
            "日期", "SKU编码", "店铺", "浏览量", "访客数", "成交转化率", "加购人数", "成交人数", "成交单量", "成交件数", "成交金额", "三级类目",
            "账户昵称", "展现数", "点击数", "广告花费", "CPC", "ROI", "直接订单行", "直接订单金额", "总订单行", "总订单金额"
        ];

        const dataToExport = data.map(row => [
            row.date,
            row.sku_shop.code,
            row.sku_shop.shopName,
            row.pv,
            row.uv,
            row.paid_conversion_rate,
            row.add_to_cart_users,
            row.paid_users,
            row.paid_orders,
            row.paid_items,
            row.paid_amount,
            row.category_l3,
            row.account_nickname,
            row.impressions,
            row.clicks,
            row.cost,
            row.cpc,
            row.roi,
            row.direct_orders,
            row.direct_order_amount,
            row.total_orders,
            row.total_order_amount
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
        // Set column widths for better readability
        ws['!cols'] = headers.map(h => ({ wch: h.length + 5 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HotCacheData");
        XLSX.writeFile(wb, `HotCache_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const formatMetricValue = (value: number | undefined | null, type: 'currency' | 'percent' | 'float' | 'integer') => {
        const num = value || 0;
        if (type === 'currency') return `¥${Math.round(num).toLocaleString()}`;
        if (type === 'percent') return `${(num * 100).toFixed(2)}%`;
        if (type === 'float') return num.toFixed(2);
        return Math.round(num).toLocaleString();
    };


    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={onClose}>
            <div 
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-7xl p-10 m-4 max-h-[90vh] flex flex-col border border-slate-200" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-8 shrink-0 border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-6">
                         <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Zap size={24} className="text-brand" /> 内存加速缓存 (Hot Cache)
                            </h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                In-Memory Aggregated Data Inspector
                            </p>
                        </div>
                        <button onClick={handleExport} className="px-5 py-2.5 rounded-xl bg-brand text-white font-black text-[10px] hover:bg-[#5da035] shadow-lg shadow-brand/20 transition-all flex items-center gap-2 uppercase tracking-widest">
                            <Download size={14} /> 导出表格
                        </button>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-4">
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                            <Database size={16} className="text-brand"/> 预聚合数据快照 ({data.length} 条)
                        </h4>
                        <div className="overflow-auto max-h-[500px] custom-scrollbar pr-4 -mr-4 rounded-xl">
                             <table className="w-full text-sm table-fixed min-w-[3200px]">
                                <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm z-30">
                                    <tr className="text-slate-400 font-black text-[10px] uppercase tracking-widest text-center">
                                        <th className="py-6 px-4 border-b border-slate-100 w-[120px] sticky left-0 bg-slate-50/80 z-20">日期</th>
                                        <th className="py-6 px-4 border-b border-slate-100 w-[200px] sticky left-[120px] bg-slate-50/80 z-20 text-left">资产归属</th>
                                        <th className="py-6 px-4 border-b border-slate-100">浏览量</th>
                                        <th className="py-6 px-4 border-b border-slate-100">访客数</th>
                                        <th className="py-6 px-4 border-b border-slate-100">转化率</th>
                                        <th className="py-6 px-4 border-b border-slate-100">加购人数</th>
                                        <th className="py-6 px-4 border-b border-slate-100">成交人数</th>
                                        <th className="py-6 px-4 border-b border-slate-100">成交单量</th>
                                        <th className="py-6 px-4 border-b border-slate-100">成交件数</th>
                                        <th className="py-6 px-4 border-b border-slate-100">成交金额</th>
                                        <th className="py-6 px-4 border-b border-slate-100">三级类目</th>
                                        <th className="py-6 px-4 border-b border-slate-100">账户昵称</th>
                                        <th className="py-6 px-4 border-b border-slate-100">展现数</th>
                                        <th className="py-6 px-4 border-b border-slate-100">点击数</th>
                                        <th className="py-6 px-4 border-b border-slate-100">广告花费</th>
                                        <th className="py-6 px-4 border-b border-slate-100">CPC</th>
                                        <th className="py-6 px-4 border-b border-slate-100">ROI</th>
                                        <th className="py-6 px-4 border-b border-slate-100">直接订单行</th>
                                        <th className="py-6 px-4 border-b border-slate-100">直接订单金额</th>
                                        <th className="py-6 px-4 border-b border-slate-100">总订单行</th>
                                        <th className="py-6 px-4 border-b border-slate-100">总订单金额</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.length > 0 ? data.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="py-4 px-4 text-center font-mono text-[11px] sticky left-0 bg-white group-hover:bg-slate-50/80 z-10 transition-none">
                                                <span className="font-black whitespace-nowrap px-2 py-1 rounded-md text-slate-500 bg-slate-100/50">{row.date}</span>
                                            </td>
                                            <td className="py-4 px-4 sticky left-[120px] bg-white group-hover:bg-slate-50/80 z-10 transition-none">
                                                <div className="font-black text-slate-800 truncate text-xs" title={row.sku_shop.code}>{row.sku_shop.code}</div>
                                                <div className="text-[9px] font-bold mt-0.5 truncate uppercase tracking-tighter text-slate-400 opacity-70">{row.sku_shop.shopName}</div>
                                            </td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.pv, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.uv, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-black text-rose-600 text-[11px]">{formatMetricValue(row.paid_conversion_rate, 'percent')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.add_to_cart_users, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.paid_users, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.paid_orders, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.paid_items, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-black text-slate-900 text-[11px]">{formatMetricValue(row.paid_amount, 'currency')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-500 text-[11px] truncate">{row.category_l3 || '-'}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-500 text-[11px] truncate">{row.account_nickname || '-'}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.impressions, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.clicks, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-amber-600 text-[11px]">{formatMetricValue(row.cost, 'currency')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-black text-indigo-600 text-[11px]">{formatMetricValue(row.cpc, 'currency')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-black text-brand text-[11px]">{formatMetricValue(row.roi, 'float')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.direct_orders, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.direct_order_amount, 'currency')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.total_orders, 'integer')}</td>
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">{formatMetricValue(row.total_order_amount, 'currency')}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={21} className="text-center p-20 text-slate-400 font-black text-sm uppercase tracking-widest">内存缓存为空或无统计中的资产</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
