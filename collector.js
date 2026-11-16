(() => {
  const labels = [
    /^(?:xem|hiển thị) (?:thêm )?(?:\d+[\s,.]*)?(?:bình luận|phản hồi)(?: khác| trước| trước đó| nữa)?$/iu,
    /^xem (?:tất cả|thêm) (?:\d+[\s,.]*)?(?:bình luận|phản hồi)(?: khác| trước| trước đó| nữa)?$/iu,
    /^(?:view|see) (?:more|all|previous) (?:\d+[\s,.]*)?(?:comments|replies)(?:\s*\(\d+\))?$/iu,
    /^view \d+ (?:more |previous )?(?:comments|replies)$/iu
  ];
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const visible = element => Boolean(element.getClientRects().length);
  const label = element => (element.innerText || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
  const owns = (article, element) => element.closest('[role="article"]') === article;

  function findRoot() {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    if (dialogs.length === 1) return dialogs[0];
    if (dialogs.length > 1) throw new Error('Có nhiều hộp thoại đang mở. Hãy mở riêng một bài viết.');
    const main = document.querySelector('[role="main"]');
    if (!main) throw new Error('Không tìm thấy bài viết. Hãy mở riêng bài viết.');
    const posts = [...main.querySelectorAll('[role="article"]')].filter(article =>
      visible(article) && !article.parentElement.closest('[role="article"]')
    );
    if (posts.length !== 1) throw new Error('Hãy mở riêng một bài viết thay vì trang có nhiều bài.');
    return posts[0];
  }

  function readComment(article) {
    const heading = [...article.querySelectorAll('h3, h4, [role="heading"]')]
      .find(element => owns(article, element) && element.querySelector('a'));
    const author = heading?.querySelector('a')?.innerText?.trim();
    if (!author) return null;
    const textElement = [...article.querySelectorAll('[dir="auto"]')].find(element =>
      owns(article, element) && !heading.contains(element) &&
      !element.closest('a, button, [role="button"], [role="heading"]') &&
      element.innerText?.trim()
    );
    const text = textElement?.innerText?.trim();
    return text ? { author, text } : null;
  }

  async function collect() {
    const root = findRoot();
    const comments = [];
    const seenElements = new WeakSet();
    const seenLinks = new Set();
    const stalled = new WeakSet();
    const collectVisible = () => {
      for (const article of root.querySelectorAll('[role="article"]')) {
        if (!visible(article) || seenElements.has(article)) continue;
        const comment = readComment(article);
        if (!comment) continue;
        seenElements.add(article);
        const link = [...article.querySelectorAll('a[href*="comment_id="]')]
          .find(element => owns(article, element))?.href;
        if (link && seenLinks.has(link)) continue;
        if (link) seenLinks.add(link);
        comments.push(comment);
      }
    };
    let limitReached = false;
    for (let count = 0; count < 100; count++) {
      collectVisible();
      const control = [...root.querySelectorAll('button, [role="button"]')].find(element =>
        visible(element) && !stalled.has(element) && labels.some(pattern => pattern.test(label(element)))
      );
      if (!control) break;
      const before = label(control);
      const countBefore = root.querySelectorAll('[role="article"]').length;
      control.click();
      await pause(800);
      if (label(control) === before && root.querySelectorAll('[role="article"]').length === countBefore) {
        stalled.add(control);
      }
      if (count === 99) limitReached = true;
    }
    collectVisible();
    return {
      comments,
      reason: limitReached
        ? 'Đã dừng sau nhiều lần tải. Kết quả có thể chưa đầy đủ.'
        : 'Không thể xác nhận đã lấy đủ. Facebook có thể lọc, ẩn hoặc chưa tải bình luận.'
    };
  }

  window.__facebookCommentCopy = { collect };
})();
