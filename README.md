# 蔓嘉图片剪裁

智能识别长图分隔线，自动分段裁剪。支持商品详情页、聊天记录、网页长截图等场景。

## 功能

- **智能识别裁剪**：自动检测图片中的空白分隔区域，在分隔带中间精准下刀
- **像素裁剪**：按固定宽高像素裁剪
- **数量均等裁剪**：横向/纵向均等切分
- **比例裁剪**：按宽高比自动切分
- **多格式导出**：支持导出为图片压缩包或 PDF

## 技术栈

构建: Vite 7

框架: React 19 + TypeScript

样式: Tailwind CSS 4

组件：AntDesign 6

## 原理

智能模式：对图片逐行扫描，分列检测亮度与颜色方差，识别全宽空白分隔带进行裁剪

传统模式：使用 Canvas 上下文的 drawImage 方法，配合 WebWorker 离屏渲染

## 兼容性

请在 PC 端使用 Chrome、Firefox、Edge 等浏览器

## 本地开发

安装依赖包: `npm install`

本地开发: `npm run dev`

打包: `npm run build`

预览打包结果: `npm run preview`

## 第三方库

file-saver: 用于下载文件到本地

jszip: 用于将裁剪好的图片添加进压缩包

jspdf: 用于输出 PDF 格式
