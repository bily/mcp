/**
 * Swagger MCP 工具客户端
 * 这个脚本提供了一个交互式接口来使用Swagger MCP工具
 */
const { FastMCP } = require('fastmcp');
const readline = require('readline');

// 创建readline接口用于用户交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 创建FastMCP客户端
const client = new FastMCP({
  name: 'Swagger MCP Tools Client',
  version: '1.0.0'
});

/**
 * 启动客户端
 */
async function startClient() {
  try {
    console.log('正在连接到MCP工具服务器...');
    await client.connect({ transportType: 'stdio' });
    console.log('✅ 已连接到MCP工具服务器');
    
    // 获取所有可用工具
    const tools = await client.listTools();
    console.log(`\n可用工具 (${tools.length}):`);
    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
    });
    
    // 交互式工具选择
    await promptForToolSelection(tools);
  } catch (error) {
    console.error('连接失败:', error);
    process.exit(1);
  }
}

/**
 * 提示用户选择一个工具
 */
async function promptForToolSelection(tools) {
  rl.question('\n请选择一个工具 (输入编号): ', async (answer) => {
    const index = parseInt(answer, 10) - 1;
    if (isNaN(index) || index < 0 || index >= tools.length) {
      console.log('无效的选择，请重试');
      return promptForToolSelection(tools);
    }
    
    const selectedTool = tools[index];
    console.log(`\n已选择: ${selectedTool.name}`);
    console.log(`描述: ${selectedTool.description}`);
    console.log('参数:', JSON.stringify(selectedTool.parameters, null, 2));
    
    await promptForToolParams(selectedTool);
  });
}

/**
 * 提示用户输入工具参数
 */
async function promptForToolParams(tool) {
  rl.question('\n请输入参数 (JSON格式): ', async (answer) => {
    try {
      // 尝试解析JSON参数
      const params = answer.trim() ? JSON.parse(answer) : {};
      
      console.log(`\n执行 ${tool.name} 中...`);
      
      // 执行工具
      const result = await client.callTool(tool.name, params);
      
      // 显示结果
      console.log('\n结果:');
      console.log(JSON.stringify(result, null, 2));
      
      // 询问是否继续
      promptForContinue();
    } catch (error) {
      console.error('执行失败:', error.message);
      await promptForToolParams(tool);
    }
  });
}

/**
 * 询问用户是否想继续
 */
function promptForContinue() {
  rl.question('\n是否继续? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      const tools = await client.listTools();
      await promptForToolSelection(tools);
    } else {
      console.log('感谢使用 Swagger MCP Tools Client!');
      rl.close();
      process.exit(0);
    }
  });
}

// 启动客户端
startClient(); 