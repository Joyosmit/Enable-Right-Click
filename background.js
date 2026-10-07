// background.js — keeps the action badge in sync + re-injects on toggle.
chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  if (enabled === undefined) await chrome.storage.sync.set({ enabled: true });
  updateBadge(enabled !== false);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) updateBadge(changes.enabled.newValue);
});

async function updateBadge(enabled) {
  try {
    await chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
    if (!enabled) await chrome.action.setBadgeBackgroundColor({ color: '#c0392b' });
  } catch {}
}

// Keyboard / programmatic toggle support
chrome.commands && chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === 'toggle-enable') {
    const { enabled = true } = await chrome.storage.sync.get({ enabled: true });
    await chrome.storage.sync.set({ enabled: !enabled });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.reload(tab.id).catch(() => {});
  }
});
