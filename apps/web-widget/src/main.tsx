import { mountMetaChatWidget } from './loader';

declare global {
  interface Window {
    __META_CHAT_ROOT__?: ReturnType<typeof mountMetaChatWidget> extends Promise<infer R> ? R : never;
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.__META_CHAT_ROOT__ = undefined;
  });
}

async function init() {
  try {
    window.__META_CHAT_ROOT__ = await mountMetaChatWidget();
  } catch (error) {
    console.error('[MetaChat] Unable to initialize preview', error);
  }
}

init();
