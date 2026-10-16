<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchUnitList, removeUnits, updateUnitStatus } from '../api'
import {
  STATUS_OPTIONS,
  STATUS_TAG,
  STATUS_TEXT,
  UNIT_TYPE_OPTIONS,
  UNIT_TYPE_TAG,
  UNIT_TYPE_TEXT,
} from '../constants'
import type { UnitItem, UnitQuery, UnitStatus, UnitTypeCode } from '../types'
import {
  baseFlagTag,
  baseUnitText,
  canDelete,
  canToggleStatus,
  factorText,
  typeRank,
} from '../utils'
import UnitDetailDialog from '../components/UnitDetailDialog.vue'

/**
 * 列表的分页是在前端按「已排序（按单位类型分组）」结果上切片的，
 * 因此 span-method 的分组行合并始终在当前页内连续，不会出现跨页错位。
 */
const TYPE_COLUMN_INDEX = 3

const router = useRouter()

const loading = ref(false)
const allList = ref<UnitItem[]>([])
const selectedRows = ref<UnitItem[]>([])
const currentPage = ref(1)
const pageSize = ref(10)

const query = reactive<UnitQuery>({ name: '', symbol: '', type: '', status: '' })

const detailVisible = ref(false)
const currentUnit = ref<UnitItem | null>(null)

/* ---------- 数据过滤 / 分组排序 / 分页 ---------- */

const filteredList = computed(() => {
  const name = query.name.trim().toLowerCase()
  const symbol = query.symbol.trim().toLowerCase()
  return allList.value.filter((item) => {
    const matchName = !name || item.name.toLowerCase().includes(name)
    const matchSymbol = !symbol || item.symbol.toLowerCase().includes(symbol)
    const matchType = !query.type || item.type === query.type
    const matchStatus = !query.status || item.status === query.status
    return matchName && matchSymbol && matchType && matchStatus
  })
})

/** 按单位类型分组：先按类型枚举顺序，组内基准单位置顶 */
const sortedList = computed(() =>
  [...filteredList.value].sort(
    (a, b) =>
      typeRank(a.type) - typeRank(b.type) ||
      Number(b.isBase) - Number(a.isBase) ||
      a.symbol.localeCompare(b.symbol, 'zh-Hans-CN'),
  ),
)

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedList.value.slice(start, start + pageSize.value)
})

/** 合并「单位类型」列，实现视觉分组 */
const typeSpanMap = computed(() => {
  const map = new Map<string, number>()
  const rows = pagedRows.value
  let i = 0
  while (i < rows.length) {
    let j = i
    while (j < rows.length && rows[j].type === rows[i].type) j += 1
    map.set(rows[i].id, j - i)
    i = j
  }
  return map
})

const spanMethod = ({ row, columnIndex }: { row: UnitItem; columnIndex: number }) => {
  if (columnIndex !== TYPE_COLUMN_INDEX) return
  const rowspan = typeSpanMap.value.get(row.id)
  return rowspan ? { rowspan, colspan: 1 } : { rowspan: 0, colspan: 0 }
}

watch(filteredList, (rows) => {
  const maxPage = Math.max(1, Math.ceil(rows.length / pageSize.value))
  if (currentPage.value > maxPage) currentPage.value = maxPage
})

/* ---------- 交互 ---------- */

