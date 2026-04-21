import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Bill } from "@/lib/storage";

// jsPDF's built-in Helvetica font doesn't include the Rupee glyph (₹)
// or many Unicode dashes — they render as "Ø<>" boxes. Use ASCII only.
const RUPEE = "Rs.";

function money(n: number) {
  // Format Indian-style with two decimals, no currency symbol from Intl
  // (avoids the unsupported ₹ glyph).
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${RUPEE} ${formatted}`;
}

function clean(s: string | undefined | null): string {
  if (!s) return "";
  // Strip characters jsPDF helvetica can't render (em dash, en dash, smart quotes, ₹)
  return s
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u20B9/g, RUPEE)
    .replace(/[^\x20-\x7E]/g, "");
}

export function downloadBillPdf(bill: Bill) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 40;
  const right = pageWidth - 40;

  // ===== Header band =====
  doc.setFillColor(26, 152, 144);
  doc.rect(0, 0, pageWidth, 90, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MediStock Pharmacy", left, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Tax invoice / Sale bill", left, 56);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(clean(bill.number), right, 38, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    clean(new Date(bill.createdAt).toLocaleString("en-IN")),
    right,
    56,
    { align: "right" },
  );

  // ===== Parties block =====
  doc.setTextColor(35, 35, 35);
  let y = 120;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Billed to", left, y);
  doc.text("Payment", right - 160, y);

  doc.setFont("helvetica", "normal");
  y += 16;
  doc.text(clean(bill.customerName) || "Walk-in customer", left, y);
  doc.text(bill.paymentMethod.toUpperCase(), right - 160, y);

  y += 14;
  if (bill.customerPhone) doc.text(clean(bill.customerPhone), left, y);
  if (bill.cashier) doc.text(`Cashier: ${clean(bill.cashier)}`, right - 160, y);

  // ===== Items table =====
  autoTable(doc, {
    startY: 165,
    head: [["#", "Item", "Qty", "Price", "Tax %", "Line total"]],
    body: bill.items.map((it, idx) => {
      const line = it.price * it.qty;
      const tax = (line * it.taxPercent) / 100;
      return [
        String(idx + 1),
        clean(it.name),
        String(it.qty),
        money(it.price),
        `${it.taxPercent}%`,
        money(line + tax),
      ];
    }),
    styles: {
      fontSize: 9.5,
      cellPadding: 7,
      lineColor: [220, 220, 220],
      lineWidth: 0.4,
      textColor: [40, 40, 40],
    },
    headStyles: {
      fillColor: [26, 152, 144],
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      2: { halign: "right", cellWidth: 38 },
      3: { halign: "right", cellWidth: 78 },
      4: { halign: "right", cellWidth: 50 },
      5: { halign: "right", cellWidth: 88 },
    },
    margin: { left, right: 40 },
    theme: "grid",
  });

  // ===== Totals =====
  const tableEndY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 200;

  const totalsLabelX = right - 180;
  const totalsValueX = right;
  let ty = tableEndY + 26;

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text("Subtotal", totalsLabelX, ty);
  doc.setTextColor(35, 35, 35);
  doc.text(money(bill.subtotal), totalsValueX, ty, { align: "right" });

  ty += 16;
  doc.setTextColor(110, 110, 110);
  doc.text("Tax", totalsLabelX, ty);
  doc.setTextColor(35, 35, 35);
  doc.text(money(bill.tax), totalsValueX, ty, { align: "right" });

  ty += 10;
  doc.setDrawColor(220, 220, 220);
  doc.line(totalsLabelX, ty, totalsValueX, ty);

  ty += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(26, 152, 144);
  doc.text("Grand total", totalsLabelX, ty);
  doc.text(money(bill.total), totalsValueX, ty, { align: "right" });

  // Customer notes (optional)
  if (bill.customerNotes && bill.customerNotes.trim()) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const notes = doc.splitTextToSize(`Notes: ${clean(bill.customerNotes)}`, pageWidth - 80);
    doc.text(notes, left, ty);
  }

  // ===== Footer =====
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "Thank you for choosing MediStock - get well soon!",
    pageWidth / 2,
    pageHeight - 32,
    { align: "center" },
  );

  doc.save(`${clean(bill.number) || "bill"}.pdf`);
}
