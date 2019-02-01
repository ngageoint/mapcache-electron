import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'https://localhost:8080'
})
const win = dom.window

global.window = dom.window
global.document = dom.window.document

Object.keys(win).forEach(property => {
  if (typeof global[property] === 'undefined') {
    global[property] = win[property]
  }
});

global.navigator = {
  userAgent: 'node.js',
  platform: 'mac'
}

//
// Mock Canvas / Context2D calls
//
function mockCanvas (window) {
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillRect: function() {},
      clearRect: function(){},
      getImageData: function(x, y, w, h) {
        return  {
          data: new Array(w*h*4)
        }
      },
      putImageData: function() {},
      createImageData: function(width, height) {
        return {
          data: new Array(width*height*4)
        }
      },
      setTransform: function(){},
      drawImage: function(){},
      save: function(){},
      fillText: function(){},
      restore: function(){},
      beginPath: function(){},
      moveTo: function(){},
      lineTo: function(){},
      closePath: function(){},
      stroke: function(){},
      translate: function(){},
      scale: function(){},
      rotate: function(){},
      arc: function(){},
      fill: function(){},
      measureText: function(){
        return { width: 0 }
      },
      transform: function(){},
      rect: function(){},
      clip: function(){},
    }
  }

  window.HTMLCanvasElement.prototype.toDataURL = function () {
      return ""
  }

  window.HTMLCanvasElement.prototype.toBlob = function () {
      return []
  }
}
// const document = jsdom.jsdom(undefined, {
//   virtualConsole: jsdom.createVirtualConsole().sendTo(console)
// })
//
// const window = document.defaultView;
mockCanvas(win)
