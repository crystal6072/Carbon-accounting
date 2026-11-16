import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import BasicLayout from '@/layouts/BasicLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ScreenPage from '@/pages/screen/ScreenPage'
import CategoryPage from '@/pages/category/CategoryPage'
import ProductListPage from '@/pages/product/ProductListPage'
import ProductDetailPage from '@/pages/product/ProductDetailPage'
import ProductFormPage from '@/pages/product/ProductFormPage'
import OperationListPage from '@/pages/operation/OperationListPage'
import OperationDetailPage from '@/pages/operation/OperationDetailPage'
import OperationFormPage from '@/pages/operation/OperationFormPage'
import MaterialListPage from '@/pages/material/MaterialListPage'
import CarbonDetectionListPage from '@/pages/carbonDetection/CarbonDetectionListPage'
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
import BambooCarbonListPage from '@/pages/bambooCarbon/BambooCarbonListPage'
import BambooCarbonDetailPage from '@/pages/bambooCarbon/BambooCarbonDetailPage'
import BambooCarbonFormPage from '@/pages/bambooCarbon/BambooCarbonFormPage'
import KnowledgeTopicListPage from '@/pages/knowledge/KnowledgeTopicListPage'
import KnowledgeTopicDetailPage from '@/pages/knowledge/KnowledgeTopicDetailPage'
import KnowledgeStandardListPage from '@/pages/knowledge/KnowledgeStandardListPage'
import KnowledgeStandardDetailPage from '@/pages/knowledge/KnowledgeStandardDetailPage'
import KnowledgeCaseListPage from '@/pages/knowledge/KnowledgeCaseListPage'
import KnowledgeCaseDetailPage from '@/pages/knowledge/KnowledgeCaseDetailPage'
import IndustryBaselineListPage from '@/pages/baseline/IndustryBaselineListPage'
import IndustryBaselineFormPage from '@/pages/baseline/IndustryBaselineFormPage'
import IndustryBaselineDetailPage from '@/pages/baseline/IndustryBaselineDetailPage'
import CarbonLabelTemplateListPage from '@/pages/baseline/CarbonLabelTemplateListPage'
import CarbonLabelTemplateFormPage from '@/pages/baseline/CarbonLabelTemplateFormPage'
import BackendLibraryListPage from '@/pages/factor/BackendLibraryListPage'
import BackendLibraryDetailPage from '@/pages/factor/BackendLibraryDetailPage'
import FrontendLibraryListPage from '@/pages/factor/FrontendLibraryListPage'
import FrontendLibraryDetailPage from '@/pages/factor/FrontendLibraryDetailPage'
import MyFactorLibraryListPage from '@/pages/factor/MyFactorLibraryListPage'
import MyFactorLibraryDetailPage from '@/pages/factor/MyFactorLibraryDetailPage'
import FactorDetailPage from '@/pages/factor/FactorDetailPage'
import FactorFormPage from '@/pages/factor/FactorFormPage'
import ProjectListPage from '@/pages/pcf/ProjectListPage'
import ProjectWorkbenchPage from '@/pages/pcf/ProjectWorkbenchPage'
import MyProductListPage from '@/pages/myProduct/MyProductListPage'
import MyProductDetailPage from '@/pages/myProduct/MyProductDetailPage'
import MyProductFormPage from '@/pages/myProduct/MyProductFormPage'
import MyProcessListPage from '@/pages/myProcess/MyProcessListPage'
import MyProcessDetailPage from '@/pages/myProcess/MyProcessDetailPage'
import MyProcessFormPage from '@/pages/myProcess/MyProcessFormPage'
import MyOperationListPage from '@/pages/myOperation/MyOperationListPage'
import MyOperationDetailPage from '@/pages/myOperation/MyOperationDetailPage'
import MyOperationFormPage from '@/pages/myOperation/MyOperationFormPage'
import DictListPage from '@/pages/dict/DictListPage'
import TenantOrgPage from '@/pages/org/TenantOrgPage'
import MemberListPage from '@/pages/member/MemberListPage'
import UnitInfoPage from '@/pages/unitInfo/UnitInfoPage'
import TenantListPage from '@/pages/tenant/TenantListPage'
import TenantDetailPage from '@/pages/tenant/TenantDetailPage'
import TenantFormPage from '@/pages/tenant/TenantFormPage'
import AccountListPage from '@/pages/account/AccountListPage'
import RoleListPage from '@/pages/role/RoleListPage'
import RoleDetailPage from '@/pages/role/RoleDetailPage'
import TenantRoleListPage from '@/pages/role/TenantRoleListPage'
import TenantRoleDetailPage from '@/pages/role/TenantRoleDetailPage'
import MenuListPage from '@/pages/menu/MenuListPage'
import MenuFormPage from '@/pages/menu/MenuFormPage'
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
import CalcRuleListPage from '@/pages/config/CalcRuleListPage'
import CalcRuleFormPage from '@/pages/config/CalcRuleFormPage'
import ReportTemplateListPage from '@/pages/config/ReportTemplateListPage'
import ReportTemplateFormPage from '@/pages/config/ReportTemplateFormPage'
import StorageConfigPage from '@/pages/config/StorageConfigPage'
import MessageConfigPage from '@/pages/config/MessageConfigPage'
import DefaultFactorListPage from '@/pages/factor/DefaultFactorListPage'
import EnergyLedgerListPage from '@/pages/ledger/EnergyLedgerListPage'
import TransportLedgerListPage from '@/pages/ledger/TransportLedgerListPage'
import FileLibraryPage from '@/pages/file/FileLibraryPage'
import NotFoundPage from '@/pages/NotFoundPage'
import LoginPage from '@/pages/login/LoginPage'
import ChangePasswordPage from '@/pages/login/ChangePasswordPage'
import CaseLibraryListPage from '@/pages/caseLibrary/CaseLibraryListPage'
import CaseLibraryFormPage from '@/pages/caseLibrary/CaseLibraryFormPage'
import CaseLibraryDetailPage from '@/pages/caseLibrary/CaseLibraryDetailPage'
import DatasetListPage from '@/pages/dataset/DatasetListPage'
import DataReportListPage from '@/pages/dataset/DataReportListPage'
import AuditListPage from '@/pages/dataset/AuditListPage'
import PublicDatabasePage from '@/pages/dataset/PublicDatabasePage'

