import { createApp, isProxy, toRaw } from 'vue'
import App from './views/App.vue'
import router from './router'
import vuetify from '../../lib/vue/vuetify/vuetify' // path to vuetify export
import './styles/app.css'
import 'typeface-roboto/index.css'
import {
  setCreateCanvasFunction,
  setMakeImageDataFunction,
  setMakeImageFunction
} from '../../lib/util/canvas/CanvasUtilities'
import createMapCachePersistedStateWrapper from '../../lib/vue/vuex-electron/PersistedStateRenderer'
import createMapCacheSharedMutationsWrapper from '../../lib/vue/vuex-electron/SharedMutationsRenderer'
import { createStore } from 'vuex'
import modules from './store/modules'
import { ObserveVisibility } from 'vue-observe-visibility'
import sanitizeHTML from 'sanitize-html'
import Sortable from 'sortablejs'

if (window && window.log) {
    // update console log functions to utilize the window's log functions. Also, make sure we don't send anything too complicated otherwise it will error out.
    console.log = (message, ...optionalParams) => {
        window.log.log(JSON.stringify(message))
    }
    console.warn = (message, ...optionalParams) => {
        window.log.warn(JSON.stringify(message))
    }
    console.info = (message, ...optionalParams) => {
        window.log.info(JSON.stringify(message))
    }
    console.error = (message, ...optionalParams) => {
        window.log.error(JSON.stringify(message))
    }
    console.verbose = (message, ...optionalParams) => {
        // window.log.verbose(JSON.stringify(message))
    }
    console.debug = (message, ...optionalParams) => {
        // window.log.debug(JSON.stringify(message))
    }
    console.silly = (message, ...optionalParams) => {
        // window.log.silly(JSON.stringify(message))
    }
}

let createVuexStore = () => {
    return createStore({
        modules,
        plugins: [
            createMapCachePersistedStateWrapper({ throttle: 100 }),
            createMapCacheSharedMutationsWrapper(),
        ],
        strict: true
    })
}

let store = undefined

if (window.mapcache) {
    if (window.mapcache.setupGeoPackageContext != null) {
        window.mapcache.setupGeoPackageContext()
    }
    if (window.vuex) {
        let storeAttempts = 0
        while (store == null && storeAttempts < 3) {
            try {
                store = createVuexStore()
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                // eslint-disable-next-line no-console
                storeAttempts++
            }
        }

        if (store == null) {
            // eslint-disable-next-line no-console
            console.error('Unable to create vuex store. Exiting.')
            process.exit(0)
        }
    }

    // use BrowserCanvasAdapter in renderer processes
    setCreateCanvasFunction((width, height) => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        return canvas
    })

    setMakeImageDataFunction((width, height) => {
        return new ImageData(width, height)
    })

    setMakeImageFunction(async (source) => {
        return new Promise((resolve, reject) => {
            const image = new Image()
            image.onload = function () {
                resolve(image)
            }
            image.onerror = function (e) {
                reject(e)
            }
            image.src = source
        })
    })
}

/**
 * Vue 3 will wrap certain objects in a Proxy and that causes an error when calling preload functions.
 * @param obj
 * @return {*}
 */
window.deproxy = (obj) => {
    try {
        if (Array.isArray(obj)) {
            const deproxied = []
            obj.forEach(o => {
                deproxied.push(window.deproxy(o))
            })
            return deproxied
        } else if (typeof obj == "object") {
        let object = obj;
        if (isProxy(object)) {
            object = toRaw(object)
        }
        Object.keys(object).forEach(o => {
            object[o] = window.deproxy(object[o])
        })
        return object
        } else {
        return obj
        }
    } catch(e) {
        console.log("Unexpected value when running deproxy " + obj + "\n" + e)
    }
}


/* eslint-disable no-new */
const app = createApp(App).use(vuetify).use(router).use(store)
app.config.globalProperties.$sanitize = sanitizeHTML
app.config.globalProperties.showToolTips = false
app.config.productionTip = false
app.config.ignoredElements = [
    /^x-/
]
app.directive('observe-visibility', {
    beforeMount: (el, binding, vnode) => {
        vnode.context = binding.instance;
        ObserveVisibility.bind(el, binding, vnode);
    },
    update: ObserveVisibility.update,
    unmounted: ObserveVisibility.unbind,
});

// make v-sortable usable in all components
app.directive('sortable', {
    mounted: (el, binding) => {
        Sortable.create(el, binding.value ? {
            ...binding.value,
            handle: '.sortHandle',
            ghostClass: 'ghost',
            forceFallback: true,
            onChoose: function () {
                document.body.style.cursor = 'grabbing'
            }, // Dragging started
            onStart: function () {
                document.body.style.cursor = 'grabbing'
            }, // Dragging started
            onUnchoose: function () {
                document.body.style.cursor = 'default'
            }, // Dragging started
        } : {})
    }
})

app.mount('#app')

