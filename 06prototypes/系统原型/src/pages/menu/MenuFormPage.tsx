import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, FormField, Input, PageHeader, Select, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { createMenu, fetchMenu, fetchMenus, updateMenu } from '@/mock/menu'
import type { MenuFunction } from '@/types'
import './MenuPage.css'

interface FormState {
  name: string
  route: string
  parentId: string | null
  sort: number
}

/** 菜单管理 · 新增 / 编辑：配置功能名称 / 路由 / 排序 + 上级菜单 + 启停 */
export default function MenuFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const isEdit = !!id
  /** 从树形配置的「新增下级」进入时，预设上级菜单 */
  const presetParentId = searchParams.get('parentId')

  const [menu, setMenu] = useState<MenuFunction | null>(null)
  const [allMenus, setAllMenus] = useState<MenuFunction[]>([])
  const [form, setForm] = useState<FormState>({
    name: '',
    route: '',
    parentId: presetParentId,
    sort: 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const menus = await fetchMenus()
      setAllMenus(menus)
      if (id) {
        const target = await fetchMenu(id)
        setMenu(target)
        setForm({
          name: target.name,
          route: target.route,
          parentId: target.parentId,
          sort: target.sort,
        })
      } else {
        // 新增：默认排在同级末尾
        const siblings = menus.filter((item) => item.parentId === presetParentId)
        setForm((prev) => ({ ...prev, parentId: presetParentId, sort: siblings.length + 1 }))
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, presetParentId, toast])

  useEffect(() => {
    void load()
  }, [load])

  // 上级菜单候选项：排除自身及其子孙（避免成环）
  const parentOptions: SelectOption[] = useMemo(() => {
    const blocked = new Set<string>()
    if (id) {
      const collect = (pid: string) => {
        blocked.add(pid)
        allMenus.filter((m) => m.parentId === pid).forEach((child) => collect(child.id))
      }
      collect(id)
    }
    return [
      { label: '一级菜单（无上级）', value: '' },
      ...allMenus
        .filter((m) => !blocked.has(m.id))
        .sort((a, b) => a.sort - b.sort)
        .map((m) => ({ label: `${m.name}（${m.route || '分组'}）`, value: m.id })),
    ]
  }, [allMenus, id])

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = '功能名称必填'
    else if (form.name.trim().length > 50) next.name = '功能名称最长 50 字符'
    const route = form.route.trim()
    if (route && !route.startsWith('/')) next.route = '路由需以 / 开头'
    if (!Number.isInteger(form.sort) || form.sort < 0) next.sort = '排序须为不小于 0 的整数'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      route: form.route.trim(),
      parentId: form.parentId,
      sort: form.sort,
    }
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateMenu(id, payload)
        toast('保存成功')
      } else {
        await createMenu(payload)
        toast('新增成功')
      }
      navigate('/system/menu')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '菜单管理']} title={isEdit ? '编辑菜单' : '新增菜单'} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  if (isEdit && !menu) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '菜单管理']} title="编辑菜单" />
        <div className="card">
          <div className="empty">菜单不存在或已被删除</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '菜单管理', isEdit ? menu!.name : '新增']}
        title={isEdit ? `编辑菜单 · ${menu!.name}` : presetParentId ? '新增下级菜单' : '新增一级菜单'}
        description="配置功能名称、路由、排序，并指定上级菜单（构成菜单树）。"
        actions={
          <>
            <Button onClick={() => navigate('/system/menu')}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
              保存
            </Button>
          </>
        }
      />

      <div className="fn-detail-stack">
        <section className="card">
          <div className="role-section-header">
            <span className="role-section-title">菜单配置</span>
            <span className="toolbar-tip">功能名称 / 路由 / 排序为核心配置</span>
          </div>
          <div className="role-section-body">
            <div className="form-grid">
              <FormField label="功能名称" required error={errors.name}>
                <Input
                  data-ann-target="menu.form.name"
                  value={form.name}
                  invalid={!!errors.name}
                  placeholder="请输入功能名称"
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </FormField>
              <FormField label="路由" error={errors.route} hint="前端路由路径，如 /pcf/project；留空即为菜单分组（仅承载下级菜单）">
                <Input
                  data-ann-target="menu.form.route"
                  value={form.route}
                  invalid={!!errors.route}
                  placeholder="留空则为菜单分组"
                  onChange={(e) => setForm((prev) => ({ ...prev, route: e.target.value }))}
                />
              </FormField>
              <FormField label="上级菜单" hint="选择后成为其下级菜单；不选则为一级菜单">
                <Select
                  data-ann-target="menu.form.parent"
                  value={form.parentId ?? ''}
                  placeholder="一级菜单（无上级）"
                  options={parentOptions}
                  onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value || null }))}
                />
              </FormField>
              <FormField label="排序" required error={errors.sort} hint="同级内从小到大">
                <Input
                  data-ann-target="menu.form.sort"
                  value={String(form.sort)}
                  invalid={!!errors.sort}
                  onChange={(e) => setForm((prev) => ({ ...prev, sort: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                />
              </FormField>
            </div>
          </div>
          <div className="role-section-tip">
            保存后菜单目录按新配置更新；角色勾选树中的菜单同步刷新。
          </div>
          <div className="fn-form-footer" data-ann-target="menu.form.footer">
            <Button onClick={() => navigate('/system/menu')}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
              保存
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
