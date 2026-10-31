import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  Prescription,
  Invoice,
  LabTestOrder,
  Appointment,
  ConsultationNote,
  Patient,
  InventoryItem,
  InventoryTransaction,
} from '../../types/clinic';
import { SmartClinicLogo } from './SmartClinicLogo';
import { formatPeso } from '../../utils/currency';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export type PrintableDoc =
  | { type: 'prescription'; data: Prescription }
  | { type: 'receipt'; data: Invoice }
  | { type: 'official_receipt_demo'; data: Invoice }
  | { type: 'invoice_summary'; data: { invoices: Invoice[]; generatedBy: string } }
  | { type: 'appointment_confirmation'; data: Appointment }
  | { type: 'appointment_qr'; data: Appointment }
  | { type: 'lab_request'; data: LabTestOrder }
  | { type: 'lab_report'; data: LabTestOrder }
  | { type: 'released_lab_result'; data: LabTestOrder }
  | { type: 'consultation_summary'; data: { note: ConsultationNote; patientName: string; patientMrn: string } }
  | {
      type: 'medical_certificate';
      data: {
        patientName: string;
        patientMrn: string;
        doctorName: string;
        doctorCredential?: string;
        diagnosisSummary: string;
        recommendation: string;
        restDays?: number;
        issuedDate: string;
        referenceNumber: string;
      };
    }
  | { type: 'patient_medical_summary'; data: { patient: Patient; generatedBy: string } }
  | { type: 'inventory_report'; data: { items: InventoryItem[]; generatedBy: string } }
  | {
      type: 'dispensing_report';
      data: { transactions: InventoryTransaction[]; prescriptions: Prescription[]; generatedBy: string };
    }
  | { type: 'daily_lab_report'; data: { orders: LabTestOrder[]; generatedBy: string } }
  | {
      type: 'admin_report';
      data: {
        title: string;
        generatedBy: string;
        metrics: Array<{ label: string; value: string }>;
        notes?: string;
      };
    }
  | {
      type: 'predictive_report';
      data: {
        branch: string;
        horizonMonths: number;
        modelUsed: string;
        historicalPeriod: string;
        generatedBy: string;
        monthlyForecasts: Array<{
          monthLabel: string;
          predictedVisits: number;
          lowerBound: number;
          upperBound: number;
          demandLevel: string;
        }>;
        categoryForecasts?: Array<{
          category: string;
          nextMonthPredicted: number;
          trendDirection: string;
        }>;
      };
    };

interface Props {
  activeDocument: PrintableDoc | null;
}

