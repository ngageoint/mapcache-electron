<template>
  <div v-show="visible" :style="{width: '100%', height: '100%', zIndex: 0, position: 'relative', display: 'flex'}"
       @mouseleave="mouseLeft" @mouseenter="mouseEntered">
    <div id="map" :style="{width: '100%',  zIndex: 0, flex: 1, backgroundColor: mapBackground}">
      <div id='tooltip' :style="{top: project.displayAddressSearchBar ? '54px' : '10px'}"></div>
      <v-dialog
          v-model="geopackageFeatureLayerSelectionDialog"
          max-width="450"
          persistent
          @keydown.esc="cancelDrawing">
        <add-feature-to-geo-package v-if="geopackageFeatureLayerSelectionDialog" :project="project"
                                    :cancel="cancelDrawing" :active-geopackage="project.activeGeoPackage"
                                    :geopackages="geopackages"
                                    :save="confirmGeoPackageFeatureLayerSelection"></add-feature-to-geo-package>
      </v-dialog>
      <v-dialog
          v-model="showAddFeatureDialog"
          max-width="500"
          scrollable
          persistent
          @keydown.esc="cancelAddFeature">
        <feature-editor v-if="showAddFeatureDialog" :projectId="projectId" :id="featureToAddGeoPackage.id"
                        :object="project.geopackages[featureToAddGeoPackage.id]"
                        :save-new-feature="saveFeature" :geopackage-path="featureToAddGeoPackage.path"
                        :tableName="featureToAddTableName" :columns="featureToAddColumns" :feature="featureToAdd"
                        :close="cancelAddFeature" :is-geo-package="true"></feature-editor>
      </v-dialog>
    </div>
    <div v-show="contextMenuPopup != null" id="context-menu-popup" ref="contextMenuPopup">
      <v-list dense>
        <v-list-item dense @click="() => {copyText(contextMenuCoordinate.lat.toFixed(6) + ', ' + contextMenuCoordinate.lng.toFixed(6))}">
          {{
            contextMenuCoordinate ? (contextMenuCoordinate.lat.toFixed(6) + ', ' + contextMenuCoordinate.lng.toFixed(6)) : ''
          }}
        </v-list-item>
        <v-list-item dense @click="() => {copyText(convertToDms(contextMenuCoordinate.lat, false) + ', ' + convertToDms(contextMenuCoordinate.lng, true))}">
          {{
            contextMenuCoordinate ? (convertToDms(contextMenuCoordinate.lat, false) + ', ' + convertToDms(contextMenuCoordinate.lng, true)) : ''
          }}
        </v-list-item>
        <v-list-item dense @click="() => {copyText(convertLatLng2GARS(contextMenuCoordinate.lat, contextMenuCoordinate.lng, false))}">
          {{
            contextMenuCoordinate ? convertLatLng2GARS(contextMenuCoordinate.lat, contextMenuCoordinate.lng, true) : ''
          }}
        </v-list-item>
        <v-list-item dense @click="() => {copyText(convertLatLng2MGRS(contextMenuCoordinate.lat, contextMenuCoordinate.lng, false))}">
          {{
            contextMenuCoordinate ? convertLatLng2MGRS(contextMenuCoordinate.lat, contextMenuCoordinate.lng, true) : ''
          }}
        </v-list-item>
        <v-list-item dense @click="performReverseQuery">
          What's here?
        </v-list-item>
      </v-list>
    </div>
    <v-expand-transition>
      <v-card
          tile
          id="feature-table-ref"
          ref="featureTableRef"
          v-show="showFeatureTable && !featureTablePoppedOut"
          class="mx-auto"
          style="max-height: 464px; overflow-y: auto; position: absolute; bottom: 0; z-index: 0; width: 100%">
        <v-card-text class="pa-0 ma-0 mb-2">
          <feature-tables :project="project" :projectId="projectId" :geopackages="geopackages" :sources="sources"
                          :table="table" :zoomToFeature="zoomToFeature" :show-feature="showFeature"
                          :close="hideFeatureTable" :pop-out="popOutFeatureTable"
                          :highlight-feature="highlightGeoPackageFeature"></feature-tables>
        </v-card-text>
      </v-card>
    </v-expand-transition>
    <v-card outlined v-if="showGridSelection" class="grid-overlay-card">
      <v-card-title>
        Grid overlay
      </v-card-title>
      <v-card-text>
        <v-card-subtitle class="pt-1 pb-1">
          Select grid overlay to view.
        </v-card-subtitle>
        <v-list dense class="pa-0" style="max-height: 200px; overflow-y: auto;">
          <v-list-item-group dense v-model="gridSelection" mandatory>
            <v-list-item dense v-for="(item) in gridOptions" :key="item.id" :value="item.id">
              <v-list-item-content>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card-text>
    </v-card>
    <v-card outlined v-show="showLayerOrderingDialog" class="reorder-card" :style="{top: getReorderCardOffset()}">
      <v-card-title>
        Layer Order
      </v-card-title>
      <v-card-text>
        <v-card-subtitle class="pt-0 pb-1">
          Drag layers to specify the map rendering order.
        </v-card-subtitle>
        <v-list
            id="sortable-list"
            style="max-height: 350px !important; width: 100% !important; overflow-y: auto !important;"
            v-sortable-list="{onEnd:updateLayerOrder}"
            dense>
          <v-list-item
              v-for="item in layerOrder"
              class="sortable-list-item"
              :key="item.id"
              dense>
            <v-list-item-icon class="mt-1">
              <v-btn icon @click.stop="item.zoomTo">
                <img v-if="item.type === 'tile' && $vuetify.theme.dark" src="/images/white_layers.png" alt="Tile layer"
                     width="20px" height="20px"/>
                <img v-else-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px"
                     height="20px"/>
                <img v-else-if="item.type === 'tile'" src="/images/colored_layers.png" alt="Tile layer" width="20px"
                     height="20px"/>
                <img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
              </v-btn>
            </v-list-item-icon>
            <v-list-item-content class="pa-0 ma-0">
              <v-list-item-title v-text="item.title"></v-list-item-title>
              <v-list-item-subtitle v-if="item.subtitle" v-text="item.subtitle"></v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-icon class="sortHandle" style="vertical-align: middle !important;">
              <v-icon>{{ mdiDragHorizontalVariant }}</v-icon>
            </v-list-item-icon>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
    <v-card outlined v-if="showBaseMapSelection" class="basemap-card">
      <v-card-title class="pb-2">
        <v-row no-gutters justify="space-between">
          <p class="mb-0 pa-0">Base maps</p>
          <v-tooltip left :disabled="!project.showToolTips">
            <template v-slot:activator="{ on }">
              <div v-on="on" style="margin-top: -3px !important;">
                <v-btn :disabled="projectLayerCount === 0" @click="createNewBaseMap" color="primary" icon>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                       preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="24" height="24">
                    <defs>
                      <path
                          d="M20.35 14.85L20.35 14.85L20.36 14.85L20.36 14.86L20.37 14.86L20.37 14.86L20.38 14.86L20.39 14.86L20.39 14.87L20.4 14.87L20.4 14.87L20.4 14.87L20.41 14.88L20.41 14.88L20.42 14.88L20.42 14.89L20.43 14.89L20.43 14.89L20.43 14.9L20.44 14.9L20.44 14.91L20.44 14.91L20.45 14.91L20.45 14.92L20.45 14.92L20.46 14.93L20.46 14.93L20.46 14.94L20.46 14.94L20.46 14.95L20.47 14.95L20.47 14.96L20.47 14.97L20.47 14.97L20.47 14.98L20.47 14.98L20.47 14.99L20.47 14.99L20.47 17.83L23.31 17.83L23.31 17.83L23.32 17.83L23.32 17.83L23.33 17.83L23.33 17.83L23.34 17.83L23.34 17.83L23.35 17.83L23.36 17.84L23.36 17.84L23.37 17.84L23.37 17.84L23.37 17.85L23.38 17.85L23.38 17.85L23.39 17.85L23.39 17.86L23.4 17.86L23.4 17.86L23.41 17.87L23.41 17.87L23.41 17.88L23.42 17.88L23.42 17.89L23.42 17.89L23.43 17.89L23.43 17.9L23.43 17.9L23.43 17.91L23.44 17.91L23.44 17.92L23.44 17.92L23.44 17.93L23.44 17.93L23.44 17.94L23.44 17.95L23.45 17.95L23.45 17.96L23.45 17.96L23.45 17.97L23.45 20.24L23.45 20.24L23.45 20.25L23.45 20.25L23.44 20.26L23.44 20.26L23.44 20.27L23.44 20.27L23.44 20.28L23.44 20.29L23.44 20.29L23.43 20.3L23.43 20.3L23.43 20.31L23.43 20.31L23.42 20.31L23.42 20.32L23.42 20.32L23.41 20.33L23.41 20.33L23.41 20.34L23.4 20.34L23.4 20.34L23.39 20.35L23.39 20.35L23.38 20.35L23.38 20.36L23.37 20.36L23.37 20.36L23.37 20.36L23.36 20.37L23.36 20.37L23.35 20.37L23.34 20.37L23.34 20.37L23.33 20.37L23.33 20.38L23.32 20.38L23.32 20.38L23.31 20.38L23.31 20.38L20.47 20.38L20.47 23.21L20.47 23.22L20.47 23.22L20.47 23.23L20.47 23.23L20.47 23.24L20.47 23.24L20.47 23.25L20.46 23.26L20.46 23.26L20.46 23.27L20.46 23.27L20.46 23.28L20.45 23.28L20.45 23.28L20.45 23.29L20.44 23.29L20.44 23.3L20.44 23.3L20.43 23.31L20.43 23.31L20.43 23.31L20.42 23.32L20.42 23.32L20.41 23.32L20.41 23.33L20.4 23.33L20.4 23.33L20.4 23.34L20.39 23.34L20.39 23.34L20.38 23.34L20.37 23.34L20.37 23.35L20.36 23.35L20.36 23.35L20.35 23.35L20.35 23.35L20.34 23.35L20.34 23.35L20.33 23.35L18.06 23.35L18.06 23.35L18.05 23.35L18.05 23.35L18.04 23.35L18.03 23.35L18.03 23.35L18.02 23.35L18.02 23.34L18.01 23.34L18.01 23.34L18 23.34L18 23.34L17.99 23.33L17.99 23.33L17.98 23.33L17.98 23.32L17.98 23.32L17.97 23.32L17.97 23.31L17.96 23.31L17.96 23.31L17.96 23.3L17.95 23.3L17.95 23.29L17.95 23.29L17.94 23.28L17.94 23.28L17.94 23.28L17.94 23.27L17.93 23.27L17.93 23.26L17.93 23.26L17.93 23.25L17.93 23.24L17.92 23.24L17.92 23.23L17.92 23.23L17.92 23.22L17.92 23.22L17.92 23.21L17.92 20.38L15.09 20.38L15.08 20.38L15.08 20.38L15.07 20.38L15.07 20.38L15.06 20.37L15.05 20.37L15.05 20.37L15.04 20.37L15.04 20.37L15.03 20.37L15.03 20.36L15.02 20.36L15.02 20.36L15.01 20.36L15.01 20.35L15 20.35L15 20.35L15 20.34L14.99 20.34L14.99 20.34L14.98 20.33L14.98 20.33L14.98 20.32L14.97 20.32L14.97 20.31L14.97 20.31L14.97 20.31L14.96 20.3L14.96 20.3L14.96 20.29L14.96 20.29L14.95 20.28L14.95 20.27L14.95 20.27L14.95 20.26L14.95 20.26L14.95 20.25L14.95 20.25L14.95 20.24L14.95 20.24L14.95 17.97L14.95 17.96L14.95 17.96L14.95 17.95L14.95 17.95L14.95 17.94L14.95 17.93L14.95 17.93L14.95 17.92L14.96 17.92L14.96 17.91L14.96 17.91L14.96 17.9L14.97 17.9L14.97 17.89L14.97 17.89L14.97 17.89L14.98 17.88L14.98 17.88L14.98 17.87L14.99 17.87L14.99 17.86L15 17.86L15 17.86L15 17.85L15.01 17.85L15.01 17.85L15.02 17.85L15.02 17.84L15.03 17.84L15.03 17.84L15.04 17.84L15.04 17.83L15.05 17.83L15.05 17.83L15.06 17.83L15.07 17.83L15.07 17.83L15.08 17.83L15.08 17.83L15.09 17.83L17.92 17.83L17.92 14.99L17.92 14.99L17.92 14.98L17.92 14.98L17.92 14.97L17.92 14.97L17.93 14.96L17.93 14.95L17.93 14.95L17.93 14.94L17.93 14.94L17.94 14.93L17.94 14.93L17.94 14.92L17.94 14.92L17.95 14.91L17.95 14.91L17.95 14.91L17.96 14.9L17.96 14.9L17.96 14.89L17.97 14.89L17.97 14.89L17.98 14.88L17.98 14.88L17.98 14.88L17.99 14.87L17.99 14.87L18 14.87L18 14.87L18.01 14.86L18.01 14.86L18.02 14.86L18.02 14.86L18.03 14.86L18.03 14.85L18.04 14.85L18.05 14.85L18.05 14.85L18.06 14.85L18.06 14.85L20.33 14.85L20.34 14.85L20.34 14.85L20.34 14.85L20.35 14.85ZM20.61 2.95L20.65 2.96L20.69 2.97L20.72 2.99L20.75 3.01L20.78 3.03L20.81 3.05L20.84 3.07L20.87 3.1L20.89 3.12L20.91 3.15L20.93 3.19L20.95 3.22L20.96 3.25L20.98 3.29L20.99 3.32L20.99 3.36L21 3.4L21 3.44L21 13.28L20.91 13.25L20.82 13.22L20.73 13.19L20.64 13.16L20.54 13.14L20.45 13.11L20.36 13.09L20.26 13.07L20.17 13.05L20.07 13.03L19.98 13.02L19.88 13L19.79 12.99L19.69 12.98L19.59 12.97L19.49 12.96L19.4 12.95L19.3 12.94L19.2 12.94L19.1 12.94L19 12.94L19 5.64L16 6.8L16 13.74L15.89 13.81L15.77 13.88L15.66 13.95L15.55 14.02L15.45 14.1L15.34 14.18L15.24 14.26L15.13 14.35L15.03 14.43L14.94 14.52L14.84 14.61L14.75 14.7L14.65 14.8L14.56 14.89L14.48 14.99L14.39 15.09L14.31 15.19L14.23 15.3L14.15 15.4L14.07 15.51L14 15.62L14 6.81L10 5.41L10 17.07L13.05 18.14L13 18.94L13 19L13 19.07L13 19.13L13.01 19.2L13.01 19.27L13.01 19.33L13.02 19.4L13.02 19.46L13.03 19.53L13.03 19.59L13.04 19.66L13.05 19.72L13.06 19.78L13.07 19.85L13.08 19.91L13.09 19.98L13.1 20.04L13.11 20.1L13.12 20.16L13.14 20.23L13.15 20.29L9 18.84L3.66 20.91L3.5 20.94L3.46 20.94L3.42 20.93L3.39 20.92L3.35 20.91L3.31 20.9L3.28 20.89L3.25 20.87L3.22 20.85L3.19 20.83L3.16 20.8L3.13 20.78L3.11 20.75L3.09 20.72L3.07 20.69L3.05 20.66L3.04 20.62L3.02 20.59L3.01 20.55L3.01 20.51L3 20.48L3 20.44L3 5.32L3 5.28L3 5.25L3.01 5.22L3.02 5.19L3.02 5.16L3.03 5.13L3.05 5.11L3.06 5.08L3.08 5.05L3.09 5.03L3.11 5.01L3.13 4.98L3.15 4.96L3.17 4.94L3.2 4.92L3.22 4.91L3.25 4.89L3.27 4.87L3.3 4.86L3.33 4.85L3.36 4.84L9 2.94L15 5.04L20.34 2.97L20.5 2.94L20.54 2.94L20.58 2.94L20.58 2.94L20.61 2.95ZM8 17.09L8 5.39L5 6.4L5 18.25L5 18.25L8 17.09Z"
                          id="d4Lnycg7d"></path>
                    </defs>
                    <g><g><g><use xlink:href="#d4Lnycg7d" opacity="1" fill="currentColor" :fill-opacity="projectLayerCount === 0 ? .26 : 1"></use><g><use xlink:href="#d4Lnycg7d" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="1" stroke-opacity="0"></use></g></g></g></g>
                  </svg>
                </v-btn>
              </div>
            </template>
            <span>{{ projectLayerCount === 0 ? 'No layers found' : 'Add base map' }}</span>
          </v-tooltip>
        </v-row>
      </v-card-title>
      <v-card-text class="pb-2">
        <v-card-subtitle class="pt-1 pb-1">
          Select a base map.
        </v-card-subtitle>
        <v-list dense class="pa-0" style="max-height: 200px; overflow-y: auto;">
          <v-list-item-group v-model="selectedBaseMapId" mandatory>
            <v-list-item v-for="item of baseMapItems" :key="item.id" :value="item.id">
              <v-list-item-icon style="margin-right: 16px;">
                <v-btn small icon @click.stop="(e) => item.zoomTo(e)">
                  <v-icon small>{{ mdiMapOutline }}</v-icon>
                </v-btn>
              </v-list-item-icon>
              <v-list-item-title>{{ item.name }}</v-list-item-title>
              <base-map-troubleshooting v-if="item.baseMap.error" :base-map="item.baseMap"></base-map-troubleshooting>
              <geo-t-i-f-f-troubleshooting v-if="item.missingRaster"
                                           :source-or-base-map="item.baseMap"></geo-t-i-f-f-troubleshooting>
              <v-progress-circular
                  v-if="item.id == selectedBaseMapId && connectingToBaseMap"
                  indeterminate
                  color="primary"
              ></v-progress-circular>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card-text>
    </v-card>
    <range-ring v-if="showRangeRingTool" :map="map" :close="cancelRangeRingTool" :save-feature="saveRangeRingFeature"></range-ring>
    <v-card v-if="project.displayAddressSearchBar" outlined class="nominatim-card ma-0 pa-0 transparent">
      <nominatim-search :project="project" :map-bounds="mapBounds" :disable-search="disableSearch"/>
    </v-card>
    <v-card v-if="isEditing" flat tile class="feature-editing-card ma-0 pa-0">
      <v-navigation-drawer
          width="208"
          permanent
          expand-on-hover
          class="background"
      >
        <v-list>
          <v-list-item dense>
            <v-list-item-icon>
              <v-icon>{{ mdiPencil }}</v-icon>
            </v-list-item-icon>
            <v-list-item-title class="text-h6">
              Edit tools
            </v-list-item-title>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list dense>
          <v-list-item-group v-model="mode">
            <v-list-item link @click="toggleVertexEditing" :value="0">
              <v-list-item-icon>
                <v-icon>{{ mdiVectorPolylineEdit }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Edit</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="toggleDrag" :value="1">
              <v-list-item-icon>
                <v-icon> {{ mdiCursorMove }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Drag</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="toggleCut" :value="2">
              <v-list-item-icon>
                <v-icon>{{ mdiContentCut }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Cut</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="toggleRotate" :value="3">
              <v-list-item-icon>
                <v-icon>{{ mdiReload }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Rotate</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="toggleErase" :value="4">
              <v-list-item-icon>
                <v-icon>{{ mdiEraser }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Erase</v-list-item-title>
            </v-list-item>
          </v-list-item-group>
          <v-list-item link @click="undoEdit" :disabled="noUndo">
            <v-list-item-icon>
              <v-icon :disabled="noUndo">{{ mdiUndo }}</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Undo</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="redoEdit" :disabled="noRedo">
            <v-list-item-icon>
              <v-icon :disabled="noRedo">{{ mdiRedo }}</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Redo</v-list-item-title>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-group :prepend-icon="mdiShapePlus">
            <template v-slot:activator>
              <v-list-item-title>Add shapes</v-list-item-title>
            </template>
            <v-list-item-group v-model="mode">
              <v-list-item link @click="toggleDrawMarker" :value="5">
                <v-list-item-icon>
                  <v-icon>{{ mdiMapMarker }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Marker</v-list-item-title>
              </v-list-item>
              <v-list-item link @click="toggleDrawLine" :value="6">
                <v-list-item-icon>
                  <v-icon>{{ mdiVectorPolyline }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Line</v-list-item-title>
              </v-list-item>
              <v-list-item link @click="toggleDrawRectangle" :value="7">
                <v-list-item-icon>
                  <v-icon>{{ mdiVectorRectangle }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Rectangle</v-list-item-title>
              </v-list-item>
              <v-list-item link @click="toggleDrawPolygon" :value="8">
                <v-list-item-icon>
                  <v-icon>{{ mdiVectorPolygon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Polygon</v-list-item-title>
              </v-list-item>
              <v-list-item link @click="toggleDrawCircle" :value="9">
                <v-list-item-icon>
                  <v-icon>{{ mdiCircleOutline }}</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Circle</v-list-item-title>
              </v-list-item>
            </v-list-item-group>
          </v-list-group>
        </v-list>
      </v-navigation-drawer>
    </v-card>
    <v-card v-if="isDrawingBounds" flat tile class="feature-editing-card ma-0 pa-0">
      <v-navigation-drawer
          width="208"
          permanent
          expand-on-hover
          class="background"
      >
        <v-list>
          <v-list-item dense>
            <v-list-item-icon>
              <v-icon>{{ mdiPencil }}</v-icon>
            </v-list-item-icon>
            <v-list-item-title class="text-h6">
              Edit tools
            </v-list-item-title>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list dense>
          <v-list-item-group v-model="drawBoundsMode" mandatory>
            <v-list-item link @click="toggleBoundsEdit" :value="0">
              <v-list-item-icon>
                <v-icon>{{ mdiVectorPolylineEdit }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Edit</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="toggleBoundsDrag" :value="1">
              <v-list-item-icon>
                <v-icon> {{ mdiCursorMove }}</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Drag</v-list-item-title>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-navigation-drawer>
    </v-card>
    <div v-show="false">
      <nominatim-result-map-popup ref="searchResultPopup" :result="hoveredSearchResult"
                                  :mouseover="cancelSearchResultPopupClose"
                                  :mouseleave="searchResultClose"></nominatim-result-map-popup>
    </div>
  </div>
</template>

<script>
import { L } from '../../lib/leaflet/vendor'
import { mapState } from 'vuex'
import EventBus from '../../lib/vue/EventBus'
import isNil from 'lodash/isNil'
import debounce from 'lodash/debounce'
import cloneDeep from 'lodash/cloneDeep'
import keys from 'lodash/keys'
import isEqual from 'lodash/isEqual'
import difference from 'lodash/difference'
import pick from 'lodash/pick'
import throttle from 'lodash/throttle'
import 'leaflet-geosearch/dist/geosearch.css'
import LeafletActiveLayersTool from '../../lib/leaflet/map/controls/LeafletActiveLayersTool'
import DrawBounds from './mixins/DrawBounds'
import EditFeature from './mixins/EditFeature'
import GridBounds from './mixins/GridBounds'
import HighlightFeature from './mixins/HighlightFeature'
import FeatureTables from '../FeatureTable/FeatureTables'
import LeafletZoomIndicator from '../../lib/leaflet/map/controls/LeafletZoomIndicator'
import FeatureEditor from '../Common/FeatureEditor'
import LeafletBaseMapTool from '../../lib/leaflet/map/controls/LeafletBaseMapTool'
import LeafletRangeRingControl from '../../lib/leaflet/map/controls/LeafletRangeRingControl'
import BaseMapTroubleshooting from '../BaseMaps/BaseMapTroubleshooting'
import { constructMapLayer } from '../../lib/leaflet/map/layers/LeafletMapLayerFactory'
import { WEB_MERCATOR_CODE } from '../../lib/projection/ProjectionConstants'
import { constructLayer } from '../../lib/layer/LayerFactory'
import { getDefaultBaseMaps, getOfflineBaseMapId } from '../../lib/util/basemaps/BaseMapUtilities'
import { isRemote } from '../../lib/layer/LayerTypes'
import { connectToBaseMap } from '../../lib/network/ServiceConnectionUtils'
import {
  GRID_SELECTION_PANE,
  BASE_MAP_PANE,
  SEARCH_RESULTS_PANE,
  SEARCH_RESULT_POINTS_ONLY_PANE,
  OVERLAY_PANE_FEATURES,
  DRAWING_VERTEX_PANE,
  DRAWING_LAYER_PANE
} from '../../lib/leaflet/map/panes/MapPanes'
import {
  mdiMapOutline,
  mdiDragHorizontalVariant,
  mdiVectorPolylineEdit,
  mdiReload,
  mdiEraser,
  mdiContentCut,
  mdiCursorMove,
  mdiPencil,
  mdiRedo,
  mdiUndo,
  mdiMapMarker,
  mdiVectorPolyline,
  mdiVectorRectangle,
  mdiVectorPolygon,
  mdiShapePlus,
  mdiPlus,
  mdiCircleOutline,
  mdiTrashCanOutline
} from '@mdi/js'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting'
import {
  zoomToBaseMap,
  zoomToExtent,
  zoomToGeoPackageFeature,
  zoomToGeoPackageTable,
  zoomToSource
} from '../../lib/leaflet/map/ZoomUtilities'
import NominatimSearch from '../Nominatim/NominatimSearch'
import NominatimResultMapPopup from '../Nominatim/NominatimResultMapPopup'
import SearchResult from './mixins/SearchResults'
import { getDefaultIcon } from '../../lib/util/style/BrowserStyleUtilities'
import {
  getDefaultMapCacheStyle,
  getDefaultRangeRingLineStyle
} from '../../lib/util/style/CommonStyleUtilities'
import { reverseQueryNominatim } from '../../lib/util/nominatim/NominatimUtilities'
import LeafletGridOverlayTool from '../../lib/leaflet/map/controls/LeafletGridOverlayTool'
import LeafletCoordinates from '../../lib/leaflet/map/controls/LeafletCoordinates'
import { LatLng } from '../../lib/leaflet/map/grid/mgrs/wgs84/LatLng'
import { MGRS } from '../../lib/leaflet/map/grid/mgrs/MGRS'
import { latLng2GARS } from '../../lib/leaflet/map/grid/gars/GARS'
import { FEATURE_TABLE_WINDOW_EVENTS } from '../FeatureTable/FeatureTableEvents'
import { FEATURE_TABLE_ACTIONS } from '../FeatureTable/FeatureTableActions'
import Sortable from 'sortablejs'
import AddFeatureToGeoPackage from '../Common/AddFeatureToGeoPackage'
import LeafletSnapshot from '../../lib/leaflet/map/controls/LeafletSnapshot'
import { environment } from '../../lib/env/env'
import RangeRing from './RangeRing'
import { generateCircularFeature } from '../../lib/util/geojson/GeoJSONUtilities'

// millisecond threshold for double clicks, if user single clicks, there will be a 200ms delay in running a feature query
const DOUBLE_CLICK_THRESHOLD = 200

// objects for storing state
const geopackageLayers = {}

function generateLayerOrderItemForSource (source) {
  return {
    title: source.displayName ? source.displayName : source.name,
    id: source.id,
    type: source.pane === 'vector' ? 'vector' : 'tile',
    zoomTo: debounce((e) => {
      e.stopPropagation()
      zoomToSource(source)
    }, 100)
  }
}

function generateLayerOrderItemForGeoPackageTable (geopackage, tableName, isTile) {
  return {
    id: geopackage.id + '_' + tableName,
    geopackageId: geopackage.id,
    tableName: tableName,
    title: geopackage.name,
    subtitle: tableName,
    type: isTile ? 'tile' : 'vector',
    zoomTo: debounce((e) => {
      e.stopPropagation()
      zoomToGeoPackageTable(geopackage, tableName)
    }, 100)
  }
}

export default {
  mixins: [
    DrawBounds,
    GridBounds,
    SearchResult,
    HighlightFeature,
    EditFeature
  ],
  props: {
    sources: Object,
    geopackages: Object,
    projectId: String,
    project: Object,
    resizeListener: Number,
    visible: Boolean,
    featureTablePoppedOut: Boolean,
    darkTheme: Boolean
  },
  directives: {
    'sortable-list': {
      inserted: (el, binding) => {
        Sortable.create(el, binding.value ? {
          ...binding.value, handle: '.sortHandle', ghostClass: 'ghost', dragClass: 'detail-bg',
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
      },
    },
  },
  computed: {
    ...mapState({
      nominatimUrl: state => {
        return state.URLs.nominatimUrl || environment.nominatimUrl
      },
      baseMapItems: state => {
        return getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || []).map(baseMapConfig => {
          return {
            id: baseMapConfig.id,
            updateKey: 0,
            baseMap: baseMapConfig,
            name: baseMapConfig.name,
            missingRaster: window.mapcache.isRasterMissing(baseMapConfig.layerConfiguration),
            zoomTo: debounce((e) => {
              e.stopPropagation()
              zoomToBaseMap(baseMapConfig)
            }, 100)
          }
        })
      },
      baseMaps: state => {
        return getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || [])
      }
    }),
    mapProjection: {
      get () {
        return this.project.mapProjection || WEB_MERCATOR_CODE
      }
    },
    projectLayerCount: {
      get () {
        return keys(this.project.geopackages).reduce((accumulator, geopackage) => accumulator + keys(this.project.geopackages[geopackage].tables.features).length + keys(this.project.geopackages[geopackage].tables.tiles).length, 0) + Object.values(this.project.sources).length
      }
    }
  },
  components: {
    RangeRing,
    AddFeatureToGeoPackage,
    NominatimResultMapPopup,
    NominatimSearch,
    GeoTIFFTroubleshooting,
    BaseMapTroubleshooting,
    FeatureEditor,
    FeatureTables
  },
  data () {
    return {
      map: null,
      mdiTrashCanOutline,
      mdiCircleOutline,
      mdiReload,
      mdiEraser,
      mdiVectorPolylineEdit,
      mdiMapOutline,
      mdiDragHorizontalVariant,
      mdiContentCut,
      mdiCursorMove,
      mdiPencil,
      mdiRedo,
      mdiUndo,
      mdiMapMarker,
      mdiVectorPolyline,
      mdiVectorRectangle,
      mdiVectorPolygon,
      mdiShapePlus,
      mdiPlus,
      disableSearch: false,
      mapBounds: [-180, -90, 180, 90],
      consecutiveClicks: 0,
      baseMapLayers: {},
      offlineBaseMapId: getOfflineBaseMapId(),
      defaultBaseMapIds: getDefaultBaseMaps().map(bm => bm.id),
      dataSourceMapLayers: {},
      notReadOnlyBaseMapFilter: baseMap => !baseMap.readonly,
      geopackageMapLayers: {},
      selectedBaseMapId: navigator.onLine ? '0' : '3',
      isDrawing: false,
      maxFeatures: undefined,
      geopackageFeatureLayerSelectionDialog: false,
      popup: null,
      showFeatureTable: false,
      table: null,
      lastCreatedFeature: null,
      showAddFeatureDialog: false,
      featureToAdd: null,
      featureToAddColumns: null,
      featureToAddGeoPackage: null,
      featureToAddTableName: null,
      lastShowFeatureTableEvent: null,
      dialogCoordinate: null,
      showLayerOrderingDialog: false,
      showBaseMapSelection: false,
      showGridSelection: false,
      layerOrder: [],
      mapBackground: navigator.onLine ? '#ddd' : '#C0D9E4',
      displayNetworkError: false,
      connectingToBaseMap: false,
      manualBoundingBoxDialog: false,
      nominatimReverseQueryResultsReturned: false,
      contextMenuCoordinate: null,
      contextMenuPopup: null,
      performingReverseQuery: false,
      gridOptions: [{ id: 0, title: 'None' }, { id: 1, title: 'XYZ' }, { id: 2, title: 'GARS' }, { id: 3, title: 'MGRS' }],
      gridSelection: 0,
      closeContextMenuTimeoutId: null,
      showRangeRingTool: false
    }
  },
  methods: {
    createNewBaseMap () {
      EventBus.$emit(EventBus.EventTypes.CREATE_BASE_MAP)
    },
    resetMap () {
      const centerAndZoom = this.getMapCenterAndZoom()
      this.updateGrid(0)
      this.map.remove()
      const oldLayerOrder = this.layerOrder.slice()
      this.layerOrder = []
      this.initializeMap(centerAndZoom)
      this.addLayersToMap()
      this.layerOrder = oldLayerOrder
      this.updateGrid(this.gridSelection)
      this.setupGridBoundsSelection()
      this.resetSearchResults()
      this.updateMapWithEditedFeature()
      this.addDrawBoundsToMap()
    },
    updateGrid (gridId) {
      if (gridId === 0) {
        this.garsGridOverlay.remove()
        this.mgrsGridOverlay.remove()
        this.xyzGridOverlay.remove()
        this.coordinateControl.setCoordinateType('LatLng')
      } else if (gridId === 1) {
        this.garsGridOverlay.remove()
        this.mgrsGridOverlay.remove()
        this.xyzGridOverlay.addTo(this.map)
        this.coordinateControl.setCoordinateType('XYZ')
      } else if (gridId === 2) {
        this.xyzGridOverlay.remove()
        this.mgrsGridOverlay.remove()
        this.garsGridOverlay.addTo(this.map)
        this.coordinateControl.setCoordinateType('GARS')
      } else if (gridId === 3) {
        this.garsGridOverlay.remove()
        this.xyzGridOverlay.remove()
        this.mgrsGridOverlay.addTo(this.map)
        this.coordinateControl.setCoordinateType('MGRS')
      }
    },
    enableGeomanToolbar () {
      this.map.pm.Toolbar.addControls({
        position: 'topright',
        drawCircleMarker: false,
        editControls: false
      })
    },
    disableGeomanToolbar () {
      this.map.pm.Toolbar.removeControls()
    },
    mouseEntered () {
      this.cursorInside = true
    },
    mouseLeft () {
      this.cursorInside = false
      this.removeGeoPackageFeatureHighlight()
    },
    showFeature (id, isGeoPackage, table, featureId) {
      EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE, id, isGeoPackage, table, featureId)
    },
    popOutFeatureTable () {
      window.mapcache.popOutFeatureTable({ projectId: this.projectId, popOut: true })
      window.mapcache.showFeatureTableWindow(true)
    },
    hideFeatureTable () {
      window.mapcache.hideFeatureTableWindow()
      this.showFeatureTable = false
      this.table = null
      this.lastShowFeatureTableEvent = null
    },
    displayFeatureTable () {
      this.$nextTick(() => {
        this.showFeatureTable = true
      })
    },
    async displayFeaturesForTable (id, tableName, isGeoPackage, forceShow = false) {
      this.lastShowFeatureTableEvent = {
        id,
        tableName,
        isGeoPackage
      }
      if (this.featureTablePoppedOut) {
        window.mapcache.showFeatureTableWindow(forceShow)
        window.mapcache.sendFeatureTableEvent({
          event: FEATURE_TABLE_WINDOW_EVENTS.DISPLAY_ALL_TABLE_FEATURES,
          args: {
            id,
            tableName,
            isGeoPackage
          }
        })
        this.showFeatureTable = false
      } else if (!isNil(id) && !isNil(tableName) && ((isGeoPackage && !isNil(this.geopackages[id]) && !isNil(this.geopackages[id].tables.features[tableName])) || (!isGeoPackage && !isNil(this.sources[id])))) {
        try {
          if (isGeoPackage) {
            const geopackage = this.geopackages[id]
            this.table = {
              id: geopackage.id + '_' + tableName,
              tabName: geopackage.name + ' - ' + tableName,
              geopackageId: geopackage.id,
              isGeoPackage: true,
              tableName: tableName,
              filePath: geopackage.path,
              visible: geopackage.tables.features[tableName].visible,
              columns: await window.mapcache.getFeatureColumns(geopackage.path, tableName),
              featureCount: geopackage.tables.features[tableName].featureCount,
            }
          } else {
            const sourceLayerConfig = this.sources[id]
            this.table = {
              isGeoPackage: false,
              id: sourceLayerConfig.id,
              tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
              sourceId: sourceLayerConfig.id,
              visible: sourceLayerConfig.visible,
              columns: await window.mapcache.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
              filePath: sourceLayerConfig.geopackageFilePath,
              tableName: sourceLayerConfig.sourceLayerName,
              featureCount: sourceLayerConfig.count,
            }
          }
          this.displayFeatureTable()
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to retrieve features.')
          this.hideFeatureTable()
        }
      } else {
        this.hideFeatureTable()
      }
    },
    async queryForClosestFeature (e) {
      if (!this.isMapBusy()) {
        let layers = []
        for (let i = 0; i < this.layerOrder.length; i++) {
          const layer = this.layerOrder[i]
          if (layer.type === 'vector') {
            if (layer.geopackageId) {
              const geopackage = this.geopackages[layer.geopackageId]
              layers.push({
                id: layer.geopackageId,
                isGeoPackage: true,
                tableName: layer.tableName,
                path: geopackage.path
              })
            } else {
              const source = this.sources[layer.id]
              layers.push({
                id: layer.id,
                isGeoPackage: false,
                tableName: source.sourceLayerName,
                path: source.geopackageFilePath
              })
            }
          }
        }
        return await window.mapcache.getClosestFeature(layers, this.map.wrapLatLng(e.latlng), Math.floor(this.map.getZoom()))
      }
    },
    convertLatLng2GARS (lat, lng, label = false) {
      return (label ? 'GARS - ' : '') + latLng2GARS(lat, lng)
    },
    convertLatLng2MGRS (lat, lng, label = false) {
      return (label ? 'MGRS - ' : '') + MGRS.from(new LatLng(lat, lng)).toString()
    },
    copyText (text = '') {
      window.mapcache.copyToClipboard(text)
      this.closePopup()
      setTimeout(() => {
        EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Copied to clipboard.', 'primary')
      }, 100)
    },
    getMapCenterAndZoom () {
      return { center: this.map.getCenter(), zoom: this.map.getZoom() }
    },
    getReorderCardOffset () {
      let yOffset = 320
      if (!this.project.zoomControlEnabled) {
        yOffset -= 74
      }
      if (!this.project.displayZoomEnabled) {
        yOffset -= 44
      }
      return yOffset + 'px !important'
    },
    addLayerToMap (map, layer, item) {
      layer.addTo(map)
      if (this.layerOrder.findIndex(i => i.id === item.id) === -1) {
        this.layerOrder.unshift(item)
      }
    },
    removeLayerFromMap (layer, id) {
      layer.remove()
      const index = this.layerOrder.findIndex(l => l.id === id)
      if (index !== -1) {
        this.layerOrder.splice(index, 1)
      }
    },
    async confirmGeoPackageFeatureLayerSelection (geoPackageId, featureTable) {
      const geopackage = this.geopackages[geoPackageId]
      this.geopackageFeatureLayerSelectionDialog = false
      this.featureToAdd = null
      this.featureToAddColumns = null
      this.featureToAddGeoPackage = null
      this.featureToAddTableName = null
      let feature = null
      let additionalFeature = null
      if (this.createdLayer != null) {
        feature = this.createdLayer.toGeoJSON ? this.createdLayer.toGeoJSON() : this.createdLayer
        feature.id = window.mapcache.createUniqueID()
        if (!isNil(this.createdLayer._mRadius)) {
          feature = generateCircularFeature(feature.geometry.coordinates, feature.properties, this.createdLayer._mRadius)
        }

        if (feature.geometry.type === 'Point') {
          feature.style = {
            icon: await getDefaultIcon('Default', 'Default icon for MapCache')
          }
        } else if (!feature.isRangeRing) {
          feature.style = {
            style: getDefaultMapCacheStyle()
          }
        } else if (feature.isRangeRing) {
          feature.style = {
            style: getDefaultRangeRingLineStyle()
          }
        }
        // normalize longitudes for drawings
        switch (feature.geometry.type.toLowerCase()) {
          case 'point': {
            feature.geometry.coordinates[0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[0])
            break
          }
          case 'linestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              feature.geometry.coordinates[i][0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[i][0])
            }
            break
          }
          case 'polygon':
          case 'multilinestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                feature.geometry.coordinates[i][j][0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[i][j][0])
              }
            }
            break
          }
          case 'multipolygon': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                for (let k = 0; k < feature.geometry.coordinates[i][j].length; k++) {
                  feature.geometry.coordinates[i][j][k][0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[i][j][k][0])
                }
              }
            }
            break
          }
        }
      } else if (this.searchResultToSave != null) {
        feature = this.searchResultToSave.feature
        feature.id = window.mapcache.createUniqueID()
        additionalFeature = this.searchResultToSave.pointFeature
      }

      if (feature != null) {
        let featureCollection = {
          type: 'FeatureCollection',
          features: [feature]
        }
        if (additionalFeature != null) {
          additionalFeature.id = window.mapcache.createUniqueID()
          additionalFeature.properties = Object.assign({}, feature.properties)
          featureCollection.features.push(additionalFeature)
        }
        const columns = await window.mapcache.getFeatureColumns(geopackage.path, featureTable)
        if (!isNil(columns) && !isNil(columns._columns) && (keys(feature.properties).filter(key => key !== '_feature_id').length > 0 || columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== window.mapcache.GeoPackageDataType.BLOB && column.name !== '_feature_id').length > 0)) {
          this.featureToAdd = feature
          this.additionalFeatureToAdd = additionalFeature
          this.featureToAddGeoPackage = geopackage
          this.featureToAddTableName = featureTable
          this.featureToAddColumns = columns
          this.$nextTick(() => {
            this.showAddFeatureDialog = true
            this.$nextTick(() => {
              this.cancelDrawing()
            })
          })
        } else {
          this.additionalFeatureToAdd = additionalFeature
          await this.saveFeature(this.project.id, geopackage.id, featureTable, feature)
          this.cancelDrawing()
        }
      }
    },
    async saveFeature (projectId, geopackageId, tableName, feature, columnsToAdd) {
      await window.mapcache.addFeatureToGeoPackage({
        projectId: projectId,
        geopackageId: geopackageId,
        tableName: tableName,
        feature: feature,
        columnsToAdd: columnsToAdd
      })
      if (this.additionalFeatureToAdd) {
        // this.additionalFeatureToAdd.properties = Object.assign({}, feature.properties)
        await window.mapcache.addFeatureToGeoPackage({
          projectId: projectId,
          geopackageId: geopackageId,
          tableName: tableName,
          feature: this.additionalFeatureToAdd
        })
        this.additionalFeatureToAdd = null
      }
      window.mapcache.notifyTab({ projectId: projectId, tabId: 0 })
    },
    cancelDrawing () {
      this.$nextTick(() => {
        this.geopackageFeatureLayerSelectionDialog = false
        if (this.createdLayer != null && this.createdLayer instanceof L.Layer) {
          this.map.removeLayer(this.createdLayer)
        }
        this.createdLayer = null
      })
    },
    zoomToFeature (path, table, featureId) {
      zoomToGeoPackageFeature(path, table, featureId)
    },
    addDataSource (sourceConfiguration, map) {
      const self = this
      const sourceId = sourceConfiguration.id
      let source = constructLayer(sourceConfiguration)
      self.dataSourceMapLayers[sourceId] = constructMapLayer({ layer: source, maxFeatures: this.project.maxFeatures, crs: this.getMapProjection()})
      // if it is visible, try to initialize it
      if (source.visible) {
        this.addLayerToMap(map, this.dataSourceMapLayers[sourceId], generateLayerOrderItemForSource(this.dataSourceMapLayers[sourceId].getLayer()))
      }
    },
    removeDataSource (sourceId) {
      if (!isNil(this.dataSourceMapLayers[sourceId])) {
        this.removeLayerFromMap(this.dataSourceMapLayers[sourceId], sourceId)
        delete this.dataSourceMapLayers[sourceId]
      }
    },
    addBaseMap (baseMap, map) {
      let self = this
      const baseMapId = baseMap.id
      const defaultBaseMap = getDefaultBaseMaps().find(bm => bm.id === baseMapId)
      if (baseMapId === getOfflineBaseMapId()) {
        self.baseMapLayers[baseMapId] = this.createOfflineBaseMapLayer(baseMap, this.$vuetify.theme.dark)
        if (self.selectedBaseMapId === baseMapId) {
          map.addLayer(self.baseMapLayers[baseMapId])
          self.mapBackground = self.$vuetify.theme.dark ? defaultBaseMap.darkBackground : defaultBaseMap.background
          this.setAttribution(baseMap.attribution)
          self.baseMapLayers[baseMapId].bringToBack()
        }
      } else if (!isNil(defaultBaseMap)) {
        self.baseMapLayers[baseMapId] = self.createDefaultBaseMapLayer(defaultBaseMap, this.$vuetify.theme.dark)
        if (self.selectedBaseMapId === baseMapId) {
          map.addLayer(self.baseMapLayers[baseMapId])
          self.mapBackground = self.$vuetify.theme.dark ? defaultBaseMap.darkBackground : defaultBaseMap.background
          this.setAttribution(baseMap.attribution)
          self.baseMapLayers[baseMapId].bringToBack()
        }
      } else {
        let layer = constructLayer(baseMap.layerConfiguration)
        self.baseMapLayers[baseMapId] = constructMapLayer({ layer: layer, maxFeatures: self.project.maxFeatures, crs: this.getMapProjection() })
        if (self.selectedBaseMapId === baseMapId) {
          map.addLayer(self.baseMapLayers[baseMapId])
          this.setAttribution(baseMap.attribution)
          self.baseMapLayers[baseMapId].bringToBack()
        }
      }
    },
    closePopup () {
      this.map.removeLayer(this.contextMenuPopup)
    },
    convertToDms (dd, isLng) {
      const dir = dd < 0
          ? isLng ? 'W' : 'S'
          : isLng ? 'E' : 'N'

      const absDd = Math.abs(dd)
      const deg = absDd | 0
      const frac = absDd - deg
      const min = (frac * 60) | 0
      let sec = frac * 3600 - min * 60
      // Round it to 2 decimal points.
      sec = Math.round(sec * 100) / 100
      return deg + "°" + min + "'" + sec + '"' + dir
    },
    cancelAddFeature () {
      this.$nextTick(() => {
        this.showAddFeatureDialog = false
        this.cancelDrawing()
      })
    },
    addGeoPackageToMap (geopackage, map) {
      this.removeGeoPackage(geopackage.id)
      this.geopackageMapLayers[geopackage.id] = {}
      geopackageLayers[geopackage.id] = cloneDeep(geopackage)
      keys(geopackage.tables.tiles).filter(tableName => geopackage.tables.tiles[tableName].visible).forEach(tableName => {
        this.addGeoPackageTileTable(geopackage, map, tableName)
      })
      keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible).forEach(tableName => {
        this.addGeoPackageFeatureTable(geopackage, map, tableName)
      })
    },
    removeGeoPackageTable (geopackageId, tableName) {
      if (!isNil(this.geopackageMapLayers[geopackageId]) && !isNil(this.geopackageMapLayers[geopackageId][tableName])) {
        const layer = this.geopackageMapLayers[geopackageId][tableName]
        this.removeLayerFromMap(layer, geopackageId + '_' + tableName)
        delete this.geopackageMapLayers[geopackageId][tableName]
      }
    },
    removeGeoPackage (geopackageId) {
      for (let tableName of keys(this.geopackageMapLayers[geopackageId])) {
        this.removeGeoPackageTable(geopackageId, tableName)
      }
      delete this.geopackageMapLayers[geopackageId]
    },
    addGeoPackageTileTable (geopackage, map, tableName) {
      let self = this
      let layer = constructLayer({
        id: geopackage.id + '_' + tableName,
        filePath: geopackage.path,
        sourceLayerName: tableName,
        layerType: 'GeoPackage',
        extent: geopackage.tables.tiles[tableName].extent,
        minZoom: geopackage.tables.tiles[tableName].minZoom,
        maxZoom: geopackage.tables.tiles[tableName].maxZoom
      })
      let mapLayer = constructMapLayer({ layer: layer, crs: this.getMapProjection() })
      if (geopackage.tables.tiles[tableName].visible) {
        self.geopackageMapLayers[geopackage.id][tableName] = mapLayer
        self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, true))
      }
    },
    addGeoPackageFeatureTable (geopackage, map, tableName) {
      let self = this
      let layer = constructLayer({
        id: geopackage.id + '_' + tableName,
        geopackageFilePath: geopackage.path,
        sourceDirectory: geopackage.path,
        sourceLayerName: tableName,
        sourceType: 'GeoPackage',
        layerType: 'Vector',
        styleKey: geopackage.tables.features[tableName].styleKey,
        count: geopackage.tables.features[tableName].featureCount,
        extent: geopackage.tables.features[tableName].extent,
      })
      let mapLayer = constructMapLayer({ layer: layer, maxFeatures: this.project.maxFeatures, crs: this.getMapProjection() })
      if (geopackage.tables.features[tableName].visible) {
        self.geopackageMapLayers[geopackage.id][tableName] = mapLayer
        self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, false))
      }
    },
    async zoomToContent () {
      let self = this
      self.getExtentForVisibleGeoPackagesAndLayers().then((extent) => {
        if (!isNil(extent)) {
          zoomToExtent(extent)
        }
      })
    },
    updateExtent (overallExtent, layerExtent) {
      if (isNil(overallExtent)) {
        overallExtent = layerExtent.slice()
      } else {
        if (layerExtent[0] < overallExtent[0]) {
          overallExtent[0] = layerExtent[0]
        }
        if (layerExtent[1] < overallExtent[1]) {
          overallExtent[1] = layerExtent[1]
        }
        if (layerExtent[2] > overallExtent[2]) {
          overallExtent[2] = layerExtent[2]
        }
        if (layerExtent[3] > overallExtent[3]) {
          overallExtent[3] = layerExtent[3]
        }
      }
      return overallExtent
    },
    async getExtentForVisibleGeoPackagesAndLayers () {
      let overallExtent = null
      let geopackageKeys = keys(geopackageLayers)
      for (let i = 0; i < geopackageKeys.length; i++) {
        const geopackageId = geopackageKeys[i]
        const geopackage = geopackageLayers[geopackageId]
        const tablesToZoomTo = keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
        if (tablesToZoomTo.length > 0) {
          const extentForGeoPackage = await window.mapcache.getExtentOfGeoPackageTables(geopackage.path, tablesToZoomTo)
          if (!isNil(extentForGeoPackage)) {
            overallExtent = this.updateExtent(overallExtent, extentForGeoPackage)
          }
        }
      }
      const visibleSourceKeys = keys(this.dataSourceMapLayers).filter(key => this.dataSourceMapLayers[key].getLayer().visible)
      for (let i = 0; i < visibleSourceKeys.length; i++) {
        const layerExtent = this.dataSourceMapLayers[visibleSourceKeys[i]].getLayer().extent
        if (!isNil(layerExtent)) {
          overallExtent = this.updateExtent(overallExtent, layerExtent)
        }
      }

      if (this.searchResultLayers != null) {
        const bounds = this.searchResultLayers.pointFeatures.getBounds().extend(this.searchResultLayers.nonPointFeatures.getBounds()).pad(0.5)
        overallExtent = this.updateExtent(overallExtent, [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()])
      }

      return overallExtent
    },
    updateLayerOrder (evt) {
      document.body.style.cursor = 'default'
      const layerOrderTmp = this.layerOrder.slice()
      const oldIndex = evt.oldIndex
      let newIndex = Math.max(0, evt.newIndex)
      if (newIndex >= layerOrderTmp.length) {
        let k = newIndex - layerOrderTmp.length + 1
        while (k--) {
          layerOrderTmp.push(undefined)
        }
      }
      layerOrderTmp.splice(newIndex, 0, layerOrderTmp.splice(oldIndex, 1)[0])
      this.layerOrder = layerOrderTmp
    },
    reorderMapLayers (sortedLayers) {
      let newLayerOrder = []
      sortedLayers.forEach(layerId => {
        newLayerOrder.push(this.layerOrder.find(l => l.id === layerId))
      })
      for (let i = 0; i < this.layerOrder.length; i++) {
        const layer = this.layerOrder[i]
        if (sortedLayers.find(id => id === layer.id) == null) {
          newLayerOrder.splice(i, 0, layer)
        }
      }
      this.layerOrder = newLayerOrder
    },
    registerResizeObserver () {
      let self = this
      if (this.observer) {
        this.observer.disconnect()
      }
      this.observer = new ResizeObserver(() => {
        const height = document.getElementById('feature-table-ref').offsetHeight
        const map = document.getElementById('map')
        map.style.maxHeight = `calc(100% - ${height}px)`
        self.map.invalidateSize()
      })
      this.observer.observe(document.getElementById('feature-table-ref'))
    },
    setAttribution (attribution) {
      if (this.attributionControl) {
        this.map.removeControl(this.attributionControl)
      }
      this.attributionControl = L.control.attribution({
        prefix: false,
        position: 'bottomright',
      })
      this.attributionControl.addAttribution('<a onclick="window.mapcache.openExternal(\'https://leafletjs.com/\')" href="#">Leaflet</a>')
      if (attribution != null) {
        this.attributionControl.addAttribution(attribution)
      }
      this.map.addControl(this.attributionControl)
    },
    initializeMap (centerAndZoom) {
      const defaultCenter = centerAndZoom ? centerAndZoom.center : [40.809118, 61.614383]
      const defaultZoom = centerAndZoom ? centerAndZoom.zoom : 3
      this.map = L.map('map', {
        attributionControl: false,
        center: defaultCenter,
        editOptions: {
          zIndex: 502,
        },
        zoom: defaultZoom,
        minZoom: 2,
        maxZoom: 20,
        scrollWheelZoom: false,
        smoothWheelZoom: true,
        smoothSensitivity: 1,
        crs: this.getMapProjection(),
        detectRetina: window.devicePixelRatio > 1
      })
      window.mapcache.setMapZoom({ projectId: this.project.id, mapZoom: Math.floor(defaultZoom) })
      this.createMapPanes()
      this.createGridOverlays()
      this.setupControls()
      this.setupBaseMaps()
      this.map.setView(defaultCenter, defaultZoom)
      this.setupEventHandlers()
    },
    createGridOverlays () {
      this.garsGridOverlay = L.garsGrid({
        pane: GRID_SELECTION_PANE.name,
        zIndex: GRID_SELECTION_PANE.zIndex,
        dark: this.darkTheme
      })
      this.mgrsGridOverlay = L.mgrsGrid({
        pane: GRID_SELECTION_PANE.name,
        zIndex: GRID_SELECTION_PANE.zIndex,
        dark: this.darkTheme
      })
      this.xyzGridOverlay = L.xyzGrid({
        interactive: false,
        pane: GRID_SELECTION_PANE.name,
        zIndex: GRID_SELECTION_PANE.zIndex,
        dark: this.darkTheme
      })
    },
    createMapPanes () {
      this.map.createPane(BASE_MAP_PANE.name)
      this.map.getPane(BASE_MAP_PANE.name).style.zIndex = BASE_MAP_PANE.zIndex
      this.map.createPane(OVERLAY_PANE_FEATURES.name)
      this.map.getPane(OVERLAY_PANE_FEATURES.name).style.zIndex = OVERLAY_PANE_FEATURES.zIndex
      this.map.createPane(DRAWING_VERTEX_PANE.name)
      this.map.getPane(DRAWING_VERTEX_PANE.name).style.zIndex = DRAWING_VERTEX_PANE.zIndex
      this.map.createPane(DRAWING_LAYER_PANE.name)
      this.map.getPane(DRAWING_LAYER_PANE.name).style.zIndex = DRAWING_LAYER_PANE.zIndex
      this.map.createPane(SEARCH_RESULTS_PANE.name)
      this.map.getPane(SEARCH_RESULTS_PANE.name).style.zIndex = SEARCH_RESULTS_PANE.zIndex
      this.map.createPane(SEARCH_RESULT_POINTS_ONLY_PANE.name)
      this.map.getPane(SEARCH_RESULT_POINTS_ONLY_PANE.name).style.zIndex = SEARCH_RESULT_POINTS_ONLY_PANE.zIndex
      this.map.createPane(GRID_SELECTION_PANE.name)
      this.map.getPane(GRID_SELECTION_PANE.name).style.zIndex = GRID_SELECTION_PANE.zIndex
    },
    performReverseQuery () {
      const self = this
      const zoom = Math.floor(self.map.getZoom())
      self.closePopup()
      self.performingReverseQuery = true
      document.getElementById('map').style.cursor = 'wait'
      self.$nextTick(() => {
        reverseQueryNominatim(this.nominatimUrl, self.contextMenuCoordinate.lat, self.contextMenuCoordinate.lng, zoom).then(result => {
          if (result.error) {
            EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, result.error)
          } else if (result.featureCollection.features.length === 0) {
            EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Nothing found.')
          } else {
            result.fitMapToData = false
            EventBus.$emit(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, result)
            self.$nextTick(() => {
              if (result.featureCollection.features.length > 0) {
                EventBus.$emit(EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, result.featureCollection.features[0].properties.osm_id)
              }
            })
          }
        }).catch(() => {
          // eslint-disable-next-line no-console
          console.error('Error retrieving nominatim reverse query results.')
        }).finally(() => {
          self.$nextTick(() => {
            document.getElementById('map').style.cursor = ''
            self.performingReverseQuery = false
          })
        })
      })
    },
    isMapBusy () {
      return !this.cursorInside || this.isDragging || this.contextMenuPopup != null || this.geopackageFeatureLayerSelectionDialog || this.showAddFeatureDialog || !isNil(this.drawBoundsId) || !isNil(this.gridBoundsId) || this.performingReverseQuery
    },
    setupBaseMaps () {
      for (let i = 0; i < this.baseMaps.length; i++) {
        this.addBaseMap(this.baseMaps[i], this.map)
      }
    },
    displayGeoPackageFeatureLayerSelection () {
      this.$nextTick(() => {
        this.geopackageFeatureLayerSelectionDialog = true
      })
    },
    saveRangeRingFeature (feature) {
      this.createdLayer = feature
      this.displayGeoPackageFeatureLayerSelection()
    },
    setupLeafletGeoman () {
      this.map.pm.setGlobalOptions({
        continueDrawing: false,
        allowSelfIntersection: true,
        panes: {
          vertexPane: DRAWING_VERTEX_PANE.name, layerPane: DRAWING_LAYER_PANE.name, markerPane: DRAWING_VERTEX_PANE.name
        },
        snapDistance: 5
      })
      this.map.pm.addControls({
        position: 'topright',
        drawCircleMarker: false,
        editControls: false,
        drawText: false,
      })

      this.map.on('pm:create', ({ layer }) => {
        if (!this.isEditing && !this.showRangeRingTool) {
          this.createdLayer = layer
          this.displayGeoPackageFeatureLayerSelection()
        }
      })
      this.map.on('pm:drawstart', () => {
        this.isDrawing = true
      })
      this.map.on('pm:drawend', () => {
        this.isDrawing = false
      })
    },
    setupControls () {
      const self = this
      // create controls
      this.basemapControl = new LeafletBaseMapTool({}, function () {
        self.showBaseMapSelection = !self.showBaseMapSelection
        if (self.showBaseMapSelection) {
          self.showLayerOrderingDialog = false
          self.showGridSelection = false
        }
      })
      this.gridOverlayControl = new LeafletGridOverlayTool({}, function () {
        self.showGridSelection = !self.showGridSelection
        if (self.showGridSelection) {
          self.showLayerOrderingDialog = false
          self.showBaseMapSelection = false
        }
      })
      this.leafletRangeRingControl = new LeafletRangeRingControl({}, function () {
        self.showRangeRingTool = true
        self.showLayerOrderingDialog = false
        self.showBaseMapSelection = false
        self.showGridSelection = false
        self.disableGeomanToolbar()
      })
      this.displayZoomControl = new LeafletZoomIndicator()
      this.snapshotControl = new LeafletSnapshot()
      this.activeLayersControl = new LeafletActiveLayersTool({}, function () {
        self.zoomToContent()
      }, function () {
        window.mapcache.clearActiveLayers({ projectId: self.projectId })
      }, function () {
        self.showLayerOrderingDialog = !self.showLayerOrderingDialog
        if (self.showLayerOrderingDialog) {
          self.showBaseMapSelection = false
          self.showGridSelection = false
        }
      })
      this.scaleControl = L.control.scale()
      this.coordinateControl = new LeafletCoordinates()

      // add controls to map
      this.map.addControl(this.basemapControl)
      this.map.addControl(this.gridOverlayControl)
      this.map.zoomControl.setPosition('topright')
      this.map.addControl(this.displayZoomControl)
      this.map.addControl(this.snapshotControl)
      this.map.addControl(this.scaleControl)
      this.map.addControl(this.coordinateControl)
      this.map.addControl(this.activeLayersControl)

      this.setupLeafletGeoman()

      this.map.addControl(this.leafletRangeRingControl)

      // hide controls that are disabled by the user
      this.project.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
      this.project.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
      this.project.displayCoordinates ? this.coordinateControl.getContainer().style.display = '' : this.coordinateControl.getContainer().style.display = 'none'
      this.project.displayScale ? this.scaleControl.getContainer().style.display = '' : this.scaleControl.getContainer().style.display = 'none'

      // prevent bubbling of mouse events while in controls
      const elementList = document.getElementsByClassName('leaflet-control')
      const stopBubbling = (e) => {
        // need to force hiding of highlight as map does not produce a mouse out event
        this.removeGeoPackageFeatureHighlight()
        e.stopPropagation()
        e.preventDefault();
        return true
      }
      Object.values(elementList).forEach(el => {
        el.addEventListener('mouseover', stopBubbling)
        el.addEventListener('mousemove', stopBubbling)
      })
    },
    debounceClickHandler: debounce(function () {
      this.consecutiveClicks = 0
    }, DOUBLE_CLICK_THRESHOLD),
    setupEventHandlers () {
      const checkFeatureCount = throttle(async (e) => {
        if (!this.isMapBusy()) {
          let { feature, layer } = await this.queryForClosestFeature(e)
          if (feature != null) {
            document.getElementById('map').style.cursor = 'pointer'
            await this.highlightGeoPackageFeature(layer.id, layer.isGeoPackage, layer.path, layer.tableName, feature)
          } else {
            this.removeGeoPackageFeatureHighlight()
            document.getElementById('map').style.cursor = ''
          }
        } else {
          this.removeGeoPackageFeatureHighlight()
        }
      }, 100)

      const clickHandler = (e) => {
        this.showLayerOrderingDialog = false
        this.showGridSelection = false
        this.showBaseMapSelection = false
        if (!this.nominatimReverseQueryResultsReturned) {
          this.consecutiveClicks++
          if (this.searchResultLayers != null) {
            EventBus.$emit(EventBus.EventTypes.DESELECT_NOMINATIM_SEARCH_RESULT)
          }
          this.debounceClickHandler(e)
        }
        this.nominatimReverseQueryResultsReturned = false
      }

      this.map.on('click', clickHandler)
      this.map.on('moveend', () => {
        if (this.map != null) {
          const bounds = this.map.getBounds()
          this.mapBounds = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
        }
      })

      this.map.on('mousemove', (e) => {
        checkFeatureCount(e)
      })
      this.map.on('mouseout', () => {
        this.removeGeoPackageFeatureHighlight()
      })
      this.map.on('contextmenu', e => {
        if (!this.isEditing) {
          this.contextMenuCoordinate = e.latlng
          if (this.contextMenuPopup && this.contextMenuPopup.isOpen()) {
            this.contextMenuPopup.setLatLng(e.latlng)
          } else {
            this.$nextTick(() => {
              this.contextMenuPopup = L.popup({
                minWidth: 226,
                maxWidth: 226,
                maxHeight: 227,
                closeButton: false,
                className: 'search-popup',
                offset: L.point(113, 235)
              })
              .setLatLng(e.latlng)
              .setContent(this.$refs['contextMenuPopup'])
              .openOn(this.map)

              const startCloseContextMenuTimer = () => {
                this.closeContextMenuTimeoutId = setTimeout(() => {
                  this.closeContextMenuTimeoutId = null
                  this.map.closePopup()
                }, 250)
              }

              const cancelCloseContextMenuTimer = () => {
                clearTimeout(this.closeContextMenuTimeoutId)
              }

              L.DomEvent.on(this.contextMenuPopup._container, 'mouseover', cancelCloseContextMenuTimer)
              L.DomEvent.on(this.contextMenuPopup._container, 'mouseout', startCloseContextMenuTimer)
            })

            this.map.once('popupclose', () => {
              this.contextMenuPopup = null
            })
          }
        }
      })
      this.map.on('zoomend', () => {
        window.mapcache.setMapZoom({ projectId: this.project.id, mapZoom: Math.floor(this.map.getZoom()) })
      })
    },
    addLayersToMap () {
      for (const sourceId in this.sources) {
        this.addDataSource(this.sources[sourceId], this.map)
      }
      for (const geopackageId in this.geopackages) {
        this.addGeoPackageToMap(this.geopackages[geopackageId], this.map)
      }
    },
    createDefaultBaseMapLayer (baseMap, dark = false) {
      return new L.TileLayer(this.mapProjection === WEB_MERCATOR_CODE ? baseMap.layerConfiguration.url : baseMap.layerConfiguration.pcUrl, {
        pane: BASE_MAP_PANE.name,
        zIndex: BASE_MAP_PANE.zIndex,
        subdomains: baseMap.layerConfiguration.subdomains || [],
        attribution: baseMap.layerConfiguration.attribution || '',
        minZoom: 0,
        maxZoom: 20,
        className: dark ? 'dark' : '',
        crossOrigin: 'Anonymous',
        crs: this.getMapProjection(),
      })
    },
    getMapProjection() {
      return this.mapProjection === WEB_MERCATOR_CODE ? L.CRS.EPSG3857 : L.CRS.EPSG4326
    },
    createOfflineBaseMapLayer (baseMap, dark = false) {
      let layer = constructLayer({
        id: baseMap.id,
        geopackageFilePath: window.mapcache.getOfflineGeoPackageFilePath(),
        sourceType: 'GeoPackage',
        sourceLayerName: 'basemap',
        layerType: 'Vector',
        styleKey: 0,
        count: 1,
        extent: [-180, -90, 180, 90],
      })
      return constructMapLayer({
        layer: layer,
        mapPane: BASE_MAP_PANE.name,
        zIndex: BASE_MAP_PANE.zIndex,
        maxFeatures: 5000,
        className: dark ? 'dark' : '',
        crs: this.getMapProjection()
      })
    },
    cancelRangeRingTool () {
      this.showRangeRingTool = false
      this.leafletRangeRingControl.enable()
      this.enableGeomanToolbar()
    }
  },
  watch: {
    mapProjection: {
      handler () {
        this.resetMap()
      }
    },
    featureTablePoppedOut: {
      handler (value) {
        if (this.lastShowFeatureTableEvent != null) {
          this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage, value)
        }
      }
    },
    gridSelection: {
      handler (newValue) {
        this.updateGrid(newValue)
      }
    },
    baseMaps: {
      handler (newBaseMaps) {
        const self = this
        const selectedBaseMapId = this.selectedBaseMapId
        const isDefaultBaseMap = self.defaultBaseMapIds.indexOf(selectedBaseMapId) !== -1

        let oldConfig
        if (!isNil(self.baseMapLayers[selectedBaseMapId]) && !isDefaultBaseMap) {
          oldConfig = self.baseMapLayers[selectedBaseMapId].getLayer()._configuration
        }
        // update the layer config stored for each base map
        newBaseMaps.filter(self.notReadOnlyBaseMapFilter).forEach(baseMap => {
          if (self.baseMapLayers[baseMap.id]) {
            self.baseMapLayers[baseMap.id].update(baseMap.layerConfiguration)
            self.baseMapLayers[baseMap.id].getLayer().error = baseMap.error
          }
        })
        const selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === selectedBaseMapId)
        if (!isDefaultBaseMap) {
          // if currently selected baseMapId is no longer available, be sure to remove it and close out the layer if possible
          if (isNil(selectedBaseMap)) {
            if (newBaseMaps.length - 1 < this.baseMapIndex) {
              this.baseMapIndex = newBaseMaps.length - 1
            }
            const layer = self.baseMapLayers[selectedBaseMapId]
            if (layer) {
              self.map.removeLayer(self.baseMapLayers[selectedBaseMapId])
            }
            delete self.baseMapLayers[selectedBaseMapId]
            self.selectedBaseMapId = newBaseMaps[self.baseMapIndex].id
          } else if (!isNil(oldConfig)) {
            const newConfig = selectedBaseMap.layerConfiguration
            const repaintFields = self.baseMapLayers[selectedBaseMapId].getLayer().getRepaintFields()
            const repaintRequired = !isEqual(pick(newConfig, repaintFields), pick(oldConfig, repaintFields))
            if (repaintRequired) {
              self.baseMapLayers[selectedBaseMapId].redraw()
            }
            this.mapBackground = this.$vuetify.theme.dark ? (selectedBaseMap.darkBackground || selectedBaseMap.background || '#333333') : (selectedBaseMap.background || '#ddd')
          }
        }
      }
    },
    selectedBaseMapId: {
      handler (newBaseMapId, oldBaseMapId) {
        const self = this
        self.connectingToBaseMap = false
        self.$nextTick(async () => {
          this.baseMapIndex = self.baseMaps.findIndex(baseMap => baseMap.id === newBaseMapId)
          const newBaseMap = self.baseMaps[self.baseMapIndex]

          let success = true
          if (!newBaseMap.readonly && !isNil(newBaseMap.layerConfiguration) && isRemote(newBaseMap.layerConfiguration)) {
            this.connectingToBaseMap = true
            success = await connectToBaseMap(newBaseMap, window.mapcache.editBaseMap, newBaseMap.layerConfiguration.timeoutMs)
            this.connectingToBaseMap = false
          }

          // remove old map layer
          if (self.baseMapLayers[oldBaseMapId]) {
            self.map.removeLayer(self.baseMapLayers[oldBaseMapId])
          }

          if (success && !window.mapcache.isRasterMissing(newBaseMap.layerConfiguration)) {
            // check to see if base map has already been added
            if (isNil(self.baseMapLayers[newBaseMapId])) {
              self.addBaseMap(newBaseMap, self.map)
            } else {
              // do not update read only base maps id
              if (!newBaseMap.readonly) {
                self.baseMapLayers[newBaseMapId].update(newBaseMap.layerConfiguration)
              }
              self.map.addLayer(self.baseMapLayers[newBaseMapId])
              this.setAttribution(newBaseMap.attribution)
              self.baseMapLayers[newBaseMapId].bringToBack()
            }
            self.mapBackground = self.$vuetify.theme.dark ? (newBaseMap.darkBackground || newBaseMap.background || '#333333') : (newBaseMap.background || '#ddd')
          } else {
            self.map.addLayer(self.baseMapLayers[self.offlineBaseMapId])
            this.setAttribution(newBaseMap.attribution)
            self.baseMapLayers[self.offlineBaseMapId].bringToBack()
            self.selectedBaseMapId = self.offlineBaseMapId
          }
        })
      }
    },
    visible: {
      handler () {
        const self = this
        self.$nextTick(() => {
          if (self.map) {
            self.map.invalidateSize()
          }
        })
      }
    },
    resizeListener: {
      handler (newValue, oldValue) {
        if (newValue !== oldValue) {
          const self = this
          self.$nextTick(() => {
            if (self.map) {
              self.map.invalidateSize()
            }
          })
        }
      }
    },
    isEditing: {
      handler (newValue) {
        if (newValue) {
          this.snapshotControl.disable()
          this.disableGeomanToolbar()
          this.leafletRangeRingControl.disable()
        } else {
          this.snapshotControl.enable()
          this.enableGeomanToolbar()
          this.leafletRangeRingControl.enable()
        }
      }
    },
    isDrawingBounds: {
      handler (newValue) {
        if (newValue) {
          this.snapshotControl.disable()
          this.disableGeomanToolbar()
          this.leafletRangeRingControl.disable()
        } else {
          this.snapshotControl.enable()
          this.enableGeomanToolbar()
          this.leafletRangeRingControl.enable()
        }
      }
    },
    layerOrder: {
      handler (layers) {
        layers.forEach(layer => {
          let mapLayer
          if (!isNil(layer.geopackageId) && this.geopackageMapLayers[layer.geopackageId] && this.geopackageMapLayers[layer.geopackageId][layer.tableName]) {
            mapLayer = this.geopackageMapLayers[layer.geopackageId][layer.tableName]
          } else if (isNil(layer.geopackageId) && !isNil(this.dataSourceMapLayers[layer.id])) {
            mapLayer = this.dataSourceMapLayers[layer.id]
          }
          if (!isNil(mapLayer)) {
            mapLayer.bringToBack()
          }
        })
        this.baseMapLayers[this.selectedBaseMapId].bringToBack()
        window.mapcache.setMapRenderingOrder({ projectId: this.projectId, mapRenderingOrder: layers.map(l => l.id) })
        if (layers.length > 0 || this.searchResultLayers != null) {
          this.activeLayersControl.enable(this.layerOrder.length)
        } else {
          this.activeLayersControl.disable()
          this.showLayerOrderingDialog = false
        }
      }
    },
    sources: {
      async handler (updatedSources) {
        let self = this
        let map = this.map
        let updatedSourceIds = Object.keys(updatedSources)
        let existingSourceIds = Object.keys(this.dataSourceMapLayers)

        // handle deletion of a data source
        existingSourceIds.filter((i) => updatedSourceIds.indexOf(i) < 0).forEach(sourceId => {
          self.removeDataSource(sourceId)
          // hide feature table if source has been removed
          if (this.lastShowFeatureTableEvent != null && !this.lastShowFeatureTableEvent.isGeoPackage && this.lastShowFeatureTableEvent.id === sourceId) {
            this.lastShowFeatureTableEvent = null
            this.hideFeatureTable()
          }
        })

        // handle a new data source being added
        updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) < 0).forEach(sourceId => {
          let sourceConfig = updatedSources[sourceId]
          self.removeDataSource(sourceId)
          self.addDataSource(sourceConfig, map)
        })

        // update existing data sources, some may have not been initialized yet
        this.$nextTick(async () => {
          const changedSourceIds = updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) >= 0)
          for (let i = 0; i < changedSourceIds.length; i++) {
            const sourceId = changedSourceIds[i]
            const newConfig = cloneDeep(updatedSources[sourceId])
            const oldConfig = this.dataSourceMapLayers[sourceId].getLayer()._configuration

            const enablingLayer = !oldConfig.visible && newConfig.visible
            const disablingLayer = oldConfig.visible && !newConfig.visible
            const repaintFields = this.dataSourceMapLayers[sourceId].getLayer().getRepaintFields()
            const repaintRequired = oldConfig.visible && !isEqual(pick(newConfig, repaintFields), pick(oldConfig, repaintFields))

            // update layer
            this.dataSourceMapLayers[sourceId].update(newConfig)

            // disabling layer, so remove it from the map
            if (disablingLayer) {
              this.removeLayerFromMap(this.dataSourceMapLayers[sourceId], sourceId)
            } else if (enablingLayer) {
              // test if remote source is healthy
              let valid = true
              if (isRemote(newConfig)) {
                try {
                  await this.dataSourceMapLayers[sourceId].testConnection()
                } catch (e) {
                  window.mapcache.setSourceError({ id: sourceId, error: e })
                  valid = false
                }
              }
              if (valid && this.dataSourceMapLayers[sourceId].getLayer().visible) {
                // enabling map layer, if this has been initialized, we are good to go
                this.addLayerToMap(map, this.dataSourceMapLayers[sourceId], generateLayerOrderItemForSource(this.dataSourceMapLayers[sourceId].getLayer()))
              }
            } else if (repaintRequired) {
              this.dataSourceMapLayers[sourceId].redraw()
              // refresh feature table if a repaint was required (this could just be a style change, but also maybe a feature edit)
              if (this.lastShowFeatureTableEvent != null && !this.lastShowFeatureTableEvent.isGeoPackage && this.lastShowFeatureTableEvent.id === sourceId) {
                await this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage)
              }
            }
          }
        })
      },
      deep: true
    },
    geopackages: {
      handler (updatedGeoPackages) {
        let self = this
        let map = this.map
        let updatedGeoPackageKeys = Object.keys(updatedGeoPackages)
        let existingGeoPackageKeys = Object.keys(geopackageLayers)

        // remove geopackages that were removed
        existingGeoPackageKeys.filter((i) => updatedGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
          self.removeGeoPackage(geoPackageId)
          // hide feature table when a geopackage has been removed
          if (this.lastShowFeatureTableEvent != null && this.lastShowFeatureTableEvent.isGeoPackage && this.lastShowFeatureTableEvent.id === geoPackageId) {
            this.lastShowFeatureTableEvent = null
            this.hideFeatureTable()
          }
        })

        // new source configs
        updatedGeoPackageKeys.filter((i) => existingGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
          self.removeGeoPackage(geoPackageId)
          self.addGeoPackageToMap(updatedGeoPackages[geoPackageId], map)
        })

        updatedGeoPackageKeys.filter((i) => existingGeoPackageKeys.indexOf(i) >= 0).forEach(geoPackageId => {
          let updatedGeoPackage = updatedGeoPackages[geoPackageId]
          let oldGeoPackage = geopackageLayers[geoPackageId]

          if (!isEqual(updatedGeoPackage.path, oldGeoPackage.path)) {
            const newVisibleFeatureTables = keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible)
            const newVisibleTileTables = keys(updatedGeoPackage.tables.tiles).filter(table => updatedGeoPackage.tables.tiles[table].visible)
            newVisibleTileTables.forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
              this.addGeoPackageTileTable(updatedGeoPackage, map, tableName)
            })
            newVisibleFeatureTables.forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
              this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
            })
            if (this.lastShowFeatureTableEvent != null && this.lastShowFeatureTableEvent.isGeoPackage && this.lastShowFeatureTableEvent.id === geoPackageId) {
              this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage)
            }
          } else if (!isEqual(updatedGeoPackage.tables, oldGeoPackage.tables)) {
            const oldVisibleFeatureTables = keys(oldGeoPackage.tables.features).filter(table => oldGeoPackage.tables.features[table].visible)
            const oldVisibleTileTables = keys(oldGeoPackage.tables.tiles).filter(table => oldGeoPackage.tables.tiles[table].visible)
            const newVisibleFeatureTables = keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible)
            const newVisibleTileTables = keys(updatedGeoPackage.tables.tiles).filter(table => updatedGeoPackage.tables.tiles[table].visible)

            // tables removed
            const featureTablesRemoved = difference(keys(oldGeoPackage.tables.features), keys(updatedGeoPackage.tables.features))
            const tileTablesRemoved = difference(keys(oldGeoPackage.tables.tiles), keys(updatedGeoPackage.tables.tiles))

            // hide feature table when a geopackage table has been removed (though check if it was renamed, i.e. table added, table removed)
            if (this.lastShowFeatureTableEvent != null && this.lastShowFeatureTableEvent.isGeoPackage && this.lastShowFeatureTableEvent.id === geoPackageId && featureTablesRemoved.indexOf(this.lastShowFeatureTableEvent.tableName) !== -1) {
              const tablesAdded = difference(keys(updatedGeoPackage.tables.features), keys(oldGeoPackage.tables.features))
              if (featureTablesRemoved.length === 1 && tablesAdded.length === 1) {
                this.lastShowFeatureTableEvent.tableName = tablesAdded[0]
                this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage)
              } else {
                this.lastShowFeatureTableEvent = null
                this.hideFeatureTable()
              }
            }

            // tables turned on
            const featureTablesTurnedOn = difference(newVisibleFeatureTables, oldVisibleFeatureTables)
            const tileTablesTurnedOn = difference(newVisibleTileTables, oldVisibleTileTables)

            // tables turned off
            const featureTablesTurnedOff = difference(oldVisibleFeatureTables, newVisibleFeatureTables)
            const tileTablesTurnedOff = difference(oldVisibleTileTables, newVisibleTileTables)

            // remove feature and tile tables that were turned off or deleted
            tileTablesRemoved.concat(tileTablesTurnedOff).concat(featureTablesRemoved).concat(featureTablesTurnedOff).forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
            })

            // add feature and tile tables that were turned on
            tileTablesTurnedOn.forEach(tableName => {
              this.addGeoPackageTileTable(updatedGeoPackage, map, tableName)
            })
            featureTablesTurnedOn.forEach(tableName => {
              this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
            })

            // tables with updated style key
            const featureTablesStyleUpdated = keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible && oldGeoPackage.tables.features[table] && featureTablesTurnedOn.indexOf(table) === -1 && updatedGeoPackage.tables.features[table].styleKey !== oldGeoPackage.tables.features[table].styleKey)
            featureTablesStyleUpdated.forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
              this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
              // hide feature table when a geopackage table has been removed
              if (this.lastShowFeatureTableEvent != null && this.lastShowFeatureTableEvent.isGeoPackage && this.lastShowFeatureTableEvent.id === geoPackageId && tableName === this.lastShowFeatureTableEvent.tableName) {
                this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage)
              }
            })
          }

          geopackageLayers[updatedGeoPackage.id] = cloneDeep(updatedGeoPackage)
        })
      },
      deep: true
    },
    darkTheme: {
      handler (newDarkTheme) {
        getDefaultBaseMaps().forEach(bm => {
          const baseMapLayer = this.baseMapLayers[bm.id]
          if (baseMapLayer != null) {
            if (bm.id === this.selectedBaseMapId) {
              this.map.removeLayer(this.baseMapLayers[bm.id])
            }
            if (bm.id !== getOfflineBaseMapId()) {
              this.baseMapLayers[bm.id] = this.createDefaultBaseMapLayer(bm, newDarkTheme)
            } else {
              this.baseMapLayers[bm.id] = this.createOfflineBaseMapLayer(bm, newDarkTheme)
            }
            if (bm.id === this.selectedBaseMapId) {
              this.map.addLayer(this.baseMapLayers[bm.id])
              this.setAttribution(bm.attribution)
              this.baseMapLayers[bm.id].bringToBack()
              this.mapBackground = newDarkTheme ? (bm.darkBackground || bm.background || '#333333') : (bm.background || '#ddd')
            }
          }
        })

        if (this.gridLayer == null) {
          this.garsGridOverlay.setDarkModeEnabled(newDarkTheme)
          this.mgrsGridOverlay.setDarkModeEnabled(newDarkTheme)
          this.xyzGridOverlay.setDarkModeEnabled(newDarkTheme)

          if (this.gridSelection === 1) {
            this.xyzGridOverlay.remove()
            this.xyzGridOverlay.addTo(this.map)
          } else if (this.gridSelection === 2) {
            this.garsGridOverlay.remove()
            this.garsGridOverlay.addTo(this.map)
          } else if (this.gridSelection === 3) {
            this.mgrsGridOverlay.remove()
            this.mgrsGridOverlay.addTo(this.map)
          }
        }
      }
    },
    project: {
      async handler (updatedProject) {
        let self = this
        if (this.map != null) {
          updatedProject.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
          updatedProject.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
          updatedProject.displayCoordinates ? this.coordinateControl.getContainer().style.display = '' : this.coordinateControl.getContainer().style.display = 'none'
          updatedProject.displayScale ? this.scaleControl.getContainer().style.display = '' : this.scaleControl.getContainer().style.display = 'none'
        }

        // max features setting changed
        if (updatedProject.maxFeatures !== this.maxFeatures) {
          for (const gp of Object.values(updatedProject.geopackages)) {
            for (const tableName of Object.keys(gp.tables.features)) {
              if (self.geopackageMapLayers[gp.id] && self.geopackageMapLayers[gp.id][tableName] && self.geopackageMapLayers[gp.id][tableName]) {
                const layer = self.geopackageMapLayers[gp.id][tableName]
                if (!isNil(layer)) {
                  layer.updateMaxFeatures(updatedProject.maxFeatures)
                  if (gp.tables.features[tableName].visible) {
                    layer.redraw()
                  }
                }
              }
            }
          }
          for (const sourceId of keys(self.dataSourceMapLayers)) {
            // if this is a vector layer, update it
            if (self.dataSourceMapLayers[sourceId].getLayer().pane === 'vector') {
              // update max features
              self.dataSourceMapLayers[sourceId].updateMaxFeatures(updatedProject.maxFeatures)
              // if visible, we need to toggle the layer
              if (self.dataSourceMapLayers[sourceId].getLayer().visible) {
                self.dataSourceMapLayers[sourceId].redraw()
              }
            }
          }
          for (const baseMapId of keys(self.baseMapLayers)) {
            // if this is a vector layer, update it
            if (self.defaultBaseMapIds.indexOf(baseMapId) === -1 && self.baseMapLayers[baseMapId].getLayer().pane === 'vector') {
              // update max features
              self.baseMapLayers[baseMapId].updateMaxFeatures(updatedProject.maxFeatures)
              // if visible, we need to toggle the layer
              if (baseMapId === self.selectedBaseMapId) {
                self.baseMapLayers[baseMapId].redraw()
              }
            }
          }
        }
        this.maxFeatures = updatedProject.maxFeatures
        if (isNil(updatedProject.boundingBoxFilterEditing) || updatedProject.boundingBoxFilterEditing !== 'manual') {
          this.enableGeomanToolbar()
        } else {
          this.disableGeomanToolbar()
        }

        this.manualBoundingBoxDialog = !isNil(updatedProject.boundingBoxFilterEditing) && updatedProject.boundingBoxFilterEditing === 'manual'
      },
      deep: true
    }
  },
  mounted: function () {
    this.maxFeatures = this.project.maxFeatures
    this.registerResizeObserver()
    this.initializeMap()
    this.addLayersToMap()
    EventBus.$on(EventBus.EventTypes.SHOW_FEATURE_TABLE, payload => this.displayFeaturesForTable(payload.id, payload.tableName, payload.isGeoPackage, true))
    EventBus.$on(EventBus.EventTypes.REORDER_MAP_LAYERS, this.reorderMapLayers)
    EventBus.$on(EventBus.EventTypes.ZOOM_TO, (extent, minZoom = 0, maxZoom = 20) => {
      let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
      let bounds = L.latLngBounds(boundingBox)
      bounds = bounds.pad(0.05)
      const target = this.map._getBoundsCenterZoom(bounds, {
        minZoom: minZoom,
        maxZoom: Math.max(maxZoom, Math.floor(this.map.getZoom()))
      })
      const currentMapCenter = this.map.getCenter()
      const distanceFactor = Math.max(Math.abs(target.center.lat - currentMapCenter.lat) / 180.0, Math.abs(target.center.lng - currentMapCenter.lng) / 360.0)
      this.map.setView(target.center, Math.max(minZoom, target.zoom), {
        minZoom: minZoom,
        maxZoom: maxZoom,
        animate: true,
        duration: Math.min(0.5, 3.0 * distanceFactor)
      })
    })
    EventBus.$on(EventBus.EventTypes.EDIT_FEATURE_GEOMETRY, (feature) => {
      // setup map for feature editing
      if (feature != null) {
        EventBus.$emit(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS)
        this.disableSearch = true
      }
      this.editFeature(feature)
      // TODO: I want the feature to be hidden while it is edited, however, maybe i should keep it?
      //   Hack #1 - update this feature's style to be something dumb like totally invisible
      //   Hack #2 - remove the feature, edit, and then add back in?
      EventBus.$once(EventBus.EventTypes.STOP_EDITING_FEATURE_GEOMETRY, (save) => {
        this.disableSearch = false
        if (save) {
          const editedFeature = this.saveChanges(save)
          if (editedFeature != null) {
            EventBus.$emit(EventBus.EventTypes.EDITED_FEATURE_GEOMETRY, editedFeature)
          }
        } else {
          this.stopEditing()
        }
      })
    })
    EventBus.$on(EventBus.EventTypes.REQUEST_MAP_DETAILS, (options) => {
      let bounds = this.map.getBounds()
      if (options.padBounds) {
        bounds = bounds.pad(-0.1)
      }
      const details = {
        zoom: Math.floor(this.map.getZoom()),
        extent: [bounds.getSouthWest().lng, bounds.getSouthWest().lat, bounds.getNorthEast().lng, bounds.getNorthEast().lat]
      }
      EventBus.$emit(EventBus.EventTypes.RESPONSE_MAP_DETAILS, details)
    })
    window.mapcache.registerFeatureTableActionListener((event, {
      action,
      feature,
      path,
      table,
      featureId,
      id,
      isGeoPackage
    }) => {
      if (action === FEATURE_TABLE_ACTIONS.ZOOM_TO_FEATURE) {
        this.zoomToFeature(path, table, featureId)
      } else if (action === FEATURE_TABLE_ACTIONS.HIGHLIGHT_FEATURE) {
        this.highlightGeoPackageFeature(id, isGeoPackage, path, table, feature)
      } else if (action === FEATURE_TABLE_ACTIONS.SHOW_FEATURE) {
        this.showFeature(id, isGeoPackage, table, featureId)
      }
    })
    window.mapcache.registerHideFeatureTableWindowListener(() => {
      this.lastShowFeatureTableEvent = null
    })
  },
  beforeDestroy: function () {
    EventBus.$off([EventBus.EventTypes.REQUEST_MAP_DETAILS, EventBus.EventTypes.SHOW_FEATURE_TABLE, EventBus.EventTypes.REORDER_MAP_LAYERS, EventBus.EventTypes.ZOOM_TO, EventBus.EventTypes.EDIT_FEATURE_GEOMETRY, EventBus.EventTypes.STOP_EDITING_FEATURE_GEOMETRY])
    window.mapcache.unregisterFeatureTableActionListener()
    window.mapcache.unregisterHideFeatureTableWindowListener()
  },
  beforeUpdate: function () {
    const self = this
    self.$nextTick(() => {
      if (self.map) {
        self.map.invalidateSize()
      }
    })
  }
}
</script>

