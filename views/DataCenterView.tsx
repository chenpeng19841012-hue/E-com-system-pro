
import React, { useState } from 'react';
import { Database, BarChart3, HardDrive, RotateCcw, UploadCloud, Download, Wrench, ChevronDown, Check, FileSpreadsheet, Headset, Archive, X, Activity, Server, Zap, Sparkles, LayoutGrid, FileText, Loader2, LoaderCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableType, UploadHistory, Shop } from '../lib/types';
import { getTableName, detectTableType } from '../lib/helpers';
import { ConfirmModal } from '../components/ConfirmModal';
import { parseExcelFile } from '../lib/excel';

const SyncProgressModal = ({ isOpen, progress }: { isOpen: boolean, progress: number }) => {
    if (!isOpen) return null;
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
                            className="text-brand transition-all duration-300"
                            strokeDasharray={276}
                            strokeDashoffset={276 - (276 * progress) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoaderCircle className="animate-spin text-brand" size={32} />
                    </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {progress === 0 ? '正在解析物理文件...' : '数据物理同步中'}
                </h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">
                    {progress === 0 ? 'Parsing Excel Stream...' : 'Uploading to Cloud Node...'}
                </p>
                
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4 p-0.5 shadow-inner">
                    <div className="bg-brand h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(112,173,71,0.5)]" style={{ width: `${Math.max(5, progress)}%` }}></div>
                </div>
                
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Sync Status: {progress === 0 ? 'Initializing' : 'Active'}</span>
                    <span>{progress}% Completed</span>
                </div>
            </div>
        </div>
    );
};

