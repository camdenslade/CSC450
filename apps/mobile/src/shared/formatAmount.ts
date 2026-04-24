// Formats raw digit input into a dollar amount as the user types.
// "1994" → "19.94", "5" → "0.05", "1000" → "10.00"
export function formatAmountInput(prev: string, next: string): string {
  const digits = next.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toFixed(2);
}
