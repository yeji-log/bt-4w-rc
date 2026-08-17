/*
  terminal.js — 터미널 탭: 자유 문자열 송수신
*/

function initTerminal() {
  const logEl = document.getElementById('terminal-log');
  const inputEl = document.getElementById('terminal-input');
  const sendBtn = document.getElementById('terminal-send');
  const clearBtn = document.getElementById('terminal-clear');
  const newlineToggle = document.getElementById('terminal-newline-toggle');

  function appendLog(direction, text) {
    const line = document.createElement('div');
    line.className = `log-line log-${direction}`;
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    const label = direction === 'sent' ? '보냄' : direction === 'received' ? '받음' : '오류';
    line.textContent = `[${time}] ${label} · ${text}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function sendCurrentInput() {
    const text = inputEl.value;
    if (!text) return;
    const payload = newlineToggle.checked ? text + '\n' : text;
    try {
      await BLE.send(payload);
      appendLog('sent', text);
      inputEl.value = '';
    } catch (err) {
      appendLog('error', err.message);
    }
  }

  sendBtn.addEventListener('click', sendCurrentInput);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCurrentInput();
    }
  });
  clearBtn.addEventListener('click', () => {
    logEl.innerHTML = '';
  });

  BLE.onData((text) => appendLog('received', text));

  BLE.onStateChange((state) => {
    const enabled = state === 'connected';
    inputEl.disabled = !enabled;
    sendBtn.disabled = !enabled;
  });
}