const PrintHeader: React.FC<{
  subtitle: string;
  reference: string;
  dateLabel: string;
  statusLabel?: string;
  isFinancialDemo?: boolean;
}> = ({ subtitle, reference, dateLabel, statusLabel, isFinancialDemo }) => (
  <div className="space-y-3 border-b-2 border-blue-700 pb-4">
    {isFinancialDemo && (
      <div className="w-full py-1.5 px-3 bg-amber-50 border border-amber-400 rounded text-center text-[11px] font-black tracking-wider uppercase text-amber-950">
        DEMO — NOT VALID FOR OFFICIAL TAX PURPOSES
      </div>
    )}
    <div className="flex justify-between items-start gap-4">
      <div className="flex items-center gap-3.5">
        <SmartClinicLogo className="w-11 h-11 shrink-0" glow={false} />
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-tight">
            SmartClinic Outpatient Healthcare System
          </h1>
          <p className="text-xs text-blue-800 font-semibold">{subtitle}</p>
          <p className="text-[11px] text-slate-600">
            Academic Capstone Demonstration Prototype • Synthetic Outpatient Records Only
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 tabular-nums">
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-3 py-1 rounded border border-slate-300 inline-block">
          {reference}
        </span>
        <p className="text-xs text-slate-600 mt-1">
          Date: <strong className="text-slate-900">{dateLabel}</strong>
        </p>
        {statusLabel && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 uppercase">
              <CheckCircle2 className="w-3 h-3" />
              <span>{statusLabel}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const DirectPrintMount: React.FC<Props> = ({ activeDocument }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (
      activeDocument &&
      (activeDocument.type === 'appointment_qr' || activeDocument.type === 'appointment_confirmation')
    ) {
      const apt = activeDocument.data;
      const nonPhiPayload =
        apt.qrPayload ||
        JSON.stringify({
          v: 2,
          ref: apt.bookingReference || apt.id,
          token: apt.qrToken || 'verified-ref',
        });
      QRCode.toDataURL(nonPhiPayload, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [activeDocument]);

  if (!activeDocument) return null;

  const todayIso = new Date().toISOString().split('T')[0];

  const renderPrescription = (rx: Prescription) => {
    const cleanCredential = (rx.doctorLicense || 'DEMO-MD-001').replace(/^PRC-/i, 'DEMO-');
    return (
      <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto">
        <PrintHeader
          subtitle="Outpatient Electronic Prescription (Demonstration Document)"
          reference={rx.prescriptionNumber}
          dateLabel={rx.date || todayIso}
          statusLabel={rx.status}
        />

        <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <p className="font-bold uppercase text-[10px] text-blue-800 tracking-wider">
              Prescribing Physician
            </p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{rx.doctorName}</p>
            <p className="text-slate-700">{rx.doctorSpecialty}</p>
            <p className="font-mono text-[11px] text-slate-600 mt-0.5">
              Demo Credential ID: {cleanCredential}
            </p>
          </div>

          <div className="text-right">
            <p className="font-bold uppercase text-[10px] text-blue-800 tracking-wider">
              Patient Information
            </p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{rx.patientName}</p>
            <p className="text-slate-700 mt-0.5 tabular-nums">
              MRN: <span className="font-mono font-semibold text-slate-900">{rx.patientMrn}</span>
              {rx.patientAge ? ` • Age: ${rx.patientAge}y` : ''}
              {rx.patientGender ? ` • Sex: ${rx.patientGender}` : ''}
            </p>
            {rx.consultationId && (
              <p className="text-[11px] text-slate-600 font-mono">
                Consultation Ref: {rx.consultationId}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-2xl font-extrabold text-blue-800 select-none">
              Rx
            </span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Prescribed Medications &amp; Administration Instructions
            </span>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {rx.items.map((item, index) => (
              <div key={item.id || index} className="py-3 text-xs space-y-1">
                <div className="flex justify-between items-baseline gap-2">
                  <div>
                    <span className="font-extrabold text-sm text-slate-950">
                      {index + 1}. {item.medicationName}
                    </span>
                    {item.genericName && (
                      <span className="text-xs italic text-slate-600 ml-1.5">
                        ({item.genericName})
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 font-mono text-xs tabular-nums">
                    Qty: {item.quantity} ({item.duration})
                  </span>
                </div>
                <p className="font-medium text-slate-800">
                  <strong>Dosage &amp; Frequency:</strong> {item.dosage} • {item.route || 'Oral'} •{' '}
                  {item.frequency}
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>Instructions:</strong> {item.instructions || 'Follow physician guidance.'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-between items-end border-t border-slate-200 text-xs">
          <div>
            <p className="font-bold text-slate-900">{rx.doctorName}</p>
            <p className="text-[10px] text-slate-600">
              Prescribing Clinician (Academic Demonstration Record — Unsigned)
            </p>
            <p className="text-[10px] font-mono text-slate-500">ID: {cleanCredential}</p>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p className="font-mono">REF: {rx.prescriptionNumber}</p>
            <p>SmartClinic Demonstration Prescription • Not Valid for Retail Dispensing</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialReceipt = (invoice: Invoice, isOfficialDemo: boolean) => {
    const balanceDue = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    return (
      <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto">
        <PrintHeader
          subtitle={
            isOfficialDemo
              ? 'Demonstration Official Receipt (Academic Prototype)'
              : 'Outpatient Billing & Payment Receipt (Academic Prototype)'
          }
          reference={invoice.invoiceNumber}
          dateLabel={invoice.date || todayIso}
          statusLabel={invoice.status}
          isFinancialDemo={true}
        />

        <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <p className="font-bold uppercase text-[10px] text-blue-800 tracking-wider">
              Billed Patient
            </p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{invoice.patientName}</p>
            <p className="text-slate-700 font-mono tabular-nums">MRN: {invoice.patientMrn}</p>
          </div>
          <div className="text-right">
            <p className="font-bold uppercase text-[10px] text-blue-800 tracking-wider">
              Settlement Method
            </p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">
              {invoice.paymentMethod || 'Cash / Clinic Counter'}
            </p>
            <p className="text-[11px] text-slate-600 font-mono">
              Demo Reference: TXN-{invoice.invoiceNumber.replace(/[^0-9A-Z]/gi, '')}
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2 px-3">Service / Item</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3 text-center">Qty</th>
                <th className="py-2 px-3 text-right">Unit Price</th>
                <th className="py-2 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{item.description}</td>
                  <td className="py-2 px-3 text-slate-600">{item.category}</td>
                  <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatPeso(item.unitPrice)}</td>
                  <td className="py-2 px-3 text-right font-bold font-mono">
                    {formatPeso(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="max-w-sm p-3 rounded-lg border border-amber-300 bg-amber-50 text-[10px] text-amber-950">
            <p className="font-bold uppercase">DEMO — NOT VALID FOR OFFICIAL TAX PURPOSES</p>
            <p className="mt-0.5">
              Generated by SmartClinic V2 academic healthcare prototype using synthetic billing data.
            </p>
          </div>

          <div className="w-72 p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Total Assessment:</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatPeso(invoice.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-950 border-t border-slate-200 pt-1.5">
              <span>Paid Amount:</span>
              <span className="font-mono text-blue-900">{formatPeso(invoice.paidAmount)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between font-bold text-xs text-rose-700">
                <span>Balance Due:</span>
                <span className="font-mono">{formatPeso(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAppointmentDocument = (apt: Appointment, qrFocus: boolean) => {
    const mode = apt.consultationMode || (apt.type === 'Telehealth' ? 'Online Consultation' : 'In-Person');
    const ref = apt.bookingReference || apt.id;
    return (
      <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-2xl mx-auto">
        <PrintHeader
          subtitle={
            qrFocus
              ? 'Appointment QR Check-In Pass (Non-PHI Verification Token)'
              : 'Confirmed Outpatient Appointment Slip'
          }
          reference={ref}
          dateLabel={apt.date}
          statusLabel={apt.status}
        />

        <div className="grid grid-cols-2 gap-4 text-xs p-4 rounded-xl border border-slate-200 bg-slate-50 tabular-nums">
          <div className="space-y-1.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Booking Reference
              </span>
              <span className="font-mono font-black text-sm text-blue-900">{ref}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Clinic Branch
              </span>
              <span className="font-bold text-slate-900">
                {apt.branch || 'Main Outpatient Clinic'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Assigned Doctor
              </span>
              <span className="font-bold text-slate-900">{apt.doctorName}</span>
              <span className="block text-[11px] text-slate-600">{apt.department}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Appointment Date &amp; Time
              </span>
              <span className="font-bold text-sm text-slate-900">
                {apt.date} at {apt.time}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Consultation Type
              </span>
              <span className="font-bold text-blue-800">{mode}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Current Status
              </span>
              <span className="font-bold text-emerald-800">{apt.status}</span>
            </div>
          </div>
        </div>

        {mode === 'In-Person' && (
          <div className="p-5 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-2">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt={`Appointment QR code for booking ${ref}`}
                className="w-40 h-40 object-contain border border-slate-200 p-2 rounded-lg bg-white"
              />
            )}
            <p className="font-mono font-bold text-xs text-slate-900">{ref}</p>
            <p className="text-[11px] text-slate-600 max-w-md">
              Present this QR code at the Clinic Reception or Nursing Desk for check-in verification.
              For privacy protection, this QR encodes only a signed booking verification reference and
              contains zero personal health information (PHI).
            </p>
          </div>
        )}

        {mode === 'Online Consultation' && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-xs space-y-1">
            <p className="font-bold text-blue-950">Online Video Consultation Instructions</p>
            <p className="text-blue-900">
              Sign in to your SmartClinic Patient Portal 10 minutes before {apt.time} on {apt.date}{' '}
              and click <strong>Join Online Consultation</strong> on your confirmed appointment card.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderLabDocument = (order: LabTestOrder, mode: 'request' | 'report' | 'released') => {
    const isReleased =
      order.resultStatus === 'Final' ||
      order.status === 'Released' ||
      order.status === 'Result Available' ||
      order.status === 'Completed';

    return (
      <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto">
        <PrintHeader
          subtitle={
            mode === 'request'
              ? 'Clinical Laboratory Test Request Slip'
              : 'Clinical Laboratory Diagnostic Report (Academic Demonstration)'
          }
          reference={order.orderNumber}
          dateLabel={order.requestedAt ? order.requestedAt.split('T')[0] : todayIso}
          statusLabel={order.status}
        />

        <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50 tabular-nums">
          <div>
            <p className="font-bold uppercase text-[10px] text-blue-800 tracking-wider">Patient</p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{order.patientName}</p>
            <p className="font-mono text-slate-700">MRN: {order.patientMrn}</p>
            {order.sampleId && (
              <p className="font-mono text-[11px] text-slate-600">
                Sample ID: {order.sampleId} ({order.specimenType || 'Clinical Specimen'})
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold uppercase text-[10px] text-blue-800 tracking-wider">
              Requested Test
            </p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{order.testName}</p>
            <p className="text-slate-700">
              Category: {order.category} • Priority: <strong>{order.urgency}</strong>
            </p>
            <p className="text-[11px] text-slate-600">Ordering Physician: {order.doctorName}</p>
          </div>
        </div>

        {mode === 'request' ? (
          <div className="p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <p className="font-bold text-slate-900">Clinical Indication / Instructions</p>
            <p className="text-slate-700">
              {order.clinicalIndication || 'Routine outpatient diagnostic evaluation.'}
            </p>
          </div>
        ) : !isReleased && mode === 'released' ? (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-950 font-semibold">
            Pending Laboratory Verification — Preliminary laboratory findings cannot be released to
            patients prior to final verification.
          </div>
        ) : (
          <>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs tabular-nums">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2 px-3">Parameter</th>
                    <th className="py-2 px-3">Observed Value</th>
                    <th className="py-2 px-3">Unit</th>
                    <th className="py-2 px-3">Reference Interval</th>
                    <th className="py-2 px-3 text-center">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.results || []).map((res, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{res.parameter}</td>
                      <td className="py-2 px-3 font-bold font-mono text-slate-950">{res.value}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{res.unit}</td>
                      <td className="py-2 px-3 text-slate-600">{res.referenceRange}</td>
                      <td className="py-2 px-3 text-center font-bold">{res.flag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.interpretation && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Laboratory Notes &amp; Remarks</span>
                </div>
                <p className="text-slate-700 text-[11px]">{order.interpretation}</p>
              </div>
            )}

            <div className="pt-4 flex justify-between items-end border-t border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-900">
                  Verified By: {order.verifiedBy || order.encodedBy || 'Clinical Laboratory Staff'}
                </p>
                <p className="text-[10px] text-slate-600">
                  Result Status: {isReleased ? 'Final Verified Result' : 'Preliminary Internal Draft'}
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                <p className="font-mono">ORDER: {order.orderNumber}</p>
                <p>SmartClinic Demonstration Laboratory Record</p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return createPortal(
    <div id="smartclinic-print-mount">
      {activeDocument.type === 'prescription' && renderPrescription(activeDocument.data)}
      {activeDocument.type === 'receipt' && renderFinancialReceipt(activeDocument.data, false)}
      {activeDocument.type === 'official_receipt_demo' &&
        renderFinancialReceipt(activeDocument.data, true)}
      {activeDocument.type === 'invoice_summary' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto tabular-nums">
          <PrintHeader
            subtitle="Outpatient Billing & Invoice Summary Report"
            reference={`INV-SUM-${Date.now().toString().slice(-6)}`}
            dateLabel={todayIso}
            statusLabel={`${activeDocument.data.invoices.length} Invoices`}
            isFinancialDemo={true}
          />
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2 px-3">Invoice #</th>
                <th className="py-2 px-3">Patient</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Total</th>
                <th className="py-2 px-3 text-right">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDocument.data.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2 px-3 font-mono font-semibold">{inv.invoiceNumber}</td>
                  <td className="py-2 px-3">{inv.patientName}</td>
                  <td className="py-2 px-3 font-mono">{inv.date}</td>
                  <td className="py-2 px-3 font-semibold">{inv.status}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatPeso(inv.totalAmount)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatPeso(inv.paidAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-500">
            Prepared by: {activeDocument.data.generatedBy} • DEMO — NOT VALID FOR OFFICIAL TAX
            PURPOSES
          </p>
        </div>
      )}
      {activeDocument.type === 'appointment_confirmation' &&
        renderAppointmentDocument(activeDocument.data, false)}
      {activeDocument.type === 'appointment_qr' &&
        renderAppointmentDocument(activeDocument.data, true)}
      {activeDocument.type === 'lab_request' && renderLabDocument(activeDocument.data, 'request')}
      {activeDocument.type === 'lab_report' && renderLabDocument(activeDocument.data, 'report')}
      {activeDocument.type === 'released_lab_result' &&
        renderLabDocument(activeDocument.data, 'released')}
      {activeDocument.type === 'consultation_summary' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto">
          <PrintHeader
            subtitle="Outpatient Clinical Consultation Summary"
            reference={activeDocument.data.note.id}
            dateLabel={activeDocument.data.note.date || todayIso}
            statusLabel="Signed Note"
          />
          <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <p className="font-bold text-slate-900">{activeDocument.data.patientName}</p>
              <p className="font-mono text-slate-600">MRN: {activeDocument.data.patientMrn}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900">{activeDocument.data.note.doctorName}</p>
              <p className="text-slate-600">{activeDocument.data.note.department}</p>
            </div>
          </div>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-800 uppercase text-[10px]">Chief Complaint</p>
              <p className="mt-1 text-slate-900">{activeDocument.data.note.chiefComplaint}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-800 uppercase text-[10px]">
                Subjective &amp; Objective Findings
              </p>
              <p className="mt-1 text-slate-700">{activeDocument.data.note.subjective}</p>
              <p className="mt-1 text-slate-700">{activeDocument.data.note.objective}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-800 uppercase text-[10px]">
                Clinical Assessment &amp; Care Plan
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {activeDocument.data.note.assessment}
              </p>
              <p className="mt-1 text-slate-700">{activeDocument.data.note.plan}</p>
            </div>
          </div>
        </div>
      )}
      {activeDocument.type === 'medical_certificate' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto">
          <PrintHeader
            subtitle="Outpatient Medical Certificate (Academic Demonstration Document)"
            reference={activeDocument.data.referenceNumber}
            dateLabel={activeDocument.data.issuedDate}
            statusLabel="Demonstration Copy"
          />
          <div className="space-y-3 text-xs leading-relaxed p-4 rounded-xl border border-slate-200">
            <p>
              This is to certify that <strong>{activeDocument.data.patientName}</strong> (MRN:{' '}
              <span className="font-mono">{activeDocument.data.patientMrn}</span>) was evaluated at
              SmartClinic Outpatient Services on <strong>{activeDocument.data.issuedDate}</strong>.
            </p>
            <p>
              <strong>Clinical Impression:</strong> {activeDocument.data.diagnosisSummary}
            </p>
            <p>
              <strong>Medical Recommendation:</strong> {activeDocument.data.recommendation}
              {activeDocument.data.restDays
                ? ` Recommended rest period: ${activeDocument.data.restDays} day(s).`
                : ''}
            </p>
            <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-200">
              Issued for academic prototype demonstration only. Does not carry statutory medical
              licensure certification or fabricated physician signature.
            </p>
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-900">{activeDocument.data.doctorName}</p>
            <p className="font-mono text-[10px] text-slate-600">
              Demo Credential:{' '}
              {(activeDocument.data.doctorCredential || 'DEMO-MD-001').replace(/^PRC-/i, 'DEMO-')}
            </p>
          </div>
        </div>
      )}
      {activeDocument.type === 'patient_medical_summary' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto tabular-nums">
          <PrintHeader
            subtitle="Authorized Patient Medical Summary"
            reference={activeDocument.data.patient.mrn}
            dateLabel={todayIso}
            statusLabel="Authorized Copy"
          />
          <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <p className="font-bold text-sm text-slate-900">
                {activeDocument.data.patient.fullName}
              </p>
              <p className="font-mono text-slate-700">MRN: {activeDocument.data.patient.mrn}</p>
              <p className="text-slate-600">
                DOB: {activeDocument.data.patient.dob} • {activeDocument.data.patient.gender} •
                Blood Type: {activeDocument.data.patient.bloodType}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-700">Phone: {activeDocument.data.patient.phone}</p>
              <p className="text-slate-600">Generated By: {activeDocument.data.generatedBy}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-slate-200">
              <p className="font-bold uppercase text-[10px] text-slate-500">Recorded Allergies</p>
              <p className="mt-1 font-semibold">
                {activeDocument.data.patient.allergies?.length
                  ? activeDocument.data.patient.allergies
                      .map((a: any) => (typeof a === 'string' ? a : a.allergen))
                      .join(', ')
                  : 'No Known Drug Allergies'}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <p className="font-bold uppercase text-[10px] text-slate-500">Chronic Conditions</p>
              <p className="mt-1 font-semibold">
                {activeDocument.data.patient.chronicConditions?.length
                  ? activeDocument.data.patient.chronicConditions.join(', ')
                  : 'None documented'}
              </p>
            </div>
          </div>
          {activeDocument.data.patient.vitalsHistory?.[0] && (
            <div className="p-3 rounded-lg border border-slate-200 text-xs">
              <p className="font-bold uppercase text-[10px] text-slate-500 mb-1">
                Latest Recorded Vital Signs
              </p>
              <p className="font-mono">
                BP {activeDocument.data.patient.vitalsHistory[0].bloodPressureSystolic}/
                {activeDocument.data.patient.vitalsHistory[0].bloodPressureDiastolic} mmHg • HR{' '}
                {activeDocument.data.patient.vitalsHistory[0].heartRate} bpm • Temp{' '}
                {activeDocument.data.patient.vitalsHistory[0].temperature}°C • SpO2{' '}
                {activeDocument.data.patient.vitalsHistory[0].oxygenSaturation}% (Recorded by:{' '}
                {activeDocument.data.patient.vitalsHistory[0].recordedBy})
              </p>
            </div>
          )}
        </div>
      )}
      {activeDocument.type === 'inventory_report' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto tabular-nums">
          <PrintHeader
            subtitle="Pharmacy Medicine Inventory & Reorder Status Report"
            reference={`INV-RPT-${Date.now().toString().slice(-6)}`}
            dateLabel={todayIso}
            statusLabel={`${activeDocument.data.items.length} Formulary Items`}
          />
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2 px-3">SKU</th>
                <th className="py-2 px-3">Medicine</th>
                <th className="py-2 px-3">Batch / Expiry</th>
                <th className="py-2 px-3 text-right">Stock</th>
                <th className="py-2 px-3 text-right">Reorder Threshold</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDocument.data.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 px-3 font-mono">{item.sku}</td>
                  <td className="py-1.5 px-3 font-semibold">{item.name}</td>
                  <td className="py-1.5 px-3 font-mono text-[11px]">
                    {item.batchNumber} • {item.expiryDate}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold">
                    {item.stockQuantity} {item.unit}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{item.reorderLevel}</td>
                  <td className="py-1.5 px-3 font-semibold">
                    {item.stockQuantity <= 0
                      ? 'Out of Stock'
                      : item.stockQuantity <= item.reorderLevel
                      ? 'Low Stock'
                      : 'In Stock'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-500">
            Prepared by: {activeDocument.data.generatedBy}
          </p>
        </div>
      )}
      {activeDocument.type === 'dispensing_report' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto tabular-nums">
          <PrintHeader
            subtitle="Pharmacy Medication Dispensing Ledger Report"
            reference={`DISP-RPT-${Date.now().toString().slice(-6)}`}
            dateLabel={todayIso}
            statusLabel={`${activeDocument.data.transactions.length} Transactions`}
          />
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Medicine</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3 text-right">Change</th>
                <th className="py-2 px-3 text-right">Resulting Stock</th>
                <th className="py-2 px-3">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDocument.data.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-1.5 px-3 font-mono text-[11px]">
                    {tx.createdAt.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-1.5 px-3 font-semibold">{tx.medicationName}</td>
                  <td className="py-1.5 px-3">{tx.transactionType}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold">
                    {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{tx.newStock}</td>
                  <td className="py-1.5 px-3">{tx.performedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-500">
            Prepared by: {activeDocument.data.generatedBy}
          </p>
        </div>
      )}
      {activeDocument.type === 'daily_lab_report' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto tabular-nums">
          <PrintHeader
            subtitle="Daily Laboratory Workload & Turnaround Summary"
            reference={`LAB-SUM-${Date.now().toString().slice(-6)}`}
            dateLabel={todayIso}
            statusLabel={`${activeDocument.data.orders.length} Lab Orders`}
          />
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2 px-3">Order #</th>
                <th className="py-2 px-3">Patient</th>
                <th className="py-2 px-3">Test</th>
                <th className="py-2 px-3">Urgency</th>
                <th className="py-2 px-3">Workflow Status</th>
                <th className="py-2 px-3">Release State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDocument.data.orders.map((ord) => (
                <tr key={ord.id}>
                  <td className="py-1.5 px-3 font-mono font-semibold">{ord.orderNumber}</td>
                  <td className="py-1.5 px-3">{ord.patientName}</td>
                  <td className="py-1.5 px-3 font-semibold">{ord.testName}</td>
                  <td className="py-1.5 px-3">{ord.urgency}</td>
                  <td className="py-1.5 px-3">{ord.status}</td>
                  <td className="py-1.5 px-3">
                    {ord.resultStatus === 'Final' || ord.status === 'Released'
                      ? 'Final Released'
                      : 'Preliminary'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-500">
            Prepared by: {activeDocument.data.generatedBy}
          </p>
        </div>
      )}
      {activeDocument.type === 'admin_report' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto tabular-nums">
          <PrintHeader
            subtitle={activeDocument.data.title}
            reference={`ADM-RPT-${Date.now().toString().slice(-6)}`}
            dateLabel={todayIso}
            statusLabel="Administrative Summary"
          />
          <div className="grid grid-cols-2 gap-3 text-xs">
            {activeDocument.data.metrics.map((m, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {m.label}
                </span>
                <span className="text-base font-black font-mono text-slate-900">{m.value}</span>
              </div>
            ))}
          </div>
          {activeDocument.data.notes && (
            <p className="text-xs text-slate-700">{activeDocument.data.notes}</p>
          )}
          <p className="text-[10px] text-slate-500">
            Generated by: {activeDocument.data.generatedBy}
          </p>
        </div>
      )}
      {activeDocument.type === 'predictive_report' && (
        <div className="p-6 bg-white text-slate-950 font-sans space-y-5 max-w-3xl mx-auto tabular-nums">
          <PrintHeader
            subtitle="Monthly Outpatient Consultation Demand Forecast Report"
            reference={`FCST-${Date.now().toString().slice(-6)}`}
            dateLabel={todayIso}
            statusLabel={`${activeDocument.data.horizonMonths}-Month Horizon`}
          />
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-[11px] text-blue-950">
            <strong>Academic Forecasting Notice:</strong> Computed from historical synthetic clinic
            consultation records ({activeDocument.data.historicalPeriod}) using{' '}
            <strong>{activeDocument.data.modelUsed}</strong> for branch{' '}
            <strong>{activeDocument.data.branch}</strong>. Forecasts estimate outpatient
            consultation volume for staffing/resource planning and do not represent clinical disease
            diagnosis or confirmed epidemiological outbreak incidence.
          </div>
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2 px-3">Forecast Month</th>
                <th className="py-2 px-3 text-right">Predicted Visits</th>
                <th className="py-2 px-3 text-right">Uncertainty Range</th>
                <th className="py-2 px-3">Demand Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDocument.data.monthlyForecasts.map((f, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-3 font-semibold">{f.monthLabel}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold">
                    {f.predictedVisits}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {f.lowerBound} – {f.upperBound}
                  </td>
                  <td className="py-1.5 px-3 font-semibold">{f.demandLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeDocument.data.categoryForecasts &&
            activeDocument.data.categoryForecasts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700">
                  Consultation Symptom / Category Demand Projections
                </h4>
                <table className="w-full text-left border-collapse text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2 px-3">Consultation Category</th>
                      <th className="py-2 px-3 text-right">Next-Month Projected Consultations</th>
                      <th className="py-2 px-3">Projected Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDocument.data.categoryForecasts.map((c, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-semibold">{c.category}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold">
                          {c.nextMonthPredicted}
                        </td>
                        <td className="py-1.5 px-3">{c.trendDirection}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          <p className="text-[10px] text-slate-500">
            Prepared by: {activeDocument.data.generatedBy}
          </p>
        </div>
      )}
    </div>,
    document.body
  );
};
