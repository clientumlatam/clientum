/** Normaliza números de teléfono argentinos al formato 549XXXXXXXXXX */
export function normalizeArgPhone(raw: string): string {
  let n = raw.replace(/\D/g, "");
  // 54911XXXXXXXX → 5491XXXXXXXXX (WhatsApp a veces agrega "9" extra para cel)
  if (n.startsWith("5491") && n.length === 13) return n;
  // 549XXXXXXXXXX (ya normalizado)
  if (n.startsWith("549") && n.length === 13) return n;
  // 54XXXXXXXXXX (sin el 9 de celular) → 549XXXXXXXXXX
  if (n.startsWith("54") && n.length === 12) return "549" + n.slice(3);
  // XXXXXXXXXX (10 dígitos, sin código de país) → 549XXXXXXXXXX
  if (n.length === 10) return "549" + n;
  // XXXXXXXXXXX (11 dígitos empezando con 0) → 549XXXXXXXXXX
  if (n.length === 11 && n.startsWith("0")) return "549" + n.slice(1);
  return n;
}
