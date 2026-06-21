/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, CheckCircle, ShieldAlert, Award, 
  Sparkles, Save, Printer, ArrowLeft, Stamp, FileCheck2 
} from 'lucide-react';
import { Quotation, Client, ServiceType } from '../types';
import dbInstance from '../db/store';
import { useToast } from './Toast';

interface QuotationsPageProps {
  isRtl: boolean;
  currentRole: string;
}

export const QuotationsPage: React.FC<QuotationsPageProps> = ({ isRtl, currentRole }) => {
  const { success, error } = useToast();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [activeLetterheadQuoteId, setActiveLetterheadQuoteId] = useState<string | null>(null);

  // Quote form states
  const [qClientId, setQClientId] = useState('');
  const [qFileName, setQFileName] = useState('');
  const [qService, setQService] = useState<ServiceType>('translation');
  const [qSourceLang, setQSourceLang] = useState('');
  const [qTargetLang, setQTargetLang] = useState('');
  const [qWords, setQWords] = useState<number>(0);
  const [qEgp, setQEgp] = useState<number>(0);
  const [qAed, setQAed] = useState<number>(0);
  const [qUsd, setQUsd] = useState<number>(0);
  const [qNotes, setQNotes] = useState('');

  useEffect(() => {
    setQuotations(dbInstance.quotations);
    setClients(dbInstance.clients);

    const sub = dbInstance.subscribe(() => {
      setQuotations([...dbInstance.quotations]);
      setClients([...dbInstance.clients]);
    });
    return sub;
  }, []);

  const handleRegisterQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'owner' && currentRole !== 'sales' && currentRole !== 'admin') {
      error('Access Denied. Only Owners, Sales, or Admins can issue quotes.');
      return;
    }

    dbInstance.addQuotation({
      clientId: qClientId || undefined,
      fileName: qFileName,
      serviceType: qService,
      sourceLanguage: qSourceLang,
      targetLanguage: qTargetLang,
      wordCount: qWords,
      amountEgp: qEgp,
      amountAed: qAed,
      amountUsd: qUsd,
      validUntil: new Date(Date.now() + 3600000 * 24 * 15).toISOString().split('T')[0], // 15 days validity
      status: 'sent',
      notes: qNotes
    });

    setIsCreatingQuote(false);
    setQClientId('');
    setQFileName('');
    setQWords(0);
    setQEgp(0);
    setQAed(0);
    setQUsd(0);
    setQNotes('');
  };

  const handleApproveQuote = (id: string) => {
    dbInstance.updateQuotationStatus(id, 'confirmed');
    success(isRtl ? 'تمت الموافقة وتم إنشاء ملف مشروع تلقائياً' : 'Quotation Approved and Job created successfully.');
  };

  const activeQuote = quotations.find(q => q.id === activeLetterheadQuoteId);
  const activeClient = activeQuote?.clientId ? clients.find(c => c.id === activeQuote.clientId) : undefined;
  const brand = dbInstance.brandConfig || dbInstance.getEmptyBrandConfig();

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* RENDER VIEW 1: PRINTABLE CERTIFIED LETTERHEAD STATEMENT */}
      {activeLetterheadQuoteId && activeQuote ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-3xl mx-auto border-t-8 border-[#1B4F72] relative">
          
          {/* Stamps/Certification background overlay */}
          <div className="absolute right-12 bottom-32 opacity-10 select-none hover:opacity-10 pointer-events-none transform rotate-12">
            <div className="w-36 h-36 border-4 border-double border-indigo-900 rounded-full flex flex-col items-center justify-center font-bold text-center text-indigo-900">
              <Stamp size={48} className="translate-y-1" />
              <span className="text-[10px] uppercase font-sans tracking-tight font-black mt-1">Certified</span>
              <span className="text-[8px] font-mono leading-none mt-1">{brand.commercialRegistry}</span>
            </div>
          </div>

          <button
            onClick={() => setActiveLetterheadQuoteId(null)}
            className="mb-8 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{isRtl ? 'الرجوع للقائمة' : 'Back to Quotes'}</span>
          </button>

          {/* Business Branded Header */}
          <div className="flex justify-between pb-6 border-b-2 border-slate-150 border-slate-200 text-xs">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-extrabold text-[#1B4F72] uppercase text-sm tracking-wider font-sans">{brand.companyName}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">{brand.slogan}</p>
              <p className="text-[10px] text-slate-450 mt-1 text-slate-400">{brand.address}{brand.phone1 ? ` ? Tel: ${brand.phone1}` : ``}</p>
            </div>
            <div className="text-right">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 uppercase">OFFICIAL QUOTATION</h1>
              <span className="text-[11px] font-black font-mono text-slate-500 block mt-1">RE: {activeQuote.quoteNumber}</span>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">VALID: 15 DAYS UNTIL {activeQuote.validUntil}</span>
            </div>
          </div>

          {/* Letterbody */}
          <div className="my-8 space-y-5 text-xs font-sans leading-relaxed">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide">
              Dear {activeClient?.name || activeQuote.clientName || ``},
            </h4>
            <p className="text-slate-600">
              {activeQuote.notes || ``}
            </p>

            <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl space-y-2">
              <div className="flex justify-between leading-none text-[11px] font-semibold text-slate-505">
                <span>Folder Subject Name</span>
                <span className="font-bold text-slate-900">{activeQuote.fileName}</span>
              </div>
              <div className="flex justify-between leading-none text-[11px] font-semibold text-slate-505">
                <span>Service Type Class</span>
                <span className="capitalize text-slate-900 font-bold">{activeQuote.serviceType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between leading-none text-[11px] font-semibold text-slate-505">
                <span>Accreditted Language Path</span>
                <span className="font-extrabold text-slate-900">{activeQuote.sourceLanguage} ➔ {activeQuote.targetLanguage}</span>
              </div>
              <div className="flex justify-between leading-none text-[11px] font-semibold text-slate-505">
                <span>Total Words Summed</span>
                <span className="font-mono text-slate-900 font-bold">{activeQuote.wordCount.toLocaleString()} words</span>
              </div>
            </div>

            {/* Pricing Total block */}
            <div className="my-6 border-2 border-dashed border-[#1B4F72]/20 p-5 rounded-2xl flex justify-between items-center bg-[#1B4F72]/5">
              <div>
                <span className="text-[10px] font-bold text-[#1B4F72] uppercase tracking-wider block">Estimated Quote Value</span>
                <h2 className="text-2xl font-black text-[#1B4F72] mt-1 font-mono">
                  {activeQuote.amountEgp > 0 && `EGP ${activeQuote.amountEgp.toLocaleString()}`}
                  {activeQuote.amountAed > 0 && `AED ${activeQuote.amountAed.toLocaleString()}`}
                  {activeQuote.amountUsd > 0 && `USD ${activeQuote.amountUsd.toLocaleString()}`}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Filing Date</span>
                <span className="text-slate-700 font-bold font-mono">{new Date(activeQuote.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-slate-500 text-[10px] leading-normal pt-4">
              Upon client written or digital signoff, this document becomes instantly legally binding. Translating assignment stages will be queued immediately inside GTMS workspace environments.
            </p>
          </div>

          {/* Letter footer stamps section */}
          <div className="flex justify-between pt-8 border-t border-slate-100">
            <div>
              <p className="font-bold text-slate-800 text-[10px] uppercase">Bureau Auditor</p>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">Corporate Legal QA Team</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="font-bold text-slate-800 text-[10px] uppercase">Accredited Stamp</p>
              <div className="w-16 h-16 border-2 border-indigo-900 rounded-full flex flex-col justify-center items-center opacity-70 transform rotate-6 border-dashed mt-1.5 p-1">
                <span className="text-[6px] uppercase font-black text-indigo-900">GLOBAL BUREAU</span>
                <span className="text-[5px] font-mono font-bold uppercase leading-none mt-1">Egypt HQ</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-slate-850 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 active:scale-95 border border-indigo-700/20"
            >
              <Printer size={12} />
              <span>Print officially</span>
            </button>
          </div>
        </div>
      ) : (
        /* STANDARD LISTINGS VIEW */
        <div className="space-y-6">
          {/* Create Quota Form */}
          {isCreatingQuote && (
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm font-sans text-xs">
              <h2 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                Draft Professional certified quotation
              </h2>
              <form onSubmit={handleRegisterQuotation} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Select Target CRM Client</label>
                  <select
                    value={qClientId}
                    onChange={e => setQClientId(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer focus:outline-none"
                    required
                  >
                    <option value="">-- Choose client account --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.nameAr})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-405 text-slate-500 uppercase">Subject File Name</label>
                  <input 
                    type="text" 
                    value={qFileName} 
                    onChange={e => setQFileName(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Bylaws_Aramco.docx"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Service Type</label>
                  <select 
                    value={qService} 
                    onChange={e => setQService(e.target.value as any)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="translation">Standard translation</option>
                    <option value="certified_translation">Official certified translation</option>
                    <option value="proofreading">Linguistic proofreading</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-505 uppercase">Source language</label>
                    <input type="text" value={qSourceLang} onChange={e => setQSourceLang(e.target.value)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-505 uppercase">Target Language</label>
                    <input type="text" value={qTargetLang} onChange={e => setQTargetLang(e.target.value)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl" required />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Estimated Word Count</label>
                  <input 
                    type="number" 
                    value={qWords || ''} 
                    onChange={e => setQWords(parseInt(e.target.value) || 0)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 md:col-span-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-550 uppercase">Price EGP</label>
                    <input type="number" value={qEgp || ''} onChange={e => setQEgp(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-center rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-555 uppercase">Price AED (optional)</label>
                    <input type="number" value={qAed || ''} onChange={e => setQAed(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-center rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Price USD (optional)</label>
                    <input type="number" value={qUsd || ''} onChange={e => setQUsd(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-center rounded-xl" />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Quotation notes</label>
                  <input type="text" value={qNotes} onChange={e => setQNotes(e.target.value)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl" placeholder="E.g. certified with stamp, layout retains tables..." />
                </div>

                <div className="md:col-span-3 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreatingQuote(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Confirm draft quote
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quotations tabular lists */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Certified Price Quotations registry log
              </h3>
              <button
                onClick={() => setIsCreatingQuote(!isCreatingQuote)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Issue Price Quote</span>
              </button>
            </div>

            <div className="overflow-x-auto w-full mt-3">
              <table className="w-full text-xs text-left text-slate-600 font-sans border-collapse">
                <thead className="text-[10px] text-slate-400 bg-slate-50 uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-3 font-bold text-center">Quote Ref</th>
                    <th className="px-5 py-3 font-bold">Target Customer</th>
                    <th className="px-5 py-3 font-bold">Document Subject</th>
                    <th className="px-5 py-3 text-center font-bold">Language Pairing</th>
                    <th className="px-5 py-3 text-right font-bold">Est Cost Price</th>
                    <th className="px-5 py-3 text-center font-bold">Security state</th>
                    <th className="px-5 py-3 text-center font-bold">Certified docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-102 font-sans divide-slate-100">
                  {quotations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No active certified quotations drafted inGTMS. Execute "Issue Price Quote" to begin.
                      </td>
                    </tr>
                  ) : (
                    quotations.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-black font-mono text-center text-slate-800 shrink-0">{q.quoteNumber}</td>
                        <td className="px-5 py-3 font-bold text-slate-950">{q.clientName}</td>
                        <td className="px-5 py-3 truncate max-w-xs">{q.fileName}</td>
                        <td className="px-5 py-3 text-center text-slate-500 font-semibold">{q.sourceLanguage} ➔ {q.targetLanguage}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold">
                          {q.amountEgp > 0 && <span>EGP {q.amountEgp.toLocaleString()}</span>}
                          {q.amountAed > 0 && <span>AED {q.amountAed.toLocaleString()}</span>}
                          {q.amountUsd > 0 && <span>USD {q.amountUsd.toLocaleString()}</span>}
                          {q.grandTotal > 0 && q.amountEgp === 0 && q.amountAed === 0 && q.amountUsd === 0 && (
                            <span>{q.grandTotal.toLocaleString()} {q.currency}</span>
                          )}
                          {q.depositAmount > 0 && (
                            <div className="text-[9px] text-red-500 mt-1">
                              Bal: {q.depositBalance?.toLocaleString()} {q.currency}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            q.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            q.status === 'sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 flex justify-center gap-2">
                          <button
                            onClick={() => setActiveLetterheadQuoteId(q.id)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-slate-900 text-white hover:bg-slate-800 rounded transition-all cursor-pointer"
                          >
                            PDF Preview
                          </button>
                          {q.status === 'sent' && (
                            <button
                              onClick={() => handleApproveQuote(q.id)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-all cursor-pointer"
                            >
                              Approve / Start
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationsPage;
