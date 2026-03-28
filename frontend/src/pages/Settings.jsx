import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { format } from "date-fns";

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

  useEffect(() => { fetchSettings(); }, []);

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
      // Settings might not exist yet, use defaults
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
      // Store in localStorage for immediate use
      localStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
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
      toast.success("Backup downloaded successfully!");
    } catch (error) {
      toast.error("Failed to create backup");
    } finally {
      setBackingUp(false);
    }
  };

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
        toast.success("Data restored successfully! Page reload ho raha hai...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast.error("Invalid backup file or restore failed");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-blue-700 mb-2">Backup kyu zaroori hai?</h3>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Computer crash ya format hone pe data safe rahega</li>
                <li>• New computer pe data easily restore ho jayega</li>
                <li>• Monthly backup lena recommended hai</li>
              </ul>
            </div>

            {/* Download Backup */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-green-700">Download Backup</div>
                  <div className="text-sm text-green-600">Saara data ek file mein download karo</div>
                </div>
                <button 
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="btn btn-success"
                >
                  {backingUp ? (
                    <span>Downloading...</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Restore Backup */}
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

            {/* Data Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Current Data:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Last Backup:</div>
                <div className="text-gray-700">{localStorage.getItem('last_backup') || 'Never'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
