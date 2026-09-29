import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Tag, useToast } from '@/shared/components'
import {
  fetchCategories,
  fetchMyProduct,
  fetchPcfCurrentUserOrg,
  fetchPcfProject,
  fetchProduct,
} from '@/mock'
import type { PcfProject, ProductItem } from '@/types'
import PcfSteps from './PcfSteps'
import ProjectStepOne from './ProjectStepOne'
import type { ProjectStepOneHandle } from './ProjectStepOne'
import ProjectStepTwo from './ProjectStepTwo'
import type { ProjectStepTwoHandle } from './ProjectStepTwo'
import ProjectStepThree from './ProjectStepThree'
import ProjectStepFour from './ProjectStepFour'
import ProjectStepFive from './ProjectStepFive'
import {
  PCF_BOUNDARY_TEXT,
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
 * 从产品进入「新增核算」时只在内存中构建草稿对象（`id` / 编号为空，不写入 `pcfProjectStore`），
 * 步骤①点击「保存」才真正创建核算项目；未保存直接「返回 / 取消」不产生任何核算记录。
 */
async function buildDraft(productId: string): Promise<PcfProject> {
  const [{ product, productSource }, categoryList, org] = await Promise.all([
    resolveProduct(productId),
    fetchCategories(),
    fetchPcfCurrentUserOrg(),
  ])
  return {
    id: '',
    code: '',
    name: `${product.name}·碳足迹核算`,
    ownerOrg: org.name,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    productSource,
    refProductId: product.id,
    productCode: product.code,
    productName: product.name,
    productModel: product.model,
    productSpec: product.spec,
    productCategory: categoryList.find((c) => c.id === product.categoryId)?.name ?? '',
    productIndustry: product.industry,
    productVersion: 'V1.0',
    functionalUnit: product.unit,
    conversionFactor: 1,
    lifecycleStages: [],
    boundary: 'gate',
    currentStep: 1,
    status: 'new',
    remark: '',
    createdBy: '当前用户',
    createdAt: '',
    updatedAt: '',
  }
}

/**
 * 项目工作台（承载 P19–P26）：摘要条 + 顶部步骤条 + 内容区（骨架 §4）。
 * **V0.7：步骤④「碳足迹核算」+ 步骤⑤「核算结果」合并为 ④「碳足迹核算与结果」，共 5 步。**
 * 已交付：步骤①~⑤（步骤⑤ = 报告生成与编辑，批次 6）。
 * 新建核算走草稿路由 `/pcf/project/new/:productId`：仅步骤①可编辑，保存后才落库并跳转正式项目。
 */
export default function ProjectWorkbenchPage() {
  const { id = '', productId = '', step } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  /** 新建草稿模式（未落库；步骤①保存后才创建正式核算项目） */
  const creating = !!productId && !id

  const [project, setProject] = useState<PcfProject | null>(null)
  const [loading, setLoading] = useState(false)
  const stepOneRef = useRef<ProjectStepOneHandle>(null)
  const stepTwoRef = useRef<ProjectStepTwoHandle>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setProject(creating ? await buildDraft(productId) : await fetchPcfProject(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '项目不存在或已被删除', 'error')
      navigate('/pcf/project', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [creating, id, productId, navigate, toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 草稿模式固定停留在步骤①：后续步骤依赖已落库项目，暂不可达 */
  const activeSeq = useMemo(() => {
    if (creating) return 1
    const parsed = Number(step)
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= PCF_STEPS.length) return parsed
    return project?.currentStep ?? 1
  }, [creating, step, project])

  const editable = creating || (!!project && PCF_EDITABLE_STATUSES.includes(project.status))

  if (!project) {
    return (
      <div className="card">
        <div className="pcf-placeholder">{loading ? '加载中…' : '项目不存在或已被删除'}</div>
      </div>
    )
  }

  const currentStepDef = PCF_STEPS.find((item) => item.seq === activeSeq) ?? PCF_STEPS[0]

  /** 返回：草稿态回到产品核算记录页（无落库数据即「取消」）；正式项目同原逻辑 */
  const handleBack = () => {
    if (creating) {
      navigate(`/pcf/project/product/${productId}`)
    } else if (project?.refProductId) {
      navigate(`/pcf/project/product/${project.refProductId}`)
    } else {
      navigate('/pcf/project')
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          '前台业务平台',
          '产品碳足迹核算',
          creating ? pcfProductLabel(project.productName, project.productSpec) : project.code,
        ]}
        title={project.name}
        actions={<Button onClick={handleBack}>返回</Button>}
      />

      <div className="card">
        <div className="pcf-summary">
          <div className="pcf-summary-main">
            <div className="pcf-summary-title">
              <span className="mono">{project.code || '保存后生成编号'}</span>
              <Tag>{PCF_BOUNDARY_TEXT[project.boundary]}</Tag>
              <Tag tone={PCF_STATUS_TONE[project.status]}>{PCF_STATUS_TEXT[project.status]}</Tag>
            </div>
            <div className="pcf-summary-meta">
              <span>产品：{pcfProductLabel(project.productName, project.productSpec)}</span>
              <span>核算主体：{project.ownerOrg}</span>
              <span>统计时间：{project.startDate} ~ {project.endDate}</span>
            </div>
          </div>
          <div className="pcf-summary-actions">
            {editable && activeSeq === 1 && (
              <Button variant="primary" onClick={() => stepOneRef.current?.submit()}>
                保存
              </Button>
            )}
            {editable && activeSeq === 2 && (
              <Button variant="primary" onClick={() => stepTwoRef.current?.submit()}>
                保存
              </Button>
            )}
          </div>
        </div>

        <PcfSteps
          activeStep={activeSeq}
          reachableStep={creating ? 1 : project.currentStep}
          clickable
          onSelect={(seq) => {
            if (creating) return
            navigate(`/pcf/project/${project.id}/${seq}`)
          }}
        />

        <section className="pcf-content">
          {activeSeq === 1 ? (
            <ProjectStepOne
              ref={stepOneRef}
              project={project}
              editable={editable}
              creating={creating}
              onSaved={setProject}
              onCreated={(created) => navigate(`/pcf/project/${created.id}`, { replace: true })}
            />
          ) : activeSeq === 2 ? (
            <ProjectStepTwo ref={stepTwoRef} project={project} editable={editable} onSaved={setProject} />
          ) : activeSeq === 3 ? (
            <ProjectStepThree project={project} onSaved={setProject} />
          ) : activeSeq === 4 ? (
            <ProjectStepFour project={project} onSaved={setProject} />
          ) : activeSeq === 5 ? (
            <ProjectStepFive project={project} onSaved={setProject} />
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

        <div className="pcf-footer">
          <span>数据变更后需重新检测并核算，系统将保留历史结果版本</span>
          <span>最后更新：{project.updatedAt || '—'}</span>
        </div>
      </div>
    </>
  )
}
