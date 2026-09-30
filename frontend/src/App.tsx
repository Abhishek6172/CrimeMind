import React from 'react';
import { useApp } from './store/AppContext';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './features/landing/LandingPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { InvestigationsPage } from './features/investigations/InvestigationsPage';
import { EvidencePage } from './features/evidence/EvidencePage';
import { RelationshipGraphPage } from './features/graph/RelationshipGraphPage';
import { PersonProfilePage } from './features/persons/PersonProfilePage';
import { LocationIntelligencePage } from './features/locations/LocationIntelligencePage';
import { CCTVIntelligencePage } from './features/cctv/CCTVIntelligencePage';
import { AssistantPage } from './features/assistant/AssistantPage';
import { AgentsPage } from './features/agents/AgentsPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';

export const App: React.FC = () => {
  const { currentRoute } = useApp();

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'landing':
        return <LandingPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'investigations':
      case 'case-detail':
        return <InvestigationsPage />;
      case 'evidence':
        return <EvidencePage />;
      case 'relationship-graph':
      case 'graph':
        return <RelationshipGraphPage />;
      case 'person-profile':
        return <PersonProfilePage />;
      case 'location-intelligence':
      case 'locations':
        return <LocationIntelligencePage />;
      case 'cctv':
        return <CCTVIntelligencePage />;
      case 'assistant':
        return <AssistantPage />;
      case 'agents':
        return <AgentsPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <LandingPage />;
    }
  };

  return <MainLayout>{renderCurrentPage()}</MainLayout>;
};

export default App;
