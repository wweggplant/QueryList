# QueryList 组件

QueryList 是一个基于 JSON Schema 的处理通用查询场景的组件。以下是它的示例代码：

## 安装

```bash

npm install -save @he-fe/query-list
# or
yarn add @he-fe/query-list
```

## 示例代码

```vue
<template>
  <QueryListWrapper :schema="schema"/>
</template>

<script lang="ts">
import { defineComponent } from 'vue-demi'
import { createQueryList } from '@he-fe/query-list'
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
    const { API } = querylist
    console.log('执行删除操作')
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
```

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

```