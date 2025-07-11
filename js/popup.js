let extractedContent = ''; // 存储提取的内容
let summaryContent = ''; // 存储总结内容
let allProgressData = []; // 存储所有进展数据

// 设置按钮点击事件
document.getElementById('settingsBtn').addEventListener('click', () => {
  const settingsContent = document.getElementById('settings-content');
  const mainContent = document.querySelector('.main-content');
    
  if (settingsContent.style.display === 'flex') {
    // 关闭设置页面
    settingsContent.style.display = 'none';
    mainContent.style.display = 'flex';
  } else {
    // 打开设置页面
    settingsContent.style.display = 'flex';
    mainContent.style.display = 'none';
  }
});

// 帮助按钮点击事件
document.getElementById('helpBtn').addEventListener('click', () => {
  window.open('https://km.sankuai.com/collabpage/2707161163', '_blank');
});

// 返回按钮点击事件
document.getElementById('backBtn').addEventListener('click', () => {
  const settingsContent = document.getElementById('settings-content');
  const mainContent = document.querySelector('.main-content');

  settingsContent.style.display = 'none';
  mainContent.style.display = 'flex';
});

// 页面加载时，加载已保存的AppID和初始化状态
document.addEventListener('DOMContentLoaded', async () => {
  const { appId } = await chrome.storage.sync.get('appId');
  if (appId) {
    document.getElementById('appIdInput').value = appId;
  }

  // 数据迁移：修复历史统计数据
  await migrateUsageData();

  // 初始化状态检测
  await updateStatus();

  // 更新使用统计
  await updateUsageStats();

  // 初始化完成
});

// 更新状态显示
async function updateStatus() {
  // 检测网站状态
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const websiteStatusDot = document.getElementById('websiteStatus');
    const websiteStatusText = document.getElementById('websiteStatusText');

    if (tab.url && tab.url.includes('goal.sankuai.com')) {
      websiteStatusDot.className = 'status-dot success';
      websiteStatusText.textContent = '目标网站';
    } else {
      websiteStatusDot.className = 'status-dot warning';
      websiteStatusText.textContent = '非目标网站';
    }
  } catch (error) {
    const websiteStatusDot = document.getElementById('websiteStatus');
    const websiteStatusText = document.getElementById('websiteStatusText');
    websiteStatusDot.className = 'status-dot error';
    websiteStatusText.textContent = '检测失败';
  }

  // 检测API配置状态
  try {
    const { appId } = await chrome.storage.sync.get('appId');
    const apiStatusDot = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');

    if (appId && appId.trim()) {
      apiStatusDot.className = 'status-dot success';
      apiStatusText.textContent = 'AppID已配置';
    } else {
      apiStatusDot.className = 'status-dot warning';
      apiStatusText.textContent = '未配置AppID';
    }
  } catch (error) {
    const apiStatusDot = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    apiStatusDot.className = 'status-dot error';
    apiStatusText.textContent = '配置错误';
  }
}

// 数据迁移：修复历史统计数据
async function migrateUsageData() {
  try {
    const { dailyUsage = {}, monthlyUsage = {}, totalUsage = 0, migrated = false } = await chrome.storage.local.get(['dailyUsage', 'monthlyUsage', 'totalUsage', 'migrated']);

    // 如果已经迁移过，直接返回
    if (migrated) {
      return;
    }

    // 开始数据迁移

    // 从日使用数据重新计算月度和累计统计
    let newTotalUsage = 0;
    const newMonthlyUsage = {};

    // 遍历所有日使用数据
    Object.keys(dailyUsage).forEach(dateStr => {
      const count = dailyUsage[dateStr];
      const date = new Date(dateStr);
      const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');

      // 累加到月度统计
      newMonthlyUsage[monthKey] = (newMonthlyUsage[monthKey] || 0) + count;

      // 累加到总计
      newTotalUsage += count;
    });

    // 如果原来有累计数据，取较大值
    const finalTotalUsage = Math.max(newTotalUsage, totalUsage);

    // 保存迁移后的数据
    await chrome.storage.local.set({
      monthlyUsage: { ...monthlyUsage, ...newMonthlyUsage },
      totalUsage: finalTotalUsage,
      migrated: true
    });

    console.log('数据迁移完成:', {
      monthlyUsage: newMonthlyUsage,
      totalUsage: finalTotalUsage
    });
  } catch (error) {
    console.error('数据迁移失败:', error);
  }
}

