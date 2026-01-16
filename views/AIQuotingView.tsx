import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Settings, Calculator, Wand2, RefreshCw, Clipboard, Plus, Trash2, UploadCloud, Download, Search, Edit2, X, AlertCircle } from 'lucide-react';
import { QuotingData } from '../lib/types';
import { parseExcelFile } from '../lib/excel';

const QUOTE_CATEGORIES = ["主机", "内存", "硬盘1", "硬盘2", "显卡", "电源", "选件"];
const ADMIN_CATEGORIES = ["主机", "内存", "硬盘", "显卡", "电源", "选件"];

interface AIQuotingViewProps {
    quotingData: QuotingData;
    onUpdate: (newData: QuotingData) => void;
    addToast: (type: 'success' | 'error', title: string, message: string) => void;
}

export const AIQuotingView = ({ quotingData, onUpdate, addToast }: AIQuotingViewProps) => {
    const [isAdminView, setIsAdminView] = useState(false);

    // Quote state
    const [selectedItems, setSelectedItems] = useState<Record<string, { model: string, qty: number }>>({});
    const [matchInput, setMatchInput] = useState('');
    const [finalConfig, setFinalConfig] = useState('');
    const [selectedDiscount, setSelectedDiscount] = useState('1.0');
    const [reduction, setReduction] = useState(0);
    const [finalPrice, setFinalPrice] = useState(0);

    // Admin state
    const [adminMargin, setAdminMargin] = useState(quotingData.settings.margin);
    const [adminDiscounts, setAdminDiscounts] = useState(quotingData.discounts);
    const [newItem, setNewItem] = useState({ category: ADMIN_CATEGORIES[0], model: '', price: '' });
    const [editingItem, setEditingItem] = useState<{ category: string, model: string, price: number } | null>(null);
    const [adminSearch, setAdminSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const menu = useMemo(() => {
        const newMenu: Record<string, string[]> = {};
        for (const cat of QUOTE_CATEGORIES) {
            const matchCat = cat.startsWith("硬盘") ? "硬盘" : cat;
            const models = quotingData.prices[matchCat] || {};
            newMenu[cat] = Object.keys(models).sort();
        }
        return newMenu;
    }, [quotingData.prices]);

    const handleItemChange = (category: string, key: 'model' | 'qty', value: string | number) => {
        setSelectedItems(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };
    
    const handleResetQuote = () => {
        setSelectedItems({});
        setMatchInput('');
        setFinalConfig('');
        setSelectedDiscount('1.0');
        setReduction(0);
        setFinalPrice(0);
    };

    const handleCalculate = () => {
        let totalCost = 0;
        const configDetails: string[] = [];

        for (const cat of QUOTE_CATEGORIES) {
            const item = selectedItems[cat];
            if (item && item.model && item.qty > 0) {
                const matchCat = cat.startsWith("硬盘") ? "硬盘" : cat;
                const cost = quotingData.prices[matchCat]?.[item.model] || 0;
                totalCost += cost * item.qty;
                configDetails.push(`${item.model} * ${item.qty}`);
            }
        }
        
        const rawPrice = (totalCost * quotingData.settings.margin * parseFloat(selectedDiscount)) - reduction;
        const intPrice = Math.floor(rawPrice);
        const baseHundreds = Math.floor(intPrice / 100) * 100;
        const remainder = intPrice % 100;
        const finalCalcPrice = remainder < 50 ? baseHundreds + 50 : baseHundreds + 99;
        
        setFinalPrice(finalCalcPrice);
        setFinalConfig(configDetails.join(' / '));
    };

    const handleMatchConfig = () => {
        const newSelectedItems: Record<string, { model: string, qty: number }> = {};
        let tempMatchInput = matchInput.toLowerCase();

        for (const cat of QUOTE_CATEGORIES) {
            const models = menu[cat];
            for (const model of models) {
                const modelLower = model.toLowerCase();
                if (tempMatchInput.includes(modelLower)) {
                    let qty = 1;
                    const qtyRegex = new RegExp(`${modelLower}\\s*[*xX]\\s*(\\d+)`);
                    const match = tempMatchInput.match(qtyRegex);
                    if (match) {
                        qty = parseInt(match[1], 10);
                    }
                    
                    if (cat.startsWith('硬盘') && !newSelectedItems['硬盘1']) {
                         newSelectedItems['硬盘1'] = { model, qty };
                    } else if (cat.startsWith('硬盘') && !newSelectedItems['硬盘2']) {
                        newSelectedItems['硬盘2'] = { model, qty };
                    } else if (!newSelectedItems[cat]) {
                        newSelectedItems[cat] = { model, qty };
                    }
                    tempMatchInput = tempMatchInput.replace(modelLower, '');
                }
            }
        }
        setSelectedItems(newSelectedItems);
        addToast('success', '匹配完成', '已根据输入文本自动选择配件。');
    };

    const handleSaveChanges = () => {
        const newQuotingData = {
            ...quotingData,
            settings: { margin: adminMargin },
            discounts: adminDiscounts.filter(d => d.min_qty > 0)
        };
        onUpdate(newQuotingData);
        addToast('success', '保存成功', '核心参数已更新。');
    };

    const handleAddItem = () => {
        if (!newItem.model.trim() || !newItem.price) {
            addToast('error', '添加失败', '型号和价格不能为空。');
            return;
        }
        const prices = { ...quotingData.prices };
        if (!prices[newItem.category]) prices[newItem.category] = {};
        if (prices[newItem.category][newItem.model.trim()]) {
             addToast('error', '添加失败', `型号 ${newItem.model} 已存在。`);
             return;
        }
        prices[newItem.category][newItem.model.trim()] = parseFloat(newItem.price);
        onUpdate({ ...quotingData, prices });
        setNewItem({ category: ADMIN_CATEGORIES[0], model: '', price: '' });
        addToast('success', '添加成功', `已添加新型号 ${newItem.model.trim()}。`);
    };

    const handleUpdateItem = () => {
        if (!editingItem) return;
        const prices = { ...quotingData.prices };
        prices[editingItem.category][editingItem.model] = editingItem.price;
        onUpdate({ ...quotingData, prices });
        setEditingItem(null);
        addToast('success', '更新成功', '价格已更新。');
    };
    
    const handleDeleteItem = (category: string, model: string) => {
        if (window.confirm(`确定要删除型号 [${model}] 吗？`)) {
            const prices = { ...quotingData.prices };
            if (prices[category]?.[model]) {
                delete prices[category][model];
                onUpdate({ ...quotingData, prices });
                addToast('success', '删除成功', `型号 ${model} 已被删除。`);
            }
        }
    };
    
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const { data } = parseExcelFile(bstr);

                let success = 0, replace = 0, fail = 0;
                const prices = { ...quotingData.prices };

                data.forEach(row => {
                    try {
                        const cat = String(Object.values(row)[0]).trim();
                        const model = String(Object.values(row)[1]).trim();
                        const price = parseFloat(String(Object.values(row)[2]));
                        
                        if (ADMIN_CATEGORIES.includes(cat) && model && !isNaN(price)) {
                            if (!prices[cat]) prices[cat] = {};
                            if (prices[cat][model]) replace++; else success++;
                            prices[cat][model] = price;
                        } else {
                            fail++;
                        }
                    } catch {
                        fail++;
                    }
                });
                onUpdate({ ...quotingData, prices });
                addToast('success', '导入完成', `成功: ${success}, 替换: ${replace}, 失败: ${fail}`);

            } catch (err) {
                addToast('error', '导入失败', '文件解析失败。');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const filteredAdminItems = useMemo(() => {
        if (!adminSearch) {
            return Object.entries(quotingData.prices).flatMap(([cat, models]) => 
                Object.entries(models).map(([model, price]) => ({ category: cat, model, price }))
            );
        }
        const searchLower = adminSearch.toLowerCase();
        return Object.entries(quotingData.prices).flatMap(([cat, models]) => 
            Object.entries(models)
                .filter(([model, price]) => model.toLowerCase().includes(searchLower) || cat.toLowerCase().includes(searchLower))
                .map(([model, price]) => ({ category: cat, model, price }))
        );
    }, [adminSearch, quotingData.prices]);

    const renderQuotingView = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
            {QUOTE_CATEGORIES.map(cat => (
                <div key={cat} className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-2 text-sm font-bold text-slate-600">{cat}</label>
                    <div className="col-span-8 relative">
                        <select
                            value={selectedItems[cat]?.model || ''}
                            onChange={(e) => handleItemChange(cat, 'model', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#70AD47] appearance-none"
                        >
                            <option value="">-- 请选择 --</option>
                            {menu[cat]?.map(model => <option key={model} value={model}>{model}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <input
                            type="number"
                            min="0"
                            value={selectedItems[cat]?.qty || 0}
                            onChange={(e) => handleItemChange(cat, 'qty', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center text-slate-700 outline-none focus:border-[#70AD47]"
                        />
                    </div>
                </div>
            ))}
            <div className="grid grid-cols-12 gap-4 items-center pt-4 border-t border-slate-100">
                <label className="col-span-2 text-sm font-bold text-slate-600">产品匹配</label>
                <div className="col-span-8">
                     <input 
                        type="text"
                        value={matchInput}
                        onChange={e => setMatchInput(e.target.value)}
                        placeholder="在此处粘贴询价配置如: TSK-C3 I5-14500/8G DDR *2/512G SSD+2T HDD"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#70AD47]"
                    />
                </div>
                <div className="col-span-2">
                    <button onClick={handleMatchConfig} className="w-full py-2.5 rounded-lg bg-amber-400 text-white font-bold text-sm hover:bg-amber-500 transition-all">匹配配置</button>
                </div>
            </div>
            <div className="pt-4 space-y-4">
                <textarea readOnly value={finalConfig} placeholder="最终配置" className="w-full h-24 bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 font-mono"></textarea>
                <div className="grid grid-cols-2 gap-4">
                    <select value={selectedDiscount} onChange={e => setSelectedDiscount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#70AD47]">
                        <option value="1.0">无折扣 (1.0)</option>
                        {quotingData.discounts.map((d, i) => <option key={i} value={d.rate}>{`满${d.min_qty}件享${d.rate}折`}</option>)}
                    </select>
                    <input type="number" value={reduction} onChange={e => setReduction(parseFloat(e.target.value) || 0)} placeholder="立减" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#70AD47]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleResetQuote} className="w-full py-3 rounded-lg bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-all">重置</button>
                    <button onClick={handleCalculate} className="w-full py-3 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all">生成报价单</button>
                </div>
                <div className="text-center text-5xl font-black text-slate-800 py-4">¥ {finalPrice.toLocaleString('en-US')}</div>
            </div>
        </div>
    );
    
    const renderAdminView = () => (
        <>
            {/* Core Params */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
                 <h3 className="font-bold text-slate-700 mb-2">1. 核心计算参数与折扣</h3>
                 <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-slate-600 shrink-0">预留加价倍率:</label>
                    <input type="number" step="0.01" value={adminMargin} onChange={e => setAdminMargin(parseFloat(e.target.value))} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#70AD47]" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">N件N折阶梯设置:</label>
                    {adminDiscounts.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                           <span>满</span>
                           <input type="number" value={d.min_qty} onChange={e => { const newD = [...adminDiscounts]; newD[i].min_qty = parseInt(e.target.value); setAdminDiscounts(newD); }} className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700"/>
                           <span>件, 享</span>
                           <input type="number" step="0.01" value={d.rate} onChange={e => { const newD = [...adminDiscounts]; newD[i].rate = parseFloat(e.target.value); setAdminDiscounts(newD); }} className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700"/>
                           <span>折</span>
                           <button onClick={() => setAdminDiscounts(adminDiscounts.filter((_, idx) => idx !== i))} className="text-rose-500 p-1"><Trash2 size={14}/></button>
                        </div>
                    ))}
                    <button onClick={() => setAdminDiscounts([...adminDiscounts, { min_qty: 0, rate: 1.0 }])} className="text-sm text-[#70AD47] font-bold flex items-center gap-1"><Plus size={14}/> 添加阶梯</button>
                 </div>
                 <button onClick={handleSaveChanges} className="px-6 py-2.5 rounded-lg bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-all">保存倍率与阶梯折扣</button>
            </div>
             {/* Add Item */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
                 <h3 className="font-bold text-slate-700 mb-2">2. 快速录入配件</h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#70AD47]">
                        {ADMIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <input value={newItem.model} onChange={e => setNewItem({...newItem, model: e.target.value})} placeholder="型号名称" className="md:col-span-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#70AD47]"/>
                     <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="成本单价" className="md:col-span-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#70AD47]"/>
                     <button onClick={handleAddItem} className="py-2.5 rounded-lg bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-all">确认添加</button>
                 </div>
            </div>
             {/* Import */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h3 className="font-bold text-slate-700 mb-2">3. 导入配件 (Excel)</h3>
                <div className="flex gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden"/>
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">选择文件</button>
                    <button onClick={() => {}} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all">执行批量导入</button>
                </div>
            </div>
            {/* Data Maintenance */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h3 className="font-bold text-slate-700 mb-4">4. 现有数据维护</h3>
                <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="输入型号或分类搜索..." className="w-full mb-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47]" />
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                            <tr className="text-left font-bold text-slate-500">
                                <th className="p-2 border-b">分类</th>
                                <th className="p-2 border-b">型号</th>
                                <th className="p-2 border-b">单价</th>
                                <th className="p-2 border-b text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdminItems.map(({category, model, price}) => (
                                <tr key={`${category}-${model}`} className="hover:bg-slate-50">
                                    <td className="p-2 border-b">{category}</td>
                                    <td className="p-2 border-b">{model}</td>
                                    <td className="p-2 border-b">
                                        {editingItem?.model === model ? (
                                            <input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})} className="w-24 bg-white border border-slate-300 rounded px-2 py-1"/>
                                        ) : `¥ ${price.toFixed(2)}`}
                                    </td>
                                    <td className="p-2 border-b text-center">
                                        {editingItem?.model === model ? (
                                             <>
                                                <button onClick={handleUpdateItem} className="text-green-500 font-bold text-xs mr-2">保存</button>
                                                <button onClick={() => setEditingItem(null)} className="text-slate-500 font-bold text-xs">取消</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setEditingItem({category, model, price})} className="text-blue-500 font-bold text-xs mr-2">修改</button>
                                                <button onClick={() => handleDeleteItem(category, model)} className="text-rose-500 font-bold text-xs">删除</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    return (
        <div className="p-8 max-w-[1200px] mx-auto animate-fadeIn space-y-8">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 产品报价</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">PRODUCT QUOTING SYSTEM</p>
                </div>
                <button onClick={() => setIsAdminView(!isAdminView)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors">
                    {isAdminView ? <Calculator size={14}/> : <Settings size={14} />}
                    {isAdminView ? '返回报价首页' : '进入管理后台'}
                </button>
            </div>
            {isAdminView ? renderAdminView() : renderQuotingView()}
        </div>
    );
};