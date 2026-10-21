import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import {
  UploadCloud,
  FileCheck,
  Download,
  Play,
  Square,
  AlertCircle,
  Loader2,
  Database,
  Terminal,
} from 'lucide-react';
import { uploadDataset, streamDatasetContent } from '../../lib/api';
import type { DatasetUploadResult } from '../../lib/api';
import './DataStreamDemo.css';

export function DataStreamDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDataset, setUploadedDataset] = useState<DatasetUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [bytesReceived, setBytesReceived] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const terminalRef = useRef<HTMLPreElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll the streaming preview to the bottom as new lines arrive
  useEffect(() => {
    if (terminalRef.current && isStreaming) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [streamedContent, isStreaming]);

  // Clean up any ongoing stream on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadedDataset(null);
      setStreamedContent('');
      setBytesReceived(0);
      setChunkCount(0);
      setIsComplete(false);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);
      const result = await uploadDataset(selectedFile);
      setUploadedDataset(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartStream = async () => {
    if (!uploadedDataset) return;

    setStreamedContent('');
    setBytesReceived(0);
    setChunkCount(0);
    setIsComplete(false);
    setErrorMessage(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamDatasetContent(uploadedDataset.id, {
        signal: controller.signal,
        onChunk: (chunkText, bytes) => {
          setStreamedContent((prev) => prev + chunkText);
          setBytesReceived(bytes);
          setChunkCount((prev) => prev + 1);
        },
      });
      setIsComplete(true);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setErrorMessage('Stream cancelled by user.');
      } else {
        setErrorMessage(err.message || 'Stream connection failed.');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSaveFile = () => {
    if (!streamedContent || !uploadedDataset) return;
    const blob = new Blob([streamedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `streamed_${uploadedDataset.filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stream-demo" aria-label="Dataset Stream Demo">
      <div className="stream-demo__header">
        <div className="stream-demo__icon-wrap">
          <Database size={20} />
        </div>
        <div>
          <h2 className="stream-demo__title">Dataset Ingestion & Progressive Streaming</h2>
          <p className="stream-demo__subtitle">
            Upload any CSV or JSON file and stream the response chunk-by-chunk using FastAPI StreamingResponse &amp; Browser ReadableStream.
          </p>
        </div>
      </div>

      <div className="stream-demo__section">
        <div className="stream-demo__upload-bar">
          <input
            ref={fileInputRef}
            type="file"
            id="stream-demo-file-input"
            className="stream-demo__file-input"
            onChange={handleFileChange}
            accept=".csv,.json,.txt"
          />
          <button
            type="button"
            className="stream-demo__btn stream-demo__btn--secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isStreaming}
          >
            <UploadCloud size={16} />
            {selectedFile ? 'Change File' : 'Select File'}
          </button>

          <span className="stream-demo__filename">
            {selectedFile ? selectedFile.name : 'No file chosen (CSV, JSON, or TXT)'}
          </span>

          <button
            type="button"
            id="btn-upload-dataset"
            className="stream-demo__btn stream-demo__btn--primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || isStreaming}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="stream-demo__spinner" />
                Uploading…
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>

        {uploadedDataset && (
          <div className="stream-demo__badge stream-demo__badge--success">
            <FileCheck size={14} />
            <span>
              Ready: <strong>{uploadedDataset.filename}</strong> (ID: <code>{uploadedDataset.id}</code>)
            </span>
          </div>
        )}
      </div>

      {uploadedDataset && (
        <div className="stream-demo__section stream-demo__controller">
          <div className="stream-demo__controls">
            {!isStreaming ? (
              <button
                type="button"
                id="btn-start-stream"
                className="stream-demo__btn stream-demo__btn--accent"
                onClick={handleStartStream}
              >
                <Play size={15} />
                Start Stream Download
              </button>
            ) : (
              <button
                type="button"
                id="btn-stop-stream"
                className="stream-demo__btn stream-demo__btn--danger"
                onClick={handleStopStream}
              >
                <Square size={14} />
                Stop Stream
              </button>
            )}

            {isComplete && (
              <button
                type="button"
                id="btn-save-stream"
                className="stream-demo__btn stream-demo__btn--success"
                onClick={handleSaveFile}
              >
                <Download size={15} />
                Save Downloaded File
              </button>
            )}
          </div>

          {(isStreaming || isComplete || chunkCount > 0) && (
            <div className="stream-demo__metrics">
              <div className="stream-demo__metric">
                <span className="stream-demo__metric-label">Status</span>
                <span className={`stream-demo__metric-value ${isStreaming ? 'stream-demo__pulse' : ''}`}>
                  {isStreaming ? 'STREAMING...' : isComplete ? 'COMPLETED' : 'STOPPED'}
                </span>
              </div>
              <div className="stream-demo__metric">
                <span className="stream-demo__metric-label">Bytes Transferred</span>
                <span className="stream-demo__metric-value font-mono">
                  {(bytesReceived / 1024).toFixed(2)} KB
                </span>
              </div>
              <div className="stream-demo__metric">
                <span className="stream-demo__metric-label">Chunks Received</span>
                <span className="stream-demo__metric-value font-mono">{chunkCount}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="stream-demo__alert stream-demo__alert--error">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {(isStreaming || streamedContent.length > 0) && (
        <div className="stream-demo__terminal-wrap">
          <div className="stream-demo__terminal-header">
            <Terminal size={14} />
            <span>Progressive Stream Output (Chunked Transfer)</span>
            {isStreaming && <Loader2 size={12} className="stream-demo__spinner stream-demo__terminal-spinner" />}
          </div>
          <pre ref={terminalRef} className="stream-demo__terminal">
            {streamedContent}
          </pre>
        </div>
      )}
    </div>
  );
}
