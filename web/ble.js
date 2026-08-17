/*
  ble.js — HM-10(BLE) 연결을 앱 전체에서 하나만 유지하는 공용 모듈
  터미널 탭 / 게임패드 탭이 모두 이 모듈 하나만 공유해서 사용합니다.

  ⚠️ 사용 전 필수 확인
  스마트폰에 nRF Connect for Mobile 앱을 설치해 실제 HM-10을 스캔하고,
  Service / Characteristic UUID가 아래 기본값(0xFFE0 / 0xFFE1)과 같은지 반드시 확인하세요.
  클론 제품에 따라 UUID가 다를 수 있습니다. 다르면 아래 두 상수만 바꿔주면 됩니다.
*/

const HM10_SERVICE_UUID = 0xffe0;
const HM10_CHARACTERISTIC_UUID = 0xffe1;

// BLE.writeValue()는 한 번에 보낼 수 있는 바이트 수 제한(대개 20바이트)이 있어 필요 시 나눠 보냄
const BLE_WRITE_CHUNK_SIZE = 20;

const BLE = (() => {
  let device = null;
  let characteristic = null;
  let state = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'

  const stateListeners = new Set();
  const dataListeners = new Set();

  function setState(next) {
    state = next;
    stateListeners.forEach((fn) => fn(state));
  }

  function onStateChange(fn) {
    stateListeners.add(fn);
    fn(state); // 등록 즉시 현재 상태를 한 번 알려줌 (UI 초기화용)
    return () => stateListeners.delete(fn);
  }

  function onData(fn) {
    dataListeners.add(fn);
    return () => dataListeners.delete(fn);
  }

  function handleDisconnected() {
    // 사용자가 '연결 해제'를 눌렀을 때뿐 아니라, 기기 전원이 꺼지는 등
    // 예기치 않게 끊겼을 때도 이 이벤트가 호출되어 UI 상태를 자동으로 정리해줌
    characteristic = null;
    setState('disconnected');
  }

  function handleNotify(event) {
    const value = event.target.value;
    const text = new TextDecoder().decode(value);
    dataListeners.forEach((fn) => fn(text));
  }

  async function connect() {
    if (!navigator.bluetooth) {
      throw new Error(
        '이 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome(안드로이드/PC) 또는 iOS는 Bluefy 앱을 사용하세요.'
      );
    }
    setState('connecting');
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HM10_SERVICE_UUID] }],
      });
      device.addEventListener('gattserverdisconnected', handleDisconnected);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HM10_SERVICE_UUID);
      characteristic = await service.getCharacteristic(HM10_CHARACTERISTIC_UUID);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleNotify);

      setState('connected');
    } catch (err) {
      setState('disconnected');
      throw err;
    }
  }

  function disconnect() {
    if (device && device.gatt.connected) {
      device.gatt.disconnect(); // handleDisconnected가 상태 정리를 이어서 처리
    } else {
      handleDisconnected();
    }
  }

  async function send(text) {
    if (state !== 'connected' || !characteristic) {
      throw new Error('블루투스가 연결되어 있지 않습니다.');
    }
    const bytes = new TextEncoder().encode(text);
    for (let i = 0; i < bytes.length; i += BLE_WRITE_CHUNK_SIZE) {
      await characteristic.writeValue(bytes.slice(i, i + BLE_WRITE_CHUNK_SIZE));
    }
  }

  function getState() {
    return state;
  }

  return { connect, disconnect, send, onStateChange, onData, getState };
})();
