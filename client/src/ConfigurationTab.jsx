import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Box, Hash, MapPin, Pencil, X, Save, ChevronDown, ChevronRight, FolderTree, Image as ImageIcon, Map, Layers } from 'lucide-react';

const ConfigurationTab = ({ token, t }) => {
  // עכשיו יש רק 2 טאבים ראשיים: עץ (קטגוריות ונכסים) ומיקומים
  const [activeSubTab, setActiveSubTab] = useState('tree'); 
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]); 

  // ניהול תצוגת העץ
  const [expandedCategories, setExpandedCategories] = useState([]);

  // מודאלים
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [treeNodeType, setTreeNodeType] = useState('category'); // 'category' or 'asset'
  const [showLocationModal, setShowLocationModal] = useState(false);

  // טפסים
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', code: '' });
  const [assetForm, setAssetForm] = useState({ id: null, name: '', category_id: '', location_id: '' });
  
  const [locationForm, setLocationForm] = useState({ 
      id: null, name: '', code: '', image_url: '', map_link: '', dynamic_fields: [] 
  });
  const [newField, setNewField] = useState({ name: '', type: 'text' });
  const [showFieldAdder, setShowFieldAdder] = useState(false);

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

  const toggleCategory = (catId) => {
      setExpandedCategories(prev => 
          prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
      );
  };

  const handleDelete = async (type, id) => {
      if (!window.confirm(t.confirm_delete || "האם אתה בטוח שברצונך למחוק?")) return;
      try {
          const res = await fetch(`https://maintenance-app-h84v.onrender.com/${type}/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) fetchData();
          else alert(t.error_delete_in_use || "לא ניתן למחוק: הפריט בשימוש במערכת.");
      } catch (e) { alert("Server Error"); }
  };

  // --- לוגיקת קטגוריות ונכסים (עץ) ---
  const generateAssetCode = (categoryId) => {
      const category = categories.find(c => c.id === parseInt(categoryId));
      if (!category) return '';
      const catCode = (category.code || 'GEN').toUpperCase();
      
      const categoryAssets = assets.filter(a => a.category_id === parseInt(categoryId));
      let maxNum = 0;
      
      categoryAssets.forEach(a => {
          if (a.code && a.code.startsWith(catCode + '-')) {
              const numPart = parseInt(a.code.split('-')[1]);
              if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
          }
      });
      
      const nextNum = (maxNum + 1).toString().padStart(4, '0');
      return `${catCode}-${nextNum}`;
  };

  const handleSaveTreeItem = async (e) => {
      e.preventDefault();
      
      let url = '';
      let method = 'POST';
      let payload = {};

      if (treeNodeType === 'category') {
          if (!categoryForm.name || !categoryForm.code) return alert("יש למלא שם וקוד קטגוריה (3 אותיות).");
          method = categoryForm.id ? 'PUT' : 'POST';
          url = categoryForm.id ? `https://maintenance-app-h84v.onrender.com/categories/${categoryForm.id}` : 'https://maintenance-app-h84v.onrender.com/categories';
          payload = { name: categoryForm.name, code: categoryForm.code.toUpperCase().slice(0, 3) };
      } else {
          if (!assetForm.name || !assetForm.category_id || !assetForm.location_id) return alert("יש למלא שם, קטגוריה ומיקום.");
          method = assetForm.id ? 'PUT' : 'POST';
          url = assetForm.id ? `https://maintenance-app-h84v.onrender.com/assets/${assetForm.id}` : 'https://maintenance-app-h84v.onrender.com/assets';
          
          // יצירת קוד אוטומטי רק לנכס חדש
          const finalCode = assetForm.id ? assetForm.code : generateAssetCode(assetForm.category_id);
          payload = { 
              name: assetForm.name, 
              category_id: assetForm.category_id, 
              location_id: assetForm.location_id,
              code: finalCode 
          };
      }

      try {
          const res = await fetch(url, {
              method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(payload)
          });
          if (res.ok) {
              setShowTreeModal(false);
              fetchData();
          } else {
              const data = await res.json();
              alert("Error: " + (data.error || "Failed"));
          }
      } catch (e) { alert("Server Error"); }
  };

  const openTreeModal = (type, item = null) => {
      setTreeNodeType(type);
      if (type === 'category') {
          setCategoryForm(item ? { id: item.id, name: item.name, code: item.code || '' } : { id: null, name: '', code: '' });
      } else {
          setAssetForm(item ? { id: item.id, name: item.name, category_id: item.category_id, location_id: item.location_id || '', code: item.code } : { id: null, name: '', category_id: '', location_id: '' });
      }
      setShowTreeModal(true);
  };

  // --- לוגיקת מיקומים ושדות דינמיים ---
  const handleAddDynamicField = () => {
      if (!newField.name) return;
      setLocationForm(prev => ({
          ...prev, 
          dynamic_fields: [...(prev.dynamic_fields || []), { ...newField, id: Date.now() }]
      }));
      setNewField({ name: '', type: 'text' });
      setShowFieldAdder(false);
  };

  const removeDynamicField = (fieldId) => {
      setLocationForm(prev => ({
          ...prev, 
          dynamic_fields: prev.dynamic_fields.filter(f => f.id !== fieldId)
      }));
  };

  const handleSaveLocation = async (e) => {
      e.preventDefault();
      if (!locationForm.name) return alert("חובה להזין שם מיקום");

      const method = locationForm.id ? 'PUT' : 'POST';
      const url = locationForm.id ? `https://maintenance-app-h84v.onrender.com/locations/${locationForm.id}` : 'https://maintenance-app-h84v.onrender.com/locations';

      // ממירים את הלינק למפה לאובייקט JSON כדי שיתאים למסד הנתונים
      const payload = {
          name: locationForm.name,
          code: locationForm.code,
          image_url: locationForm.image_url,
          coordinates: JSON.stringify({ link: locationForm.map_link }),
          dynamic_fields: JSON.stringify(locationForm.dynamic_fields)
      };

      try {
          const res = await fetch(url, {
              method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(payload)
          });
          if (res.ok) {
              setShowLocationModal(false);
              fetchData();
          } else {
              const data = await res.json();
              alert("Error: " + (data.error || "Failed"));
          }
      } catch (e) { alert("Server Error"); }
  };

  const openLocationModal = (loc = null) => {
      if (loc) {
          let parsedFields = [];
          let parsedMap = '';
          try { parsedFields = typeof loc.dynamic_fields === 'string' ? JSON.parse(loc.dynamic_fields) : (loc.dynamic_fields || []); } catch(e){}
          try { 
              const coordObj = typeof loc.coordinates === 'string' ? JSON.parse(loc.coordinates) : loc.coordinates; 
              parsedMap = coordObj?.link || '';
          } catch(e){}
          
          setLocationForm({ id: loc.id, name: loc.name, code: loc.code || '', image_url: loc.image_url || '', map_link: parsedMap, dynamic_fields: parsedFields });
      } else {
          setLocationForm({ id: null, name: '', code: '', image_url: '', map_link: '', dynamic_fields: [] });
      }
      setShowLocationModal(true);
  };

  return (
    <div className="p-4 pb-32 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">{t.config_title || "הגדרות מערכת"}</h2>
      
      {/* תפריט עליון - רק 2 טאבים */}
      <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-xl shadow-sm border">
        <button onClick={() => setActiveSubTab('tree')} className={`flex-1 py-3 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'tree' ? 'bg-[#714B67] text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:bg-gray-50'}`}>
            <FolderTree size={18}/> קטגוריות ונכסים
        </button>
        <button onClick={() => setActiveSubTab('locations')} className={`flex-1 py-3 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'locations' ? 'bg-[#714B67] text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:bg-gray-50'}`}>
            <MapPin size={18}/> מיקומים
        </button>
      </div>

      {/* --- טאב עץ קטגוריות ונכסים --- */}
      {activeSubTab === 'tree' && (
        <div className="animate-fade-in space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700">עץ היררכיה</h3>
                <button onClick={() => openTreeModal('category')} className="bg-[#714B67] text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:opacity-90 flex items-center gap-1">
                    <Plus size={16}/> הוסף קטגוריה
                </button>
            </div>

            <div className="space-y-3">
                {categories.length === 0 && <p className="text-gray-400 text-center py-8">אין קטגוריות במערכת.</p>}
                {categories.map(category => {
                    const categoryAssets = assets.filter(a => a.category_id === category.id);
                    const isExpanded = expandedCategories.includes(category.id);
                    
                    return (
                        <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* שורת קטגוריה */}
                            <div className="p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleCategory(category.id)}>
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                        <Tag size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            {category.name} 
                                            {category.code && <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full uppercase">{category.code}</span>}
                                        </h4>
                                        <p className="text-xs text-gray-500">{categoryAssets.length} נכסים משויכים</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openTreeModal('asset', { category_id: category.id })} className="p-2 text-[#714B67] hover:bg-purple-100 rounded-full" title="הוסף נכס לקטגוריה זו"><Plus size={18}/></button>
                                    <button onClick={() => openTreeModal('category', category)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full"><Pencil size={18}/></button>
                                    <button onClick={() => handleDelete('categories', category.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full"><Trash2 size={18}/></button>
                                    <button onClick={() => toggleCategory(category.id)} className="p-2 text-gray-400">
                                        {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                                    </button>
                                </div>
                            </div>

                            {/* נכסים תחת הקטגוריה */}
                            {isExpanded && (
                                <div className="bg-white border-t border-gray-100 animate-slide-down">
                                    {categoryAssets.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-400">אין נכסים תחת קטגוריה זו.</div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {categoryAssets.map(asset => {
                                                const locName = locations.find(l => l.id === asset.location_id)?.name || 'ללא מיקום';
                                                return (
                                                    <div key={asset.id} className="p-3 pl-8 flex justify-between items-center hover:bg-gray-50 pr-4 ml-6 border-l-2 border-purple-200">
                                                        <div className="flex items-center gap-3">
                                                            <Box size={16} className="text-gray-400"/>
                                                            <div>
                                                                <span className="font-bold text-gray-700 block">{asset.name}</span>
                                                                <div className="text-xs text-gray-500 flex gap-2">
                                                                    <span className="font-mono bg-gray-100 px-1 rounded text-purple-600">{asset.code}</span>
                                                                    <span className="flex items-center gap-0.5"><MapPin size={10}/> {locName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => openTreeModal('asset', asset)} className="p-1.5 text-gray-400 hover:text-blue-500"><Pencil size={16}/></button>
                                                            <button onClick={() => handleDelete('assets', asset.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* --- טאב מיקומים מתקדם --- */}
      {activeSubTab === 'locations' && (
        <div className="animate-fade-in space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700">ניהול מיקומים ושדות</h3>
                <button onClick={() => openLocationModal()} className="bg-[#714B67] text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:opacity-90 flex items-center gap-1">
                    <Plus size={16}/> הוסף מיקום
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {locations.map(loc => {
                    let fieldsCount = 0;
                    try { fieldsCount = (typeof loc.dynamic_fields === 'string' ? JSON.parse(loc.dynamic_fields) : (loc.dynamic_fields || [])).length; } catch(e){}
                    return (
                        <div key={loc.id} className="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3 items-center">
                                    {loc.image_url ? (
                                        <img src={loc.image_url} alt={loc.name} className="w-12 h-12 rounded-lg object-cover border" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border"><MapPin size={20}/></div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-lg">{loc.name}</h4>
                                        {loc.code && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{loc.code}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => openLocationModal(loc)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil size={16}/></button>
                                    <button onClick={() => handleDelete('locations', loc.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <div className="flex gap-3 text-xs text-gray-500 border-t pt-3">
                                <span className="flex items-center gap-1"><Layers size={14}/> {fieldsCount} שדות מותאמים</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* ========================================= */}
      {/* מודאלים (חלונות קופצים) */}
      {/* ========================================= */}

      {/* מודאל עץ (הוספת קטגוריה/נכס) */}
      {showTreeModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-800">
                          {treeNodeType === 'category' ? (categoryForm.id ? 'עריכת קטגוריה' : 'קטגוריה חדשה') : (assetForm.id ? 'עריכת נכס' : 'נכס חדש')}
                      </h3>
                      <button onClick={() => setShowTreeModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <form onSubmit={handleSaveTreeItem} className="p-5 space-y-4">
                      {treeNodeType === 'category' ? (
                          <>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">שם הקטגוריה</label>
                                  <input type="text" required className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-200 outline-none" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">קוד קטגוריה (3 אותיות באנגלית)</label>
                                  <input type="text" required maxLength="3" pattern="[A-Za-z]{3}" title="3 אותיות באנגלית בלבד" placeholder="למשל: AIR" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-200 outline-none uppercase font-mono" value={categoryForm.code} onChange={e => setCategoryForm({...categoryForm, code: e.target.value.toUpperCase()})} />
                                  <p className="text-xs text-gray-400 mt-1">קוד זה ישמש כקידומת אוטומטית לכל הנכסים תחת קטגוריה זו.</p>
                              </div>
                          </>
                      ) : (
                          <>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">שם הנכס</label>
                                  <input type="text" required className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-200 outline-none" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">שיוך לקטגוריה</label>
                                  <select required className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white outline-none" value={assetForm.category_id} onChange={e => setAssetForm({...assetForm, category_id: e.target.value})}>
                                      <option value="">בחר קטגוריה...</option>
                                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">שיוך למיקום (חובה)</label>
                                  <select required className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white outline-none" value={assetForm.location_id} onChange={e => setAssetForm({...assetForm, location_id: e.target.value})}>
                                      <option value="">בחר מיקום...</option>
                                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                  </select>
                              </div>
                              {/* הצגת הקוד אם זה מצב עריכה, בהוספה הקוד נוצר אוטומטית מאחורי הקלעים */}
                              {assetForm.id && (
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-1">קוד נכס</label>
                                      <input type="text" disabled className="w-full p-3 border rounded-lg bg-gray-100 font-mono text-gray-500" value={assetForm.code} />
                                  </div>
                              )}
                          </>
                      )}
                      
                      <button type="submit" className="w-full py-3 bg-[#714B67] text-white rounded-xl font-bold shadow-md hover:opacity-90 mt-4">שמור שינויים</button>
                  </form>
              </div>
          </div>
      )}

      {/* מודאל מיקומים ושדות דינמיים */}
      {showLocationModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
                  <div className="bg-gray-50 p-4 border-b flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-lg text-gray-800">כרטיסיית מיקום</h3>
                      <button onClick={() => setShowLocationModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-5 overflow-y-auto flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                              <label className="block text-sm font-bold text-gray-700 mb-1">שם המיקום</label>
                              <input type="text" required className="w-full p-3 border rounded-lg bg-gray-50 outline-none" value={locationForm.name} onChange={e => setLocationForm({...locationForm, name: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">קוד מיקום (אופציונלי)</label>
                              <input type="text" className="w-full p-3 border rounded-lg bg-gray-50 outline-none" value={locationForm.code} onChange={e => setLocationForm({...locationForm, code: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><Map size={14}/> מפות גוגל (לינק)</label>
                              <input type="url" placeholder="https://maps.google.com/..." className="w-full p-3 border rounded-lg bg-gray-50 outline-none text-left dir-ltr" value={locationForm.map_link} onChange={e => setLocationForm({...locationForm, map_link: e.target.value})} />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><ImageIcon size={14}/> תמונת פרופיל (URL)</label>
                              <input type="url" placeholder="לינק לתמונה ברשת..." className="w-full p-3 border rounded-lg bg-gray-50 outline-none text-left dir-ltr" value={locationForm.image_url} onChange={e => setLocationForm({...locationForm, image_url: e.target.value})} />
                          </div>
                      </div>

                      <div className="border-t pt-4 mt-4">
                          <div className="flex justify-between items-center mb-3">
                              <label className="block text-sm font-bold text-purple-800 flex items-center gap-1"><Layers size={16}/> שדות מותאמים אישית</label>
                              {!showFieldAdder && (
                                  <button type="button" onClick={() => setShowFieldAdder(true)} className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200">+ הוסף שדה</button>
                              )}
                          </div>

                          {/* בניית שדה חדש */}
                          {showFieldAdder && (
                              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-4 flex gap-2 items-end">
                                  <div className="flex-1">
                                      <label className="text-xs font-bold text-purple-700 mb-1 block">שם השדה (למשל: תעודת אחריות)</label>
                                      <input type="text" className="w-full p-2 border rounded bg-white text-sm" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                                  </div>
                                  <div className="w-1/3">
                                      <label className="text-xs font-bold text-purple-700 mb-1 block">סוג השדה</label>
                                      <select className="w-full p-2 border rounded bg-white text-sm" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})}>
                                          <option value="text">כתב חופשי (טקסט)</option>
                                          <option value="number">מספרים</option>
                                          <option value="file">קובץ / מסמך</option>
                                          <option value="media">תמונה / מדיה</option>
                                      </select>
                                  </div>
                                  <button type="button" onClick={handleAddDynamicField} className="bg-purple-600 text-white p-2.5 rounded hover:bg-purple-700"><Plus size={16}/></button>
                                  <button type="button" onClick={() => setShowFieldAdder(false)} className="bg-gray-200 text-gray-600 p-2.5 rounded hover:bg-gray-300"><X size={16}/></button>
                              </div>
                          )}

                          {/* רשימת השדות שהתווספו */}
                          <div className="space-y-2">
                              {locationForm.dynamic_fields.length === 0 && !showFieldAdder && <p className="text-xs text-gray-400 text-center italic">לא הוגדרו שדות מותאמים אישית למיקום זה.</p>}
                              {locationForm.dynamic_fields.map((field) => (
                                  <div key={field.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border text-sm">
                                      <div className="flex items-center gap-2 font-medium text-gray-700">
                                          <span className="w-2 h-2 rounded-full bg-purple-400"></span> {field.name}
                                          <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase">{field.type}</span>
                                      </div>
                                      <button type="button" onClick={() => removeDynamicField(field.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-4 border-t bg-gray-50 shrink-0">
                      <button type="button" onClick={handleSaveLocation} className="w-full py-3 bg-[#714B67] text-white rounded-xl font-bold shadow-md hover:opacity-90">שמור כרטיסיית מיקום</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ConfigurationTab;