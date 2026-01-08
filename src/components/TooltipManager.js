/**
 * Handles tooltip display and positioning
 */
import { parseTemplate, escapeHtml } from '../utils/helpers.js';

export class TooltipManager {
  constructor(rackViz) {
    this.rv = rackViz;
    this.visible = false;
    this.hideTimeout = null;
    this.showTimeout = null;
  }
  
  show(device, targetEl) {
    clearTimeout(this.hideTimeout);
    clearTimeout(this.showTimeout);
    
    const opts = this.rv.options.tooltip;
    if (!opts.enabled) return;
    
    const delay = opts.trigger === 'hover' ? opts.delay : 0;
    
    this.showTimeout = setTimeout(() => {
      this._render(device);
      this._position(targetEl);
      this.rv.tooltipEl.classList.add('rv-tooltip-visible');
      this.visible = true;
    }, delay);
  }
  
  hide() {
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
    
    this.hideTimeout = setTimeout(() => {
      this.rv.tooltipEl.classList.remove('rv-tooltip-visible');
      this.visible = false;
    }, 50);
  }
  
  _render(device) {
    const el = this.rv.tooltipEl;
    const config = device.tooltip || {};
    
    let html = '';
    const title = config.title ? parseTemplate(config.title, device) : (device.label || device.id);
    html += `<div class="rv-tooltip-title">${escapeHtml(title)}</div>`;
    
    if (config.fields) {
      html += '<div class="rv-tooltip-content">';
      for (const field of config.fields) {
        const value = parseTemplate(field.value, device);
        if (value && value !== 'undefined') {
          html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">${escapeHtml(field.label)}</span><span class="rv-tooltip-value">${escapeHtml(value)}</span></div>`;
        }
      }
      html += '</div>';
    } else {
      html += '<div class="rv-tooltip-content">';
      html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">Status</span><span class="rv-tooltip-value">${device.status || 'unknown'}</span></div>`;
      html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">Slot</span><span class="rv-tooltip-value">U${device.slot}${device.height > 1 ? '-U' + (device.slot + device.height - 1) : ''}</span></div>`;
      if (device.type) {
        html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">Type</span><span class="rv-tooltip-value">${device.type}</span></div>`;
      }
      html += '</div>';
    }
    
    el.innerHTML = html;
  }
  
  _position(targetEl) {
    const tooltip = this.rv.tooltipEl;
    const target = targetEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const offset = 8;
    
    let x = target.right + offset;
    let y = target.top + (target.height - tooltipRect.height) / 2;
    
    if (x + tooltipRect.width > window.innerWidth) {
      x = target.left - tooltipRect.width - offset;
    }
    
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }
  
  destroy() {
    clearTimeout(this.hideTimeout);
    clearTimeout(this.showTimeout);
  }
}