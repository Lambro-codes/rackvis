/**
 * RackViz - Server Rack Visualization Library
 */

import { EventEmitter } from './EventEmitter.js';
import { ScaleManager } from './ScaleManager.js';
import { DiffEngine } from './DiffEngine.js';
import { Renderer } from '../components/Renderer.js';
import { TooltipManager } from '../components/TooltipManager.js';
import { InfoPanel } from '../components/InfoPanel.js';
import { defaultTheme } from '../themes/default.js';
import { deepMerge, generateId, isTouchDevice } from '../utils/helpers.js';

const DEFAULT_OPTIONS = {
  view: 'front',
  showViewToggle: true,
  showFullscreenToggle: true,
  showEmptySlots: true,
  unitNumbers: { show: true, position: 'left', direction: 'bottom-up' },
  showOppositeSide: 'ghost',
  tooltip: { enabled: true, trigger: 'hover', delay: 200, position: 'auto' },
  infoPanel: { enabled: true },
  layout: 'horizontal',
  rackSpacing: 16,
  labelFormat: 'label-first',
  animate: true,
  animationDuration: 200,
  diffUpdates: true
};

export class RackViz extends EventEmitter {
  constructor(container, options = {}) {
    super();
    
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('RackViz: Container not found');
    
    this.id = generateId('rv');
    this.options = deepMerge(DEFAULT_OPTIONS, options);
    if (isTouchDevice()) this.options.tooltip.trigger = 'click';
    
    this.theme = deepMerge(defaultTheme, options.theme || {});
    this.data = { racks: [] };
    this.currentView = this.options.view;
    this.isFullscreen = false;
    this.expandedChassis = new Set();
    this.highlights = new Set();
    
    this.scaleManager = new ScaleManager(this);
    this.diffEngine = new DiffEngine();
    this.renderer = new Renderer(this);
    this.tooltipManager = new TooltipManager(this);
    this.infoPanel = new InfoPanel(this);
    
    this._init();
  }
  
  _init() {
    this.container.classList.add('rv-container');
    this.container.setAttribute('data-rv-id', this.id);
    this._createStructure();
    this._injectStyles();
    this._setupResizeObserver();
    this._bindEvents();
    this.emit('init');
  }
  
  _createStructure() {
    this.root = document.createElement('div');
    this.root.className = 'rv-root';
    
    this.infoPanelEl = document.createElement('div');
    this.infoPanelEl.className = 'rv-info-panel';
    this.root.appendChild(this.infoPanelEl);
    
    this.viewport = document.createElement('div');
    this.viewport.className = 'rv-viewport';
    
    this.rackContainer = document.createElement('div');
    this.rackContainer.className = 'rv-racks';
    
    this.viewport.appendChild(this.rackContainer);
    this.root.appendChild(this.viewport);
    this.container.appendChild(this.root);
    
    this._createControls();
    
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'rv-tooltip';
    this.root.appendChild(this.tooltipEl);
  }
  
  _createControls() {
    this.controlsEl = document.createElement('div');
    this.controlsEl.className = 'rv-controls';
    
    if (this.options.showViewToggle) {
      this.viewToggleBtn = this._createBtn('Toggle View', () => this.toggleView());
      this.viewToggleBtn.innerHTML = this._getViewIcon();
      this.controlsEl.appendChild(this.viewToggleBtn);
    }
    if (this.options.showFullscreenToggle) {
      this.fullscreenBtn = this._createBtn('Fullscreen', () => this.toggleFullscreen());
      this.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
      this.controlsEl.appendChild(this.fullscreenBtn);
    }
    this.root.appendChild(this.controlsEl);
  }
  
  _createBtn(title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'rv-btn';
    btn.title = title;
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    return btn;
  }
  
  _getViewIcon() {
    return this.currentView === 'front'
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14h18V5H3zm16 12H5V7h14v10z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14h18V5H3zm16 12H5V7h14v10zm-2-9h-2v8h2V8z"/></svg>';
  }
  
  _injectStyles() {
    const styleId = 'rv-styles-' + this.id;
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = this._generateStyles();
    document.head.appendChild(style);
    this.styleEl = style;
  }
  
