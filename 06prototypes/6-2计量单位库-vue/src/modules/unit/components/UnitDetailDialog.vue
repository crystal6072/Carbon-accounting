<script setup lang="ts">
import { STATUS_TEXT, UNIT_TYPE_TEXT } from '../constants'
import type { UnitItem } from '../types'
import { conversionText } from '../utils'

defineProps<{ visible: boolean; unit: UnitItem | null }>()
defineEmits<{ 'update:visible': [boolean] }>()
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="计量单位详情"
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template v-if="unit">
      <el-descriptions :column="2" border size="default">
        <el-descriptions-item label="单位名称">{{ unit.name }}</el-descriptions-item>
        <el-descriptions-item label="单位符号">{{ unit.symbol }}</el-descriptions-item>
        <el-descriptions-item label="单位类型">
          {{ UNIT_TYPE_TEXT[unit.type] }}<span class="muted">（系统内置枚举）</span>
        </el-descriptions-item>
        <el-descriptions-item label="是否基准单位">
          <el-tag :type="unit.isBase ? 'success' : 'info'" effect="light" size="small">
            {{ unit.isBase ? '基准单位' : '非基准单位' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="关联基准单位">
          {{ unit.isBase ? '-' : (unit.baseUnitSymbol ?? '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="换算系数">
          {{ unit.isBase ? '1' : (unit.factor ?? '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="换算口径" :span="2">
          <span class="conversion">{{ conversionText(unit) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="使用状态">
          <el-tag :type="unit.status === 'enabled' ? 'success' : 'danger'" effect="light" size="small">
            {{ STATUS_TEXT[unit.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ unit.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建人 / 创建时间">
          {{ unit.createdBy }} / {{ unit.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item label="更新人 / 更新时间">
          {{ unit.updatedBy }} / {{ unit.updatedAt }}
        </el-descriptions-item>
      </el-descriptions>
    </template>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.muted {
  color: #909399;
  font-size: 12px;
}

.conversion {
  color: #409eff;
}
</style>
