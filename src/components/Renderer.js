/**
 * Handles DOM rendering of racks and devices
 */
import { escapeHtml } from '../utils/helpers.js';

export class Renderer {
  constructor(rackViz) {
    this.rv = rackViz;
  }
  
  render() {
    const container = this.rv.rackContainer;
    container.innerHTML = '';
    for (const rack of this.rv.data.racks) {
      container.appendChild(this._renderRack(rack));
    }
  }
  
  _renderRack(rack) {
    const el = document.createElement('div');
    el.className = 'rv-rack';
    el.setAttribute('data-rack-id', rack.id);
    if (this.rv.highlights.has(rack.id)) el.classList.add('rv-rack-highlighted');
    
    // Header
    const header = document.createElement('div');
    header.className = 'rv-rack-header';
    header.innerHTML = `<span class="rv-rack-label">${escapeHtml(rack.label || rack.id)}</span><span class="rv-rack-meta">${rack.height || 42}U</span>`;
    header.addEventListener('click', (e) => this.rv.emit('rackClick', rack, e));
    el.appendChild(header);
    
    // Body
    const body = document.createElement('div');
    body.className = 'rv-rack-body';
    
    const opts = this.rv.options.unitNumbers;
    const height = rack.height || 42;
    const direction = opts.direction || 'bottom-up';
    
    if (opts.show && (opts.position === 'left' || opts.position === 'both')) {
      body.appendChild(this._renderRail(height, direction));
    }
    body.appendChild(this._renderRackInner(rack));
    if (opts.show && (opts.position === 'right' || opts.position === 'both')) {
      body.appendChild(this._renderRail(height, direction));
    }
    
    el.appendChild(body);
    return el;
  }
  
  _renderRail(height, direction) {
    const rail = document.createElement('div');
    rail.className = 'rv-rail';
    
    const units = [];
    for (let i = 1; i <= height; i++) units.push(i);
    if (direction === 'bottom-up') units.reverse();
    
    for (const u of units) {
      const unit = document.createElement('div');
      unit.className = 'rv-rail-unit';
      if (u % 5 === 0) unit.classList.add('rv-rail-unit-highlight');
      unit.textContent = u;
      rail.appendChild(unit);
    }
    return rail;
  }
  
  _renderRackInner(rack) {
    const inner = document.createElement('div');
    inner.className = 'rv-rack-inner';
    
    const height = rack.height || 42;
    const devices = rack.devices || [];
    const view = this.rv.currentView;
    const opts = this.rv.options;
    const direction = opts.unitNumbers.direction || 'bottom-up';
    
    const slotMap = this._buildSlotMap(devices, view);
    
    const renderOrder = [];
    for (let u = 1; u <= height; u++) renderOrder.push(u);
    if (direction === 'bottom-up') renderOrder.reverse();
    
    const rendered = new Set();
    
    for (const u of renderOrder) {
      const slotInfo = slotMap.get(u);
      
      if (!slotInfo) {
        inner.appendChild(this._renderEmptySlot(u, rack.id));
      } else if (slotInfo.isStart && !rendered.has(slotInfo.device.id)) {
        rendered.add(slotInfo.device.id);
        inner.appendChild(this._renderDevice(slotInfo.device, slotInfo.isGhost));
      }
    }
    
    return inner;
  }
  
  _buildSlotMap(devices, view) {
    const map = new Map();
    const opts = this.rv.options;
    
    for (const device of devices) {
      const slot = device.slot;
      const height = device.height || 1;
      const position = device.position || 'full';
      
      let isVisible = false, isGhost = false;
      
      if (position === 'full' || position === view) {
        isVisible = true;
      } else {
        if (opts.showOppositeSide === 'ghost') { isVisible = true; isGhost = true; }
      }
      
      if (isVisible) {
        map.set(slot, { device, isStart: true, isGhost });
        for (let u = slot + 1; u < slot + height; u++) {
          map.set(u, { device, isStart: false, isGhost });
        }
      }
    }
    return map;
  }
  
