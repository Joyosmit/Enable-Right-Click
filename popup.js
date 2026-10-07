// popup.js
const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

(async () => {
  const { enabled = true } = await chrome.storage.sync.get({ enabled: true });
  toggle.checked = enabled;
  render(enabled);
})();

toggle.addEventListener('change', async () => {
  await chrome.storage.sync.set({ enabled: toggle.checked });
  render(toggle.checked);
  // Reload active tab so the content script takes / releases effect
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id).catch(() => {});
});

document.getElementById('reload').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id).catch(() => {});
  window.close();
});

function render(enabled) {
  status.textContent = enabled ? 'Enabled' : 'Disabled';
  status.className = 'status ' + (enabled ? 'on' : 'off');
}
