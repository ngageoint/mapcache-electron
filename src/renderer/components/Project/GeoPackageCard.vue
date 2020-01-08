<template>
  <expandable-card  :initially-expanded="geopackage.expanded" :on-expand-collapse="expandCollapseGeoPackageConfiguration">
    <div slot="card-header">
      <v-row no-gutters class="mr-1">
        <v-col cols="12">
          <view-edit-text :value="geopackage.name" font-size="1.5em" font-weight="bold" label="GeoPackage Configuration Name" :on-save="saveGeoPackageName"/>
        </v-col>
      </v-row>
    </div>
    <div slot="card-expanded-body">
      <geo-package-configuration-card :project="project" :geopackage="geopackage"/>
    </div>
  </expandable-card>
</template>

<script>
  import { mapActions } from 'vuex'
  import ExpandableCard from '../Card/ExpandableCard'
  import ViewEditText from '../Common/ViewEditText'
  import GeoPackageConfigurationCard from '../GeoPackage/GeoPackageConfigurationCard'
  export default {
    props: {
      project: Object,
      geopackage: Object
    },
    components: {
      ExpandableCard,
      GeoPackageConfigurationCard,
      ViewEditText
    },
    methods: {
      ...mapActions({
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        expandGeoPackageConfiguration: 'Projects/expandGeoPackageConfiguration',
        setGeoPackageName: 'Projects/setGeoPackageName'
      }),
      saveGeoPackageName (val) {
        this.setGeoPackageName({projectId: this.project.id, geopackageId: this.geopackage.id, name: val})
      },
      expandCollapseGeoPackageConfiguration () {
        this.expandGeoPackageConfiguration({projectId: this.project.id, geopackageId: this.geopackage.id})
      }
    }
  }
</script>

<style scoped>
</style>
