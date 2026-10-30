import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatPeso } from '../../utils/currency';
import { InventoryItem } from '../../types/clinic';
import {
  AlertTriangle,
  Search,
  X,
  ShieldAlert,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

export const InventoryList: React.FC = () => {
  const { inventory, adjustStock, activeRole, setActiveTab } = useClinic();

  // STRICT ACCESS RESTRICTION: Strip out / block for Patient or Pharmacy (as strictly mandated)
  if (activeRole === 'patient' || activeRole === 'pharmacist' || (activeRole as string) === 'pharmacy') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm text-xs font-sans">
        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Access Restricted — Stock Inventory
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The Medication Formulary and Master Stock Inventory is restricted to clinical administration.
          In accordance with clinic role routing policies, this module is not authorized for your account.
        </p>
        <div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState('New shipment received');

  const todayStr = '2026-10-06';

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.genericName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.batchNumber.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.reorderLevel).length;

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    const change = adjustType === 'IN' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    adjustStock(adjustItem.id, change, adjustReason);
    setAdjustItem(null);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto text-xs font-sans pb-10">
      {/* Header and Stock Overview */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Pharmacy & Stock Inventory</h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {inventory.length} Formulations
            </span>
            {lowStockCount > 0 && (
              <span className="text-xs bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{lowStockCount} Low Stock</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Specific Task: Formulary reorder management, batch number tracking, safety thresholds, and dispensary stock adjustments.
          </p>
        </div>
      </div>

      {/* Security & Audit Banner */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Controlled Substances & Formulary Audit: Stock changes and batch adjustments are recorded in immutable logs.</span>
        </div>
        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold">
          DOH COMPLIANT
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by drug name, generic, SKU, or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Antihypertensive">Antihypertensive</option>
            <option value="Antidiabetic">Antidiabetic</option>
            <option value="Antibiotic">Antibiotic</option>
            <option value="Analgesic">Analgesic</option>
            <option value="Cardiovascular">Cardiovascular</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Medication & SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Batch & Expiry</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-3">Unit Price (PHP)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No medications found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLow = item.stockQuantity <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{item.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.genericName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">SKU: {item.sku}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 block">{item.batchNumber}</span>
                        <span className={`text-[10px] ${item.expirationDate < todayStr ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          Exp: {item.expirationDate}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.stockQuantity}
                          </span>
                          <span className="text-[10px] text-slate-400">{item.unit}s</span>
                        </div>
                        {isLow && (
                          <span className="text-[9px] font-bold text-rose-600 block mt-0.5">
                            Reorder (Threshold: {item.reorderLevel})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formatPeso(item.sellingPrice)}</span>
                        <span className="text-[10px] text-slate-400 block">Cost: {formatPeso(item.purchasePrice)}</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setAdjustItem(item)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold text-xs cursor-pointer"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Stock Adjustment</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {adjustItem.name} ({adjustItem.genericName}) • Current: <strong>{adjustItem.stockQuantity} {adjustItem.unit}s</strong>
            </p>

            <form onSubmit={handleApplyAdjustment} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('IN')}
                  className={`flex-1 py-1.5 rounded font-semibold text-xs transition cursor-pointer ${
                    adjustType === 'IN' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('OUT')}
                  className={`flex-1 py-1.5 rounded font-semibold text-xs transition cursor-pointer ${
                    adjustType === 'OUT' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  - Deduct Stock
                </button>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Adjustment Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Audit Reason</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold cursor-pointer"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