<style>
@import '~leaflet/dist/leaflet.css';

.popup {
  display: flex;
  flex-direction: column;
  min-height: 16vh;
  min-width: 30vh;
}

.popup_body {
  flex: 1 0 8vh;
  font-family: Roboto, sans-serif;
  font-size: 16px;
  font-weight: 500;
}

.popup_header {
  flex: 1 0 4vh;
  font-family: Roboto, sans-serif;
  font-size: 28px;
  font-weight: 700;
}

.popup_footer {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  flex: 1 0 4vh;
}

.results {
  color: black;
}

.leaflet-geosearch-bar {
  margin-left: 10px !important;
  margin-top: 10px !important;
}

.overlay-tooltip {
  position: absolute;
  display: flex;
  width: 200px;
  border: none;
}

.card-content {
  overflow-y: auto;
  max-width: 268px !important;
  max-height: 250px;
}

.basemap-card {
  top: 10px;
  min-width: 250px;
  max-width: 250px !important;
  position: absolute !important;
  right: 50px !important;
  max-height: 350px !important;
  border: 2px solid rgba(0, 0, 0, 0.2) !important;
}

.grid-overlay-card {
  top: 54px;
  min-width: 250px;
  max-width: 250px !important;
  position: absolute !important;
  right: 50px !important;
  max-height: 350px !important;
  border: 2px solid rgba(0, 0, 0, 0.2) !important;
}

