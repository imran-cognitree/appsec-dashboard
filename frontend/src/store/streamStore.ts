import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uploadDataset, streamDatasetContent } from '../lib/api';
import type { DatasetUploadResult } from '../lib/api';

interface StreamState {
  uploadedDataset: DatasetUploadResult | null;
  isUploading: boolean;
  isStreaming: boolean;
  streamedContent: string;
  bytesReceived: number;
  chunkCount: number;
  isComplete: boolean;
  errorMessage: string | null;

  // Actions
  upload: (file: File) => Promise<void>;
  startStream: () => Promise<void>;
  stopStream: () => void;
  resetStream: () => void;
  clearAll: () => void;
}

let activeAbortController: AbortController | null = null;

export const useStreamStore = create<StreamState>()(
  persist(
    (set, get) => ({
      uploadedDataset: null,
      isUploading: false,
      isStreaming: false,
      streamedContent: '',
      bytesReceived: 0,
      chunkCount: 0,
      isComplete: false,
      errorMessage: null,

      upload: async (file: File) => {
        try {
          set({
            isUploading: true,
            errorMessage: null,
            streamedContent: '',
            bytesReceived: 0,
            chunkCount: 0,
            isComplete: false,
          });
          const result = await uploadDataset(file);
          set({ uploadedDataset: result, isUploading: false });
        } catch (err: any) {
          set({
            isUploading: false,
            errorMessage: err.message || 'Failed to upload dataset.',
          });
          throw err;
        }
      },

      startStream: async () => {
        const { uploadedDataset, isStreaming } = get();
        if (!uploadedDataset || isStreaming) return;

        if (activeAbortController) {
          activeAbortController.abort();
        }

        const controller = new AbortController();
        activeAbortController = controller;

        set({
          isStreaming: true,
          isComplete: false,
          errorMessage: null,
          streamedContent: '',
          bytesReceived: 0,
          chunkCount: 0,
        });

        try {
          await streamDatasetContent(uploadedDataset.id, {
            signal: controller.signal,
            onChunk: (chunkText, bytes) => {
              set((state) => ({
                streamedContent: state.streamedContent + chunkText,
                bytesReceived: bytes,
                chunkCount: state.chunkCount + 1,
              }));
            },
          });
          set({ isComplete: true, isStreaming: false });
        } catch (err: any) {
          if (err.name === 'AbortError') {
            set({ errorMessage: 'Stream cancelled by user.', isStreaming: false });
          } else {
            set({ errorMessage: err.message || 'Stream connection failed.', isStreaming: false });
          }
        } finally {
          activeAbortController = null;
          set({ isStreaming: false });
        }
      },

      stopStream: () => {
        if (activeAbortController) {
          activeAbortController.abort();
          activeAbortController = null;
        }
        set({ isStreaming: false });
      },

      resetStream: () => {
        if (activeAbortController) {
          activeAbortController.abort();
          activeAbortController = null;
        }
        set({
          isStreaming: false,
          isComplete: false,
          streamedContent: '',
          bytesReceived: 0,
          chunkCount: 0,
          errorMessage: null,
        });
      },

      clearAll: () => {
        if (activeAbortController) {
          activeAbortController.abort();
          activeAbortController = null;
        }
        set({
          uploadedDataset: null,
          isUploading: false,
          isStreaming: false,
          streamedContent: '',
          bytesReceived: 0,
          chunkCount: 0,
          isComplete: false,
          errorMessage: null,
        });
      },
    }),
    {
      name: 'dataset-stream-storage',
      partialize: (state) => ({
        uploadedDataset: state.uploadedDataset,
        streamedContent: state.streamedContent,
        bytesReceived: state.bytesReceived,
        chunkCount: state.chunkCount,
        isComplete: state.isComplete,
      }),
    }
  )
);
