import { observer } from '@formily/reactive-vue'
import { computed, defineComponent, onUnmounted, ref, Ref, VNode, watch, nextTick, onMounted } from 'vue-demi'
import { Table as ElTable, TableColumn as ElTableColumn, Pagination, Loading } from 'element-ui'
import { useField, useFieldSchema, h, Fragment } from '@formily/vue'
import { Schema } from '@formily/json-schema'
import { stylePrefix } from '../shared/const'
import { isBool, uid } from '@formily/shared'
import { autorun } from '@formily/reactive'
import { ArrayField } from '@formily/core'
import { ActionHOC, useQueryContext, useQueryList, useSelectedRecords } from './QueryList'
import {
  type TableColumn as ElColumnProps
} from 'element-ui'
import { composeExport, DefaultQueryButton } from '../shared/utils'
import RecursionComponent, { useReactiveRecord } from './RecursionComponent'
import { Space } from '@formily/element'
import { usePagination } from './Table'
import { ElLoadingComponent } from 'element-ui/types/loading'

const isColumnComponent = (schema: Schema) => {
  return schema['x-component']?.indexOf('Column') > -1
}
type ColumnProps = Record<string, any> & {
  key: string | number
  label: string
  prop: string
  render?: () => any
  asterisk?: boolean
}

const getArrayTableColumns = (sources: any[]): ColumnProps[] => {
  return sources.map(({ name, columnProps, schema }, key) => {
    if (!isColumnComponent(schema)) return null
    const { title } = columnProps || {}
    // 渲染表格列的内容
    // @param startIndex - 分页起始索引
    // @returns 返回一个渲染函数,用于渲染每个单元格的内容
    const render = (startIndex?: Ref<number>) => {
      // 返回单元格渲染函数
      // @param props.row - 当前行数据
      // @param props.column - 当前列配置
      // @param props.$index - 当前行索引
      return (props: {
        row: Record<string, any>
        column: ElColumnProps
        $index: number
      }): VNode | null => {
        // 1. 检查是否有子属性需要渲染
        const properties = schema.properties

        // 如果没有子属性配置,则直接渲染单元格数据
        if (!properties) {
          // 从行数据中获取对应的属性值进行渲染
          return h(
            'span',
            {
            },
            { default: () => props.row[columnProps?.prop || name] }
          )
        }

        // 创建作用域对象,包含当前行数据和索引
        // 用于在递归组件中访问上下文数据
        const scope = {
          $record: props.row, // 当前行数据
          $index: props.$index // 当前行索引
        }

        // 使用递归组件渲染复杂的单元格内容
        return h(
          RecursionComponent,
          {
            props: {
              schema, // 列的schema配置
              scope, // 传入作用域对象供子组件使用
              onlyRenderProperties: true, // 只渲染properties部分
              components: {
                ActionBtn
              }
            }
          },
          {}
        )
      }
    }

    const column: ColumnProps = {
      key,
      label: title || name,
      prop: columnProps?.prop || name, // 使用 x-component-props 中的 prop
      ...columnProps
    }
    if (schema.properties) {
      column.render = render
    }
    return column
  }).filter((col): col is ColumnProps => col !== null)
}

// 添加分页组件
const ReadPrettyTablePagination = defineComponent({
  name: 'ReadPrettyTablePagination',
  inheritAttrs: false,
  setup (props, { attrs, slots }) {
    const prefixCls = `${stylePrefix}-array-table`
    const pagination = usePagination()
    const current = computed(() => pagination.value?.currentPage ?? 1)
    const pageSize = ref(attrs?.pageSize as number ?? 10)
    const startIndex = computed(() => (current.value - 1) * pageSize.value)
    const totalPage = computed(() => pagination.value.totalPage)

    const renderPagination = () => {
      return h(
        'div',
        {
          class: [`${prefixCls}-pagination`]
        },
        {
          default: () => h(
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
          default: () => slots?.default?.(renderPagination, startIndex) ?? []
        }
      )
    }
  }
})

const ReadPrettyTableInner = observer(
  defineComponent({
    name: 'ReadPrettyTable',
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
      const queryList = useQueryList()
      const schema = useFieldSchema()
      const prefixCls = `${stylePrefix}-array-table`
      const tableClassName = 'read-pretty-table-' + uid()
      const rootQueryList = useQueryList()

      // -------------------------------
      // 新增：添加 loading 功能
      let loading: ElLoadingComponent | null = null
      // 假设 queryList.queryResult 中存在 isFetching
      const isFetching = queryList?.queryResult?.isFetching
      const watchStopHandle = isFetching
        ? watch(() => isFetching.value, () => {
          if (isFetching.value) {
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
        : null
      // -------------------------------

      const dataSource: Ref<any[]> = ref([])

      // 简化列定义，直接从 schema 获取
      const sources = schema.value.properties
      const columns = getArrayTableColumns(
        Object.keys(sources ?? {}).map(key => ({
          name: key,
          columnProps: sources?.[key]['x-component-props'],
          schema: sources?.[key]
        }))
      )

      const tableRef = ref<ElTable | null>(null) // 新增表格引用
      // 新增：行选择状态同步逻辑
      function syncRowSelectionState () {
        const field = fieldRef.value
        const dataSource = Array.isArray(field.value) ? field.value.slice() : []
        console.log('syncRowSelectionState', tableRef.value, dataSource)
        if (props?.rowSelectedFunction) {
          dataSource.forEach((item, i) => {
            tableRef.value?.toggleRowSelection(item, props.rowSelectedFunction(item, i))
          })
        }
      }

      const dispose = autorun(() => {
        dataSource.value = Array.isArray(fieldRef.value.value) ? fieldRef.value.value : []
        nextTick(() => {
          syncRowSelectionState() // 数据变化后同步选择状态
        })
      })
      onMounted(() => {
        if (refs.tableRef) {
          tableRef.value = refs.tableRef as ElTable
        }
        if (refs.QueryTablePagination) {
          tableRef.value = (refs.QueryTablePagination as ElTable)?.$children?.[0] as ElTable ?? null
        }
        tableRef.value && rootQueryList?.API.setTableRef(tableRef.value)
      })
      onUnmounted(() => {
        dispose()
        watchStopHandle?.()
      })
      const { update: updateSelectedRecords } = useSelectedRecords() ?? {}

      const renderColumns = () => {
        return columns.map(({ key, render, asterisk, properties, ...props }) => {
          const children = {} as any
          if (render != null) {
            children.default = render()
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

      // 渲染表格
      const renderTable = (
        dataSource?: any[],
        pager?: () => VNode
      ) => {
        return h(
          'div',
          { class: `${prefixCls} ${tableClassName}` },
          {
            default: () => [
              h(ElTable, {
                ref: 'tableRef',
                props: {
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
              }, {
                ...slots,
                default: () => renderColumns()
              }),
              pager?.()
            ]
          }
        )
      }

      return () => {
        const pagination = queryList?.rootProps?.pagination
        if (!pagination) {
          return renderTable(dataSource.value)
        }

        // 使用分页组件包装
        return h(
          ReadPrettyTablePagination,
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
const ActionBtn = ActionHOC(DefaultQueryButton, () => {
  const record = useReactiveRecord()
  return record
})
// 导出组件
export const ReadPrettyTable = composeExport(ReadPrettyTableInner, {
  Column: ElTableColumn,
  ActionBtn,
  usePagination
})

export default ReadPrettyTable