  _generateStyles() {
    const t = this.theme;
    const o = this.options;
    const id = this.id;
    
    return `
[data-rv-id="${id}"] {
  --rv-font: ${t.typography.fontFamily};
  --rv-font-mono: ${t.typography.fontMono};
  --rv-bg: ${t.colors.background};
  --rv-text: ${t.colors.text};
  --rv-text-muted: ${t.colors.textMuted};
  --rv-border: ${t.colors.border};
  --rv-accent: ${t.colors.accent};
  --rv-duration: ${o.animate ? o.animationDuration : 0}ms;
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--rv-bg);
  font-family: var(--rv-font);
  font-size: 12px;
  color: var(--rv-text);
  overflow: hidden;
}

[data-rv-id="${id}"] * { box-sizing: border-box; margin: 0; padding: 0; }

[data-rv-id="${id}"] .rv-root {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}

[data-rv-id="${id}"] .rv-viewport {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 8px;
}

[data-rv-id="${id}"] .rv-racks {
  display: flex;
  gap: ${o.rackSpacing}px;
  align-items: flex-start;
}

/* Controls */
[data-rv-id="${id}"] .rv-controls {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  z-index: 100;
}

[data-rv-id="${id}"] .rv-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--rv-border);
  border-radius: 4px;
  background: ${t.controls.background};
  color: var(--rv-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-rv-id="${id}"] .rv-btn:hover {
  background: ${t.controls.backgroundHover};
  border-color: var(--rv-accent);
}

[data-rv-id="${id}"] .rv-btn svg { width: 14px; height: 14px; }

/* Rack */
[data-rv-id="${id}"] .rv-rack {
  display: flex;
  flex-direction: column;
  background: ${t.rack.frame};
  border: 1px solid ${t.rack.border};
  border-radius: 3px;
  overflow: hidden;
}

[data-rv-id="${id}"] .rv-rack.rv-rack-highlighted {
  outline: 2px solid var(--rv-accent);
  outline-offset: 2px;
}

[data-rv-id="${id}"] .rv-rack-header {
  height: 32px;
  padding: 0 8px;
  background: ${t.rack.header};
  border-bottom: 1px solid var(--rv-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

[data-rv-id="${id}"] .rv-rack-header:hover { background: ${t.colors.backgroundSecondary}; }

[data-rv-id="${id}"] .rv-rack-label {
  font-weight: 600;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-rv-id="${id}"] .rv-rack-meta {
  font-size: 10px;
  color: var(--rv-text-muted);
  margin-left: 6px;
}

/* Rack Body - CSS Grid */
[data-rv-id="${id}"] .rv-rack-body {
  display: flex;
  flex-shrink: 0;
}

/* Rail - CSS Grid */
[data-rv-id="${id}"] .rv-rail {
  display: grid;
  background: ${t.rack.rail};
  width: 22px;
  flex-shrink: 0;
}

[data-rv-id="${id}"] .rv-rail-unit {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--rv-font-mono);
  font-size: 8px;
  color: ${t.rack.unitMarker};
  user-select: none;
  border-bottom: 1px solid ${t.rack.inner};
}

[data-rv-id="${id}"] .rv-rail-unit:last-child { border-bottom: none; }

[data-rv-id="${id}"] .rv-rail-unit.rv-rail-unit-highlight {
  color: ${t.rack.unitMarkerHighlight};
  font-weight: 600;
}

/* Rack Inner - CSS Grid */
[data-rv-id="${id}"] .rv-rack-inner {
  display: grid;
  flex: 1;
  background: ${t.rack.inner};
}

/* Slots */
[data-rv-id="${id}"] .rv-slot {
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

[data-rv-id="${id}"] .rv-slot:last-child { border-bottom: none; }

[data-rv-id="${id}"] .rv-slot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed ${t.rack.emptySlot};
  border-radius: 2px;
  margin: 1px 2px;
  opacity: 0.25;
}

[data-rv-id="${id}"] .rv-slot-empty:hover {
  opacity: 0.4;
  border-color: var(--rv-accent);
}

[data-rv-id="${id}"] .rv-slot-hidden { visibility: hidden; }

/* Device */
[data-rv-id="${id}"] .rv-device {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  padding: 0 8px;
  margin: 1px 2px;
  background: ${t.device.background};
  border: 1px solid ${t.device.border};
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
  min-height: 0;
}

[data-rv-id="${id}"] .rv-device:hover {
  background: ${t.device.backgroundHover};
  border-color: ${t.device.borderHover};
  z-index: 5;
}

[data-rv-id="${id}"] .rv-device.rv-device-highlighted,
[data-rv-id="${id}"] .rv-chassis.rv-device-highlighted {
  outline: 2px solid var(--rv-accent);
  outline-offset: -1px;
  z-index: 10;
}

[data-rv-id="${id}"] .rv-device.rv-device-ghost {
  opacity: 0.3;
  pointer-events: none;
}

/* Status */
[data-rv-id="${id}"] .rv-device-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

[data-rv-id="${id}"] .rv-device-status[data-status="online"] { background: ${t.status.online}; box-shadow: 0 0 4px ${t.status.online}; }
[data-rv-id="${id}"] .rv-device-status[data-status="offline"] { background: ${t.status.offline}; }
[data-rv-id="${id}"] .rv-device-status[data-status="idle"] { background: ${t.status.idle}; }
[data-rv-id="${id}"] .rv-device-status[data-status="warning"] { background: ${t.status.warning}; }
[data-rv-id="${id}"] .rv-device-status[data-status="critical"] { background: ${t.status.critical}; }
[data-rv-id="${id}"] .rv-device-status[data-status="maintenance"] { background: ${t.status.maintenance}; }
[data-rv-id="${id}"] .rv-device-status[data-status="provisioning"] { background: ${t.status.provisioning}; }
[data-rv-id="${id}"] .rv-device-status[data-status="decommissioned"],
[data-rv-id="${id}"] .rv-device-status[data-status="unknown"] { background: ${t.status.unknown}; }

/* Labels */
[data-rv-id="${id}"] .rv-device-label-container {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
}

[data-rv-id="${id}"] .rv-device-label {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-size: 10px;
  line-height: 1;
}

[data-rv-id="${id}"] .rv-device-name {
  font-weight: 500;
  cursor: pointer;
}

[data-rv-id="${id}"] .rv-device-name.rv-copied { color: var(--rv-accent); }

[data-rv-id="${id}"] .rv-device-separator {
  margin: 0 4px;
  color: var(--rv-text-muted);
  font-size: 4px;
  line-height: 1;
}

[data-rv-id="${id}"] .rv-device-type-inline {
  color: var(--rv-text-muted);
  font-size: 9px;
  text-transform: uppercase;
  line-height: 1;
}

[data-rv-id="${id}"] .rv-device-position-badge {
  font-size: 8px;
  color: var(--rv-text-muted);
  background: rgba(128,128,128,0.2);
  padding: 2px 4px;
  border-radius: 2px;
  margin-left: 6px;
  flex-shrink: 0;
  line-height: 1;
}

/* Label scroll */
[data-rv-id="${id}"] .rv-device-label.rv-label-scrolling {
  animation: rv-scroll-${id} 3s linear infinite;
}

@keyframes rv-scroll-${id} {
  0%, 15% { transform: translateX(0); }
  85%, 100% { transform: translateX(var(--scroll-distance, -50px)); }
}

/* Chassis */
[data-rv-id="${id}"] .rv-chassis {
  display: flex;
  flex-direction: column;
  margin: 1px 2px;
  background: ${t.device.background};
  border: 1px solid ${t.device.border};
  border-radius: 2px;
  overflow: hidden;
}

[data-rv-id="${id}"] .rv-chassis-header {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  background: rgba(128,128,128,0.05);
  cursor: pointer;
  flex-shrink: 0;
  min-height: 22px;
}

[data-rv-id="${id}"] .rv-chassis-header:hover { background: rgba(128,128,128,0.1); }

[data-rv-id="${id}"] .rv-chassis-toggle {
  width: 12px;
  height: 12px;
  margin-right: 4px;
  color: var(--rv-text-muted);
  transition: transform 0.15s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-rv-id="${id}"] .rv-chassis-toggle svg { width: 12px; height: 12px; }

[data-rv-id="${id}"] .rv-chassis.rv-chassis-expanded .rv-chassis-toggle {
  transform: rotate(90deg);
}

[data-rv-id="${id}"] .rv-chassis-body {
  display: none;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  gap: 3px;
  border-top: 1px solid var(--rv-border);
}

[data-rv-id="${id}"] .rv-chassis.rv-chassis-expanded .rv-chassis-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(55px, 1fr));
}

/* Blade */
[data-rv-id="${id}"] .rv-blade {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--rv-border);
  border-radius: 2px;
  cursor: pointer;
  min-height: 32px;
}

[data-rv-id="${id}"] .rv-blade:hover {
  background: rgba(128,128,128,0.15);
  border-color: var(--rv-accent);
}

[data-rv-id="${id}"] .rv-blade-slot {
  font-family: var(--rv-font-mono);
  font-size: 8px;
  color: var(--rv-text-muted);
}

[data-rv-id="${id}"] .rv-blade-label {
  font-size: 8px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

[data-rv-id="${id}"] .rv-blade-empty {
  opacity: 0.3;
  border-style: dashed;
}

/* Tooltip */
[data-rv-id="${id}"] .rv-tooltip {
  position: fixed;
  z-index: 10000;
  background: ${t.tooltip.background};
  border: 1px solid ${t.tooltip.border};
  border-radius: 4px;
  padding: 8px 10px;
  max-width: 280px;
  min-width: 140px;
  box-shadow: ${t.tooltip.shadow};
  pointer-events: none;
  opacity: 0;
  font-size: 11px;
}

[data-rv-id="${id}"] .rv-tooltip.rv-tooltip-visible { opacity: 1; }

[data-rv-id="${id}"] .rv-tooltip-title {
  font-weight: 600;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${t.tooltip.titleBorder};
}

[data-rv-id="${id}"] .rv-tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}

[data-rv-id="${id}"] .rv-tooltip-label { color: var(--rv-text-muted); }
[data-rv-id="${id}"] .rv-tooltip-value { font-family: var(--rv-font-mono); }

/* Info Panel (LEFT) */
[data-rv-id="${id}"] .rv-info-panel {
  width: 0;
  height: 100%;
  background: ${t.infoPanel.background};
  border-right: 1px solid var(--rv-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.15s ease;
  flex-shrink: 0;
}

[data-rv-id="${id}"] .rv-info-panel.rv-info-panel-open { width: 240px; }

[data-rv-id="${id}"] .rv-info-panel-header {
  padding: 12px;
  border-bottom: 1px solid var(--rv-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

[data-rv-id="${id}"] .rv-info-panel-title {
  font-weight: 600;
  font-size: 13px;
}

[data-rv-id="${id}"] .rv-info-panel-close {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--rv-text-muted);
  display: flex;
  border-radius: 2px;
}

[data-rv-id="${id}"] .rv-info-panel-close:hover {
  color: var(--rv-text);
  background: rgba(128,128,128,0.2);
}

[data-rv-id="${id}"] .rv-info-panel-close svg { width: 16px; height: 16px; }

[data-rv-id="${id}"] .rv-info-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

[data-rv-id="${id}"] .rv-info-section { margin-bottom: 16px; }

[data-rv-id="${id}"] .rv-info-section-title {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--rv-text-muted);
  margin-bottom: 6px;
  font-weight: 600;
}

[data-rv-id="${id}"] .rv-info-stat {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 11px;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

[data-rv-id="${id}"] .rv-info-stat:last-child { border-bottom: none; }
[data-rv-id="${id}"] .rv-info-stat-label { color: var(--rv-text-muted); }
[data-rv-id="${id}"] .rv-info-stat-value { font-family: var(--rv-font-mono); }

[data-rv-id="${id}"] .rv-info-device-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

[data-rv-id="${id}"] .rv-info-device-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  background: ${t.infoPanel.itemBackground};
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
}

[data-rv-id="${id}"] .rv-info-device-item:hover { background: ${t.infoPanel.itemBackgroundHover}; }

[data-rv-id="${id}"] .rv-info-device-slot {
  font-family: var(--rv-font-mono);
  font-size: 9px;
  color: var(--rv-text-muted);
  min-width: 28px;
}

[data-rv-id="${id}"] .rv-info-device-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-rv-id="${id}"] .rv-info-device-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* Fullscreen */
[data-rv-id="${id}"].rv-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 999999 !important;
}

/* Scrollbar */
[data-rv-id="${id}"] ::-webkit-scrollbar { width: 6px; height: 6px; }
[data-rv-id="${id}"] ::-webkit-scrollbar-track { background: transparent; }
[data-rv-id="${id}"] ::-webkit-scrollbar-thumb { background: ${t.scrollbar.thumb}; border-radius: 3px; }
[data-rv-id="${id}"] ::-webkit-scrollbar-thumb:hover { background: ${t.scrollbar.thumbHover}; }
    `;
  }
  
