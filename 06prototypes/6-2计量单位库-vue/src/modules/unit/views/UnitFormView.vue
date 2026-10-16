<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createUnit, fetchUnitById, fetchUnitList, peekUnits, updateUnit } from '../api'
import { UNIT_TYPE_OPTIONS, UNIT_TYPE_TEXT, YES_NO_OPTIONS, unitTypeHint } from '../constants'
import type { UnitDraft, UnitItem, UnitTypeCode, YesNo } from '../types'
import { unitOptionLabel } from '../utils'

interface UnitFormModel {
  name: string
  symbol: string
  type: UnitTypeCode | ''
  isBase: YesNo
  baseUnitId: string
  factor: string
  remark: string
}

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const loading = ref(false)

const id = computed(() => (route.params.id as string | undefined) ?? '')
const isEdit = computed(() => Boolean(id.value))

/** 全量单位数据：用于「关联基准单位」候选与唯一性校验 */
const allUnits = ref<UnitItem[]>([])
const origin = ref<UnitItem | null>(null)

/** 数据回填期间不触发联动重置 */
const hydrated = ref(false)

const form = reactive<UnitFormModel>({
  name: '',
  symbol: '',
  type: '',
  isBase: 'N',
  baseUnitId: '',
  factor: '',
  remark: '',
})

/* ---------- 联动逻辑 ---------- */

const isQuantity = computed(() => form.type === 'quantity')
const isBaseUnit = computed(() => form.isBase === 'Y')
/** 需要填写换算信息的场景：非基准单位且非「数量」类 */
const needConversion = computed(() => !isBaseUnit.value && !isQuantity.value)

/** D02：基准单位不可改类型 */
const typeDisabled = computed(() => isEdit.value && origin.value?.isBase === true)
/** 字段清单 Q04：「是否基准单位」新增时可选、编辑时不可改 */
const baseFlagDisabled = computed(() => isEdit.value)

/** D03：仅可选择同类型的基准单位 */
const baseUnitOptions = computed(() => {
  if (!form.type || !needConversion.value) return []
  return allUnits.value.filter(
    (item) => item.type === form.type && item.isBase && item.status === 'enabled' && item.id !== id.value,
  )
})

const baseUnitPlaceholder = computed(() => {
  if (isBaseUnit.value) return '基准单位无需关联'
  if (isQuantity.value) return '「数量」类无基准单位，不可换算'
  return baseUnitOptions.value.length ? '请选择关联基准单位' : '该类型暂无基准单位，请先新增基准单位'
})

const factorPlaceholder = computed(() => {
  if (isBaseUnit.value) return '基准单位换算系数恒为 1'
  if (isQuantity.value) return '「数量」类不可换算'
  return '本单位 -> 基准单位的乘数'
})

const factorDisabled = computed(() => !needConversion.value)
const conversionTip = computed(() => {
  if (isBaseUnit.value) return '基准单位换算系数恒为 1，不可修改'
  if (isQuantity.value) return '「数量」类无基准单位，不可换算，无需填写关联基准单位与换算系数'
  const baseSymbol = baseUnitOptions.value.find((item) => item.id === form.baseUnitId)?.symbol
  return baseSymbol && form.factor && Number(form.factor) > 0
    ? `换算口径：1 ${form.symbol || '本单位'} = ${form.factor} ${baseSymbol}`
    : '仅可选择同类型的基准单位；换算系数为「本单位 -> 基准单位」的乘数'
})

watch(
  () => form.type,
  (type) => {
    if (!hydrated.value) return
    form.baseUnitId = ''
    form.factor = ''
    if (type === 'quantity' && form.isBase === 'Y') {
      form.isBase = 'N'
      ElMessage.info('「数量」类型无基准单位，「是否基准单位」已重置为「否」')
    }
    formRef.value?.clearValidate(['symbol', 'isBase', 'baseUnitId', 'factor'])
  },
)

