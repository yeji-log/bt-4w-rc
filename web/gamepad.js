/*
  gamepad.js — 게임패드(버튼) 탭: 방향/액션 버튼 조작 + 버튼 값 커스터마이징
  버튼 값 편집은 ⚙️(환경설정) 아이콘을 눌러 여는 설정 패널에서 한 번에 처리
  (탭할 버튼을 하나씩 고르는 방식 대신, 목록 형태로 모두 보여주고 바로 수정)
*/

const KEY_LABELS = {
  up: '▲ 위',
  down: '▼ 아래',
  left: '◀ 왼쪽',
  right: '▶ 오른쪽',
  stop: '■ 정지',
  action1: 'A 액션',
  action2: 'B 액션',
};

function initGamepad() {
  let mapping = loadMapping();

  const tabEl = document.getElementById('gamepad-tab');
  const buttons = tabEl.querySelectorAll('.pad-btn');

  const settingsBtn = document.getElementById('gamepad-settings-btn');
  const settingsModal = document.getElementById('gamepad-settings-modal');
  const settingsList = document.getElementById('gamepad-settings-list');
  const settingsResetBtn = document.getElementById('gamepad-settings-reset');
  const settingsCloseBtn = document.getElementById('gamepad-settings-close');

  const DIRECTION_KEYS = ['up', 'down', 'left', 'right'];

  function renderLabels() {
    buttons.forEach((btn) => {
      const key = btn.dataset.key;
      const valueEl = btn.querySelector('.pad-btn-value');
      if (valueEl) valueEl.textContent = mapping[key];
    });
  }

  function renderSettingsList() {
    settingsList.querySelectorAll('input[data-key]').forEach((input) => {
      input.value = mapping[input.dataset.key];
    });
  }

  function buildSettingsList() {
    settingsList.innerHTML = '';
    Object.keys(KEY_LABELS).forEach((key) => {
      const row = document.createElement('div');
      row.className = 'settings-row';

      const label = document.createElement('label');
      label.textContent = KEY_LABELS[key];
      label.setAttribute('for', `settings-input-${key}`);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `settings-input-${key}`;
      input.dataset.key = key;
      input.value = mapping[key];

      input.addEventListener('change', () => {
        const value = input.value.trim();
        mapping[key] = value || mapping[key];
        input.value = mapping[key];
        saveMapping(mapping);
        renderLabels();
      });

      row.appendChild(label);
      row.appendChild(input);
      settingsList.appendChild(row);
    });
  }

  // 방향 버튼은 누르고 있는 동안만 움직이는 방식(조이스틱형) 대신,
  // 한 번 탭하면 다른 방향/■(정지)을 누를 때까지 계속 그 방향으로 움직이는
  // 방식(토글형)으로 동작합니다. 아두이노도 마지막으로 받은 F/B/L/R/S 명령을
  // 계속 유지하므로, 굳이 계속 눌러 반복 전송할 필요가 없습니다.
  // 지금 어느 방향이 켜져 있는지는 해당 버튼에 'engaged' 클래스로 표시합니다.
  function setEngaged(key) {
    buttons.forEach((btn) => {
      const isDirection = DIRECTION_KEYS.includes(btn.dataset.key);
      btn.classList.toggle('engaged', isDirection && btn.dataset.key === key);
    });
  }

  function press(key) {
    const value = mapping[key];
    BLE.send(value + '\n').catch(() => {});

    if (key === 'stop') {
      setEngaged(null); // 정지 버튼: 켜져 있던 방향 표시 해제
    } else if (DIRECTION_KEYS.includes(key)) {
      setEngaged(key); // 방향 버튼: 이 방향을 계속 유지 중으로 표시
    }
    // 액션 버튼(action1/action2 등)은 그때그때 값이 바뀌는 단발 명령이라
    // 방향 유지 표시 대상이 아님
  }

  settingsBtn.addEventListener('click', () => {
    renderSettingsList();
    settingsModal.classList.add('open');
  });
  settingsCloseBtn.addEventListener('click', () => {
    settingsModal.classList.remove('open');
  });
  settingsResetBtn.addEventListener('click', () => {
    // 브라우저 기본 confirm()은 앱(특히 Bluefy 등)마다 버튼 라벨이 이상하게
    // 나오는 경우가 있어, 직접 만든 확인 모달을 사용
    showConfirm('버튼 값을 기본값으로 되돌릴까요?', () => {
      mapping = resetMapping();
      renderLabels();
      renderSettingsList();
    });
  });

  buttons.forEach((btn) => {
    const key = btn.dataset.key;

    const onPressStart = (e) => {
      e.preventDefault();
      if (BLE.getState() !== 'connected') return;
      btn.classList.add('pressed');
      press(key);
    };

    const onPressEnd = (e) => {
      e.preventDefault();
      btn.classList.remove('pressed'); // 탭 시각 효과만 해제 — BLE로 정지 명령을 보내지 않음
    };

    btn.addEventListener('touchstart', onPressStart, { passive: false });
    btn.addEventListener('touchend', onPressEnd, { passive: false });
    btn.addEventListener('touchcancel', onPressEnd, { passive: false });
    btn.addEventListener('mousedown', onPressStart);
    btn.addEventListener('mouseup', onPressEnd);
    btn.addEventListener('mouseleave', (e) => {
      if (btn.classList.contains('pressed')) onPressEnd(e);
    });
  });

  BLE.onStateChange((state) => {
    tabEl.classList.toggle('disabled', state !== 'connected');
    if (state !== 'connected') setEngaged(null); // 연결 끊기면 방향 유지 표시도 초기화
  });

  buildSettingsList();
  renderLabels();
}
