import {Routes, Route} from 'react-router-dom'
import {CommonLayout} from '@wps/layout'
import { Navbar } from './components/layout/mainNavbar'

import * as Pages from './pages'
import { Footer } from './components/layout/footer'

function App() {
  return (
    <Routes>
      <Route element={<CommonLayout navbar={<Navbar />} footer={<Footer />} />}>
        <Route path="/" element={<Pages.Home />} />
        <Route path="/services" element={<Pages.Services />} />
        <Route path="/contact" element={<Pages.Contact />} />
        <Route path="/company" element={<Pages.Company />} />
        <Route path="/services/discounts" element={<Pages.Discount />} />
        <Route path="/terms-of-service" element={<Pages.TermsOfService />} />
        <Route path="/privacy-policy" element={<Pages.Privacy />} />
        <Route path="/positions" element={<Pages.Positions />} />
        <Route path="/positions/:id" element={<Pages.JobDetail />} />

        <Route path="*" element={<Pages.ErrorPage />} />
        <Route path="/404" element={<Pages.ErrorPage />} />
      </Route>
      <Route path="/sitemap.xml" />
    </Routes>
  )
}

export default App
