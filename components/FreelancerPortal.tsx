import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember, Project, TeamProjectPayment, FreelancerFeedback, Revision, RevisionStatus, PerformanceNoteType, TeamPaymentRecord, RewardLedgerEntry, PerformanceNote, SOP, Profile } from '../types';
import Modal from './Modal';
import { CalendarIcon, CreditCardIcon, MessageSquareIcon, ClockIcon, UsersIcon, FileTextIcon, MapPinIcon, HomeIcon, FolderKanbanIcon, StarIcon, DollarSignIcon, AlertCircleIcon, BookOpenIcon, PrinterIcon, CheckSquareIcon, Share2Icon } from '../constants';
import StatCard from './StatCard';
import SignaturePad from './SignaturePad';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

interface FreelancerPortalProps {
    accessId: string;
    teamMembers: TeamMember[];
    projects: Project[];
    teamProjectPayments: TeamProjectPayment[];
    teamPaymentRecords: TeamPaymentRecord[];
    rewardLedgerEntries: RewardLedgerEntry[];
    showNotification: (message: string) => void;
    onUpdateRevision: (projectId: string, revisionId: string, updatedData: { freelancerNotes: string, driveLink: string, status: RevisionStatus }) => void;
    sops: SOP[];
    profile: Profile;
}

