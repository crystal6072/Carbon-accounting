import { useEffect, useMemo, useState } from 'react'
import { Button, Drawer, Form, Input, MessagePlugin, Space, Textarea } from 'tdesign-react'
import type { EnterprisePayload, EnterpriseRecord } from '@/types/enterprise'
import { useAuth } from '@/context/AuthContext'
import { CURRENT_TENANT_ID } from '@/mock/member'
import { currentAccountEnterpriseDefaults } from '@/mock/enterprise'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  record: EnterpriseRecord | null
  onClose: () => void
  onSubmit: (payload: EnterprisePayload) => Promise<void> | void
}

const EMPTY_FORM: EnterprisePayload = {
  companyName: '',
  unifiedSocialCreditCode: '',
  legalPerson: '',
  companyAddress: '',
  contactPhone: '',
  contactPerson: '',
  industry: '',
  remark: '',
}

/** 必填字段（备注选填）。 */
const REQUIRED_FIELDS: { key: keyof EnterprisePayload; label: string }[] = [
  { key: 'companyName', label: '企业名称' },
  { key: 'unifiedSocialCreditCode', label: '统一社会信用代码' },
  { key: 'legalPerson', label: '法定代表人' },
  { key: 'contactPhone', label: '联系方式' },
  { key: 'contactPerson', label: '联系人' },
  { key: 'industry', label: '所属行业' },
  { key: 'companyAddress', label: '企业地址' },
]

/** 记录 → 表单值：编辑时逐字段回填 */
function toPayload(record: EnterpriseRecord): EnterprisePayload {
  return {
    companyName: record.companyName,
    unifiedSocialCreditCode: record.unifiedSocialCreditCode,
    legalPerson: record.legalPerson,
    companyAddress: record.companyAddress,
    contactPhone: record.contactPhone,
    contactPerson: record.contactPerson,
    industry: record.industry,
    remark: record.remark,
  }
}

/**
 * 企业信息 新增 / 编辑抽屉（报告管理 · 企业信息维护）。
 * 除备注外均为必填；企业名称将带入报告封面 / 基本信息表 / 表 1 的报告主体名称。
 *
 * - 新增：默认继承「当前账号所属企业」（会话租户的租户档案）信息，全部字段仍可编辑；
 * - 编辑：回填列表所选记录的全部字段（含列表未展示的地址 / 行业 / 备注）。
 *
 * 注意：tdesign 的 FormItem 会用自身 formValue 覆盖子组件的 value，
 * 因此回填必须同时通过 Form 实例的 setFieldsValue 写入，仅 setForm 不会显示。
 */
export default function EnterpriseFormDrawer({ open, mode, record, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<EnterprisePayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof EnterprisePayload, string>>>({})
  const { session } = useAuth()
  const [formInstance] = Form.useForm()

  /** 打开表单时读取一次当前账号所属企业档案；切换租户 / 档案更新后重新打开即生效 */
  const defaults = useMemo(
    () => currentAccountEnterpriseDefaults(session?.tenantId || CURRENT_TENANT_ID),
    [session?.tenantId],
  )

  useEffect(() => {
    if (!open) return
    setErrors({})
    const initial = mode === 'edit' && record ? toPayload(record) : defaults.payload
    setForm(initial)
    formInstance.setFieldsValue(initial)
  }, [open, mode, record, defaults, formInstance])

  const setField = (key: keyof EnterprisePayload) => (value: unknown) => {
    const next = String(value ?? '')
    setForm((prev) => ({ ...prev, [key]: next }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const handleSubmit = async () => {
    const nextErrors: Partial<Record<keyof EnterprisePayload, string>> = {}
    REQUIRED_FIELDS.forEach(({ key, label }) => {
      if (!form[key].trim()) nextErrors[key] = `请填写${label}`
    })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        ...form,
        companyName: form.companyName.trim(),
        unifiedSocialCreditCode: form.unifiedSocialCreditCode.trim(),
        legalPerson: form.legalPerson.trim(),
        contactPhone: form.contactPhone.trim(),
        contactPerson: form.contactPerson.trim(),
        industry: form.industry.trim(),
        companyAddress: form.companyAddress.trim(),
      })
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      size="560px"
      header={mode === 'create' ? '新增企业' : `编辑企业 · ${record?.companyName ?? ''}`}
      visible={open}
      onClose={onClose}
      footer={
        <Space size="small">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button theme="primary" loading={saving} onClick={() => void handleSubmit()}>
            {mode === 'create' ? '新增' : '保存'}
          </Button>
        </Space>
      }
    >
      <Form form={formInstance} labelWidth={112} initialData={EMPTY_FORM}>
        <Form.FormItem
          name="companyName"
          label="企业名称"
          requiredMark
          tips={errors.companyName || '报告封面 / 基本信息表 / 表 1 的报告主体名称'}
        >
          <Input value={form.companyName} onChange={setField('companyName')} placeholder="请输入" clearable data-ann-target="ent.form.companyName" />
        </Form.FormItem>
        <Form.FormItem name="unifiedSocialCreditCode" label="统一社会信用代码" requiredMark tips={errors.unifiedSocialCreditCode}>
          <Input value={form.unifiedSocialCreditCode} onChange={setField('unifiedSocialCreditCode')} placeholder="请输入" clearable data-ann-target="ent.form.creditCode" />
        </Form.FormItem>
        <Form.FormItem name="legalPerson" label="法定代表人" requiredMark tips={errors.legalPerson}>
          <Input value={form.legalPerson} onChange={setField('legalPerson')} placeholder="请输入" clearable data-ann-target="ent.form.legalPerson" />
        </Form.FormItem>
        <Form.FormItem name="contactPhone" label="联系方式" requiredMark tips={errors.contactPhone}>
          <Input value={form.contactPhone} onChange={setField('contactPhone')} placeholder="请输入" clearable data-ann-target="ent.form.contactPhone" />
        </Form.FormItem>
        <Form.FormItem name="contactPerson" label="联系人" requiredMark tips={errors.contactPerson}>
          <Input value={form.contactPerson} onChange={setField('contactPerson')} placeholder="请输入" clearable data-ann-target="ent.form.contactPerson" />
        </Form.FormItem>
        <Form.FormItem name="industry" label="所属行业" requiredMark tips={errors.industry}>
          <Input value={form.industry} onChange={setField('industry')} placeholder="请输入" clearable data-ann-target="ent.form.industry" />
        </Form.FormItem>
        <Form.FormItem name="companyAddress" label="企业地址" requiredMark tips={errors.companyAddress}>
          <Textarea
            value={form.companyAddress}
            onChange={setField('companyAddress')}
            autosize={{ minRows: 1, maxRows: 3 }}
            placeholder="请输入"
            data-ann-target="ent.form.companyAddress"
          />
        </Form.FormItem>
        <Form.FormItem name="remark" label="备注" tips="选填">
          <Textarea
            value={form.remark}
            onChange={setField('remark')}
            autosize={{ minRows: 2, maxRows: 5 }}
            placeholder="请输入"
            data-ann-target="ent.form.remark"
          />
        </Form.FormItem>
      </Form>
    </Drawer>
  )
}
