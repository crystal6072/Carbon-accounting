import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Table, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  fetchMyFactorLibraries,
  fetchMyFactors,
  fetchPublishedLibraries,
  fetchPublishedLibraryDetail,
} from '@/mock'
import type { FactorCalibers, FactorItem } from '@/types'
import FactorInfoPanel from '../factor/FactorInfoPanel'
import '@/pages/pcf/PcfPage.css'

/** 选中因子回传结构（写入模型数据项 / PCF 数据项的因子快照字段） */
export interface PickedFactor {
  id: string
  name: string
  value: number | null
  numeratorUnit: string
  denominatorUnit: string
  calibers: FactorCalibers | null
}

interface FactorPickerModalProps {
  open: boolean
  /** 已匹配因子 id（打开时回显选中） */
  currentFactorId?: string
  onClose: () => void
  onConfirm: (factor: PickedFactor) => void
}

interface PickerLibrary {
  id: string
  name: string
  group: '背景数据库' | '我的因子库'
}

/**
 * 排放因子选择弹窗（「引用因子」，自 PCF 步骤② 抽出的共用组件）：
 * 左侧「背景数据库 / 我的因子库」，右侧因子表单选 + 查看详情，确认后回传因子快照。
 */
export default function FactorPickerModal({ open, currentFactorId = '', onClose, onConfirm }: FactorPickerModalProps) {
  const toast = useToast()

  const [libraries, setLibraries] = useState<PickerLibrary[]>([])
  const [libId, setLibId] = useState('')
  const [libFactors, setLibFactors] = useState<FactorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pickedId, setPickedId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [viewFactorId, setViewFactorId] = useState('')

  const loadFactors = useCallback(async (key: string) => {
    if (!key) {
      setLibFactors([])
      return
    }
    setLoading(true)
    try {
      if (key.startsWith('MY:')) setLibFactors(await fetchMyFactors(key.slice(3)))
      else setLibFactors((await fetchPublishedLibraryDetail(key.slice(4))).factors)
    } catch {
      setLibFactors([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setKeyword('')
    setViewFactorId('')
    setPickedId(currentFactorId)
    setLoading(true)
    void (async () => {
      try {
        const [published, mine] = await Promise.all([fetchPublishedLibraries(), fetchMyFactorLibraries()])
        const next: PickerLibrary[] = [
          ...published.map((lib) => ({ id: `LIB:${lib.id}`, name: lib.name, group: '背景数据库' as const })),
          ...mine.map((lib) => ({ id: `MY:${lib.id}`, name: lib.name, group: '我的因子库' as const })),
        ]
        setLibraries(next)
        const first = next[0]?.id ?? ''
        setLibId(first)
        await loadFactors(first)
      } catch (error) {
        toast(error instanceof Error ? error.message : '因子库加载失败', 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [open, currentFactorId, loadFactors, toast])

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return libFactors
    return libFactors.filter((item) => item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw))
  }, [libFactors, keyword])

  const viewFactor = libFactors.find((item) => item.id === viewFactorId) ?? null

  const columns: Column<FactorItem>[] = [
    {
      key: 'pick',
      title: '',
      width: 48,
      render: (row) => (
        <input
          type="radio"
          name="model-factor-pick"
          checked={pickedId === row.id}
          onChange={() => setPickedId(row.id)}
        />
      ),
    },
    { key: 'name', title: '因子名称', width: 240 },
    { key: 'value', title: '因子值', width: 120 },
    { key: 'unit', title: '因子单位', render: (row) => `${row.numeratorUnit}/${row.denominatorUnit}` },
    {
      key: 'view',
      title: '操作',
      width: 90,
      render: (row) => (
        <button
          type="button"
          className="link"
          onClick={(e) => {
            e.stopPropagation()
            setViewFactorId(row.id)
          }}
        >
          查看
        </button>
      ),
    },
  ]

  const handleConfirm = () => {
    const factor = libFactors.find((item) => item.id === pickedId)
    if (!factor) {
      toast('请选择一条排放因子', 'error')
      return
    }
    onConfirm({
      id: factor.id,
      name: factor.name,
      value: factor.value,
      numeratorUnit: factor.numeratorUnit,
      denominatorUnit: factor.denominatorUnit,
      calibers: factor.calibers ?? null,
    })
  }

  return (
    <>
      <Modal
        open={open}
        title="选择排放因子"
        size="xl"
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>取消</Button>
            <Button variant="primary" disabled={!pickedId} onClick={handleConfirm}>
              确认选择
            </Button>
          </>
        }
      >
        <div className="pcf-factor-picker-layout">
          <div className="pcf-lib-list">
            {libraries.length === 0 && <div className="pcf-lib-group">暂无因子库</div>}
            {(['背景数据库', '我的因子库'] as const).map((group) => {
              const groupItems = libraries.filter((item) => item.group === group)
              if (groupItems.length === 0) return null
              return (
                <div key={group}>
                  <div className="pcf-lib-group">{group}</div>
                  {groupItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={['pcf-lib-item', libId === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        setLibId(item.id)
                        void loadFactors(item.id)
                      }}
                    >
                      <span className="cell-ellipsis">{item.name}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          <div>
            <div className="pcf-picker-query">
              <Input
                value={keyword}
                placeholder="输入因子名称 / 因子编码搜索"
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="pcf-table-wrap pcf-factor-table">
              <Table
                columns={columns}
                data={rows}
                rowKey={(row) => row.id}
                loading={loading}
                emptyText="该库暂无因子"
                onRowClick={(row) => setPickedId(row.id)}
                rowClassName={(row) => (pickedId === row.id ? 'is-picked' : '')}
              />
            </div>
          </div>
        </div>
        <div className="pcf-factor-tip">
          左侧选择「背景数据库」或「我的因子库」，右侧单选因子；点击「查看」可查看因子详情。确认后因子将写入所选数据项。
        </div>
      </Modal>

      <Modal
        open={!!viewFactor}
        title="因子详情"
        size="lg"
        onClose={() => setViewFactorId('')}
        footer={<Button onClick={() => setViewFactorId('')}>关闭</Button>}
      >
        {viewFactor && <FactorInfoPanel factor={viewFactor} />}
      </Modal>
    </>
  )
}
