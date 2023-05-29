import { defineComponent, provide, inject, ref, computed, readonly, shallowReactive, Ref, ComputedRef, onMounted } from 'vue-demi'
import { useQuery, UseQueryOptions, QueryFunctionContext } from '@tanstack/vue-query'
import { h, useField, useFieldSchema, Fragment, useForm } from '@formily/vue'
import type { Field } from '@formily/core'
import { Space, Submit, Reset, FormButtonGroup, type SpaceProps } from '@formily/element'
import Table, { PaginationSymbol, type PaginationAction } from './Table'
import { QueryBaseSymbol, SelectedRecordsSymbol, UniqueQueryKey, stylePrefix } from '../shared/const'
import { composeExport, DefaultQueryButton } from '../shared/utils'
import './style.scss'

type IQueryParams = {

} & Record<string, any>
interface IQueryFnPagination extends Pick<PaginationAction, 'currentPage'> {
  total?: PaginationAction['total']
  pageSize?: PaginationAction['pageSize']
}
interface QueryListProps {
  queryOptions: UseQueryOptions
  pagingEnable: boolean
  pagination: {
    pageSize: number
  }
  queryFn: (query: { form: IQueryParams, currentPagin: IQueryFnPagination }, context: QueryFunctionContext) => Promise<any>
}
export interface QueryListAction<T> {
  field: any
  schema: any
  rootProps: any
  listeners: any
  API: {
    query: (resetPagin?: boolean) => Promise<any>
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
const QueryListInner = defineComponent<QueryListProps>({
  name: 'QueryList',
  props: ['queryOptions', 'queryFn', 'pagination'],
  setup (props, { slots, listeners, emit }) {
    const field = useField()
    const schema = useFieldSchema()
    // const queryClient = useQueryClient()
    const form = useForm()
    const page = ref(1)
    const total = ref(0)
    const pageSize = ref(props.pagination?.pageSize ?? 10)
    const queryFn: (context) => Promise<any> = async (context: QueryFunctionContext) => {
      return await props.queryFn?.({ form: queryForm.value?.value, currentPagin: { currentPage: page.value } }, context)
    }
    const queryTable = computed(() => form.value?.query('QueryTable').take() as Field)
    const queryForm = {
      get value () {
        return (form.value?.query('QueryForm').take() as Field)
      }
    }
    const onSuccess = (data: IListPageResult | IListResult) => {
      if (!Array.isArray(data)) {
        const { list, currentPage, total } = data
        queryTable.value?.setValue(list)
        paginationContext?.value?.changePage?.(currentPage)
        paginationContext?.value?.changeTotal?.(total)
      } else {
        queryTable.value?.setValue(data)
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
        changePageSize: (size: number) => (pageSize.value = size),
        changeTotal: (t: number) => (total.value = t)
      })
    })
    provide(PaginationSymbol, paginationContext)
    const selectedRecords = ref([]) as Ref<any[]>
    provide(SelectedRecordsSymbol, {
      list: selectedRecords,
      update: (list) => {
        selectedRecords.value = list
        emit('updateSelectedRecords', list)
      }
    })
    const queryKey = [UniqueQueryKey, readonly(page)]
    const queryOptions = { queryKey, queryFn, onSuccess, structuralSharing: false, refetchOnWindowFocus: false, keepPreviousData: true, ...props.queryOptions }
    const queryResult = useQuery(queryOptions)
    const API = {
      async query (form, resetPagin: boolean = true) {
        if (resetPagin) {
          paginationContext.value.changePage?.(1)
        }
        if (form) {
          queryForm.value?.setValue(form)
        }
        return await queryResult.refetch()
        // await queryClient.fetchQuery({ queryKey, queryFn })
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
    onMounted(() => {
      emit('mounted', { ...API, selectedRecords, paginationContext })
    })
    return () => {
      return h(Fragment, {}, slots)
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
  setup (props, { slots, listeners, attrs }) {
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

interface IQueryListFormProps {
  buttonGroup: {
    submitText: string | null
    resetText: string | null
    align: string
  }
}
export const Form = defineComponent<IQueryListFormProps>({
  name: 'QueryListForm',
  props: {
    buttonGroup: {
      type: Object,
      default: () => ({
        justify: 'center',
        submitText: '提交',
        resetText: '重置'
      })
    }
  },
  setup (_props, { slots, attrs, listeners }) {
    return () => {
      const queryList = useQueryList()
      const onSubmit: (values: any) => Promise<any> | any = async () => {
        if (queryList?.queryResult.isFetching.value) return
        await queryList?.API.query()
      }
      const submitText = _props.buttonGroup.submitText
      const resetText = _props.buttonGroup.resetText
      const renderFormButtonGroup: () => any = () => {
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
      return h('div', { class: `${stylePrefix}-query-list-form`, ...attrs }, { default: () => [slots?.default?.(), renderFormButtonGroup()] })
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
  QueryActionBtn,
  useQueryList
})
export default QueryList
