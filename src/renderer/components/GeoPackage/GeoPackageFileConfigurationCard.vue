<template>
  <div>
    <card>
      <div slot="card">
        <v-card-title class="pt-0 pb-0 mt-0 mb-0">
          <view-edit-text value="File Configuration" font-color="#000000" font-size="1em" font-weight="500" :editing-disabled="true"/>
        </v-card-title>
        <v-card-text class="pt-0 pb-0 mt-0 mb-0">
          <div class="flex-container ma-2 pa-2" :style="{justifyContent: 'start'}">
            <v-text-field label="File Save Location" readonly :value="geopackage.fileName ? geopackage.fileName : 'Location Not Specified'"/>
            <v-btn text icon color="black" @click.stop="chooseSaveLocation">
              <v-icon>mdi-content-save</v-icon>
            </v-btn>
          </div>
        </v-card-text>
      </div>
    </card>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import { remote } from 'electron'
  import ViewEditText from '../Common/ViewEditText'
  import Card from '../Card/Card'

  export default {
    props: {
      projectId: String,
      geopackage: Object
    },
    components: {
      Card,
      ViewEditText
    },
    data () {
      return {
      }
    },
    computed: {
    },
    methods: {
      ...mapActions({
        setGeoPackageLocation: 'Projects/setGeoPackageLocation'
      }),
      chooseSaveLocation () {
        remote.dialog.showSaveDialog((fileName) => {
          if (!fileName.endsWith('.gpkg')) {
            fileName = fileName + '.gpkg'
          }
          this.setGeoPackageLocation({projectId: this.projectId, geopackageId: this.geopackage.id, fileName})
        })
      }
    }
  }
</script>

<style scoped>
  .gp-save-location-button {
    border-color: rgba(54, 62, 70, .87);
    border-width: 1px;
    border-radius: 4px;
    padding: .2em;
    color: rgba(255, 255, 255, .95);
    background-color: rgba(68, 152, 192, .95);
    cursor: pointer;
    margin-top: 1em;
  }
  .flex-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
  }
</style>
