/**
 * Handles DOM rendering of racks and devices
 */
import { escapeHtml } from '../utils/helpers.js';

export class Renderer {
  constructor(rackViz) {
    this.rv = rackViz;
    this.scrollingLabels = new Map();
  }
  
  render() {
    const container = this.rv.rackContainer;
    container.innerHTML = '';
    this.scrollingLabels.clear();
    
    const unitHeight = this.rv.scaleManager.getUnitHeight();
    
    for (const rack of this.rv.data.racks) {
      container.appendChild(this._renderRack(rack, unitHeight));
    }
  }
  
  _renderRack(rack, unitHeight) {
    const el = document.createElement('div');
    el.className = 'rv-rack';
    el.setAttribute('data-rack-id', rack.id);
    if (this.rv.highlights.has(rack.id)) el.classList.add('rv-rack-highlighted');
    
    const rackWidth = this.rv.scaleManager.getRackWidth();
    const height = rack.height || 42;
    const totalBodyHeight = unitHeight * height;
    
    el.style.width = `${rackWidth}px`;
    
    // Header
    const header = document.createElement('div');
    header.className = 'rv-rack-header';
    header.innerHTML = `<span class="rv-rack-label">${escapeHtml(rack.label || rack.id)}</span><span class="rv-rack-meta">${height}U</span>`;
    header.addEventListener('click', (e) => {
      this.rv.infoPanel.toggle(rack.id);
      this.rv.emit('rackClick', rack, e);
    });
    el.appendChild(header);
    
    // Body - use CSS Grid for perfect alignment
    const body = document.createElement('div');
    body.className = 'rv-rack-body';
    body.style.height = `${totalBodyHeight}px`;
    body.style.gridTemplateRows = `repeat(${height}, ${unitHeight}px)`;
    
    const opts = this.rv.options.unitNumbers;
    const direction = opts.direction || 'bottom-up';
    
    // Left rail
    if (opts.show && (opts.position === 'left' || opts.position === 'both')) {
      body.appendChild(this._renderRail(height, direction, unitHeight));
    }
    
    // Rack inner (devices)
    body.appendChild(this._renderRackInner(rack, unitHeight, height, direction));
    
    // Right rail
    if (opts.show && (opts.position === 'right' || opts.position === 'both')) {
      body.appendChild(this._renderRail(height, direction, unitHeight));
    }
    
    el.appendChild(body);
    return el;
  }
  
  _renderRail(rackHeight, direction, unitHeight) {
    const rail = document.createElement('div');
    rail.className = 'rv-rail';
    rail.style.gridTemplateRows = `repeat(${rackHeight}, ${unitHeight}px)`;
    
    // Generate unit numbers in correct order
    const units = [];
    if (direction === 'bottom-up') {
      for (let i = rackHeight; i >= 1; i--) units.push(i);
    } else {
      for (let i = 1; i <= rackHeight; i++) units.push(i);
    }
    
    for (const u of units) {
      const unit = document.createElement('div');
      unit.className = 'rv-rail-unit';
      if (u % 5 === 0) unit.classList.add('rv-rail-unit-highlight');
      unit.textContent = u;
      rail.appendChild(unit);
    }
    return rail;
  }
  
