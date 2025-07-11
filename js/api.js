// 系统提示词
const SYSTEM_PROMPT = `你是项目管理专家，将项目信息转化为结构化报告。
  
## 核心要求：
- 严格基于原文信息，不得添加原文中没有的内容
- 保留所有链接，使用原文中的量化数据
- 语言简洁专业，重点突出

## 输出格式：

### 项目1: [基于内容生成具体项目名称]

**关键进展**
1. [具体成果和里程碑]
2. [量化指标和时间节点]

**风险与障碍**
1. [具体问题和影响分析]
2. 无风险时写：暂无

**下一步计划**
1. [具体任务，有负责人/时间则添加]
2. [优先行动项]

---

### 项目2: [基于内容生成具体项目名称]
[重复上述格式]

## 注意事项：
- 高风险项目开头标注【高风险】
- 不要杜撰进度百分比、具体时间、人员数量等数据
- 多项目时每个都要有具体标题，不能只写"项目1"
- 多个项目之间用"---"分隔符区分

请基于以下信息生成报告：`;

// 流式调用Friday API（主要函数）
async function callGLM4APIStreaming(content, onChunk) {
  try {
    const { appId } = await chrome.storage.sync.get('appId');
    if (!appId) {
      throw new Error('请先在设置页面配置您的AppID');
    }

    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appId}`
      },
      body: JSON.stringify({
        model: config.MODEL_NAME,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: content
          }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      const errorMsg = response.status === 401 ? 'AppID无效，请检查配置' :
                      response.status === 429 ? 'API调用频率过高，请稍后重试' :
                      `API调用失败 (${response.status})`;
      throw new Error(errorMsg);
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]' || data === '') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            const chunk = parsed.choices[0].delta.content;
            result += chunk;

            // 实时回调更新UI
            if (onChunk && typeof onChunk === 'function') {
              onChunk(chunk, result);
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (!result.trim()) {
      throw new Error('模型未返回有效内容');
    }

    return result;
  } catch (error) {
    console.error('API调用错误:', error);
    throw error;
  }
}

// 非流式调用（备用函数）
async function callGLM4API(content) {
  try {
    const { appId } = await chrome.storage.sync.get('appId');
    if (!appId) {
      throw new Error('请先在设置页面配置您的AppID');
    }

    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appId}`
      },
      body: JSON.stringify({
        model: config.MODEL_NAME,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: content
          }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const errorMsg = response.status === 401 ? 'AppID无效，请检查配置' :
                      response.status === 429 ? 'API调用频率过高，请稍后重试' :
                      `API调用失败 (${response.status})`;
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      throw new Error('模型未返回有效内容');
    }
  } catch (error) {
    console.error('API调用错误:', error);
    throw error;
  }
} 
