import { useState, useEffect } from "react";

import axios from "axios";
import { api, API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

const Settings = () => {
  const [settings, setSettings] = useState({
    company_name: "Staff Manager",
    company_address: "",
    company_phone: "",
    footer_text: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  
  // Electron specific states
  const [dataFolder, setDataFolder] = useState("");
  const [autoBackup, setAutoBackup] = useState({ enabled: false, frequency: "daily", lastBackup: null });
  const [backupFiles, setBackupFiles] = useState([]);
  const [showBackupList, setShowBackupList] = useState(false);

  useEffect(() => { 
    fetchSettings(); 
    if (isElectron()) {
      loadElectronSettings();
    }
  }, []);

  const loadElectronSettings = async () => {
    try {
      const folder = await window.electronAPI.getDataFolder();
      setDataFolder(folder || "");
      
      const abSettings = await window.electronAPI.getAutoBackupSettings();
      setAutoBackup(abSettings);
      
      // Listen for auto-backup trigger
      window.electronAPI.onPerformAutoBackup(() => {
        handleBackupToFolder();
      });
    } catch (err) {
      console.log("Electron settings load error:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      if (res.data) {
        setSettings({
          company_name: res.data.company_name || "Staff Manager",
          company_address: res.data.company_address || "",
          company_phone: res.data.company_phone || "",
          footer_text: res.data.footer_text || ""
        });
      }
    } catch (error) {
      console.log("Using default settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/settings`, settings);
      toast.success("Settings saved! Header/Footer updated.");
      localStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Select Data Folder (Electron only)
  const handleSelectFolder = async () => {
    if (!isElectron()) return;
    
    const folder = await window.electronAPI.selectDataFolder();
    if (folder) {
      setDataFolder(folder);
      toast.success("Data folder selected!");
    }
  };

  // Open Data Folder
  const handleOpenFolder = async () => {
    if (!isElectron() || !dataFolder) return;
    await window.electronAPI.openFolder(dataFolder);
  };

  // Save Backup to Selected Folder (Electron)
  const handleBackupToFolder = async () => {
    if (!isElectron()) {
      handleBackupDownload();
      return;
    }
    
    if (!dataFolder) {
      toast.error("Pehle data folder select karo!");
      return;
    }
    
    setBackingUp(true);
    try {
      const res = await axios.get(`${API}/backup/export`);
      const result = await window.electronAPI.saveBackupToFolder(res.data);
      
      if (result.success) {
        toast.success(`Backup saved: ${result.filename}`);
        localStorage.setItem('last_backup', new Date().toLocaleString());
        
        // Refresh backup files list
        loadBackupFiles();
      } else {
        toast.error("Backup failed: " + result.error);
      }
    } catch (error) {
      toast.error("Backup create karne mein error");
    } finally {
      setBackingUp(false);
    }
  };

  // Download backup (Browser mode)
  const handleBackupDownload = async () => {
    setBackingUp(true);
    try {
      const res = await axios.get(`${API}/backup/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StaffManager_Backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Backup downloaded!");
      localStorage.setItem('last_backup', new Date().toLocaleString());
    } catch (error) {
      toast.error("Backup download failed");
    } finally {
      setBackingUp(false);
    }
  };

  // Load backup files list
  const loadBackupFiles = async () => {
    if (!isElectron()) return;
    const files = await window.electronAPI.getBackupFiles();
    setBackupFiles(files);
  };

  // Restore from folder backup
  const handleRestoreFromFile = async (filepath) => {
    if (!window.confirm("RESTORE karne se purana data overwrite ho jayega. Continue?")) return;
    
    try {
      const result = await window.electronAPI.readBackupFile(filepath);
      if (result.success) {
        await axios.post(`${API}/backup/restore`, result.data);
        toast.success("Data restored! Page reload ho raha hai...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error("File read error: " + result.error);
      }
    } catch (error) {
      toast.error("Restore failed");
    }
  };

  // Handle file upload restore (Browser mode)
  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("RESTORE karne se purana data overwrite ho jayega. Continue?")) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        await axios.post(`${API}/backup/restore`, backupData);
        toast.success("Data restored! Page reload ho raha hai...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast.error("Invalid backup file or restore failed");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Toggle Auto Backup
  const handleAutoBackupToggle = async () => {
    if (!isElectron()) return;
    
    const newSettings = { ...autoBackup, enabled: !autoBackup.enabled };
    await window.electronAPI.setAutoBackupSettings(newSettings);
    setAutoBackup(newSettings);
    toast.success(newSettings.enabled ? "Auto backup enabled!" : "Auto backup disabled");
  };

  // Change Auto Backup Frequency
  const handleFrequencyChange = async (freq) => {
    if (!isElectron()) return;
    
    const newSettings = { ...autoBackup, frequency: freq };
    await window.electronAPI.setAutoBackupSettings(newSettings);
    setAutoBackup(newSettings);
    toast.success(`Auto backup: ${freq === 'daily' ? 'Daily' : 'Weekly'}`);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="animate-fade-in" data-testid="settings-page">
      <div className="action-bar">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Header/Footer Settings */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Header & Footer (रिपोर्ट में दिखेगा)</div>
          </div>
          <div className="data-card-body">
            <div className="form-group">
              <label className="form-label">Company/Business Name *</label>
              <input 
                type="text" 
                className="form-control text-lg font-bold" 
                value={settings.company_name}
                onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                placeholder="e.g., ABC Traders"
              />
              <div className="text-xs text-gray-500 mt-1">Ye header mein dikhega (PDF reports, receipts)</div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea 
                className="form-control" 
                rows="2"
                value={settings.company_address}
                onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                placeholder="e.g., 123, Main Street, City"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.company_phone}
                onChange={(e) => setSettings({...settings, company_phone: e.target.value})}
                placeholder="e.g., 9876543210"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Footer Text</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.footer_text}
                onChange={(e) => setSettings({...settings, footer_text: e.target.value})}
                placeholder="e.g., Thank you for your business!"
              />
              <div className="text-xs text-gray-500 mt-1">Ye footer mein dikhega (PDF reports, receipts)</div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-gray-50 mt-4">
              <div className="text-xs text-gray-500 mb-2">Preview:</div>
              <div className="text-center border-b pb-3 mb-3">
                <div className="text-xl font-bold text-orange-600">{settings.company_name || "Your Company"}</div>
                {settings.company_address && <div className="text-sm text-gray-600">{settings.company_address}</div>}
                {settings.company_phone && <div className="text-sm text-gray-600">Ph: {settings.company_phone}</div>}
              </div>
              <div className="text-center text-xs text-gray-500 pt-2 border-t">
                {settings.footer_text || "Footer text will appear here"}
              </div>
            </div>

            <button 
              onClick={handleSave} 
              disabled={saving}
              className="btn btn-success w-full mt-4"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Backup & Restore (डेटा बैकअप)</div>
          </div>
          <div className="data-card-body">
            
            {/* Electron: Data Folder Selection */}
            {isElectron() && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                <div className="font-bold text-purple-700 mb-2">📁 Data Folder</div>
                <div className="text-sm text-purple-600 mb-3">
                  {dataFolder ? (
                    <span className="font-mono text-xs bg-purple-100 px-2 py-1 rounded">{dataFolder}</span>
                  ) : (
                    "Koi folder select nahi hua"
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSelectFolder} className="btn btn-primary text-sm">
                    <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {dataFolder ? "Change Folder" : "Select Folder"}
                  </button>
                  {dataFolder && (
                    <button onClick={handleOpenFolder} className="btn btn-secondary text-sm">
                      Open Folder
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Electron: Auto Backup */}
            {isElectron() && dataFolder && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-indigo-700">🔄 Auto Backup</div>
                    <div className="text-sm text-indigo-600">Automatic backup har {autoBackup.frequency === 'daily' ? 'din' : 'hafte'}</div>
                  </div>
                  <button 
                    onClick={handleAutoBackupToggle}
                    className={`relative w-14 h-7 rounded-full transition ${autoBackup.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoBackup.enabled ? 'left-8' : 'left-1'}`}></span>
                  </button>
                </div>
                {autoBackup.enabled && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleFrequencyChange('daily')}
                      className={`px-3 py-1 rounded text-sm ${autoBackup.frequency === 'daily' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}
                    >
                      Daily
                    </button>
                    <button 
                      onClick={() => handleFrequencyChange('weekly')}
                      className={`px-3 py-1 rounded text-sm ${autoBackup.frequency === 'weekly' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}
                    >
                      Weekly
                    </button>
                  </div>
                )}
                {autoBackup.lastBackup && (
                  <div className="text-xs text-indigo-500 mt-2">
                    Last auto backup: {new Date(autoBackup.lastBackup).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-blue-700 mb-2">Backup kyu zaroori hai?</h3>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Computer crash ya format hone pe data safe rahega</li>
                <li>• New computer pe data easily restore ho jayega</li>
                <li>• Monthly backup lena recommended hai</li>
              </ul>
            </div>

            {/* Create Backup */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-green-700">
                    {isElectron() && dataFolder ? "Backup to Folder" : "Download Backup"}
                  </div>
                  <div className="text-sm text-green-600">
                    {isElectron() && dataFolder ? "Selected folder mein backup save hoga" : "Saara data ek file mein download karo"}
                  </div>
                </div>
                <button 
                  onClick={isElectron() && dataFolder ? handleBackupToFolder : handleBackupDownload}
                  disabled={backingUp}
                  className="btn btn-success"
                >
                  {backingUp ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {isElectron() && dataFolder ? "Save Backup" : "Download"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Electron: View Backup Files */}
            {isElectron() && dataFolder && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-gray-700">📋 Saved Backups</div>
                  <button 
                    onClick={() => { loadBackupFiles(); setShowBackupList(!showBackupList); }}
                    className="btn btn-secondary text-sm"
                  >
                    {showBackupList ? "Hide" : "Show"} List
                  </button>
                </div>
                {showBackupList && (
                  <div className="max-h-48 overflow-auto mt-3">
                    {backupFiles.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-2">No backups found</div>
                    ) : (
                      <div className="space-y-2">
                        {backupFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div>
                              <div className="text-sm font-medium">{file.name}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(file.created).toLocaleString()} • {(file.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRestoreFromFile(file.path)}
                              className="btn btn-warning text-xs py-1 px-2"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Upload Restore (Browser mode) */}
            {!isElectron() && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-bold text-amber-700 mb-2">Restore Backup</div>
                <div className="text-sm text-amber-600 mb-3">
                  Pehle se downloaded backup file se data restore karo
                </div>
                <label className="btn btn-warning cursor-pointer inline-flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Backup File
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleRestore}
                    className="hidden"
                  />
                </label>
                <div className="text-xs text-red-500 mt-2">
                  Warning: Restore karne se current data overwrite ho jayega!
                </div>
              </div>
            )}

            {/* Data Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Current Data:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Last Backup:</div>
                <div className="text-gray-700">{localStorage.getItem('last_backup') || 'Never'}</div>
                {isElectron() && (
                  <>
                    <div className="text-gray-500">Mode:</div>
                    <div className="text-gray-700">Desktop App (Electron)</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
