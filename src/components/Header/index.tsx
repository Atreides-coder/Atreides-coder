import logo from '../../logo.svg';

import './index.css';

/**
 * 标题
 */
export default function () {
  return (
    <header className="my-5 flex flex-col items-center justify-center">
      {/* 标题 */}
      <h1 className="my-6 text-[52px] font-bold">蔓嘉图片剪裁</h1>
      {/* 描述 */}
      <p className="my-4 text-[18px]">智能识别长图分隔线，自动分段裁剪</p>
      {/* 图片 */}
      <div className="h-[160px] w-[160px]">
        <img
          className="header__logo-spin h-full w-full pointer-events-none select-none"
          src={logo}
        />
      </div>
    </header>
  );
}
