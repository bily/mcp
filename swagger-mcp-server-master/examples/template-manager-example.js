/**
 * 模板管理器示例
 * 
 * 这个示例演示如何使用Swagger MCP服务器的模板管理器功能，
 * 包括获取模板列表、获取特定模板、保存自定义模板和删除模板。
 * 
 * 使用方法：
 * 1. 首先启动MCP服务器: node start-server.js
 * 2. 运行本示例: node examples/template-manager-example.js
 */

// 通用函数发送MCP请求
async function sendMcpRequest(method, params = {}) {
  const request = {
    method,
    params
  };
  
  // 标准输入输出方式发送请求
  const requestStr = JSON.stringify(request);
  process.stdout.write(requestStr + '\n');
  
  // 等待响应
  return new Promise((resolve, reject) => {
    process.stdin.once('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

// 列出所有模板
async function listAllTemplates() {
  console.log('=== 获取所有模板 ===');
  
  try {
    const result = await sendMcpRequest('template-list', {
      type: 'all'
    });
    
    // 解析结果
    const response = JSON.parse(result.content[0].text);
    
    if (response.success) {
      console.log(`成功获取了 ${response.templates.length} 个模板:`);
      console.log(response.templates.map(t => `${t.id} (${t.type}${t.framework ? ', ' + t.framework : ''})`).join('\n'));
    } else {
      console.error('获取模板失败:', response.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 获取特定模板
async function getTemplate(templateId) {
  console.log(`\n=== 获取模板 ${templateId} ===`);
  
  try {
    const result = await sendMcpRequest('template-get', {
      id: templateId
    });
    
    // 解析结果
    const response = JSON.parse(result.content[0].text);
    
    if (response.success) {
      console.log(`成功获取模板 ${response.template.id}:`);
      console.log('----- 模板内容 -----');
      console.log(response.template.content.slice(0, 150) + '...');
      console.log('----- 内容结束 -----');
    } else {
      console.error('获取模板失败:', response.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 保存自定义模板
async function saveCustomTemplate() {
  console.log('\n=== 保存自定义模板 ===');
  
  const customTemplate = {
    id: 'custom-interface',
    name: '自定义接口模板',
    type: 'typescript-types',
    content: `/**
 * 自定义TypeScript接口模板
 * {{dateTime}}
 */

export interface {{name}} {
{{#properties}}
  /**
   * {{description}}
   * @type {{{type}}}
   */
  {{name}}{{#isOptional}}?{{/isOptional}}: {{type}};
{{/properties}}
}`,
    description: '这是一个自定义的TypeScript接口模板'
  };
  
  try {
    const result = await sendMcpRequest('template-save', customTemplate);
    
    // 解析结果
    const response = JSON.parse(result.content[0].text);
    
    if (response.success) {
      console.log('成功保存自定义模板:', response.template.id);
    } else {
      console.error('保存模板失败:', response.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 删除自定义模板
async function deleteCustomTemplate(templateId) {
  console.log(`\n=== 删除模板 ${templateId} ===`);
  
  try {
    const result = await sendMcpRequest('template-delete', {
      id: templateId
    });
    
    // 解析结果
    const response = JSON.parse(result.content[0].text);
    
    if (response.success) {
      console.log(response.message);
    } else {
      console.error('删除模板失败:', response.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 主函数
async function main() {
  try {
    // 获取所有模板
    await listAllTemplates();
    
    // 获取特定模板
    await getTemplate('typescript-interface');
    
    // 保存自定义模板
    await saveCustomTemplate();
    
    // 再次列出所有模板（应包含新添加的自定义模板）
    await listAllTemplates();
    
    // 获取自定义模板
    await getTemplate('custom-interface');
    
    // 删除自定义模板
    await deleteCustomTemplate('custom-interface');
    
    // 再次列出所有模板（应该没有自定义模板了）
    await listAllTemplates();
    
  } catch (error) {
    console.error('执行示例时出错:', error);
  }
  
  // 退出程序
  process.exit(0);
}

// 执行主函数
main(); 