  _renderEmptySlot(unit, rackId) {
    const slot = document.createElement('div');
    slot.className = 'rv-slot';
    slot.setAttribute('data-slot', unit);
    slot.setAttribute('data-height', '1');
    
    const empty = document.createElement('div');
    empty.className = 'rv-slot-empty';
    if (!this.rv.options.showEmptySlots) {
      empty.style.opacity = '0';
      empty.style.border = 'none';
    }
    empty.addEventListener('click', (e) => this.rv.emit('emptySlotClick', rackId, unit, e));
    slot.appendChild(empty);
    return slot;
  }
  
  _renderDevice(device, isGhost = false) {
    const height = device.height || 1;
    
    if (device.chassis) return this._renderChassis(device, isGhost);
    
    const slot = document.createElement('div');
    slot.className = 'rv-slot';
    slot.setAttribute('data-slot', device.slot);
    slot.setAttribute('data-height', height);
    
    const el = document.createElement('div');
    el.className = 'rv-device';
    el.setAttribute('data-device-id', device.id);
    el.setAttribute('data-height', height);
    
    if (isGhost) el.classList.add('rv-device-ghost');
    if (this.rv.highlights.has(device.id)) el.classList.add('rv-device-highlighted');
    
    this._applyDeviceStyle(el, device);
    
    const status = document.createElement('div');
    status.className = 'rv-device-status';
    status.setAttribute('data-status', device.status || 'unknown');
    el.appendChild(status);
    
    const info = document.createElement('div');
    info.className = 'rv-device-info';
    const label = document.createElement('div');
    label.className = 'rv-device-label';
    label.textContent = device.label || device.id;
    info.appendChild(label);
    if (device.type) {
      const type = document.createElement('div');
      type.className = 'rv-device-type';
      type.textContent = device.type;
      info.appendChild(type);
    }
    el.appendChild(info);
    
    if (device.position && device.position !== 'full' && !isGhost) {
      const badge = document.createElement('span');
      badge.className = 'rv-device-position-badge';
      badge.textContent = device.position;
      el.appendChild(badge);
    }
    
    this._bindDeviceEvents(el, device);
    slot.appendChild(el);
    return slot;
  }
  
  _renderChassis(device, isGhost = false) {
    const height = device.height || 1;
    const chassis = device.chassis;
    const isExpanded = this.rv.expandedChassis.has(device.id);
    
    const slot = document.createElement('div');
    slot.className = 'rv-slot';
    slot.setAttribute('data-slot', device.slot);
    slot.setAttribute('data-height', height);
    
    const el = document.createElement('div');
    el.className = 'rv-chassis';
    el.setAttribute('data-device-id', device.id);
    el.setAttribute('data-chassis', 'true');
    if (isExpanded) el.classList.add('rv-chassis-expanded');
    if (isGhost) el.classList.add('rv-device-ghost');
    
    const header = document.createElement('div');
    header.className = 'rv-chassis-header';
    header.innerHTML = `
      <span class="rv-chassis-toggle"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></span>
      <div class="rv-device-status" data-status="${device.status || 'unknown'}"></div>
      <div class="rv-device-info">
        <div class="rv-device-label">${escapeHtml(device.label || device.id)}</div>
        <div class="rv-device-type">${escapeHtml(device.type || 'chassis')} · ${chassis.slots || 16} slots</div>
      </div>
    `;
    
    header.addEventListener('click', (e) => {
      this.rv.toggleChassis(device.id);
      this.rv.emit('deviceClick', device, e);
    });
    this._bindDeviceEvents(header, device);
    el.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'rv-chassis-body';
    const blades = chassis.blades || [];
    const totalSlots = chassis.slots || 16;
    for (let i = 1; i <= totalSlots; i++) {
      const blade = blades.find(b => b.slot === i);
      body.appendChild(this._renderBlade(blade, i));
    }
    el.appendChild(body);
    slot.appendChild(el);
    return slot;
  }
  
