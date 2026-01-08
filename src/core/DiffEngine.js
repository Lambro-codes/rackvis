/**
 * Detects changes between data states for efficient updates
 */
export class DiffEngine {
  constructor() {
    this.inPlaceProps = new Set(['status', 'label', 'specs', 'tooltip', 'meta', 'tags']);
    this.reRenderProps = new Set(['slot', 'height', 'position', 'chassis']);
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
        result.changes.push({ id, type: 'update', props });
      }
    }
    
    return result;
  }
  
  _indexById(arr) {
    const map = new Map();
    for (const item of arr) {
      if (item.id) map.set(item.id, item);
    }
    return map;
  }
}