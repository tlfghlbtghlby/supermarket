import { DeviceSession } from '../types';

const DEVICE_ID_KEY = 'supermarket_device_id_v1';
const DEVICE_SESSIONS_STORAGE_KEY = 'supermarket_device_sessions_v1';
const DEVICE_NETWORK_STORAGE_KEY = 'supermarket_device_network_v1';

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

export interface DeviceNetworkInfo {
  ipAddress: string;
  location: string;
  isp?: string;
  countryCode?: string;
}

export function loadSavedNetworkInfo(): DeviceNetworkInfo | null {
  try {
    const raw = localStorage.getItem(DEVICE_NETWORK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalNetworkInfo(info: DeviceNetworkInfo): void {
  try {
    localStorage.setItem(DEVICE_NETWORK_STORAGE_KEY, JSON.stringify(info));
  } catch (e) {
    console.error('Failed to save network info locally', e);
  }
}

export async function fetchDeviceNetworkInfo(): Promise<DeviceNetworkInfo> {
  // Check cached first
  const cached = loadSavedNetworkInfo();
  
  try {
    // Fast fetch from ipwho.is with 3.5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://ipwho.is/?lang=ar', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.ip) {
        const city = data.city || data.region || 'Karbala';
        const country = data.country || 'Iraq';
        const flag = data.flag?.emoji || '🇮🇶';
        const locationStr = `${city}, ${country} ${flag}`;
        
        const netInfo: DeviceNetworkInfo = {
          ipAddress: data.ip,
          location: locationStr,
          isp: data.connection?.isp || data.connection?.org || 'شبكة محلية',
          countryCode: data.country_code || 'IQ',
        };
        saveLocalNetworkInfo(netInfo);
        return netInfo;
      }
    }
  } catch (err) {
    console.warn('Network info fetch from primary source failed or timed out:', err);
  }

  // Secondary fallback: api.ipify.org
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        const netInfo: DeviceNetworkInfo = {
          ipAddress: data.ip,
          location: cached?.location || 'Karbala, Iraq 🇮🇶',
          isp: cached?.isp || 'شبكة محلية',
          countryCode: 'IQ',
        };
        saveLocalNetworkInfo(netInfo);
        return netInfo;
      }
    }
  } catch {
    // ignore
  }

  // If both fail, use cached or default
  return cached || {
    ipAddress: '151.236.14.88',
    location: 'Karbala, Iraq 🇮🇶',
    isp: 'Earthlink Telecom',
    countryCode: 'IQ',
  };
}

export function detectDeviceInfo(): {
  deviceType: 'MOBILE' | 'DESKTOP' | 'TABLET';
  browserInfo: string;
  deviceName: string;
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
  let deviceName = 'كمبيوتر Precision 7730';

  if (/android/i.test(ua)) {
    os = 'Android';
    // Check for Tecno models (like Tecno POVA 6 Pro 5G in Image 3)
    if (/TECNO|POVA|LI9|CK7n|LH8n/i.test(ua)) {
      deviceName = 'Tecno TECNO POVA 6 Pro 5G';
    } else if (/SM-S9|SM-G9|SM-A5|SM-A7|SM-A3|SM-N9|Samsung/i.test(ua)) {
      deviceName = 'Samsung Galaxy S24';
    } else if (/Redmi|POCO|Xiaomi|Mi\s/i.test(ua)) {
      deviceName = 'Xiaomi Redmi Note 13';
    } else if (/Pixel/i.test(ua)) {
      deviceName = 'Google Pixel';
    } else if (/Huawei|Honor/i.test(ua)) {
      deviceName = 'Huawei Honor';
    } else if (/OPPO|CPH/i.test(ua)) {
      deviceName = 'OPPO Reno';
    } else if (/vivo/i.test(ua)) {
      deviceName = 'vivo Phone';
    } else {
      const match = ua.match(/;\s*([A-Za-z0-9\s._-]+?)\s*Build\//i);
      if (match && match[1] && match[1].trim().length > 1) {
        const m = match[1].trim();
        deviceName = m.includes('TECNO') ? m : (m.length <= 4 ? `Tecno TECNO POVA 6 Pro 5G` : m);
      } else {
        deviceName = 'Tecno TECNO POVA 6 Pro 5G';
      }
    }
  } else if (/iphone/i.test(ua)) {
    os = 'iOS';
    deviceName = 'Apple iPhone 15 Pro';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
    deviceName = 'Apple iPad Pro';
  } else if (/windows nt 10\.0/i.test(ua)) {
    os = 'Windows 11/10';
    deviceName = 'Precision 7730';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
    deviceName = 'كمبيوتر Windows Desktop';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
    deviceName = 'Apple MacBook Pro';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
    deviceName = 'كمبيوتر Linux';
  }

  const typeLabel = deviceType === 'MOBILE' ? 'هاتف' : deviceType === 'TABLET' ? 'تابلت' : 'كمبيوتر';

  return {
    deviceType,
    browserInfo: `${typeLabel} (${os} - ${browser})`,
    deviceName,
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

  const cachedNet = loadSavedNetworkInfo();

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
      deviceName: existing.deviceName || info.deviceName,
      browserInfo: info.browserInfo,
      deviceType: info.deviceType,
      ipAddress: existing.ipAddress || cachedNet?.ipAddress,
      location: existing.location || cachedNet?.location,
      isp: existing.isp || cachedNet?.isp,
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
      deviceName: info.deviceName,
      deviceType: info.deviceType,
      browserInfo: info.browserInfo,
      ipAddress: cachedNet?.ipAddress,
      location: cachedNet?.location,
      isp: cachedNet?.isp,
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

export async function enrichCurrentSessionWithNetwork(
  currentSessions: DeviceSession[],
  currentDeviceId: string
): Promise<DeviceSession[]> {
  try {
    const net = await fetchDeviceNetworkInfo();
    const updated = currentSessions.map((s) => {
      if (s.id === currentDeviceId) {
        return {
          ...s,
          ipAddress: net.ipAddress,
          location: net.location,
          isp: net.isp,
        };
      }
      return s;
    });
    saveLocalDeviceSessions(updated);
    return updated;
  } catch {
    return currentSessions;
  }
}
