
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Eye, Settings, Database, RotateCcw, Plus, FileText, Download, Trash2, Edit2, X, Search, Filter, Zap, AlertCircle, Calendar, Store, CheckSquare, Square, RefreshCcw, ChevronLeft, ChevronRight, ChevronDown, LoaderCircle } from 'lucide-react';
import { DataExpSubView, TableType, FieldDefinition, Shop } from '../lib/types';
import { getTableName, getSkuIdentifier } from '../lib/helpers';
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from '../lib/schemas';
import { ConfirmModal } from '../components/ConfirmModal';

const ProgressModal = ({ isOpen, current, total }: { isOpen: boolean, current: number, total: number }) => {
    if (!isOpen) return null;
    const percent = Math.floor((current / total) * 100);

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-10 text-center animate-fadeIn">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div 
                        className="absolute inset-0 border-4 border-[#70AD47] rounded-full transition-all duration-500" 
                        style={{ clipPath: `inset(0 0 0 0)`, transform: `rotate(${percent * 3.6}deg)` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoaderCircle className="animate-spin text-[#70AD47]" size={40} />
                    </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">正在执行物理空间清理</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">正在永久移除选定记录...</p>
                
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                    <div className="bg-[#70AD47] h-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                </div>
                
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                    <span>进度: {percent}%</span>
                    <span>{current.toLocaleString()} / {total.toLocaleString()} 行</span>
                </div>
            </div>
        </div>
    );
};

const AddFieldModal = ({ isOpen, onClose, onConfirm, existingKeys }: { isOpen: boolean, onClose: () => void, onConfirm: (field: FieldDefinition) => void, existingKeys: string[] }) => {
    const [label, setLabel] = useState('');
    const [key, setKey] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLabel('');
            setKey('');
            setError('');
        }
    }, [isOpen]);
    
    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLabel = e.target.value;
        setLabel(newLabel);
        const suggestedKey = `custom_${newLabel.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}`;
        setKey(suggestedKey);
    };

    const handleConfirm = () => {
        setError('');
        if (!label.trim() || !key.trim()) {
            setError('字段名称和ID均不可为空。');
            return;
        }
        if (!/^[a-z0-9_]+$/.test(key)) {
            setError('字段ID只能包含小写字母、数字和下划线。');
            return;
        }
        if (existingKeys.includes(key)) {
            setError(`字段ID [${key}] 已存在。`);
            return;
        }
        
        const newField: FieldDefinition = {
            key,
            label,
            type: 'STRING',
            required: false,
            tags: [label]
        };
        onConfirm(newField);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">添加新字段</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="field-label" className="block text-sm font-bold text-slate-600 mb-2">字段名称 (Label)</label>
                        <input 
                            id="field-label"
                            type="text"
                            value={label}
                            onChange={handleLabelChange}
                            placeholder="例如：优惠券金额"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#70AD47] focus:ring-2 focus:ring-[#70AD47]/20"
                        />
                    </div>
                    <div>
                        <label htmlFor="field-key" className="block text-sm font-bold text-slate-600 mb-2">字段ID (Key)</label>
                        <input 
                            id="field-key"
                            type="text"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="例如：custom_coupon_amount"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 font-mono outline-none focus:border-[#70AD47] focus:ring-2 focus:ring-[#70AD47]/20"
                        />
                         <p className="text-xs text-slate-400 mt-2">只能使用小写字母、数字和下划线。创建后不可更改。</p>
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-4 bg-rose-50 p-3 rounded-lg">{error}</p>}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                        取消
                    </button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95">
                        确认添加
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditFieldModal = ({ isOpen, onClose, onConfirm, field }: { isOpen: boolean, onClose: () => void, onConfirm: (field: FieldDefinition) => void, field: FieldDefinition | null }) => {
    const [label, setLabel] = useState('');
    const [tags, setTags] = useState('');

    useEffect(() => {
        if (isOpen && field) {
            setLabel(field.label);
            setTags((field.tags || []).join(', '));
        }
    }, [isOpen, field]);

    if (!isOpen || !field) return null;

    const handleConfirm = () => {
        const updatedField: FieldDefinition = {
            ...field,
            label: label.trim(),
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        };
        onConfirm(updatedField);
    };

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">编辑字段</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">字段ID (Key)</label>
                        <p className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-500 font-mono">{field.key}</p>
                     </div>
                     <div>
                        <label htmlFor="field-label-edit" className="block text-sm font-bold text-slate-600 mb-2">字段名称 (Label)</label>
                        <input 
                            id="field-label-edit"
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#70AD47] focus:ring-2 focus:ring-[#70AD47]/20"
                        />
                    </div>
                    <div>
                        <label htmlFor="field-tags-edit" className="block text-sm font-bold text-slate-600 mb-2">字段别名 (Tags)</label>
                         <input 
                            id="field-tags-edit"
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="例如：别名1, 别名2"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#70AD47] focus:ring-2 focus:ring-[#70AD47]/20"
                        />
                         <p className="text-xs text-slate-400 mt-2">多个别名请用英文逗号 "," 分隔。</p>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                        取消
                    </button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95">
                        保存更改
                    </button>
                </div>
            </div>
        </div>
    );
};

const formatDateForDisplay = (dateValue: any): string => {
    if (!dateValue) return '-';
    const dateStr = String(dateValue);
    if (dateStr.length >= 10) {
        return dateStr.substring(0, 10);
    }
    return dateStr;
};

interface FilterCriteria {
    tableType: TableType;
    sku: string;
    shop: string;
    start: string;
    end: string;
}

export const DataExperienceView = ({ factTables, schemas, shops, onUpdateSchema, onClearTable, onDeleteRows, onRefreshData, addToast }: any) => {
    const [activeTab, setActiveTab] = useState<DataExpSubView>('preview');
    const [selectedSchemaType, setSelectedSchemaType] = useState<TableType>('shangzhi');
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
    const [deleteProgress, setDeleteProgress] = useState<{ current: number, total: number } | null>(null);
    
    // 搜索表单状态
    const [tableTypeSearch, setTableTypeSearch] = useState<TableType>('shangzhi');
    const [skuSearch, setSkuSearch] = useState('');
    const [shopSearch, setShopSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // 实际应用的筛选条件
    const [appliedFilters, setAppliedFilters] = useState<FilterCriteria | null>(null);
    
    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;
    
    // 选择状态
    const [selectedRowIds, setSelectedRowIds] = useState<Set<any>>(new Set());

    const currentSchema = schemas[selectedSchemaType] || [];
    
    // 处理动态表头显示
    const displaySchema = useMemo(() => {
        const type = appliedFilters?.tableType || tableTypeSearch;
        const schema = schemas[type] || [];
        if (type === 'customer_service') {
            const dateField = schema.find((f:any) => f.key === 'date');
            if (dateField) {
                return [dateField, ...schema.filter((f:any) => f.key !== 'date')];
            }
        }
        return schema;
    }, [appliedFilters, tableTypeSearch, schemas]);
    
    const sortedSchema = [...currentSchema].sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1));

    const filteredData = useMemo(() => {
        if (!appliedFilters) return [];
        const { tableType, sku, shop, start, end } = appliedFilters;
        const tableData = factTables[tableType] || [];

        // 解析多值 SKU
        const searchTerms = sku.split(/[\n,，\s]+/).map(s => s.trim()).filter(Boolean);

        return tableData.filter((row: any) => {
            // SKU 筛选 (SKU, 商品ID, 跟单SKU ID)
            const rowSku = String(getSkuIdentifier(row) || '');
            const rowProdId = String(row.product_id || '');
            const rowTrackedId = String(row.tracked_sku_id || '');
            
            let skuMatch = searchTerms.length === 0;
            if (!skuMatch) {
                // 如果输入了 SKU，任意一个检索项匹配到其中一个字段即可
                skuMatch = searchTerms.some(term => 
                    rowSku.includes(term) || 
                    rowProdId.includes(term) || 
                    rowTrackedId.includes(term)
                );
            }
            
            // 店铺筛选
            const rowShop = row.shop_name || '';
            let shopMatch = true;
            if (shop === "__EMPTY__") {
                // 专门搜索未绑定店铺的记录
                shopMatch = !rowShop || rowShop.trim() === '';
            } else if (shop) {
                shopMatch = rowShop === shop;
            }
            
            // 日期筛选
            const rowDate = row.date || '';
            const dateMatch = (!start || rowDate >= start) && 
                              (!end || rowDate <= end);
            
            return skuMatch && shopMatch && dateMatch;
        });
    }, [appliedFilters, factTables]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredData.slice(start, start + PAGE_SIZE);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

    const handleExecuteSearch = () => {
        setAppliedFilters({ tableType: tableTypeSearch, sku: skuSearch, shop: shopSearch, start: startDate, end: endDate });
        setCurrentPage(1);
        setSelectedRowIds(new Set());
    };

    const handleSelectAll = () => {
        if (selectedRowIds.size === filteredData.length && filteredData.length > 0) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(filteredData.map(r => r.id)));
        }
    };

    const handleSelectRow = (id: any) => {
        const next = new Set(selectedRowIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedRowIds(next);
    };

    const handleResetSchema = () => {
        setIsResetModalOpen(true);
    };

    const handleConfirmResetSchema = () => {
        let initialSchema;
        if (selectedSchemaType === 'shangzhi') initialSchema = INITIAL_SHANGZHI_SCHEMA;
        else if (selectedSchemaType === 'jingzhuntong') initialSchema = INITIAL_JINGZHUNTONG_SCHEMA;
        else initialSchema = INITIAL_CUSTOMER_SERVICE_SCHEMA;
        
        onUpdateSchema(selectedSchemaType, initialSchema);
        addToast('success', '重置成功', `[${getTableName(selectedSchemaType)}] 表结构已恢复为默认值。`);
        setIsResetModalOpen(false);
    };

    const handleConfirmAddField = (newField: FieldDefinition) => {
        onUpdateSchema(selectedSchemaType, [...currentSchema, newField]);
        addToast('success', '添加成功', `已添加新字段 [${newField.label}]。`);
        setIsAddFieldModalOpen(false);
    };

    const handleOpenEditModal = (field: FieldDefinition) => {
        setEditingField(field);
    };

    const handleConfirmEditField = (updatedField: FieldDefinition) => {
        const newSchema = currentSchema.map(f => f.key === updatedField.key ? updatedField : f);
        onUpdateSchema(selectedSchemaType, newSchema);
        addToast('success', '更新成功', `字段 [${updatedField.label}] 已更新。`);
        setEditingField(null);
    };

    const handleDeleteData = () => {
        setIsClearModalOpen(true);
    };

    const handleConfirmClearData = () => {
        onClearTable(appliedFilters?.tableType || tableTypeSearch);
        setIsClearModalOpen(false);
        setSelectedRowIds(new Set());
        setAppliedFilters(null);
    };

    const handleConfirmDeleteSelected = async () => {
        if (!appliedFilters) return;
        const allIdsToDelete = Array.from(selectedRowIds);
        const total = allIdsToDelete.length;
        
        setIsDeleteSelectedModalOpen(false);
        setDeleteProgress({ current: 0, total });

        // 分片删除逻辑，防止海量删除时 UI 卡死
        const CHUNK_SIZE = 5000;
        try {
            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = allIdsToDelete.slice(i, i + CHUNK_SIZE);
                await onDeleteRows(appliedFilters.tableType, chunk);
                setDeleteProgress({ current: Math.min(i + CHUNK_SIZE, total), total });
                // 给主线程留出渲染进度条的时间
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // 全部删除完成后，触发一次全量重载
            await onRefreshData();
            addToast('success', '物理删除完成', `已成功从物理库中永久移除 ${total} 条数据空间。`);
        } catch (e) {
            addToast('error', '删除异常', '物理层写入失败，请检查数据库连接。');
        } finally {
            setSelectedRowIds(new Set());
            setDeleteProgress(null);
        }
    };

    const resetFilters = () => {
        setSkuSearch('');
        setShopSearch('');
        setStartDate('');
        setEndDate('');
        setTableTypeSearch('shangzhi');
        setAppliedFilters(null);
        setCurrentPage(1);
        setSelectedRowIds(new Set());
    };

    return (
        <>
            <ProgressModal isOpen={!!deleteProgress} current={deleteProgress?.current || 0} total={deleteProgress?.total || 0} />
            
            <ConfirmModal
                isOpen={isClearModalOpen}
                title="确认清空物理表"
                onConfirm={handleConfirmClearData}
                onCancel={() => setIsClearModalOpen(false)}
                confirmText="确认清空"
                confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
            >
                <p>您确定要清空 <strong className="font-black text-slate-800">[{getTableName(appliedFilters?.tableType || tableTypeSearch)}]</strong> 表的所有物理记录吗？</p>
                <p className="mt-2 text-rose-500 font-bold">此操作将移除全量历史导入数据，不可恢复。</p>
            </ConfirmModal>

            <ConfirmModal
                isOpen={isDeleteSelectedModalOpen}
                title="批量删除物理数据"
                onConfirm={handleConfirmDeleteSelected}
                onCancel={() => setIsDeleteSelectedModalOpen(false)}
                confirmText="立即删除"
                confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
            >
                <p>您当前选择了 <strong className="font-black text-rose-600">{selectedRowIds.size.toLocaleString()}</strong> 条记录。</p>
                <p className="mt-2 text-slate-600">删除操作将直接修改本地物理库，释放存储配额，且不可撤销。确认继续吗？</p>
            </ConfirmModal>

            <ConfirmModal
                isOpen={isResetModalOpen}
                title="确认重置表结构"
                onConfirm={handleConfirmResetSchema}
                onCancel={() => setIsResetModalOpen(false)}
                confirmText="确认重置"
                confirmButtonClass="bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
            >
                <p>您确定要将 <strong className="font-black text-slate-800">[{getTableName(selectedSchemaType)}]</strong> 的表结构重置为默认设置吗？</p>
                <p className="mt-2 text-orange-500 font-bold">此操作会覆盖您所有自定义的字段修改。</p>
            </ConfirmModal>

            <AddFieldModal 
                isOpen={isAddFieldModalOpen}
                onClose={() => setIsAddFieldModalOpen(false)}
                onConfirm={handleConfirmAddField}
                existingKeys={currentSchema.map(f => f.key)}
            />
            <EditFieldModal 
                isOpen={!!editingField}
                onClose={() => setEditingField(null)}
                onConfirm={handleConfirmEditField}
                field={editingField}
            />

            <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">数据体验中心</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">物理层数据清洗与元数据治理</p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[700px] flex flex-col">
                    <div className="flex items-center gap-6 px-8 pt-6 border-b border-slate-100/50">
                        <button 
                            onClick={() => setActiveTab('preview')}
                            className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'preview' ? 'border-[#70AD47] text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Eye size={16} /> 数据清洗管理
                        </button>
                        <button 
                            onClick={() => setActiveTab('schema')}
                            className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'schema' ? 'border-[#70AD47] text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Settings size={16} /> 表结构管理
                        </button>
                    </div>

                    {activeTab === 'schema' && (
                        <div className="p-8 bg-slate-50/30 flex-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <div className="space-y-1 min-w-[300px]">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">选择目标管理表</label>
                                    <div className="relative">
                                        <select 
                                            value={selectedSchemaType}
                                            onChange={e => setSelectedSchemaType(e.target.value as TableType)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-[#70AD47] appearance-none shadow-sm"
                                        >
                                            <option value="shangzhi">商智明细 (fact_shangzhi)</option>
                                            <option value="jingzhuntong">广告明细 (fact_jingzhuntong)</option>
                                            <option value="customer_service">客服明细 (fact_customer_service)</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="flex gap-2 self-end">
                                    <button onClick={handleResetSchema} title="重置为默认结构" className="flex items-center gap-2 px-4 py-3 text-orange-600 hover:text-white hover:bg-orange-500 rounded-xl transition-all bg-white border border-slate-200 shadow-sm font-bold text-xs"><RotateCcw size={14} /> 重置结构</button>
                                    <button onClick={() => setIsAddFieldModalOpen(true)} title="添加新字段" className="flex items-center gap-2 px-4 py-3 text-[#70AD47] hover:text-white hover:bg-[#70AD47] rounded-xl transition-all bg-white border border-slate-200 shadow-sm font-bold text-xs"><Plus size={14} /> 新增映射</button>
                                    <button onClick={handleDeleteData} title="清空全量物理数据" className="flex items-center gap-2 px-4 py-3 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all bg-white border border-slate-200 shadow-sm font-bold text-xs"><Trash2 size={14} /> 清空数据</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {sortedSchema.map((field: FieldDefinition, idx: number) => (
                                    <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow group">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                {field.required ? (
                                                    <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded">核心字段</span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-500 text-[10px] font-black px-2 py-0.5 rounded">扩展字段</span>
                                                )}
                                                <span className="font-bold text-slate-800 text-sm">{field.label}</span>
                                                <span className="text-xs text-slate-300 font-mono">[{field.key}]</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(field.tags || [field.label]).map((tag, tIdx) => (
                                                    <span key={tIdx} className="inline-flex items-center gap-1 bg-[#70AD47]/10 text-[#70AD47] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#70AD47]/20">
                                                        <Zap size={10} className="fill-[#70AD47]" /> {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => handleOpenEditModal(field)} className="text-slate-300 hover:text-[#70AD47] transition-colors p-2 opacity-0 group-hover:opacity-100">
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* 组合筛选区域 */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="relative">
                                        <Database size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                        <select 
                                            value={tableTypeSearch}
                                            onChange={e => setTableTypeSearch(e.target.value as TableType)}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#70AD47] appearance-none"
                                        >
                                            <option value="shangzhi">商智销售明细</option>
                                            <option value="jingzhuntong">广告投放明细</option>
                                            <option value="customer_service">客服接待明细</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                                    </div>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input 
                                            placeholder="SKU / 商品ID / 跟单SKU ID (多值用逗号隔开)" 
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#70AD47]" 
                                            value={skuSearch}
                                            onChange={(e) => setSkuSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-400 shrink-0" />
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-2 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-[#70AD47]" />
                                        <span className="text-slate-300">-</span>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 px-2 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-[#70AD47]" />
                                    </div>
                                    <div className="relative">
                                        <Store size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                        <select 
                                            value={shopSearch}
                                            onChange={e => setShopSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#70AD47] appearance-none"
                                        >
                                            <option value="">所有店铺数据</option>
                                            <option value="__EMPTY__" className="text-rose-500 font-bold">无店铺名称 (待清洗)</option>
                                            {shops.map((s:Shop) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={resetFilters} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                                            <RefreshCcw size={14} /> 清空
                                        </button>
                                        <button onClick={handleExecuteSearch} className="flex-1 px-4 py-2 bg-[#70AD47] text-white rounded-lg text-xs font-bold hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95">
                                            立即检索
                                        </button>
                                    </div>
                                 </div>

                                 <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-4">
                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {appliedFilters ? `物理源: ${getTableName(appliedFilters.tableType)} | 命中: ${filteredData.length.toLocaleString()} 行` : '请设定条件并检索物理表'}
                                         </span>
                                         {selectedRowIds.size > 0 && (
                                             <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded">已选择: {selectedRowIds.size.toLocaleString()} 行</span>
                                         )}
                                     </div>
                                     <div className="flex gap-2">
                                         {selectedRowIds.size > 0 && (
                                             <button 
                                                onClick={() => setIsDeleteSelectedModalOpen(true)}
                                                className="flex items-center gap-2 px-6 py-2 bg-rose-500 text-white rounded-lg text-xs font-black hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                                             >
                                                 <Trash2 size={14} /> 批量物理删除
                                             </button>
                                         )}
                                     </div>
                                 </div>
                            </div>

                            {/* 数据表格 */}
                            <div className="flex-1 overflow-auto no-scrollbar relative">
                                <table className="w-full text-left text-[11px] whitespace-nowrap border-separate border-spacing-0">
                                    <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-slate-200 w-12 bg-slate-50">
                                                <button onClick={handleSelectAll} className="text-slate-400 hover:text-[#70AD47] transition-colors">
                                                    {selectedRowIds.size === filteredData.length && filteredData.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                                </button>
                                            </th>
                                            {displaySchema.map((f:FieldDefinition) => (
                                                <th key={f.key} className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 bg-slate-50">{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {!appliedFilters ? (
                                             <tr>
                                                <td colSpan={displaySchema.length + 1} className="py-40 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                                        <Search size={64} className="mb-4 opacity-10" />
                                                        <p className="font-black tracking-widest text-sm uppercase italic">请输入条件并检索物理记录</p>
                                                        <p className="text-xs mt-2 font-bold opacity-60">数据仅在点击“立即检索”后从本地库提取</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paginatedData.length > 0 ? (
                                            paginatedData.map((row: any, rIdx: number) => (
                                                <tr key={row.id || rIdx} className={`hover:bg-slate-50 transition-colors ${selectedRowIds.has(row.id) ? 'bg-[#70AD47]/5' : ''}`}>
                                                    <td className="px-6 py-3 border-b border-slate-50 w-12">
                                                        <button onClick={() => handleSelectRow(row.id)} className={`${selectedRowIds.has(row.id) ? 'text-[#70AD47]' : 'text-slate-200'} hover:text-[#70AD47] transition-colors`}>
                                                            {selectedRowIds.has(row.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                        </button>
                                                    </td>
                                                    {displaySchema.map((f:FieldDefinition) => (
                                                        <td key={f.key} className={`px-6 py-3 border-b border-slate-50 ${f.key === 'sku_code' || f.key === 'product_id' || f.key === 'tracked_sku_id' ? 'font-mono font-bold text-slate-800' : 'text-slate-600'}`}>
                                                            {f.key === 'date' ? formatDateForDisplay(row[f.key]) : (row[f.key] ?? '-')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={displaySchema.length + 1} className="py-40 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                                        <Database size={64} className="mb-4 opacity-10" />
                                                        <p className="font-black tracking-widest text-sm uppercase italic">没有匹配的物理记录</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* 分页控制 */}
                            {appliedFilters && filteredData.length > 0 && (
                                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        展示 {(currentPage-1)*PAGE_SIZE + 1} - {Math.min(currentPage*PAGE_SIZE, filteredData.length)} / 共 {filteredData.length.toLocaleString()} 行
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <div className="text-xs font-black text-slate-600 px-4">
                                            第 {currentPage} / {totalPages} 页
                                        </div>
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
