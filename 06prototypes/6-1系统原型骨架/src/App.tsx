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
import FactorListPage from '@/pages/factor/FactorListPage'
import FactorDetailPage from '@/pages/factor/FactorDetailPage'
import FactorFormPage from '@/pages/factor/FactorFormPage'
import CalcFormulaListPage from '@/pages/calcEngine/CalcFormulaListPage'
import CalcFormulaDetailPage from '@/pages/calcEngine/CalcFormulaDetailPage'
import CalcFormulaFormPage from '@/pages/calcEngine/CalcFormulaFormPage'
import ProjectListPage from '@/pages/pcf/ProjectListPage'
import ProductProjectListPage from '@/pages/pcf/ProductProjectListPage'
import ProjectWorkbenchPage from '@/pages/pcf/ProjectWorkbenchPage'
import MyProductListPage from '@/pages/myProduct/MyProductListPage'
import MyProductDetailPage from '@/pages/myProduct/MyProductDetailPage'
import MyProductFormPage from '@/pages/myProduct/MyProductFormPage'
import PlaceholderPage from '@/pages/PlaceholderPage'
import NotFoundPage from '@/pages/NotFoundPage'

/** 骨架阶段：仅「工作台」「产品库」「工艺流程」「工序」「物料库」「能源库」「计量单位库」「生命周期阶段」「行业库」「排放因子库」「计算公式」「模型管理」为完整实现，其余模块用占位页承载路由。 */
const PLACEHOLDERS: Array<{ path: string; title: string; breadcrumb: string[] }> = [
  { path: 'basic/standard', title: '标准文件库', breadcrumb: ['后台管理', '基础库'] },
  { path: 'model/allocation', title: '分配规则管理', breadcrumb: ['后台管理', '核算配置'] },
  { path: 'pcf/my-process', title: '我的工艺库', breadcrumb: ['前台业务平台'] },
  { path: 'system/org', title: '组织架构', breadcrumb: ['后台管理', '平台支撑'] },
  { path: 'system/user', title: '用户与角色', breadcrumb: ['后台管理', '平台支撑'] },
  { path: 'system/dict', title: '数据字典', breadcrumb: ['后台管理', '平台支撑'] },
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
        <Route path="basic/industry" element={<IndustryListPage />} />
        {/* 排放因子库（后台 · 核算模型） */}
        <Route path="model/factor" element={<FactorListPage />} />
        <Route path="model/factor/new" element={<FactorFormPage />} />
        <Route path="model/factor/:id" element={<FactorDetailPage />} />
        <Route path="model/factor/:id/edit" element={<FactorFormPage />} />
        {/* 我的因子库（前台 · 组织自建） */}
        <Route path="pcf/my-factor" element={<FactorListPage mode="frontend" />} />
        <Route path="pcf/my-factor/new" element={<FactorFormPage />} />
        <Route path="pcf/my-factor/:id" element={<FactorDetailPage />} />
        <Route path="pcf/my-factor/:id/edit" element={<FactorFormPage />} />
        {/* 计算引擎配置（后台 · 核算模型）：只保留计算公式；阶段归属与排放源绑定在建模时配置 */}
        <Route path="model/calc-engine" element={<CalcFormulaListPage />} />
        <Route path="model/calc-engine/new" element={<CalcFormulaFormPage />} />
        <Route path="model/calc-engine/:id" element={<CalcFormulaDetailPage />} />
        <Route path="model/calc-engine/:id/edit" element={<CalcFormulaFormPage />} />
        {/* 前台业务平台 · 产品碳足迹核算（两层列表 / 项目工作台壳） */}
        <Route path="pcf/project" element={<ProjectListPage />} />
        {/* 新建核算草稿：按产品带入步骤①，**保存后才落库**（未保存不产生核算记录） */}
        <Route path="pcf/project/new/:productId" element={<ProjectWorkbenchPage />} />
        <Route path="pcf/project/product/:productId" element={<ProductProjectListPage />} />
        <Route path="pcf/project/:id" element={<ProjectWorkbenchPage />} />
        <Route path="pcf/project/:id/:step" element={<ProjectWorkbenchPage />} />
        {/* 我的产品库（前台 · 组织自建）：列表 + 详情 + 新增 / 编辑；产品来源二态（引用标准产品只读 / 自己新增） */}
        <Route path="pcf/my-product" element={<MyProductListPage />} />
        <Route path="pcf/my-product/new" element={<MyProductFormPage />} />
        <Route path="pcf/my-product/:id" element={<MyProductDetailPage />} />
        <Route path="pcf/my-product/:id/edit" element={<MyProductFormPage />} />
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