const loadList = async () => {
  loading.value = true
  try {
    allList.value = await fetchUnitList()
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleReset = () => {
  query.name = ''
  query.symbol = ''
  query.type = ''
  query.status = ''
  currentPage.value = 1
}

const handleSelectionChange = (rows: UnitItem[]) => {
  selectedRows.value = rows
}

const handleCreate = () => router.push('/unit/create')
const handleEdit = (row: UnitItem) => router.push(`/unit/edit/${row.id}`)

const openDetail = (row: UnitItem) => {
  currentUnit.value = row
  detailVisible.value = true
}

const handleToggleStatus = async (row: UnitItem) => {
  if (!canToggleStatus(row)) {
    ElMessage.warning('基准单位不可禁用 / 启用')
    return
  }
  const nextStatus = row.status === 'enabled' ? 'disabled' : 'enabled'
  await ElMessageBox.confirm(
    `确认${nextStatus === 'disabled' ? '禁用' : '启用'}单位「${row.symbol}（${row.name}）」？`,
    nextStatus === 'disabled' ? '禁用确认' : '启用确认',
    { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' },
  )
  await updateUnitStatus([row.id], nextStatus)
  ElMessage.success(`${nextStatus === 'disabled' ? '禁用' : '启用'}成功`)
  selectedRows.value = []
  await loadList()
}

const handleBatchEnable = async () => {
  const targets = selectedRows.value.filter(
    (item) => item.status === 'disabled' && canToggleStatus(item),
  )
  if (!targets.length) {
    ElMessage.info('所选单位中没有可启用的数据')
    return
  }
  await ElMessageBox.confirm(`确认批量启用 ${targets.length} 个单位？`, '批量启用', {
    type: 'warning',
  })
  const done = await updateUnitStatus(
    targets.map((item) => item.id),
    'enabled',
  )
  ElMessage.success(`已启用 ${done.length} 个单位`)
  selectedRows.value = []
  await loadList()
}

const handleBatchDelete = async () => {
  // D02：基准单位不可删除
  const blocked = selectedRows.value.filter((item) => !canDelete(item))
  const targets = selectedRows.value.filter((item) => canDelete(item))
  if (blocked.length) {
    ElMessage.warning(
      `基准单位不可删除，已跳过 ${blocked.length} 条：${blocked.map((i) => i.symbol).join('、')}`,
    )
  }
  if (!targets.length) return
  await ElMessageBox.confirm(
    `确认删除已选 ${targets.length} 个单位？删除后不可恢复。`,
    '批量删除',
    { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' },
  )
  const done = await removeUnits(targets.map((item) => item.id))
  ElMessage.success(`已删除 ${done.length} 个单位`)
  selectedRows.value = []
  await loadList()
}

const handleExport = () => {
  const rows = selectedRows.value.length ? selectedRows.value : sortedList.value
  if (!rows.length) {
    ElMessage.info('暂无可导出的数据')
    return
  }
  const header = [
    '单位名称',
    '单位符号',
    '单位类型',
    '是否基准单位',
    '关联基准单位',
    '换算系数',
    '使用状态',
    '备注',
  ]
  const escape = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const body = rows.map((row) =>
    [
      row.name,
      row.symbol,
      UNIT_TYPE_TEXT[row.type],
      row.isBase ? '基准单位' : '非基准单位',
      baseUnitText(row),
      factorText(row),
      STATUS_TEXT[row.status],
      row.remark,
    ]
      .map(escape)
      .join(','),
  )
  const csv = [header.map(escape).join(','), ...body].join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `计量单位库_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${rows.length} 条数据`)
}

onMounted(loadList)
</script>

<template>
  <div class="unit-list">
    <!-- 顶部说明 -->
    <el-card shadow="never" class="unit-card">
      <p class="unit-notice">
        本单位字典：单位类型为系统内置枚举，不开放维护；换算按「基准中转」。
      </p>

      <el-form :model="query" label-width="72px" class="unit-filter" @submit.prevent>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="单位名称">
              <el-input
                v-model="query.name"
                placeholder="请输入，模糊搜索"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="单位符号">
              <el-input
                v-model="query.symbol"
                placeholder="如 kg"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="单位类型">
              <el-select v-model="query.type" placeholder="全部" clearable>
                <el-option
                  v-for="item in UNIT_TYPE_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="使用状态">
              <el-select v-model="query.status" placeholder="全部" clearable>
                <el-option
                  v-for="item in STATUS_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24" class="filter-actions">
            <el-form-item>
              <el-button @click="handleReset">重置</el-button>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="unit-card">
      <div class="unit-toolbar">
        <div class="toolbar-stats">
          共 <b>{{ sortedList.length }}</b> 条，已选 <b>{{ selectedRows.length }}</b> 条，按单位类型分组展示，各类型（「数量」除外）有且仅有
          1 个基准单位
        </div>
        <div class="toolbar-actions">
          <el-button type="primary" @click="handleCreate">新增</el-button>
          <el-button :disabled="!selectedRows.length" @click="handleBatchEnable">批量启用</el-button>
          <el-button :disabled="!selectedRows.length" @click="handleBatchDelete">批量删除</el-button>
          <el-button @click="handleExport">导出</el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="pagedRows"
        row-key="id"
        border
        :span-method="spanMethod"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column prop="name" label="单位名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="symbol" label="单位符号" min-width="120" show-overflow-tooltip />
        <el-table-column label="单位类型" width="120">
          <template #default="{ row }">
            <el-tag :type="UNIT_TYPE_TAG[row.type as UnitTypeCode]" effect="light" size="small">
              {{ UNIT_TYPE_TEXT[row.type as UnitTypeCode] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="基准标记" width="110">
          <template #default="{ row }">
            <el-tag :type="baseFlagTag(row.isBase).type" effect="light" size="small">
              {{ baseFlagTag(row.isBase).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联基准单位" min-width="140">
          <template #default="{ row }">{{ baseUnitText(row) }}</template>
        </el-table-column>
        <el-table-column label="换算系数" min-width="120">
          <template #default="{ row }">{{ factorText(row) }}</template>
        </el-table-column>
        <el-table-column label="使用状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_TAG[row.status as UnitStatus]" effect="light" size="small">
              {{ STATUS_TEXT[row.status as UnitStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="left">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-tooltip
              :disabled="canToggleStatus(row)"
              content="基准单位不可禁用 / 启用"
              placement="top"
            >
              <span>
                <el-button
                  link
                  :type="row.status === 'enabled' ? 'danger' : 'success'"
                  size="small"
                  :disabled="!canToggleStatus(row)"
                  @click="handleToggleStatus(row)"
                >
                  {{ row.status === 'enabled' ? '禁用' : '启用' }}
                </el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <div class="unit-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="sortedList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <UnitDetailDialog v-model:visible="detailVisible" :unit="currentUnit" />
  </div>
</template>

<style scoped>
.unit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unit-card {
  --el-card-border-color: #e4e7ed;
}

.unit-notice {
  margin: 0 0 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: #4e5969;
  background: #f5f7fa;
  border-left: 3px solid #409eff;
  border-radius: 4px;
}

.unit-filter :deep(.el-form-item) {
  margin-bottom: 0;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.unit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.toolbar-stats {
  font-size: 13px;
  color: #4e5969;
}

.toolbar-stats b {
  color: #409eff;
  font-weight: 600;
  padding: 0 2px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.unit-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
