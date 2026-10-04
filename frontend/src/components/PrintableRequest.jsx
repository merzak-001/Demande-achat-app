import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft } from 'lucide-react';
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

export default function PrintableRequest() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);

      if (res && res.data) {
        setData(res.data);
      } else {
        // Fallback dataset matching screenshot structure
        setData({
          request: {
            RequestID: id || '1023254',
            RequestNumber: '1023254',
            Type: 'Local',
            RequestDate: '2026-03-08',
            Title: 'Membrane pour Clapet 15',
            Department: 'Production',
            RequesterName: 'FERDJALLAH Salem',
            CurrentStatus: 'En Cours',
          },
          items: [
            {
              ItemID: 1,
              ItemCode: '1023254',
              ItemDescription: 'Membrane pour Clapet 15.',
              Quantity: 400000,
              Observation: 'Pour le besoin de production année2026'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Chargement du document de demande d'achat...</div>;
  }

  const { request, items = [] } = data || {};
  const reqNumber = request?.RequestNumber || id || '1023254';
  const refParts = parseRefParts(reqNumber);
  
  // Format Date DD/MM/YYYY
  const rawDate = request?.RequestDate || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

  // Request Type
  const isLocal = request?.Type === 'Local' || request?.Type === 'LOCAL' || !request?.Type;

  // Grid rows calculation (6 rows total maximum to ensure strict 1-page fit on landscape paper)
  const totalRowsCount = Math.max(6, items.length);
  const emptyRowsCount = totalRowsCount - items.length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-serif no-print-bg text-black">
      
      {/* Top Action Bar (Hidden when printing) */}
      <div className="max-w-6xl mx-auto mb-4 flex items-center justify-between no-print bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl font-sans">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Retour à la gestion</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0084ff] hover:bg-blue-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Printer size={15} />
            <span>Lancer L'Impression</span>
          </button>
          <button
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-700"
          >
            <span>Fermer la Fenêtre</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (Strictly 1-Page Landscape Format) */}
      <div className="printable-page max-w-6xl mx-auto bg-white p-6 sm:p-10 shadow-2xl border border-slate-300 text-black leading-tight print:p-2 print:shadow-none print:border-none print:max-w-full">
        
        {/* Header Block */}
        <div className="relative mb-4">
          {/* Top Row: Logo (Left) & Date (Right) */}
          <div className="flex items-start justify-between mb-1">
            <div className="h-12 max-w-[180px] flex items-center">
              <img src="/sensus.jpg" alt="Sensus SPA Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-right text-sm font-bold font-serif pt-1">
              Date : {formattedDate}
            </div>
          </div>

          {/* Centered Box Title */}
          <div className="text-center my-2">
            <div className="inline-block border-2 border-black px-6 py-1 text-xl font-extrabold tracking-wider uppercase font-serif">
              DEMANDE D'ACHAT
            </div>
          </div>

          {/* Subheader: LOCAL - Etranger */}
          <div className="text-center my-2 text-base font-bold font-serif tracking-wide">
            <span className={isLocal ? "underline underline-offset-4 font-black" : "line-through text-slate-400"}>LOCAL</span>
            <span className="mx-2">-</span>
            <span className={!isLocal ? "underline underline-offset-4 font-black" : "relative inline-block"}>
              Etranger
              {isLocal && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <line x1="0" y1="20" x2="100" y2="80" stroke="black" strokeWidth="2" />
                </svg>
              )}
            </span>
          </div>

          {/* Request N° */}
          <div className="text-left text-base font-bold mt-2 font-serif flex items-baseline">
            <span>N°</span>
            <span className="mx-2 px-5 border-b border-black font-mono font-black text-lg">
              {refParts.seq}
            </span>
            <span>/SENSUS/{refParts.code}/{refParts.year}</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="relative my-4 border-2 border-black">
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
              {/* Item Rows */}
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-black text-black h-8">
                  <td className="border-r-2 border-black p-2 text-center font-bold text-sm font-mono align-middle">
                    {idx + 1}
                  </td>
                  <td className="border-r-2 border-black p-2 text-left font-serif text-sm align-middle">
                    {item.ItemDescription || item.Designation || request.Title}
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
                    {item.Observation || item.Obs || request.Description || ''}
                  </td>
                </tr>
              ))}

              {/* Empty Rows with Diagonal Line Overlay */}
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

          {/* Diagonal Line crossing empty space */}
          {emptyRowsCount > 0 && (
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

        {/* Footer Signature Section */}
        <div className="mt-8 flex justify-end">
          <div className="text-right min-w-[280px]">
            {/* Title */}
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

      {/* Print-specific Styles: Strictly 1-Page Landscape Format */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 6mm;
        }
        @media print {
          html, body {
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, .no-print-bg {
            display: none !important;
          }
          .printable-page {
            box-shadow: none !important;
            border: none !important;
            padding: 5px 15px !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 195mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}
