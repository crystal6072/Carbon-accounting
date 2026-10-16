import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, useToast } from '@/shared/components'
import { fetchPcfCheckResult, fetchPcfProject, submitPcfCheck } from '@/mock'
import type { PcfCheckIssue, PcfCheckResult, PcfProject } from '@/types'
import PcfFlowCanvas from './PcfFlowCanvas'
import './PcfPage.css'

export interface ProjectStepThreeHandle {
  submit: () => void
}

interface ProjectStepThreeProps {
  project: PcfProject
  /** 只读（查看）模式：隐藏检测执行入口 */
  readOnly?: boolean
  onSaved: (project: PcfProject) => void
  /** 检测通过后由工作台触发（「下一步」→ 进入步骤④） */
  onNext?: () => void
}

/** 检测类别文案（界面口径，不展示异常编号） */
const CHECK_CATEGORY_TEXT: Record<PcfCheckIssue['category'], string> = {
  completeness: '数据完整性',
  factorUnit: '因子单位',
  allocation: '分配比例',
  stageCoverage: '阶段覆盖',
  massBalance: '质量平衡',
  biogenic: '生物碳',
}

/** 待检测 / 检测中的占位结果（用于渲染四态） */
function pendingResult(projectId: string, status: PcfCheckResult['status']): PcfCheckResult {
  return { projectId, status, checkedAt: '', blockingCount: 0, warningCount: 0, issues: [] }
}

/**
 * 工作台步骤③「数据检测」内容区。
 * - 提交检测 → 即时校验 → 返回结论（通过 → 「待核算」/ 不通过 → 停留「待处理」）；
 * - 问题清单按「阻断级 / 提示级」分组，每条携带定位与修改入口；
 * - 阻断项清零 → 展示「进入碳足迹核算」入口。
 */
