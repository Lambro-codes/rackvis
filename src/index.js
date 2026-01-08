/**
 * RackViz - Server Rack Visualization Library
 */

import { RackViz } from './core/RackViz.js';
import { defaultTheme, lightTheme } from './themes/default.js';

export { RackViz };
export const themes = { dark: defaultTheme, light: lightTheme };
export default RackViz;