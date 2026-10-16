import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Icon, PageHeader, Tag, useToast } from '@/shared/components'
import {
  boundaryLabelOf,
  fetchCategories,
  fetchMyProduct,
  fetchPcfCurrentUserOrg,
  fetchPcfProject,
  fetchPcfSourceModel,
  fetchProduct,
} from '@/mock'
import type { PcfProject, ProductItem } from '@/types'
import PcfSteps from './PcfSteps'
import ProjectStepOne from './ProjectStepOne'
import type { ProjectStepOneHandle } from './ProjectStepOne'
import ProjectStepTwo from './ProjectStepTwo'
import type { ProjectStepTwoHandle } from './ProjectStepTwo'
import ProjectStepThree from './ProjectStepThree'
import type { ProjectStepThreeHandle } from './ProjectStepThree'
import ProjectStepFour from './ProjectStepFour'
import {
  PCF_EDITABLE_STATUSES,
  PCF_STATUS_TEXT,
  PCF_STATUS_TONE,
  PCF_STEPS,
  pcfProductLabel,
} from './pcfMeta'
import './PcfPage.css'

interface ResolvedProduct {
  product: ProductItem
  productSource: PcfProject['productSource']
}

/** 草稿产品解析：我的产品库（自建 / 引用）优先，其次平台产品库（与产品核算记录页同口径） */
async function resolveProduct(id: string): Promise<ResolvedProduct> {
  try {
    const my = await fetchMyProduct(id)
    return { product: my, productSource: my.source === 'custom' ? 'custom' : 'library' }
  } catch {
    const lib = await fetchProduct(id)
    return { product: lib, productSource: 'library' }
  }
}

/**
 * 新建核算草稿（**保存即落库**）：
 * - 从产品进入「新增核算」时带出产品信息（`productId` 存在）；
 * - 从模型库选用模型时（`modelId` 存在）带出「目标与范围」（核算标准 / 系统边界 / 生命周期阶段），
 *   并记录来源模型；「产品建模」内容在步骤①保存落库后由 `applyModelToProject` 复制进来；
 * - **都未指定**时构建空白草稿，产品信息由用户在步骤①自行录入或引用。
 * 草稿只在内存中（`id` / 编号为空，不写入 `pcfProjectStore`），步骤①点击「保存」才真正创建核算项目。
 */
async function buildDraft(options: { productId?: string; modelId?: string }): Promise<PcfProject> {
  const { productId, modelId } = options
  const [org, categoryList, resolved, sourceModel] = await Promise.all([
    fetchPcfCurrentUserOrg(),
    fetchCategories(),
    productId ? resolveProduct(productId) : Promise.resolve(null),
    modelId ? fetchPcfSourceModel(modelId) : Promise.resolve(null),
  ])

  const base: PcfProject = {
    id: '',
    code: '',
    name: '新建碳足迹核算',
    ownerOrg: org.name,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    productSource: 'custom',
    refProductId: null,
    productName: '',
    productSpec: '',
    functionalUnit: '',
    functionalUnitValue: 1,
    conversionFactor: null,
    conversionUnit: '',
    convertedUnit: '',
    lifecycleStages: [],
    boundary: 'gate',
    currentStep: 1,
    status: 'new',
    remark: '',
    createdBy: '当前用户',
    createdAt: '',
    updatedAt: '',
  }

  /** 产品带入（引用产品时） */
  const productPart: Partial<PcfProject> = resolved
    ? {
        name: `${resolved.product.name}·碳足迹核算`,
        productSource: resolved.productSource,
        refProductId: resolved.product.id,
        productCode: resolved.product.code,
        productName: resolved.product.name,
        productModel: resolved.product.model,
        productSpec: resolved.product.spec,
        productCategory: categoryList.find((c) => c.id === resolved.product.categoryId)?.name ?? '',
        productIndustry: resolved.product.industry,
        productVersion: 'V1.0',
        functionalUnit: resolved.product.unit,
      }
    : {}

  /** 模型带入（引用模型时）：目标与范围 + 来源追溯 */
  const modelPart: Partial<PcfProject> = sourceModel
    ? {
        name: sourceModel.name,
        method: sourceModel.standardName,
        methodId: sourceModel.standardId,
        boundary: sourceModel.boundary,
        lifecycleStages: sourceModel.lifecycleStages.map((stage) => ({ ...stage })),
        sourceModelId: sourceModel.id,
        sourceModelName: sourceModel.name,
      }
    : {}

  return {
    ...base,
    ...productPart,
    ...modelPart,
    productCategory:
      productPart.productCategory ||
      (sourceModel ? categoryList.find((c) => c.id === sourceModel.categoryId)?.name ?? '' : ''),
    productIndustry: productPart.productIndustry || (sourceModel ? sourceModel.industries.join('、') : ''),
  }
}

