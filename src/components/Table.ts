import {
  ArrayField,
  FieldDisplayTypes,
  GeneralField,
  IVoidFieldFactoryProps
} from '@formily/core'
import type { Component, VNode } from 'vue'
import {
  type Pagination as PaginationProps,
  type TableColumn as ElColumnProps,
  Badge,
  Option,
  Pagination,
  Select,
  Table as ElTable,
  TableColumn as ElTableColumn
} from 'element-ui'
import type { Schema } from '@formily/json-schema'

import { observer } from '@formily/reactive-vue'
import { isArr, isBool, isFn } from '@formily/shared'
import {
  Fragment,
  h,
  RecursionField as _RecursionField,
  useField,
  useFieldSchema
} from '@formily/vue'
import { computed, defineComponent, inject, ref, Ref, onMounted } from 'vue-demi'
import { ArrayBase, Space } from '@formily/element'
import { stylePrefix } from '../shared/const'
import { composeExport, DefaultQueryButton } from '../shared/utils'
import './style.scss'
import { useQueryList, useSelectedRecords, ActionHOC } from './QueryList'

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

const schedulerRequest: { request: NodeJS.Timeout | null } = {
  request: null
}

const StatusSelect = observer(
  defineComponent({
    props: {
      value: Number,
      onChange: Function,
      options: Array,
      pageSize: Number
    },
    setup (props) {
      const fieldRef = useField<ArrayField>()
      const prefixCls = `${stylePrefix}-array-table`

      return () => {
        const field = fieldRef.value
        const width = String(props.options?.length).length * 15
        const errors = field.errors
        const parseIndex = (address: string) => {
          return Number(
            address
              .slice(address.indexOf(field.address.toString()) + 1)
              .match(/(\d+)/)?.[1]
          )
        }

        return h(
          Select,
          {
            style: {
              width: `${width < 60 ? 60 : width}px`
            },
            class: [
              `${prefixCls}-status-select`,
              {
                'has-error': errors?.length
              }
            ],
            props: {
              size: 'mini',
              value: props.value,
              popperClass: `${prefixCls}-status-select-dropdown`
            },
            on: {
              input: props.onChange
            }
          },
          {
            default: () => {
              return props.options?.map(({ label, value }) => {
                const hasError = errors.some(({ address }) => {
                  const pageSize = props.pageSize as number
                  const currentIndex = parseIndex(address as string)
                  const startIndex = (value - 1) * pageSize
                  const endIndex = value * pageSize
                  return currentIndex >= startIndex && currentIndex <= endIndex
                })

                return h(
                  Option,
                  {
                    key: value,
                    props: {
                      label,
                      value
                    }
                  },
                  {
                    default: () => {
                      if (hasError) {
                        return h(
                          Badge,
                          {
                            props: {
                              isDot: true
                            }
                          },
                          { default: () => label }
                        )
                      }

                      return label
                    }
                  }
                )
              }) ?? []
            }
          }
        )
      }
    }
  }),
  {
    scheduler: (update) => {
      if (schedulerRequest.request) {
        clearTimeout(schedulerRequest.request)
      }
      schedulerRequest.request = setTimeout(() => {
        update()
      }, 100)
    }
  }
)

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
    const pages = computed(() => {
      return Array.from(new Array(totalPage.value)).map((_, index) => {
        const page = index + 1
        return {
          label: page,
          value: page
        }
      })
    })

    const renderPagination = function () {
      if (totalPage.value <= 1) return
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
                    StatusSelect,
                    {
                      props: {
                        value: current.value,
                        onChange: (val: number) => {
                          pagination.value?.changePage?.(val)
                        },
                        pageSize: pageSize.value,
                        options: pages.value
                      }
                    },
                    {}
                  ),
                  h(
                    Pagination,
                    {
                      props: {
                        background: true,
                        layout: 'prev, pager, next',
                        ...attrs,
                        pageSize: pageSize.value,
                        pageCount: totalPage.value,
                        currentPage: current.value
                      },
                      on: {
                        'current-change': (val: number) => {
                          pagination.value?.changePage?.(val)
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
  defineComponent({
    name: 'QueryTable',
    inheritAttrs: false,
    setup (props, { attrs, listeners, slots }) {
      const fieldRef = useField<ArrayField>()
      const schemaRef = useFieldSchema()
      const tableRef = ref<ElTable | null>(null)
      const rootQueryList = useQueryList()
      const prefixCls = `${stylePrefix}-array-table`
      const { getKey, keyMap } = ArrayBase.useKey(schemaRef.value)

      const defaultRowKey = (record: any) => {
        return getKey(record)
      }
      onMounted(() => {
        tableRef.value && rootQueryList?.API.setTableRef(tableRef.value)
      })
      const { update: updateSelectedRecords } = useSelectedRecords() ?? {}
      return () => {
        const field = fieldRef.value
        const dataSource = Array.isArray(field.value) ? field.value.slice() : []
        const isFetching = rootQueryList?.queryResult.isFetching
        const pagination = rootQueryList?.rootProps?.pagination
        const sources = getArrayTableSources(fieldRef, schemaRef)
        const columns = getArrayTableColumns(sources)

        const renderColumns = () => {
          return columns.map(({ key, render, asterisk, ...props }) => {
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
          sources.map((column, key) => {
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
            { class: prefixCls },
            {
              default: () =>
                h(
                  ArrayBase,
                  {
                    props: {
                      keyMap
                    }
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
                          },
                          ref: tableRef
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
        if (!pagination) {
          return renderTable(dataSource)
        }
        return h(
          QueryTablePagination,
          {

            directives: [
              {
                name: 'loading',
                value: isFetching.value
              }
            ],
            attrs: {
              ...(isBool(pagination) ? {} : pagination),
              dataSource
            }
          },
          { default: (renderPagination) => renderTable(dataSource, renderPagination) }
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
