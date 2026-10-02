(async () => {
  // Nạp động file core dưới dạng một Module thực thụ
  const src = chrome.runtime.getURL('src/content/content-core.js');
  await import(src);
})();
