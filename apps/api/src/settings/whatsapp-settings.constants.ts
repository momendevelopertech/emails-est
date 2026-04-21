export const DEFAULT_WHATSAPP_SETTINGS_ID = 'default';

export const DEFAULT_GREEN_API_SETTINGS = {
  api_url: 'https://7107.api.greenapi.com',
  media_url: 'https://7107.api.greenapi.com',
  id_instance: '7107593651',
  api_token_instance: '6c279870ca0142488ac9a22dfd67c7181049cc9ef2764f729d',
} as const;

export const GREEN_API_TEST_PHONE = '+201145495393';
export const GREEN_API_TEST_CHAT_ID = '201145495393@c.us';

export const buildGreenApiTestMessage = () =>
  `EST Green API test message sent at ${new Date().toISOString()}`;