/** 骨架阶段：「工作台」「产品库」「工艺流程」「工序」「物料库」「能源库」「计量单位库」「生命周期阶段」「标准文件库」「行业库」「排放因子库」「因子库管理」「模型管理」「数据字典」为完整实现。 */

/** 路由守卫：未登录一律回登录页（会话由 AuthProvider 从 sessionStorage 恢复） */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return children
}

/**
 * 强制改密守卫：账号 `must_change_password = true` 时，除改密页外任何页面都不可达。
 * 中途关闭浏览器无效——标记仍在账号上，下次登录继续拦截。
 */
function RequirePasswordChanged({ children }: { children: JSX.Element }) {
  const { session } = useAuth()
  if (session?.mustChangePassword) return <Navigate to="/change-password" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
    <Routes>
      {/* 登录页独立于 Layout，作为系统入口 */}
      <Route path="/login" element={<LoginPage />} />
      {/* 强制改密页：全屏独立路由，不属于业务布局（无侧栏 / 顶栏 / 关闭入口） */}
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />
        {/* 数据大屏：顶栏「数据驾驶舱」新页签直达，独立于业务布局（无侧栏 / 顶栏 / 面包屑）。
            全屏大屏为演示数据展示页，不挂登录 / 强制改密守卫，避免新页签直达时被重定向到登录页。 */}
        <Route path="/screen" element={<Navigate to="/screen/platform" replace />} />
        <Route path="/screen/enterprise" element={<ScreenPage scope="org" />} />
        <Route path="/screen/platform" element={<ScreenPage scope="platform" />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <RequirePasswordChanged>
                <BasicLayout />
              </RequirePasswordChanged>
            </RequireAuth>
          }
        >
        <Route index element={<Navigate to="/login" replace />} />
        {/* 旧的内嵌驾驶舱链接：直接跳转到无侧栏的全屏大屏，不再出现左侧菜单区域 */}
        <Route path="cockpit" element={<Navigate to="/screen/platform" replace />} />
        <Route path="cockpit/enterprise" element={<Navigate to="/screen/enterprise" replace />} />
        <Route path="cockpit/platform" element={<Navigate to="/screen/platform" replace />} />
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
        {/* 标准文件库（后台 · 基础库；回退至上一版标准文件库：一个标准号 = 一条记录，无版本化） */}
        <Route path="basic/standard" element={<StandardListPage />} />
        <Route path="basic/standard/new" element={<StandardFormPage />} />
        <Route path="basic/standard/:id" element={<StandardDetailPage />} />
        <Route path="basic/standard/:id/edit" element={<StandardFormPage />} />
        {/* 木竹碳专题库（后台 · 碳核算知识库；平台统一维护发布） */}
        <Route path="basic/bamboo-carbon" element={<BambooCarbonListPage />} />
        <Route path="basic/bamboo-carbon/new" element={<BambooCarbonFormPage />} />
        <Route path="basic/bamboo-carbon/:id" element={<BambooCarbonDetailPage />} />
        <Route path="basic/bamboo-carbon/:id/edit" element={<BambooCarbonFormPage />} />
        <Route path="basic/file" element={<Navigate to="/basic/standard" replace />} />
        <Route path="basic/industry" element={<IndustryListPage />} />
        {/* 产品碳基线库（后台 · 系统管理）：行业基线录入（系统预置 + 组织自建，供报告对标引用） */}
        <Route path="baseline/industry" element={<IndustryBaselineListPage />} />
        <Route path="baseline/industry/new" element={<IndustryBaselineFormPage />} />
        <Route path="baseline/industry/:id" element={<IndustryBaselineDetailPage />} />
        <Route path="baseline/industry/:id/edit" element={<IndustryBaselineFormPage />} />
        {/* 产品碳基线库 · 产品碳标签模板：列表 + 新建 / 编辑（左配置 / 右手机预览） */}
        <Route path="baseline/label" element={<CarbonLabelTemplateListPage />} />
        <Route path="baseline/label/new" element={<CarbonLabelTemplateFormPage />} />
        <Route path="baseline/label/:id/edit" element={<CarbonLabelTemplateFormPage />} />
        {/* 平台支撑 · 数据字典：字典类型 + 字典项（系统边界等）轻量维护 */}
        <Route path="system/dict" element={<DictListPage />} />
        {/* 租户端 · 系统管理 · 组织架构：租户维护本租户组织树与组织类型（模块码 org） */}
        <Route path="system/org" element={<TenantOrgPage />} />
        {/* 平台支撑 · 租户管理：开户 / 编辑 / 停用启用 / 真删 / 模块授权 / 主管理员交接 */}
        <Route path="system/tenant" element={<TenantListPage />} />
        {/* 新建 / 编辑走独立内容页（不再用弹窗） */}
        <Route path="system/tenant/new" element={<TenantFormPage />} />
        <Route path="system/tenant/:id/edit" element={<TenantFormPage />} />
        <Route path="system/tenant/:id" element={<TenantDetailPage />} />
        {/* 平台支撑 · 账号管理：平台自有账号（建号授角色 / 改档 / 停启用 / 重置密码 / 注销）；租户成员的兜底运维在租户详情 */}
        {/* 账号管理：新建 / 查看 / 编辑统一以弹窗承载，这里保留旧链接形态（进入后自动弹窗） */}
        <Route path="system/account" element={<AccountListPage />} />
        <Route path="system/account/new" element={<AccountListPage />} />
        <Route path="system/account/:id" element={<AccountListPage />} />
        <Route path="system/account/:id/edit" element={<AccountListPage />} />
        {/* 兼容旧链接：原账号查询 / 全部账号视图已并入统一账号列表 */}
        <Route path="system/account-query" element={<Navigate to="/system/account" replace />} />
        {/* 平台支撑 · 平台角色管理：只维护平台角色（列表 + 新增 / 修改 / 授权弹窗 + 详情含成员页签）；租户角色由租户自建自管，不在此展示 */}
        <Route path="system/role" element={<RoleListPage />} />
        <Route path="system/role/:id" element={<RoleDetailPage />} />
        {/* 平台支撑 · 菜单管理：统一的功能 / 菜单数据源（列表 + 新增 / 编辑 + 启停 + 删除；角色权限从此勾选） */}
        <Route path="system/menu" element={<MenuListPage />} />
        <Route path="system/menu/new" element={<MenuFormPage />} />
        <Route path="system/menu/:id/edit" element={<MenuFormPage />} />
        {/* 因子库管理（后台 · 模型管理）：多库（商业数据库 / 自建库）+ 库级版本 + 发布 */}
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
        {/* 前台 · 我的模型（组织级：自建 + 收藏副本同权，均可查看/编辑/删除） */}
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
        {/* 产品碳足迹 · 含碳量检测库（基础数据台账）：列表 + 弹窗（新增 / 编辑 / 查看）+ 上架下架 + 删除 + 导出 */}
        <Route path="pcf/carbon-detection" element={<CarbonDetectionListPage />} />
        {/* 产品碳足迹 · 台账管理（基础数据台账）：加工能耗台账 / 运输台账，列表 + 弹窗（新增 / 编辑 / 查看）+ 导入 + 导出 + 删除 */}
        <Route path="ledger/energy" element={<EnergyLedgerListPage />} />
        <Route path="ledger/transport" element={<TransportLedgerListPage />} />
        {/* 产品碳足迹 · 文件管理：企业文件库（租户级文件资产）— 列表 + 详情抽屉 + 上传 / 升版 + 预览 + 统一选择器演示 */}
        <Route path="file/library" element={<FileLibraryPage />} />
        {/* 知识中心 · 木竹碳专题知识（业务前端只读：平台统一发布，企业不维护） */}
        <Route path="knowledge/bamboo-carbon" element={<KnowledgeTopicListPage />} />
        <Route path="knowledge/bamboo-carbon/:id" element={<KnowledgeTopicDetailPage />} />
        {/* 知识中心 · 标准规范（业务前端只读：与后台「标准规范库」同源，业务人员查阅标准信息 / 来源链接 / 附件预览） */}
        <Route path="knowledge/standard" element={<KnowledgeStandardListPage />} />
        <Route path="knowledge/standard/:id" element={<KnowledgeStandardDetailPage />} />
        {/* 知识中心 · 典型案例（业务前端只读：与后台「典型案例库」同源，仅已发布；平台统一维护发布，全员可见） */}
        <Route path="knowledge/case" element={<KnowledgeCaseListPage />} />
        <Route path="knowledge/case/:id" element={<KnowledgeCaseDetailPage />} />
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
        {/* 我的工序库（前台 · 组织自建工序）：列表 + 详情 + 新增 / 编辑；来源二态（平台工序复制副本 / 自己新增，均可编辑） */}
        <Route path="pcf/my-operation" element={<MyOperationListPage />} />
        <Route path="pcf/my-operation/new" element={<MyOperationFormPage />} />
        <Route path="pcf/my-operation/:id" element={<MyOperationDetailPage />} />
        <Route path="pcf/my-operation/:id/edit" element={<MyOperationFormPage />} />
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
        {/* 租户端 · 系统管理 · 成员管理：本租户成员全生命周期（新建 / 关联已有账号 / 编辑 / 停用启用 / 移出 / 重置密码 / 有效权限） */}
        <Route path="system/member" element={<MemberListPage />} />
        {/* 租户端 · 系统管理 · 角色管理：本租户角色自建自管（列表 + 新增 / 修改 / 复制 / 授权[功能 + 数据范围] / 停启用 / 删除 + 详情含成员页签）；与平台侧「平台角色管理」完全隔离 */}
        <Route path="system/tenant-role" element={<TenantRoleListPage />} />
        <Route path="system/tenant-role/:id" element={<TenantRoleDetailPage />} />
        {/* 租户端 · 系统管理 · 租户信息：法定资质只读，联络展示与业务属性可自助编辑，保存立即生效（业务 PRD V0.10） */}
        <Route path="system/unit-info" element={<UnitInfoPage />} />
        {/* 系统参数配置（后台 · 系统管理）：核算规则 / 默认因子 / 报告模板 / 存储配置 / 消息配置 */}
        <Route path="config/calc-rule" element={<CalcRuleListPage />} />
        <Route path="config/calc-rule/new" element={<CalcRuleFormPage />} />
        <Route path="config/calc-rule/:id" element={<CalcRuleFormPage />} />
        <Route path="config/calc-rule/:id/edit" element={<CalcRuleFormPage />} />
        <Route path="config/report-template" element={<ReportTemplateListPage />} />
        <Route path="config/report-template/new" element={<ReportTemplateFormPage />} />
        <Route path="config/report-template/:id" element={<ReportTemplateFormPage />} />
        <Route path="config/report-template/:id/edit" element={<ReportTemplateFormPage />} />
        <Route path="config/storage" element={<StorageConfigPage />} />
        <Route path="config/message" element={<MessageConfigPage />} />
        {/* 默认因子：系统参数配置（不再置于模型管理下） */}
        <Route path="config/factor-default" element={<DefaultFactorListPage />} />
        {/* 典型案例库（管理后台 · 系统管理）：列表 + 新增/编辑(独立页) + 详情 + 删除 */}
        <Route path="case/library" element={<CaseLibraryListPage />} />
        <Route path="case/library/new" element={<CaseLibraryFormPage />} />
        <Route path="case/library/:id" element={<CaseLibraryDetailPage />} />
        <Route path="case/library/:id/edit" element={<CaseLibraryFormPage />} />
        {/* 数据管理（前台 · 业务端）：行业数据集 —— 只读查看后台当前已发布版本（数据 / 统计分析双 Tab） */}
        <Route path="dataset/records" element={<DatasetListPage />} />
        {/* 数据管理 · 企业数据上报：已核算碳数据一键上报的唯一入口 → 企业补充区域/数据质量说明 → 平台审核 */}
        <Route path="dataset/report" element={<DataReportListPage />} />
        {/* 数据集管理（平台 · 系统管理）：企业上报数据审核（只读核对 + 通过入库 / 驳回退回企业） */}
        <Route path="dataset/audit" element={<AuditListPage />} />
        {/* 数据集管理（平台 · 系统管理）：公共数据库 —— 实时入库数据 + 版本发布 */}
        <Route path="dataset/public" element={<PublicDatabasePage />} />
        <Route path="*" element={<NotFoundPage />} />
        </Route>
    </Routes>
    </AuthProvider>
  )
}
