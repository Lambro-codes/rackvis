/**
 * Slide-out panel showing rack details
 */
import { escapeHtml } from '../utils/helpers.js';

export class InfoPanel {
  constructor(rackViz) {
    this.rv = rackViz;
    this.isOpen = false;
    this.currentRackId = null;
  }
  
  open(rackId) {
    this.isOpen = true;
    this.currentRackId = rackId || this.rv.data.racks[0]?.id;
    this._render();
    this.rv.infoPanelEl.classList.add('rv-info-panel-open');
    this.rv.emit('infoPanelOpen', this.currentRackId);
  }
  
  close() {
    this.isOpen = false;
    this.rv.infoPanelEl.classList.remove('rv-info-panel-open');
    this.rv.emit('infoPanelClose');
  }
  
  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
  
  _render() {
    const rack = this.rv.getRack(this.currentRackId);
    if (!rack) {
      this.rv.infoPanelEl.innerHTML = '<div class="rv-info-panel-body">No rack selected</div>';
      return;
    }
    
    const devices = rack.devices || [];
    const height = rack.height || 42;
    
    const usedSlots = new Set();
    let onlineCount = 0, offlineCount = 0, warningCount = 0;
    
    for (const device of devices) {
      const h = device.height || 1;
      for (let u = device.slot; u < device.slot + h; u++) usedSlots.add(u);
      if (device.status === 'online') onlineCount++;
      else if (device.status === 'offline') offlineCount++;
      else if (device.status === 'warning' || device.status === 'critical') warningCount++;
    }
    
    const usedU = usedSlots.size;
    const freeU = height - usedU;
    const utilization = Math.round((usedU / height) * 100);
    
    let html = `
      <div class="rv-info-panel-header">
        <span class="rv-info-panel-title">${escapeHtml(rack.label || rack.id)}</span>
        <button class="rv-info-panel-close" title="Close">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div class="rv-info-panel-body">
        <div class="rv-info-section">
          <div class="rv-info-section-title">Summary</div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">Total Height</span><span class="rv-info-stat-value">${height}U</span></div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">Used</span><span class="rv-info-stat-value">${usedU}U (${utilization}%)</span></div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">Free</span><span class="rv-info-stat-value">${freeU}U</span></div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">Devices</span><span class="rv-info-stat-value">${devices.length}</span></div>
        </div>
        <div class="rv-info-section">
          <div class="rv-info-section-title">Status</div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">🟢 Online</span><span class="rv-info-stat-value">${onlineCount}</span></div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">🔴 Offline</span><span class="rv-info-stat-value">${offlineCount}</span></div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">🟡 Warning</span><span class="rv-info-stat-value">${warningCount}</span></div>
        </div>
        <div class="rv-info-section">
          <div class="rv-info-section-title">Devices</div>
          <div class="rv-info-device-list">
    `;
    
    const sortedDevices = [...devices].sort((a, b) => b.slot - a.slot);
    for (const device of sortedDevices) {
      const statusColor = this.rv.theme.status[device.status] || this.rv.theme.status.unknown;
      const slotLabel = device.height > 1 ? `${device.slot}-${device.slot + device.height - 1}` : device.slot;
      html += `<div class="rv-info-device-item" data-device-id="${device.id}"><span class="rv-info-device-slot">U${slotLabel}</span><span class="rv-info-device-name">${escapeHtml(device.label || device.id)}</span><span class="rv-info-device-status" style="background: ${statusColor}"></span></div>`;
    }
    
    html += '</div></div></div>';
    
    this.rv.infoPanelEl.innerHTML = html;
    
    this.rv.infoPanelEl.querySelector('.rv-info-panel-close')?.addEventListener('click', () => this.close());
    this.rv.infoPanelEl.querySelectorAll('.rv-info-device-item').forEach(item => {
      item.addEventListener('click', () => this.rv.highlight(item.getAttribute('data-device-id')));
    });
  }
}