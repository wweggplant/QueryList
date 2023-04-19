import { QueryListAction } from 'src/components/QueryList'
import { InjectionKey } from 'vue-demi'

export const QueryBaseSymbol: InjectionKey<QueryListAction> = Symbol('QueryBaseContext')
export const UniqueQueryKey = 'QueryListKey'
export const SelectedRecordsSymbol = Symbol('SelectedRecordsSymbol')
export const stylePrefix = 'formily-element'
