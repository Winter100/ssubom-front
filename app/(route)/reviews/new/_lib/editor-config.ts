import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import { Plugin } from '@tiptap/pm/state';
import { countBodyImages, MAX_BODY_IMAGES } from './review-limits';

const ReviewImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        filterTransaction: (transaction, state) => {
          const event: unknown = transaction.getMeta('uiEvent');
          if (!transaction.docChanged || (event !== 'paste' && event !== 'drop')) {
            return true;
          }
          const nextCount = countBodyImages(transaction.doc.toJSON());
          return (
            nextCount <= MAX_BODY_IMAGES ||
            nextCount <= countBodyImages(state.doc.toJSON())
          );
        },
      }),
    ];
  },
});

export const createExtensions = () => [
  StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
  ReviewImage.configure({
    allowBase64: true,
    resize: {
      enabled: true,
      directions: ['bottom-right'],
      minWidth: 50,
      minHeight: 50,
      alwaysPreserveAspectRatio: true,
    },
  }),
];

// 에디터 css
export const richTextClasses = `text-sm leading-2 text-stone-600 break-words
  [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[#202a26]
  [&_h3]:mt-7 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#202a26]
  [&_p]:my-4 [&_strong]:font-semibold [&_strong]:text-[#202a26]
  [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6
  [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-[#9eaf8e] [&_blockquote]:pl-5 [&_blockquote]:italic
  [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-2xl [&_hr]:my-8 [&_hr]:border-stone-200
  [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-stone-100 [&_pre]:p-4`
  .replace(/\s+/g, ' ')
  .trim();

export const readImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('JPG, PNG, WebP 이미지를 선택해 주세요.'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('이미지는 한 장당 2MB 이하로 선택해 주세요.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('이미지를 읽지 못했습니다.'));
    };
    reader.onerror = () =>
      reject(new Error('이미지를 읽지 못했습니다. 다시 선택해 주세요.'));
    reader.readAsDataURL(file);
  });