const FreelancerPortal: React.FC<FreelancerPortalProps> = ({ accessId, teamMembers, projects, teamProjectPayments, teamPaymentRecords, rewardLedgerEntries, showNotification, onUpdateRevision, sops, profile }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [slipToView, setSlipToView] = useState<TeamPaymentRecord | null>(null);

    const freelancer = useMemo(() => teamMembers.find(m => m.portalAccessId === accessId), [teamMembers, accessId]);
    const assignedProjects = useMemo(() => projects.filter(p => p.team.some(t => t.memberId === freelancer?.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [projects, freelancer]);
    
    if (!freelancer) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
                <div className="w-full max-w-lg p-8 text-center bg-brand-surface rounded-2xl shadow-lg">
                    <h1 className="text-2xl font-bold text-brand-danger">Portal Tidak Ditemukan</h1>
                    <p className="mt-4 text-brand-text-primary">Tautan yang Anda gunakan tidak valid. Silakan hubungi admin.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'dashboard', label: 'Dasbor', icon: HomeIcon },
        { id: 'projects', label: 'Proyek & Revisi', icon: FolderKanbanIcon },
        { id: 'payments', label: 'Pembayaran', icon: CreditCardIcon },
        { id: 'performance', label: 'Kinerja', icon: StarIcon },
        { id: 'sop', label: 'SOP', icon: BookOpenIcon },
    ];
    
    const renderPaymentSlipBody = (record: TeamPaymentRecord) => {
        if (!freelancer) return null;
        const projectsBeingPaid = teamProjectPayments.filter(p => record.projectPaymentIds.includes(p.id));
    
        return (
            <div id={`payment-slip-content-${record.id}`} className="printable-content bg-white text-black p-6 font-sans">
                <header className="flex justify-between items-start pb-4 border-b border-slate-200">
                    <div><h2 className="text-2xl font-bold text-slate-800">SLIP PEMBAYARAN</h2><p className="text-sm text-slate-500">No: {record.recordNumber}</p></div>
                    <div className="text-right"><h3 className="font-bold text-lg text-slate-800">{profile.companyName}</h3></div>
                </header>
                <section className="my-6 space-y-1 text-sm">
                    <p><strong>Dibayarkan Kepada:</strong> {freelancer.name}</p>
                    <p><strong>Nomor Rekening:</strong> {freelancer.noRek}</p>
                    <p><strong>Tanggal Bayar:</strong> {formatDate(record.date)}</p>
                </section>
                <section>
                    <h4 className="font-semibold text-slate-600 mb-2 text-sm">Rincian Proyek:</h4>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 print-bg-slate"><tr><th className="p-2 text-left">Proyek</th><th className="p-2 text-right">Fee</th></tr></thead>
                        <tbody className="divide-y divide-slate-200">
                            {projectsBeingPaid.map(p => (
                                <tr key={p.id}>
                                    <td className="p-2">{projects.find(proj => proj.id === p.projectId)?.projectName || 'N/A'}</td>
                                    <td className="p-2 text-right">{formatCurrency(p.fee)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
                <section className="mt-6 flex justify-end">
                    <div className="w-full sm:w-1/2 md:w-1/3 space-y-2 text-sm text-slate-700">
                        <div className="flex justify-between font-bold text-base border-t border-slate-200 mt-2 pt-2 text-slate-900">
                            <span>TOTAL DIBAYAR</span>
                            <span>{formatCurrency(record.totalAmount)}</span>
                        </div>
                    </div>
                </section>
                <footer className="mt-12 text-xs text-slate-500">
                    <div className="flex justify-between items-end">
                        <p>Terima kasih atas kerja samanya.</p>
                        <div className="text-center">
                            <p>Diverifikasi oleh,</p>
                             {record.vendorSignature ? (
                                <img src={record.vendorSignature} alt="Tanda Tangan" className="h-20 object-contain my-2" />
                            ) : (
                                <div className="h-20 flex items-center justify-center my-2 italic text-gray-400">Belum Ditandatangani</div>
                            )}
                            <p className="font-medium text-slate-900 mt-1 border-t pt-1">({profile.authorizedSigner || profile.companyName})</p>
                        </div>
                    </div>
                </footer>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab freelancer={freelancer} projects={assignedProjects} teamProjectPayments={teamProjectPayments} />;
            case 'projects': return <ProjectsTab projects={assignedProjects} onProjectClick={setSelectedProject} freelancerId={freelancer.id} />;
            case 'payments': return <PaymentsTab freelancer={freelancer} projects={projects} teamProjectPayments={teamProjectPayments} teamPaymentRecords={teamPaymentRecords} onSlipView={setSlipToView} />;
            case 'performance': return <PerformanceTab freelancer={freelancer} />;
            case 'sop': return <SOPsTab sops={sops} assignedProjects={assignedProjects} />;
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text-primary p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 p-6 bg-brand-surface rounded-2xl shadow-lg border border-brand-border widget-animate">
                    <h1 className="text-3xl font-bold text-gradient">Portal Freelancer</h1>
                    <p className="text-lg text-brand-text-secondary mt-2">Selamat Datang, {freelancer.name}!</p>
                </header>
                <div className="border-b border-brand-border mb-6 widget-animate" style={{ animationDelay: '100ms' }}><nav className="-mb-px flex space-x-6 overflow-x-auto">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><tab.icon className="w-5 h-5"/> {tab.label}</button>))}</nav></div>
                <main>{renderTabContent()}</main>
                <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={`Detail Proyek: ${selectedProject?.projectName}`} size="3xl">
                    {selectedProject && <ProjectDetailModal project={selectedProject} freelancer={freelancer} onUpdateRevision={onUpdateRevision} showNotification={showNotification} onClose={() => setSelectedProject(null)} />}
                </Modal>
                <Modal isOpen={!!slipToView} onClose={() => setSlipToView(null)} title={`Slip Pembayaran: ${slipToView?.recordNumber}`} size="3xl">
                    {slipToView && <div className="printable-area">{renderPaymentSlipBody(slipToView)}</div>}
                     <div className="mt-6 text-right non-printable">
                        <button type="button" onClick={() => window.print()} className="button-primary inline-flex items-center gap-2">
                             <PrinterIcon className="w-4 h-4"/> Cetak
                        </button>
                    </div>
                </Modal>
            </div>
        </div>
    );
};


// --- SUB-COMPONENTS ---

const DashboardTab: React.FC<{freelancer: TeamMember, projects: Project[], teamProjectPayments: TeamProjectPayment[]}> = ({ freelancer, projects, teamProjectPayments }) => {
    const stats = useMemo(() => {
        const unpaidFee = teamProjectPayments.filter(p => p.teamMemberId === freelancer.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
        const paidFee = teamProjectPayments.filter(p => p.teamMemberId === freelancer.id && p.status === 'Paid').reduce((sum, p) => sum + p.fee, 0);
        const pendingRevisions = projects.flatMap(p => p.revisions || []).filter(r => r.freelancerId === freelancer.id && r.status === RevisionStatus.PENDING).length;
        const completedProjects = projects.filter(p => p.status === 'Selesai' && p.team.some(t => t.memberId === freelancer.id)).length;

        return { unpaidFee, paidFee, pendingRevisions, completedProjects, activeProjects: projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan').length };
    }, [freelancer, projects, teamProjectPayments]);
    
     const agendaItems = useMemo(() => {
        const revisions: (Revision & { type: 'revision'; projectName: string; projectId: string; date: string; })[] = projects
            .flatMap(p => (p.revisions || []).map(r => ({ ...r, type: 'revision' as const, projectName: p.projectName, projectId: p.id, date: r.deadline })))
            .filter(r => r.freelancerId === freelancer.id && r.status === RevisionStatus.PENDING);
        
        const nextProject = projects
            .filter(p => new Date(p.date) >= new Date() && p.status !== 'Selesai' && p.status !== 'Dibatalkan')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            
        const agenda: (typeof revisions[0] | (Project & { type: 'project' }))[] = [...revisions];
        if (nextProject) {
            agenda.push({ ...nextProject, type: 'project' as const });
        }
            
        return agenda.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [projects, freelancer]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="widget-animate" style={{ animationDelay: '200ms' }}><StatCard icon={<CreditCardIcon className="w-6 h-6"/>} title="Total Fee Diterima" value={formatCurrency(stats.paidFee)} iconBgColor="bg-green-500/20" iconColor="text-green-400" /></div>
                <div className="widget-animate" style={{ animationDelay: '300ms' }}><StatCard icon={<AlertCircleIcon className="w-6 h-6"/>} title="Fee Belum Dibayar" value={formatCurrency(stats.unpaidFee)} iconBgColor="bg-red-500/20" iconColor="text-red-400" /></div>
                <div className="widget-animate" style={{ animationDelay: '400ms' }}><StatCard icon={<FolderKanbanIcon className="w-6 h-6"/>} title="Proyek Aktif" value={stats.activeProjects.toString()} iconBgColor="bg-blue-500/20" iconColor="text-blue-400" /></div>
                <div className="widget-animate" style={{ animationDelay: '500ms' }}><StatCard icon={<CheckSquareIcon className="w-6 h-6"/>} title="Proyek Selesai" value={stats.completedProjects.toString()} iconBgColor="bg-indigo-500/20" iconColor="text-indigo-400" /></div>
            </div>
             <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border widget-animate" style={{ animationDelay: '600ms' }}>
                <h3 className="text-xl font-bold text-brand-text-light mb-4">Agenda & Tugas Mendesak</h3>
                <div className="space-y-3">
                    {agendaItems.length > 0 ? agendaItems.map((item, index) => (
                        <div key={index} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center widget-animate" style={{ animationDelay: `${700 + index * 100}ms` }}>
                            <div className="flex items-center gap-3">
                                {item.type === 'revision' ? <ClockIcon className="w-5 h-5 text-purple-400"/> : <CalendarIcon className="w-5 h-5 text-blue-400"/>}
                                <div>
                                    <p className="font-semibold text-brand-text-light">{item.type === 'revision' ? 'Deadline Revisi' : 'Proyek Mendatang'}</p>
                                    <p className="text-sm text-brand-text-secondary">{item.projectName}</p>
                                </div>
                            </div>
                            <p className="text-sm font-medium text-brand-text-primary">{formatDate(item.date)}</p>
                        </div>
                    )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada agenda atau tugas mendesak.</p>}
                </div>
            </div>
        </div>
    );
};

const ProjectsTab: React.FC<{projects: Project[], onProjectClick: (p: Project) => void, freelancerId: string}> = ({ projects, onProjectClick, freelancerId }) => (
    <div className="space-y-4">
        {projects.map((p, index) => {
            const pendingRevisionsCount = (p.revisions || []).filter(r => r.freelancerId === freelancerId && r.status === RevisionStatus.PENDING).length;
            const assignmentDetails = p.team.find(t => t.memberId === freelancerId);
            return (
                 <div key={p.id} onClick={() => onProjectClick(p)} className="p-4 bg-brand-surface rounded-xl border border-brand-border cursor-pointer hover:border-brand-accent flex justify-between items-center transition-all duration-200 hover:shadow-md widget-animate" style={{ animationDelay: `${index * 100}ms` }}>
                    <div>
                        <h3 className="font-semibold text-lg text-brand-text-light">{p.projectName}</h3>
                        <p className="text-sm text-brand-text-secondary mt-1">{p.clientName} - {formatDate(p.date)}</p>
                        {assignmentDetails?.subJob && (
                            <p className="text-xs font-semibold text-brand-accent mt-2 bg-brand-accent/10 px-2 py-1 rounded-md inline-block">{assignmentDetails.subJob}</p>
                        )}
                    </div>
                    {pendingRevisionsCount > 0 && <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0"><ClockIcon className="w-4 h-4"/>{pendingRevisionsCount} Menunggu Update</span>}
                </div>
            );
        })}
        {projects.length === 0 && <div className="bg-brand-surface p-6 rounded-2xl text-center widget-animate"><p className="text-brand-text-secondary py-8">Anda belum ditugaskan ke proyek manapun.</p></div>}
    </div>
);

const PaymentsTab: React.FC<{freelancer: TeamMember, projects: Project[], teamProjectPayments: TeamProjectPayment[], teamPaymentRecords: TeamPaymentRecord[], onSlipView: (record: TeamPaymentRecord) => void}> = ({ freelancer, projects, teamProjectPayments, teamPaymentRecords, onSlipView }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border widget-animate">
        <h2 className="text-xl font-bold text-brand-text-light mb-4">Riwayat Pembayaran</h2>
        <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-brand-input"><tr><th className="p-3 text-left">Proyek</th><th className="p-3 text-left">Tanggal</th><th className="p-3 text-right">Fee</th><th className="p-3 text-center">Status & Aksi</th></tr></thead>
            <tbody className="divide-y divide-brand-border">
                {teamProjectPayments.filter(p => p.teamMemberId === freelancer.id).map((p, index) => {
                    const isPaid = p.status === 'Paid';
                    const paymentRecord = isPaid ? teamPaymentRecords.find(rec => rec.projectPaymentIds.includes(p.id)) : null;
                    return (
                        <tr key={p.id} className="widget-animate" style={{ animationDelay: `${index * 50}ms`}}>
                            <td className="p-3 font-semibold text-brand-text-light">{projects.find(proj => proj.id === p.projectId)?.projectName || 'N/A'}</td>
                            <td className="p-3 text-brand-text-secondary">{formatDate(p.date)}</td>
                            <td className="p-3 text-right font-medium text-brand-text-primary">{formatCurrency(p.fee)}</td>
                            <td className="p-3 text-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.status === 'Paid' ? 'Lunas' : 'Belum Lunas'}</span>
                                {paymentRecord && (
                                    <button onClick={() => onSlipView(paymentRecord)} className="text-xs font-semibold text-brand-accent hover:underline">Lihat Slip</button>
                                )}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table></div>
    </div>
);

const PerformanceTab: React.FC<{freelancer: TeamMember}> = ({ freelancer }) => (
    <div className="space-y-6">
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border text-center widget-animate" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-bold text-brand-text-light mb-2">Peringkat Kinerja</h3>
            <div className="flex justify-center items-center gap-2"><StarIcon className="w-8 h-8 text-yellow-400 fill-current" /><p className="text-3xl font-bold text-brand-text-light">{freelancer.rating.toFixed(1)} / 5.0</p></div>
        </div>
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border widget-animate" style={{ animationDelay: '200ms' }}>
            <h3 className="text-xl font-bold text-brand-text-light mb-4">Catatan Kinerja dari Admin</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {freelancer.performanceNotes.map((note, index) => (<div key={note.id} className={`p-4 rounded-lg border-l-4 widget-animate ${note.type === PerformanceNoteType.PRAISE ? 'border-green-400 bg-green-500/5' : 'border-yellow-400 bg-yellow-500/5'}`} style={{ animationDelay: `${300 + index * 100}ms`}}>
                    <p className="text-sm text-brand-text-primary italic">"{note.note}"</p>
                    <p className="text-right text-xs text-brand-text-secondary mt-2">- {formatDate(note.date)}</p>
                </div>))}
                {freelancer.performanceNotes.length === 0 && <p className="text-center text-brand-text-secondary py-8">Belum ada catatan kinerja.</p>}
            </div>
        </div>
    </div>
);

const SOPsTab: React.FC<{sops: SOP[], assignedProjects: Project[]}> = ({ sops, assignedProjects }) => {
    const [viewingSop, setViewingSop] = useState<SOP | null>(null);
    const relevantCategories = useMemo(() => new Set(assignedProjects.map(p => p.projectType)), [assignedProjects]);

    const relevantSops = sops.filter(sop => relevantCategories.has(sop.category));
    const otherSops = sops.filter(sop => !relevantCategories.has(sop.category));

    return (
        <div className="space-y-6">
            {relevantSops.length > 0 && (
                <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border widget-animate" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-xl font-bold text-brand-text-light mb-4">SOP Relevan untuk Proyek Anda</h2>
                    <div className="space-y-3">
                        {relevantSops.map(sop => (
                            <div key={sop.id} onClick={() => setViewingSop(sop)} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-brand-input">
                                <div className="flex items-center gap-3">
                                    <BookOpenIcon className="w-5 h-5 text-brand-accent"/>
                                    <p className="font-semibold text-brand-text-light">{sop.title}</p>
                                </div>
                                <span className="text-xs font-medium bg-brand-input text-brand-text-secondary px-2 py-1 rounded-full">{sop.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border widget-animate" style={{ animationDelay: '200ms' }}>
                <h2 className="text-xl font-bold text-brand-text-light mb-4">Semua SOP</h2>
                 <div className="space-y-3">
                    {otherSops.map(sop => (
                        <div key={sop.id} onClick={() => setViewingSop(sop)} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-brand-input">
                            <div className="flex items-center gap-3">
                                <BookOpenIcon className="w-5 h-5 text-brand-accent"/>
                                <p className="font-semibold text-brand-text-light">{sop.title}</p>
                            </div>
                            <span className="text-xs font-medium bg-brand-input text-brand-text-secondary px-2 py-1 rounded-full">{sop.category}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <Modal isOpen={!!viewingSop} onClose={() => setViewingSop(null)} title={viewingSop?.title || ''} size="4xl">
                {viewingSop && (
                    <div className="prose prose-sm md:prose-base prose-invert max-w-none max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: viewingSop.content.replace(/\n/g, '<br />') }}>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const ProjectDetailModal: React.FC<{project: Project, freelancer: TeamMember, onUpdateRevision: any, showNotification: any, onClose: any}> = ({ project, freelancer, onUpdateRevision, showNotification, onClose }) => {
     const [revisionUpdateForm, setRevisionUpdateForm] = useState<{ [revisionId: string]: { freelancerNotes: string; driveLink: string } }>({});

     useEffect(() => {
        if (project && project.revisions) {
            const initialFormState = project.revisions.reduce((acc, rev) => {
                acc[rev.id] = {
                    freelancerNotes: rev.freelancerNotes || '',
                    driveLink: rev.driveLink || '',
                };
                return acc;
            }, {} as typeof revisionUpdateForm);
            setRevisionUpdateForm(initialFormState);
        }
    }, [project]);
    
    const handleShareRevisionLink = (revision: Revision) => {
        if (!project) return;
        const url = `${window.location.origin}${window.location.pathname}#/revision-form?projectId=${project.id}&freelancerId=${revision.freelancerId}&revisionId=${revision.id}`;
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Tautan revisi berhasil disalin!');
        }, (err) => {
            showNotification('Gagal menyalin tautan.');
            console.error('Could not copy text: ', err);
        });
    };

     const handleRevisionFormChange = (revisionId: string, field: 'freelancerNotes' | 'driveLink', value: string) => {
        setRevisionUpdateForm(prev => ({ ...prev, [revisionId]: { ...(prev[revisionId] || {freelancerNotes: '', driveLink: ''}), [field]: value } }));
    };
    const handleRevisionSubmit = (revision: Revision) => {
        const formData = revisionUpdateForm[revision.id];
        if (!formData || !formData.driveLink) { alert('Harap isi tautan Google Drive hasil revisi.'); return; }
        onUpdateRevision(project.id, revision.id, { freelancerNotes: formData.freelancerNotes || '', driveLink: formData.driveLink || '', status: RevisionStatus.COMPLETED });
        showNotification('Update revisi telah berhasil dikirim!');
        onClose();
    };

    const assignmentDetails = project.team.find(t => t.memberId === freelancer.id);

    return (
        <div className="space-y-6">
            <div><h4 className="font-semibold text-gradient mb-2">Informasi Umum</h4><div className="text-sm space-y-2 p-3 bg-brand-bg rounded-lg">
                {assignmentDetails && <p><strong>Peran Anda:</strong> {assignmentDetails.role} {assignmentDetails.subJob && <span className="text-brand-text-secondary">({assignmentDetails.subJob})</span>}</p>}
                <p><strong>Klien:</strong> {project.clientName}</p>
                <p><strong>Lokasi:</strong> {project.location}</p>
                <p><strong>Waktu:</strong> {project.startTime || 'N/A'} - {project.endTime || 'N/A'}</p>
                <p><strong>Brief/Moodboard:</strong> {project.driveLink ? <a href={project.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Buka Tautan</a> : 'N/A'}</p>
                {project.notes && <p className="whitespace-pre-wrap mt-2 pt-2 border-t border-brand-border"><strong>Catatan:</strong> {project.notes}</p>}
            </div></div>
            <div><h4 className="font-semibold text-gradient mb-2">Tugas Revisi Anda</h4><div className="space-y-3">
                {(project.revisions || []).filter(r => r.freelancerId === freelancer.id).map(rev => (<div key={rev.id} className="p-4 bg-brand-bg rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                         <p className="text-xs text-brand-text-secondary">Deadline: {formatDate(rev.deadline)}</p>
                         <button onClick={() => handleShareRevisionLink(rev)} className="text-xs font-semibold text-brand-accent hover:underline inline-flex items-center gap-1">
                             <Share2Icon className="w-3 h-3"/> Bagikan Tautan Revisi
                         </button>
                    </div>
                    <p className="text-sm my-2 p-3 bg-brand-input rounded-md whitespace-pre-wrap"><strong>Catatan dari Admin:</strong><br/>{rev.adminNotes}</p>
                    {rev.status === RevisionStatus.COMPLETED ? (<div className="p-3 bg-green-500/10 rounded-md text-sm"><p className="font-semibold text-green-400">Revisi Selesai</p></div>) : (<form onSubmit={(e) => { e.preventDefault(); handleRevisionSubmit(rev); }} className="space-y-3 pt-3 border-t border-brand-border">
                        <div className="input-group"><textarea onChange={e => handleRevisionFormChange(rev.id, 'freelancerNotes', e.target.value)} value={revisionUpdateForm[rev.id]?.freelancerNotes || ''} rows={2} className="input-field" placeholder=" "/><label className="input-label">Catatan Tambahan (Opsional)</label></div>
                        <div className="input-group"><input type="url" onChange={e => handleRevisionFormChange(rev.id, 'driveLink', e.target.value)} value={revisionUpdateForm[rev.id]?.driveLink || ''} className="input-field" placeholder=" " required /><label className="input-label">Tautan Google Drive Hasil Revisi</label></div>
                        <button type="submit" className="button-primary w-full">Tandai Selesai & Kirim</button>
                    </form>)}
                </div>))}
                {(project.revisions || []).filter(r => r.freelancerId === freelancer.id).length === 0 && <p className="text-sm text-center text-brand-text-secondary py-4">Tidak ada tugas revisi untuk proyek ini.</p>}
            </div></div>
        </div>
    );
}

export default FreelancerPortal;