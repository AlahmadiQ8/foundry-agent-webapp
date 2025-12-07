import type { ICitation } from '../types/chat';

/**
 * Inserts inline citation markers into text based on citation start/end indices.
 * Citations are inserted as markdown links with superscript numbers.
 * 
 * @param content - The original text content
 * @param citations - Array of citations with startIndex and endIndex
 * @returns Text with inline citation markers inserted as markdown links
 * 
 * @example
 * const content = "Azure provides cloud services. Microsoft offers many solutions.";
 * const citations = [
 *   { uri: "https://azure.com", title: "Azure", startIndex: 0, endIndex: 29 },
 *   { uri: "https://microsoft.com", title: "MS", startIndex: 30, endIndex: 63 }
 * ];
 * // Returns: "Azure provides cloud services.<sup>[1](https://azure.com)</sup> Microsoft offers many solutions.<sup>[2](https://microsoft.com)</sup>"
 */
export function insertInlineCitations(content: string, citations?: ICitation[]): string {
  if (!citations || citations.length === 0) {
    return content;
  }
  
  // Filter citations that have valid indices
  const validCitations = citations
    .map((citation, index) => ({ ...citation, originalIndex: index }))
    .filter(c => 
      c.startIndex !== null && 
      c.startIndex !== undefined &&
      c.startIndex >= 0 &&
      c.startIndex <= content.length
    );

  if (validCitations.length === 0) {
    return content;
  }

  // Sort by startIndex in descending order (insert from end to start to preserve indices)
  const sortedCitations = validCitations.sort((a, b) => (b.startIndex ?? 0) - (a.startIndex ?? 0));
  
  let result = content;

  // Insert citations from end to start to preserve string indices
  for (const citation of sortedCitations) {
    const insertPosition = citation.startIndex!;
    const citationNumber = citation.originalIndex! + 1;
    
    // Insert markdown link with superscript citation marker at start position
    const citationMarker = `<sup>\[[${citationNumber}]\](${citation.uri})</sup>`;
    result = result.slice(0, insertPosition) + citationMarker + result.slice(insertPosition);
  }

  return result;
}
