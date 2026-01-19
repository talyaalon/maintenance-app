import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Box, Hash } from 'lucide-react';

const ConfigurationTab = ({ token, t }) => {
  const [activeSubTab, setActiveSubTab] = useState('assets'); // 'assets' or 'categories'
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);

  // טפסים
  const [newCategory, setNewCategory] = useState('');
  const [newAsset, setNewAsset] = useState({ name: '', code: '', category_id: '' });

  // טעינת נתונים
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const catRes = await fetch('https://maintenance-app-h84v.onrender.com/categories', { headers: { 'Authorization': `Bearer ${token}` } });
      const assetRes = await fetch('https://maintenance-app-h84v.onrender.com/assets', { headers: { 'Authorization': `Bearer ${token}` } });
      
      if (catRes.ok) setCategories(await catRes.json());
      if (assetRes.ok) setAssets(await assetRes.json());
    } catch (e) { console.error(e); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory) return;
    try {
      const res = await fetch('https://maintenance-app-h84v.onrender.com/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newCategory })
      });
      if (res.ok) {
        setNewCategory('');
        fetchData();
        alert("Category Added!");
      }
    } catch (e) { alert("Error adding category"); }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.code || !newAsset.category_id) {
        alert("Please fill all fields");
        return;
    }
    try {
      const res = await fetch('https://maintenance-app-h84v.onrender.com/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newAsset)
      });
      const data = await res.json();
      if (res.ok) {
        setNewAsset({ name: '', code: '', category_id: '' });
        fetchData();
        alert("Asset Created Successfully!");
      } else {
        alert(data.error || "Error creating asset");
      }
    } catch (e) { alert("Error"); }
  };

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-[#6A0DAD] mb-4">Configuration & Assets</h2>
      
      {/* כפתורי ניווט פנימיים */}
      <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm border">
        <button 
            onClick={() => setActiveSubTab('assets')}
            className={`flex-1 py-2 rounded-md font-bold text-sm flex justify-center items-center gap-2 ${activeSubTab === 'assets' ? 'bg-[#6A0DAD] text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Box size={16}/> Assets (הנכסים שלי)
        </button>
        <button 
            onClick={() => setActiveSubTab('categories')}
            className={`flex-1 py-2 rounded-md font-bold text-sm flex justify-center items-center gap-2 ${activeSubTab === 'categories' ? 'bg-[#6A0DAD] text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Tag size={16}/> Categories (קטגוריות)
        </button>
      </div>

      {/* --- אזור ניהול קטגוריות --- */}
      {activeSubTab === 'categories' && (
        <div className="animate-fade-in">
           <form onSubmit={handleAddCategory} className="bg-white p-4 rounded-xl shadow-sm border mb-4 flex gap-2">
              <input 
                type="text" placeholder="שם קטגוריה חדשה (למשל: מוצרי חשמל)" 
                className="flex-1 p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200"
                value={newCategory} onChange={e => setNewCategory(e.target.value)}
              />
              <button type="submit" className="bg-purple-600 text-white p-2 rounded-lg"><Plus/></button>
           </form>

           <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {categories.map(c => (
                  <div key={c.id} className="p-3 border-b last:border-0 flex justify-between items-center hover:bg-gray-50">
                      <span className="font-medium">{c.name}</span>
                  </div>
              ))}
              {categories.length === 0 && <p className="p-4 text-center text-gray-400">No categories yet</p>}
           </div>
        </div>
      )}

      {/* --- אזור ניהול נכסים --- */}
      {activeSubTab === 'assets' && (
        <div className="animate-fade-in">
           <form onSubmit={handleAddAsset} className="bg-white p-4 rounded-xl shadow-sm border mb-4 space-y-3">
              <h3 className="font-bold text-gray-700 text-sm">הוספת נכס חדש:</h3>
              <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" placeholder="שם הנכס (למשל: תנור פיצה)" 
                    className="p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200"
                    value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                  />
                  <input 
                    type="text" placeholder="קוד ייחודי (למשל: OVN-324)" 
                    className="p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200"
                    value={newAsset.code} onChange={e => setNewAsset({...newAsset, code: e.target.value})}
                  />
              </div>
              <select 
                className="w-full p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200"
                value={newAsset.category_id} onChange={e => setNewAsset({...newAsset, category_id: e.target.value})}
              >
                  <option value="">בחר קטגוריה...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="w-full bg-[#6A0DAD] text-white py-2 rounded-lg font-bold shadow hover:bg-purple-800">
                  שמור נכס
              </button>
           </form>

           <div className="space-y-3">
              {assets.map(asset => (
                  <div key={asset.id} className="bg-white p-3 rounded-xl shadow-sm border flex justify-between items-center">
                      <div>
                          <div className="font-bold text-gray-800">{asset.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Hash size={10}/> {asset.code} • {asset.category_name}
                          </div>
                      </div>
                      <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                          {asset.category_name}
                      </div>
                  </div>
              ))}
              {assets.length === 0 && <p className="text-center text-gray-400 mt-4">No assets yet. Create categories first!</p>}
           </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationTab;