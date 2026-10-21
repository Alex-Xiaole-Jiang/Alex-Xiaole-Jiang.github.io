// Render math only inside write-ups. Kramdown emits \[...\] for display math;
// inline expressions retain their Markdown-editor-friendly $...$ delimiters.
if (window.renderMathInElement) {
  document.querySelectorAll('.writeup').forEach((element) => {
    renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    });
  });
}
