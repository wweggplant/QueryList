<template>
  <el-row>
    <el-col :span="8">
      <router-link to="./basic">基本</router-link>
    </el-col>
    <el-col :span="8">
      <router-link to="./set-select">勾选</router-link>
    </el-col>
    <el-col :span="8">
      <router-link to="./read-pretty-table">只读表格</router-link>
    </el-col>
  </el-row>
</template>
<script lang="ts">
export default {}
</script>
