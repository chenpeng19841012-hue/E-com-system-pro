
import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Package, Database, Plus, Download, UploadCloud, Edit2, ChevronDown, User, X, Trash2, List, ChevronsUpDown, LoaderCircle, CheckCircle2, AlertCircle, Store, ChevronLeft, ChevronRight, Search, ToggleLeft, ToggleRight, Box, Filter, LayoutGrid, Sparkles, ShieldAlert, CheckSquare, Square, BarChart2 } from 'lucide-react';
import { ProductSubView, Shop, ProductSKU, CustomerServiceAgent, SKUMode, SKUStatus, SKUAdvertisingStatus, SkuList } from '../lib/types';
import { parseExcelFile } from '../lib/excel';
import { ConfirmModal } from '../components/ConfirmModal';

// 导入进度弹窗 - UI 优化
const ImportProgressModal = ({ isOpen, progress, status, errorReport }: { isOpen: boolean, progress: number, status: string, errorReport?: string[] }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md p-12 animate-fadeIn border border-slate-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center text-brand mb-8 shadow-inner">
                        {progress < 100 ? <LoaderCircle size={32} className="animate-spin" /> : <CheckCircle2 size={32} />}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">{progress < 100 ? '资产链路同步中' : '物理同步完成'}</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">{status}</p>
                    
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4 p-0.5 shadow-inner">
                        <div className="bg-brand h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(112,173,71,0.5)]" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress: {progress}%</span>

                    {errorReport && errorReport.length > 0 && (
                        <div className="mt-8 w-full text-left">
                            <p className="text-[10px] font-black text-rose-500 uppercase mb-3 flex items-center gap-2"><ShieldAlert size={12}/> 物理层冲突报告 ({errorReport.length})</p>
                            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 max-h-32 overflow-y-auto no-scrollbar">
                                {errorReport.map((err, i) => <p key={i} className="text-[10px] text-rose-700 font-bold mb-1.5 opacity-80">• {err}</p>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ADD/EDIT MODALS
const SKUFormModal = ({ isOpen, onClose, onConfirm, skuToEdit, shops, addToast, title, confirmText }: any) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [shopId, setShopId] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [model, setModel] = useState('');
    const [subModel, setSubModel] = useState(''); 
    const [mtm, setMtm] = useState('');
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
    const [isStatisticsEnabled, setIsStatisticsEnabled] = useState(false);
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
            setSubModel(initialData.subModel || '');
            setMtm(initialData.mtm || '');
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
            setIsStatisticsEnabled(initialData.isStatisticsEnabled || false);
            setError('');
        }
    }, [isOpen, skuToEdit, shops]);

    const handleConfirm = async () => {
        setError('');
        if (!code.trim() || !name.trim() || !shopId) {
            setError('核心物理字段不可为空。');
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
            subModel: subModel.trim(),
            mtm: mtm.trim(),
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
            isStatisticsEnabled,
        };
        if (await onConfirm(payload)) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl p-12 m-4 max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{title}</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20} /></button>
                </div>
                <div className="space-y-8">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU 物理编码 *</label>
                            <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner font-mono" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">资产名称 *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">归属店铺 *</label>
                        <select value={shopId} onChange={e => setShopId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner appearance-none">
                            {shops.map((shop:Shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">品牌</label>
                            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">三级类目</label>
                            <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">型号 / Series</label>
                            <input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">小型号</label>
                            <input type="text" value={subModel} onChange={e => setSubModel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MTM</label>
                            <input type="text" value={mtm} onChange={e => setMtm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">详细配置 / Specs</label>
                        <input type="text" value={configuration} onChange={e => setConfiguration(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                         <PriceInput label="成本价" value={costPrice} onChange={setCostPrice} />
                         <PriceInput label="前台价" value={sellingPrice} onChange={setSellingPrice} />
                         <PriceInput label="促销价" value={promoPrice} onChange={setPromoPrice} />
                         <PriceInput label="佣金点位%" value={jdCommission} onChange={setJdCommission} />
                    </div>
                     <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">入仓物理库存</label>
                            <input type="number" value={warehouseStock} onChange={e => setWarehouseStock(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">厂直物理库存</label>
                            <input type="number" value={factoryStock} onChange={e => setFactoryStock(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                        </div>
                    </div>
                     <div className="grid grid-cols-4 gap-4 items-end pt-4 border-t border-slate-50">
                        <SelectInput label="配送模式" value={mode} options={['入仓', '厂直']} onChange={setMode} />
                        <SelectInput label="运营状态" value={status} options={['在售', '待售', '下架']} onChange={setStatus} />
                        <SelectInput label="广告权重" value={advertisingStatus} options={['未投', '在投']} onChange={setAdvertisingStatus} />
                        <div className="flex items-center justify-center pb-3">
                            <button onClick={() => setIsStatisticsEnabled(!isStatisticsEnabled)} className={`flex items-center gap-2 transition-all ${isStatisticsEnabled ? 'text-brand' : 'text-slate-300'}`}>
                                {isStatisticsEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                <span className="text-[10px] font-black uppercase tracking-widest">参与统计</span>
                            </button>
                        </div>
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-6 bg-rose-50 p-4 rounded-2xl font-bold border border-rose-100 flex items-center gap-2"><AlertCircle size={14}/> {error}</p>}
                <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-50">
                    <button onClick={onClose} className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest">取消</button>
                    <button onClick={handleConfirm} className="px-10 py-4 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all active:scale-95 uppercase tracking-widest">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const PriceInput = ({ label, value, onChange }: any) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-800 outline-none focus:border-brand shadow-inner font-mono" />
    </div>
);

const SelectInput = ({ label, value, options, onChange }: any) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm">
            {options.map((o:any) => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

const ShopFormModal = ({ isOpen, onClose, onConfirm, shopToEdit, title, confirmText }: any) => {
    const [name, setName] = useState('');
    const [platformId, setPlatformId] = useState('');
    const [mode, setMode] = useState('自营');
    const [isDefault, setIsDefault] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setName(shopToEdit?.name || '');
            setPlatformId(shopToEdit?.platformId || '');
            setMode(shopToEdit?.mode || '自营');
            setIsDefault(shopToEdit?.isDefault || false);
            setError('');
        }
    }, [isOpen, shopToEdit]);

    const handleConfirm = async () => {
        if (!name.trim()) { setError('店铺名称不可为空。'); return; }
        const payload = { id: shopToEdit?.id, name: name.trim(), platformId: platformId.trim(), mode, isDefault };
        if (await onConfirm(payload)) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 m-4 border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{title}</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">店铺名称</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">平台 ID</label>
                        <input value={platformId} onChange={e => setPlatformId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono font-black text-slate-600 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <SelectInput label="经营模式" value={mode} options={['自营', 'POP', '分销']} onChange={setMode} />
                    <div className="mt-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">默认状态</label>
                        <div className="mt-2 flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                            <p className="text-sm font-bold text-slate-700">上传商智时，若无店铺归属则优先匹配此店铺</p>
                            <button onClick={() => setIsDefault(!isDefault)} className={`flex items-center gap-2 transition-all ${isDefault ? 'text-brand' : 'text-slate-400'}`}>
                                {isDefault ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                        </div>
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-6 bg-rose-50 p-3 rounded-xl font-bold border border-rose-100">{error}</p>}
                <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-50">
                    <button onClick={onClose} className="px-8 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all uppercase">取消</button>
                    <button onClick={handleConfirm} className="px-10 py-3.5 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-xl shadow-brand/20 transition-all active:scale-95 uppercase">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const AgentFormModal = ({ isOpen, onClose, onConfirm, agentToEdit, shops, title, confirmText }: any) => {
    const [name, setName] = useState('');
    const [account, setAccount] = useState('');
    const [shopIds, setShopIds] = useState<string[]>([]);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setName(agentToEdit?.name || '');
            setAccount(agentToEdit?.account || '');
            setShopIds(agentToEdit?.shopIds || []);
            setError('');
        }
    }, [isOpen, agentToEdit]);

    const handleConfirm = async () => {
        if (!name.trim() || !account.trim()) { setError('姓名与账号为必填项。'); return; }
        const payload = { id: agentToEdit?.id, name: name.trim(), account: account.trim(), shopIds };
        if (await onConfirm(payload)) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 m-4 border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{title}</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">客服姓名</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">平台账号</label>
                        <input value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono font-black text-slate-600 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">关联店铺权限</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto no-scrollbar p-2 bg-slate-50 rounded-2xl border border-slate-200">
                            {shops.map((s: Shop) => (
                                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors">
                                    <input type="checkbox" checked={shopIds.includes(s.id)} onChange={() => setShopIds(p => p.includes(s.id) ? p.filter(i => i !== s.id) : [...p, s.id])} className="rounded text-brand focus:ring-brand" />
                                    <span className="text-xs font-bold text-slate-700">{s.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-6 bg-rose-50 p-3 rounded-xl font-bold border border-rose-100">{error}</p>}
                <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-50">
                    <button onClick={onClose} className="px-8 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all uppercase">取消</button>
                    <button onClick={handleConfirm} className="px-10 py-3.5 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-xl shadow-brand/20 transition-all active:scale-95 uppercase">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const SkuListFormModal = ({ isOpen, onClose, onConfirm, listToEdit }: any) => {
    const [name, setName] = useState('');
    const [skuCodes, setSkuCodes] = useState('');
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setName(listToEdit?.name || '');
            setSkuCodes(listToEdit?.skuCodes?.join('\n') || '');
            setError('');
        }
    }, [isOpen, listToEdit]);

    const handleConfirm = async () => {
        if (!name.trim()) { setError('清单名称必填。'); return; }
        const codes = skuCodes.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        const payload = { id: listToEdit?.id, name: name.trim(), skuCodes: codes };
        if (await onConfirm(payload)) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 m-4 border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{listToEdit ? '编辑清单' : '创建分层清单'}</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">清单名称</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：高端游戏本促销组" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU 编码列表 (每行一个)</label>
                        <textarea value={skuCodes} onChange={e => setSkuCodes(e.target.value)} className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-slate-600 outline-none focus:border-brand shadow-inner resize-none no-scrollbar" placeholder="SKU12345&#10;SKU67890..." />
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-6 bg-rose-50 p-3 rounded-xl font-bold border border-rose-100">{error}</p>}
                <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-50">
                    <button onClick={onClose} className="px-8 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all uppercase">取消</button>
                    <button onClick={handleConfirm} className="px-10 py-3.5 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-xl shadow-brand/20 transition-all active:scale-95 uppercase">保存清单</button>
                </div>
            </div>
        </div>
    );
};

interface SKUManagementViewProps {
    skus: ProductSKU[];
    shops: Shop[];
    agents: CustomerServiceAgent[];
    skuLists: SkuList[];
    onAddNewSKU: (sku: any) => Promise<boolean>;
    onUpdateSKU: (sku: ProductSKU) => Promise<boolean>;
    onDeleteSKU: (id: string) => Promise<void>;
    onBulkAddSKUs: (skus: any[]) => Promise<void>;
    onAddNewShop: (shop: any) => Promise<boolean>;
    onUpdateShop: (shop: Shop) => Promise<boolean>;
    onDeleteShop: (id: string) => Promise<void>;
    onBulkAddShops: (shops: any[]) => Promise<void>;
    onAddNewAgent: (agent: any) => Promise<boolean>;
    onUpdateAgent: (agent: CustomerServiceAgent) => Promise<boolean>;
    onDeleteAgent: (id: string) => Promise<void>;
    onBulkAddAgents: (agents: any[]) => Promise<void>;
    onAddNewSkuList: (list: any) => Promise<boolean>;
    onUpdateSkuList: (list: SkuList) => Promise<boolean>;
    onDeleteSkuList: (id: string) => void;
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
    // ... (Existing State) ...
    const [activeTab, setActiveTab] = useState<ProductSubView>('sku');
    const [importModal, setImportModal] = useState({ isOpen: false, progress: 0, status: '', errors: [] as string[] });

    // ... (Modals State) ...
    const [isAddSKUModalOpen, setIsAddSKUModalOpen] = useState(false);
    const [editingSku, setEditingSku] = useState<ProductSKU | null>(null);
    const skuFileInputRef = useRef<HTMLInputElement>(null);
    const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);
    const shopFileInputRef = useRef<HTMLInputElement>(null);
    const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<CustomerServiceAgent | null>(null);
    const agentFileInputRef = useRef<HTMLInputElement>(null);
    const [isListFormModalOpen, setIsListFormModalOpen] = useState(false);
    const [editingList, setEditingList] = useState<SkuList | null>(null);
    const [expandedListId, setExpandedListId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'sku' | 'shop' | 'agent' | 'list' } | null>(null);

    // SKU Filter States - CHANGED: Replace selectedBrand with selectedStats
    const [selectedStats, setSelectedStats] = useState('all'); // 'all' | 'true' | 'false'
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedShop, setSelectedShop] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedAdStatus, setSelectedAdStatus] = useState('all');
    const [selectedMode, setSelectedMode] = useState('all');
    const [selectedModel, setSelectedModel] = useState('all');
    const [skuSearchText, setSkuSearchText] = useState('');
    const [appliedSkuSearch, setAppliedSkuSearch] = useState<string[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 50;

    const skuCodeToNameMap = useMemo(() => new Map(skus.map(s => [s.code, s.name])), [skus]);
    const shopIdToName = useMemo(() => new Map(shops.map(s => [s.id, s.name])), [shops]);
    const uniqueCategories = useMemo(() => Array.from(new Set(skus.map(sku => sku.category).filter(Boolean))).sort(), [skus]);
    const uniqueModels = useMemo(() => Array.from(new Set(skus.map(sku => sku.model).filter(Boolean))).sort(), [skus]);

    // FILTER LOGIC - UPDATED
    const filteredSkus = useMemo(() => {
        return skus.filter(sku => {
            const statsMatch = selectedStats === 'all' || 
                               (selectedStats === 'true' && sku.isStatisticsEnabled) || 
                               (selectedStats === 'false' && !sku.isStatisticsEnabled);
            const categoryMatch = selectedCategory === 'all' || sku.category === selectedCategory;
            const shopMatch = selectedShop === 'all' || sku.shopId === selectedShop;
            const statusMatch = selectedStatus === 'all' || sku.status === selectedStatus;
            const adMatch = selectedAdStatus === 'all' || sku.advertisingStatus === selectedAdStatus;
            const modeMatch = selectedMode === 'all' || sku.mode === selectedMode;
            const modelMatch = selectedModel === 'all' || sku.model === selectedModel;
            let skuTextMatch = true;
            if (appliedSkuSearch.length > 0) {
                skuTextMatch = appliedSkuSearch.some(term => 
                    sku.code.includes(term) || sku.name.includes(term) || (sku.model && sku.model.includes(term))
                );
            }
            return statsMatch && categoryMatch && shopMatch && statusMatch && adMatch && modeMatch && modelMatch && skuTextMatch;
        });
    }, [skus, selectedStats, selectedCategory, selectedShop, selectedStatus, selectedAdStatus, selectedMode, selectedModel, appliedSkuSearch]);

    // ... (rest of filtering and sorting logic) ...
    const sortedAndFilteredSkus = useMemo(() => {
        const order: any = { '在售': 1, '待售': 2, '下架': 3 };
        return [...filteredSkus].sort((a, b) => (order[a.status ?? '下架'] || 99) - (order[b.status ?? '下架'] || 99));
    }, [filteredSkus]);
    
    const totalPages = Math.ceil(sortedAndFilteredSkus.length / ROWS_PER_PAGE);
    const paginatedSkus = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return sortedAndFilteredSkus.slice(start, start + ROWS_PER_PAGE);
    }, [sortedAndFilteredSkus, currentPage]);

    useEffect(() => setCurrentPage(1), [selectedStats, selectedCategory, selectedShop, selectedStatus, selectedAdStatus, selectedMode, selectedModel, appliedSkuSearch]);

    // ... (Handlers) ...
    const handleSearchClick = () => {
        const terms = skuSearchText.split(/[\n,，\s]+/).map(s => s.trim()).filter(Boolean);
        setAppliedSkuSearch(terms);
    };

    const handleResetFilters = () => {
        setSelectedStats('all'); setSelectedCategory('all'); setSelectedShop('all');
        setSelectedStatus('all'); setSelectedAdStatus('all'); setSelectedMode('all');
        setSelectedModel('all'); setSkuSearchText(''); setAppliedSkuSearch([]);
    };

    const handleDeleteClick = (item: any, type: 'sku' | 'shop' | 'agent' | 'list') => setDeleteTarget({ id: item.id, name: item.name, type });
    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === 'sku') onDeleteSKU(deleteTarget.id);
        if (deleteTarget.type === 'shop') onDeleteShop(deleteTarget.id);
        if (deleteTarget.type === 'agent') onDeleteAgent(deleteTarget.id);
        if (deleteTarget.type === 'list') onDeleteSkuList(deleteTarget.id);
        setDeleteTarget(null);
    };

    // ... (Export/Import Handlers) ...
    const handleDownloadTemplate = (type: 'sku' | 'shop' | 'agent') => {
        let headers = type === 'sku' ? ['SKU编码 (code)', '商品名称 (name)', '店铺名称 (shopName)', '品牌 (brand)', '类目 (category)', '型号 (model)', '小型号 (subModel)', 'MTM (mtm)', '配置 (configuration)', '成本价 (costPrice)', '前台价 (sellingPrice)', '促销价 (promoPrice)', '京东点位% (jdCommission)', '入仓库存 (warehouseStock)', '厂直库存 (factoryStock)', '模式 (mode)', '状态 (status)', '广告 (advertisingStatus)', '统计 (isStatisticsEnabled)']
                    : type === 'shop' ? ['店铺名称 (name)', '店铺ID (platformId)', '经营模式 (mode)']
                    : ['姓名 (name)', '客服账号 (account)', '关联店铺 (shopNames)'];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "模板");
        XLSX.writeFile(wb, `${type.toUpperCase()}_Template.xlsx`);
        addToast('success', '下载成功', '已生成标准维模板文件。');
    };
    
    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: 'sku' | 'shop' | 'agent') => {
        const file = e.target.files?.[0]; if (!file) return;
        setImportModal({ isOpen: true, progress: 10, status: '物理文件流解析中...', errors: [] });
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const { data } = parseExcelFile(bstr);
                if (data.length === 0) { addToast('error', '同步异常', '文件中未探测到有效记录。'); setImportModal(p => ({...p, isOpen: false})); return; }
                setImportModal(p => ({...p, progress: 30, status: `扫描到 ${data.length} 条资产，正在进行特征匹配...`}));
                const errors: string[] = []; let success = 0;
                if (type === 'sku') {
                    const shopMap = new Map(shops.map(s => [s.name.trim().toLowerCase(), s.id]));
                    const processed = data.map((row: any, i: number) => {
                         const shopName = String(row['店铺名称 (shopName)'] || row['店铺名称'] || '').trim().toLowerCase();
                         const shopId = shopMap.get(shopName);
                         if (!shopId) { errors.push(`行 ${i + 2}: 未找到匹配店铺 [${shopName}]`); return null; }
                         success++;
                         return { code: String(row['SKU编码 (code)'] || row['SKU编码'] || ''), name: String(row['商品名称 (name)'] || row['商品名称'] || ''), shopId, brand: String(row['品牌 (brand)'] || row['品牌'] || ''), category: String(row['类目 (category)'] || row['类目'] || ''), model: String(row['型号 (model)'] || row['型号'] || ''), subModel: String(row['小型号 (subModel)'] || row['小型号'] || ''), mtm: String(row['MTM (mtm)'] || row['MTM'] || ''), configuration: String(row['配置 (configuration)'] || row['配置'] || ''), costPrice: parseFloat(row['成本价 (costPrice)'] || row['成本价'] || '0'), sellingPrice: parseFloat(row['前台价 (sellingPrice)'] || row['前台价'] || '0'), promoPrice: parseFloat(row['促销价 (promoPrice)'] || row['促销价'] || '0'), jdCommission: parseFloat(row['京东点位% (jdCommission)'] || row['京东点位%'] || '0'), warehouseStock: parseInt(row['入仓库存 (warehouseStock)'] || row['入仓库存'] || '0'), factoryStock: parseInt(row['厂直库存 (factoryStock)'] || row['厂直库存'] || '0'), mode: (row['模式 (mode)'] || row['模式'] || '入仓') as SKUMode, status: (row['状态 (status)'] || row['状态'] || '在售') as SKUStatus, advertisingStatus: (row['广告 (advertisingStatus)'] || row['广告'] || '未投') as SKUAdvertisingStatus, isStatisticsEnabled: String(row['统计 (isStatisticsEnabled)'] || row['统计'] || 'true').includes('true') };
                    }).filter(Boolean);
                    setImportModal(p => ({...p, progress: 70, status: '正在注入本地数据库...', errors}));
                    await onBulkAddSKUs(processed as any);
                } else if (type === 'shop') {
                     const processed = data.map((row: any, i: number) => {
                        const name = row['店铺名称 (name)'] || row['店铺名称'];
                        if (!name) { errors.push(`行 ${i + 2}: 店铺名称缺失`); return null; }
                        success++;
                        return { name: String(name).trim(), platformId: String(row['店铺ID (platformId)'] || row['店铺ID'] || '').trim(), mode: String(row['经营模式 (mode)'] || row['经营模式'] || '自营').trim() };
                     }).filter(Boolean);
                     setImportModal(p => ({...p, progress: 70, status: '执行物理对齐...', errors}));
                     await onBulkAddShops(processed as any);
                } else if (type === 'agent') {
                    const shopMap = new Map(shops.map(s => [s.name.trim().toLowerCase(), s.id]));
                    const processed = data.map((row: any, i: number) => {
                        const name = row['姓名 (name)'] || row['姓名']; const account = row['客服账号 (account)'] || row['客服账号'];
                        if (!name || !account) { errors.push(`行 ${i + 2}: 物理标识缺失`); return null; }
                        const shopIds = String(row['关联店铺 (shopNames)'] || row['关联店铺'] || '').split(/[;,\n]/).map(n => shopMap.get(n.trim().toLowerCase())).filter(Boolean);
                        success++;
                        return { name: String(name).trim(), account: String(account).trim(), shopIds };
                    }).filter(Boolean);
                    setImportModal(p => ({...p, progress: 70, status: '物理席位同步中...', errors}));
                    await onBulkAddAgents(processed as any);
                }
                setImportModal(p => ({...p, progress: 100, status: `物理对齐成功，新增 ${success} 条经营资产。`}));
                setTimeout(() => setImportModal(p => ({...p, isOpen: false})), 2000);
            } catch (err: any) { setImportModal(p => ({...p, isOpen: false})); addToast('error', '同步崩溃', '资产解析异常，请检查文件结构。'); }
        };
        reader.readAsBinaryString(file); e.target.value = '';
    };

    const handleBulkExport = (type: 'sku' | 'shop' | 'agent') => {
        try {
            let headers: string[] = [], data: any[][] = [], fn = ''; 
            const d = new Date().toISOString().split('T')[0];
            
            if (type === 'sku') {
                const sm = new Map(shops.map(s => [s.id, s.name]));
                headers = ['SKU编码', '商品名称', '店铺名称', '品牌', '类目', '型号', '小型号', 'MTM', '配置', '成本价', '前台价', '促销价', '京东点位%', '入仓库存', '厂直库存', '模式', '状态', '广告', '统计'];
                data = sortedAndFilteredSkus.map(s => [s.code, s.name, sm.get(s.shopId) || '未知', s.brand, s.category, s.model, s.subModel, s.mtm, s.configuration, s.costPrice, s.sellingPrice, s.promoPrice, s.jdCommission, s.warehouseStock, s.factoryStock, s.mode, s.status, s.advertisingStatus, s.isStatisticsEnabled ? '是' : '否']);
                fn = `SKU_Assets_${d}.xlsx`;
            } else if (type === 'shop') {
                 headers = ['店铺名称', '店铺ID', '经营模式'];
                 data = shops.map(s => [s.name, s.platformId, s.mode]); 
                 fn = `Shops_Assets_${d}.xlsx`;
            } else {
                 const sm = new Map(shops.map(s => [s.id, s.name]));
                 headers = ['姓名', '客服账号', '关联店铺'];
                 data = agents.map(a => [a.name, a.account, a.shopIds.map(id => sm.get(id)).filter(Boolean).join(', ')]); 
                 fn = `Agents_Assets_${d}.xlsx`;
            }

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            XLSX.utils.book_append_sheet(wb, ws, "Export");
            XLSX.writeFile(wb, fn);
            
            addToast('success', '导出完成', `已将 ${data.length} 条资产打包输出。`);
        } catch (e: any) {
            console.error("Export failed:", e);
            addToast('error', '导出失败', `生成文件时发生错误: ${e.message}`);
        }
    };

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 pb-20 bg-[#F8FAFC] min-h-screen">
            {/* ... (ImportProgressModal, ConfirmModal, SKUFormModal, ShopFormModal, AgentFormModal, SkuListFormModal, Inputs) same as before ... */}
            <ImportProgressModal isOpen={importModal.isOpen} progress={importModal.progress} status={importModal.status} errorReport={importModal.errors} />
            <ConfirmModal isOpen={!!deleteTarget} title="物理层删除确认" onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} confirmText="永久移除" confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20">
                <p>您正在执行物理层移除指令：<strong className="font-black text-slate-900">"{deleteTarget?.name}"</strong></p>
                <p className="mt-2 text-rose-500 font-bold opacity-80">该操作将永久注销资产名录中的对应记录，无法撤销。</p>
            </ConfirmModal>

            <SKUFormModal isOpen={isAddSKUModalOpen} onClose={() => setIsAddSKUModalOpen(false)} onConfirm={onAddNewSKU} shops={shops} addToast={addToast} title="新增 SKU 物理资产" confirmText="确认录入" />
            {editingSku && <SKUFormModal isOpen={!!editingSku} onClose={() => setEditingSku(null)} onConfirm={onUpdateSKU} skuToEdit={editingSku} shops={shops} addToast={addToast} title="修订 SKU 资产参数" confirmText="确认更新" />}
            <ShopFormModal isOpen={isAddShopModalOpen} onClose={() => setIsAddShopModalOpen(false)} onConfirm={onAddNewShop} title="建立店铺资产" confirmText="确认新增" />
            {editingShop && <ShopFormModal isOpen={!!editingShop} onClose={() => setEditingShop(null)} onConfirm={onUpdateShop} shopToEdit={editingShop} title="修订店铺资产" confirmText="确认更新" />}
            <AgentFormModal isOpen={isAddAgentModalOpen} onClose={() => setIsAddAgentModalOpen(false)} onConfirm={onAddNewAgent} shops={shops} title="同步客服席位" confirmText="确认新增" />
            {editingAgent && <AgentFormModal isOpen={!!editingAgent} onClose={() => setEditingAgent(null)} onConfirm={onUpdateAgent} agentToEdit={editingAgent} shops={shops} title="修订席位属性" confirmText="确认更新" />}
            <SkuListFormModal isOpen={isListFormModalOpen} onClose={() => { setIsListFormModalOpen(false); setEditingList(null); }} onConfirm={editingList ? onUpdateSkuList : onAddNewSkuList} listToEdit={editingList} />

            <input type="file" ref={skuFileInputRef} onChange={(e) => handleFileSelected(e, 'sku')} accept=".xlsx, .xls" className="hidden" />
            <input type="file" ref={shopFileInputRef} onChange={(e) => handleFileSelected(e, 'shop')} accept=".xlsx, .xls" className="hidden" />
            <input type="file" ref={agentFileInputRef} onChange={(e) => handleFileSelected(e, 'agent')} accept=".xlsx, .xls" className="hidden" />

            {/* Command Header - Standardized */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">物理层资产链路已建立</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {activeTab === 'sku' ? 'SKU 资产名录' : activeTab === 'shop' ? '核心店铺名录' : activeTab === 'agent' ? '客服席位管控' : '分层清单实验室'}
                    </h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 opacity-60">Physical Master Data Management & Assets Governance Hub</p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-[22px] shadow-inner border border-slate-200">
                    {[ {id:'sku',l:'SKU资产'}, {id:'shop',l:'店铺名录'}, {id:'agent',l:'客服席位'}, {id:'list',l:'分层清单'} ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as ProductSubView)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === t.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}>{t.l}</button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[56px] shadow-sm border border-slate-100 p-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(112,173,71,0.025),transparent_70%)] pointer-events-none"></div>
                
                {activeTab === 'sku' && (
                    <div className="space-y-12 relative z-10">
                        {/* Filter Control Matrix */}
                        <div className="bg-slate-50/50 rounded-[40px] p-10 border border-slate-100 shadow-inner space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5">
                                <SelectFilter label="归属店铺" value={selectedShop} onChange={setSelectedShop} options={[{v:'all',l:'全域探测'}, ...shops.map(s=>({v:s.id,l:s.name}))]} />
                                <SelectFilter label="类目筛选" value={selectedCategory} onChange={setSelectedCategory} options={[{v:'all',l:'所有类目'}, ...uniqueCategories.map(c=>({v:c,l:c}))]} />
                                
                                {/* REPLACED: Brand -> Statistics Status */}
                                <SelectFilter label="统计状态" value={selectedStats} onChange={setSelectedStats} options={[{v:'all',l:'全部状态'}, {v:'true',l:'统计中'}, {v:'false',l:'已忽略'}]} />
                                
                                <SelectFilter label="型号检索" value={selectedModel} onChange={setSelectedModel} options={[{v:'all',l:'所有型号'}, ...uniqueModels.map(m=>({v:m,l:m}))]} />
                                <SelectFilter label="物理状态" value={selectedStatus} onChange={setSelectedStatus} options={[{v:'all',l:'所有状态'}, {v:'在售',l:'在售中'}, {v:'待售',l:'待上架'}, {v:'下架',l:'已下架'}]} />
                                <SelectFilter label="广告权重" value={selectedAdStatus} onChange={setSelectedAdStatus} options={[{v:'all',l:'全权重'}, {v:'在投',l:'重点投放'}, {v:'未投',l:'自然量'}]} />
                                <SelectFilter label="配送模式" value={selectedMode} onChange={setSelectedMode} options={[{v:'all',l:'全模式'}, {v:'入仓',l:'入仓模式'}, {v:'厂直',l:'厂家直发'}]} />
                            </div>
                            <div className="flex gap-6 items-end pt-8 border-t border-slate-200/50">
                                <div className="flex-1 relative group/search">
                                    <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-brand transition-colors" />
                                    <input placeholder="穿透检索 SKU 编码、资产名称 or 型号规格..." value={skuSearchText} onChange={e => setSkuSearchText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchClick()} className="w-full bg-white border border-slate-200 rounded-3xl pl-16 pr-8 py-5 text-sm font-bold text-slate-700 outline-none focus:border-brand shadow-sm transition-all" />
                                </div>
                                <div className="flex gap-3 pb-1">
                                    <button onClick={handleResetFilters} className="px-8 py-5 rounded-[22px] bg-slate-100 text-slate-500 font-black text-xs hover:bg-slate-200 transition-all uppercase tracking-widest">重置</button>
                                    <button onClick={handleSearchClick} className="px-12 py-5 rounded-[22px] bg-navy text-white font-black text-xs hover:bg-slate-800 shadow-xl shadow-navy/20 transition-all flex items-center gap-3 uppercase tracking-[0.2em] active:scale-95"><Filter size={16}/> 执行检索</button>
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-brand/5 rounded-2xl border border-brand/10 flex items-center gap-3">
                                    <Database size={20} className="text-brand" />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">已同步资产: <span className="text-slate-900">{sortedAndFilteredSkus.length}</span> / {skus.length}</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <GhostButton onClick={() => handleDownloadTemplate('sku')} icon={<Download size={14}/>} label="下载模板" />
                                <GhostButton onClick={() => skuFileInputRef.current?.click()} icon={<UploadCloud size={14}/>} label="批量导入" />
                                <GhostButton onClick={() => handleBulkExport('sku')} icon={<Download size={14}/>} label="批量导出" />
                                <button onClick={() => setIsAddSKUModalOpen(true)} className="px-10 py-4 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95"><Plus size={16}/> 新增资产录入</button>
                            </div>
                        </div>

                        {/* High-Density Table */}
                        <div className="overflow-x-auto rounded-[40px] border border-slate-100 no-scrollbar shadow-inner bg-white">
                            <table className="w-full text-sm table-fixed min-w-[1500px]">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
                                        <th className="w-[15%] text-left pl-10 py-6">SKU 物理标识</th>
                                        <th className="w-[10%] text-center">分类 / 品牌</th>
                                        <th className="w-[18%] text-center">规格配置 / 型号</th>
                                        <th className="w-[12%] text-center">MTM / 小型号</th>
                                        <th className="w-[10%] text-right pr-6">结算 / 标价 / 促</th>
                                        <th className="w-[8%] text-center">点位 / 模式</th>
                                        <th className="w-[12%] text-center">全渠道物理库存</th>
                                        <th className="w-[8%] text-center">运营权重</th>
                                        <th className="w-[6%] text-center">统计</th>
                                        <th className="w-[7%] text-center pr-10">审计</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedSkus.length === 0 ? (
                                        <tr><td colSpan={10} className="py-40 text-center opacity-30 italic font-black uppercase tracking-widest text-slate-300">No Asset Data Detected</td></tr>
                                    ) : (
                                        paginatedSkus.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-all group/row">
                                                <td className="py-6 pl-10">
                                                    <div className="font-black text-slate-900 text-sm truncate" title={s.code}>{s.code}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter opacity-60 flex items-center gap-2"><Store size={10}/> {shopIdToName.get(s.shopId) || '未知'}</div>
                                                </td>
                                                <td className="text-center">
                                                    <div className="text-slate-700 font-black text-[11px]">{s.category || '-'}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold">{s.brand || '-'}</div>
                                                </td>
                                                <td className="text-center px-4">
                                                    <div className="text-slate-800 font-bold text-xs truncate" title={s.model}>{s.model || '-'}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium truncate italic" title={s.configuration}>{s.configuration || '-'}</div>
                                                </td>
                                                <td className="text-center">
                                                    <div className="text-slate-700 font-black text-[11px]">{s.mtm || '-'}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{s.subModel || '-'}</div>
                                                </td>
                                                <td className="text-right pr-6 font-mono text-[11px] leading-relaxed">
                                                    <div className="text-orange-500 font-black">¥{(s.costPrice||0).toLocaleString()}</div>
                                                    <div className="text-brand font-black text-xs">¥{(s.sellingPrice||0).toLocaleString()}</div>
                                                    <div className="text-blue-500 font-black">¥{(s.promoPrice||0).toLocaleString()}</div>
                                                </td>
                                                <td className="text-center">
                                                    <div className="text-slate-800 font-black text-[11px]">{s.jdCommission ? `${s.jdCommission}%` : '0%'}</div>
                                                    <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${s.mode==='入仓'?'text-blue-500':'text-cyan-500'}`}>{s.mode || '未知'}</div>
                                                </td>
                                                <td className="text-center">
                                                     <div className="flex items-center justify-center gap-3">
                                                         <div className="text-right"><p className="text-[8px] font-black text-slate-300 uppercase">仓</p><p className="text-xs font-black text-slate-600 font-mono">{s.warehouseStock || 0}</p></div>
                                                         <div className="w-[1px] h-6 bg-slate-100"></div>
                                                         <div className="text-left"><p className="text-[8px] font-black text-slate-300 uppercase">直</p><p className="text-xs font-black text-slate-600 font-mono">{s.factoryStock || 0}</p></div>
                                                         <div className="ml-2 px-2 py-1 bg-slate-50 rounded-lg"><p className="text-[8px] font-black text-brand uppercase">合</p><p className="text-xs font-black text-brand font-mono">{(s.warehouseStock||0)+(s.factoryStock||0)}</p></div>
                                                     </div>
                                                </td>
                                                <td className="text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <StatusBadge status={s.status} />
                                                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${s.advertisingStatus==='在投'?'bg-blue-50 text-blue-600 border border-blue-100':'bg-slate-100 text-slate-400'}`}>{s.advertisingStatus}</div>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                     <div className="flex flex-col items-center gap-1">
                                                         {s.isStatisticsEnabled ? (
                                                             <CheckCircle2 size={16} className="text-brand" />
                                                         ) : (
                                                             <BarChart2 size={16} className="text-slate-200" />
                                                         )}
                                                         <span className={`text-[8px] font-black uppercase ${s.isStatisticsEnabled ? 'text-brand' : 'text-slate-300'}`}>{s.isStatisticsEnabled ? '统计中' : '忽略'}</span>
                                                     </div>
                                                </td>
                                                <td className="text-center pr-10">
                                                     <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingSku(s)} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-brand hover:border-brand shadow-sm transition-all"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteClick(s, 'sku')} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-200 shadow-sm transition-all"><Trash2 size={14} /></button>
                                                     </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Area */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-8">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">展示 {(currentPage - 1) * ROWS_PER_PAGE + 1} - {Math.min(currentPage * ROWS_PER_PAGE, sortedAndFilteredSkus.length)} / 共 {sortedAndFilteredSkus.length}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all bg-slate-50/50 hover:bg-white"><ChevronLeft size={16} /></button>
                                    <div className="flex gap-1.5">
                                        {[...Array(Math.min(5, totalPages))].map((_, i) => (
                                            <button key={i} onClick={() => setCurrentPage(i+1)} className={`w-10 h-10 rounded-2xl text-[10px] font-black transition-all ${currentPage===i+1?'bg-brand text-white shadow-xl shadow-brand/30 scale-110':'text-slate-400 hover:bg-slate-50'}`}>{i+1}</button>
                                        ))}
                                    </div>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all bg-slate-50/50 hover:bg-white"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab !== 'sku' && (
                    <div className="space-y-12 animate-fadeIn">
                        {/* ... (Shops, Agents, Lists views content) ... */}
                        <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-8">
                             <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-brand">
                                    {activeTab==='shop'?<Store size={28}/>:activeTab==='agent'?<User size={28}/>:<List size={28}/>}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">已挂载资产明细</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Physical Entities Management</p>
                                </div>
                             </div>
                             <div className="flex gap-3">
                                {activeTab !== 'list' && (
                                    <>
                                        <GhostButton onClick={() => handleDownloadTemplate(activeTab as any)} icon={<Download size={14}/>} label="模板" />
                                        <GhostButton onClick={() => (activeTab==='shop'?shopFileInputRef:agentFileInputRef).current?.click()} icon={<UploadCloud size={14}/>} label="导入" />
                                        <GhostButton onClick={() => handleBulkExport(activeTab as any)} icon={<Download size={14}/>} label="导出" />
                                    </>
                                )}
                                <button onClick={() => activeTab==='shop'?setIsAddShopModalOpen(true):activeTab==='agent'?setIsAddAgentModalOpen(true):setIsListFormModalOpen(true)} className="px-10 py-4 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95"><Plus size={16}/> 新增{activeTab==='shop'?'店铺':activeTab==='agent'?'席位':'清单'}</button>
                             </div>
                        </div>

                        <div className="overflow-hidden rounded-[40px] border border-slate-100 bg-white">
                             {activeTab === 'shop' && (
                                <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-50/80"><tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-100"><th className="p-6 pl-10">店铺物理全称</th><th className="p-6 text-center">模式</th><th className="p-6 text-center">平台 ID</th><th className="p-6 text-center">默认状态</th><th className="p-6 text-center">操作</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {shops.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-6 pl-10 font-black text-slate-800 text-sm">{s.name}</td>
                                                <td className="p-6 text-center"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{s.mode}</span></td>
                                                <td className="p-6 text-center font-mono font-bold text-slate-400">{s.platformId || '-'}</td>
                                                <td className="p-6 text-center">
                                                    <button onClick={() => onUpdateShop({ ...s, isDefault: !s.isDefault })} className={`flex items-center justify-center mx-auto gap-2 transition-all ${s.isDefault ? 'text-brand' : 'text-slate-300 hover:text-slate-500'}`}>
                                                        {s.isDefault ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{s.isDefault ? '默认' : ''}</span>
                                                    </button>
                                                </td>
                                                <td className="p-6 text-center">
                                                     <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingShop(s)} className="p-2.5 border border-slate-100 rounded-xl text-slate-400 hover:text-brand hover:bg-white shadow-sm"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeleteClick(s, 'shop')} className="p-2.5 border border-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-white shadow-sm"><Trash2 size={14}/></button>
                                                     </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             )}
                             {activeTab === 'agent' && (
                                <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-50/80"><tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-100"><th className="p-6 pl-10">姓名</th><th className="p-6 text-center">平台账号</th><th className="p-6 text-center">关联资产范围</th><th className="p-6 text-center">操作</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {agents.map(a => (
                                            <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-6 pl-10 font-black text-slate-800 text-sm">{a.name}</td>
                                                <td className="p-6 text-center font-mono font-bold text-slate-500">{a.account}</td>
                                                <td className="p-6 text-center">
                                                    <div className="flex flex-wrap gap-2 justify-center">
                                                        {a.shopIds.map(sid => <span key={sid} className="px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded text-[8px] font-black uppercase">{shops.find(sh=>sh.id===sid)?.name || sid}</span>)}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-center">
                                                     <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingAgent(a)} className="p-2.5 border border-slate-100 rounded-xl text-slate-400 hover:text-brand hover:bg-white shadow-sm"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeleteClick(a, 'agent')} className="p-2.5 border border-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-white shadow-sm"><Trash2 size={14}/></button>
                                                     </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             )}
                             {activeTab === 'list' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-10">
                                    {skuLists.map(list => (
                                        <div key={list.id} className="bg-slate-50/50 border border-slate-100 rounded-[40px] overflow-hidden group/card hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all p-8 flex flex-col justify-between h-[280px]">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                     <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-brand shadow-sm"><List size={20}/></div>
                                                     <div className="flex gap-2">
                                                        <button onClick={() => { setEditingList(list); setIsListFormModalOpen(true); }} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-brand transition-all shadow-sm"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteClick(list, 'list')} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-rose-500 transition-all shadow-sm"><Trash2 size={14} /></button>
                                                     </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-black text-slate-900 text-lg">{list.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{list.skuCodes.length} 个受控物理资产</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex -space-x-2">
                                                    {list.skuCodes.slice(0, 5).map((code, idx) => (
                                                        <div key={idx} className="w-7 h-7 rounded-lg bg-slate-100 border border-white flex items-center justify-center text-[8px] font-black text-slate-400 shadow-sm">{idx+1}</div>
                                                    ))}
                                                    {list.skuCodes.length > 5 && <div className="w-7 h-7 rounded-lg bg-brand text-white border border-white flex items-center justify-center text-[8px] font-black">+{list.skuCodes.length-5}</div>}
                                                </div>
                                                <button onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)} className="w-full py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand hover:border-brand transition-all flex items-center justify-center gap-2">查看映射明细 <ChevronDown size={12} className={expandedListId === list.id ? 'rotate-180' : ''}/></button>
                                            </div>
                                            {expandedListId === list.id && (
                                                <div className="fixed inset-0 z-[110] bg-navy/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
                                                    <div className="bg-white rounded-[48px] w-full max-w-lg p-12 border border-slate-200">
                                                        <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6"><h3 className="font-black text-slate-900 text-xl uppercase tracking-tight">清单资产映射</h3><button onClick={()=>setExpandedListId(null)} className="p-2 text-slate-400 hover:text-slate-900"><X size={24}/></button></div>
                                                        <div className="max-h-[400px] overflow-y-auto no-scrollbar space-y-2">
                                                            {list.skuCodes.map(code => (
                                                                <div key={code} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                                    <code className="text-xs font-black text-slate-400">{code}</code>
                                                                    <span className="text-[10px] font-bold text-slate-700">{skuCodeToNameMap.get(code) || '资产未录入'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-between opacity-40 grayscale group hover:grayscale-0 transition-all px-12">
                 <div className="flex items-center gap-4">
                     <Sparkles size={16} className="text-brand animate-pulse"/>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Physical Assets Ledger v2.1</p>
                 </div>
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Yunzhou Intelligence Command System</p>
            </div>
        </div>
    );
};

const SelectFilter = ({ label, value, options, onChange }: any) => (
    <div className="space-y-2">
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[10px] font-bold text-slate-700 outline-none focus:border-brand appearance-none shadow-sm transition-all hover:bg-slate-50">
                {options.map((o:any) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    </div>
);

const GhostButton = ({ onClick, icon, label }: any) => (
    <button onClick={onClick} className="flex items-center gap-2.5 px-6 py-4 rounded-2xl border border-slate-200 bg-white text-slate-500 font-black text-[10px] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm uppercase tracking-widest active:scale-95">
        {icon} {label}
    </button>
);

const StatusBadge = ({ status }: { status?: SKUStatus }) => {
    const colors: any = {
        '在售': 'bg-green-50 text-green-600 border-green-100',
        '待售': 'bg-amber-50 text-amber-600 border-amber-100',
        '下架': 'bg-slate-100 text-slate-400 border-slate-200'
    };
    return (
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${colors[status || '下架']}`}>
            {status || '下架'}
        </div>
    );
};