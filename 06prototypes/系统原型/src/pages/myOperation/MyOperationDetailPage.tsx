import OperationDetailPage from '@/pages/operation/OperationDetailPage'

/**
 * 我的工序库 · 工序详情。
 * 复用后台「工序」详情组件（`scope="frontend"`）：
 * 自定义工序与从平台复制而来的副本均可查看 / 编辑 / 启停 / 删除。
 */
export default function MyOperationDetailPage() {
  return <OperationDetailPage scope="frontend" />
}
