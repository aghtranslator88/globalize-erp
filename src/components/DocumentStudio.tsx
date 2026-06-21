import React, { useState } from 'react';
import { 
  Sparkles, Palette, FileText, CheckCircle, Save, Info, RefreshCw, 
  Settings, Link, Check, Scissors, Eye, Landmark, HelpCircle, AlertCircle, FileSpreadsheet, Percent, Type, Download
} from 'lucide-react';
import dbInstance from '../db/store';
import { useToast } from './Toast';

interface DocumentStudioProps {
  isRtl: boolean;
  currentUser: any;
}

export const DocumentStudio: React.FC<DocumentStudioProps> = ({ isRtl, currentUser }) => {
  const { success, error, confirm } = useToast();
  const [brand, setBrand] = useState<any>(() => {
    return { ...dbInstance.brandConfig };
  });

  const [activePreviewType, setActivePreviewType] = useState<'quote' | 'invoice'>('quote');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Built-in color preset list for dynamic styling
  const COLOR_PRESETS = [
    { name: 'Sapphire Navy', code: '#1B4F72', text: 'text-sky-800', bg: 'bg-[#1B4F72]' },
    { name: 'Emerald Forest', code: '#0E6251', text: 'text-emerald-800', bg: 'bg-[#0E6251]' },
    { name: 'Imperial Bordeaux', code: '#78281F', text: 'text-red-800', bg: 'bg-[#78281F]' },
    { name: 'Charcoal Minimal', code: '#2E4053', text: 'text-zinc-800', bg: 'bg-[#2E4053]' },
    { name: 'Violet Regal', code: '#512E5F', text: 'text-purple-800', bg: 'bg-[#512E5F]' },
    { name: 'Golden Amber', code: '#7D6608', text: 'text-amber-800', bg: 'bg-[#7D6608]' },
  ];

  // Font family list
  const FONT_PRESETS = [
    { name: 'Inter (Sans-Serif)', value: 'Inter', css: 'font-sans' },
    { name: 'Space Grotesk (Tech)', value: 'Space Grotesk', css: 'font-mono tracking-tight text-zinc-950' },
    { name: 'Playfair Display (Serif)', value: 'Playfair Display', css: 'font-serif' },
    { name: 'JetBrains Mono (Editorial)', value: 'JetBrains Mono', css: 'font-mono' }
  ];

  // Theme presets
  const THEME_PRESETS = [
    { id: 'modern_asymmetric', name: 'Modern Asymmetric', labelAr: 'عصري غير متماثل' },
    { id: 'centered_classic', name: 'Centered Classic', labelAr: 'كلاسيكي متمركز' },
    { id: 'hybrid_editorial', name: 'Hybrid Editorial', labelAr: 'تحريري هجين' },
    { id: 'clean_compact', name: 'Clean Compact', labelAr: 'بسيط مدمج' }
  ];

  const handlePresetSelect = (themeId: string) => {
    setBrand(prev => ({ ...prev, layoutTheme: themeId }));
  };

  const handleColorSelect = (code: string) => {
    setBrand(prev => ({ ...prev, accentColor: code }));
  };

  const handleFontSelect = (fontVal: string) => {
    setBrand(prev => ({ ...prev, fontFamily: fontVal }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBrand(prev => ({ ...prev, logoBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    confirm(
      isRtl ? 'هل أنت متأكد من رغبتك في إعادة تعيين كافة التنسيقات والبيانات للقوالب الافتراضية؟' : 'Are you sure you want to reset all document layouts to original system defaults?',
      () => {
        const original = dbInstance.getEmptyBrandConfig();
        setBrand(original);
        dbInstance.brandConfig = original;
        dbInstance.save();
        success(isRtl ? 'تمت إعادة القوالب إلى الافتراضيات بنجاح!' : 'Layout settings has been reset to defaults successfully!');
      },
      undefined,
      { isRtl }
    );
  };

  const handleSaveBrand = () => {
    try {
      dbInstance.brandConfig = { ...brand };
      dbInstance.save();
      success(isRtl ? 'تم حفظ التنسيقات الجديدة وقوالب مبيعات غلوبالايز بنجاح!' : 'New Quotation & Invoice templates designed successfully! Changes applied globally.');
    } catch (err: any) {
      error(err.message || 'Error saving settings');
    }
  };

  const latestDocument: any = dbInstance.invoices[0] || dbInstance.quotations[0];
  const previewClient: any = latestDocument?.clientId
    ? dbInstance.clients.find(client => client.id === latestDocument.clientId)
    : undefined;
  const previewReference = latestDocument?.invoiceNumber || latestDocument?.quoteNumber || '';
  const previewLineItems = (latestDocument?.items || []).map((item: any) => ({
    desc: item.description || item.desc || '',
    qty: String(item.quantity || ''),
    rate: Number(item.unitPrice || item.rate || 0),
    rowTotal: Number(item.total || item.rowTotal || 0)
  }));

  const subtotalSumVal = previewLineItems.reduce((sum, item) => sum + item.rowTotal, 0);
  const standardVatSurchages = subtotalSumVal * (Number(brand.taxRate || 0) / 100);
  const totalDueSumVal = subtotalSumVal + standardVatSurchages;

  return (
    <div className="space-y-6">
      
      {/* Dynamic Notifications Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle className="text-emerald-600 shrink-0" size={18} />
          <p className="text-xs font-bold leading-tight">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-800 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <AlertCircle className="text-red-600 shrink-0" size={18} />
          <p className="text-xs font-bold leading-tight">{errorMsg}</p>
        </div>
      )}

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Creative Customizer & brand Config Panel (7 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Brand & Layout Identity Profiles */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/75 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Settings size={16} className="text-zinc-600" />
              {isRtl ? 'الهوية المؤسسية (ترويسة المستندات)' : 'Corporate Identity Settings'}
            </h3>

            {/* Logo Settings */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                {isRtl ? 'شعار الشركة الرسمي (صورة) *' : 'Official Corporate Logo'}
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center p-2 relative overflow-hidden shadow-inner shrink-0">
                  {brand.logoBase64 || brand.logoUrl ? (
                    <img 
                      src={brand.logoBase64 || brand.logoUrl} 
                      alt="Logo Brand" 
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <FileText size={20} className="text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex gap-2">
                    <label className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[10px] font-bold tracking-tight uppercase cursor-pointer">
                      <span>{isRtl ? 'تحميل صورة شعار' : 'Upload Logo JPG/PNG'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                    </label>
                    <button
                      onClick={() => setBrand(prev => ({ ...prev, logoBase64: '', logoUrl: '' }))}
                      className="px-2 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-bold tracking-tight"
                    >
                      {isRtl ? 'افتراضي' : 'Clear Logo'}
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-400 leading-none">Accepted sizes under 1MB. Fits perfectly on automated layouts.</p>
                </div>
              </div>
            </div>

            {/* Names Input Layout */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اسم الشركة (English)' : 'Company Name (EN)'}</label>
                <input 
                  type="text" 
                  value={brand.companyName}
                  onChange={e => setBrand(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اسم الشركة (عربي) *' : 'Company Name (AR)'}</label>
                <input 
                  type="text" 
                  value={brand.companyNameAr}
                  onChange={e => setBrand(prev => ({ ...prev, companyNameAr: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Tagline taglines */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'شعار ترويجي فرعي (EN)' : 'Corporate Slogan (EN)'}</label>
                <input 
                  type="text" 
                  value={brand.slogan}
                  onChange={e => setBrand(prev => ({ ...prev, slogan: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'شعار ترويجي فرعي (عربي)' : 'Corporate Slogan (AR)'}</label>
                <input 
                  type="text" 
                  value={brand.sloganAr}
                  onChange={e => setBrand(prev => ({ ...prev, sloganAr: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Office Contact Coordinates */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'البريد الإلكتروني للعمل' : 'Corporate Email'}</label>
                <input 
                  type="email" 
                  value={brand.email}
                  onChange={e => setBrand(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الموقع الإلكتروني' : 'Official Website URL'}</label>
                <input 
                  type="text" 
                  value={brand.website}
                  onChange={e => setBrand(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Official Registry Metadata */}
            <div className="grid grid-cols-2 gap-3 pb-2 border-t border-zinc-100 pt-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الرقم الضريبي التراكمي' : 'Tax Registration ID'}</label>
                <input 
                  type="text" 
                  value={brand.taxNumber}
                  onChange={e => setBrand(prev => ({ ...prev, taxNumber: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'رقم السجل التجاري' : 'Commercial Registry No'}</label>
                <input 
                  type="text" 
                  value={brand.commercialRegistry}
                  onChange={e => setBrand(prev => ({ ...prev, commercialRegistry: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Physical Headquarters Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'العنوان اللاتيني المعتمد' : 'Corporate HQ Address (EN)'}</label>
                <input 
                  type="text" 
                  value={brand.address}
                  onChange={e => setBrand(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'العنوان العربي المعتمد' : 'Corporate HQ Address (AR)'}</label>
                <input 
                  type="text" 
                  value={brand.addressAr}
                  onChange={e => setBrand(prev => ({ ...prev, addressAr: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Standard VAT options */}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'نسبة ضريبة القيمة المضافة الافتراضية' : 'Standard VAT / Tax Rate (%)'}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={brand.taxRate || 14}
                    onChange={e => setBrand(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                  <Percent size={12} className="absolute right-3 top-2.5 text-zinc-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'العملة الافتراضية للفوترة' : 'Default Billing Currency'}</label>
                <select 
                  value={brand.currency || 'USD'}
                  onChange={e => setBrand(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EGP">EGP (ج.م)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Section 2: Financial Routing Credentials (Bank info) */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/75 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Landmark size={16} className="text-zinc-600" />
              {isRtl ? 'بيانات الحساب البنكي للتسوية المباشرة' : 'Direct Bank Settlement Details'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اسم البنك' : 'Bank Name (EN)'}</label>
                <input 
                  type="text" 
                  value={brand.bankName}
                  onChange={e => setBrand(prev => ({ ...prev, bankName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اسم البنك (عربي)' : 'Bank Name (AR)'}</label>
                <input 
                  type="text" 
                  value={brand.bankNameAr}
                  onChange={e => setBrand(prev => ({ ...prev, bankNameAr: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اسم المستفيد' : 'Beneficiary Name (EN)'}</label>
                <input 
                  type="text" 
                  value={brand.bankAccountName}
                  onChange={e => setBrand(prev => ({ ...prev, bankAccountName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اسم المستفيد (عربي)' : 'Beneficiary Name (AR)'}</label>
                <input 
                  type="text" 
                  value={brand.bankAccountNameAr}
                  onChange={e => setBrand(prev => ({ ...prev, bankAccountNameAr: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'رقم السويفت كود' : 'Swift Code (BIC)'}</label>
                <input 
                  type="text" 
                  value={brand.bankSwift}
                  onChange={e => setBrand(prev => ({ ...prev, bankSwift: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'رقم الحساب أو الآيبان الدولي' : 'IBAN / International Account No'}</label>
                <input 
                  type="text" 
                  value={brand.bankIban}
                  onChange={e => setBrand(prev => ({ ...prev, bankIban: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none font-mono text-[10px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <input 
                type="checkbox" 
                id="showBankDetailsBtn"
                checked={brand.showBankDetails}
                onChange={e => setBrand(prev => ({ ...prev, showBankDetails: e.target.checked }))}
                className="w-4 h-4 text-zinc-900 border-zinc-300 rounded cursor-pointer"
              />
              <label htmlFor="showBankDetailsBtn" className="text-[10px] font-bold text-zinc-700 uppercase tracking-wide cursor-pointer">
                {isRtl ? 'تضمين بيانات السداد التلقائي بالحساب البنكي أسفل الفواتير' : 'Include Bank instructions layout on default invoices'}
              </label>
            </div>
          </div>

          {/* Section 3: Document Layout & Artistic Theme Style Controls */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/75 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Palette size={16} className="text-zinc-600" />
              {isRtl ? 'تصميم مظهر وعناصر المستند' : 'Style & Element Designer'}
            </h3>

            {/* Layout Themes */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'تخطيط وهيكل المطبوعات' : 'Structural Grid Layout Theme'}</label>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`px-3 py-2 border rounded-xl text-xs font-bold text-left transition-all ${
                      brand.layoutTheme === preset.id 
                        ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 text-zinc-950 font-black scale-[1.01]' 
                        : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    <span>{isRtl && preset.labelAr ? preset.labelAr : preset.name}</span>
                    <span className="block text-[8px] opacity-60 font-semibold uppercase tracking-wider mt-0.5">Preset Theme</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color swatches */}
            <div className="space-y-1.5 pt-1.5">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اللون المميز الأساسي (ألوان ترويسة الجداول والحدود)' : 'Primary Accent Brand Color'}</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.code}
                    onClick={() => handleColorSelect(preset.code)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${preset.bg} ${
                      brand.accentColor === preset.code 
                        ? 'ring-2 ring-offset-2 ring-zinc-800 scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    title={preset.name}
                  >
                    {brand.accentColor === preset.code && <Check size={12} className="text-white font-black" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom fonts selection */}
            <div className="space-y-1.5 pt-1.5">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'تنسيق خط الكتابة الأساسي' : 'Typography Styling family'}</label>
              <div className="grid grid-cols-2 gap-2">
                {FONT_PRESETS.map(font => (
                  <button
                    key={font.value}
                    onClick={() => handleFontSelect(font.value)}
                    className={`px-3 py-1.5 border rounded-xl text-[11px] font-bold text-center transition-all ${
                      brand.fontFamily === font.value 
                        ? 'border-zinc-900 bg-zinc-50 text-zinc-950 font-extrabold ring-1 ring-zinc-900' 
                        : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    <span className={font.css}>{font.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Miscellaneous elements check */}
            <div className="space-y-2 border-t border-zinc-150 pt-3">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'عناصر وهوية المستندات النشطة' : 'Visible Security Metadata Toggles'}</label>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="showLogoBtn"
                    checked={brand.showLogo}
                    onChange={e => setBrand(prev => ({ ...prev, showLogo: e.target.checked }))}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <label htmlFor="showLogoBtn" className="font-semibold text-zinc-800 cursor-pointer">{isRtl ? 'عرض صورة شعار الشركة في الترويسة العليا' : 'Show brand logo placeholder in corporate header'}</label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="showStampBtn"
                    checked={brand.showStamp}
                    onChange={e => setBrand(prev => ({ ...prev, showStamp: e.target.checked }))}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <label htmlFor="showStampBtn" className="font-semibold text-zinc-800 cursor-pointer">{isRtl ? 'تضمين ختم الاعتماد الرقمي في أسفل الصفحة' : 'Affix digital certified audit verification stamp'}</label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="showSigBtn"
                    checked={brand.showSignatureBlock}
                    onChange={e => setBrand(prev => ({ ...prev, showSignatureBlock: e.target.checked }))}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <label htmlFor="showSigBtn" className="font-semibold text-zinc-800 cursor-pointer">{isRtl ? 'عرض تذييل لإقرار التوقيع والتسجيل القانوني' : 'Provide signature approval lines and regulatory declaration'}</label>
                </div>
              </div>
            </div>

          </div>

          {/* Section 4: General Terms and Conditions (T&C Policy) */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/75 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-3">
              <FileSpreadsheet size={16} className="text-zinc-600" />
              {isRtl ? 'الشروط والأحكام ووثيقة السياسات' : 'Default Standard Terms & Client Notes'}
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'عقود سداد وقوانين الترجمة (English)' : 'Agreement Rules & Terms (EN)'}</label>
              <textarea 
                rows={4}
                value={brand.termsEn}
                onChange={e => setBrand(prev => ({ ...prev, termsEn: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-200 bg-zinc-50/50 rounded-lg text-[10px] font-mono leading-relaxed focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'عقود سداد وقوانين الترجمة (عربي)' : 'Agreement Rules & Terms (AR)'}</label>
              <textarea 
                rows={4}
                value={brand.termsAr}
                onChange={e => setBrand(prev => ({ ...prev, termsAr: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-200 bg-zinc-50/50 rounded-lg text-[10px] font-mono leading-relaxed focus:outline-none text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* Core Panel Actions bar */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isRtl ? 'تهيئة من البداية' : 'Reset Defaults'}
            </button>
            <button
              onClick={handleSaveBrand}
              className="px-6 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save size={13} />
              <span>{isRtl ? 'حفظ للتطبيق الفوري بالشامبلون' : 'Save and Apply Theme'}</span>
            </button>
          </div>

        </div>

        {/* Right Side: Professional side-by-side Document Letterhead Simulator (7 cols) */}
        <div className="lg:col-span-7 h-full flex flex-col space-y-4">
          
          {/* Simulation Header selector */}
          <div className="bg-zinc-900 rounded-2xl p-3 flex items-center justify-between text-zinc-300 shadow select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black font-mono tracking-widest uppercase text-emerald-400">
                {isRtl ? 'محاكي المعاينة الذكية الفوري' : 'Interactive Letterhead Simulator'}
              </span>
            </div>
            <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700/60 font-sans">
              <button
                type="button"
                onClick={() => setActivePreviewType('quote')}
                className={`px-3 py-1 text-[9px] font-black rounded-md tracking-tight uppercase flex items-center gap-1.5 transition-colors ${
                  activePreviewType === 'quote' 
                    ? 'bg-zinc-700 text-white shadow-inner font-extrabold' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText size={11} /> {isRtl ? 'عرض سعر' : 'Quotation Preview'}
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewType('invoice')}
                className={`px-3 py-1 text-[9px] font-black rounded-md tracking-tight uppercase flex items-center gap-1.5 transition-colors ${
                  activePreviewType === 'invoice' 
                    ? 'bg-zinc-700 text-white shadow-inner font-extrabold' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles size={11} /> {isRtl ? 'فاتورة ضريبية رسمية' : 'Invoice Preview'}
              </button>
            </div>
          </div>

          {/* Letterhead preview page */}
          <div className="flex-1 overflow-x-auto bg-zinc-100 p-6 rounded-3xl border border-zinc-200/60 shadow-inner flex justify-center min-h-[800px]">
            <div 
              style={{ fontFamily: brand.fontFamily, borderColor: brand.accentColor }}
              className={`bg-white text-zinc-800 p-8 sm:p-12 rounded-xl shadow-2xl w-full max-w-2xl min-h-[29.7cm] flex flex-col justify-between border-t-[8px] transition-all`}
            >
              
              {/* BRAND LAYOUT RENDERING GRID */}
              <div className="space-y-6">
                
                {/* 1. Header Layout Variations */}
                {brand.layoutTheme === 'centered_classic' ? (
                  <div className="text-center pb-5 border-b border-zinc-250">
                    {brand.showLogo && (brand.logoBase64 || brand.logoUrl) && (
                      <div className="flex justify-center mb-3">
                        <img 
                          src={brand.logoBase64 || brand.logoUrl} 
                          alt="Logo preview" 
                          className="h-14 object-contain max-w-[150px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h2 className="text-lg font-black tracking-tight text-zinc-900 leading-tight uppercase">
                      {isRtl ? brand.companyNameAr : brand.companyName}
                    </h2>
                    <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mt-1">
                      {isRtl ? brand.sloganAr : brand.slogan}
                    </p>
                    <p className="text-[7.5px] text-zinc-400 mt-2 font-medium">
                      {isRtl ? brand.addressAr : brand.address} • {brand.email} • {brand.phone1} • {brand.website}
                    </p>
                  </div>
                ) : brand.layoutTheme === 'hybrid_editorial' ? (
                  <div className="pb-5 border-b border-zinc-200">
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div className="col-span-2">
                        <h2 className="text-xl font-serif text-zinc-900 leading-tight">
                          {isRtl ? brand.companyNameAr : brand.companyName}
                        </h2>
                        <p className="text-[8px] text-zinc-500 mt-1 font-serif italic">
                          {isRtl ? brand.sloganAr : brand.slogan}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        {brand.showLogo && (brand.logoBase64 || brand.logoUrl) && (
                          <img 
                            src={brand.logoBase64 || brand.logoUrl} 
                            alt="Logo preview" 
                            className="h-10 object-contain max-w-[120px] mb-2"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span className="text-[7.5px] text-zinc-400 font-mono tracking-wide leading-none">{brand.website}</span>
                      </div>
                    </div>
                    <div className="w-full h-[1px] bg-zinc-200 mt-4"></div>
                    <div className="grid grid-cols-2 pt-2 text-[7.5px] text-zinc-400">
                      <div>Address: {isRtl ? brand.addressAr : brand.address}</div>
                      <div className="text-right">Tel: {brand.phone1} | Email: {brand.email}</div>
                    </div>
                  </div>
                ) : brand.layoutTheme === 'clean_compact' ? (
                  <div className="pb-4 border-b border-zinc-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-black tracking-tighter text-zinc-900 uppercase">
                        {isRtl ? brand.companyNameAr : brand.companyName}
                      </h2>
                      <p className="text-[7.5px] text-zinc-500 font-medium">
                        {brand.phone1} | {brand.email} | CR: {brand.commercialRegistry}
                      </p>
                    </div>
                    {brand.showLogo && (brand.logoBase64 || brand.logoUrl) && (
                      <img 
                        src={brand.logoBase64 || brand.logoUrl} 
                        alt="Logo preview" 
                        className="h-8 object-contain max-w-[100px]"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                ) : ( // Default 'modern_asymmetric'
                  <div className="flex justify-between border-b border-zinc-200 pb-5 text-left">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {brand.showLogo && (brand.logoBase64 || brand.logoUrl) ? (
                          <img 
                            src={brand.logoBase64 || brand.logoUrl} 
                            alt="Logo preview" 
                            className="h-10 object-contain max-w-[120px] mr-1"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-zinc-950 text-white text-base font-bold shrink-0">GB</span>
                        )}
                        <span className="font-extrabold uppercase text-xs tracking-wider text-zinc-900 font-sans">
                          {isRtl ? brand.companyNameAr : brand.companyName}
                        </span>
                      </div>
                      <p className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider leading-none">
                        {isRtl ? brand.sloganAr : brand.slogan}
                      </p>
                      <p className="text-[8px] text-zinc-400 mt-2 font-medium">
                        {isRtl ? brand.addressAr : brand.address} • TAX REG ID: {brand.taxNumber}
                      </p>
                      <p className="text-[8px] text-zinc-400 leading-none">
                        Tel: {brand.phone1} • Web Portal: {brand.website}
                      </p>
                    </div>
                    
                    <div className="text-right flex flex-col items-end justify-center">
                      <h2 
                        className="text-sm font-black tracking-tight uppercase leading-none"
                        style={{ color: brand.accentColor }}
                      >
                        {activePreviewType === 'quote' ? (isRtl ? 'عرض سعر تجاري برونق' : 'Official Pricing Quote') : (isRtl ? 'فاتورة ضريبية قانونية' : 'Official Tax Invoice')}
                      </h2>
                      <p className="text-[8px] text-zinc-400 font-mono mt-1 font-bold">DATE: {new Date().toLocaleDateString()}</p>
                      <p className="text-[7.5px] text-zinc-400 font-mono font-bold">REF REPORT CODE: {previewReference}</p>
                      <span className="mt-1 px-2 py-0.5 bg-zinc-100 border text-zinc-600 font-mono text-[8px] font-extrabold rounded">
                        STATUS: UNPAID/PENDING
                      </span>
                    </div>
                  </div>
                )}

                {/* Metadata Client Area */}
                <div className="grid grid-cols-2 gap-4 text-[9px] pt-2 font-semibold text-zinc-500 border-b border-zinc-100 pb-3">
                  <div>
                    <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {isRtl ? 'مقدم إلى (العميل):' : 'Prepared For (Client CRM Account):'}
                    </span>
                    <p className="text-zinc-900 font-bold block text-[10px]">{previewClient?.name || latestDocument?.clientName || ''}</p>
                    <p className="text-zinc-400 text-[8px] uppercase tracking-wide">{previewClient?.address || ''}</p>
                    <p className="text-zinc-400 text-[7.5px] font-mono">{previewClient?.email || ''}{previewClient?.taxNumber ? ` | TAX: ${previewClient.taxNumber}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {isRtl ? 'الجهة المصدرة ومندوب المبيعات:' : 'ERP Dispatcher Reference:'}
                    </span>
                    <p className="text-zinc-900 font-bold block text-[9px]">{brand.companyName || ''}</p>
                    <p className="text-zinc-500 text-[8px]">Sales Specialist: {currentUser.fullName}</p>
                    <p className="text-zinc-400 text-[8px]">VAT Rate: <span className="font-mono">{brand.taxRate || 0}%</span></p>
                  </div>
                </div>

                {/* Sub-body description block */}
                <p className="text-[9px] text-zinc-500 leading-relaxed text-left">
                  We are pleased to submit this commercial file pricing statement. All requested translation materials are processed strictly through authorized accredited translation workflows with guaranteed legal validity and official QA signatures.
                </p>

                {/* Table Layout Simulation */}
                <div className="border border-zinc-250 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[9px] border-collapse">
                    <thead>
                      <tr 
                        className="text-white uppercase tracking-wider text-[7.5px] font-black"
                        style={{ backgroundColor: brand.accentColor }}
                      >
                        <th className="px-3 py-1.5">{isRtl ? 'تفاصيل الخدمة والملف' : 'Service Item description'}</th>
                        <th className="px-3 py-1.5 text-center">{isRtl ? 'الوحدة' : 'Unit'}</th>
                        <th className="px-3 py-1.5 text-right font-bold">{isRtl ? 'الكمية' : 'Qty'}</th>
                        <th className="px-3 py-1.5 text-right">{isRtl ? 'سعر الوحدة' : 'Rate'}</th>
                        <th className="px-3 py-1.5 text-right">{isRtl ? 'الإجمالي الفرعي' : 'Row Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {previewLineItems.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                          <td className="px-3 py-2 font-bold text-zinc-900 text-[9.5px]">
                            {item.desc}
                            <span className="text-[7px] text-zinc-400 block font-normal mt-0.5">Dual-linguist legal audit process chain</span>
                          </td>
                          <td className="px-3 py-2 text-center text-[7.5px] uppercase font-bold text-zinc-400 font-mono">certified</td>
                          <td className="px-3 py-2 text-right font-semibold text-zinc-600 font-mono">{item.qty}</td>
                          <td className="px-3 py-2 text-right text-zinc-500 font-mono">{brand.currency === 'EGP' ? (item.rate * 50).toLocaleString() : item.rate.toFixed(2)}</td>
                          <td 
                            className="px-3 py-2 text-right font-black font-mono text-[9px]"
                            style={{ color: brand.accentColor }}
                          >
                            {brand.currency === 'EGP' ? (item.rowTotal * 50).toLocaleString() : item.rowTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Terms of Service Box */}
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left text-[7.5px] text-zinc-500 space-y-1">
                  <span className="font-extrabold text-[8px] text-zinc-700 block uppercase tracking-wider border-b border-zinc-205 pb-1">
                    {isRtl ? 'الشروط القانونية وأحكام التعاقد الافتراضية:' : 'Default Legal T&C policy:'}
                  </span>
                  <div className="whitespace-pre-line leading-relaxed font-mono">
                    {isRtl ? brand.termsAr : brand.termsEn}
                  </div>
                </div>

                {/* Bank settlement block if checked */}
                {brand.showBankDetails && (
                  <div className="p-2.5 bg-zinc-50/40 border border-zinc-200 border-dashed rounded-xl text-[7.5px] text-zinc-500 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[7px] font-black uppercase text-zinc-400 tracking-wider block mb-0.5">Electronic Bank Routing:</span>
                      <p className="font-bold text-zinc-900 leading-none">{isRtl ? brand.bankNameAr : brand.bankName}</p>
                      <p className="text-zinc-500 leading-tight mt-1">BENEFICIARY: {isRtl ? brand.bankAccountNameAr : brand.bankAccountName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zinc-800 leading-none">SWIFT CODE: {brand.bankSwift}</p>
                      <p className="font-semibold text-zinc-600 font-mono tracking-tighter mt-1">IBAN: {brand.bankIban}</p>
                    </div>
                  </div>
                )}

              </div>

              {/* FOOTER BLOCK WITH STAMP AND SIGNATURES */}
              <div className="pt-4 border-t border-zinc-200 mt-6 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  
                  {/* Authentication Stamp Overlay if checked */}
                  <div className="flex items-center gap-3">
                    {brand.showStamp ? (
                      <div className="relative">
                        {/* Interactive Seal preview */}
                        <div className="w-14 h-14 border-4 border-double border-red-700/80 rounded-full flex flex-col justify-center items-center opacity-75 transform rotate-6 border-dashed p-1 shrink-0 select-none">
                          <span className="text-[5px] uppercase font-black text-red-700 text-center leading-none tracking-tight">APPROVED STAMP</span>
                          <span className="text-[4.5px] font-mono font-bold uppercase leading-none mt-1">GLOBAL BILLING</span>
                          <span className="text-[4px] text-zinc-400 leading-none mt-1">Certified Official</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 border border-zinc-150 border-dashed rounded flex items-center justify-center text-zinc-300 text-[8px] select-none">
                        No Stamp
                      </div>
                    )}
                    <div className="leading-tight">
                      <p 
                        className="font-extrabold text-[8px] uppercase tracking-wider"
                        style={{ color: brand.accentColor }}
                      >
                        {isRtl ? 'مستشار ضمان الجودة للمجموعة' : 'Quality Assurance Stamp Auditor'}
                      </p>
                      <p className="text-[7.5px] text-zinc-400 font-semibold font-sans">Authorized Certification Committee Wing</p>
                      <div className="w-20 h-4 border-b border-zinc-350 border-dashed mt-1.5"></div>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-1 text-right text-[8.5px] font-medium font-sans">
                    <div className="flex justify-between border-b border-zinc-100 pb-0.5 text-zinc-400">
                      <span>Service Items Subtotal</span>
                      <span className="font-mono text-zinc-800 font-bold">
                        {brand.currency === 'EGP' ? (subtotalSumVal * 50).toLocaleString() : subtotalSumVal.toFixed(2)} {brand.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-zinc-400 pb-0.5">
                      <span>Egyptian VAT ({brand.taxRate || 14}%)</span>
                      <span className="font-mono text-zinc-800">
                        +{brand.currency === 'EGP' ? (standardVatSurchages * 50).toLocaleString() : standardVatSurchages.toFixed(2)} {brand.currency}
                      </span>
                    </div>

                    <div 
                      className="flex justify-between items-center text-[10px] p-2 bg-zinc-50 border rounded-lg font-black font-mono shrink-0"
                      style={{ color: brand.accentColor, borderColor: `${brand.accentColor}20` }}
                    >
                      <span className="uppercase">Grand Total Amount Due</span>
                      <span>
                        {brand.currency === 'EGP' ? (totalDueSumVal * 50).toLocaleString() : totalDueSumVal.toFixed(2)} {brand.currency}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Professional document bottom disclaimer */}
                <div className="text-[6.5px] text-zinc-400 text-center uppercase tracking-widest mt-6">
                  {isRtl ? 'المعاملة تم إنشاؤها وتأمينها تلقائياً عبر نظام ERP غلوبالايز' : 'Document executed dynamically from Cairo HQ Central Digital translation database'}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DocumentStudio;
