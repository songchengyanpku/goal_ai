// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProgressList') {
    const progress = extractProgressInfo();
    sendResponse(progress);
  } else if (request.action === 'extractProgress') {
    const progress = extractProgressInfo(request.selectedIndices);
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
function extractProgressInfo(selectedIndices) {
  const results = [];
  
  try {
    // 获取子目标进展区域
    const container = document.querySelector('#app > div > div > div > div.manifest-wrapper > div.manifest-wrapper-content.wrapper-visible > div > div.mtd-loading-nested.manifest-body-loading-wrapper > div > div > div.list-body > div.associate-goal-slide.associate-goal-slide-visible');
    
    if (!container) {
      throw new Error('请打开子目标进展区域');
    }

    // 获取所有ProseMirror编辑器内容
    const progressItems = container.querySelectorAll('.ProseMirror');
    
    progressItems.forEach((item, index) => {
      // 如果提供了选择的索引，则只处理选中的进展
      if (selectedIndices && !selectedIndices.includes(index)) {
        return;
      }
      
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