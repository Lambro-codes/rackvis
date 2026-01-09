# RackViz

A lightweight, dependency-free JavaScript library for visualizing server rack diagrams. Built for data center management, infrastructure monitoring, and capacity planning applications.

## Features

- **Zero Dependencies** - Pure vanilla JavaScript, no external libraries required
- **Dynamic Sizing** - Automatically scales to fit container dimensions
- **Front/Rear Views** - Toggle between front and rear rack views with ghost device indicators
- **Blade Chassis Support** - Expandable blade enclosures with individual blade slots
- **Real-time Updates** - Efficient diff-based rendering for live status updates
- **Theming** - Built-in dark/light themes with full customization support
- **Interactive** - Tooltips, click events, highlighting, and search functionality
- **Responsive** - Works on desktop and mobile with touch support

## Installation

### Via CDN (Recommended)

```html
<!-- Minified version -->
<script src="https://cdn.jsdelivr.net/gh/Lambro-codes/rackvis@main/dist/rackviz.min.js"></script>

<!-- Or ES Module version -->
<script type="module">
  import RackViz from 'https://cdn.jsdelivr.net/gh/Lambro-codes/rackvis@main/dist/rackviz.esm.js';
</script>
```

### Manual Installation

1. Download or clone the repository
2. Copy the `dist/` folder to your project
3. Include the script:

```html
<!-- Option 1: Script tag (adds window.RackViz) -->
<script src="path/to/dist/rackviz.min.js"></script>

<!-- Option 2: ES Module -->
<script type="module">
  import RackViz from 'path/to/dist/rackviz.esm.js';
</script>
```

### Building from Source

If you want to modify the source and rebuild:

```bash
git clone https://github.com/Lambro-codes/rackvis.git
cd rackvis
npm install
npm run build
```

This creates the `dist/` folder with:
- `rackviz.min.js` - Minified, for `<script>` tags
- `rackviz.esm.js` - ES Module, for modern bundlers
- `rackviz.umd.js` - Universal, works everywhere

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #rack-container {
      width: 100%;
      height: 600px;
    }
  </style>
</head>
<body>
  <div id="rack-container"></div>
  
  <script src="https://cdn.jsdelivr.net/gh/Lambro-codes/rackvis@main/dist/rackviz.min.js"></script>
  <script>
    const rack = new RackViz('#rack-container');
    
    rack.load({
      racks: [{
        id: 'rack-01',
        label: 'Production Rack',
        height: 42,
        devices: [
          { id: 'sw-01', slot: 1, height: 1, label: 'Core Switch', type: 'switch', status: 'online' },
          { id: 'srv-01', slot: 3, height: 2, label: 'Web Server 01', type: 'server', status: 'online' },
          { id: 'srv-02', slot: 5, height: 2, label: 'Web Server 02', type: 'server', status: 'warning' },
          { id: 'storage', slot: 10, height: 4, label: 'Storage Array', type: 'storage', status: 'online' }
        ]
      }]
    });
  </script>
