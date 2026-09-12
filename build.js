import * as esbuild from 'esbuild';
import fs from 'fs';

const watch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Common options
const common = {
  entryPoints: ['src/index.js'],
  bundle: true,
  sourcemap: true,
};

// ESM build (for modern bundlers and <script type="module">)
const esmBuild = {
  ...common,
  format: 'esm',
  outfile: 'dist/rackviz.esm.js',
};

// IIFE build (for <script> tags)
const iifeBuild = {
  ...common,
  format: 'iife',
  globalName: 'RackViz',
  outfile: 'dist/rackviz.min.js',
  minify: true,
  // Export both default and named exports
  footer: {
    js: `
// Make named exports available
if (typeof window !== 'undefined') {
  var __RackVizNS = RackViz;
  window.RackViz = __RackVizNS.default || __RackVizNS;
  window.RackVizThemes = __RackVizNS.themes;
}
`
  }
};

// UMD-style build (works in Node, AMD, and browser)
const umdBuild = {
  ...common,
  format: 'iife',
  globalName: 'RackViz',
  outfile: 'dist/rackviz.umd.js',
  banner: {
    js: `(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RackViz = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {`
  },
  footer: {
    js: `return RackViz.default || RackViz;
}));`
  }
};

async function build() {
  try {
    console.log('Building RackViz...\n');

    // ESM
    await esbuild.build(esmBuild);
    console.log('✓ dist/rackviz.esm.js');

    // Minified IIFE
    await esbuild.build(iifeBuild);
    console.log('✓ dist/rackviz.min.js');

    // UMD
    await esbuild.build(umdBuild);
    console.log('✓ dist/rackviz.umd.js');

    // Get file sizes
    const files = ['rackviz.esm.js', 'rackviz.min.js', 'rackviz.umd.js'];
    console.log('\nBundle sizes:');
    for (const file of files) {
      const stats = fs.statSync(`dist/${file}`);
      const kb = (stats.size / 1024).toFixed(2);
      console.log(`  ${file}: ${kb} KB`);
    }

    console.log('\n✓ Build complete!');

    if (watch) {
      console.log('\nWatching for changes...');
      
      const contexts = await Promise.all([
        esbuild.context(esmBuild),
        esbuild.context(iifeBuild),
        esbuild.context(umdBuild),
      ]);
      
      await Promise.all(contexts.map(ctx => ctx.watch()));
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();