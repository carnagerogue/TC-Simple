import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF uploads are currently supported." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    // Save raw file in database (per-user)
    const document = await db.document.create({
      data: {
        userId: session.user.id || session.user.email!,
        filename: file.name,
        mimeType: file.type || "application/pdf",
        size: file.size,
        data: buffer,
      },
    });

    let transactionId = null;
    let parsedData = null;

    // Call Intake Service
  try {
      const intakeUrl = process.env.INTAKE_SERVICE_URL || "http://localhost:8000/intake";
      const intakeFormData = new FormData();
      intakeFormData.append("file", new Blob([buffer], { type: file.type }), file.name);

      const intakeRes = await fetch(intakeUrl, {
        method: "POST",
        body: intakeFormData,
      });

      if (intakeRes.ok) {
        parsedData = await intakeRes.json();
        console.log("Intake service parsed data:", parsedData);
      } else {
        console.warn("Intake service failed:", await intakeRes.text());
      }
    } catch (e) {
      console.warn("Failed to connect to intake service:", e);
    }

    // Create Transaction in DB
    try {
      const safeDate = (dateStr: unknown) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const safeFloat = (val: unknown) => {
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsed = parseFloat(val.replace(/[^0-9.]/g, ""));
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      };

      const p = parsedData || {};

      const transaction = await db.transaction.create({
        data: {
          address: p.property_address || file.name.replace(/\.pdf$/i, ""),
          city: p.property_city || null,
          county: p.property_county || null,
          state: p.property_state || null,
          zip: p.property_zip || null,
          
          buyerName: p.buyer_name || null,
          sellerName: p.seller_name || null,
          
          contractDate: safeDate(p.contract_date),
          effectiveDate: safeDate(p.effective_date),
          closingDate: safeDate(p.closing_date),
          possessionDate: safeDate(p.possession_date),
          earnestMoneyDueDate: safeDate(p.earnest_money_delivery_date),
          
          purchasePrice: safeFloat(p.purchase_price),
          earnestMoneyAmount: safeFloat(p.earnest_money_amount),
          
          titleCompany: p.title_insurance_company || null,
          closingCompany: p.closing_agent_company || null,
          closingAgentName: p.closing_agent_name || null,
          
          includedItems: Array.isArray(p.included_items) ? p.included_items.join(", ") : (typeof p.included_items === 'string' ? p.included_items : null),
          
          stage: "Intake",
          userId: session.user.id || session.user.email!, 
        },
      });
      transactionId = transaction.id;

      // Link the uploaded document to the created transaction for audit/history views
      try {
        await db.document.update({
          where: { id: document.id },
          data: { transactionId: transaction.id },
        });
      } catch (linkErr) {
        console.warn("Failed to link document to transaction:", linkErr);
      }
    } catch (dbError) {
      console.error("Failed to save transaction to DB:", dbError);
    }

    return NextResponse.json({
      message: "Upload processed successfully.",
      fileName: file.name,
      fileSize: file.size,
      uploadedBy: session.user.email,
      documentId: document.id,
      transactionId,
      parsedData,
    });
  } catch (error) {
    console.error("Failed to process upload:", error);
    return NextResponse.json(
      { error: "Unable to save the file. Please try again." },
      { status: 500 },
    );
  }
}

