import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, useToast } from '@/shared/components'
import { fetchPcfCheckResult, submitPcfCheck } from '@/mock'
import type { PcfCheckIssue, PcfCheckResult, PcfProject } from '@/types'
import './PcfPage.css'

interface ProjectStepThreeProps {
  project: PcfProject
  onSaved: (project: PcfProject) => void
}

/** 检测类别文案（界面口径，不展示异常编号） */
const CHECK_CATEGORY_TEXT: Record<PcfCheckIssue['category'], string> = {
  completeness: '数据完整性',
  factorUnit: '因子单位',
  allocation: '分配比例',
  stageCoverage: '阶段覆盖',
  massBalance: '质量平衡',
}

/** 待检测 / 检测中的占位结果（用于渲染四态） */
function pendingResult(projectId: string, status: PcfCheckResult['status']): PcfCheckResult {
  return { projectId, status, checkedAt: '', blockingCount: 0, warningCount: 0, issues: [] }
}

/**
 * 工作台步骤③「数据检测」内容区。
 * - 提交检测 → 检测中 → 返回结论（通过 / 不通过）；
 * - 问题清单按「阻断级 / 提示级」分组，每条携带定位与修改入口；
 * - 阻断项清零 → 展示「进入碳足迹核算」入口。
 */
export default function ProjectStepThree({ project, onSaved }: ProjectStepThreeProps) {
  const navigate = useNavigate()
  const toast = useToast()

  const [result, setResult] = useState<PcfCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

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

  const canCheck = project.status === 'ongoing' || project.status === 'checking'

  const handleCheck = async () => {
    if (checking) return
    setChecking(true)
    setResult(pendingResult(project.id, 'checking'))
    try {
      const res = await submitPcfCheck(project.id)
      setResult(res)
      onSaved({
        ...project,
        status: res.status === 'passed' ? 'toCalc' : 'ongoing',
        currentStep: res.status === 'passed' ? 4 : 3,
      })
      toast(res.status === 'passed' ? '检测通过' : `检测不通过，存在 ${res.blockingCount} 项阻断问题`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '检测异常，请重新检测', 'error')
      void load()
    } finally {
      setChecking(false)
    }
  }

  const goStep = (step: number) => navigate(`/pcf/project/${project.id}/${step}`)

  if (loading) {
    return <div className="pcf-placeholder">加载中…</div>
  }

  const status = result?.status ?? 'pending'
  const blocking = result?.issues.filter((item) => item.level === 'blocking') ?? []
  const warnings = result?.issues.filter((item) => item.level === 'warning') ?? []

  return (
    <div className="pcf-step-form">
      {/* 检测说明 */}
      <div className="pcf-form-tip">
        数据检测将在进入核算前，对活动数据、排放来源、分配比例、阶段覆盖、因子单位与质量平衡进行校验；
        检测通过后方可进入碳足迹核算。检测结果会随项目留存，数据修改后需重新检测。
      </div>

      {/* 检测结论卡 */}
      <div className={`pcf-check-card pcf-check-${status}`}>
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
              {status === 'pending' && '请点击下方按钮提交检测'}
              {status === 'checking' && '正在校验活动数据、排放来源、分配比例、阶段覆盖、因子单位与质量平衡…'}
              {status === 'passed' && `检测时间：${result?.checkedAt ?? '-'}`}
              {status === 'failed' &&
                `阻断 ${result?.blockingCount ?? 0} 项 · 提示 ${result?.warningCount ?? 0} 项 · 检测时间：${result?.checkedAt ?? '-'}`}
            </div>
          </div>
          <div className="pcf-check-actions">
            {status === 'pending' && (
              <Button variant="primary" disabled={!canCheck} onClick={handleCheck}>
                提交检测
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
            {status === 'passed' && project.status === 'toCalc' && (
              <Button variant="primary" onClick={() => goStep(4)}>
                进入碳足迹核算
              </Button>
            )}
            {status === 'passed' && project.status !== 'toCalc' && project.status !== 'ongoing' && (
              <Button onClick={() => goStep(4)}>查看核算结果</Button>
            )}
          </div>
        </div>
      </div>

      {/* 问题清单（检测中 / 待检测时不展示） */}
      {status !== 'pending' && status !== 'checking' && (
        <>
          <div className="pcf-panel">
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
    </div>
  )
}

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
