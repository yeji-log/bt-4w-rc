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

  // GATT는 한 번에 하나의 작업만 허용합니다. writeValue()를 겹쳐서 호출하면
  // "GATT operation already in progress" 에러가 나면서 뒤에 보낸 명령이 그대로
  // 무시되는데(게임패드에서 방향 전환 시 명령이 씹히던 원인), 이걸 막기 위해
  // 모든 write를 이 큐로 한 줄로 세워서 순서대로만 실행합니다.
  let writeQueue = Promise.resolve();

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
    // 끊긴 연결에 걸려 있던 대기 write가 다음 연결의 write를 막지 않도록 큐 리셋
    writeQueue = Promise.resolve();
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

  function send(text) {
    if (state !== 'connected' || !characteristic) {
      return Promise.reject(new Error('블루투스가 연결되어 있지 않습니다.'));
    }
    // 이전에 대기 중인 write가 있으면(성공하든 실패하든) 그 뒤에 이어서 실행 —
    // 절대로 writeValue() 호출을 동시에 겹치게 하지 않음
    const run = writeQueue.then(async () => {
      if (state !== 'connected' || !characteristic) {
        throw new Error('블루투스가 연결되어 있지 않습니다.');
      }
      const bytes = new TextEncoder().encode(text);
      for (let i = 0; i < bytes.length; i += BLE_WRITE_CHUNK_SIZE) {
        await characteristic.writeValue(bytes.slice(i, i + BLE_WRITE_CHUNK_SIZE));
      }
    });
    // 이 요청이 실패해도 큐 자체는 끊기지 않고 다음 요청으로 이어지도록 처리
    writeQueue = run.catch(() => {});
    return run;
  }

  function getState() {
    return state;
  }

  return { connect, disconnect, send, onStateChange, onData, getState };
})();
