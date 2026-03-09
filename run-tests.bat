@echo off
REM 茶叶电商小程序测试运行脚本

echo ========================================
echo 茶叶电商微信小程序 - 测试运行脚本
echo ========================================
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] Node.js版本:
node --version
echo.

REM 检查npm是否安装
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到npm，请先安装npm
    pause
    exit /b 1
)

echo [信息] npm版本:
npm --version
echo.

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo [信息] 未检测到node_modules目录，开始安装依赖...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成
    echo.
)

REM 显示菜单
:menu
echo ========================================
echo 请选择要执行的操作:
echo ========================================
echo 1. 运行所有测试
echo 2. 运行用户登录属性测试
echo 3. 运行用户登录单元测试
echo 4. 运行测试并生成覆盖率报告
echo 5. 监听模式运行测试
echo 6. 安装/更新依赖
echo 7. 退出
echo ========================================
echo.

set /p choice="请输入选项 (1-7): "

if "%choice%"=="1" (
    echo.
    echo [运行] 所有测试...
    echo.
    call npm test
    echo.
    pause
    goto menu
)

if "%choice%"=="2" (
    echo.
    echo [运行] 用户登录属性测试...
    echo.
    call npm test -- cloudfunctions/login/login.test.js
    echo.
    pause
    goto menu
)

if "%choice%"=="3" (
    echo.
    echo [运行] 用户登录单元测试...
    echo.
    call npm test -- cloudfunctions/login/login.unit.test.js
    echo.
    pause
    goto menu
)

if "%choice%"=="4" (
    echo.
    echo [运行] 测试并生成覆盖率报告...
    echo.
    call npm run test:coverage
    echo.
    echo [信息] 覆盖率报告已生成到 coverage/ 目录
    echo.
    pause
    goto menu
)

if "%choice%"=="5" (
    echo.
    echo [运行] 监听模式...
    echo [提示] 按 Ctrl+C 退出监听模式
    echo.
    call npm run test:watch
    echo.
    pause
    goto menu
)

if "%choice%"=="6" (
    echo.
    echo [运行] 安装/更新依赖...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 依赖安装失败
    ) else (
        echo [成功] 依赖安装完成
    )
    echo.
    pause
    goto menu
)

if "%choice%"=="7" (
    echo.
    echo 再见！
    exit /b 0
)

echo.
echo [错误] 无效的选项，请重新选择
echo.
pause
goto menu
