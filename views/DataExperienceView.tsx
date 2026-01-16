import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Eye, Settings, Database, RotateCcw, Plus, FileText, Download, Trash2, Edit2, X, Search, Filter, Zap, AlertCircle } from 'lucide-react';
import { DataExpSubView, TableType, FieldDefinition } from '../lib/types';
import { getTableName } from '../lib/helpers';
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from '../lib/schemas';
import { ConfirmModal } from '../components/ConfirmModal';

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


export const DataExperienceView = ({ factTables, schemas, onUpdateSchema, onClearTable, addToast }: any) => {
    const [activeTab, setActiveTab] = useState<DataExpSubView>('preview');
    const [selectedSchemaType, setSelectedSchemaType] = useState<TableType>('shangzhi');
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const currentSchema = schemas[selectedSchemaType] || [];
    
    let displaySchema = [...currentSchema];
    if (selectedSchemaType === 'customer_service') {
        const dateField = currentSchema.find(field => field.key === 'date');
        if (dateField) {
            displaySchema = [dateField, ...currentSchema.filter(field => field.key !== 'date')];
        }
    }
    
    const sortedSchema = [...currentSchema].sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1));

    const filteredData = useMemo(() => {
        const tableData = factTables[selectedSchemaType] || [];
        if (!searchTerm) {
            return tableData;
        }
        const lowercasedFilter = searchTerm.toLowerCase();

        return tableData.filter((row: any) => {
            return Object.values(row).some(value =>
                value !== null && value !== undefined && String(value).toLowerCase().includes(lowercasedFilter)
            );
        });
    }, [searchTerm, factTables, selectedSchemaType]);

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

    const handleCloseEditModal = () => {
        setEditingField(null);
    };

    const handleConfirmEditField = (updatedField: FieldDefinition) => {
        const newSchema = currentSchema.map(f => f.key === updatedField.key ? updatedField : f);
        onUpdateSchema(selectedSchemaType, newSchema);
        addToast('success', '更新成功', `字段 [${updatedField.label}] 已更新。`);
        handleCloseEditModal();
    };

    const handleExportSchema = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(currentSchema, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `${selectedSchemaType}_schema.json`;
            link.click();
            addToast('success', '导出成功', '已开始下载表结构JSON文件。');
        } catch (e) {
            addToast('error', '导出失败', '无法生成JSON文件。');
            console.error(e);
        }
    };
    
    const handleDownloadTemplate = () => {
        try {
            const headers = displaySchema.map(field => field.label);
            const ws = XLSX.utils.aoa_to_sheet([headers]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "模板");
            XLSX.writeFile(wb, `${getTableName(selectedSchemaType)}_template.xlsx`);
            addToast('success', '下载成功', '已开始下载Excel模板文件。');
        } catch (e) {
            addToast('error', '下载失败', '无法生成Excel模板。');
            console.error(e);
        }
    };

    const handleDeleteData = () => {
        setIsClearModalOpen(true);
    };

    const handleConfirmClearData = () => {
        onClearTable(selectedSchemaType);
        setIsClearModalOpen(false);
    };

    return (
        <>
            <ConfirmModal
                isOpen={isClearModalOpen}
                title="确认清空数据"
                onConfirm={handleConfirmClearData}
                onCancel={() => setIsClearModalOpen(false)}
                confirmText="确认清空"
                confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
            >
                <p>您确定要清空 <strong className="font-black text-slate-800">[{getTableName(selectedSchemaType)}]</strong> 表的所有数据吗？</p>
                <p className="mt-2 text-rose-500 font-bold">此操作不可撤销，但表结构会保留。</p>
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
                onClose={handleCloseEditModal}
                onConfirm={handleConfirmEditField}
                field={editingField}
            />
            <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">数据体验中心</h1>
                        <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">PHYSICAL DATA EXPLORATION & PREVIEW</p>
                    </div>
                     <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                        {['shangzhi', 'jingzhuntong', 'customer_service'].map((t) => (
                             <button 
                                key={t}
                                onClick={() => setSelectedSchemaType(t as TableType)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${selectedSchemaType === t ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {getTableName(t as TableType)}明细
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
                    <div className="flex items-center gap-6 px-8 pt-6 border-b border-slate-100/50">
                        <button 
                            onClick={() => setActiveTab('preview')}
                            className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'preview' ? 'border-[#70AD47] text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Eye size={16} /> 数据预览
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
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Database size={18} className="text-[#70AD47]" />
                                    {getTableName(selectedSchemaType)} 字段映射定义
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={handleResetSchema} title="重置为默认结构" className="p-2 text-slate-400 hover:text-white hover:bg-orange-400 rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"><RotateCcw size={16} /></button>
                                    <button onClick={() => setIsAddFieldModalOpen(true)} title="添加新字段" className="p-2 text-slate-400 hover:text-white hover:bg-[#70AD47] rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"><Plus size={16} /></button>
                                    <button onClick={handleExportSchema} title="导出结构 (JSON)" className="p-2 text-slate-400 hover:text-white hover:bg-[#70AD47] rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"><FileText size={16} /></button>
                                    <button onClick={handleDownloadTemplate} title="下载导入模板 (Excel)" className="p-2 text-slate-400 hover:text-white hover:bg-[#70AD47] rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"><Download size={16} /></button>
                                    <button onClick={handleDeleteData} title="清空此表数据" className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {sortedSchema.map((field: FieldDefinition, idx: number) => (
                                    <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow group">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                {field.required ? (
                                                    <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded">必须核心</span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-500 text-[10px] font-black px-2 py-0.5 rounded">选填扩展</span>
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
                        <div className="flex-1 flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                                 <div className="relative flex-1">
                                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        placeholder="检索全表字段..." 
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#70AD47]" 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                 </div>
                                 <button className="px-4 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-[#70AD47]"><Filter size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            {displaySchema.map((f:FieldDefinition) => (
                                                <th key={f.key} className="px-6 py-4 font-bold text-slate-500 border-b border-slate-200">{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredData.length > 0 ? (
                                            filteredData.slice(0, 100).map((row: any, rIdx: number) => (
                                                <tr key={rIdx} className="hover:bg-slate-50">
                                                    {displaySchema.map((f:FieldDefinition) => (
                                                        <td key={f.key} className="px-6 py-3 text-slate-600">
                                                            {f.key === 'date' ? formatDateForDisplay(row[f.key]) : (row[f.key] ?? '-')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={displaySchema.length} className="py-32 text-center">
                                                    <p className="text-slate-300 font-bold tracking-widest text-sm uppercase italic">Empty Table or No Search Match</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};