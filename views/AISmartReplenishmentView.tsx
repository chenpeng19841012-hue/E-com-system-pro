import React, { useState, useMemo } from 'react';
import { PackagePlus, AlertTriangle, ChevronsRight, X, Warehouse, Truck } from 'lucide-react';
import { ProductSKU, Shop } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

interface AIReplenishmentViewProps {
  skus: ProductSKU[];
  shangzhiData: any[];
  shops: Shop[];
  onUpdateSKU: (sku: ProductSKU) => boolean;
  addToast: (type: 'success' | 'error', title: string, message: string) => void;
}

type ReplenishmentStatus = 'normal' | 'warning' | 'severe';

interface ProcessedSkuData {
    sku: ProductSKU;
    totalStock: number;
    sales7d: number;
    sales15d: number;
    status: ReplenishmentStatus;
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
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">SKU 补货</h3>
                        <p className="text-xs text-slate-400 mt-1 truncate max-w-sm" title={sku.name}>{sku.name} ({sku.code})</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs font-bold text-slate-400">当前入仓库存</p>
                            <p className="text-xl font-black text-slate-700">{sku.warehouseStock || 0}</p>
                        </div>
                         <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs font-bold text-slate-400">当前厂直库存</p>
                            <p className="text-xl font-black text-slate-700">{sku.factoryStock || 0}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Warehouse size={16} /> 添加入仓库存</label>
                        <input 
                            type="number" 
                            value={warehouseQty}
                            onChange={e => setWarehouseQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Truck size={16} /> 添加厂直库存</label>
                         <input 
                            type="number" 
                            value={factoryQty}
                            onChange={e => setFactoryQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" 
                        />
                    </div>
                </div>
                 <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">取消</button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20">确认补货</button>
                </div>
            </div>
        </div>
    )
};


export const AISmartReplenishmentView = ({ skus, shangzhiData, shops, onUpdateSKU, addToast }: AIReplenishmentViewProps) => {
    const [replenishingSku, setReplenishingSku] = useState<ProductSKU | null>(null);
    const [filters, setFilters] = useState({ shopId: 'all', status: 'all' });

    const shopMap = useMemo(() => new Map(shops.map(s => [s.id, s.name])), [shops]);

    const replenishmentData = useMemo((): ProcessedSkuData[] => {
        const salesBySku = new Map<string, { date: string, sales: number }[]>();
        shangzhiData.forEach(row => {
            const skuCode = getSkuIdentifier(row);
            const sales = Number(row.paid_items) || 0;
            if (skuCode && sales > 0) {
                if (!salesBySku.has(skuCode)) {
                    salesBySku.set(skuCode, []);
                }
                salesBySku.get(skuCode)!.push({ date: row.date, sales });
            }
        });

        const today = new Date();
        const getDateString = (offset: number) => {
            const date = new Date();
            date.setDate(today.getDate() - offset);
            return date.toISOString().split('T')[0];
        };
        const date7Ago = getDateString(7);
        const date15Ago = getDateString(15);
        
        return skus.map(sku => {
            const totalStock = (sku.warehouseStock || 0) + (sku.factoryStock || 0);
            const skuSales = salesBySku.get(sku.code) || [];
            
            let sales7d = 0;
            let sales15d = 0;

            skuSales.forEach(sale => {
                if (sale.date >= date15Ago) {
                    sales15d += sale.sales;
                    if (sale.date >= date7Ago) {
                        sales7d += sale.sales;
                    }
                }
            });
            
            let monitoredStock: number;
            switch (sku.mode) {
                case '入仓':
                    monitoredStock = sku.warehouseStock || 0;
                    break;
                case '厂直':
                    monitoredStock = sku.factoryStock || 0;
                    break;
                default: // Fallback for undefined or other modes
                    monitoredStock = totalStock;
            }

            let status: ReplenishmentStatus = 'normal';
            if (monitoredStock < sales7d) {
                status = 'severe';
            } else if (monitoredStock < sales15d) {
                status = 'warning';
            }

            return { sku, totalStock, sales7d, sales15d, status };
        });
    }, [skus, shangzhiData]);

    const filteredData = useMemo(() => {
        return replenishmentData.filter(item => {
            const shopMatch = filters.shopId === 'all' || item.sku.shopId === filters.shopId;
            const statusMatch = filters.status === 'all' || item.status === filters.status;
            return shopMatch && statusMatch;
        });
    }, [replenishmentData, filters]);

    const handleReplenishConfirm = (skuToUpdate: ProductSKU, quantities: { warehouse: number, factory: number }) => {
        const updatedSku = {
            ...skuToUpdate,
            warehouseStock: (skuToUpdate.warehouseStock || 0) + quantities.warehouse,
            factoryStock: (skuToUpdate.factoryStock || 0) + quantities.factory,
        };
        if (onUpdateSKU(updatedSku)) {
            addToast('success', '补货成功', `SKU [${skuToUpdate.code}] 库存已更新。`);
        }
        setReplenishingSku(null);
    };

  return (
    <>
        <ReplenishmentModal
            isOpen={!!replenishingSku}
            onClose={() => setReplenishingSku(null)}
            sku={replenishingSku}
            onConfirm={handleReplenishConfirm}
        />
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 智能补货</h1>
            <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">INTELLIGENT REPLENISHMENT SUGGESTIONS</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">按店铺筛选</label>
                    <select value={filters.shopId} onChange={e => setFilters(f => ({...f, shopId: e.target.value}))} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]">
                        <option value="all">所有店铺</option>
                        {shops.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">按状态筛选</label>
                    <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47]">
                        <option value="all">所有状态</option>
                        <option value="severe">严重警告</option>
                        <option value="warning">补货警告</option>
                        <option value="normal">库存健康</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs font-bold text-slate-400 border-b border-slate-100">
                            <th className="text-left p-3">SKU / 店铺</th>
                            <th className="text-center p-3" title="根据SKU模式，高亮的数值为当前监控的库存">当前库存 (仓/厂/总)</th>
                            <th className="text-center p-3">近15日销量</th>
                            <th className="text-center p-3">近7日销量</th>
                            <th className="text-center p-3">状态</th>
                            <th className="text-center p-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length === 0 ? (
                             <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                        <PackagePlus size={48} className="mb-4 opacity-50" />
                                        <p className="text-xs font-bold">暂无数据或无匹配项</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredData.map(({ sku, totalStock, sales7d, sales15d, status }) => (
                                <tr key={sku.id} className="hover:bg-slate-50">
                                    <td className="p-3 border-b border-slate-50">
                                        <p className="font-bold text-slate-800 truncate" title={sku.name}>{sku.name}</p>
                                        <p className="text-xs text-slate-400">{sku.code} @ {shopMap.get(sku.shopId) || '未知店铺'}</p>
                                    </td>
                                    <td className="p-3 border-b border-slate-50 text-center font-mono">
                                        <span title="入仓" className={sku.mode === '入仓' ? 'font-black text-blue-600' : ''}>{sku.warehouseStock || 0}</span> / 
                                        <span title="厂直" className={sku.mode === '厂直' ? 'font-black text-blue-600' : ''}>{sku.factoryStock || 0}</span> / 
                                        <span title="总计" className={!sku.mode || (sku.mode !== '入仓' && sku.mode !== '厂直') ? 'font-black text-blue-600' : 'font-bold'}>{totalStock}</span>
                                    </td>
                                    <td className="p-3 border-b border-slate-50 text-center font-mono">{sales15d}</td>
                                    <td className="p-3 border-b border-slate-50 text-center font-mono">{sales7d}</td>
                                    <td className="p-3 border-b border-slate-50 text-center">
                                        {status === 'severe' && <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-xs font-bold"><AlertTriangle size={12}/> 严重警告</span>}
                                        {status === 'warning' && <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold"><AlertTriangle size={12}/> 补货警告</span>}
                                        {status === 'normal' && <span className="text-green-500 text-xs font-bold">健康</span>}
                                    </td>
                                    <td className="p-3 border-b border-slate-50 text-center">
                                        {status !== 'normal' && (
                                            <button onClick={() => setReplenishingSku(sku)} className="px-3 py-1 bg-[#70AD47] text-white rounded-md text-xs font-bold hover:bg-[#5da035] flex items-center gap-1 mx-auto">
                                                补货 <ChevronsRight size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </>
  );
};