export const DataCenterView = ({ onUpload, onBatchUpdate, history, factTables, shops, schemas, addToast }: any) => {
  const [activeImportTab, setActiveImportTab] = useState<TableType>('shangzhi');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [defaultShopId, setDefaultShopId] = useState<string>('');
  
  // 批量修正功能状态
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [batchSkuInput, setBatchSkuInput] = useState('');
  const [batchShopId, setBatchShopId] = useState('');
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    detectedType: TableType | null;
    selectedType: TableType | null;
    onConfirm: () => void;
  }>({ isOpen: false, detectedType: null, selectedType: null, onConfirm: () => {} });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        addToast('error', '格式不支持', '请选择 .XLS 或 .XLSX 格式的Excel文件。');
        setSelectedFile(null);
      }
    } else {
      setSelectedFile(null);
    }
  };
  
  const handleProcessClick = () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setUploadProgress(0);

    const performUpload = async (tableType: TableType) => {
        try {
            await onUpload(selectedFile, tableType, defaultShopId, (progress: number) => {
                setUploadProgress(progress);
            });
        } finally {
            setIsProcessing(false);
            setUploadProgress(0);
            setSelectedFile(null);
            setModalState({ isOpen: false, detectedType: null, selectedType: null, onConfirm: () => {} });
        }
    };

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const { headers } = parseExcelFile(data);

            if (headers.length === 0) {
                addToast('error', '文件分析失败', '无法在文件中找到有效的表头。');
                setIsProcessing(false);
                return;
            }

            const detectedType = detectTableType(headers, schemas);

            if (detectedType && detectedType !== activeImportTab) {
                setIsProcessing(false);
                setModalState({
                    isOpen: true,
                    detectedType: detectedType,
                    selectedType: activeImportTab,
                    onConfirm: () => {
                        setIsProcessing(true);
                        performUpload(detectedType);
                    }
                });
            } else {
                await performUpload(activeImportTab);
            }
        } catch (err: any) {
            console.error(err);
            addToast('error', '文件分析失败', err.message || '无法读取文件头信息，请检查文件格式。');
            setIsProcessing(false);
        }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleModalCancel = () => {
    setModalState({ isOpen: false, detectedType: null, selectedType: null, onConfirm: () => {} });
    setSelectedFile(null);
  };

  const handleBatchFix = async () => {
      const parsedSkus = batchSkuInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      if (parsedSkus.length === 0 || !batchShopId) {
          addToast('error', '参数缺失', '请输入 SKU 列表并选择目标店铺。');
          return;
      }
      setIsBatchUpdating(true);
      try {
          await onBatchUpdate(parsedSkus, batchShopId);
          setBatchSkuInput('');
          setBatchShopId('');
      } finally {
          setIsBatchUpdating(false);
      }
  };

  const handleDownloadTemplate = (tableType: TableType, isOnlyTemplate: boolean = true) => {
    try {
        let currentSchema = schemas[tableType];
        const data = isOnlyTemplate ? [] : factTables[tableType];

        if (!currentSchema) {
            addToast('error', '操作失败', '未找到对应的表结构。');
            return;
        }

        if (tableType === 'customer_service') {
            const dateField = currentSchema.find((field: any) => field.key === 'date');
            if (dateField) {
                currentSchema = [dateField, ...currentSchema.filter((field: any) => field.key !== 'date')];
            }
        }
        
        const headers = currentSchema.map((field: any) => field.label);
        const dataRows = data.map((row: any) => 
            currentSchema.map((field: any) => row[field.key] ?? null)
        );

        const sheetData = [headers, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, getTableName(tableType));
        
        const fileName = isOnlyTemplate 
            ? `${getTableName(tableType)}_标准导入模板.xlsx`
            : `${getTableName(tableType)}_全量数据导出_${new Date().toISOString().split('T')[0]}.xlsx`;
            
        XLSX.writeFile(wb, fileName);
        addToast('success', '下载开始', `正在准备: ${fileName}`);
    } catch (e) {
        addToast('error', '操作失败', '导出流程异常。');
    }
  };

  const getLatestDate = (data: any[]) => {
    if (!data || data.length === 0) return 'N/A';
    try {
      const latest = data.reduce((maxDateStr, row) => {
        if (!row.date || typeof row.date !== 'string') return maxDateStr;
        return row.date > maxDateStr ? row.date : maxDateStr;
      }, '1970-01-01');
      return latest === '1970-01-01' ? 'N/A' : latest;
    } catch { return '日期无效'; }
  };

  const shangzhiCount = factTables.shangzhi?.length || 0;
  const jingzhuntongCount = factTables.jingzhuntong?.length || 0;
  const csCount = factTables.customer_service?.length || 0;
  const totalRows = shangzhiCount + jingzhuntongCount + csCount;
  const sizeMB = (totalRows * 200 / 1024 / 1024).toFixed(2);
  const shangzhiLatestDate = getLatestDate(factTables.shangzhi);
  const jingzhuntongLatestDate = getLatestDate(factTables.jingzhuntong);

  return (
    <>
      <SyncProgressModal isOpen={isProcessing} progress={uploadProgress} />
      
      <ConfirmModal
        isOpen={modalState.isOpen}
        title="智能检测提示"
        onConfirm={modalState.onConfirm}
        onCancel={handleModalCancel}
        confirmText="确认同步"
      >
        {modalState.selectedType && modalState.detectedType && (
            <>
                <p>您当前选择的导入目标是 <strong className="font-black text-slate-800">[{getTableName(modalState.selectedType)}]</strong>，但系统检测到文件内容更匹配 <strong className="font-black text-slate-800">[{getTableName(modalState.detectedType)}]</strong>。</p>
                <p className="mt-2">是否要按 <strong className="font-black text-slate-800">[{getTableName(modalState.detectedType)}]</strong> 类型进行同步？</p>
            </>
        )}
      </ConfirmModal>

      <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 min-h-screen bg-[#F8FAFC]">
        {/* Command Header - Standardized */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                    <span className="text-[10px] font-black text-brand uppercase tracking-widest">物理层 ETL 链路就绪</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">数据中心控制台</h1>
                <p className="text-slate-500 font-medium text-xs mt-1 opacity-60">Physical Data Governance Hub & Neural Pipeline Matrix</p>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={() => setIsToolboxOpen(!isToolboxOpen)}
                    className={`flex items-center gap-3 px-8 py-3.5 rounded-[22px] font-black text-xs transition-all shadow-xl active:scale-95 uppercase tracking-widest ${isToolboxOpen ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Wrench size={16} /> 物理层治理工具箱
                </button>
            </div>
        </div>

        {/* Governance Toolbox */}
        {isToolboxOpen && (
            <div className="bg-slate-900 rounded-[48px] p-12 border border-slate-800 shadow-2xl animate-fadeIn relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-[100px] pointer-events-none"></div>
                 <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand">
                        <Zap size={24} className="fill-brand" />
                    </div>
                    <h3 className="font-black text-white text-2xl tracking-tight">物理层字段批量对齐</h3>
                 </div>
                 <p className="text-slate-400 text-xs mb-8 font-bold leading-relaxed max-w-2xl uppercase tracking-wider">
                    此工具将遍历 IndexedDB 全量物理记录，将匹配 SKU 的“店铺名称”字段强制覆盖。适用于修正导入时未带店名标识的历史脏数据。
                 </p>
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                    <div className="lg:col-span-5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 block">受控 SKU 编码序列 (每行一个)</label>
                        <textarea 
                            placeholder="输入需要修正的 SKU 编码序列..."
                            value={batchSkuInput}
                            onChange={e => setBatchSkuInput(e.target.value)}
                            className="w-full h-40 bg-black/40 border border-white/10 rounded-[32px] px-6 py-5 text-sm text-slate-300 outline-none focus:border-brand transition-all font-mono no-scrollbar shadow-inner"
                        />
                    </div>
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 block">物理目标店铺</label>
                            <div className="relative">
                                <select 
                                    value={batchShopId}
                                    onChange={e => setBatchShopId(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-slate-200 outline-none focus:border-brand appearance-none shadow-sm"
                                >
                                    <option value="">选择目标归属店铺...</option>
                                    {shops.map((s:Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>
                        </div>
                        <button 
                            onClick={handleBatchFix}
                            disabled={isBatchUpdating}
                            className="w-full py-5 rounded-[24px] bg-brand text-white font-black text-sm hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                            {isBatchUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={4} />}
                            {isBatchUpdating ? '写入原子层...' : '执行批量修正'}
                        </button>
                    </div>
                    <div className="lg:col-span-3">
                         <div className="bg-white/5 rounded-[32px] p-8 border border-white/5 h-full">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">物理层操作审计</h4>
                            <ul className="text-[11px] text-slate-400 space-y-4 font-bold">
                                <li className="flex gap-3"><div className="w-1 h-1 rounded-full bg-brand mt-1.5 shrink-0"></div><span>该操作会直接覆写所有匹配物理记录的 store_name 字段。</span></li>
                                <li className="flex gap-3"><div className="w-1 h-1 rounded-full bg-brand mt-1.5 shrink-0"></div><span>不会修改 dim_skus 维度表的资产配置。</span></li>
                                <li className="flex gap-3"><div className="w-1 h-1 rounded-full bg-brand mt-1.5 shrink-0"></div><span>重新同步同日期数据会再次触发覆盖。</span></li>
                            </ul>
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {/* High-Impact Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <StatCard label="商智核心事实行" value={shangzhiCount} date={shangzhiLatestDate} icon={<Database size={22}/>} color="text-brand" bg="bg-brand/5" />
            <StatCard label="广告投放事实行" value={jingzhuntongCount} date={jingzhuntongLatestDate} icon={<BarChart3 size={22}/>} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="客服接待流水" value={csCount} date="N/A" icon={<Headset size={22}/>} color="text-purple-600" bg="bg-purple-50" />
            <StatCard label="物理空间占用" value={`${sizeMB} MB`} date="Cloud Native" icon={<Server size={22}/>} color="text-slate-900" bg="bg-slate-50" />
        </div>

        {/* Unified Operations Card */}
        <div className="bg-white rounded-[56px] shadow-sm border border-slate-100 p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(112,173,71,0.025),transparent_70%)] pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                {/* Section 1: Templates (Dimension Config) */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">维度模版</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Metadata Standard</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed pr-6">同步数据前，请确保您的物理文件列头与标准化模版高度对齐。</p>
                    <div className="space-y-3">
                        <TemplateButton label="商智明细模版" onClick={() => handleDownloadTemplate('shangzhi')} icon={<FileSpreadsheet size={16}/>} />
                        <TemplateButton label="广告投放模版" onClick={() => handleDownloadTemplate('jingzhuntong')} icon={<BarChart3 size={16}/>} />
                        <TemplateButton label="客服统计模版" onClick={() => handleDownloadTemplate('customer_service')} icon={<Headset size={16}/>} />
                    </div>
                </div>

                {/* Section 2: Sync Engine (The Centerpiece) */}
                <div className="lg:col-span-6 space-y-8 px-0 lg:px-12 border-x border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shadow-inner">
                            <UploadCloud size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">物理同步引擎</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ETL Core Pipeline</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">目标原子表</label>
                             <div className="relative">
                                <select 
                                    value={activeImportTab} 
                                    onChange={e => setActiveImportTab(e.target.value as TableType)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-inner"
                                >
                                    <option value="shangzhi">商智: 销售事实</option>
                                    <option value="jingzhuntong">广告: 投放事实</option>
                                    <option value="customer_service">客服: 流量事实</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                             </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">物理资产强制匹配</label>
                            <div className="relative">
                                <select 
                                    value={defaultShopId} 
                                    onChange={e => setDefaultShopId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-inner"
                                >
                                    <option value="">-- 自动物理探测 --</option>
                                    {shops.map((s:Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 hover:border-brand transition-all rounded-[40px] p-12 flex flex-col items-center justify-center relative group/upload">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl text-brand mb-6 group-hover/upload:scale-110 transition-transform duration-500">
                            <UploadCloud size={36} />
                        </div>
                        <div className="text-center mb-10">
                            <h4 className="font-black text-slate-900 text-lg tracking-tight truncate max-w-[300px]">{selectedFile ? selectedFile.name : '点击或拖拽文件至控制区'}</h4>
                            <p className="text-[10px] text-slate-400 font-black mt-2 tracking-[0.2em] uppercase italic">Supports: .XLS / .XLSX</p>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="relative">
                                <input type="file" onChange={handleFileSelect} accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <button className="px-10 py-4 bg-white border-2 border-slate-200 text-slate-500 font-black text-xs rounded-2xl hover:border-brand hover:text-brand transition-all shadow-sm uppercase tracking-widest">
                                    {selectedFile ? '重新挂载' : '物理文件浏览'}
                                </button>
                            </div>
                            <button 
                                onClick={handleProcessClick}
                                disabled={!selectedFile || isProcessing}
                                className="px-12 py-4 bg-brand text-white font-black text-xs rounded-2xl shadow-2xl shadow-brand/20 transition-all hover:bg-[#5da035] active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] flex items-center gap-3">
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-white" />}
                                {isProcessing ? '同步中...' : '启动对齐'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 3: Archive (Full Export) */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-brand">
                            <Archive size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">物理归档</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">System Archive</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed pl-1">导出物理库全量镜像，用于异地还原或离线分析工作。</p>
                    <div className="space-y-3">
                        <ArchiveButton label="全量商智导出" onClick={() => handleDownloadTemplate('shangzhi', false)} />
                        <ArchiveButton label="全量广告导出" onClick={() => handleDownloadTemplate('jingzhuntong', false)} />
                        <ArchiveButton label="全量客服导出" onClick={() => handleDownloadTemplate('customer_service', false)} />
                    </div>
                </div>
            </div>
        </div>

        {/* Sync History Table */}
        <div className="bg-white rounded-[56px] p-12 border border-slate-100 shadow-sm relative overflow-hidden group/history">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(112,173,71,0.015),transparent_60%)] pointer-events-none"></div>
            <div className="flex items-center gap-5 mb-12 relative z-10">
                <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-brand border border-slate-100 shadow-inner group-hover/history:rotate-6 transition-transform">
                    <RotateCcw size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">物理同步编年史</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Audit Log of Physical Data Streams</p>
                </div>
            </div>
            
            <div className="overflow-x-auto rounded-[40px] border border-slate-100 no-scrollbar shadow-inner bg-white relative z-10">
                <table className="w-full text-sm table-fixed min-w-[900px]">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
                            <th className="w-[30%] text-left pl-10 py-6">数据源文件名</th>
                            <th className="w-[12%] text-center">物理载荷</th>
                            <th className="w-[12%] text-center">事实行数</th>
                            <th className="w-[15%] text-center">目标映射表</th>
                            <th className="w-[18%] text-center">系统同步时间</th>
                            <th className="w-[13%] text-center pr-10">同步状态</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {history.length === 0 ? (
                            <tr><td colSpan={6} className="py-40 text-center opacity-30 italic font-black uppercase tracking-widest text-slate-300">Awaiting Data Inflow</td></tr>
                        ) : (
                            history.map((h: UploadHistory) => (
                                <tr key={h.id} className="hover:bg-slate-50/50 transition-all group/row">
                                    <td className="py-6 pl-10">
                                        <div className="flex items-center gap-3">
                                            <FileText size={16} className="text-slate-300" />
                                            <span className="font-black text-slate-800 truncate" title={h.fileName}>{h.fileName}</span>
                                        </div>
                                    </td>
                                    <td className="text-center font-mono text-[11px] text-slate-400 font-bold uppercase">{h.fileSize}</td>
                                    <td className="text-center font-black text-slate-700 tabular-nums">{h.rowCount.toLocaleString()}</td>
                                    <td className="text-center">
                                        <span className="inline-flex px-3 py-1 bg-brand/5 text-brand text-[10px] font-black uppercase rounded-lg border border-brand/10">
                                            {getTableName(h.targetTable)}
                                        </span>
                                    </td>
                                    <td className="text-center font-mono text-[11px] text-slate-400 font-bold">{h.uploadTime}</td>
                                    <td className="text-right pr-10">
                                        <div className={`inline-flex items-center gap-2 font-black uppercase text-[10px] ${h.status === '成功' ? 'text-green-600' : 'text-rose-500'}`}>
                                            {h.status === '成功' ? <Check size={14} strokeWidth={4} /> : <X size={14} strokeWidth={4} />}
                                            {h.status}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Professional Footer Label */}
        <div className="flex items-center justify-between opacity-30 grayscale hover:grayscale-0 transition-all px-12 pt-6">
            <div className="flex items-center gap-4">
                <Sparkles size={16} className="text-brand animate-pulse"/>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Physical ETL System v3.4.1</p>
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Yunzhou Intelligence Command Subsystem</p>
        </div>
      </div>
    </>
  );
};

const StatCard = ({ label, value, date, icon, color, bg }: any) => (
    <div className={`bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden`}>
        <div className="flex justify-between items-start mb-6">
            <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center ${color} shadow-inner group-hover:scale-110 transition-transform duration-500`}>{icon}</div>
            <div className="text-right">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
                <div className="flex items-center gap-1.5 justify-end">
                    <Activity size={10} className="text-slate-300" />
                    <span className="text-[9px] font-black text-slate-300 uppercase tabular-nums">Fact Stream</span>
                </div>
            </div>
        </div>
        <div className="space-y-1">
            <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{value.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                事实快照: {date}
            </p>
        </div>
    </div>
);

const TemplateButton = ({ label, onClick, icon }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand hover:shadow-lg transition-all group/btn">
        <div className="flex items-center gap-3">
            <div className="text-slate-300 group-hover/btn:text-brand transition-colors">{icon}</div>
            <span className="font-black text-slate-700 text-[11px] uppercase tracking-wider">{label}</span>
        </div>
        <Download size={14} className="text-slate-200 group-hover/btn:text-brand" />
    </button>
);

const ArchiveButton = ({ label, onClick }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-800 hover:shadow-lg transition-all group/btn">
        <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/btn:bg-slate-900 transition-colors"></div>
             <span className="font-black text-slate-600 text-[11px] uppercase tracking-wider">{label}</span>
        </div>
        <Download size={14} className="text-slate-300 group-hover/btn:text-slate-900" />
    </button>
);
