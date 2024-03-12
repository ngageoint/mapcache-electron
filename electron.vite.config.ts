import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, splitVendorChunkPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({exclude: ['@ngageoint/geopackage/dist/canvaskit/canvaskit.js', 'fetch']})],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/main.js'),
          mapcacheThread: resolve(__dirname, 'src/lib/threads/mapcacheThread.js')
        },
        output: {
          dir: 'dist/main',
          format: 'cjs'
        }
      },
      outDir: 'dist/main'
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
          mainPreload: resolve(__dirname, 'src/preload/mainPreload.js'),
          projectPreload: resolve(__dirname, 'src/preload/projectPreload.js'),
          featureTablePreload: resolve(__dirname, 'src/preload/featureTablePreload.js'),
          userGuidePreload: resolve(__dirname, 'src/preload/userGuidePreload.js'),
          workerPreload: resolve(__dirname, 'src/preload/workerPreload.js')
        }
      },
      outDir: 'dist/preload'
    },
    resolve: {
      mainFields: ['module', 'main', 'browser'],
      browserField: false
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          loader: resolve(__dirname, 'src/renderer/loader.html')
        }
      }
    },
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
      splitVendorChunkPlugin()
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
