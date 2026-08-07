import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import QueryManager from './pages/QueryManager.jsx';
import LeadReview from './pages/LeadReview.jsx';
import Console from './pages/Console.jsx';
import BusinessProfile from './pages/BusinessProfile.jsx';
import Campaigns from './pages/Campaigns.jsx';
import OwnerProfile from './pages/OwnerProfile.jsx';

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
        <Route path="/owner-profile" element={<OwnerProfile />} />
      </Routes>
    </Layout>
  );
}
