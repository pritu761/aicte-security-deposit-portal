import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

const NAVY = rgb(0.043, 0.169, 0.278);
const GOLD = rgb(0.85, 0.6, 0.18);
const SLATE = rgb(0.29, 0.36, 0.43);
const LIGHT = rgb(0.93, 0.95, 0.97);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.7, 0.16, 0.16);

type Fonts = { regular: PDFFont; bold: PDFFont; serif: PDFFont; serifBold: PDFFont };

export type FdrPdfData = {
  fdrNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  amount: number;
  issueDate: string;
  maturityDate: string;
  holderName: string;
  institutionName: string;
  aicteId: string;
  jointHolder: string;
};

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[Number(month) - 1]} ${year}`;
}

function formatMoney(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`;
}

function numberToWords(value: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n: number): string => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  };
  const three = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && rest ? " " : ""}${rest ? two(rest) : ""}`.trim();
  };
  if (!value) return "Zero";
  const crore = Math.floor(value / 1_00_00_000);
  const lakh = Math.floor((value % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((value % 1_00_000) / 1_000);
  const rest = value % 1_000;
  return [
    crore ? `${three(crore)} Crore` : "",
    lakh ? `${three(lakh)} Lakh` : "",
    thousand ? `${three(thousand)} Thousand` : "",
    rest ? three(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

async function baseDocument(title: string, subject: string): Promise<{ pdf: PDFDocument; fonts: Fonts; page: PDFPage }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setSubject(subject);
  pdf.setAuthor("AICTE Regulation Bureau");
  pdf.setCreator("FDR Setu — Security Deposit & FDR Management Portal");
  const page = pdf.addPage([595.28, 841.89]);
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
  };
  return { pdf, fonts, page };
}

function watermark(page: PDFPage, fonts: Fonts) {
  page.drawText("FDR SETU — DIGITAL CUSTODY COPY", {
    x: 52,
    y: 330,
    size: 20,
    font: fonts.bold,
    color: rgb(0.82, 0.84, 0.87),
    opacity: 0.55,
    rotate: degrees(32),
  });
}

function border(page: PDFPage) {
  page.drawRectangle({
    x: 28,
    y: 28,
    width: 595.28 - 56,
    height: 841.89 - 56,
    borderColor: NAVY,
    borderWidth: 1.2,
  });
  page.drawRectangle({
    x: 34,
    y: 34,
    width: 595.28 - 68,
    height: 841.89 - 68,
    borderColor: GOLD,
    borderWidth: 0.5,
  });
}

function bankHeader(page: PDFPage, fonts: Fonts, bankName: string, branchName: string, ifsc: string) {
  page.drawRectangle({ x: 28, y: 735, width: 539, height: 79, color: NAVY });
  page.drawText(bankName.toUpperCase(), {
    x: 52,
    y: 782,
    size: 17,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawText(`${branchName} Branch  ·  IFSC ${ifsc}`, {
    x: 52,
    y: 760,
    size: 9,
    font: fonts.regular,
    color: rgb(0.82, 0.87, 0.92),
  });
  page.drawText("Authorised FDR record", {
    x: 430,
    y: 760,
    size: 8,
    font: fonts.regular,
    color: GOLD,
  });
}

function detailRow(page: PDFPage, fonts: Fonts, label: string, value: string, y: number, x = 60, width = 470) {
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 7.5,
    font: fonts.bold,
    color: SLATE,
  });
  page.drawText(value, {
    x,
    y: y - 15,
    size: 10.5,
    font: fonts.regular,
    color: rgb(0.08, 0.12, 0.16),
    maxWidth: width,
    lineHeight: 13,
  });
}

function signatureBlock(page: PDFPage, fonts: Fonts, y: number, bankName: string) {
  page.drawLine({ start: { x: 365, y }, end: { x: 520, y }, thickness: 0.8, color: SLATE });
  page.drawText("Authorised Signatory", {
    x: 395,
    y: y - 14,
    size: 8,
    font: fonts.regular,
    color: SLATE,
  });
  page.drawText(bankName, {
    x: 389,
    y: y - 26,
    size: 8,
    font: fonts.bold,
    color: NAVY,
  });
}

export async function createFdrCertificatePdf(data: FdrPdfData): Promise<Buffer> {
  const { pdf, fonts, page } = await baseDocument(
    `Fixed Deposit Receipt — ${data.fdrNumber}`,
    "FDR certificate submitted to AICTE",
  );
  border(page);
  watermark(page, fonts);
  bankHeader(page, fonts, data.bankName, data.branchName, data.ifscCode);

  page.drawText("FIXED DEPOSIT RECEIPT", {
    x: 60,
    y: 695,
    size: 16,
    font: fonts.serifBold,
    color: NAVY,
  });
  page.drawText("(Original certificate — retained in digital custody)", {
    x: 60,
    y: 677,
    size: 8.5,
    font: fonts.regular,
    color: SLATE,
  });

  page.drawRectangle({ x: 52, y: 610, width: 490, height: 48, color: LIGHT });
  page.drawText("FDR NUMBER", { x: 66, y: 642, size: 7.5, font: fonts.bold, color: SLATE });
  page.drawText(data.fdrNumber, { x: 66, y: 622, size: 13, font: fonts.bold, color: NAVY });
  page.drawText("DATE OF ISSUE", { x: 330, y: 642, size: 7.5, font: fonts.bold, color: SLATE });
  page.drawText(formatDate(data.issueDate), { x: 330, y: 622, size: 11, font: fonts.regular, color: NAVY });

  detailRow(page, fonts, "Deposit amount", formatMoney(data.amount), 570);
  page.drawText(`Rupees ${numberToWords(data.amount)} only`, {
    x: 60,
    y: 538,
    size: 9,
    font: fonts.serif,
    color: SLATE,
  });
  detailRow(page, fonts, "Account holder", data.institutionName, 505);
  detailRow(page, fonts, "Joint account holder", data.jointHolder, 465);
  detailRow(page, fonts, "AICTE institution ID", data.aicteId, 425);

  page.drawLine({ start: { x: 60, y: 400 }, end: { x: 535, y: 400 }, thickness: 0.5, color: rgb(0.8, 0.84, 0.88) });

  detailRow(page, fonts, "Date of maturity", formatDate(data.maturityDate), 375);
  detailRow(page, fonts, "Applicable interest rate", "As per bank card rates (compounded quarterly)", 375, 330, 205);

  page.drawRectangle({ x: 52, y: 255, width: 490, height: 86, color: rgb(0.985, 0.98, 0.94) });
  page.drawRectangle({ x: 52, y: 255, width: 3, height: 86, color: GOLD });
  const terms = [
    "This receipt is issued subject to the terms and conditions of the bank and is non-transferable.",
    "The deposit is held in the joint names stated above. No withdrawal or lien shall be created without",
    "the written authority of the AICTE Regulation Bureau. The original instrument is held in digital custody.",
  ];
  terms.forEach((line, index) => {
    page.drawText(line, {
      x: 66,
      y: 315 - index * 14,
      size: 8,
      font: fonts.regular,
      color: SLATE,
    });
  });

  signatureBlock(page, fonts, 180, data.bankName);

  page.drawText(`Issued at ${data.branchName} on ${formatDate(data.issueDate)}`, {
    x: 60,
    y: 92,
    size: 8,
    font: fonts.regular,
    color: SLATE,
  });
  page.drawText("System-generated custody record. Particulars are verified against the issuing branch.", {
    x: 60,
    y: 78,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.55, 0.6, 0.65),
  });

  return Buffer.from(await pdf.save());
}

export async function createBankConfirmationPdf(
  data: FdrPdfData & { reference: string; confirmationDate: string },
): Promise<Buffer> {
  const { pdf, fonts, page } = await baseDocument(
    `Bank confirmation — ${data.fdrNumber}`,
    "Independent bank confirmation letter",
  );
  border(page);
  watermark(page, fonts);
  bankHeader(page, fonts, data.bankName, data.branchName, data.ifscCode);

  page.drawText("CONFIRMATION OF FIXED DEPOSIT", {
    x: 60,
    y: 690,
    size: 16,
    font: fonts.serifBold,
    color: NAVY,
  });
  page.drawText(`Reference: ${data.reference}`, { x: 60, y: 665, size: 9, font: fonts.regular, color: SLATE });
  page.drawText(`Date: ${formatDate(data.confirmationDate)}`, { x: 430, y: 665, size: 9, font: fonts.regular, color: SLATE });

  page.drawText("TO WHOMSOEVER IT MAY CONCERN", { x: 60, y: 625, size: 9, font: fonts.bold, color: NAVY });

  const body = `This is to confirm that Fixed Deposit Receipt No. ${data.fdrNumber} dated ${formatDate(data.issueDate)} for ${formatMoney(data.amount)} is held with our ${data.branchName} branch in the name of ${data.institutionName} jointly with ${data.jointHolder}.`;
  wrap(body, 92).forEach((line, index) => {
    page.drawText(line, { x: 60, y: 598 - index * 15, size: 10, font: fonts.serif, color: rgb(0.1, 0.14, 0.18) });
  });

  const body2 = `The deposit is valid and subsisting as on the date of this letter and matures on ${formatDate(data.maturityDate)}. The instrument is free from any lien, pledge or encumbrance created in favour of any third party, save as recorded by the Council.`;
  wrap(body2, 92).forEach((line, index) => {
    page.drawText(line, { x: 60, y: 545 - index * 15, size: 10, font: fonts.serif, color: rgb(0.1, 0.14, 0.18) });
  });

  page.drawText("Verified particulars", { x: 60, y: 465, size: 9, font: fonts.bold, color: NAVY });
  const cells = [
    ["FDR number", data.fdrNumber],
    ["Deposit amount", formatMoney(data.amount)],
    ["Issue date", formatDate(data.issueDate)],
    ["Maturity date", formatDate(data.maturityDate)],
    ["Account holder", data.institutionName],
    ["IFSC", data.ifscCode],
  ];
  cells.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 60 + col * 240;
    const y = 430 - row * 48;
    page.drawText(label.toUpperCase(), { x, y, size: 7, font: fonts.bold, color: SLATE });
    page.drawText(value, { x, y: y - 14, size: 9.5, font: fonts.regular, color: rgb(0.1, 0.14, 0.18), maxWidth: 220 });
  });

  page.drawText("This confirmation is issued at the request of the account holder for AICTE verification purposes.", {
    x: 60,
    y: 245,
    size: 8.5,
    font: fonts.regular,
    color: SLATE,
    maxWidth: 470,
    lineHeight: 12,
  });

  signatureBlock(page, fonts, 180, data.bankName);
  page.drawText("Digitally authenticated through the bank's verification desk · sandbox document", {
    x: 60,
    y: 92,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.55, 0.6, 0.65),
  });

  return Buffer.from(await pdf.save());
}

export async function createDischargeVoucherPdf(
  data: FdrPdfData & { dispatchReference: string; releaseDate: string },
): Promise<Buffer> {
  const { pdf, fonts, page } = await baseDocument(
    `Discharge voucher — ${data.fdrNumber}`,
    "FDR discharge voucher",
  );
  border(page);
  watermark(page, fonts);
  bankHeader(page, fonts, data.bankName, data.branchName, data.ifscCode);

  page.drawText("DISCHARGE VOUCHER", {
    x: 60,
    y: 690,
    size: 18,
    font: fonts.serifBold,
    color: NAVY,
  });
  page.drawText("AICTE REGULATION BUREAU · SECURITY DEPOSIT RELEASE", {
    x: 60,
    y: 670,
    size: 8,
    font: fonts.bold,
    color: GOLD,
  });

  detailRow(page, fonts, "FDR number", data.fdrNumber, 625);
  detailRow(page, fonts, "Institution", data.institutionName, 580);
  detailRow(page, fonts, "Deposit amount", formatMoney(data.amount), 535);
  detailRow(page, fonts, "Date of maturity", formatDate(data.maturityDate), 490);
  detailRow(page, fonts, "Dispatch reference", data.dispatchReference, 445);
  detailRow(page, fonts, "Date of release", formatDate(data.releaseDate), 400);

  const declaration = `The original Fixed Deposit Receipt described above has been discharged by the competent authority of the All India Council for Technical Education. The bank is authorised to release the deposit together with accrued interest to the institution named above, subject to completion of the Council's prescribed formalities and applicable regulations.`;
  wrap(declaration, 88).forEach((line, index) => {
    page.drawText(line, { x: 60, y: 335 - index * 15, size: 10, font: fonts.serif, color: rgb(0.1, 0.14, 0.18) });
  });

  page.drawText(`Dispatch reference: ${data.dispatchReference}`, {
    x: 60,
    y: 235,
    size: 9,
    font: fonts.bold,
    color: RED,
  });

  page.drawLine({ start: { x: 60, y: 175 }, end: { x: 235, y: 175 }, thickness: 0.8, color: SLATE });
  page.drawText("Regulation Bureau Head", { x: 78, y: 160, size: 8, font: fonts.regular, color: SLATE });
  signatureBlock(page, fonts, 175, data.bankName);

  return Buffer.from(await pdf.save());
}