  _renderRackInner(rack, unitHeight, rackHeight, direction) {
    const inner = document.createElement('div');
    inner.className = 'rv-rack-inner';
    inner.style.gridTemplateRows = `repeat(${rackHeight}, ${unitHeight}px)`;
    
    const devices = rack.devices || [];
    const view = this.rv.currentView;
    
    // Build slot map - which device occupies which slot
    const slotMap = this._buildSlotMap(devices, view);
    
    // Render each row (U position)
    // For bottom-up: row 1 in grid = U42, row 42 in grid = U1
    // For top-down: row 1 in grid = U1, row 42 in grid = U42
    
    const rendered = new Set();
    
    for (let row = 1; row <= rackHeight; row++) {
      // Calculate which U this row represents
      const u = direction === 'bottom-up' ? (rackHeight - row + 1) : row;
      
      const slotInfo = slotMap.get(u);
      
      if (!slotInfo) {
        // Empty slot
        const emptySlot = this._renderEmptySlot(u, rack.id, row);
        inner.appendChild(emptySlot);
      } else if (slotInfo.isStart && !rendered.has(slotInfo.device.id)) {
        // Start of a device
        rendered.add(slotInfo.device.id);
        const deviceEl = this._renderDevice(slotInfo.device, slotInfo.isGhost, unitHeight, row, direction, rackHeight);
        inner.appendChild(deviceEl);
      }
      // Continuation slots are skipped - device spans multiple rows via grid-row
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
      } else if (opts.showOppositeSide === 'ghost') {
        isVisible = true;
        isGhost = true;
      }
      
      if (isVisible) {
        // a real (non-ghost) device must never lose its slot to a ghost registered later -
        // two devices sharing one U (front + rear) previously overwrote in array order
        // regardless of ghost status, so the real device could vanish behind a stale ghost.
        const existing = map.get(slot);
        if (existing && !existing.isGhost && isGhost) continue;
        map.set(slot, { device, isStart: true, isGhost });
        for (let u = slot + 1; u < slot + height; u++) {
          map.set(u, { device, isStart: false, isGhost });
        }
      }
    }
    return map;
  }
  
  _renderEmptySlot(unit, rackId, gridRow) {
    const el = document.createElement('div');
    el.className = 'rv-slot rv-slot-empty';
    el.setAttribute('data-slot', unit);
    el.style.gridRow = `${gridRow} / span 1`;
    
    if (!this.rv.options.showEmptySlots) {
      el.classList.add('rv-slot-hidden');
    }
    
    el.addEventListener('click', (e) => this.rv.emit('emptySlotClick', rackId, unit, e));
    return el;
  }
  
  _renderDevice(device, isGhost, unitHeight, startRow, direction, rackHeight) {
    const height = device.height || 1;
    
    // Calculate grid row position
    // For bottom-up: device at U15 with height 10 occupies U15-U24
    // Grid row for U15 in bottom-up = rackHeight - 15 + 1 = 28 (for 42U rack)
    // But the device should span upward, so we need the top row
    // Top U = slot + height - 1 = 15 + 10 - 1 = 24
    // Grid row for U24 = rackHeight - 24 + 1 = 19
    // So grid-row: 19 / span 10
    
    let gridRowStart;
    if (direction === 'bottom-up') {
      const topU = device.slot + height - 1;
      gridRowStart = rackHeight - topU + 1;
    } else {
      gridRowStart = device.slot;
    }
    
    if (device.chassis) {
      return this._renderChassis(device, isGhost, unitHeight, height, gridRowStart);
    }
    
    const el = document.createElement('div');
    el.className = 'rv-device';
    el.setAttribute('data-device-id', device.id);
    el.setAttribute('data-slot', device.slot);
    el.style.gridRow = `${gridRowStart} / span ${height}`;
    
    if (isGhost) el.classList.add('rv-device-ghost');
    if (this.rv.highlights.has(device.id)) el.classList.add('rv-device-highlighted');
    
    this._applyDeviceStyle(el, device);
    
    // Status indicator
    const status = document.createElement('div');
    status.className = 'rv-device-status';
    status.setAttribute('data-status', device.status || 'unknown');
    el.appendChild(status);
    
    // Label
    const labelContainer = document.createElement('div');
    labelContainer.className = 'rv-device-label-container';
    
    const labelText = document.createElement('span');
    labelText.className = 'rv-device-label';
    
    const format = this.rv.options.labelFormat || 'label-first';
    const labelPart = device.label || device.id;
    const typePart = device.type || '';
    
    if (typePart) {
      if (format === 'type-first') {
        labelText.innerHTML = `<span class="rv-device-type-inline">${escapeHtml(typePart)}</span><span class="rv-device-separator">●</span><span class="rv-device-name">${escapeHtml(labelPart)}</span>`;
      } else {
        labelText.innerHTML = `<span class="rv-device-name">${escapeHtml(labelPart)}</span><span class="rv-device-separator">●</span><span class="rv-device-type-inline">${escapeHtml(typePart)}</span>`;
      }
    } else {
      labelText.innerHTML = `<span class="rv-device-name">${escapeHtml(labelPart)}</span>`;
    }
    
    labelContainer.appendChild(labelText);
    el.appendChild(labelContainer);
    
    // Position badge
    if (device.position && device.position !== 'full' && !isGhost) {
      const badge = document.createElement('span');
      badge.className = 'rv-device-position-badge';
      badge.textContent = device.position;
      el.appendChild(badge);
    }
    
    this._bindDeviceEvents(el, device);
    return el;
  }
  
  _renderChassis(device, isGhost, unitHeight, height, gridRowStart) {
    const chassis = device.chassis;
    const isExpanded = this.rv.expandedChassis.has(device.id);
    
    const el = document.createElement('div');
    el.className = 'rv-chassis';
    el.setAttribute('data-device-id', device.id);
    el.setAttribute('data-chassis', 'true');
    el.setAttribute('data-slot', device.slot);
    el.style.gridRow = `${gridRowStart} / span ${height}`;
    if (isExpanded) el.classList.add('rv-chassis-expanded');
    if (isGhost) el.classList.add('rv-device-ghost');
    if (this.rv.highlights.has(device.id)) el.classList.add('rv-device-highlighted');

    // Header
    const header = document.createElement('div');
    header.className = 'rv-chassis-header';
    
    const toggle = document.createElement('span');
    toggle.className = 'rv-chassis-toggle';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';
    header.appendChild(toggle);
    
    const statusEl = document.createElement('div');
    statusEl.className = 'rv-device-status';
    statusEl.setAttribute('data-status', device.status || 'unknown');
    header.appendChild(statusEl);
    
    const info = document.createElement('div');
    info.className = 'rv-device-label-container';
    const format = this.rv.options.labelFormat || 'label-first';
    const labelPart = device.label || device.id;
    const typePart = `${device.type || 'chassis'} · ${chassis.slots || 16} slots`;
    
    if (format === 'type-first') {
      info.innerHTML = `<span class="rv-device-type-inline">${escapeHtml(typePart)}</span><span class="rv-device-separator">●</span><span class="rv-device-name">${escapeHtml(labelPart)}</span>`;
    } else {
      info.innerHTML = `<span class="rv-device-name">${escapeHtml(labelPart)}</span><span class="rv-device-separator">●</span><span class="rv-device-type-inline">${escapeHtml(typePart)}</span>`;
    }
    header.appendChild(info);
    
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rv.toggleChassis(device.id);
      this.rv.emit('deviceClick', device, e);
    });
    this._bindDeviceEvents(header, device);
    el.appendChild(header);
    
    // Body - scrollable
    const body = document.createElement('div');
    body.className = 'rv-chassis-body';
    
    const blades = chassis.blades || [];
    const totalSlots = chassis.slots || 16;
    for (let i = 1; i <= totalSlots; i++) {
      const blade = blades.find(b => b.slot === i);
      body.appendChild(this._renderBlade(blade, i));
    }
    el.appendChild(body);
    
    return el;
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
    el.style.borderLeftStyle = 'solid';
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
    
    if (style.pattern === 'stripes') {
      const patternColor = style.patternColor || 'rgba(255,255,255,0.1)';
      const currentBg = style.background || this.rv.theme.device.background;
      el.style.background = `repeating-linear-gradient(45deg, transparent, transparent 4px, ${patternColor} 4px, ${patternColor} 8px), ${currentBg}`;
    }
  }
  
  _bindDeviceEvents(el, device) {
    const trigger = this.rv.options.tooltip.trigger;
    const tooltipEnabled = this.rv.options.tooltip.enabled;
    
    el.addEventListener('click', (e) => {
      if (tooltipEnabled && (trigger === 'click' || trigger === 'both')) {
        this.rv.tooltipManager.show(device, el);
      }
      this.rv.emit('deviceClick', device, e);
    });
    
    // Double-click to copy name
    const nameEl = el.querySelector('.rv-device-name');
    if (nameEl) {
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const name = device.label || device.id;
        navigator.clipboard.writeText(name).then(() => {
          this.rv.emit('deviceNameCopied', device, name);
          nameEl.classList.add('rv-copied');
          setTimeout(() => nameEl.classList.remove('rv-copied'), 300);
        }).catch(() => {});
      });
    }
    
    let scrollTimeout = null;
    
    el.addEventListener('mouseenter', (e) => {
      if (tooltipEnabled && (trigger === 'hover' || trigger === 'both')) {
        this.rv.tooltipManager.show(device, el);
      }
      this.rv.emit('deviceHover', device, e);
      
      // Check overflow and start scroll
      const labelContainer = el.querySelector('.rv-device-label-container');
      const labelText = el.querySelector('.rv-device-label');
      if (labelContainer && labelText && labelText.scrollWidth > labelContainer.clientWidth) {
        scrollTimeout = setTimeout(() => {
          labelText.classList.add('rv-label-scrolling');
          const overflow = labelText.scrollWidth - labelContainer.clientWidth;
          labelText.style.setProperty('--scroll-distance', `-${overflow + 10}px`);
        }, 800);
        this.scrollingLabels.set(device.id, scrollTimeout);
      }
    });
    
    el.addEventListener('mouseleave', (e) => {
      if (trigger === 'hover') this.rv.tooltipManager.hide();
      this.rv.emit('deviceLeave', device, e);
      
      const timeout = this.scrollingLabels.get(device.id);
      if (timeout) {
        clearTimeout(timeout);
        this.scrollingLabels.delete(device.id);
      }
      const labelText = el.querySelector('.rv-device-label');
      if (labelText) {
        labelText.classList.remove('rv-label-scrolling');
      }
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
      const nameEl = el.querySelector('.rv-device-name');
      if (nameEl) nameEl.textContent = props.label;
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