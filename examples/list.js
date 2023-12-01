import { createQueryList } from '../src/index'

export const QueryListWrapper = createQueryList({
  queryFn: async ({ form, currentPagination,queryContext }) => { 
    console.log(currentPagination, 'currentPagination')
    const { toolbar } = queryContext
    const response = await fetch(`/api/getQueryListData?name=${form?.name ?? ''}&type=${form?.type ?? ''}&used_status=${toolbar.value.used_status}&page=${currentPagination.currentPage}&size=${currentPagination.pageSize ?? 10}`)
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
  QueryFormRun($self){
    $self.addProperty({
      disabled: true
    })
  },
  changeUsed(query, $getQueryContext) {
    query()
    console.log($getQueryContext().toolbar.value.used_status, 'used_status')
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