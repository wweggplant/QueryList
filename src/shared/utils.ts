import { Button } from 'element-ui'
import { defineComponent } from 'vue-demi'

export function composeExport<T0 extends {}, T1 extends {}> (
  s0: T0,
  s1: T1
): T0 & T1 {
  return Object.assign(s0, s1)
}

export const DefaultQueryButton = defineComponent({
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
