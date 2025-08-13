
import React, { useState, useMemo } from 'react';
import { SocialMediaPost, PostStatus, PostType, Project } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import { PlusIcon, CalendarIcon, CheckSquareIcon, Share2Icon, PencilIcon, ChevronLeftIcon, ChevronRightIcon, LayoutGridIcon } from '../constants';

const formatShortDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

const getStatusColorClass = (status: PostStatus) => {
    switch(status) {
        case PostStatus.DRAFT: return 'border-gray-500';
        case PostStatus.SCHEDULED: return 'border-blue-500';
        case PostStatus.POSTED: return 'border-green-500';
        case PostStatus.CANCELED: return 'border-red-500';
        default: return 'border-gray-500';
    }
}

const getPlatformIcon = (platform: 'Instagram' | 'TikTok' | 'Website') => {
    if (platform === 'Instagram') return '📷';
    if (platform === 'TikTok') return '🎵';
    if (platform === 'Website') return '🌐';
    return '🔗';
};

const initialFormState: Omit<SocialMediaPost, 'id' | 'clientName' | 'platform'> = {
    projectId: '',
    postType: PostType.INSTAGRAM_FEED,
    scheduledDate: new Date().toISOString().split('T')[0],
    caption: '',
    mediaUrl: '',
    status: PostStatus.DRAFT,
    notes: '',
};

