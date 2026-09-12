(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RackViz = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
var RackViz = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var src_exports = {};
  __export(src_exports, {
    RackViz: () => RackViz,
    default: () => src_default,
    themes: () => themes
  });

  // src/core/EventEmitter.js
  var EventEmitter = class {
    constructor() {
      this._events = /* @__PURE__ */ new Map();
    }
    on(event, listener) {
      if (!this._events.has(event)) {
        this._events.set(event, /* @__PURE__ */ new Set());
      }
      this._events.get(event).add(listener);
      return () => this.off(event, listener);
    }
    off(event, listener) {
      this._events.get(event)?.delete(listener);
    }
    once(event, listener) {
      const wrapper = (...args) => {
        this.off(event, wrapper);
        listener.apply(this, args);
      };
      return this.on(event, wrapper);
    }
    emit(event, ...args) {
      const listeners = this._events.get(event);
      if (listeners) {
        for (const listener of listeners) {
          try {
            listener.apply(this, args);
          } catch (e) {
            console.error(`RackViz: Error in "${event}" handler:`, e);
          }
        }
      }
    }
    removeAllListeners(event) {
      if (event) {
        this._events.delete(event);
      } else {
        this._events.clear();
      }
    }
  };

  // src/core/ScaleManager.js
  var ScaleManager = class {
    constructor(rackViz) {
      this.rv = rackViz;
      this.containerRect = null;
      this.unitHeight = 18;
      this.rackWidth = 260;
    }
    update(rect) {
      if (rect) {
        this.containerRect = rect;
      } else if (this.rv.container) {
        this.containerRect = this.rv.container.getBoundingClientRect();
      }
      if (!this.containerRect || !this.rv.data?.racks?.length)
        return;
      this._calculate();
    }
    _calculate() {
      const racks = this.rv.data.racks;
      const opts = this.rv.options;
      const padding = 30;
      const availWidth = this.containerRect.width - padding;
      const availHeight = this.containerRect.height - padding;
      const maxU = Math.max(...racks.map((r) => r.height || 42));
      const rackCount = racks.length;
      const spacing = opts.rackSpacing;
      const totalSpacing = spacing * (rackCount - 1);
      const widthPerRack = (availWidth - totalSpacing) / rackCount;
      this.rackWidth = Math.max(200, Math.min(350, widthPerRack));
      const headerHeight = 32;
      const rackBodyHeight = availHeight - headerHeight;
      this.unitHeight = Math.floor(rackBodyHeight / maxU);
      this.unitHeight = Math.max(4, Math.min(28, this.unitHeight));
    }
    getUnitHeight() {
      return this.unitHeight;
    }
    getRackWidth() {
      return this.rackWidth;
    }
  };

  // src/core/DiffEngine.js
  var DiffEngine = class {
    constructor() {
      this.inPlaceProps = /* @__PURE__ */ new Set(["status", "label", "specs", "tooltip", "meta", "tags"]);
      this.reRenderProps = /* @__PURE__ */ new Set(["slot", "height", "position", "chassis"]);
    }
    diff(oldData, newData) {
      const result = { requiresFullRender: false, devices: [] };
      const oldRacks = this._indexById(oldData.racks || []);
      const newRacks = this._indexById(newData.racks || []);
      if (oldRacks.size !== newRacks.size) {
        result.requiresFullRender = true;
        return result;
      }
      for (const [id, newRack] of newRacks) {
        const oldRack = oldRacks.get(id);
        if (!oldRack || oldRack.height !== newRack.height) {
          result.requiresFullRender = true;
          return result;
        }
        const deviceDiff = this._diffDevices(oldRack.devices || [], newRack.devices || []);
        if (deviceDiff.requiresFullRender) {
          result.requiresFullRender = true;
          return result;
        }
        result.devices.push(...deviceDiff.changes);
      }
      return result;
    }
    _diffDevices(oldDevices, newDevices) {
      const result = { requiresFullRender: false, changes: [] };
      const oldById = this._indexById(oldDevices);
      const newById = this._indexById(newDevices);
      if (oldById.size !== newById.size) {
        result.requiresFullRender = true;
        return result;
      }
      for (const [id, newDevice] of newById) {
        const oldDevice = oldById.get(id);
        if (!oldDevice) {
          result.requiresFullRender = true;
          return result;
        }
        for (const key of this.reRenderProps) {
          if (oldDevice[key] !== newDevice[key]) {
            result.requiresFullRender = true;
            return result;
          }
        }
        const props = {};
        for (const key of this.inPlaceProps) {
          if (oldDevice[key] !== newDevice[key]) {
            props[key] = newDevice[key];
          }
        }
        if (Object.keys(props).length > 0) {
          result.changes.push({ id, type: "update", props });
        }
      }
      return result;
    }
    _indexById(arr) {
      const map = /* @__PURE__ */ new Map();
      for (const item of arr) {
        if (item.id)
          map.set(item.id, item);
      }
      return map;
    }
  };

  // src/utils/helpers.js
  var idCounter = 0;
  function generateId(prefix = "rv") {
    return `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
  }
  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }
  function escapeHtml(str) {
    if (str == null)
      return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }
  function formatBytes(bytes) {
    if (typeof bytes !== "number")
      return bytes;
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let idx = 0;
    let val = bytes;
    while (val >= 1024 && idx < units.length - 1) {
      val /= 1024;
      idx++;
    }
    return `${val.toFixed(idx > 0 ? 1 : 0)} ${units[idx]}`;
  }
  function getNestedValue(obj, path) {
    if (!path)
      return void 0;
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let value = obj;
    for (const part of parts) {
      if (value == null)
        return void 0;
      value = value[part];
    }
    return value;
  }
  function applyFormatter(value, formatter) {
    switch (formatter) {
      case "bytes":
        return formatBytes(value);
      case "number":
        return typeof value === "number" ? value.toLocaleString() : value;
      case "percent":
        return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : value;
      case "upper":
        return String(value).toUpperCase();
      case "lower":
        return String(value).toLowerCase();
      default:
        return value;
    }
  }
  function parseTemplate(template, data) {
    if (!template || typeof template !== "string")
      return "";
    return template.replace(/\$\{([^}]+)\}/g, (match, expr) => {
      try {
        const pipeIdx = expr.indexOf("|");
        if (pipeIdx > -1) {
          const path = expr.slice(0, pipeIdx).trim();
          const formatter = expr.slice(pipeIdx + 1).trim();
          const value = getNestedValue(data, path);
          return applyFormatter(value, formatter);
        }
        return getNestedValue(data, expr.trim()) ?? "";
      } catch {
        return "";
      }
    });
  }

  // src/components/Renderer.js
  var Renderer = class {
    constructor(rackViz) {
      this.rv = rackViz;
      this.scrollingLabels = /* @__PURE__ */ new Map();
    }
    render() {
      const container = this.rv.rackContainer;
      container.innerHTML = "";
      this.scrollingLabels.clear();
      const unitHeight = this.rv.scaleManager.getUnitHeight();
      for (const rack of this.rv.data.racks) {
        container.appendChild(this._renderRack(rack, unitHeight));
      }
    }
    _renderRack(rack, unitHeight) {
      const el = document.createElement("div");
      el.className = "rv-rack";
      el.setAttribute("data-rack-id", rack.id);
      if (this.rv.highlights.has(rack.id))
        el.classList.add("rv-rack-highlighted");
      const rackWidth = this.rv.scaleManager.getRackWidth();
      const height = rack.height || 42;
      const totalBodyHeight = unitHeight * height;
      el.style.width = `${rackWidth}px`;
      const header = document.createElement("div");
      header.className = "rv-rack-header";
      header.innerHTML = `<span class="rv-rack-label">${escapeHtml(rack.label || rack.id)}</span><span class="rv-rack-meta">${height}U</span>`;
      header.addEventListener("click", (e) => {
        this.rv.infoPanel.toggle(rack.id);
        this.rv.emit("rackClick", rack, e);
      });
      el.appendChild(header);
      const body = document.createElement("div");
      body.className = "rv-rack-body";
      body.style.height = `${totalBodyHeight}px`;
      body.style.gridTemplateRows = `repeat(${height}, ${unitHeight}px)`;
      const opts = this.rv.options.unitNumbers;
      const direction = opts.direction || "bottom-up";
      if (opts.show && (opts.position === "left" || opts.position === "both")) {
        body.appendChild(this._renderRail(height, direction, unitHeight));
      }
      body.appendChild(this._renderRackInner(rack, unitHeight, height, direction));
      if (opts.show && (opts.position === "right" || opts.position === "both")) {
        body.appendChild(this._renderRail(height, direction, unitHeight));
      }
      el.appendChild(body);
      return el;
    }
    _renderRail(rackHeight, direction, unitHeight) {
      const rail = document.createElement("div");
      rail.className = "rv-rail";
      rail.style.gridTemplateRows = `repeat(${rackHeight}, ${unitHeight}px)`;
      const units = [];
      if (direction === "bottom-up") {
        for (let i = rackHeight; i >= 1; i--)
          units.push(i);
      } else {
        for (let i = 1; i <= rackHeight; i++)
          units.push(i);
      }
      for (const u of units) {
        const unit = document.createElement("div");
        unit.className = "rv-rail-unit";
        if (u % 5 === 0)
          unit.classList.add("rv-rail-unit-highlight");
        unit.textContent = u;
        rail.appendChild(unit);
      }
      return rail;
    }
    _renderRackInner(rack, unitHeight, rackHeight, direction) {
      const inner = document.createElement("div");
      inner.className = "rv-rack-inner";
      inner.style.gridTemplateRows = `repeat(${rackHeight}, ${unitHeight}px)`;
      const devices = rack.devices || [];
      const view = this.rv.currentView;
      const slotMap = this._buildSlotMap(devices, view);
      const rendered = /* @__PURE__ */ new Set();
      for (let row = 1; row <= rackHeight; row++) {
        const u = direction === "bottom-up" ? rackHeight - row + 1 : row;
        const slotInfo = slotMap.get(u);
        if (!slotInfo) {
          const emptySlot = this._renderEmptySlot(u, rack.id, row);
          inner.appendChild(emptySlot);
        } else if (slotInfo.isStart && !rendered.has(slotInfo.device.id)) {
          rendered.add(slotInfo.device.id);
          const deviceEl = this._renderDevice(slotInfo.device, slotInfo.isGhost, unitHeight, row, direction, rackHeight);
          inner.appendChild(deviceEl);
        }
      }
      return inner;
    }
    _buildSlotMap(devices, view) {
      const map = /* @__PURE__ */ new Map();
      const opts = this.rv.options;
      for (const device of devices) {
        const slot = device.slot;
        const height = device.height || 1;
        const position = device.position || "full";
        let isVisible = false, isGhost = false;
        if (position === "full" || position === view) {
          isVisible = true;
        } else if (opts.showOppositeSide === "ghost") {
          isVisible = true;
          isGhost = true;
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
    _renderEmptySlot(unit, rackId, gridRow) {
      const el = document.createElement("div");
      el.className = "rv-slot rv-slot-empty";
      el.setAttribute("data-slot", unit);
      el.style.gridRow = `${gridRow} / span 1`;
      if (!this.rv.options.showEmptySlots) {
        el.classList.add("rv-slot-hidden");
      }
      el.addEventListener("click", (e) => this.rv.emit("emptySlotClick", rackId, unit, e));
      return el;
    }
    _renderDevice(device, isGhost, unitHeight, startRow, direction, rackHeight) {
      const height = device.height || 1;
      let gridRowStart;
      if (direction === "bottom-up") {
        const topU = device.slot + height - 1;
        gridRowStart = rackHeight - topU + 1;
      } else {
        gridRowStart = device.slot;
      }
      if (device.chassis) {
        return this._renderChassis(device, isGhost, unitHeight, height, gridRowStart);
      }
      const el = document.createElement("div");
      el.className = "rv-device";
      el.setAttribute("data-device-id", device.id);
      el.setAttribute("data-slot", device.slot);
      el.style.gridRow = `${gridRowStart} / span ${height}`;
      if (isGhost)
        el.classList.add("rv-device-ghost");
      if (this.rv.highlights.has(device.id))
        el.classList.add("rv-device-highlighted");
      this._applyDeviceStyle(el, device);
      const status = document.createElement("div");
      status.className = "rv-device-status";
      status.setAttribute("data-status", device.status || "unknown");
      el.appendChild(status);
      const labelContainer = document.createElement("div");
      labelContainer.className = "rv-device-label-container";
      const labelText = document.createElement("span");
      labelText.className = "rv-device-label";
      const format = this.rv.options.labelFormat || "label-first";
      const labelPart = device.label || device.id;
      const typePart = device.type || "";
      if (typePart) {
        if (format === "type-first") {
          labelText.innerHTML = `<span class="rv-device-type-inline">${escapeHtml(typePart)}</span><span class="rv-device-separator">\u25CF</span><span class="rv-device-name">${escapeHtml(labelPart)}</span>`;
        } else {
          labelText.innerHTML = `<span class="rv-device-name">${escapeHtml(labelPart)}</span><span class="rv-device-separator">\u25CF</span><span class="rv-device-type-inline">${escapeHtml(typePart)}</span>`;
        }
      } else {
        labelText.innerHTML = `<span class="rv-device-name">${escapeHtml(labelPart)}</span>`;
      }
      labelContainer.appendChild(labelText);
      el.appendChild(labelContainer);
      if (device.position && device.position !== "full" && !isGhost) {
        const badge = document.createElement("span");
        badge.className = "rv-device-position-badge";
        badge.textContent = device.position;
        el.appendChild(badge);
      }
      this._bindDeviceEvents(el, device);
      return el;
    }
    _renderChassis(device, isGhost, unitHeight, height, gridRowStart) {
      const chassis = device.chassis;
      const isExpanded = this.rv.expandedChassis.has(device.id);
      const el = document.createElement("div");
      el.className = "rv-chassis";
      el.setAttribute("data-device-id", device.id);
      el.setAttribute("data-chassis", "true");
      el.setAttribute("data-slot", device.slot);
      el.style.gridRow = `${gridRowStart} / span ${height}`;
      if (isExpanded)
        el.classList.add("rv-chassis-expanded");
      if (isGhost)
        el.classList.add("rv-device-ghost");
      if (this.rv.highlights.has(device.id))
        el.classList.add("rv-device-highlighted");
      const header = document.createElement("div");
      header.className = "rv-chassis-header";
      const toggle = document.createElement("span");
      toggle.className = "rv-chassis-toggle";
      toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';
      header.appendChild(toggle);
      const statusEl = document.createElement("div");
      statusEl.className = "rv-device-status";
      statusEl.setAttribute("data-status", device.status || "unknown");
      header.appendChild(statusEl);
      const info = document.createElement("div");
      info.className = "rv-device-label-container";
      const format = this.rv.options.labelFormat || "label-first";
      const labelPart = device.label || device.id;
      const typePart = `${device.type || "chassis"} \xB7 ${chassis.slots || 16} slots`;
      if (format === "type-first") {
        info.innerHTML = `<span class="rv-device-type-inline">${escapeHtml(typePart)}</span><span class="rv-device-separator">\u25CF</span><span class="rv-device-name">${escapeHtml(labelPart)}</span>`;
      } else {
        info.innerHTML = `<span class="rv-device-name">${escapeHtml(labelPart)}</span><span class="rv-device-separator">\u25CF</span><span class="rv-device-type-inline">${escapeHtml(typePart)}</span>`;
      }
      header.appendChild(info);
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        this.rv.toggleChassis(device.id);
        this.rv.emit("deviceClick", device, e);
      });
      this._bindDeviceEvents(header, device);
      el.appendChild(header);
      const body = document.createElement("div");
      body.className = "rv-chassis-body";
      const blades = chassis.blades || [];
      const totalSlots = chassis.slots || 16;
      for (let i = 1; i <= totalSlots; i++) {
        const blade = blades.find((b) => b.slot === i);
        body.appendChild(this._renderBlade(blade, i));
      }
      el.appendChild(body);
      return el;
    }
    _renderBlade(blade, slotNum) {
      const el = document.createElement("div");
      el.className = "rv-blade";
      if (!blade) {
        el.classList.add("rv-blade-empty");
        el.innerHTML = `<span class="rv-blade-slot">${slotNum}</span><span class="rv-blade-label">Empty</span>`;
        return el;
      }
      el.setAttribute("data-device-id", blade.id);
      const statusColor = this.rv.theme.status[blade.status] || this.rv.theme.status.unknown;
      el.style.borderLeftColor = statusColor;
      el.style.borderLeftWidth = "3px";
      el.style.borderLeftStyle = "solid";
      el.innerHTML = `<span class="rv-blade-slot">${slotNum}</span><span class="rv-blade-label">${escapeHtml(blade.label || blade.id)}</span>`;
      this._bindDeviceEvents(el, blade);
      return el;
    }
    _applyDeviceStyle(el, device) {
      const style = device.style;
      if (!style)
        return;
      if (style.background)
        el.style.background = style.background;
      if (style.border)
        el.style.borderColor = style.border;
      if (style.borderWidth)
        el.style.borderWidth = `${style.borderWidth}px`;
      if (style.glow)
        el.style.boxShadow = style.glow;
      if (style.opacity !== void 0)
        el.style.opacity = style.opacity;
      if (style.pattern === "stripes") {
        const patternColor = style.patternColor || "rgba(255,255,255,0.1)";
        const currentBg = style.background || this.rv.theme.device.background;
        el.style.background = `repeating-linear-gradient(45deg, transparent, transparent 4px, ${patternColor} 4px, ${patternColor} 8px), ${currentBg}`;
      }
    }
    _bindDeviceEvents(el, device) {
      const trigger = this.rv.options.tooltip.trigger;
      const tooltipEnabled = this.rv.options.tooltip.enabled;
      el.addEventListener("click", (e) => {
        if (tooltipEnabled && (trigger === "click" || trigger === "both")) {
          this.rv.tooltipManager.show(device, el);
        }
        this.rv.emit("deviceClick", device, e);
      });
      const nameEl = el.querySelector(".rv-device-name");
      if (nameEl) {
        nameEl.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          const name = device.label || device.id;
          navigator.clipboard.writeText(name).then(() => {
            this.rv.emit("deviceNameCopied", device, name);
            nameEl.classList.add("rv-copied");
            setTimeout(() => nameEl.classList.remove("rv-copied"), 300);
          }).catch(() => {
          });
        });
      }
      let scrollTimeout = null;
      el.addEventListener("mouseenter", (e) => {
        if (tooltipEnabled && (trigger === "hover" || trigger === "both")) {
          this.rv.tooltipManager.show(device, el);
        }
        this.rv.emit("deviceHover", device, e);
        const labelContainer = el.querySelector(".rv-device-label-container");
        const labelText = el.querySelector(".rv-device-label");
        if (labelContainer && labelText && labelText.scrollWidth > labelContainer.clientWidth) {
          scrollTimeout = setTimeout(() => {
            labelText.classList.add("rv-label-scrolling");
            const overflow = labelText.scrollWidth - labelContainer.clientWidth;
            labelText.style.setProperty("--scroll-distance", `-${overflow + 10}px`);
          }, 800);
          this.scrollingLabels.set(device.id, scrollTimeout);
        }
      });
      el.addEventListener("mouseleave", (e) => {
        if (trigger === "hover")
          this.rv.tooltipManager.hide();
        this.rv.emit("deviceLeave", device, e);
        const timeout = this.scrollingLabels.get(device.id);
        if (timeout) {
          clearTimeout(timeout);
          this.scrollingLabels.delete(device.id);
        }
        const labelText = el.querySelector(".rv-device-label");
        if (labelText) {
          labelText.classList.remove("rv-label-scrolling");
        }
      });
    }
    applyChanges(changes) {
      for (const change of changes.devices) {
        if (change.type === "update")
          this.updateDevice(change.id, change.props);
      }
    }
    updateDevice(deviceId, props) {
      const el = this.rv.rackContainer.querySelector(`[data-device-id="${deviceId}"]`);
      if (!el)
        return;
      if (props.status !== void 0) {
        const statusEl = el.querySelector(".rv-device-status");
        if (statusEl)
          statusEl.setAttribute("data-status", props.status);
      }
      if (props.label !== void 0) {
        const nameEl = el.querySelector(".rv-device-name");
        if (nameEl)
          nameEl.textContent = props.label;
      }
    }
    highlight(deviceId) {
      const el = this.rv.rackContainer.querySelector(`[data-device-id="${deviceId}"]`);
      if (el)
        el.classList.add("rv-device-highlighted");
    }
    highlightRack(rackId) {
      const el = this.rv.rackContainer.querySelector(`[data-rack-id="${rackId}"]`);
      if (el)
        el.classList.add("rv-rack-highlighted");
    }
    clearHighlight(id) {
      const el = this.rv.rackContainer.querySelector(`[data-device-id="${id}"], [data-rack-id="${id}"]`);
      if (el)
        el.classList.remove("rv-device-highlighted", "rv-rack-highlighted");
    }
    clearAllHighlights() {
      this.rv.rackContainer.querySelectorAll(".rv-device-highlighted, .rv-rack-highlighted").forEach((el) => {
        el.classList.remove("rv-device-highlighted", "rv-rack-highlighted");
      });
    }
    expandChassis(chassisId) {
      const el = this.rv.rackContainer.querySelector(`[data-device-id="${chassisId}"][data-chassis="true"]`);
      if (el)
        el.classList.add("rv-chassis-expanded");
    }
    collapseChassis(chassisId) {
      const el = this.rv.rackContainer.querySelector(`[data-device-id="${chassisId}"][data-chassis="true"]`);
      if (el)
        el.classList.remove("rv-chassis-expanded");
    }
  };

  // src/components/TooltipManager.js
  var TooltipManager = class {
    constructor(rackViz) {
      this.rv = rackViz;
      this.visible = false;
      this.hideTimeout = null;
      this.showTimeout = null;
    }
    show(device, targetEl) {
      const opts = this.rv.options.tooltip;
      if (!opts.enabled)
        return;
      clearTimeout(this.hideTimeout);
      clearTimeout(this.showTimeout);
      const delay = opts.trigger === "hover" ? opts.delay : 0;
      this.showTimeout = setTimeout(() => {
        this._render(device);
        this._position(targetEl);
        this.rv.tooltipEl.classList.add("rv-tooltip-visible");
        this.visible = true;
      }, delay);
    }
    hide() {
      clearTimeout(this.showTimeout);
      clearTimeout(this.hideTimeout);
      this.hideTimeout = setTimeout(() => {
        this.rv.tooltipEl.classList.remove("rv-tooltip-visible");
        this.visible = false;
      }, 50);
    }
    _render(device) {
      const el = this.rv.tooltipEl;
      const config = device.tooltip || {};
      let html = "";
      const title = config.title ? parseTemplate(config.title, device) : device.label || device.id;
      html += `<div class="rv-tooltip-title">${escapeHtml(title)}</div>`;
      if (config.fields) {
        html += '<div class="rv-tooltip-content">';
        for (const field of config.fields) {
          const value = parseTemplate(field.value, device);
          if (value && value !== "undefined") {
            html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">${escapeHtml(field.label)}</span><span class="rv-tooltip-value">${escapeHtml(value)}</span></div>`;
          }
        }
        html += "</div>";
      } else {
        html += '<div class="rv-tooltip-content">';
        html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">Status</span><span class="rv-tooltip-value">${device.status || "unknown"}</span></div>`;
        html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">Slot</span><span class="rv-tooltip-value">U${device.slot}${device.height > 1 ? "-U" + (device.slot + device.height - 1) : ""}</span></div>`;
        if (device.type) {
          html += `<div class="rv-tooltip-row"><span class="rv-tooltip-label">Type</span><span class="rv-tooltip-value">${device.type}</span></div>`;
        }
        html += "</div>";
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
  };

  // src/components/InfoPanel.js
  var InfoPanel = class {
    constructor(rackViz) {
      this.rv = rackViz;
      this.isOpen = false;
      this.currentRackId = null;
    }
    open(rackId) {
      if (!this.rv.options.infoPanel.enabled)
        return;
      this.isOpen = true;
      this.currentRackId = rackId || this.rv.data.racks[0]?.id;
      this._render();
      this.rv.infoPanelEl.classList.add("rv-info-panel-open");
      this.rv.emit("infoPanelOpen", this.currentRackId);
    }
    close() {
      this.isOpen = false;
      this.rv.infoPanelEl.classList.remove("rv-info-panel-open");
      this.rv.emit("infoPanelClose");
    }
    toggle(rackId) {
      if (this.isOpen && this.currentRackId === rackId) {
        this.close();
      } else {
        this.open(rackId);
      }
    }
    _render() {
      const rack = this.rv.getRack(this.currentRackId);
      if (!rack) {
        this.rv.infoPanelEl.innerHTML = '<div class="rv-info-panel-body">No rack selected</div>';
        return;
      }
      const devices = rack.devices || [];
      const height = rack.height || 42;
      const usedSlots = /* @__PURE__ */ new Set();
      let onlineCount = 0, offlineCount = 0, warningCount = 0;
      for (const device of devices) {
        const h = device.height || 1;
        for (let u = device.slot; u < device.slot + h; u++)
          usedSlots.add(u);
        if (device.status === "online")
          onlineCount++;
        else if (device.status === "offline")
          offlineCount++;
        else if (device.status === "warning" || device.status === "critical")
          warningCount++;
      }
      const usedU = usedSlots.size;
      const freeU = height - usedU;
      const utilization = Math.round(usedU / height * 100);
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
          <div class="rv-info-stat"><span class="rv-info-stat-label">\u{1F7E2} Online</span><span class="rv-info-stat-value">${onlineCount}</span></div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">\u{1F534} Offline</span><span class="rv-info-stat-value">${offlineCount}</span></div>
          <div class="rv-info-stat"><span class="rv-info-stat-label">\u{1F7E1} Warning</span><span class="rv-info-stat-value">${warningCount}</span></div>
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
      html += "</div></div></div>";
      this.rv.infoPanelEl.innerHTML = html;
      this.rv.infoPanelEl.querySelector(".rv-info-panel-close")?.addEventListener("click", () => this.close());
      this.rv.infoPanelEl.querySelectorAll(".rv-info-device-item").forEach((item) => {
        item.addEventListener("click", () => this.rv.highlight(item.getAttribute("data-device-id")));
      });
    }
  };

  // src/themes/default.js
  var defaultTheme = {
    name: "default-dark",
    colors: {
      background: "#0c0c0c",
      backgroundSecondary: "#161616",
      text: "#e8e8e8",
      textMuted: "#808080",
      border: "#2a2a2a",
      accent: "#3b82f6",
      accentHover: "#60a5fa"
    },
    status: {
      online: "#22c55e",
      offline: "#ef4444",
      idle: "#eab308",
      warning: "#f97316",
      critical: "#dc2626",
      maintenance: "#8b5cf6",
      provisioning: "#06b6d4",
      decommissioned: "#6b7280",
      unknown: "#6b7280"
    },
    typography: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontMono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      fontSize: 13
    },
    rack: {
      frame: "#1a1a1a",
      rail: "#222222",
      inner: "#0a0a0a",
      header: "#1e1e1e",
      unitMarker: "#4a4a4a",
      unitMarkerHighlight: "#6b6b6b",
      emptySlot: "#333333",
      shadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
      shadowHover: "0 6px 28px rgba(0, 0, 0, 0.6)",
      border: "#2a2a2a",
      borderRadius: 6
    },
    device: {
      background: "#1c1c1c",
      backgroundHover: "#262626",
      border: "#333333",
      borderHover: "#444444",
      borderWidth: 1,
      borderStyle: "solid",
      borderRadius: 4,
      shadow: "none",
      shadowHover: "0 2px 8px rgba(0, 0, 0, 0.4)"
    },
    tooltip: {
      background: "rgba(0, 0, 0, 0.95)",
      border: "#3a3a3a",
      borderRadius: 6,
      padding: 12,
      maxWidth: 320,
      minWidth: 160,
      fontSize: 12,
      shadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
      titleBorder: "#2a2a2a"
    },
    infoPanel: {
      background: "#0f0f0f",
      width: 320,
      shadow: "-4px 0 20px rgba(0, 0, 0, 0.4)",
      itemBackground: "rgba(255, 255, 255, 0.03)",
      itemBackgroundHover: "rgba(255, 255, 255, 0.06)"
    },
    controls: {
      background: "#1a1a1a",
      backgroundHover: "#2a2a2a",
      borderRadius: 4
    },
    airflow: {
      show: true,
      color: "#3b82f6",
      opacity: 0.4,
      arrowSize: 12
    },
    scrollbar: {
      width: 8,
      track: "transparent",
      thumb: "#3a3a3a",
      thumbHover: "#4a4a4a",
      borderRadius: 4
    }
  };
  var lightTheme = {
    name: "default-light",
    colors: {
      background: "#f5f5f5",
      backgroundSecondary: "#ffffff",
      text: "#1a1a1a",
      textMuted: "#666666",
      border: "#d0d0d0",
      accent: "#2563eb",
      accentHover: "#3b82f6"
    },
    status: {
      online: "#16a34a",
      offline: "#dc2626",
      idle: "#ca8a04",
      warning: "#ea580c",
      critical: "#b91c1c",
      maintenance: "#7c3aed",
      provisioning: "#0891b2",
      decommissioned: "#6b7280",
      unknown: "#6b7280"
    },
    typography: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontMono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      fontSize: 13
    },
    rack: {
      frame: "#e0e0e0",
      rail: "#d0d0d0",
      inner: "#f0f0f0",
      header: "#e8e8e8",
      unitMarker: "#999999",
      unitMarkerHighlight: "#666666",
      emptySlot: "#cccccc",
      shadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
      shadowHover: "0 6px 28px rgba(0, 0, 0, 0.15)",
      border: "#d0d0d0",
      borderRadius: 6
    },
    device: {
      background: "#ffffff",
      backgroundHover: "#f8f8f8",
      border: "#d0d0d0",
      borderHover: "#b0b0b0",
      borderWidth: 1,
      borderStyle: "solid",
      borderRadius: 4,
      shadow: "none",
      shadowHover: "0 2px 8px rgba(0, 0, 0, 0.1)"
    },
    tooltip: {
      background: "rgba(255, 255, 255, 0.98)",
      border: "#d0d0d0",
      borderRadius: 6,
      padding: 12,
      maxWidth: 320,
      minWidth: 160,
      fontSize: 12,
      shadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
      titleBorder: "#e0e0e0"
    },
    infoPanel: {
      background: "#ffffff",
      width: 320,
      shadow: "-4px 0 20px rgba(0, 0, 0, 0.1)",
      itemBackground: "rgba(0, 0, 0, 0.03)",
      itemBackgroundHover: "rgba(0, 0, 0, 0.06)"
    },
    controls: {
      background: "#ffffff",
      backgroundHover: "#f0f0f0",
      borderRadius: 4
    },
    airflow: {
      show: true,
      color: "#2563eb",
      opacity: 0.3,
      arrowSize: 12
    },
    scrollbar: {
      width: 8,
      track: "transparent",
      thumb: "#c0c0c0",
      thumbHover: "#a0a0a0",
      borderRadius: 4
    }
  };

  // src/core/RackViz.js
  var DEFAULT_OPTIONS = {
    view: "front",
    showViewToggle: true,
    showFullscreenToggle: true,
    showEmptySlots: true,
    unitNumbers: { show: true, position: "left", direction: "bottom-up" },
    showOppositeSide: "ghost",
    tooltip: { enabled: true, trigger: "hover", delay: 200, position: "auto" },
    infoPanel: { enabled: true },
    layout: "horizontal",
    rackSpacing: 16,
    labelFormat: "label-first",
    animate: true,
    animationDuration: 200,
    diffUpdates: true
  };
  var RackViz = class extends EventEmitter {
    constructor(container, options = {}) {
      super();
      this.container = typeof container === "string" ? document.querySelector(container) : container;
      if (!this.container)
        throw new Error("RackViz: Container not found");
      this.id = generateId("rv");
      this.options = deepMerge(DEFAULT_OPTIONS, options);
      if (isTouchDevice())
        this.options.tooltip.trigger = "click";
      this.theme = deepMerge(defaultTheme, options.theme || {});
      this.data = { racks: [] };
      this.currentView = this.options.view;
      this.isFullscreen = false;
      this.expandedChassis = /* @__PURE__ */ new Set();
      this.highlights = /* @__PURE__ */ new Set();
      this.scaleManager = new ScaleManager(this);
      this.diffEngine = new DiffEngine();
      this.renderer = new Renderer(this);
      this.tooltipManager = new TooltipManager(this);
      this.infoPanel = new InfoPanel(this);
      this._init();
    }
    _init() {
      this.container.classList.add("rv-container");
      this.container.setAttribute("data-rv-id", this.id);
      this._createStructure();
      this._injectStyles();
      this._setupResizeObserver();
      this._bindEvents();
      this.emit("init");
    }
    _createStructure() {
      this.root = document.createElement("div");
      this.root.className = "rv-root";
      this.infoPanelEl = document.createElement("div");
      this.infoPanelEl.className = "rv-info-panel";
      this.root.appendChild(this.infoPanelEl);
      this.viewport = document.createElement("div");
      this.viewport.className = "rv-viewport";
      this.rackContainer = document.createElement("div");
      this.rackContainer.className = "rv-racks";
      this.viewport.appendChild(this.rackContainer);
      this.root.appendChild(this.viewport);
      this.container.appendChild(this.root);
      this._createControls();
      this.tooltipEl = document.createElement("div");
      this.tooltipEl.className = "rv-tooltip";
      this.root.appendChild(this.tooltipEl);
    }
    _createControls() {
      this.controlsEl = document.createElement("div");
      this.controlsEl.className = "rv-controls";
      if (this.options.showViewToggle) {
        this.viewToggleBtn = this._createBtn("Toggle View", () => this.toggleView());
        this.viewToggleBtn.innerHTML = this._getViewIcon();
        this.controlsEl.appendChild(this.viewToggleBtn);
      }
      if (this.options.showFullscreenToggle) {
        this.fullscreenBtn = this._createBtn("Fullscreen", () => this.toggleFullscreen());
        this.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
        this.controlsEl.appendChild(this.fullscreenBtn);
      }
      this.root.appendChild(this.controlsEl);
    }
    _createBtn(title, onClick) {
      const btn = document.createElement("button");
      btn.className = "rv-btn";
      btn.title = title;
      btn.type = "button";
      btn.addEventListener("click", onClick);
      return btn;
    }
    _getViewIcon() {
      return this.currentView === "front" ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14h18V5H3zm16 12H5V7h14v10z"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14h18V5H3zm16 12H5V7h14v10zm-2-9h-2v8h2V8z"/></svg>';
    }
    _injectStyles() {
      const styleId = "rv-styles-" + this.id;
      if (document.getElementById(styleId))
        return;
      const style = document.createElement("style");
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
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.scaleManager.update(entry.contentRect);
          if (this.data.racks.length > 0) {
            this.renderer.render();
          }
          this.emit("resize", entry.contentRect);
        }
      });
      this.resizeObserver.observe(this.container);
    }
    _bindEvents() {
      document.addEventListener("fullscreenchange", () => {
        this.isFullscreen = !!document.fullscreenElement;
        this.emit("fullscreenChange", this.isFullscreen);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (this.infoPanel.isOpen)
            this.infoPanel.close();
          this.tooltipManager.hide();
        }
      });
      document.addEventListener("click", (e) => {
        if (this.options.tooltip.trigger === "click" && !e.target.closest(".rv-device, .rv-blade, .rv-tooltip, .rv-chassis-header")) {
          this.tooltipManager.hide();
        }
      });
    }
    // DATA
    load(data) {
      this.data = this._normalizeData(data);
      this.scaleManager.update();
      this.renderer.render();
      this.emit("load", this.data);
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
      this.emit("update", this.data);
      return this;
    }
    _normalizeData(data) {
      if (data.rack && !data.racks)
        return { racks: [data.rack] };
      return { racks: data.racks || [] };
    }
    // RACKS
    addRack(rackData) {
      const rack = { ...rackData };
      if (!rack.id)
        rack.id = generateId("rack");
      if (!rack.devices)
        rack.devices = [];
      this.data.racks.push(rack);
      this.scaleManager.update();
      this.renderer.render();
      this.emit("rackAdded", rack);
      return this;
    }
    updateRack(rackId, rackData) {
      const rack = this.data.racks.find((r) => r.id === rackId);
      if (!rack)
        return this;
      Object.assign(rack, rackData);
      this.renderer.render();
      this.emit("rackUpdated", rack);
      return this;
    }
    removeRack(rackId) {
      const index = this.data.racks.findIndex((r) => r.id === rackId);
      if (index === -1)
        return this;
      const removed = this.data.racks.splice(index, 1)[0];
      this.scaleManager.update();
      this.renderer.render();
      this.emit("rackRemoved", rackId, removed);
      return this;
    }
    getRack(rackId) {
      return this.data.racks.find((r) => r.id === rackId) || null;
    }
    // DEVICES
    addDevice(rackId, deviceData) {
      const rack = this.getRack(rackId);
      if (!rack)
        return this;
      const device = { ...deviceData };
      if (!device.id)
        device.id = generateId("dev");
      rack.devices.push(device);
      this.renderer.render();
      this.emit("deviceAdded", device, rackId);
      return this;
    }
    updateDevice(deviceId, deviceData) {
      const result = this._findDevice(deviceId);
      if (!result.device)
        return this;
      Object.assign(result.device, deviceData);
      if (deviceData.slot !== void 0 || deviceData.height !== void 0 || deviceData.position !== void 0) {
        this.renderer.render();
      } else {
        this.renderer.updateDevice(deviceId, deviceData);
      }
      this.emit("deviceUpdated", result.device, deviceData);
      return this;
    }
    removeDevice(deviceId) {
      const result = this._findDevice(deviceId);
      if (!result.device)
        return this;
      result.rack.devices.splice(result.index, 1);
      this.renderer.render();
      this.emit("deviceRemoved", deviceId, result.device);
      return this;
    }
    getDevice(deviceId) {
      return this._findDevice(deviceId).device || null;
    }
    _findDevice(deviceId) {
      for (const rack of this.data.racks) {
        const index = rack.devices.findIndex((d) => d.id === deviceId);
        if (index !== -1)
          return { device: rack.devices[index], rack, index };
        for (const device of rack.devices) {
          if (device.chassis?.blades) {
            const bi = device.chassis.blades.findIndex((b) => b.id === deviceId);
            if (bi !== -1)
              return { device: device.chassis.blades[bi], rack, index: bi, chassis: device };
          }
        }
      }
      return { device: null, rack: null, index: -1 };
    }
    // BLADES
    addBlade(chassisId, bladeData) {
      const result = this._findDevice(chassisId);
      if (!result.device?.chassis)
        return this;
      const blade = { ...bladeData };
      if (!blade.id)
        blade.id = generateId("blade");
      if (!result.device.chassis.blades)
        result.device.chassis.blades = [];
      result.device.chassis.blades.push(blade);
      this.renderer.render();
      this.emit("bladeAdded", blade, chassisId);
      return this;
    }
    removeBlade(bladeId) {
      for (const rack of this.data.racks) {
        for (const device of rack.devices) {
          if (device.chassis?.blades) {
            const index = device.chassis.blades.findIndex((b) => b.id === bladeId);
            if (index !== -1) {
              const removed = device.chassis.blades.splice(index, 1)[0];
              this.renderer.render();
              this.emit("bladeRemoved", bladeId, removed);
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
      this.emit("chassisExpand", chassisId);
      return this;
    }
    collapseChassis(chassisId) {
      this.expandedChassis.delete(chassisId);
      this.renderer.collapseChassis(chassisId);
      this.emit("chassisCollapse", chassisId);
      return this;
    }
    toggleChassis(chassisId) {
      if (this.expandedChassis.has(chassisId))
        this.collapseChassis(chassisId);
      else
        this.expandChassis(chassisId);
      return this;
    }
    // VIEW
    setView(view) {
      if (view !== "front" && view !== "rear")
        return this;
      if (view !== this.currentView) {
        this.currentView = view;
        if (this.viewToggleBtn)
          this.viewToggleBtn.innerHTML = this._getViewIcon();
        this.renderer.render();
        this.emit("viewChange", view);
      }
      return this;
    }
    toggleView() {
      return this.setView(this.currentView === "front" ? "rear" : "front");
    }
    getView() {
      return this.currentView;
    }
    // HIGHLIGHT
    highlight(deviceId) {
      this.highlights.add(deviceId);
      this.renderer.highlight(deviceId);
      const el = this.rackContainer.querySelector(`[data-device-id="${deviceId}"]`);
      if (el)
        el.scrollIntoView({ behavior: "smooth", block: "center" });
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
    openInfoPanel(rackId) {
      this.infoPanel.open(rackId);
      return this;
    }
    closeInfoPanel() {
      this.infoPanel.close();
      return this;
    }
    toggleInfoPanel(rackId) {
      this.infoPanel.toggle(rackId);
      return this;
    }
    // FULLSCREEN
    enterFullscreen() {
      if (!this.isFullscreen && this.container.requestFullscreen) {
        this.container.requestFullscreen();
        this.container.classList.add("rv-fullscreen");
      }
      return this;
    }
    exitFullscreen() {
      if (this.isFullscreen && document.exitFullscreen) {
        document.exitFullscreen();
        this.container.classList.remove("rv-fullscreen");
      }
      return this;
    }
    toggleFullscreen() {
      return this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
    }
    // THEME
    setTheme(theme) {
      this.theme = deepMerge(this.theme, theme);
      this.styleEl.textContent = this._generateStyles();
      this.renderer.render();
      this.emit("themeChange", this.theme);
      return this;
    }
    getTheme() {
      return this.theme;
    }
    // OPTIONS
    setOption(key, value) {
      if (key.includes(".")) {
        const parts = key.split(".");
        let obj = this.options;
        for (let i = 0; i < parts.length - 1; i++)
          obj = obj[parts[i]];
        obj[parts[parts.length - 1]] = value;
      } else {
        this.options[key] = value;
      }
      this.renderer.render();
      return this;
    }
    // SEARCH
    search(query) {
      if (!query) {
        this.clearHighlight();
        return this;
      }
      const q = query.toLowerCase();
      const matches = [];
      for (const rack of this.data.racks) {
        for (const device of rack.devices) {
          if (device.label?.toLowerCase().includes(q) || device.id?.toLowerCase().includes(q) || device.type?.toLowerCase().includes(q)) {
            matches.push(device.id);
          }
        }
      }
      this.clearHighlight();
      matches.forEach((id) => this.highlight(id));
      return this;
    }
    // LIFECYCLE
    render() {
      this.scaleManager.update();
      this.renderer.render();
      this.emit("render");
      return this;
    }
    destroy() {
      if (this.resizeObserver)
        this.resizeObserver.disconnect();
      if (this.tooltipManager)
        this.tooltipManager.destroy();
      if (this.styleEl)
        this.styleEl.remove();
      this.container.innerHTML = "";
      this.container.classList.remove("rv-container");
      this.container.removeAttribute("data-rv-id");
      this.emit("destroy");
      this.removeAllListeners();
    }
  };

  // src/index.js
  var themes = { dark: defaultTheme, light: lightTheme };
  var src_default = RackViz;
  return __toCommonJS(src_exports);
})();
return RackViz.default || RackViz;
}));
//# sourceMappingURL=rackviz.umd.js.map
