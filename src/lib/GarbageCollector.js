export default class GarbageCollector {
    static tryCollect () {
        if (global.gc) {
            console.log('collecting')
            // global.gc()
        }
    }
}
