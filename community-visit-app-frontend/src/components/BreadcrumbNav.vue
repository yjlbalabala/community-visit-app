<template>
  <nav class="breadcrumb-bar">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item v-for="(item, index) in path" :key="item.id">
        <span
          v-if="index < path.length - 1"
          class="crumb-link"
          @click="go(item)"
        >{{ item.name }}</span>
        <span v-else class="crumb-current">{{ item.name }}</span>
      </el-breadcrumb-item>
    </el-breadcrumb>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { TreeNode } from '@/types'

defineProps<{
  path: TreeNode[]
}>()

const router = useRouter()

const routeOf = (node: TreeNode): string => {
  switch (node.nodeType) {
    case 'zone': return `/zone/${node.id}`
    case 'community': return `/community/${node.id}`
    case 'unit': return `/unit/${node.id}`
    default: return '/'
  }
}

const go = (node: TreeNode) => {
  router.push(routeOf(node))
}
</script>

<style scoped>
.breadcrumb-bar {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.crumb-link {
  color: #409eff;
  cursor: pointer;
}
.crumb-link:hover {
  color: #79bbff;
  text-decoration: underline;
}
.crumb-current {
  color: #303133;
  font-weight: 500;
}
</style>
