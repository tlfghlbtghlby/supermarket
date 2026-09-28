import { DeviceSession } from '../types';

const DEVICE_ID_KEY = 'supermarket_device_id_v1';
const DEVICE_SESSIONS_STORAGE_KEY = 'supermarket_device_sessions_v1';

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

export function loadSavedDeviceSessions(): DeviceSession[] {
  try {
    const raw = localStorage.getItem(DEVICE_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalDeviceSessions(sessions: DeviceSession[]): void {
  try {
    localStorage.setItem(DEVICE_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save device sessions locally', e);
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

  // Merge with locally stored device sessions so custom renames are NEVER lost or reverted
  const localSaved = loadSavedDeviceSessions();
  const sessionMap = new Map<string, DeviceSession>();

  // 1. First add cloud/existing sessions
  existingSessions.forEach((s) => {
    if (s && s.id) {
      sessionMap.set(s.id, { ...s });
    }
  });

  // 2. Overlay locally saved sessions to guarantee renames made on this device are strictly preserved
  localSaved.forEach((s) => {
    if (s && s.id) {
      const existing = sessionMap.get(s.id);
      if (existing) {
        const localTime = new Date(s.lastActiveAt || 0).getTime();
        const existingTime = new Date(existing.lastActiveAt || 0).getTime();
        // If local has a valid name and is newer or equal, or if existing has no name, prefer local
        if (s.name && s.name.trim() && (localTime >= existingTime || !existing.name)) {
          sessionMap.set(s.id, {
            ...existing,
            name: s.name.trim(),
            lastActiveAt: s.lastActiveAt || existing.lastActiveAt,
          });
        }
      } else {
        sessionMap.set(s.id, { ...s });
      }
    }
  });

  let sessions = Array.from(sessionMap.values());
  let activeMainId = mainDeviceId || (sessions.length > 0 ? sessions[0].id : currentDeviceId);

  // If no main device exists, current device becomes main
  if (!activeMainId) {
    activeMainId = currentDeviceId;
  }

  const existingIndex = sessions.findIndex((s) => s.id === currentDeviceId);
  let effectiveSessionName = currentSessionName;

  if (existingIndex >= 0) {
    const existing = sessions[existingIndex];
    // Master Source of Truth: Keep assigned name
    if (existing.name && existing.name.trim()) {
      effectiveSessionName = existing.name.trim();
    } else if (currentSessionName && currentSessionName.trim()) {
      effectiveSessionName = currentSessionName.trim();
    } else {
      effectiveSessionName = existing.isMainDevice ? 'الجلسة 1 (الرئيسية)' : 'الجلسة 1';
    }

    sessions[existingIndex] = {
      ...existing,
      name: effectiveSessionName,
      browserInfo: info.browserInfo,
      deviceType: info.deviceType,
      lastActiveAt: now,
      isMainDevice: existing.id === activeMainId,
      isTerminated: Boolean(existing.isTerminated),
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
      isTerminated: false,
    };
    sessions.push(newSession);
  }

  // Ensure only one device has isMainDevice = true, and all sessions have clean boolean fields
  sessions = sessions.map((s) => ({
    ...s,
    name: s.name ? s.name.trim() : (s.id === activeMainId ? 'الجلسة 1 (الرئيسية)' : 'جلسة'),
    isMainDevice: s.id === activeMainId,
    isTerminated: Boolean(s.isTerminated),
  }));

  // Cache updated sessions in local storage
  saveLocalDeviceSessions(sessions);

  const isCurrentDeviceMain = activeMainId === currentDeviceId;

  return {
    sessions,
    currentDeviceId,
    isCurrentDeviceMain,
    activeMainDeviceId: activeMainId,
    effectiveSessionName,
  };
}