// 更新使用统计
async function updateUsageStats() {
  try {
    const today = new Date().toDateString();
    const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    const { dailyUsage = {}, monthlyUsage = {}, totalUsage = 0 } = await chrome.storage.local.get(['dailyUsage', 'monthlyUsage', 'totalUsage']);

    // 今日使用次数
    const todayCount = dailyUsage[today] || 0;
    const usageCountElement = document.getElementById('usageCount');
    usageCountElement.textContent = `${todayCount} 次提取`;

    // 本月使用次数
    const monthlyCount = monthlyUsage[currentMonth] || 0;
    const monthlyUsageCountElement = document.getElementById('monthlyUsageCount');
    monthlyUsageCountElement.textContent = `${monthlyCount} 次提取`;

    // 累计使用次数
    const totalUsageCountElement = document.getElementById('totalUsageCount');
    totalUsageCountElement.textContent = `${totalUsage} 次提取`;
  } catch (error) {
    console.error('更新使用统计失败:', error);
  }
}

// 记录使用次数
async function recordUsage() {
  try {
    const today = new Date().toDateString();
    const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    const { dailyUsage = {}, monthlyUsage = {}, totalUsage = 0 } = await chrome.storage.local.get(['dailyUsage', 'monthlyUsage', 'totalUsage']);

    // 更新今日使用次数
    dailyUsage[today] = (dailyUsage[today] || 0) + 1;

    // 更新本月使用次数
    monthlyUsage[currentMonth] = (monthlyUsage[currentMonth] || 0) + 1;

    // 更新累计使用次数
    const newTotalUsage = totalUsage + 1;

    // 只保留最近7天的日使用数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    Object.keys(dailyUsage).forEach(date => {
      if (new Date(date) < sevenDaysAgo) {
        delete dailyUsage[date];
      }
    });

    // 只保留最近12个月的月使用数据
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const twelveMonthsAgoKey = twelveMonthsAgo.getFullYear() + '-' + String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0');

    Object.keys(monthlyUsage).forEach(month => {
      if (month < twelveMonthsAgoKey) {
        delete monthlyUsage[month];
      }
    });

    await chrome.storage.local.set({
      dailyUsage,
      monthlyUsage,
      totalUsage: newTotalUsage
    });

    await updateUsageStats();
  } catch (error) {
    console.error('记录使用次数失败:', error);
  }
}

// 保存AppID
document.getElementById('saveAppId').addEventListener('click', async () => {
  const appId = document.getElementById('appIdInput').value.trim();
  const saveStatus = document.getElementById('saveStatus');

  if (appId) {
    await chrome.storage.sync.set({ appId });
    saveStatus.textContent = 'AppID 已保存！';
    // 更新状态显示
    await updateStatus();
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 2000);
  } else {
    saveStatus.textContent = '请输入有效的AppID。';
  }
});

// 手动重置统计数据（调试用）
async function resetUsageStats() {
  try {
    await chrome.storage.local.remove(['dailyUsage', 'monthlyUsage', 'totalUsage', 'migrated']);
    await updateUsageStats();
    // 统计数据已重置
  } catch (error) {
    console.error('重置统计数据失败:', error);
  }
}

