import type { CapacitorConfig } from '@capacitor/cli';

// يحوّل واجهة الويب (مجلد dist الناتج عن vite build) إلى تطبيق أندرويد.
// تنبيه: appId هو معرّف التطبيق على الهاتف؛ تغييره لاحقاً يجعل الهاتف يعتبره تطبيقاً مختلفاً فلا يتحدّث فوق المثبّت.
const config: CapacitorConfig = {
  appId: 'com.supermarket.debtbook',
  appName: 'دفتر ديون السوبرماركت',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#0f766e', overlaysWebView: false },
  },
};

export default config;
