import type { JSONContent } from '@tiptap/react';
import { readImage } from './editor-config';

export const replaceImageSources = (
  node: JSONContent,
  sources: ReadonlyMap<string, string>,
): JSONContent => ({
  ...node,
  ...(node.type === 'image' && typeof node.attrs?.src === 'string'
    ? { attrs: { ...node.attrs, src: sources.get(node.attrs.src) ?? node.attrs.src } }
    : {}),
  ...(node.content
    ? { content: node.content.map((child) => replaceImageSources(child, sources)) }
    : {}),
});

export const getImageSources = (node: JSONContent): string[] => {
  const sources = new Set<string>();
  const visit = (current: JSONContent): void => {
    if (current.type === 'image' && typeof current.attrs?.src === 'string') {
      sources.add(current.attrs.src);
    }
    current.content?.forEach(visit);
  };
  visit(node);
  return [...sources];
};

export const createLocalImage = (file: File): string => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG, WebP 이미지를 선택해 주세요.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('이미지는 한 장당 5MB 이하로 선택해 주세요.');
  }
  return URL.createObjectURL(file);
};

export const serializeImages = async (
  sources: string[],
  files: ReadonlyMap<string, File>,
): Promise<Map<string, string>> => {
  const entries = await Promise.all(
    sources.map(async (source): Promise<[string, string]> => {
      const file = files.get(source);
      if (source.startsWith('blob:') && !file) {
        throw new Error('이미지 원본을 찾을 수 없습니다.');
      }
      return [source, file ? await readImage(file) : source];
    }),
  );
  return new Map(entries);
};
