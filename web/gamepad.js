/*
  gamepad.js — 게임패드(버튼) 탭: 방향/액션 버튼 조작 + 버튼 값 커스터마이징
*/

function initGamepad() {
  let mapping = loadMapping();
  let settingsMode = false;
  let repeatTimer = null;
  const REPEAT_MS = 150; // 방향 버튼을 누르고 있는 동안 반복 전송하는 간격 (쓰로틀링)

  const tabEl = document.getElementById('gamepad-tab');
  const buttons = tabEl.querySelectorAll('.pad-btn');
  const settingsToggle = document.getElementById('gamepad-settings-toggle');
  const resetBtn = document.getElementById('gamepad-reset');
  const modal = document.getElementById('mapping-modal');
  const modalKeyLabel = document.getElementById('mapping-modal-key');
  const modalInput = document.getElementById('mapping-modal-input');
  const modalSave = document.getElementById('mapping-modal-save');
  const modalCancel = document.getElementById('mapping-modal-cancel');

  const DIRECTION_KEYS = ['up', 'down', 'left', 'right'];
  let editingKey = null;

  function renderLabels() {
    buttons.forEach((btn) => {
      const key = btn.dataset.key;
      const valueEl = btn.querySelector('.pad-btn-value');
      if (valueEl) valueEl.textContent = mapping[key];
    });
  }

  function stopRepeat() {
    if (repeatTimer) {
      clearInterval(repeatTimer);
      repeatTimer = null;
    }
  }

  function press(key) {
    const value = mapping[key];
    BLE.send(value + '\n').catch(() => {});
    if (DIRECTION_KEYS.includes(key)) {
      stopRepeat();
      repeatTimer = setInterval(() => {
        BLE.send(value + '\n').catch(() => {});
      }, REPEAT_MS);
    }
  }

  function release(key) {
    if (DIRECTION_KEYS.includes(key)) {
      stopRepeat();
      BLE.send(mapping.stop + '\n').catch(() => {});
    }
    // 액션 버튼(action1, action2 등)은 클릭 1회로 단발 전송, 뗄 때 별도 동작 없음
  }

  function openMappingModal(key) {
    editingKey = key;
    modalKeyLabel.textContent = key;
    modalInput.value = mapping[key];
    modal.classList.add('open');
    modalInput.focus();
  }

  function closeMappingModal() {
    modal.classList.remove('open');
    editingKey = null;
  }

  modalSave.addEventListener('click', () => {
    if (!editingKey) return;
    const value = modalInput.value.trim();
    if (value) {
      mapping[editingKey] = value;
      saveMapping(mapping);
      renderLabels();
    }
    closeMappingModal();
  });
  modalCancel.addEventListener('click', closeMappingModal);

  settingsToggle.addEventListener('click', () => {
    settingsMode = !settingsMode;
    tabEl.classList.toggle('settings-mode', settingsMode);
    settingsToggle.textContent = settingsMode ? '설정 종료' : '버튼 설정';
    settingsToggle.setAttribute('aria-pressed', String(settingsMode));
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('버튼 값을 기본값으로 되돌릴까요?')) return;
    mapping = resetMapping();
    renderLabels();
  });

  buttons.forEach((btn) => {
    const key = btn.dataset.key;

    const onPressStart = (e) => {
      e.preventDefault();
      if (settingsMode) {
        openMappingModal(key);
        return;
      }
      if (BLE.getState() !== 'connected') return;
      btn.classList.add('pressed');
      press(key);
    };

    const onPressEnd = (e) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      if (settingsMode) return;
      release(key);
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
    const enabled = state === 'connected';
    tabEl.classList.toggle('disabled', !enabled && !settingsMode);
  });

  renderLabels();
}
