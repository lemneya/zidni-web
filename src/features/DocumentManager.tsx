import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Trash2, Eye, Search, File, FileCode, FileImage } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadFile } from '../services/zidniApi';

interface Document {
  id: number;
  name: string;
  type: string;
  size: string;
  date: string;
  content?: string;
}

export function DocumentManager() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const saved = localStorage.getItem('zidni_documents');
    if (saved) {
      setDocuments(JSON.parse(saved));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadFile(file);
        const newDoc: Document = {
          id: uploaded.id,
          name: uploaded.originalName,
          type: uploaded.mimeType,
          size: formatFileSize(uploaded.size),
          date: new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US'),
          content: uploaded.content,
        };
        const updated = [...documents, newDoc];
        setDocuments(updated);
        localStorage.setItem('zidni_documents', JSON.stringify(updated));
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  };

  const handleDelete = (id: number) => {
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    localStorage.setItem('zidni_documents', JSON.stringify(updated));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="w-5 h-5 text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('code') || type.includes('javascript')) return <FileCode className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{t('documentManager.title')}</h1>
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{t('documentManager.subtitle')}</p>
          </div>
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer ${isRTL ? 'font-arabic' : ''}`}>
          <Upload className="w-4 h-4" />
          {t('documentManager.upload')}
          <input type="file" multiple onChange={handleUpload} className="hidden" />
        </label>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-4"
      >
        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-kimi-text-muted`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRTL ? 'البحث في المستندات...' : 'Search documents...'}
          className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-kimi-border rounded-xl outline-none focus:ring-2 focus:ring-orange-300 ${isRTL ? 'font-arabic' : ''}`}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Document List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-1/3 bg-white rounded-2xl border border-kimi-border overflow-hidden flex flex-col"
        >
          <div className="p-3 border-b border-kimi-border bg-kimi-bg-sidebar">
            <p className={`text-sm text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>
              {filteredDocs.length} {isRTL ? 'مستند' : 'documents'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-kimi-text-muted">
                <FileText className="w-12 h-12 mb-2 opacity-30" />
                <p className={isRTL ? 'font-arabic' : ''}>{t('documentManager.noDocuments')}</p>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${isRTL ? 'text-right' : 'text-left'} ${
                    selectedDoc?.id === doc.id
                      ? 'bg-orange-100 border border-orange-200'
                      : 'hover:bg-kimi-bg-hover'
                  }`}
                >
                  {getFileIcon(doc.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-kimi-text truncate ${isRTL ? 'font-arabic' : ''}`}>{doc.name}</p>
                    <p className="text-xs text-kimi-text-muted">{doc.size} • {doc.date}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>

        {/* Document Viewer */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 bg-white rounded-2xl border border-kimi-border overflow-hidden flex flex-col"
        >
          {selectedDoc ? (
            <>
              {/* Toolbar */}
              <div className={`flex items-center justify-between p-3 border-b border-kimi-border bg-kimi-bg-sidebar ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(selectedDoc.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('documentManager.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className={`text-sm font-medium text-kimi-text ${isRTL ? 'font-arabic' : ''}`}>{selectedDoc.name}</h3>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 overflow-auto">
                {selectedDoc.type.startsWith('image/') ? (
                  <div className="flex items-center justify-center h-full">
                    <div className={`text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>{isRTL ? '[معاينة الصورة]' : '[Image Preview]'}</div>
                  </div>
                ) : selectedDoc.content ? (
                  <pre className={`whitespace-pre-wrap text-sm text-kimi-text leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                    {selectedDoc.content.substring(0, 5000)}
                  </pre>
                ) : (
                  <div className={`flex items-center justify-center h-full text-kimi-text-muted ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL ? 'لا يوجد محتوى قابل للعرض' : 'No viewable content'}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-kimi-text-muted">
              <Eye className="w-16 h-16 mb-4 opacity-30" />
              <p className={isRTL ? 'font-arabic' : ''}>{isRTL ? 'اختر مستنداً للعرض' : 'Select a document to view'}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