  _setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.scaleManager.update(entry.contentRect);
        if (this.data.racks.length > 0) {
          this.renderer.render();
        }
        this.emit('resize', entry.contentRect);
      }
    });
    this.resizeObserver.observe(this.container);
  }
  
  _bindEvents() {
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.emit('fullscreenChange', this.isFullscreen);
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.infoPanel.isOpen) this.infoPanel.close();
        this.tooltipManager.hide();
      }
    });
    
    document.addEventListener('click', (e) => {
      if (this.options.tooltip.trigger === 'click' && !e.target.closest('.rv-device, .rv-blade, .rv-tooltip, .rv-chassis-header')) {
        this.tooltipManager.hide();
      }
    });
  }
  
  // DATA
  load(data) {
    this.data = this._normalizeData(data);
    this.scaleManager.update();
    this.renderer.render();
    this.emit('load', this.data);
    return this;
  }
  
  update(data) {
    const newData = this._normalizeData(data);
    if (this.options.diffUpdates && this.data.racks.length > 0) {
      const changes = this.diffEngine.diff(this.data, newData);
      if (changes.requiresFullRender) {
        this.data = newData;
        this.renderer.render();
      } else {
        this.data = newData;
        this.renderer.applyChanges(changes);
      }
    } else {
      this.data = newData;
      this.renderer.render();
    }
    this.emit('update', this.data);
    return this;
  }
  
  _normalizeData(data) {
    if (data.rack && !data.racks) return { racks: [data.rack] };
    return { racks: data.racks || [] };
  }
  
  // RACKS
  addRack(rackData) {
    const rack = { ...rackData };
    if (!rack.id) rack.id = generateId('rack');
    if (!rack.devices) rack.devices = [];
    this.data.racks.push(rack);
    this.scaleManager.update();
    this.renderer.render();
    this.emit('rackAdded', rack);
    return this;
  }
  
  updateRack(rackId, rackData) {
    const rack = this.data.racks.find(r => r.id === rackId);
    if (!rack) return this;
    Object.assign(rack, rackData);
    this.renderer.render();
    this.emit('rackUpdated', rack);
    return this;
  }
  
  removeRack(rackId) {
    const index = this.data.racks.findIndex(r => r.id === rackId);
    if (index === -1) return this;
    const removed = this.data.racks.splice(index, 1)[0];
    this.scaleManager.update();
    this.renderer.render();
    this.emit('rackRemoved', rackId, removed);
    return this;
  }
  
  getRack(rackId) {
    return this.data.racks.find(r => r.id === rackId) || null;
  }
  
  // DEVICES
  addDevice(rackId, deviceData) {
    const rack = this.getRack(rackId);
    if (!rack) return this;
    const device = { ...deviceData };
    if (!device.id) device.id = generateId('dev');
    rack.devices.push(device);
    this.renderer.render();
    this.emit('deviceAdded', device, rackId);
    return this;
  }
  
  updateDevice(deviceId, deviceData) {
    const result = this._findDevice(deviceId);
    if (!result.device) return this;
    Object.assign(result.device, deviceData);
    if (deviceData.slot !== undefined || deviceData.height !== undefined || deviceData.position !== undefined) {
      this.renderer.render();
    } else {
      this.renderer.updateDevice(deviceId, deviceData);
    }
    this.emit('deviceUpdated', result.device, deviceData);
    return this;
  }
  
  removeDevice(deviceId) {
    const result = this._findDevice(deviceId);
    if (!result.device) return this;
    result.rack.devices.splice(result.index, 1);
    this.renderer.render();
    this.emit('deviceRemoved', deviceId, result.device);
    return this;
  }
  
  getDevice(deviceId) {
    return this._findDevice(deviceId).device || null;
  }
  
  _findDevice(deviceId) {
    for (const rack of this.data.racks) {
      const index = rack.devices.findIndex(d => d.id === deviceId);
      if (index !== -1) return { device: rack.devices[index], rack, index };
      for (const device of rack.devices) {
        if (device.chassis?.blades) {
          const bi = device.chassis.blades.findIndex(b => b.id === deviceId);
          if (bi !== -1) return { device: device.chassis.blades[bi], rack, index: bi, chassis: device };
        }
      }
    }
    return { device: null, rack: null, index: -1 };
  }
  
  // BLADES
  addBlade(chassisId, bladeData) {
    const result = this._findDevice(chassisId);
    if (!result.device?.chassis) return this;
    const blade = { ...bladeData };
    if (!blade.id) blade.id = generateId('blade');
    if (!result.device.chassis.blades) result.device.chassis.blades = [];
    result.device.chassis.blades.push(blade);
    this.renderer.render();
    this.emit('bladeAdded', blade, chassisId);
    return this;
  }
  
  removeBlade(bladeId) {
    for (const rack of this.data.racks) {
      for (const device of rack.devices) {
        if (device.chassis?.blades) {
          const index = device.chassis.blades.findIndex(b => b.id === bladeId);
          if (index !== -1) {
            const removed = device.chassis.blades.splice(index, 1)[0];
            this.renderer.render();
            this.emit('bladeRemoved', bladeId, removed);
            return this;
          }
        }
      }
    }
    return this;
  }
  
  expandChassis(chassisId) {
    this.expandedChassis.add(chassisId);
    this.renderer.expandChassis(chassisId);
    this.emit('chassisExpand', chassisId);
    return this;
  }
  
  collapseChassis(chassisId) {
    this.expandedChassis.delete(chassisId);
    this.renderer.collapseChassis(chassisId);
    this.emit('chassisCollapse', chassisId);
    return this;
  }
  
  toggleChassis(chassisId) {
    if (this.expandedChassis.has(chassisId)) this.collapseChassis(chassisId);
    else this.expandChassis(chassisId);
    return this;
  }
  
  // VIEW
  setView(view) {
    if (view !== 'front' && view !== 'rear') return this;
    if (view !== this.currentView) {
      this.currentView = view;
      if (this.viewToggleBtn) this.viewToggleBtn.innerHTML = this._getViewIcon();
      this.renderer.render();
      this.emit('viewChange', view);
    }
    return this;
  }
  
  toggleView() { return this.setView(this.currentView === 'front' ? 'rear' : 'front'); }
  getView() { return this.currentView; }
  
  // HIGHLIGHT
  highlight(deviceId) {
    this.highlights.add(deviceId);
    this.renderer.highlight(deviceId);
    const el = this.rackContainer.querySelector(`[data-device-id="${deviceId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return this;
  }
  
  highlightRack(rackId) {
    this.highlights.add(rackId);
    this.renderer.highlightRack(rackId);
    return this;
  }
  
  clearHighlight(id) {
    if (id) {
      this.highlights.delete(id);
      this.renderer.clearHighlight(id);
    } else {
      this.highlights.clear();
      this.renderer.clearAllHighlights();
    }
    return this;
  }
  
  // INFO PANEL
  openInfoPanel(rackId) { this.infoPanel.open(rackId); return this; }
  closeInfoPanel() { this.infoPanel.close(); return this; }
  toggleInfoPanel(rackId) { this.infoPanel.toggle(rackId); return this; }
  
  // FULLSCREEN
  enterFullscreen() {
    if (!this.isFullscreen && this.container.requestFullscreen) {
      this.container.requestFullscreen();
      this.container.classList.add('rv-fullscreen');
    }
    return this;
  }
  
  exitFullscreen() {
    if (this.isFullscreen && document.exitFullscreen) {
      document.exitFullscreen();
      this.container.classList.remove('rv-fullscreen');
    }
    return this;
  }
  
  toggleFullscreen() { return this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen(); }
  
  // THEME
  setTheme(theme) {
    this.theme = deepMerge(this.theme, theme);
    this.styleEl.textContent = this._generateStyles();
    this.renderer.render();
    this.emit('themeChange', this.theme);
    return this;
  }
  
  getTheme() { return this.theme; }
  
  // OPTIONS
  setOption(key, value) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let obj = this.options;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
    } else {
      this.options[key] = value;
    }
    this.renderer.render();
    return this;
  }
  
  // SEARCH
  search(query) {
    if (!query) { this.clearHighlight(); return this; }
    const q = query.toLowerCase();
    const matches = [];
    for (const rack of this.data.racks) {
      for (const device of rack.devices) {
        if ((device.label?.toLowerCase().includes(q)) || (device.id?.toLowerCase().includes(q)) || (device.type?.toLowerCase().includes(q))) {
          matches.push(device.id);
        }
      }
    }
    this.clearHighlight();
    matches.forEach(id => this.highlight(id));
    return this;
  }
  
  // LIFECYCLE
  render() {
    this.scaleManager.update();
    this.renderer.render();
    this.emit('render');
    return this;
  }
  
  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.tooltipManager) this.tooltipManager.destroy();
    if (this.styleEl) this.styleEl.remove();
    this.container.innerHTML = '';
    this.container.classList.remove('rv-container');
    this.container.removeAttribute('data-rv-id');
    this.emit('destroy');
    this.removeAllListeners();
  }
}

export default RackViz;