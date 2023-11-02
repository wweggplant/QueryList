import Vue from 'vue'
import CompositionApi from '@vue/composition-api'
Vue.use(CompositionApi)
import App from './App.vue'
import ElementUI from 'element-ui'
import Router from 'vue-router'
import 'element-ui/lib/theme-chalk/index.css'
import { VueQueryPlugin } from "@tanstack/vue-query";
Vue.use(ElementUI)
Vue.use(Router)
Vue.use(VueQueryPlugin)
const router = new Router({
  mode: 'hash',
  routes: [
    { path: '/', component: () => import('./index.vue') },
    { path: '/basic', component: () => import('./basic.vue') },
    { path: '/set-select', component: () => import('./set-select.vue') }
  ]
})

export default new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
