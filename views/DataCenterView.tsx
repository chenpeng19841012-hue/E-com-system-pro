
import React, { useState, useEffect } from 'react';
import { Database, BarChart3, HardDrive, RotateCcw, UploadCloud, Download, Wrench, ChevronDown, Check, FileSpreadsheet, Headset, Archive, X, Activity, Server, Zap, Sparkles, LayoutGrid, FileText, Loader2, LoaderCircle, Layers, Split, AlertCircle, FileStack } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableType, UploadHistory, Shop } from '../lib/types';
import { getTableName, detectTableType } from '../lib/helpers';
import { ConfirmModal } from '../components/ConfirmModal';
import { parseExcelFile } from '../lib/excel';

// 升级版进度状态接口
interface UploadStats {
    current: number;
    total: number;
    startTime: number;
    fileIndex: number;
    totalFiles: number;
    fileName: string;
}

// 暂存分析结果接口
interface StagedFileAnalysis {
    fileName: string;
    totalRows: number;
    chunks: any[][];
    targetType: TableType;
}

const SyncProgressModal = ({ isOpen, stats }: { isOpen: boolean, stats: UploadStats }) => {
    const [speed, setSpeed] = useState(0); // rows per second
    const [eta, setEta] = useState(0); // seconds remaining
    
    useEffect(() => {
        if (!isOpen || stats.total === 0 || stats.startTime === 0) return;
        const now = Date.now();
        const elapsedSeconds = (now - stats.startTime) / 1000;
        
        if (elapsedSeconds > 1 && stats.current > 0) {
            const currentSpeed = Math.round(stats.current / elapsedSeconds);
            setSpeed(currentSpeed);
            const remaining = stats.total - stats.current;
            if (currentSpeed > 0) {
                setEta(Math.round(remaining / currentSpeed));
            }
        }
    }, [stats, isOpen]);

    if (!isOpen) return null;
    
    const progress = stats.total > 0 ? Math.min(100, Math.round((stats.current / stats.total) * 100)) : 0;
    
    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md p-12 text-center animate-fadeIn border border-slate-200">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <svg className="absolute inset-0 transform -rotate-90 w-24 h-24">
                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-brand transition-all duration-300" strokeDasharray={276} strokeDashoffset={276 - (276 * progress) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoaderCircle className="animate-spin text-brand" size={32} />
                    </div>
                </div>
                
                {stats.totalFiles > 1 && (
                    <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full">
                        <Layers size={12} className="text-slate-500"/>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            Batch Processing: Task {stats.fileIndex} of {stats.totalFiles}
                        </span>
                    </div>
                )}

                <h3 className="text-xl font-black text-slate-900 mb-2 truncate px-4" title={stats.fileName}>
                    {stats.fileName || '初始化数据流...'}
                </h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                    {stats.total === 0 ? 'Analyzing Structure...' : 'Uploading to Cloud Node...'}
                </p>
                
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4 p-0.5 shadow-inner">
                    <div className="bg-brand h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(112,173,71,0.5)]" style={{ width: `${Math.max(5, progress)}%` }}></div>
                </div>
                
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
                    <span>Sync Status: Active</span>
                    <span>{progress}% Completed</span>
                </div>

                {stats.total > 0 && (
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                        <div className="bg-slate-50 rounded-2xl p-3">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Real-time Speed</p>
                            <p className="text-sm font-black text-slate-800">{speed.toLocaleString()} rows/s</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Estimated Remaining</p>
                            <p className="text-sm font-black text-brand">{eta > 0 ? formatTime(eta) : 'Calculating...'}</p>
                        </div>
                        <div className="col-span-2 bg-slate-50 rounded-2xl p-3">
                             <p className="text-[8px] font-black text-slate-400 uppercase">Current Batch Detail</p>
                             <p className="text-xs font-mono font-bold text-slate-600">{stats.current.toLocaleString()} / {stats.total.toLocaleString()} Rows</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DataCenterView = ({ onImportData, onBatchUpdate, history, factStats, shops, schemas, addToast }: any) => {
  const [activeImportTab, setActiveImportTab] = useState<TableType>('shangzhi');
  
  // 核心状态：暂存已解析的大文件数据
  const [stagedAnalysis, setStagedAnalysis] = useState<StagedFileAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats>({ current: 0, total: 0, startTime: 0, fileIndex: 0, totalFiles: 0, fileName: '' });
  const [defaultShopId, setDefaultShopId] = useState<string>('');
  
  // 批量修正功能状态
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [batchSkuInput, setBatchSkuInput] = useState('');
  const [batchShopId, setBatchShopId] = useState('');
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const CHUNK_SIZE = 5000; // 自动切片阈值

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        // 立即开始分析
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const { data, headers } = parseExcelFile(evt.target?.result);
                if (data.length === 0) {
                    addToast('error', '文件为空', '未检测到有效数据行。');
                    setIsAnalyzing(false);
                    return;
                }

                // 智能检测类型
                const detectedType = detectTableType(headers, schemas);
                let effectiveType = activeImportTab; // 默认为当前

                if (detectedType && detectedType !== activeImportTab) {
                    // 如果检测到类型不匹配，提示用户并切换
                    addToast('warning', '类型智能修正', `检测到文件特征为 [${getTableName(detectedType)}]，建议切换类型。`);
                    setActiveImportTab(detectedType);
                    effectiveType = detectedType; // 立即使用检测到的类型
                }

                // 新增：广告数据物理校验
                if (effectiveType === 'jingzhuntong') {
                    const hasDate = headers.includes('日期') || headers.includes('时间');
                    const hasAccount = headers.includes('账户昵称') || headers.includes('账户');

                    if (!hasDate || !hasAccount) {
                        addToast('error', '物理校验失败', '广告数据表格必须包含 [日期] 和 [账户昵称] 列。');
                        setIsAnalyzing(false);
                        return; // 中断处理
                    }
                }

                // 自动切片逻辑
                const chunks: any[][] = [];
                for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                    chunks.push(data.slice(i, i + CHUNK_SIZE));
                }

                setStagedAnalysis({
                    fileName: file.name,
                    totalRows: data.length,
                    chunks: chunks,
                    targetType: effectiveType // 使用本地变量，避免闭包陷阱
                });

                if (data.length > CHUNK_SIZE) {
                    addToast('info', '大文件探测', `检测到 ${data.length} 行数据，系统已自动优化为 ${chunks.length} 个传输切片。`);
                }

            } catch (err: any) {
                addToast('error', '解析失败', err.message);
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsBinaryString(file);
    }
    e.target.value = ''; // Reset
  };
  
  const handleExecuteUpload = async () => {
    if (!stagedAnalysis) return;

    setIsProcessing(true);
    const { chunks, targetType, fileName } = stagedAnalysis;

    for (let i = 0; i < chunks.length; i++) {
        const chunkData = chunks[i];
        
        setUploadStats({
            current: 0,
            total: 0,
            startTime: Date.now(),
            fileIndex: i + 1,
            totalFiles: chunks.length,
            fileName: `${fileName} (Part ${i + 1}/${chunks.length})`
        });

        try {
            // 调用 App.tsx 传下来的直接数据处理接口
            // 关键：直接使用 stagedAnalysis.targetType，这是用户最后确认的值
            await onImportData(chunkData, targetType, defaultShopId, fileName, (current: number, total: number) => {
                setUploadStats(prev => ({ ...prev, current, total }));
            });
        } catch (err: any) {
            console.error(err);
            setIsProcessing(false);
            addToast('error', '队列中断', `切片 ${i + 1} 处理失败: ${err.message}`);
            return; 
        }
        
        // 间歇释放内存
        await new Promise(r => setTimeout(r, 500));
    }

    setIsProcessing(false);
    setStagedAnalysis(null); // 清除暂存
    setUploadStats({ current: 0, total: 0, startTime: 0, fileIndex: 0, totalFiles: 0, fileName: '' });
    addToast('success', '全量同步完成', `文件 [${fileName}] 所有切片已注入云端。`);
  };

  const handleCancelAnalysis = () => {
      setStagedAnalysis(null);
      addToast('info', '操作取消', '已清除待上传数据。');
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
        if (!currentSchema) { addToast('error', '操作失败', '未找到对应的表结构。'); return; }
        if (tableType === 'customer_service') {
            const dateField = currentSchema.find((field: any) => field.key === 'date');
            if (dateField) currentSchema = [dateField, ...currentSchema.filter((field: any) => field.key !== 'date')];
        }
        const headers = currentSchema.map((field: any) => field.label);
        const sheetData = [headers];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, getTableName(tableType));
        const fileName = `${getTableName(tableType)}_标准导入模板.xlsx`;
        XLSX.writeFile(wb, fileName);
        addToast('success', '下载开始', `正在准备: ${fileName}`);
    } catch (e) { addToast('error', '操作失败', '导出流程异常。'); }
  };

  const shangzhiCount = factStats.shangzhi?.count || 0;
  const jingzhuntongCount = factStats.jingzhuntong?.count || 0;
  const csCount = factStats.customer_service?.count || 0;
  const sizeMB = ((shangzhiCount + jingzhuntongCount + csCount) * 200 / 1024 / 1024).toFixed(2);
  const shangzhiLatestDate = factStats.shangzhi?.latestDate || 'N/A';
  const jingzhuntongLatestDate = factStats.jingzhuntong?.latestDate || 'N/A';

  return (
    <>
      <SyncProgressModal isOpen={isProcessing} stats={uploadStats} />
      
      <div className="p-8 md:p-12 w-full animate-fadeIn space-y-8 min-h-screen bg-[#F8FAFC]">
        {/* Command Header - Standardized */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
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
                    className={`flex items-center gap-3 px-8 py-3 rounded-[22px] font-black text-xs transition-all shadow-xl active:scale-95 uppercase tracking-widest ${isToolboxOpen ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Wrench size={14} /> 物理层治理工具箱
                </button>
            </div>
        </div>

        {/* Governance Toolbox */}
        {isToolboxOpen && (
            <div className="bg-slate-900 rounded-[48px] p-12 border border-slate-800 shadow-2xl animate-fadeIn relative overflow-hidden group mb-8">
                 <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-[100px] pointer-events-none"></div>
                 <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand">
                        <Zap size={24} className="fill-brand" />
                    </div>
                    <h3 className="font-black text-white text-2xl tracking-tight">物理层字段批量对齐</h3>
                 </div>
                 {/* ... (Toolbox Content) ... */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                    <div className="lg:col-span-5">
                        <textarea placeholder="输入 SKU 编码序列..." value={batchSkuInput} onChange={e => setBatchSkuInput(e.target.value)} className="w-full h-40 bg-black/40 border border-white/10 rounded-[32px] px-6 py-5 text-sm text-slate-300 outline-none focus:border-brand transition-all font-mono no-scrollbar shadow-inner" />
                    </div>
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="relative">
                            <select value={batchShopId} onChange={e => setBatchShopId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-slate-200 outline-none focus:border-brand appearance-none shadow-sm">
                                <option value="">选择目标归属店铺...</option>
                                {shops.map((s:Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                        <button onClick={handleBatchFix} disabled={isBatchUpdating} className="w-full py-5 rounded-[24px] bg-brand text-white font-black text-sm hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                            {isBatchUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={4} />} 执行批量修正
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* High-Impact Statistics Grid - Compressed */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard label="商智核心事实行" value={shangzhiCount} date={shangzhiLatestDate} icon={<Database size={20}/>} color="text-brand" bg="bg-brand/5" />
            <StatCard label="广告投放事实行" value={jingzhuntongCount} date={jingzhuntongLatestDate} icon={<BarChart3 size={20}/>} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="客服接待流水" value={csCount} date="N/A" icon={<Headset size={20}/>} color="text-purple-600" bg="bg-purple-50" />
            <StatCard label="物理空间占用" value={`${sizeMB} MB`} date="Cloud Native" icon={<Server size={20}/>} color="text-slate-900" bg="bg-slate-50" />
        </div>

        {/* Unified Operations Card - Ultra Compressed (~30% height reduction) */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(112,173,71,0.025),transparent_70%)] pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Section 2: Sync Engine (The Centerpiece) */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand shadow-inner">
                            <UploadCloud size={16} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">物理同步引擎</h3>
                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">ETL Core Pipeline</p>
                        </div>
                    </div>

                    {!stagedAnalysis ? (
                        /* State 1: Upload & Initial Config - Compressed */
                        <div className="space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">目标原子表</label>
                                     <div className="relative">
                                        <select 
                                            value={activeImportTab} 
                                            onChange={e => setActiveImportTab(e.target.value as TableType)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-inner"
                                        >
                                            <option value="shangzhi">商智: 销售事实</option>
                                            <option value="jingzhuntong">广告: 投放事实</option>
                                            <option value="customer_service">客服: 流量事实</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                     </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">物理资产强制匹配</label>
                                    <div className="relative">
                                        <select 
                                            value={defaultShopId} 
                                            onChange={e => setDefaultShopId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-inner"
                                        >
                                            <option value="">-- 自动物理探测 --</option>
                                            {shops.map((s:Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 hover:border-brand transition-all rounded-[24px] p-4 flex flex-row items-center justify-between relative group/upload">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-brand group-hover/upload:scale-110 transition-transform duration-500 shrink-0">
                                        {isAnalyzing ? <LoaderCircle size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-black text-slate-900 text-sm tracking-tight">
                                            {isAnalyzing ? '正在解析物理结构...' : '点击挂载 Excel 物理文件'}
                                        </h4>
                                        <p className="text-[9px] text-slate-400 font-black mt-1 tracking-[0.2em] uppercase italic">
                                            SYSTEM AUTO-SPLITTING ENABLED
                                        </p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input type="file" onChange={handleFileSelect} accept=".xlsx, .xls" disabled={isAnalyzing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <button disabled={isAnalyzing} className="px-8 py-3 bg-white border border-slate-200 text-slate-500 font-black text-xs rounded-2xl hover:border-brand hover:text-brand transition-all shadow-sm uppercase tracking-widest disabled:opacity-50">
                                        {isAnalyzing ? '分析中...' : '选择本地文件'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* State 2: Analysis Result & Confirmation - Compressed */
                        <div className="space-y-4 animate-fadeIn">
                            <div className="bg-blue-50/50 rounded-[24px] p-4 border border-blue-100 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-50"><FileText size={18}/></div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{stagedAnalysis.fileName}</h4>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                {stagedAnalysis.totalRows.toLocaleString()} Rows
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* 手动修正目标表功能 */}
                                    <div className="bg-white p-1.5 rounded-xl flex items-center gap-2 border border-slate-100 shadow-sm">
                                        <Database size={12} className="text-slate-400" />
                                        <select 
                                            value={stagedAnalysis.targetType} 
                                            onChange={(e) => setStagedAnalysis({...stagedAnalysis, targetType: e.target.value as TableType})}
                                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-800 outline-none focus:border-brand cursor-pointer hover:bg-slate-100 transition-colors appearance-none"
                                        >
                                            <option value="shangzhi">商智</option>
                                            <option value="jingzhuntong">广告</option>
                                            <option value="customer_service">客服</option>
                                        </select>
                                        <ChevronDown size={10} className="text-slate-400 pointer-events-none -ml-1" />
                                    </div>
                                </div>
                                
                                {stagedAnalysis.chunks.length > 1 ? (
                                    <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm">
                                        <div className="flex items-center gap-2 text-blue-600 mb-1.5">
                                            <Split size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">自动分片激活</span>
                                        </div>
                                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                            {stagedAnalysis.chunks.map((_, idx) => (
                                                <div key={idx} className="flex-shrink-0 w-14 h-8 bg-blue-50 rounded-lg flex flex-col items-center justify-center border border-blue-100">
                                                    <span className="text-[7px] font-black text-blue-400 uppercase">P{idx+1}</span>
                                                    <span className="text-[8px] font-black text-slate-700">{_.length}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 rounded-xl p-2.5 border border-green-100 flex items-center gap-2">
                                        <Check size={12} className="text-green-600" />
                                        <span className="text-[9px] font-black text-green-700">规模正常，直接同步。</span>
                                    </div>
                                )}

                                <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100 flex items-start gap-2">
                                    <AlertCircle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold text-amber-600 leading-tight">
                                        基于【{stagedAnalysis.targetType === 'jingzhuntong' ? '日期+账户+SKU+花费' : '日期+SKU'}】去重，重复项将覆盖。
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button onClick={handleCancelAnalysis} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 font-black text-[9px] rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest">取消</button>
                                    <button 
                                        onClick={handleExecuteUpload} 
                                        disabled={isProcessing}
                                        className="flex-[2] py-2.5 bg-brand text-white font-black text-[9px] rounded-xl shadow-lg shadow-brand/20 hover:bg-[#5da035] transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95"
                                    >
                                        {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} className="fill-white" />}
                                        {stagedAnalysis.chunks.length > 1 ? '分片同步' : '立即同步'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 3: Archive (Full Export) - Compressed */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-brand">
                            <Archive size={16} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">物理归档</h3>
                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">System Archive</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <TemplateButton label="商智明细" onClick={() => handleDownloadTemplate('shangzhi')} icon={<FileSpreadsheet size={14}/>} />
                        <TemplateButton label="广告投放" onClick={() => handleDownloadTemplate('jingzhuntong')} icon={<BarChart3 size={14}/>} />
                        <TemplateButton label="客服统计" onClick={() => handleDownloadTemplate('customer_service')} icon={<Headset size={14}/>} />
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
                            history.slice(0, 20).map((h: UploadHistory) => (
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Physical ETL System v5.2.0</p>
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Yunzhou Intelligence Command Subsystem</p>
        </div>
      </div>
    </>
  );
};

const StatCard = ({ label, value, date, icon, color, bg }: any) => (
    <div className={`bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center ${color} shadow-inner group-hover:scale-110 transition-transform duration-500`}>{icon}</div>
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
    <button onClick={onClick} className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand hover:shadow-lg transition-all group/btn">
        <div className="flex items-center gap-3">
            <div className="text-slate-300 group-hover/btn:text-brand transition-colors">{icon}</div>
            <span className="font-black text-slate-700 text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <Download size={12} className="text-slate-200 group-hover/btn:text-brand" />
    </button>
);
