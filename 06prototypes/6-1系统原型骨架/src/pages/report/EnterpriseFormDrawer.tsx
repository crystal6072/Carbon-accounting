import { useEffect, useState } from 'react'
import { Button, Drawer, Form, Input, MessagePlugin, Space, Textarea } from 'tdesign-react'
import type { EnterprisePayload, EnterpriseRecord } from '@/types/enterprise'

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

/**
 * 企业信息 新增 / 编辑抽屉（报告管理 · 企业信息维护）。
 * 除备注外均为必填；企业名称将带入报告封面 / 基本信息表 / 表 1 的报告主体名称。
 */
export default function EnterpriseFormDrawer({ open, mode, record, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<EnterprisePayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof EnterprisePayload, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      record
        ? {
            companyName: record.companyName,
            unifiedSocialCreditCode: record.unifiedSocialCreditCode,
            legalPerson: record.legalPerson,
            companyAddress: record.companyAddress,
            contactPhone: record.contactPhone,
            contactPerson: record.contactPerson,
            industry: record.industry,
            remark: record.remark,
          }
        : EMPTY_FORM,
    )
  }, [open, record])

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
      <Form labelWidth={112}>
        <Form.FormItem
          label="企业名称"
          requiredMark
          tips={errors.companyName || '报告封面 / 基本信息表 / 表 1 的报告主体名称'}
        >
          <Input value={form.companyName} onChange={setField('companyName')} placeholder="请输入" clearable data-ann-target="ent.form.companyName" />
        </Form.FormItem>
        <Form.FormItem label="统一社会信用代码" requiredMark tips={errors.unifiedSocialCreditCode}>
          <Input value={form.unifiedSocialCreditCode} onChange={setField('unifiedSocialCreditCode')} placeholder="请输入" clearable data-ann-target="ent.form.creditCode" />
        </Form.FormItem>
        <Form.FormItem label="法定代表人" requiredMark tips={errors.legalPerson}>
          <Input value={form.legalPerson} onChange={setField('legalPerson')} placeholder="请输入" clearable data-ann-target="ent.form.legalPerson" />
        </Form.FormItem>
        <Form.FormItem label="联系方式" requiredMark tips={errors.contactPhone}>
          <Input value={form.contactPhone} onChange={setField('contactPhone')} placeholder="请输入" clearable data-ann-target="ent.form.contactPhone" />
        </Form.FormItem>
        <Form.FormItem label="联系人" requiredMark tips={errors.contactPerson}>
          <Input value={form.contactPerson} onChange={setField('contactPerson')} placeholder="请输入" clearable data-ann-target="ent.form.contactPerson" />
        </Form.FormItem>
        <Form.FormItem label="所属行业" requiredMark tips={errors.industry}>
          <Input value={form.industry} onChange={setField('industry')} placeholder="请输入" clearable data-ann-target="ent.form.industry" />
        </Form.FormItem>
        <Form.FormItem label="企业地址" requiredMark tips={errors.companyAddress}>
          <Textarea
            value={form.companyAddress}
            onChange={setField('companyAddress')}
            autosize={{ minRows: 1, maxRows: 3 }}
            placeholder="请输入"
            data-ann-target="ent.form.companyAddress"
          />
        </Form.FormItem>
        <Form.FormItem label="备注" tips="选填">
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
