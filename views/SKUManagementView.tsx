import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Package, Database, Plus, Download, UploadCloud, Edit2, ChevronDown, User, X, Trash2, List, ChevronsUpDown } from 'lucide-react';
import { ProductSubView, Shop, ProductSKU, CustomerServiceAgent, SKUMode, SKUStatus, SKUAdvertisingStatus, SkuList } from '../lib/types';
import { parseExcelFile } from '../lib/excel';
import { ConfirmModal } from '../components/ConfirmModal';


// ADD/EDIT MODALS
const AddSKUModal = ({ isOpen, onClose, onConfirm, shops, addToast }: { isOpen: boolean, onClose: () => void, onConfirm: (sku: Omit<ProductSKU, 'id'>) => boolean, shops: Shop[], addToast: any }) => {
    // ... same as before
    return <SKUFormModal isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} shops={shops} addToast={addToast} title="新增 SKU 资产" confirmText="确认新增" />;
};

const EditSKUModal = ({ isOpen, onClose, onConfirm, skuToEdit, shops, addToast }: { isOpen: boolean, onClose: () => void, onConfirm: (sku: ProductSKU) => boolean, skuToEdit: ProductSKU, shops: Shop[], addToast: any }) => {
    return <SKUFormModal isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} skuToEdit={skuToEdit} shops={shops} addToast={addToast} title="更新 SKU 资产" confirmText="确认更新" />;
};

