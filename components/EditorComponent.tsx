import React, { useEffect, useRef, memo } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import { uploadFile } from '../lib/appwrite';

interface EditorComponentProps {
  data?: OutputData;
  onChange: (data: OutputData) => void;
  holder: string;
  onReady?: () => void;
}

const EditorComponent: React.FC<EditorComponentProps> = ({ data, onChange, holder, onReady }) => {
  const ref = useRef<EditorJS | null>(null);

  useEffect(() => {
    // If there is an existing instance, destroy it first to ensure clean state
    if (ref.current && typeof ref.current.destroy === 'function') {
         ref.current.destroy();
         ref.current = null;
    }

    const initEditor = async () => {
      const Header = (await import('@editorjs/header')).default;
      const List = (await import('@editorjs/list')).default;
      const ImageTool = (await import('@editorjs/image')).default;
      const Quote = (await import('@editorjs/quote')).default;
      const Embed = (await import('@editorjs/embed')).default;
      const Delimiter = (await import('@editorjs/delimiter')).default;
      const Checklist = (await import('@editorjs/checklist')).default;
      const Marker = (await import('@editorjs/marker')).default;
      const InlineCode = (await import('@editorjs/inline-code')).default;
      const CodeTool = (await import('@editorjs/code')).default;
      const Table = (await import('@editorjs/table')).default;
      const Warning = (await import('@editorjs/warning')).default;
      const Raw = (await import('@editorjs/raw')).default;

      if(ref.current) return;

      const editor = new EditorJS({
        holder: holder,
        placeholder: 'Tell your story...',
        tools: {
          header: {
              class: Header,
              config: {
                  placeholder: 'Enter a header',
                  levels: [1, 2, 3, 4],
                  defaultLevel: 2
              }
          },
          list: {
              class: List,
              inlineToolbar: true,
          },
          checklist: {
              class: Checklist,
              inlineToolbar: true,
          },
          quote: Quote,
          delimiter: Delimiter,
          embed: Embed,
          table: Table,
          warning: Warning,
          raw: Raw,
          marker: {
              class: Marker,
              shortcut: 'CMD+SHIFT+M',
          },
          inlineCode: {
              class: InlineCode,
              shortcut: 'CMD+SHIFT+C',
          },
          code: CodeTool,
          image: {
            class: ImageTool,
            config: {
              uploader: {
                uploadByFile: async (file: File) => {
                  try {
                      const url = await uploadFile(file);
                      return {
                          success: 1,
                          file: {
                              url: url
                          }
                      }
                  } catch (e) {
                      console.error("Image upload failed", e);
                      return { success: 0 };
                  }
                }
              }
            }
          }
        },
        data: data,
        onReady: () => {
            if(onReady) onReady();
        },
        async onChange(api, event) {
          const content = await api.saver.save();
          onChange(content);
        },
      });
      ref.current = editor;
    };

    initEditor();

    return () => {
      if (ref.current && typeof ref.current.destroy === 'function') {
        ref.current.destroy();
        ref.current = null;
      }
    };
    // Re-initialize if the `holder` or the `data` (via key prop in parent) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holder]); 

  return <div id={holder} className="prose prose-lg max-w-none font-serif dark:prose-invert" />;
};

export default memo(EditorComponent);