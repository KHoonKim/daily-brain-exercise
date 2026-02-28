import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'everyday-brain-training',
  brand: {
    displayName: '매일매일 두뇌운동',
    primaryColor: '#3182F6',
    icon: 'https://littlesunnydays.com/appintos/brain-fit/icon.png', // TODO: 실제 아이콘 URL 확인
  },
  web: {
    host: '192.168.45.77', // Mac 로컬 IP (ipconfig getifaddr en0 으로 확인)
    port: 3000,
    commands: {
      dev: 'vite --host',
      build: 'vite build && cp -r src dist/',
    },
  },
  webViewProps: {},
  permissions: [],
});
