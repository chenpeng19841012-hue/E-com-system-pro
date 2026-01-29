
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, CloudSync as SyncIcon } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { DashboardView } from './views/DashboardView';
import { MultiQueryView } from './views/MultiQueryView';
import { ReportsView } from './views/ReportsView';
import { SKUManagementView } from './views/SKUManagementView';
import { DataExperienceView } from './views/DataExperienceView';
import { DataCenterView } from './views/DataCenterView';
import { CloudSyncView } from './views/CloudSyncView';
import { AIProfitAnalyticsView } from './views/AIProfitAnalyticsView';
import { AISmartReplenishmentView } from './views/AISmartReplenishmentView';
import { AIQuotingView } from './views/AIQuotingView';
import { AIDescriptionView } from './views/AIDescriptionView';
import { AISalesForecastView } from './views/AISalesForecastView';
import { AIAssistantView } from './views/AIAssistantView';
import { AIAdImageView } from './views/AIAdImageView';
import { SystemSnapshotView } from './views/SystemSnapshotView';
import { AICompetitorMonitoringView } from './views/AICompetitorMonitoringView';

import { View, TableType, ToastProps, Shop, ProductSKU, CustomerServiceAgent, UploadHistory, QuotingData, SkuList, SnapshotSettings, MonitoredCompetitorShop, CompetitorGroup } from './lib/types';
import { DB } from './lib/db';
import { parseExcelFile } from './lib/excel';
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from './lib/schemas';

const INITIAL_QUOTING_DATA: QuotingData = {
    "prices": {
        "主机": { "TSK-C3 I5-13400": 2700.0, "TSK-C3 I5-14500": 3300.0 },
        "内存": { "8G DDR5": 450.0, "16G DDR5": 1000.0 }
    },
    "settings": { "margin": 1.15 },
    "discounts": [{ "min_qty": 10, "rate": 0.98 }]
};

