import { Navigate, Route, Routes } from "react-router-dom"
import Layout from "@/components/layout/Layout"
import ProtectedRoute from "@/routes/ProtectedRoute"
import Login from "@/pages/auth/Login"
import Dashboard from "@/pages/Dashboard"
import AdminList from "@/pages/admins/AdminList"
import CreateAdmin from "@/pages/admins/CreateAdmin"
import CompanyList from "@/pages/companies/CompanyList"
import CompanyForm from "@/pages/companies/CompanyForm"
import CompanyDetail from "@/pages/companies/CompanyDetail"
import TermsList from "@/pages/terms/TermsList"
import TermForm from "@/pages/terms/TermForm"
import ProductList from "@/pages/products/ProductList"
import ProductForm from "@/pages/products/ProductForm"
import ProductDetail from "@/pages/products/ProductDetail"
import QuotationList from "@/pages/quotations/QuotationList"
import QuotationCreate from "@/pages/quotations/QuotationCreate"
import QuotationDetail from "@/pages/quotations/QuotationDetail"
import CompanyQuotations from "@/pages/quotations/CompanyQuotations"
import EmailTemplateList from "@/pages/emailTemplates/EmailTemplateList"
import EmailTemplateForm from "@/pages/emailTemplates/EmailTemplateForm"
import { ROLES } from "@/utils/constants"

const guarded = (page, roles) => (
  <ProtectedRoute roles={roles}>
    <Layout>{page}</Layout>
  </ProtectedRoute>
)

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={guarded(<Dashboard />)} />
      <Route path="/admins" element={guarded(<AdminList />)} />
      <Route path="/admins/create" element={guarded(<CreateAdmin />, [ROLES.SUPER_ADMIN])} />
      <Route path="/companies" element={guarded(<CompanyList />)} />
      <Route path="/companies/create" element={guarded(<CompanyForm />)} />
      <Route path="/companies/:companyId" element={guarded(<CompanyDetail />)} />
      <Route path="/companies/:companyId/edit" element={guarded(<CompanyForm />)} />
      <Route path="/terms" element={guarded(<TermsList />)} />
      <Route path="/terms/create" element={guarded(<TermForm />)} />
      <Route path="/terms/:termId/edit" element={guarded(<TermForm />)} />
      <Route path="/products" element={guarded(<ProductList />)} />
      <Route path="/products/create" element={guarded(<ProductForm />)} />
      <Route path="/products/:productId" element={guarded(<ProductDetail />)} />
      <Route path="/products/:productId/edit" element={guarded(<ProductForm />)} />
      <Route path="/quotations" element={guarded(<QuotationList />)} />
      <Route path="/quotations/create" element={guarded(<QuotationCreate />)} />
      <Route path="/quotations/companies" element={guarded(<CompanyQuotations />)} />
      <Route path="/quotations/:quotationId" element={guarded(<QuotationDetail />)} />
      <Route path="/quotations/:quotationId/edit" element={guarded(<QuotationCreate />)} />
      <Route path="/email-templates" element={guarded(<EmailTemplateList />)} />
      <Route path="/email-templates/create" element={guarded(<EmailTemplateForm />)} />
      <Route path="/email-templates/:templateId/edit" element={guarded(<EmailTemplateForm />)} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
