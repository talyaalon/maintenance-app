import React, { useState, useEffect } from 'react';
import { Building2, Users, MapPin, Tag, Box, Shield, X, Pencil, Trash2, Loader2, Plus, Settings } from 'lucide-react';

const BASE = 'https://maintenance-app-staging.onrender.com';

// ─── Confirm delete modal ─────────────────────────────────────────────────────
const ConfirmDeleteModal = ({ message, onConfirm, onCancel, t }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-scale-in">
            <p className="text-gray-800 font-medium text-center mb-6">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">
                    {t?.cancel || 'Cancel'}
                </button>
                <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">
                    {t?.delete_btn || 'Delete'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Section card with optional Add button ────────────────────────────────────
const SectionCard = ({ icon: Icon, title, items, renderItem, emptyLabel, onAdd }) => (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-slate-50">
            <Icon size={16} className="text-[#714B67]" />
            <h3 className="text-sm font-bold text-slate-700">{title}</h3>
            <span className="ml-auto text-xs font-semibold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                {(items ?? []).length}
            </span>
            {onAdd && (
                <button
                    onClick={onAdd}
                    className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#714B67] text-white text-[10px] font-bold hover:bg-[#5a3b52] transition"
                >
                    <Plus size={11} /> Add
                </button>
            )}
        </div>
        <div className="divide-y divide-gray-100">
            {(items ?? []).length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400 italic">{emptyLabel}</p>
            ) : (
                (items ?? []).map((item, idx) => (
                    <div key={item?.id ?? idx} className="px-4 py-2.5 text-sm text-slate-700">
                        {renderItem(item)}
                    </div>
                ))
            )}
        </div>
    </div>
);

// ─── Row action buttons ────────────────────────────────────────────────────────
const RowActions = ({ onEdit, onDelete, onSettings, settingsOpen }) => (
    <div className="ml-auto flex items-center gap-1 shrink-0">
        <button
            onClick={onSettings}
            className={`p-1 rounded-lg transition ${settingsOpen ? 'bg-[#714B67] text-white' : 'hover:bg-gray-100 text-gray-400'}`}
            title="Permissions"
        >
            <Settings size={12} />
        </button>
        <button onClick={onEdit} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <Pencil size={12} />
        </button>
        <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition">
            <Trash2 size={12} />
        </button>
    </div>
);

// ─── Permission Accordion ─────────────────────────────────────────────────────
const PermissionAccordion = ({ permForm, setPermForm, onSave, onClose, saving, t }) => (
    <div className="mt-2 pt-3 border-t border-[#714B67]/10 space-y-3 animate-fade-in bg-[#fdf4ff]/60 rounded-b-xl -mx-4 px-4 pb-3">
        <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider">Permissions</p>

        {/* Language toggles */}
        <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Languages</p>
            <div className="flex gap-2">
                {[
                    { key: 'allowed_lang_he', label: '🇮🇱 HE' },
                    { key: 'allowed_lang_en', label: '🇺🇸 EN' },
                    { key: 'allowed_lang_th', label: '🇹🇭 TH' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setPermForm(p => ({ ...p, [key]: !p[key] }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${permForm[key] ? 'bg-[#714B67] text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>

        {/* Permission toggles */}
        <div className="space-y-2">
            {[
                { key: 'auto_approve_tasks',   label: t?.perm_auto_approve  || 'Auto-approve tasks' },
                { key: 'stuck_skip_approval',  label: t?.perm_stuck_skip    || 'Stuck task skip approval' },
                { key: 'can_manage_fields',    label: t?.perm_manage_fields || 'Can manage fields' },
            ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer gap-2">
                    <span className="text-xs text-gray-600">{label}</span>
                    <button
                        type="button"
                        onClick={() => setPermForm(p => ({ ...p, [key]: !p[key] }))}
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${permForm[key] ? 'bg-[#714B67]' : 'bg-gray-200'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${permForm[key] ? 'translate-x-4' : ''}`} />
                    </button>
                </label>
            ))}
        </div>

        <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                {t?.cancel || 'Cancel'}
            </button>
            <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-1.5 text-xs bg-[#714B67] text-white rounded-lg font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-1"
            >
                {saving && <Loader2 size={10} className="animate-spin" />}
                {t?.save || 'Save'}
            </button>
        </div>
    </div>
);

// ─── User Modal (Add / Edit) ──────────────────────────────────────────────────
const UserModal = ({ editUser, role, parentManagerId, token, t, onClose, onSaved }) => {
    const isEdit = !!editUser;
    const [form, setForm] = useState({
        full_name_en: editUser?.full_name_en || editUser?.full_name || '',
        full_name_he: editUser?.full_name_he || '',
        email: editUser?.email || '',
        password: '',
        phone: editUser?.phone || '',
        preferred_language: editUser?.preferred_language || 'en',
        line_user_id: editUser?.line_user_id || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.full_name_en?.trim() || !form.email?.trim()) { alert('Name and email are required'); return; }
        if (!isEdit && !form.password?.trim()) { alert('Password is required for new users'); return; }
        setSaving(true);
        try {
            const payload = {
                full_name: form.full_name_en,
                full_name_en: form.full_name_en,
                full_name_he: form.full_name_he || undefined,
                email: form.email.toLowerCase(),
                phone: form.phone || undefined,
                preferred_language: form.preferred_language,
                line_user_id: form.line_user_id || undefined,
                role,
            };
            if (!isEdit) { payload.password = form.password; payload.parent_manager_id = parentManagerId; }
            if (form.password?.trim() && isEdit) payload.password = form.password;

            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `${BASE}/users/${editUser.id}` : `${BASE}/users`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving user'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    const roleLabel = role === 'COMPANY_MANAGER' ? 'Manager' : 'Employee';
    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-200 animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800">{isEdit ? `Edit ${roleLabel}` : `Add ${roleLabel}`}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                    {[
                        { label: 'Name (EN) *', key: 'full_name_en', type: 'text' },
                        { label: 'Name (HE)', key: 'full_name_he', type: 'text' },
                        { label: 'Email *', key: 'email', type: 'email' },
                        { label: isEdit ? 'Password (blank = keep current)' : 'Password *', key: 'password', type: 'password' },
                        { label: 'Phone', key: 'phone', type: 'text' },
                        { label: 'LINE User ID', key: 'line_user_id', type: 'text' },
                    ].map(({ label, key, type }) => (
                        <div key={key}>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
                            <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                                className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-sm transition" />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Language</label>
                        <select value={form.preferred_language} onChange={e => set('preferred_language', e.target.value)}
                            className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-[#714B67]">
                            <option value="en">English</option>
                            <option value="he">Hebrew</option>
                            <option value="th">Thai</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">{t?.cancel || 'Cancel'}</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#714B67] text-white rounded-xl font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {t?.save || 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Location Modal ────────────────────────────────────────────────────────────
const LocationModal = ({ editLocation, createdBy, token, t, onClose, onSaved }) => {
    const isEdit = !!editLocation;
    const [form, setForm] = useState({
        name_en: editLocation?.name_en || editLocation?.name || '',
        name_he: editLocation?.name_he || '',
        name_th: editLocation?.name_th || '',
        address: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        if (editLocation?.coordinates) {
            try {
                const coords = typeof editLocation.coordinates === 'string'
                    ? JSON.parse(editLocation.coordinates)
                    : editLocation.coordinates;
                setForm(p => ({ ...p, address: coords?.link || '' }));
            } catch {}
        }
    }, []);

    const handleSave = async () => {
        if (!form.name_en?.trim() && !form.name_he?.trim()) { alert('Name is required'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name_en', form.name_en);
            fd.append('name_he', form.name_he);
            fd.append('name_th', form.name_th);
            fd.append('map_link', form.address);
            fd.append('dynamic_fields', JSON.stringify([]));
            if (!isEdit) fd.append('created_by', createdBy);
            if (imageFile) fd.append('main_image', imageFile);
            else if (editLocation?.image_url) fd.append('existing_image', editLocation.image_url);

            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `${BASE}/locations/${editLocation.id}` : `${BASE}/locations`;
            const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving location'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-200 animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Location' : 'Add Location'}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    {[
                        { label: 'Name (EN) *', key: 'name_en' },
                        { label: 'Name (HE)', key: 'name_he' },
                        { label: 'Name (TH)', key: 'name_th' },
                        { label: 'Address / Map Link', key: 'address' },
                    ].map(({ label, key }) => (
                        <div key={key}>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
                            <input type="text" value={form[key]} onChange={e => set(key, e.target.value)}
                                className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-sm transition" />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Image (optional)</label>
                        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#fdf4ff] file:text-[#714B67] cursor-pointer" />
                        {editLocation?.image_url && !imageFile && (
                            <img src={editLocation.image_url} alt="" className="mt-2 h-10 rounded-lg object-contain border border-gray-200" />
                        )}
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">{t?.cancel || 'Cancel'}</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#714B67] text-white rounded-xl font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {t?.save || 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Category Modal ────────────────────────────────────────────────────────────
const CategoryModal = ({ editCategory, createdBy, token, t, onClose, onSaved }) => {
    const isEdit = !!editCategory;
    const [form, setForm] = useState({
        name_en: editCategory?.name_en || editCategory?.name || '',
        name_he: editCategory?.name_he || '',
        name_th: editCategory?.name_th || '',
        code: editCategory?.code || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.name_en?.trim() && !form.name_he?.trim()) { alert('Name is required'); return; }
        if (!form.code?.trim()) { alert('Code is required (3 chars max)'); return; }
        setSaving(true);
        try {
            const payload = {
                name_en: form.name_en, name_he: form.name_he, name_th: form.name_th,
                code: form.code.toUpperCase().slice(0, 3),
                created_by: createdBy,
            };
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `${BASE}/categories/${editCategory.id}` : `${BASE}/categories`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving category'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-200 animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Category' : 'Add Category'}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    {[
                        { label: 'Name (EN) *', key: 'name_en' },
                        { label: 'Name (HE)', key: 'name_he' },
                        { label: 'Name (TH)', key: 'name_th' },
                    ].map(({ label, key }) => (
                        <div key={key}>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
                            <input type="text" value={form[key]} onChange={e => set(key, e.target.value)}
                                className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-sm transition" />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Code (3 chars) *</label>
                        <input type="text" value={form.code} maxLength={3}
                            onChange={e => set('code', e.target.value.toUpperCase().slice(0, 3))}
                            className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-sm transition font-mono" />
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">{t?.cancel || 'Cancel'}</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#714B67] text-white rounded-xl font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {t?.save || 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Asset Modal ───────────────────────────────────────────────────────────────
const AssetModal = ({ editAsset, createdBy, categories, locations, token, t, onClose, onSaved }) => {
    const isEdit = !!editAsset;
    const [form, setForm] = useState({
        name_en: editAsset?.name_en || editAsset?.name || '',
        name_he: editAsset?.name_he || '',
        name_th: editAsset?.name_th || '',
        category_id: editAsset?.category_id ? String(editAsset.category_id) : '',
        location_id: editAsset?.location_id ? String(editAsset.location_id) : '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.name_en?.trim() && !form.name_he?.trim()) { alert('Name is required'); return; }
        if (!form.category_id) { alert('Category is required'); return; }
        setSaving(true);
        try {
            const payload = {
                name_en: form.name_en, name_he: form.name_he, name_th: form.name_th,
                category_id: form.category_id,
                location_id: form.location_id || null,
                created_by: createdBy,
            };
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `${BASE}/assets/${editAsset.id}` : `${BASE}/assets`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving asset'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-200 animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Asset' : 'Add Asset'}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    {[
                        { label: 'Name (EN) *', key: 'name_en' },
                        { label: 'Name (HE)', key: 'name_he' },
                        { label: 'Name (TH)', key: 'name_th' },
                    ].map(({ label, key }) => (
                        <div key={key}>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
                            <input type="text" value={form[key]} onChange={e => set(key, e.target.value)}
                                className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-sm transition" />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Category *</label>
                        <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                            className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-[#714B67]">
                            <option value="">Select category…</option>
                            {(categories ?? []).map(c => (
                                <option key={c.id} value={String(c.id)}>{c.name_en || c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Location (optional)</label>
                        <select value={form.location_id} onChange={e => set('location_id', e.target.value)}
                            className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-[#714B67]">
                            <option value="">None</option>
                            {(locations ?? []).map(l => (
                                <option key={l.id} value={String(l.id)}>{l.name_en || l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">{t?.cancel || 'Cancel'}</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#714B67] text-white rounded-xl font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {t?.save || 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main COMPANY_MANAGER Settings Tab ────────────────────────────────────────
export default function CompanyManagerSettingsTab({ t, user, token, lang }) {
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    // CRUD modal state
    const [userModal, setUserModal] = useState(null);       // { role, user? }
    const [locationModal, setLocationModal] = useState(null); // {} | { loc }
    const [categoryModal, setCategoryModal] = useState(null); // {} | { cat }
    const [assetModal, setAssetModal] = useState(null);       // {} | { asset }
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id, name }

    // Permission accordion state
    const [openPermissionId, setOpenPermissionId] = useState(null);
    const [permForm, setPermForm] = useState({});
    const [permSaving, setPermSaving] = useState(false);

    const openPermission = (u) => {
        if (openPermissionId === u.id) { setOpenPermissionId(null); return; }
        setOpenPermissionId(u.id);
        setPermForm({
            auto_approve_tasks:  u.auto_approve_tasks  ?? false,
            stuck_skip_approval: u.stuck_skip_approval ?? false,
            allowed_lang_he:     u.allowed_lang_he     !== false,
            allowed_lang_en:     u.allowed_lang_en     !== false,
            allowed_lang_th:     u.allowed_lang_th     !== false,
            can_manage_fields:   u.can_manage_fields    !== false,
        });
    };

    const savePermissions = async (u) => {
        setPermSaving(true);
        try {
            const res = await fetch(`${BASE}/users/${u.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    full_name: u.full_name_en || u.full_name,
                    email: u.email,
                    role: u.role,
                    ...permForm,
                }),
            });
            if (res.ok) { fetchData(); setOpenPermissionId(null); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving permissions'); }
        } catch { alert('Server error'); }
        setPermSaving(false);
    };

    const fetchData = async () => {
        const headers = { Authorization: `Bearer ${token}` };
        // company_id from the logged-in COMPANY_MANAGER — used as explicit scope param
        const cid = user?.company_id ? `?company_id=${user.company_id}` : '';
        try {
            const [rawUsers, rawLocs, rawCats, rawAssets] = await Promise.all([
                fetch(`${BASE}/users`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${BASE}/locations${cid}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${BASE}/categories${cid}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${BASE}/assets${cid}`, { headers }).then(r => r.json()).catch(() => []),
            ]);
            // Extra client-side guard: keep only users belonging to this company
            const companyUsers = Array.isArray(rawUsers) ? rawUsers : [];
            setUsers(user?.company_id
                ? companyUsers.filter(u => u?.company_id === user.company_id)
                : companyUsers
            );
            setLocations(Array.isArray(rawLocs) ? rawLocs : []);
            setCategories(Array.isArray(rawCats) ? rawCats : []);
            setAssets(Array.isArray(rawAssets) ? rawAssets : []);
        } catch (e) {
            console.error('CompanyManagerSettingsTab fetchData error:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [token, user?.company_id]);

    const managers = (users ?? []).filter(u => u?.role === 'COMPANY_MANAGER');
    const employees = (users ?? []).filter(u => u?.role === 'EMPLOYEE');

    // COMPANY_MANAGER creates resources as themselves
    const createdBy = user?.id ?? null;

    const userName = u => u?.['full_name_' + lang] || u?.full_name_en || u?.full_name || u?.name || '—';
    const itemName = item => item?.['name_' + lang] || item?.name_en || item?.name || '—';

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const { type, id } = deleteConfirm;
        try {
            const res = await fetch(`${BASE}/${type}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchData();
            else alert('Error deleting item. It may be in use.');
        } catch { alert('Server error'); }
        setDeleteConfirm(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#714B67]" />
            </div>
        );
    }

    return (
        <div className="px-3 sm:px-4 pt-3 pb-32 max-w-4xl mx-auto animate-fade-in">

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#714B67]/10 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-[#714B67]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">
                        {user?.company_name || t?.nav_config || 'Settings'}
                    </h2>
                    <p className="text-xs text-gray-400">{t?.company_detail_subtitle || 'Company Dashboard'}</p>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-5 gap-2 mb-5">
                {[
                    { label: t?.managers_label || 'Managers', count: managers.length, icon: Shield },
                    { label: t?.employees_label || 'Employees', count: employees.length, icon: Users },
                    { label: t?.locations_title || 'Locations', count: locations.length, icon: MapPin },
                    { label: t?.categories_title || 'Categories', count: categories.length, icon: Tag },
                    { label: t?.assets_title || 'Assets', count: assets.length, icon: Box },
                ].map(({ label, count, icon: Icon }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
                        <Icon size={16} className="text-[#714B67] mx-auto mb-1" />
                        <p className="text-lg font-bold text-slate-800">{count}</p>
                        <p className="text-[10px] text-gray-400 font-medium leading-tight">{label}</p>
                    </div>
                ))}
            </div>

            {/* Detail sections */}
            <div className="space-y-4">

                {/* ── Managers (COMPANY_MANAGERs) ── */}
                <SectionCard
                    icon={Shield}
                    title={t?.managers_label || 'Managers'}
                    items={managers}
                    emptyLabel={t?.no_managers || 'No managers assigned'}
                    onAdd={() => setUserModal({ role: 'COMPANY_MANAGER' })}
                    renderItem={u => (
                        <>
                            <div className="flex items-center gap-2">
                                {u?.profile_picture_url ? (
                                    <img src={u.profile_picture_url} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-[#714B67]/10 flex items-center justify-center text-[10px] font-bold text-[#714B67] shrink-0">
                                        {(userName(u)[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                <span className="flex-1 min-w-0 truncate">{userName(u)}</span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{u?.role}</span>
                                <RowActions
                                    onSettings={() => openPermission(u)}
                                    settingsOpen={openPermissionId === u?.id}
                                    onEdit={() => setUserModal({ role: u?.role, user: u })}
                                    onDelete={() => setDeleteConfirm({ type: 'users', id: u?.id, name: userName(u) })}
                                />
                            </div>
                            {openPermissionId === u?.id && (
                                <PermissionAccordion
                                    permForm={permForm}
                                    setPermForm={setPermForm}
                                    onSave={() => savePermissions(u)}
                                    onClose={() => setOpenPermissionId(null)}
                                    saving={permSaving}
                                    t={t}
                                />
                            )}
                        </>
                    )}
                />

                {/* ── Employees ── */}
                <SectionCard
                    icon={Users}
                    title={t?.employees_label || 'Employees'}
                    items={employees}
                    emptyLabel={t?.no_employees || 'No employees assigned'}
                    onAdd={() => setUserModal({ role: 'EMPLOYEE' })}
                    renderItem={u => (
                        <>
                            <div className="flex items-center gap-2">
                                {u?.profile_picture_url ? (
                                    <img src={u.profile_picture_url} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                        {(userName(u)[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                <span className="flex-1 min-w-0 truncate">{userName(u)}</span>
                                <RowActions
                                    onSettings={() => openPermission(u)}
                                    settingsOpen={openPermissionId === u?.id}
                                    onEdit={() => setUserModal({ role: 'EMPLOYEE', user: u })}
                                    onDelete={() => setDeleteConfirm({ type: 'users', id: u?.id, name: userName(u) })}
                                />
                            </div>
                            {openPermissionId === u?.id && (
                                <PermissionAccordion
                                    permForm={permForm}
                                    setPermForm={setPermForm}
                                    onSave={() => savePermissions(u)}
                                    onClose={() => setOpenPermissionId(null)}
                                    saving={permSaving}
                                    t={t}
                                />
                            )}
                        </>
                    )}
                />

                {/* ── Locations ── */}
                <SectionCard
                    icon={MapPin}
                    title={t?.locations_title || 'Locations'}
                    items={locations}
                    emptyLabel={t?.no_locations || 'No locations'}
                    onAdd={() => setLocationModal({})}
                    renderItem={l => (
                        <div className="flex items-center gap-2">
                            {l?.image_url ? (
                                <img src={l.image_url} className="w-6 h-6 rounded object-cover shrink-0 border border-gray-200" alt="" />
                            ) : (
                                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                    <MapPin size={12} className="text-gray-400" />
                                </div>
                            )}
                            <span className="flex-1 min-w-0 truncate">{itemName(l)}</span>
                            {l?.code && <span className="text-[10px] text-gray-400 font-mono shrink-0">{l.code}</span>}
                            <RowActions
                                onEdit={() => setLocationModal({ loc: l })}
                                onDelete={() => setDeleteConfirm({ type: 'locations', id: l?.id, name: itemName(l) })}
                            />
                        </div>
                    )}
                />

                {/* ── Categories ── */}
                <SectionCard
                    icon={Tag}
                    title={t?.categories_title || 'Categories'}
                    items={categories}
                    emptyLabel={t?.no_categories || 'No categories'}
                    onAdd={() => setCategoryModal({})}
                    renderItem={c => (
                        <div className="flex items-center gap-2">
                            <span className="flex-1 min-w-0 truncate">{itemName(c)}</span>
                            {c?.code && <span className="text-xs text-gray-400 font-mono shrink-0">{c.code}</span>}
                            <RowActions
                                onEdit={() => setCategoryModal({ cat: c })}
                                onDelete={() => setDeleteConfirm({ type: 'categories', id: c?.id, name: itemName(c) })}
                            />
                        </div>
                    )}
                />

                {/* ── Assets ── */}
                <SectionCard
                    icon={Box}
                    title={t?.assets_title || 'Assets'}
                    items={assets}
                    emptyLabel={t?.no_assets || 'No assets'}
                    onAdd={() => setAssetModal({})}
                    renderItem={a => (
                        <div className="flex items-center gap-2">
                            <span className="flex-1 min-w-0 truncate">{itemName(a)}</span>
                            {a?.code && <span className="text-xs text-gray-400 font-mono shrink-0">{a.code}</span>}
                            <RowActions
                                onEdit={() => setAssetModal({ asset: a })}
                                onDelete={() => setDeleteConfirm({ type: 'assets', id: a?.id, name: itemName(a) })}
                            />
                        </div>
                    )}
                />
            </div>

            {/* ── CRUD Modals ── */}
            {userModal && (
                <UserModal
                    editUser={userModal.user}
                    role={userModal.role}
                    parentManagerId={createdBy}
                    token={token}
                    t={t}
                    onClose={() => setUserModal(null)}
                    onSaved={fetchData}
                />
            )}
            {locationModal && (
                <LocationModal
                    editLocation={locationModal.loc}
                    createdBy={createdBy}
                    token={token}
                    t={t}
                    onClose={() => setLocationModal(null)}
                    onSaved={fetchData}
                />
            )}
            {categoryModal && (
                <CategoryModal
                    editCategory={categoryModal.cat}
                    createdBy={createdBy}
                    token={token}
                    t={t}
                    onClose={() => setCategoryModal(null)}
                    onSaved={fetchData}
                />
            )}
            {assetModal && (
                <AssetModal
                    editAsset={assetModal.asset}
                    createdBy={createdBy}
                    categories={categories}
                    locations={locations}
                    token={token}
                    t={t}
                    onClose={() => setAssetModal(null)}
                    onSaved={fetchData}
                />
            )}
            {deleteConfirm && (
                <ConfirmDeleteModal
                    message={`Delete "${deleteConfirm?.name}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteConfirm(null)}
                    t={t}
                />
            )}
        </div>
    );
}
