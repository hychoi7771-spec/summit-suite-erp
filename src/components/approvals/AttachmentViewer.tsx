import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Printer, Download, ExternalLink, RotateCw } from 'lucide-react';

export type AttachmentEntry = { name: string; url: string };

const OFFICE_EXT = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

export function getExt(name: string) {
  return (name.split('.').pop() || '').toLowerCase();
}

export function isViewable(name: string) {
  const ext = getExt(name);
  return ext === 'pdf' || OFFICE_EXT.includes(ext) || IMAGE_EXT.includes(ext);
}

export function AttachmentViewer({
  attachment,
  open,
  onClose,
}: {
  attachment: AttachmentEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [rotate, setRotate] = useState(0);

  if (!attachment) return null;
  const ext = getExt(attachment.name);
  const isPdf = ext === 'pdf';
  const isOffice = OFFICE_EXT.includes(ext);
  const isImage = IMAGE_EXT.includes(ext);

  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(attachment.url)}`;

  const handlePrint = () => {
    if (isPdf || isImage) {
      const w = window.open(attachment.url, '_blank');
      if (w) {
        w.addEventListener('load', () => {
          try { w.print(); } catch { /* ignore */ }
        });
      }
    } else {
      // For office files, open the office viewer's print page
      window.open(officeViewerUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base truncate pr-8">
            <span className="truncate">{attachment.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 flex-wrap">
          {(isPdf || isImage) && (
            <>
              <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(25, z - 25))} className="gap-1">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-14 text-center">{zoom}%</span>
              <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(400, z + 25))} className="gap-1">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setZoom(100); setRotate(0); }} className="text-xs">
                100%
              </Button>
              {isImage && (
                <Button size="sm" variant="outline" onClick={() => setRotate(r => (r + 90) % 360)}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {isOffice && (
            <span className="text-xs text-muted-foreground px-2">
              Office 문서는 뷰어 내부의 확대/축소 기능을 사용하세요
            </span>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" /> 인쇄
          </Button>
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <a href={attachment.url} download={attachment.name}>
              <Download className="h-4 w-4" /> 다운로드
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> 새 창
            </a>
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-muted/20">
          {isPdf && (
            <div style={{ width: `${zoom}%`, height: '100%', minHeight: '100%' }} className="mx-auto">
              <iframe
                src={`${attachment.url}#view=FitH`}
                title={attachment.name}
                className="w-full h-full border-0"
                style={{ minHeight: '75vh' }}
              />
            </div>
          )}
          {isOffice && (
            <iframe
              src={officeViewerUrl}
              title={attachment.name}
              className="w-full h-full border-0"
              style={{ minHeight: '75vh' }}
            />
          )}
          {isImage && (
            <div className="flex items-center justify-center p-4 min-h-full">
              <img
                src={attachment.url}
                alt={attachment.name}
                style={{
                  width: `${zoom}%`,
                  maxWidth: 'none',
                  transform: `rotate(${rotate}deg)`,
                  transition: 'transform 0.2s',
                }}
              />
            </div>
          )}
          {!isPdf && !isOffice && !isImage && (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                이 파일 형식은 미리보기를 지원하지 않습니다. 다운로드 후 확인해주세요.
              </p>
              <Button asChild>
                <a href={attachment.url} download={attachment.name} className="gap-1.5">
                  <Download className="h-4 w-4" /> 다운로드
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