// --- New Calendar View Component ---
const PostCalendarView: React.FC<{
    posts: SocialMediaPost[];
    onPostClick: (post: SocialMediaPost) => void;
    onDayClick: (date: Date) => void;
}> = ({ posts, onPostClick, onDayClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const daysInMonth = useMemo(() => {
        const days = [];
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const endDate = new Date(lastDayOfMonth);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        let date = startDate;
        while (date <= endDate) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentDate]);

    const postsByDate = useMemo(() => {
        const map = new Map<string, SocialMediaPost[]>();
        posts.forEach(post => {
            if (post.status === PostStatus.SCHEDULED || post.status === PostStatus.POSTED) {
                const dateKey = new Date(post.scheduledDate).toDateString();
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(post);
            }
        });
        return map;
    }, [posts]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());
    
    const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return (
        <div className="bg-brand-surface p-4 rounded-2xl shadow-lg border border-brand-border">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-brand-input"><ChevronLeftIcon className="w-5 h-5"/></button>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-brand-input"><ChevronRightIcon className="w-5 h-5"/></button>
                    <h2 className="text-lg font-semibold text-brand-text-light ml-2">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                </div>
                <button onClick={handleToday} className="button-secondary px-3 py-1.5 text-sm">Hari Ini</button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {weekdays.map(day => <div key={day} className="text-center py-2 text-xs font-bold text-brand-text-secondary border-b border-l border-brand-border">{day}</div>)}
                {daysInMonth.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const events = postsByDate.get(day.toDateString()) || [];
                    return (
                        <div key={i} onClick={() => onDayClick(day)} className={`relative border-t border-l border-brand-border p-1.5 flex flex-col min-h-[120px] ${isCurrentMonth ? 'bg-brand-surface' : 'bg-brand-bg'} cursor-pointer hover:bg-brand-input transition-colors`}>
                            <span className={`text-xs font-semibold self-start mb-1 ${isCurrentMonth ? 'text-brand-text-light' : 'text-brand-text-secondary/50'} ${isToday ? 'bg-brand-accent text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>{day.getDate()}</span>
                            <div className="flex-grow space-y-1 overflow-hidden">
                                {events.slice(0, 3).map(event => (
                                    <div key={event.id} onClick={(e) => { e.stopPropagation(); onPostClick(event); }} className="text-xs p-1 rounded text-white truncate cursor-pointer" style={{ backgroundColor: event.status === PostStatus.POSTED ? '#16a34a' : '#3b82f6' }}>
                                        <p className="font-semibold truncate">{event.clientName}</p>
                                    </div>
                                ))}
                                {events.length > 3 && (
                                    <p className="text-xs text-brand-text-secondary text-center mt-1">+{events.length - 3} lagi</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface SocialPlannerProps {
    posts: SocialMediaPost[];
    setPosts: React.Dispatch<React.SetStateAction<SocialMediaPost[]>>;
    projects: Project[];
    showNotification: (message: string) => void;
}

const SocialPlanner: React.FC<SocialPlannerProps> = ({ posts, setPosts, projects, showNotification }) => {
    const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
    const [formData, setFormData] = useState(initialFormState);

    const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');
    const [activeFilter, setActiveFilter] = useState<PostStatus | 'all'>('all');

    const stats = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const scheduledThisMonth = posts.filter(p => {
            const scheduledDate = new Date(p.scheduledDate);
            return p.status === PostStatus.SCHEDULED && scheduledDate >= startOfMonth && scheduledDate <= endOfMonth;
        }).length;
        
        const inDraft = posts.filter(p => p.status === PostStatus.DRAFT).length;
        const postedTotal = posts.filter(p => p.status === PostStatus.POSTED).length;

        return { scheduledThisMonth, inDraft, postedTotal };
    }, [posts]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, postId: string) => {
        e.dataTransfer.setData("postId", postId);
        setDraggedPostId(postId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: PostStatus) => {
        e.preventDefault();
        const postId = e.dataTransfer.getData("postId");
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p));
        setDraggedPostId(null);
        setActiveFilter('all'); // Reset filter after dropping
        const post = posts.find(p => p.id === postId);
        if (post) {
            showNotification(`Post untuk "${post.clientName}" dipindahkan ke "${newStatus}".`);
        }
    };

    const handleOpenModal = (mode: 'add' | 'edit', post?: SocialMediaPost) => {
        setModalMode(mode);
        if (mode === 'edit' && post) {
            setSelectedPost(post);
            const { clientName, platform, ...rest } = post;
            setFormData(rest);
        } else {
            setSelectedPost(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.projectId) {
            alert('Harap pilih proyek terlebih dahulu.');
            return;
        }

        const project = projects.find(p => p.id === formData.projectId);
        if (!project) {
            alert('Proyek tidak valid.');
            return;
        }

        let platform: SocialMediaPost['platform'] = 'Instagram';
        if (formData.postType === PostType.TIKTOK) platform = 'TikTok';
        if (formData.postType === PostType.BLOG) platform = 'Website';

        const postData: Omit<SocialMediaPost, 'id'> = {
            ...formData,
            clientName: project.clientName,
            platform,
        };

        if (modalMode === 'add') {
            const newPost = { ...postData, id: `SMP${Date.now()}` };
            setPosts(prev => [...prev, newPost]);
            showNotification('Postingan baru berhasil ditambahkan ke draf.');
        } else if (selectedPost) {
            const updatedPost = { ...postData, id: selectedPost.id };
            setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
            showNotification('Postingan berhasil diperbarui.');
        }
        handleCloseModal();
    };
    
    const handleDelete = (postId: string) => {
        if(window.confirm('Yakin ingin menghapus postingan ini?')) {
            setPosts(prev => prev.filter(p => p.id !== postId));
            showNotification('Postingan berhasil dihapus.');
            handleCloseModal();
        }
    }
    
    const handleDayClick = (date: Date) => {
        handleOpenModal('add');
        setFormData({
            ...initialFormState,
            scheduledDate: date.toISOString().split('T')[0]
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Perencana Media Sosial" subtitle="Rencanakan, kelola, dan lacak semua postingan media sosial Anda.">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-brand-bg rounded-lg flex items-center h-fit">
                        <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><LayoutGridIcon className="w-5 h-5"/> Papan</button>
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><CalendarIcon className="w-5 h-5"/> Kalender</button>
                    </div>
                    <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2"><PlusIcon className="w-5 h-5" /> Buat Postingan</button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <button onClick={() => setActiveFilter(p => p === PostStatus.SCHEDULED ? 'all' : PostStatus.SCHEDULED)} className="text-left w-full"><StatCard icon={<CalendarIcon className="w-6 h-6"/>} title="Terjadwal Bulan Ini" value={stats.scheduledThisMonth.toString()} /></button>
                 <button onClick={() => setActiveFilter(p => p === PostStatus.DRAFT ? 'all' : PostStatus.DRAFT)} className="text-left w-full"><StatCard icon={<PencilIcon className="w-6 h-6"/>} title="Dalam Draf" value={stats.inDraft.toString()} /></button>
                 <button onClick={() => setActiveFilter(p => p === PostStatus.POSTED ? 'all' : PostStatus.POSTED)} className="text-left w-full"><StatCard icon={<CheckSquareIcon className="w-6 h-6"/>} title="Total Diposting" value={stats.postedTotal.toString()} /></button>
                 <button onClick={() => setActiveFilter('all')} className="text-left w-full"><StatCard icon={<Share2Icon className="w-6 h-6"/>} title="Tampilkan Semua" value={(posts.length).toString()} /></button>
            </div>

            {viewMode === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {Object.values(PostStatus).map(status => (
                        <div key={status} onDragOver={handleDragOver} onDrop={e => handleDrop(e, status)} className={`w-72 flex-shrink-0 bg-brand-bg rounded-2xl border border-brand-border flex flex-col transition-opacity duration-300 ${activeFilter !== 'all' && activeFilter !== status ? 'opacity-40' : 'opacity-100'}`}>
                            <div className={`p-4 font-semibold text-brand-text-light border-b-2 ${getStatusColorClass(status)} flex justify-between items-center flex-shrink-0`}>
                                <span>{status}</span>
                                <span className="text-sm font-normal bg-brand-surface text-brand-text-secondary px-2.5 py-1 rounded-full">{posts.filter(p => p.status === status).length}</span>
                            </div>
                            <div className="p-3 space-y-3 flex-grow overflow-y-auto h-[calc(100vh-420px)]">
                                {posts.filter(p => p.status === status).map(post => (
                                    <div key={post.id} draggable onDragStart={e => handleDragStart(e, post.id)} onClick={() => handleOpenModal('edit', post)} className={`p-4 bg-brand-surface rounded-xl cursor-grab hover:shadow-xl transition-shadow border-l-4 shadow-lg ${draggedPostId === post.id ? 'opacity-50 ring-2 ring-brand-accent' : 'opacity-100'}`} style={{ borderLeftColor: getStatusColorClass(post.status).replace('border-', '') }}>
                                        <p className="font-semibold text-sm text-brand-text-light">{post.clientName}</p>
                                        <p className="text-xs text-brand-text-secondary mt-1">{getPlatformIcon(post.platform)} {post.postType}</p>
                                        <p className="text-xs text-brand-text-primary mt-2 pt-2 border-t border-brand-border italic truncate">"{post.caption}"</p>
                                        <div className="flex justify-between items-center mt-3 text-xs font-semibold text-brand-text-secondary">
                                            <span>Jadwal: {formatShortDate(post.scheduledDate)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <PostCalendarView posts={posts} onPostClick={(post) => handleOpenModal('edit', post)} onDayClick={handleDayClick}/>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Buat Rencana Postingan Baru' : 'Edit Postingan'} size="2xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="input-group">
                        <select id="projectId" name="projectId" value={formData.projectId} onChange={handleFormChange} className="input-field" required>
                            <option value="">Pilih Proyek Terkait...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                        </select>
                        <label className="input-label">Proyek</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group">
                            <select id="postType" name="postType" value={formData.postType} onChange={handleFormChange} className="input-field" required>
                                {Object.values(PostType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <label className="input-label">Jenis Postingan</label>
                        </div>
                         <div className="input-group">
                            <input type="date" id="scheduledDate" name="scheduledDate" value={formData.scheduledDate} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label className="input-label">Tanggal Jadwal</label>
                        </div>
                    </div>
                    <div className="input-group">
                        <textarea id="caption" name="caption" value={formData.caption} onChange={handleFormChange} className="input-field" placeholder=" " required rows={5}></textarea>
                        <label className="input-label">Caption</label>
                    </div>
                    <div className="input-group">
                        <input type="url" id="mediaUrl" name="mediaUrl" value={formData.mediaUrl || ''} onChange={handleFormChange} className="input-field" placeholder=" "/>
                        <label className="input-label">Tautan Media (Google Drive, dll)</label>
                    </div>
                     <div className="input-group">
                        <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleFormChange} className="input-field" placeholder=" " rows={2}></textarea>
                        <label className="input-label">Catatan Internal (Opsional)</label>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-brand-border">
                        {modalMode === 'edit' && selectedPost && (
                            <button type="button" onClick={() => handleDelete(selectedPost.id)} className="text-brand-danger font-semibold hover:underline">Hapus Postingan</button>
                        )}
                        <div className="flex-grow text-right space-x-2">
                             <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                             <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Draf' : 'Update Postingan'}</button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SocialPlanner;
