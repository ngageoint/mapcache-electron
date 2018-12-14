A Pen created at CodePen.io. You can find this one at http://codepen.io/suez/pen/eNwwGp.

 Source gif by Ramotion - https://dribbble.com/shots/2121350-Delivery-Card

Looks best in Chrome. Some parts are bugged in FF. Not working in IE below edge (if it's not working in edge, let me know pls). Card dimensions probably broken on mobile, except for iPhone 6 (because I was hardcoding pixels for this model). Don't forget to click request button inside card.

(Cool)story behind the demo:

when I saw this gif I just wanted to recreate flipping animation. I thought that it will be easy-peasy, because I worked with preserve-3d stuff in CSS before. But, when I started doing nested elements below 2nd level, everything turned to a crazy bugfest. Border-radius crazy bugs in various Chrome versions, z-index and translateZ(0) retarded things in FF and other absolutely random stuff. So when I finished flipping part, I thought that I should continue and do the rest. Oh boy... This decision gave another week of suffering and LOTS of shitty code. I will try to refactor it in a few weeks (when my brain will recover), but right now CSS is a one big clusterf*ck (shame on me!). And google maps is an another story, I was working with them for the first time, so it's more like a brainless composition of SO answers and google API docs.

