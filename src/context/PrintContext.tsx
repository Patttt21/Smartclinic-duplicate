import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  Prescription,
  Invoice,
  LabTestOrder,
  Appointment,
  ConsultationNote,
  Patient,
  InventoryItem,
  InventoryTransaction,
} from '../types/clinic';
import { DirectPrintMount, PrintableDoc } from '../components/common/DirectPrintMount';

export interface PrintContextType {
  isPrinting: boolean;
  lastPrintedTitle: string | null;
  printDocument: (doc: PrintableDoc, docTitle?: string) => void;
  printPrescription: (prescription: Prescription) => void;
  printReceipt: (invoice: Invoice) => void;
  printOfficialReceiptDemo: (invoice: Invoice) => void;
  printInvoiceSummary: (invoices: Invoice[], generatedBy: string) => void;
  printAppointmentConfirmation: (appointment: Appointment) => void;
  printAppointmentQr: (appointment: Appointment) => void;
  printLabRequest: (labOrder: LabTestOrder) => void;
  printLabReport: (labOrder: LabTestOrder) => void;
  printReleasedLabResult: (labOrder: LabTestOrder) => void;
  printConsultationSummary: (
    note: ConsultationNote,
    patientName: string,
    patientMrn: string
  ) => void;
  printMedicalCertificate: (payload: {
    patientName: string;
    patientMrn: string;
    doctorName: string;
    doctorCredential?: string;
    diagnosisSummary: string;
    recommendation: string;
    restDays?: number;
    issuedDate: string;
    referenceNumber: string;
  }) => void;
  printPatientMedicalSummary: (patient: Patient, generatedBy: string) => void;
  printInventoryReport: (items: InventoryItem[], generatedBy: string) => void;
  printDispensingReport: (
    transactions: InventoryTransaction[],
    prescriptions: Prescription[],
    generatedBy: string
  ) => void;
  printDailyLabReport: (orders: LabTestOrder[], generatedBy: string) => void;
  printAdminReport: (payload: {
    title: string;
    generatedBy: string;
    metrics: Array<{ label: string; value: string }>;
    notes?: string;
  }) => void;
  printPredictiveReport: (payload: {
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
  }) => void;
  downloadTextDocument: (filename: string, title: string, lines: string[]) => void;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const PrintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDocument, setActiveDocument] = useState<PrintableDoc | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [lastPrintedTitle, setLastPrintedTitle] = useState<string | null>(null);

  const executePrint = useCallback((doc: PrintableDoc, docTitle = 'SmartClinic-Document') => {
    setIsPrinting(true);
    setActiveDocument(doc);
    setLastPrintedTitle(docTitle);

    const originalTitle = document.title;
    document.title = docTitle;

    const cleanup = () => {
      document.title = originalTitle;
      setActiveDocument(null);
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.error('Direct window.print() failed:', err);
        cleanup();
      }
      setTimeout(cleanup, 2200);
    }, 150);
  }, []);

  const printPrescription = useCallback(
    (prescription: Prescription) =>
      executePrint(
        { type: 'prescription', data: prescription },
        `SmartClinic-Rx-${prescription.prescriptionNumber}`
      ),
    [executePrint]
  );

  const printReceipt = useCallback(
    (invoice: Invoice) =>
      executePrint(
        { type: 'receipt', data: invoice },
        `SmartClinic-Receipt-${invoice.invoiceNumber}`
      ),
    [executePrint]
  );

  const printOfficialReceiptDemo = useCallback(
    (invoice: Invoice) =>
      executePrint(
        { type: 'official_receipt_demo', data: invoice },
        `SmartClinic-DemoOR-${invoice.invoiceNumber}`
      ),
    [executePrint]
  );

  const printInvoiceSummary = useCallback(
    (invoices: Invoice[], generatedBy: string) =>
      executePrint(
        { type: 'invoice_summary', data: { invoices, generatedBy } },
        `SmartClinic-InvoiceSummary-${new Date().toISOString().split('T')[0]}`
      ),
    [executePrint]
  );

  const printAppointmentConfirmation = useCallback(
    (appointment: Appointment) =>
      executePrint(
        { type: 'appointment_confirmation', data: appointment },
        `SmartClinic-Booking-${appointment.bookingReference || appointment.id}`
      ),
    [executePrint]
  );

  const printAppointmentQr = useCallback(
    (appointment: Appointment) =>
      executePrint(
        { type: 'appointment_qr', data: appointment },
        `SmartClinic-QR-${appointment.bookingReference || appointment.id}`
      ),
    [executePrint]
  );

  const printLabRequest = useCallback(
    (labOrder: LabTestOrder) =>
      executePrint(
        { type: 'lab_request', data: labOrder },
        `SmartClinic-LabRequest-${labOrder.orderNumber}`
      ),
    [executePrint]
  );

  const printLabReport = useCallback(
    (labOrder: LabTestOrder) =>
      executePrint(
        { type: 'lab_report', data: labOrder },
        `SmartClinic-LabReport-${labOrder.orderNumber}`
      ),
    [executePrint]
  );

  const printReleasedLabResult = useCallback(
    (labOrder: LabTestOrder) =>
      executePrint(
        { type: 'released_lab_result', data: labOrder },
        `SmartClinic-LabResult-${labOrder.orderNumber}`
      ),
    [executePrint]
  );

  const printConsultationSummary = useCallback(
    (note: ConsultationNote, patientName: string, patientMrn: string) =>
      executePrint(
        { type: 'consultation_summary', data: { note, patientName, patientMrn } },
        `SmartClinic-Consultation-${note.id}`
      ),
    [executePrint]
  );

  const printMedicalCertificate = useCallback(
    (payload: {
      patientName: string;
      patientMrn: string;
      doctorName: string;
      doctorCredential?: string;
      diagnosisSummary: string;
      recommendation: string;
      restDays?: number;
      issuedDate: string;
      referenceNumber: string;
    }) =>
      executePrint(
        { type: 'medical_certificate', data: payload },
        `SmartClinic-MedCert-${payload.referenceNumber}`
      ),
    [executePrint]
  );

  const printPatientMedicalSummary = useCallback(
    (patient: Patient, generatedBy: string) =>
      executePrint(
        { type: 'patient_medical_summary', data: { patient, generatedBy } },
        `SmartClinic-MedicalSummary-${patient.mrn}`
      ),
    [executePrint]
  );

  const printInventoryReport = useCallback(
    (items: InventoryItem[], generatedBy: string) =>
      executePrint(
        { type: 'inventory_report', data: { items, generatedBy } },
        `SmartClinic-InventoryReport-${new Date().toISOString().split('T')[0]}`
      ),
    [executePrint]
  );

  const printDispensingReport = useCallback(
    (
      transactions: InventoryTransaction[],
      prescriptions: Prescription[],
      generatedBy: string
    ) =>
      executePrint(
        { type: 'dispensing_report', data: { transactions, prescriptions, generatedBy } },
        `SmartClinic-DispensingReport-${new Date().toISOString().split('T')[0]}`
      ),
    [executePrint]
  );

  const printDailyLabReport = useCallback(
    (orders: LabTestOrder[], generatedBy: string) =>
      executePrint(
        { type: 'daily_lab_report', data: { orders, generatedBy } },
        `SmartClinic-DailyLabReport-${new Date().toISOString().split('T')[0]}`
      ),
    [executePrint]
  );

  const printAdminReport = useCallback(
    (payload: {
      title: string;
      generatedBy: string;
      metrics: Array<{ label: string; value: string }>;
      notes?: string;
    }) =>
      executePrint(
        { type: 'admin_report', data: payload },
        `SmartClinic-AdminReport-${new Date().toISOString().split('T')[0]}`
      ),
    [executePrint]
  );

  const printPredictiveReport = useCallback(
    (payload: {
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
    }) =>
      executePrint(
        { type: 'predictive_report', data: payload },
        `SmartClinic-ForecastReport-${new Date().toISOString().split('T')[0]}`
      ),
    [executePrint]
  );

  const downloadTextDocument = useCallback((filename: string, title: string, lines: string[]) => {
    const content = [
      '============================================================',
      'SMARTCLINIC OUTPATIENT HEALTHCARE SYSTEM (ACADEMIC PROTOTYPE)',
      title.toUpperCase(),
      `Generated: ${new Date().toISOString()}`,
      '============================================================',
      '',
      ...lines,
      '',
      '------------------------------------------------------------',
      'Synthetic Outpatient Demonstration Document',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const value = useMemo(
    () => ({
      isPrinting,
      lastPrintedTitle,
      printDocument: executePrint,
      printPrescription,
      printReceipt,
      printOfficialReceiptDemo,
      printInvoiceSummary,
      printAppointmentConfirmation,
      printAppointmentQr,
      printLabRequest,
      printLabReport,
      printReleasedLabResult,
      printConsultationSummary,
      printMedicalCertificate,
      printPatientMedicalSummary,
      printInventoryReport,
      printDispensingReport,
      printDailyLabReport,
      printAdminReport,
      printPredictiveReport,
      downloadTextDocument,
    }),
    [
      isPrinting,
      lastPrintedTitle,
      executePrint,
      printPrescription,
      printReceipt,
      printOfficialReceiptDemo,
      printInvoiceSummary,
      printAppointmentConfirmation,
      printAppointmentQr,
      printLabRequest,
      printLabReport,
      printReleasedLabResult,
      printConsultationSummary,
      printMedicalCertificate,
      printPatientMedicalSummary,
      printInventoryReport,
      printDispensingReport,
      printDailyLabReport,
      printAdminReport,
      printPredictiveReport,
      downloadTextDocument,
    ]
  );

  return (
    <PrintContext.Provider value={value}>
      {children}
      <DirectPrintMount activeDocument={activeDocument} />
    </PrintContext.Provider>
  );
};

export const usePrint = (): PrintContextType => {
  const context = useContext(PrintContext);
  if (!context) {
    throw new Error('usePrint must be used within a PrintProvider');
  }
  return context;
};
