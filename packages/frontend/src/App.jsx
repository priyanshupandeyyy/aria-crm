import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Segments from './pages/Segments';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Analytics from './pages/Analytics';
import AriaAssistant from './pages/AriaAssistant';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/segments" element={<Segments />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/aria" element={<AriaAssistant />} />
      </Routes>
    </Layout>
  );
}
