import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { WebsiteGenerator } from './features/WebsiteGenerator';
import { DocumentManager } from './features/DocumentManager';
import { PPTGenerator } from './features/PPTGenerator';
import { SpreadsheetEditor } from './features/SpreadsheetEditor';
import { DeepResearch } from './features/DeepResearch';
import { CodePlayground } from './features/CodePlayground';
import { AboutPage } from './features/AboutPage';
import { MobileApp } from './features/MobileApp';
import ChannelManager from './features/ChannelManager';
import AgentManager from './features/AgentManager';
import { initLanguage } from './i18n';
import './App.css';

function App() {
  const { i18n } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    // Initialize language on mount
    initLanguage();
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-white flex" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className={`flex-1 ${isRTL ? 'mr-60' : 'ml-60'} min-h-screen`}>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/websites" element={<WebsiteGenerator />} />
            <Route path="/documents" element={<DocumentManager />} />
            <Route path="/ppt" element={<PPTGenerator />} />
            <Route path="/sheets" element={<SpreadsheetEditor />} />
            <Route path="/research" element={<DeepResearch />} />
            <Route path="/code" element={<CodePlayground />} />
            <Route path="/mobile" element={<MobileApp />} />
            <Route path="/channels" element={<ChannelManager />} />
            <Route path="/agents" element={<AgentManager />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

function ChatPage() {
  return (
    <div className="flex flex-col h-screen py-8 px-4">
      <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto">
        <Chat />
      </div>
    </div>
  );
}

export default App;
