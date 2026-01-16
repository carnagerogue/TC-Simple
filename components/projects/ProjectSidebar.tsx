"use client";

type Props = {
  summary?: Record<string, string | number | null | undefined> | null;
  myClientRole?: "BUYER" | "SELLER" | null;
};

export function ProjectSidebar({ summary, myClientRole }: Props) {
  const fields = summary || {};

  const rows = [
    { label: "Buyer", value: fields["buyer_name"], role: "BUYER" as const },
    { label: "Seller", value: fields["seller_name"], role: "SELLER" as const },
    { label: "Address", value: fields["property_address"] },
    {
      label: "City/State/Zip",
      value: [fields["property_city"], fields["property_state"], fields["property_zip"]].filter(Boolean).join(", "),
    },
    { label: "Closing Date", value: fields["closing_date"] },
    { label: "Contract Date", value: fields["contract_date"] },
    { label: "Earnest Money", value: fields["earnest_money_amount"] },
  ].filter((r) => r.value);

  const documentUrl =
    fields["documentUrl"] ||
    fields["document_url"] ||
    fields["pdfUrl"] ||
    fields["pdf_url"] ||
    (fields["documentId"] ? `/api/documents/${fields["documentId"]}` : undefined);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Project Summary</h3>
      <div className="mt-3 space-y-2 text-sm text-gray-700">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              <span>{row.label}</span>
              {row.role && myClientRole === row.role ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  My Client
                </span>
              ) : null}
            </p>
            <p className="font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      {documentUrl ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p className="text-xs uppercase tracking-wide text-gray-500">Reference PDF</p>
          <a
            href={documentUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 text-[#1b4c96] hover:underline"
          >
            View PDF
            <span aria-hidden>↗</span>
          </a>
          <div className="mt-3 h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
            <object data={documentUrl as string} type="application/pdf" className="h-full w-full">
              <p className="p-2 text-xs text-slate-500">
                Preview not supported.{" "}
                <a className="text-[#377ddf] underline" href={documentUrl as string} target="_blank" rel="noreferrer">
                  Open PDF
                </a>
              </p>
            </object>
          </div>
        </div>
      ) : null}
    </div>
  );
}

