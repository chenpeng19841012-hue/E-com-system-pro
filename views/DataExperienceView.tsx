
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Eye, Settings, Database, RotateCcw, Plus, FileText, Download, Trash2, Edit2, X, Search, Filter, Zap, AlertCircle, Calendar, Store, CheckSquare, Square, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, LoaderCircle, Sparkles, Activity, LayoutGrid, ShieldCheck, CopyMinus, Eraser } from 'lucide-react';
import { DataExpSubView, TableType, FieldDefinition, Shop, ProductSKU } from '../lib/types';
import { getTableName, getSkuIdentifier } from '../lib/helpers';
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from '../lib/schemas';
import { ConfirmModal } from '../components/ConfirmModal';
import { DB } from '../lib/db';

// 进度弹窗 - 指挥中心风格
const ProgressModal = ({ isOpen, current, total, mode = 'delete' }: { isOpen: boolean, current: number, total: number, mode?: 'delete' | 'dedupe' }) => {
    if (!isOpen) return null;
    const percent = total > 0 ? Math.floor((current / total) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md p-12 text-center animate-fadeIn border border-slate-200">
                <div className="relative w-24 h-24 mx-auto mb-10">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <svg className="absolute inset-0 transform -rotate-90 w-24 h-24">
                        <circle
                            cx="48"
                            cy="48"
                            r="44"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-brand"
                            strokeDasharray={276}
                            strokeDashoffset={276 - (276 * percent) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoaderCircle className="animate-spin text-brand" size={32} />
                    </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">{mode === 'dedupe' ? '全量去重扫描中' : '执行物理层空间清理'}</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Atomic {mode === 'dedupe' ? 'Scanning & Merging' : 'Erasure in Progress'}</p>
                
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4 p-0.5 shadow-inner">
                    <div className="bg-brand h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(112,173,71,0.5)]" style={{ width: `${percent}%` }}></div>
                </div>
                
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Progress: {percent}%</span>
                    <span>{mode === 'dedupe' ? `Scanned: ${current.toLocaleString()}` : `${current.toLocaleString()} / ${total.toLocaleString()} Rows`}</span>
                </div>
            </div>
        </div>
    );
};

const RepairProgressModal = ({ isOpen, message }: { isOpen: boolean, message: string }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md p-12 text-center animate-fadeIn border border-slate-200">
                <LoaderCircle className="animate-spin text-brand mx-auto mb-8" size={48} />
                <h3 className="text-2xl font-black text-slate-900 mb-2">正在执行资产归属校准</h3>
                <p className="text-slate-500 text-sm font-bold min-h-[2rem]">{message}</p>
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
            setLabel(''); setKey(''); setError('');
        }
    }, [isOpen]);
    
    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLabel = e.target.value;
        setLabel(newLabel);
        const suggestedKey = `custom_${newLabel.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/\s+/g, '_')}`;
        setKey(suggestedKey);
    };

    const handleConfirm = () => {
        setError('');
        if (!label.trim() || !key.trim()) { setError('字段名称和物理键名均不可为空。'); return; }
        if (!/^[a-z0-9_]+$/.test(key)) { setError('键名仅支持小写字母与下划线。'); return; }
        if (existingKeys.includes(key)) { setError(`物理键名 [${key}] 已锁定。`); return; }
        onConfirm({ key, label, type: 'STRING', required: false, tags: [label] });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-12 border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">新增物理映射</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">字段显示名称 (Label)</label>
                        <input type="text" value={label} onChange={handleLabelChange} placeholder="例如：优惠券金额" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">物理层键名 (Key)</label>
                        <input type="text" value={key} onChange={(e) => setKey(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-mono font-black text-brand outline-none focus:border-brand shadow-inner" />
                         <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest leading-relaxed">System Key: Read-only after synchronization starts.</p>
                    </div>
                </div>
                {error && <p className="text-xs text-rose-500 mt-6 bg-rose-50 p-4 rounded-xl border border-rose-100 font-bold">{error}</p>}
                <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-50">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase">取消</button>
                    <button onClick={handleConfirm} className="flex-[2] py-4 rounded-2xl bg-brand text-white font-black text-xs shadow-2xl shadow-brand/20 transition-all active:scale-95 uppercase tracking-widest">确认新增映射</button>
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
        onConfirm({ ...field, label: label.trim(), tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
    };

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-12 border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">修订物理映射</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">物理层键名</label>
                        <p className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-400 font-mono font-bold shadow-inner">{field.key}</p>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">展示名称</label>
                        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">识别特征码 (Tags)</label>
                         <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="别名1, 别名2" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:border-brand shadow-inner" />
                         <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Multiple aliases separated by comma.</p>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-50">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase">取消</button>
                    <button onClick={handleConfirm} className="flex-[2] py-4 rounded-2xl bg-brand text-white font-black text-xs shadow-2xl shadow-brand/20 transition-all uppercase tracking-widest">保存物理修订</button>
                </div>
            </div>
        </div>
    );
};

const formatDateForDisplay = (dateValue: any): string => {
    if (!dateValue) return '-';
    const dateStr = String(dateValue);
    return dateStr.length >= 10 ? dateStr.substring(0, 10) : dateStr;
};

export const DataExperienceView = ({ schemas, shops, skus, onUpdateSchema, onClearTable, onDeleteRows, onRefreshData, addToast }: { skus: ProductSKU[], schemas: any, shops: Shop[], onUpdateSchema: any, onClearTable: any, onDeleteRows: any, onRefreshData: any, addToast: any }) => {
    const [activeTab, setActiveTab] = useState<DataExpSubView>('preview');
    const [selectedSchemaType, setSelectedSchemaType] = useState<TableType>('shangzhi');
    
    // Modal States
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);
    const [isDedupeModalOpen, setIsDedupeModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
    const [deleteProgress, setDeleteProgress] = useState<{ current: number, total: number, mode?: 'delete' | 'dedupe' } | null>(null);
    
    // Search & Data States
    const [tableTypeSearch, setTableTypeSearch] = useState<TableType>('shangzhi');
    const [skuSearch, setSkuSearch] = useState('');
    const [shopSearch, setShopSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [qualityFilter, setQualityFilter] = useState<'all' | 'date_issue' | 'duplicates' | 'date_null_only'>('all');
    
    // Data Management
    const [tableData, setTableData] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<any>>(new Set());
    
    // Repair State
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairProgress, setRepairProgress] = useState('');


    // Load initial data on mount (recent 10 rows) to show something
    useEffect(() => {
        handleExecuteSearch(); 
    }, [tableTypeSearch]);

    const currentSchema = schemas[selectedSchemaType] || [];
    
    const displaySchema = useMemo(() => {
        const type = tableTypeSearch;
        const schema = schemas[type] || [];
        if (type === 'customer_service') {
            const dateField = schema.find((f:any) => f.key === 'date');
            return dateField ? [dateField, ...schema.filter((f:any) => f.key !== 'date')] : schema;
        }
        return schema;
    }, [tableTypeSearch, schemas]);
    
    const sortedSchema = [...currentSchema].sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1));

    const handleExecuteSearch = async () => {
        setIsLoadingData(true);
        setSelectedRowIds(new Set());
        try {
            let data = [];
            if (qualityFilter === 'duplicates') {
                // 执行特定的重复检查逻辑 (预览最近 2000 条)
                data = await DB.getDuplicatePreview(`fact_${tableTypeSearch}`);
                if (data.length === 0) {
                    addToast('info', '质量检查通过', '最近 2000 条记录中未发现完全重复数据。');
                } else {
                    addToast('warning', '发现冗余', `检测到 ${data.length} 条重复数据 (预览模式)。请使用“执行去重”功能清洗。`);
                }
            } else {
                // 标准查询
                data = await DB.queryData(`fact_${tableTypeSearch}`, {
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    sku: skuSearch || undefined,
                    shopName: shopSearch || undefined,
                    qualityFilter: qualityFilter
                }, 10);
                if (data.length === 0) {
                    addToast('info', '检索完成', '未找到匹配的物理记录。');
                }
            }
            setTableData(data);
        } catch (e: any) {
            addToast('error', '检索失败', e.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSelectAll = () => setSelectedRowIds(selectedRowIds.size === tableData.length && tableData.length > 0 ? new Set() : new Set(tableData.map(r => r.id)));
    
    const handleSelectRow = (id: any) => {
        const next = new Set(selectedRowIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedRowIds(next);
    };

    const handleConfirmResetSchema = () => {
        const initial = { shangzhi: INITIAL_SHANGZHI_SCHEMA, jingzhuntong: INITIAL_JINGZHUNTONG_SCHEMA, customer_service: INITIAL_CUSTOMER_SERVICE_SCHEMA }[selectedSchemaType];
        onUpdateSchema(selectedSchemaType, initial);
        addToast('success', '重置成功', `[${getTableName(selectedSchemaType)}] 物理映射已对齐。`);
        setIsResetModalOpen(false);
    };

    const handleOpenEditModal = (field: FieldDefinition) => {
        setEditingField(field);
    };

    const handleConfirmDeleteSelected = async () => {
        const allIdsToDelete = Array.from(selectedRowIds);
        const total = allIdsToDelete.length;
        setIsDeleteSelectedModalOpen(false);
        setDeleteProgress({ current: 0, total, mode: 'delete' });
        const CHUNK_SIZE = 5000;
        try {
            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = allIdsToDelete.slice(i, i + CHUNK_SIZE);
                await onDeleteRows(tableTypeSearch, chunk);
                setDeleteProgress({ current: Math.min(i + CHUNK_SIZE, total), total, mode: 'delete' });
                await new Promise(r => setTimeout(r, 50));
            }
            // Refresh local data view
            handleExecuteSearch();
            await onRefreshData();
            addToast('success', '物理空间已释放', `已成功擦除 ${total} 条数据记录。`);
        } catch (e) { addToast('error', '物理删除失败', '数据库写入指令中断。'); }
        finally { setSelectedRowIds(new Set()); setDeleteProgress(null); }
    };

    const handleExecuteDedupe = async () => {
        setIsDedupeModalOpen(false);
        setDeleteProgress({ current: 0, total: 100, mode: 'dedupe' });
        try {
            const removedCount = await DB.deduplicateTable(`fact_${tableTypeSearch}`, (scanned: number, deleted: number) => {
                setDeleteProgress({ current: scanned, total: 100, mode: 'dedupe' });
            });
            await handleExecuteSearch();
            await onRefreshData();
            addToast('success', '去重完成', `全表扫描结束，共清洗 ${removedCount} 条冗余物理数据。`);
        } catch (e: any) {
            addToast('error', '去重失败', e.message);
        } finally {
            setDeleteProgress(null);
        }
    };
    
    const handleRepairOwnership = async () => {
        setIsRepairing(true);
        setRepairProgress("正在初始化...");
        try {
            const { fixedOwnership, fixedSkuCodes } = await DB.repairAssetOwnership(shops, skus, (message: string) => {
                setRepairProgress(message);
            });
            await onRefreshData(); // 刷新 App 级数据
            await handleExecuteSearch(); // 刷新当前视图
            
            const messages: string[] = [];
            if (fixedSkuCodes > 0) {
                messages.push(`成功补充 ${fixedSkuCodes} 条 SKU 编码`);
            }
            if (fixedOwnership > 0) {
                messages.push(`成功修复 ${fixedOwnership} 条店铺归属`);
            }

            if (messages.length > 0) {
                addToast('success', '校准完成', `${messages.join('；')}。`);
            } else {
                addToast('info', '校准完成', '未发现可修复的数据。');
            }
        } catch (e: any) {
            addToast('error', '校准失败', e.message);
        } finally {
            setIsRepairing(false);
            setRepairProgress('');
        }
    };

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 min-h-screen bg-[#F8FAFC]">
            <ProgressModal isOpen={!!deleteProgress} current={deleteProgress?.current || 0} total={deleteProgress?.total || 0} mode={deleteProgress?.mode} />
            <RepairProgressModal isOpen={isRepairing} message={repairProgress} />
            
            <ConfirmModal isOpen={isClearModalOpen} title="全量物理空间清空" onConfirm={() => { onClearTable(tableTypeSearch); setIsClearModalOpen(false); setSelectedRowIds(new Set()); setTableData([]); addToast('success', '清空完成', '目标表数据已全部格式化。'); }} onCancel={() => setIsClearModalOpen(false)} confirmText="执行擦除" confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20">
                <p>正在执行物理层移除指令：<strong className="font-black text-slate-900">[{getTableName(tableTypeSearch)}]</strong></p>
                <p className="mt-2 text-rose-500 font-bold opacity-80">此操作将物理性抹除全量记录，无法撤销。确认继续？</p>
            </ConfirmModal>

            <ConfirmModal isOpen={isDeleteSelectedModalOpen} title="批量物理记录注销" onConfirm={handleConfirmDeleteSelected} onCancel={() => setIsDeleteSelectedModalOpen(false)} confirmText="确认移除" confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20">
                <p>您已勾选 <strong className="font-black text-rose-600">{selectedRowIds.size.toLocaleString()}</strong> 条物理事实行。</p>
                <p className="mt-2 text-slate-500 font-bold opacity-80">执行后，本地库对应空间将被回收。确认物理移除？</p>
            </ConfirmModal>

            <ConfirmModal isOpen={isDedupeModalOpen} title="全量物理去重扫描" onConfirm={handleExecuteDedupe} onCancel={() => setIsDedupeModalOpen(false)} confirmText="开始扫描并去重" confirmButtonClass="bg-brand hover:bg-[#5da035] shadow-brand/20">
                <p>即将对 <strong className="font-black text-slate-900">[{getTableName(tableTypeSearch)}]</strong> 执行全量去重操作。</p>
                <ul className="mt-3 text-slate-500 font-bold text-xs space-y-2 list-disc pl-4">
                    <li>扫描所有物理记录。</li>
                    <li>识别所有字段（除 ID 外）完全相同的记录。</li>
                    <li><span className="text-brand">保留最新的一条</span>，物理删除其余重复项。</li>
                </ul>
            </ConfirmModal>

            <ConfirmModal isOpen={isResetModalOpen} title="重置物理映射架构" onConfirm={handleConfirmResetSchema} onCancel={() => setIsResetModalOpen(false)} confirmText="执行重置" confirmButtonClass="bg-orange-500 hover:bg-orange-600 shadow-orange-500/20">
                <p>确认将 <strong className="font-black text-slate-900">[{getTableName(selectedSchemaType)}]</strong> 的映射架构恢复至原始出厂状态？</p>
                <p className="mt-2 text-orange-500 font-bold opacity-80">此操作会重置所有自定义映射字段。</p>
            </ConfirmModal>

            <AddFieldModal isOpen={isAddFieldModalOpen} onClose={() => setIsAddFieldModalOpen(false)} onConfirm={(f) => { onUpdateSchema(selectedSchemaType, [...currentSchema, f]); addToast('success', '映射成功', `[${f.label}] 已加入物理层映射。`); setIsAddFieldModalOpen(false); }} existingKeys={currentSchema.map(f => f.key)} />
            <EditFieldModal isOpen={!!editingField} onClose={() => setEditingField(null)} onConfirm={(f) => { onUpdateSchema(selectedSchemaType, currentSchema.map(x => x.key === f.key ? f : x)); addToast('success', '修订成功', `映射 [${f.label}] 已更新。`); setEditingField(null); }} field={editingField} />

            {/* Command Header - Standardized */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">物理层治理模式已激活</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">底层数据治理中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 opacity-60">Physical Data Cleansing & Meta-Architecture Management</p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-[22px] shadow-inner border border-slate-200">
                    <button onClick={() => setActiveTab('preview')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}><Eye size={14}/> 数据物理清洗</button>
                    <button onClick={() => setActiveTab('schema')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'schema' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}><Settings size={14}/> 物理架构映射</button>
                </div>
            </div>

            {/* Main Content Container */}
            <div className="bg-white rounded-[56px] shadow-sm border border-slate-100 p-12 relative overflow-hidden group min-h-[750px] flex flex-col">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(112,173,71,0.025),transparent_70%)] pointer-events-none"></div>
                
                {activeTab === 'schema' && (
                    <div className="space-y-10 animate-fadeIn relative z-10 flex-1">
                        <div className="bg-slate-50/50 rounded-[40px] p-10 border border-slate-100 shadow-inner flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4 min-w-[350px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><LayoutGrid size={14} className="text-brand"/> 目标事实表探测</label>
                                <div className="relative">
                                    <select value={selectedSchemaType} onChange={e => setSelectedSchemaType(e.target.value as TableType)} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm">
                                        <option value="shangzhi">商智核心事实表 (fact_shangzhi)</option>
                                        <option value="jingzhuntong">广告投放事实表 (fact_jingzhuntong)</option>
                                        <option value="customer_service">客服接待流水事实表 (fact_customer_service)</option>
                                    </select>
                                    <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsResetModalOpen(true)} className="px-6 py-4 rounded-2xl bg-white border border-slate-200 text-orange-600 font-black text-[10px] hover:bg-orange-50 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm"><RotateCcw size={14}/> 重置架构</button>
                                <button onClick={() => setIsAddFieldModalOpen(true)} className="px-10 py-4 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95"><Plus size={16}/> 新增字段映射</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedSchema.map((field: FieldDefinition, idx: number) => (
                                <div key={idx} className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group/card relative">
                                    <div className="flex justify-between items-start mb-6">
                                        {field.required ? <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-2.5 py-1 rounded-lg border border-rose-100 uppercase tracking-widest">核心引擎字段</span> : <span className="bg-blue-50 text-blue-500 text-[8px] font-black px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">物理层扩展字段</span>}
                                        <button onClick={() => handleOpenEditModal(field)} className="p-2 text-slate-300 hover:text-brand transition-colors opacity-0 group-hover/card:opacity-100"><Edit2 size={16}/></button>
                                    </div>
                                    <div className="space-y-1 mb-6">
                                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{field.label}</h4>
                                        <p className="text-[10px] text-slate-300 font-mono font-bold uppercase tracking-tighter">Key: {field.key}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(field.tags || [field.label]).map((tag, tIdx) => (
                                            <span key={tIdx} className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 text-[9px] font-black px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-wider"><Zap size={10} className="fill-slate-200" /> {tag}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="animate-fadeIn relative z-10 flex-1 flex flex-col space-y-10 min-h-0">
                        {/* Tactical Filter Panel */}
                        <div className="bg-slate-50/50 rounded-[40px] p-10 border border-slate-100 shadow-inner space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">物理源目标</label>
                                    <div className="relative">
                                        <select value={tableTypeSearch} onChange={e => setTableTypeSearch(e.target.value as TableType)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm transition-all hover:bg-slate-50">
                                            <option value="shangzhi">商智销售全量物理表</option>
                                            <option value="jingzhuntong">广告投放全量物理表</option>
                                            <option value="customer_service">客服接待流水物理表</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU 穿透检索</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={skuSearch} 
                                            onChange={e => setSkuSearch(e.target.value)} 
                                            placeholder="输入 SKU / 商品ID..."
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand shadow-sm transition-all hover:bg-slate-50 placeholder:font-normal" 
                                        />
                                        <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">数据质量诊断</label>
                                    <div className="relative">
                                        <select value={qualityFilter} onChange={e => setQualityFilter(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm">
                                            <option value="all">全量数据 (All Records)</option>
                                            <option value="date_null_only">❌ 仅日期为空 (Date is NULL)</option>
                                            <option value="date_issue"> 时间空值/异常 (Date Errors)</option>
                                            <option value="duplicates">⚠️ 完全重复数据 (Duplicate Rows)</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">物理时间跨度</label>
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-2 py-1.5 shadow-sm"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent border-none text-[9px] font-black text-slate-600 px-1 outline-none" /><span className="text-slate-300 font-black">/</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent border-none text-[9px] font-black text-slate-600 px-1 outline-none" /></div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">资产归属筛选</label>
                                    <div className="relative">
                                        <select value={shopSearch} onChange={e => setShopSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-sm">
                                            <option value="">所有物理记录</option>
                                            {shops.map((s:Shop) => <option key={s.id} value={s.name}>🔵 {s.name}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-8 border-t border-slate-200/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-brand/5 rounded-2xl border border-brand/10 flex items-center gap-3">
                                        <Database size={18} className="text-brand" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {isLoadingData ? '云端检索中...' : `命中数据物理事实行: ${tableData.length.toLocaleString()}`}
                                        </span>
                                    </div>
                                    {selectedRowIds.size > 0 && <div className="px-5 py-3.5 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3"><Trash2 size={14} className="text-rose-500"/><span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">已锁定物理行: {selectedRowIds.size.toLocaleString()}</span></div>}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleRepairOwnership} className="px-8 py-4 rounded-[22px] bg-indigo-50 border border-indigo-100 text-indigo-500 font-black text-xs hover:bg-indigo-100 transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
                                        <ShieldCheck size={14} /> 资产归属校准
                                    </button>
                                    <button onClick={() => setIsClearModalOpen(true)} className="px-6 py-4 rounded-[22px] bg-rose-50 border border-rose-100 text-rose-500 font-black text-xs hover:bg-rose-100 transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
                                        <Eraser size={14} /> 格式化
                                    </button>
                                    <button onClick={() => setIsDedupeModalOpen(true)} className="px-6 py-4 rounded-[22px] bg-white border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 hover:text-brand hover:border-brand transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
                                        <CopyMinus size={14} /> 去重
                                    </button>
                                    <button onClick={() => { setSkuSearch(''); setShopSearch(''); setStartDate(''); setEndDate(''); setTableTypeSearch('shangzhi'); setQualityFilter('all'); handleExecuteSearch(); }} className="px-6 py-4 rounded-[22px] bg-slate-100 text-slate-500 font-black text-xs hover:bg-slate-200 transition-all uppercase tracking-widest">重置</button>
                                    <button onClick={handleExecuteSearch} disabled={isLoadingData} className="px-10 py-4 rounded-[22px] bg-navy text-white font-black text-xs hover:bg-slate-800 shadow-xl shadow-navy/20 transition-all flex items-center gap-3 uppercase tracking-[0.2em] active:scale-95 disabled:opacity-50">
                                        {isLoadingData ? <LoaderCircle size={16} className="animate-spin" /> : <Filter size={16}/>}
                                        {isLoadingData ? '穿透中...' : '探测'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* High-Density Data Matrix - Optimized with Scroll */}
                        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-inner relative overflow-hidden group/table">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <div className="flex-1 overflow-x-auto overflow-y-auto relative z-10 custom-scrollbar">
                                <table className="w-full text-left text-[11px] whitespace-nowrap border-separate border-spacing-0 table-auto">
                                    <thead className="sticky top-0 z-20 shadow-sm">
                                        <tr className="bg-slate-50/95 backdrop-blur-sm">
                                            <th className="px-8 py-6 border-b border-slate-100 w-16 text-center sticky left-0 bg-slate-50 z-30">
                                                <button onClick={handleSelectAll} className="text-slate-300 hover:text-brand transition-colors">
                                                    {selectedRowIds.size === tableData.length && tableData.length > 0 ? <CheckSquare size={20} className="text-brand" /> : <Square size={20} />}
                                                </button>
                                            </th>
                                            {displaySchema.map((f:FieldDefinition) => (
                                                <th key={f.key} className="px-6 py-6 font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 min-w-[180px]">{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {isLoadingData ? (
                                             <tr><td colSpan={displaySchema.length + 1} className="py-48 text-center"><div className="flex flex-col items-center gap-4 text-slate-300 animate-pulse"><Activity size={48} /><p className="font-black uppercase tracking-[0.4em] text-xs">Retrieving Cloud Artifacts...</p></div></td></tr>
                                        ) : tableData.length > 0 ? (
                                            tableData.map((row: any, rIdx: number) => (
                                                <tr key={row.id || rIdx} className={`hover:bg-slate-50/50 transition-all group/row ${selectedRowIds.has(row.id) ? 'bg-brand/5' : ''}`}>
                                                    <td className="px-8 py-4 border-b border-slate-50 text-center sticky left-0 bg-white group-hover/row:bg-slate-50/80 z-10">
                                                        <button onClick={() => handleSelectRow(row.id)} className={`${selectedRowIds.has(row.id) ? 'text-brand' : 'text-slate-200'} hover:text-brand transition-colors`}>
                                                            {selectedRowIds.has(row.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                                        </button>
                                                    </td>
                                                    {displaySchema.map((f:FieldDefinition) => (
                                                        <td key={f.key} className={`px-6 py-4 border-b border-slate-50 truncate ${f.key === 'sku_code' || f.key === 'product_id' || f.key === 'tracked_sku_id' ? 'font-mono font-black text-slate-800 text-xs' : 'text-slate-500 font-bold text-[10px]'}`}>
                                                            {f.key === 'date' ? <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black">{formatDateForDisplay(row[f.key])}</span> : (row[f.key] ?? '-')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={displaySchema.length + 1} className="py-48 text-center text-slate-300 opacity-20 italic font-black uppercase tracking-[0.5em]">No Atomic Records Found in Search Range</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination & Global Actions */}
                            <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                        <span>当前展示 {tableData.length} 行记录 (已截断前 10 行以优化性能)</span>
                                        {tableData.length > 0 && <span className="text-brand/50 font-black italic">提示: 字段较多时可按住 Shift 配合滚轮或拖动底部条横向滑动</span>}
                                    </div>
                                    {selectedRowIds.size > 0 && (
                                        <button onClick={() => setIsDeleteSelectedModalOpen(true)} className="px-6 py-2.5 bg-rose-500 text-white rounded-xl text-[10px] font-black hover:bg-rose-600 shadow-xl shadow-rose-500/20 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 animate-slideIn">
                                            <Trash2 size={14}/> 物理擦除已选记录
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
