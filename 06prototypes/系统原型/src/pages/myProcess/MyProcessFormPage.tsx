import ProcessFormPage from '@/pages/process/ProcessFormPage'

/**
 * 我的工艺库 · 新增 / 编辑工艺流程。
 * **直接复用后台「工艺流程」新增 / 编辑表单**（`scope="frontend"`），
 * 保证「自定义工艺」操作与后台完全一致（基本信息 + 工序链画布 / 列表装配）；
 * 「从平台工艺库选择」通过 `?ref=` 带入平台工艺数据，复制为可编辑副本。
 */
export default function MyProcessFormPage() {
  return <ProcessFormPage scope="frontend" />
}
