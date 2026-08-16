import { Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Console />} />
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
  );
}
