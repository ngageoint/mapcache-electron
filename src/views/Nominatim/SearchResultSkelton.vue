<template>
  <div style="min-height: 105px !important;">
    <v-row no-gutters style="background: white; height: 104px;" justify="space-between">
      <v-col cols="9">
        <v-skeleton-loader
            loading
            width="150"
            type="list-item"
        >
        </v-skeleton-loader>
        <v-skeleton-loader
            style="margin-top: -16px"
            loading
            type="list-item-two-line"
        >
        </v-skeleton-loader>
      </v-col>
      <v-col cols="3" style="margin-top: 16px;">
        <v-skeleton-loader
            style="margin-left: 8px"
            loading
            height="72"
            width="72"
            type="image"
        >
        </v-skeleton-loader>
      </v-col>
    </v-row>
    <v-divider style="width: 100% !important;"></v-divider>
  </div>
</template>

<script>
export default {
  name: "SearchResultSkelton"
}
</script>

<style scoped>

</style>
