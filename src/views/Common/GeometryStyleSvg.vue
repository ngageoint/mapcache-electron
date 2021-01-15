<template>
  <svg height="25" width="25" v-if="geometryType === 1">
    <circle cx="12.5" cy="12.5" r="2.5" :stroke="color"
          :fill="color"
          stroke-width="3px"></circle>
  </svg>
  <svg height="25" width="25" v-else-if="geometryType === 2">
    <polyline points="5,20 20,15, 5,10, 20,5" :stroke="color"
              stroke-width="3px"
              fill="none"></polyline>
  </svg>
  <svg height="25" width="25" v-else-if="geometryType === 3">
    <polygon points="5,10 20,5 20,20 5,20" :stroke="color"
             :fill="fillColor"
             :fill-opacity="fillOpacity"
             stroke-width="3px"></polygon>
  </svg>
  <svg height="25" width="25" v-else-if="geometryType === 4">
    <circle cx="4.5" cy="8.5" r="2.5" :stroke="color"
            :fill="color"
            stroke-width="3px"></circle>
    <circle cx="12.5" cy="18.5" r="2.5" :stroke="color"
            :fill="color"
            stroke-width="3px"></circle>
    <circle cx="18.5" cy="7.5" r="2.5" :stroke="color"
            :fill="color"
            stroke-width="3px"></circle>
  </svg>
  <svg height="25" width="25" v-else-if="geometryType === 5">
    <polyline points="1,2 6,14 1,20" :stroke="color"
              stroke-width="3px"
              fill="none"></polyline>
    <polyline points="12,20 22,15, 12,10, 22,5" :stroke="color"
              stroke-width="3px"
              fill="none"></polyline>
  </svg>
  <svg height="25" width="25" v-else-if="geometryType === 6">
    <polygon points="2,2 10,2 8,13 2,10" :stroke="color"
             :fill="fillColor"
             :fill-opacity="fillOpacity"
             stroke-width="3px"></polygon>
    <polygon points="12,17 22,10 22,22 14,22" :stroke="color"
             :fill="fillColor"
             :fill-opacity="fillOpacity"
             stroke-width="3px"></polygon>
  </svg>
  <svg height="25" width="25" v-else-if="geometryType === 7">
    <circle cx="12.5" cy="4.5" r="2.5" :stroke="color"
            :fill="color"
            stroke-width="3px"></circle>
    <polyline points="1,2 6,14 1,20" :stroke="color"
              stroke-width="3px"
              fill="none"></polyline>
    <polygon points="12,16 22,10 22,22 14,22" :stroke="color"
             :fill="fillColor"
             :fill-opacity="fillOpacity"
             stroke-width="3px"></polygon>
  </svg>
</template>
<script>
  export default {
    props: {
      geometryType: Number,
      color: String,
      fillColor: String,
      fillOpacity: Number
    }
  }
</script>
