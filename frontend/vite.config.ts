import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers for smaller bundle
    target: 'esnext',

    // Enable minification
    minify: 'esbuild',

    // Source maps for production debugging (can be disabled for smaller builds)
    sourcemap: false,

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Roll up options for code splitting
    rollupOptions: {
      output: {
        // Manual chunks for vendor splitting
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],

          // UI components
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
          ],

          // Data fetching
          'query-vendor': ['@tanstack/react-query'],

          // Icons
          'icons-vendor': ['lucide-react', '@radix-ui/react-icons'],

          // Utilities
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },

        // Asset file names with hash
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }

          return `assets/[name]-[hash][extname]`
        },

        // Chunk file names with hash
        chunkFileNames: 'assets/js/[name]-[hash].js',

        // Entry file names with hash
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // CSS code splitting
    cssCodeSplit: true,

    // Report compressed size
    reportCompressedSize: true,

    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },

  // Server configuration
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },

  // Preview configuration
  preview: {
    port: 5173,
    host: true,
    strictPort: true,
  },
})