</body>
</html>
```

## Data Structure

### Rack Object

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | Yes | - | Unique identifier for the rack |
| `label` | string | No | `id` | Display name shown in rack header |
| `height` | number | No | `42` | Total rack units (U) |
| `devices` | array | No | `[]` | Array of device objects |

### Device Object

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | Yes | - | Unique identifier for the device |
| `slot` | number | Yes | - | Starting U position (1-based, from bottom) |
| `height` | number | No | `1` | Device height in rack units |
| `label` | string | No | `id` | Display name |
| `type` | string | No | - | Device type (switch, server, storage, etc.) |
| `status` | string | No | `'unknown'` | Device status (see Status Values) |
| `position` | string | No | `'full'` | `'front'`, `'rear'`, or `'full'` |
| `style` | object | No | - | Custom styling (see Device Styling) |
| `chassis` | object | No | - | Blade chassis configuration |

### Status Values

| Status | Description | Default Color |
|--------|-------------|---------------|
| `online` | Device is operational | Green (#22c55e) |
| `offline` | Device is not responding | Red (#ef4444) |
| `idle` | Device is idle/standby | Blue (#3b82f6) |
| `warning` | Device has warnings | Orange (#f97316) |
| `critical` | Device has critical issues | Red (#dc2626) |
| `maintenance` | Device is under maintenance | Purple (#8b5cf6) |
| `provisioning` | Device is being provisioned | Cyan (#06b6d4) |
| `decommissioned` | Device is decommissioned | Gray (#6b7280) |
| `unknown` | Status unknown | Gray (#6b7280) |

### Blade Chassis

```javascript
{
  id: 'chassis-01',
  slot: 15,
  height: 10,
  label: 'Blade Enclosure',
  type: 'blade-chassis',
  status: 'online',
  chassis: {
    slots: 16,  // Total blade slots
    blades: [
      { id: 'blade-01', slot: 1, label: 'Blade 1', status: 'online' },
      { id: 'blade-02', slot: 2, label: 'Blade 2', status: 'online' },
      // slot 3 empty
      { id: 'blade-04', slot: 4, label: 'Blade 4', status: 'warning' }
    ]
  }
}
```

## Configuration Options

```javascript
const rack = new RackViz('#container', {
  // View settings
  view: 'front',                    // Initial view: 'front' or 'rear'
  showViewToggle: true,             // Show front/rear toggle button
  showFullscreenToggle: true,       // Show fullscreen button
  showEmptySlots: true,             // Show empty slot indicators
  showOppositeSide: 'ghost',        // How to show devices on opposite side: 'ghost', 'hide', or 'show'
  
  // Unit numbers
  unitNumbers: {
    show: true,                     // Show U numbers on rail
    position: 'left',               // 'left', 'right', or 'both'
    direction: 'bottom-up'          // 'bottom-up' or 'top-down'
  },
  
  // Tooltips
  tooltip: {
    enabled: true,                  // Enable tooltips
    trigger: 'hover',               // 'hover', 'click', or 'both'
    delay: 200,                     // Delay before showing (ms)
    position: 'auto'                // Tooltip position
  },
  
  // Info panel
  infoPanel: {
    enabled: true                   // Enable rack info panel
  },
  
  // Layout
  layout: 'horizontal',             // Rack arrangement: 'horizontal' or 'vertical'
  rackSpacing: 16,                  // Space between racks (px)
  labelFormat: 'label-first',       // 'label-first' or 'type-first'
  
  // Animation
  animate: true,                    // Enable animations
  animationDuration: 200,           // Animation duration (ms)
  
  // Performance
  diffUpdates: true                 // Use diff-based updates for better performance
});
```

## API Reference

### Constructor

```javascript
const rack = new RackViz(container, options);
```

- `container` - CSS selector string or DOM element
- `options` - Configuration options object (optional)

### Data Methods

#### `load(data)`
Load rack data and render. Replaces any existing data.

```javascript
rack.load({
  racks: [{ id: 'rack-01', height: 42, devices: [...] }]
});
```

#### `update(data)`
Update rack data with diff-based rendering for efficiency.

```javascript
rack.update({
  racks: [{ id: 'rack-01', height: 42, devices: [...] }]
});
```

### Rack Methods

#### `addRack(rackData)`
Add a new rack.

```javascript
rack.addRack({
  id: 'rack-02',
  label: 'New Rack',
  height: 42,
  devices: []
});
```

#### `updateRack(rackId, rackData)`
Update rack properties.

```javascript
rack.updateRack('rack-01', { label: 'Updated Label' });
```

#### `removeRack(rackId)`
Remove a rack.

```javascript
rack.removeRack('rack-02');
```

#### `getRack(rackId)`
Get rack data by ID.

```javascript
const rackData = rack.getRack('rack-01');
```

### Device Methods

#### `addDevice(rackId, deviceData)`
Add a device to a rack.

```javascript
rack.addDevice('rack-01', {
  id: 'new-server',
  slot: 20,
  height: 2,
  label: 'New Server',
  type: 'server',
  status: 'provisioning'
});
```

#### `updateDevice(deviceId, deviceData)`
Update device properties. Efficient for status updates.

```javascript
rack.updateDevice('srv-01', { status: 'warning' });
rack.updateDevice('srv-02', { label: 'Renamed Server', status: 'online' });
```

#### `removeDevice(deviceId)`
Remove a device.

```javascript
rack.removeDevice('old-server');
```

#### `getDevice(deviceId)`
Get device data by ID.

```javascript
const device = rack.getDevice('srv-01');
```

### Blade Methods

#### `addBlade(chassisId, bladeData)`
Add a blade to a chassis.

```javascript
rack.addBlade('chassis-01', {
  id: 'blade-new',
  slot: 5,
  label: 'New Blade',
  status: 'provisioning'
});
```

#### `removeBlade(bladeId)`
Remove a blade from its chassis.

```javascript
rack.removeBlade('blade-05');
```

#### `expandChassis(chassisId)` / `collapseChassis(chassisId)` / `toggleChassis(chassisId)`
Control blade chassis expansion.

```javascript
rack.expandChassis('chassis-01');
rack.collapseChassis('chassis-01');
rack.toggleChassis('chassis-01');
```

### View Methods

#### `setView(view)` / `toggleView()` / `getView()`
Control front/rear view.

```javascript
rack.setView('rear');
rack.toggleView();
const currentView = rack.getView(); // 'front' or 'rear'
```

### Highlight Methods

#### `highlight(deviceId)`
Highlight a device and scroll it into view.

```javascript
rack.highlight('srv-01');
```

#### `highlightRack(rackId)`
Highlight an entire rack.

```javascript
rack.highlightRack('rack-01');
```

#### `clearHighlight(id?)`
Clear highlight from a specific item or all items.

```javascript
rack.clearHighlight('srv-01');  // Clear specific
rack.clearHighlight();          // Clear all
```

### Search

#### `search(query)`
Search devices by label, ID, or type. Highlights matching devices.

```javascript
rack.search('server');    // Highlight all devices matching "server"
rack.search('');          // Clear search (unhighlight all)
```

### Info Panel

```javascript
rack.openInfoPanel('rack-01');
rack.closeInfoPanel();
rack.toggleInfoPanel('rack-01');
```

### Fullscreen

```javascript
rack.enterFullscreen();
rack.exitFullscreen();
rack.toggleFullscreen();
```

### Theme Methods

#### `setTheme(theme)`
Apply a theme or theme overrides.

```javascript
// Apply built-in light theme
rack.setTheme(RackVizThemes.light);

