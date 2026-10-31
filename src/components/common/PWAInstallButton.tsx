import React from 'react';

export interface PWAInstallButtonProps {
  compact?: boolean;
}

/**
 * SmartClinic V2 operates as a responsive standard web application.
 * Install App / PWA installation prompts are intentionally disabled while
 * retaining push-sw.js strictly for authenticated Web Push notifications.
 */
export const PWAInstallButton: React.FC<PWAInstallButtonProps> = () => {
  return null;
};
