import type { Editor, JSONContent } from '@tiptap/react';
import { DRAFT_KEY, parseDraft } from './draft';
import type { ReviewFields } from './review-types';
import {
  createLocalImage,
  getImageSources,
  replaceImageSources,
  serializeImages,
} from './local-images';

export const restoreReviewDraft = async (
  current: Editor,
  files: Map<string, File>,
): Promise<ReviewFields | null> => {
  const restoredUrls: string[] = [];
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const { body: savedBody, ...rest } = parseDraft(raw);
    const body: unknown = JSON.parse(savedBody);
    const document = current.schema.nodeFromJSON(body);
    document.check();
    if (document.type.name !== 'doc') throw new Error('Invalid document');
    const savedDocument: JSONContent = document.toJSON();
    const sources = new Map<string, string>();
    const restoreImage = async (source: string): Promise<string> => {
      if (!source.startsWith('data:image/')) return source;
      const response = await fetch(source);
      const blob = await response.blob();
      if (current.isDestroyed) throw new Error('Editor destroyed');
      const file = new File([blob], 'draft-image', { type: blob.type });
      const url = createLocalImage(file);
      files.set(url, file);
      restoredUrls.push(url);
      return url;
    };
    for (const source of getImageSources(savedDocument)) {
      sources.set(source, await restoreImage(source));
    }
    const image = await restoreImage(rest.image);
    if (current.isDestroyed) throw new Error('Editor destroyed');
    current.commands.setContent(
      replaceImageSources(savedDocument, sources),
      {
        emitUpdate: false,
      },
    );
    return { ...rest, image };
  } catch (cause: unknown) {
    restoredUrls.forEach((url) => {
      URL.revokeObjectURL(url);
      files.delete(url);
    });
    throw cause;
  }
};

export const saveReviewDraft = async (
  draftFields: ReviewFields,
  body: JSONContent,
  files: ReadonlyMap<string, File>,
): Promise<void> => {
  const sources = await serializeImages(
    [...new Set([draftFields.image, ...getImageSources(body)])],
    files,
  );
  window.localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      ...draftFields,
      image: sources.get(draftFields.image) ?? draftFields.image,
      body: JSON.stringify(replaceImageSources(body, sources)),
    }),
  );
};
