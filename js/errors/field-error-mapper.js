const FIELD_RULES = Object.freeze([
  { field: 'recipientPhone', match: /recipientPhone|phone number/i, message: 'Enter a valid Sri Lankan mobile number, for example 077 123 4567.' },
  { field: 'weightKg', match: /weightKg/i, message: 'Enter a weight greater than 0 kg.' },
  { field: 'originHubId', match: /originHubId/i, message: 'Choose an origin hub.' },
  { field: 'destinationHubId', match: /destinationHubId/i, message: 'Choose a destination hub.' },
  { field: 'pickupAddress.line1', match: /pickupAddress(?:\.|\s).*line1|pickupAddress\.line1/i, message: 'Enter the pickup address.' },
  { field: 'pickupAddress.locality', match: /pickupAddress(?:\.|\s).*locality|pickupAddress\.locality/i, message: 'Enter the pickup city or locality.' },
  { field: 'deliveryAddress.line1', match: /deliveryAddress(?:\.|\s).*line1|deliveryAddress\.line1/i, message: 'Enter the delivery address.' },
  { field: 'deliveryAddress.locality', match: /deliveryAddress(?:\.|\s).*locality|deliveryAddress\.locality/i, message: 'Enter the destination city or locality.' },
  { field: 'recipientName', match: /recipientName/i, message: 'Enter the recipient name.' },
  { field: 'codAmount', match: /codAmount/i, message: 'Enter a valid cash-on-delivery amount.' },
]);

function mapDetail(detail) {
  if (detail && typeof detail === 'object' && typeof detail.field === 'string') {
    const rule = FIELD_RULES.find(item => item.field === detail.field);
    return rule ? { field: rule.field, message: rule.message } : null;
  }
  const value = String(detail ?? '');
  const rule = FIELD_RULES.find(item => item.match.test(value));
  return rule ? { field: rule.field, message: rule.message } : null;
}

export function mapFieldErrors(details) {
  const mapped = {};
  for (const detail of Array.isArray(details) ? details : []) {
    const match = mapDetail(detail);
    if (match && !mapped[match.field]) mapped[match.field] = match.message;
  }
  return mapped;
}

export const FIELD_ERROR_RULES = FIELD_RULES;
