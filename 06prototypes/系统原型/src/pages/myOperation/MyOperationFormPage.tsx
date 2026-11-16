import OperationFormPage from '@/pages/operation/OperationFormPage'

/**
 * 我的工序库 · 新增 / 编辑工序。
 * **直接复用后台「工序」新增 / 编辑表单**（`scope="frontend"`），
 * 保证「自定义工序」操作与后台完全一致（基本信息 + 投入项 / 产出项两张子表）。
 * 从平台工序库批量复制的工序也在此编辑，编辑不影响平台源头。
 */
export default function MyOperationFormPage() {
  return <OperationFormPage scope="frontend" />
}
