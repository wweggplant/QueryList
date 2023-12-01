import {
  ArrayField,
  FieldDisplayTypes,
  GeneralField,
  IVoidFieldFactoryProps
} from '@formily/core'
import { autorun, observable } from '@formily/reactive'
import type { Component, VNode } from 'vue'
import {
  type Pagination as PaginationProps,
  type TableColumn as ElColumnProps,
  // Badge,
  // Option,
  Pagination,
  // Select,
  Table as ElTable,
  TableColumn as ElTableColumn,
  Loading
} from 'element-ui'
import type { Schema } from '@formily/json-schema'

import { observer } from '@formily/reactive-vue'
import { isArr, isBool, isFn, uid } from '@formily/shared'
import {
  Fragment,
  h,
  RecursionField as _RecursionField,
  useField,
  useFieldSchema
} from '@formily/vue'
import { computed, defineComponent, inject, ref, Ref, onMounted, nextTick, watch, onUnmounted } from 'vue-demi'
import { ArrayBase, Space } from '@formily/element'
import { stylePrefix } from '../shared/const'
import { composeExport, DefaultQueryButton } from '../shared/utils'
import './style.scss'
import { useQueryList, useSelectedRecords, ActionHOC, useQueryContext } from './QueryList'
import { ElLoadingComponent } from 'element-ui/types/loading'

const RecursionField = _RecursionField as unknown as Component

interface IArrayTablePaginationProps extends PaginationProps {
}

interface ObservableColumnSource {
  field: GeneralField
  fieldProps: IVoidFieldFactoryProps<any, any>
  columnProps: ElColumnProps & { title: string, asterisk: boolean }
  schema: Schema
  display: FieldDisplayTypes
  required: boolean
  name: string
}

type ColumnProps = ElColumnProps & {
  key: string | number
  asterisk: boolean
  render?: (
    startIndex?: Ref<number>
  ) => (props: {
    row: Record<string, any>
    column: ElColumnProps
    $index: number
  }) => VNode
}

export interface PaginationAction {
  total?: number
  pageSize?: number
  currentPage?: number
  totalPage: number
  changePage?: (page: number) => void
  changePageSize?: (size: number) => void
  changeTotal?: (total: number) => void
}

export const PaginationSymbol = Symbol('pagination')

const isColumnComponent = (schema: Schema) => {
  return schema['x-component']?.indexOf('Column') > -1
}

const isOperationsComponent = (schema: Schema) => {
  return schema['x-component']?.indexOf('Operations') > -1
}

const isAdditionComponent = (schema: Schema) => {
  return schema['x-component']?.indexOf('Addition') > -1
}

const getArrayTableSources = (
  arrayFieldRef: Ref<ArrayField>,
  schemaRef: Ref<Schema>
) => {
  const arrayField = arrayFieldRef.value
  const parseSources = (schema: Schema): ObservableColumnSource[] | any => {
    if (
      isColumnComponent(schema) ||
      isOperationsComponent(schema) ||
      isAdditionComponent(schema)
    ) {
      if (!schema['x-component-props']?.prop && !schema.name) return []
      const name = schema['x-component-props']?.prop || schema.name
      const field = arrayField.query(arrayField.address.concat(name)).take()
      const fieldProps = ((field?.props) != null) || schema.toFieldProps()
      const columnProps =
        (field?.component as any[])?.[1] || schema['x-component-props'] || {}
      const display = field?.display ?? schema['x-display']
      const required = schema.reduceProperties((required, property) => {
        if (required) {
          return required
        }
        return !!property.required
      }, false)
      return [
        {
          name,
          display,
          required,
          field,
          fieldProps,
          schema,
          columnProps
        }
      ]
    } else if (schema.properties != null) {
      return schema.reduceProperties((buf: any[], schema) => {
        return buf.concat(parseSources(schema))
      }, [])
    } else {
      return []
    }
  }

  const parseArrayTable = (schema: Schema['items']) => {
    if (schema == null) return []
    const sources: ObservableColumnSource[] = []
    const items = isArr(schema) ? schema : ([schema] as Schema[])
    return items.reduce((columns, schema) => {
      const item = parseSources(schema)
      if (item) {
        return columns.concat(item)
      }
      return columns
    }, sources)
  }

  if (!schemaRef.value) throw new Error('can not found schema object')

  return parseArrayTable(schemaRef.value.items)
}

