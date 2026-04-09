/** Minimal shape for @mention resolution (matches StudioElement media fields). */
export type MentionElementLike = {
  name: string;
  imageBase64?: string;
  imageUrl?: string;
};

/**
 * @mention tokens in Studio v2 prompts. Element names are slugified with
 * [a-z0-9_-]; hyphens must be included or "@my-character" only matches "@my".
 */
export const STUDIO_V2_MENTION_RE = /@[\w-]+/g;

export function extractMentionTokens(prompt: string): string[] {
  return [...new Set(prompt.match(STUDIO_V2_MENTION_RE) ?? [])];
}

/**
 * Resolves @mentions to elements in first-appearance order (max 3).
 * Only includes elements that have an image (base64 or URL).
 */
export function resolveMentionedElementsWithTokensInOrder(
  promptText: string,
  elements: MentionElementLike[],
): { elements: MentionElementLike[]; tokens: string[] } {
  const mentionTokens = extractMentionTokens(promptText);
  const outEls: MentionElementLike[] = [];
  const outTok: string[] = [];
  for (const token of mentionTokens) {
    const el = elements.find((e) => e.name === token.slice(1));
    if (el && (el.imageBase64 || el.imageUrl)) {
      outEls.push(el);
      outTok.push(token);
      if (outEls.length >= 3) break;
    }
  }
  return { elements: outEls, tokens: outTok };
}

/**
 * Kling v3 image-to-video expects @Element1, @Element2, @Element3 in the prompt
 * to bind the `elements[]` payload (see Kling multi-element / element library docs).
 * User-facing @my_character mentions are rewritten to those slots in array order.
 * @deprecated — image2video does not support elements[]. Use buildKlingMultiImagePrompt
 * for the multi-image2video endpoint instead.
 */
export function buildKlingV3ElementPrompt(
  promptText: string,
  resolvedMentionTokensInOrder: string[],
): string {
  let out = promptText;
  resolvedMentionTokensInOrder.forEach((token, i) => {
    const slot = i + 1;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "g"), `@Element${slot}`);
  });
  return out;
}

/**
 * Kling multi-image2video uses <<<image_N>>> syntax in the prompt to bind each
 * image in the `image_list[]` payload. User-facing @my_character mentions are
 * rewritten to <<<image_1>>>, <<<image_2>>>, <<<image_3>>> in first-appearance order.
 */
export function buildKlingMultiImagePrompt(
  promptText: string,
  resolvedMentionTokensInOrder: string[],
): string {
  let out = promptText;
  resolvedMentionTokensInOrder.forEach((token, i) => {
    const slot = i + 1;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "g"), `<<<image_${slot}>>>`);
  });
  return out;
}
