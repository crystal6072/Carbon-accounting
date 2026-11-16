import type { Annotation } from './types'

/**
 * 数据字典（后台 · 组织与权限）功能批注数据（编号 DD-01 ~ DD-11）。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 * 说明：本模块暂无独立 PRD / 字段清单，批注依据为原型页内描述与交互行为（《数据字典功能批注》V1.0）。
 */
export const dictAnnotations: Annotation[] = [
  {
    id: 'ann-dd-flow',
    title: '整体流程',
    code: 'DD-01',
    blocks: [
      { type: 'paragraph', text: '数据字典是平台级枚举口径的统一维护入口：左侧维护「字典类型」，右侧维护该类型下的「字典项」；「系统边界」「租户类型」「物料类型」「能源类型」「核算数据类型」等字典分别被核算边界、租户开户、物料库、能源库、工序投入产出流与碳足迹核算数据录入等业务引用。' },
      { type: 'heading', text: '主流程' },
      {
        type: 'steps',
        items: [
          '左侧选择字典类型（含内置类型，标「内置」）',
          '右侧按编码 / 名称查询该类型下的字典项',
          '「新增字典项」维护取值；「编辑 / 禁用 / 启用 / 删除」管理状态',
          '需要时「新增类型」扩展新的字典类型',
          '禁用 / 删除经二次确认后生效',
        ],
      },
    ],
    source: '《数据字典功能批注》V1.0 §1.1 DD-01',
    operation: '整体流程',
    buttonText: '数据字典（功能标题）',
    selector: 'dict.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dict.page.global', label: '数据字典', reason: '页标题' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dd-type-list',
    title: '字典类型选择',
    code: 'DD-03',
    blocks: [
      { type: 'heading', text: '类型区' },
      { type: 'paragraph', text: '左侧列出全部字典类型，内置类型标「内置」标签；点击类型后右侧切换为该类型下的字典项列表。' },
      { type: 'heading', text: '新增类型' },
      { type: 'paragraph', text: '点击「新增类型」打开抽屉表单，录入字典类型编码 / 名称 / 说明；编码需全局唯一、大写字母开头。' },
    ],
    source: '《数据字典功能批注》V1.0 §1.2 DD-03',
    operation: '选择 / 新增类型',
    buttonText: '字典类型区',
    selector: 'dict.type.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dict.type.list', label: '字典类型列表', reason: '左侧类型列表' },
      { selector: 'dict.type.add', label: '新增类型', reason: '新增字典类型按钮' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-dd-query',
    title: '字典项查询与重置',
    code: 'DD-05',
    blocks: [
      { type: 'heading', text: '查询项' },
      { type: 'list', items: ['字典项编码：精确 / 前缀匹配。', '字典项名称：模糊匹配。'] },
      { type: 'heading', text: '过滤规则' },
      { type: 'list', items: ['编码与名称同时生效（叠加过滤）；点击「搜索」执行，点击「重置」清空条件。', '查询仅作用于当前选中的字典类型。'] },
    ],
    source: '《数据字典功能批注》V1.0 §1.3 DD-05',
    operation: '查询 / 重置',
    buttonText: '查询区',
    selector: 'dict.query.bar',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dict.query.bar', label: '查询区', reason: '查询条件区域' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-dd-item-list',
    title: '字典项列表与操作',
    code: 'DD-06',
    blocks: [
      { type: 'heading', text: '展示列' },
      { type: 'list', items: ['字典项编码、字典项名称、排序号、状态、说明、操作。'] },
      { type: 'heading', text: '操作' },
      {
        type: 'list',
        items: [
          '编辑：修改名称 / 排序号 / 说明 / 状态。',
          '禁用 / 启用：切换字典项可用状态（经二次确认）。',
          '删除：移除字典项（经二次确认）。',
        ],
      },
      { type: 'callout', text: '字典项编码在同一类型下唯一，一经被业务引用建议不再修改，以免破坏引用关系。' },
    ],
    source: '《数据字典功能批注》V1.0 §1.3 DD-06',
    operation: '字典项列表操作',
    buttonText: '字典项表格',
    selector: 'dict.item.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dict.item.list', label: '字典项表格', reason: '字典项列表区域' },
      { selector: 'dict.item.add', label: '新增字典项', reason: '新增字典项按钮' },
      { selector: 'dict.item.edit', label: '编辑', reason: '操作列「编辑」' },
      { selector: 'dict.item.toggle', label: '禁用 / 启用', reason: '操作列「禁用 / 启用」' },
      { selector: 'dict.item.delete', label: '删除', reason: '操作列「删除」' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dd-item-form',
    title: '新增 / 编辑字典项',
    code: 'DD-07',
    blocks: [
      { type: 'heading', text: '字段' },
      {
        type: 'list',
        items: [
          '所属字典类型：只读，显示当前类型（编码 + 名称）。',
          '字典项编码：必填，同类型下唯一，一经使用建议不再修改。',
          '字典项名称：必填，展示文案。',
          '排序号：必填，数值越小越靠前。',
          '说明：选填，记录口径 / 英文名等。',
        ],
      },
      { type: 'heading', text: '校验与保存' },
      { type: 'paragraph', text: '编码 / 名称 / 排序号必填校验通过后保存；保存中按钮禁用防重复提交。' },
    ],
    source: '《数据字典功能批注》V1.0 §1.4 DD-07',
    operation: '新增 / 编辑字典项',
    buttonText: '字典项表单',
    selector: 'dict.item.form',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dict.item.form', label: '字典项表单', reason: '字典项弹窗表单' },
      { selector: 'dict.item.form.code', label: '字典项编码', reason: '表单字段' },
      { selector: 'dict.item.form.label', label: '字典项名称', reason: '表单字段' },
      { selector: 'dict.item.form.sort', label: '排序号', reason: '表单字段' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dd-type-form',
    title: '新增字典类型',
    code: 'DD-08',
    blocks: [
      { type: 'heading', text: '字段' },
      {
        type: 'list',
        items: [
          '字典类型编码：必填，全局唯一，大写字母开头、仅含大写字母 / 数字 / 下划线（输入自动转大写）。',
          '字典类型名称：必填，展示名。',
          '说明：选填，描述取值口径与引用方。',
        ],
      },
      { type: 'heading', text: '新增后行为' },
      { type: 'paragraph', text: '保存后该类型出现在左侧类型列表；内置类型（如 system_boundary）由系统预置、用户不可新增。' },
    ],
    source: '《数据字典功能批注》V1.0 §1.4 DD-08',
    operation: '新增字典类型',
    buttonText: '字典类型表单',
    selector: 'dict.type.form',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dict.type.form', label: '字典类型表单', reason: '类型弹窗表单' },
      { selector: 'dict.type.form.code', label: '字典类型编码', reason: '表单字段' },
      { selector: 'dict.type.form.name', label: '字典类型名称', reason: '表单字段' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-dd-confirm',
    title: '删除 / 禁用二次确认',
    code: 'DD-09',
    blocks: [
      { type: 'heading', text: '确认弹窗' },
      { type: 'paragraph', text: '删除 / 禁用 / 启用操作前弹出二次确认：展示目标字典项的名称与编码，确认后方可执行，取消则不改动。' },
      { type: 'callout', text: '删除为物理删除；若该字典项已被业务引用（如系统边界、租户类型、核算数据类型），删除可能破坏引用，操作前需评估。' },
    ],
    source: '《数据字典功能批注》V1.0 §1.5 DD-09',
    operation: '删除 / 禁用确认',
    buttonText: '确认弹窗',
    selector: 'dict.confirm.ok',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dict.confirm.ok', label: '确认', reason: '确认弹窗确认按钮' },
      { selector: 'dict.confirm.cancel', label: '取消', reason: '确认弹窗取消按钮' },
    ],
    global: false,
    priority: 'high',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const dictGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-dd-mock',
    title: '数据性质（原型演示数据）',
    blocks: [
      {
        type: 'paragraph',
        text: '本页数据为原型演示数据：字典类型为内存态，刷新后回到初始状态；新增 / 编辑 / 删除仅作用于内存，不落库。正式实现需由系统按真实字典表与权限生成。',
      },
    ],
    source: '《数据字典功能批注》V1.0 §0',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