/**
 * 项目工作台（承载 P19–P26）：摘要条 + 顶部步骤条 + 内容区（骨架 §4）。
 * **V0.8：移除步骤⑤「报告」（2026-10-12），共 4 步，「碳足迹核算与结果」为最后一个节点**；
 * 报告能力改由「产品碳足迹 · 报告管理」承载（占位，后续完善）。
 * 历史口径：V0.7 步骤④「碳足迹核算」+ 步骤⑤「核算结果」合并为 ④「碳足迹核算与结果」。
 * 新建核算走草稿路由 `/pcf/project/new/:productId`（从产品进入）或 `/pcf/project/new/model/:modelId`
 * （从模型库选用模型）：仅步骤①可编辑，保存后才落库并跳转正式项目。
 */
export default function ProjectWorkbenchPage() {
  const { id = '', productId = '', modelId = '', step } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()

  /** 查看模式（列表「查看」入口）：与编辑页同构，但所有数据只读、不提供保存 / 核算入口 */
  const viewMode = searchParams.get('mode') === 'view'

  /** 新建草稿模式（未落库；步骤①保存后才创建正式核算项目）：无项目 id 即新建，产品可后续引用或自行录入 */
  const creating = !id

  const [project, setProject] = useState<PcfProject | null>(null)
  const [loading, setLoading] = useState(false)
  const stepOneRef = useRef<ProjectStepOneHandle>(null)
  const stepTwoRef = useRef<ProjectStepTwoHandle>(null)
  const stepThreeRef = useRef<ProjectStepThreeHandle>(null)
  /** 「下一步 / 上一步」触发方向：由工作台记录，步骤保存成功后据此跳转（须置于提前返回之前，避免 Hook 数量随加载态变化） */
  const pendingDirRef = useRef<'next' | 'prev' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setProject(creating ? await buildDraft({ productId, modelId }) : await fetchPcfProject(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '项目不存在或已被删除', 'error')
      navigate('/pcf/project', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [creating, id, productId, modelId, navigate, toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 草稿模式固定停留在步骤①：后续步骤依赖已落库项目，暂不可达 */
  const activeSeq = useMemo(() => {
    if (creating) return 1
    const parsed = Number(step)
    const target = Number.isInteger(parsed) && parsed >= 1 ? parsed : project?.currentStep ?? 1
    // V0.8：步骤条共 4 步，越界步骤（含历史报告态遗留的 5）收敛到最后一步
    return Math.min(Math.max(target, 1), PCF_STEPS.length)
  }, [creating, step, project])

  /**
   * 可达步骤：收敛到项目当前进度。
   * 末节点即步骤④「碳足迹核算与结果」——核算完成（`done`）时 currentStep = 4 自然可达。
   * 查看模式下：项目处于「待核算」（仅检测通过、尚未开始核算）时，步骤④视为未开始，不允许进入。
   */
  const projectReachable = creating ? 1 : Math.min(project?.currentStep ?? 1, PCF_STEPS.length)
  const reachableStep =
    viewMode && project?.status === 'toCalc' ? Math.min(projectReachable, PCF_STEPS.length - 1) : projectReachable

  /** 整体可编辑：可编辑状态且**非查看模式** */
  const editable = !viewMode && (creating || (!!project && PCF_EDITABLE_STATUSES.includes(project.status)))
  /**
   * 步骤①「目标与范围」可编辑：**核算完成（`done` / 历史 `calculated`）后锁定，数据不可修改**。
   * 步骤②「产品建模」仍可编辑（改数据时弹出「数据变更」提示，保存后回退重走检测 → 核算）。
   */
  const stepOneEditable =
    editable && !!project && project.status !== 'done' && project.status !== 'calculated'
  const stepTwoEditable = editable

  if (!project) {
    return (
      <div className="card">
        <div className="pcf-placeholder">{loading ? '加载中…' : '项目不存在或已被删除'}</div>
      </div>
    )
  }

  const currentStepDef = PCF_STEPS.find((item) => item.seq === activeSeq) ?? PCF_STEPS[0]

  const stepUrl = (seq: number) =>
    `/pcf/project/${project.id}/${seq}${viewMode ? '?mode=view' : ''}`

  /** 返回：统一回到核算列表（草稿态未保存即等同「取消」，不产生核算记录） */
  const handleBack = () => {
    navigate('/pcf/project')
  }

  /** 上一步：实时保存当前步骤后回到上一级步骤 */
  const handlePrev = () => {
    if (creating || activeSeq <= 1) return
    // 步骤③④无可编辑数据（检测 / 核算结果已落库），直接回退
    if (!editable || activeSeq >= 3) {
      navigate(stepUrl(activeSeq - 1))
      return
    }
    pendingDirRef.current = 'prev'
    if (activeSeq === 1) stepOneRef.current?.submit()
    else if (activeSeq === 2) stepTwoRef.current?.submit()
  }

  /** 下一步：实时保存当前步骤后进入下一级步骤 */
  const handleNext = () => {
    if (creating) {
      pendingDirRef.current = 'next'
      stepOneRef.current?.submit()
      return
    }
    if (activeSeq >= PCF_STEPS.length) return
    if (!editable) {
      // 查看模式：仅允许切换到已开始的步骤，未开始步骤提示且不跳转
      const target = activeSeq + 1
      if (target <= reachableStep) navigate(stepUrl(target))
      else toast('该步骤尚未开始，无法查看', 'error')
      return
    }
    if (activeSeq === 3) {
      // 数据检测尚未通过（「待处理 / 待检测」）→ 不允许直接进入核算，提示先完成一键检测
      if (project.status === 'ongoing' || project.status === 'toCheck') {
        toast('请先在「数据检测」中点击「一键检测」，检测通过后方可进入下一步', 'error')
        return
      }
      navigate(stepUrl(4))
      return
    }
    pendingDirRef.current = 'next'
    if (activeSeq === 1) stepOneRef.current?.submit()
    else if (activeSeq === 2) stepTwoRef.current?.submit()
  }

  /** 步骤保存成功：仅同步项目状态（跳转由步骤内的「下一步 / 上一步」回调触发） */
  const handleSaved = (saved: PcfProject) => {
    setProject(saved)
  }

  /**
   * 步骤保存完成（或无需保存）后的跳转：
   * 方向由 `pendingDirRef` 决定（「下一步」前进 / 「上一步」回退），默认前进。
   */
  const handleStepAdvanced = () => {
    const dir = pendingDirRef.current
    pendingDirRef.current = null
    if (dir === 'prev' && activeSeq > 1) {
      navigate(stepUrl(activeSeq - 1))
      return
    }
    if (activeSeq < PCF_STEPS.length) {
      navigate(stepUrl(activeSeq + 1))
    }
  }

  /** 草稿（步骤①）保存落库：直接进入步骤② */
  const handleCreated = (created: PcfProject) => {
    setProject(created)
    navigate(`/pcf/project/${created.id}/2`, { replace: true })
  }

  /** 「下一步」可见：非末步（草稿、可编辑、查看模式均可步骤切换） */
  const showNext = activeSeq < PCF_STEPS.length
  /** 「上一步」可见：存在上一级步骤 */
  const showPrev = activeSeq > 1

  return (
    <>
      <PageHeader
        breadcrumb={[
          '产品碳足迹',
          '碳足迹核算',
          creating ? pcfProductLabel(project.productName, project.productSpec) : project.code,
        ]}
        title={pcfProductLabel(project.productName, project.productSpec)}
      />

      <div className="card">
        <div className="pcf-summary" data-ann-target="pcf.workbench.summary">
          <div className="pcf-summary-main">
            <div className="pcf-summary-title">
              <span className="mono">{project.code || '保存后生成编号'}</span>
              <Tag>{boundaryLabelOf(project.boundary)}</Tag>
              <Tag tone={PCF_STATUS_TONE[project.status]}>{PCF_STATUS_TEXT[project.status]}</Tag>
            </div>
            <div className="pcf-summary-meta">
              <span>产品：{pcfProductLabel(project.productName, project.productSpec)}</span>
              <span>统计时间：{project.startDate} ~ {project.endDate}</span>
              {project.sourceModelName && <span>引用模型：{project.sourceModelName}</span>}
            </div>
          </div>
          <div className="pcf-summary-actions">
            {showPrev && (
              <Button data-ann-target="pcf.workbench.prev" onClick={handlePrev}>
                上一步
              </Button>
            )}
            {showNext && (
              <Button
                variant="primary"
                data-ann-target="pcf.workbench.next"
                onClick={handleNext}
                title={viewMode ? '切换至下一步' : '保存当前步骤数据并进入下一步'}
              >
                下一步
              </Button>
            )}
            <Button data-ann-target="pcf.workbench.back" onClick={handleBack}>
              <Icon name="arrowLeft" size={14} />
              返回
            </Button>
          </div>
        </div>

        <div data-ann-target="pcf.workbench.steps">
          <PcfSteps
            activeStep={activeSeq}
            reachableStep={reachableStep}
            clickable
            onSelect={(seq) => {
              if (creating) return
              // 步骤条直接切换：取消可能残留的「下一步 / 上一步」待跳转方向
              pendingDirRef.current = null
              navigate(`/pcf/project/${project.id}/${seq}${viewMode ? '?mode=view' : ''}`)
            }}
          />
        </div>

        <section className="pcf-content">
          {activeSeq === 1 ? (
            <ProjectStepOne
              ref={stepOneRef}
              project={project}
              editable={stepOneEditable}
              creating={creating}
              onSaved={handleSaved}
              onCreated={handleCreated}
              onNext={handleStepAdvanced}
            />
          ) : activeSeq === 2 ? (
            <ProjectStepTwo
              ref={stepTwoRef}
              project={project}
              editable={stepTwoEditable}
              onSaved={handleSaved}
              onNext={handleStepAdvanced}
            />
          ) : activeSeq === 3 ? (
            <ProjectStepThree
              project={project}
              readOnly={!editable}
              onSaved={handleSaved}
              onNext={handleStepAdvanced}
            />
          ) : activeSeq === 4 ? (
            <ProjectStepFour project={project} readOnly={!editable} onSaved={setProject} />
          ) : (
            <>
              <div className="pcf-content-title">{currentStepDef.name}</div>
              <div className="pcf-placeholder">
                该步骤将在批次 {currentStepDef.batch} 交付。
                <br />
                对应的《字段清单》《业务 PRD》《Demo PRD》与页面实现将按批次依次产出。
              </div>
            </>
          )}
        </section>

        <div className="pcf-footer" data-ann-target="pcf.workbench.footer">
          <span>数据变更后需重新检测并核算，系统将保留历史结果版本</span>
          <span>最后更新：{project.updatedAt || '—'}</span>
        </div>
      </div>
    </>
  )
}