// Apply custom overrides
rack.setTheme({
  colors: {
    accent: '#ff6b6b'
  },
  status: {
    online: '#00ff00'
  }
});
```

#### `getTheme()`
Get current theme configuration.

```javascript
const theme = rack.getTheme();
```

### Options

#### `setOption(key, value)`
Update a configuration option at runtime.

```javascript
rack.setOption('showEmptySlots', false);
rack.setOption('tooltip.enabled', false);
rack.setOption('labelFormat', 'type-first');
```

### Lifecycle

#### `render()`
Force a full re-render.

```javascript
rack.render();
```

#### `destroy()`
Clean up and remove the RackViz instance.

```javascript
rack.destroy();
```

## Events

RackViz fires various events you can listen to.

### Subscribing to Events

```javascript
// Subscribe
rack.on('deviceClick', (device, event) => {
  console.log('Clicked:', device.label);
});

// Subscribe once
rack.once('load', (data) => {
  console.log('Data loaded');
});

// Unsubscribe
const handler = (device) => console.log(device);
rack.on('deviceClick', handler);
rack.off('deviceClick', handler);
```

### Available Events

| Event | Arguments | Description |
|-------|-----------|-------------|
| `init` | - | RackViz initialized |
| `load` | `data` | Data loaded |
| `update` | `data` | Data updated |
| `render` | - | Render completed |
| `resize` | `rect` | Container resized |
| `destroy` | - | Instance destroyed |
| `deviceClick` | `device, event` | Device clicked |
| `deviceHover` | `device, event` | Mouse entered device |
| `deviceLeave` | `device, event` | Mouse left device |
| `deviceNameCopied` | `device, name` | Device name double-clicked and copied |
| `rackClick` | `rack, event` | Rack header clicked |
| `emptySlotClick` | `rackId, slot, event` | Empty slot clicked |
| `viewChange` | `view` | View changed (front/rear) |
| `fullscreenChange` | `isFullscreen` | Fullscreen state changed |
| `chassisExpand` | `chassisId` | Blade chassis expanded |
| `chassisCollapse` | `chassisId` | Blade chassis collapsed |
| `themeChange` | `theme` | Theme changed |
| `rackAdded` | `rack` | Rack added |
| `rackUpdated` | `rack` | Rack updated |
| `rackRemoved` | `rackId, rack` | Rack removed |
| `deviceAdded` | `device, rackId` | Device added |
| `deviceUpdated` | `device, changes` | Device updated |
| `deviceRemoved` | `deviceId, device` | Device removed |
| `bladeAdded` | `blade, chassisId` | Blade added |
| `bladeRemoved` | `bladeId, blade` | Blade removed |

### Event Examples

```javascript
// Log all device clicks
rack.on('deviceClick', (device, event) => {
  console.log(`Device clicked: ${device.label} (${device.status})`);
});

