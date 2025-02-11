import { defineComponent, provide, inject, ref, computed, readonly, shallowReactive, Ref, ComputedRef, onMounted, toRef, InjectionKey } from 'vue-demi'
import { useQuery, UseQueryOptions, QueryFunctionContext } from '@tanstack/vue-query'
import { h, useField, useFieldSchema, Fragment, ExpressionScope, SchemaExpressionScopeSymbol } from '@formily/vue'
import type { Field } from '@formily/core'
import { Space, Submit, Reset, FormButtonGroup, type SpaceProps } from '@formily/element'
import Table, { PaginationSymbol, type PaginationAction } from './Table'
import ReadPrettyTable from './ReadPrettyTable'
import { QueryBaseSymbol, SelectedRecordsSymbol, UniqueQueryKey, stylePrefix } from '../shared/const'
import { composeExport, DefaultQueryButton } from '../shared/utils'
import './style.scss'
import type { ElTable } from 'element-ui/types/table'

type IQueryParams = {

} & Record<string, any>
export const QueryContextSymbol = Symbol('queryContext')
export const useQueryContext = () => {
  return inject<any>(QueryContextSymbol, {})
}
interface IQueryFnPagination extends Pick<PaginationAction, 'currentPage'> {
  total?: PaginationAction['total']
  pageSize?: PaginationAction['pageSize']
}
interface queryContext { table: Field, form: Field, toolbar: Field }
interface QueryListProps {
  queryOptions: UseQueryOptions
  pagingEnable: boolean
  pagination: {
    pageSize: number
  }
  queryFn: (query: { form: IQueryParams, currentPagination: IQueryFnPagination, queryContext: queryContext }, context: QueryFunctionContext) => Promise<any>
}
export interface QueryListAction<T> {
  field: any
  schema: any
  rootProps: any
  listeners: any
  API: {
    query: (resetPagin?: boolean) => Promise<any>
    setTableRef: (ref: ElTable) => void
  }
  queryTable: any
  queryForm: any
  queryResult: any
  selectedRecords: Ref<T>
  paginationContext: ComputedRef<PaginationAction>
}
export const useQueryList = () => inject(QueryBaseSymbol)
export const useSelectedRecords = <T>() => {
  return inject<{
    update: (record: T) => void
    list: Ref<T[]>
  }>(SelectedRecordsSymbol, {
        update: () => {},
        list: ref([])
      })
}
interface IListPageResult { list: Array<{ list: unknown[] }>, currentPage: number, total: number }
type IListResult = unknown[]
export const _SchemaExpressionScopeSymbol: InjectionKey<Ref<Record<string, any>>> = Symbol('_schemaExpression')
const QueryListInner = defineComponent<QueryListProps>({
  name: 'QueryList',
  props: ['queryOptions', 'queryFn', 'pagination'],
  setup (props, { slots, listeners, emit }) {
    const field = useField()
    const schema = useFieldSchema()
    // const queryClient = useQueryClient()
    const page = ref(1)
    const total = ref(0)
    const pageSize = ref(props.pagination?.pageSize ?? 10)
    const queryFn: (context) => Promise<any> = async (context: QueryFunctionContext) => {
      return await props.queryFn?.({ form: queryForm.value?.value, currentPagination: { currentPage: page.value, pageSize: pageSize.value }, queryContext: getQueryContext() }, context)
    }
    const queryTable = ref()
    const queryForm = ref()
    const queryToolbar = ref()
    const getQueryContext = () => {
      return {
        table: queryTable.value,
        form: queryForm.value,
        toolbar: queryToolbar.value
      }
    }
    const isLoadingMore = ref(false)
    // let currentBatchProcess: number | null = null

    const renderTableData = (list: any[]) => {
      // if (currentBatchProcess) {
      //   globalThis.cancelAnimationFrame(currentBatchProcess)
      // }
      queryTable.value?.setValue([...list])
      isLoadingMore.value = false
      /*
      // 如果数据量小于等于 50，直接渲染
      if (list.length <= 50) {
        queryTable.value?.setValue([...list])
        isLoadingMore.value = false
        return
      }

       // 数据量大于 50 时，使用分批渲染
      const BATCH_SIZE = 10
      const totalData = [...list]
      let currentIndex = 0
      isLoadingMore.value = true

      const processBatch = () => {
        const batch = totalData.slice(currentIndex, currentIndex + BATCH_SIZE)
        if (batch.length === 0) {
          isLoadingMore.value = false
          return
        }

        if (currentIndex === 0) {
          queryTable.value?.setValue(batch)
        } else {
          const currentValue = queryTable.value?.value || []
          queryTable.value?.setValue([...currentValue, ...batch])
        }

        currentIndex += BATCH_SIZE

        if (currentIndex < totalData.length) {
          currentBatchProcess = globalThis.requestAnimationFrame(processBatch)
        } else {
          isLoadingMore.value = false
          currentBatchProcess = null
        }
      }

      currentBatchProcess = globalThis.requestAnimationFrame(processBatch) */
    }
    const onSuccess = (data: IListPageResult | IListResult) => {
      if (!Array.isArray(data)) {
        const { list, currentPage, total } = data
        renderTableData([...list])
        paginationContext?.value?.changePage?.(currentPage)
        paginationContext?.value?.changeTotal?.(total)
      } else {
        renderTableData([...data])
      }
    }
    /* 分页处理 */
    const paginationContext = computed<PaginationAction>(() => {
      return shallowReactive({
        currentPage: page.value,
        total: total.value,
        pageSize: pageSize.value,
        totalPage: Math.ceil(total.value / pageSize.value),
        changePage: (p: number) => (page.value = p),
        changePageSize: (size: number) => { pageSize.value = size; page.value = 1 },
        changeTotal: (t: number) => (total.value = t)
      })
    })
    provide(PaginationSymbol, paginationContext)
    provide(QueryContextSymbol, {
      setFormFieldRef: (form) => {
        queryForm.value = form
      },
      setTableFieldRef: (table) => {
        queryTable.value = table
      },
      setToolBarFieldRef: (toolbar) => {
        queryToolbar.value = toolbar
      }
    })
    const selectedRecords = ref([]) as Ref<any[]>
    provide(SelectedRecordsSymbol, {
      list: selectedRecords,
      update: (list) => {
        selectedRecords.value = list
        emit('updateSelectedRecords', list)
      }
    })
    const queryKey = [UniqueQueryKey, readonly(page), readonly(pageSize)]
    const enabled = ref(false)
    const queryOptions = { queryKey, queryFn, onSuccess, structuralSharing: false, refetchOnWindowFocus: false, keepPreviousData: true, enabled, ...props.queryOptions }
    const queryResult = useQuery(queryOptions)
    const API = {
      async query (resetPagination: boolean = true) {
        if (resetPagination) {
          paginationContext.value.changePage?.(1)
        }
        return await queryResult.refetch()
      },
      tableRef: ref(),
      setTableRef (ref: ElTable) {
        API.tableRef.value = ref
      }
    }
    provide(QueryBaseSymbol, {
      field,
      schema,
      rootProps: props,
      listeners,
      API,
      queryTable,
      queryForm,
      queryResult,
      selectedRecords,
      paginationContext
    })
    onMounted(async () => {
      emit('mounted', { ...API, selectedRecords, paginationContext })
      enabled.value = true
      await queryResult.refetch()
    })
    /*     onUnmounted(() => {
      if (currentBatchProcess) {
        globalThis.cancelAnimationFrame(currentBatchProcess)
      }
    }) */
    provide('isLoadingMore', isLoadingMore)
    const expressionScope = inject(SchemaExpressionScopeSymbol)
    provide(_SchemaExpressionScopeSymbol, expressionScope)
    return () => {
      return h(
        ExpressionScope,
        { props: { value: { $query: API.query, $getQueryContext: getQueryContext, selectedList: selectedRecords, $pagination: paginationContext } }, ...expressionScope },
        {
          default: () => h(Fragment, {}, slots)
        }
      )
    }
  }
})
type ToolbarProps = SpaceProps & {
  justify: string
}
const Toolbar = defineComponent<ToolbarProps>({
  name: 'QueryListToolbar',
  props: {
    justify: {
      type: String,
      default: 'flex-end'
    },
    ...Space.props
  },
  setup (props, { slots }) {
    const { setToolBarFieldRef } = useQueryContext()
    const field = useField()
    setToolBarFieldRef(field.value)
    return () => {
      const { justify } = props
      return h(
        Space,
        { class: `${stylePrefix}-query-tool-bar`, props: { ...props, align: props.align ?? 'end' }, style: { display: 'flex', 'justify-content': justify } },
        slots
      )
    }
  }
})
interface IFormButtonProps {
  buttonGroup: {
    submitText: string | null
    resetText: string | null
    align: string
    disabled: boolean
  }
  disabled: boolean
}
interface IQueryListFormProps {
  buttonGroup: {
    submitText: string | null
    resetText: string | null
    align: string
    disabled: boolean
  }
  buttonGroupDisabled: boolean
}

