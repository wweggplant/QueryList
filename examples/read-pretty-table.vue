<template>
  <QueryListWrapper :schema="schema"/>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue-demi'
import { createQueryList } from '../src/index'
import schema from './read-pretty-table-schema.json'
const QueryListWrapper = createQueryList({
  queryFn: async ({ form, currentPagination, }) => { 
    console.log(currentPagination, 'currentPagination')
    const response = await fetch(`/api/getQueryListData?name=${form?.name ?? ''}&type=${form?.type ?? ''}&page=${currentPagination.currentPage}&size=${currentPagination.pageSize ?? 10}`)
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const { data: { list, current, total} } = await response.json()
    return {
      list: list,
      currentPage: current,
      total,
    }
  },
  cnameLabel: () => {
    // @ts-ignore
    return h('span', {
      style: 'color: red;'
    }, '123')
  },
})

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