export const App = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [toasts, setToasts] = useState<ToastProps[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('连接云端资产库...');
    
    const [schemas, setSchemas] = useState<any>({});
    const [shops, setShops] = useState<Shop[]>([]);
    const [skus, setSkus] = useState<ProductSKU[]>([]);
    const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
    const [skuLists, setSkuLists] = useState<SkuList[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
    const [quotingData, setQuotingData] = useState<QuotingData>(INITIAL_QUOTING_DATA);
    const [snapshotSettings, setSnapshotSettings] = useState<SnapshotSettings>({ autoSnapshotEnabled: true, retentionDays: 7 });
    
    // 事实表元数据统计 (代替全量数据)
    const [factStats, setFactStats] = useState({
        shangzhi: { count: 0, latestDate: 'N/A' },
        jingzhuntong: { count: 0, latestDate: 'N/A' },
        customer_service: { count: 0, latestDate: 'N/A' }
    });
    
    // 热数据缓存 (智能动态窗口)
    const [factTables, setFactTables] = useState<any>({ shangzhi: [], jingzhuntong: [], customer_service: [] });

    // Competitor Monitoring Data
    const [compShops, setCompShops] = useState<MonitoredCompetitorShop[]>([]);
    const [compGroups, setCompGroups] = useState<CompetitorGroup[]>([]);

    const addToast = (type: 'success' | 'error', title: string, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    const loadMetadata = useCallback(async () => {
        try {
            setLoadingMessage('正在探测数据边界...');
            
            // 1. 优先获取数据统计，以确定最新的数据日期 (Data Anchor)
            // 这确保了即使数据是 2026 年的或者 2024 年的，我们也能抓取到正确的热数据窗口
            const [statSz, statJzt, statCs] = await Promise.all([
                DB.getTableSummary('fact_shangzhi'),
                DB.getTableSummary('fact_jingzhuntong'),
                DB.getTableSummary('fact_customer_service')
            ]);

            // 智能计算热数据时间窗口
            let anchorDate = new Date();
            // 如果商智有数据，以商智最新日期为准（核心业务表）
            if (statSz.latestDate && statSz.latestDate !== 'N/A') {
                const szDate = new Date(statSz.latestDate);
                if (!isNaN(szDate.getTime())) {
                    anchorDate = szDate;
                }
            }
            
            const endDateStr = anchorDate.toISOString().split('T')[0];
            // 向前追溯 60 天
            const startDate = new Date(anchorDate.getTime() - 60 * 24 * 60 * 60 * 1000);
            const startDateStr = startDate.toISOString().split('T')[0];

            setLoadingMessage(`同步热数据 (${startDateStr} ~ ${endDateStr})...`);

            // 2. 并行加载所有配置 + 基于智能窗口的热数据
            const [
                s_shops, s_skus, s_agents, s_skuLists, history, settings, q_data, s_sz, s_jzt, s_cs_schema, s_compShops, s_compGroups,
                recentSz, recentJzt, recentCs
            ] = await Promise.all([
                DB.loadConfig('dim_shops', []),
                DB.loadConfig('dim_skus', []),
                DB.loadConfig('dim_agents', []),
                DB.loadConfig('dim_sku_lists', []),
                DB.loadConfig('upload_history', []),
                DB.loadConfig('snapshot_settings', { autoSnapshotEnabled: true, retentionDays: 7 }),
                DB.loadConfig('quoting_data', INITIAL_QUOTING_DATA),
                DB.loadConfig('schema_shangzhi', INITIAL_SHANGZHI_SCHEMA),
                DB.loadConfig('schema_jingzhuntong', INITIAL_JINGZHUNTONG_SCHEMA),
                DB.loadConfig('schema_customer_service', INITIAL_CUSTOMER_SERVICE_SCHEMA),
                DB.loadConfig('comp_shops', []),
                DB.loadConfig('comp_groups', []),
                // 使用动态计算的日期范围
                DB.getRange('fact_shangzhi', startDateStr, endDateStr),
                DB.getRange('fact_jingzhuntong', startDateStr, endDateStr),
                DB.getRange('fact_customer_service', startDateStr, endDateStr)
            ]);

            setShops(s_shops); setSkus(s_skus); setAgents(s_agents); setSkuLists(s_skuLists);
            setUploadHistory(history); setSnapshotSettings(settings); setQuotingData(q_data);
            setSchemas({ shangzhi: s_sz, jingzhuntong: s_jzt, customer_service: s_cs_schema });
            setCompShops(s_compShops); setCompGroups(s_compGroups);
            
            // 更新统计状态 (显示云端真实总数)
            setFactStats({
                shangzhi: statSz,
                jingzhuntong: statJzt,
                customer_service: statCs
            });

            // 注入热数据缓存
            setFactTables({
                shangzhi: recentSz,
                jingzhuntong: recentJzt,
                customer_service: recentCs
            });

        } catch (e) {
            console.error("Initialization failed:", e);
            addToast('error', '初始化受阻', '无法连接数据层，请检查网络。');
        }
    }, []);

    useEffect(() => { 
        const init = async () => {
            setIsAppLoading(true);
            await loadMetadata();
            setIsAppLoading(false);
        };
        init();
    }, [loadMetadata]);

    const onDeleteRows = async (tableType: TableType, ids: any[]) => {
        try {
            await DB.deleteRows(`fact_${tableType}`, ids);
            await loadMetadata(); // 刷新统计
        } catch (e) {
            addToast('error', '物理删除失败', '操作数据库时发生错误。');
            throw e;
        }
    };

    const handleBulkSave = async (key: string, data: any[], type: string) => {
        try {
            await DB.saveConfig(key, data);
            await loadMetadata();
            addToast('success', '同步成功', `已批量更新 ${data.length} 条${type}数据并同步至云端。`);
        } catch (e) {
            addToast('error', '物理写入失败', `无法保存${type}数据到本地库。`);
        }
    };

    const handleUpdateSKU = async (s: ProductSKU) => {
        const n = skus.map(x => x.id === s.id ? s : x);
        await DB.saveConfig('dim_skus', n);
        await loadMetadata();
        return true;
    };

    // 新增：直接处理已解析数据的接口 (支持切片上传)
    const handleRawDataImport = async (data: any[], type: TableType, shopId?: string, fileName: string = 'batch_upload', onProgress?: (current: number, total: number) => void) => {
        DB.resetClient();
        
        // 1. 构建映射表 (DB Schema Map)
        const headerMap: Record<string, string> = {};
        const currentSchema = schemas[type];
        const typeMap: Record<string, string> = {};
        const requiredKeys: string[] = []; // 收集必填字段
        
        if (currentSchema && Array.isArray(currentSchema)) {
            currentSchema.forEach((field: any) => {
                headerMap[field.label] = field.key;
                headerMap[field.label.trim()] = field.key;
                typeMap[field.key] = field.type;
                if (field.tags) field.tags.forEach((tag: string) => headerMap[tag] = field.key);
                headerMap[field.key] = field.key;
                
                // 记录必填字段 (如 date, sku_code)
                if (field.required) requiredKeys.push(field.key);
            });
        }

        // 2. 数据增强与映射
        let skippedRows = 0;
        const enrichedData = data.map(row => {
            const mappedRow: any = {};
            
            // 标准化日期
            let normalizedDate = null;
            if (row['日期']) {
                    if (typeof row['日期'] === 'number') {
                        const date = new Date((row['日期'] - 25569) * 86400 * 1000);
                        normalizedDate = date.toISOString().split('T')[0];
                    } else {
                        normalizedDate = row['日期'];
                    }
            } else if (row['date']) {
                normalizedDate = row['date'];
            }
            if (normalizedDate && String(normalizedDate).trim() === '') normalizedDate = null;
            if (normalizedDate) mappedRow['date'] = normalizedDate;

            // 注入 shopId
            if (shopId) {
                const shop = shops.find(s => s.id === shopId);
                if (shop) mappedRow['shop_name'] = shop.name;
            } else if (row['店铺名称'] || row['shop_name']) {
                mappedRow['shop_name'] = row['店铺名称'] || row['shop_name'];
            }

            // 核心映射与清洗逻辑
            Object.keys(row).forEach(excelKey => {
                const cleanKey = excelKey.trim();
                const dbKey = headerMap[cleanKey] || headerMap[cleanKey.toUpperCase()];
                
                if (dbKey) {
                    if ((dbKey === 'date' || dbKey === 'shop_name') && mappedRow[dbKey]) return;
                    
                    let value = row[excelKey];
                    const fieldType = typeMap[dbKey];

                    // 全局清洗：空字符串转换为 null
                    if (value === undefined || value === null || String(value).trim() === '') {
                        value = null;
                    }

                    if (fieldType === 'INTEGER' || fieldType === 'REAL' || fieldType === 'NUMERIC') {
                        if (value === null || value === '-') {
                            value = 0;
                        } else if (typeof value === 'string') {
                            const cleanVal = value.replace(/[¥,]/g, '').trim();
                            if (cleanVal === '-' || cleanVal === '') value = 0;
                            else value = Number(cleanVal);
                            
                            if (isNaN(value)) value = 0;
                        }
                    } else if (fieldType === 'TIMESTAMP') {
                        if (value !== null) {
                            if (typeof value === 'number') {
                                // Excel Serial Date
                                const date = new Date((value - 25569) * 86400 * 1000);
                                value = date.toISOString();
                            } else {
                                // String Parse
                                const d = new Date(value);
                                if (isNaN(d.getTime())) value = null;
                                else value = d.toISOString();
                            }
                        }
                    }
                    
                    mappedRow[dbKey] = value;
                }
            });

            // --- 智能字段互通策略 (Start) ---
            // 业务背景：商智(自营)用'SKU', 商智(POP)用'商品ID', 广告用'跟单SKU ID'
            // 我们需要将这些不同来源的ID归一化到数据库对应的必填字段中
            
            // 获取原始值，防止 Schema 未定义导致 mappedRow 拿不到
            const rawSku = row['SKU'] || row['sku'] || row['SKU编码'] || mappedRow['sku_code'];
            const rawPid = row['商品ID'] || row['商品id'] || row['product_id'] || mappedRow['product_id'];
            const rawTrackedId = row['跟单SKU ID'] || row['跟单SKU'] || row['tracked_sku_id'] || mappedRow['tracked_sku_id'];

            // 1. 商智 (fact_shangzhi) -> 目标: sku_code
            if (type === 'shangzhi') {
                 if (!mappedRow['sku_code']) {
                     if (rawSku) mappedRow['sku_code'] = rawSku;
                     else if (rawPid) mappedRow['sku_code'] = rawPid;
                 }
            }
            
            // 2. 广告 (fact_jingzhuntong) -> 目标: tracked_sku_id
            if (type === 'jingzhuntong') {
                if (!mappedRow['tracked_sku_id']) {
                    if (rawTrackedId) mappedRow['tracked_sku_id'] = rawTrackedId;
                    else if (rawSku) mappedRow['tracked_sku_id'] = rawSku;
                    else if (rawPid) mappedRow['tracked_sku_id'] = rawPid;
                }
            }
            // --- 智能字段互通策略 (End) ---

            // 3. 必填字段校验：如果在清洗后，必填字段仍为空，则标记为无效
            const isInvalid = requiredKeys.some(key => {
                const val = mappedRow[key];
                return val === null || val === undefined || val === '';
            });

            if (isInvalid) {
                skippedRows++;
                return null;
            }

            return mappedRow;
        }).filter((item): item is any => item !== null);

        if (enrichedData.length === 0) {
             throw new Error(`未检测到有效数据。可能是因为所有行都缺少必填字段（如：日期、SKU编码/商品ID/跟单SKU ID 等）。请检查 Excel 表头是否匹配。`);
        }
        
        if (skippedRows > 0) {
            console.warn(`[Data Import] Automatically skipped ${skippedRows} rows due to missing required fields (${requiredKeys.join(', ')}).`);
        }

        // 写入数据库
        const tableName = `fact_${type}`;
        await DB.bulkAdd(tableName, enrichedData, onProgress);

        // 记录历史
        const newHistoryItem: UploadHistory = {
            id: Date.now().toString(),
            fileName: fileName,
            fileSize: 'Batch Processed',
            rowCount: data.length,
            uploadTime: new Date().toLocaleString(),
            status: '成功',
            targetTable: type
        };
        const updatedHistory = [newHistoryItem, ...uploadHistory];
        setUploadHistory(updatedHistory);
        await DB.saveConfig('upload_history', updatedHistory);

        // 刷新视图
        await loadMetadata();
    };

    const handleBatchUpdate = async (skusToUpdate: string[], shopId: string) => {
        try {
            const shop = shops.find(s => s.id === shopId);
            if (!shop) throw new Error("目标店铺不存在");
            addToast('error', '操作受限', '云原生模式下暂不支持批量修改海量数据，请使用 Supabase SQL Editor 执行 UPDATE语句。');
        } catch (e: any) {
            addToast('error', '批量更新失败', e.message);
        }
    };

    const renderView = () => {
        if (isAppLoading) return (
            <div className="flex flex-col h-full items-center justify-center text-slate-400 font-black bg-white">
                <SyncIcon size={48} className="mb-4 text-brand animate-spin" />
                <p className="tracking-[0.4em] uppercase text-xs font-black">{loadingMessage}</p>
                <p className="text-[10px] mt-2 opacity-50">Syncing Smart Cache (Auto-Anchored)</p>
            </div>
        );
        
        const commonProps = { skus, shops, agents, schemas, addToast };
        switch (currentView) {
            case 'dashboard': return <DashboardView {...commonProps} factStats={factStats} cachedData={factTables} />;
            case 'multiquery': return <MultiQueryView {...commonProps} shangzhiData={factTables.shangzhi} jingzhuntongData={factTables.jingzhuntong} />;
            case 'reports': return <ReportsView {...commonProps} factTables={factTables} skuLists={skuLists} onAddNewSkuList={async (l:any) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onUpdateSkuList={async (l:any) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onDeleteSkuList={(id:any) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }} />;
            // 传递 handleRawDataImport 给 DataCenterView
            case 'data-center': return <DataCenterView onImportData={handleRawDataImport} onBatchUpdate={handleBatchUpdate} history={uploadHistory} factStats={factStats} shops={shops} schemas={schemas} addToast={addToast} />;
            case 'cloud-sync': return <CloudSyncView addToast={addToast} />;
            case 'data-experience': return <DataExperienceView schemas={schemas} shops={shops} onClearTable={async (k:any)=>await DB.clearTable(`fact_${k}`)} onDeleteRows={onDeleteRows} onRefreshData={loadMetadata} onUpdateSchema={async (t:any, s:any) => { const ns = {...schemas, [t]: s}; setSchemas(ns); await DB.saveConfig(`schema_${t}`, s); }} addToast={addToast} />;
            case 'products': return (
                <SKUManagementView 
                    {...commonProps} 
                    skuLists={skuLists} 
                    onAddNewSKU={async (s)=> { const n = [...skus, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_skus', n, 'SKU'); return true; }} 
                    onUpdateSKU={handleUpdateSKU} 
                    onDeleteSKU={async (id)=> { const n = skus.filter(x=>x.id!==id); await handleBulkSave('dim_skus', n, 'SKU'); }} 
                    onBulkAddSKUs={async (newList)=> { 
                        const updatedSkus = [...skus];
                        newList.forEach(newItem => {
                            const index = updatedSkus.findIndex(s => s.code === newItem.code);
                            if (index !== -1) {
                                updatedSkus[index] = { ...updatedSkus[index], ...newItem };
                            } else {
                                updatedSkus.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_skus', updatedSkus, 'SKU');
                    }} 
                    onAddNewShop={async (s)=> { const n = [...shops, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_shops', n, '店铺'); return true; }} 
                    onUpdateShop={async (s)=> { const n = shops.map(x=>x.id===s.id?s:x); await handleBulkSave('dim_shops', n, '店铺'); return true; }} 
                    onDeleteShop={async (id)=> { const n = shops.filter(x=>x.id!==id); await handleBulkSave('dim_shops', n, '店铺'); }} 
                    onBulkAddShops={async (newList)=> {
                        const updatedShops = [...shops];
                        newList.forEach(newItem => {
                            const index = updatedShops.findIndex(s => s.name === newItem.name);
                            if (index !== -1) {
                                updatedShops[index] = { ...updatedShops[index], ...newItem };
                            } else {
                                updatedShops.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_shops', updatedShops, '店铺');
                    }}
                    onAddNewAgent={async (s)=> { const n = [...agents, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_agents', n, '客服'); return true; }} 
                    onUpdateAgent={async (s)=> { const n = agents.map(x=>x.id===s.id?s:x); await handleBulkSave('dim_agents', n, '客服'); return true; }} 
                    onDeleteAgent={async (id)=> { const n = agents.filter(x=>x.id!==id); await handleBulkSave('dim_agents', n, '客服'); }}
                    onBulkAddAgents={async (newList)=> {
                        const updatedAgents = [...agents];
                        newList.forEach(newItem => {
                            const index = updatedAgents.findIndex(a => a.account === newItem.account);
                            if (index !== -1) {
                                updatedAgents[index] = { ...updatedAgents[index], ...newItem };
                            } else {
                                updatedAgents.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_agents', updatedAgents, '客服');
                    }}
                    onAddNewSkuList={async (l:any) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} 
                    onUpdateSkuList={async (l:any) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} 
                    onDeleteSkuList={(id:any) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }}
                />
            );
            case 'ai-profit-analytics': return <AIProfitAnalyticsView {...commonProps} />;
            case 'ai-smart-replenishment': return <AISmartReplenishmentView shangzhiData={factTables.shangzhi} onUpdateSKU={handleUpdateSKU} {...commonProps} />;
            case 'ai-quoting': return <AIQuotingView quotingData={quotingData} onUpdate={async (d:any) => { setQuotingData(d); await DB.saveConfig('quoting_data', d); }} addToast={addToast} />;
            case 'ai-description': return <AIDescriptionView skus={skus} />;
            case 'ai-sales-forecast': return <AISalesForecastView skus={skus} />;
            case 'ai-cs-assistant': return <AIAssistantView skus={skus} shops={shops} addToast={addToast} />;
            case 'ai-ad-image': return <AIAdImageView skus={skus} />;
            case 'system-snapshot': return <SystemSnapshotView snapshots={[]} settings={snapshotSettings} onUpdateSettings={async (s:any) => { setSnapshotSettings(s); await DB.saveConfig('snapshot_settings', s); }} onCreate={()=>{}} onRestore={()=>{}} onDelete={()=>{}} onImport={()=>{}} addToast={addToast} />;
            case 'ai-competitor-monitoring': return (
                <AICompetitorMonitoringView 
                    compShops={compShops} 
                    compGroups={compGroups} 
                    shangzhiData={factTables.shangzhi}
                    onUpdateCompShops={async (data) => { setCompShops(data); await DB.saveConfig('comp_shops', data); await loadMetadata(); }}
                    onUpdateCompGroups={async (data) => { setCompGroups(data); await DB.saveConfig('comp_groups', data); await loadMetadata(); }}
                    addToast={addToast} 
                />
            );
            default: return <DashboardView {...commonProps} factStats={factStats} cachedData={factTables} />;
        }
    };

    return (
        <div className="flex flex-row h-screen w-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative border-l border-slate-200">
                <main className="flex-1 overflow-y-auto no-scrollbar relative">
                    {renderView()}
                </main>
                <ToastContainer toasts={toasts} />
            </div>
        </div>
    );
};
