let extractedContent = ''; // 存储提取的内容
let summaryContent = ''; // 存储总结内容

// 标签页切换逻辑
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.getAttribute('data-tab');
    
    // 更新标签状态
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
      content.style.display = 'none';
    });
    const targetContent = document.getElementById(`${targetId}-content`);
    targetContent.classList.add('active');
    targetContent.style.display = 'flex';
  });
});

// 添加加载状态的辅助函数
function setLoading(element, isLoading) {
  if (isLoading) {
    element.classList.add('loading');
    element.disabled = true;
  } else {
    element.classList.remove('loading');
    element.disabled = false;
  }
}

// 显示复制成功的动画
function showCopySuccess(button, originalText) {
  button.textContent = '已复制！';
  button.classList.add('copy-success');
  
  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('copy-success');
  }, 1500);
}

document.getElementById('extract').addEventListener('click', async () => {
  const extractBtn = document.getElementById('extract');
  const resultDiv = document.getElementById('result');
  const summarizeBtn = document.getElementById('summarize');
  const summaryDiv = document.getElementById('summary');
  const summaryContentDiv = document.getElementById('summaryContent');
  
  try {
    setLoading(extractBtn, true);
    extractBtn.innerHTML = `
      <span class="icon loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 4v2m0 12v2M4 12h2m12 0h2m-9.9-5.5l1.4 1.4m5.6 5.6l1.4 1.4M6.5 6.5l1.4 1.4m5.6 5.6l1.4 1.4"/>
        </svg>
      </span>
      正在提取...
    `;
    
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 发送消息给content script
    const response = await chrome.tabs.sendMessage(tab.id, {action: 'extractProgress'});
    
    if (response.success) {
      // 格式化内容
      extractedContent = response.data
        .map(item => `#${item.index}\n${item.content}`)
        .join('\n\n');
      
      // 显示提取的内容，标题加大加粗
      resultDiv.innerHTML = extractedContent
        .split('\n')
        .map(line => {
          if (line.match(/^#\d+$/)) {
            return `<div style="font-size: 1.2em; font-weight: 600; margin-top: 16px; color: var(--text-primary);">${line}</div>`;
          }
          return `<div style="margin: 8px 0;">${line.replace(/\[图片URL:(.*?)\]/g, '<a href="$1" target="_blank" style="color: var(--primary-color); text-decoration: none;">[查看图片]</a>')}</div>`;
        })
        .join('');
      
      // 启用AI总结按钮
      summarizeBtn.disabled = false;
      summaryContent = '';
    } else {
      resultDiv.innerHTML = `<div style="color: #FF3B30; padding: 16px;">提取失败: ${response.error}</div>`;
      extractedContent = '';
      summarizeBtn.disabled = true;
      summaryContent = '';
    }
  } catch (error) {
    resultDiv.innerHTML = `<div style="color: #FF3B30; padding: 16px;">发生错误: ${error.message}</div>`;
    extractedContent = '';
    summarizeBtn.disabled = true;
    summaryContent = '';
  } finally {
    setLoading(extractBtn, false);
    extractBtn.innerHTML = `
      <span class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      </span>
      提取进展
    `;
  }
});

// 复制按钮功能
document.getElementById('copy').addEventListener('click', async () => {
  const copyBtn = document.getElementById('copy');
  
  if (!extractedContent) {
    alert('请先提取内容！');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(extractedContent);
    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = `
      <span class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      </span>
      已复制
    `;
    copyBtn.classList.add('copy-success');
    
    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
      copyBtn.classList.remove('copy-success');
    }, 1500);
  } catch (error) {
    alert('复制失败: ' + error.message);
  }
});

// AI总结按钮功能
document.getElementById('summarize').addEventListener('click', async () => {
  if (!extractedContent) {
    alert('请先提取内容！');
    return;
  }
  
  const summarizeBtn = document.getElementById('summarize');
  const summaryDiv = document.getElementById('summary');
  const summaryContentDiv = document.getElementById('summaryContent');
  
  try {
    setLoading(summarizeBtn, true);
    summarizeBtn.innerHTML = `
      <span class="icon loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 4v2m0 12v2M4 12h2m12 0h2m-9.9-5.5l1.4 1.4m5.6 5.6l1.4 1.4M6.5 6.5l1.4 1.4m5.6 5.6l1.4 1.4"/>
        </svg>
      </span>
      正在总结...
    `;
    summaryContentDiv.innerHTML = '<div class="loading" style="padding: 16px;">正在生成总结，请稍候...</div>';
    
    // 调用API
    summaryContent = await callGLM4API(extractedContent);
    
    // 显示总结结果
    summaryContentDiv.innerHTML = summaryContent
      .split('\n')
      .map(line => `<div style="margin: 8px 0;">${line}</div>`)
      .join('');
  } catch (error) {
    summaryContentDiv.innerHTML = `<div style="color: #FF3B30; padding: 16px;">总结生成失败: ${error.message}</div>`;
    summaryContent = '';
  } finally {
    setLoading(summarizeBtn, false);
    summarizeBtn.innerHTML = `
      <span class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </span>
      开始总结
    `;
  }
});

// 复制总结按钮功能
document.getElementById('copySummary').addEventListener('click', async () => {
  const copySummaryBtn = document.getElementById('copySummary');
  
  if (!summaryContent) {
    alert('请先生成总结！');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(summaryContent);
    const originalHTML = copySummaryBtn.innerHTML;
    copySummaryBtn.innerHTML = `
      <span class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      </span>
      已复制
    `;
    copySummaryBtn.classList.add('copy-success');
    
    setTimeout(() => {
      copySummaryBtn.innerHTML = originalHTML;
      copySummaryBtn.classList.remove('copy-success');
    }, 1500);
  } catch (error) {
    alert('复制失败: ' + error.message);
  }
}); 