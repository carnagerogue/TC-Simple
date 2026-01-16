"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";

type Transaction = {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  buyerName: string | null;
  sellerName: string | null;
  purchasePrice: number | null;
  earnestMoneyAmount: number | null;
  contractDate: string | null;
  effectiveDate: string | null;
  closingDate: string | null;
  possessionDate: string | null;
  earnestMoneyDueDate: string | null;
  titleCompany: string | null;
  closingCompany: string | null;
  closingAgentName: string | null;
  includedItems: string | null;
  stage: string;
};

export function TransactionEditor({ transaction }: { transaction: Transaction }) {
  const router = useRouter();
  const [formData, setFormData] = useState(transaction);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Price") || name.includes("Amount") ? (value ? parseFloat(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.refresh();
      alert("Saved successfully!");
    } catch (error) {
      alert("Error saving changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell title="Transaction Details" description={`Manage details for ${transaction.address}`}>
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8 rounded-xl bg-white p-8 shadow-sm">
        
        {/* Section: Property */}
        <div className="space-y-4">
          <h3 className="border-b pb-2 text-lg font-medium text-slate-900">Property Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
              <input
                name="city"
                value={formData.city || ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
                <input
                    name="state"
                    value={formData.state || ""}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Zip</label>
                <input
                    name="zip"
                    value={formData.zip || ""}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
             <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">County</label>
              <input
                name="county"
                value={formData.county || ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section: Parties */}
        <div className="space-y-4">
          <h3 className="border-b pb-2 text-lg font-medium text-slate-900">Parties</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Buyer Name</label>
              <input
                name="buyerName"
                value={formData.buyerName || ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Seller Name</label>
              <input
                name="sellerName"
                value={formData.sellerName || ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section: Financials & Dates */}
        <div className="space-y-4">
          <h3 className="border-b pb-2 text-lg font-medium text-slate-900">Financials & Dates</h3>
          <div className="grid gap-4 md:grid-cols-3">
             <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                    name="purchasePrice"
                    type="number"
                    value={formData.purchasePrice || ""}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 pl-7 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Earnest Money</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                    name="earnestMoneyAmount"
                    type="number"
                    value={formData.earnestMoneyAmount || ""}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 pl-7 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Earnest Money Due</label>
              <input
                name="earnestMoneyDueDate"
                type="date"
                value={formData.earnestMoneyDueDate ? formData.earnestMoneyDueDate.split('T')[0] : ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
             <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contract Date</label>
              <input
                name="contractDate"
                type="date"
                value={formData.contractDate ? formData.contractDate.split('T')[0] : ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
             <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Effective Date</label>
              <input
                name="effectiveDate"
                type="date"
                value={formData.effectiveDate ? formData.effectiveDate.split('T')[0] : ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
             <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Closing Date</label>
              <input
                name="closingDate"
                type="date"
                value={formData.closingDate ? formData.closingDate.split('T')[0] : ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section: Closing Team */}
        <div className="space-y-4">
          <h3 className="border-b pb-2 text-lg font-medium text-slate-900">Closing Team</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title Company</label>
              <input
                name="titleCompany"
                value={formData.titleCompany || ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Closing Agent (Company)</label>
              <input
                name="closingCompany"
                value={formData.closingCompany || ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Closing Agent (Name)</label>
              <input
                name="closingAgentName"
                value={formData.closingAgentName || ""}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Section: Other */}
         <div className="space-y-4">
          <h3 className="border-b pb-2 text-lg font-medium text-slate-900">Additional Info</h3>
          <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Included Items</label>
              <textarea
                name="includedItems"
                value={formData.includedItems || ""}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">List of items included in the sale.</p>
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

