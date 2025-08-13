import React, { useState, useMemo, useRef } from 'react';
import { Client, Project, Package, AddOn, Transaction, Profile, Card, FinancialPocket, ClientStatus, PaymentStatus, TransactionType, PromoCode, Lead, LeadStatus, ContactChannel, ClientType } from '../types';
import Modal from './Modal';

interface PublicBookingFormProps {
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    packages: Package[];
    addOns: AddOn[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    userProfile: Profile;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
    showNotification: (message: string) => void;
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const initialFormState = {
    clientName: '',
    email: '',
    phone: '',
    instagram: '',
    projectName: '',
    projectType: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    packageId: '',
    selectedAddOnIds: [] as string[],
    promoCode: '',
    dp: '',
    dpPaymentRef: '', // Client adds this for reference
};

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const PackageCard: React.FC<{ pkg: Package, onSelect: () => void }> = ({ pkg, onSelect }) => (
    <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border p-6 flex flex-col transition-transform duration-200 hover:-translate-y-1">
        <h3 className="text-xl font-bold text-gradient">{pkg.name}</h3>
        <p className="text-3xl font-bold text-brand-text-light my-4">{formatCurrency(pkg.price)}</p>
        <div className="flex-grow space-y-4 text-sm text-brand-text-secondary">
             <div>
                <h4 className="font-semibold text-brand-text-primary mb-2">Tim:</h4>
                <ul className="space-y-1 list-disc list-inside">
                    {pkg.photographers && <li>{pkg.photographers}</li>}
                    {pkg.videographers && <li>{pkg.videographers}</li>}
                    {!pkg.photographers && !pkg.videographers && <li>-</li>}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-brand-text-primary mb-2">Output Fisik:</h4>
                <ul className="space-y-1 list-disc list-inside">
                    {pkg.physicalItems.length > 0 ? pkg.physicalItems.map((item, index) => <li key={index}>{item.name}</li>) : <li>Tidak ada.</li>}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-brand-text-primary mb-2">Output Digital:</h4>
                <ul className="space-y-1 list-disc list-inside">
                    {pkg.digitalItems.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        </div>
        <p className="text-xs text-brand-text-secondary mt-4">Estimasi Pengerjaan: {pkg.processingTime}</p>
        <button onClick={onSelect} className="mt-6 button-primary w-full">Pilih Paket Ini</button>
    </div>
);


const PublicBookingForm: React.FC<PublicBookingFormProps> = ({ 
    setClients, setProjects, packages, addOns, setTransactions, userProfile, cards, setCards, pockets, setPockets, promoCodes, setPromoCodes, showNotification, setLeads
}) => {
    const [formData, setFormData] = useState({...initialFormState, projectType: userProfile.projectTypes[0] || ''});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [promoFeedback, setPromoFeedback] = useState({ type: '', message: '' });
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const handlePackageSelect = (packageId: string) => {
        setFormData(prev => ({ ...prev, packageId }));
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formattedTerms = useMemo(() => {
        if (!userProfile.termsAndConditions) return null;
        return userProfile.termsAndConditions.split('\n').map((line, index) => {
            if (line.trim() === '') return <div key={index} className="h-4"></div>;
            const emojiRegex = /^(📜|📅|💰|📦|⏱|➕)\s/;
            if (emojiRegex.test(line)) {
                return <h3 key={index} className="text-lg font-semibold text-gradient mt-4 mb-2">{line}</h3>;
            }
            if (line.trim().startsWith('- ')) {
                 return <p key={index} className="ml-4 text-brand-text-primary">{line.trim().substring(2)}</p>;
            }
            return <p key={index} className="text-brand-text-primary">{line}</p>;
        });
    }, [userProfile.termsAndConditions]);


    const { totalBeforeDiscount, discountAmount, totalProject, discountText } = useMemo(() => {
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        const packagePrice = selectedPackage?.price || 0;
        const addOnsPrice = addOns
            .filter(addon => formData.selectedAddOnIds.includes(addon.id))
            .reduce((sum, addon) => sum + addon.price, 0);
        
        const totalBeforeDiscount = packagePrice + addOnsPrice;
        let discountAmount = 0;
        let discountText = '';

        const enteredPromoCode = formData.promoCode.toUpperCase().trim();
        if (enteredPromoCode) {
            const promoCode = promoCodes.find(p => p.code === enteredPromoCode && p.isActive);
            if (promoCode) {
                const isExpired = promoCode.expiryDate && new Date(promoCode.expiryDate) < new Date();
                const isMaxedOut = promoCode.maxUsage != null && promoCode.usageCount >= promoCode.maxUsage;

                if (!isExpired && !isMaxedOut) {
                    if (promoCode.discountType === 'percentage') {
                        discountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
                        discountText = `${promoCode.discountValue}%`;
                    } else {
                        discountAmount = promoCode.discountValue;
                        discountText = formatCurrency(promoCode.discountValue);
                    }
                    setPromoFeedback({ type: 'success', message: `Kode promo diterapkan! Diskon ${discountText}.` });
                } else {
                    setPromoFeedback({ type: 'error', message: 'Kode promo tidak valid atau sudah habis.' });
                }
            } else {
                setPromoFeedback({ type: 'error', message: 'Kode promo tidak ditemukan.' });
            }
        } else {
             setPromoFeedback({ type: '', message: '' });
        }
        
        const totalProject = totalBeforeDiscount - discountAmount;
        return { totalBeforeDiscount, discountAmount, totalProject, discountText };
    }, [formData.packageId, formData.selectedAddOnIds, formData.promoCode, packages, addOns, promoCodes]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter(addOnId => addOnId !== id) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showNotification('Ukuran file tidak boleh melebihi 10MB.');
                e.target.value = ''; // Reset file input
                return;
            }
            setPaymentProof(file);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const dpAmount = Number(formData.dp) || 0;
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        if (!selectedPackage) {
            alert('Silakan pilih paket.');
            setIsSubmitting(false);
            return;
        }

        const destinationCard = cards.find(c => c.id !== 'CARD_CASH') || cards[0];
        if (!destinationCard) {
            alert('Sistem pembayaran tidak dikonfigurasi. Hubungi vendor.');
            setIsSubmitting(false);
            return;
        }
        
        let promoCodeAppliedId: string | undefined;
        if (discountAmount > 0 && formData.promoCode) {
            const promoCode = promoCodes.find(p => p.code === formData.promoCode.toUpperCase().trim());
            if (promoCode) promoCodeAppliedId = promoCode.id;
        }

        let dpProofUrl = '';
        if (paymentProof) {
            try {
                dpProofUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(paymentProof);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
            } catch (error) {
                console.error("Error reading file:", error);
                showNotification("Gagal memproses file bukti transfer.");
                setIsSubmitting(false);
                return;
            }
        }

        const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
        const remainingPayment = totalProject - dpAmount;

        const newClientId = `CLI${Date.now()}`;
        const newClient: Client = {
            id: newClientId, name: formData.clientName, email: formData.email, phone: formData.phone, instagram: formData.instagram,
            since: new Date().toISOString().split('T')[0], status: ClientStatus.ACTIVE, 
            clientType: ClientType.DIRECT,
            lastContact: new Date().toISOString(),
            portalAccessId: crypto.randomUUID(),
        };

        const newProject: Project = {
            id: `PRJ${Date.now()}`, projectName: formData.projectName || `Acara ${formData.clientName}`, clientName: newClient.name, clientId: newClient.id,
            projectType: formData.projectType, packageName: selectedPackage.name, packageId: selectedPackage.id, addOns: selectedAddOns,
            date: formData.date, location: formData.location, progress: 0, status: 'Dikonfirmasi',
            totalCost: totalProject, amountPaid: dpAmount,
            paymentStatus: dpAmount > 0 ? (remainingPayment <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR) : PaymentStatus.BELUM_BAYAR,
            team: [], notes: `Referensi Pembayaran DP: ${formData.dpPaymentRef}`, promoCodeId: promoCodeAppliedId, discountAmount: discountAmount > 0 ? discountAmount : undefined,
            dpProofUrl: dpProofUrl || undefined,
        };
        
        const newLead: Lead = {
            id: `LEAD-FORM-${Date.now()}`,
            name: newClient.name,
            contactChannel: ContactChannel.WEBSITE,
            location: newProject.location,
            status: LeadStatus.CONVERTED,
            date: new Date().toISOString().split('T')[0],
            notes: `Dikonversi secara otomatis dari formulir pemesanan publik. Proyek: ${newProject.projectName}. Klien ID: ${newClient.id}`
        };

        setClients(prev => [newClient, ...prev]);
        setProjects(prev => [newProject, ...prev]);
        setLeads(prev => [newLead, ...prev]);

        if (promoCodeAppliedId) {
            setPromoCodes(prev => prev.map(p => p.id === promoCodeAppliedId ? { ...p, usageCount: p.usageCount + 1 } : p));
        }

        if (dpAmount > 0) {
            const newTransaction: Transaction = {
                id: `TRN-DP-${newProject.id}`, date: new Date().toISOString().split('T')[0], description: `DP Proyek ${newProject.projectName}`,
                amount: dpAmount, type: TransactionType.INCOME, projectId: newProject.id, category: 'DP Proyek',
                method: 'Transfer Bank', pocketId: 'POC005', cardId: destinationCard.id,
            };
            setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setCards(prev => prev.map(c => c.id === destinationCard.id ? { ...c, balance: c.balance + dpAmount } : c));
            setPockets(prev => prev.map(p => p.id === 'POC005' ? { ...p, amount: p.amount + dpAmount } : p));
        }

        setIsSubmitting(false);
        setIsSubmitted(true);
        showNotification('Pemesanan baru dari klien diterima!');
    };
    
    const renderSampleContract = () => {
        const today = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        return (
            <div className="printable-content bg-white text-black p-8 font-serif leading-relaxed text-sm max-h-[70vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-center mb-1">CONTOH SURAT PERJANJIAN KERJA SAMA</h2>
                <h3 className="text-lg font-bold text-center mb-6">JASA FOTOGRAFI & VIDEOGRAFI</h3>
                <p>Pada hari ini, {today}, telah dibuat dan disepakati perjanjian kerja sama antara:</p>

                <div className="my-4">
                    <p className="font-bold">PIHAK PERTAMA</p>
                    <table>
                        <tbody>
                            <tr><td className="pr-4 align-top">Nama</td><td>: {userProfile.fullName}</td></tr>
                            <tr><td className="pr-4 align-top">Jabatan</td><td>: Pemilik Usaha</td></tr>
                            <tr><td className="pr-4 align-top">Alamat</td><td>: {userProfile.address}</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {userProfile.phone}</td></tr>
                        </tbody>
                    </table>
                    <p className="mt-1">Dalam hal ini bertindak atas nama perusahaannya, {userProfile.companyName}, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>
                </div>

                <div className="my-4">
                    <p className="font-bold">PIHAK KEDUA</p>
                     <table>
                        <tbody>
                            <tr><td className="pr-4 align-top">Nama</td><td>: [Nama Klien]</td></tr>
                            <tr><td className="pr-4 align-top">Alamat</td><td>: [Alamat Klien]</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: [Nomor Telepon Klien]</td></tr>
                        </tbody>
                    </table>
                    <p className="mt-1">Dalam hal ini bertindak atas nama pribadi, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
                </div>
                
                <p>Kedua belah pihak sepakat untuk mengikatkan diri dalam perjanjian ini dengan syarat dan ketentuan sebagai berikut:</p>

                <div className="space-y-4 mt-6">
                    <div><h4 className="font-bold text-center">PASAL 1: RUANG LINGKUP PEKERJAAN</h4><p>PIHAK PERTAMA akan memberikan jasa fotografi dan/atau videografi sesuai dengan paket layanan yang dipilih oleh PIHAK KEDUA untuk acara pada tanggal [Tanggal Acara] di lokasi [Lokasi Acara].</p></div>
                    <div><h4 className="font-bold text-center">PASAL 2: BIAYA DAN PEMBAYARAN</h4><p>Total biaya jasa adalah sebesar [Total Biaya Paket]. Pembayaran dilakukan dengan sistem: Uang Muka (DP) sebesar 30-50% saat penandatanganan kontrak, dan pelunasan paling lambat H-3 sebelum Hari Pelaksanaan. Pembayaran ditransfer ke rekening: {userProfile.bankAccount}.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 3: PENYERAHAN HASIL</h4><p>PIHAK PERTAMA akan menyerahkan seluruh hasil pekerjaan dalam jangka waktu yang telah ditentukan dalam detail paket, terhitung setelah Hari Pelaksanaan.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 4: PEMBATALAN</h4><p>Jika terjadi pembatalan oleh PIHAK KEDUA, maka Uang Muka (DP) yang telah dibayarkan tidak dapat dikembalikan. Ketentuan lebih lanjut diatur dalam Syarat & Ketentuan Umum.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 5: LAIN-LAIN</h4><p>Hal-hal lain yang belum diatur dalam perjanjian ini akan dibicarakan dan diselesaikan secara musyawarah oleh kedua belah pihak.</p></div>
                </div>

                 <div className="flex justify-between items-end mt-16">
                    <div className="text-center w-2/5">
                        <p>PIHAK PERTAMA</p>
                        <div className="h-28 my-1 flex flex-col items-center justify-center text-gray-400 text-xs">
                            <span className="italic">(Tanda Tangan & Nama)</span>
                        </div>
                        <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1">({userProfile.fullName})</p>
                    </div>
                     <div className="text-center w-2/5">
                        <p>PIHAK KEDUA</p>
                        <div className="h-28 border-b-2 border-dotted w-4/5 mx-auto my-1 flex items-center justify-center text-gray-400 text-xs italic">(Tanda Tangan & Nama)</div>
                        <p>([Nama Klien])</p>
                    </div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-12 italic">Ini adalah contoh. Kontrak asli akan disesuaikan dengan detail proyek dan paket yang Anda pilih.</p>
            </div>
        );
    };

    if (isSubmitted) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
                <div className="w-full max-w-lg p-8 text-center bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                    <h1 className="text-2xl font-bold text-gradient">Terima Kasih!</h1>
                    <p className="mt-4 text-brand-text-primary">Formulir pemesanan Anda telah berhasil kami terima. Tim kami akan segera menghubungi Anda untuk konfirmasi lebih lanjut.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-brand-bg p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-6xl mx-auto">
                <div className="mb-12">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-extrabold text-gradient">Paket Layanan Kami</h2>
                        <p className="text-brand-text-secondary mt-3 max-w-2xl mx-auto">Pilih paket yang paling sesuai dengan kebutuhan acara Anda. Lihat detailnya dan pilih untuk memulai pemesanan.</p>
                         <div className="mt-4 flex justify-center items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setIsTermsModalOpen(true)}
                                className="text-sm font-semibold text-brand-accent hover:underline"
                            >
                                Lihat Syarat & Ketentuan Umum
                            </button>
                            <span className="text-brand-text-secondary">|</span>
                            <button
                                type="button"
                                onClick={() => setIsContractModalOpen(true)}
                                className="text-sm font-semibold text-brand-accent hover:underline"
                            >
                                Lihat Contoh Kontrak Kerja
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {packages.map(pkg => (
                            <PackageCard key={pkg.id} pkg={pkg} onSelect={() => handlePackageSelect(pkg.id)} />
                        ))}
                    </div>
                </div>

                <div ref={formRef} className="w-full max-w-3xl mx-auto">
                     <div className="bg-brand-surface p-8 rounded-2xl shadow-lg border border-brand-border">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gradient">{userProfile.companyName}</h1>
                            <p className="text-sm text-brand-text-secondary mt-2">Formulir Pemesanan Layanan</p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                 <div className="space-y-4">
                                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Informasi Klien</h4>
                                    <div className="input-group"><input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="clientName" className="input-label">Nama Lengkap</label></div>
                                    <div className="input-group"><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="phone" className="input-label">Nomor Telepon (WhatsApp)</label></div>
                                    <div className="input-group"><input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="email" className="input-label">Email</label></div>
                                    <div className="input-group"><input type="text" id="projectName" name="projectName" value={formData.projectName} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="projectName" className="input-label">Nama Acara (e.g., Wedding John & Jane)</label></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="input-group"><select id="projectType" name="projectType" value={formData.projectType} onChange={handleFormChange} className="input-field" required><option value="" disabled>Pilih Jenis...</option>{userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select><label htmlFor="projectType" className="input-label">Jenis Acara</label></div>
                                        <div className="input-group"><input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="date" className="input-label">Tanggal Acara</label></div>
                                    </div>
                                    <div className="input-group"><input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="location" className="input-label">Lokasi Acara</label></div>
                                 </div>

                                 <div className="space-y-4">
                                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Detail Paket & Pembayaran</h4>
                                    <div className="input-group"><select id="packageId" name="packageId" value={formData.packageId} onChange={handleFormChange} className="input-field" required><option value="">Pilih paket...</option>{packages.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}</select><label htmlFor="packageId" className="input-label">Paket</label></div>
                                    <div className="input-group"><label className="input-label !static !-top-4 !text-brand-accent">Add-On Lainnya (Opsional)</label><div className="p-3 border border-brand-border bg-brand-bg rounded-lg max-h-32 overflow-y-auto space-y-2 mt-2">{addOns.map(addon => (<label key={addon.id} className="flex items-center justify-between p-2 rounded-md hover:bg-brand-input cursor-pointer"><span className="text-sm text-brand-text-primary">{addon.name}</span><div className="flex items-center gap-4"><span className="text-sm text-brand-text-secondary">{formatCurrency(addon.price)}</span><input type="checkbox" id={addon.id} name="addOns" checked={formData.selectedAddOnIds.includes(addon.id)} onChange={handleFormChange} /></div></label>))}</div></div>
                                    
                                    <div className="input-group">
                                        <input type="text" id="promoCode" name="promoCode" value={formData.promoCode} onChange={handleFormChange} className="input-field" placeholder=" " />
                                        <label htmlFor="promoCode" className="input-label">Kode Promo (Opsional)</label>
                                        {promoFeedback.message && <p className={`text-xs mt-1 ${promoFeedback.type === 'success' ? 'text-brand-success' : 'text-brand-danger'}`}>{promoFeedback.message}</p>}
                                    </div>

                                    <div className="p-4 bg-brand-bg rounded-lg space-y-3">
                                        {discountAmount > 0 && (
                                            <>
                                            <div className="flex justify-between items-center text-sm"><span className="text-brand-text-secondary">Subtotal</span><span className="text-brand-text-light">{formatCurrency(totalBeforeDiscount)}</span></div>
                                            <div className="flex justify-between items-center text-sm"><span className="text-brand-text-secondary">Diskon ({discountText})</span><span className="text-brand-success">-{formatCurrency(discountAmount)}</span></div>
                                            </>
                                        )}
                                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-brand-text-secondary">Total Biaya</span><span className="text-brand-text-light">{formatCurrency(totalProject)}</span></div>
                                        <hr className="border-brand-border"/>
                                        <p className="text-sm text-brand-text-secondary">Silakan transfer Uang Muka (DP) ke rekening berikut:</p>
                                        <p className="font-semibold text-brand-text-light text-center py-2 bg-brand-input rounded-md">{userProfile.bankAccount}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="input-group !mt-2"><input type="number" name="dp" id="dp" value={formData.dp} onChange={handleFormChange} className="input-field text-right" placeholder=" "/><label htmlFor="dp" className="input-label">Jumlah DP Ditransfer</label></div>
                                            <div className="input-group !mt-2"><input type="text" name="dpPaymentRef" id="dpPaymentRef" value={formData.dpPaymentRef} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="dpPaymentRef" className="input-label">No. Ref / 4 Digit Rek</label></div>
                                        </div>
                                         <div className="input-group !mt-2">
                                            <label htmlFor="dpPaymentProof" className="input-label !static !-top-4 !text-brand-accent">Bukti Transfer DP (Opsional)</label>
                                            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-brand-border px-6 py-10">
                                                <div className="text-center">
                                                    <UploadIcon className="mx-auto h-12 w-12 text-brand-text-secondary" />
                                                    <div className="mt-4 flex text-sm leading-6 text-brand-text-secondary">
                                                        <label htmlFor="dpPaymentProof" className="relative cursor-pointer rounded-md bg-brand-surface font-semibold text-brand-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-accent focus-within:ring-offset-2 focus-within:ring-offset-brand-bg hover:text-brand-accent-hover">
                                                            <span>Unggah file</span>
                                                            <input id="dpPaymentProof" name="dpPaymentProof" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, application/pdf" />
                                                        </label>
                                                        <p className="pl-1">atau seret dan lepas</p>
                                                    </div>
                                                    <p className="text-xs leading-5 text-brand-text-secondary">PNG, JPG, PDF hingga 10MB</p>
                                                </div>
                                            </div>
                                            {paymentProof && (
                                                <div className="mt-2 text-sm text-brand-text-primary bg-brand-input p-2 rounded-md">
                                                    File terpilih: <span className="font-semibold">{paymentProof.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                 </div>
                            </div>

                            <div className="pt-6">
                                <button type="submit" disabled={isSubmitting} className="w-full button-primary">{isSubmitting ? 'Mengirim...' : 'Kirim Formulir Pemesanan'}</button>
                            </div>
                        </form>
                     </div>
                </div>

                <Modal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} title="Syarat & Ketentuan Umum">
                    <div className="max-h-[70vh] overflow-y-auto pr-4">
                        {formattedTerms ? (
                            <div>{formattedTerms}</div>
                        ) : (
                            <p className="text-brand-text-secondary text-center py-8">Syarat dan ketentuan belum diatur oleh vendor.</p>
                        )}
                    </div>
                </Modal>
                <Modal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} title="Contoh Kontrak Kerja" size="3xl">
                    {renderSampleContract()}
                </Modal>
            </div>
        </div>
    );
};

export default PublicBookingForm;