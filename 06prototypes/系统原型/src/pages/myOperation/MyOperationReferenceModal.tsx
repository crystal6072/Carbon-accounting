import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { copyPlatformOperations, fetchOperations } from '@/mock'
import type { OperationItem } from '@/types'
import { operationTypeText, operationTypeTone } from '@/pages/operation/operationMeta'
import '@/pages/operation/OperationPage.css'
import '@/pages/myProcess/MyProcessPage.css'

const PAGE_SIZE = 6

interface MyOperationReferenceModalProps {
  open: boolean
  onClose: () => void
  /** 复制完成后刷新「我的工序库」列表 */
  onCopied: () => void
}

/**
 * 前台「我的工序库」→ 从平台工序库选择（批量）：
 * 勾选多道平台工序后**直接复制**到本组织工序库，不进入表单；
 * 复制项为可编辑副本（含投入 / 产出项），在列表点击「编辑」才进入编辑页。
 * 同一工序可反复选择复制，每次生成独立副本；复制后弹窗保持打开，可继续选择。
 */
export default function MyOperationReferenceModal({ open, onClose, onCopied }: MyOperationReferenceModalProps) {
  const toast = useToast()
  const [list, setList] = useState<OperationItem[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 仅启用中的平台工序可被复制引用；同一工序可反复复制，不做去重锁定
      setList((await fetchOperations()).filter((item) => item.useStatus === 'enabled'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setKeyword('')
    setPage(1)
    setSelectedKeys([])
    void load()
  }, [open, load])

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    if (!text) return list
    return list.filter(
      (item) =>
        item.code.toLowerCase().includes(text) ||
        item.name.toLowerCase().includes(text) ||
        operationTypeText[item.type].toLowerCase().includes(text),
    )
  }, [list, keyword])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<OperationItem>[] = [
    {
      key: 'code',
      title: '工序编码',
      width: 170,
      render: (row) => <span className="mono nowrap">{row.code}</span>,
    },
    {
      key: 'name',
      title: '工序名称',
      width: 220,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'type',
      title: '工序类型',
      width: 140,
      render: (row) => <Tag tone={operationTypeTone[row.type]}>{operationTypeText[row.type]}</Tag>,
    },
  ]

  const handleCopy = async () => {
    if (selectedKeys.length === 0 || submitting) return
    setSubmitting(true)
    try {
      const result = await copyPlatformOperations(selectedKeys)
      const message = result.skipped
        ? `已复制 ${result.copied} 道工序，跳过 ${result.skipped} 道（不可用），可继续选择`
        : `已复制 ${result.copied} 道工序，可继续选择`
      toast(message)
      // 复制后清空勾选但保持弹窗打开：同一工序仍可继续选择、再次复制
      setSelectedKeys([])
      onCopied()
    } catch (error) {
      toast(error instanceof Error ? error.message : '复制失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="平台工序库"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>关闭</Button>
          <Button
            variant="primary"
            data-ann-target="my-operation.copy"
            disabled={submitting || selectedKeys.length === 0}
            onClick={handleCopy}
          >
            {submitting ? '复制中…' : '确定'}
          </Button>
        </>
      }
    >
      <div className="view-block" data-ann-target="my-operation.reference">
        <div className="ref-query">
          <Input
            className="ref-query-input"
            value={keyword}
            placeholder="搜索工序编码 / 名称 / 类型"
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
          <span className="toolbar-tip" data-ann-target="my-operation.selection">
            已选 {selectedKeys.length} 道
          </span>
          {keyword && (
            <Button className="ref-query-clear" onClick={() => setKeyword('')}>
              清空
            </Button>
          )}
        </div>
        <div className="operation-table-wrap">
          <Table
            columns={columns}
            data={pagedRows}
            rowKey={(row) => row.id}
            loading={loading}
            rowSelection={{
              selectedKeys,
              onChange: setSelectedKeys,
            }}
          />
        </div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </Modal>
  )
}