const SKUFormModal = ({ isOpen, onClose, onConfirm, skuToEdit, shops, addToast, title, confirmText }: any) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [shopId, setShopId] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [model, setModel] = useState('');
    const [configuration, setConfiguration] = useState('');
    const [mode, setMode] = useState<SKUMode>('入仓');
    const [status, setStatus] = useState<SKUStatus>('在售');
    const [advertisingStatus, setAdvertisingStatus] = useState<SKUAdvertisingStatus>('未投');
    const [costPrice, setCostPrice] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [promoPrice, setPromoPrice] = useState('');
    const [jdCommission, setJdCommission] = useState('');
    const [warehouseStock, setWarehouseStock] = useState('');
    const [factoryStock, setFactoryStock] = useState('');
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            const initialData = skuToEdit || {};
            setCode(initialData.code || '');
            setName(initialData.name || '');
            setShopId(initialData.shopId || (shops.length > 0 ? shops[0].id : ''));
            setBrand(initialData.brand || '');
            setCategory(initialData.category || '');
            setModel(initialData.model || '');
            setConfiguration(initialData.configuration || '');
            setMode(initialData.mode || '入仓');
            setStatus(initialData.status || '在售');
            setAdvertisingStatus(initialData.advertisingStatus || '未投');
            setCostPrice(initialData.costPrice?.toString() || '');
            setSellingPrice(initialData.sellingPrice?.toString() || '');
            setPromoPrice(initialData.promoPrice?.toString() || '');
            setJdCommission(initialData.jdCommission?.toString() || '');
            setWarehouseStock(initialData.warehouseStock?.toString() || '');
            setFactoryStock(initialData.factoryStock?.toString() || '');
            setError('');
        }
    }, [isOpen, skuToEdit, shops]);

    const handleConfirm = () => {
        setError('');
        if (!code.trim() || !name.trim() || !shopId) {
            setError('SKU编码、商品名称和所属店铺为必填项。');
            return;
        }
        const payload = {
            id: skuToEdit?.id,
            code: code.trim(),
            name: name.trim(),
            shopId,
            brand: brand.trim(),
            category: category.trim(),
            model: model.trim(),
            configuration: configuration.trim(),
            mode,
            status,
            advertisingStatus,
            costPrice: costPrice ? parseFloat(costPrice) : undefined,
            sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
            promoPrice: promoPrice ? parseFloat(promoPrice) : undefined,
            jdCommission: jdCommission ? parseFloat(jdCommission) : undefined,
            warehouseStock: warehouseStock ? parseInt(warehouseStock, 10) : undefined,
            factoryStock: factoryStock ? parseInt(factoryStock, 10) : undefined,
        };
        
        if (onConfirm(payload)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">SKU 编码 *</label>
                            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="例如：100228755791" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">商品名称 *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="例如：联想笔记本电脑" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">所属店铺 *</label>
                        <select value={shopId} onChange={e => setShopId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]">
                            {shops.map((shop:Shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">品牌</label>
                            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="例如：联想" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">类目</label>
                            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="例如：笔记本电脑" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">型号</label>
                            <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="例如：ThinkPad X1" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">配置</label>
                            <input type="text" value={configuration} onChange={e => setConfiguration(e.target.value)} placeholder="例如：i7/16G/512G" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">成本价</label>
                            <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">前台价</label>
                            <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">促销价</label>
                            <input type="number" value={promoPrice} onChange={e => setPromoPrice(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">点位 (%)</label>
                            <input type="number" value={jdCommission} onChange={e => setJdCommission(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">入仓库存</label>
                            <input type="number" value={warehouseStock} onChange={e => setWarehouseStock(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">厂直库存</label>
                            <input type="number" value={factoryStock} onChange={e => setFactoryStock(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                        </div>
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">模式 *</label>
                             <select value={mode} onChange={e => setMode(e.target.value as SKUMode)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]">
                                <option value="入仓">入仓</option>
                                <option value="厂直">厂直</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">状态 *</label>
                             <select value={status} onChange={e => setStatus(e.target.value as SKUStatus)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]">
                                <option value="在售">在售</option>
                                <option value="待售">待售</option>
                                <option value="下架">下架</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">广告 *</label>
                             <select value={advertisingStatus} onChange={e => setAdvertisingStatus(e.target.value as SKUAdvertisingStatus)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]">
                                <option value="未投">未投</option>
                                <option value="在投">在投</option>
                            </select>
                        </div>
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-4 bg-rose-50 p-3 rounded-lg">{error}</p>}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">取消</button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const ShopFormModal = ({ isOpen, onClose, onConfirm, shopToEdit, title, confirmText }: any) => {
    const [name, setName] = useState('');
    const [mode, setMode] = useState('自营');
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setName(shopToEdit?.name || '');
            setMode(shopToEdit?.mode || '自营');
            setError('');
        }
    }, [isOpen, shopToEdit]);

    const handleConfirm = () => {
        if (!name.trim()) {
            setError('店铺名称不能为空。');
            return;
        }
        const payload = { id: shopToEdit?.id, name: name.trim(), mode };
        if (onConfirm(payload)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">店铺名称 *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">经营模式 *</label>
                        <select value={mode} onChange={e => setMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]">
                            <option value="自营">自营</option>
                            <option value="POP">POP</option>
                        </select>
                    </div>
                </div>
                 {error && <p className="text-xs text-rose-500 mt-4 bg-rose-50 p-3 rounded-lg">{error}</p>}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">取消</button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const AgentFormModal = ({ isOpen, onClose, onConfirm, agentToEdit, shops, title, confirmText }: any) => {
    const [name, setName] = useState('');
    const [account, setAccount] = useState('');
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setName(agentToEdit?.name || '');
            setAccount(agentToEdit?.account || '');
            setSelectedShopIds(agentToEdit?.shopIds || []);
            setError('');
        }
    }, [isOpen, agentToEdit]);

    const handleShopSelection = (shopId: string) => {
        setSelectedShopIds(prev => 
            prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]
        );
    };

    const handleConfirm = () => {
        if (!name.trim() || !account.trim()) {
            setError('姓名和客服账号不能为空。');
            return;
        }
        const payload = { id: agentToEdit?.id, name: name.trim(), account: account.trim(), shopIds: selectedShopIds };
        if (onConfirm(payload)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">姓名 *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">客服账号 *</label>
                        <input type="text" value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]" />
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">关联店铺</label>
                        <div className="max-h-32 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                            {shops.map((shop:Shop) => (
                                <label key={shop.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedShopIds.includes(shop.id)}
                                        onChange={() => handleShopSelection(shop.id)}
                                        className="form-checkbox h-4 w-4 text-[#70AD47] border-slate-300 rounded focus:ring-[#70AD47]"
                                    />
                                    <span className="text-sm text-slate-700">{shop.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                 {error && <p className="text-xs text-rose-500 mt-4 bg-rose-50 p-3 rounded-lg">{error}</p>}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">取消</button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

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


interface SKUManagementViewProps {
    shops: Shop[];
    skus: ProductSKU[];
    agents: CustomerServiceAgent[];
    skuLists: SkuList[];
    onAddNewSKU: (skuData: Omit<ProductSKU, 'id'>) => boolean;
    onUpdateSKU: (skuData: ProductSKU) => boolean;
    onDeleteSKU: (id: string) => void;
    onBulkAddSKUs: (newSKUs: Omit<ProductSKU, 'id'>[]) => void;
    onAddNewShop: (shopData: Omit<Shop, 'id'>) => boolean;
    onUpdateShop: (shopData: Shop) => boolean;
    onDeleteShop: (id: string) => void;
    onBulkAddShops: (newShops: Omit<Shop, 'id'>[]) => void;
    onAddNewAgent: (agentData: Omit<CustomerServiceAgent, 'id'>) => boolean;
    onUpdateAgent: (agentData: CustomerServiceAgent) => boolean;
    onDeleteAgent: (id: string) => void;
    onBulkAddAgents: (newAgents: Omit<CustomerServiceAgent, 'id'>[]) => void;
    onAddNewSkuList: (listData: Omit<SkuList, 'id'>) => boolean;
    onUpdateSkuList: (listData: SkuList) => boolean;
    onDeleteSkuList: (listId: string) => void;
    addToast: (type: 'success' | 'error', title: string, message: string) => void;
}

export const SKUManagementView = ({ 
    shops, skus, agents, skuLists,
    onAddNewSKU, onUpdateSKU, onDeleteSKU, onBulkAddSKUs,
    onAddNewShop, onUpdateShop, onDeleteShop, onBulkAddShops,
    onAddNewAgent, onUpdateAgent, onDeleteAgent, onBulkAddAgents,
    onAddNewSkuList, onUpdateSkuList, onDeleteSkuList,
    addToast 
}: SKUManagementViewProps) => {
    const [activeTab, setActiveTab] = useState<ProductSubView>('sku');
    
    // SKU states
    const [isAddSKUModalOpen, setIsAddSKUModalOpen] = useState(false);
    const [editingSku, setEditingSku] = useState<ProductSKU | null>(null);
    const skuFileInputRef = useRef<HTMLInputElement>(null);

    // Shop states
    const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);
    const shopFileInputRef = useRef<HTMLInputElement>(null);

    // Agent states
    const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<CustomerServiceAgent | null>(null);
    const agentFileInputRef = useRef<HTMLInputElement>(null);

    // Sku List states
    const [isListFormModalOpen, setIsListFormModalOpen] = useState(false);
    const [editingList, setEditingList] = useState<SkuList | null>(null);
    const [expandedListId, setExpandedListId] = useState<string | null>(null);
    
    // Common states
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'sku' | 'shop' | 'agent' | 'list' } | null>(null);

    // SKU Filter States
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedShop, setSelectedShop] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedAdStatus, setSelectedAdStatus] = useState('all');
    const [selectedMode, setSelectedMode] = useState('all');

    const skuCodeToNameMap = useMemo(() => new Map(skus.map(s => [s.code, s.name])), [skus]);

    const uniqueBrands = useMemo(() => {
        const brands = new Set(skus.map((sku: ProductSKU) => sku.brand).filter(Boolean));
        return Array.from(brands).sort();
    }, [skus]);

    const uniqueCategories = useMemo(() => {
        const categories = new Set(skus.map((sku: ProductSKU) => sku.category).filter(Boolean));
        return Array.from(categories).sort();
    }, [skus]);

    const filteredSkus = useMemo(() => {
        return skus.filter((sku: ProductSKU) => {
            const brandMatch = selectedBrand === 'all' || sku.brand === selectedBrand;
            const categoryMatch = selectedCategory === 'all' || sku.category === selectedCategory;
            const shopMatch = selectedShop === 'all' || sku.shopId === selectedShop;
            const statusMatch = selectedStatus === 'all' || sku.status === selectedStatus;
            const adMatch = selectedAdStatus === 'all' || sku.advertisingStatus === selectedAdStatus;
            const modeMatch = selectedMode === 'all' || sku.mode === selectedMode;
            return brandMatch && categoryMatch && shopMatch && statusMatch && adMatch && modeMatch;
        });
    }, [skus, selectedBrand, selectedCategory, selectedShop, selectedStatus, selectedAdStatus, selectedMode]);

    const sortedAndFilteredSkus = useMemo(() => {
        const statusOrder: { [key in SKUStatus]: number } = {
            '在售': 1,
            '待售': 2,
            '下架': 3,
        };
        return [...filteredSkus].sort((a, b) => {
            const statusA = a.status ?? '下架';
            const statusB = b.status ?? '下架';
            const orderA = statusOrder[statusA] || 99;
            const orderB = statusOrder[statusB] || 99;
            return orderA - orderB;
        });
    }, [filteredSkus]);
    
    const handleDeleteClick = (item: any, type: 'sku' | 'shop' | 'agent' | 'list') => {
        setDeleteTarget({ id: item.id, name: item.name, type });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === 'sku') onDeleteSKU(deleteTarget.id);
        if (deleteTarget.type === 'shop') onDeleteShop(deleteTarget.id);
        if (deleteTarget.type === 'agent') onDeleteAgent(deleteTarget.id);
        if (deleteTarget.type === 'list') onDeleteSkuList(deleteTarget.id);
        setDeleteTarget(null);
    };

    const handleDownloadTemplate = (type: 'sku' | 'shop' | 'agent') => {
        let headers: string[] = [];
        let filename = '';
        if (type === 'sku') {
            headers = ['SKU编码 (code)', '商品名称 (name)', '店铺名称 (shopName)', '品牌 (brand)', '类目 (category)', '型号 (model)', '配置 (configuration)', '成本价 (costPrice)', '前台价 (sellingPrice)', '促销价 (promoPrice)', '京东点位% (jdCommission)', '入仓库存 (warehouseStock)', '厂直库存 (factoryStock)', '模式 (mode)', '状态 (status)', '广告 (advertisingStatus)'];
            filename = 'SKU_template.xlsx';
        } else if (type === 'shop') {
            headers = ['店铺名称 (name)', '经营模式 (mode)'];
            filename = 'Shop_template.xlsx';
        } else {
            headers = ['姓名 (name)', '客服账号 (account)', '关联店铺 (shopNames)'];
            filename = 'Agent_template.xlsx';
        }

        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "模板");
        XLSX.writeFile(wb, filename);
        addToast('success', '下载成功', `已开始下载${type.toUpperCase()}导入模板文件。`);
    };
    
    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: 'sku' | 'shop' | 'agent') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const { data } = parseExcelFile(bstr);

                if (data.length === 0) {
                    addToast('error', '导入失败', '文件中没有有效数据行。');
                    return;
                }

                if (type === 'sku') {
                    const shopNameToIdMap = new Map(shops.map((s: Shop) => [s.name, s.id]));
                    const newSKUs = data.map((row: any): Omit<ProductSKU, 'id'> | null => {
                         const shopName = row['店铺名称 (shopName)'] || row['店铺名称'];
                         const shopId = shopNameToIdMap.get(shopName);
                         if (!shopId) return null;
                         
                         const costPriceRaw = row['成本价 (costPrice)'] || row['成本价'];
                         const sellingPriceRaw = row['前台价 (sellingPrice)'] || row['前台价'];
                         const promoPriceRaw = row['促销价 (promoPrice)'] || row['促销价'];
                         const jdCommissionRaw = row['京东点位% (jdCommission)'] || row['京东点位%'];
                         const warehouseStockRaw = row['入仓库存 (warehouseStock)'] || row['入仓库存'];
                         const factoryStockRaw = row['厂直库存 (factoryStock)'] || row['厂直库存'];

                         return { 
                             code: String(row['SKU编码 (code)'] || ''), 
                             name: String(row['商品名称 (name)'] || ''), 
                             shopId, 
                             brand: String(row['品牌 (brand)'] || ''), 
                             category: String(row['类目 (category)'] || ''), 
                             model: String(row['型号 (model)'] || ''), 
                             configuration: String(row['配置 (configuration)'] || ''), 
                             costPrice: costPriceRaw ? parseFloat(costPriceRaw) : undefined,
                             sellingPrice: sellingPriceRaw ? parseFloat(sellingPriceRaw) : undefined,
                             promoPrice: promoPriceRaw ? parseFloat(promoPriceRaw) : undefined,
                             jdCommission: jdCommissionRaw ? parseFloat(jdCommissionRaw) : undefined,
                             warehouseStock: warehouseStockRaw ? parseInt(warehouseStockRaw, 10) : undefined,
                             factoryStock: factoryStockRaw ? parseInt(factoryStockRaw, 10) : undefined,
                             mode: (row['模式 (mode)'] as SKUMode), 
                             status: (row['状态 (status)'] as SKUStatus), 
                             advertisingStatus: (row['广告 (advertisingStatus)'] as SKUAdvertisingStatus)
                        };
                    }).filter(sku => sku && sku.code && sku.name);
                    onBulkAddSKUs(newSKUs as Omit<ProductSKU, 'id'>[]);
                } else if (type === 'shop') {
                     const newShops = data.map((row: any): Omit<Shop, 'id'> | null => {
                        const name = row['店铺名称 (name)'] || row['店铺名称'];
                        const mode = row['经营模式 (mode)'] || row['经营模式'];
                        if (!name || !['自营', 'POP'].includes(mode)) return null;
                        return { name, mode };
                     }).filter(shop => shop);
                     onBulkAddShops(newShops as Omit<Shop, 'id'>[]);
                } else if (type === 'agent') {
                    const shopNameToIdMap = new Map(shops.map(s => [s.name, s.id]));
                    const newAgents = data.map((row: any): Omit<CustomerServiceAgent, 'id'> | null => {
                        const name = row['姓名 (name)'] || row['姓名'];
                        const account = row['客服账号 (account)'] || row['客服账号'];
                        const shopNamesStr = row['关联店铺 (shopNames)'] || row['关联店铺'] || '';
                        
                        if (!name || !account) return null;

                        const shopIds = shopNamesStr.split(',').map((name:string) => name.trim()).map((name:string) => shopNameToIdMap.get(name)).filter(Boolean);
                        
                        return { name, account, shopIds };
                    }).filter(agent => agent);
                    onBulkAddAgents(newAgents as Omit<CustomerServiceAgent, 'id'>[]);
                }

            } catch (err) {
                console.error(err);
                addToast('error', '导入失败', '文件解析或数据处理时发生错误。');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleBulkExport = (type: 'sku' | 'shop' | 'agent') => {
        let dataToExport: any[][] = [];
        let headers: string[] = [];
        let filename = '';
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        if (type === 'sku') {
            if (sortedAndFilteredSkus.length === 0) { addToast('error', '导出失败', '没有可导出的数据。'); return; }
            const shopIdToNameMap = new Map(shops.map(s => [s.id, s.name]));
            headers = ['SKU编码', '商品名称', '店铺名称', '品牌', '类目', '型号', '配置', '成本价', '前台价', '促销价', '京东点位%', '入仓库存', '厂直库存', '模式', '状态', '广告'];
            dataToExport = sortedAndFilteredSkus.map(sku => [sku.code, sku.name, shopIdToNameMap.get(sku.shopId) || '未知店铺', sku.brand || '', sku.category || '', sku.model || '', sku.configuration || '', sku.costPrice ?? '', sku.sellingPrice ?? '', sku.promoPrice ?? '', sku.jdCommission ?? '', sku.warehouseStock ?? '', sku.factoryStock ?? '', sku.mode || '', sku.status || '', sku.advertisingStatus || '']);
            filename = `SKU_export_${formattedDate}.xlsx`;
        } else if (type === 'shop') {
             if (shops.length === 0) { addToast('error', '导出失败', '没有可导出的数据。'); return; }
             headers = ['店铺名称', '经营模式'];
             dataToExport = shops.map(s => [s.name, s.mode]);
             filename = `Shops_export_${formattedDate}.xlsx`;
        } else if (type === 'agent') {
             if (agents.length === 0) { addToast('error', '导出失败', '没有可导出的数据。'); return; }
             const shopIdToNameMap = new Map(shops.map(s => [s.id, s.name]));
             headers = ['姓名', '客服账号', '关联店铺'];
             dataToExport = agents.map(a => [a.name, a.account, a.shopIds.map(id => shopIdToNameMap.get(id)).filter(Boolean).join(', ')]);
             filename = `Agents_export_${formattedDate}.xlsx`;
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "导出数据");
        XLSX.writeFile(wb, filename);
        
        addToast('success', '导出成功', `已成功导出数据。`);
    };

    return (
        <>
            <ConfirmModal
                isOpen={!!deleteTarget}
                title={`确认删除 ${deleteTarget?.type === 'sku' ? 'SKU' : deleteTarget?.type === 'shop' ? '店铺' : deleteTarget?.type === 'agent' ? '客服' : '清单'}`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
                confirmText="确认删除"
                confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
            >
                <p>您确定要永久删除 <strong className="font-black text-slate-800">"{deleteTarget?.name}"</strong> 吗？</p>
                <p className="mt-2 text-rose-500 font-bold">此操作不可撤销。</p>
            </ConfirmModal>

            {isAddSKUModalOpen && <SKUFormModal isOpen={isAddSKUModalOpen} onClose={() => setIsAddSKUModalOpen(false)} onConfirm={onAddNewSKU} shops={shops} addToast={addToast} title="新增 SKU 资产" confirmText="确认新增" />}
            {editingSku && <SKUFormModal isOpen={!!editingSku} onClose={() => setEditingSku(null)} onConfirm={onUpdateSKU} skuToEdit={editingSku} shops={shops} addToast={addToast} title="更新 SKU 资产" confirmText="确认更新" />}
            
            {isAddShopModalOpen && <ShopFormModal isOpen={isAddShopModalOpen} onClose={() => setIsAddShopModalOpen(false)} onConfirm={onAddNewShop} title="新增店铺" confirmText="确认新增" />}
            {editingShop && <ShopFormModal isOpen={!!editingShop} onClose={() => setEditingShop(null)} onConfirm={onUpdateShop} shopToEdit={editingShop} title="更新店铺" confirmText="确认更新" />}

            {isAddAgentModalOpen && <AgentFormModal isOpen={isAddAgentModalOpen} onClose={() => setIsAddAgentModalOpen(false)} onConfirm={onAddNewAgent} shops={shops} title="新增客服" confirmText="确认新增" />}
            {editingAgent && <AgentFormModal isOpen={!!editingAgent} onClose={() => setEditingAgent(null)} onConfirm={onUpdateAgent} agentToEdit={editingAgent} shops={shops} title="更新客服" confirmText="确认更新" />}

            <SkuListFormModal 
                isOpen={isListFormModalOpen}
                onClose={() => { setIsListFormModalOpen(false); setEditingList(null); }}
                onConfirm={editingList ? onUpdateSkuList : onAddNewSkuList}
                listToEdit={editingList}
            />

             <input type="file" ref={skuFileInputRef} onChange={(e) => handleFileSelected(e, 'sku')} accept=".xlsx, .xls" className="hidden" />
             <input type="file" ref={shopFileInputRef} onChange={(e) => handleFileSelected(e, 'shop')} accept=".xlsx, .xls" className="hidden" />
             <input type="file" ref={agentFileInputRef} onChange={(e) => handleFileSelected(e, 'agent')} accept=".xlsx, .xls" className="hidden" />

            <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                            {activeTab === 'sku' ? 'SKU 资产管理' : activeTab === 'shop' ? '店铺名录' : activeTab === 'agent' ? '客服管理' : 'SKU 清单'}
                        </h1>
                        <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">
                            {activeTab === 'sku' ? 'SKU & STORE MASTER DATA' : activeTab === 'shop' ? 'SHOP ASSET OVERVIEW' : activeTab === 'agent' ? 'CUSTOMER SERVICE AGENT MANAGEMENT' : 'SKU LIST MANAGEMENT'}
                        </p>
                    </div>
                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                        <button onClick={() => setActiveTab('sku')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sku' ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>SKU 资产列表</button>
                        <button onClick={() => setActiveTab('shop')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'shop' ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>店铺名录</button>
                        <button onClick={() => setActiveTab('agent')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'agent' ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>客服管理</button>
                        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'list' ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>SKU 清单</button>
                    </div>
                </div>

                {activeTab === 'sku' && (
                    <>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                            <div className="grid grid-cols-5 gap-4 mb-4">
                               <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">品牌</label>
                                    <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none">
                                        <option value="all">全部品牌</option>
                                        {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">品类</label>
                                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none">
                                        <option value="all">全部品类</option>
                                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-400 pointer-events-none" />
                                </div>
                                 <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">状态</label>
                                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none">
                                        <option value="all">全部状态</option>
                                        <option value="在售">在售</option>
                                        <option value="待售">待售</option>
                                        <option value="下架">下架</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-400 pointer-events-none" />
                                </div>
                                 <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">广告</label>
                                    <select value={selectedAdStatus} onChange={e => setSelectedAdStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none">
                                        <option value="all">全部广告</option>
                                        <option value="在投">在投</option>
                                        <option value="未投">未投</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">模式</label>
                                    <select value={selectedMode} onChange={e => setSelectedMode(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none">
                                        <option value="all">全部模式</option>
                                        <option value="入仓">入仓</option>
                                        <option value="厂直">厂直</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-4 mb-6">
                                <div className="col-span-1 relative">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">所属店铺</label>
                                    <select value={selectedShop} onChange={e => setSelectedShop(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none">
                                        <option value="all">全部店铺</option>
                                        {shops.map((s: Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-400 pointer-events-none" />
                                </div>
                                 <div className="col-span-1 relative">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">型号</label>
                                    <select className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none">
                                        <option>全部型号</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                             <div className="mb-6">
                                 <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">SKU 精准查询</label>
                                 <div className="flex gap-4">
                                     <input placeholder="最多可输入100个SKU，以逗号或换行分隔" className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47]" />
                                     <div className="flex gap-2 shrink-0">
                                          <button className="px-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors">重置</button>
                                          <button className="px-8 rounded-lg bg-[#70AD47] text-white font-bold text-xs hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all">查询</button>
                                     </div>
                                 </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xs font-bold text-slate-500">共 {sortedAndFilteredSkus.length} 条记录</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDownloadTemplate('sku')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Download size={14} /> 下载模板</button>
                                    <button onClick={() => skuFileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><UploadCloud size={14} /> 批量导入</button>
                                    <button onClick={() => handleBulkExport('sku')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Download size={14} /> 批量导出</button>
                                    <button onClick={() => setIsAddSKUModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#70AD47] text-white font-bold text-xs hover:bg-[#5da035] shadow-md shadow-[#70AD47]/20"><Plus size={14} /> 新增资产</button>
                                </div>
                            </div>
                            
                            <table className="w-full text-sm table-fixed">
                                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="w-[18%] text-left pl-4 pb-4 border-b border-slate-100">SKU / 店铺</th>
                                        <th className="w-[14%] text-center pb-4 border-b border-slate-100">品牌 / 类目</th>
                                        <th className="w-[14%] text-center pb-4 border-b border-slate-100">型号 / 配置</th>
                                        <th className="w-[14%] text-right pr-2 pb-4 border-b border-slate-100">价格 (C/S/P)</th>
                                        <th className="w-[8%] text-center pb-4 border-b border-slate-100">模式 / 点位</th>
                                        <th className="w-[7%] text-center pb-4 border-b border-slate-100">状态</th>
                                        <th className="w-[7%] text-center pb-4 border-b border-slate-100">广告</th>
                                        <th className="w-[10%] text-center pb-4 border-b border-slate-100">库存 (仓/直)</th>
                                        <th className="w-[8%] text-center pb-4 border-b border-slate-100">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {skus.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-300">
                                                    <Package size={48} className="mb-4 opacity-20" />
                                                    <p className="text-xs font-bold">暂无SKU数据</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : sortedAndFilteredSkus.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-300">
                                                    <Package size={48} className="mb-4 opacity-20" />
                                                    <p className="text-xs font-bold">暂无匹配的SKU资产</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedAndFilteredSkus.map((sku: ProductSKU) => {
                                            const totalStock = (sku.warehouseStock || 0) + (sku.factoryStock || 0);
                                            return (
                                                <tr key={sku.id} className="text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                                                    <td className="py-4 border-b border-slate-50 text-left pl-4 font-bold align-middle">
                                                        <div className="text-slate-800 truncate" title={sku.code}>{sku.code}</div>
                                                        <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate" title={shops.find((s:Shop) => s.id === sku.shopId)?.name}>{shops.find((s:Shop) => s.id === sku.shopId)?.name || '未知店铺'}</div>
                                                    </td>
                                                    <td className="py-4 border-b border-slate-50 text-center align-middle">{sku.brand || '-'} / {sku.category || '-'}</td>
                                                    <td className="py-4 border-b border-slate-50 text-center align-middle">{sku.model || '-'} / {sku.configuration || '-'}</td>
                                                    <td className="py-4 border-b border-slate-50 font-mono text-[11px] text-right pr-2 leading-tight align-middle">
                                                        <div className="text-orange-600"><span className="text-orange-500/80 mr-1">C:</span>{sku.costPrice ? `¥${sku.costPrice.toFixed(2)}` : '-'}</div>
                                                        <div className="text-green-600 font-bold text-xs"><span className="text-green-500/80 mr-1">S:</span>{sku.sellingPrice ? `¥${sku.sellingPrice.toFixed(2)}` : '-'}</div>
                                                        <div className="text-blue-600 font-bold"><span className="text-blue-500/80 mr-1">P:</span>{sku.promoPrice ? `¥${sku.promoPrice.toFixed(2)}` : '-'}</div>
                                                    </td>
                                                    <td className="py-4 border-b border-slate-50 text-center align-middle"><span className="font-bold">{sku.mode || '-'}</span> / {sku.jdCommission ? `${sku.jdCommission}%` : '-'}</td>
                                                    <td className="py-4 border-b border-slate-50 text-center align-middle">
                                                        {sku.status === '在售' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">在售</span>}
                                                        {sku.status === '待售' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">待售</span>}
                                                        {sku.status === '下架' && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">下架</span>}
                                                    </td>
                                                    <td className="py-4 border-b border-slate-50 text-center align-middle">
                                                        {sku.advertisingStatus === '在投' && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">在投</span>}
                                                        {sku.advertisingStatus === '未投' && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold">未投</span>}
                                                    </td>
                                                    <td className="py-4 border-b border-slate-50 font-mono text-[11px] leading-tight text-center align-middle">
                                                        <div><span className="text-slate-400">仓:</span> {sku.warehouseStock ?? '-'}</div>
                                                        <div><span className="text-slate-400">直:</span> {sku.factoryStock ?? '-'}</div>
                                                        <div className="font-bold text-blue-600 border-t border-slate-200 mt-1 pt-1"><span className="text-slate-400">合:</span> {totalStock}</div>
                                                    </td>
                                                    <td className="py-4 border-b border-slate-50 text-center align-middle">
                                                        <div className="flex justify-center items-center gap-1 h-full">
                                                            <button onClick={() => setEditingSku(sku)} className="text-slate-400 hover:text-[#70AD47] p-1"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteClick(sku, 'sku')} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'shop' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
                         <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-slate-500">共 {shops.length} 条记录</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleDownloadTemplate('shop')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Download size={14} /> 下载模板</button>
                                <button onClick={() => shopFileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><UploadCloud size={14} /> 批量导入</button>
                                <button onClick={() => handleBulkExport('shop')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Download size={14} /> 批量导出</button>
                                <button onClick={() => setIsAddShopModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#70AD47] text-white font-bold text-xs hover:bg-[#5da035] shadow-md shadow-[#70AD47]/20"><Plus size={14} /> 新增店铺</button>
                            </div>
                        </div>
                        <table className="w-full text-sm table-fixed">
                            <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <tr>
                                    <th className="w-[25%] text-left pl-4 pb-4 border-b border-slate-100">店铺名称</th>
                                    <th className="w-[8%] text-center pb-4 border-b border-slate-100">经营模式</th>
                                    <th className="w-[8%] text-center pb-4 border-b border-slate-100">SKU总数</th>
                                    <th className="w-[12%] text-center pb-4 border-b border-slate-100">状态分布 (售/待/下)</th>
                                    <th className="w-[12%] text-center pb-4 border-b border-slate-100">广告分布 (投/未)</th>
                                    <th className="w-[12%] text-center pb-4 border-b border-slate-100">模式分布 (仓/直)</th>
                                    <th className="w-[12%] text-center pb-4 border-b border-slate-100">库存分布 (仓/直)</th>
                                    <th className="w-[11%] text-center pr-4 pb-4 border-b border-slate-100">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shops.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-300">
                                                <Database size={48} className="mb-4 opacity-20" />
                                                <p className="text-xs font-bold">暂无店铺数据</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (shops.map((s: Shop) => {
                                    const shopSkus = skus.filter((sku: ProductSKU) => sku.shopId === s.id);
                                    const statusOnSale = shopSkus.filter(sku => sku.status === '在售').length;
                                    const statusPending = shopSkus.filter(sku => sku.status === '待售').length;
                                    const statusOffShelf = shopSkus.filter(sku => sku.status === '下架').length;
                                    const adOn = shopSkus.filter(sku => sku.advertisingStatus === '在投').length;
                                    const adOff = shopSkus.filter(sku => sku.advertisingStatus === '未投').length;
                                    const modeWarehouse = shopSkus.filter(sku => sku.mode === '入仓').length;
                                    const modeFactoryDirect = shopSkus.filter(sku => sku.mode === '厂直').length;
                                    const totalWarehouseStock = shopSkus.reduce((sum, sku) => sum + (sku.warehouseStock || 0), 0);
                                    const totalFactoryStock = shopSkus.reduce((sum, sku) => sum + (sku.factoryStock || 0), 0);
                                    
                                    return (
                                        <tr key={s.id} className="text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                                            <td className="py-4 border-b border-slate-50 text-left pl-4 font-bold text-slate-800">{s.name}</td>
                                            <td className="py-4 border-b border-slate-50 text-center"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[10px] font-bold">{s.mode || '自营'}</span></td>
                                            <td className="py-4 border-b border-slate-50 text-center font-mono">{shopSkus.length}</td>
                                            <td className="py-4 border-b border-slate-50 text-center font-mono">
                                                <span title="在售" className="text-green-600 font-bold">{statusOnSale}</span> / 
                                                <span title="待售" className="text-amber-600 font-bold">{statusPending}</span> / 
                                                <span title="下架" className="text-slate-500 font-bold">{statusOffShelf}</span>
                                            </td>
                                            <td className="py-4 border-b border-slate-50 text-center font-mono">
                                                <span title="在投" className="text-blue-600 font-bold">{adOn}</span> / 
                                                <span title="未投" className="text-gray-500 font-bold">{adOff}</span>
                                            </td>
                                            <td className="py-4 border-b border-slate-50 text-center font-mono">
                                                <span title="入仓SKU数" className="text-purple-600 font-bold">{modeWarehouse}</span> / 
                                                <span title="厂直SKU数" className="text-cyan-600 font-bold">{modeFactoryDirect}</span>
                                            </td>
                                            <td className="py-4 border-b border-slate-50 text-center font-mono">
                                                <span title="入仓库存" className="text-sky-600 font-bold">{totalWarehouseStock}</span> / 
                                                <span title="厂直库存" className="text-teal-600 font-bold">{totalFactoryStock}</span>
                                            </td>
                                            <td className="py-4 border-b border-slate-50 text-center pr-4">
                                                <div className="flex justify-center items-center gap-1 h-full">
                                                    <button onClick={() => setEditingShop(s)} className="text-slate-400 hover:text-[#70AD47] p-1"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteClick(s, 'shop')} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'agent' && (
                     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-slate-500">共 {agents.length} 条记录</span>
                             <div className="flex gap-2">
                                <button onClick={() => handleDownloadTemplate('agent')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Download size={14} /> 下载模板</button>
                                <button onClick={() => agentFileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><UploadCloud size={14} /> 批量导入</button>
                                <button onClick={() => handleBulkExport('agent')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"><Download size={14} /> 批量导出</button>
                                <button onClick={() => setIsAddAgentModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#70AD47] text-white font-bold text-xs hover:bg-[#5da035] shadow-md shadow-[#70AD47]/20"><Plus size={14} /> 新增客服</button>
                            </div>
                        </div>
                        <table className="w-full text-sm table-fixed">
                            <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <tr>
                                    <th className="w-[20%] text-left pl-4 pb-4 border-b border-slate-100">姓名</th>
                                    <th className="w-[20%] text-center pb-4 border-b border-slate-100">客服账号</th>
                                    <th className="w-[45%] text-center pb-4 border-b border-slate-100">关联店铺</th>
                                    <th className="w-[15%] text-center pr-4 pb-4 border-b border-slate-100">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agents.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-300">
                                                <User size={48} className="mb-4 opacity-20" />
                                                <p className="text-xs font-bold">暂无客服数据</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (agents.map((a: CustomerServiceAgent) => (
                                    <tr key={a.id} className="text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 border-b border-slate-50 text-left pl-4 font-bold text-slate-800">{a.name}</td>
                                        <td className="py-4 border-b border-slate-50 text-center">{a.account}</td>
                                        <td className="py-4 border-b border-slate-50 text-center">
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {a.shopIds.map(sid => <span key={sid} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{shops.find((s:Shop)=>s.id===sid)?.name || sid}</span>)}
                                            </div>
                                        </td>
                                        <td className="py-4 border-b border-slate-50 text-center pr-4">
                                             <div className="flex justify-center items-center gap-1 h-full">
                                                <button onClick={() => setEditingAgent(a)} className="text-slate-400 hover:text-[#70AD47] p-1"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteClick(a, 'agent')} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )))}
                             </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'list' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-slate-500">共 {skuLists.length} 个清单</span>
                            <button onClick={() => { setEditingList(null); setIsListFormModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#70AD47] text-white font-bold text-xs hover:bg-[#5da035] shadow-md shadow-[#70AD47]/20"><Plus size={14} /> 创建新清单</button>
                        </div>
                        {skuLists.length === 0 ? (
                             <div className="py-20 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-300">
                                    <List size={48} className="mb-4 opacity-20" />
                                    <p className="text-xs font-bold">暂无SKU清单</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {skuLists.map(list => (
                                    <div key={list.id} className="bg-slate-50 border border-slate-200/50 rounded-lg">
                                        <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}>
                                            <div className="flex items-center gap-3">
                                                <ChevronsUpDown size={16} className={`text-slate-400 transition-transform ${expandedListId === list.id ? 'rotate-180' : ''}`} />
                                                <span className="font-bold text-slate-800">{list.name}</span>
                                                <span className="text-xs text-slate-400">({list.skuCodes.length} SKUs)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingList(list); setIsListFormModalOpen(true); }} className="text-slate-400 hover:text-[#70AD47] p-1"><Edit2 size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(list, 'list'); }} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        {expandedListId === list.id && (
                                            <div className="border-t border-slate-200 p-4 max-h-60 overflow-y-auto">
                                                <ul className="space-y-1">
                                                    {list.skuCodes.map((code, idx) => (
                                                        <li key={idx} className="flex justify-between text-xs p-1.5 rounded hover:bg-white">
                                                            <code className="text-slate-500">{code}</code>
                                                            <span className={`truncate ml-4 ${skuCodeToNameMap.has(code) ? 'text-slate-700' : 'text-rose-500 italic'}`}>
                                                                {skuCodeToNameMap.get(code) || '(未找到该资产)'}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};