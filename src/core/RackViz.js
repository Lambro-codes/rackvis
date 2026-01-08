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
  showInfoPanel: true,
  showEmptySlots: true,
  unitNumbers: { show: true, position: 'left', direction: 'bottom-up' },
  showOppositeSide: 'ghost',
  tooltip: { enabled: true, trigger: 'hover', delay: 200, position: 'auto' },
  layout: 'horizontal',
  rackSpacing: 24,
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
    
    this.infoPanelEl = document.createElement('div');
    this.infoPanelEl.className = 'rv-info-panel';
    this.root.appendChild(this.infoPanelEl);
  }
  
  _createControls() {
    this.controlsEl = document.createElement('div');
    this.controlsEl.className = 'rv-controls';
    
    if (this.options.showViewToggle) {
      this.viewToggleBtn = this._createBtn('Toggle View', () => this.toggleView());
      this.viewToggleBtn.innerHTML = this._getViewIcon();
      this.controlsEl.appendChild(this.viewToggleBtn);
    }
    if (this.options.showInfoPanel) {
      this.infoPanelBtn = this._createBtn('Rack Info', () => this.toggleInfoPanel());
      this.infoPanelBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
      this.controlsEl.appendChild(this.infoPanelBtn);
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
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14h18V5H3zm16 12H5V7h14v10zm-7-5h3v3h-3v-3zm0-4h3v3h-3V8zm-4 4h3v3H8v-3zm0-4h3v3H8V8z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14h18V5H3zm16 12H5V7h14v10zm-2-9h-2v2h2V8zm0 3h-2v2h2v-2zm0 3h-2v2h2v-2z"/></svg>';
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
  --rv-font-size: ${t.typography.fontSize}px;
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
  font-size: var(--rv-font-size);
  color: var(--rv-text);
  overflow: hidden;
}

[data-rv-id="${id}"] *, [data-rv-id="${id}"] *::before, [data-rv-id="${id}"] *::after {
  box-sizing: border-box;
}

[data-rv-id="${id}"] .rv-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

[data-rv-id="${id}"] .rv-viewport {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

[data-rv-id="${id}"] .rv-racks {
  display: flex;
  gap: ${o.rackSpacing}px;
  flex-direction: ${o.layout === 'vertical' ? 'column' : 'row'};
  align-items: flex-start;
}

[data-rv-id="${id}"] .rv-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 100;
}

[data-rv-id="${id}"] .rv-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--rv-border);
  border-radius: ${t.controls.borderRadius}px;
  background: ${t.controls.background};
  color: var(--rv-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-btn:hover {
  background: ${t.controls.backgroundHover};
  border-color: var(--rv-accent);
}

[data-rv-id="${id}"] .rv-btn svg {
  width: 18px;
  height: 18px;
}

[data-rv-id="${id}"] .rv-rack {
  display: flex;
  flex-direction: column;
  background: ${t.rack.frame};
  border: 1px solid ${t.rack.border};
  border-radius: ${t.rack.borderRadius}px;
  box-shadow: ${t.rack.shadow};
  overflow: hidden;
  transition: box-shadow var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-rack:hover {
  box-shadow: ${t.rack.shadowHover};
}

[data-rv-id="${id}"] .rv-rack.rv-rack-highlighted {
  outline: 2px solid var(--rv-accent);
  outline-offset: 2px;
}

[data-rv-id="${id}"] .rv-rack-header {
  padding: 10px 12px;
  background: ${t.rack.header};
  border-bottom: 1px solid var(--rv-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

[data-rv-id="${id}"] .rv-rack-label {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-rv-id="${id}"] .rv-rack-meta {
  font-size: 11px;
  color: var(--rv-text-muted);
}

[data-rv-id="${id}"] .rv-rack-body {
  display: flex;
  flex-direction: row;
}

[data-rv-id="${id}"] .rv-rail {
  background: ${t.rack.rail};
  display: flex;
  flex-direction: column;
  padding: 2px 0;
  min-width: 28px;
}

[data-rv-id="${id}"] .rv-rail-unit {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--rv-font-mono);
  font-size: 9px;
  color: ${t.rack.unitMarker};
  user-select: none;
}

[data-rv-id="${id}"] .rv-rail-unit.rv-rail-unit-highlight {
  color: ${t.rack.unitMarkerHighlight};
  font-weight: 600;
}

[data-rv-id="${id}"] .rv-rack-inner {
  flex: 1;
  background: ${t.rack.inner};
  display: flex;
  flex-direction: column;
  padding: 2px;
  gap: 1px;
}

[data-rv-id="${id}"] .rv-slot {
  position: relative;
  display: flex;
}

[data-rv-id="${id}"] .rv-slot-empty {
  flex: 1;
  border: 1px dashed ${t.rack.emptySlot};
  border-radius: 2px;
  opacity: 0.4;
  transition: opacity var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-slot-empty:hover {
  opacity: 0.6;
  border-color: var(--rv-accent);
}

[data-rv-id="${id}"] .rv-device {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 10px;
  background: ${t.device.background};
  border: ${t.device.borderWidth}px ${t.device.borderStyle} ${t.device.border};
  border-radius: ${t.device.borderRadius}px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-device:hover {
  background: ${t.device.backgroundHover};
  border-color: ${t.device.borderHover};
  box-shadow: ${t.device.shadowHover};
  z-index: 10;
}

[data-rv-id="${id}"] .rv-device.rv-device-highlighted {
  outline: 2px solid var(--rv-accent);
  outline-offset: 1px;
  animation: rv-pulse-${id} 1s ease-in-out infinite;
}

@keyframes rv-pulse-${id} {
  0%, 100% { outline-color: var(--rv-accent); }
  50% { outline-color: transparent; }
}

[data-rv-id="${id}"] .rv-device.rv-device-ghost {
  opacity: 0.35;
  pointer-events: none;
}

[data-rv-id="${id}"] .rv-device-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

[data-rv-id="${id}"] .rv-device-status[data-status="online"] {
  background: ${t.status.online};
  box-shadow: 0 0 6px ${t.status.online};
}

[data-rv-id="${id}"] .rv-device-status[data-status="offline"] {
  background: ${t.status.offline};
}

[data-rv-id="${id}"] .rv-device-status[data-status="idle"] {
  background: ${t.status.idle};
}

[data-rv-id="${id}"] .rv-device-status[data-status="warning"] {
  background: ${t.status.warning};
  animation: rv-blink-${id} 1s infinite;
}

[data-rv-id="${id}"] .rv-device-status[data-status="critical"] {
  background: ${t.status.critical};
  animation: rv-blink-${id} 0.5s infinite;
}

[data-rv-id="${id}"] .rv-device-status[data-status="maintenance"] {
  background: ${t.status.maintenance};
}

[data-rv-id="${id}"] .rv-device-status[data-status="provisioning"] {
  background: ${t.status.provisioning};
  animation: rv-blink-${id} 1.5s infinite;
}

[data-rv-id="${id}"] .rv-device-status[data-status="decommissioned"],
[data-rv-id="${id}"] .rv-device-status[data-status="unknown"] {
  background: ${t.status.unknown};
}

@keyframes rv-blink-${id} {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

[data-rv-id="${id}"] .rv-device-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
}

[data-rv-id="${id}"] .rv-device-label {
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

[data-rv-id="${id}"] .rv-device-type {
  font-size: 10px;
  color: var(--rv-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.2;
}

[data-rv-id="${id}"] .rv-device-position-badge {
  font-size: 9px;
  color: var(--rv-text-muted);
  background: rgba(255,255,255,0.1);
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: 8px;
}

[data-rv-id="${id}"] .rv-chassis {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${t.device.background};
  border: 2px solid ${t.device.border};
  border-radius: ${t.device.borderRadius}px;
  overflow: hidden;
}

[data-rv-id="${id}"] .rv-chassis-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid var(--rv-border);
  cursor: pointer;
  transition: background var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-chassis-header:hover {
  background: rgba(255,255,255,0.06);
}

[data-rv-id="${id}"] .rv-chassis-toggle {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  color: var(--rv-text-muted);
  transition: transform var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-chassis-toggle svg {
  width: 16px;
  height: 16px;
}

[data-rv-id="${id}"] .rv-chassis.rv-chassis-expanded .rv-chassis-toggle {
  transform: rotate(45deg);
}

[data-rv-id="${id}"] .rv-chassis-body {
  display: none;
  padding: 6px;
  gap: 4px;
}

[data-rv-id="${id}"] .rv-chassis.rv-chassis-expanded .rv-chassis-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

[data-rv-id="${id}"] .rv-blade {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--rv-border);
  border-radius: 3px;
  cursor: pointer;
  transition: all var(--rv-duration) ease;
  min-height: 50px;
}

[data-rv-id="${id}"] .rv-blade:hover {
  background: rgba(255,255,255,0.05);
  border-color: var(--rv-accent);
}

[data-rv-id="${id}"] .rv-blade-slot {
  font-family: var(--rv-font-mono);
  font-size: 9px;
  color: var(--rv-text-muted);
  margin-bottom: 4px;
}

[data-rv-id="${id}"] .rv-blade-label {
  font-size: 10px;
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

[data-rv-id="${id}"] .rv-tooltip {
  position: fixed;
  z-index: 10000;
  background: ${t.tooltip.background};
  border: 1px solid ${t.tooltip.border};
  border-radius: ${t.tooltip.borderRadius}px;
  padding: ${t.tooltip.padding}px;
  max-width: ${t.tooltip.maxWidth}px;
  min-width: ${t.tooltip.minWidth}px;
  box-shadow: ${t.tooltip.shadow};
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 150ms ease, transform 150ms ease;
  font-size: ${t.tooltip.fontSize}px;
  line-height: 1.5;
}

[data-rv-id="${id}"] .rv-tooltip.rv-tooltip-visible {
  opacity: 1;
  transform: translateY(0);
}

[data-rv-id="${id}"] .rv-tooltip-title {
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${t.tooltip.titleBorder};
}

[data-rv-id="${id}"] .rv-tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 3px 0;
}

[data-rv-id="${id}"] .rv-tooltip-label {
  color: var(--rv-text-muted);
}

[data-rv-id="${id}"] .rv-tooltip-value {
  color: var(--rv-text);
  font-family: var(--rv-font-mono);
  text-align: right;
}

[data-rv-id="${id}"] .rv-info-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: ${t.infoPanel.width}px;
  max-width: 90%;
  height: 100%;
  background: ${t.infoPanel.background};
  border-left: 1px solid var(--rv-border);
  box-shadow: ${t.infoPanel.shadow};
  z-index: 200;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 250ms ease;
}

[data-rv-id="${id}"] .rv-info-panel.rv-info-panel-open {
  transform: translateX(0);
}

[data-rv-id="${id}"] .rv-info-panel-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--rv-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

[data-rv-id="${id}"] .rv-info-panel-title {
  font-weight: 600;
  font-size: 14px;
}

[data-rv-id="${id}"] .rv-info-panel-close {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--rv-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color var(--rv-duration) ease, background var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-info-panel-close:hover {
  color: var(--rv-text);
  background: rgba(255,255,255,0.1);
}

[data-rv-id="${id}"] .rv-info-panel-close svg {
  width: 18px;
  height: 18px;
}

[data-rv-id="${id}"] .rv-info-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

[data-rv-id="${id}"] .rv-info-section {
  margin-bottom: 24px;
}

[data-rv-id="${id}"] .rv-info-section:last-child {
  margin-bottom: 0;
}

[data-rv-id="${id}"] .rv-info-section-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--rv-text-muted);
  margin-bottom: 10px;
  font-weight: 600;
}

[data-rv-id="${id}"] .rv-info-stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

[data-rv-id="${id}"] .rv-info-stat:last-child {
  border-bottom: none;
}

[data-rv-id="${id}"] .rv-info-stat-label {
  color: var(--rv-text-muted);
}

[data-rv-id="${id}"] .rv-info-stat-value {
  font-family: var(--rv-font-mono);
}

[data-rv-id="${id}"] .rv-info-device-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

[data-rv-id="${id}"] .rv-info-device-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: ${t.infoPanel.itemBackground};
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--rv-duration) ease;
}

[data-rv-id="${id}"] .rv-info-device-item:hover {
  background: ${t.infoPanel.itemBackgroundHover};
}

[data-rv-id="${id}"] .rv-info-device-slot {
  font-family: var(--rv-font-mono);
  font-size: 10px;
  color: var(--rv-text-muted);
  min-width: 28px;
}

[data-rv-id="${id}"] .rv-info-device-name {
  flex: 1;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-rv-id="${id}"] .rv-info-device-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

[data-rv-id="${id}"].rv-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 999999 !important;
}

[data-rv-id="${id}"] .rv-viewport::-webkit-scrollbar {
  width: ${t.scrollbar.width}px;
  height: ${t.scrollbar.width}px;
}

[data-rv-id="${id}"] .rv-viewport::-webkit-scrollbar-track {
  background: ${t.scrollbar.track};
}

[data-rv-id="${id}"] .rv-viewport::-webkit-scrollbar-thumb {
  background: ${t.scrollbar.thumb};
  border-radius: ${t.scrollbar.borderRadius}px;
}

[data-rv-id="${id}"] .rv-viewport::-webkit-scrollbar-thumb:hover {
  background: ${t.scrollbar.thumbHover};
}
    `;
  }
  
  _setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.scaleManager.update(entry.contentRect);
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
        if (this.infoPanel.isOpen) this.closeInfoPanel();
        this.tooltipManager.hide();
      }
    });
    
    document.addEventListener('click', (e) => {
      if (this.options.tooltip.trigger === 'click' && !e.target.closest('.rv-device, .rv-blade, .rv-tooltip')) {
        this.tooltipManager.hide();
      }
    });
  }
  
  // === DATA ===
  load(data) {
    this.data = this._normalizeData(data);
    this.render();
    this.emit('load', this.data);
    return this;
  }
  
  update(data) {
    const newData = this._normalizeData(data);
    if (this.options.diffUpdates && this.data.racks.length > 0) {
      const changes = this.diffEngine.diff(this.data, newData);
      if (changes.requiresFullRender) {
        this.data = newData;
        this.render();
      } else {
        this.data = newData;
        this.renderer.applyChanges(changes);
      }
    } else {
      this.data = newData;
      this.render();
    }
    this.emit('update', this.data);
    return this;
  }
  
  _normalizeData(data) {
    if (data.rack && !data.racks) return { racks: [data.rack] };
    return { racks: data.racks || [] };
  }
  
  // === RACKS ===
  addRack(rackData, options = {}) {
    const rack = { ...rackData };
    if (!rack.id) rack.id = generateId('rack');
    if (!rack.devices) rack.devices = [];
    
    let index = this.data.racks.length;
    if (typeof options.position === 'number') {
      index = Math.max(0, Math.min(options.position, this.data.racks.length));
    }
    
    this.data.racks.splice(index, 0, rack);
    this.render();
    this.emit('rackAdded', rack);
    return this;
  }
  
  updateRack(rackId, rackData) {
    const rack = this.data.racks.find(r => r.id === rackId);
    if (!rack) return this;
    Object.assign(rack, rackData);
    this.render();
    this.emit('rackUpdated', rack);
    return this;
  }
  
  removeRack(rackId) {
    const index = this.data.racks.findIndex(r => r.id === rackId);
    if (index === -1) return this;
    const removed = this.data.racks.splice(index, 1)[0];
    this.render();
    this.emit('rackRemoved', rackId, removed);
    return this;
  }
  
  getRack(rackId) {
    return this.data.racks.find(r => r.id === rackId) || null;
  }
  
  // === DEVICES ===
  addDevice(rackId, deviceData) {
    const rack = this.getRack(rackId);
    if (!rack) return this;
    const device = { ...deviceData };
    if (!device.id) device.id = generateId('dev');
    rack.devices.push(device);
    this.render();
    this.emit('deviceAdded', device, rackId);
    return this;
  }
  
  updateDevice(deviceId, deviceData) {
    const result = this._findDevice(deviceId);
    if (!result.device) return this;
    Object.assign(result.device, deviceData);
    const needsFullRender = deviceData.slot !== undefined || deviceData.height !== undefined || deviceData.position !== undefined;
    if (needsFullRender) {
      this.render();
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
    this.render();
    this.emit('deviceRemoved', deviceId, result.device);
    return this;
  }
  
  getDevice(deviceId) {
    const result = this._findDevice(deviceId);
    return result.device || null;
  }
  
  _findDevice(deviceId) {
    for (const rack of this.data.racks) {
      const index = rack.devices.findIndex(d => d.id === deviceId);
      if (index !== -1) return { device: rack.devices[index], rack, index };
      
      for (const device of rack.devices) {
        if (device.chassis && device.chassis.blades) {
          const bladeIndex = device.chassis.blades.findIndex(b => b.id === deviceId);
          if (bladeIndex !== -1) {
            return { device: device.chassis.blades[bladeIndex], rack, index: bladeIndex, chassis: device };
          }
        }
      }
    }
    return { device: null, rack: null, index: -1 };
  }
  
  // === BLADES ===
  addBlade(chassisId, bladeData) {
    const result = this._findDevice(chassisId);
    if (!result.device || !result.device.chassis) return this;
    const blade = { ...bladeData };
    if (!blade.id) blade.id = generateId('blade');
    if (!result.device.chassis.blades) result.device.chassis.blades = [];
    result.device.chassis.blades.push(blade);
    this.render();
    this.emit('bladeAdded', blade, chassisId);
    return this;
  }
  
  removeBlade(bladeId) {
    for (const rack of this.data.racks) {
      for (const device of rack.devices) {
        if (device.chassis && device.chassis.blades) {
          const index = device.chassis.blades.findIndex(b => b.id === bladeId);
          if (index !== -1) {
            const removed = device.chassis.blades.splice(index, 1)[0];
            this.render();
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
    if (this.expandedChassis.has(chassisId)) {
      this.collapseChassis(chassisId);
    } else {
      this.expandChassis(chassisId);
    }
    return this;
  }
  
  // === VIEW ===
  setView(view) {
    if (view !== 'front' && view !== 'rear') return this;
    if (view !== this.currentView) {
      this.currentView = view;
      if (this.viewToggleBtn) this.viewToggleBtn.innerHTML = this._getViewIcon();
      this.render();
      this.emit('viewChange', view);
    }
    return this;
  }
  
  toggleView() {
    return this.setView(this.currentView === 'front' ? 'rear' : 'front');
  }
  
  getView() {
    return this.currentView;
  }
  
  // === HIGHLIGHTING ===
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
  
  // === INFO PANEL ===
  openInfoPanel(rackId) {
    this.infoPanel.open(rackId);
    return this;
  }
  
  closeInfoPanel() {
    this.infoPanel.close();
    return this;
  }
  
  toggleInfoPanel() {
    this.infoPanel.toggle();
    return this;
  }
  
  // === FULLSCREEN ===
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
  
  toggleFullscreen() {
    return this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
  }
  
  // === THEME ===
  setTheme(theme) {
    this.theme = deepMerge(this.theme, theme);
    this.styleEl.textContent = this._generateStyles();
    this.emit('themeChange', this.theme);
    return this;
  }
  
  getTheme() {
    return this.theme;
  }
  
  // === SEARCH ===
  search(query) {
    if (!query) {
      this.clearHighlight();
      return this;
    }
    const q = query.toLowerCase();
    const matches = [];
    for (const rack of this.data.racks) {
      for (const device of rack.devices) {
        if ((device.label && device.label.toLowerCase().includes(q)) ||
            (device.id && device.id.toLowerCase().includes(q))) {
          matches.push(device.id);
        }
      }
    }
    this.clearHighlight();
    matches.forEach(id => this.highlight(id));
    return this;
  }
  
  // === LIFECYCLE ===
  render() {
    this.renderer.render();
    this.scaleManager.update();
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