import { DeviceSession } from '../types';

const DEVICE_ID_KEY = 'supermarket_device_id_v1';

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || !id.trim()) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev_temp_' + Date.now();
  }
}

export function detectDeviceInfo(): {
  deviceType: 'MOBILE' | 'DESKTOP' | 'TABLET';
  browserInfo: string;
} {
  const ua = navigator.userAgent || '';
  let deviceType: 'MOBILE' | 'DESKTOP' | 'TABLET' = 'DESKTOP';

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'TABLET';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/i.test(ua)) {
    deviceType = 'MOBILE';
  }

  let browser = 'متصفح ويب';
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  }

  let os = 'جهاز غير معروف';
  if (/android/i.test(ua)) {
    os = 'أندرويد';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/windows/i.test(ua)) {
    os = 'ويندوز';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'لينكس';
  }

  const typeLabel = deviceType === 'MOBILE' ? 'هاتف' : deviceType === 'TABLET' ? 'تابلت' : 'كمبيوتر';

  return {
    deviceType,
    browserInfo: `${typeLabel} (${os} - ${browser})`,
  };
}

export function getInitialDeviceSessions(
  existingSessions: DeviceSession[] = [],
  currentSessionName: string = 'الجلسة 1',
  mainDeviceId?: string
): {
  sessions: DeviceSession[];
  currentDeviceId: string;
  isCurrentDeviceMain: boolean;
  activeMainDeviceId: string;
  effectiveSessionName: string;
} {
  const currentDeviceId = getOrCreateDeviceId();
  const info = detectDeviceInfo();
  const now = new Date().toISOString();

  let sessions = [...existingSessions];
  let activeMainId = mainDeviceId || (sessions.length > 0 ? sessions[0].id : currentDeviceId);

  // If no main device exists, current device becomes main
  if (!activeMainId) {
    activeMainId = currentDeviceId;
  }

  const existingIndex = sessions.findIndex((s) => s.id === currentDeviceId);
  let effectiveSessionName = currentSessionName;

  if (existingIndex >= 0) {
    const existing = sessions[existingIndex];
    // If the session in cloud already has a custom name assigned (e.g. "father" set by admin):
    if (existing.name && existing.name.trim()) {
      if (!currentSessionName || currentSessionName === 'الجلسة 1' || currentSessionName === existing.name) {
        effectiveSessionName = existing.name.trim();
      } else {
        effectiveSessionName = currentSessionName.trim();
      }
    } else {
      effectiveSessionName = currentSessionName || 'الجلسة 1';
    }

    sessions[existingIndex] = {
      ...existing,
      name: effectiveSessionName,
      browserInfo: info.browserInfo,
      deviceType: info.deviceType,
      lastActiveAt: now,
      isMainDevice: existing.id === activeMainId,
    };
  } else {
    // Add this device as a new session
    const isMain = sessions.length === 0 || activeMainId === currentDeviceId;
    if (isMain) {
      activeMainId = currentDeviceId;
    }
    effectiveSessionName =
      currentSessionName && currentSessionName !== 'الجلسة 1'
        ? currentSessionName
        : isMain
        ? 'الجلسة 1 (الرئيسية)'
        : `جلسة ${sessions.length + 1}`;

    const newSession: DeviceSession = {
      id: currentDeviceId,
      name: effectiveSessionName,
      deviceType: info.deviceType,
      browserInfo: info.browserInfo,
      isMainDevice: isMain,
      createdAt: now,
      lastActiveAt: now,
    };
    sessions.push(newSession);
  }

  // Ensure only one device has isMainDevice = true
  sessions = sessions.map((s) => ({
    ...s,
    isMainDevice: s.id === activeMainId,
  }));

  const isCurrentDeviceMain = activeMainId === currentDeviceId;

  return {
    sessions,
    currentDeviceId,
    isCurrentDeviceMain,
    activeMainDeviceId: activeMainId,
    effectiveSessionName,
  };
}