.nominatim-card {
  top: 10px;
  min-width: 350px;
  max-width: 350px !important;
  position: absolute !important;
  left: 10px !important;
  max-height: 350px !important;
  border: 2px solid rgba(0, 0, 0, 0.2) !important;
}

.feature-editing-card {
  top: 62px !important;
  left: 0 !important;
  position: absolute !important;
  border: 2px solid rgba(0, 0, 0, 0.2) !important;
}

.reorder-card {
  max-width: 300px !important;
  position: absolute !important;
  right: 50px !important;
  max-height: 480px !important;
  border: 2px solid rgba(0, 0, 0, 0.2) !important;

ul {
  list-style-type: none !important;
}

}
.layer-order-list-item {
  min-height: 50px !important;
  cursor: move !important;
  background: var(--v-background-base) !important;
}

.layer-order-list-item i {
  cursor: pointer !important;
}

.flip-list-move {
  transition: transform 0.5s;
}

.no-move {
  transition: transform 0s;
}

.ghost {
  opacity: 0.5 !important;
  background-color: var(--v-primary-lighten2) !important;
}

.leaflet-popup-content-wrapper {
  color: var(--v-text-base) !important;

div {
  color: var(--v-text-base) !important;
}

}
.address-control {
  position: absolute;
  top: 8px;
  left: 16px;
  z-index: 10000;
}

.search-popup .leaflet-popup {
  margin: 0 !important;
  padding: 0 !important;
}

.search-popup .leaflet-popup-content-wrapper {
  margin: 0 !important;
  padding: 0 !important;
}

.search-popup .leaflet-popup-content {
  margin: 0 !important;
  padding: 0 !important;
}

.search-popup .leaflet-popup-tip-container {
  display: none !important;
}

.centered-label {
  display: flex !important;
  justify-content: center !important;
  font-weight: bold !important;
  text-align: center !important;
  vertical-align: middle !important;
  line-height: 256px !important;
  width: 256px !important;
}

.mgrs-gzd-label {
  border: #2e2e2e 1px solid !important;
  background: #FFFFFFAA !important;
}

.mgrs-100km-label {
  border: #2e2e2e 1px solid !important;
  background: #FFFF00AA !important;
}

.darken {
  filter: brightness(1.0) !important;
}

.pressed {
  filter: brightness(1.2) !important;
}

.dark {
  filter: brightness(0.7) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7) !important;
}

.leaflet-tile-container img {
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.05);
}
.leaflet-popup-tip {
  pointer-events: auto;
}
.leaflet-popup-tip-container {
  pointer-events: auto;
}
</style>
