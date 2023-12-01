<template>
  <QueryListWrapper :schema="schema"/>
</template>

<script lang="ts">
import { defineComponent } from 'vue-demi'
import schema from './schema.json'
import { QueryListWrapper} from './list'

export default defineComponent({
  components: {
    QueryListWrapper
  },
  data() {
    return {
      schema,
    }
  }
})
</script>