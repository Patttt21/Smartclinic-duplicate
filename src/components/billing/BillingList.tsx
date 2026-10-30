import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Invoice, InvoiceItem, PaymentMethod, HMOClaim, HMOPartner, PaymentDetails } from '../../types/clinic';
import {
  Receipt,
  Plus,
  Printer,
  Search,
  X,
  RotateCcw,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Building2,
  QrCode,
  Wallet,
  Banknote,
  FileCheck2,
  BadgeCheck,
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import { formatPeso } from '../../utils/currency';
import { usePrint } from '../../context/PrintContext';

export const BillingList: React.FC = () => {
  const {
    invoices,
    payInvoice,
    payInvoiceWithDetails,
    addInvoice,
    updateHMOClaim,
    processHMOApproval,
    hmoPartners,
    patients,
    activeRole,
    primaryRole,
    currentUser,
    hasPermission,
    setActiveTab,
    consultations,
    prescriptions,
    labOrders,
  } = useClinic();
  const { printReceipt } = usePrint();

  // Role Access Control Checks
  const isPatient = activeRole === 'patient' || primaryRole === 'patient';
  const isAdmin = activeRole === 'admin' || primaryRole === 'admin';
  const isReceptionist = activeRole === 'receptionist';
  const hasBillingAccess = isAdmin || isReceptionist || hasPermission('billing') || isPatient;

  // Tabs for Staff & Admins
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'hmo-claims' | 'hmo-directory'>('invoices');

  // Search and Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hmoPartnerFilter, setHmoPartnerFilter] = useState('ALL');

  // Process Payment Modal State
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('GCash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');
  const [showGCashQR, setShowGCashQR] = useState<boolean>(false);

  // Generate Invoice Modal State
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [newPatId, setNewPatId] = useState(patients[0]?.id || '');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Physician Outpatient Consultation', category: 'Consultation', quantity: 1, unitPrice: 800.00, total: 800.00 },
  ]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('500');
  const [newItemCategory, setNewItemCategory] = useState<InvoiceItem['category']>('Laboratory');

  // HMO claim in new invoice
  const [enableHMOInNewInvoice, setEnableHMOInNewInvoice] = useState(false);
  const [selectedHMOName, setSelectedHMOName] = useState('Maxicare Healthcare Corporation');
  const [hmoMemberId, setHmoMemberId] = useState('');
  const [hmoLoaNumber, setHmoLoaNumber] = useState('');
  const [hmoCoverageAmount, setHmoCoverageAmount] = useState<string>('');

  // HMO Approval Modal State
  const [approvingInvoice, setApprovingInvoice] = useState<Invoice | null>(null);
  const [approvalLoa, setApprovalLoa] = useState('');
  const [approvalAmount, setApprovalAmount] = useState<number>(0);
  const [approvalRemarks, setApprovalRemarks] = useState('Verified with HMO Provider Portal');

  // Strict Access Guard for unauthorized clinical staff
  if (!hasBillingAccess) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#121c33] border border-slate-800 rounded-2xl text-center space-y-4 shadow-sm text-xs font-sans">
        <div className="w-12 h-12 bg-rose-950/60 text-rose-400 border border-rose-800 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          Access Restricted — Billing & Financial Management
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Point-of-Sale (POS) collections, patient invoicing, payment processing, and HMO partner claim authorizations are restricted strictly to Reception Staff and Clinic Executive Administration.
        </p>
        <div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Return to Authorized Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'HMO_CLAIM') {
          if (!inv.hmoClaim) return false;
        } else if (inv.status !== statusFilter) {
          return false;
        }
      }

      // HMO Partner filter
      if (hmoPartnerFilter !== 'ALL') {
        if (!inv.hmoClaim || !inv.hmoClaim.partnerName.toLowerCase().includes(hmoPartnerFilter.toLowerCase())) {
          return false;
        }
      }

      if (!query) return true;

      const invNumMatch = inv.invoiceNumber?.toLowerCase().includes(query);
      const dateMatch = inv.date?.toLowerCase().includes(query) || inv.dueDate?.toLowerCase().includes(query);
      const statusMatch = inv.status?.toLowerCase().includes(query);
      const payMethodMatch = inv.paymentMethod?.toLowerCase().includes(query);
      const patientMatch = inv.patientName?.toLowerCase().includes(query) || inv.patientMrn?.toLowerCase().includes(query);
      const hmoMatch = inv.hmoClaim?.partnerName?.toLowerCase().includes(query) || inv.hmoClaim?.loaNumber?.toLowerCase().includes(query);
      const refMatch = inv.paymentDetails?.referenceNumber?.toLowerCase().includes(query);

      const itemsMatch = inv.items?.some((item) =>
        item.description?.toLowerCase().includes(query) || item.category?.toLowerCase().includes(query)
      );

      return Boolean(invNumMatch || dateMatch || statusMatch || payMethodMatch || patientMatch || hmoMatch || refMatch || itemsMatch);
    });
  }, [invoices, search, statusFilter, hmoPartnerFilter]);

  // HMO Claims only list
  const hmoClaimsList = useMemo(() => {
    return invoices.filter((inv) => Boolean(inv.hmoClaim));
  }, [invoices]);

  const totalCollected = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

  const totalHmoCovered = hmoClaimsList.reduce((sum, i) => sum + (i.hmoClaim?.coverageAmount || 0), 0);
  const pendingHmoCount = hmoClaimsList.filter((i) => i.hmoClaim?.claimStatus === 'Pending Verification').length;

  const patientPaid = filteredInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const patientBalance = filteredInvoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

  // Handle Cash Tendered Calculation
  const tenderedNum = Number(cashTendered) || 0;
  const changeAmount = payMethod === 'Cash' && tenderedNum >= payAmount ? tenderedNum - payAmount : 0;
  const isCashInsufficient = payMethod === 'Cash' && tenderedNum > 0 && tenderedNum < payAmount;

  // Payment Submission
  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    if (payMethod === 'Cash' && tenderedNum < payAmount) {
      alert('Tendered cash amount must be greater than or equal to the amount to pay.');
      return;
    }

    const details: PaymentDetails = {
      method: payMethod,
      amountPaid: payAmount,
      tenderedAmount: payMethod === 'Cash' ? tenderedNum : undefined,
      changeAmount: payMethod === 'Cash' ? changeAmount : undefined,
      referenceNumber: payMethod === 'GCash' || payMethod === 'Maya' || payMethod === 'Bank Transfer' || payMethod === 'Credit Card'
        ? paymentRefNumber || `REF-${Date.now().toString().slice(-8)}`
        : undefined,
      paymentDate: new Date().toISOString(),
      cashierName: currentUser?.name || 'Authorized Reception Cashier',
    };

    payInvoiceWithDetails(payingInvoice.id, payAmount, details);
    setPayingInvoice(null);
    setCashTendered('');
    setPaymentRefNumber('');
  };

  // Quick Preset Add
  const addQuickPresetItem = (desc: string, category: InvoiceItem['category'], price: number) => {
    setInvoiceItems((prev) => [
      ...prev,
      {
        id: `ii-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: desc,
        category,
        quantity: 1,
        unitPrice: price,
        total: price,
      },
    ]);
  };

  // Add Item to New Invoice
  const handleAddItem = () => {
    if (!newItemDesc.trim()) return;
    const price = Number(newItemPrice) || 0;
    setInvoiceItems((prev) => [
      ...prev,
      {
        id: `ii-${Date.now()}`,
        description: newItemDesc.trim(),
        category: newItemCategory,
        quantity: 1,
        unitPrice: price,
        total: price,
      },
    ]);
    setNewItemDesc('');
  };

  const handleRemoveItem = (id: string) => {
    setInvoiceItems((prev) => prev.filter((i) => i.id !== id));
  };

  // 1-Click Import Recent Clinical Orders from Patient's Visit
  const handleImportRecentOrders = () => {
    const pat = patients.find((p) => p.id === newPatId);
    if (!pat) return;

    const imported: InvoiceItem[] = [];

    // Check for recent consultations
    const recentCons = consultations.find((c) => c.patientId === pat.id);
    if (recentCons) {
      imported.push({
        id: `ii-cons-${Date.now()}`,
        description: `Outpatient Consultation - Dr. ${recentCons.doctorName}`,
        category: 'Consultation',
        quantity: 1,
        unitPrice: 800.00,
        total: 800.00,
      });
    }

    // Check for pending/recent lab orders
    const patLabs = labOrders.filter((l) => l.patientId === pat.id).slice(0, 3);
    patLabs.forEach((l, idx) => {
      let price = 450.00;
      if (l.testName.includes('Lipid') || l.testName.includes('Metabolic')) price = 750.00;
      else if (l.testName.includes('CBC')) price = 350.00;
      else if (l.testName.includes('HbA1c')) price = 650.00;
      imported.push({
        id: `ii-lab-${Date.now()}-${idx}`,
        description: `Diagnostic Lab: ${l.testName}`,
        category: 'Laboratory',
        quantity: 1,
        unitPrice: price,
        total: price,
      });
    });

    // Check for recent prescriptions
    const patRx = prescriptions.find((r) => r.patientId === pat.id);
    if (patRx && patRx.items) {
      patRx.items.slice(0, 2).forEach((rx, idx) => {
        const qty = rx.quantity || 14;
        const unitP = 25.00;
        imported.push({
          id: `ii-rx-${Date.now()}-${idx}`,
          description: `Formulary: ${rx.medicationName} (${rx.dosage}) x ${qty}`,
          category: 'Pharmacy',
          quantity: qty,
          unitPrice: unitP,
          total: qty * unitP,
        });
      });
    }

    if (imported.length > 0) {
      setInvoiceItems(imported);
      if (pat.insuranceProvider && pat.insuranceProvider !== 'None') {
        setEnableHMOInNewInvoice(true);
        setSelectedHMOName(pat.insuranceProvider);
        setHmoMemberId(pat.insurancePolicyNumber || '');
        setHmoLoaNumber(`LOA-${Date.now().toString().slice(-6)}`);
      }
    }
  };

  // Compute live subtotal and total for New Invoice
  const newInvoiceSubtotal = invoiceItems.reduce((sum, i) => sum + i.total, 0);
  const newInvoiceDiscount = (newInvoiceSubtotal * discountPercent) / 100;
  const newInvoiceTotal = Math.max(0, newInvoiceSubtotal - newInvoiceDiscount);
  const parsedCoverage = Number(hmoCoverageAmount) || (enableHMOInNewInvoice ? newInvoiceTotal : 0);
  const newInvoicePatientShare = Math.max(0, newInvoiceTotal - parsedCoverage);

  // Submit New Invoice
  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === newPatId);
    if (!pat || invoiceItems.length === 0) return;

    let hmoClaimData: HMOClaim | undefined = undefined;
    if (enableHMOInNewInvoice) {
      hmoClaimData = {
        partnerName: selectedHMOName,
        memberId: hmoMemberId || pat.insurancePolicyNumber || `HMO-${Date.now().toString().slice(-6)}`,
        loaNumber: hmoLoaNumber || `LOA-${Date.now().toString().slice(-6)}`,
        coverageAmount: parsedCoverage,
        patientShare: newInvoicePatientShare,
        claimStatus: 'Pending Verification',
      };
    }

    addInvoice({
      patientId: pat.id,
      patientName: pat.fullName,
      patientMrn: pat.mrn,
      date: new Date().toISOString().split('T')[0],
      dueDate: newDueDate,
      items: invoiceItems,
      subtotal: newInvoiceSubtotal,
      discountPercentage: discountPercent,
      discountAmount: newInvoiceDiscount,
      taxAmount: 0,
      totalAmount: newInvoiceTotal,
      paidAmount: 0,
      status: enableHMOInNewInvoice ? 'HMO Pending' : 'Unpaid',
      hmoClaim: hmoClaimData,
      notes: enableHMOInNewInvoice ? `HMO Partner Billing via ${selectedHMOName}` : 'Point of Service Patient Charge',
    });

    setShowNewInvoice(false);
  };

  // Handle HMO LOA Approval Submit
  const handleApproveHMO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingInvoice) return;
    processHMOApproval(approvingInvoice.id, approvalLoa, approvalAmount, approvalRemarks);
    setApprovingInvoice(null);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-xs font-sans pb-16">
      {/* Top Banner / Module Header */}
      <div className="bg-[#121c33] p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-400" />
              <span>{isPatient ? 'My Billing & Official Statements' : 'Point of Service (POS) Billing & Invoices'}</span>
            </h1>
            {isPatient ? (
              <>
                <span className="text-xs bg-emerald-950/80 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-800">
                  {formatPeso(patientPaid)} Total Settled
                </span>
                <span className="text-xs bg-amber-950/80 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full border border-amber-800">
                  {formatPeso(patientBalance)} Outstanding
                </span>
              </>
            ) : (
              <>
                <span className="text-xs bg-emerald-950/80 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-800 font-mono">
                  {formatPeso(totalCollected)} Collected
                </span>
                <span className="text-xs bg-amber-950/80 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full border border-amber-800 font-mono">
                  {formatPeso(totalOutstanding)} Outstanding
                </span>
                <span className="text-xs bg-cyan-950/80 text-cyan-300 font-semibold px-2.5 py-0.5 rounded-full border border-cyan-800 font-mono">
                  {formatPeso(totalHmoCovered)} In HMO Claims
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isPatient
              ? 'Specific Task: Review personal clinic statements, official receipts (OR), and online settlement options.'
              : 'Specific Task: Outpatient cashiering, Cash & GCash receipt issuance, HMO LOA claim approval, and PhilHealth Konsulta package billing.'}
          </p>
        </div>

        {/* Generate Invoice Action (Receptionist & Admin Only) */}
        {!isPatient && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setShowNewInvoice(true);
                setInvoiceItems([
                  { id: '1', description: 'Physician Outpatient Consultation', category: 'Consultation', quantity: 1, unitPrice: 800.00, total: 800.00 },
                ]);
              }}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-900/40 cursor-pointer transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Patient Invoice</span>
            </button>
          </div>
        )}
      </div>

      {/* Role Navigation Tabs for Staff/Admin */}
      {!isPatient && (
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'invoices'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Patient Invoices &amp; POS Collections ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('hmo-claims')}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'hmo-claims'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>HMO Partner Claims &amp; Authorizations ({hmoClaimsList.length})</span>
            {pendingHmoCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full border border-amber-500/40 font-mono">
                {pendingHmoCount} pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('hmo-directory')}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'hmo-directory'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            <span>Accredited HMO Partners ({hmoPartners.length})</span>
          </button>
        </div>
      )}

      {/* Compliance Notice */}
      <div className="p-3 bg-teal-950/30 border border-teal-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-teal-200">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            {isPatient
              ? 'Data Privacy Enforced: You are viewing solely your verified clinic statements under Republic Act 10173.'
              : 'Strict Financial RBAC Active: Invoicing, Cash/GCash drawer collections, and HMO LOA authorisations are restricted to Receptionists & Executive Administration.'}
          </span>
        </div>
        <span className="font-mono text-[10px] bg-teal-900 text-teal-300 px-2 py-0.5 rounded font-bold border border-teal-700">
          FINANCIAL RLS • RA 10173
        </span>
      </div>

      {/* SUBTAB 1: Invoices Table */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-[#121c33] p-3 rounded-xl border border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  isPatient
                    ? 'Search invoice number, date, amount, or service...'
                    : 'Search invoice #, patient, service, amount, GCash ref, or status...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-1.5 bg-[#090e1a] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#090e1a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="HMO Pending">HMO Pending</option>
                <option value="HMO Approved">HMO Approved</option>
                <option value="HMO_CLAIM">All HMO Claims</option>
              </select>

              {(search || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-[#121c33] rounded-xl border border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#090e1a] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Invoice # &amp; Date</th>
                    <th className="py-3 px-3">Patient</th>
                    <th className="py-3 px-4">Line Items</th>
                    <th className="py-3 px-3">Total Amount</th>
                    <th className="py-3 px-3">Settled / Method</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Receipt className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                        <p>{isPatient ? 'No personal billing statements on file.' : 'No invoices match the selected filter.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const balance = inv.totalAmount - inv.paidAmount;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block font-mono">{inv.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-400">Date: {inv.date}</span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-200 block">{inv.patientName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{inv.patientMrn}</span>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <span className="text-slate-300 truncate block">
                              {inv.items.map((it) => it.description).join(', ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <span>{inv.items.length} item(s)</span>
                              {inv.hmoClaim && (
                                <span className="text-cyan-300 font-semibold">
                                  • {inv.hmoClaim.partnerName} ({inv.hmoClaim.loaNumber})
                                </span>
                              )}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-bold text-white">{formatPeso(inv.totalAmount)}</span>
                            {balance > 0 && inv.status !== 'Paid' && (
                              <span className="text-[10px] text-amber-400 block font-mono">
                                Bal: {formatPeso(balance)}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-emerald-400 block font-mono">
                              {formatPeso(inv.paidAmount)}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              {inv.paymentMethod ? (
                                <>
                                  <span className="font-medium text-slate-300">{inv.paymentMethod}</span>
                                  {inv.paymentDetails?.referenceNumber && (
                                    <span className="text-[9px] font-mono text-cyan-400">
                                      ({inv.paymentDetails.referenceNumber})
                                    </span>
                                  )}
                                </>
                              ) : (
                                'Unsettled'
                              )}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                inv.status === 'Paid'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : inv.status === 'HMO Approved'
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                  : inv.status === 'HMO Pending'
                                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                                  : inv.status === 'Partially Paid'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-rose-950 text-rose-300 border-rose-800'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Collect Payment (Receptionist & Admin) */}
                              {inv.status !== 'Paid' && (isReceptionist || isAdmin) && (
                                <button
                                  onClick={() => {
                                    setPayingInvoice(inv);
                                    setPayAmount(inv.totalAmount - inv.paidAmount);
                                    setPayMethod('GCash');
                                    setCashTendered('');
                                    setPaymentRefNumber('');
                                  }}
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded font-bold text-xs cursor-pointer shadow-xs transition"
                                >
                                  Collect Payment
                                </button>
                              )}

                              {/* HMO LOA Approval Action */}
                              {inv.hmoClaim && inv.hmoClaim.claimStatus !== 'Approved' && (isReceptionist || isAdmin) && (
                                <button
                                  onClick={() => {
                                    setApprovingInvoice(inv);
                                    setApprovalLoa(inv.hmoClaim?.loaNumber || `LOA-${Date.now().toString().slice(-6)}`);
                                    setApprovalAmount(inv.hmoClaim?.coverageAmount || inv.totalAmount);
                                  }}
                                  className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold text-xs cursor-pointer shadow-xs transition"
                                >
                                  Approve LOA
                                </button>
                              )}

                              {/* Patient Pay Online Button */}
                              {inv.status !== 'Paid' && isPatient && (
                                <button
                                  onClick={() => {
                                    setPayingInvoice(inv);
                                    setPayAmount(inv.totalAmount - inv.paidAmount);
                                    setPayMethod('GCash');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer shadow-xs transition"
                                >
                                  Pay Online
                                </button>
                              )}

                              {/* Print Official Receipt Button */}
                              <button
                                onClick={() => printReceipt(inv)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Print Official Receipt (OR)"
                                type="button"
                              >
                                <Printer className="w-3.5 h-3.5 text-teal-400" />
                                <span>Print OR</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: HMO Partner Claims & LOA Authorizations */}
      {activeSubTab === 'hmo-claims' && !isPatient && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-[#121c33] rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs">Total HMO Claims</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {formatPeso(totalHmoCovered)}
              </div>
              <span className="text-[10px] text-slate-500">{hmoClaimsList.length} total patient encounters</span>
            </div>

            <div className="p-4 bg-[#121c33] rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs">Pending LOA Authorizations</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {pendingHmoCount}
              </div>
              <span className="text-[10px] text-slate-500">Requires front-desk verification</span>
            </div>

            <div className="p-4 bg-[#121c33] rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs">Accredited HMO Networks</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {hmoPartners.length} Active Partners
              </div>
              <span className="text-[10px] text-slate-500">Maxicare, Intellicare, PhilHealth, etc.</span>
            </div>
          </div>

          <div className="bg-[#121c33] rounded-xl border border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">HMO Claims &amp; Partner Authorizations Queue</h3>
                <p className="text-xs text-slate-400">Track and settle direct partner insurance reimbursements.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#090e1a] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-3">Patient</th>
                    <th className="py-3 px-3">HMO Partner</th>
                    <th className="py-3 px-3">Member ID &amp; LOA</th>
                    <th className="py-3 px-3">HMO Coverage</th>
                    <th className="py-3 px-3">Patient Share</th>
                    <th className="py-3 px-3">Claim Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {hmoClaimsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No active HMO claims on file.
                      </td>
                    </tr>
                  ) : (
                    hmoClaimsList.map((inv) => {
                      const claim = inv.hmoClaim!;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-200 block">{inv.patientName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{inv.patientMrn}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-cyan-300">
                            {claim.partnerName}
                          </td>
                          <td className="py-3 px-3">
                            <span className="block font-mono text-slate-200">{claim.memberId}</span>
                            <span className="text-[10px] text-teal-400 font-mono font-bold">LOA: {claim.loaNumber}</span>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono text-emerald-400">
                            {formatPeso(claim.coverageAmount)}
                          </td>
                          <td className="py-3 px-3 font-mono text-amber-400">
                            {formatPeso(claim.patientShare)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                claim.claimStatus === 'Approved'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : claim.claimStatus === 'Reimbursed'
                                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                                  : claim.claimStatus === 'Claim Submitted'
                                  ? 'bg-purple-950 text-purple-300 border-purple-800'
                                  : 'bg-amber-950 text-amber-300 border-amber-800'
                              }`}
                            >
                              {claim.claimStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {claim.claimStatus === 'Pending Verification' && (
                                <button
                                  onClick={() => {
                                    setApprovingInvoice(inv);
                                    setApprovalLoa(claim.loaNumber);
                                    setApprovalAmount(claim.coverageAmount);
                                  }}
                                  className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-bold cursor-pointer"
                                >
                                  Approve LOA
                                </button>
                              )}
                              {claim.claimStatus === 'Approved' && (
                                <button
                                  onClick={() => updateHMOClaim(inv.id, { claimStatus: 'Claim Submitted' })}
                                  className="px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-bold cursor-pointer"
                                >
                                  Submit Claim
                                </button>
                              )}
                              {claim.claimStatus === 'Claim Submitted' && (
                                <button
                                  onClick={() => updateHMOClaim(inv.id, { claimStatus: 'Reimbursed' })}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer"
                                >
                                  Mark Settled
                                </button>
                              )}
                              <button
                                onClick={() => printReceipt(inv)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                                title="Print Statement"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Accredited HMO Partners Directory */}
      {activeSubTab === 'hmo-directory' && !isPatient && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hmoPartners.map((partner) => (
              <div
                key={partner.id}
                className="p-4 bg-[#121c33] rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {partner.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">{partner.name}</h4>
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{partner.code} • {partner.accreditationNumber}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p>Standard Coverage: <strong className="text-white">{partner.coverageRate}%</strong></p>
                  <p>Hotline: <strong className="text-slate-300">{partner.contactHotline}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Payment Processing (Cash with Tendered/Change, GCash with Reference, Maya, Cards) */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121c33] rounded-2xl shadow-2xl border border-slate-800 p-6 max-w-md w-full text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Point of Service Payment</h3>
                <p className="text-slate-400 text-xs">
                  Invoice <strong className="text-cyan-300">{payingInvoice.invoiceNumber}</strong> • {payingInvoice.patientName}
                </p>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="bg-[#090e1a] p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Total Invoice Assessment:</span>
                <span className="font-bold text-white text-sm font-mono">{formatPeso(payingInvoice.totalAmount)}</span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Collection Amount (₱) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={payingInvoice.totalAmount - payingInvoice.paidAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#090e1a] border border-slate-700 rounded-xl text-xs font-bold text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'GCash', 'Credit Card', 'Maya', 'Debit Card', 'Bank Transfer'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                        payMethod === m
                          ? 'bg-teal-950 text-teal-300 border-teal-500'
                          : 'bg-[#090e1a] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* CASH SPECIFIC: Tendered Amount & Sukli Calculation */}
              {payMethod === 'Cash' && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <Banknote className="w-4 h-4" />
                    <span>Cash Drawer Tendered &amp; Change</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Cash Tendered by Patient (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 1000"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs font-bold text-white font-mono"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-emerald-800/60 font-bold text-xs">
                    <span className="text-slate-300">Change Due (Sukli):</span>
                    <span className={`font-mono text-sm ${isCashInsufficient ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {isCashInsufficient ? 'Insufficient Cash' : formatPeso(changeAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* GCASH SPECIFIC: Ref Number & Official QR */}
              {payMethod === 'GCash' && (
                <div className="p-3 bg-blue-950/30 border border-blue-800/80 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" />
                      GCash Philippines POS Settlement
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGCashQR(!showGCashQR)}
                      className="text-[10px] text-cyan-400 underline cursor-pointer"
                    >
                      {showGCashQR ? 'Hide QR' : 'Show Clinic QR'}
                    </button>
                  </div>

                  {showGCashQR && (
                    <div className="p-3 bg-white text-slate-900 rounded-xl text-center space-y-2">
                      <div className="w-28 h-28 bg-slate-100 border-2 border-blue-600 rounded-lg mx-auto flex items-center justify-center">
                        <QrCode className="w-20 h-20 text-blue-800" />
                      </div>
                      <p className="text-[10px] font-bold">SMART CLINIC HEALTH PH (GCash Merchant)</p>
                      <p className="text-[9px] text-slate-600 font-mono">Account #: 0915-405-0623</p>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      GCash Reference / Trace Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. MP-20261027-8821"
                        value={paymentRefNumber}
                        onChange={(e) => setPaymentRefNumber(e.target.value)}
                        className="flex-1 p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs font-mono text-cyan-300"
                      />
                      <button
                        type="button"
                        onClick={() => setPaymentRefNumber(`MP-${Date.now().toString().slice(-8)}`)}
                        className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-300 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Auto-Gen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Card / Bank Ref Number */}
              {(payMethod === 'Credit Card' || payMethod === 'Debit Card' || payMethod === 'Maya' || payMethod === 'Bank Transfer') && (
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Transaction / Approval Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Terminal Auth or Bank Reference Code"
                    value={paymentRefNumber}
                    onChange={(e) => setPaymentRefNumber(e.target.value)}
                    className="w-full p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(isCashInsufficient)}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer shadow-md transition"
                >
                  Record &amp; Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HMO LOA Approval */}
      {approvingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121c33] rounded-2xl shadow-2xl border border-slate-800 p-6 max-w-md w-full text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">HMO Letter of Authorization (LOA)</h3>
                <p className="text-slate-400 text-xs">Verify partner coverage for {approvingInvoice.patientName}</p>
              </div>
              <button onClick={() => setApprovingInvoice(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveHMO} className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">HMO Partner Network</label>
                <div className="p-2 bg-[#090e1a] rounded-lg border border-slate-700 text-cyan-300 font-bold">
                  {approvingInvoice.hmoClaim?.partnerName || 'Maxicare Healthcare Corporation'}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">LOA / Approval Confirmation Number</label>
                <input
                  type="text"
                  required
                  value={approvalLoa}
                  onChange={(e) => setApprovalLoa(e.target.value)}
                  className="w-full p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Approved Coverage Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={approvingInvoice.totalAmount}
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(Number(e.target.value))}
                  className="w-full p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Verification Remarks</label>
                <input
                  type="text"
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="w-full p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setApprovingInvoice(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Confirm LOA Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Generate Live Patient Invoice */}
      {showNewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121c33] rounded-2xl shadow-2xl border border-slate-800 p-6 max-w-xl w-full text-xs space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Generate Live Patient Invoice</h3>
                <p className="text-slate-400 text-xs">Point of Service itemization &amp; HMO claim attachment</p>
              </div>
              <button onClick={() => setShowNewInvoice(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
              {/* Patient Selection & 1-Click Import */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">Select Patient</label>
                  <button
                    type="button"
                    onClick={handleImportRecentOrders}
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition text-[11px]"
                    title="Pull recent consultation, lab orders, and medication items"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Populate Visit Charges</span>
                  </button>
                </div>
                <select
                  value={newPatId}
                  onChange={(e) => {
                    setNewPatId(e.target.value);
                    const pat = patients.find((p) => p.id === e.target.value);
                    if (pat?.insuranceProvider && pat.insuranceProvider !== 'None') {
                      setEnableHMOInNewInvoice(true);
                      setSelectedHMOName(pat.insuranceProvider);
                      setHmoMemberId(pat.insurancePolicyNumber || '');
                    }
                  }}
                  className="w-full p-2.5 bg-[#090e1a] border border-slate-700 rounded-xl text-xs text-white"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.mrn}) • HMO: {p.insuranceProvider || 'None'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Preset Chips */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fast Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => addQuickPresetItem('Physician Consultation', 'Consultation', 800)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-medium"
                  >
                    + Consult ₱800
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickPresetItem('Specialist Consultation', 'Consultation', 1200)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-medium"
                  >
                    + Specialist ₱1,200
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickPresetItem('Complete Blood Count (CBC)', 'Laboratory', 350)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-medium"
                  >
                    + CBC ₱350
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickPresetItem('Lipid Profile Panel', 'Laboratory', 750)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-medium"
                  >
                    + Lipid ₱750
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickPresetItem('12-Lead ECG Analysis', 'Procedure', 450)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-medium"
                  >
                    + ECG ₱450
                  </button>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 block text-[10px] uppercase">
                  Line Items ({invoiceItems.length})
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {invoiceItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-[#090e1a] rounded-lg border border-slate-800 flex justify-between items-center"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-white block truncate">{item.description}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.category} • {formatPeso(item.unitPrice)} x {item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold font-mono text-white">{formatPeso(item.total)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Add Line Item Box */}
              <div className="bg-[#090e1a] p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Add Custom Service or Medication</span>
                <input
                  type="text"
                  placeholder="Service description (e.g. Nebulization, Wound Suture, Urinalysis)"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full p-2 bg-[#121c33] border border-slate-700 rounded-lg text-xs text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Rate (₱)"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-24 p-2 bg-[#121c33] border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="flex-1 p-2 bg-[#121c33] border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Discount Percentage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Senior / PWD / Promo Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2 bg-[#090e1a] border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* HMO Integration Box */}
              <div className="p-3 bg-cyan-950/20 border border-cyan-800/60 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableHMOInNewInvoice}
                    onChange={(e) => setEnableHMOInNewInvoice(e.target.checked)}
                    className="rounded text-teal-500 focus:ring-0"
                  />
                  <span className="font-bold text-cyan-300">Bill via Accredited HMO Partner (PhilHealth / Private)</span>
                </label>

                {enableHMOInNewInvoice && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-800/40">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">HMO Partner</label>
                      <select
                        value={selectedHMOName}
                        onChange={(e) => setSelectedHMOName(e.target.value)}
                        className="w-full p-1.5 bg-[#090e1a] border border-slate-700 rounded text-xs text-white"
                      >
                        {hmoPartners.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name} ({h.coverageRate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Member / Policy #</label>
                      <input
                        type="text"
                        placeholder="e.g. MX-88219"
                        value={hmoMemberId}
                        onChange={(e) => setHmoMemberId(e.target.value)}
                        className="w-full p-1.5 bg-[#090e1a] border border-slate-700 rounded text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">LOA / Approval #</label>
                      <input
                        type="text"
                        placeholder="e.g. LOA-99214"
                        value={hmoLoaNumber}
                        onChange={(e) => setHmoLoaNumber(e.target.value)}
                        className="w-full p-1.5 bg-[#090e1a] border border-slate-700 rounded text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Coverage Amount (₱)</label>
                      <input
                        type="number"
                        placeholder={String(newInvoiceTotal)}
                        value={hmoCoverageAmount}
                        onChange={(e) => setHmoCoverageAmount(e.target.value)}
                        className="w-full p-1.5 bg-[#090e1a] border border-slate-700 rounded text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Totals Bar */}
              <div className="p-3 bg-[#090e1a] rounded-xl border border-slate-800 space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatPeso(newInvoiceSubtotal)}</span>
                </div>
                {newInvoiceDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span>- {formatPeso(newInvoiceDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold border-t border-slate-800 pt-1 text-sm">
                  <span>Net Invoice Assessment:</span>
                  <span className="text-teal-400">{formatPeso(newInvoiceTotal)}</span>
                </div>
                {enableHMOInNewInvoice && (
                  <div className="flex justify-between text-[11px] text-amber-400 border-t border-slate-800/80 pt-1">
                    <span>Patient Co-pay (Out-of-Pocket):</span>
                    <span>{formatPeso(newInvoicePatientShare)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewInvoice(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceItems.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer shadow-md transition"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
