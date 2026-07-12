export const POS_PROVIDERS = [
  { id: 'CLOVER', name: 'Clover', access: 'PUBLIC_OAUTH', supportsWebhooks: true },
  { id: 'TOAST', name: 'Toast', access: 'PARTNER_APPROVAL', supportsWebhooks: true },
  { id: 'SQUARE', name: 'Square for Restaurants', access: 'PUBLIC_OAUTH', supportsWebhooks: true },
  { id: 'ORACLE_SIMPHONY', name: 'Oracle MICROS / Simphony', access: 'ENTERPRISE_CREDENTIALS', supportsWebhooks: false },
  { id: 'NCR_ALOHA', name: 'NCR Voyix Aloha', access: 'PARTNER_OR_CUSTOMER', supportsWebhooks: false },
  { id: 'SPOTON', name: 'SpotOn Restaurant', access: 'API_KEY_APPROVAL', supportsWebhooks: false },
  { id: 'TOUCHBISTRO', name: 'TouchBistro', access: 'PARTNER_APPROVAL', supportsWebhooks: false },
  { id: 'LIGHTSPEED', name: 'Lightspeed Restaurant', access: 'PARTNER_APPROVAL', supportsWebhooks: true },
  { id: 'PAR_BRINK', name: 'PAR Brink POS', access: 'PARTNER_APPROVAL', supportsWebhooks: true },
  { id: 'SHIFT4_REVEL', name: 'Shift4 SkyTab / Revel', access: 'CUSTOMER_OR_PARTNER', supportsWebhooks: true }
] as const;

export type PosProviderId = typeof POS_PROVIDERS[number]['id'];

export function getPosProvider(id: string) {
  return POS_PROVIDERS.find((provider) => provider.id === id);
}

export function providerCredentialFields(id: string) {
  if (id === 'CLOVER' || id === 'SQUARE' || id === 'LIGHTSPEED') return ['clientId', 'clientSecret'];
  if (id === 'SPOTON') return ['apiKey', 'locationId'];
  if (id === 'ORACLE_SIMPHONY') return ['baseUrl', 'clientId', 'clientSecret', 'organizationId'];
  if (id === 'NCR_ALOHA') return ['baseUrl', 'clientId', 'clientSecret'];
  return ['apiKey', 'merchantId'];
}
