# CADRender Frontend

React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4。

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router 7 |
| HTTP | Axios |
| 3D | Three.js（OBJLoader + OrbitControls） |
| 认证 | JWT Bearer Token |

## 页面

| 路径 | 页面 | 权限 |
|------|------|------|
| `/` | 仪表盘 | 用户 |
| `/my-tasks` | 任务列表 | 用户 |
| `/new` | 新建任务 | 用户 |
| `/scenes` | 场景选择 | 用户 |
| `/gallery` | 渲染画廊 | 用户 |
| `/plans` | 套餐选择 | 用户 |
| `/admin` | 管理后台 | 管理员 |
| `/admin/finishes` | 材质管理 | 管理员 |
| `/admin/calibration` | 校准查看器 | 管理员 |

## 启动

```powershell
npm install
npm run dev
# → http://localhost:8050
```
