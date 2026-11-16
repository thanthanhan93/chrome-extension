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
      func: async () => {
        try {
          return { data: await window.__facebookCommentCopy.collect() };
        } catch (error) {
          return { error: error.message };
        }
      }
    });
    if (!execution?.result) throw new Error('Trang không trả về kết quả. Hãy tải lại trang và thử lại.');
    if (execution.result.error) throw new Error(execution.result.error);
    const { comments, reason } = execution.result.data;
    if (!comments.length) {
      statusMessage.textContent = `Không tìm thấy bình luận. ${reason}`;
      return;
    }
    const groups = new Map();
    comments.forEach((comment, index) => {
      const parent = comment.parentIndex;
      if (parent === null || !groups.has(parent)) groups.set(index, [`${comment.unlinkedReply ? '[Phản hồi chưa xác định bình luận gốc] ' : ''}${comment.author}: ${comment.text}`]);
      else groups.get(parent).push(`  ${comment.author}: ${comment.text}`);
    });
    const text = [...groups.values()].flat().join('\n');
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