const renderFormButtonGroup = (buttonGroup, listeners) => {
  const submitText = buttonGroup.submitText
  const resetText = buttonGroup.resetText
  const queryList = useQueryList()
  const onSubmit: (values: any) => Promise<any> | any = async () => {
    if (queryList?.queryResult.isFetching.value) return
    await queryList?.API.query()
  }
  return h(FormButtonGroup, {
    style: { },
    props: {
      align: 'center'
    }
  }, {
    default: () => [
      submitText !== null ? h(Submit, { props: { onSubmit } }, { default: () => [submitText] }) : null,
      resetText !== null
        ? h(Reset, {
          on: {
            click: (e: any) => {
              if (listeners?.clickReset) {
                if (listeners.clickReset(e) === false) return
              }
              queryList?.queryForm.value
                ?.reset('*', {})
                .then(listeners.resetValidateSuccess as (e: any) => void)
                .catch(listeners.resetValidateFailed as (e: any) => void)
            }
          }

        }, { default: () => [resetText] })
        : null
    ]
  })
}
export const Form = defineComponent<IQueryListFormProps>({
  name: 'QueryListForm',
  props: {
    buttonGroup: {
      type: Object,
      default: () => ({
        justify: 'center',
        submitText: '提交',
        resetText: '重置',
        disabled: false
      })
    },
    buttonGroupDisabled: {
      type: Boolean,
      default: false
    }
  },
  setup (_props, { slots, attrs, listeners }) {
    const buttonGroup = toRef(_props, 'buttonGroup')
    const disabled = computed(() => _props.buttonGroupDisabled === undefined ? false : _props.buttonGroupDisabled) // 默认是false

    return () => {
      const field = useField()
      const { setFormFieldRef } = useQueryContext()
      setFormFieldRef(field.value)
      return h('div', { ...attrs }, { default: () => [slots?.default?.(), disabled.value ? null : renderFormButtonGroup(buttonGroup.value, listeners)] })
    }
  }
})
export const FormButtons = defineComponent<IFormButtonProps>({
  name: 'FormButtons',
  props: {
    buttonGroup: {
      type: Object,
      default: () => ({
        justify: 'center',
        submitText: '提交',
        resetText: '重置',
        disabled: false
      })
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  setup (_props, { attrs, listeners }) {
    const buttonGroup = toRef(_props, 'buttonGroup')
    const disabled = computed(() => _props.disabled === undefined ? false : _props.disabled) // 默认是false

    return () => {
      return h('div', { ...attrs }, { default: () => [disabled.value ? null : renderFormButtonGroup(buttonGroup.value, listeners)] })
    }
  }
})
export function ActionHOC (WrappedComponent, setup?) {
  return defineComponent({
    setup (props, { attrs, listeners, slots }) {
      const queryList = useQueryList()
      const setups = setup?.()
      const newListers = Object.fromEntries(Object.entries(listeners).map(([key, listener]) => [key, (...args) => {
        const nonEmptyArgs = [queryList, setups, ...args].filter(arg => arg !== undefined)
        return listener?.(...nonEmptyArgs)
      }]))
      return () =>
        h(WrappedComponent, {
          props,
          attrs,
          on: newListers,
          ...attrs
        }, slots)
    }
  })
}

const QueryActionBtn = ActionHOC(DefaultQueryButton)

export const QueryList = composeExport(QueryListInner, {
  Toolbar,
  Form,
  Table,
  ReadPrettyTable,
  QueryActionBtn,
  FormButtons,
  useQueryList
})
export default QueryList
