import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Box, Hash, MapPin, Pencil, X, Save } from 'lucide-react';

const ConfigurationTab = ({ token, t }) => {
  const [activeSubTab, setActiveSubTab] = useState('assets'); 
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]); 

  // טפסים
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState(''); 
  const [newAsset, setNewAsset] = useState({ name: '', code: '', category_id: '' });

  // מצבי עריכה
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editLocationId, setEditLocationId] = useState(null);
  const [editAssetId, setEditAssetId] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const catRes = await fetch('https://maintenance-app-h84v.onrender.com/categories', { headers });
      const assetRes = await fetch('https://maintenance-app-h84v.onrender.com/assets', { headers });
      const locRes = await fetch('https://maintenance-app-h84v.onrender.com/locations', { headers }); 
      
      if (catRes.ok) setCategories(await catRes.json());
      if (assetRes.ok) setAssets(await assetRes.json());
      if (locRes.ok) setLocations(await locRes.json());
    } catch (e) { console.error(e); }
  };

  // --- מחיקה ---
  const handleDelete = async (type, id) => {
      if (!window.confirm(t.confirm_delete || "Are you sure?")) return;
      try {
          const res = await fetch(`https://maintenance-app-h84v.onrender.com/${type}/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) fetchData();
          else alert(t.error_delete_in_use || "Cannot delete: Item is in use.");
      } catch (e) { alert("Error"); }
  };

  // --- לוגיקה לקטגוריות (הוספה ועריכה) ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCategory) return;
    
    // בדיקת כפילות שם (רק בהוספה חדשה)
    if (!editCategoryId) {
        const exists = categories.find(c => c.name.toLowerCase() === newCategory.trim().toLowerCase());
        if (exists) {
            alert(t.error_category_exists || "⚠️ Error: This Category name already exists. Please choose a different name.");
            return;
        }
    }

    const method = editCategoryId ? 'PUT' : 'POST';
    const url = editCategoryId 
        ? `https://maintenance-app-h84v.onrender.com/categories/${editCategoryId}`
        : 'https://maintenance-app-h84v.onrender.com/categories';

    try {
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newCategory })
        });
        
        const data = await res.json();
        if (res.ok) {
            setNewCategory(''); setEditCategoryId(null); fetchData();
        } else {
            alert("Error: " + (data.error || "Failed"));
        }
    } catch (e) { alert("Error"); }
  };

  const startEditCategory = (c) => {
      setNewCategory(c.name);
      setEditCategoryId(c.id);
  };

  // --- לוגיקה למיקומים (הוספה ועריכה) ---
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!newLocation) return;

    // בדיקת כפילות שם (רק בהוספה חדשה)
    if (!editLocationId) {
        const exists = locations.find(l => l.name.toLowerCase() === newLocation.trim().toLowerCase());
        if (exists) {
            alert(t.error_location_exists || "⚠️ Error: This Location name already exists.");
            return;
        }
    }

    const method = editLocationId ? 'PUT' : 'POST';
    const url = editLocationId 
        ? `https://maintenance-app-h84v.onrender.com/locations/${editLocationId}`
        : 'https://maintenance-app-h84v.onrender.com/locations';

    try {
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newLocation })
        });
        
        const data = await res.json();
        if (res.ok) {
            setNewLocation(''); setEditLocationId(null); fetchData();
        } else {
            alert("Error: " + (data.error || "Failed"));
        }
    } catch (e) { alert("Error"); }
  };

  const startEditLocation = (l) => {
      setNewLocation(l.name);
      setEditLocationId(l.id);
  };

  // --- לוגיקה לנכסים (הוספה ועריכה) ---
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.category_id) return alert(t.fill_all_fields || "Fill fields");

    // בדיקת כפילות קוד (רק בהוספה חדשה)
    if (!editAssetId && newAsset.code) {
        const exists = assets.find(a => a.code === newAsset.code.trim());
        if (exists) {
            alert(t.error_code_exists || "⚠️ Error: This Asset Code already exists! Codes must be unique.");
            return;
        }
    }

    const method = editAssetId ? 'PUT' : 'POST';
    const url = editAssetId 
        ? `https://maintenance-app-h84v.onrender.com/assets/${editAssetId}`
        : 'https://maintenance-app-h84v.onrender.com/assets';

    try {
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newAsset)
        });
        
        const data = await res.json();
        if (res.ok) {
            setNewAsset({ name: '', code: '', category_id: '' }); setEditAssetId(null); fetchData();
        } else {
            alert("Error: " + (data.error || "Failed"));
        }
    } catch (e) { alert("Error"); }
  };

  const startEditAsset = (a) => {
      setNewAsset({ name: a.name, code: a.code || '', category_id: a.category_id });
      setEditAssetId(a.id);
  };

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-black mb-4">{t.config_title}</h2>
      
      {/* Navigation */}
      <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
        <button onClick={() => setActiveSubTab('assets')} className={`flex-1 py-2 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap ${activeSubTab === 'assets' ? 'bg-[#714B67] text-white shadow' : 'text-gray-500'}`}><Box size={16}/> {t.assets_tab}</button>
        <button onClick={() => setActiveSubTab('categories')} className={`flex-1 py-2 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap ${activeSubTab === 'categories' ? 'bg-[#714B67] text-white shadow' : 'text-gray-500'}`}><Tag size={16}/> {t.categories_tab}</button>
        {/* התיקון: שימוש ב-t.nav_locations */}
        <button onClick={() => setActiveSubTab('locations')} className={`flex-1 py-2 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap ${activeSubTab === 'locations' ? 'bg-[#714B67] text-white shadow' : 'text-gray-500'}`}><MapPin size={16}/> {t.nav_locations || "Locations"}</button>
      </div>

      {/* --- Assets Tab --- */}
      {activeSubTab === 'assets' && (
        <div className="animate-fade-in">
           <form onSubmit={handleSaveAsset} className={`p-4 rounded-xl shadow-sm border mb-4 space-y-3 ${editAssetId ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 text-sm">{editAssetId ? "Edit Asset:" : t.add_new_asset}</h3>
                  {editAssetId && <button type="button" onClick={() => {setEditAssetId(null); setNewAsset({name:'',code:'',category_id:''})}} className="text-gray-400"><X size={16}/></button>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder={t.asset_name_placeholder} className="p-2 border rounded-lg bg-white" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})}/>
                  <input type="text" placeholder={t.asset_code_placeholder} className="p-2 border rounded-lg bg-white" value={newAsset.code} onChange={e => setNewAsset({...newAsset, code: e.target.value})}/>
              </div>
              <select className="w-full p-2 border rounded-lg bg-white" value={newAsset.category_id} onChange={e => setNewAsset({...newAsset, category_id: e.target.value})}>
                  <option value="">{t.select_category}...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className={`w-full py-2 rounded font-bold text-white shadow ${editAssetId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#714B67] hover:#5a3b52'}`}>
                  {editAssetId ? "Update Asset" : t.save_asset_btn}
              </button>
           </form>
           
           <div className="space-y-2">
              {assets.map(a => (
                  <div key={a.id} className="bg-white p-3 rounded-lg border flex justify-between items-center group">
                      <div>
                          <div className="font-bold text-gray-800">{a.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1"><Hash size={10}/> {a.code} • {a.category_name}</div>
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={() => startEditAsset(a)} className="text-gray-400 hover:text-blue-500 p-2"><Pencil size={18}/></button>
                          <button onClick={() => handleDelete('assets', a.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                      </div>
                  </div>
              ))}
           </div>
        </div>
      )}

      {/* --- Categories Tab --- */}
      {activeSubTab === 'categories' && (
        <div className="animate-fade-in">
           <form onSubmit={handleSaveCategory} className={`p-4 rounded-xl shadow-sm border mb-4 flex gap-2 ${editCategoryId ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
              <div className="flex-1 flex gap-2">
                  <input type="text" placeholder={t.category_placeholder} className="flex-1 p-2 border rounded-lg bg-white" value={newCategory} onChange={e => setNewCategory(e.target.value)}/>
                  {editCategoryId && <button type="button" onClick={() => {setEditCategoryId(null); setNewCategory('')}} className="text-gray-400"><X size={20}/></button>}
              </div>
              <button type="submit" className={`p-2 rounded-lg text-white ${editCategoryId ? 'bg-orange-500' : 'bg-purple-600'}`}>
                  {editCategoryId ? <Save size={20}/> : <Plus size={20}/>}
              </button>
           </form>
           <div className="space-y-2">
              {categories.map(c => (
                  <div key={c.id} className="bg-white p-3 rounded-lg border flex justify-between items-center group">
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-1">
                          <button onClick={() => startEditCategory(c)} className="text-gray-400 hover:text-blue-500 p-2"><Pencil size={18}/></button>
                          <button onClick={() => handleDelete('categories', c.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                      </div>
                  </div>
              ))}
           </div>
        </div>
      )}

      {/* --- Locations Tab --- */}
      {activeSubTab === 'locations' && (
        <div className="animate-fade-in">
           <form onSubmit={handleSaveLocation} className={`p-4 rounded-xl shadow-sm border mb-4 flex gap-2 ${editLocationId ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
              <div className="flex-1 flex gap-2">
                  <input type="text" placeholder={t.location_placeholder || "New Location Name"} className="flex-1 p-2 border rounded-lg bg-white" value={newLocation} onChange={e => setNewLocation(e.target.value)}/>
                  {editLocationId && <button type="button" onClick={() => {setEditLocationId(null); setNewLocation('')}} className="text-gray-400"><X size={20}/></button>}
              </div>
              <button type="submit" className={`p-2 rounded-lg text-white ${editLocationId ? 'bg-orange-500' : 'bg-purple-600'}`}>
                  {editLocationId ? <Save size={20}/> : <Plus size={20}/>}
              </button>
           </form>
           <div className="space-y-2">
              {locations.map(l => (
                  <div key={l.id} className="bg-white p-3 rounded-lg border flex justify-between items-center group">
                      <span className="font-medium">{l.name}</span>
                      <div className="flex items-center gap-1">
                          <button onClick={() => startEditLocation(l)} className="text-gray-400 hover:text-blue-500 p-2"><Pencil size={18}/></button>
                          <button onClick={() => handleDelete('locations', l.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                      </div>
                  </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationTab;