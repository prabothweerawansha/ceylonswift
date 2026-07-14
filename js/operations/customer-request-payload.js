const trimmed = value => String(value ?? '').trim();
const optionalText = value => {
  const normalized = trimmed(value);
  return normalized || undefined;
};
const numberValue = value => {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
};
const SRI_LANKAN_MOBILE = /^(?:70|71|72|74|75|76|77|78)\d{7}$/;

export class CustomerRequestPayloadError extends Error {
  constructor(fieldErrors) {
    super('Some booking details are invalid.');
    this.name = 'CustomerRequestPayloadError';
    this.code = 'REQUEST_INVALID';
    this.status = 400;
    this.fieldErrors = fieldErrors;
  }
}

export function normalizeSriLankanMobile(value) {
  const compact = trimmed(value).replace(/[\s()-]/g, '');
  if (!compact) return undefined;
  if (!/^\+?\d+$/.test(compact)) throw new CustomerRequestPayloadError({ recipientPhone: 'Enter a valid Sri Lankan mobile number, for example 077 123 4567.' });
  let national = compact;
  if (national.startsWith('+94')) national = national.slice(3);
  else if (national.startsWith('94')) national = national.slice(2);
  else if (national.startsWith('0')) national = national.slice(1);
  if (!SRI_LANKAN_MOBILE.test(national)) throw new CustomerRequestPayloadError({ recipientPhone: 'Enter a valid Sri Lankan mobile number, for example 077 123 4567.' });
  return `+94${national}`;
}
const addressPayload = (address, type) => ({
  type,
  line1: trimmed(address?.line1),
  locality: trimmed(address?.locality),
  countryCode: (optionalText(address?.countryCode) || 'LK').toUpperCase(),
  ...(optionalText(address?.line2) ? { line2: optionalText(address.line2) } : {}),
  ...(optionalText(address?.district) ? { district: optionalText(address.district) } : {}),
  ...(optionalText(address?.postalCode) ? { postalCode: optionalText(address.postalCode) } : {}),
});

export function mapCustomerRequestCreatePayload(input = {}) {
  const paymentMode = trimmed(input.paymentMode).toUpperCase() === 'COD' ? 'COD' : 'PREPAID';
  const recipientPhone = normalizeSriLankanMobile(input.recipientPhone);
  const codAmount = numberValue(input.codAmount);
  return {
    recipientName: trimmed(input.recipientName),
    ...(recipientPhone ? { recipientPhone } : {}),
    weightKg: numberValue(input.weightKg),
    serviceLevel: (optionalText(input.serviceLevel) || 'EXPRESS').toUpperCase(),
    paymentMode,
    ...(paymentMode === 'COD' && codAmount !== undefined ? { codAmount } : {}),
    originHubId: trimmed(input.originHubId),
    destinationHubId: trimmed(input.destinationHubId),
    pickupAddress: addressPayload(input.pickupAddress, 'PICKUP'),
    deliveryAddress: addressPayload(input.deliveryAddress, 'DELIVERY'),
  };
}