// Handle empty slot clicks for adding devices
rack.on('emptySlotClick', (rackId, slot, event) => {
  console.log(`Empty slot ${slot} clicked in rack ${rackId}`);
});

// Copy device name notification
rack.on('deviceNameCopied', (device, name) => {
  alert(`Copied: ${name}`);
});
```

## Theming

### Built-in Themes

```javascript
// Dark theme (default)
rack.setTheme(RackVizThemes.dark);

// Light theme
rack.setTheme(RackVizThemes.light);
```

### Custom Theme

```javascript
rack.setTheme({
  colors: {
    background: '#0a0a0a',
    text: '#e0e0e0',
    textMuted: '#888888',
    border: '#2a2a2a',
    accent: '#3b82f6'
  },
  
  status: {
    online: '#22c55e',
    offline: '#ef4444',
    warning: '#f97316',
    critical: '#dc2626',
    maintenance: '#8b5cf6'
  },
  
  device: {
    background: '#1a1a1a',
    backgroundHover: '#222222',
    border: '#333333',
    borderHover: '#3b82f6'
  }
});
```

## Device Styling

Individual devices can have custom styles:

```javascript
{
  id: 'firewall',
  slot: 5,
  height: 2,
  label: 'Edge Firewall',
  type: 'firewall',
  style: {
    background: '#3d1a1a',
    border: '#6a2a2a'
  }
}

// GPU server with gradient
{
  id: 'gpu-server',
  slot: 20,
  height: 4,
  label: 'GPU Compute',
  style: {
    background: 'linear-gradient(135deg, #1a1a2e, #2d1a3d)',
    border: '#76b900'
  }
}

// Maintenance mode with stripes
{
  id: 'maint-server',
  slot: 30,
  height: 2,
  label: 'Server (Maintenance)',
  status: 'maintenance',
  style: {
    pattern: 'stripes',
    patternColor: 'rgba(139, 92, 246, 0.3)',
    border: '#8b5cf6'
  }
}
```

## Real-time Updates

```javascript
// Efficient status update
rack.updateDevice('srv-01', { status: 'warning' });

// Polling example
setInterval(async () => {
  const statuses = await fetch('/api/device-status').then(r => r.json());
  for (const { id, status } of statuses) {
    rack.updateDevice(id, { status });
  }
}, 5000);

// WebSocket example
const ws = new WebSocket('wss://your-server/status');
ws.onmessage = (event) => {
  const { deviceId, status } = JSON.parse(event.data);
  rack.updateDevice(deviceId, { status });
};
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT License
