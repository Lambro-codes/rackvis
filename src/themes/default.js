/**
 * RackViz Themes
 */

export const defaultTheme = {
  name: 'default-dark',
  
  colors: {
    background: '#0c0c0c',
    backgroundSecondary: '#161616',
    text: '#e8e8e8',
    textMuted: '#808080',
    border: '#2a2a2a',
    accent: '#3b82f6',
    accentHover: '#60a5fa'
  },
  
  status: {
    online: '#22c55e',
    offline: '#ef4444',
    idle: '#eab308',
    warning: '#f97316',
    critical: '#dc2626',
    maintenance: '#8b5cf6',
    provisioning: '#06b6d4',
    decommissioned: '#6b7280',
    unknown: '#6b7280'
  },
  
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 13
  },
  
  rack: {
    frame: '#1a1a1a',
    rail: '#222222',
    inner: '#0a0a0a',
    header: '#1e1e1e',
    unitMarker: '#4a4a4a',
    unitMarkerHighlight: '#6b6b6b',
    emptySlot: '#333333',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    shadowHover: '0 6px 28px rgba(0, 0, 0, 0.6)',
    border: '#2a2a2a',
    borderRadius: 6
  },
  
  device: {
    background: '#1c1c1c',
    backgroundHover: '#262626',
    border: '#333333',
    borderHover: '#444444',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
    shadow: 'none',
    shadowHover: '0 2px 8px rgba(0, 0, 0, 0.4)'
  },
  
  tooltip: {
    background: 'rgba(0, 0, 0, 0.95)',
    border: '#3a3a3a',
    borderRadius: 6,
    padding: 12,
    maxWidth: 320,
    minWidth: 160,
    fontSize: 12,
    shadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
    titleBorder: '#2a2a2a'
  },
  
  infoPanel: {
    background: '#0f0f0f',
    width: 320,
    shadow: '-4px 0 20px rgba(0, 0, 0, 0.4)',
    itemBackground: 'rgba(255, 255, 255, 0.03)',
    itemBackgroundHover: 'rgba(255, 255, 255, 0.06)'
  },
  
  controls: {
    background: '#1a1a1a',
    backgroundHover: '#2a2a2a',
    borderRadius: 4
  },
  
  airflow: {
    show: true,
    color: '#3b82f6',
    opacity: 0.4,
    arrowSize: 12
  },
  
  scrollbar: {
    width: 8,
    track: 'transparent',
    thumb: '#3a3a3a',
    thumbHover: '#4a4a4a',
    borderRadius: 4
  }
};

export const lightTheme = {
  name: 'default-light',
  
  colors: {
    background: '#f5f5f5',
    backgroundSecondary: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#666666',
    border: '#d0d0d0',
    accent: '#2563eb',
    accentHover: '#3b82f6'
  },
  
  status: {
    online: '#16a34a',
    offline: '#dc2626',
    idle: '#ca8a04',
    warning: '#ea580c',
    critical: '#b91c1c',
    maintenance: '#7c3aed',
    provisioning: '#0891b2',
    decommissioned: '#6b7280',
    unknown: '#6b7280'
  },
  
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 13
  },
  
  rack: {
    frame: '#e0e0e0',
    rail: '#d0d0d0',
    inner: '#f0f0f0',
    header: '#e8e8e8',
    unitMarker: '#999999',
    unitMarkerHighlight: '#666666',
    emptySlot: '#cccccc',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    shadowHover: '0 6px 28px rgba(0, 0, 0, 0.15)',
    border: '#d0d0d0',
    borderRadius: 6
  },
  
  device: {
    background: '#ffffff',
    backgroundHover: '#f8f8f8',
    border: '#d0d0d0',
    borderHover: '#b0b0b0',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
    shadow: 'none',
    shadowHover: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  tooltip: {
    background: 'rgba(255, 255, 255, 0.98)',
    border: '#d0d0d0',
    borderRadius: 6,
    padding: 12,
    maxWidth: 320,
    minWidth: 160,
    fontSize: 12,
    shadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
    titleBorder: '#e0e0e0'
  },
  
  infoPanel: {
    background: '#ffffff',
    width: 320,
    shadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
    itemBackground: 'rgba(0, 0, 0, 0.03)',
    itemBackgroundHover: 'rgba(0, 0, 0, 0.06)'
  },
  
  controls: {
    background: '#ffffff',
    backgroundHover: '#f0f0f0',
    borderRadius: 4
  },
  
  airflow: {
    show: true,
    color: '#2563eb',
    opacity: 0.3,
    arrowSize: 12
  },
  
  scrollbar: {
    width: 8,
    track: 'transparent',
    thumb: '#c0c0c0',
    thumbHover: '#a0a0a0',
    borderRadius: 4
  }
};