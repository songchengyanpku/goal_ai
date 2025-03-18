let extractedContent = ''; // 存储提取的内容
let summaryContent = ''; // 存储总结内容

// 初始化按钮状态
document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copy');
  const summarizeBtn = document.getElementById('summarize');
  copyBtn.disabled = true;
  summarizeBtn.disabled = true;
});


// 显示AI总结弹窗
function showSummaryModal() {
  const modal = document.getElementById('summaryModal');
  const overlay = document.getElementById('summaryOverlay');
  modal.classList.add('active');
  overlay.classList.add('active');
}

// 隐藏AI总结弹窗
function hideSummaryModal() {
  const modal = document.getElementById('summaryModal');
  const overlay = document.getElementById('summaryOverlay');
  modal.classList.remove('active');
  overlay.classList.remove('active');
}

// 关闭弹窗按钮事件
document.getElementById('closeSummary').addEventListener('click', hideSummaryModal);

// 点击遮罩层关闭弹窗
document.getElementById('summaryOverlay').addEventListener('click', hideSummaryModal);

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

// 显示进展选择对话框
async function showProgressSelection() {
  const progressSelection = document.getElementById('progressSelection');
  const progressOverlay = document.getElementById('progressOverlay');
  const progressList = document.getElementById('progressList');
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  try {
    // 获取所有进展项
    const response = await chrome.tabs.sendMessage(tab.id, {action: 'getProgressList'});
    
    if (response.success) {
      // 清空并填充复选框列表
      progressList.innerHTML = response.data.map((item, index) => `
        <div class="checkbox-item">
          <input type="checkbox" id="progress-${index}" value="${index}" checked>
          <label for="progress-${index}">进展 #${index + 1}</label>
        </div>
      `).join('');
      
      // 显示对话框和遮罩层
      progressSelection.classList.add('active');
      progressOverlay.classList.add('active');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    // 显示错误提示模态框
    const errorModal = document.getElementById('errorModal');
    const errorOverlay = document.getElementById('errorOverlay');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = '获取进展列表失败: ' + error.message;
    errorModal.classList.add('active');
    errorOverlay.classList.add('active');
    
    // 绑定确定按钮事件
    const errorConfirm = document.getElementById('errorConfirm');
    const hideErrorModal = () => {
      errorModal.classList.remove('active');
      errorOverlay.classList.remove('active');
      errorConfirm.removeEventListener('click', hideErrorModal);
      errorOverlay.removeEventListener('click', hideErrorModal);
    };
    
    errorConfirm.addEventListener('click', hideErrorModal);
    errorOverlay.addEventListener('click', hideErrorModal);
  }
}

// 处理进展选择
// 隐藏进展选择对话框
function hideProgressSelection() {
  const progressSelection = document.getElementById('progressSelection');
  const progressOverlay = document.getElementById('progressOverlay');
  progressSelection.classList.remove('active');
  progressOverlay.classList.remove('active');
}

// 取消选择
document.getElementById('cancelSelection').addEventListener('click', hideProgressSelection);

// 点击遮罩层关闭进展选择对话框
document.getElementById('progressOverlay').addEventListener('click', hideProgressSelection);

// 显示选择弹窗
document.getElementById('extract').addEventListener('click', () => {
  showProgressSelection();
});

// 确认选择
document.getElementById('confirmSelection').addEventListener('click', async () => {
  const extractBtn = document.getElementById('extract');
  const resultDiv = document.getElementById('result');
  const summarizeBtn = document.getElementById('summarize');
  const progressSelection = document.getElementById('progressSelection');
  
  try {
    // 获取选中的进展索引
    const selectedIndices = Array.from(document.querySelectorAll('#progressList input[type="checkbox"]:checked'))
      .map(checkbox => parseInt(checkbox.value));
    
    if (selectedIndices.length === 0) {
      alert('请至少选择一个进展项');
      return;
    }
    
    setLoading(extractBtn, true);
    extractBtn.innerHTML = `
      <span class="icon loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 4v2m0 12v2M4 12h2m12 0h2m-9.9-5.5l1.4 1.4m5.6 5.6l1.4 1.4M6.5 6.5l1.4 1.4m5.6 5.6l1.4 1.4"/>
        </svg>
      </span>
      正在提取...
    `;
    
    // 隐藏选择对话框和遮罩层
    hideProgressSelection();
    
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 发送消息给content script，包含选中的索引
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractProgress',
      selectedIndices: selectedIndices
    });
    
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
      
      // 启用复制和AI总结按钮
      const copyBtn = document.getElementById('copy');
      copyBtn.disabled = false;
      summarizeBtn.disabled = false;
      summaryContent = '';
    } else {
      resultDiv.innerHTML = `<div style="color: #FF3B30; padding: 16px;">提取失败: ${response.error}</div>`;
      extractedContent = '';
      const copyBtn = document.getElementById('copy');
      copyBtn.disabled = true;
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
    showSummaryModal();
    
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
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </span>
      AI总结
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