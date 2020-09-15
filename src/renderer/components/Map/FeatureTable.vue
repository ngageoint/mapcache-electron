<template>
  <div>
    <v-dialog
      v-model="removeDialog"
      max-width="500">
      <v-card v-if="featureToRemove !== null">
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-icon>mdi-trash-can-outline</v-icon>Delete Feature {{featureToRemove.id}}
          </v-row>
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the feature?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="#3b779a"
            text
            @click="cancelRemove">
            cancel
          </v-btn>
          <v-btn
            color="#ff4444"
            text
            @click="remove">
            remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-data-table
      v-model="selected"
      dense
      :headers="headers"
      :items="featureTableEntries"
      item-key="key"
      class="elevation-1"
      :height="Math.min(160, 32 * (featureTableEntries.length + 1))"
      @click:row="handleClick"
    >
      <!--    <v-dialog v-model="dialog" max-width="500px">-->
      <!--      <v-card>-->
      <!--        <v-card-title>-->
      <!--          <span class="headline">Edit feature</span>-->
      <!--        </v-card-title>-->
      <!--        <v-card-text>-->
      <!--          <v-container>-->
      <!--            <v-row>-->
      <!--              <v-col cols="12" sm="6" md="4">-->
      <!--                <v-text-field v-model="editedItem.geopackage" label="GeoPackage"></v-text-field>-->
      <!--              </v-col>-->
      <!--              <v-col cols="12" sm="6" md="4">-->
      <!--                <v-text-field v-model="editedItem.layer" label="Layer"></v-text-field>-->
      <!--              </v-col>-->
      <!--              <v-col cols="12" sm="6" md="4">-->
      <!--                <v-text-field v-model="editedItem.id" label="Id"></v-text-field>-->
      <!--              </v-col>-->
      <!--              <v-col cols="12" sm="6" md="4">-->
      <!--                <v-text-field v-model="editedItem.type" label="Geometry Type"></v-text-field>-->
      <!--              </v-col>-->
      <!--              <v-col cols="12" sm="6" md="4">-->
      <!--                <v-text-field v-model="editedItem.description" label="Description"></v-text-field>-->
      <!--              </v-col>-->
      <!--            </v-row>-->
      <!--          </v-container>-->
      <!--        </v-card-text>-->

      <!--        <v-card-actions>-->
      <!--          <v-spacer></v-spacer>-->
      <!--          <v-btn color="blue darken-1" text @click="close">Cancel</v-btn>-->
      <!--          <v-btn color="blue darken-1" text @click="save">Save</v-btn>-->
      <!--        </v-card-actions>-->
      <!--      </v-card>-->
      <!--    </v-dialog>-->
      <template v-slot:item.actions="{ item }">
        <!--      <v-icon-->
        <!--        small-->
        <!--        class="mr-2"-->
        <!--        @click="editItem(item)"-->
        <!--      >-->
        <!--        mdi-pencil-->
        <!--      </v-icon>-->
        <v-icon
          small
          style="color: red;"
          @click="showDeleteConfirmation(item)"
        >
          mdi-trash-can
        </v-icon>
      </template>a
    </v-data-table>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  export default {
    props: {
      projectId: String,
      geopackages: Object,
      features: Array,
      zoomToFeature: Function
    },
    data () {
      return {
        dialog: false,
        removeDialog: false,
        featureToRemove: null,
        selected: [],
        headers: [
          { text: 'GeoPackage', align: 'start', value: 'geopackage' },
          { text: 'Layer', value: 'layer' },
          { text: 'Id', value: 'id' },
          { text: 'Geometry Type', value: 'type' },
          { text: 'Description', value: 'description' },
          { text: 'Actions', value: 'actions', sortable: false }
        ],
        editedIndex: -1,
        editedItem: {
          geopackage: '',
          layer: 0,
          id: 0,
          description: 0
        }
      }
    },
    computed: {
      featureTableEntries () {
        return this.features.map(feature => {
          return {
            geopackage: feature.geopackageName,
            geopackageId: feature.geopackageId,
            layer: feature.table,
            id: feature.id,
            key: feature.id + '_' + feature.table + '_' + feature.geopackageName,
            type: feature.geometry.type,
            description: feature.properties.description || ''
          }
        })
      }
    },
    watch: {
      dialog (val) {
        val || this.close()
      }
    },
    methods: {
      ...mapActions({
        removeFeatureFromGeopackage: 'Projects/removeFeatureFromGeopackage'
      }),
      // editItem (item) {
      //   this.editedIndex = this.featureTableEntries.indexOf(item)
      //   this.editedItem = Object.assign({}, item)
      //   this.dialog = true
      // },
      showDeleteConfirmation (item) {
        this.featureToRemove = item
        this.removeDialog = true
      },
      cancelRemove () {
        this.removeDialog = false
        this.featureToRemove = null
      },
      remove () {
        if (!_.isNil(this.featureToRemove)) {
          this.removeFeatureFromGeopackage({projectId: this.projectId, geopackageId: this.featureToRemove.geopackageId, tableName: this.featureToRemove.layer, featureId: this.featureToRemove.id})
          this.features = this.features.filter(f => f.id !== this.featureToRemove.id)
          if (this.features.length === 0) {
            this.close()
          }
          this.removeDialog = false
          this.featureToRemove = null
        }
      },
      close () {
        this.dialog = false
        this.$nextTick(() => {
          this.editedItem = Object.assign({}, {
            geopackage: '',
            layer: 0,
            id: 0,
            description: 0
          })
          this.editedIndex = -1
        })
      },
      handleClick (value) {
        if (!this.removeDialog) {
          this.zoomToFeature(this.geopackages[value.geopackageId].path, value.layer, value.id)
        }
      }
    }
  }
</script>

<style scoped>

</style>
