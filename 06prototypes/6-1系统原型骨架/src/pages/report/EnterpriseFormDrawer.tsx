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

/**
 * 企业信息 新增 / 编辑抽屉（报告管理 · 企业信息维护）。
 * 企业名称必填（报告封面 / 基本信息表 / 表 1 的报告主体），其余字段选填。
 */
export default function EnterpriseFormDrawer({ open, mode, record, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<EnterprisePayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
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

  const setField = (key: keyof EnterprisePayload) => (value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: String(value ?? '') }))

  const handleSubmit = async () => {
    if (!form.companyName.trim()) {
      setError('请填写企业名称')
      return
    }
    setSaving(true)
    try {
      await onSubmit({ ...form, companyName: form.companyName.trim() })
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
          tips={error || '报告封面 / 基本信息表 / 表 1 的报告主体名称'}
        >
          <Input value={form.companyName} onChange={setField('companyName')} placeholder="请输入" clearable />
        </Form.FormItem>
        <Form.FormItem label="统一社会信用代码">
          <Input value={form.unifiedSocialCreditCode} onChange={setField('unifiedSocialCreditCode')} placeholder="请输入" clearable />
        </Form.FormItem>
        <Form.FormItem label="法定代表人">
          <Input value={form.legalPerson} onChange={setField('legalPerson')} placeholder="请输入" clearable />
        </Form.FormItem>
        <Form.FormItem label="联系方式">
          <Input value={form.contactPhone} onChange={setField('contactPhone')} placeholder="请输入" clearable />
        </Form.FormItem>
        <Form.FormItem label="联系人">
          <Input value={form.contactPerson} onChange={setField('contactPerson')} placeholder="请输入" clearable />
        </Form.FormItem>
        <Form.FormItem label="所属行业">
          <Input value={form.industry} onChange={setField('industry')} placeholder="请输入" clearable />
        </Form.FormItem>
        <Form.FormItem label="企业地址">
          <Textarea
            value={form.companyAddress}
            onChange={setField('companyAddress')}
            autosize={{ minRows: 1, maxRows: 3 }}
            placeholder="请输入"
          />
        </Form.FormItem>
        <Form.FormItem label="备注">
          <Textarea
            value={form.remark}
            onChange={setField('remark')}
            autosize={{ minRows: 2, maxRows: 5 }}
            placeholder="请输入"
          />
        </Form.FormItem>
      </Form>
    </Drawer>
  )
}