// 在控制台中暴露重置函数（调试用）
window.resetUsageStats = resetUsageStats;

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
  
  try {
    setLoading(extractBtn, true);
    extractBtn.innerHTML = `
      <span class="icon loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 4v2m0 12v2M4 12h2m12 0h2m-9.9-5.5l1.4 1.4m5.6 5.6l1.4 1.4M6.5 6.5l1.4 1.4m5.6 5.6l1.4 1.4"/>
        </svg>
      </span>
      正在获取...
    `;
    
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 发送消息给content script获取所有进展数据
    const response = await chrome.tabs.sendMessage(tab.id, {action: 'extractProgress'});
    
    if (response.success) {
      allProgressData = response.data;
      showProgressModal();
    } else {
      resultDiv.innerHTML = `<div style="color: #FF3B30; padding: 16px;">获取进展失败: ${response.error}</div>`;
      allProgressData = [];
      summarizeBtn.disabled = true;
    }
  } catch (error) {
    resultDiv.innerHTML = `<div style="color: #FF3B30; padding: 16px;">发生错误: ${error.message}</div>`;
    allProgressData = [];
    summarizeBtn.disabled = true;
  } finally {
    setLoading(extractBtn, false);
    extractBtn.innerHTML = `
      <span style="display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 1024 1024" fill="currentColor" style="width: 28px; height: 28px;">
          <!-- 提取箭头 -->
          <path d="M954.538667 440.917333L811.392 339.2c-6.4-3.2-12.714667 0-12.714667 9.514667v50.901333h-164.096a13.653333 13.653333 0 0 0-12.714666 12.714667v76.373333c0 6.357333 6.4 12.714667 12.714666 12.714667h164.096v54.058666c0 9.557333 6.357333 12.714667 12.714667 9.557334l143.146667-104.96c6.357333-3.2 6.357333-12.757333 0-19.114667z"/>
          <!-- 文档 -->
          <path d="M784.768 806.613333h-234.197333V241.706667c0-35.114667-29.269333-73.173333-64.384-81.92L290.133333 107.008h494.677334v169.813333h64.384v-169.813333c0-35.114667-29.269333-64.384-64.426667-64.384H129.152c-35.114667 0-64.426667 29.269333-64.426667 64.426667v699.52c0 23.424 11.733333 43.904 29.312 55.594666 8.746667 8.789333 23.381333 17.578667 35.114667 20.48l354.133333 96.64c35.157333 8.746667 64.426667-11.733333 64.426667-46.848v-58.538666h234.154667c35.114667 0 64.426667-29.269333 64.426666-64.426667v-172.672h-61.482666v169.770667z"/>
        </svg>
      </span>
    `;
  }
});

// 重新提取按钮功能
document.getElementById('reExtract').addEventListener('click', async () => {
  const reExtractBtn = document.getElementById('reExtract');

  try {
    // 显示加载状态
    const originalHTML = reExtractBtn.innerHTML;
    reExtractBtn.innerHTML = `
      <span style="width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 10px; height: 10px; animation: spin 1s linear infinite;">
          <path d="M1 4v6h6"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      </span>
      重新获取...
    `;
    reExtractBtn.disabled = true;

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    // 强制重新从网页获取最新的进展数据
    const response = await chrome.tabs.sendMessage(tab.id, {action: 'extractProgress'});

    if (response.success) {
      // 更新缓存的数据为最新数据
      allProgressData = response.data;
      showProgressModal();
    } else {
      alert('获取进展失败: ' + response.error);
    }

    // 恢复按钮状态
    reExtractBtn.innerHTML = originalHTML;
    reExtractBtn.disabled = false;
  } catch (error) {
    alert('发生错误: ' + error.message);
    // 恢复按钮状态
    const originalHTML = `
      <span style="width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 10px; height: 10px;">
          <path d="M1 4v6h6"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      </span>
      重新提取
    `;
    reExtractBtn.innerHTML = originalHTML;
    reExtractBtn.disabled = false;
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

// 显示进展选择弹窗
function showProgressModal() {
  const modal = document.getElementById('progressModal');
  const progressList = document.getElementById('progressList');

  // 清空列表
  progressList.innerHTML = '';

  // 生成进展项目
  allProgressData.forEach((item, index) => {
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    progressItem.innerHTML = `
      <input type="checkbox" class="progress-checkbox" id="progress-${index}" checked>
      <div class="progress-content">
        <div class="progress-index">#${item.index}</div>
        <div>${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}</div>
      </div>
    `;
    progressList.appendChild(progressItem);
  });

  // 添加checkbox变化监听
  updateConfirmButtonState();
  const checkboxes = document.querySelectorAll('.progress-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateConfirmButtonState);
  });

  // 显示弹窗
  modal.style.display = 'flex';
}

// 更新确认按钮状态
function updateConfirmButtonState() {
  const checkboxes = document.querySelectorAll('.progress-checkbox');
  const confirmBtn = document.getElementById('confirmExtract');
  const hasSelected = Array.from(checkboxes).some(checkbox => checkbox.checked);

  confirmBtn.disabled = !hasSelected;
  if (!hasSelected) {
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.style.background = '#A1A1A6';
    confirmBtn.style.color = '#FFFFFF';
  } else {
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.style.background = 'var(--primary-color)';
    confirmBtn.style.color = 'white';
  }
}

// 关闭弹窗
function closeProgressModal() {
  const modal = document.getElementById('progressModal');
  modal.style.display = 'none';
}

// 弹窗事件监听
document.getElementById('closeModal').addEventListener('click', closeProgressModal);

// 点击遮罩层关闭弹窗
document.getElementById('progressModal').addEventListener('click', (e) => {
  if (e.target.id === 'progressModal') {
    closeProgressModal();
  }
});

// 全选按钮
document.getElementById('selectAll').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.progress-checkbox');
  checkboxes.forEach(checkbox => checkbox.checked = true);
  updateConfirmButtonState();
});

