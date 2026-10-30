import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Prescription, Invoice, LabTestOrder } from '../types/clinic';
import { DirectPrintMount, PrintableDoc } from '../components/common/DirectPrintMount';

export interface PrintContextType {
  isPrinting: boolean;
  printPrescription: (prescription: Prescription) => void;
  printReceipt: (invoice: Invoice) => void;
  printLabReport: (labOrder: LabTestOrder) => void;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const PrintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDocument, setActiveDocument] = useState<PrintableDoc | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const executePrint = useCallback((doc: PrintableDoc, docTitle: string) => {
    setIsPrinting(true);
    setActiveDocument(doc);

    const originalTitle = document.title;
    document.title = docTitle;

    const cleanup = () => {
      document.title = originalTitle;
      setActiveDocument(null);
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    // Allow React a single tick to mount the print stationery to #smartclinic-print-mount
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.error('Direct window.print() failed:', err);
        cleanup();
      }
      // Safety reset timer in case browser does not fire afterprint event
      setTimeout(cleanup, 2000);
    }, 100);
  }, []);

  const printPrescription = useCallback((prescription: Prescription) => {
    executePrint(
      { type: 'prescription', data: prescription },
      `SmartClinic-Rx-${prescription.prescriptionNumber}`
    );
  }, [executePrint]);

  const printReceipt = useCallback((invoice: Invoice) => {
    executePrint(
      { type: 'receipt', data: invoice },
      `SmartClinic-Receipt-${invoice.invoiceNumber}`
    );
  }, [executePrint]);

  const printLabReport = useCallback((labOrder: LabTestOrder) => {
    executePrint(
      { type: 'lab_report', data: labOrder },
      `SmartClinic-LabReport-${labOrder.orderNumber}`
    );
  }, [executePrint]);

  const value = useMemo(
    () => ({
      isPrinting,
      printPrescription,
      printReceipt,
      printLabReport,
    }),
    [isPrinting, printPrescription, printReceipt, printLabReport]
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
