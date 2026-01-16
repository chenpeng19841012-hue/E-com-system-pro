import React, { useState } from 'react';
import { Database, BarChart3, HardDrive, RotateCcw, UploadCloud, Download } from 'lucide-react';
// FIX: Import 'xlsx' library to handle Excel template generation.
import * as XLSX from 'xlsx';
import { TableType, UploadHistory } from '../lib/types';
import { getTableName, detectTableType } from '../lib/helpers';
import { ConfirmModal } from '../components/ConfirmModal';
import { parseExcelFile } from '../lib/excel';

export const DataCenterView = ({ onUpload, history, factTables, schemas, addToast }: any) => {
  const [activeImportTab, setActiveImportTab] = useState<TableType>('shangzhi');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

    const performUpload = async (tableType: TableType) => {
        try {
            await onUpload(selectedFile, tableType);
        } finally {
            setIsProcessing(false);
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

  const handleDownloadTemplate = (tableType: TableType) => {
    try {
        let currentSchema = schemas[tableType];
        const data = factTables[tableType];

        if (!currentSchema) {
            addToast('error', '下载失败', '未找到对应的表结构。');
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
        
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const fileName = `${getTableName(tableType)}_export_${formattedDate}.xlsx`;
        XLSX.writeFile(wb, fileName);

        addToast('success', '导出成功', `已开始下载 ${getTableName(tableType)} 表数据。`);
    } catch (e) {
        addToast('error', '下载失败', '无法生成Excel文件。');
        console.error(e);
    }
  };

  const getLatestDate = (data: any[]) => {
    if (!data || data.length === 0) return 'N/A';
    try {
      const latest = data.reduce((maxDateStr, row) => {
        if (!row.date || typeof row.date !== 'string') return maxDateStr;
        // Simple string comparison works for YYYY-MM-DD format
        return row.date > maxDateStr ? row.date : maxDateStr;
      }, '1970-01-01');
      return latest === '1970-01-01' ? 'N/A' : latest;
    } catch {
      return 'Invalid Date';
    }
  };

  const shangzhiCount = factTables.shangzhi?.length || 0;
  const jingzhuntongCount = factTables.jingzhuntong?.length || 0;
  const totalRows = shangzhiCount + jingzhuntongCount + (factTables.customer_service?.length || 0);
  const sizeMB = (totalRows * 200 / 1024 / 1024).toFixed(2);
  const shangzhiLatestDate = getLatestDate(factTables.shangzhi);
  const jingzhuntongLatestDate = getLatestDate(factTables.jingzhuntong);

  return (
    <>
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
      <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">数据中心控制台</h1>
          <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">PHYSICAL DATA GOVERNANCE</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 flex flex-col justify-between border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 mb-2">商智数据总行数</p>
              <Database size={24} className="text-slate-200" />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-800">{shangzhiCount.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">最新数据: {shangzhiLatestDate}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 flex flex-col justify-between border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 mb-2">广告数据总行数</p>
              <BarChart3 size={24} className="text-[#70AD47]" />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-800">{jingzhuntongCount.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">最新数据: {jingzhuntongLatestDate}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 flex flex-col justify-between border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 mb-2">物理层占用</p>
                <HardDrive size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-800">{sizeMB} MB</p>
              <p className="text-xs text-slate-400 mt-1 font-medium invisible">Placeholder</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="space-y-6">
                  <h3 className="flex items-center gap-2 font-black text-slate-800 text-lg">
                      <div className="w-1.5 h-6 bg-[#70AD47] rounded-full"></div>
                      智能校验 & 自动分拣
                  </h3>
                  <ul className="space-y-4">
                      {[
                          { title: '智能分拣', desc: '根据文件头自动识别物理表。' },
                          { title: '清洗过滤', desc: '自动剔除 SKU 含字母或汉字的不合规记录。' },
                          { title: '格式自适应', desc: '支持 YYYYMMDD 及序列号等日期格式。' },
                      ].map((item, i) => (
                          <li key={i} className="flex gap-3">
                              <div className="mt-1.5 w-2 h-2 rounded-full bg-[#70AD47] shrink-0"></div>
                              <div>
                                  <span className="font-bold text-slate-700 text-sm">{item.title}：</span>
                                  <span className="text-slate-500 text-sm">{item.desc}</span>
                              </div>
                          </li>
                      ))}
                  </ul>
                  <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-slate-700 text-sm mb-3">导出数据表格</h4>
                      <div className="flex flex-col sm:flex-row gap-2">
                          <button onClick={() => handleDownloadTemplate('shangzhi')} className="flex-1 text-center flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"><Download size={14}/> 导出商智数据</button>
                          <button onClick={() => handleDownloadTemplate('jingzhuntong')} className="flex-1 text-center flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"><Download size={14}/> 导出广告数据</button>
                          <button onClick={() => handleDownloadTemplate('customer_service')} className="flex-1 text-center flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"><Download size={14}/> 导出客服数据</button>
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                  <div>
                      <h3 className="font-bold text-slate-800 mb-4">请点击选择要导入数据表</h3>
                      <div className="flex gap-4">
                          {['shangzhi', 'jingzhuntong', 'customer_service'].map(tab => (
                              <button
                                  key={tab}
                                  onClick={() => setActiveImportTab(tab as TableType)}
                                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                                      activeImportTab === tab 
                                      ? 'bg-[#70AD47] text-white shadow-lg shadow-[#70AD47]/20' 
                                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                  }`}
                              >
                                  {tab === 'shangzhi' ? '商智' : tab === 'jingzhuntong' ? '广告' : '客服'}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-dashed border-slate-200 hover:border-[#70AD47] transition-colors rounded-2xl p-6 flex items-center justify-between relative group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-[#70AD47]">
                                <UploadCloud size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{selectedFile ? '文件已选择' : '上传待同步表格'}</h4>
                                <p className="text-xs text-slate-400 italic mt-0.5">{selectedFile ? selectedFile.name : '仅支持 .XLS 或 .XLSX 格式'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                  <input 
                                      type="file" 
                                      onChange={handleFileSelect} 
                                      accept=".xlsx, .xls" 
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  />
                                  <button className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-white group-hover:border-[#70AD47] transition-colors shadow-sm">
                                      {selectedFile ? '重新选择文件' : '请选择上传文件'}
                                  </button>
                            </div>
                            <button 
                                  onClick={handleProcessClick}
                                  disabled={!selectedFile || isProcessing}
                                  className="bg-[#70AD47] text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg shadow-[#70AD47]/20 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed active:scale-95">
                                  {isProcessing ? '处理中...' : '执行同步'}
                            </button>
                        </div>
                  </div>
              </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm min-h-[300px]">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-6">
                <RotateCcw size={18} className="text-[#70AD47]" />
                近期物理同步历史
            </h3>
            
            <div className="w-full">
                <div className="grid grid-cols-6 gap-4 pb-4 border-b border-slate-100 text-xs font-bold text-slate-400 text-center">
                    <div className="text-left pl-4">文件名</div>
                    <div>大小</div>
                    <div>行数</div>
                    <div>物理库表</div>
                    <div>完成时间</div>
                    <div>同步状态</div>
                </div>
                
                {history.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-slate-300 font-bold text-lg italic">暂无同步记录</p>
                    </div>
                ) : (
                    history.map((h: UploadHistory) => (
                        <div key={h.id} className="grid grid-cols-6 gap-4 py-4 border-b border-slate-50 text-xs text-slate-600 items-center text-center hover:bg-slate-50 transition-colors">
                              <div className="text-left pl-4 font-bold text-slate-700 truncate">{h.fileName}</div>
                              <div>{h.fileSize}</div>
                              <div>{h.rowCount}</div>
                              <div>
                                  <span className="uppercase">{getTableName(h.targetTable)}</span>
                              </div>
                              <div>{h.uploadTime.split(' ')[0]}</div>
                              <div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${h.status === '成功' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{h.status}</span>
                              </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </>
  );
};