export default forwardRef<ProjectStepThreeHandle, ProjectStepThreeProps>(
  function ProjectStepThree({ project, readOnly = false, onSaved, onNext }, ref) {
  const navigate = useNavigate()
  const toast = useToast()

  const [result, setResult] = useState<PcfCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  /** 模型预览 · 流程画布 */
  const [canvasOpen, setCanvasOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setResult(await fetchPcfCheckResult(project.id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [project.id, toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 检测可用状态：「待处理」/「待检测」（查看模式下不可检测） */
  const canCheck = !readOnly && (project.status === 'ongoing' || project.status === 'toCheck')

  const handleCheck = async () => {
    if (checking) return
    setChecking(true)
    setResult(pendingResult(project.id, 'checking'))
    try {
      const res = await submitPcfCheck(project.id)
      setResult(res)
      if (res.status === 'passed') {
        // 检测通过 → 项目流转「待核算」，由工作台推进到步骤④
        onSaved(await fetchPcfProject(project.id))
        onNext?.()
        toast('检测通过')
      } else {
        toast(`检测不通过，存在 ${res.blockingCount} 项阻断问题`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '检测异常，请重新检测', 'error')
      void load()
    } finally {
      setChecking(false)
    }
  }

  const goStep = (step: number) =>
    navigate(`/pcf/project/${project.id}/${step}${readOnly ? '?mode=view' : ''}`)

  /** 暴露「提交检测」给工作台（「下一步」/「上一步」时先实时保存本步骤） */
  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        void handleCheck()
      },
    }),
    [handleCheck],
  )

  if (loading) {
    return <div className="pcf-placeholder">加载中…</div>
  }

  const status = result?.status ?? 'pending'
  const blocking = result?.issues.filter((item) => item.level === 'blocking') ?? []
  const warnings = result?.issues.filter((item) => item.level === 'warning') ?? []

  return (
    <div className="pcf-step-form" data-ann-target="pcf.step3.page.global">
      {/* 检测说明 */}
      <div className="pcf-form-tip">
        数据检测将在进入核算前，对活动数据、排放来源、分配比例、阶段覆盖、因子单位与质量平衡进行校验；
        点击「一键检测」即可完成校验：检测通过 → 项目流转「待核算」；检测不通过 → 项目回退「待处理」，
        需按问题清单整改后重新检测。
      </div>

      {/* 检测结论卡 */}
      <div className={`pcf-check-card pcf-check-${status}`} data-ann-target="pcf.step3.card">
        <div className="pcf-check-head">
          <span className="pcf-check-icon" aria-hidden="true">
            {status === 'passed' ? '✓' : status === 'failed' ? '!' : '○'}
          </span>
          <div className="pcf-check-title">
            <div className="pcf-check-title-main">
              {status === 'pending' && '尚未提交检测'}
              {status === 'checking' && '检测中…'}
              {status === 'passed' && '检测通过，可进入碳足迹核算'}
              {status === 'failed' && '检测不通过'}
            </div>
            <div className="pcf-check-meta">
              {status === 'pending' && '请点击「一键检测」开始校验'}
              {status === 'checking' && '正在校验活动数据、排放来源、分配比例、阶段覆盖、因子单位与质量平衡…'}
              {status === 'passed' && `检测时间：${result?.checkedAt ?? '-'}`}
              {status === 'failed' &&
                `阻断 ${result?.blockingCount ?? 0} 项 · 提示 ${result?.warningCount ?? 0} 项 · 检测时间：${result?.checkedAt ?? '-'}`}
            </div>
          </div>
          <div className="pcf-check-actions">
            {status === 'pending' && (
              <Button variant="primary" data-ann-target="pcf.step3.check" disabled={!canCheck} onClick={handleCheck}>
                一键检测
              </Button>
            )}
            {status === 'checking' && (
              <Button variant="primary" disabled>
                检测中…
              </Button>
            )}
            {status === 'failed' && (
              <Button variant="primary" disabled={!canCheck || checking} onClick={handleCheck}>
                重新检测
              </Button>
            )}
            {status === 'passed' && project.status === 'toCalc' && !readOnly && (
              <Button variant="primary" onClick={() => goStep(4)}>
                进入碳足迹核算
              </Button>
            )}
            {status === 'passed' && (project.status === 'ongoing' || project.status === 'toCheck') && !readOnly && (
              <Button variant="primary" disabled={!canCheck || checking} onClick={handleCheck}>
                重新检测
              </Button>
            )}
            {status === 'passed' && project.status !== 'toCalc' && project.status !== 'ongoing' && project.status !== 'toCheck' && (
              <Button onClick={() => goStep(4)}>查看核算结果</Button>
            )}
            <Button data-ann-target="pcf.step3.canvas" onClick={() => setCanvasOpen(true)} title="以流程画布形式预览建模数据（输入 / 输出 + 追溯链路）">
              预览模型
            </Button>
          </div>
        </div>
      </div>

      {/* 问题清单（检测中 / 待检测时不展示） */}
      {status !== 'pending' && status !== 'checking' && (
        <>
          <div className="pcf-panel" data-ann-target="pcf.step3.issues">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">阻断问题（{blocking.length}）</span>
              <span className="pcf-panel-tip">
                {blocking.length === 0 ? '无阻断问题' : '须整改后才能进入碳足迹核算'}
              </span>
            </div>
            {blocking.length === 0 ? (
              <div className="pcf-check-empty pcf-check-empty-ok">未发现阻断问题</div>
            ) : (
              <div className="pcf-check-list">
                {blocking.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} onFix={() => goStep(issue.fixStep ?? 2)} />
                ))}
              </div>
            )}
          </div>

          <div className="pcf-panel">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">提示问题（{warnings.length}）</span>
              <span className="pcf-panel-tip">提示问题不阻断核算，建议关注</span>
            </div>
            {warnings.length === 0 ? (
              <div className="pcf-check-empty">未发现提示问题</div>
            ) : (
              <div className="pcf-check-list">
                {warnings.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} onFix={() => goStep(issue.fixStep ?? 2)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 模型预览 · 流程画布（输入 / 输出 + 追溯链路） */}
      <PcfFlowCanvas open={canvasOpen} project={project} onClose={() => setCanvasOpen(false)} />
    </div>
    )
  },
)

/** 单条问题行 */
function IssueRow({ issue, onFix }: { issue: PcfCheckIssue; onFix: () => void }) {
  return (
    <div className="pcf-check-issue">
      <div className="pcf-check-issue-tag">
        <Tag tone={issue.level === 'blocking' ? 'error' : 'warning'}>
          {issue.level === 'blocking' ? '阻断' : '提示'}
        </Tag>
      </div>
      <div className="pcf-check-issue-body">
        <div className="pcf-check-issue-title">
          <span className="pcf-check-issue-category">{CHECK_CATEGORY_TEXT[issue.category]}</span>
          <span className="pcf-check-issue-text">{issue.title}</span>
        </div>
        <div className="pcf-check-issue-desc">{issue.description}</div>
        {issue.location && <div className="pcf-check-issue-loc">{issue.location}</div>}
      </div>
      {issue.fixStep && (
        <button type="button" className="pcf-check-fix" onClick={onFix}>
          {issue.fixLabel ?? '去修改'} →
        </button>
      )}
    </div>
  )
}
