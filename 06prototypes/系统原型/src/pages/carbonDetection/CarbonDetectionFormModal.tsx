import { useCallback, useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Select, Textarea, VoucherUpload, formatSize, useToast } from '@/shared/components'
import type { LibraryFileItem, PcfVoucher } from '@/types'
import {
  METHOD_STANDARD_OPTIONS,
  createCarbonDetection,
  fetchCarbonDetection,
  fetchLibraryFiles,
  updateCarbonDetection,
} from '@/mock'
import type { CarbonDetectionPayload } from '@/mock'
import type { CarbonDetectionItem } from '@/types'

interface FormState {
  reportNo: string
  sampleName: string
  sampleDesc: string
  clientUnit: string
  detectionAgency: string
  quantity: string
  detectionCycleStart: string
  detectionCycleEnd: string
  receiveDate: string
  detectionItems: string
  reportDate: string
  standard: string
  customerInfo: string
  attachments: PcfVoucher[]
}

const EMPTY_FORM: FormState = {
  reportNo: '',
  sampleName: '',
  sampleDesc: '',
  clientUnit: '',
  detectionAgency: '',
  quantity: '',
  detectionCycleStart: '',
  detectionCycleEnd: '',
  receiveDate: '',
  detectionItems: '',
  reportDate: '',
  standard: 'GB/T 44290-2024',
  customerInfo: '',
  attachments: [],
}

interface CarbonDetectionFormModalProps {
  open: boolean
  /** 传入记录 id 为编辑，null 为新增 */
  detectionId: string | null
  onClose: () => void
  /** 保存成功回调：由调用页刷新列表 */
  onSaved: (item: CarbonDetectionItem) => void
}

