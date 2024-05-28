// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin, splitVendorChunkPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
var __electron_vite_injected_dirname = "/Users/tylerburgett/Code/NGA/desktop/mapcache-electron";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["@ngageoint/geopackage/dist/canvaskit/canvaskit.js", "fetch"] })],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/main/main.js"),
          mapcacheThread: resolve(__electron_vite_injected_dirname, "src/lib/threads/mapcacheThread.js")
        },
        output: {
          dir: "dist/main",
          format: "cjs"
        }
      },
      outDir: "dist/main"
    },
    resolve: {
      mainFields: ["module", "main", "browser"],
      browserField: false
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          mainPreload: resolve(__electron_vite_injected_dirname, "src/preload/mainPreload.js"),
          projectPreload: resolve(__electron_vite_injected_dirname, "src/preload/projectPreload.js"),
          featureTablePreload: resolve(__electron_vite_injected_dirname, "src/preload/featureTablePreload.js"),
          userGuidePreload: resolve(__electron_vite_injected_dirname, "src/preload/userGuidePreload.js"),
          workerPreload: resolve(__electron_vite_injected_dirname, "src/preload/workerPreload.js")
        }
      },
      outDir: "dist/preload"
    },
    resolve: {
      mainFields: ["module", "main", "browser"],
      browserField: false
    }
  },
  renderer: {
    root: "src/renderer",
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    build: {
      outDir: "dist/renderer",
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/renderer/index.html"),
          loader: resolve(__electron_vite_injected_dirname, "src/renderer/loader.html")
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
          global: "globalThis"
        },
        // Enable esbuild polyfill plugins
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true
          })
        ]
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
