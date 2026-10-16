import { Navigate, Route, Routes } from 'react-router-dom'
import BasicLayout from '@/layouts/BasicLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CategoryPage from '@/pages/category/CategoryPage'
import ProductListPage from '@/pages/product/ProductListPage'
import ProductDetailPage from '@/pages/product/ProductDetailPage'
import ProductFormPage from '@/pages/product/ProductFormPage'
import OperationListPage from '@/pages/operation/OperationListPage'
import OperationDetailPage from '@/pages/operation/OperationDetailPage'
import OperationFormPage from '@/pages/operation/OperationFormPage'
import MaterialListPage from '@/pages/material/MaterialListPage'
import EnergyListPage from '@/pages/energy/EnergyListPage'
import UnitListPage from '@/pages/unit/UnitListPage'
import UnitDetailPage from '@/pages/unit/UnitDetailPage'
import UnitFormPage from '@/pages/unit/UnitFormPage'
import ProcessListPage from '@/pages/process/ProcessListPage'
import ProcessDetailPage from '@/pages/process/ProcessDetailPage'
import ProcessFormPage from '@/pages/process/ProcessFormPage'
import LifecycleListPage from '@/pages/lifecycle/LifecycleListPage'
import IndustryListPage from '@/pages/industry/IndustryListPage'
import StandardListPage from '@/pages/standard/StandardListPage'
import StandardDetailPage from '@/pages/standard/StandardDetailPage'
import StandardFormPage from '@/pages/standard/StandardFormPage'
import BackendLibraryListPage from '@/pages/factor/BackendLibraryListPage'
import BackendLibraryDetailPage from '@/pages/factor/BackendLibraryDetailPage'
import FrontendLibraryListPage from '@/pages/factor/FrontendLibraryListPage'
import FrontendLibraryDetailPage from '@/pages/factor/FrontendLibraryDetailPage'
import MyFactorLibraryListPage from '@/pages/factor/MyFactorLibraryListPage'
import MyFactorLibraryDetailPage from '@/pages/factor/MyFactorLibraryDetailPage'
import FactorDetailPage from '@/pages/factor/FactorDetailPage'
import FactorFormPage from '@/pages/factor/FactorFormPage'
import CalcFormulaListPage from '@/pages/calcEngine/CalcFormulaListPage'
import CalcFormulaDetailPage from '@/pages/calcEngine/CalcFormulaDetailPage'
import CalcFormulaFormPage from '@/pages/calcEngine/CalcFormulaFormPage'
import FormulaListPage from '@/pages/formula/FormulaListPage'
import FormulaEditPage from '@/pages/formula/FormulaEditPage'
import ProjectListPage from '@/pages/pcf/ProjectListPage'
import ProjectWorkbenchPage from '@/pages/pcf/ProjectWorkbenchPage'
import MyProductListPage from '@/pages/myProduct/MyProductListPage'
import MyProductDetailPage from '@/pages/myProduct/MyProductDetailPage'
import MyProductFormPage from '@/pages/myProduct/MyProductFormPage'
import MyProcessListPage from '@/pages/myProcess/MyProcessListPage'
import MyProcessDetailPage from '@/pages/myProcess/MyProcessDetailPage'
import MyProcessFormPage from '@/pages/myProcess/MyProcessFormPage'
import DictListPage from '@/pages/dict/DictListPage'
import BackendModelListPage from '@/pages/model/BackendModelListPage'
import BackendModelWizardPage from '@/pages/model/BackendModelWizardPage'
import BackendModelDetailPage from '@/pages/model/BackendModelDetailPage'
import FrontendModelLibraryListPage from '@/pages/model/FrontendModelLibraryListPage'
import FrontendModelDetailPage from '@/pages/model/FrontendModelDetailPage'
import MyModelListPage from '@/pages/model/MyModelListPage'
import MyModelWizardPage from '@/pages/model/MyModelWizardPage'
import MyModelDetailPage from '@/pages/model/MyModelDetailPage'
import SensitivityListPage from '@/pages/report/SensitivityListPage'
import SensitivityDetailPage from '@/pages/report/SensitivityDetailPage'
import QualityListPage from '@/pages/report/QualityListPage'
import QualityDetailPage from '@/pages/report/QualityDetailPage'
import ReportListPage from '@/pages/report/ReportListPage'
import ReportDetailPage from '@/pages/report/ReportDetailPage'
import EnterprisePage from '@/pages/report/EnterprisePage'
import PlaceholderPage from '@/pages/PlaceholderPage'
import NotFoundPage from '@/pages/NotFoundPage'

