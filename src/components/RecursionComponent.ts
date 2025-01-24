import { defineComponent } from 'vue-demi'
import { Schema } from '@formily/json-schema'
import { h } from '@formily/vue'
import { isFn, isStr, isObj } from '@formily/shared'
import { compile } from '@formily/json-schema/lib/compiler'

export interface IRecursionComponentProps {
  schema: Schema
  scope?: Record<string, any>
  components?: Record<string, any>
  onlyRenderProperties?: boolean
  onlyRenderSelf?: boolean
  mapProperties?: (schema: Schema) => Schema
  filterProperties?: (schema: Schema) => boolean
}

// 编译表达式
const resolveExpressionValue = (expression: any, scope: Record<string, any>) => {
  console.log('resolveExpressionValue:', {
    expression,
    scope
  })

  if (typeof expression !== 'string') return expression

  // 处理表达式
  if (expression.startsWith('{{') && expression.endsWith('}}')) {
    const path = expression.slice(2, -2).trim() // 移除 {{ }}
    const parts = path.split('.')
    let value = scope

    for (const part of parts) {
      if (value === undefined) break
      value = value[part]
    }

    console.log('Resolved expression value:', value)
    return value
  }

  return expression
}

// 解析组件属性
const resolveSchemaProps = (schema: Schema, scope: Record<string, any>) => {
  const props: Record<string, any> = {}
  const componentProps = schema['x-component-props']

  if (isObj(componentProps)) {
    Object.keys(componentProps).forEach(key => {
      let value = componentProps[key]
      // 如果是表达式，解析它
      if (isStr(value) && value.startsWith('{{') && value.endsWith('}}')) {
        value = compile(value)(scope)
      }
      props[key] = value
    })
  }
  return props
}

// 解析组件
const resolveComponent = (schema: Schema, components: Record<string, any> = {}) => {
  const componentName = schema['x-component']
  if (!componentName) return null
  return components[componentName] || componentName
}

// 处理 x-content 内容
const resolveContent = (content: any, scope: Record<string, any>) => {
  console.log('resolveContent:', { content, scope })

  // 如果是对象且包含 default 函数，直接作为 slot 使用
  if (isObj(content)) {
    return content
  }

  // 处理表达式字符串
  if (isStr(content)) {
    if (content.startsWith('{{') && content.endsWith('}}')) {
      return resolveExpressionValue(content, scope)
    }
    return content
  }

  return content
}

// 渲染组件
const renderComponent = (
  schema: Schema,
  scope: Record<string, any>,
  components: Record<string, any> = {}
) => {
  console.log('renderComponent:', {
    component: schema['x-component'],
    props: schema['x-component-props'],
    content: schema['x-content'],
    hasProperties: !!schema.properties,
    scope
  })

  const component = resolveComponent(schema, components)
  if (!component) return null

  const props = resolveSchemaProps(schema, scope)
  const content = schema['x-content']

  // 如果有 properties，需要递归渲染子组件
  if (schema.properties) {
    const properties = resolveProperties(schema, scope, undefined, undefined)
    return h(
      component,
      {
        style: props.style,
        attrs: props
      },
      {
        default: () => properties.map(({ schema: childSchema }) =>
          renderComponent(childSchema, scope, components)
        )
      }
    )
  }

  // 如果有 x-content，处理内容
  if (content) {
    return h(
      component,
      {
        style: props.style,
        attrs: props
      },
      {
        default: () => resolveContent(content, scope)
      }
    )
  }

  // 默认渲染
  return h(
    component,
    {
      style: props.style,
      attrs: props
    },
    {}
  )
}

// 处理属性
const resolveProperties = (
  schema: Schema,
  scope: Record<string, any>,
  mapProperties?: (schema: Schema) => Schema,
  filterProperties?: (schema: Schema) => boolean
) => {
  console.log('resolveProperties for:', {
    component: schema['x-component'],
    properties: schema.properties,
    scope
  })

  const properties = schema.properties
  if (!properties) {
    console.log('No properties found')
    return []
  }

  return Object.entries(properties).reduce<Array<{ key: string, schema: Schema }>>((buf, [key, property]) => {
    console.log('processing property:', key, property)
    if (!(property instanceof Schema)) return buf

    let schema = property
    if (isFn(mapProperties)) {
      schema = mapProperties(property)
    }
    if (isFn(filterProperties)) {
      if (!filterProperties(schema)) return buf
    }
    return buf.concat({
      key,
      schema
    })
  }, [])
}

export const RecursionComponent = defineComponent({
  name: 'RecursionComponent',
  props: {
    schema: {
      type: Object,
      required: true
    },
    scope: {
      type: Object,
      default: () => ({})
    },
    components: {
      type: Object,
      default: () => ({})
    },
    onlyRenderProperties: {
      type: Boolean,
      default: false
    },
    onlyRenderSelf: {
      type: Boolean,
      default: false
    },
    mapProperties: {
      type: Function
    },
    filterProperties: {
      type: Function
    }
  },
  setup (props: IRecursionComponentProps) {
    return () => {
      const {
        schema,
        scope,
        components,
        onlyRenderProperties,
        onlyRenderSelf,
        mapProperties,
        filterProperties
      } = props

      // 处理属性
      const properties = resolveProperties(
        schema,
        scope ?? {},
        mapProperties,
        filterProperties
      )

      // 只渲染属性
      if (onlyRenderProperties) {
        return h(
          'div',
          {},
          {
            default: () =>
              properties.map(({ key, schema }) =>
                renderComponent(schema, scope ?? {}, components)
              )
          }
        )
      }

      // 只渲染自身
      if (onlyRenderSelf) {
        return renderComponent(schema, scope ?? {}, components)
      }

      // 渲染自身和子属性
      const self = renderComponent(schema, scope ?? {}, components)
      if (!properties.length) return self

      return h(
        'div',
        {},
        {
          default: () => [
            self,
            ...properties.map(({ key, schema }) =>
              renderComponent(schema, scope ?? {}, components)
            )
          ]
        }
      )
    }
  }
})

export default RecursionComponent
