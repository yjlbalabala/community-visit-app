<template>
  <div class="todo-panel">
    <div class="panel-title">📋 待办事项</div>

    <div v-if="pagedTodos.length === 0" class="empty-box">
      <el-empty description="暂无待办事项" :image-size="60" />
    </div>

    <template v-else>
      <div class="todo-list">
        <div
          v-for="item in pagedTodos"
          :key="item.id"
          class="todo-item"
        >
          <div class="todo-item__info">
            <div class="todo-item__header">
              <el-tag type="danger" size="small">{{ item.roomNo }}</el-tag>
              <el-tag :type="houseTagType(item.houseType)" size="small">{{ item.houseType }}</el-tag>
              <span class="todo-item__name">{{ item.landlord }}</span>
              <span class="todo-item__count">{{ item.persons.length }} 人</span>
            </div>
            <div class="todo-item__meta">
              <span>电话：{{ item.phone || '—' }}</span>
              <span>上次走访：{{ item.lastVisitTime || '从未走访' }}</span>
              <span>预计走访：{{ expectedTimeOf(item) }}</span>
            </div>
            <div class="todo-item__remark" v-if="item.remark">
              {{ item.remark }}
            </div>
          </div>
          <div class="todo-item__actions">
            <el-button size="small" type="primary" @click="$emit('edit', item)">
              变更信息
            </el-button>
            <el-button size="small" type="success" @click="$emit('confirm', item)">
              确认走访
            </el-button>
          </div>
        </div>
      </div>

      <div class="pagination-box" v-if="todoList.length > pageSize">
        <PaginationBar
          :total="todoList.length"
          v-model:current-page="currentPage"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          small
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HouseType, Household } from '@/types'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import { expectedVisitTime } from '@/utils/visitRule'
import PaginationBar from '@/components/PaginationBar.vue'

const props = defineProps<{
  todoList: Household[]
}>()

defineEmits<{
  edit: [household: Household]
  confirm: [household: Household]
}>()

const currentPage = ref(1)
const pageSize = 10

const pagedTodos = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return props.todoList.slice(start, start + pageSize)
})

const houseTagType = (t: HouseType) => HOUSE_TAG_MAP[t] || 'info'
const expectedTimeOf = (h: Household) => expectedVisitTime(h) ?? '—'
</script>

<style scoped>
.todo-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}

.empty-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.todo-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px;
  background: #fef0f0;
  border-radius: 8px;
  border-left: 4px solid #F53F3F;
}

.todo-item__info {
  flex: 1;
}

.todo-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.todo-item__name {
  font-weight: 500;
}

.todo-item__count {
  color: #909399;
  font-size: 12px;
}

.todo-item__meta {
  color: #909399;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.todo-item__remark {
  margin-top: 6px;
  color: #606266;
  font-size: 13px;
}

.todo-item__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 16px;
  margin-top: 4px;
}

.pagination-box {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>

