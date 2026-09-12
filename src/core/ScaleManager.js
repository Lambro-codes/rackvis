/**
 * Handles sizing and scaling calculations
 */
export class ScaleManager {
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
    
    if (!this.containerRect || !this.rv.data?.racks?.length) return;
    
    this._calculate();
  }
  
  _calculate() {
    const racks = this.rv.data.racks;
    const opts = this.rv.options;
    const padding = 30;
    
    const availWidth = this.containerRect.width - padding;
    const availHeight = this.containerRect.height - padding;
    
    // Find the tallest rack
    const maxU = Math.max(...racks.map(r => r.height || 42));
    const rackCount = racks.length;
    const spacing = opts.rackSpacing;
    
    // Calculate rack width
    const totalSpacing = spacing * (rackCount - 1);
    const widthPerRack = (availWidth - totalSpacing) / rackCount;
    this.rackWidth = Math.max(200, Math.min(350, widthPerRack));
    
    // Calculate unit height to fill available space
    // Header is ~32px
    const headerHeight = 32;
    const rackBodyHeight = availHeight - headerHeight;
    
    // Use as much height as possible
    this.unitHeight = Math.floor(rackBodyHeight / maxU);
    
    // Clamp to reasonable range - allow taller units now, but never force overflow past
    // the container: a hard 14px floor here caused racks with many U's to always be
    // taller than a shorter container regardless of the container's own size.
    this.unitHeight = Math.max(4, Math.min(28, this.unitHeight));
  }
  
  getUnitHeight() {
    return this.unitHeight;
  }
  
  getRackWidth() {
    return this.rackWidth;
  }
}