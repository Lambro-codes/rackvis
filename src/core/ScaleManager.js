/**
 * Handles sizing and scaling calculations
 */
export class ScaleManager {
  constructor(rackViz) {
    this.rv = rackViz;
    this.containerRect = null;
    this.unitHeight = 20;
    this.rackWidth = 240;
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
    const padding = 40;
    
    const availWidth = this.containerRect.width - padding;
    const availHeight = this.containerRect.height - padding;
    
    // Find the tallest rack
    const maxU = Math.max(...racks.map(r => r.height || 42));
    const rackCount = racks.length;
    const spacing = opts.rackSpacing;
    
    // Calculate rack width
    const totalSpacing = spacing * (rackCount - 1);
    const widthPerRack = (availWidth - totalSpacing) / rackCount;
    this.rackWidth = Math.max(180, Math.min(300, widthPerRack));
    
    // Calculate unit height to fit on screen
    // Header is ~36px, so rack body height = availHeight - 36
    const headerHeight = 36;
    const rackBodyHeight = availHeight - headerHeight;
    
    // Each U needs exactly this many pixels
    this.unitHeight = Math.floor(rackBodyHeight / maxU);
    
    // Clamp to reasonable range
    this.unitHeight = Math.max(16, Math.min(24, this.unitHeight));
  }
  
  getUnitHeight() {
    return this.unitHeight;
  }
  
  getRackWidth() {
    return this.rackWidth;
  }
}