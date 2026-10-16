import ProcessFormPage from '@/pages/process/ProcessFormPage'

/**
 * 我的工艺库 · 新增 / 编辑工艺流程。
 * **直接复用后台「工艺流程」新增 / 编辑表单**（`scope="frontend"`），
 * 保证「新增工艺流程」操作与后台完全一致（基本信息 + 工序链画布 / 列表装配）。
 */
export default function MyProcessFormPage() {
  return <ProcessFormPage scope="frontend" />
}
