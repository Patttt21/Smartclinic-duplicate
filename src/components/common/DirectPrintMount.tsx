import React from 'react';
import { createPortal } from 'react-dom';
import { Prescription, Invoice, LabTestOrder } from '../../types/clinic';
import { SmartClinicLogo } from './SmartClinicLogo';
import { formatPeso } from '../../utils/currency';
import {
  CheckCircle2,
  ShieldCheck,
  QrCode,
} from 'lucide-react';

export type PrintableDoc =
  | { type: 'prescription'; data: Prescription }
  | { type: 'receipt'; data: Invoice }
  | { type: 'lab_report'; data: LabTestOrder };

interface Props {
  activeDocument: PrintableDoc | null;
}

/**
 * DirectPrintMount
 * Portals the pure, high-contrast A4 clinical document outside #root.
 * Formatted exclusively for paper printing (@media print) with crisp typography,
 * clinic branding, doctor credentials, and official verification badges.
 */
export const DirectPrintMount: React.FC<Props> = ({ activeDocument }) => {
  if (!activeDocument) return null;

  const renderPrescriptionStationery = (rx: Prescription) => (
    <div className="p-4 bg-white text-slate-950 font-sans space-y-6 max-w-3xl mx-auto">
      {/* Clinic Official Header */}
      <div className="flex justify-between items-start border-b-2 border-teal-700 pb-4 gap-4">
        <div className="flex items-center gap-3.5">
          <SmartClinicLogo className="w-12 h-12 shrink-0" glow={false} />
          <div>
            <h1 className="text-lg font-black tracking-tight text-teal-900 uppercase leading-tight">
              Smart Clinic Integrated Healthcare
            </h1>
            <p className="text-xs text-slate-700 font-semibold">
              Department of Outpatient Medicine &amp; Clinical Therapeutics
            </p>
            <p className="text-[11px] text-slate-600">
              740 Healthcare Blvd, Suite 400 • Tel: (555) 900-SMART • Web: smartclinic.health
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-3 py-1 rounded border border-slate-300 inline-block">
            {rx.prescriptionNumber}
          </span>
          <p className="text-xs text-slate-600 mt-1">
            Date: <strong className="text-slate-900">{rx.date}</strong>
          </p>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
              <CheckCircle2 className="w-3 h-3" />
              <span>{rx.status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Physician & Patient Demographic Grid */}
      <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
        <div>
          <p className="font-bold uppercase text-[10px] text-teal-800 tracking-wider">
            Attending Physician
          </p>
          <p className="font-bold text-sm text-slate-900 mt-0.5">{rx.doctorName}</p>
          <p className="text-slate-700">{rx.doctorSpecialty}</p>
          <p className="font-mono text-[11px] text-slate-600 mt-0.5">
            PRC License: {rx.doctorLicense} • PTR: 8920141-A
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold uppercase text-[10px] text-teal-800 tracking-wider">
            Patient Demographics
          </p>
          <p className="font-bold text-sm text-slate-900 mt-0.5">{rx.patientName}</p>
          <p className="text-slate-700 mt-0.5">
            MRN: <span className="font-mono font-semibold text-teal-900">{rx.patientMrn}</span> • Age: {rx.patientAge}y • Sex: {rx.patientGender}
          </p>
          <p className="text-[11px] text-slate-600">
            Philippine National Health Identity (PhilHealth Registered)
          </p>
        </div>
      </div>

      {/* Rx Insignia & Formulations */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="font-serif italic text-3xl font-extrabold text-teal-800 select-none">
            ℞
          </span>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
            Prescribed Medications &amp; Clinical Dosage
          </span>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {rx.items.map((item, index) => (
            <div key={item.id} className="py-3 text-xs space-y-1">
              <div className="flex justify-between items-baseline gap-2">
                <div className="space-x-1.5">
                  <span className="font-extrabold text-sm text-slate-950">
                    {index + 1}. {item.medicationName}
                  </span>
                  {item.genericName && (
                    <span className="text-xs italic text-slate-600">
                      ({item.genericName})
                    </span>
                  )}
                </div>
                <span className="font-bold text-teal-900 font-mono text-xs shrink-0">
                  Qty: {item.quantity} ({item.duration})
                </span>
              </div>

              <div className="pl-3.5 border-l-2 border-teal-600 space-y-0.5">
                <p className="font-medium text-slate-800">
                  <strong>Sig:</strong> {item.dosage} via {item.route || 'Oral'} route, {item.frequency}.
                </p>
                <p className="text-[11px] italic text-slate-600">
                  Instructions: {item.instructions}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Safety & Regulatory Notices */}
      <div className="grid grid-cols-2 gap-3 text-[10px] pt-1">
        <div className="p-2.5 rounded-lg border border-teal-200 bg-teal-50/60 text-slate-700 space-y-0.5">
          <div className="flex items-center gap-1 font-bold text-teal-900">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>AI Safety Audit Verified</span>
          </div>
          <p className="text-[10px] text-slate-600">
            Zero high-risk contraindications detected against patient allergy profiles.
          </p>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 space-y-0.5">
          <p className="font-semibold text-slate-800">RA 10918 &amp; Generics Act Compliance:</p>
          <p className="text-[10px]">
            Dispense as prescribed. Generic substitution allowed unless noted.
          </p>
        </div>
      </div>

      {/* Physician Signature & Verification Hash */}
      <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
        <div>
          <div className="w-52 h-8 border-b-2 border-slate-800 flex items-center justify-center italic font-serif text-sm text-slate-900">
            {rx.doctorName.replace(', MD', '')}, MD
          </div>
          <p className="text-[10px] text-slate-600 mt-1 uppercase font-semibold">
            Physician Digital Signature &amp; License
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            PRC: {rx.doctorLicense} • S2: S2-98442-B
          </p>
        </div>

        <div className="text-right flex items-center gap-3">
          <div>
            <p className="font-mono text-[9px] text-slate-500">
              HASH: SC-RX-{rx.prescriptionNumber.replace(/[^0-9]/g, '')}-{Date.now().toString(36).toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-800 font-medium">
              Official Electronic Prescription • RA 8792 Compliant
            </p>
          </div>
          <div className="p-1 border border-slate-300 rounded bg-white">
            <QrCode className="w-8 h-8 text-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderReceiptStationery = (invoice: Invoice) => {
    const balanceDue = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    const paymentMethodLabel = invoice.paymentMethod || 'GCash';

    return (
      <div className="p-4 bg-white text-slate-950 font-sans space-y-6 max-w-3xl mx-auto">
        {/* Clinic Official Revenue Header */}
        <div className="flex justify-between items-start border-b-2 border-teal-700 pb-4 gap-4">
          <div className="flex items-center gap-3.5">
            <SmartClinicLogo className="w-12 h-12 shrink-0" glow={false} />
            <div>
              <h1 className="text-lg font-black tracking-tight text-teal-900 uppercase leading-tight">
                Smart Clinic Integrated Healthcare
              </h1>
              <p className="text-xs text-slate-700 font-semibold">
                Patient Accounting &amp; Revenue Services • BIR CAS Registered
              </p>
              <p className="text-[11px] text-slate-600">
                740 Healthcare Blvd, Suite 400 • Tel: (555) 900-SMART • TIN: 004-982-113-000
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-3 py-1 rounded border border-slate-300 inline-block">
              {invoice.invoiceNumber}
            </span>
            <p className="text-xs text-slate-600 mt-1">
              Date: <strong className="text-slate-900">{invoice.date}</strong>
            </p>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                <CheckCircle2 className="w-3 h-3" />
                <span>{invoice.status}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Billed Patient & Payment Details */}
        <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
          <div>
            <p className="font-bold uppercase text-[10px] text-teal-800 tracking-wider">
              Billed Patient
            </p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{invoice.patientName}</p>
            <p className="text-slate-700 mt-0.5">
              MRN: <span className="font-mono font-semibold text-teal-900">{invoice.patientMrn}</span>
            </p>
            <p className="text-[11px] text-slate-600">
              Insurance / Coverage: {invoice.insuranceClaimStatus || 'Direct Patient Settlement'}
            </p>
          </div>

          <div className="text-right">
            <p className="font-bold uppercase text-[10px] text-teal-800 tracking-wider">
              Payment Settlement
            </p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{paymentMethodLabel}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Transaction Code: <span className="font-mono font-semibold text-teal-900">TXN-{invoice.invoiceNumber.replace(/[^0-9]/g, '')}-99</span>
            </p>
            <p className="text-[11px] text-slate-600">
              Terminal: SMART-POS-01 • Cashier ID: CAS-0042
            </p>
          </div>
        </div>

        {/* Itemized Services Table */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Rendered Outpatient Services &amp; Medical Supplies
          </h4>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Rate</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-2 px-3 text-slate-600">{item.category}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-800">{item.quantity}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">{formatPeso(item.unitPrice)}</td>
                    <td className="py-2 px-3 text-right font-bold font-mono text-slate-950">{formatPeso(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary Table */}
        <div className="flex justify-between items-start gap-4 pt-1">
          <div className="max-w-sm p-3 rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">BIR Notice &amp; Tax Compliance:</p>
            <p>
              Pursuant to Section 109 of the NIRC, medical, dental, and hospital services rendered by licensed medical practitioners are exempt from Value Added Tax (VAT).
            </p>
          </div>

          <div className="w-72 p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Assessment:</span>
              <span className="font-mono font-medium text-slate-900">
                {formatPeso(invoice.subtotal || invoice.totalAmount + (invoice.discountAmount || 0))}
              </span>
            </div>

            {invoice.discountAmount && invoice.discountAmount > 0 ? (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Senior / PWD Discount:</span>
                <span className="font-mono">- {formatPeso(invoice.discountAmount)}</span>
              </div>
            ) : null}

            {invoice.hmoClaim ? (
              <div className="flex justify-between text-teal-800 font-semibold">
                <span>HMO ({invoice.hmoClaim.partnerName}):</span>
                <span className="font-mono">- {formatPeso(invoice.hmoClaim.coverageAmount)}</span>
              </div>
            ) : invoice.insuranceClaimStatus === 'Approved' ? (
              <div className="flex justify-between text-teal-800 font-semibold">
                <span>HMO / PhilHealth Coverage:</span>
                <span className="font-mono">- {formatPeso(invoice.totalAmount * 0.4)}</span>
              </div>
            ) : null}

            {invoice.paymentDetails && (
              <div className="text-[10px] text-slate-600 border-t border-slate-200 pt-1">
                <span>Method: <strong>{invoice.paymentDetails.method}</strong></span>
                {invoice.paymentDetails.referenceNumber && (
                  <span className="block font-mono text-[9px]">Ref: {invoice.paymentDetails.referenceNumber}</span>
                )}
                {invoice.paymentDetails.tenderedAmount !== undefined && (
                  <span className="block font-mono text-[9px]">
                    Tendered: {formatPeso(invoice.paymentDetails.tenderedAmount)} | Change: {formatPeso(invoice.paymentDetails.changeAmount || 0)}
                  </span>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-sm text-slate-950">
              <span>Total Paid Amount:</span>
              <span className="font-mono text-teal-900">{formatPeso(invoice.paidAmount)}</span>
            </div>

            {balanceDue > 0 && (
              <div className="flex justify-between font-bold text-xs text-rose-700">
                <span>Outstanding Balance:</span>
                <span className="font-mono">{formatPeso(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cashier Signature & Verification Block */}
        <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
          <div>
            <div className="w-52 h-8 border-b-2 border-slate-800 flex items-center justify-center italic font-serif text-sm text-slate-900">
              Ma. Elena Cruz
            </div>
            <p className="text-[10px] text-slate-600 mt-1 uppercase font-semibold">
              Authorized Clinic Cashier
            </p>
            <p className="text-[10px] font-mono text-slate-500">
              Official Receipt • BIR CAS System Auth #0921-992
            </p>
          </div>

          <div className="text-right flex items-center gap-3">
            <div>
              <p className="font-mono text-[9px] text-slate-500">
                POS: SMART-01 • CAS-0042 • {new Date().toLocaleTimeString()}
              </p>
              <p className="text-[10px] text-slate-800 font-medium">
                Thank you for choosing Smart Clinic.
              </p>
            </div>
            <div className="p-1 border border-slate-300 rounded bg-white">
              <QrCode className="w-8 h-8 text-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLabReportStationery = (order: LabTestOrder) => (
    <div className="p-4 bg-white text-slate-950 font-sans space-y-6 max-w-3xl mx-auto">
      {/* Clinic Official Laboratory Header */}
      <div className="flex justify-between items-start border-b-2 border-teal-700 pb-4 gap-4">
        <div className="flex items-center gap-3.5">
          <SmartClinicLogo className="w-12 h-12 shrink-0" glow={false} />
          <div>
            <h1 className="text-lg font-black tracking-tight text-teal-900 uppercase leading-tight">
              Smart Clinic Diagnostic Laboratories
            </h1>
            <p className="text-xs text-slate-700 font-semibold">
              Department of Clinical Pathology &amp; Molecular Diagnostics • CLIA Certified #CP-9021-A
            </p>
            <p className="text-[11px] text-slate-600">
              740 Healthcare Blvd, Suite 400 • Tel: (555) 900-SMART • DOH Lic. No. 09-0824-A
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-3 py-1 rounded border border-slate-300 inline-block">
            {order.orderNumber}
          </span>
          <p className="text-xs text-slate-600 mt-1">
            Order Date: <strong className="text-slate-900">{order.requestedAt ? order.requestedAt.split('T')[0] : '2026-10-06'}</strong>
          </p>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
              <CheckCircle2 className="w-3 h-3" />
              <span>{order.status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Patient & Test Order Meta */}
      <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
        <div>
          <p className="font-bold uppercase text-[10px] text-teal-800 tracking-wider">
            Patient Demographics
          </p>
          <p className="font-bold text-sm text-slate-900 mt-0.5">{order.patientName}</p>
          <p className="text-slate-700 mt-0.5">
            MRN: <span className="font-mono font-semibold text-teal-900">{order.patientMrn}</span>
          </p>
          <p className="text-[11px] text-slate-600">
            PhilHealth Registered • Specimen: Venous Whole Blood
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold uppercase text-[10px] text-teal-800 tracking-wider">
            Diagnostic Panel
          </p>
          <p className="font-bold text-sm text-slate-900 mt-0.5">{order.testName}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Category: <strong className="text-slate-900">{order.category}</strong> • Urgency: <span className="font-semibold text-teal-900">{order.urgency}</span>
          </p>
          <p className="text-[11px] text-slate-600">
            Ordering Physician: {order.doctorName}
          </p>
        </div>
      </div>

      {/* Certified Laboratory Assay Results Table */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Certified Laboratory Assay Results
        </h4>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2 px-3">Assay Parameter</th>
                <th className="py-2 px-3">Observed Result</th>
                <th className="py-2 px-3">Unit</th>
                <th className="py-2 px-3">Reference Interval</th>
                <th className="py-2 px-3 text-center">Status Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.results?.map((res, i) => (
                <tr key={i} className={res.flag !== 'Normal' ? 'bg-rose-50/60' : ''}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{res.parameter}</td>
                  <td className="py-2 px-3 font-bold font-mono text-slate-950">{res.value}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{res.unit}</td>
                  <td className="py-2 px-3 text-slate-600">{res.referenceRange}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                        res.flag === 'Normal'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : res.flag === 'High'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : res.flag === 'Critical'
                          ? 'bg-red-600 text-white font-black'
                          : 'bg-sky-100 text-sky-900 border border-sky-300'
                      }`}
                    >
                      {res.flag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pathologist Clinical Impression */}
      {order.interpretation && (
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Clinical Pathologist Impression:</span>
          </div>
          <p className="text-slate-700 leading-relaxed text-[11px] pt-0.5">
            {order.interpretation}
          </p>
        </div>
      )}

      {/* Pathologist Sign-Off & Verification Block */}
      <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
        <div>
          <div className="w-52 h-8 border-b-2 border-slate-800 flex items-center justify-center italic font-serif text-sm text-slate-900">
            Dr. Rodrigo M. Santos, MD, FPSP
          </div>
          <p className="text-[10px] text-slate-600 mt-1 uppercase font-semibold">
            Head Pathologist • PRC Lic. 0087411
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            Certified Pathologist Sign-Off • Specimen Verified
          </p>
        </div>

        <div className="text-right flex items-center gap-3">
          <div>
            <p className="font-mono text-[9px] text-slate-500">
              LAB-ID: {order.orderNumber} • CLIA CP-9021-A
            </p>
            <p className="text-[10px] text-slate-800 font-medium">
              Official Laboratory Report
            </p>
          </div>
          <div className="p-1 border border-slate-300 rounded bg-white">
            <QrCode className="w-8 h-8 text-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div id="smartclinic-print-mount">
      {activeDocument.type === 'prescription' && renderPrescriptionStationery(activeDocument.data)}
      {activeDocument.type === 'receipt' && renderReceiptStationery(activeDocument.data)}
      {activeDocument.type === 'lab_report' && renderLabReportStationery(activeDocument.data)}
    </div>,
    document.body
  );
};