const getArrayTableColumns = (
  sources: ObservableColumnSource[]
): ColumnProps[] => {
  return sources.reduce(
    (
      buf: ColumnProps[],
      { name, columnProps, schema, display, required },
      key
    ) => {
      const { title, asterisk, ...props } = columnProps
      if (display !== 'visible') return buf
      if (!isColumnComponent(schema)) return buf

      const render = (startIndex?: Ref<number>) => {
        return columnProps?.type && columnProps?.type !== 'default'
          ? undefined
          : (props: {
              row: Record<string, any>
              column: ElColumnProps
              $index: number
            }): VNode => {
              const index = (startIndex?.value ?? 0) + props.$index
              // const index = reactiveDataSource.value.indexOf(props.row)

              const children = h(
                ArrayBase.Item,
                { props: { index, record: props.row }, key: `${key}${index}` },
                {
                  default: () =>
                    h(
                      RecursionField,
                      {
                        props: {
                          schema,
                          name: index,
                          onlyRenderProperties: true
                        }
                      },
                      {}
                    )
                }
              )
              return children
            }
      }
      // @ts-expect-error
      return buf.concat({
        ...props,
        label: title,
        key,
        prop: name,
        asterisk: asterisk ?? required,
        render
      })
    },
    []
  )
}

const renderAddition = () => {
  const schema = useFieldSchema()
  return schema.value.reduceProperties((addition, schema) => {
    if (isAdditionComponent(schema)) {
      return h(
        RecursionField,
        {
          props: {
            schema,
            name: 'addition'
          }
        },
        {}
      )
    }
    return addition
  }, null)
}
const usePagination = () => {
  return inject<Ref<PaginationAction>>(PaginationSymbol, ref({ totalPage: 1 }))
}

const QueryTablePagination = defineComponent<IArrayTablePaginationProps>({
  name: 'QueryTablePagination',
  inheritAttrs: false,
  setup (props, { attrs, slots }) {
    const prefixCls = `${stylePrefix}-array-table`
    const pagination = usePagination()
    const current = computed(() => pagination.value?.currentPage ?? 1)
    const pageSize = ref(attrs?.pageSize as number ?? 10)
    const startIndex = computed(() => (current.value - 1) * pageSize.value)
    const totalPage = computed(() => pagination.value.totalPage)
    /* const pages = computed(() => {
      return Array.from(new Array(totalPage.value)).map((_, index) => {
        const page = index + 1
        return {
          label: page,
          value: page
        }
      })
    }) */

    const renderPagination = function () {
      return h(
        'div',
        {
          class: [`${prefixCls}-pagination`]
        },
        {
          default: () =>
            h(
              Space,
              {
                props: {
                  align: 'center'
                }
              },
              {
                default: () => [
                  h(
                    Pagination,
                    {
                      props: {
                        background: true,
                        layout: 'total, sizes, prev, pager, next, jumper',
                        ...attrs,
                        pageSize: pageSize.value,
                        pageCount: totalPage.value,
                        total: pagination.value?.total,
                        currentPage: current.value
                      },
                      on: {
                        'current-change': (val: number) => {
                          pagination.value?.changePage?.(val)
                        },
                        'size-change': (val: number) => {
                          pagination.value?.changePageSize?.(val)
                        }
                      }
                    },
                    {}
                  )
                ]
              }
            )
        }
      )
    }

    return () => {
      return h(
        Fragment,
        {},
        {
          default: () =>
            slots?.default?.(
              renderPagination,
              startIndex
            ) ?? []
        }
      )
    }
  }
})

