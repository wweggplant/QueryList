import type { Component } from 'vue'
import { defineComponent } from 'vue-demi'
import QueryList from '../components/QueryList'
import { createForm, type IFormProps } from '@formily/core'
import { createSchemaField, h } from '@formily/vue'
import {
  ArrayCards,
  ArrayCollapse,
  ArrayItems,
  ArrayTable,
  ArrayTabs,
  Cascader,
  Checkbox,
  DatePicker,
  Editable,
  FormButtonGroup,
  FormCollapse,
  FormGrid,
  FormItem,
  FormLayout,
  FormStep,
  FormTab,
  Form,
  InputNumber,
  Input,
  Password,
  PreviewText,
  Radio,
  Reset,
  Select,
  Space,
  Submit,
  Switch,
  TimePicker,
  Transfer,
  Upload
} from '@formily/element'
import { Button } from 'element-ui'

type IcreateQueryListContextRuturn = (
  scope: Record<string, any>,
  components?: any,
  formProps?: IFormProps,
) => Component<{}, {}, {}, { schema: any }>

const tableButton = defineComponent({
  extends: Button,
  props: {
    size: {
      default: 'mini'
    },
    type: {
      default: 'primary'
    }
  }
})

const createQueryList: IcreateQueryListContextRuturn = (scope, components, formProps = {}) => {
  const { SchemaField } = createSchemaField({
    components: {
      QueryList,
      ArrayCards,
      ArrayCollapse,
      ArrayItems,
      ArrayTable,
      ArrayTabs,
      Cascader,
      Checkbox,
      DatePicker,
      Editable,
      FormButtonGroup,
      FormCollapse,
      FormGrid,
      FormItem,
      FormLayout,
      FormStep,
      FormTab,
      Form,
      InputNumber,
      Input,
      Password,
      PreviewText,
      Radio,
      Reset,
      Select,
      Space,
      Submit,
      Switch,
      TimePicker,
      Transfer,
      Upload,
      Button: tableButton,
      ...components
    },
    scope
  })

  return defineComponent({
    components: {
      SchemaField
    },
    props: ['schema'],
    setup (props, { attrs }) {
      const form = createForm(formProps)
      return () => {
        return h(Form, { props: { previewTextPlaceholder: ' ', form, ...attrs } }, { default: () => [h(SchemaField, { props: { schema: props.schema } }, {})] })
      }
    }

  })
}

export default createQueryList
