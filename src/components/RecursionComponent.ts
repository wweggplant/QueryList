import { defineComponent, provide, InjectionKey, inject, markRaw, shallowRef, watch } from 'vue-demi'
import { Schema } from '@formily/json-schema'
import { Fragment, h } from '@formily/vue'
import { isFn, isStr, isObj } from '@formily/shared'
import { _SchemaExpressionScopeSymbol } from './QueryList'

export interface IRecursionComponentProps {
  schema: Schema
  scope?: Record<string, any>
  components?: Record<string, any>
  onlyRenderProperties?: boolean
  onlyRenderSelf?: boolean
  mapProperties?: (schema: Schema) => Schema
  filterProperties?: (schema: Schema) => boolean
}

// 添加行数据注入的 Symbol
export const CurrentRecordSymbol: InjectionKey<Record<string, any>> = Symbol('currentRecord')
export const useReactiveRecord = () => {
  return inject(CurrentRecordSymbol, {})
}

// 简单的表达式解析（参考 Formily 解析逻辑）
const resolveExpressionValue = (expression: any, scope: Record<string, any>): any => {
  if (!isStr(expression)) return expression

  // 如果符合 {{}} 规则，按路径查找
  if (expression.startsWith('{{') && expression.endsWith('}}')) {
    const path = expression.slice(2, -2).trim()
    const parts = path.split('.')
    let value = scope
    for (const part of parts) {
      if (value === undefined) break
      value = value[part]
    }
    return value
  }
  return expression
}

// 定义解析后属性的类型，注意保证返回对象中含有 on 字段，用于事件绑定
export interface ResolvedSchemaProps {
  [key: string]: any
  on: Record<string, any>
}

/**
 * 解析组件属性，支持表达式计算和事件绑定
 * 其中会先使用 Formily 内部的 compile 方法解析表达式，
 * 再对返回结果做一次后处理，把所有以 `@` 开头的属性转换到 on 对象下。
 */
const resolveSchema = (
  schema: Schema,
  scope: Record<string, any>
): any => {
  // 从上层注入 ExpressionScope，将其与当前 scope 合并
  const expressionScope = inject(_SchemaExpressionScopeSymbol)
  const mergedScope = { ...expressionScope?.value, ...scope }

  // 采用 Formily 内部的 compile 进行表达式解析
  const _schema = new Schema(schema)
  const compiledSchema = _schema.compile(mergedScope)

  // 获取解析后的 x-component-props，默认为空对象
  const xComponentProps: Record<string, any> = compiledSchema['x-component-props'] || {}

  // 后处理：将所有以 '@' 开头的属性转换为 on 对象的属性
  const processedProps: ResolvedSchemaProps = { on: {} }
  Object.keys(xComponentProps).forEach(key => {
    if (key.startsWith('@')) {
      // 去掉前缀 @，作为事件名称
      const eventName = key.slice(1)
      processedProps.on[eventName] = xComponentProps[key]
    } else {
      processedProps[key] = xComponentProps[key]
    }
  })
  compiledSchema['x-component-props'] = processedProps
  return compiledSchema
}

/**
 * 根据 schema 的 x-component 字段，获取组件引用，
 * 支持传入自定义的 components 作为映射表
 */
const resolveComponent = (schema: Schema, components: Record<string, any> = {}): any => {
  const componentName = schema['x-component']
  if (!componentName) return null
  return components[componentName] || componentName
}

/**
 * 解析 x-content 内容，支持字符串表达式
 */
const resolveContent = (content: any, scope: Record<string, any>): any => {
  if (isObj(content)) {
    return content
  }
  if (isStr(content)) {
    if (content.startsWith('{{') && content.endsWith('}}')) {
      return resolveExpressionValue(content, scope)
    }
    return content
  }
  return content
}

/**
 * 递归解析子属性，返回 key 与 schema 组成的数组
 */
const resolveProperties = (
  schema: Schema,
  scope: Record<string, any>,
  mapProperties?: (schema: Schema) => Schema,
  filterProperties?: (schema: Schema) => boolean
): Array<{ key: string, schema: Schema }> => {
  if (!schema.properties) {
    return []
  }
  return Object.entries(schema.properties).reduce((buf: Array<{ key: string, schema: Schema }>, [key, property]) => {
    if (!(property instanceof Schema)) return buf
    let childSchema = property
    if (isFn(mapProperties)) {
      childSchema = mapProperties(property)
    }
    if (isFn(filterProperties)) {
      if (!filterProperties(childSchema)) return buf
    }
    return buf.concat({ key, schema: childSchema })
  }, [])
}

/**
 * 根据 schema 与当前 scope 渲染出对应组件，
 * 同时处理子属性的递归渲染以及行上下文的提供
 */
const renderComponent = (
  schema: Schema,
  scope: Record<string, any>,
  components: Record<string, any> = {}
): any => {
  const component = resolveComponent(schema, components)
  if (!component) return null

  const compiledSchema = resolveSchema(schema, scope)

  // 解构 style 与 on，设置默认值，同时其余属性置于 attrs 中
  const { style = {}, on = {}, ...restProps } = compiledSchema['x-component-props']
  const props = { style, on, attrs: restProps }
  const content = compiledSchema['x-content']

  // 当存在子属性时，递归调用 renderComponent
  if (schema.properties) {
    const properties = resolveProperties(schema, scope, undefined, undefined)
    return h(
      component,
      props,
      {
        default: () =>
          properties.map(({ schema: childSchema }) => renderComponent(childSchema, scope, components))
      }
    )
  }

  // 存在 x-content 时，使用 resolveContent 解析内容
  if (content) {
    return h(
      component,
      props,
      {
        default: () => resolveContent(content, scope)
      }
    )
  }

  return h(component, props, {})
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
    // 仅在记录实际变化时更新
    if (props.scope?.$record) {
      const recordRef = shallowRef(props.scope?.$record) // 改用 shallowRef
      watch(() => props.scope?.$record, (record) => { // 监听 $record 变化
        recordRef.value = props.scope?.$record
      })
      // 使用 markRaw 避免递归响应式
      provide(CurrentRecordSymbol, markRaw({
        ...props.scope,
        record: recordRef
      }))
    }
    return () => {
      const { schema, scope, components, onlyRenderProperties, onlyRenderSelf, mapProperties, filterProperties } = props
      const properties = resolveProperties(schema, scope ?? {}, mapProperties, filterProperties)
      if (onlyRenderProperties) {
        return h(
          Fragment,
          {},
          {
            default: () =>
              properties.map(({ key, schema: childSchema }) => renderComponent(childSchema, scope ?? {}, components))
          }
        )
      }
      if (onlyRenderSelf) {
        return renderComponent(schema, scope ?? {}, components)
      }
      const self = renderComponent(schema, scope ?? {}, components)
      if (!properties.length) return self
      return h(
        Fragment,
        {},
        {
          default: () => [
            self,
            ...properties.map(({ key, schema: childSchema }) => renderComponent(childSchema, scope ?? {}, components))
          ]
        }
      )
    }
  }
})

export default RecursionComponent