const ArrayTableInner = observer(
  defineComponent<{ rowSelectedFunction: Function }>({
    name: 'QueryTable',
    inheritAttrs: false,
    props: {
      rowSelectedFunction: {
        type: Function,
        default: null
      }
    },
    setup (props, { attrs, listeners, slots, refs }) {
      const { setTableFieldRef } = useQueryContext()
      const fieldRef = useField<ArrayField>()
      setTableFieldRef(fieldRef.value)
      const schemaRef = useFieldSchema()
      const tableRef = ref<any>(null)
      const rootQueryList = useQueryList()
      const prefixCls = `${stylePrefix}-array-table`
      const { getKey, keyMap } = ArrayBase.useKey(schemaRef.value)
      function syncRowSelectionState () {
        const field = fieldRef.value
        const dataSource = Array.isArray(field.value) ? field.value.slice() : []
        if (props?.rowSelectedFunction) {
          dataSource.forEach((item, i) => {
            tableRef.value?.toggleRowSelection(item, props.rowSelectedFunction(item, i))
          })
        }
      }
      // let start = 0
      const isFetching = rootQueryList?.queryResult.isFetching
      let loading: ElLoadingComponent | null = null
      const tableClassName = 'query-list-table-' + uid()
      const watchStopHandle = watch(() => isFetching.value,
        () => {
          if (isFetching.value) {
            // start = Date.now()
            if (loading) {
              return
            }
            loading = Loading.service({
              target: `.${tableClassName}`
            })
          } else {
            loading?.close()
            loading = null
          }
        })
      const defaultRowKey = (record: any) => {
        return getKey(record)
      }
      onMounted(() => {
        if (refs.QueryTable) {
          tableRef.value = (refs.QueryTable as ElTable)?.$children?.[0].$children?.[0] ?? null
        }
        if (refs.QueryTablePagination) {
          tableRef.value = (refs.QueryTablePagination as ElTable)?.$children?.[0].$children?.[0].$children?.[0] ?? null
        }
        tableRef.value && rootQueryList?.API.setTableRef(tableRef.value)
      })
      const { update: updateSelectedRecords } = useSelectedRecords() ?? {}
      const field = fieldRef.value
      const dataSource: Ref<any> = ref([])
      const sources: any = observable.computed(() => getArrayTableSources(fieldRef, schemaRef))
      const columns: any = observable.computed(() => getArrayTableColumns(sources.value))
      const dispose = autorun(() => {
        dataSource.value = Array.isArray(field.value) ? field.value.slice() : []
        // sources.value = getArrayTableSources(fieldRef, schemaRef)
        // columns.value = getArrayTableColumns(sources.value)
        nextTick(() => {
          syncRowSelectionState()
        })
      })
      onUnmounted(() => {
        dispose()
        watchStopHandle()
      })
      const renderColumns = () => {
        return columns.value.map(({ key, render, asterisk, ...props }) => {
          const children = {} as any
          if (render != null) {
            children.default = render()
          }
          if (asterisk) {
            children.header = ({ column }: { column: ElColumnProps }) =>
              h(
                'span',
                {},
                {
                  default: () => [
                    h(
                      'span',
                      { class: `${prefixCls}-asterisk` },
                      { default: () => ['*'] }
                    ),
                    column.label
                  ]
                }
              )
          }
          return h(
            ElTableColumn,
            {
              key,
              props
            },
            children
          )
        })
      }

      const renderStateManager = () =>
        sources.value.map((column, key) => {
          // 专门用来承接对Column的状态管理
          if (!isColumnComponent(column.schema)) return h(Fragment, {}, {})
          return h(
            RecursionField,
            {
              props: {
                name: column.name,
                schema: column.schema,
                onlyRenderSelf: true
              },
              key
            },
            {}
          )
        })
      const renderTable = (
        dataSource?: any[],
        pager?: () => VNode
      ) => {
        return h(
          'div',
          { class: `${prefixCls} ${tableClassName}` },
          {
            default: () => h(
              ArrayBase,
              {
                props: {
                  keyMap
                },
                ref: 'QueryTable'
              },
              {
                default: () => [
                  h(
                    ElTable,
                    {
                      props: {
                        rowKey: defaultRowKey,
                        ...attrs,
                        data: dataSource
                      },
                      on: {
                        ...listeners,
                        'selection-change' (list) {
                          updateSelectedRecords(list)
                          listeners?.['selection-change']?.(list)
                        }
                      }
                    },
                    {
                      ...slots,
                      default: () => renderColumns()
                    }
                  ),
                  pager?.(),
                  renderStateManager(),
                  renderAddition()
                ]
              }
            )
          }
        )
      }
      return () => {
        const pagination = rootQueryList?.rootProps?.pagination

        if (!pagination) {
          return renderTable(dataSource.value)
        }
        return h(
          QueryTablePagination,
          {
            ref: 'QueryTablePagination',
            attrs: {
              ...(isBool(pagination) ? {} : pagination)
            }
          },
          {
            default: (renderPagination) => renderTable(dataSource.value, renderPagination)
          }
        )
      }
    }
  })
)

const ArrayTableColumn: Component = {
  name: 'QueryTableColumn',
  render (h) {
    return h()
  }
}

const ArrayAddition = defineComponent({
  name: 'ArrayAddition',
  setup (props, { attrs, listeners, slots }) {
    const array = ArrayBase.useArray()
    const paginationRef = usePagination()

    const onClick = listeners.click
    listeners.click = (e) => {
      const { totalPage = 0, pageSize = 10, changePage } = paginationRef.value
      // 如果添加数据后超过当前页，则自动切换到下一页
      const total = array?.field?.value?.value.length || 0
      if (total === (totalPage - 1) * pageSize + 1 && isFn(changePage)) {
        changePage(totalPage)
      }
      if (onClick != null) onClick(e)
    }
    return () => {
      return h(
        ArrayBase.Addition,
        {
          props,
          attrs,
          on: listeners
        },
        slots
      )
    }
  }
})
const ActionBtn = ActionHOC(DefaultQueryButton, () => {
  const record = ArrayBase.useRecord()
  return {
    record
  }
})
export const ArrayTable = composeExport(ArrayTableInner, {
  Column: ArrayTableColumn,
  Index: ArrayBase.Index,
  SortHandle: ArrayBase.SortHandle,
  ActionBtn,
  Addition: ArrayAddition,
  Remove: ArrayBase.Remove,
  MoveDown: ArrayBase.MoveDown,
  MoveUp: ArrayBase.MoveUp,
  useArray: ArrayBase.useArray,
  useIndex: ArrayBase.useIndex,
  useRecord: ArrayBase.useRecord,
  usePagination
})

export default ArrayTable
