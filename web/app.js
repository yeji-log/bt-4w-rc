/*
  app.js — 상단 연결 바 + 탭 전환 + 앱 초기화
*/

function initConnectionBar() {
  const connectBtn = document.getElementById('connect-btn');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  const STATE_LABEL = {
    disconnected: '연결 안 됨',
    connecting: '연결 중…',
    connected: '연결됨',
  };

  BLE.onStateChange((state) => {
    statusText.textContent = STATE_LABEL[state] || state;
    statusDot.className = `status-dot status-${state}`;

    if (state === 'connecting') {
      connectBtn.disabled = true;
      connectBtn.textContent = '연결 중…';
    } else if (state === 'connected') {
      connectBtn.disabled = false;
      connectBtn.textContent = '연결 해제';
    } else {
      connectBtn.disabled = false;
      connectBtn.textContent = '연결하기';
    }
  });

  connectBtn.addEventListener('click', async () => {
    if (BLE.getState() === 'connected') {
      BLE.disconnect();
      return;
    }
    try {
      await BLE.connect();
    } catch (err) {
      // 사용자가 기기 선택 팝업에서 취소한 경우도 여기로 들어옴 (정상 흐름)
      alert(err.message || '연결에 실패했습니다.');
    }
  });
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
      tabPanels.forEach((panel) => panel.classList.toggle('active', panel.id === target));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initConnectionBar();
  initTabs();
  initTerminal();
  initGamepad();
});
