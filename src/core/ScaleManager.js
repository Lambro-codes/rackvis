/**
 * Handles sizing and scaling calculations
 */
export class ScaleManager {
  constructor(rackViz) {
    this.rv = rackViz;
    this.containerRect = null;
    this.unitHeight = 22;
    this.rackWidth = 220;
    this.railWidth = 28;
  }
  
  update(rect) {
    if (rect) {
      this.containerRect = rect;
    } else if (this.rv.container) {
      this.containerRect = this.rv.container.getBoundingClientRect();
    }
    
    if (!this.containerRect || !this.rv.data?.racks?.length) return;
    
    this._calculate();
    this._apply();
  }
  
  _calculate() {
    const racks = this.rv.data.racks;
    const opts = this.rv.options;
    const padding = 48;
    
    const availWidth = this.containerRect.width - padding;
    const availHeight = this.containerRect.height - padding;
    
    const maxU = Math.max(...racks.map(r => r.height || 42));
    const rackCount = racks.length;
    const spacing = opts.rackSpacing;
    
    const cols = rackCount;
    const totalSpacing = spacing * (cols - 1);
    const widthPerRack = (availWidth - totalSpacing) / cols;
    
    this.rackWidth = Math.max(140, Math.min(380, widthPerRack));
    
    const rackBodyHeight = availHeight - 44;
    this.unitHeight = Math.max(14, Math.min(36, rackBodyHeight / maxU));
    
    this.railWidth = Math.max(24, Math.round(this.rackWidth * 0.11));
  }
  
  _apply() {
    const racks = this.rv.rackContainer?.querySelectorAll('.rv-rack');
    if (!racks) return;
    
    racks.forEach(rackEl => {
      rackEl.style.setProperty('--rv-unit-height', `${this.unitHeight}px`);
      rackEl.style.width = `${this.rackWidth}px`;
      
      rackEl.querySelectorAll('.rv-rail-unit').forEach(unit => {
        unit.style.height = `${this.unitHeight}px`;
      });
      
      rackEl.querySelectorAll('.rv-slot').forEach(slot => {
        const u = parseInt(slot.getAttribute('data-height') || '1', 10);
        slot.style.height = `${this.unitHeight * u}px`;
      });
    });
  }
}