watch(
  () => form.isBase,
  (isBase) => {
    if (!hydrated.value) return
    if (isBase === 'Y') {
      form.baseUnitId = ''
      form.factor = '1'
    } else {
      form.factor = ''
    }
    formRef.value?.clearValidate(['baseUnitId', 'factor'])
  },
)

/* ---------- 校验规则 ---------- */

const validateSymbol = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  const text = String(value ?? '')
  if (/\s/.test(text)) return callback(new Error('单位符号不得包含空格'))
  const symbol = text.trim()
  if (!symbol || !form.type) return callback()
  // D01：「单位符号 + 单位类型」唯一
  const conflict = peekUnits().find(
    (item) =>
      item.type === form.type &&
      item.symbol.toLowerCase() === symbol.toLowerCase() &&
      item.id !== id.value,
  )
  if (conflict) {
    return callback(
      new Error(`单位符号「${symbol}」在「${UNIT_TYPE_TEXT[form.type]}」下已存在，请调整`),
    )
  }
  callback()
}

const validateIsBase = (_rule: unknown, value: YesNo, callback: (e?: Error) => void) => {
  if (value !== 'Y' || !form.type) return callback()
  // D02：每个单位类型下有且仅有 1 个基准单位
  const exists = peekUnits().find(
    (item) => item.type === form.type && item.isBase && item.id !== id.value,
  )
  if (exists) {
    return callback(
      new Error(
        `「${UNIT_TYPE_TEXT[form.type]}」已存在基准单位「${exists.symbol}」，每个类型仅允许 1 个基准单位`,
      ),
    )
  }
  callback()
}

const validateBaseUnitId = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  if (!needConversion.value) return callback()
  if (!value) return callback(new Error('请选择关联基准单位'))
  callback()
}

const validateFactor = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  if (!needConversion.value) return callback()
  const text = String(value ?? '').trim()
  // D04：换算系数必须为「正数」
  if (!text) return callback(new Error('请输入换算系数'))
  if (!/^\d+(\.\d+)?$/.test(text)) return callback(new Error('换算系数必须为数字'))
  if (Number(text) <= 0) return callback(new Error('换算系数必须为正数（不允许 0 或负数）'))
  callback()
}

const rules = reactive<FormRules<UnitFormModel>>({
  name: [
    { required: true, message: '请输入单位名称', trigger: 'blur' },
    { max: 50, message: '单位名称不超过 50 个字符', trigger: 'blur' },
  ],
  symbol: [
    { required: true, message: '请输入单位符号', trigger: 'blur' },
    { validator: validateSymbol, trigger: 'blur' },
  ],
  type: [{ required: true, message: '请选择单位类型', trigger: 'change' }],
  isBase: [
    { required: true, message: '请选择是否基准单位', trigger: 'change' },
    { validator: validateIsBase, trigger: 'change' },
  ],
  baseUnitId: [{ validator: validateBaseUnitId, trigger: 'change' }],
  factor: [{ validator: validateFactor, trigger: 'blur' }],
  remark: [{ max: 200, message: '备注不超过 200 个字符', trigger: 'blur' }],
})

/* ---------- 加载与提交 ---------- */

onMounted(async () => {
  loading.value = true
  try {
    allUnits.value = await fetchUnitList()
    if (!isEdit.value) {
      hydrated.value = true
      return
    }
    const detail = await fetchUnitById(id.value)
    if (!detail) {
      ElMessage.error('单位不存在或已被删除')
      router.replace('/unit/list')
      return
    }
    origin.value = detail
    form.name = detail.name
    form.symbol = detail.symbol
    form.type = detail.type
    form.isBase = detail.isBase ? 'Y' : 'N'
    form.baseUnitId = detail.baseUnitId ?? ''
    form.factor = detail.factor === null ? '' : String(detail.factor)
    form.remark = detail.remark ?? ''
    hydrated.value = true
  } finally {
    loading.value = false
  }
})

const handleCancel = () => router.push('/unit/list')

