import {L} from '../../vendor'
import isNil from 'lodash/isNil'
import domtoimage from 'dom-to-image-more'
export default class LeafletSnapshot extends L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  onAdd (map) {
    this.map = map
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    this._link = L.DomUtil.create('a', 'leaflet-control-zoom-indicator', container)
    this._link.title = 'Map Screenshot'
    this._link.innerHTML = `<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M20,4H16.83L15,2H9L7.17,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,18H4V6H8.05L9.88,4H14.12L15.95,6H20V18M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15Z" /></svg>`
    this._link.onclick = async () => {
      await this.printMap(this.map)
    }
    return container
  }

  disable () {
    this._link.onclick = function () {}
    L.DomUtil.addClass(this._link, 'leaflet-control-disabled')
  }

  enable () {
    this._link.onclick = async () => {
      await this.printMap(this.map)
    }
    L.DomUtil.removeClass(this._link, 'leaflet-control-disabled')
  }

  loadImage (context, src, tilePosition, width, height) {
    return new Promise(resolve => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'
      image.onload = function () {
        context.drawImage(image, tilePosition.x, tilePosition.y, width ? width : image.width, height ? height : image.height)
        resolve()
      }
      image.onerror = function () {
        resolve()
      }
      image.src = src
    })
  }

  async printMap (map) {
    let dimensions = map.getSize()
    // const zoom = map.getZoom()
    // const bounds = map.getPixelBounds()
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.x
    canvas.height = dimensions.y
    const context = canvas.getContext('2d')

    const filterControls = (node) => {
      return node.classList == null || Object.values(node.classList).indexOf('leaflet-control') === -1
    }

    const png = await domtoimage.toPng(document.getElementById('map'), {width: dimensions.x, height: dimensions.y, filter: filterControls})
    await this.loadImage(context, png, {x: 0, y: 0})
    const base64Data = canvas.toDataURL().split(',')[1]
    const {cancelled, filePath} = await window.mapcache.showSaveDialog({
      title: 'Save screenshot',
      defaultPath: 'screenshot.png'
    })
    if (!cancelled && !isNil(filePath)) {
      await window.mapcache.downloadBase64Image(filePath, base64Data)
    }
  }
}
