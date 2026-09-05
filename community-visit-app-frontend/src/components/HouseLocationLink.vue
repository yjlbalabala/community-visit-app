<template>
  <span
    v-if="clickable"
    class="house-loc-link"
    :title="`点击跳转到 ${text} 的单元格视图`"
    @click.stop="go"
  >{{ text }}</span>
  <span v-else>{{ text || '—' }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  zoneName?: string
  communityName?: string
  unitName?: string
  roomNo?: string
  /** 单元 id（存在且含房号时可点击跳转） */
  unitId?: string
}>()

const router = useRouter()

const text = computed(() =>
  [props.zoneName, props.communityName, props.unitName, props.roomNo].filter(Boolean).join(' · ')
)

const clickable = computed(() => !!props.unitId && !!props.roomNo)

const go = () => {
  if (props.unitId && props.roomNo) {
    router.push({ path: `/unit/${props.unitId}`, query: { roomNo: props.roomNo } })
  }
}
</script>

<style scoped>
.house-loc-link {
  color: inherit;
  cursor: pointer;
  transition: color 0.15s;
}
.house-loc-link:hover {
  color: #409eff;
  text-decoration: underline;
}
</style>
