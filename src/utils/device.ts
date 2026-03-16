//fingerprint
export const getDeviceFingerprint = () => {
  const navigator_info = window.navigator.userAgent;
  const screen_info = `${window.screen.width}x${window.screen.height}`;
  // Cria uma hash simples em Base64
  return btoa(`${navigator_info}-${screen_info}`).substring(0, 32);
};
//fim finger print