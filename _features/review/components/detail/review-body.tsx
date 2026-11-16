import Image from 'next/image';
import type { JSONContent } from '@tiptap/react';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import { createExtensions } from '../../lib/editor-config';
import { getReviewImageUrl } from '../../lib/review-image';

const getDimension = (value: unknown): number | undefined => {
  const dimension = typeof value === 'string' ? Number(value) : value;
  return typeof dimension === 'number' &&
    Number.isFinite(dimension) &&
    dimension > 0
    ? dimension
    : undefined;
};

const ReviewBody = ({ content }: { content: JSONContent }) =>
  renderToReactElement({
    content,
    extensions: createExtensions(),
    options: {
      nodeMapping: {
        image: ({ node }) => {
          const attrs: Record<string, unknown> = node.attrs;
          const src = getReviewImageUrl(
            typeof attrs.src === 'string' ? attrs.src : null,
          );
          if (!src) return null;
          const width = getDimension(attrs.width);
          const height = getDimension(attrs.height);

          return (
            <Image
              src={src}
              alt={typeof attrs.alt === 'string' ? attrs.alt : ''}
              title={typeof attrs.title === 'string' ? attrs.title : undefined}
              width={width ?? 0}
              height={height ?? 0}
              unoptimized={width === undefined || height === undefined}
              style={{ width: width ?? 'auto', maxWidth: '100%', height: 'auto' }}
            />
          );
        },
      },
    },
  });

export default ReviewBody;
