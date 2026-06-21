/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, KeyRound, Mail, ShieldAlert, Sparkles, LogIn, ArrowRight, CheckCircle, Info, Lock, Globe 
} from 'lucide-react';
import { Profile, UserRole } from '../types';
import dbInstance from '../db/store';
import { GlobalizeLogo } from './GlobalizeLogo';
import { useToast } from './Toast';

interface LoginPageProps {
  onSuccessLogin: (user: Profile) => void;
  isRtl: boolean;
  onToggleRtl: () => void;
}

export default function LoginPage({ onSuccessLogin, isRtl, onToggleRtl }: LoginPageProps) {
  const { error } = useToast();
  const [phoneOrName, setPhoneOrName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const companyName = dbInstance.brandConfig?.companyName || '';

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const user = await dbInstance.login(phoneOrName.trim(), password);
      onSuccessLogin(user);
    } catch (err: any) {
      setErrorMsg(err.message || (isRtl ? '???? ????? ??????.' : 'Unable to sign in.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-brand-bg flex flex-col justify-between font-sans text-brand-text ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* HEADER BAR */}
      <header className="bg-brand-navy px-8 py-4 border-b border-brand-navy-dark flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <GlobalizeLogo size={34} textColorClass="text-brand-gold" isRtl={isRtl} />
          <div className="hidden sm:inline-block border-l border-brand-navy-dark pl-3">
            <span className="text-[9px] uppercase font-black px-2 py-0.5 bg-brand-navy-dark text-brand-gold-light rounded border border-brand-navy-dark font-mono tracking-widest">SECURE GATEWAY</span>
          </div>
        </div>

        <button
          onClick={onToggleRtl}
          className="px-3.5 py-1.5 bg-brand-navy-hover hover:bg-brand-navy-dark text-white transition-colors rounded-lg flex items-center gap-1.5 border border-brand-navy-dark cursor-pointer font-bold text-xs"
        >
          <Globe size={13} />
          <span>{isRtl ? 'English Standard' : 'عربي RTL'}</span>
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200/80 shadow-lg overflow-hidden animate-fade-in">
          
          {/* CREDENTIALS LOGIN FORM */}
          <div className="p-8 md:p-10 space-y-6 flex flex-col justify-center">
            <div className="space-y-1.5 animate-slide-in">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                {isRtl ? 'بوابة الأمن السيبراني والمصادقة' : 'Secure Authorization Core'}
              </span>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                {isRtl ? 'تسجيل الدخول' : `Sign in${companyName ? ` to ${companyName}` : ''}`}
              </h2>
              <p className="text-xs text-zinc-400">
                {isRtl ? 'أدخل البريد الإلكتروني الرسمي أو الشخصي المعتمد والرقم السري.' : 'Enter employee official/personal email and security password below.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-750 rounded-xl flex items-start gap-2 border border-red-200 text-xs animate-slide-in">
                <ShieldAlert size={15} className="shrink-0 text-red-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  {isRtl ? 'البريد الإلكتروني للموظف *' : 'Employee Email Address *'}
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={phoneOrName}
                    onChange={e => setPhoneOrName(e.target.value)}
                    placeholder={isRtl ? 'مثال: name@globalizetl.com' : 'e.g. name@globalizetl.com'}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-850 placeholder-zinc-350 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  {isRtl ? 'كلمة المرور السرية للموظف *' : 'Security Password *'}
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-850 placeholder-zinc-350 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 animate-slide-in">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-brand-gold hover:bg-brand-gold-hover text-brand-navy font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-99 disabled:opacity-50 tracking-tight"
                >
                  <span>{isLoading ? (isRtl ? 'جاري المصادقة الفنية...' : 'Authenticating...') : (isRtl ? 'تسجيل الدخول الآمن' : 'Authorize Secure Login')}</span>
                  {!isLoading && <ArrowRight size={14} className={`${isRtl ? 'rotate-180' : ''}`} />}
                </button>
              </div>
            </form>

            <div className="text-[9px] text-zinc-400 mt-2 text-center border-t border-zinc-100 pt-3">
              {isRtl 
                ? 'نظام الترجمة والمحاسبة والتوثيق المعتمد • براءة اختراع v2.6' 
                : 'Accredited Bureaus Administration & Accounting Ledger • Proprietary v2.6'}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-6 text-center text-[10px] text-brand-navy-light/60 border-t border-brand-navy-dark bg-brand-navy-dark tracking-wide">
        {isRtl 
          ? 'حقوق الطبع محفوظة © 2026 هاتف أحمد عبد الغفار وأبو الفتوح للترجمة والاعتماد القانوني والتوثيق.' 
          : ''}
      </footer>
    </div>
  );
}
