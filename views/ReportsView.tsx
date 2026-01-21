
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Calendar, Bot, FileText, Printer, Download, LoaderCircle, ChevronDown, List, ChevronsUpDown, Edit2, Trash2, X, Plus, Store } from 'lucide-react';
import { ReportSubView, SkuList, ProductSKU, Shop } from '../lib/types';
import { ConfirmModal } from '../components/ConfirmModal';

const SkuListFormModal = ({ isOpen, onClose, onConfirm, listToEdit }: { isOpen: boolean, onClose: () => void, onConfirm: (data: Omit<SkuList, 'id'> | SkuList) => boolean, listToEdit?: SkuList | null }) => {
    const [name, setName] = useState('');
    const [skuCodes, setSkuCodes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(listToEdit?.name || '');
            setSkuCodes(listToEdit?.skuCodes.join('\n') || '');
            setError('');
        }
    }, [isOpen, listToEdit]);

    const handleConfirm = () => {
        if (!name.trim()) {
            setError('清单名称不能为空。');
            return;
        }
        const parsedSkuCodes = skuCodes.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        const payload = {
            id: listToEdit?.id,
            name: name.trim(),
            skuCodes: parsedSkuCodes,
        };
        if (onConfirm(payload)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 m-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{listToEdit ? '编辑SKU清单' : '创建新SKU清单'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">清单名称 *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">SKU 编码</label>
                        <textarea
                            value={skuCodes}
                            onChange={e => setSkuCodes(e.target.value)}
                            placeholder="每行一个SKU，或用逗号分隔"
                            className="w-full h-48 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-none font-mono"
                        />
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-4 bg-rose-50 p-3 rounded-lg">{error}</p>}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">取消</button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20">{listToEdit ? '保存更改' : '确认创建'}</button>
                </div>
            </div>
        </div>
    );
};

// --- New Detailed Report Components ---

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

const ChangeCell = ({ current, previous, isBetterWhenLower = false }: { current: number, previous: number, isBetterWhenLower?: boolean }) => {
    if (previous === 0) return <td className="p-2 text-center">-</td>;
    const change = ((current - previous) / previous);
    const isPositive = isBetterWhenLower ? change < 0 : change > 0;
    const color = change === 0 ? 'text-slate-500' : isPositive ? 'text-green-500' : 'text-red-500';
    return <td className={`p-2 text-center font-semibold ${color}`}>{(change * 100).toFixed(2)}%</td>;
};


const DetailedReportDisplay = ({ reports, mainTitle }: { reports: ShopReportData[], mainTitle: string }) => {
    const salesMetrics: (keyof ShopReportData['sales'])[] = ['pv', 'uv', 'buyers', 'conversionRate', 'orders', 'ca', 'gmv', 'aov', 'addToCart'];
    const salesHeaders = ['浏览数', '访客数', '成交人数', '成交转化率', '成交单量', 'CA', 'GMV', '成交客单价', '加购人数'];
    
    const adMetrics: (keyof ShopReportData['advertising'])[] = ['impressions', 'clicks', 'cost', 'directOrders', 'directOrderAmount', 'totalOrders', 'totalOrderAmount', 'roi', 'cpc'];
    const adHeaders = ['展现数', '点击数', '总费用', '直接订单行', '直接订单金额', '总订单行', '总订单金额', 'ROI', 'CPC'];

    return (
        <div className="p-6 animate-fadeIn">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">{mainTitle}</h2>
                    <p className="text-xs text-slate-400 mt-1">生成于: {new Date().toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Printer size={14}/> 打印</button>
                </div>
            </div>
            
            <table className="w-full border-collapse text-xs">
                <tbody>
                    {reports.map((report) => (
                        <React.Fragment key={report.shopId}>
                            <tr className="bg-slate-50 font-bold text-slate-700">
                                <td className="p-2 border border-slate-200 text-center" rowSpan={8}>{report.shopName}</td>
                                <td className="p-2 border border-slate-200 text-center" rowSpan={4}>销售</td>
                                <td className="p-2 border border-slate-200 text-center">时间</td>
                                {salesHeaders.map(h => <td key={h} className="p-2 border border-slate-200 text-center">{h}</td>)}
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-200 text-center font-semibold">{report.timeframes.current}</td>
                                {salesMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center">{formatNumber(report.sales[key].current, key === 'gmv' || key === 'aov' ? 'currency' : key === 'conversionRate' ? 'percent' : 'int')}</td>)}
                            </tr>
                             <tr>
                                <td className="p-2 border border-slate-200 text-center font-semibold">{report.timeframes.previous}</td>
                                {salesMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center">{formatNumber(report.sales[key].previous, key === 'gmv' || key === 'aov' ? 'currency' : key === 'conversionRate' ? 'percent' : 'int')}</td>)}
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-200 text-center font-semibold">环比</td>
                                {/* FIX: Renamed the map variable from 'key' to 'metricKey' to avoid confusion with React's special 'key' prop and resolve the type error. */}
                                {salesMetrics.map(metricKey => <ChangeCell key={metricKey} current={report.sales[metricKey].current} previous={report.sales[metricKey].previous} />)}
                            </tr>
                            <tr className="bg-slate-50 font-bold text-slate-700">
                                <td className="p-2 border border-slate-200 text-center" rowSpan={4}>投放</td>
                                <td className="p-2 border border-slate-200 text-center">时间</td>
                                {adHeaders.map(h => <td key={h} className="p-2 border border-slate-200 text-center">{h}</td>)}
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-200 text-center font-semibold">{report.timeframes.current}</td>
                                {adMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center">{formatNumber(report.advertising[key].current, key.includes('cost') || key.includes('Amount') ? 'currency' : ['roi', 'cpc'].includes(key) ? 'float' : 'int')}</td>)}
                            </tr>
                             <tr>
                                <td className="p-2 border border-slate-200 text-center font-semibold">{report.timeframes.previous}</td>
                                {adMetrics.map(key => <td key={key} className="p-2 border border-slate-200 text-center">{formatNumber(report.advertising[key].previous, key.includes('cost') || key.includes('Amount') ? 'currency' : ['roi', 'cpc'].includes(key) ? 'float' : 'int')}</td>)}
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-200 text-center font-semibold">环比</td>
                                {/* FIX: Renamed the map variable from 'key' to 'metricKey' to avoid confusion with React's special 'key' prop and resolve the type error. */}
                                {adMetrics.map(metricKey => <ChangeCell key={metricKey} current={report.advertising[metricKey].current} previous={report.advertising[metricKey].previous} isBetterWhenLower={metricKey === 'cost' || metricKey === 'cpc'} />)}
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- End of New Components ---

const ReportPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
        <FileText size={48} className="mb-4 text-slate-300" />
        <h3 className="font-bold text-lg text-slate-500">准备生成运营报表</h3>
        <p className="text-sm">请在上方选择报表类型和时间，然后点击“生成报表”</p>
    </div>
);


interface ReportsViewProps {
    factTables: any; 
    skus: ProductSKU[]; 
    shops: Shop[]; 
    skuLists: SkuList[];
    onAddNewSkuList: (listData: Omit<SkuList, 'id'>) => boolean;
    onUpdateSkuList: (listData: SkuList) => boolean;
    onDeleteSkuList: (listId: string) => void;
    addToast: (type: 'success' | 'error', title: string, message: string) => void;
}

export const ReportsView = ({ factTables, skus, shops, skuLists, onAddNewSkuList, onUpdateSkuList, onDeleteSkuList, addToast }: ReportsViewProps) => {
    const [activeTab, setActiveTab] = useState<ReportSubView>('daily');
    const [reportData, setReportData] = useState<ShopReportData[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
    const [weekDate, setWeekDate] = useState(new Date().toISOString().split('T')[0]);
    const [monthlyDate, setMonthlyDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    
    const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
    const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
    const listDropdownRef = useRef<HTMLDivElement>(null);
    const [isManagementVisible, setIsManagementVisible] = useState(false);
    const generatedReportTitleRef = useRef('');

    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const shopDropdownRef = useRef<HTMLDivElement>(null);

    // Sku List management states
    const [isListFormModalOpen, setIsListFormModalOpen] = useState(false);
    const [editingList, setEditingList] = useState<SkuList | null>(null);
    const [expandedListId, setExpandedListId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; } | null>(null);

    const skuCodeToNameMap = useMemo(() => new Map(skus.map(s => [s.code, s.name])), [skus]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (listDropdownRef.current && !listDropdownRef.current.contains(event.target as Node)) setIsListDropdownOpen(false);
            if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) setIsShopDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggleList = (listId: string) => {
        setSelectedListIds(prev => prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]);
    };
    
    const handleToggleShop = (shopId: string) => {
        setSelectedShopIds(prev => prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]);
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        onDeleteSkuList(deleteTarget.id);
        setDeleteTarget(null);
    };

    const handleExport = () => {
        if (!reportData || reportData.length === 0) {
            addToast('error', '导出失败', '没有可导出的报表数据。');
            return;
        }

        try {
            const mainTitle = generatedReportTitleRef.current;
            const salesMetrics: (keyof ShopReportData['sales'])[] = ['pv', 'uv', 'buyers', 'conversionRate', 'orders', 'ca', 'gmv', 'aov', 'addToCart'];
            const salesHeaders = ['浏览数', '访客数', '成交人数', '成交转化率', '成交单量', 'CA', 'GMV', '成交客单价', '加购人数'];
            const adMetrics: (keyof ShopReportData['advertising'])[] = ['impressions', 'clicks', 'cost', 'directOrders', 'directOrderAmount', 'totalOrders', 'totalOrderAmount', 'roi', 'cpc'];
            const adHeaders = ['展现数', '点击数', '总费用', '直接订单行', '直接订单金额', '总订单行', '总订单金额', 'ROI', 'CPC'];

            const flatData: any[] = [];
            reportData.forEach(report => {
                const baseCurrent = { '店铺名称': report.shopName, '报表周期': '当期', '时间范围': report.timeframes.current };
                const salesDataCurrent: { [key: string]: any } = {};
                salesMetrics.forEach((key, i) => { salesDataCurrent[`销售 - ${salesHeaders[i]}`] = report.sales[key].current; });
                const adDataCurrent: { [key: string]: any } = {};
                adMetrics.forEach((key, i) => { adDataCurrent[`广告 - ${adHeaders[i]}`] = report.advertising[key].current; });
                flatData.push({ ...baseCurrent, ...salesDataCurrent, ...adDataCurrent });

                const basePrevious = { '店铺名称': report.shopName, '报表周期': '上期', '时间范围': report.timeframes.previous };
                const salesDataPrevious: { [key: string]: any } = {};
                salesMetrics.forEach((key, i) => { salesDataPrevious[`销售 - ${salesHeaders[i]}`] = report.sales[key].previous; });
                const adDataPrevious: { [key: string]: any } = {};
                adMetrics.forEach((key, i) => { adDataPrevious[`广告 - ${adHeaders[i]}`] = report.advertising[key].previous; });
                flatData.push({ ...basePrevious, ...salesDataPrevious, ...adDataPrevious });

                const baseChange = { '店铺名称': report.shopName, '报表周期': '环比', '时间范围': '' };
                const salesDataChange: { [key: string]: any } = {};
                salesMetrics.forEach((key, i) => {
                    const { current, previous } = report.sales[key];
                    salesDataChange[`销售 - ${salesHeaders[i]}`] = previous === 0 ? (current > 0 ? '∞' : '0.00%') : `${(((current - previous) / previous) * 100).toFixed(2)}%`;
                });
                const adDataChange: { [key: string]: any } = {};
                adMetrics.forEach((key, i) => {
                    const { current, previous } = report.advertising[key];
                    adDataChange[`广告 - ${adHeaders[i]}`] = previous === 0 ? (current > 0 ? '∞' : '0.00%') : `${(((current - previous) / previous) * 100).toFixed(2)}%`;
                });
                flatData.push({ ...baseChange, ...salesDataChange, ...adDataChange });

                flatData.push({}); // Add a blank row for spacing
            });

            const ws = XLSX.utils.json_to_sheet(flatData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "运营报表");
            const fileName = `${mainTitle.replace(/\s/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            addToast('success', '导出成功', `已开始下载报表文件。`);
        } catch (error) {
            console.error("Export failed:", error);
            addToast('error', '导出失败', '生成Excel文件时发生错误。');
        }
    };

    const handleGenerateReport = () => {
        setIsLoading(true);
        setReportData(null);
        
        let title = '';
        switch(activeTab) {
            case 'daily': title = `${dailyDate} 运营日报`; break;
            case 'weekly':
                const selectedDate = new Date(weekDate);
                const day = selectedDate.getUTCDay();
                const diff = selectedDate.getUTCDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(selectedDate.setUTCDate(diff));
                const sunday = new Date(monday);
                sunday.setUTCDate(monday.getUTCDate() + 6);
                title = `${monday.toISOString().split('T')[0]} ~ ${sunday.toISOString().split('T')[0]} 运营周报`;
                break;
            case 'monthly': title = `${monthlyDate.year}年${monthlyDate.month}月 运营月报`; break;
            case 'custom': title = `${customStartDate} ~ ${customEndDate} 运营报表`; break;
        }
        generatedReportTitleRef.current = title;

        setTimeout(() => {
            const shopsToReportOn = selectedShopIds.length > 0 
                ? shops.filter(s => selectedShopIds.includes(s.id))
                : shops;

            if (shopsToReportOn.length === 0) {
                addToast('error', '无法生成', '请至少选择一个店铺或确保店铺列表不为空。');
                setIsLoading(false);
                return;
            }

            const reports: ShopReportData[] = shopsToReportOn.map(shop => {
                const mockMetric = (): Metric => ({ current: Math.random() * 50000 + 1000, previous: Math.random() * 50000 + 1000 });
                const mockSmallMetric = (): Metric => ({ current: Math.random() * 200 + 10, previous: Math.random() * 200 + 10 });
                
                const sales = {
                    pv: mockMetric(),
                    uv: { current: mockMetric().current * 0.6, previous: mockMetric().previous * 0.6 },
                    buyers: mockSmallMetric(),
                    orders: { current: mockSmallMetric().current * 1.1, previous: mockSmallMetric().previous * 1.1 },
                    ca: { current: mockSmallMetric().current * 1.2, previous: mockSmallMetric().previous * 1.2 },
                    gmv: mockMetric(),
                    addToCart: mockSmallMetric(),
                    conversionRate: { current: 0, previous: 0 },
                    aov: { current: 0, previous: 0 },
                };
                sales.conversionRate = { current: sales.buyers.current / sales.uv.current, previous: sales.buyers.previous / sales.uv.previous };
                sales.aov = { current: sales.gmv.current / sales.buyers.current, previous: sales.gmv.previous / sales.buyers.previous };

                const advertising = {
                    impressions: { current: mockMetric().current * 10, previous: mockMetric().previous * 10 },
                    clicks: { current: mockMetric().current * 0.2, previous: mockMetric().previous * 0.2 },
                    cost: { current: mockMetric().current * 0.05, previous: mockMetric().previous * 0.05 },
                    directOrders: { current: mockSmallMetric().current * 0.3, previous: mockSmallMetric().previous * 0.3 },
                    directOrderAmount: { current: mockMetric().current * 0.3, previous: mockMetric().previous * 0.3 },
                    totalOrders: { current: mockSmallMetric().current * 0.5, previous: mockSmallMetric().previous * 0.5 },
                    totalOrderAmount: { current: mockMetric().current * 0.5, previous: mockMetric().previous * 0.5 },
                    roi: { current: 0, previous: 0 },
                    cpc: { current: 0, previous: 0 },
                };
                advertising.roi = { current: advertising.cost.current > 0 ? advertising.totalOrderAmount.current / advertising.cost.current : 0, previous: advertising.cost.previous > 0 ? advertising.totalOrderAmount.previous / advertising.cost.previous : 0 };
                advertising.cpc = { current: advertising.clicks.current > 0 ? advertising.cost.current / advertising.clicks.current : 0, previous: advertising.clicks.previous > 0 ? advertising.cost.previous / advertising.clicks.previous : 0 };

                return {
                    shopId: shop.id,
                    shopName: shop.name,
                    timeframes: { current: '1.2-1.8', previous: '12.26-1.1' },
                    sales,
                    advertising
                };
            });

            setReportData(reports);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <>
            <ConfirmModal isOpen={!!deleteTarget} title="确认删除清单" onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} confirmText="确认删除" confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20">
                <p>您确定要永久删除 <strong className="font-black text-slate-800">"{deleteTarget?.name}"</strong> 吗？</p><p className="mt-2 text-rose-500 font-bold">此操作不可撤销。</p>
            </ConfirmModal>
            <SkuListFormModal isOpen={isListFormModalOpen} onClose={() => { setIsListFormModalOpen(false); setEditingList(null); }} onConfirm={editingList ? onUpdateSkuList : onAddNewSkuList} listToEdit={editingList} />

            <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">运营报表</h1>
                        <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">AUTOMATED OPERATIONAL REPORTING</p>
                    </div>
                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                        {(['daily', 'weekly', 'monthly', 'custom'] as ReportSubView[]).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{tab === 'daily' ? '日报' : tab === 'weekly' ? '周报' : tab === 'monthly' ? '月报' : '自定义报表'}</button>))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-bold text-slate-600 mb-2">时间范围</label>
                            {activeTab === 'daily' && <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" />}
                            {activeTab === 'weekly' && <div><input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" /><p className="text-xs text-slate-400 mt-1">选择任意一天，系统将自动计算当周（周一至周日）。</p></div>}
                            {activeTab === 'monthly' && <div className="flex items-center gap-2"><select value={monthlyDate.year} onChange={e => setMonthlyDate(prev => ({...prev, year: parseInt(e.target.value)}))} className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]">{[2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}</select><select value={monthlyDate.month} onChange={e => setMonthlyDate(prev => ({...prev, month: parseInt(e.target.value)}))} className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]">{Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}</select></div>}
                            {activeTab === 'custom' && <div className="flex items-center gap-2"><input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" /><div className="text-slate-300">-</div><input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]" /></div>}
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-2"><label className="block text-sm font-bold text-slate-600">SKU范围</label><label className="flex items-center cursor-pointer"><span className="text-xs font-medium text-slate-500 mr-2">管理清单</span><div className="relative"><input type="checkbox" checked={isManagementVisible} onChange={() => setIsManagementVisible(prev => !prev)} className="sr-only peer" /><div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#70AD47]"></div></div></label></div>
                            <div className="relative" ref={listDropdownRef}><button onClick={() => setIsListDropdownOpen(prev => !prev)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47] flex justify-between items-center"><span className="truncate">{selectedListIds.length === 0 ? `全部SKU` : `已选 ${selectedListIds.length} 个清单`}</span><ChevronDown size={16} /></button>
                                {isListDropdownOpen && (<div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col"><div className="flex-1 overflow-y-auto max-h-48 text-sm">{skuLists.map(list => (<label key={list.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={selectedListIds.includes(list.id)} onChange={() => handleToggleList(list.id)} className="form-checkbox h-3.5 w-3.5 text-[#70AD47] border-slate-300 rounded focus:ring-[#70AD47]" /><span className="truncate text-xs" title={`${list.name} (${list.skuCodes.length} SKUs)`}>{list.name} ({list.skuCodes.length})</span></label>))}</div><div className="pt-2 mt-2 border-t border-slate-100"><button onClick={() => setSelectedListIds([])} className="w-full text-center text-xs font-bold text-rose-500 hover:bg-rose-50 p-1 rounded">清空选择</button></div></div>)}
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-600 mb-2">店铺范围</label>
                            <div className="relative" ref={shopDropdownRef}><button onClick={() => setIsShopDropdownOpen(prev => !prev)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47] flex justify-between items-center"><span className="truncate">{selectedShopIds.length === 0 ? `全部店铺` : `已选 ${selectedShopIds.length} 个店铺`}</span><ChevronDown size={16} /></button>
                                {isShopDropdownOpen && (<div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col"><div className="flex-1 overflow-y-auto max-h-48 text-sm">{shops.map((shop:Shop) => (<label key={shop.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={selectedShopIds.includes(shop.id)} onChange={() => handleToggleShop(shop.id)} className="form-checkbox h-3.5 w-3.5 text-[#70AD47] border-slate-300 rounded focus:ring-[#70AD47]" /><span className="truncate text-xs">{shop.name}</span></label>))}</div><div className="pt-2 mt-2 border-t border-slate-100"><button onClick={() => setSelectedShopIds([])} className="w-full text-center text-xs font-bold text-rose-500 hover:bg-rose-50 p-1 rounded">清空选择</button></div></div>)}
                            </div>
                        </div>
                    </div>
                    {isManagementVisible && (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                             <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700">SKU清单管理</h3><button onClick={() => { setEditingList(null); setIsListFormModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"><Plus size={14} /> 创建新清单</button></div>
                             {skuLists.length === 0 ? (<div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg"><div className="flex flex-col items-center justify-center text-slate-300"><List size={32} className="mb-2 opacity-50" /><p className="text-xs font-bold">暂无SKU清单，请点击右上角创建</p></div></div>) : (<div className="space-y-2 max-h-64 overflow-y-auto pr-2">{skuLists.map(list => (<div key={list.id} className="bg-slate-50 border border-slate-200/50 rounded-lg"><div className="flex items-center justify-between p-3" ><div className="flex items-center gap-3"><button onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}><ChevronsUpDown size={16} className={`text-slate-400 transition-transform ${expandedListId === list.id ? 'rotate-180' : ''}`} /></button><span className="font-bold text-slate-800 text-sm">{list.name}</span><span className="text-xs text-slate-400">({list.skuCodes.length} SKUs)</span></div><div className="flex items-center gap-2"><button onClick={() => { setEditingList(list); setIsListFormModalOpen(true); }} className="text-slate-400 hover:text-[#70AD47] p-1"><Edit2 size={14} /></button><button onClick={() => setDeleteTarget({id: list.id, name: list.name})} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button></div></div>{expandedListId === list.id && (<div className="border-t border-slate-200 p-3 max-h-40 overflow-y-auto"><ul className="space-y-1">{list.skuCodes.map((code, idx) => (<li key={idx} className="flex justify-between text-xs p-1 rounded hover:bg-white text-slate-500"><code>{code}</code><span className={`truncate ml-4 ${skuCodeToNameMap.has(code) ? 'text-slate-600' : 'text-rose-500 italic'}`}>{skuCodeToNameMap.get(code) || '(未找到该资产)'}</span></li>))}</ul></div>)}</div>))}</div>)}
                        </div>
                    )}
                    <div className="flex justify-end items-center mt-4 pt-4 border-t border-slate-100 gap-4">
                        <button 
                            onClick={handleExport}
                            disabled={!reportData || isLoading}
                            className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed">
                            <Download size={16} /> 导出报表
                        </button>
                        <button onClick={handleGenerateReport} disabled={isLoading} className="px-8 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none">
                            {isLoading ? <><LoaderCircle size={16} className="animate-spin" /> 正在生成...</> : '生成报表'}
                        </button>
                    </div>
                </div>

                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[500px]">
                    {isLoading ? (<div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[500px]"><LoaderCircle size={32} className="animate-spin mb-4" /><p className="font-bold">正在聚合数据，生成报表中...</p></div>) : reportData ? (<DetailedReportDisplay reports={reportData} mainTitle={generatedReportTitleRef.current} />) : <ReportPlaceholder />}
                </div>
            </div>
        </>
    );
};