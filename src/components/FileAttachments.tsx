import { motion } from 'framer-motion';
import { X, FileText, Image, FileCode, FileSpreadsheet } from 'lucide-react';

interface AttachedFile {
  id: number;
  name: string;
  type: string;
}

interface FileAttachmentsProps {
  files: AttachedFile[];
  onRemove: (fileId: number) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return FileSpreadsheet;
  if (mimeType.includes('javascript') || mimeType.includes('python') || mimeType.includes('code')) return FileCode;
  return FileText;
}

export function FileAttachments({ files, onRemove }: FileAttachmentsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-2 border-t border-kimi-border bg-kimi-bg-sidebar"
    >
      <p className="text-xs text-kimi-text-muted mb-2 font-arabic">الملفات المرفقة:</p>
      <div className="flex flex-wrap gap-2">
        {files.map((file) => {
          const Icon = getFileIcon(file.type);
          return (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-kimi-border rounded-lg"
            >
              <Icon className="w-4 h-4 text-kimi-text-secondary" />
              <span className="text-sm text-kimi-text font-arabic truncate max-w-[150px]">
                {file.name}
              </span>
              <button
                onClick={() => onRemove(file.id)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-kimi-bg-hover transition-colors"
              >
                <X className="w-3 h-3 text-kimi-text-muted" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
