import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import QueryManager from './pages/QueryManager.jsx';
import LeadReview from './pages/LeadReview.jsx';
import Console from './pages/Console.jsx';
import BusinessProfile from './pages/BusinessProfile.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import Offers from './pages/Offers.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import ExcludedDomains from './pages/ExcludedDomains.jsx';
import IntegrationsSettings from './pages/IntegrationsSettings.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsOfService from './pages/TermsOfService.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public, Layout-free — must be reachable without the app's sidebar/header
          chrome, since these URLs are submitted to Google for OAuth verification review. */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              {/* Redirect rather than rendering Console directly here — the Sidebar's
                  "Businesses" NavLink only matches "/console", so landing on "/" without
                  actually navigating there left it unhighlighted despite showing the same page. */}
              <Route path="/" element={<Navigate to="/console" replace />} />
              <Route path="/queries" element={<QueryManager />} />
              <Route path="/leads" element={<LeadReview />} />
              <Route path="/console" element={<Console />} />
              <Route path="/businesses/:id" element={<BusinessProfile />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/excluded-domains" element={<ExcludedDomains />} />
              <Route path="/settings/integrations" element={<IntegrationsSettings />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
