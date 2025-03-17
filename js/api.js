// 生成JWT token
async function generateJwtToken(apiKey) {
  const [id, secret] = apiKey.split('.');
  
  // Base64Url 编码函数
  function base64UrlEncode(str) {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  // 将ArrayBuffer转换为Base64Url
  function bufferToBase64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    const binary = bytes.reduce((str, byte) => str + String.fromCharCode(byte), '');
    return base64UrlEncode(binary);
  }
  
  const header = {
    "alg": "HS256",
    "sign_type": "SIGN"
  };
  
  const payload = {
    "api_key": id,
    "exp": Math.floor(Date.now() / 1000) + 60,
    "timestamp": Math.floor(Date.now() / 1000)
  };
  
  // 编码header和payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // 生成签名
  const data = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  // 组装JWT
  return `${data}.${bufferToBase64UrlEncode(signature)}`;
}

// 调用Friday API
async function callGLM4API(content) {
  try {
    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.APP_ID}`
      },
      body: JSON.stringify({
        model: config.MODEL_NAME,
        messages: [
          {
            role: "system",
            content: `你是一位资深的会议记录员和项目管理专家，拥有丰富的团队协作和效率提升经验。你正在整理公司周例会的工作进展汇报。请根据以下内容，为每项工作总结其关键进展、遇到的障碍以及后续的行动计划。

具体要求：

1.  **结构清晰：** 以项目/任务为单位进行总结，每个项目/任务的总结应包含以下三个部分：
    *   **关键进展：** 本周取得的主要进展和成果，使用简洁明了的语言概括。量化指标优先，例如"完成XX功能模块的80%"、"成功对接XX客户"、"解决XX技术难题"等。
    *   **面临的障碍：** 目前遇到的主要问题和挑战，简要说明原因和影响。如果没有障碍，则注明"无"。
    *   **后续行动计划：** 下一步的计划和安排，包括具体步骤、负责人和预计完成时间。

2.  **重点突出：** 抓住重点，避免冗余信息。优先关注影响项目/任务整体进度和目标的关键节点。

3.  **语言简洁：** 使用清晰、简洁、专业的语言，避免使用口语化和模糊的表达。

4.  **格式规范：** 使用Markdown格式输出，以便于阅读和整理。每个项目/任务的总结使用标题（###）进行分隔。` 
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
      throw new Error(`API调用失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API调用错误:', error);
    throw error;
  }
} 