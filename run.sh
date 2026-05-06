#!/bin/bash
# TestPilot 启动脚本

cd "$(dirname "$0")"

case "${1:-dev}" in
  dev)
    echo "🚀 启动开发模式..."
    npm run dev
    ;;
  build)
    echo "📦 构建生产版本..."
    npm run build
    ;;
  start)
    echo "▶️  预览构建产物..."
    npm run start
    ;;
  test)
    echo "🧪 运行测试..."
    npm run test
    ;;
  install)
    echo "📥 安装依赖..."
    npm install
    ;;
  *)
    echo "用法: ./run.sh [命令]"
    echo ""
    echo "命令:"
    echo "  dev      开发模式（默认）"
    echo "  build    构建生产版本"
    echo "  start    预览构建产物"
    echo "  test     运行测试"
    echo "  install  安装依赖"
    ;;
esac
