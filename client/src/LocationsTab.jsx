import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Pencil, MapPin, Plus, X, Save, Navigation } from 'lucide-react';

const API = 'https://maintenance-app-h84v.onrender.com';
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const emptyForm = () => ({ name_he: '', name_en: '', name_th: '', address: '' });

const LocationsTab = ({ token, t, user, lang = 'en' }) => {
    const [locations, setLocations] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newLoc, setNewLoc] = useState(emptyForm());

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(emptyForm());

    const [isGeolocating, setIsGeolocating] = useState(false);
    const [isGeolocatingEdit, setIsGeolocatingEdit] = useState(false);

    // Refs for Google Places Autocomplete inputs
    const addAddressRef = useRef(null);
    const editAddressRef = useRef(null);
    const mapsScriptLoaded = useRef(false);

    const getLocName = (loc) => loc['name_' + lang] || loc.name_en || loc.name_he || loc.name || '—';

    // ── Load Google Maps script once ──────────────────────────────────────────
    useEffect(() => {
        if (mapsScriptLoaded.current || !MAPS_KEY) return;
        if (window.google?.maps?.places) { mapsScriptLoaded.current = true; return; }

        const script = document.createElement('script');
        script.id = 'gmaps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => { mapsScriptLoaded.current = true; };
        document.head.appendChild(script);
    }, []);

    // ── Init autocomplete for the ADD form ────────────────────────────────────
    useEffect(() => {
        if (!isAdding) return;
        const tryInit = () => {
            if (!window.google?.maps?.places || !addAddressRef.current) return;
            const ac = new window.google.maps.places.Autocomplete(addAddressRef.current, { types: ['geocode'] });
            ac.addListener('place_changed', () => {
                const place = ac.getPlace();
                setNewLoc(prev => ({ ...prev, address: place.formatted_address || addAddressRef.current.value }));
            });
        };
        // Small delay to let the DOM render and script load
        const timer = setTimeout(tryInit, 300);
        return () => clearTimeout(timer);
    }, [isAdding]);

    // ── Init autocomplete for the EDIT inline form ────────────────────────────
    useEffect(() => {
        if (!editingId) return;
        const tryInit = () => {
            if (!window.google?.maps?.places || !editAddressRef.current) return;
            const ac = new window.google.maps.places.Autocomplete(editAddressRef.current, { types: ['geocode'] });
            ac.addListener('place_changed', () => {
                const place = ac.getPlace();
                setEditForm(prev => ({ ...prev, address: place.formatted_address || editAddressRef.current.value }));
            });
        };
        const timer = setTimeout(tryInit, 300);
        return () => clearTimeout(timer);
    }, [editingId]);

    // ── Reverse-geocode lat/lng to a readable address ─────────────────────────
    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}`
            );
            const data = await res.json();
            return data.results?.[0]?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } catch {
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    };

    const handleUseCurrentLocation = async (mode) => {
        if (!navigator.geolocation) { alert(t.geolocation_not_supported || 'Geolocation not supported'); return; }
        mode === 'add' ? setIsGeolocating(true) : setIsGeolocatingEdit(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const address = await reverseGeocode(coords.latitude, coords.longitude);
                if (mode === 'add') {
                    setNewLoc(prev => ({ ...prev, address }));
                    if (addAddressRef.current) addAddressRef.current.value = address;
                    setIsGeolocating(false);
                } else {
                    setEditForm(prev => ({ ...prev, address }));
                    if (editAddressRef.current) editAddressRef.current.value = address;
                    setIsGeolocatingEdit(false);
                }
            },
            () => {
                alert(t.geolocation_error || 'Could not get your location');
                mode === 'add' ? setIsGeolocating(false) : setIsGeolocatingEdit(false);
            }
        );
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const fetchLocations = async () => {
        try {
            const res = await fetch(`${API}/locations`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setLocations(data);
        } catch (err) { console.error('Error fetching locations', err); }
    };

    useEffect(() => { fetchLocations(); }, []);

    const handleAddLocation = async () => {
        if (!newLoc.name_en && !newLoc.name_he) {
            alert(t.location_name_required || 'Please enter at least a Hebrew or English name');
            return;
        }
        try {
            const res = await fetch(`${API}/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name_he: newLoc.name_he,
                    name_en: newLoc.name_en,
                    name_th: newLoc.name_th,
                    map_link: newLoc.address,
                }),
            });
            if (res.ok) {
                setNewLoc(emptyForm());
                setIsAdding(false);
                fetchLocations();
            } else {
                const d = await res.json();
                alert(d.error || t.error_adding_location || 'Error adding location');
            }
        } catch { alert(t.server_error || 'Server error'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.confirm_delete_location || 'Delete this location?')) return;
        try {
            await fetch(`${API}/locations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            fetchLocations();
        } catch { alert(t.error_deleting_location || 'Error deleting'); }
    };

    const startEdit = (loc) => {
        let parsedAddress = '';
        try { parsedAddress = (typeof loc.coordinates === 'string' ? JSON.parse(loc.coordinates) : loc.coordinates)?.link || ''; } catch {}
        setEditingId(loc.id);
        setEditForm({
            name_he: loc.name_he || '',
            name_en: loc.name_en || loc.name || '',
            name_th: loc.name_th || '',
            address: parsedAddress,
        });
    };

    const saveEdit = async () => {
        if (!editForm.name_en && !editForm.name_he) {
            alert(t.location_name_required || 'Please enter at least a Hebrew or English name');
            return;
        }
        try {
            const res = await fetch(`${API}/locations/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name_he: editForm.name_he,
                    name_en: editForm.name_en,
                    name_th: editForm.name_th,
                    map_link: editForm.address,
                }),
            });
            if (res.ok) { setEditingId(null); fetchLocations(); }
            else { alert(t.error_updating_location || 'Error updating'); }
        } catch { alert(t.server_error || 'Server error'); }
    };

    // ── Shared address field component (inline JSX helper) ────────────────────
    const AddressField = ({ inputRef, value, onChange, isLoading, mode }) => (
        <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500">
                {t.address_label || 'Address / Location'}
            </label>
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    dir="ltr"
                    defaultValue={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={t.address_placeholder || 'Start typing an address…'}
                    className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <button
                    type="button"
                    onClick={() => handleUseCurrentLocation(mode)}
                    disabled={isLoading}
                    title={t.use_current_location || 'Use current location'}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60 shrink-0"
                >
                    {isLoading
                        ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full inline-block" />
                        : <Navigation size={14} />}
                    <span className="hidden sm:inline">{t.use_current_location_short || 'GPS'}</span>
                </button>
            </div>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-4 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{t.nav_locations || 'Locations'}</h2>
                <button
                    onClick={() => { setIsAdding(!isAdding); setNewLoc(emptyForm()); }}
                    className="bg-[#714B67] text-white px-4 py-2 rounded-full shadow flex items-center gap-2 text-sm hover:opacity-90 transition"
                >
                    {isAdding ? <X size={18} /> : <Plus size={18} />}
                    {isAdding ? (t.cancel || 'Cancel') : (t.add_location_btn || 'Add')}
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 mb-4 space-y-3">
                    <h3 className="font-bold text-gray-700">{t.add_location_title || 'New Location'}</h3>

                    {/* Multilingual name inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                            dir="rtl"
                            value={newLoc.name_he}
                            onChange={e => setNewLoc({ ...newLoc, name_he: e.target.value })}
                            placeholder={t.name_he_placeholder || 'שם בעברית'}
                            className="p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                        <input
                            dir="ltr"
                            value={newLoc.name_en}
                            onChange={e => setNewLoc({ ...newLoc, name_en: e.target.value })}
                            placeholder={t.name_en_placeholder || 'Name in English'}
                            className="p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                        <input
                            dir="ltr"
                            value={newLoc.name_th}
                            onChange={e => setNewLoc({ ...newLoc, name_th: e.target.value })}
                            placeholder={t.name_th_placeholder || 'ชื่อภาษาไทย'}
                            className="p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                    </div>

                    {/* Google Maps address */}
                    <AddressField
                        inputRef={addAddressRef}
                        value={newLoc.address}
                        onChange={v => setNewLoc({ ...newLoc, address: v })}
                        isLoading={isGeolocating}
                        mode="add"
                    />

                    <div className="flex gap-2 pt-1">
                        <button onClick={() => setIsAdding(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">{t.cancel || 'Cancel'}</button>
                        <button onClick={handleAddLocation} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">{t.save || 'Save'}</button>
                    </div>
                </div>
            )}

            {/* Locations list */}
            <div className="grid gap-3">
                {locations.map(loc => (
                    <div key={loc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {loc.image_url ? (
                                    <img src={loc.image_url} alt={getLocName(loc)} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                                ) : (
                                    <div className="bg-blue-50 p-2 rounded-full text-blue-600 shrink-0"><MapPin size={20} /></div>
                                )}

                                {editingId === loc.id ? (
                                    <div className="flex-1 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <input dir="rtl" value={editForm.name_he} onChange={e => setEditForm({ ...editForm, name_he: e.target.value })} placeholder="שם בעברית" className="p-2 border rounded text-sm bg-gray-50 outline-none" />
                                            <input dir="ltr" value={editForm.name_en} onChange={e => setEditForm({ ...editForm, name_en: e.target.value })} placeholder="Name in English" className="p-2 border rounded text-sm bg-gray-50 outline-none" />
                                            <input dir="ltr" value={editForm.name_th} onChange={e => setEditForm({ ...editForm, name_th: e.target.value })} placeholder="ชื่อภาษาไทย" className="p-2 border rounded text-sm bg-gray-50 outline-none" />
                                        </div>
                                        <AddressField
                                            inputRef={editAddressRef}
                                            value={editForm.address}
                                            onChange={v => setEditForm({ ...editForm, address: v })}
                                            isLoading={isGeolocatingEdit}
                                            mode="edit"
                                        />
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"><Save size={14}/> {t.save || 'Save'}</button>
                                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">{t.cancel || 'Cancel'}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{getLocName(loc)}</h3>
                                        {/* Show secondary names */}
                                        {(loc.name_he || loc.name_en || loc.name_th) && (
                                            <p className="text-xs text-gray-400 mt-0.5 flex gap-2 flex-wrap">
                                                {loc.name_he && loc.name_he !== getLocName(loc) && <span dir="rtl">{loc.name_he}</span>}
                                                {loc.name_en && loc.name_en !== getLocName(loc) && <span dir="ltr">{loc.name_en}</span>}
                                                {loc.name_th && loc.name_th !== getLocName(loc) && <span dir="ltr">{loc.name_th}</span>}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t.created_by_label || 'Created by'}: {loc.creator_name || '—'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {editingId !== loc.id && (
                                <div className="flex gap-2 shrink-0 ml-2">
                                    <button onClick={() => startEdit(loc)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-full"><Pencil size={16} /></button>
                                    <button onClick={() => handleDelete(loc.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {locations.length === 0 && !isAdding && (
                <div className="text-center text-gray-400 mt-10">
                    <MapPin size={40} className="mx-auto mb-2 opacity-30" />
                    <p>{t.no_locations_yet || 'No locations yet.'}</p>
                </div>
            )}
        </div>
    );
};

export default LocationsTab;
