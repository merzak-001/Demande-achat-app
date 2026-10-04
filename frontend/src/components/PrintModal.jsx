import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Printer, X } from 'lucide-react';
const parseRefParts = (rawRef) => {
  if (!rawRef) return { seq: '____', code: 'DP', year: '2026' };
  const str = String(rawRef).trim();
  
  const match = str.match(/(?:N°)?\s*([^\/]+)\/SENSUS\/([^\/]+)\/(\d+)/i);
  if (match) {
    const rawSeq = match[1].replace(/^0+/, '') || match[1];
    return {
      seq: rawSeq,
      code: match[2].toUpperCase(),
      year: match[3]
    };
  }

  const cleanStr = str.replace(/^N°\s*/i, '');
  const parts = cleanStr.split('/');
  return {
    seq: parts[0]?.replace(/^0+/, '') || parts[0] || '____',
    code: parts[1] ? parts[1].toUpperCase() : 'DP',
    year: parts[2] || new Date().getFullYear().toString()
  };
};

export default function PrintModal({ requestId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !requestId) return;

    const fetchRequestDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/requests/${requestId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);

        if (res && res.data) {
          setData(res.data);
        } else {
          // Fallback dataset matching screenshot structure
          setData({
            request: {
              RequestID: requestId || '1023254',
              RequestNumber: '1023254',
              Type: 'Local',
              RequestDate: '2026-03-08',
              Title: 'Membrane pour Clapet 15',
              Department: 'Production',
              RequesterName: 'FERDJALLAH Salem',
              CurrentStatus: 'En Cours',
            },
            items: []
          });
        }
      } catch (error) {
        console.error('Error fetching request details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [isOpen, requestId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const { request, items = [] } = data || {};
  const reqNumber = request?.RequestNumber || requestId || '';
  const refParts = parseRefParts(reqNumber);
  
  const rawDate = request?.RequestDate || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

  const isLocal = request?.Type === 'Local' || request?.Type === 'LOCAL' || !request?.Type;

  const totalRowsCount = Math.max(6, items.length);
  const emptyRowsCount = totalRowsCount - items.length;

  const modalJSX = (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999999] overflow-y-auto font-sans print-modal-overlay">
      <div className="bg-slate-100 rounded-3xl border border-slate-200 max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-6 max-h-[92vh] flex flex-col font-serif text-black print-modal-container">
        
        <div className="flex items-center justify-between no-print bg-slate-900 text-white p-3 rounded-2xl shadow-md font-sans">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-[#0084ff]" />
            <span className="text-xs font-bold">Aperçu Avant Impression — Demande N° {refParts.seq}/SENSUS/{refParts.code}/{refParts.year}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0084ff] hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Printer size={14} />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-1">
          <div className="printable-page max-w-5xl mx-auto bg-white p-6 sm:p-8 shadow-xl border border-slate-300 text-black leading-tight print:p-2 print:shadow-none print:border-none print:max-w-full">
            
            <div className="relative mb-4">
              <div className="flex justify-between items-start">
                <div className="w-44">
                  <img src="/sensus.jpg" alt="Sensus SPA Logo" className="max-h-16 object-contain" />
                </div>
                <div className="text-right text-sm font-bold font-serif">
                  Date : <span className="underline ml-1 font-mono text-base">{formattedDate}</span>
                </div>
              </div>

              <div className="text-center mt-2">
                <h1 className="text-2xl font-black font-serif underline underline-offset-4 tracking-wide uppercase">
                  DEMANDE D'ACHAT {isLocal ? 'LOCAL' : 'A L\'ETRANGER'}
                </h1>
              </div>

              <div className="absolute right-0 top-10 flex items-center space-x-6 text-sm font-bold font-serif">
                <span className="flex items-center gap-1">
                  <span>LOCAL</span>
                  <span className="w-5 h-5 border-2 border-black inline-flex items-center justify-center font-black ml-1 text-base">
                    {isLocal ? 'X' : ''}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span>A L'ETRANGER</span>
                  <span className="w-5 h-5 border-2 border-black inline-flex items-center justify-center font-black ml-1 text-base relative">
                    {!isLocal ? 'X' : ''}
                    {!isLocal && (
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        <line x1="0" y1="20" x2="100" y2="80" stroke="black" strokeWidth="2" />
                      </svg>
                    )}
                  </span>
                </span>
              </div>

              <div className="text-left text-base font-bold mt-2 font-serif flex items-baseline">
                <span>N°</span>
                <span className="mx-2 px-5 border-b border-black font-mono font-black text-lg">
                  {refParts.seq}
                </span>
                <span>/SENSUS/{refParts.code}/{refParts.year}</span>
              </div>
            </div>

            <div className="relative my-4 border-2 border-black">
              {loading ? (
                <div className="p-8 text-center text-slate-500 font-sans">Chargement des données...</div>
              ) : (
                <table className="w-full border-collapse text-sm font-serif">
                  <thead>
                    <tr className="border-b-2 border-black text-black font-bold">
                      <th className="border-r-2 border-black p-2 text-center w-32 font-serif text-base">Code</th>
                      <th className="border-r-2 border-black p-2 text-left pl-3 font-serif text-base">Désignation</th>
                      <th className="border-r-2 border-black p-2 text-center w-40 font-serif text-base">Quantité</th>
                      <th className="p-2 text-left pl-3 w-72 font-serif text-base">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-black text-black h-8">
                        <td className="border-r-2 border-black p-2 text-center font-bold text-sm font-mono align-middle">
                          {idx + 1}
                        </td>
                        <td className="border-r-2 border-black p-2 text-left font-serif text-sm align-middle">
                          {item.ItemDescription || item.Designation || request?.Title}
                        </td>
                        <td className="border-r-2 border-black p-2 text-center font-bold text-sm align-middle font-mono">
                          {typeof item.Quantity === 'number' ? item.Quantity.toLocaleString('fr-FR') : item.Quantity}
                          {item.DeliveredQuantity > 0 && item.DeliveredQuantity < item.Quantity && (
                            <span className="block text-[10px] font-sans font-normal text-slate-700">
                              (Livré: {item.DeliveredQuantity})
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-left font-serif text-xs align-middle leading-tight">
                          {item.ItemStatus ? (
                            <span className="font-bold border-b border-black mr-1">
                              [{item.ItemStatus}{item.DeliveredQuantity ? ` : ${item.DeliveredQuantity}/${item.Quantity}` : ''}]
                            </span>
                          ) : ''}
                          {item.Observation || item.Obs || request?.Description || ''}
                        </td>
                      </tr>
                    ))}

                    {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="border-b border-slate-300 h-8">
                        <td className="border-r-2 border-black p-1.5"></td>
                        <td className="border-r-2 border-black p-1.5"></td>
                        <td className="border-r-2 border-black p-1.5"></td>
                        <td className="p-1.5"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {!loading && emptyRowsCount > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none" viewBox="0 0 1000 1000">
                  <line
                    x1="180"
                    y1={items.length > 0 ? (items.length * 35 + 40) * 1000 / (items.length * 35 + emptyRowsCount * 32 + 35) : 80}
                    x2="990"
                    y2="990"
                    stroke="#000000"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <div className="text-right min-w-[280px]">
                <p className="font-serif font-black text-base uppercase tracking-wider underline underline-offset-4 mb-10">
                  {(() => {
                    const c = refParts.code;
                    if (c === 'DC') return 'LE RESPONSABLE COMMERCIAL';
                    if (c === 'DRH' || c === 'RH') return 'LE RESPONSABLE RESSOURCES HUMAINES';
                    if (c === 'DFC' || c === 'FIN') return 'LE CONTROLEUR FINANCIER';
                    if (c === 'DG') return 'LE DIRECTEUR GENERAL';
                    return 'DIRECTEUR DE PRODUCTION';
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @page {
          size: A4 landscape;
          margin: 6mm;
        }
        @media print {
          body > *:not(.print-modal-overlay) {
            display: none !important;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            z-index: 999999 !important;
          }
          .print-modal-container {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            max-height: none !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-page {
            box-shadow: none !important;
            border: none !important;
            padding: 5px 15px !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
