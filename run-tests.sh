#!/bin/bash
# 茶叶电商小程序测试运行脚本

echo "========================================"
echo "茶叶电商微信小程序 - 测试运行脚本"
echo "========================================"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到Node.js，请先安装Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

echo "[信息] Node.js版本:"
node --version
echo ""

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "[错误] 未检测到npm，请先安装npm"
    exit 1
fi

echo "[信息] npm版本:"
npm --version
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "[信息] 未检测到node_modules目录，开始安装依赖..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
    echo ""
    echo "[成功] 依赖安装完成"
    echo ""
fi

# 显示菜单
show_menu() {
    echo "========================================"
    echo "请选择要执行的操作:"
    echo "========================================"
    echo "1. 运行所有测试"
    echo "2. 运行用户登录属性测试"
    echo "3. 运行用户登录单元测试"
    echo "4. 运行测试并生成覆盖率报告"
    echo "5. 监听模式运行测试"
    echo "6. 安装/更新依赖"
    echo "7. 退出"
    echo "========================================"
    echo ""
}

# 主循环
while true; do
    show_menu
    read -p "请输入选项 (1-7): " choice
    
    case $choice in
        1)
            echo ""
            echo "[运行] 所有测试..."
            echo ""
            npm test
            echo ""
            read -p "按Enter键继续..."
            ;;
        2)
            echo ""
            echo "[运行] 用户登录属性测试..."
            echo ""
            npm test -- cloudfunctions/login/login.test.js
            echo ""
            read -p "按Enter键继续..."
            ;;
        3)
            echo ""
            echo "[运行] 用户登录单元测试..."
            echo ""
            npm test -- cloudfunctions/login/login.unit.test.js
            echo ""
            read -p "按Enter键继续..."
            ;;
        4)
            echo ""
            echo "[运行] 测试并生成覆盖率报告..."
            echo ""
            npm run test:coverage
            echo ""
            echo "[信息] 覆盖率报告已生成到 coverage/ 目录"
            echo ""
            read -p "按Enter键继续..."
            ;;
        5)
            echo ""
            echo "[运行] 监听模式..."
            echo "[提示] 按 Ctrl+C 退出监听模式"
            echo ""
            npm run test:watch
            echo ""
            read -p "按Enter键继续..."
            ;;
        6)
            echo ""
            echo "[运行] 安装/更新依赖..."
            echo ""
            npm install
            if [ $? -ne 0 ]; then
                echo "[错误] 依赖安装失败"
            else
                echo "[成功] 依赖安装完成"
            fi
            echo ""
            read -p "按Enter键继续..."
            ;;
        7)
            echo ""
            echo "再见！"
            exit 0
            ;;
        *)
            echo ""
            echo "[错误] 无效的选项，请重新选择"
            echo ""
            read -p "按Enter键继续..."
            ;;
    esac
done