  _renderBlade(blade, slotNum) {
    const el = document.createElement('div');
    el.className = 'rv-blade';
    
    if (!blade) {
      el.classList.add('rv-blade-empty');
      el.innerHTML = `<span class="rv-blade-slot">${slotNum}</span><span class="rv-blade-label">Empty</span>`;
      return el;
    }
    
    el.setAttribute('data-device-id', blade.id);
    
    const statusColor = this.rv.theme.status[blade.status] || this.rv.theme.status.unknown;
    el.style.borderLeftColor = statusColor;
    el.style.borderLeftWidth = '3px';
    el.innerHTML = `<span class="rv-blade-slot">${slotNum}</span><span class="rv-blade-label">${escapeHtml(blade.label || blade.id)}</span>`;
    
    this._bindDeviceEvents(el, blade);
    return el;
  }
  
  _applyDeviceStyle(el, device) {
    const style = device.style;
    if (!style) return;
    
    if (style.background) el.style.background = style.background;
    if (style.border) el.style.borderColor = style.border;
    if (style.borderWidth) el.style.borderWidth = `${style.borderWidth}px`;
    if (style.glow) el.style.boxShadow = style.glow;
    if (style.opacity !== undefined) el.style.opacity = style.opacity;
    
    if (style.pattern && style.pattern !== 'none') {
      const patternColor = style.patternColor || 'rgba(255,255,255,0.1)';
      let patternBg = '';
      if (style.pattern === 'stripes') {
        patternBg = `repeating-linear-gradient(45deg, transparent, transparent 4px, ${patternColor} 4px, ${patternColor} 8px)`;
      }
      if (patternBg) {
        const currentBg = style.background || this.rv.theme.device.background;
        el.style.background = `${patternBg}, ${currentBg}`;
      }
    }
  }
  
  _bindDeviceEvents(el, device) {
    const trigger = this.rv.options.tooltip.trigger;
    
    el.addEventListener('click', (e) => {
      if (trigger === 'click' || trigger === 'both') this.rv.tooltipManager.show(device, el);
      this.rv.emit('deviceClick', device, e);
    });
    
    el.addEventListener('mouseenter', (e) => {
      if (trigger === 'hover' || trigger === 'both') this.rv.tooltipManager.show(device, el);
      this.rv.emit('deviceHover', device, e);
    });
    
    el.addEventListener('mouseleave', () => {
      if (trigger === 'hover') this.rv.tooltipManager.hide();
    });
  }
  
  applyChanges(changes) {
    for (const change of changes.devices) {
      if (change.type === 'update') this.updateDevice(change.id, change.props);
    }
  }
  
  updateDevice(deviceId, props) {
    const el = this.rv.rackContainer.querySelector(`[data-device-id="${deviceId}"]`);
    if (!el) return;
    
    if (props.status !== undefined) {
      const statusEl = el.querySelector('.rv-device-status');
      if (statusEl) statusEl.setAttribute('data-status', props.status);
    }
    if (props.label !== undefined) {
      const labelEl = el.querySelector('.rv-device-label');
      if (labelEl) labelEl.textContent = props.label;
    }
  }
  
  highlight(deviceId) {
    const el = this.rv.rackContainer.querySelector(`[data-device-id="${deviceId}"]`);
    if (el) el.classList.add('rv-device-highlighted');
  }
  
  highlightRack(rackId) {
    const el = this.rv.rackContainer.querySelector(`[data-rack-id="${rackId}"]`);
    if (el) el.classList.add('rv-rack-highlighted');
  }
  
  clearHighlight(id) {
    const el = this.rv.rackContainer.querySelector(`[data-device-id="${id}"], [data-rack-id="${id}"]`);
    if (el) el.classList.remove('rv-device-highlighted', 'rv-rack-highlighted');
  }
  
  clearAllHighlights() {
    this.rv.rackContainer.querySelectorAll('.rv-device-highlighted, .rv-rack-highlighted').forEach(el => {
      el.classList.remove('rv-device-highlighted', 'rv-rack-highlighted');
    });
  }
  
  expandChassis(chassisId) {
    const el = this.rv.rackContainer.querySelector(`[data-device-id="${chassisId}"][data-chassis="true"]`);
    if (el) el.classList.add('rv-chassis-expanded');
  }
  
  collapseChassis(chassisId) {
    const el = this.rv.rackContainer.querySelector(`[data-device-id="${chassisId}"][data-chassis="true"]`);
    if (el) el.classList.remove('rv-chassis-expanded');
  }
}