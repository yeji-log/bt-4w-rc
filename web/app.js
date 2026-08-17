/*
  app.js — 상단 연결 바 + 탭 전환 + 앱 초기화
*/

let toastTimer = null;

// alert()처럼 화면을 가로막지 않는 알림. 기기 선택 화면을 취소/뒤로가기 하고
// 돌아왔을 때도 터미널/게임패드 탭이 바로 그대로 보이도록 하기 위해 사용.
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 브라우저 기본 confirm()을 대체하는 자체 확인 모달.
// (일부 앱/브라우저에서 confirm()의 버튼 라벨이 엉뚱하게 표시되는 문제를 피하기 위함)
function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const messageEl = document.getElementById('confirm-modal-message');
  const okBtn = document.getElementById('confirm-modal-ok');
  const cancelBtn = document.getElementById('confirm-modal-cancel');

  messageEl.textContent = message;
  modal.classList.add('open');

  function cleanup() {
    modal.classList.remove('open');
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', handleCancel);
  }
  function handleOk() {
    cleanup();
    onConfirm();
  }
  function handleCancel() {
    cleanup();
  }

  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
}

function initConnectionBar() {
  const connectBtn = document.getElementById('connect-btn');
  const rescanBtn = document.getElementById('rescan-btn');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  const STATE_LABEL = {
    disconnected: '연결 안 됨',
    connecting: '연결 중…',
    connected: '연결됨',
  };

  // Web Bluetooth는 백그라운드에서 기기 목록을 계속 스캔해 보여주는 커스텀 UI를
  // 만들 수 없고(브라우저 보안 정책), 매번 브라우저 자체의 기기 선택 팝업을 새로
  // 띄우는 것 자체가 "다시 검색"입니다. 그래서 새로고침 버튼도 결국 같은
  // requestDevice() 호출을 다시 트리거합니다.
  async function attemptConnect() {
    try {
      await BLE.connect();
    } catch (err) {
      // 사용자가 기기 선택 화면(iOS Bluefy / 안드로이드 Chrome이 직접 그리는
      // 시스템 레벨 팝업, 우리 코드가 손댈 수 없는 영역)에서 취소/뒤로가기 한
      // 경우도 NotFoundError로 여기 들어옴 — 정상 흐름.
      // alert() 대신 비차단 토스트로 "다시 찾는 법"만 살짝 알려주고,
      // 터미널/게임패드 탭은 막힘 없이 바로 그대로 보이게 함.
      if (err.name === 'NotFoundError') {
        showToast('기기를 못 찾았어요. HM-10 전원·거리 확인 후 🔄 새로고침으로 다시 찾아보세요.');
        return;
      }

      // 그 외 실제 오류(연결 실패, 미지원 브라우저 등)
      showToast(err.message || '연결에 실패했습니다. 새로고침 버튼으로 다시 검색해보세요.', true);
    }
  }

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

    // 새로고침(다시 검색)은 아직 연결되지 않은 상태에서만 의미가 있음
    rescanBtn.disabled = state !== 'disconnected';
    rescanBtn.classList.toggle('spinning', state === 'connecting');
  });

  connectBtn.addEventListener('click', () => {
    if (BLE.getState() === 'connected') {
      BLE.disconnect();
      return;
    }
    attemptConnect();
  });

  rescanBtn.addEventListener('click', attemptConnect);
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
