// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProgress') {
    const progress = extractProgressInfo();
    sendResponse(progress);
  }
  return true;
});

// 处理段落内容，保留链接和图片
function processParagraphContent(p) {
  let content = '';
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      content += node.textContent;
    } 
    else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'A') {
        // 只保留URL
        content += node.href;
      }
      else if (node.tagName === 'IMG') {
        // 保存原始图片URL
        content += `[图片URL:${node.src}]`;
      }
      else {
        // 递归处理其他节点
        processChildNodes(node);
      }
    }
  }
  
  function processChildNodes(parent) {
    parent.childNodes.forEach(child => {
      processNode(child);
    });
  }
  
  processNode(p);
  return content.trim();
}

// 提取进展信息
function extractProgressInfo() {
  const results = [];
  
  try {
    // 获取子目标进展区域 - 使用更稳定的选择器
    const container = document.querySelector('.associate-goal-slide.associate-goal-slide-visible') ||
                     document.querySelector('.associate-goal-slide') ||
                     document.querySelector('.list-body');
    
    if (!container) {
      throw new Error('未找到子目标进展区域');
    }

    // 获取所有ProseMirror编辑器内容
    const progressItems = container.querySelectorAll('.ProseMirror');
    
    progressItems.forEach((item, index) => {
      // 获取所有段落内容
      const paragraphs = Array.from(item.querySelectorAll('p'))
        .map(p => processParagraphContent(p))
        .filter(text => text.length > 0);
      
      results.push({
        index: index + 1,
        content: paragraphs.join('\n')
      });
    });
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 