<template>
  <QueryListWrapper :schema="schema"/>
</template>

<script lang="ts">
import CompositionApi from '@vue/composition-api'
import Vue from 'vue'
Vue.use(CompositionApi)
import { defineComponent } from 'vue-demi'
import { createQueryList } from '../src/index'
import schema from './schema-select.json'

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
  rowSelectedFunction(item) {
    console.log('rowSelectedFunction', item)
    return item.sex === 1
  },
  mounted(...args) {
    console.log('mounted')
    console.log(args)
  },
  handleSelectedRecordsUpdate(selectedRecords) {
    console.log('handleSelectedRecordsUpdate')
    console.log(selectedRecords)
  },
  batchDel(querist, ...args) {
    const { API, selectedRecords } = querist
    console.log('执行删除操作')
    console.log(selectedRecords.value, 'selectedRecords')
    console.log(args)
    // 执行查询
    API.query()
  },
  delRow(querist, obj, ...args) {
    const { API } = querist
    console.log('执行删除操作')
    console.log(obj.record, '')
    // 执行查询
    API.query()
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