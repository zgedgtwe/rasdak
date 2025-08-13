import React, { useState } from 'react';
import { Profile, Transaction, Project, User, ViewType, ProjectStatusConfig, SubStatusConfig } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PencilIcon, PlusIcon, Trash2Icon, KeyIcon, UsersIcon, ListIcon, FolderKanbanIcon } from '../constants';
import { NAV_ITEMS } from '../constants';

// Helper Component for Toggle Switches
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; id?: string }> = ({ enabled, onChange, id }) => (
    <button
      type="button"
      id={id}
      className={`${enabled ? 'bg-brand-accent' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-surface`}
      onClick={onChange}
    >
      <span
        className={`${enabled ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );

// Reusable UI component for managing a list of categories
const CategoryManager: React.FC<{
    title: string;
    categories: string[];
    inputValue: string;
    onInputChange: (value: string) => void;
    onAddOrUpdate: () => void;
    onEdit: (value: string) => void;
    onDelete: (value: string) => void;
    editingValue: string | null;
    onCancelEdit: () => void;
    placeholder: string;
}> = ({ title, categories, inputValue, onInputChange, onAddOrUpdate, onEdit, onDelete, editingValue, onCancelEdit, placeholder }) => {
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onAddOrUpdate();
        }
    };

    const renderCategoryItem = (category: string) => (
        <div key={category} className="flex items-center justify-between p-2.5 bg-brand-bg rounded-md">
            <span className="text-sm text-brand-text-primary">{category}</span>
            <div className="flex items-center space-x-2">
                <button type="button" onClick={() => onEdit(category)} className="p-1 text-brand-text-secondary hover:text-brand-accent" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                <button type="button" onClick={() => onDelete(category)} className="p-1 text-brand-text-secondary hover:text-brand-danger" title="Hapus"><Trash2Icon className="w-4 h-4" /></button>
            </div>
        </div>
    );

    return (
        <div>
            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3 mb-4">{title}</h3>
            <div className="flex gap-2 mb-4">
                 <div className="input-group flex-grow !mt-0">
                    <input
                        type="text"
                        id={`input-${title.replace(/\s/g, '')}`}
                        value={inputValue}
                        onChange={e => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder=" "
                        className="input-field"
                    />
                    <label htmlFor={`input-${title.replace(/\s/g, '')}`} className="input-label">{placeholder}</label>
                </div>
                <button onClick={onAddOrUpdate} className="button-primary h-fit mt-2">{editingValue ? 'Update' : 'Tambah'}</button>
                {editingValue && <button onClick={onCancelEdit} className="button-secondary h-fit mt-2">Batal</button>}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories.map(cat => renderCategoryItem(cat))}
            </div>
        </div>
    );
};

// --- Sub-component for Project Status Management ---
const ProjectStatusManager: React.FC<{
    config: ProjectStatusConfig[];
    onConfigChange: (newConfig: ProjectStatusConfig[]) => void;
    projects: Project[];
}> = ({ config, onConfigChange, projects }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedStatus, setSelectedStatus] = useState<ProjectStatusConfig | null>(null);
    
    const initialFormState = {
        name: '',
        color: '#64748b',
        note: '',
        subStatuses: [] as SubStatusConfig[],
    };
    const [form, setForm] = useState(initialFormState);

    const handleOpenModal = (mode: 'add' | 'edit', status?: ProjectStatusConfig) => {
        setModalMode(mode);
        if (mode === 'edit' && status) {
            setSelectedStatus(status);
            setForm({
                name: status.name,
                color: status.color,
                note: status.note,
                subStatuses: [...status.subStatuses],
            });
        } else {
            setSelectedStatus(null);
            setForm(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleSubStatusChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newSubStatuses = [...form.subStatuses];
        newSubStatuses[index] = { ...newSubStatuses[index], [name]: value };
        setForm(prev => ({ ...prev, subStatuses: newSubStatuses }));
    };

    const addSubStatus = () => {
        setForm(prev => ({...prev, subStatuses: [...prev.subStatuses, { name: '', note: '' }] }));
    };

    const removeSubStatus = (index: number) => {
        const newSubStatuses = [...form.subStatuses];
        newSubStatuses.splice(index, 1);
        setForm(prev => ({ ...prev, subStatuses: newSubStatuses }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            const newStatus: ProjectStatusConfig = {
                id: `status_${Date.now()}`,
                ...form,
                subStatuses: form.subStatuses.filter(s => s.name.trim() !== '')
            };
            onConfigChange([...config, newStatus]);
        } else if (selectedStatus) {
            const updatedConfig = config.map(s => 
                s.id === selectedStatus.id ? { ...s, ...form, subStatuses: form.subStatuses.filter(sub => sub.name.trim() !== '') } : s
            );
            onConfigChange(updatedConfig);
        }
        handleCloseModal();
    };

    const handleDelete = (statusId: string) => {
        const status = config.find(s => s.id === statusId);
        if (!status) return;

        const isUsed = projects.some(p => p.status === status.name);
        if (isUsed) {
            alert(`Status "${status.name}" tidak dapat dihapus karena sedang digunakan oleh proyek.`);
            return;
        }

        if (window.confirm(`Yakin ingin menghapus status "${status.name}"?`)) {
            onConfigChange(config.filter(s => s.id !== statusId));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-brand-text-light">Manajemen Status Proyek</h3>
                <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5"/> Tambah Status
                </button>
            </div>
            <div className="space-y-4">
                {config.map(status => (
                    <div key={status.id} className="p-4 bg-brand-bg rounded-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></span>
                                <span className="font-semibold text-brand-text-light">{status.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenModal('edit', status)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(status.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><Trash2Icon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        {status.subStatuses.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-brand-border/50 pl-7 space-y-2">
                                {status.subStatuses.map((sub, index) => (
                                    <div key={index}><p className="text-sm font-medium text-brand-text-primary">{sub.name}</p><p className="text-xs text-brand-text-secondary">{sub.note}</p></div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah Status Baru' : `Edit Status: ${selectedStatus?.name}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="input-group md:col-span-2"><input type="text" id="name" name="name" value={form.name} onChange={handleFormChange} className="input-field" required placeholder=" "/><label htmlFor="name" className="input-label">Nama Status</label></div>
                        <div className="input-group"><input type="color" id="color" name="color" value={form.color} onChange={handleFormChange} className="input-field !p-1 h-12"/><label htmlFor="color" className="input-label">Warna</label></div>
                    </div>
                    <div className="input-group"><textarea id="note" name="note" value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} className="input-field" rows={2} placeholder=" "/><label htmlFor="note" className="input-label">Catatan/Deskripsi Status</label></div>
                    
                    <div>
                        <h4 className="text-base font-semibold text-brand-text-light mb-2">Sub-Status</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {form.subStatuses.map((sub, index) => (
                                <div key={index} className="p-3 bg-brand-bg rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                    <div className="input-group !mt-0"><input type="text" name="name" value={sub.name} onChange={e => handleSubStatusChange(index, e)} placeholder="Nama Sub-Status" className="input-field !p-2 !text-sm"/></div>
                                    <div className="flex items-center gap-2">
                                        <div className="input-group flex-grow !mt-0"><input type="text" name="note" value={sub.note} onChange={e => handleSubStatusChange(index, e)} placeholder="Catatan" className="input-field !p-2 !text-sm"/></div>
                                        <button type="button" onClick={() => removeSubStatus(index)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full"><Trash2Icon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addSubStatus} className="text-sm font-semibold text-brand-accent hover:underline mt-2">+ Tambah Sub-Status</button>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Status' : 'Update Status'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

interface SettingsProps {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    transactions: Transaction[];
    projects: Project[];
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentUser: User | null;
}

const emptyUserForm = { 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: 'Member' as 'Admin' | 'Member',
    permissions: [] as ViewType[],
};

const Settings: React.FC<SettingsProps> = ({ profile, setProfile, transactions, projects, users, setUsers, currentUser }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [showSuccess, setShowSuccess] = useState(false);

    // State for category management
    const [incomeCategoryInput, setIncomeCategoryInput] = useState('');
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<string | null>(null);
    const [expenseCategoryInput, setExpenseCategoryInput] = useState('');
    const [editingExpenseCategory, setEditingExpenseCategory] = useState<string | null>(null);
    const [projectTypeInput, setProjectTypeInput] = useState('');
    const [editingProjectType, setEditingProjectType] = useState<string | null>(null);
    const [eventTypeInput, setEventTypeInput] = useState('');
    const [editingEventType, setEditingEventType] = useState<string | null>(null);
    const [sopCategoryInput, setSopCategoryInput] = useState('');
    const [editingSopCategory, setEditingSopCategory] = useState<string | null>(null);
    
    // State for user management
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userModalMode, setUserModalMode] = useState<'add' | 'edit'>('add');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [userFormError, setUserFormError] = useState('');


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleNotificationChange = (key: keyof Profile['notificationSettings']) => {
        setProfile(p => ({
            ...p,
            notificationSettings: {
                ...p.notificationSettings,
                [key]: !p.notificationSettings[key]
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    }
    
    // --- User Management Handlers ---
    const handleOpenUserModal = (mode: 'add' | 'edit', user: User | null = null) => {
        setUserModalMode(mode);
        setSelectedUser(user);
        if (mode === 'edit' && user) {
            setUserForm({
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                password: '',
                confirmPassword: '',
                permissions: user.permissions || [],
            });
        } else {
            setUserForm(emptyUserForm);
        }
        setUserFormError('');
        setIsUserModalOpen(true);
    };

    const handleCloseUserModal = () => {
        setIsUserModalOpen(false);
        setSelectedUser(null);
        setUserForm(emptyUserForm);
        setUserFormError('');
    };

    const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePermissionsChange = (view: ViewType, checked: boolean) => {
        setUserForm(prev => {
            const currentPermissions = new Set(prev.permissions);
            if (checked) {
                currentPermissions.add(view);
            } else {
                currentPermissions.delete(view);
            }
            return { ...prev, permissions: Array.from(currentPermissions) };
        });
    };
    
    const handleUserFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setUserFormError('');

        if (userForm.password && userForm.password !== userForm.confirmPassword) {
            setUserFormError('Konfirmasi kata sandi tidak cocok.');
            return;
        }

        if (userModalMode === 'add') {
            if (!userForm.email || !userForm.password || !userForm.fullName) {
                setUserFormError('Nama, email, dan kata sandi wajib diisi.');
                return;
            }
            if (users.some(u => u.email === userForm.email)) {
                setUserFormError('Email sudah digunakan.');
                return;
            }
            const newUser: User = {
                id: `USR${Date.now()}`,
                fullName: userForm.fullName,
                email: userForm.email,
                password: userForm.password,
                role: userForm.role,
                permissions: userForm.role === 'Member' ? userForm.permissions : undefined,
            };
            setUsers(prev => [...prev, newUser]);
        } else if (userModalMode === 'edit' && selectedUser) {
            if (users.some(u => u.email === userForm.email && u.id !== selectedUser.id)) {
                setUserFormError('Email sudah digunakan oleh pengguna lain.');
                return;
            }
            setUsers(prev => prev.map(u => {
                if (u.id === selectedUser.id) {
                    const updatedUser: User = {
                        ...u,
                        fullName: userForm.fullName,
                        email: userForm.email,
                        role: userForm.role,
                        permissions: userForm.role === 'Member' ? userForm.permissions : undefined,
                    };
                    if (userForm.password) {
                        updatedUser.password = userForm.password;
                    }
                    return updatedUser;
                }
                return u;
            }));
        }
        handleCloseUserModal();
    };

    const handleDeleteUser = (userId: string) => {
        if (userId === currentUser?.id) {
            alert("Anda tidak dapat menghapus akun Anda sendiri.");
            return;
        }
        if (window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
            setUsers(prev => prev.filter(u => u.id !== userId));
        }
    };
    
    // --- Category Management Handlers ---
    const handleAddOrUpdateIncomeCategory = () => {
        if (!incomeCategoryInput.trim()) return;
        const newCategory = incomeCategoryInput.trim();
        const categories = profile.incomeCategories || [];

        if (editingIncomeCategory) { // Update
            if (newCategory !== editingIncomeCategory && categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, incomeCategories: categories.map(c => c === editingIncomeCategory ? newCategory : c).sort() }));
            setEditingIncomeCategory(null);
        } else { // Add
            if (categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, incomeCategories: [...categories, newCategory].sort() }));
        }
        setIncomeCategoryInput('');
    };

    const handleEditIncomeCategory = (category: string) => { setEditingIncomeCategory(category); setIncomeCategoryInput(category); };
    const handleDeleteIncomeCategory = (category: string) => {
        const isCategoryInUse = transactions.some(t => t.category === category && t.type === 'Pemasukan');
        if (isCategoryInUse) {
            alert(`Kategori "${category}" tidak dapat dihapus karena sedang digunakan dalam transaksi.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus kategori "${category}"?`)) {
            setProfile(prev => ({ ...prev, incomeCategories: (prev.incomeCategories || []).filter(c => c !== category) }));
        }
    };
    
    const handleAddOrUpdateExpenseCategory = () => {
        if (!expenseCategoryInput.trim()) return;
        const newCategory = expenseCategoryInput.trim();
        const categories = profile.expenseCategories || [];
        if (editingExpenseCategory) {
            if (newCategory !== editingExpenseCategory && categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, expenseCategories: categories.map(c => c === editingExpenseCategory ? newCategory : c).sort() }));
            setEditingExpenseCategory(null);
        } else {
            if (categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, expenseCategories: [...categories, newCategory].sort() }));
        }
        setExpenseCategoryInput('');
    };
    
    const handleEditExpenseCategory = (category: string) => { setEditingExpenseCategory(category); setExpenseCategoryInput(category); };
    const handleDeleteExpenseCategory = (category: string) => {
        const isCategoryInUse = transactions.some(t => t.category === category && t.type === 'Pengeluaran');
        if (isCategoryInUse) {
            alert(`Kategori "${category}" tidak dapat dihapus karena sedang digunakan dalam transaksi.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus kategori "${category}"?`)) {
            setProfile(prev => ({ ...prev, expenseCategories: (prev.expenseCategories || []).filter(c => c !== category) }));
        }
    };

    const handleAddOrUpdateProjectType = () => {
        if (!projectTypeInput.trim()) return;
        const newType = projectTypeInput.trim();
        const types = profile.projectTypes || [];
        if (editingProjectType) {
            if (newType !== editingProjectType && types.includes(newType)) {
                alert('Jenis proyek ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, projectTypes: types.map(t => t === editingProjectType ? newType : t).sort() }));
            setEditingProjectType(null);
        } else {
            if (types.includes(newType)) {
                alert('Jenis proyek ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, projectTypes: [...types, newType].sort() }));
        }
        setProjectTypeInput('');
    };

    const handleEditProjectType = (type: string) => { setEditingProjectType(type); setProjectTypeInput(type); };
    const handleDeleteProjectType = (type: string) => {
        const isTypeInUse = projects.some(p => p.projectType === type);
        if (isTypeInUse) {
            alert(`Jenis proyek "${type}" tidak dapat dihapus karena sedang digunakan.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus jenis proyek "${type}"?`)) {
            setProfile(prev => ({ ...prev, projectTypes: (prev.projectTypes || []).filter(t => t !== type) }));
        }
    };

    const handleAddOrUpdateEventType = () => {
        if (!eventTypeInput.trim()) return;
        const newType = eventTypeInput.trim();
        const types = profile.eventTypes || [];
        if (editingEventType) {
            if (newType !== editingEventType && types.includes(newType)) {
                alert('Jenis acara ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, eventTypes: types.map(t => t === editingEventType ? newType : t).sort() }));
            setEditingEventType(null);
        } else {
            if (types.includes(newType)) {
                alert('Jenis acara ini sudah ada.'); return;
            }
            setProfile(prev => ({ ...prev, eventTypes: [...types, newType].sort() }));
        }
        setEventTypeInput('');
    };
    const handleEditEventType = (type: string) => { setEditingEventType(type); setEventTypeInput(type); };
    const handleDeleteEventType = (type: string) => {
        const isTypeInUse = projects.some(p => p.clientName === 'Acara Internal' && p.projectType === type);
        if (isTypeInUse) {
            alert(`Jenis acara "${type}" tidak dapat dihapus karena sedang digunakan di kalender.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus jenis acara "${type}"?`)) {
            setProfile(prev => ({ ...prev, eventTypes: (prev.eventTypes || []).filter(t => t !== type) }));
        }
    };

    const handleAddOrUpdateSopCategory = () => {
        if (!sopCategoryInput.trim()) return;
        const newCat = sopCategoryInput.trim();
        const cats = profile.sopCategories || [];
        if (editingSopCategory) {
            if (newCat !== editingSopCategory && cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            setProfile(prev => ({ ...prev, sopCategories: cats.map(c => c === editingSopCategory ? newCat : c).sort() }));
            setEditingSopCategory(null);
        } else {
            if (cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            setProfile(prev => ({ ...prev, sopCategories: [...cats, newCat].sort() }));
        }
        setSopCategoryInput('');
    };
    const handleEditSopCategory = (cat: string) => { setEditingSopCategory(cat); setSopCategoryInput(cat); };
    const handleDeleteSopCategory = (cat: string) => {
        // Not checking for usage in SOPs for now to keep it simple.
        if (window.confirm(`Yakin ingin menghapus kategori SOP "${cat}"?`)) {
            setProfile(prev => ({ ...prev, sopCategories: (prev.sopCategories || []).filter(c => c !== cat) }));
        }
    };
    
    const tabs = [
        { id: 'profile', label: 'Profil Saya', icon: UsersIcon, adminOnly: false },
        { id: 'users', label: 'Pengguna', icon: KeyIcon, adminOnly: true },
        { id: 'categories', label: 'Kustomisasi Kategori', icon: ListIcon, adminOnly: false },
        { id: 'projectStatus', label: 'Status Proyek', icon: FolderKanbanIcon, adminOnly: true },
    ];

    const renderTabContent = () => {
        switch(activeTab) {
            case 'profile':
                 return (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3">Informasi Publik</h3>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="input-group"><input id="fullName" type="text" name="fullName" value={profile.fullName} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="fullName" className="input-label">Nama Lengkap</label></div>
                                    <div className="input-group"><input id="companyName" type="text" name="companyName" value={profile.companyName} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="companyName" className="input-label">Nama Perusahaan</label></div>
                                    <div className="input-group"><input id="email" type="email" name="email" value={profile.email} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="email" className="input-label">Email</label></div>
                                    <div className="input-group"><input id="phone" type="tel" name="phone" value={profile.phone} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="phone" className="input-label">Telepon</label></div>
                                    <div className="input-group"><input id="website" type="url" name="website" value={profile.website} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="website" className="input-label">Website</label></div>
                                </div>
                                <div className="input-group"><input id="address" type="text" name="address" value={profile.address} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="address" className="input-label">Alamat</label></div>
                                <div className="input-group"><input id="bankAccount" type="text" name="bankAccount" value={profile.bankAccount} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="bankAccount" className="input-label">Rekening Bank</label></div>
                                <div className="input-group"><input id="authorizedSigner" type="text" name="authorizedSigner" value={profile.authorizedSigner} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="authorizedSigner" className="input-label">Nama Penanggung Jawab Tanda Tangan (u/ QR Code)</label></div>
                                <div className="input-group"><textarea id="bio" name="bio" value={profile.bio} onChange={handleInputChange} className="input-field" placeholder=" " rows={3}></textarea><label htmlFor="bio" className="input-label">Bio Perusahaan</label></div>
                                <div className="input-group"><textarea id="briefingTemplate" name="briefingTemplate" value={profile.briefingTemplate} onChange={handleInputChange} className="input-field" placeholder=" " rows={3}></textarea><label htmlFor="briefingTemplate" className="input-label">Template Pesan Briefing Tim</label></div>
                                <div className="input-group"><textarea id="termsAndConditions" name="termsAndConditions" value={profile.termsAndConditions || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={15}></textarea><label htmlFor="termsAndConditions" className="input-label">Syarat & Ketentuan</label></div>
                            </div>

                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3 mt-8">Notifikasi</h3>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <div className="flex justify-between items-center"><label htmlFor="notif-newProject">Proyek Baru Dibuat</label><ToggleSwitch id="notif-newProject" enabled={profile.notificationSettings.newProject} onChange={() => handleNotificationChange('newProject')} /></div>
                                <div className="flex justify-between items-center"><label htmlFor="notif-paymentConfirmation">Konfirmasi Pembayaran Diterima</label><ToggleSwitch id="notif-paymentConfirmation" enabled={profile.notificationSettings.paymentConfirmation} onChange={() => handleNotificationChange('paymentConfirmation')} /></div>
                                <div className="flex justify-between items-center"><label htmlFor="notif-deadlineReminder">Pengingat Deadline Proyek</label><ToggleSwitch id="notif-deadlineReminder" enabled={profile.notificationSettings.deadlineReminder} onChange={() => handleNotificationChange('deadlineReminder')} /></div>
                            </div>

                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3 mt-8">Keamanan</h3>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <div className="flex justify-between items-center"><label htmlFor="security-2fa">Autentikasi Dua Faktor (2FA)</label><ToggleSwitch id="security-2fa" enabled={profile.securitySettings.twoFactorEnabled} onChange={() => setProfile(p => ({ ...p, securitySettings: { ...p.securitySettings, twoFactorEnabled: !p.securitySettings.twoFactorEnabled } }))} /></div>
                            </div>

                            <div className="text-right mt-8 pt-6 border-t border-gray-700/50">
                                <button type="submit" className="button-primary relative">
                                    Simpan Perubahan
                                    {showSuccess && <span className="absolute -right-4 -top-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-fade-in-out">✓</span>}
                                </button>
                            </div>
                        </div>
                    </form>
                );
            case 'users':
                if (currentUser?.role !== 'Admin') return <p>Anda tidak memiliki akses ke halaman ini.</p>;
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-brand-text-light">Manajemen Pengguna</h3>
                            <button onClick={() => handleOpenUserModal('add')} className="button-primary inline-flex items-center gap-2"><PlusIcon className="w-5 h-5"/>Tambah Pengguna</button>
                        </div>
                        <div className="space-y-3">
                            {users.map(user => (
                                <div key={user.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{user.fullName}</p>
                                        <p className="text-sm text-brand-text-secondary">{user.email} - <span className="font-medium">{user.role}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenUserModal('edit', user)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'categories':
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <CategoryManager 
                            title="Kategori Pemasukan"
                            categories={profile.incomeCategories}
                            inputValue={incomeCategoryInput}
                            onInputChange={setIncomeCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateIncomeCategory}
                            onEdit={handleEditIncomeCategory}
                            onDelete={handleDeleteIncomeCategory}
                            editingValue={editingIncomeCategory}
                            onCancelEdit={() => { setEditingIncomeCategory(null); setIncomeCategoryInput(''); }}
                            placeholder="e.g., DP Proyek"
                        />
                         <CategoryManager 
                            title="Kategori Pengeluaran"
                            categories={profile.expenseCategories}
                            inputValue={expenseCategoryInput}
                            onInputChange={setExpenseCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateExpenseCategory}
                            onEdit={handleEditExpenseCategory}
                            onDelete={handleDeleteExpenseCategory}
                            editingValue={editingExpenseCategory}
                            onCancelEdit={() => { setEditingExpenseCategory(null); setExpenseCategoryInput(''); }}
                            placeholder="e.g., Gaji Freelancer"
                        />
                         <CategoryManager 
                            title="Jenis Proyek"
                            categories={profile.projectTypes}
                            inputValue={projectTypeInput}
                            onInputChange={setProjectTypeInput}
                            onAddOrUpdate={handleAddOrUpdateProjectType}
                            onEdit={handleEditProjectType}
                            onDelete={handleDeleteProjectType}
                            editingValue={editingProjectType}
                            onCancelEdit={() => { setEditingProjectType(null); setProjectTypeInput(''); }}
                            placeholder="e.g., Pernikahan"
                        />
                          <CategoryManager 
                            title="Jenis Acara Internal"
                            categories={profile.eventTypes}
                            inputValue={eventTypeInput}
                            onInputChange={setEventTypeInput}
                            onAddOrUpdate={handleAddOrUpdateEventType}
                            onEdit={handleEditEventType}
                            onDelete={handleDeleteEventType}
                            editingValue={editingEventType}
                            onCancelEdit={() => { setEditingEventType(null); setEventTypeInput(''); }}
                            placeholder="e.g., Meeting Klien"
                        />
                        <CategoryManager
                            title="Kategori SOP"
                            categories={profile.sopCategories}
                            inputValue={sopCategoryInput}
                            onInputChange={setSopCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateSopCategory}
                            onEdit={handleEditSopCategory}
                            onDelete={handleDeleteSopCategory}
                            editingValue={editingSopCategory}
                            onCancelEdit={() => { setEditingSopCategory(null); setSopCategoryInput(''); }}
                            placeholder="e.g., Fotografi"
                        />
                    </div>
                );
            case 'projectStatus':
                 if (currentUser?.role !== 'Admin') return <p>Anda tidak memiliki akses ke halaman ini.</p>;
                return (
                    <ProjectStatusManager
                        config={profile.projectStatusConfig}
                        onConfigChange={(newConfig) => {
                            setProfile(p => ({ ...p, projectStatusConfig: newConfig }));
                        }}
                        projects={projects}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Pengaturan" subtitle="Kelola profil, pengguna, dan kustomisasi aplikasi Anda." />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1">
                    <nav className="space-y-1 sticky top-24">
                        {tabs
                            .filter(tab => !(tab.adminOnly && currentUser?.role !== 'Admin'))
                            .map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 text-left ${
                                        activeTab === tab.id
                                            ? 'bg-brand-accent text-white'
                                            : 'text-brand-text-secondary hover:bg-brand-input hover:text-brand-text-light'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5 mr-3" />
                                    {tab.label}
                                </button>
                        ))}
                    </nav>
                </aside>
                <main className="lg:col-span-3 bg-brand-surface p-6 rounded-2xl shadow-lg min-h-[60vh]">
                    {renderTabContent()}
                </main>
            </div>
    
            <Modal isOpen={isUserModalOpen} onClose={handleCloseUserModal} title={userModalMode === 'add' ? 'Tambah Pengguna Baru' : 'Edit Pengguna'}>
                <form onSubmit={handleUserFormSubmit} className="space-y-4">
                    {userFormError && <p className="text-sm text-brand-danger bg-brand-danger/10 p-2 rounded-md">{userFormError}</p>}
                    <div className="input-group">
                        <input type="text" id="userFullName" name="fullName" value={userForm.fullName} onChange={handleUserFormChange} className="input-field" placeholder=" " required />
                        <label htmlFor="userFullName" className="input-label">Nama Lengkap</label>
                    </div>
                    <div className="input-group">
                        <input type="email" id="userEmail" name="email" value={userForm.email} onChange={handleUserFormChange} className="input-field" placeholder=" " required />
                        <label htmlFor="userEmail" className="input-label">Email</label>
                    </div>
                    <div className="input-group">
                        <input type="password" id="userPassword" name="password" value={userForm.password} onChange={handleUserFormChange} className="input-field" placeholder=" " required={userModalMode === 'add'} />
                        <label htmlFor="userPassword" className="input-label">{userModalMode === 'add' ? 'Kata Sandi' : 'Kata Sandi Baru (kosongkan jika tidak berubah)'}</label>
                    </div>
                     <div className="input-group">
                        <input type="password" id="userConfirmPassword" name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserFormChange} className="input-field" placeholder=" " required={!!userForm.password} />
                        <label htmlFor="userConfirmPassword" className="input-label">Konfirmasi Kata Sandi</label>
                    </div>
                    <div className="input-group">
                        <select id="userRole" name="role" value={userForm.role} onChange={handleUserFormChange} className="input-field">
                            <option value="Member">Member</option>
                            <option value="Admin">Admin</option>
                        </select>
                        <label htmlFor="userRole" className="input-label">Role</label>
                    </div>

                    {userForm.role === 'Member' && (
                        <div className="pt-4 border-t border-brand-border">
                            <h4 className="font-semibold text-brand-text-light mb-2">Hak Akses Halaman</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto">
                                {NAV_ITEMS.filter(item => item.view !== ViewType.DASHBOARD && item.view !== ViewType.SETTINGS).map(item => (
                                    <label key={item.view} className="flex items-center gap-2 p-1">
                                        <input
                                            type="checkbox"
                                            checked={userForm.permissions.includes(item.view)}
                                            onChange={(e) => handlePermissionsChange(item.view, e.target.checked)}
                                        />
                                        <span className="text-sm">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                        <button type="button" onClick={handleCloseUserModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{userModalMode === 'add' ? 'Simpan Pengguna' : 'Update Pengguna'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Settings;
