// 工具函数库

// 错误处理工具
class ErrorHandler {
  static handleAPIError(error, context = '') {
    console.error(`${context} 错误:`, error);

    if (error.message.includes('AppID无效')) {
      return '请检查AppID配置是否正确';
    } else if (error.message.includes('频率过高')) {
      return 'API调用频率过高，请稍后重试';
    } else if (error.message.includes('网络')) {
      return '网络连接异常，请检查网络状态';
    } else {
      return `操作失败: ${error.message}`;
    }
  }

  static showUserFriendlyError(element, message) {
    if (element) {
      element.innerHTML = `
        <div style="color: #FF3B30; padding: 16px; text-align: center; border-radius: 8px; background: #FFF2F2;">
          <div style="font-weight: 500; margin-bottom: 4px;">操作失败</div>
          <div style="font-size: 14px; opacity: 0.8;">${message}</div>
        </div>
      `;
    }
  }
}

// 内容验证工具
class ContentValidator {
  static isValidContent(content) {
    return content && typeof content === 'string' && content.trim().length > 0;
  }

  static sanitizeContent(content) {
    if (!this.isValidContent(content)) return '';
    return content.trim().replace(/\s+/g, ' ');
  }

  static hasMinimumLength(content, minLength = 10) {
    return this.isValidContent(content) && content.trim().length >= minLength;
  }
}

// 导出工具类
window.ErrorHandler = ErrorHandler;
window.ContentValidator = ContentValidator;
