<template>
  <QueryListWrapper :schema="schema"/>
</template>

<script lang="ts">
import { defineComponent } from 'vue-demi'
import { createQueryList } from '../src/index'
import schema from './schema.json'
const QueryListWrapper = createQueryList({
  queryFn: async ({ form, currentPagin, }) => { 
    const response = await fetch(`/api/getQueryListData?name=${form?.name ?? ''}&type=${form?.type ?? ''}&page=${currentPagin.currentPage}`)
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
  batchDel(querylist, ...args) {
    const { API, selectedRecords } = querylist
    console.log('执行删除操作')
    console.log(selectedRecords.value, 'selectedRecords')
    console.log(args)
    // 执行查询
    API.doQuery()
  },
  delRow(querylist, obj, ...args) {
    const { API } = querylist
    console.log('执行删除操作')
    console.log(obj.record, '')
    // 执行查询
    API.doQuery()
  }
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