(() => {
  const labels = [
    /^(?:xem|hiển thị) (?:thêm )?(?:\d+[\s,.]*)?(?:bình luận|phản hồi)(?: khác| trước| trước đó| nữa)?$/iu,
    /^xem (?:tất cả|thêm) (?:\d+[\s,.]*)?(?:bình luận|phản hồi)(?: khác| trước| trước đó| nữa)?$/iu,
    /^(?:view|see) (?:more|all|previous) (?:\d+[\s,.]*)?(?:comments|replies)(?:\s*\(\d+\))?$/iu,
    /^view \d+ (?:more |previous )?(?:comments?|repl(?:y|ies))$/iu
  ];
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const visible = element => Boolean(element.getClientRects().length);
  const label = element => (element.innerText || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
  const owns = (article, element) => element.closest('[role="article"]') === article;

  function findRoot() {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(dialog =>
      visible(dialog) && [...dialog.querySelectorAll('[role="article"]')].some(article => visible(article) && readComment(article))
    );
    const innermost = dialogs.filter(dialog => !dialogs.some(other => other !== dialog && dialog.contains(other)));
    if (innermost.length === 1) return innermost[0];
    if (innermost.length > 1) throw new Error('Có nhiều bài viết đang mở. Hãy mở riêng một bài viết.');
    const main = document.querySelector('[role="main"]');
    if (!main) throw new Error('Không tìm thấy bài viết. Hãy mở riêng bài viết.');
    const posts = [...main.querySelectorAll('[role="article"]')].filter(article =>
      visible(article) && [...article.querySelectorAll('[role="article"]')].some(comment => visible(comment) && readComment(comment))
    );
    if (posts.length !== 1) throw new Error('Hãy mở riêng một bài viết thay vì trang có nhiều bài.');
    return posts[0];
  }

  function readComment(article) {
    const heading = [...article.querySelectorAll('h3, h4, [role="heading"]')]
      .find(element => owns(article, element) && element.querySelector('a'));
    const authorLink = heading?.querySelector('a') || [...article.querySelectorAll('a[role="link"]')]
      .find(element => owns(article, element) && element.querySelector('[dir="auto"]') && element.innerText.trim());
    const author = authorLink?.innerText?.trim();
    if (!author) return null;
    const textElement = [...article.querySelectorAll('[dir="auto"]')].find(element =>
      owns(article, element) && !heading?.contains(element) &&
      !element.closest('a, button, [role="button"], [role="heading"]') &&
      element.innerText?.trim()
    );
    const text = textElement?.innerText?.trim();
    return text ? { author, text } : null;
  }

  async function selectAllComments(root) {
    const filter = [...root.querySelectorAll('button, [role="button"]')].find(element =>
      visible(element) && /^(?:most relevant|newest|all comments|phù hợp nhất|mới nhất|tất cả bình luận)\s*$/iu.test(label(element))
    );
    if (!filter) return false;
    if (/^(?:all comments|tất cả bình luận)$/iu.test(label(filter))) return true;
    const findOption = () => [...document.querySelectorAll('[role="menuitem"], [role="option"]')].find(element =>
      visible(element) && /^(?:all comments|tất cả bình luận)(?:\s|$)/iu.test(label(element))
    );
    let option = findOption();
    if (!option) {
      filter.click();
      await pause(500);
      option = findOption();
    }
    if (!option) return false;
    option.click();
    await pause(1200);
    return /^(?:all comments|tất cả bình luận)$/iu.test(label(filter));
  }

  function scrollFurther(root) {
    let moved = false;
    const elements = [...root.querySelectorAll('*')];
    for (let element = root; element; element = element.parentElement) elements.push(element);
    for (const element of elements) {
      if (!visible(element) || element.scrollHeight <= element.clientHeight + 1 ||
          !/^(auto|scroll)$/u.test(getComputedStyle(element).overflowY)) continue;
      const before = element.scrollTop;
      element.scrollTop = Math.min(element.scrollTop + Math.max(element.clientHeight * 0.8, 100), element.scrollHeight);
      moved ||= element.scrollTop !== before;
    }
    const rect = root.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      const before = window.scrollY;
      window.scrollBy(0, Math.min(rect.bottom - window.innerHeight, window.innerHeight * 0.8));
      moved ||= window.scrollY !== before;
    }
    return moved;
  }

  async function collect() {
    let root = findRoot();
    const selectedAll = await selectAllComments(root);
    root = findRoot();
    const comments = [];
    const seenElements = new WeakSet();
    const commentIndexes = new WeakMap();
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
        let ancestor = article.parentElement?.closest('[role="article"]');
        let parentIndex = null;
        while (ancestor && root.contains(ancestor)) {
          if (commentIndexes.has(ancestor)) parentIndex = commentIndexes.get(ancestor);
          ancestor = ancestor.parentElement?.closest('[role="article"]');
        }
        commentIndexes.set(article, parentIndex ?? comments.length);
        const isUnlinkedReply = parentIndex === null && /^(?:reply|phản hồi)\b/iu.test(article.getAttribute('aria-label') || '');
        comments.push({ ...comment, parentIndex, ...(isUnlinkedReply ? { unlinkedReply: true } : {}) });
      }
    };
    let limitReached = false;
    let idleRounds = 0;
    for (let count = 0; count < 150; count++) {
      collectVisible();
      const control = [...root.querySelectorAll('button, [role="button"]')].find(element =>
        visible(element) && !stalled.has(element) && labels.some(pattern => pattern.test(label(element)))
      );
      const countBefore = root.querySelectorAll('[role="article"]').length;
      const commentsBefore = comments.length;
      if (control) {
        const before = label(control);
        control.click();
        await pause(800);
        if (label(control) === before && root.querySelectorAll('[role="article"]').length === countBefore) {
          stalled.add(control);
        }
        idleRounds = 0;
      } else {
        const moved = scrollFurther(root);
        await pause(800);
        collectVisible();
        idleRounds = !moved && comments.length === commentsBefore && root.querySelectorAll('[role="article"]').length === countBefore
          ? idleRounds + 1 : 0;
        if (idleRounds >= 3) break;
      }
      if (count === 149) limitReached = true;
    }
    collectVisible();
    return {
      comments,
      reason: `${selectedAll ? '' : 'Không xác nhận được bộ lọc Tất cả bình luận. '}${limitReached
        ? 'Đã dừng sau nhiều lần tải. Kết quả có thể chưa đầy đủ.'
        : 'Không thể xác nhận đã lấy đủ. Facebook có thể lọc, ẩn hoặc chưa tải bình luận.'} Quan hệ phản hồi chỉ được nhận diện khi cấu trúc trang thể hiện rõ.`
    };
  }

  window.__facebookCommentCopy = { collect };
})();
