import NetworkTileLayer from "../layer/tile/NetworkTileLayer"

export default class SlowServerNotifier {
    constructor () {
        this.slowResponseCounts = {}
        this.timeBefore = {}
        this.slowLayers = {}
    } 

    beforeRender(layer) {
        if(layer instanceof NetworkTileLayer) {
            this.timeBefore[layer.sourceLayerName] = new Date().getTime()
        }
    }

    afterRender(layer) {
        if(layer instanceof NetworkTileLayer) {
            const timeAfter = new Date().getTime()
            if(timeAfter - this.timeBefore[layer.sourceLayerName] >= layer.timeoutMs) {
                let timeoutCount = this.slowResponseCounts[layer.sourceLayerName]
                if(!timeoutCount) {
                    timeoutCount = 0
                }

                timeoutCount++
                this.slowResponseCounts[layer.sourceLayerName] =  timeoutCount
                if(timeoutCount >= 10) {
                    this.slowLayers[layer.sourceLayerName] = layer
                }
            }
        }
    }

    applyWarningMessage(status) {
        status.warning = ""
        const count = Object.keys(this.slowLayers).length
        if(count > 0) {
            status.warning += "Downloads from the data source"
            if(count == 1) {
                status.warning += " "
            } else {
                status.warning += "s "
            }
        }

        let index = 0;
        for(const layerName in this.slowLayers) {
            if(count > 1 && index == count - 1) {
                status.warning += " and "
            }
            status.warning += layerName;

            if(count > 2 && index < count - 1) {
                status.warning += ", "
            }

            index++
        }

        if(count > 0) {
            status.warning += " are taking a long time.  Either your connection is poor or the "

            if(count == 1) {
                status.warning += "data source's "
            } else {
                status.warning += "data sources' "
            }

            status.warning += "performance is slow."
        }
    }
}
