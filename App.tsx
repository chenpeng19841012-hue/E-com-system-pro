
import React, { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { DashboardView } from './views/DashboardView';
import { MultiQueryView } from './views/MultiQueryView';
import { AIDescriptionView } from './views/AIDescriptionView';
import { AISalesForecastView } from './views/AISalesForecastView';
import { AIAssistantView } from './views/AIAssistantView';
import { AIAdImageView } from './views/AIAdImageView';
import { AIQuotingView } from './views/AIQuotingView';
import { SKUManagementView } from './views/SKUManagementView';
import { DataExperienceView } from './views/DataExperienceView';
import { DataCenterView } from './views/DataCenterView';
import { AIProfitAnalyticsView } from './views/AIProfitAnalyticsView';
import { AISmartReplenishmentView } from './views/AISmartReplenishmentView';
import { AICompetitorMonitoringView } from './views/AICompetitorMonitoringView';
import { ReportsView } from './views/ReportsView';
import { AIMarketingCopilotView } from './views/AIMarketingCopilotView';
import { DynamicPricingEngineView } from './views/DynamicPricingEngineView';
import { CustomerLifecycleHubView } from './views/CustomerLifecycleHubView';
import { SystemSnapshotView } from './views/SystemSnapshotView'; // New View

import { View, TableType, ToastProps, FieldDefinition, Shop, ProductSKU, CustomerServiceAgent, UploadHistory, QuotingData, SkuList, Snapshot, SnapshotSettings } from './lib/types';
import { DB } from './lib/db';
// FIX: Corrected typo in constant name from INITIAL_SHANGZHHI_SCHEMA to INITIAL_SHANGZHI_SCHEMA.
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from './lib/schemas';
import { getTableName, normalizeDate } from './lib/helpers';
import { parseExcelFile } from './lib/excel';

const INITIAL_QUOTING_DATA: QuotingData = {
    "prices": {
        "主机": { "TSK-C3 I5-13400": 2700.0, "TSK-C3 I5-14500": 3300.0, "TSK-C3 I7-13700": 4000.0, "TSK-C3 I5-14400": 3000.0, "TSK-C3 I9-14900": 5900.0, "TSK-C4 Ultra7-265": 4200.0, "TSK-C4 Ultra5-235": 3600.0 },
        "内存": { "8G DDR5": 450.0, "16G DDR5": 1000.0 },
        "硬盘": { "512G SSD": 400.0, "1T SSD": 850.0, "2T HDD": 700.0 },
        "电源": { "300W": 0.0, "500W": 200.0, "750W": 550.0 },
        "显卡": { "RTX5060 8G": 2450.0, "RX6600LE 8G": 1800.0, "RTX2000ADA 16G": 4850.0, "RTXA4500 16G": 7800.0, "T400 4G": 850.0, "RTX5060Ti 16G": 4000.0, "RTX3050 8G": 1800.0 },
        "选件": { "WIFI模块": 50.0, "27英寸显示器": 550.0 }
    },
    "settings": { "margin": 1.15 },
    "discounts": [{ "min_qty": 10, "rate": 0.98 }]
};

const DATA_KEYS_TO_SNAPSHOT = [
    'fact_shangzhi', 'fact_jingzhuntong', 'fact_customer_service',
    'dim_shops', 'dim_skus', 'dim_agents', 'dim_sku_lists',
    'schema_shangzhi', 'schema_jingzhuntong', 'schema_customer_service',
    'quoting_data', 'upload_history'
];

export const App = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [toasts, setToasts] = useState<ToastProps[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    
    // Data States
    const [factTables, setFactTables] = useState<{
      shangzhi: any[];
      jingzhuntong: any[];
      customer_service: any[];
    }>({
      shangzhi: [],
      jingzhuntong: [],
      customer_service: []
    });
  
    const [schemas, setSchemas] = useState<{
      shangzhi: FieldDefinition[];
      jingzhuntong: FieldDefinition[];
      customer_service: FieldDefinition[];
    }>({
      shangzhi: DB.load('schema_shangzhi', INITIAL_SHANGZHI_SCHEMA),
      jingzhuntong: DB.load('schema_jingzhuntong', INITIAL_JINGZHUNTONG_SCHEMA),
      customer_service: DB.load('schema_customer_service', INITIAL_CUSTOMER_SERVICE_SCHEMA)
    });
  
    const [shops, setShops] = useState<Shop[]>([]);
    const [skus, setSkus] = useState<ProductSKU[]>([]);
    const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
    const [skuLists, setSkuLists] = useState<SkuList[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
    const [quotingData, setQuotingData] = useState<QuotingData>(() => DB.load('quoting_data', INITIAL_QUOTING_DATA));
    
    // Snapshot States
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [snapshotSettings, setSnapshotSettings] = useState<SnapshotSettings>(() => DB.load('snapshot_settings', { autoSnapshotEnabled: true, retentionDays: 7 }));
  
    // Load initial data
    useEffect(() => {
      const loadedTables = {
        shangzhi: DB.load('fact_shangzhi', []),
        jingzhuntong: DB.load('fact_jingzhuntong', []),
        customer_service: DB.load('fact_customer_service', [])
      };
      setFactTables(loadedTables);
      
      setShops(DB.load('dim_shops', []));
      setSkus(DB.load('dim_skus', []));
      setAgents(DB.load('dim_agents', []));
      setSkuLists(DB.load('dim_sku_lists', []));
      setUploadHistory(DB.load('upload_history', []));
      setSnapshots(DB.load('system_snapshots', []));
    }, []);

    // Snapshot Maintenance Effect
    useEffect(() => {
        const createSnapshot = (type: 'auto' | 'manual'): Snapshot => {
            const snapshotData: Record<string, any> = {};
            for (const key of DATA_KEYS_TO_SNAPSHOT) {
                const dataStr = localStorage.getItem(key);
                if (dataStr) {
                    try {
                        snapshotData[key] = JSON.parse(dataStr);
                    } catch (e) { console.error(`Failed to parse ${key} for snapshot`, e); }
                }
            }
            return {
                id: new Date().toISOString(),
                type,
                size: JSON.stringify(snapshotData).length,
                data: snapshotData,
            };
        };

        const runMaintenance = () => {
            let currentSnapshots = DB.load<Snapshot[]>('system_snapshots', []);
            const settings = DB.load<SnapshotSettings>('snapshot_settings', { autoSnapshotEnabled: true, retentionDays: 7 });

            // 1. Pruning
            const now = new Date();
            const retentionMillis = settings.retentionDays * 24 * 60 * 60 * 1000;
            const snapshotsToKeep = currentSnapshots.filter(s => {
                const snapshotDate = new Date(s.id);
                return (now.getTime() - snapshotDate.getTime()) < retentionMillis;
            });
            let updated = snapshotsToKeep.length < currentSnapshots.length;

            // 2. Auto Snapshot
            if (settings.autoSnapshotEnabled) {
                const lastAuto = snapshotsToKeep.filter(s => s.type === 'auto').sort((a,b) => b.id.localeCompare(a.id))[0];
                const todayStr = new Date().toDateString();
                if (!lastAuto || new Date(lastAuto.id).toDateString() !== todayStr) {
                    const newAutoSnapshot = createSnapshot('auto');
                    snapshotsToKeep.push(newAutoSnapshot);
                    updated = true;
                }
            }
            
            if(updated) {
                const sorted = snapshotsToKeep.sort((a, b) => b.id.localeCompare(a.id));
                DB.saveData('system_snapshots', sorted);
                setSnapshots(sorted);
            }
        };

        const timer = setTimeout(runMaintenance, 2000); // Run after initial load
        return () => clearTimeout(timer);
    }, []);
  
    const addToast = (type: 'success' | 'error', title: string, message: string) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    // --- Snapshot Handlers ---
    const handleCreateSnapshot = () => {
        const snapshotData: Record<string, any> = {};
        DATA_KEYS_TO_SNAPSHOT.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) snapshotData[key] = JSON.parse(item);
        });

        const newSnapshot: Snapshot = {
            id: new Date().toISOString(),
            type: 'manual',
            size: JSON.stringify(snapshotData).length,
            data: snapshotData,
        };
        
        const updatedSnapshots = [newSnapshot, ...snapshots].sort((a, b) => b.id.localeCompare(a.id));
        setSnapshots(updatedSnapshots);
        DB.saveData('system_snapshots', updatedSnapshots);
        addToast('success', '快照创建成功', `已成功创建手动快照。`);
    };

    const handleRestoreSnapshot = (snapshotId: string) => {
        const snapshot = snapshots.find(s => s.id === snapshotId);
        if (!snapshot) {
            addToast('error', '恢复失败', '未找到指定的快照文件。');
            return;
        }

        DATA_KEYS_TO_SNAPSHOT.forEach(key => localStorage.removeItem(key));
        Object.entries(snapshot.data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });

        addToast('success', '恢复成功', '系统将自动刷新以应用更改...');
        setTimeout(() => window.location.reload(), 2000);
    };

    const handleDeleteSnapshot = (snapshotId: string) => {
        const updatedSnapshots = snapshots.filter(s => s.id !== snapshotId);
        setSnapshots(updatedSnapshots);
        DB.saveData('system_snapshots', updatedSnapshots);
        addToast('success', '删除成功', '指定的快照已被删除。');
    };

    const handleUpdateSnapshotSettings = (settings: SnapshotSettings) => {
        setSnapshotSettings(settings);
        DB.saveData('snapshot_settings', settings);
        addToast('success', '设置已保存', '快照设置已更新。');
    };


    const handleUpdateQuotingData = (newData: QuotingData) => {
        setQuotingData(newData);
        DB.saveData('quoting_data', newData);
    };
  
    const handleProcessAndUpload = (file: File, targetTable: TableType) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const { data: validData } = parseExcelFile(bstr);

                    if (validData.length === 0) {
                        addToast('error', '导入失败', '文件中没有有效数据行。');
                        reject(new Error('No valid data'));
                        return;
                    }

                    const targetSchema = schemas[targetTable];
                    const labelToKeyMap = new Map<string, string>();
                    targetSchema.forEach(field => {
                        labelToKeyMap.set(field.label, field.key);
                        if (field.tags) {
                            field.tags.forEach(tag => labelToKeyMap.set(tag, field.key));
                        }
                    });

                    const transformedData = validData.map((rawRow: any) => {
                        const newRow: { [key: string]: any } = {};
                        for (const headerLabel in rawRow) {
                            const trimmedHeader = headerLabel.trim();
                            if (labelToKeyMap.has(trimmedHeader)) {
                                const key = labelToKeyMap.get(trimmedHeader)!;
                                newRow[key] = rawRow[headerLabel];
                            }
                        }
                        return newRow;
                    });
                    
                    const originalRowCount = transformedData.length;
                    let filteredDataForProcessing = transformedData;

                    if (targetTable === 'shangzhi' || targetTable === 'jingzhuntong' || targetTable === 'customer_service') {
                         filteredDataForProcessing = filteredDataForProcessing.filter(row => {
                            const dateValue = row.date;
                            return dateValue !== null && dateValue !== undefined && String(dateValue).trim() !== '-' && normalizeDate(dateValue) !== null;
                        });
                    }

                    if (targetTable === 'customer_service') {
                        const summaryValues = ['总值', '均值'];
                        filteredDataForProcessing = filteredDataForProcessing.filter(row => !summaryValues.includes(row.agent_account));
                    }
                    
                    const filteredByRulesCount = originalRowCount - filteredDataForProcessing.length;

                    const existingData = factTables[targetTable];
                    const dataMap = new Map<string, any>();

                    const createKey = (parts: (string | number | null | undefined)[]) => {
                        const validParts = parts.filter(p => p !== null && p !== undefined && String(p).trim() !== '');
                        return validParts.length > 0 ? validParts.join('-') : null;
                    };

                    let getExistingKey: (row: any) => string | null;

                    switch (targetTable) {
                        case 'shangzhi':
                            getExistingKey = row => createKey([row.sku_code, row.date]);
                            break;
                        case 'jingzhuntong':
                            getExistingKey = row => createKey([row.date, row.account_nickname || 'UNKNOWN_ACCOUNT', row.tracked_sku_id || row.tracked_sku_name || 'NO_SKU']);
                            break;
                        case 'customer_service':
                            getExistingKey = row => createKey([row.agent_account, row.date]);
                            break;
                        default:
                            getExistingKey = () => null;
                    }

                    existingData.forEach(row => {
                        const key = getExistingKey(row);
                        if (key) dataMap.set(key, row);
                    });
                    
                    let updatedCount = 0;
                    let addedCount = 0;

                    filteredDataForProcessing.forEach((newRow, index) => {
                        const normalizedDate = normalizeDate(newRow.date);
                        const rowWithNormalizedDate: any = { ...newRow, date: normalizedDate };

                        let primaryKey: string | null;
                        switch (targetTable) {
                            case 'shangzhi':
                                primaryKey = createKey([rowWithNormalizedDate.sku_code, rowWithNormalizedDate.date]);
                                break;
                            case 'jingzhuntong':
                                primaryKey = createKey([rowWithNormalizedDate.date, rowWithNormalizedDate.account_nickname || 'UNKNOWN_ACCOUNT', rowWithNormalizedDate.tracked_sku_id || rowWithNormalizedDate.tracked_sku_name || 'NO_SKU']);
                                break;
                            case 'customer_service':
                                primaryKey = createKey([rowWithNormalizedDate.agent_account, rowWithNormalizedDate.date]);
                                break;
                            default:
                                primaryKey = null;
                        }

                        const finalKey = primaryKey ?? `__fallback__${file.name}-${Date.now()}-${index}`;

                        if (primaryKey && dataMap.has(primaryKey)) {
                            updatedCount++;
                            dataMap.set(primaryKey, { ...dataMap.get(primaryKey), ...rowWithNormalizedDate });
                        } else {
                            addedCount++;
                            dataMap.set(finalKey, rowWithNormalizedDate);
                        }
                    });

                    const totalAddedOrUpdated = addedCount + updatedCount;
                    const mergedData = Array.from(dataMap.values());

                    const newHistoryItem: UploadHistory = {
                        id: String(Date.now()),
                        fileName: file.name,
                        fileSize: (file.size / 1024).toFixed(2) + ' KB',
                        rowCount: totalAddedOrUpdated,
                        uploadTime: new Date().toLocaleString(),
                        status: '成功',
                        targetTable: targetTable
                    };

                    const updatedHistory = [newHistoryItem, ...uploadHistory].slice(0, 10);
                    setUploadHistory(updatedHistory);
                    DB.saveData('upload_history', updatedHistory);

                    setFactTables(prev => ({ ...prev, [targetTable]: mergedData }));
                    DB.saveData(`fact_${targetTable}`, mergedData);

                    let successMessage = `新增 ${addedCount} 行, 更新 ${updatedCount} 行到 ${getTableName(targetTable)} 表。`;
                     if (filteredByRulesCount > 0) {
                        successMessage += ` (因规则过滤了 ${filteredByRulesCount} 行)`;
                    }
                    addToast('success', '同步成功', successMessage);
                    resolve();

                } catch (err) {
                    console.error(err);
                    addToast('error', '导入失败', '文件解析或数据处理时发生错误。');
                    reject(err as Error);
                }
            };
            reader.onerror = (err) => {
                addToast('error', '文件读取失败', '无法读取所选文件。');
                reject(err);
            }
            reader.readAsBinaryString(file);
        });
    };
    
    const handleClearTable = (key: TableType) => {
        setFactTables(prev => ({...prev, [key]: []}));
        DB.clearTable(`fact_${key}`);
        addToast('success', '清空成功', `已清空 ${getTableName(key)} 表数据`);
    };

    const handleUpdateSchema = (tableType: TableType, newSchema: FieldDefinition[]) => {
        setSchemas(prev => {
            const updatedSchemas = { ...prev, [tableType]: newSchema };
            DB.saveData(`schema_${tableType}`, newSchema);
            return updatedSchemas;
        });
    };

    const handleAddNewSKU = (skuData: Omit<ProductSKU, 'id'>) => {
        if (skus.some(s => s.code === skuData.code)) {
            addToast('error', '添加失败', `SKU编码 [${skuData.code}] 已存在。`);
            return false;
        }
        const newSKU: ProductSKU = { ...skuData, id: String(Date.now()) };
        const updatedSKUs = [newSKU, ...skus];
        setSkus(updatedSKUs);
        DB.saveData('dim_skus', updatedSKUs);
        addToast('success', '添加成功', `SKU [${newSKU.name}] 已添加。`);
        return true;
    };

    const handleUpdateSKU = (updatedSku: ProductSKU) => {
        if (skus.some(s => s.code === updatedSku.code && s.id !== updatedSku.id)) {
            addToast('error', '更新失败', `SKU编码 [${updatedSku.code}] 已被其他资产使用。`);
            return false;
        }
        const updatedSKUs = skus.map(s => s.id === updatedSku.id ? updatedSku : s);
        setSkus(updatedSKUs);
        DB.saveData('dim_skus', updatedSKUs);
        addToast('success', '更新成功', `SKU [${updatedSku.name}] 已更新。`);
        return true;
    };

    const handleDeleteSKU = (skuId: string) => {
        const updatedSKUs = skus.filter(s => s.id !== skuId);
        setSkus(updatedSKUs);
        DB.saveData('dim_skus', updatedSKUs);
        addToast('success', '删除成功', `已删除一个SKU资产。`);
    };

    const handleBulkAddSKUs = (newSKUs: Omit<ProductSKU, 'id'>[]) => {
        const existingCodes = new Set(skus.map(s => s.code));
        let addedCount = 0;
        let skippedCount = 0;

        const skusToAdd: ProductSKU[] = [];

        newSKUs.forEach((newSkuData, index) => {
            if (newSkuData.code && !existingCodes.has(newSkuData.code)) {
                skusToAdd.push({ ...newSkuData, id: String(Date.now() + index) });
                existingCodes.add(newSkuData.code);
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        if (addedCount > 0) {
            const updatedSKUs = [...skusToAdd, ...skus];
            setSkus(updatedSKUs);
            DB.saveData('dim_skus', updatedSKUs);
        }
        
        let message = `成功导入 ${addedCount} 条新SKU。`;
        if (skippedCount > 0) {
            message += ` (跳过 ${skippedCount} 条重复或无效记录)`;
        }
        addToast('success', '批量导入完成', message);
    };

    const handleAddNewShop = (shopData: Omit<Shop, 'id'>) => {
        if (shops.some(s => s.name === shopData.name)) {
            addToast('error', '添加失败', `店铺名称 [${shopData.name}] 已存在。`);
            return false;
        }
        const newShop: Shop = { ...shopData, id: String(Date.now()) };
        const updatedShops = [newShop, ...shops];
        setShops(updatedShops);
        DB.saveData('dim_shops', updatedShops);
        addToast('success', '添加成功', `店铺 [${newShop.name}] 已添加。`);
        return true;
    };

    const handleUpdateShop = (updatedShop: Shop) => {
        if (shops.some(s => s.name === updatedShop.name && s.id !== updatedShop.id)) {
            addToast('error', '更新失败', `店铺名称 [${updatedShop.name}] 已存在。`);
            return false;
        }
        const updatedShops = shops.map(s => s.id === updatedShop.id ? updatedShop : s);
        setShops(updatedShops);
        DB.saveData('dim_shops', updatedShops);
        addToast('success', '更新成功', `店铺 [${updatedShop.name}] 已更新。`);
        return true;
    };

    const handleDeleteShop = (shopId: string) => {
        const updatedShops = shops.filter(s => s.id !== shopId);
        setShops(updatedShops);
        DB.saveData('dim_shops', updatedShops);
        addToast('success', '删除成功', `已删除一个店铺。`);
    };

    const handleBulkAddShops = (newShops: Omit<Shop, 'id'>[]) => {
        const existingNames = new Set(shops.map(s => s.name));
        let addedCount = 0;
        let skippedCount = 0;

        const shopsToAdd: Shop[] = [];

        newShops.forEach((newShopData, index) => {
            if (newShopData.name && !existingNames.has(newShopData.name)) {
                shopsToAdd.push({ ...newShopData, id: String(Date.now() + index) });
                existingNames.add(newShopData.name);
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        if (addedCount > 0) {
            const updatedShops = [...shopsToAdd, ...shops];
            setShops(updatedShops);
            DB.saveData('dim_shops', updatedShops);
        }
        
        addToast('success', '批量导入完成', `成功导入 ${addedCount} 家新店铺。(跳过 ${skippedCount} 条)`);
    };

    const handleAddNewAgent = (agentData: Omit<CustomerServiceAgent, 'id'>) => {
        if (agents.some(a => a.account === agentData.account)) {
            addToast('error', '添加失败', `客服账号 [${agentData.account}] 已存在。`);
            return false;
        }
        const newAgent: CustomerServiceAgent = { ...agentData, id: String(Date.now()) };
        const updatedAgents = [newAgent, ...agents];
        setAgents(updatedAgents);
        DB.saveData('dim_agents', updatedAgents);
        addToast('success', '添加成功', `客服 [${newAgent.name}] 已添加。`);
        return true;
    };

    const handleUpdateAgent = (updatedAgent: CustomerServiceAgent) => {
        if (agents.some(a => a.account === updatedAgent.account && a.id !== updatedAgent.id)) {
            addToast('error', '更新失败', `客服账号 [${updatedAgent.account}] 已存在。`);
            return false;
        }
        const updatedAgents = agents.map(a => a.id === updatedAgent.id ? updatedAgent : a);
        setAgents(updatedAgents);
        DB.saveData('dim_agents', updatedAgents);
        addToast('success', '更新成功', `客服 [${updatedAgent.name}] 已更新。`);
        return true;
    };

    const handleDeleteAgent = (agentId: string) => {
        const updatedAgents = agents.filter(a => a.id !== agentId);
        setAgents(updatedAgents);
        DB.saveData('dim_agents', updatedAgents);
        addToast('success', '删除成功', `已删除一个客服。`);
    };

    const handleBulkAddAgents = (newAgents: Omit<CustomerServiceAgent, 'id'>[]) => {
        const existingAccounts = new Set(agents.map(a => a.account));
        let addedCount = 0;
        let skippedCount = 0;

        const agentsToAdd: CustomerServiceAgent[] = [];

        newAgents.forEach((newAgentData, index) => {
            if (newAgentData.account && !existingAccounts.has(newAgentData.account)) {
                agentsToAdd.push({ ...newAgentData, id: String(Date.now() + index) });
                existingAccounts.add(newAgentData.account);
                addedCount++;
            } else {
                skippedCount++;
            }
        });
        
        if (addedCount > 0) {
            const updatedAgents = [...agentsToAdd, ...agents];
            setAgents(updatedAgents);
            DB.saveData('dim_agents', updatedAgents);
        }

        addToast('success', '批量导入完成', `成功导入 ${addedCount} 位新客服。(跳过 ${skippedCount} 条)`);
    };
  
    const handleAddNewSkuList = (listData: Omit<SkuList, 'id'>) => {
        if (skuLists.some(l => l.name === listData.name)) {
            addToast('error', '创建失败', `清单名称 "${listData.name}" 已存在。`);
            return false;
        }
        const newList: SkuList = { ...listData, id: String(Date.now()) };
        const updatedLists = [newList, ...skuLists];
        setSkuLists(updatedLists);
        DB.saveData('dim_sku_lists', updatedLists);
        addToast('success', '创建成功', `SKU清单 "${newList.name}" 已创建。`);
        return true;
    };

    const handleUpdateSkuList = (updatedList: SkuList) => {
        if (skuLists.some(l => l.name === updatedList.name && l.id !== updatedList.id)) {
            addToast('error', '更新失败', `清单名称 "${updatedList.name}" 已被其他清单使用。`);
            return false;
        }
        const updatedLists = skuLists.map(l => l.id === updatedList.id ? updatedList : l);
        setSkuLists(updatedLists);
        DB.saveData('dim_sku_lists', updatedLists);
        addToast('success', '更新成功', `SKU清单 "${updatedList.name}" 已更新。`);
        return true;
    };

    const handleDeleteSkuList = (listId: string) => {
        const updatedLists = skuLists.filter(l => l.id !== listId);
        setSkuLists(updatedLists);
        DB.saveData('dim_sku_lists', updatedLists);
        addToast('success', '删除成功', '已删除一个SKU清单。');
    };

    const renderContent = () => {
      switch (currentView) {
        case 'dashboard': return <DashboardView factTables={factTables} skus={skus} shops={shops} />;
        case 'multiquery': return <MultiQueryView 
            shangzhiData={factTables.shangzhi} 
            jingzhuntongData={factTables.jingzhuntong} 
            skus={skus}
            shops={shops}
            schemas={schemas}
            />;
        case 'reports': return <ReportsView 
            factTables={factTables} 
            skus={skus} 
            shops={shops} 
            skuLists={skuLists}
            onAddNewSkuList={handleAddNewSkuList}
            onUpdateSkuList={handleUpdateSkuList}
            onDeleteSkuList={handleDeleteSkuList}
            addToast={addToast}
            />;
        case 'ai-profit-analytics': return <AIProfitAnalyticsView factTables={factTables} skus={skus} shops={shops} />;
        case 'ai-smart-replenishment': return <AISmartReplenishmentView 
            skus={skus}
            shangzhiData={factTables.shangzhi}
            shops={shops}
            onUpdateSKU={handleUpdateSKU}
            addToast={addToast}
            />;
        case 'ai-competitor-monitoring': return <AICompetitorMonitoringView />;
        case 'ai-marketing-copilot': return <AIMarketingCopilotView />;
        case 'dynamic-pricing-engine': return <DynamicPricingEngineView />;
        case 'customer-lifecycle-hub': return <CustomerLifecycleHubView />;
        case 'ai-description': return <AIDescriptionView skus={skus} />;
        case 'ai-sales-forecast': return <AISalesForecastView skus={skus} shangzhiData={factTables.shangzhi} />;
        case 'ai-cs-assistant': return <AIAssistantView skus={skus} shops={shops} />;
        case 'ai-ad-image': return <AIAdImageView skus={skus} />;
        case 'ai-quoting': return <AIQuotingView quotingData={quotingData} onUpdate={handleUpdateQuotingData} addToast={addToast} />;
        case 'products': return <SKUManagementView 
            shops={shops} 
            skus={skus} 
            agents={agents} 
            skuLists={skuLists}
            onAddNewSKU={handleAddNewSKU}
            onUpdateSKU={handleUpdateSKU}
            onDeleteSKU={handleDeleteSKU}
            onBulkAddSKUs={handleBulkAddSKUs}
            onAddNewShop={handleAddNewShop}
            onUpdateShop={handleUpdateShop}
            onDeleteShop={handleDeleteShop}
            onBulkAddShops={handleBulkAddShops}
            onAddNewAgent={handleAddNewAgent}
            onUpdateAgent={handleUpdateAgent}
            onDeleteAgent={handleDeleteAgent}
            onBulkAddAgents={handleBulkAddAgents}
            onAddNewSkuList={handleAddNewSkuList}
            onUpdateSkuList={handleUpdateSkuList}
            onDeleteSkuList={handleDeleteSkuList}
            addToast={addToast}
            />;
        case 'data-experience': return <DataExperienceView factTables={factTables} schemas={schemas} onUpdateSchema={handleUpdateSchema} onClearTable={handleClearTable} addToast={addToast} />;
        case 'data-center': return <DataCenterView onUpload={handleProcessAndUpload} history={uploadHistory} factTables={factTables} schemas={schemas} addToast={addToast} />;
        case 'system-snapshot': return <SystemSnapshotView snapshots={snapshots} settings={snapshotSettings} onCreate={handleCreateSnapshot} onRestore={handleRestoreSnapshot} onDelete={handleDeleteSnapshot} onUpdateSettings={handleUpdateSnapshotSettings} />;
        default: return <DashboardView factTables={factTables} skus={skus} shops={shops} />;
      }
    };
  
    return (
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden selection:bg-[#70AD47] selection:text-white">
          <Sidebar 
            currentView={currentView}
            setCurrentView={setCurrentView}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
          />
  
          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {/* Scrollable View Area */}
              <main className="flex-1 overflow-auto bg-slate-50/50 relative">
                   {renderContent()}
              </main>
              
              <ToastContainer toasts={toasts} />
          </div>
      </div>
    );
  };
