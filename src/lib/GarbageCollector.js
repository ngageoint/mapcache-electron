export default class GarbageCollector {
    static tryCollect () {
        if (global.gc) {
            global.gc()
        }
    }
}