/** 含碳量检测新增 / 编辑弹窗（轻量基础数据走弹窗维护，与列表页同屏） */
export default function CarbonDetectionFormModal({ open, detectionId, onClose, onSaved }: CarbonDetectionFormModalProps) {
  const isEdit = !!detectionId
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [libraryFiles, setLibraryFiles] = useState<LibraryFileItem[]>([])
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    fetchLibraryFiles()
      .then(setLibraryFiles)
      .catch(() => setLibraryFiles([]))
  }, [open])

  /** 把文件库文件（当前版本）转换为附件凭证 */
  const toVoucher = (f: LibraryFileItem): PcfVoucher => {
    const v = f.versions.find((x) => x.versionNo === f.currentVersion) ?? f.versions[f.versions.length - 1]
    return { id: f.id, name: v?.fileName ?? f.name, size: v?.size ?? 0, url: v?.url ?? '', uploadedAt: v?.uploadedAt ?? '' }
  }

  /** 文件库选择确认：保留自定义上传，按所选文件库文件覆盖「库源」附件 */
  const applyLibrarySelection = (ids: string[]) => {
    const chosen = new Set(ids)
    const custom = form.attachments.filter((a) => !libraryFiles.some((f) => f.id === a.id))
    const fromLib = libraryFiles.filter((f) => chosen.has(f.id)).map(toVoucher)
    updateForm({ attachments: [...custom, ...fromLib] })
  }

  const removeAttachment = (id: string) => {
    updateForm({ attachments: form.attachments.filter((a) => a.id !== id) })
  }

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setErrors({})
    try {
      if (detectionId) {
        const detail = await fetchCarbonDetection(detectionId)
        setForm({
          reportNo: detail.reportNo,
          sampleName: detail.sampleName,
          sampleDesc: detail.sampleDesc,
          clientUnit: detail.clientUnit,
          detectionAgency: detail.detectionAgency,
          quantity: detail.quantity,
          detectionCycleStart: detail.detectionCycleStart,
          detectionCycleEnd: detail.detectionCycleEnd,
          receiveDate: detail.receiveDate,
          detectionItems: detail.detectionItems,
          reportDate: detail.reportDate,
          standard: detail.standard,
          customerInfo: detail.customerInfo,
          attachments: detail.attachments ?? [],
        })
      } else {
        setForm(EMPTY_FORM)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [open, detectionId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const standardOptions = METHOD_STANDARD_OPTIONS.map((u) => ({ label: u, value: u }))

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 关闭表单：若文件库选择弹窗开着，Esc / 遮罩优先关闭该弹窗，而非整个表单 */
  const handleFormClose = () => {
    if (libraryPickerOpen) {
      setLibraryPickerOpen(false)
      return
    }
    onClose()
  }

  /** 校验：报告编号 / 样品名称 / 委托单位 / 检测机构 / 样品数量 / 检测周期 / 收样日期 / 检测项目及结果 / 报告日期 / 检测标准 必填 */
  const validate = (): string => {
    const next: Record<string, string> = {}
    if (!form.reportNo.trim()) next.reportNo = '请输入报告编号'
    if (!form.sampleName.trim()) next.sampleName = '请输入样品名称'
    if (!form.clientUnit.trim()) next.clientUnit = '请输入委托单位'
    if (!form.detectionAgency.trim()) next.detectionAgency = '请输入检测机构'
    if (!form.quantity.trim()) next.quantity = '请输入样品数量'
    if (!form.detectionCycleStart) next.detectionCycleStart = '请选择检测周期开始日期'
    if (!form.detectionCycleEnd) next.detectionCycleEnd = '请选择检测周期结束日期'
    if (form.detectionCycleStart && form.detectionCycleEnd && form.detectionCycleStart > form.detectionCycleEnd) {
      next.detectionCycleEnd = '结束日期不得早于开始日期'
    }
    if (!form.receiveDate.trim()) next.receiveDate = '请选择收样日期'
    if (!form.detectionItems.trim()) next.detectionItems = '请输入检测项目及结果'
    if (!form.reportDate.trim()) next.reportDate = '请选择报告日期'
    if (!form.standard) next.standard = '请选择检测标准'
    setErrors(next)
    return Object.keys(next).length > 0 ? '请先完善必填项' : ''
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }
    const payload: CarbonDetectionPayload = {
      reportNo: form.reportNo.trim(),
      sampleName: form.sampleName.trim(),
      sampleDesc: form.sampleDesc.trim(),
      clientUnit: form.clientUnit.trim(),
      detectionAgency: form.detectionAgency.trim(),
      quantity: form.quantity.trim(),
      detectionCycleStart: form.detectionCycleStart,
      detectionCycleEnd: form.detectionCycleEnd,
      receiveDate: form.receiveDate.trim(),
      detectionItems: form.detectionItems.trim(),
      reportDate: form.reportDate.trim(),
      standard: form.standard,
      customerInfo: form.customerInfo.trim(),
      attachments: form.attachments,
    }
    setSubmitting(true)
    try {
      const saved = detectionId ? await updateCarbonDetection(detectionId, payload) : await createCarbonDetection(payload)
      toast('保存成功')
      onSaved(saved)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const librarySelectedIds = form.attachments
    .filter((a) => libraryFiles.some((f) => f.id === a.id))
    .map((a) => a.id)

  return (
    <>
      <Modal
        open={open}
        title={isEdit ? '编辑含碳量检测' : '新增含碳量检测'}
        size="lg"
        onClose={handleFormClose}
      footer={
        <>
          <Button data-ann-target="carbon.form.cancel" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            data-ann-target="carbon.form.save"
            disabled={submitting || loading}
            onClick={handleSubmit}
          >
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="empty">加载中…</div>
      ) : (
        <div className="form-grid">
          <FormField label="报告编号" required error={errors.reportNo} annTarget="carbon.form.reportNo">
            <Input
              value={form.reportNo}
              placeholder="如 Q35264/H260630-352-01R"
              invalid={!!errors.reportNo}
              onChange={(e) => updateForm({ reportNo: e.target.value })}
            />
          </FormField>
          <FormField label="样品名称" required error={errors.sampleName} annTarget="carbon.form.sampleName">
            <Input
              value={form.sampleName}
              placeholder="请输入样品名称"
              invalid={!!errors.sampleName}
              onChange={(e) => updateForm({ sampleName: e.target.value })}
            />
          </FormField>
          <FormField label="委托单位" required error={errors.clientUnit} annTarget="carbon.form.clientUnit">
            <Input
              value={form.clientUnit}
              placeholder="请输入委托单位"
              invalid={!!errors.clientUnit}
              onChange={(e) => updateForm({ clientUnit: e.target.value })}
            />
          </FormField>
          <FormField label="检测机构" required error={errors.detectionAgency} annTarget="carbon.form.detectionAgency">
            <Input
              value={form.detectionAgency}
              placeholder="请输入检测机构"
              invalid={!!errors.detectionAgency}
              onChange={(e) => updateForm({ detectionAgency: e.target.value })}
            />
          </FormField>
          <FormField label="样品数量" required error={errors.quantity} annTarget="carbon.form.quantity">
            <Input
              value={form.quantity}
              placeholder="如 3 块"
              invalid={!!errors.quantity}
              onChange={(e) => updateForm({ quantity: e.target.value })}
            />
          </FormField>
          <FormField label="检测周期" required error={errors.detectionCycleStart || errors.detectionCycleEnd} annTarget="carbon.form.detectionCycle">
            <div className="range-inputs">
              <Input
                type="date"
                value={form.detectionCycleStart}
                invalid={!!errors.detectionCycleStart}
                onChange={(e) => updateForm({ detectionCycleStart: e.target.value })}
              />
              <span className="range-sep">至</span>
              <Input
                type="date"
                value={form.detectionCycleEnd}
                invalid={!!errors.detectionCycleEnd}
                onChange={(e) => updateForm({ detectionCycleEnd: e.target.value })}
              />
            </div>
          </FormField>
          <FormField label="收样日期" required error={errors.receiveDate} annTarget="carbon.form.receiveDate">
            <Input
              type="date"
              value={form.receiveDate}
              invalid={!!errors.receiveDate}
              onChange={(e) => updateForm({ receiveDate: e.target.value })}
            />
          </FormField>
          <FormField label="报告日期" required error={errors.reportDate} annTarget="carbon.form.reportDate">
            <Input
              type="date"
              value={form.reportDate}
              invalid={!!errors.reportDate}
              onChange={(e) => updateForm({ reportDate: e.target.value })}
            />
          </FormField>
          <FormField label="检测标准" required error={errors.standard} annTarget="carbon.form.standard">
            <Select
              value={form.standard}
              placeholder="请选择"
              options={standardOptions}
              invalid={!!errors.standard}
              onChange={(e) => updateForm({ standard: e.target.value as string })}
            />
          </FormField>
          <FormField
            label="检测项目及结果"
            required
            error={errors.detectionItems}
            full
            annTarget="carbon.form.detectionItems"
          >
            <Textarea
              value={form.detectionItems}
              rows={4}
              placeholder={'按行填写，如：\n干燥基碳含量 Cd：45.95%\n全水分 Mt：8.3%'}
              invalid={!!errors.detectionItems}
              onChange={(e) => updateForm({ detectionItems: e.target.value })}
            />
          </FormField>
          <FormField label="样品描述" full annTarget="carbon.form.sampleDesc">
            <Textarea
              value={form.sampleDesc}
              rows={2}
              placeholder="选填"
              onChange={(e) => updateForm({ sampleDesc: e.target.value })}
            />
          </FormField>
          <FormField label="客户信息" full annTarget="carbon.form.customerInfo">
            <Textarea
              value={form.customerInfo}
              rows={2}
              placeholder="选填，如地址 / 联系人 / 电话"
              onChange={(e) => updateForm({ customerInfo: e.target.value })}
            />
          </FormField>
          <FormField
            label="附件"
            full
            hint="支持图片 / Word / Excel / PDF，可上传多个，查看时可在线预览 / 下载；「从文件库选择」引用企业文件库文件，「上传本地文件」自定义上传"
            annTarget="carbon.form.attachments"
          >
            <VoucherUpload
              value={form.attachments}
              uploadText="上传本地文件"
              onPickFromLibrary={() => setLibraryPickerOpen(true)}
              onChange={(attachments) => updateForm({ attachments })}
            />
          </FormField>
        </div>
      )}
      </Modal>
      <LibraryPickerModal
        open={libraryPickerOpen}
        files={libraryFiles}
        selectedIds={librarySelectedIds}
        onClose={() => setLibraryPickerOpen(false)}
        onConfirm={applyLibrarySelection}
      />
    </>
  )
}

/** 文件库选择弹窗：列出企业文件库文件，支持搜索 + 多选，确认后回显到附件列表 */
function LibraryPickerModal({
  open,
  files,
  selectedIds,
  onClose,
  onConfirm,
}: {
  open: boolean
  files: LibraryFileItem[]
  selectedIds: string[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [picked, setPicked] = useState<string[]>(selectedIds)

  useEffect(() => {
    if (open) setPicked(selectedIds)
  }, [open, selectedIds])

  const filtered = files.filter((f) => {
    const k = keyword.trim().toLowerCase()
    if (!k) return true
    return f.name.toLowerCase().includes(k) || f.code.toLowerCase().includes(k)
  })

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const allChecked = filtered.length > 0 && filtered.every((f) => picked.includes(f.id))
  const toggleAll = () => {
    if (allChecked) {
      const remove = new Set(filtered.map((f) => f.id))
      setPicked((prev) => prev.filter((id) => !remove.has(id)))
    } else {
      setPicked((prev) => Array.from(new Set([...prev, ...filtered.map((f) => f.id)])))
    }
  }

  return (
    <Modal
      open={open}
      title="从文件库选择"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm(picked)
              onClose()
            }}
          >
            确定（已选 {picked.length}）
          </Button>
        </>
      }
    >
      <div className="lib-picker">
        <Input value={keyword} placeholder="搜索文件名 / 编码" onChange={(e) => setKeyword(e.target.value)} />
        <div className="lib-picker-list">
          {filtered.length === 0 ? (
            <div className="empty empty-sm">无匹配文件</div>
          ) : (
            <>
              <label className="lib-row lib-row-head">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                <span>全选当前列表（{filtered.length}）</span>
              </label>
              {filtered.map((f) => {
                const v = f.versions.find((x) => x.versionNo === f.currentVersion) ?? f.versions[f.versions.length - 1]
                return (
                  <label className="lib-row" key={f.id}>
                    <input type="checkbox" checked={picked.includes(f.id)} onChange={() => toggle(f.id)} />
                    <span className="lib-name" title={f.name}>{f.name}</span>
                    <span className="lib-meta nowrap">{formatSize(v?.size ?? 0)}</span>
                  </label>
                )
              })}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
