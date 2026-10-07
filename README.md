# Right Click Enabler — Copy, Paste & Select

Unlocks right-click, copy, paste, cut, text selection and drag on websites that disable them.

## How it works
- **`content.js`** (isolated world, runs at `document_start`):
  strips inline `oncontextmenu="return false"` / `oncopy` / `onpaste` handlers,
  forces `user-select: text !important`, and re-fires clean `contextmenu/copy/cut/paste` events in capture phase.
- **`injected.js`** (page MAIN world): intercepts `addEventListener` for
  `contextmenu/copy/cut/paste/selectstart/dragstart` and neutralizes the site's
  `preventDefault()` / `stopPropagation()` calls + `oncontextmenu = ...` assignments.

## Install (Chrome / Edge / Brave)
1. Go to `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select this folder (`right_click_enable`)
3. Browse any copy-protected site → right-click works. Toggle via the toolbar popup.

## Files
| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest |
| `content.js` | Isolated-world unlocker + CSS fix + MutationObserver |
| `injected.js` | MAIN-world `addEventListener` interceptor |
| `background.js` | Badge + install defaults |
| `popup.html` / `popup.js` | Enable/disable toggle UI |
