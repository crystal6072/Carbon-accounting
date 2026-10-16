<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => (route.path.startsWith('/unit') ? '/unit/list' : '/unit/list'))
const pageTitle = computed(() => (route.meta.title as string | undefined) ?? '计量单位库')
</script>

<template>
  <el-container class="app-layout">
    <el-aside width="216px" class="app-aside">
      <div class="app-logo">产品碳足迹核算系统</div>
      <el-menu :default-active="activeMenu" router>
        <el-sub-menu index="base">
          <template #title>
            <span>基础库</span>
          </template>
          <el-menu-item index="/unit/list">计量单位库</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/unit/list' }">基础库</el-breadcrumb-item>
          <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
        </el-breadcrumb>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-aside {
  border-right: 1px solid var(--line-color);
  background: #fff;
}

.app-logo {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--line-color);
}

.app-header {
  height: 56px;
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid var(--line-color);
}

.app-main {
  background: var(--bg-page);
  padding: 16px;
}
</style>
