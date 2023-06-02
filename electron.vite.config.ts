import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({exclude: ['@ngageoint/geopackage/dist/canvaskit/canvaskit.js', 'fetch']})],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/electron/main.js'),
          mapcacheThread: resolve(__dirname, 'src/lib/threads/mapcacheThread.js')
        },
        output: {
          dir: 'dist-electron/main',
          format: 'cjs',
          manualChunks(id) {
            if (id.includes('lowdb')) {
              return 'lowdb'
            }
          }
        }
      },
      outDir: 'dist-electron/main'
    },
    resolve: {
      mainFields: ['module', 'main', 'browser'],
      browserField: false
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          mainPreload: resolve(__dirname, 'src/electron/preload/mainPreload.js'),
          projectPreload: resolve(__dirname, 'src/electron/preload/projectPreload.js'),
          featureTablePreload: resolve(__dirname, 'src/electron/preload/featureTablePreload.js'),
          userGuidePreload: resolve(__dirname, 'src/electron/preload/userGuidePreload.js'),
          workerPreload: resolve(__dirname, 'src/electron/preload/workerPreload.js')
        }
      },
      outDir: 'dist-electron/preload'
    },
    resolve: {
      mainFields: ['module', 'main', 'browser'],
      browserField: false
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'public/index.html')
        }
      },
      outDir: 'dist-electron/renderer'
    },
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
    ],
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis'
        },
        // Enable esbuild polyfill plugins
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true,
          })
        ]
      }
    },
  }
})
