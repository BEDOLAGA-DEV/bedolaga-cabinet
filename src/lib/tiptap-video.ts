import { Node, mergeAttributes } from '@tiptap/core';

/**
 * TipTap extension for inline <video> elements.
 *
 * Without this extension, TipTap does not recognize <video> tags and
 * serializes them as escaped text when calling editor.getHTML().
 */
export const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: '' },
      class: { default: null },
      preload: { default: 'metadata' },
    };
  },

  parseHTML() {
    return [{ tag: 'video' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)];
  },
});
