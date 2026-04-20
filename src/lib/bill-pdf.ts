import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Bill } from "@/lib/storage";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);
}

export function downloadBillPdf(bill: Bill) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MediStock Pharmacy", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("Tax invoice / Sale bill", 40, 66);

  // Bill meta on the right
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(bill.number, pageWidth - 40, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(new Date(bill.createdAt).toLocaleString(), pageWidth - 40, 66, {
    align: "right",
  });

  // Divider
  doc.setDrawColor(220);
  doc.line(40, 80, pageWidth - 40, 80);

  // Customer / cashier block
  doc.setTextColor(20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Billed to", 40, 100);
  doc.text("Payment", pageWidth - 200, 100);

  doc.setFont("helvetica", "normal");
  doc.text(bill.customerName ?? "Walk-in customer", 40, 115);
  if (bill.customerPhone) doc.text(bill.customerPhone, 40, 130);

  doc.text(
    `${bill.paymentMethod.toUpperCase()}`,
    pageWidth - 200,
    115,
  );
  if (bill.cashier) doc.text(`Cashier: ${bill.cashier}`, pageWidth - 200, 130);

  // Items table
  autoTable(doc, {
    startY: 150,
    head: [["Item", "Qty", "Price", "Tax %", "Line total"]],
    body: bill.items.map((it) => {
      const line = it.price * it.qty;
      const tax = (line * it.taxPercent) / 100;
      return [
        it.name,
        String(it.qty),
        it.price.toFixed(2),
        `${it.taxPercent}%`,
        (line + tax).toFixed(2),
      ];
    }),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [26, 152, 144], textColor: 255 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  // Totals
  const tableEndY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 200;
  const totalsX = pageWidth - 220;
  let y = tableEndY + 24;
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(20);
  doc.text(money(bill.subtotal), pageWidth - 40, y, { align: "right" });
  y += 16;
  doc.setTextColor(110);
  doc.text("Tax", totalsX, y);
  doc.setTextColor(20);
  doc.text(money(bill.tax), pageWidth - 40, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220);
  doc.line(totalsX, y, pageWidth - 40, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Grand total", totalsX, y);
  doc.text(money(bill.total), pageWidth - 40, y, { align: "right" });

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(
    "Thank you for choosing MediStock — get well soon!",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 32,
    { align: "center" },
  );

  doc.save(`${bill.number}.pdf`);
}
