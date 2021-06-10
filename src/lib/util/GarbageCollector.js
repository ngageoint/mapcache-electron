export function tryCollect () {
    if (global.gc) {
        global.gc()
    }
}
