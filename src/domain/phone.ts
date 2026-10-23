/** Celular brasileiro em E.164 sem o "+": 55, DDD de dois dígitos e nove dígitos começando com 9. */
const BRAZILIAN_MOBILE = /^55([1-9]{2})(9\d{4})(\d{4})$/;

export function isBrazilianMobile(phone: string): boolean {
  return BRAZILIAN_MOBILE.test(phone);
}

/** "5511958877762" → "(11) 95887-7762" */
export function formatBrazilianMobile(phone: string): string {
  const match = BRAZILIAN_MOBILE.exec(phone);
  if (!match) {
    throw new RangeError(`Celular fora do formato 55DD9XXXXXXXX: ${phone}`);
  }
  const [, ddd, prefix, suffix] = match;
  return `(${ddd}) ${prefix}-${suffix}`;
}
