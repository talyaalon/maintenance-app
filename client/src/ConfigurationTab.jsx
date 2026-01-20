import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Box, Hash, MapPin } from 'lucide-react';

const ConfigurationTab = ({ token, t }) => {
  // הוספנו את 'locations' לסטייט
  const [activeSubTab, setActiveSubTab] = useState('assets'); 
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]); // חדש!

  // טפסים
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState(''); // חדש!
  const [newAsset, setNewAsset] = useState({ name: '', code: '', category_id: '' });

  // טעינת נתונים - הוספנו טעינה של מיקומים
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const catRes = await fetch('https://maintenance-app-h84v.onrender.com/categories', { headers });
      const assetRes = await fetch('https://maintenance-app-h84v.onrender.com/assets', { headers });
      const locRes = await fetch('https://maintenance-app-h84v.onrender.com/locations', { headers }); // חדש!
      
      if (catRes.ok) setCategories(await catRes.json());
      if (assetRes.ok) setAssets(await assetRes.json());
      if (locRes.ok) setLocations(await locRes.json());
    } catch (e) { console.error(e); }
  };

  // --- פונקציית מחיקה כללית (חדש!) ---
  const handleDelete = async (type, id) => {
      if (!window.confirm(t.confirm_delete || "Are you sure?")) return;
      try {
          const res = await fetch(`https://maintenance-app-h84v.onrender.com/${type}/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              fetchData(); // רענון אחרי מחיקה
          } else {
              alert(t.error_delete_in_use || "Cannot delete: Item is in use.");
          }
      } catch (e) { alert("Error"); }
  };

  // --- הוספת קטגוריה (נשאר אותו דבר) ---
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory) return;
    try {
        const res = await fetch('https://maintenance-app-h84v.onrender.com/categories', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newCategory })
        });
        if (res.ok) { setNewCategory(''); fetchData(); alert(t.category_added || "Added!"); }
    } catch (e) { alert("Error"); }
  };

  // --- הוספת מיקום (חדש!) ---
  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation) return;
    try {
        const res = await fetch('https://maintenance-app-h84v.onrender.com/locations', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newLocation })
        });
        if (res.ok) { setNewLocation(''); fetchData(); }
    } catch (e) { alert("Error"); }
  };

  // --- הוספת נכס (נשאר אותו דבר + ולידציה) ---
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.category_id) return alert(t.fill_all_fields || "Fill all fields");
    try {
        const res = await fetch('https://maintenance-app-h84v.onrender.com/assets', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newAsset)
        });
        if (res.ok) { 
            setNewAsset({ name: '', code: '', category_id: '' }); 
            fetchData(); 
            alert(t.asset_created || "Created!"); 
        }
    } catch (e) { alert("Error"); }
  };

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-[#6A0DAD] mb-4">{t.config_title}</h2>
      
      {/* כפתורי ניווט - הוספנו כפתור למיקומים */}
      <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
        <button onClick={() => setActiveSubTab('assets')} className={`flex-1 py-2 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap ${activeSubTab === 'assets' ? 'bg-[#6A0DAD] text-white shadow' : 'text-gray-500'}`}>
            <Box size={16}/> {t.assets_tab}
        </button>
        <button onClick={() => setActiveSubTab('categories')} className={`flex-1 py-2 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap ${activeSubTab === 'categories' ? 'bg-[#6A0DAD] text-white shadow' : 'text-gray-500'}`}>
            <Tag size={16}/> {t.categories_tab}
        </button>
        <button onClick={() => setActiveSubTab('locations')} className={`flex-1 py-2 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap ${activeSubTab === 'locations' ? 'bg-[#6A0DAD] text-white shadow' : 'text-gray-500'}`}>
            <MapPin size={16}/> {t.nav_locations || "Locations"}
        </button>
      </div>

      {/* --- נכסים --- */}
      {activeSubTab === 'assets' && (
        <div className="animate-fade-in">
           <form onSubmit={handleAddAsset} className="bg-white p-4 rounded-xl shadow-sm border mb-4 space-y-3">
              <h3 className="font-bold text-gray-700 text-sm">{t.add_new_asset}:</h3>
              <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder={t.asset_name_placeholder} className="p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})}/>
                  <input type="text" placeholder={t.asset_code_placeholder} className="p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200" value={newAsset.code} onChange={e => setNewAsset({...newAsset, code: e.target.value})}/>
              </div>
              <select className="w-full p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200" value={newAsset.category_id} onChange={e => setNewAsset({...newAsset, category_id: e.target.value})}>
                  <option value="">{t.select_category}...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="w-full bg-[#6A0DAD] text-white py-2 rounded font-bold shadow hover:bg-purple-800">{t.save_asset_btn}</button>
           </form>
           
           <div className="space-y-2">
              {assets.map(a => (
                  <div key={a.id} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                      <div>
                          <div className="font-bold text-gray-800">{a.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1"><Hash size={10}/> {a.code} • {a.category_name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold">{a.category_name}</span>
                          <button onClick={() => handleDelete('assets', a.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                      </div>
                  </div>
              ))}
              {assets.length === 0 && <p className="text-center text-gray-400 mt-4">{t.no_assets}</p>}
           </div>
        </div>
      )}

      {/* --- קטגוריות --- */}
      {activeSubTab === 'categories' && (
        <div className="animate-fade-in">
           <form onSubmit={handleAddCategory} className="bg-white p-4 rounded-xl shadow-sm border mb-4 flex gap-2">
              <input type="text" placeholder={t.category_placeholder} className="flex-1 p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200" value={newCategory} onChange={e => setNewCategory(e.target.value)}/>
              <button type="submit" className="bg-purple-600 text-white p-2 rounded-lg"><Plus/></button>
           </form>
           <div className="space-y-2">
              {categories.map(c => (
                  <div key={c.id} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                      <span className="font-medium">{c.name}</span>
                      <button onClick={() => handleDelete('categories', c.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                  </div>
              ))}
              {categories.length === 0 && <p className="text-center text-gray-400 mt-4">{t.no_categories}</p>}
           </div>
        </div>
      )}

      {/* --- מיקומים (החלק החדש!) --- */}
      {activeSubTab === 'locations' && (
        <div className="animate-fade-in">
           <form onSubmit={handleAddLocation} className="bg-white p-4 rounded-xl shadow-sm border mb-4 flex gap-2">
              <input type="text" placeholder={t.location_placeholder || "New Location Name"} className="flex-1 p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200" value={newLocation} onChange={e => setNewLocation(e.target.value)}/>
              <button type="submit" className="bg-purple-600 text-white p-2 rounded-lg"><Plus/></button>
           </form>
           <div className="space-y-2">
              {locations.map(l => (
                  <div key={l.id} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                      <span className="font-medium">{l.name}</span>
                      <button onClick={() => handleDelete('locations', l.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                  </div>
              ))}
              {locations.length === 0 && <p className="text-center text-gray-400 mt-4">No locations yet</p>}
           </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationTab;