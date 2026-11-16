const button = document.getElementById('copy');
const statusMessage = document.getElementById('status');
const resultBox = document.getElementById('result');

button.addEventListener('click', async () => {
  button.disabled = true;
  resultBox.hidden = true;
  statusMessage.textContent = 'Đang mở thêm bình luận. Hãy giữ cửa sổ này mở.';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (url.protocol !== 'https:' || !['facebook.com', 'www.facebook.com'].includes(url.hostname)) {
      throw new Error('Hãy mở một bài viết trên www.facebook.com trước.');
    }
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['collector.js'] });
    const [execution] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__facebookCommentCopy.collect()
    });
    const { comments, reason } = execution.result;
    if (!comments.length) {
      statusMessage.textContent = `Không tìm thấy bình luận. ${reason}`;
      return;
    }
    const text = comments.map(({ author, text }) => `${author}: ${text}`).join('\n');
    resultBox.value = text;
    try {
      await navigator.clipboard.writeText(text);
      statusMessage.textContent = `Đã copy ${comments.length} bình luận và phản hồi. ${reason}`;
    } catch {
      resultBox.hidden = false;
      resultBox.select();
      statusMessage.textContent = `Không thể ghi clipboard. Hãy copy nội dung bên dưới. ${reason}`;
    }
  } catch (error) {
    statusMessage.textContent = `Không thể lấy bình luận. ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
