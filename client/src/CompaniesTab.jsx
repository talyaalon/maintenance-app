import { useState, useEffect } from 'react';
import { Building2, Plus, ChevronRight, Users, MapPin, Tag, Box, Shield, Lock, X, Pencil, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

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

// ─── Section card in company detail ──────────────────────────────────────────
const SectionCard = ({ icon: Icon, title, items, renderItem, emptyLabel }) => (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-slate-50">
            <Icon size={16} className="text-[#714B67]" />
            <h3 className="text-sm font-bold text-slate-700">{title}</h3>
            <span className="ml-auto text-xs font-semibold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                {(items ?? []).length}
            </span>
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

// ─── Company detail view ──────────────────────────────────────────────────────
const CompanyDetail = ({ company, token, t, lang, onBack }) => {
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            fetch(`${BASE}/users`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${BASE}/locations`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${BASE}/categories`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${BASE}/assets`, { headers }).then(r => r.json()).catch(() => []),
        ]).then(([rawUsers, rawLocs, rawCats, rawAssets]) => {
            const cid = company?.id;
            setUsers((rawUsers ?? []).filter(u => u?.company_id === cid));
            setLocations((rawLocs ?? []).filter(l => l?.company_id === cid));
            setCategories((rawCats ?? []).filter(c => c?.company_id === cid));
            setAssets((rawAssets ?? []).filter(a => a?.company_id === cid));
            setLoading(false);
        });
    }, [company?.id, token]);

    const managers = (users ?? []).filter(u => u?.role === 'MANAGER' || u?.role === 'SUPERVISOR');
    const employees = (users ?? []).filter(u => u?.role === 'EMPLOYEE');

    const userName = (u) =>
        u?.['full_name_' + lang] || u?.full_name_en || u?.full_name || u?.name || '—';

    const itemName = (item) =>
        item?.['name_' + lang] || item?.name_en || item?.name || '—';

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#714B67]" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                >
                    <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div className="flex items-center gap-3">
                    {company?.profile_image_url ? (
                        <img src={company.profile_image_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#714B67]/10 flex items-center justify-center">
                            <Building2 size={20} className="text-[#714B67]" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{company?.name}</h2>
                        <p className="text-xs text-gray-400">{t?.company_detail_subtitle || 'Company Dashboard'}</p>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-5 gap-2 mb-5">
                {[
                    { label: t?.managers_label || 'Managers', count: (managers ?? []).length, icon: Shield },
                    { label: t?.employees_label || 'Employees', count: (employees ?? []).length, icon: Users },
                    { label: t?.locations_title || 'Locations', count: (locations ?? []).length, icon: MapPin },
                    { label: t?.categories_title || 'Categories', count: (categories ?? []).length, icon: Tag },
                    { label: t?.assets_title || 'Assets', count: (assets ?? []).length, icon: Box },
                ].map(({ label, count, icon: Icon }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
                        <Icon size={16} className="text-[#714B67] mx-auto mb-1" />
                        <p className="text-lg font-bold text-slate-800">{count}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                    </div>
                ))}
            </div>

            {/* Detail sections */}
            <div className="space-y-4">
                <SectionCard
                    icon={Shield}
                    title={t?.managers_label || 'Managers'}
                    items={managers}
                    emptyLabel={t?.no_managers || 'No managers assigned'}
                    renderItem={u => (
                        <div className="flex items-center gap-2">
                            {u?.profile_picture_url ? (
                                <img src={u.profile_picture_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-[#714B67]/10 flex items-center justify-center text-[10px] font-bold text-[#714B67]">
                                    {(userName(u)[0] || '?').toUpperCase()}
                                </div>
                            )}
                            <span>{userName(u)}</span>
                            <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{u?.role}</span>
                        </div>
                    )}
                />

                <SectionCard
                    icon={Users}
                    title={t?.employees_label || 'Employees'}
                    items={employees}
                    emptyLabel={t?.no_employees || 'No employees assigned'}
                    renderItem={u => (
                        <div className="flex items-center gap-2">
                            {u?.profile_picture_url ? (
                                <img src={u.profile_picture_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                    {(userName(u)[0] || '?').toUpperCase()}
                                </div>
                            )}
                            <span>{userName(u)}</span>
                        </div>
                    )}
                />

                {/* ── Permissions (manager language access) ── */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-slate-50">
                        <Lock size={16} className="text-[#714B67]" />
                        <h3 className="text-sm font-bold text-slate-700">{t?.permissions_label || 'Permissions'}</h3>
                        <span className="ml-auto text-xs font-semibold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                            {(managers ?? []).length}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {(managers ?? []).length === 0 ? (
                            <p className="px-4 py-3 text-xs text-gray-400 italic">{t?.no_managers || 'No managers assigned'}</p>
                        ) : (managers ?? []).map((mgr, idx) => (
                            <div key={mgr?.id ?? idx} className="px-4 py-2.5">
                                <p className="text-sm font-semibold text-slate-700 mb-1">{userName(mgr)}</p>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { key: 'allowed_lang_he', label: '🇮🇱 HE' },
                                        { key: 'allowed_lang_en', label: '🇺🇸 EN' },
                                        { key: 'allowed_lang_th', label: '🇹🇭 TH' },
                                    ].map(({ key, label }) => (
                                        <span
                                            key={key}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                mgr?.[key] !== false
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                            }`}
                                        >
                                            {label}
                                        </span>
                                    ))}
                                    {mgr?.auto_approve_tasks && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                                            {t?.auto_approve_label || 'Auto-Approve'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <SectionCard
                    icon={MapPin}
                    title={t?.locations_title || 'Locations'}
                    items={locations}
                    emptyLabel={t?.no_locations || 'No locations'}
                    renderItem={l => <span>{itemName(l)}</span>}
                />

                <SectionCard
                    icon={Tag}
                    title={t?.categories_title || 'Categories'}
                    items={categories}
                    emptyLabel={t?.no_categories || 'No categories'}
                    renderItem={c => <span>{itemName(c)}</span>}
                />

                <SectionCard
                    icon={Box}
                    title={t?.assets_title || 'Assets'}
                    items={assets}
                    emptyLabel={t?.no_assets || 'No assets'}
                    renderItem={a => (
                        <div className="flex items-center justify-between">
                            <span>{itemName(a)}</span>
                            {a?.code && <span className="text-xs text-gray-400">{a.code}</span>}
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

// ─── Create / Edit company modal ──────────────────────────────────────────────
const CompanyModal = ({ company, token, t, onClose, onSaved }) => {
    const [name, setName] = useState(company?.name ?? '');
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { alert(t?.company_name_required || 'Company name is required'); return; }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            if (imageFile) formData.append('profile_image', imageFile);
            if (company?.profile_image_url) formData.append('existing_image', company.profile_image_url);

            const method = company ? 'PUT' : 'POST';
            const url = company ? `${BASE}/companies/${company.id}` : `${BASE}/companies`;
            const res = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json(); alert(d?.error || 'Error saving company'); }
        } catch (e) { console.error(e); alert(t?.server_error || 'Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800">
                        {company ? (t?.edit_company || 'Edit Company') : (t?.create_company || 'Create Company')}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                            {t?.company_name_label || 'Company Name'} <span className="text-red-400">*</span>
                        </label>
                        <input
                            className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none transition"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t?.company_name_placeholder || 'e.g. Acme Corp'}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                            {t?.company_logo_label || 'Logo (optional)'}
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#fdf4ff] file:text-[#714B67] hover:file:bg-[#714B67]/10 cursor-pointer"
                        />
                        {company?.profile_image_url && !imageFile && (
                            <img src={company.profile_image_url} alt="" className="mt-2 h-10 rounded-lg object-contain border border-gray-200" />
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">
                        {t?.cancel || 'Cancel'}
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#714B67] text-white rounded-xl font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {t?.save || 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main CompaniesTab ────────────────────────────────────────────────────────
const CompaniesTab = ({ token, t, user, lang }) => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BASE}/companies`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setCompanies(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('fetchCompanies error:', e);
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCompanies(); }, [token]);

    const handleDelete = async (company) => {
        try {
            const res = await fetch(`${BASE}/companies/${company.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchCompanies();
            else alert(t?.error_delete || 'Error deleting company');
        } catch (e) { console.error(e); }
        setDeleteConfirm(null);
    };

    // ── Company detail view ──
    if (selectedCompany) {
        return (
            <div className="p-4 pb-6">
                <CompanyDetail
                    company={selectedCompany}
                    token={token}
                    t={t}
                    lang={lang}
                    onBack={() => setSelectedCompany(null)}
                />
            </div>
        );
    }

    // ── Company list ──
    return (
        <div className="p-4 pb-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 size={20} className="text-[#714B67]" />
                        {t?.companies_tab || 'Companies'}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">{t?.companies_subtitle || 'Manage all your tenant companies'}</p>
                </div>
                <button
                    onClick={() => { setEditingCompany(null); setShowModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#714B67] text-white rounded-xl text-sm font-bold hover:bg-[#5a3b52] transition active:scale-95 shadow-sm"
                >
                    <Plus size={16} />
                    {t?.create_company_btn || 'New Company'}
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-[#714B67]" />
                </div>
            ) : (companies ?? []).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t?.no_companies || 'No companies yet'}</p>
                    <p className="text-sm mt-1">{t?.create_first_company || 'Create your first company to get started'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {(companies ?? []).map(company => (
                        <div
                            key={company?.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden"
                        >
                            <button
                                className="w-full flex items-center gap-3 p-4 text-left"
                                onClick={() => setSelectedCompany(company)}
                            >
                                {company?.profile_image_url ? (
                                    <img src={company.profile_image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-[#714B67]/10 flex items-center justify-center shrink-0">
                                        <Building2 size={22} className="text-[#714B67]" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 truncate">{company?.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {t?.company_id_label || 'ID'}: {company?.id}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 shrink-0" />
                            </button>

                            {/* Actions */}
                            <div className="flex border-t border-gray-100">
                                <button
                                    onClick={() => { setEditingCompany(company); setShowModal(true); }}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                                >
                                    <Pencil size={13} />
                                    {t?.edit_btn || 'Edit'}
                                </button>
                                <div className="w-px bg-gray-100" />
                                <button
                                    onClick={() => setDeleteConfirm(company)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-50 transition"
                                >
                                    <Trash2 size={13} />
                                    {t?.delete_btn || 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {showModal && (
                <CompanyModal
                    company={editingCompany}
                    token={token}
                    t={t}
                    onClose={() => { setShowModal(false); setEditingCompany(null); }}
                    onSaved={fetchCompanies}
                />
            )}
            {deleteConfirm && (
                <ConfirmDeleteModal
                    message={`${t?.confirm_delete_company || 'Delete company'} "${deleteConfirm?.name}"?`}
                    onConfirm={() => handleDelete(deleteConfirm)}
                    onCancel={() => setDeleteConfirm(null)}
                    t={t}
                />
            )}
        </div>
    );
};

export default CompaniesTab;
