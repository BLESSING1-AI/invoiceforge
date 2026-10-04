import { LineItem, PriceBookEntry } from "./types";
import { randomUUID } from "crypto";

export interface ExtractionResult {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  workDescription: string;
  lineItems: LineItem[];
  notes: string;
  confidence: number;
  missingFields: string[];
  rawAnalysis: string;
}

/** Rule-based extractor. Never invents prices or customers. Ready for real LLM swap. */
export async function extractJobDetails(
  rawInput: string,
  priceBook: PriceBookEntry[] = []
): Promise<ExtractionResult> {
  const text = rawInput.trim();
  const lower = text.toLowerCase();

  let customerName: string | null = null;
  for (const p of [
    /(?:for|customer|client|mr\.?|mrs\.?|ms\.?|miss)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:came|called|geyser|pipe|db|board|fault|job|house|flat|leaking|kitchen)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:came|'s|'s)/i,
  ]) {
    const m = text.match(p);
    if (m) { customerName = m[1].trim(); break; }
  }

  let customerPhone: string | null = null;
  const phoneMatch = text.match(/(?:\+27|0)[1-9]\d{8}|\d{3}[\s-]?\d{3}[\s-]?\d{4}/);
  if (phoneMatch) customerPhone = phoneMatch[0].replace(/\s+/g, "");

  let customerEmail: string | null = null;
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) customerEmail = emailMatch[0];

  let customerAddress: string | null = null;
  const addrMatch = text.match(/(?:at|address|in)\s+(\d+\s+[A-Za-z0-9\s,]+(?:street|rd|road|ave|avenue|drive|str|complex|unit|flat)[^.,]*)/i)
    || text.match(/(\d+\s+[A-Za-z]+\s+(?:Street|Rd|Road|Ave|Avenue|Drive|Str))/i);
  if (addrMatch) customerAddress = addrMatch[1].trim();

  const lineItems: LineItem[] = [];
  let confidence = 0.5;

  const labourFlat = text.match(/(?:labour|labor)[^\d]*R?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/R\s*(\d+(?:\.\d+)?)\s*(?:labour|labor)/i);
  const labourHours = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:labour|labor)?[^\d]*R?\s*(\d+(?:\.\d+)?)?/);
  if (labourHours && labourHours[2]) {
    const hours = parseFloat(labourHours[1]);
    const unitPrice = parseFloat(labourHours[2]);
    lineItems.push({ id: randomUUID(), description: `Labour (${hours}h)`, quantity: hours, unitPrice, total: Math.round(hours * unitPrice * 100) / 100, type: "labour" });
    confidence += 0.15;
  } else if (labourFlat) {
    const price = parseFloat(labourFlat[1]);
    lineItems.push({ id: randomUUID(), description: "Labour", quantity: 1, unitPrice: price, total: price, type: "labour" });
    confidence += 0.15;
  }

  const calloutMatch = text.match(/(?:call[- ]?out|callout)[^\d]*R?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/R\s*(\d+(?:\.\d+)?)\s*(?:call[- ]?out|callout)/i);
  if (calloutMatch) {
    const price = parseFloat(calloutMatch[1]);
    lineItems.push({ id: randomUUID(), description: "Call-out", quantity: 1, unitPrice: price, total: price, type: "callout" });
    confidence += 0.1;
  }

  const partsMatch = text.match(/(?:parts?|materials?|spares?)[^\d]*R?\s*(\d+(?:\.\d+)?)/i);
  if (partsMatch) {
    const price = parseFloat(partsMatch[1]);
    lineItems.push({ id: randomUUID(), description: "Parts / materials", quantity: 1, unitPrice: price, total: price, type: "material" });
    confidence += 0.1;
  }

  const namedRe = /(?:new|replaced|installed)?\s*([A-Za-z][a-zA-Z0-9\s\-]{2,25}?)\s+R\s*(\d+(?:\.\d+)?)/gi;
  const seen = new Set(lineItems.map(li => li.description.toLowerCase()));
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(text)) !== null) {
    let desc = m[1].trim().replace(/^(new|replaced|installed)\s+/i, "").trim();
    const key = desc.toLowerCase();
    if (key.length < 3 || seen.has(key) || ["labour","labor","call","out","hour","parts","materials"].some(w => key.includes(w))) continue;
    seen.add(key);
    const price = parseFloat(m[2]);
    lineItems.push({ id: randomUUID(), description: desc.charAt(0).toUpperCase() + desc.slice(1), quantity: 1, unitPrice: price, total: price, type: "material" });
    confidence += 0.08;
  }

  let workDescription = text.slice(0, 140);
  if (lower.includes("geyser") || lower.includes("element")) workDescription = "Geyser / element work";
  else if (lower.includes("pipe") || lower.includes("leak") || lower.includes("plumbing") || lower.includes("kitchen")) workDescription = "Plumbing work";
  else if (lower.includes("db") || lower.includes("electrical")) workDescription = "Electrical work";

  const missingFields: string[] = [];
  if (!customerName) missingFields.push("customer_name");
  if (lineItems.length === 0) missingFields.push("line_items");
  if (lineItems.some(li => li.unitPrice === 0)) missingFields.push("prices");

  for (const item of lineItems) {
    if (item.unitPrice === 0) {
      const match = priceBook.find(p => item.description.toLowerCase().includes(p.key) || p.key.includes(item.description.toLowerCase().split(" ")[0]));
      if (match) {
        item.unitPrice = match.unitPrice;
        item.total = Math.round(item.quantity * match.unitPrice * 100) / 100;
        confidence += 0.05;
      }
    }
  }

  return {
    customerName, customerPhone, customerEmail, customerAddress, workDescription, lineItems,
    notes: text, confidence: Math.min(0.95, confidence), missingFields,
    rawAnalysis: `Extracted. Confidence ${Math.round(Math.min(0.95, confidence) * 100)}%. Missing: ${missingFields.join(", ") || "none"}.`,
  };
}