/** 骨架阶段：「工作台」「产品库」「工艺流程」「工序」「物料库」「能源库」「计量单位库」「生命周期阶段」「标准文件库」「行业库」「排放因子库」「计算公式」「模型管理」「数据字典」为完整实现，其余模块用占位页承载路由。 */
const PLACEHOLDERS: Array<{ path: string; title: string; breadcrumb: string[] }> = [
  /* 系统管理 · 平台支撑：组织架构 / 用户与角色暂占位，待后续完善 */
  { path: 'system/org', title: '组织架构', breadcrumb: ['系统管理', '平台支撑'] },
  { path: 'system/user', title: '用户与角色', breadcrumb: ['系统管理', '平台支撑'] },
]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BasicLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="basic/category" element={<CategoryPage />} />
        <Route path="basic/product" element={<ProductListPage />} />
        <Route path="basic/product/new" element={<ProductFormPage />} />
        <Route path="basic/product/:id" element={<ProductDetailPage />} />
        <Route path="basic/product/:id/edit" element={<ProductFormPage />} />
        <Route path="basic/material" element={<MaterialListPage />} />
        <Route path="basic/energy" element={<EnergyListPage />} />
        <Route path="basic/unit" element={<UnitListPage />} />
        <Route path="basic/unit/new" element={<UnitFormPage />} />
        <Route path="basic/unit/:id" element={<UnitDetailPage />} />
        <Route path="basic/unit/:id/edit" element={<UnitFormPage />} />
        <Route path="basic/operation" element={<OperationListPage />} />
        <Route path="basic/operation/new" element={<OperationFormPage />} />
        <Route path="basic/operation/:id" element={<OperationDetailPage />} />
        <Route path="basic/operation/:id/edit" element={<OperationFormPage />} />
        <Route path="basic/process" element={<ProcessListPage />} />
        <Route path="basic/process/new" element={<ProcessFormPage />} />
        <Route path="basic/process/:id" element={<ProcessDetailPage />} />
        <Route path="basic/process/:id/edit" element={<ProcessFormPage />} />
        <Route path="basic/lifecycle" element={<LifecycleListPage />} />
        {/* 标准文件库（后台 · 基础库）：列表 + 独立详情页 + 独立新增 / 编辑页 */}
        <Route path="basic/standard" element={<StandardListPage />} />
        <Route path="basic/standard/new" element={<StandardFormPage />} />
        <Route path="basic/standard/:id" element={<StandardDetailPage />} />
        <Route path="basic/standard/:id/edit" element={<StandardFormPage />} />
        <Route path="basic/industry" element={<IndustryListPage />} />
        {/* 平台支撑 · 数据字典：字典类型 + 字典项（系统边界等）轻量维护 */}
        <Route path="system/dict" element={<DictListPage />} />
        {/* 因子库管理（后台 · 核算配置）：多库（商业数据库 / 自建库）+ 库级版本 + 发布 */}
        <Route path="model/factor-lib" element={<BackendLibraryListPage />} />
        <Route path="model/factor-lib/:libraryId" element={<BackendLibraryDetailPage />} />
        <Route path="model/factor-lib/:libraryId/factor/new" element={<FactorFormPage />} />
        <Route path="model/factor-lib/:libraryId/factor/:factorId" element={<FactorDetailPage />} />
        <Route path="model/factor-lib/:libraryId/factor/:factorId/edit" element={<FactorFormPage />} />
        {/* 模型管理（后台 · 核算模型）：列表 + 两步向导（新建 / 编辑）+ 只读详情；发布后前台模型库可见 */}
        <Route path="model/library" element={<BackendModelListPage />} />
        <Route path="model/library/new" element={<BackendModelWizardPage />} />
        <Route path="model/library/:modelId" element={<BackendModelDetailPage />} />
        <Route path="model/library/:modelId/edit" element={<BackendModelWizardPage />} />
        {/* 前台 · 因子库预览（已发布背景数据库，只读 + 收藏） */}
        <Route path="pcf/factor-libraries" element={<FrontendLibraryListPage />} />
        <Route path="pcf/factor-libraries/:libraryId" element={<FrontendLibraryDetailPage />} />
        <Route path="pcf/factor-libraries/:libraryId/factor/:factorId" element={<FactorDetailPage />} />
        {/* 前台 · 模型管理：模型库（平台已发布模型，只读预览 + 加入我的模型） */}
        <Route path="pcf/model-libraries" element={<FrontendModelLibraryListPage />} />
        <Route path="pcf/model-libraries/:modelId" element={<FrontendModelDetailPage />} />
        {/* 前台 · 我的模型（组织级：自己新增可编辑 / 收藏副本只读） */}
        <Route path="pcf/my-model" element={<MyModelListPage />} />
        <Route path="pcf/my-model/new" element={<MyModelWizardPage />} />
        <Route path="pcf/my-model/:modelId" element={<MyModelDetailPage />} />
        <Route path="pcf/my-model/:modelId/edit" element={<MyModelWizardPage />} />
        {/* 前台 · 我的因子库（私有：手工新增 + 收藏副本） */}
        <Route path="pcf/my-factor" element={<MyFactorLibraryListPage />} />
        <Route path="pcf/my-factor/:libraryId" element={<MyFactorLibraryDetailPage />} />
        <Route path="pcf/my-factor/:libraryId/factor/new" element={<FactorFormPage />} />
        <Route path="pcf/my-factor/:libraryId/factor/:factorId" element={<FactorDetailPage />} />
        <Route path="pcf/my-factor/:libraryId/factor/:factorId/edit" element={<FactorFormPage />} />
        {/* 计算引擎配置（后台 · 核算模型）：只保留计算公式；阶段归属与排放源绑定在建模时配置 */}
        <Route path="model/calc-engine" element={<CalcFormulaListPage />} />
        <Route path="model/calc-engine/new" element={<CalcFormulaFormPage />} />
        <Route path="model/calc-engine/:id" element={<CalcFormulaDetailPage />} />
        <Route path="model/calc-engine/:id/edit" element={<CalcFormulaFormPage />} />
        {/* 公式管理（后台 · 核算配置）：卡片网格列表 + 三栏公式编辑器（变量库 / 公式编辑器 / 配置清单 + 沙盒试算） */}
        <Route path="model/formula" element={<FormulaListPage />} />
        <Route path="model/formula/:id" element={<FormulaEditPage />} />
        {/* 产品碳足迹 · 产品碳足迹核算（**扁平一层列表**：一行 = 一条核算记录 + 项目工作台壳） */}
        <Route path="pcf/project" element={<ProjectListPage />} />
        {/* 新建核算草稿：可不选产品直接进入（步骤①可引用产品或自行录入），**保存后才落库** */}
        <Route path="pcf/project/new" element={<ProjectWorkbenchPage />} />
        {/* 新建核算草稿：按模型带入「目标与范围」，**保存后才落库**并复制模型的产品建模内容（引用即复制） */}
        <Route path="pcf/project/new/model/:modelId" element={<ProjectWorkbenchPage />} />
        {/* 新建核算草稿：按产品带入步骤①，**保存后才落库**（未保存不产生核算记录） */}
        <Route path="pcf/project/new/:productId" element={<ProjectWorkbenchPage />} />
        <Route path="pcf/project/:id" element={<ProjectWorkbenchPage />} />
        <Route path="pcf/project/:id/:step" element={<ProjectWorkbenchPage />} />
        {/* 我的产品库（前台 · 组织产品）：列表 + 详情 + 新增 / 编辑；产品来源二态（引用标准产品为复制副本 / 自己新增，均可编辑） */}
        <Route path="pcf/my-product" element={<MyProductListPage />} />
        <Route path="pcf/my-product/new" element={<MyProductFormPage />} />
        <Route path="pcf/my-product/:id" element={<MyProductDetailPage />} />
        <Route path="pcf/my-product/:id/edit" element={<MyProductFormPage />} />
        {/* 我的工艺库（前台 · 组织自建）：列表 + 详情 + 新增 / 编辑；工艺来源二态（引用后台工艺只读 / 自己新增） */}
        <Route path="pcf/my-process" element={<MyProcessListPage />} />
        <Route path="pcf/my-process/new" element={<MyProcessFormPage />} />
        <Route path="pcf/my-process/:id" element={<MyProcessDetailPage />} />
        <Route path="pcf/my-process/:id/edit" element={<MyProcessFormPage />} />
        {/* 报告管理 · 敏感性分析（tdesign 实现）：列表 + 详情（基准情景 / 变更情景表格 / 情景对比 / 填写情景数据抽屉） */}
        <Route path="report/sensitivity" element={<SensitivityListPage />} />
        <Route path="report/sensitivity/:id" element={<SensitivityDetailPage />} />
        {/* 报告管理 · 数据质量评价（DQR，tdesign 实现）：列表 + 详情（三段式向导 定性 → 定量 → 结果） */}
        <Route path="report/quality" element={<QualityListPage />} />
        <Route path="report/quality/:id" element={<QualityDetailPage />} />
        {/* 报告管理 · 报告编制（tdesign 实现）：列表 + 详情（报告信息卡 + 封面与概况信息[企业信息可编辑] + 动作区）+ 预览控件 */}
        <Route path="report/prepare" element={<ReportListPage />} />
        <Route path="report/prepare/:id" element={<ReportDetailPage />} />
        {/* 报告管理 · 企业信息维护（tdesign 实现）：列表 + 新增 / 编辑抽屉；记录供报告编制引用（R-104） */}
        <Route path="report/enterprise" element={<EnterprisePage />} />
        {PLACEHOLDERS.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={<PlaceholderPage title={item.title} breadcrumb={[...item.breadcrumb, item.title]} />}
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