const buildDraft = (): UnitDraft => ({
  name: form.name.trim(),
  symbol: form.symbol.trim(),
  type: form.type as UnitTypeCode,
  isBase: form.isBase === 'Y',
  baseUnitId: needConversion.value ? form.baseUnitId : null,
  factor: isBaseUnit.value ? 1 : needConversion.value ? Number(form.factor) : null,
  status: origin.value?.status ?? 'enabled',
  remark: form.remark.trim(),
})

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请先完善必填项与校验错误项')
    return
  }
  submitting.value = true
  try {
    const draft = buildDraft()
    if (isEdit.value) {
      await updateUnit(id.value, draft)
      ElMessage.success('编辑成功')
    } else {
      await createUnit(draft)
      ElMessage.success('新增成功')
    }
    router.push('/unit/list')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-card v-loading="loading" shadow="never" class="unit-card">
    <template #header>
      <div class="page-head">
        <div class="page-head__text">
          <div class="page-title">{{ isEdit ? '编辑计量单位' : '新增计量单位' }}</div>
          <div class="page-desc">
            「单位符号 + 单位类型」唯一；每个单位类型下有且仅有 1 个基准单位
          </div>
        </div>
        <el-button @click="handleCancel">取消</el-button>
      </div>
    </template>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="116px" class="unit-form">
      <el-form-item label="单位名称" prop="name" required>
        <el-input v-model="form.name" placeholder="如：千克" maxlength="50" clearable />
      </el-form-item>

      <el-form-item label="单位符号" prop="symbol" required>
        <el-input v-model="form.symbol" placeholder="如：kg（不得包含空格）" maxlength="30" clearable />
      </el-form-item>

      <el-form-item label="单位类型" prop="type" required>
        <el-select
          v-model="form.type"
          placeholder="请选择单位类型（系统内置枚举）"
          :disabled="typeDisabled"
        >
          <el-option
            v-for="item in UNIT_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <div class="field-tip">
          {{ unitTypeHint(form.type) }}
          <span v-if="typeDisabled" class="field-tip--warn">（基准单位不可改类型）</span>
        </div>
      </el-form-item>

      <el-form-item label="是否基准单位" prop="isBase" required>
        <el-select v-model="form.isBase" :disabled="baseFlagDisabled" style="width: 180px">
          <el-option
            v-for="item in YES_NO_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <div class="field-tip">新增时可选；每个单位类型下有且仅有 1 个基准单位</div>
      </el-form-item>

      <el-form-item label="关联基准单位" prop="baseUnitId" :required="needConversion">
        <el-select
          v-model="form.baseUnitId"
          :placeholder="baseUnitPlaceholder"
          :disabled="!needConversion"
          clearable
        >
          <el-option
            v-for="item in baseUnitOptions"
            :key="item.id"
            :label="unitOptionLabel(item)"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="换算系数" prop="factor" :required="needConversion">
        <el-input
          v-model="form.factor"
          :placeholder="factorPlaceholder"
          :disabled="factorDisabled"
          style="width: 260px"
        />
        <div class="field-tip">{{ conversionTip }}</div>
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
          placeholder="选填，最多 200 字"
        />
      </el-form-item>
    </el-form>

    <div class="form-tips">
      单位类型为系统内置枚举，不开放维护；「是否基准单位」新增时可选、编辑时不可改。每个单位类型下有且仅有
      1 个基准单位，基准单位不可禁用 / 删除 / 改类型，换算系数恒为 1
    </div>

    <div class="form-footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </div>
  </el-card>
</template>

<style scoped>
.unit-card {
  max-width: 880px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.page-desc {
  margin-top: 4px;
  font-size: 13px;
  color: #86909c;
}

.unit-form {
  max-width: 640px;
  padding-top: 8px;
}

.unit-form :deep(.el-select) {
  width: 100%;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #86909c;
}

.field-tip--warn {
  color: #e6a23c;
}

.form-tips {
  margin: 16px 0 0;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.8;
  color: #4e5969;
  background: #f5f7fa;
  border-left: 3px solid #409eff;
  border-radius: 4px;
}

.form-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}
</style>