// 全不选按钮
document.getElementById('selectNone').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.progress-checkbox');
  checkboxes.forEach(checkbox => checkbox.checked = false);
  updateConfirmButtonState();
});

// 确认提取按钮
document.getElementById('confirmExtract').addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('.progress-checkbox');
  const selectedData = [];

  checkboxes.forEach((checkbox, index) => {
    if (checkbox.checked) {
      selectedData.push(allProgressData[index]);
    }
  });

  if (selectedData.length === 0) {
    alert('请至少选择一个进展项目！');
    return;
  }

  // 格式化选中的内容
  extractedContent = selectedData
    .map(item => `#${item.index}\n${item.content}`)
    .join('\n\n');

  // 显示提取的内容
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = extractedContent
    .split('\n')
    .map(line => {
      if (line.match(/^#\d+$/)) {
        return `<div style="font-size: 1.2em; font-weight: 600; margin-top: 16px; color: var(--text-primary);">${line}</div>`;
      }
      return `<div style="margin: 8px 0;">${line.replace(/\[图片URL:(.*?)\]/g, '<a href="$1" target="_blank" style="color: var(--primary-color); text-decoration: none;">[查看图片]</a>')}</div>`;
    })
    .join('');

  // 隐藏初始状态，显示内容区域
  document.getElementById('initialState').style.display = 'none';
  document.getElementById('contentArea').style.display = 'flex';

  // 启用AI总结按钮
  const summarizeBtn = document.getElementById('summarize');
  summarizeBtn.disabled = false;

  // 重置总结卡片状态
  const summaryCard = document.getElementById('summaryCard');
  summaryCard.style.display = 'none';
  summaryCard.style.flex = '';
  summaryContent = '';

  // 确保进展卡片占满全部空间（当总结卡片隐藏时）
  const progressCard = document.getElementById('progressCard');
  progressCard.style.flex = '1';

  // 记录使用次数
  await recordUsage();

  // 关闭弹窗
  closeProgressModal();
});

// AI总结按钮功能
document.getElementById('summarize').addEventListener('click', async () => {
  if (!extractedContent) {
    alert('请先提取内容！');
    return;
  }
  
  const summaryCard = document.getElementById('summaryCard');
  const summaryContentDiv = document.getElementById('summaryContent');
  
  // 显示总结卡片并设置均分布局
  summaryCard.style.display = 'flex';
  summaryCard.style.flex = '1';

  // 显示加载状态
  summaryContentDiv.innerHTML = `
    <div class="ai-loading" style="padding: 32px; text-align: center;">
      <div class="ai-loading-icon"></div>
      <div class="ai-loading-text">正在生成总结，请稍候</div>
    </div>
  `;

  try {
    // 开始调用流式 API

    // 检查函数是否存在
    if (typeof callGLM4APIStreaming !== 'function') {
      throw new Error('callGLM4APIStreaming 函数未定义');
    }

    // 调用流式API生成总结
    let isFirstChunk = true;
    summaryContent = await callGLM4APIStreaming(extractedContent, (chunk, fullContent) => {
      // 第一次收到内容时，清空加载动画并准备流式显示
      if (isFirstChunk) {
        summaryContentDiv.innerHTML = '<div id="streaming-content" style="line-height: 1.6; white-space: pre-wrap; padding: 16px;"></div>';
        isFirstChunk = false;
      }

      // 实时更新UI显示
      const streamingDiv = document.getElementById('streaming-content');
      if (streamingDiv) {
        streamingDiv.textContent = fullContent;
        // 自动滚动到底部
        streamingDiv.scrollTop = streamingDiv.scrollHeight;
      }
    });

    // 流式API调用完成

    // 最终格式化显示
    if (summaryContent && summaryContent.trim()) {
      summaryContentDiv.innerHTML = summaryContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => `<div style="margin: 8px 0; line-height: 1.5;">${line}</div>`)
        .join('');
    } else {
      summaryContentDiv.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary);">未能生成总结内容</div>';
    }
  } catch (error) {
    const errorMessage = ErrorHandler.handleAPIError(error, 'AI总结');
    ErrorHandler.showUserFriendlyError(summaryContentDiv, errorMessage);
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