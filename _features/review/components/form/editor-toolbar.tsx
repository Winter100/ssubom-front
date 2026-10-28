'use client';

import { useEditorState, type Editor } from '@tiptap/react';

const EditorToolbar = ({
  editor,
  onImage,
  imageDisabled,
}: {
  editor: Editor;
  onImage: () => void;
  imageDisabled: boolean;
}) => {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      heading: current.isActive('heading', { level: 2 })
        ? '2'
        : current.isActive('heading', { level: 3 })
          ? '3'
          : 'paragraph',
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      bullet: current.isActive('bulletList'),
      ordered: current.isActive('orderedList'),
      quote: current.isActive('blockquote'),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const tools = [
    {
      label: '굵게',
      text: 'B',
      active: active.bold,
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: '기울임',
      text: 'I',
      active: active.italic,
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: '글머리 기호 목록',
      text: '• 목록',
      active: active.bullet,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: '번호 목록',
      text: '1. 목록',
      active: active.ordered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '인용문',
      text: '“ 인용',
      active: active.quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];
  return (
    <div
      role='group'
      aria-label='본문 편집 도구'
      className='flex flex-wrap items-center gap-1.5 border-b border-stone-200 bg-[#f8faf6] p-3'
    >
      <label>
        <span className='sr-only'>문단 스타일</span>
        <select
          value={active.heading}
          onChange={(event) => {
            const value = event.target.value;
            if (value === '2' || value === '3')
              editor
                .chain()
                .focus()
                .setHeading({ level: value === '2' ? 2 : 3 })
                .run();
            else editor.chain().focus().setParagraph().run();
          }}
          className='mr-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs outline-emerald-700'
        >
          <option value='paragraph'>본문</option>
          <option value='2'>큰 제목</option>
          <option value='3'>작은 제목</option>
        </select>
      </label>
      {tools.map((tool) => (
        <button
          type='button'
          key={tool.label}
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={tool.active}
          onClick={tool.action}
          className={`min-h-9 min-w-9 cursor-pointer rounded-lg px-2.5 text-xs font-semibold outline-emerald-700 transition-colors ${tool.active ? 'bg-[#dce9dc] text-[#23745b]' : 'text-stone-600 hover:bg-stone-200/60'}`}
        >
          {tool.text}
        </button>
      ))}
      <button
        type='button'
        onClick={onImage}
        disabled={imageDisabled}
        className='min-h-9 cursor-pointer rounded-lg px-2.5 text-xs text-stone-600 outline-emerald-700 hover:bg-stone-200/60 disabled:cursor-default disabled:opacity-40'
      >
        ＋ 이미지
      </button>
      <div className='ml-auto flex gap-1'>
        <button
          type='button'
          aria-label='실행 취소'
          title='실행 취소'
          disabled={!active.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
          className='size-9 cursor-pointer rounded-lg hover:bg-stone-200/60 disabled:cursor-default disabled:opacity-30'
        >
          ↶
        </button>
        <button
          type='button'
          aria-label='다시 실행'
          title='다시 실행'
          disabled={!active.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
          className='size-9 cursor-pointer rounded-lg hover:bg-stone-200/60 disabled:cursor-default disabled:opacity-30'
        >
          ↷
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
