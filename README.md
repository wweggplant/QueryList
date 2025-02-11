# QueryList

一个基于 `@tanstack/vue-query` 和 `@formily` 的JSON Schema驱动的处理查询场景的组件。

## 安装

```sh
npm install @formily/element @tanstack/vue-query @formily/vue element-ui @vue/composition-api @wweggplant/query-list
# or
yarn add @formily/element @tanstack/vue-query @formily/vue element-ui @vue/composition-api @wweggplant/query-list 
```

## 使用
```vue
<template>
  <QueryList
    :queryOptions="{ queryFn: () => Promise.resolve([]) }"
    :pagingEnable="true"
    :pagination="{ pageSize: 10 }"
    :queryFn="() => Promise.resolve([])"
  >
    <template #toolbar>查询工具条</template>
    <template #pagination>分页组件</template>
  </QueryList>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { QueryList } from '@wweggplant/query-list'

export default defineComponent({
  components: { QueryList }
})
</script>
```

## 文档

[https://wweggplant.github.io/QueryList/](https://wweggplant.github.io/QueryList/)

## API
### QueryList Props
| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| queryOptions | 用于控制查询的行为,具体使用参考 @tanstack/vue-query | UseQueryOptions | - |
| queryFn | 用于处理查询请求 | (form: any, context: QueryFunctionContext) => Promise\<any\> | - |
| pagingEnable | 是否启用分页功能 | boolean | false |  
| pagination | 用于配置分页组件的页大小 | { pageSize: number } | - |

### QueryList Slots
| 名称 | 说明 |
| --- | --- |
| toolbar | 用于自定义查询工具条 |
| pagination | 用于自定义分页组件 |
| default | 用于放置查询列表 |

### QueryListAction
```typescript
export interface QueryListAction<T> {
  // ...
  API: {
    query: (resetPagin?: boolean) => Promise<void> // 表单查询
  }
  queryTable: any
  queryForm: any
  queryResult: any
  selectedRecords: { // 选中的记录
    list: Ref<T[]>
    update: (list: T[]) => void
  }
  paginationContext: { // 分页上下文
    currentPage: Ref<number>
    total: Ref<number>
    pageSize: Ref<number>
    totalPage: Ref<number>
    changePage: (p: number) => void
    changePageSize: (size: number) => void
    changeTotal: (t: number) => void
  }
}
```

### useQueryList
返回值: `QueryListAction` | undefined类型,提供了API接口,可以调用doQuery方法手动执行查询,重置分页,并修改查询表单的值。

### QueryListForm
| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| buttonGroup | 用于配置查询表单的提交和重置按钮的文案,以及对齐方式 | { submitText?: string, resetText?: string, align?: string } | - |

### QueryActionBtn
操作类按钮,可以在获取QueryList上下文的情况下,调用QueryList的API。

### WrappedComponent
Component类型,包装一个组件,使其能够在Table组件中使用。

## 例子
```vue
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
  batchDel(querylist, selectedRecords, ...args) {
    const { API } = querylist
    console.log('执行删除操作')
    console.log(selectedRecords, '选中的记录')
    console.log(args)
    // 执行查询
    API.query()
  },
  delRow(querylist, obj, ...args) {
    const { API } = querylist
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
```

schema.json
```json
{
  "type": "object",
  "properties": {
    "QueryList": {
      "type": "void",
      "x-component": "QueryList",
      "x-component-props": {
        "queryOptions": {
          "a": 123
        },
        "pagination": {
          "pageSize":3
        },
        "queryFn": "{{queryFn}}"
      },
      "properties": {
        "QueryForm": {
          "type": "object",
          "x-component": "QueryList.Form",
          "x-component-props":{
            "buttonGroup": {
              "submitText": "查询数据",
              "resetText": "重置它"
            }
          },
          "properties": {
            "layout": {
              "type": "void",
              "x-component": "FormGrid",
              "x-component-props": {
                "minColumns": 2,
                "maxColumns": 3,
                "strictAutoFit": true,
                "columnGap": 20
              },
              "properties": {
                "type": {
                  "title": "合同类型",
                  "x-decorator": "FormItem",
                  "x-component": "Select",
                  "type": "string",
                  "x-validator": [],
                  "x-decorator-props": {},
                  "required": true,
                  "enum": [{
                    "label": "类型1",
                    "value": 1
                  },{
                    "label": "类型2",
                    "value": 2
                  }],
                  "name": "contract_type"
                },
                "name": {
                  "title": "合同名称",
                  "x-decorator": "FormItem",
                  "x-component": "Input",
                  "type": "string",
                  "x-validator": [],
                  "x-decorator-props": {},
                  "required": true,
                  "name": "contract_type"
                }
              }
            }
          }
        },
        "Toolbar": {
          "type": "object",
          "x-component": "QueryList.Toolbar",
          "properties": {
            "a": {
              "x-component": "QueryList.QueryActionBtn",
              "x-content": "操作a",
              "type": "void",
              "x-component-props": {
                "@click": "{{batchDel}}"
              }
            },
            "b": {
              "x-component": "Button",
              "x-content": "操作b",
              "type": "void"
            }
          }
        },
        "QueryTable": {
          "type": "array",
          "x-read-pretty": true,
          "x-component": "QueryList.Table",
          "items": {
            "type": "object",
            "properties": {
              "select": {
                "type": "void",
                "x-component": "QueryList.Table.Column",
                "x-component-props": {
                  "type": "selection"
                }
              },
              "column1": {
                "type": "void",
                "x-component": "QueryList.Table.Column",
                "x-component-props": {
                  "title": "cname",
                  "align": "center"
                },
                "properties": {
                  "cname": {
                    "type": "string",
                    "x-component": "Input"
                  }
                }
              },
              "column2": {
                "type": "void",
                "x-component": "QueryList.Table.Column",
                "x-component-props": {
                  "title": "username",
                  "align": "center"
                },
                "properties": {
                  "username": {
                    "type": "string",
                    "x-component": "Input"
                  }
                }
              },
              "column3": {
                "type": "void",
                "x-component": "QueryList.Table.Column",
                "x-component-props": {
                  "title": "email",
                  "align": "center"
                },
                "properties": {
                  "email": {
                    "type": "string",
                    "x-component": "Input"
                  }
                }
              },
              "column4": {
                "type": "void",
                "x-component": "QueryList.Table.Column",
                "x-component-props": {
                  "title": "mobile",
                  "align": "center"
                },
                "properties": {
                  "mobile": {
                    "type": "string",
                    "x-component": "Input"
                  }
                }
              },
              "column5": {
                "type": "void",
                "x-component": "QueryList.Table.Column",
                "x-component-props": {
                  "title": "department_name",
                  "align": "center"
                },
                "properties": {
                  "department_name": {
                    "type": "string",
                    "x-component": "Input"
                  }
                }
              },
              "column6": {
                "type": "void",
                "x-component": "QueryList.Table.Column",
                "x-component-props": {
                  "title": "操作",
                  "align": "center"
                },
                "properties": {
                  "delete_btn": {
                    "type": "void",
                    "x-component": "QueryList.Table.ActionBtn",
                    "x-content": "删除",
                    "x-component-props": {
                      "@click":"{{delRow}}"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}